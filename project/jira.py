"""Jira Cloud as the real task tool. Off unless JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN and JIRA_PROJECT_KEY are set; without them the
simulated task store is the whole story, exactly as before. With them, every task the executors write is mirrored to a Jira issue
and the postcondition is checked by reading the issue back. Teammates are not Jira users, so the assignee is carried as a label
(bizzii-hira-tahir) and in the description; a Jira user whose display name matches is also set as the real assignee."""
import os, re, datetime
import httpx

STATUS_NAMES = {"open": ("to do", "open", "backlog"), "in_progress": ("in progress",), "complete": ("done", "complete", "closed", "resolved")}

def configured() -> bool: return all(os.getenv(k) for k in ("JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"))

def _req(method, path, **kw):
    r = httpx.request(method, os.environ["JIRA_URL"].rstrip("/") + "/rest/api/3" + path, auth=(os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"]),
                      headers={"Accept": "application/json"}, timeout=20, **kw)
    r.raise_for_status()
    return r.json() if r.content else {}

def _label(name): return "bizzii-" + re.sub(r"[^a-z0-9]+", "-", (name or "unassigned").lower()).strip("-")
def _doc(text): return {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": line}]} for line in text.splitlines() if line.strip()]}

def _account(name):
    """Jira accountId of an assignable user whose display name matches the teammate, or None."""
    if not name: return None
    try:
        users = _req("GET", "/user/assignable/search", params={"project": os.environ["JIRA_PROJECT_KEY"], "query": name})
        return next((u["accountId"] for u in users if u.get("displayName", "").lower() == name.lower()), None)
    except Exception: return None

def _due(v):
    try: return datetime.date.fromisoformat(str(v)[:10]).isoformat()
    except Exception: return None          # "Fri" and friends stay in the description only

def create(t: dict):
    """Create the issue for a task row. Returns the issue key, or None on any failure."""
    try:
        desc = f"Assignee: {t.get('assignee') or 'unassigned'}\nClient: {t.get('client') or '-'}\nEstimate: {t.get('hours', 8)} h\nDue: {t.get('due') or '-'}\nWhy: {t.get('reason') or '-'}\nCreated by Bizzii (task #{t.get('id')})"
        fields = {"project": {"key": os.environ["JIRA_PROJECT_KEY"]}, "summary": (t.get("title") or "Task")[:250], "issuetype": {"name": os.getenv("JIRA_ISSUE_TYPE", "Task")},
                  "labels": ["bizzii", _label(t.get("assignee"))], "description": _doc(desc)}
        if _due(t.get("due")): fields["duedate"] = _due(t.get("due"))
        if (acc := _account(t.get("assignee"))): fields["assignee"] = {"accountId": acc}
        return _req("POST", "/issue", json={"fields": fields})["key"]
    except Exception as e:
        print(f"[jira] create failed: {type(e).__name__}: {str(e)[:120]}"); return None

def reassign(key, frm, to) -> bool:
    try:
        labels = [l for l in issue(key)["labels"] if not l.startswith("bizzii-") or l == "bizzii"] + [_label(to)]
        _req("PUT", f"/issue/{key}", json={"fields": {"labels": labels, "assignee": {"accountId": _account(to)}}})
        _req("POST", f"/issue/{key}/comment", json={"body": _doc(f"Bizzii reassigned this from {frm or 'nobody'} to {to}.")})
        return _label(to) in issue(key)["labels"]
    except Exception as e:
        print(f"[jira] reassign failed: {type(e).__name__}: {str(e)[:120]}"); return False

def set_status(key, status) -> bool:
    """Move the issue to the Jira status matching open / in_progress / complete."""
    try:
        want = STATUS_NAMES.get(status, (status,))
        if issue(key)["status"].lower() in want: return True
        tr = next((x for x in _req("GET", f"/issue/{key}/transitions")["transitions"] if x["to"]["name"].lower() in want or x["name"].lower() in want), None)
        if not tr: print(f"[jira] no transition to {status} on {key}"); return False
        _req("POST", f"/issue/{key}/transitions", json={"transition": {"id": tr["id"]}})
        return issue(key)["status"].lower() in want
    except Exception as e:
        print(f"[jira] status failed: {type(e).__name__}: {str(e)[:120]}"); return False

def issue(key) -> dict:
    f = _req("GET", f"/issue/{key}", params={"fields": "summary,labels,status"})["fields"]
    return {"summary": f["summary"], "labels": f.get("labels", []), "status": f["status"]["name"]}

def url(key): return f"{os.environ['JIRA_URL'].rstrip('/')}/browse/{key}"
