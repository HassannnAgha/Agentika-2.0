"""The agents. Each is a function (shared memory, input) -> list of PROPOSALS in the gate's contract. None can act: every
proposal goes through the gate, and what an approved proposal DOES is in executors.py (it changes real state and verifies it).
Each agent has an AI path (Groq) and a deterministic fallback, so the demo never depends on a key. The AI is handed the WHOLE
shared memory (as in the FYP design) and must cite fact ids; the guardrail, not the prompt, stops it citing another client's facts.

  Operations  : reads inbound mail and attachments, records what it learns into memory, replies, flags unhappy or quiet clients,
                corrects a client's contact details, tells the owner about files it could not read, spots new work for PM
  Project Mgmt: turns confirmed work into subtasks, assigns from RECORDED skills and capacity, finds stalled tasks and reassigns them,
                tells the teammate
  Marketing   : drafts from recorded voice and permitted claims with a claims check, keeps what the owner approves, proposes brand changes
  Sales       : discovery, scoring, drafts and batch campaigns live in leadgen.py; enquiries arrive through ops_inbound"""
import re, json, time, hashlib, datetime
from store import STORE
import llm, docs_text, persist, learning

FREE_MAIL = ("gmail.", "yahoo.", "hotmail.", "outlook.", "icloud.", "proton", "live.", "aol.")
UPSET = ("unhappy", "disappointed", "frustrat", "delay", "late ", "cancel", "refund", "complain", "not happy", "unacceptable", "still waiting")
MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec"
DATE_RE = re.compile(rf"\b(\d{{1,2}}\s+(?:{MONTHS})[a-z]*|(?:{MONTHS})[a-z]*\s+\d{{1,2}}|\d{{4}}-\d{{2}}-\d{{2}}|\d{{1,2}}/\d{{1,2}}/\d{{2,4}})\b", re.I)
MONEY_RE = re.compile(r"(?:pkr|rs\.?|usd|\$|€)\s?[\d,]{3,}|[\d,]{4,}\s?(?:pkr|usd)", re.I)
FACT_WORDS = ("agreed", "confirm", "deadline", "due ", "approved", "signed", "budget", "scope", "deliver", "launch", "meeting", "renew", "prefer", "must", "need")
WORK_RE = re.compile(r"\b(website|web site|redesign|rebuild|brand(ing)?|logo|landing page|new project|proposal|quote|scope)\b", re.I)
INTENT_RE = re.compile(r"\b(need|want|looking|would like|can you|could you|planning|hoping|interested)\b", re.I)

def _biz(): return STORE.profile["business"]
def _owner(): return _biz()["owner"]["name"]
def _sig(): return f"{_owner()}, {_biz()['name']}"

def _memory():
    """The shared business memory as the model sees it: every fact, labelled with whose it is."""
    out = []
    for i, x in STORE.facts.items():
        c = STORE.client(x["owner"])
        out.append({"id": i, "about": c["name"] if c else ("the business" if x["owner"] == "business" else x["owner"]), "fact": x["text"]})
    return out

def _ids(cp, *kinds): return [i for k in kinds if (i := STORE.fid(cp, k))]
def _ints(v): return [int(c) for c in (v or []) if str(c).lstrip("-").isdigit()] if isinstance(v, list) else []
def _sentences(t): return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", t) if len(s.strip()) > 12]

def _client_for(sender: str):
    s = sender.strip().lower(); dom = s.split("@")[-1]
    for c in STORE.clients():
        e = c["contact"]["email"].lower()
        if e == s or (dom and not dom.startswith(FREE_MAIL) and e.split("@")[-1] == dom): return c
    return None

# ================================================================= Operations
def extract_facts(who: str, sources: list) -> list:
    """Atomic facts the sender states (dates, money, agreements, commitments). sources: [(label, text)]. Only what the text says."""
    if llm.available():
        out = llm.json_call('Extract up to 6 atomic facts stated in the text: dates, amounts, agreements, requests, commitments. Only what the text says. Return {"facts":[str]}.',
                            json.dumps({"from": who, "texts": [{"source": s, "text": t[:5000]} for s, t in sources]}))
        f = out.get("facts") if isinstance(out, dict) else None
        if isinstance(f, list) and f: return [str(x)[:220] for x in f[:6] if str(x).strip()]
    facts = []
    for label, text in sources:
        for s in _sentences(text):
            low = s.lower()
            if DATE_RE.search(s) or MONEY_RE.search(s) or any(w in low for w in FACT_WORDS):
                facts.append(f"{label}: {s[:200]}")
    return list(dict.fromkeys(facts))[:6]

