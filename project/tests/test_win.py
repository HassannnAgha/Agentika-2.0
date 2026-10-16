"""The features on top of the loop: path to autonomy, "try to break it", teammates as approvers, trust check-ins,
the trust report and the first-week plan. Real mode, no network, nothing sent."""
import os, sys, time, copy
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, persist, leadgen, gate as G
from store import STORE
from catalogue import CLASSES
from test_real import real, PROFILE, mailbox, propose, fid  # noqa: F401
from test_owner_controls import earn, assign

c = TestClient(server.app)

TWO = copy.deepcopy(PROFILE)
TWO["clients"].append({"id": "cl-2", "name": "Harbor Logistics", "contact": {"name": "Omar", "email": "omar@harbor.example"}, "status": "active",
                       "relationship_start": "2025-03-01", "last_contact": "2026-10-10", "custom": []})

def onboard2(): assert c.post("/api/profile", json=TWO).json()["ok"]

@pytest.fixture(autouse=True)
def _clean():
    keys = ("consent", "consent_meta", "supervision", "approvers", "guidance", "edits", "tasks")
    for k in keys: persist.delete(k)
    persist.clear_stream("redteam")
    yield
    for k in keys: persist.delete(k)
    leadgen.LEADS.pop("ld-t", None)

# ---------------------------------------------------------------- 2. path to autonomy
def test_steps_to_earn_is_exact_including_after_wrong_answers(real):
    onboard2()
    g = server.gate
    for extra in ([], [("dec", "rq"), ("dec", "rq")], [("dec", "rp")] * 3, [("out", "fail")]):
        with server.lock:
            g.pairs.clear()
            for kind, v in extra: (g.pair("project", "assign_subtask").dec if kind == "dec" else g.pair("project", "assign_subtask").out).append(v)
            k = g.steps_to_earn("project", "assign_subtask")
            assert k is not None and k > 0
            for i in range(k):
                assert not g.evaluate("project", "assign_subtask")[0], f"earned early at {i} of {k} with {extra}"
                g.record_decision("project", "assign_subtask", "approve"); g.record_outcome("project", "assign_subtask", True)
            assert g.evaluate("project", "assign_subtask")[0]
    with server.lock: g.pairs.clear()
    assert g.steps_to_earn("sales", "send_lead_outreach") is None             # a fixed rule: never

def test_every_pending_action_says_what_each_answer_would_change(real):
    onboard2()
    a = assign(); assert a["decision"]["route"] == "approval"
    p = next(x for x in c.get("/state").json()["pending"] if x["id"] == a["id"])["path"]
    w = p["what_if"]
    assert p["state"] == "learning" and w["approve"] == w["now"] - 1 and w["preference"] > w["approve"] and w["quality"] > w["approve"]
    assert "Approve" in p["effects"] and "clean run" in p["text"]
    assert c.get("/api/autonomy?cls=publish_post").json()["state"] == "never"
    earn("project", "assign_subtask")
    assert c.get("/api/autonomy?cls=assign_subtask").json()["state"] == "earned"

# ---------------------------------------------------------------- 1. try to break it
def test_attacks_are_stopped_by_the_real_gate_and_nothing_is_recorded(real):
    onboard2(); mailbox(real)
    leadgen.LEADS["ld-t"] = {"id": "ld-t", "name": "Acme Dental", "email": "hi@acme.example", "status": "new", "score": 50}
    evidence = lambda: {k: v for k, v in server.gate.dump().items() if v["dec"] or v["out"]}
    before_pending, before_pairs = len(server.PENDING), evidence()
    want = {"injection": "refuse", "leak": "refuse", "price": "refuse", "recipient": "refuse", "no_basis": "refuse", "cold": "escalate", "publish": "escalate"}
    for kind, route in want.items():
        r = c.post("/api/redteam", json={"kind": kind, "client_id": "cl-1"}).json()
        assert r["route"] == route, (kind, r["why"])
        assert any(not s["ok"] for s in r["steps"]), kind                       # the failing check is shown
    assert "Harbor Logistics" in c.post("/api/redteam", json={"kind": "leak"}).json()["why"]
    ok = c.post("/api/redteam", json={"kind": "custom", "client_id": "cl-1", "body": "Hi Dr Sara, a quick update: the homepage is in review."}).json()
    assert ok["route"] == "approval" and all(s["ok"] for s in ok["steps"][:-1])
    assert len(server.PENDING) == before_pending and evidence() == before_pairs
    assert len(c.get("/api/redteam").json()["recent"]) >= 8

def test_a_real_reply_naming_another_client_is_refused_even_without_citing_them(real):
    onboard2(); mailbox(real)
    r = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status")],
                payload={"to": "sara@orchid.example", "subject": "Hi", "body": "We are doing the same for Harbor Logistics."})
    assert r["decision"]["route"] == "refuse" and "another client" in r["decision"]["why"]

