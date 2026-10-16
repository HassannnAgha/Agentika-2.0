"""Training from real data, the trust timeline with promotion detection, impact numbers, the blocked feed and the daily digest."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, persist, executors, gate as G
from test_real import real, onboard, mailbox, propose, fid  # noqa: F401

c = TestClient(server.app)

@pytest.fixture(autouse=True)
def _clean():
    for k in ("practice", "consent", "supervision"): persist.delete(k)
    persist.clear_stream("trust_events"); yield
    for k in ("practice", "consent", "supervision"): persist.delete(k)

def test_training_builds_practice_from_real_records_and_grades_change_only_decisions(real):
    onboard(); mailbox(real)
    r = c.post("/api/train/start?agent=operations").json()
    assert r["created"] == 1 and r["items"][0]["cls"] == "followup_client_no_reply" and r["items"][0]["who"] == "Orchid Clinic"
    pid = r["items"][0]["id"]; sent_before = len(persist.tail("outbox", 300))
    g = c.post(f"/api/train/{pid}", json={"kind": "approve"}).json()
    assert g["status"] == "approve"
    k = server.gate.pair("operations", "followup_client_no_reply").counts()
    assert k["a"] == 1 and k["ok"] == 0                               # an owner decision, but no verified outcome: practice is never executed
    assert c.post(f"/api/train/{pid}", json={"kind": "approve"}).status_code == 409
    assert len(persist.tail("outbox", 300)) == sent_before            # grading practice sends nothing
    assert any(e["event"] == "practice_approve" for e in c.get("/api/audit").json())

def test_marketing_and_project_practice(real):
    onboard()
    r = c.post("/api/train/start?agent=marketing&n=2").json()
    assert r["created"] >= 1 and all(x["cls"] == "draft_content" for x in r["items"])
    p = c.post("/api/train/start?agent=project&n=3").json()
    assert p["created"] >= 1 and all(x["cls"] == "assign_subtask" for x in p["items"])

def test_the_trust_timeline_marks_the_moment_an_action_is_earned(real):
    onboard()
    cls = "assign_subtask"; n = G.n_min(G.risk(cls))
    with server.lock:
        for _ in range(n - 1): server.gate.record_decision("project", cls, "approve"); server.gate.record_outcome("project", cls, True)
    a = propose(agent="project", cls=cls, counterparty="cl-1", cited=[fid("cl-1", "client.status"), fid("business", "biz.team.1")],
                payload={"title": "t", "client_id": "cl-1", "client": "Orchid Clinic", "assignee": "Danish Ali"})
    c.post("/decision", json={"id": a["id"], "kind": "approve"})
    h = c.get(f"/api/trust/history?agent=project&cls={cls}").json()
    assert [e["event"] for e in h][-2:] == ["approve", "outcome_ok"] and h[-1]["change"] == "earned" and h[-1]["earned"] is True

def test_impact_and_blocked_feed(real):
    onboard(); mailbox(real); real.setattr(executors, "send_email", lambda p, internal=False: True)
    leak = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status"), fid("business", "biz.summary") + 99999],
                   payload={"to": "sara@orchid.example", "subject": "x", "body": "y"})
    wrong_to = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status")], payload={"to": "x@evil.example", "subject": "s", "body": "b"})
    ok = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status")], payload={"to": "sara@orchid.example", "subject": "s", "body": "b"})
    c.post("/decision", json={"id": ok["id"], "kind": "approve"})
    b = c.get("/api/blocked").json(); kinds = {x["id"]: x["kind"] for x in b}
    assert kinds[wrong_to["id"]] == "wrong recipient" and leak["id"] in kinds
    im = c.get("/api/impact").json()
    assert im["done"] == 1 and im["owner_decisions"] == 1 and im["blocked"] >= 2 and im["minutes_saved_estimate"] >= 5

def test_the_daily_digest_reaches_the_owner_with_decision_links(real):
    onboard(); mailbox(real); sent = []
    real.setattr(executors, "send_email", lambda p, internal=False: sent.append(p) or True)
    real.setenv("PUBLIC_URL", "https://bizzii.example")
    c.post("/api/agents/marketing/draft", json={"topic": "x"})
    r = c.post("/api/digest/send").json()
    assert r["sent"] and r["waiting"] >= 1
    digest = sent[-1]
    assert digest["to"] == "hina@cedar.example" and "Waiting on you" in digest["body"] and "https://bizzii.example/a/" in digest["body"]
