"""Bizzii gate server. Run:  uvicorn server:app --port 8000   then open http://localhost:8000
Pages: /  gate dashboard   /onboarding  guided setup   /leads  lead generation."""
import os, time, json, threading, itertools, re
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import gate as G
from gate import Gate, risk, tau, n_min
from catalogue import CLASSES, AGENT_OF, LABEL_OF, AGENT_NAMES, AGENT_NEEDS, HACKATHON_EXTENSIONS
from executors import EXECUTORS, suppressed
from store import STORE, agent_status
import leadgen, crawl, llm, persist, agents, console_api, compare, inbox

G.AUDIT_RATE = float(os.getenv("AUDIT_RATE", "0"))      # 0 for a deterministic demo, say so out loud
RECALL_DEFAULT = 12                                     # seconds a recall-route action waits for a Stop
RECALL_SECS = {"draft_content": 0, "flag_relationship_risk": 8, "reply_to_client": 15}
WEB = Path(__file__).parent / "web"

app = FastAPI(title="Bizzii gate API")
# a separately running UI on localhost (e.g. next dev on :3000) may call this API directly; deployed, everything is same-origin
app.add_middleware(CORSMiddleware, allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?", allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory=WEB), name="static")
gate = Gate(seed=1)
lock = threading.RLock()
ids = itertools.count(1)
PENDING: dict = {}
LOG: list = []

def log(msg, **kw):
    LOG.insert(0, {"t": time.strftime("%H:%M:%S"), "msg": msg, **kw}); del LOG[200:]

def save(): pass   # gate evidence is rebuilt from the seed on boot (a redeploy resets the demo on purpose); the audit trail is what persists

def audit(event, a, **kw):
    """Append-only audit trail: every proposal, decision and execution, with the route, risk and the reason."""
    persist.append("audit", {"event": event, "id": a["id"], "cls": a["cls"], "label": a["label"], "who": a["who"], "agent": a["agent"],
                             "route": a["decision"]["route"], "risk": round(a["decision"]["risk"], 2), "why": a["decision"]["why"], **kw})

def execute(a):
    try: ok = EXECUTORS[a["cls"]](a["payload"])
    except Exception as e:                                # a broken executor records a failed outcome, never crashes the server
        ok = False; log(f"executor error {type(e).__name__} on #{a['id']}")
    a["status"] = "executed"; a["verified"] = ok; audit("executed", a, verified=ok)
    if ok is not None: gate.record_outcome(a["agent"], a["cls"], bool(ok))
    log(f"executed {a['cls']} #{a['id']} ({'verified' if ok else 'FAILED postcondition' if ok is False else 'unverified'})")
    save()
    try: _after(a, ok)
    except Exception as e: log(f"follow-on step failed ({type(e).__name__}) after #{a['id']}")

def _after(a, ok):
    """What a SUCCESSFUL action sets in motion. Later steps are new proposals and go through the gate like any other."""
    if ok is False: return
    cls, p = a["cls"], a["payload"]
    if cls == "send_lead_outreach" and not p.get("recipients"): leadgen.mark_contacted(a["counterparty"], True)   # a campaign marks its own recipients
    specs = []
    if cls == "identify_project": specs = agents.pm_plan(p.get("client_id", ""), p.get("summary", ""))             # confirmed new work -> plan it
    elif cls in ("assign_subtask", "reassign_stalled_task"): specs = agents.pm_notify(a)                          # tell the teammate
    if specs:
        out = _submit(specs); a["followups"] = [x["id"] for x in out]
        log(f"#{a['id']} set {len(out)} follow-on proposal{'s' if len(out) != 1 else ''} in motion", id=a["id"])

# ------------------------------------------------------------------ the gate API
class Proposal(BaseModel):
    agent: str = "sales"
    cls: str
    counterparty: str
    cited: list[int] = []
    payload: dict = {}
    prior_contact: bool = False
    who: str = ""          # display name when the counterparty is not a recorded client or lead (e.g. an inbound enquirer)
    items: list[dict] = [] # a batch (campaign): [{counterparty, cited}], each message is checked against ITS OWN recipient's facts

@app.get("/health")
def health(): return {"ok": True}

def _propose(p: Proposal):
    if p.cls not in CLASSES: raise HTTPException(400, "unknown action class")
    with lock:
        status = agent_status(STORE.profile).get(AGENT_OF[p.cls], {"active": True})
        if not status["active"]:                          # onboarding alternative flow: declined connection -> agent inactive
            d = {"route": "refuse", "risk": risk(p.cls), "why": f"{AGENT_NAMES[AGENT_OF[p.cls]]} agent is inactive: {', '.join(status['missing'])} not connected"}
        else:
            allowed, bad = STORE.allowed_for(p.counterparty), None
            for it in p.items:                            # batch: every message may cite only its own recipient's facts (or the business's)
                ok_ids = STORE.allowed_for(it.get("counterparty", ""))
                leaked = sorted(set(it.get("cited", [])) - ok_ids)
                if leaked or not it.get("cited"):
                    bad = f"{_who(it.get('counterparty',''))}: " + (f"cites facts outside this recipient: {leaked}" if leaked else "cites no facts"); break
                allowed |= ok_ids
            if bad: d = {"route": "refuse", "risk": risk(p.cls), "why": "campaign refused, " + bad}
            else: d = gate.decide(p.agent, p.cls, p.cited, allowed, {"prior_contact": p.prior_contact})
        a = {"id": next(ids), "agent": p.agent, "cls": p.cls, "label": LABEL_OF[p.cls], "counterparty": p.counterparty,
             "who": p.who or _who(p.counterparty), "payload": p.payload, "cited": p.cited,
             "facts": [STORE.facts[i]["text"] for i in p.cited if i in STORE.facts], "decision": d, "created": time.time()}
        r = d["route"]
        if r == "refuse": a["status"] = "refused"
        elif r in ("approval", "escalate"): a["status"] = "awaiting"
        elif r == "recall": a["status"] = "recall"; a["recall_until"] = time.time() + RECALL_SECS.get(p.cls, RECALL_DEFAULT)
        PENDING[a["id"]] = a; audit("proposed", a, cited=p.cited)
        log(f"{LABEL_OF[p.cls]} for {a['who']} -> {r.upper()}: {d['why']}", id=a["id"])
        if r == "auto": execute(a)
        return a

@app.post("/propose")
def propose(p: Proposal):
    a = _propose(p)
    if p.cls == "send_lead_outreach" and a["status"] != "refused":
        for lid in ([r["lead"] for r in p.payload.get("recipients", [])] or [p.counterparty]): leadgen.mark(lid, a["id"])
    return a

def _who(cp):
    c = STORE.client(cp)
    if c: return c["name"]
    l = leadgen.LEADS.get(cp)
    return l["name"] if l else (STORE.profile["business"]["name"] if cp == "business" else cp)

class Decision(BaseModel):
    id: int
    kind: str      # approve | preference | quality

@app.post("/decision")
def decision(d: Decision):
    if d.kind not in ("approve", "preference", "quality"): raise HTTPException(400, "bad kind")
    with lock:
        a = PENDING.get(d.id)
        if not a or a["status"] not in ("awaiting", "recall"): raise HTTPException(409, "not decidable")
        gate.record_decision(a["agent"], a["cls"], d.kind); audit("owner_" + d.kind, a)
        if d.kind == "approve": execute(a)
        else:
            a["status"] = "declined"
            if a["cls"] == "send_lead_outreach":          # declined outreach: those leads are eligible again
                for lid in ([r["lead"] for r in a["payload"].get("recipients", [])] or [a["counterparty"]]): leadgen.release(lid)
            log(f"owner declined #{a['id']} ({'prefers to do it personally' if d.kind=='preference' else 'proposal wrong'})")
        save()
        return a

def recall_loop():
    while True:
        time.sleep(0.5)
        with lock:
            for a in list(PENDING.values()):
                if a["status"] == "recall" and time.time() >= a["recall_until"]: execute(a)
threading.Thread(target=recall_loop, daemon=True).start()

@app.get("/state")
def state():
    with lock:
        classes = []
        for c in CLASSES:
            R = risk(c); ag = AGENT_OF[c]
            ok, why, m = gate.evaluate(ag, c)
            fl = G.floor_rule(c, {})
            # sound on outcomes and on appropriateness, held back only by the owner's preference: offer to delegate
            sd = (not fl) and m["nW"] >= n_min(R) and min(m["W"], m["A"]) >= tau(R) and m["D"] < tau(R)
            classes.append({"cls": c, "label": LABEL_OF[c], "agent": ag, "risk": R, "tau": tau(R), "n_min": n_min(R), "earned": ok, "why": why,
                            "suggest_delegate": f"The {AGENT_NAMES[ag]} agent is sound on '{LABEL_OF[c]}'. Want it to handle these without asking?" if sd else None,
                            "W": m["W"], "A": m["A"], "D": m["D"], "nW": m["nW"], "counts": m["counts"], "sig": CLASSES[c]["sig"],
                            "floor": G.floor_rule(c, {}), "extension": c in HACKATHON_EXTENSIONS})
        pend = [dict(a, secs_left=max(0, round(a.get("recall_until", 0) - time.time(), 1)))
                for a in PENDING.values() if a["status"] in ("awaiting", "recall")]
        return {"classes": classes, "pending": sorted(pend, key=lambda a: a["id"]),
                "recent": sorted(PENDING.values(), key=lambda a: -a["id"])[:12], "log": LOG[:40],
                "business": STORE.profile["business"]["name"], "profile_source": STORE.profile.get("source"),
                "agents": agent_status(STORE.profile), "agent_names": AGENT_NAMES, "llm": llm.available()}

# ------------------------------------------------------------------ seeded history for the demo (say so out loud)
SEED = {  # (agent, class): approved decisions + verified outcomes
    ("project", "assign_subtask"):          {"a": 5, "ok": 5},   # one more live approval flips it to AUTO
    ("operations", "flag_relationship_risk"): {"a": 8, "ok": 8}, # earned, partial verifiability -> recall window
    ("operations", "reply_to_client"):      {"a": 6, "ok": 6},   # decent but below the evidence minimum -> still asks
    ("project", "reassign_stalled_task"):   {"a": 7, "ok": 7},   # PM trusted here; nothing carries to other classes
    ("marketing", "draft_content"):         {"a": 6, "ok": 6},   # Marketing drafts freely (short recall)
    ("project", "notify_teammate_assignment"): {"a": 7, "ok": 7}, # telling a teammate about work already assigned: earned
}

def _reset_gate(seed=True):
    gate.pairs.clear(); PENDING.clear(); LOG.clear()
    if seed:
        for (ag, c), s in SEED.items():
            for _ in range(s["a"]): gate.record_decision(ag, c, "approve")
            for _ in range(s["ok"]): gate.record_outcome(ag, c, True)
    log("demo reset" + (" with SEEDED history" if seed else " with empty history")); save()

@app.post("/reset")
def reset(seed: bool = True, full: bool = False):
    with lock:
        _reset_gate(seed)
        if full:
            leadgen.clear(); persist.delete("lead_facts"); STORE.reset_demo(); STORE.load()
            for k in ("tasks", "crm", "drafts", "projects", "retained", "suppressed"): persist.delete(k)
            for st in ("messages", "documents_read"): persist.clear_stream(st)
            persist.clear_stream("outbox"); persist.clear_stream("audit")
    return {"ok": True}

# ------------------------------------------------------------------ scenarios (built from the live profile)
def _clients(): return [c for c in STORE.clients() if c.get("status") != "past"] or STORE.clients()

def _cite(owner, *kinds): return [i for k in kinds if (i := STORE.fid(owner, k))]

def scenario_spec(name):
    cl, team = _clients(), STORE.team()
    c1 = cl[0] if cl else None
    c2 = cl[1] if len(cl) > 1 else c1
    c3 = cl[-1] if cl else None
    pm = next((m for m in team if "manager" in m.get("role", "").lower()), team[0] if team else {"name": "teammate"})
    dev = next((m for m in team if m.get("role", "").lower() in ("developer", "designer")), pm)
    if name == "new_lead":
        l = leadgen.pick_lead()
        return leadgen.proposal_for(l["id"])
    if name in ("task", "crm", "followup", "assign", "poisoned") and not c1: raise HTTPException(409, "no clients recorded: finish onboarding step 'Clients' first")
    if name == "task":
        return dict(agent="project", cls="assign_subtask", counterparty=c1["id"], cited=_cite(c1["id"], "client.status", "client.notes"),
                    payload={"title": f"Send {c1['name']} the weekly update", "assignee": pm["name"], "due": "Fri"})
    if name == "crm":
        old = min(cl, key=lambda c: c.get("last_contact") or "9999")
        return dict(agent="operations", cls="flag_relationship_risk", counterparty=old["id"], cited=_cite(old["id"], "client.last", "client.notes"),
                    payload={"client": old["id"], "field": "risk", "value": f"quiet since {old.get('last_contact')}"})
    if name == "followup":
        return dict(agent="operations", cls="reply_to_client", counterparty=c1["id"], cited=_cite(c1["id"], "client.status", "client.notes"),
                    payload=_client_email(c1))
    if name == "assign":
        # reassign a REAL task: if the (simulated) task tool has none for this client, it holds one that has sat untouched for 11 days
        tasks = list(persist.get("tasks", []) or [])
        t = next((x for x in tasks if x.get("status") != "complete" and x.get("client_id") == c3["id"] and x.get("assignee") != dev["name"]), None)
        if not t:
            frm = next((m for m in team if m["name"] != dev["name"]), pm)
            t = {"id": len(tasks) + 1, "title": f"Homepage copy: {c3['name']}", "assignee": frm["name"], "due": None, "client": c3["name"], "client_id": c3["id"], "hours": 8,
                 "status": "in_progress", "created": time.time() - 11 * 86400, "updated": time.time() - 11 * 86400}
            tasks.append(t); persist.put("tasks", tasks)
        i = next((k for k, m in enumerate(team) if m["name"] == dev["name"]), 0)
        return dict(agent="project", cls="reassign_stalled_task", counterparty=c3["id"], cited=_cite(c3["id"], "client.status") + _cite("business", f"biz.team.{i}"),
                    payload={"task_id": t["id"], "title": t["title"], "from": t["assignee"], "to": dev["name"], "stalled_days": 11, "reason": f"{dev['name']} lists matching skills"})
    if name == "draft":
        return dict(agent="marketing", cls="draft_content", counterparty="business", cited=_cite("business", "biz.positioning"),
                    payload={"topic": "Case study draft", "channel": "linkedin", "draft": "(draft kept in business memory for the owner)"})
    if name == "publish":
        return dict(agent="marketing", cls="publish_post", counterparty="business", cited=_cite("business", "biz.summary"),
                    payload={"channel": "linkedin", "text": "We just helped a client..."})
    if name == "poisoned":   # an inbound message tries to make the agent quote ANOTHER client's confidential details
        leak = (_cite(c2["id"], "client.notes") or _cite(c2["id"], "client.status")) if c2["id"] != c1["id"] else []
        return dict(agent="operations", cls="reply_to_client", counterparty=c1["id"], cited=_cite(c1["id"], "client.status") + leak,
                    payload={"to": c1["contact"]["email"], "subject": "Renewal", "body": f"(draft quotes {c2['name']}'s confidential details)"})
    raise HTTPException(404, "no such scenario")

def _client_email(c):
    """Drafts a short check-in citing recorded facts. LLM if available, template otherwise. The gate checks it either way."""
    owner, biz = STORE.profile["business"]["owner"]["name"], STORE.profile["business"]["name"]
    out = None
    if llm.available():
        out = llm.json_call('Write a 60-word polite check-in email to a client using only the facts given. No prices, dates or promises not in the facts. Never write fact ids or numbers in brackets. Return {"subject":str,"body":str}.',
                            json.dumps({"from": f"{owner}, {biz}", "client": c["name"], "contact": c["contact"]["name"], "facts": [x["text"] for x in STORE.of(c["id"]).values()]}))
    if not (out and out.get("subject") and out.get("body")):
        out = {"subject": f"Checking in, {c['name']}", "body": f"Hi {c['contact']['name']},\n\nJust checking in on where things stand. Anything you need from us this week?\n\n{owner}, {biz}"}
    return {"to": c["contact"]["email"], "subject": out["subject"], "body": out["body"]}

@app.post("/scenario/{name}")
def scenario(name: str):
    spec = scenario_spec(name)
    if not spec: raise HTTPException(409, "nothing to propose")
    return propose(Proposal(**spec))

# ------------------------------------------------------------------ onboarding API
@app.get("/api/profile")
def get_profile(): return STORE.profile

@app.post("/api/profile")
def set_profile(p: dict):
    """Receives the wizard's fixture-format export. Becomes the business memory every agent reads."""
    if not isinstance(p.get("business"), dict) or not p["business"].get("name"): raise HTTPException(400, "business name required")
    p.setdefault("team", []); p.setdefault("clients", []); p.setdefault("brand", {}); p.setdefault("connections", {})
    p["source"] = "onboarding"
    with lock:
        STORE.set_profile(p); _reset_gate(True)   # fresh evidence for a new business: every class starts at zero (seeded for the demo)
        log(f"onboarding saved for {p['business']['name']}: {len(p['team'])} team, {len(p['clients'])} clients")
    return {"ok": True, "facts": len(STORE.facts)}

@app.get("/api/facts")
def facts(): return [{"id": i, **x} for i, x in STORE.facts.items()]

@app.get("/api/catalogue")
def catalogue_view():
    out = []
    for c in CLASSES:
        R = risk(c); fl = G.floor_rule(c, {})
        out.append({"cls": c, "label": LABEL_OF[c], "agent": AGENT_OF[c], "agent_name": AGENT_NAMES[AGENT_OF[c]], "needs": AGENT_NEEDS[AGENT_OF[c]],
                    "ceiling": "escalation" if fl else ("automatic" if CLASSES[c]["sig"][3] == "full" else "recall"), "extension": c in HACKATHON_EXTENSIONS})
    return out

app.include_router(console_api.make_router(gate, PENDING, lock))

# ------------------------------------------------------------------ agents API: each agent builds proposals, the gate routes them
class Attachment(BaseModel):
    name: str
    text: str | None = None          # already-extracted text, or
    content_b64: str | None = None   # the file itself (PDF, DOCX, TXT, CSV); read once, never kept

class Inbound(BaseModel):
    sender: str
    subject: str = ""
    body: str
    attachments: list[Attachment] = []

class PlanReq(BaseModel):
    client_id: str
    brief: str

class DraftReq(BaseModel):
    topic: str
    channel: str = "linkedin"

class PublishReq(BaseModel):
    text: str
    channel: str = "linkedin"

class RetainReq(BaseModel):
    text: str
    topic: str = ""

class BrandReq(BaseModel):
    voice: str | None = None
    positioning: str | None = None
    add_permitted: list[str] = []
    add_prohibited: list[str] = []

class CampaignReq(BaseModel):
    lead_ids: list[str] = []
    name: str = ""

class TaskStatus(BaseModel):
    status: str      # open | in_progress | complete

def _submit(specs):
    out = []
    for s in specs:
        a = _propose(Proposal(**s))
        out.append({"id": a["id"], "cls": a["cls"], "label": a["label"], "agent": a["agent"], "who": a["who"], "route": a["decision"]["route"],
                    "why": a["decision"]["why"], "status": a["status"], "payload": a["payload"], "facts": a["facts"]})
    return out

def process_inbound(sender: str, subject: str, body: str, attachments=()):
    """One inbound message through the Operations agent. Shared by the API and the mailbox poller."""
    atts = [a if isinstance(a, dict) else a.model_dump() for a in attachments]
    out = _submit(agents.ops_inbound(sender.strip()[:120], subject.strip()[:160], body.strip()[:6000], atts))
    first = out[0] if out else {}
    persist.append("messages", {"id": f"m{int(time.time()*1000)%10**7:x}", "from": sender.strip()[:120], "subj": subject.strip()[:160] or "(no subject)", "attachments": len(atts),
                                "facts": len(first.get("facts", [])), "ok": first.get("route") != "refuse", "enquiry": any(x["cls"] == "reply_to_enquiry" for x in out),
                                "proposals": [x["cls"] for x in out]})
    return out

@app.post("/api/agents/ops/inbound")
def agents_inbound(m: Inbound):
    if not m.sender.strip() or not m.body.strip(): raise HTTPException(400, "sender and message required")
    return process_inbound(m.sender, m.subject, m.body, m.attachments)

@app.post("/api/agents/ops/scan")
def agents_scan(days: int = 14):
    out = _submit(agents.ops_scan(max(1, min(days, 365))))
    if not out: raise HTTPException(409, f"No active client has been quiet for {days} days or more.")
    return out

@app.post("/api/agents/pm/plan")
def agents_plan(r: PlanReq):
    if not STORE.client(r.client_id): raise HTTPException(404, "unknown client")
    if len(r.brief.strip()) < 10: raise HTTPException(400, "describe the project in a sentence or two")
    out = _submit(agents.pm_plan(r.client_id, r.brief.strip()[:3000]))
    if not out: raise HTTPException(409, "no team members recorded to assign work to")
    return out

@app.post("/api/agents/pm/stalled")
def agents_stalled(days: float = 7):
    """Find open tasks with no progress and propose handing each to a better-placed teammate."""
    out = _submit(agents.pm_stalled(max(0, min(days, 365))))
    if not out: raise HTTPException(409, f"No open task has been stalled for {days:g} days or more.")
    return out

@app.post("/api/agents/marketing/draft")
def agents_draft(r: DraftReq):
    if not r.topic.strip(): raise HTTPException(400, "topic required")
    return _submit(agents.marketing_draft(r.topic.strip()[:200], r.channel.strip()[:30] or "linkedin"))

@app.post("/api/agents/marketing/publish")
def agents_publish(r: PublishReq):
    if not r.text.strip(): raise HTTPException(400, "nothing to publish")
    return _submit(agents.marketing_publish(r.text.strip()[:3000], r.channel.strip()[:30] or "linkedin"))

@app.post("/api/agents/marketing/retain")
def agents_retain(r: RetainReq):
    if not r.text.strip(): raise HTTPException(400, "nothing to keep")
    return _submit(agents.marketing_retain(r.text.strip()[:3000], r.topic.strip()[:120]))

@app.post("/api/agents/marketing/brand")
def agents_brand(r: BrandReq):
    out = _submit(agents.marketing_brand(r.voice and r.voice.strip(), r.positioning and r.positioning.strip(), [x for x in r.add_permitted if x.strip()], [x for x in r.add_prohibited if x.strip()]))
    if not out: raise HTTPException(400, "no change given")
    return out

@app.post("/api/agents/sales/campaign")
def agents_campaign(r: CampaignReq):
    """One proposal covering a batch of drafted leads: one decision from the owner, every message checked against its own recipient."""
    spec, skipped = leadgen.campaign_proposal(r.lead_ids or None, r.name.strip()[:80] or None)
    if not spec: raise HTTPException(409, "No lead is ready: " + (", ".join(f"{s['lead']} ({s['why']})" for s in skipped[:5]) or "the lead bank is empty"))
    a = propose(Proposal(**spec))
    return {"id": a["id"], "route": a["decision"]["route"], "why": a["decision"]["why"], "status": a["status"], "recipients": len(spec["payload"]["recipients"]),
            "campaign": spec["payload"]["campaign"], "skipped": skipped, "to": [{"lead": x["name"], "email": x["to"]} for x in spec["payload"]["recipients"]]}

# ------------------------------------------------------------------ the simulated task tool (what teammates do outside Bizzii)
@app.get("/api/tasks")
def tasks_list(): return persist.get("tasks", []) or []

@app.post("/api/tasks/{tid}/status")
def task_status(tid: int, s: TaskStatus):
    if s.status not in ("open", "in_progress", "complete"): raise HTTPException(400, "status must be open, in_progress or complete")
    tasks = list(persist.get("tasks", []) or []); t = next((x for x in tasks if x["id"] == tid), None)
    if not t: raise HTTPException(404, "unknown task")
    t["status"], t["updated"] = s.status, time.time(); persist.put("tasks", tasks); return t

@app.post("/api/demo/age_tasks")
def age_tasks(days: float = 10):
    """Demo helper: pretend open tasks last moved `days` ago, so the stalled-task scan has something to find."""
    tasks = list(persist.get("tasks", []) or [])
    for t in tasks:
        if t.get("status") != "complete": t["updated"] = time.time() - days * 86400
    persist.put("tasks", tasks); return {"aged": sum(1 for t in tasks if t.get("status") != "complete"), "days": days}

@app.post("/api/inbox/poll")
def inbox_poll():
    """Read unseen mail now and give each message to the Operations agent. 409 until IMAP_HOST/IMAP_USER/IMAP_PASSWORD are set."""
    if not inbox.configured(): raise HTTPException(409, "No mailbox configured: set IMAP_HOST, IMAP_USER and IMAP_PASSWORD (a dedicated test mailbox, with an app password).")
    try: return inbox.poll_once(process_inbound)
    except Exception as e: raise HTTPException(502, f"Could not read the mailbox ({type(e).__name__}).")

@app.get("/api/inbox/status")
def inbox_status(): return {"configured": inbox.configured(), "polling": inbox.STATE["running"], "last_poll": inbox.STATE["last_poll"], "last_result": inbox.STATE["last_result"]}

@app.get("/u/{token}", response_class=HTMLResponse)
@app.post("/u/{token}", response_class=HTMLResponse)
def unsubscribe(token: str):
    """The link in every outbound marketing email (also the one-click List-Unsubscribe target). Signed, so only the real address can be opted out."""
    import executors
    email = executors.unsub_verify(token)
    if not email: return HTMLResponse("<h2>This link is not valid.</h2>", status_code=400)
    executors.suppress(email)
    for l in leadgen.LEADS.values():
        if (l.get("email") or "").lower() == email: leadgen.optout(l["id"])
    persist.append("audit", {"event": "unsubscribed", "id": 0, "cls": "-", "label": "Unsubscribe link used", "who": email, "agent": "-", "route": "-", "risk": 0, "why": "recipient opted out"})
    return HTMLResponse(f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='font:16px system-ui;max-width:480px;margin:15vh auto;padding:0 20px'><h2>You are unsubscribed.</h2><p>{email} will not be contacted again.</p></body>")

@app.get("/api/team")
def team_view(): return {"team": STORE.team(), "clients": [{"id": c["id"], "name": c["name"], "status": c.get("status"), "email": c["contact"]["email"], "last_contact": c.get("last_contact")} for c in STORE.clients()]}

# ------------------------------------------------------------------ lead gen API
class Discover(BaseModel):
    keyword: str
    geo: str = ""
    limit: int = 8

@app.get("/api/leads")
def leads_list(): return leadgen.listing()

@app.post("/api/leads/discover")
def leads_discover(d: Discover):
    if not d.keyword.strip(): raise HTTPException(400, "keyword required")
    return leadgen.discover(d.keyword.strip()[:60], d.geo.strip()[:60], d.limit)

class AddLead(BaseModel):
    website: str
    category: str = ""

@app.post("/api/leads/add")
def leads_add(d: AddLead):
    out = leadgen.add_by_website(d.website, d.category.strip()[:60])
    if "error" in out: raise HTTPException(422, out["error"])
    return out

@app.post("/api/leads/{lid}/draft")
def leads_draft(lid: str):
    out = leadgen.draft(lid)
    if "error" in out: raise HTTPException(404, out["error"])
    return leadgen.LEADS[lid]

@app.post("/api/leads/{lid}/propose")
def leads_propose(lid: str):
    if lid not in leadgen.LEADS: raise HTTPException(404, "unknown lead")
    if not leadgen.LEADS[lid].get("draft"): leadgen.draft(lid)
    spec = leadgen.proposal_for(lid)
    if not spec or not spec["payload"]["to"]: raise HTTPException(409, "no public email found for this lead, so nothing can be drafted to it")
    if suppressed(spec["payload"]["to"]): raise HTTPException(409, "this address has opted out and will not be contacted")
    return propose(Proposal(**spec))

@app.post("/api/leads/{lid}/optout")
def leads_optout(lid: str):
    """The lead asked not to be contacted. The address is suppressed for every later send, single or campaign."""
    l = leadgen.optout(lid)
    if not l: raise HTTPException(404, "unknown lead")
    return l

@app.post("/api/leads/{lid}/followup")
def leads_followup(lid: str):
    """Second contact, only after the first email actually went out. Still a first-contact-class action: F2 holds it for the owner."""
    l = leadgen.LEADS.get(lid)
    if not l: raise HTTPException(404, "unknown lead")
    first = PENDING.get(l.get("proposal") or -1)
    if not first or first["status"] != "executed": raise HTTPException(409, "the first email has not been sent yet")
    spec = leadgen.followup_proposal(lid)
    return propose(Proposal(**spec))

@app.get("/api/compare")
def compare_view(n: int = 200):
    """Same expected approval rate, three different diagnoses (simulation on the real gate)."""
    return compare.run(max(30, min(n, 1000)))

@app.get("/api/outbox")
def outbox(): return persist.tail("outbox", 20)

@app.get("/api/audit")
def audit_view(n: int = 60): return persist.tail("audit", min(n, 200))

@app.get("/api/storage")
def storage(): return {"backend": persist.backend()}

# ------------------------------------------------------------------ pages
def _page(name): return FileResponse(WEB / name, media_type="text/html")
@app.get("/", response_class=HTMLResponse)
@app.get("/gate", response_class=HTMLResponse)
def home(): return _page("index.html")
@app.get("/agents", response_class=HTMLResponse)
def agents_page(): return _page("agents.html")
@app.get("/leads", response_class=HTMLResponse)
def leads_page(): return _page("leads.html")

@app.on_event("startup")
def boot():
    _reset_gate(True)
    inbox.start_background(process_inbound)
