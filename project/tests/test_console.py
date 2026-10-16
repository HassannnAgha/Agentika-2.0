"""The console API serves the shapes the owner console pages render. Deterministic fallbacks, no AI key, no database."""
import os, sys, tempfile
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = ""
os.environ.pop("GROQ_API_KEY", None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
import server

c = TestClient(server.app)
def fresh(): c.post("/reset?seed=true&full=true")
def get(p): return c.get("/api/console" + p).json()
def approve(i): return c.post("/decision", json={"id": i, "kind": "approve"}).json()

def test_queue_lists_escalations_first_then_by_risk_with_ui_vocabulary():
    fresh()
    c.post("/scenario/task"); c.post("/scenario/followup"); c.post("/scenario/new_lead"); c.post("/scenario/publish")
    q = get("/queue")
    assert q["waiting"] == 4 and q["escalated"] == 2
    routes = [x["route"] for x in q["items"]]
    assert routes[:2] == ["escalation", "escalation"] and set(routes[2:]) == {"approval"}
    assert all(x["risk"] in ("low", "moderate", "high", "critical") and x["ref"].startswith("A-") for x in q["items"])
    scores = [x["score"] for x in q["items"][2:]]; assert scores == sorted(scores, reverse=True)

def test_refused_proposals_never_appear_in_the_queue():
    fresh(); c.post("/scenario/poisoned")
    assert get("/queue")["waiting"] == 0

def test_action_detail_has_facts_competence_and_consequence():
    fresh(); a = c.post("/scenario/followup").json()
    d = get(f"/actions/{a['id']}")
    assert d["facts"] and d["facts"][0]["id"].startswith("F-") and d["facts"][0]["source"]
    assert d["competence"]["outcomes"] == 6 and d["competence"]["met"] is False and d["competence"]["required"] > 0.7
    assert "cannot be unsent" in d["consequence"] and d["payload"]["subject"]
    assert c.get("/api/console/actions/99999").status_code == 404

def test_agents_page_shape_and_routes():
    fresh(); ag = get("/agents")
    assert [a["name"] for a in ag] == ["Operations Agent", "Project Management Agent", "Sales Agent", "Marketing Agent"]
    pm = next(a for a in ag if a["key"] == "project")["classes"]
    flip = next(x for x in pm if x["c"] == "Assign a subtask")
    assert flip["route"] == "approval" and flip["s"] == 5 and set(flip) == {"c", "s", "n", "lower", "req", "route", "suggest_delegate"}
    a = c.post("/scenario/task").json(); approve(a["id"])
    flip = next(x for x in next(a for a in get("/agents") if a["key"] == "project")["classes"] if x["c"] == "Assign a subtask")
    assert flip["route"] == "automatic" and flip["s"] == 6              # the live flip, as the UI will show it
    sales = next(a for a in ag if a["key"] == "sales")["classes"]
    assert any(x["route"] == "escalation" and x["req"] is None for x in sales) or sales == []

def test_activity_lists_only_what_ran_without_asking_and_outcome():
    fresh(); c.post("/scenario/assign")                                  # trusted class: runs automatically, and so does telling the teammate
    a = c.post("/scenario/task").json(); approve(a["id"])               # owner-approved: not "without asking"
    rows = get("/activity")["rows"]
    assert {r["id"] for r in rows}.isdisjoint({a["id"]}) and all(r["route"] == "automatic" and r["outcome"] == "Successful" for r in rows)
    assert any("Reassign" in r["action"] for r in rows) and len(rows) >= 1

def test_pm_plan_populates_projects_tasks_team_and_clients():
    fresh()
    plan = c.post("/api/agents/pm/plan", json={"client_id": "cl-3", "brief": "Refresh the site. Design a new look. Build pages in Next.js. Review with the client."}).json()
    p = get("/projects")["projects"]; assert p[0]["s"] == "Awaiting confirmation" and p[0]["subtasks"]
    approve(plan[0]["id"])
    assert get("/projects")["projects"][0]["s"] == "Confirmed"
    for x in plan[1:]: approve(x["id"])
    t = get("/tasks")["tasks"]; assert len(t) == len(plan) - 1 and t[0]["p"] == "Avery Logistics" and t[0]["a"] != "Unassigned"
    cl = next(x for x in get("/clients")["clients"] if x["n"] == "Avery Logistics"); assert cl["open"] == len(t) and cl["proj"] == 1
    assert sum(m["open"] for m in get("/team")["team"]) == len(t)

def test_clients_marks_at_risk_after_a_flag_is_raised():
    fresh(); c.post("/api/agents/ops/scan")
    cl = get("/clients"); assert cl["at_risk"] >= 1

def test_leads_campaigns_memory_brand_services():
    fresh(); a = c.post("/scenario/new_lead").json()
    L = get("/leads"); assert L["count"] >= 3 and {"n", "e", "c", "l", "src", "st"} <= set(L["leads"][0])
    assert get("/campaigns")["awaiting"][0]["id"] == a["id"]
    approve(a["id"]); assert get("/campaigns")["sent"][0]["st"] == "Sent"
    c.post("/api/agents/ops/inbound", json={"sender": "omar@meridian.example", "subject": "Hi", "body": "Status please"})
    m = get("/memory"); assert m["messages"][0]["from"] == "omar@meridian.example" and m["facts_drawn"] > 5
    b = get("/brand"); assert b["claims"] and b["voice"] and "used" in b["claims"][0]
    assert [s["status"] for s in get("/services")["services"]] == ["connected", "connected"]
