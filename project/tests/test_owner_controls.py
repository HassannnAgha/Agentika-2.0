"""The owner's side of the loop: escalate-when-unsure, consent to promotions, supervision settings that only tighten,
edit-then-approve and "wrong, because..." teaching the agents, undo, and threaded replies. Real mode, no network."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, persist, learning, executors, gate as G
from store import STORE
from test_real import real, onboard, mailbox, propose, fid  # noqa: F401  (the real-mode fixture and helpers)

c = TestClient(server.app)

def earn(agent, cls, n=None):
    n = n or G.n_min(G.risk(cls))
    with server.lock:
        for _ in range(n): server.gate.record_decision(agent, cls, "approve"); server.gate.record_outcome(agent, cls, True)

def assign(**extra):
    return propose(agent="project", cls="assign_subtask", counterparty="cl-1", cited=[fid("cl-1", "client.status"), fid("business", "biz.team.1")],
                   payload={"title": "Orchid Clinic: homepage", "client_id": "cl-1", "client": "Orchid Clinic", "assignee": "Danish Ali", **extra})

def clean_owner_state():
    for k in ("consent", "supervision", "guidance", "edits", "tasks"): persist.delete(k)

@pytest.fixture(autouse=True)
def _clean():
    clean_owner_state(); yield; clean_owner_state()

def test_an_earned_action_still_needs_the_owner_go_ahead_once(real):
    onboard(); earn("project", "assign_subtask")
    a = assign(); assert a["decision"]["route"] == "approval" and a["decision"].get("promotion") is True
    c.post("/decision", json={"id": a["id"], "kind": "approve", "allow_autonomy": True})
    assert server.consent_of("project", "assign_subtask") == "granted"
    assert assign()["decision"]["route"] == "auto"                                     # evidence AND consent: now it runs alone
    c.post("/api/consent", json={"agent": "project", "cls": "assign_subtask", "allow": False})
    held = assign()["decision"]; assert held["route"] == "approval" and "keep approving" in held["why"]

def test_an_unsure_agent_asks_even_when_it_has_earned_the_action(real):
    onboard(); earn("project", "assign_subtask"); c.post("/api/consent", json={"agent": "project", "cls": "assign_subtask", "allow": True})
    d = assign(confidence=0.35, unsure="two people could take this")["decision"]
    assert d["route"] == "approval" and "unsure" in d["why"] and "35%" in d["why"]
    assert assign(confidence=0.95)["decision"]["route"] == "auto"

def test_the_template_admits_it_cannot_answer_a_pricing_question(real):
    onboard(); mailbox(real)
    r = c.post("/api/agents/ops/inbound", json={"sender": "sara@orchid.example", "subject": "Cost", "body": "How much would a booking page cost?"}).json()
    assert r[0]["route"] == "approval" and "only you can answer" in r[0]["why"]

def test_supervision_settings_only_ever_add_supervision(real):
    onboard(); earn("project", "assign_subtask"); c.post("/api/consent", json={"agent": "project", "cls": "assign_subtask", "allow": True})
    assert c.put("/api/supervision", json={"always_ask_classes": ["assign_subtask"]}).status_code == 200
    d = assign()["decision"]; assert d["route"] == "approval" and d.get("held_by") == "supervision"
    c.put("/api/supervision", json={"daily_cap": {"project": 0}})
    assert "daily cap" in assign()["decision"]["why"]
    c.put("/api/supervision", json={"paused_agents": ["project"]})
    p = assign()["decision"]; assert p["route"] == "refuse" and "paused" in p["why"]
    assert c.put("/api/supervision", json={"recall_seconds": 5}).status_code == 400          # a recall window can only get longer
    assert c.put("/api/supervision", json={"recall_seconds": 1200}).status_code == 200 and server.recall_secs("reply_to_client") == 1200
    assert c.put("/api/supervision", json={"always_ask_classes": ["no_such_thing"]}).status_code == 400

def test_edit_then_approve_sends_the_owner_version_and_teaches_the_agent(real):
    onboard()
    a = c.post("/api/agents/marketing/draft", json={"topic": "Scoped sites"}).json()[0]
    done = c.post("/decision", json={"id": a["id"], "kind": "approve", "edits": {"text": "Our own words, plainer and shorter."}}).json()
    assert done["payload"]["text"] == "Our own words, plainer and shorter." and done["edited"] is True and done["original"]["text"]
    assert learning.edits("marketing", "draft_content")[-1]["after"] == "Our own words, plainer and shorter."
    assert "rewrote" in learning.guidance("marketing", "draft_content")
    assert any(e["event"] == "owner_approve" and e.get("edited") for e in c.get("/api/audit").json())

def test_wrong_because_is_remembered_and_fed_to_the_next_draft(real):
    onboard()
    a = c.post("/api/agents/marketing/draft", json={"topic": "Scoped sites"}).json()[0]
    c.post("/decision", json={"id": a["id"], "kind": "quality", "reason": "Never mention discounts; we do not do them."})
    g = learning.guidance("marketing", "draft_content")
    assert "Never mention discounts" in g and "quality" in g
    assert any(x["cls"] == "draft_content" and x["reasons"] for x in c.get("/api/learning").json())

def test_undo_reverses_the_record_and_counts_against_the_agent(real):
    onboard(); earn("project", "assign_subtask"); c.post("/api/consent", json={"agent": "project", "cls": "assign_subtask", "allow": True})
    a = assign(); assert a["status"] == "executed" and len(c.get("/api/tasks").json()) == 1
    fails = server.gate.pair("project", "assign_subtask").counts()["fail"]
    u = c.post(f"/api/actions/{a['id']}/undo").json()
    assert u["status"] == "undone" and c.get("/api/tasks").json() == []
    assert server.gate.pair("project", "assign_subtask").counts()["fail"] == fails + 1
    assert c.post(f"/api/actions/{a['id']}/undo").status_code == 409                    # once
    m = c.post("/api/agents/marketing/draft", json={"topic": "x"}).json()[0]; c.post("/decision", json={"id": m["id"], "kind": "approve"})
    assert c.post(f"/api/actions/{m['id']}/undo").json()["status"] == "undone"           # a kept draft can be withdrawn too

def test_a_sent_email_cannot_be_undone(real):
    onboard(); mailbox(real)
    real.setattr(executors, "send_email", lambda p, internal=False: True)
    r = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status")], payload={"to": "sara@orchid.example", "subject": "Hi", "body": "Hello"})
    c.post("/decision", json={"id": r["id"], "kind": "approve"})
    assert c.post(f"/api/actions/{r['id']}/undo").status_code == 409

def test_a_reply_lands_in_the_original_thread():
    from email.message import EmailMessage
    m = EmailMessage(); executors._thread(m, {"reply_to_message_id": "<abc@mail.example>"})
    assert m["In-Reply-To"] == "<abc@mail.example>" and m["References"] == "<abc@mail.example>"
    m2 = EmailMessage(); executors._thread(m2, {"reply_to_message_id": "not-an-id"}); assert m2["In-Reply-To"] is None
