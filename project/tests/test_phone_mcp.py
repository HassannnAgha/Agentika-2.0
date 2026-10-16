"""One-tap decisions from the owner's phone, and Bizzii as an MCP server any AI agent runs through."""
import os, sys, json, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, persist, executors, gate as G
from store import STORE

c = TestClient(server.app)

@pytest.fixture
def live(monkeypatch):
    """Real mode with a mailbox configured; alerts sent synchronously and captured instead of mailed."""
    monkeypatch.setenv("DEMO_MODE", "0"); monkeypatch.setenv("AUDIT_RATE", "0"); G.AUDIT_RATE = 0
    monkeypatch.setenv("APPROVAL_ALERTS_SYNC", "1"); monkeypatch.setenv("PUBLIC_URL", "https://bizzii.example")
    for k, v in dict(SMTP_HOST="smtp.example.com", SMTP_USER="me@cedar.example", SMTP_PASSWORD="x").items(): monkeypatch.setenv(k, v)
    sent = []; monkeypatch.setattr(executors, "send_email", lambda p, internal=False: sent.append((p, internal)) or True)
    with server.lock:
        server._reset_gate(False)
        for k in ("gate_state", "actions", "profile", "lead_facts"): persist.delete(k)
        persist.clear_stream("alerts"); STORE.lead_facts.clear(); STORE.load()
    from test_real import PROFILE
    c.post("/api/profile", json=PROFILE)
    yield sent
    os.environ["DEMO_MODE"] = "1"
    with server.lock:
        for k in ("gate_state", "actions", "profile", "lead_facts"): persist.delete(k)
        STORE.lead_facts.clear(); STORE.load(); server._reset_gate(True)

def draft():
    return c.post("/api/agents/marketing/draft", json={"topic": "Scoped websites"}).json()[0]

def token_of(link): return link.rsplit("/a/", 1)[1]

def test_an_action_that_needs_the_owner_reaches_their_phone(live):
    a = draft(); assert a["route"] == "approval"
    alert = persist.tail("alerts", 1)[0]
    assert alert["id"] == a["id"] and alert["link"].startswith("https://bizzii.example/a/") and "Needs you" in alert["subject"]
    (mail, internal), = live
    assert internal and mail["to"] == "hina@cedar.example" and alert["link"] in mail["body"] and "Why you are asked" in mail["body"]

def test_opening_the_link_changes_nothing_and_a_tap_decides(live):
    a = draft(); tok = token_of(persist.tail("alerts", 1)[0]["link"])
    page = c.get(f"/a/{tok}")
    assert page.status_code == 200 and "Why you are asked" in page.text and "Approve" in page.text
    assert server.PENDING[a["id"]]["status"] == "awaiting"                       # a link preview or mail scanner cannot approve anything
    done = c.post(f"/a/{tok}", data={"kind": "approve"})
    assert done.status_code == 200 and "Approved" in done.text and server.PENDING[a["id"]]["status"] == "executed"
    assert "Already" in c.post(f"/a/{tok}", data={"kind": "approve"}).text       # a second tap does nothing
    assert any(e["event"] == "owner_approve" and e["id"] == a["id"] for e in c.get("/api/audit").json())

def test_a_forged_or_borrowed_link_decides_nothing(live):
    a = draft(); b = draft()
    tok_a = token_of(persist.tail("alerts", 2)[1]["link"]); tok_b = token_of(persist.tail("alerts", 1)[0]["link"])
    forged = f"{b['id']}.{tok_a.split('.', 1)[1]}"                               # a's signature on b's id
    assert c.get(f"/a/{forged}").status_code == 403 and c.post(f"/a/{forged}", data={"kind": "approve"}).status_code == 403
    assert server.PENDING[b["id"]]["status"] == "awaiting"
    assert c.post(f"/a/{tok_b}", data={"kind": "quality"}).status_code == 200 and server.PENDING[b["id"]]["status"] == "declined"

def test_a_recall_window_alert_offers_stop_only(live):
    with server.lock:
        for _ in range(9): server.gate.record_decision("operations", "flag_relationship_risk", "approve"); server.gate.record_outcome("operations", "flag_relationship_risk", True)
    c.post("/api/consent", json={"agent": "operations", "cls": "flag_relationship_risk", "allow": True})   # the owner already let it run alone
    r = c.post("/api/agents/ops/scan").json()
    flag = next(x for x in r if x["cls"] == "flag_relationship_risk"); assert flag["route"] == "recall"
    alert = next(x for x in persist.tail("alerts", 5) if x["id"] == flag["id"]); assert "Runs soon" in alert["subject"]
    page = c.get(f"/a/{token_of(alert['link'])}").text
    assert "Stop:" in page and "value=approve" not in page
    c.post(f"/a/{token_of(alert['link'])}", data={"kind": "preference"})
    assert server.PENDING[flag["id"]]["status"] == "declined"