# ---------------------------------------------------------------- 3. teammates as approvers
def test_a_delegated_teammate_decides_low_risk_work_with_their_own_link(real):
    onboard2(); mailbox(real)
    assert c.put("/api/approvers", json={"tm-2": {"level": "low"}}).status_code == 200
    assert c.put("/api/approvers", json={"tm-9": {"level": "low"}}).status_code == 400
    a = assign(); assert a["approvers"] == ["Danish Ali"]
    tok = server.decision_token(a, "tm-2")
    page = c.get(f"/a/{tok}").text
    assert "deciding as <b>Danish Ali</b>" in page and "on its own" not in page
    r = c.post(f"/a/{tok}", data={"kind": "approve"}); assert r.status_code == 200 and "Danish Ali" in r.text
    assert server.PENDING[a["id"]]["decided_by"] == "Danish Ali" and server.PENDING[a["id"]]["status"] == "executed"
    assert any(e.get("by") == "Danish Ali" for e in c.get("/api/audit").json())
    reply = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status")], payload={"to": "sara@orchid.example", "subject": "Hi", "body": "Hello"})
    assert reply["approvers"] == []                                             # a client email is above "low"
    c.put("/api/approvers", json={"tm-2": {"level": "client", "agents": ["operations"]}})
    reply2 = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=[fid("cl-1", "client.status")], payload={"to": "sara@orchid.example", "subject": "Hi", "body": "Hello again"})
    assert reply2["approvers"] == ["Danish Ali"] and assign()["approvers"] == []   # scoped to Operations only
    c.put("/api/approvers", json={})
    assert c.get(f"/a/{server.decision_token(reply2, 'tm-2')}").status_code == 403 # delegation withdrawn: the link stops working

def test_a_teammate_can_never_grant_autonomy_and_never_sees_promotions(real):
    onboard2(); c.put("/api/approvers", json={"tm-2": {"level": "client"}}); earn("project", "assign_subtask")
    promo = assign(); assert promo["decision"].get("promotion") and promo["approvers"] == []
    assert c.get(f"/a/{server.decision_token(promo, 'tm-2')}").status_code == 403
    assert c.post("/decision", json={"id": promo["id"], "kind": "approve", "allow_autonomy": True, "by": "Danish Ali"}).status_code == 403
    assert c.put("/api/approvers", json={"tm-1": {"level": "low"}}).status_code == 200 and server.eligible_approvers(assign()) == []   # tm-1 is the owner

# ---------------------------------------------------------------- 4. trust check-ins
def _granted_assign():
    earn("project", "assign_subtask"); c.post("/api/consent", json={"agent": "project", "cls": "assign_subtask", "allow": True})

def test_autonomy_is_reconfirmed_after_the_checkin_period(real):
    onboard2(); _granted_assign()
    assert assign()["decision"]["route"] == "auto"
    m = persist.get("consent_meta"); m["project|assign_subtask"]["since"] = time.time() - 15 * 86400; persist.put("consent_meta", m)
    a = assign(); d = a["decision"]
    assert d["route"] == "approval" and d.get("checkin") and "15 days" in d["why"] and a["approvers"] == []
    c.post("/decision", json={"id": a["id"], "kind": "approve", "allow_autonomy": True})
    assert assign()["decision"]["route"] == "auto"
    assert any(e["event"] == "autonomy_reconfirmed" for e in c.get("/api/audit").json())

def test_an_undo_triggers_a_checkin_and_the_owner_can_take_autonomy_back(real):
    onboard2(); earn("project", "assign_subtask", 20); c.post("/api/consent", json={"agent": "project", "cls": "assign_subtask", "allow": True})
    a = assign(); assert a["decision"]["route"] == "auto"
    c.post(f"/api/actions/{a['id']}/undo")
    nxt = assign()                                                              # a long record survives one undo, but the owner is asked again
    assert nxt["decision"]["route"] == "approval" and nxt["decision"].get("checkin") and "undid" in nxt["decision"]["why"]
    assert next(x for x in c.get("/api/consent").json()["classes"] if x["cls"] == "assign_subtask")["checkin_due"]
    c.post("/decision", json={"id": nxt["id"], "kind": "approve", "revoke_autonomy": True})
    assert server.consent_of("project", "assign_subtask") == "declined"
    held = assign()["decision"]; assert held["route"] == "approval" and "keep approving" in held["why"]

def test_a_short_record_loses_autonomy_on_one_undo_without_a_checkin(real):
    onboard2(); _granted_assign()
    a = assign(); c.post(f"/api/actions/{a['id']}/undo")
    d = assign()["decision"]; assert d["route"] == "approval" and not d.get("checkin") and "unreliably" in d["why"]

# ---------------------------------------------------------------- 5. trust report
def test_the_trust_report_and_csv_hold_every_decision(real):
    onboard2()
    a = c.post("/api/agents/marketing/draft", json={"topic": "Scoped sites"}).json()[0]
    c.post("/decision", json={"id": a["id"], "kind": "quality", "reason": "Too salesy."})
    html = c.get("/report").text
    assert "Cedar Studio" in html and "Path to autonomy" in html and "Too salesy." in html and "Save as PDF" in html
    csv = c.get("/api/report.csv")
    assert csv.headers["content-type"].startswith("text/csv") and "decided_by" in csv.text and "owner_quality" in csv.text and ",owner," in csv.text

# ---------------------------------------------------------------- 6. first week
def test_the_first_week_plan_comes_from_the_profile(real):
    assert c.get("/api/plan/week").status_code == 409
    onboard2(); real.setenv("AGENT_SCHEDULE", "1")
    w = c.get("/api/plan/week").json()
    assert w["business"] == "Cedar Studio" and [a["agent"] for a in w["agents"]] == ["operations", "project", "sales", "marketing"]
    ops, pm, sales, mk = w["agents"]
    assert any("Orchid Clinic" in x for x in ops["does"])                        # quiet since 2026-01-01
    assert any("2 teammates" in x for x in pm["does"]) and any("never contacts a stranger" in x for x in sales["does"])
    assert any("We build websites for clinics." in x for x in mk["does"]) and mk["always_you"] and sales["always_you"]   # publishing and cold contact: fixed rules
    assert all(set(a) >= {"does", "alone", "always_you", "next_to_earn"} for a in w["agents"])