def ops_inbound(sender: str, subject: str, body: str, attachments=(), message_id: str = "") -> list:
    c = _client_for(sender)
    cp = c["id"] if c else "enq-" + hashlib.sha1(sender.lower().encode()).hexdigest()[:6]
    who = c["name"] if c else sender
    reply_agent, reply_cls = ("operations", "reply_to_client") if c else ("sales", "reply_to_enquiry")   # an enquirer wrote first: not unsolicited
    today = datetime.date.today().isoformat()
    # the message itself becomes a recorded fact, so everything proposed from it can cite where it came from
    # (an excerpt of what they wrote is kept, so a reply may repeat a date or amount the sender themselves stated)
    msg = STORE.add_fact(cp, "message", f"Message received {today} from {sender}: {subject or '(no subject)'}. They wrote: {' '.join(body.split())[:600]}", source="inbound email")

    side, read_docs, unread = [], [], []
    for att in attachments or []:
        text, why = docs_text.from_attachment(att)
        name = att.get("name", "attachment")
        if text:
            read_docs.append((name, text))
            side.append(dict(agent="operations", cls="read_attached_document", counterparty=cp, cited=[msg], who=who,
                             payload={"name": name, "chars": len(text), "preview": text[:160]}))
        else: unread.append((name, why))

    # facts the message and readable documents state -> memory
    facts = extract_facts(who, [("message", body)] + read_docs)
    if facts:
        side.append(dict(agent="operations", cls="record_correspondence_fact", counterparty=cp, cited=[msg], who=who,
                         payload={"owner": cp, "facts": facts, "message": subject or "(no subject)", "kind": "client.fact" if c else "enquiry.fact"}))

    # a recorded client telling us their own contact details changed (only from the address on record, never from a look-alike)
    if c and sender.strip().lower() == c["contact"]["email"].lower():
        m = re.search(r"\b(?:new|changed|updated|different|switch(?:ed)? to|now use)\b[^@\n]{0,40}?([\w.+-]+@[\w-]+\.[\w.-]+)", body, re.I)
        if m and m.group(1).lower() != c["contact"]["email"].lower():
            side.append(dict(agent="operations", cls="update_client_record", counterparty=cp, cited=[msg] + _ids(cp, "client.status"), who=who,
                             payload={"client": cp, "field": "contact.email", "value": m.group(1).lower(), "was": c["contact"]["email"]}))

    # new work from a recorded client -> Project Management picks it up (an approved identification chains into planning)
    if c and WORK_RE.search(subject + " " + body) and INTENT_RE.search(body):
        name = (subject or _sentences(body)[0])[:90]
        side.append(dict(agent="project", cls="identify_project", counterparty=cp, cited=[msg] + _ids(cp, "client.status"), who=who,
                         payload={"project": name, "client": c["name"], "client_id": cp, "summary": body[:600]}))

    props = []
    if unread:     # FYP: tell the owner a file was not read, and propose NO reply, so nothing is said on an unread premise
        files = "; ".join(f"{n} ({w})" for n, w in unread)
        props.append(dict(agent="operations", cls="notify_owner_unread_file", counterparty=cp, cited=[msg], who=who,
                          payload={"to": _biz()["owner"]["email"], "subject": f"A file from {who} was not read",
                                   "body": f"{who} sent \"{subject or '(no subject)'}\" with files I could not read: {files}.\n\nI have proposed no reply. Please open the message yourself.", "files": [n for n, _ in unread]}))
    else:
        out = None
        if llm.available():
            out = llm.json_call(
                f"You are the {reply_agent} agent for {_biz()['name']}. Draft a short, polite reply to the message. Cite by id every memory fact you rely on. "
                "Never state a price, date or promise that is not in a cited fact. Never write fact ids or numbers in brackets in the text. Also say whether the sender sounds upset, "
                "and how confident you are that this reply is right and complete (0 to 1), naming anything you are unsure about. "
                'Return {"subject":str,"body":str,"cited":[ints],"upset":bool,"upset_reason":str,"confidence":number,"unsure_about":str}.\n' + learning.guidance(reply_agent, reply_cls),
                json.dumps({"you_are_replying_as": _sig(), "message": {"from": sender, "subject": subject, "body": body}, "shared_memory": _memory()}))
            if not (out and out.get("subject") and out.get("body")): out = None
            else: out["subject"], out["body"] = llm.strip_citations(out["subject"], set(STORE.facts)), llm.strip_citations(out["body"], set(STORE.facts))
        note = "AI draft"
        if out: cited = _ints(out.get("cited")); upset, why = bool(out.get("upset")), out.get("upset_reason", "")
        else:
            note = "template draft (no AI key)"
            cited = [msg] + (_ids(cp, "client.status", "client.notes") if c else _ids("business", "biz.summary"))
            # A naive drafter pulls in whatever the message talks about. Staged here so the guardrail has something real to refuse.
            for other in STORE.clients():
                if other["id"] != cp and other["name"].lower() in (subject + " " + body).lower(): cited += _ids(other["id"], "client.status")
            low = (subject + " " + body).lower(); hit = [w.strip() for w in UPSET if w in low]
            upset, why = bool(hit), ("message mentions: " + ", ".join(hit)) if hit else ""
            who_to = c["contact"]["name"] if c else "there"
            out = {"subject": ("Re: " + subject) if subject else "Re: your message",
                   "body": f"Hi {who_to},\n\nThanks for getting in touch. We have your message and will come back to you shortly.\n\n{_sig()}"}
        conf, unsure = out.get("confidence"), out.get("unsure_about") or ""
        if note.startswith("template"):                 # the template cannot answer a question about money or timing: it says so instead of guessing
            asks = "?" in body and any(w in body.lower() for w in ("price", "cost", "quote", "how much", "when", "date", "deadline", "available", "budget"))
            conf, unsure = (0.4, "the message asks something only you can answer") if asks else (None, "")
        props.append(dict(agent=reply_agent, cls=reply_cls, counterparty=cp, cited=cited, who=who,
                          payload={"to": sender, "subject": out["subject"], "body": out["body"], "draft_by": note, "in_reply_to": subject, "reply_to_message_id": message_id,
                                   **({"confidence": conf} if conf is not None else {}), **({"unsure": unsure} if unsure else {})}))
        if c and upset:
            props.append(dict(agent="operations", cls="flag_relationship_risk", counterparty=cp, cited=[msg] + _ids(cp, "client.status", "client.last"), who=who,
                              payload={"client": cp, "field": "risk", "value": why or "message sounds unhappy"}))
    return props + side