def test_decision_links_bypass_nothing_else():
    assert c.get("/a/not-a-token").status_code == 403

# ------------------------------------------------------------------ MCP
def rpc(client, method, params=None, i=1):
    r = client.post("/mcp", json={"jsonrpc": "2.0", "id": i, "method": method, "params": params or {}},
                    headers={"Accept": "application/json, text/event-stream", "Content-Type": "application/json", "MCP-Protocol-Version": "2025-06-18"})
    assert r.status_code == 200, r.text
    return r.json()

def tool(client, name, **args):
    res = rpc(client, "tools/call", {"name": name, "arguments": args}, 9)["result"]
    assert not res.get("isError"), res
    return res["structuredContent"] if res.get("structuredContent") is not None else json.loads(res["content"][0]["text"])

def test_any_ai_agent_can_run_through_the_gate_over_mcp():
    with TestClient(server.app) as mc:                                               # runs the lifespan, which starts the MCP session manager
        init = rpc(mc, "initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "claude-desktop", "version": "1"}})
        assert init["result"]["serverInfo"]["name"] == "bizzii-trust-gate"
        names = {t["name"] for t in rpc(mc, "tools/list", {}, 2)["result"]["tools"]}
        assert {"propose_action", "get_facts", "check_action", "trust_record", "list_action_types"} <= names
        assert not names & {"approve", "decide", "reset", "decision"}                  # no tool lets an agent approve itself
        facts = tool(mc, "get_facts", counterparty="cl-1")["facts"]
        mine = [f["id"] for f in facts if f["about"] == "cl-1"][:1]
        p = tool(mc, "propose_action", agent_name="claude-desktop", action_type="reply_to_client", counterparty="cl-1", cited_fact_ids=mine,
                 payload={"to": "omar@meridian.example", "subject": "Quick update", "body": "Hi Omar, a quick update is on its way this week."})
        assert p["as_agent"] == "mcp:claude-desktop" and p["route"] == "approval"   # its own record starts at zero, it borrows nothing
        other = [i for i, x in STORE.facts.items() if x["owner"] == "cl-2"][:1]
        bad = tool(mc, "propose_action", agent_name="claude-desktop", action_type="reply_to_client", counterparty="cl-1", cited_fact_ids=mine + other,
                   payload={"to": "omar@meridian.example", "subject": "x", "body": "y"})
        assert bad["route"] == "refuse" and "outside" in bad["why"]
        mc.post("/decision", json={"id": p["action_id"], "kind": "approve"})            # only the owner decides
        assert tool(mc, "check_action", action_id=p["action_id"])["status"] == "executed"
        rec = tool(mc, "trust_record", agent_name="claude-desktop")["record"]
        assert rec[0]["action_type"] == "reply_to_client" and rec[0]["verified_outcomes"] == 1 and rec[0]["earned"] is False
        own = next(x for x in server.state()["classes"] if x["cls"] == "reply_to_client")["counts"]
        assert own["a"] == 6                                                            # the built-in agent's record was not touched
        assert "path_to_autonomy" in rec[0]
        atk = tool(mc, "test_attack", kind="injection")                                 # an outside agent can probe the gate, harmlessly
        assert atk["route"] == "refuse" and any(not c["ok"] for c in atk["checks"])

def test_from_the_phone_the_owner_can_edit_explain_and_grant_autonomy(live):
    import learning
    a = draft(); tok = token_of(persist.tail("alerts", 1)[0]["link"])
    assert "Edit before approving" in c.get(f"/a/{tok}").text
    r = c.post(f"/a/{tok}", data={"kind": "approve", "edit_text": "Short, plain, ours.", "reason": ""})
    assert "Your edits were sent" in r.text and server.PENDING[a["id"]]["payload"]["text"] == "Short, plain, ours."
    b = draft(); tok_b = token_of(persist.tail("alerts", 1)[0]["link"])
    c.post(f"/a/{tok_b}", data={"kind": "quality", "reason": "Too salesy for us."})
    assert any("Too salesy" in r["reason"] for r in learning.reasons("marketing", "draft_content"))
    with server.lock:
        for _ in range(9): server.gate.record_decision("project", "assign_subtask", "approve"); server.gate.record_outcome("project", "assign_subtask", True)
    from test_real import propose, fid
    p = propose(agent="project", cls="assign_subtask", counterparty="cl-1", cited=[fid("cl-1", "client.status"), fid("business", "biz.team.1")],
                payload={"title": "t", "client_id": "cl-1", "client": "Orchid Clinic", "assignee": "Danish Ali"})
    assert p["decision"].get("promotion")
    tok_p = token_of(persist.tail("alerts", 1)[0]["link"])
    assert "on its own from now on" in c.get(f"/a/{tok_p}").text
    assert "may do these on its own" in c.post(f"/a/{tok_p}", data={"kind": "approve_autonomy"}).text
    assert server.consent_of("project", "assign_subtask") == "granted"
