"""Console API: one endpoint per page of the owner console UI (fyp2/bizzii-ui, /app/*). Each returns the exact shape that
page renders today from hard-coded data, so the UI swaps its constants for a fetch and nothing else changes.

Vocabulary the UI already uses: route = automatic | recall | approval | escalation; risk = low | moderate | high | critical;
outcome = Successful | Unsuccessful | Not yet observed. Refused proposals never reach the owner, so none of these pages list them."""
import time, datetime
from fastapi import APIRouter, HTTPException
from catalogue import CLASSES, AGENT_OF, LABEL_OF, AGENT_NAMES
from gate import risk as gate_risk, tau as gate_tau, n_min as gate_n_min
from store import STORE
import persist, leadgen

ROUTE_UI = {"auto": "automatic", "recall": "recall", "approval": "approval", "escalate": "escalation"}
AGENT_UI = {"operations": "Operations", "project": "Project Mgmt", "sales": "Sales", "marketing": "Marketing"}
EXPIRES_H = {"escalate": 72, "approval": 96}          # how long an undecided action waits before it is withdrawn

def risk_level(r): return "low" if r < 0.30 else "moderate" if r < 0.50 else "high" if r < 0.70 else "critical"
def ref(i): return f"A-{i:04d}"
def fmt_when(ts): return datetime.datetime.fromtimestamp(ts).strftime("%d %b %H:%M")
def fmt_day(iso):
    try: return datetime.date.fromisoformat(iso).strftime("%d %b")
    except Exception: return "—"

def consequence(a):
    t, e, b, v = CLASSES[a["cls"]]["sig"]
    if t == "public": return "The post becomes public to everyone and cannot be taken back."
    if e == "communicate" and t in ("client", "prospect"): return f"A message reaches {a['who']} and cannot be unsent."
    if e == "communicate": return "The person is told, and cannot be un-told."
    if t == "teammate": return "A teammate's work changes, and they may act on it before it is corrected."
    return "A record changes inside Bizzii. Nothing leaves the business, and it can be corrected." if v == "full" else "A record changes inside Bizzii on the agent's judgement, which cannot be checked mechanically."