def ops_scan(days: int = 14) -> list:
    """Clients going quiet: flag the relationship and propose a chase for each."""
    today, out = datetime.date.today(), []
    for c in STORE.clients():
        if c.get("status") != "active" or not c.get("last_contact"): continue
        try: quiet = (today - datetime.date.fromisoformat(c["last_contact"])).days
        except ValueError: continue
        if quiet < days: continue
        cites = _ids(c["id"], "client.status", "client.last")
        out.append(dict(agent="operations", cls="flag_relationship_risk", counterparty=c["id"], cited=cites, who=c["name"],
                        payload={"client": c["id"], "field": "risk", "value": f"no contact for {quiet} days"}))
        out.append(dict(agent="operations", cls="followup_client_no_reply", counterparty=c["id"], cited=cites, who=c["name"],
                        payload={"to": c["contact"]["email"], "subject": f"Checking in, {c['name']}",
                                 "body": f"Hi {c['contact']['name']},\n\nIt has been a little while since we last spoke. Is there anything you need from us at the moment?\n\n{_sig()}"}))
    return out

# ================================================================= Project Management
DEFAULT_PHASES = [("Confirm scope and plan", ["planning", "scoping"]), ("Design", ["design", "figma", "branding"]),
                  ("Build", ["react", "next", "development", "code"]), ("Review and revisions", ["review", "planning"]), ("Handover", ["client", "planning"])]

def _plan_tasks(client, brief):
    t = None
    if llm.available():
        t = llm.json_call('Break a project into 3 to 6 concrete subtasks. Return {"subtasks":[{"title":str,"skills":[str],"hours":int}]}.',
                          json.dumps({"client": client["name"], "brief": brief, "team_skills": [{"name": m["name"], "skills": m.get("skills", [])} for m in STORE.team()]}))
        t = t.get("subtasks") if isinstance(t, dict) else None
        if not (isinstance(t, list) and t and all(isinstance(x, dict) and x.get("title") for x in t)): t = None
    if t: return [{"title": str(x["title"])[:90], "skills": [str(s).lower() for s in x.get("skills", [])], "hours": int(x.get("hours") or 8)} for x in t[:6]], "AI plan"
    parts = [p.strip(" -*\t") for p in re.split(r"[\n;]|(?<=[.!?])\s+", brief) if len(p.strip(" -*\t")) > 8][:6]
    if len(parts) >= 3: return [{"title": p[:90], "skills": re.findall(r"[a-z]{4,}", p.lower()), "hours": 8} for p in parts], "split from the brief"
    return [{"title": n, "skills": s, "hours": 8} for n, s in DEFAULT_PHASES], "standard phases"

