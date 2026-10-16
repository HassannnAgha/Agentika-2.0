"""End-to-end checks on the acceptance list in development-map.md. Run: python -m pytest -q"""
import os, sys, tempfile
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = ""          # tests never touch the real database
os.environ.pop("GROQ_API_KEY", None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
import server

c = TestClient(server.app)

def fresh(): c.post("/reset?seed=true&full=true")
def sc(n): return c.post(f"/scenario/{n}").json()
def approve(a): return c.post("/decision", json={"id": a["id"], "kind": "approve"}).json()

def test_seeded_routes():
    fresh()
    assert sc("task")["decision"]["route"] == "approval"            # assign_subtask: 5 outcomes, needs 6
    assert sc("crm")["decision"]["route"] == "recall"               # flag_relationship_risk earned, partial verifiability
    assert sc("followup")["decision"]["route"] == "approval"        # reply_to_client below evidence minimum
    assert sc("new_lead")["decision"]["route"] == "escalate"        # F2
    assert sc("assign")["decision"]["route"] == "auto"              # PM already trusted on this class
    assert sc("publish")["decision"]["route"] == "escalate"

def test_live_flip_repeatable():
    for _ in range(5):
        fresh()
        a = sc("task"); assert a["decision"]["route"] == "approval"
        approve(a)
        assert sc("task")["decision"]["route"] == "auto"

def test_floor_rules_report_both():
    fresh(); why = sc("publish")["decision"]["why"]
    assert "F1" in why and "F3" in why

def test_poisoned_refused_and_not_penalised():
    fresh(); before = c.get("/state").json()
    a = sc("poisoned")
    assert a["decision"]["route"] == "refuse" and "outside this client" in a["decision"]["why"]
    after = c.get("/state").json()
    pick = lambda s: {x["cls"]: x["counts"] for x in s["classes"]}
    assert pick(before) == pick(after)                              # a guardrail doing its job is not evidence about competence

def test_lead_outreach_escalates_and_sends_to_outbox_only():
    fresh(); a = sc("new_lead")
    assert a["decision"]["route"] == "escalate" and "F2" in a["decision"]["why"]
    assert a["cited"] and a["facts"]
    done = approve(a)
    assert done["status"] == "executed" and done["verified"] is True
    rows = c.get("/api/outbox").json()
    assert rows and rows[0]["delivered_to"] is None                 # no SMTP configured: outbox file only, nothing leaves the machine

def test_failed_executor_records_failure_without_crashing(monkeypatch):
    fresh(); import executors
    monkeypatch.setattr(executors, "FAIL_RATE", 1.0)
    a = sc("task"); done = approve(a)
    assert done["verified"] is False and c.get("/health").json()["ok"]

def test_preference_vs_quality_are_separate_counters():
    fresh(); a = sc("followup"); c.post("/decision", json={"id": a["id"], "kind": "preference"})
    b = sc("followup"); c.post("/decision", json={"id": b["id"], "kind": "quality"})
    k = next(x for x in c.get("/state").json()["classes"] if x["cls"] == "reply_to_client")["counts"]
    assert k["rp"] == 1 and k["rq"] == 1

def test_onboarding_profile_drives_guardrail():
    fresh()
    p = {"business": {"name": "Test Co", "category": "studio", "description": "d", "owner": {"name": "O", "email": "o@test.example"}},
         "clients": [{"id": "cl-1", "name": "A Ltd", "contact": {"name": "A", "email": "a@a.example"}, "status": "active", "notes": "A secret"},
                     {"id": "cl-2", "name": "B Ltd", "contact": {"name": "B", "email": "b@b.example"}, "status": "active", "notes": "B secret"}],
         "team": [{"id": "tm-1", "name": "T", "role": "Project manager", "skills": ["x"]}], "brand": {}, "connections": {"email": {"status": "connected"}, "task_tool": {"status": "connected"}}}
    assert c.post("/api/profile", json=p).json()["ok"]
    assert sc("poisoned")["decision"]["route"] == "refuse"
    c.post("/reset?seed=true&full=true")

def test_declined_connection_makes_agent_inactive():
    fresh()
    p = server.STORE.profile; saved = dict(p["connections"])
    p["connections"] = {"email": {"status": "declined"}, "task_tool": {"status": "connected"}}
    a = sc("followup")
    assert a["decision"]["route"] == "refuse" and "inactive" in a["decision"]["why"]
    p["connections"] = saved

def test_wizard_shaped_profile_without_notes_still_refuses_leak():
    """The wizard's fixture has no client notes; the guardrail must still catch a cross-client citation."""
    fresh()
    p = {"business": {"name": "W Co", "category": "studio", "description": "d", "owner": {"name": "O", "email": "o@w.example"}},
         "clients": [{"id": "cl-1", "name": "One", "contact": {"name": "A", "email": "a@one.example"}, "status": "active", "custom": [{"label": "Retainer", "value": "monthly"}]},
                     {"id": "cl-2", "name": "Two", "contact": {"name": "B", "email": "b@two.example"}, "status": "active", "custom": []}],
         "team": [{"id": "tm-1", "name": "T", "role": "Project manager", "skills": []}], "brand": {"permitted_claims": [{"text": "We ship."}]},
         "connections": {"email": {"status": "connected"}, "task_tool": {"status": "connected"}}}
    c.post("/api/profile", json=p)
    assert sc("poisoned")["decision"]["route"] == "refuse"
    assert sc("followup")["decision"]["route"] in ("approval", "recall", "auto")
    c.post("/reset?seed=true&full=true")

def test_audit_trail_records_proposal_decision_and_execution():
    fresh(); a = sc("task"); approve(a)
    ev = [e["event"] for e in c.get("/api/audit").json() if e["id"] == a["id"]]
    assert {"proposed", "owner_approve", "executed"} <= set(ev)
    assert c.get("/api/storage").json()["backend"] == "files"