def make_router(gate, PENDING, lock):
    r = APIRouter(prefix="/api/console")

    def item(a):
        d = a["decision"]; sc = d["risk"]
        return {"id": a["id"], "ref": ref(a["id"]), "agent": AGENT_UI[a["agent"]], "action": f"{a['label']}: {a['who']}", "cls": a["cls"],
                "risk": risk_level(sc), "score": round(sc, 2), "route": ROUTE_UI.get(d["route"], d["route"]), "status": a["status"],
                "expires": f"{EXPIRES_H.get(d['route'], 96)}h", "rule": d["why"] if d["route"] == "escalate" else None}

    @r.get("/queue")
    def queue():
        """Approvals page. Escalations first, then by risk, highest first."""
        with lock:
            rows = [item(a) for a in PENDING.values() if a["status"] in ("awaiting", "recall")]
        rows.sort(key=lambda x: (x["route"] != "escalation", -x["score"]))
        return {"waiting": len(rows), "escalated": sum(1 for x in rows if x["route"] == "escalation"), "items": rows}

    @r.get("/actions/{aid}")
    def action(aid: int):
        """Review / recall / escalated / marketing detail: the action, the facts it relied on, the agent's record, the consequence."""
        with lock:
            a = PENDING.get(aid)
            if not a: raise HTTPException(404, "unknown action")
            ok, why, m = gate.evaluate(a["agent"], a["cls"]); R = gate_risk(a["cls"]); th = gate_tau(R); c = m["counts"]
            facts = [{"id": f"F-{i}", "statement": STORE.facts[i]["text"], "source": _source(STORE.facts[i])} for i in a["cited"] if i in STORE.facts]
            out = dict(item(a), who=a["who"], payload=a["payload"], why=a["decision"]["why"], facts=facts, consequence=consequence(a),
                       recall_secs_left=max(0, round(a.get("recall_until", 0) - time.time(), 1)) if a["status"] == "recall" else None,
                       competence={"lower": round(m["W"], 2), "successes": c["ok"], "outcomes": c["ok"] + c["fail"], "required": round(th, 2), "met": ok},
                       decisions={"approved": c["a"], "prefer_own": c["rp"], "wrong": c["rq"]})
        if a["cls"] == "send_lead_outreach":
            l = leadgen.LEADS.get(a["counterparty"]); out["lead"] = l and {"id": l["id"], "name": l["name"], "email": l["email"], "score": l["score"], "reasons": l["reasons"]}
        return out

    def _source(f):
        o = f["owner"]
        if o == "business": return "Business record, recorded in onboarding"
        if STORE.client(o): return f"Client record: {STORE.client(o)['name']}, recorded in onboarding"
        return "Public source, recorded by the Sales agent"

    @r.get("/agents")
    def agents():
        """Agents page: what each agent has earned for each kind of action."""
        out = {}
        with lock:
            for cls in CLASSES:
                ag = AGENT_OF[cls]; ok, why, m = gate.evaluate(ag, cls); R = gate_risk(cls); c = m["counts"]
                from gate import floor_rule
                fl = floor_rule(cls, {})
                route = "escalation" if fl else ("automatic" if ok and CLASSES[cls]["sig"][3] == "full" else "recall" if ok else "approval")
                n = c["ok"] + c["fail"]
                if n == 0 and not fl and not (c["a"] + c["rp"] + c["rq"]): continue          # kinds never attempted stay off the page
                sd = (not fl) and m["nW"] >= gate_n_min(R) and min(m["W"], m["A"]) >= gate_tau(R) and m["D"] < gate_tau(R)
                out.setdefault(ag, []).append({"c": LABEL_OF[cls], "s": c["ok"], "n": n, "lower": round(m["W"], 2), "req": None if fl else round(gate_tau(R), 2), "route": route,
                                               "suggest_delegate": "Sound on this, held back only by your preference. Delegate it?" if sd else None})
        return [{"name": f"{AGENT_NAMES[a]} Agent", "key": a, "classes": out.get(a, [])} for a in AGENT_NAMES]

    @r.get("/activity")
    def activity(n: int = 50):
        """Activity page: what ran without asking (automatic or after a recall window), and how it turned out."""
        rows = []
        for e in persist.tail("audit", 400):
            if e["event"] != "executed" or e["route"] not in ("auto", "recall"): continue
            rows.append({"id": e["id"], "ref": ref(e["id"]), "when": e["t"], "agent": AGENT_UI.get(e["agent"], e["agent"]), "action": f"{e['label']}: {e['who']}",
                         "route": ROUTE_UI[e["route"]], "outcome": "Successful" if e.get("verified") is True else "Unsuccessful" if e.get("verified") is False else "Not yet observed"})
        return {"count": len(rows), "rows": rows[:n]}

    def _tasks(): return persist.get("tasks", []) or []
    def _projects(): return persist.get("projects", []) or []

    @r.get("/clients")
    def clients():
        flagged = {a["counterparty"] for a in PENDING.values() if a["cls"] == "flag_relationship_risk" and a["status"] in ("awaiting", "recall", "executed")}
        tasks, rows = _tasks(), []
        for c in STORE.clients():
            mine = [t for t in tasks if t.get("client") == c["name"]]
            rows.append({"id": c["id"], "n": c["name"], "e": c["contact"]["email"], "contact": c["contact"]["name"], "s": "At risk" if c["id"] in flagged else c.get("status", "active").capitalize(),
                         "last": fmt_day(c.get("last_contact", "")), "proj": sum(1 for p in _projects() if p.get("client") == c["name"]), "open": sum(1 for t in mine if t.get("status") != "complete")})
        return {"count": len(rows), "at_risk": sum(1 for x in rows if x["s"] == "At risk"), "clients": rows}

    @r.get("/team")
    def team():
        tasks, rows = _tasks(), []
        for m in STORE.team():
            mine = [t for t in tasks if t.get("assignee") == m["name"]]
            rows.append({"id": m.get("id"), "n": m["name"], "r": m.get("role", ""), "e": m.get("email", ""), "skills": m.get("skills", []),
                         "capacity": m.get("weekly_capacity_hours"), "open": sum(1 for t in mine if t.get("status") != "complete"), "done": sum(1 for t in mine if t.get("status") == "complete")})
        return {"count": len(rows), "team": rows}

    @r.get("/tasks")
    def tasks():
        rows = [{"t": t["title"], "p": t.get("client", ""), "a": t.get("assignee") or "Unassigned", "s": "Complete" if t.get("status") == "complete" else "In progress" if t.get("status") == "in_progress" else "Open",
                 "d": "—", "ref": f"NL-{400 + t['id']}", "due": t.get("due"), "reason": t.get("reason")} for t in reversed(_tasks())]
        return {"count": len(rows), "tasks": rows}

    @r.get("/projects")
    def projects():
        rows = [{"n": p["name"], "c": p.get("client", ""), "s": "Confirmed", "tasks": f"{len(p.get('subtasks', []))} subtasks", "subtasks": p.get("subtasks", []), "due": "—"} for p in reversed(_projects())]
        with lock:
            for a in PENDING.values():
                if a["cls"] == "decompose_project" and a["status"] in ("awaiting", "recall"):
                    rows.insert(0, {"n": a["payload"].get("project", ""), "c": a["who"], "s": "Awaiting confirmation", "tasks": "—", "subtasks": a["payload"].get("subtasks", []), "due": "—", "action_id": a["id"], "pending": True})
        return {"count": len(rows), "projects": rows}

    @r.get("/leads")
    def leads():
        st = {"proposed": "In campaign", "new": "Not contacted", "enriched": "Not contacted", "drafted": "Not contacted"}
        rows = [{"id": l["id"], "n": l["name"], "e": l["email"] or "—", "c": l["category"], "l": l.get("geo") or l["address"][:30], "src": {"sample": "Sample data", "website": "Their website"}.get(l["source"], "Public listing"),
                 "st": st.get(l["status"], l["status"]) if l["email"] else "No contact listed", "score": l["score"], "sample": l["sample"]} for l in leadgen.listing()]
        return {"count": len(rows), "leads": rows}

    @r.get("/campaigns")
    def campaigns():
        with lock: waiting = [a for a in PENDING.values() if a["cls"] == "send_lead_outreach" and a["status"] == "awaiting"]
        sent = [x for x in persist.tail("outbox", 100) if "lead" in str(x.get("subject", "")).lower() or True][:50]
        done = [a for a in PENDING.values() if a["cls"] == "send_lead_outreach" and a["status"] == "executed"]
        return {"awaiting": [{"id": a["id"], "ref": ref(a["id"]), "to": a["who"], "email": a["payload"].get("to")} for a in waiting],
                "sent": [{"n": a["who"], "at": fmt_when(a["created"]), "st": "Sent" if a.get("verified") else "Failed"} for a in done], "held_by": "Unsolicited contact"}

    @r.get("/memory")
    def memory():
        msgs = persist.tail("messages", 30)
        return {"messages_recorded": len(msgs), "facts_drawn": len(STORE.facts), "messages": msgs,
                "facts": [{"id": f"F-{i}", "statement": x["text"], "owner": x["owner"], "kind": x["kind"]} for i, x in STORE.facts.items()]}

    @r.get("/brand")
    def brand():
        used = {}
        with lock:
            for a in PENDING.values():
                for i in a["cited"]: used[i] = used.get(i, 0) + 1
        b = STORE.profile.get("brand", {})
        return {"voice": b.get("voice", ""), "positioning": b.get("positioning", ""),
                "claims": [{"c": x["text"], "used": used.get(STORE.fid("business", f"biz.claim.{n}"), 0)} for n, x in enumerate(b.get("permitted_claims", []))],
                "prohibited": [x["text"] for x in b.get("prohibited_claims", [])]}

    @r.get("/services")
    def services():
        conn = STORE.profile.get("connections", {})
        return {"services": [{"key": k, "name": {"email": "Email", "task_tool": "Task management"}.get(k, k), "status": v.get("status"), "simulated": v.get("simulated", True)} for k, v in conn.items()]}

    return r
