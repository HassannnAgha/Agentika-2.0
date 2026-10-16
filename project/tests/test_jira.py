"""Jira as the task tool, against a fake Jira REST API. No network."""
import os, sys, tempfile
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = ""
os.environ.pop("GROQ_API_KEY", None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, executors, jira

c = TestClient(server.app)

class FakeJira:
    def __init__(self): self.issues, self.comments, self.fail = {}, [], False
    def __call__(self, method, path, **kw):
        if self.fail: raise RuntimeError("jira down")
        if path == "/user/assignable/search": return []
        if method == "POST" and path == "/issue":
            key = f"BIZ-{len(self.issues) + 1}"; f = kw["json"]["fields"]
            self.issues[key] = {"summary": f["summary"], "labels": f["labels"], "status": "To Do"}; return {"key": key}
        key = path.split("/")[2]; i = self.issues[key]
        if method == "GET" and path.endswith("/transitions"):
            return {"transitions": [{"id": "21", "name": "Start", "to": {"name": "In Progress"}}, {"id": "31", "name": "Finish", "to": {"name": "Done"}}]}
        if method == "POST" and path.endswith("/transitions"): i["status"] = {"21": "In Progress", "31": "Done"}[kw["json"]["transition"]["id"]]; return {}
        if method == "POST" and path.endswith("/comment"): self.comments.append(key); return {}
        if method == "PUT": i["labels"] = kw["json"]["fields"]["labels"]; return {}
        return {"fields": {"summary": i["summary"], "labels": i["labels"], "status": {"name": i["status"]}}}

@pytest.fixture
def fake(monkeypatch):
    for k, v in dict(JIRA_URL="https://team.atlassian.net", JIRA_EMAIL="a@b.example", JIRA_API_TOKEN="t", JIRA_PROJECT_KEY="BIZ").items(): monkeypatch.setenv(k, v)
    f = FakeJira(); monkeypatch.setattr(jira, "_req", f)
    c.post("/reset?seed=true&full=true"); return f

def test_off_without_variables_keeps_the_simulated_store(monkeypatch):
    for k in ("JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"): monkeypatch.delenv(k, raising=False)
    c.post("/reset?seed=true&full=true")
    assert executors._task({"title": "Local only", "assignee": "Hira Tahir"}) is True
    assert "jira" not in c.get("/api/tasks").json()[-1] and c.get("/api/jira/status").json()["configured"] is False

def test_task_lifecycle_is_mirrored_to_jira(fake):
    assert executors._task({"title": "Homepage copy", "assignee": "Hira Tahir", "due": "2026-11-03"}) is True
    t = c.get("/api/tasks").json()[-1]; key = t["jira"]
    assert fake.issues[key]["summary"] == "Homepage copy" and "bizzii-hira-tahir" in fake.issues[key]["labels"]
    assert executors._reassign({"task_id": t["id"], "to": "Bilal Ahmed"}) is True
    assert "bizzii-bilal-ahmed" in fake.issues[key]["labels"] and "bizzii-hira-tahir" not in fake.issues[key]["labels"] and fake.comments == [key]
    assert executors._task_status({"task_id": t["id"], "status": "in_progress"}) is True and fake.issues[key]["status"] == "In Progress"
    assert c.post(f"/api/tasks/{t['id']}/status", json={"status": "complete"}).status_code == 200 and fake.issues[key]["status"] == "Done"

def test_jira_failure_is_an_unverified_outcome_not_a_crash(fake):
    fake.fail = True
    n = len(c.get("/api/tasks").json())
    assert executors._task({"title": "Will fail", "assignee": "Hira Tahir"}) is False
    assert len(c.get("/api/tasks").json()) == n          # nothing half-written locally