def _open_hours():
    """Hours of open work already on each teammate, from the (simulated) task tool."""
    load = {}
    for t in persist.get("tasks", []) or []:
        if t.get("status") != "complete": load[t.get("assignee")] = load.get(t.get("assignee"), 0) + int(t.get("hours") or 8)
    return load

def _pick(team, skills_text, skill_words, load, exclude=()):
    def fit(im):
        i, m = im; sk = [s.lower() for s in m.get("skills", [])]
        over = sum(1 for s in sk if s and (s in skills_text or any(w in s for w in skill_words)))
        return (over, (m.get("weekly_capacity_hours") or 0) - load.get(m["name"], 0))
    pool = [im for im in team if im[1]["name"] not in exclude] or team
    i, m = max(pool, key=fit); return i, m, fit((i, m))

def pm_plan(client_id: str, brief: str) -> list:
    c = STORE.client(client_id)
    if not c: return []
    tasks, how = _plan_tasks(c, brief)
    team = [(i, m) for i, m in enumerate(STORE.team()) if m.get("active", True)]
    if not team: return []
    load = _open_hours()
    props = [dict(agent="project", cls="decompose_project", counterparty=c["id"], cited=_ids(c["id"], "client.status"), who=c["name"],
                  payload={"project": brief[:120], "client": c["name"], "client_id": c["id"], "subtasks": [t["title"] for t in tasks], "plan_by": how})]
    start = datetime.date.today()
    for n, t in enumerate(tasks):
        text = (t["title"] + " " + " ".join(t["skills"])).lower()
        i, m, (over, room) = _pick(team, text, t["skills"], load); load[m["name"]] = load.get(m["name"], 0) + t["hours"]
        why = f"skills match ({over}), {max(room,0)}h of weekly capacity left" if over else f"no skill match, most free capacity ({max(room,0)}h)"
        props.append(dict(agent="project", cls="assign_subtask", counterparty=c["id"], who=c["name"],
                          cited=_ids(c["id"], "client.status") + _ids("business", f"biz.team.{i}"),
                          payload={"title": f"{c['name']}: {t['title']}", "client": c["name"], "client_id": c["id"], "assignee": m["name"], "hours": t["hours"],
                                   "due": (start + datetime.timedelta(days=3 * (n + 1))).isoformat(), "reason": why}))
    return props

def pm_stalled(days: int = 7) -> list:
    """Open tasks that have not progressed in `days` (the task tool is simulated): propose handing each to the best-placed teammate."""
    team = [(i, m) for i, m in enumerate(STORE.team()) if m.get("active", True)]
    load, out, now = _open_hours(), [], time.time()
    for t in persist.get("tasks", []) or []:
        if t.get("status") == "complete": continue
        age = (now - float(t.get("updated") or t.get("created") or now)) / 86400
        if age < days or len(team) < 2: continue
        text = t["title"].lower(); words = re.findall(r"[a-z]{4,}", text)
        i, m, (over, room) = _pick(team, text, words, load, exclude=(t.get("assignee"),))
        if m["name"] == t.get("assignee"): continue
        cid = t.get("client_id") or ""
        out.append(dict(agent="project", cls="reassign_stalled_task", counterparty=cid or "business", who=t.get("client") or "the business",
                        cited=_ids(cid, "client.status") + _ids("business", f"biz.team.{i}") if cid else _ids("business", f"biz.team.{i}"),
                        payload={"task_id": t["id"], "title": t["title"], "from": t.get("assignee"), "to": m["name"], "stalled_days": round(age, 1),
                                 "reason": (f"{m['name']} lists matching skills and has {max(room,0)}h free" if over else f"{m['name']} has the most free capacity ({max(room,0)}h)")}))
    return out

def pm_notify(action: dict):
    """After an assignment actually happened, tell the teammate (the Project Management agent's notification)."""
    p = action["payload"]; who = p.get("assignee") or p.get("to")
    m = next((x for x in STORE.team() if x["name"] == who), None)
    if not m or not m.get("email"): return []
    i = next((k for k, x in enumerate(STORE.team()) if x["name"] == who), None)
    what = p.get("title") or "a task"; due = f" Due {p['due']}." if p.get("due") else ""
    return [dict(agent="project", cls="notify_teammate_assignment", counterparty=action["counterparty"], who=who,
                 cited=_ids("business", f"biz.team.{i}") if i is not None else [], prior_contact=True,
                 payload={"to": m["email"], "subject": f"New work for you: {what[:70]}", "body": f"Hi {who.split()[0]},\n\nYou have been assigned: {what}.{due}\n\n{_sig()}"})]

# ================================================================= Marketing
RISKY = [(re.compile(r"\bguarantee\w*", re.I), "makes a guarantee"), (re.compile(r"#1|\bnumber one\b|\bbest\b|\bleading\b", re.I), "uses a superlative"),
         (re.compile(r"\bwill (?:increase|double|triple|boost|grow)\b|\b\d{2,}\s?%", re.I), "promises a result"),
         (re.compile(r"(?:pkr|rs\.?|usd|\$|€)\s?\d", re.I), "states a price")]

def claims_check(text: str) -> list:
    """Deterministic content check on a draft: no guarantees, superlatives, promised results, prices, or a recorded client named without permission."""
    issues = [why for rx, why in RISKY if rx.search(text)]
    for c in STORE.clients():
        if c["name"].lower() in text.lower(): issues.append(f"names a client ({c['name']}) who has not agreed to be named")
    return list(dict.fromkeys(issues))

def marketing_draft(topic: str, channel: str = "linkedin") -> list:
    claims = {i: x["text"].replace("Permitted claim: ", "") for i, x in STORE.of("business").items() if x["kind"].startswith("biz.claim")}
    never = [x["text"].replace("Never claim: ", "") for x in STORE.of("business").values() if x["kind"].startswith("biz.never")]
    brand = STORE.profile.get("brand", {})
    def ask(extra=""):
        out = llm.json_call(
            f"You draft a short {channel} post for a small business in its recorded voice. Use ONLY the permitted claims given; never make a prohibited claim; "
            'no prices, dates, results, superlatives or client names. Never write fact ids or numbers in brackets in the text. ' + extra +
            'Say how confident you are (0 to 1) that the post is on-brand and makes only permitted claims. Return {"title":str,"text":str,"claims_used":[claim ids],"confidence":number,"unsure_about":str}.\n'
            + learning.guidance("marketing", "draft_content"),
            json.dumps({"topic": topic, "voice": brand.get("voice", ""), "positioning": brand.get("positioning", ""), "permitted_claims": claims, "prohibited_claims": never}))
        if out and out.get("text"): out["text"] = llm.strip_citations(out["text"], set(STORE.facts)); return out
        return None
    out, how, check, retried = None, "template draft (no AI key)", [], False
    if llm.available():
        out = ask()
        if out:
            how, check = "AI draft", claims_check(out["text"])
            if check:                                           # one retry with the problems named, then fall back to the template
                retried = True; out2 = ask("Your last draft had these problems, fix them: " + "; ".join(check) + ". ")
                if out2 and not claims_check(out2["text"]): out, check, how = out2, [], "AI draft (revised after a claims check)"
                else: out = None
    if out: used = _ints(out.get("claims_used"))
    else:
        used = list(claims)[:2]; how = how if how.startswith("template") else "template draft (the AI draft failed the claims check)"
        out = {"title": topic[:60], "text": f"{topic}\n\n" + " ".join(claims[i] for i in used) + f"\n\n{_biz()['name']}"}; check = claims_check(out["text"])
    return [dict(agent="marketing", cls="draft_content", counterparty="business", cited=_ids("business", "biz.positioning") + used, who=_biz()["name"],
                 payload={"topic": topic, "channel": channel, "title": out.get("title", topic), "text": out["text"], "draft_by": how,
                          "claims_check": check or "clean", "revised": retried,
                          **({"confidence": out["confidence"]} if isinstance(out.get("confidence"), (int, float)) else {}),
                          **({"unsure": out["unsure_about"]} if out.get("unsure_about") else {})})]

def marketing_publish(text: str, channel: str = "linkedin") -> list:
    return [dict(agent="marketing", cls="publish_post", counterparty="business", cited=_ids("business", "biz.summary", "biz.positioning"), who=_biz()["name"],
                 payload={"channel": channel, "text": text, "claims_check": claims_check(text) or "clean"})]

def marketing_retain(text: str, topic: str = "") -> list:
    return [dict(agent="marketing", cls="retain_approved_content", counterparty="business", cited=_ids("business", "biz.positioning"), who=_biz()["name"],
                 payload={"topic": topic or text[:60], "text": text})]

def marketing_brand(voice=None, positioning=None, add_permitted=None, add_prohibited=None) -> list:
    changes = {k: v for k, v in (("voice", voice), ("positioning", positioning), ("add_permitted", add_permitted or None), ("add_prohibited", add_prohibited or None)) if v}
    if not changes: return []
    return [dict(agent="marketing", cls="update_brand_record", counterparty="business", cited=_ids("business", "biz.voice", "biz.positioning"), who=_biz()["name"],
                 payload={"changes": changes})]
