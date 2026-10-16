"""Executors: one function per action class. Each does the action, then CHECKS ITS POSTCONDITION against real state and
returns True / False (verified), or None if it cannot be verified (counted as neither). The "task tool" and "CRM" are
simulated stores (persisted), as the onboarding connections are simulated.

Safety for the hackathon: email NEVER goes to a real prospect or client. It is written to the outbox and, only if
SMTP_* and TEST_INBOX are set, also delivered to TEST_INBOX (never to the payload's address). Suppressed addresses are skipped."""
import os, time, random, smtplib, ssl, hmac, hashlib, base64
from email.message import EmailMessage
import persist
from store import STORE
from catalogue import CLASSES

FAIL_RATE = float(os.getenv("DEMO_FAIL_RATE", "0"))   # e.g. 0.2 to demo a failing agent
def _fail(): return random.random() < FAIL_RATE

# ---------------------------------------------------------------- suppression (opt-outs), honoured by every send
def suppressed(email): return (email or "").strip().lower() in set(persist.get("suppressed", []) or [])
def suppress(email):
    s = list(persist.get("suppressed", []) or []); e = (email or "").strip().lower()
    if e and e not in s: s.append(e); persist.put("suppressed", s)
    return e in (persist.get("suppressed", []) or [])

# ---------------------------------------------------------------- unsubscribe links (signed, so nobody can opt out someone else's address)
def _secret(): return (os.getenv("UNSUB_SECRET") or hashlib.sha256((os.getenv("SMTP_PASSWORD", "") + os.getenv("DATABASE_URL", "") + "bizzii").encode()).hexdigest()).encode()
def unsub_token(email):
    e = email.strip().lower(); sig = hmac.new(_secret(), e.encode(), hashlib.sha256).hexdigest()[:24]
    return base64.urlsafe_b64encode(e.encode()).decode().rstrip("=") + "." + sig
def unsub_verify(token):
    try:
        b, sig = token.rsplit(".", 1); e = base64.urlsafe_b64decode(b + "=" * (-len(b) % 4)).decode()
        return e if hmac.compare_digest(sig, hmac.new(_secret(), e.encode(), hashlib.sha256).hexdigest()[:24]) else None
    except Exception: return None
def unsub_url(email): return f"{(os.getenv('PUBLIC_URL') or 'http://localhost:8000').rstrip('/')}/u/{unsub_token(email)}"

def _thread(m, p):
    """A reply carries the original message's id, so it lands in the same thread in the recipient's mail client."""
    mid = (p.get("reply_to_message_id") or "").strip()
    if mid.startswith("<") and mid.endswith(">"): m["In-Reply-To"] = mid; m["References"] = mid

# ---------------------------------------------------------------- email
def business_identity():
    """Name and postal address for the footer, from what the owner entered in onboarding (a custom field on the Business step whose label
    mentions "address"), with BUSINESS_NAME / BUSINESS_ADDRESS as a fallback."""
    b = (STORE.profile or {}).get("business", {})
    addr = (b.get("address") or next((x.get("value", "") for x in b.get("custom", []) if "address" in str(x.get("label", "")).lower() and x.get("value")), "")
            or os.getenv("BUSINESS_ADDRESS", "")).strip()
    return (b.get("name") or os.getenv("BUSINESS_NAME") or "Bizzii").strip(), addr

def live_mode(): return os.getenv("SEND_LIVE") == "1" and bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER"))
def _live_sent_today():
    today = time.strftime("%Y-%m-%d"); return sum(1 for r in persist.tail("outbox", 300) if r.get("live") and str(r.get("t", "")).startswith(today))

def send_email(p, internal=False):
    """Default (test mode): write to the outbox, and to TEST_INBOX if configured, never to the intended address.
    SEND_LIVE=1: send to the real recipient with a signed unsubscribe link, the business address, a one-click header and a daily cap.
    `internal` mail (to the owner or a teammate) skips the unsubscribe footer. Verified = the outbox row exists (and SMTP accepted)."""
    if suppressed(p.get("to")):
        persist.append("outbox", {"intended_to": p.get("to"), "subject": p.get("subject"), "skipped": "address has opted out"}); return None
    rec = {"t": time.strftime("%Y-%m-%d %H:%M:%S"), "intended_to": p.get("to"), "subject": p.get("subject"), "body": p.get("body"), "delivered_to": None}
    if live_mode():
        cap, (biz, addr), to = int(os.getenv("LIVE_DAILY_CAP", "30")), business_identity(), (p.get("to") or "").strip()
        why = ("address is not a valid recipient" if "@" not in to else f"daily cap of {cap} reached" if _live_sent_today() >= cap
               else "no postal address on record: add one in onboarding (a custom field called Postal address on the Business step), a postal address is required on marketing email" if (not addr and not internal) else None)
        if why:
            rec["error"] = why; persist.append("outbox", rec); return False
        body = p.get("body", "") if internal else f"{p.get('body','')}\n\n--\n{biz}, {addr}\nDo not want to hear from us? {unsub_url(to)}"
        try:
            m = EmailMessage(); m["From"] = os.getenv("SMTP_USER"); m["To"] = to; m["Subject"] = p.get("subject", ""); m.set_content(body); _thread(m, p)
            if not internal: m["List-Unsubscribe"] = f"<{unsub_url(to)}>"; m["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
            with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "465")), context=ssl.create_default_context(), timeout=20) as s:
                s.login(os.environ["SMTP_USER"], os.getenv("SMTP_PASSWORD", "")); s.send_message(m)
            rec.update(delivered_to=to, live=True, body=body); ok = True
        except Exception as e:
            rec["error"] = type(e).__name__; ok = False
        persist.append("outbox", rec)
        return ok and any(r.get("t") == rec["t"] and r.get("subject") == rec["subject"] for r in persist.tail("outbox", 5))
    host, inbox = os.getenv("SMTP_HOST"), os.getenv("TEST_INBOX")
    ok = True
    if host and inbox and not _fail():
        try:
            m = EmailMessage(); m["From"] = os.getenv("SMTP_USER", inbox); m["To"] = inbox
            m["Subject"] = f"[TEST for {p.get('to')}] {p.get('subject','')}"; m.set_content(p.get("body", "")); _thread(m, p)
            with smtplib.SMTP_SSL(host, int(os.getenv("SMTP_PORT", "465")), context=ssl.create_default_context(), timeout=15) as s:
                s.login(os.getenv("SMTP_USER", ""), os.getenv("SMTP_PASSWORD", "")); s.send_message(m)
            rec["delivered_to"] = inbox
        except Exception as e:
            rec["error"] = type(e).__name__; ok = False
    elif _fail(): ok = False
    persist.append("outbox", rec)
    return ok and any(r.get("t") == rec["t"] and r.get("subject") == rec["subject"] for r in persist.tail("outbox", 5))   # postcondition: it is in the outbox

def send_campaign(p):
    """One approval, many messages. Each recipient is checked at send time; verified only if every one was delivered."""
    import leadgen
    results = []
    for r in p.get("recipients", []):
        ok = send_email({"to": r["to"], "subject": r["subject"], "body": r["body"]})
        if ok is not None: leadgen.mark_contacted(r["lead"], bool(ok))
        results.append(ok)
    sent = [x for x in results if x is not None]
    return all(sent) if sent else None

# ---------------------------------------------------------------- task tool (simulated)
def _task(p):
    """assign_subtask: create the task and assign it."""
    tasks = list(persist.get("tasks", []))
    now = time.time()
    row = {"id": len(tasks) + 1, "title": p.get("title") or p.get("task"), "assignee": p.get("assignee"), "due": p.get("due"), "client": p.get("client", ""),
           "client_id": p.get("client_id", ""), "hours": p.get("hours", 8), "reason": p.get("reason"), "status": "open", "created": now, "updated": now}
    if _fail(): return False
    tasks.append(row); persist.put("tasks", tasks); p["_task_id"] = row["id"]
    return any(t["id"] == row["id"] and t["title"] == row["title"] and t["assignee"] == row["assignee"] for t in persist.get("tasks", []))

def _reassign(p):
    """reassign_stalled_task: hand an existing task to someone else."""
    tasks = list(persist.get("tasks", []))
    t = next((x for x in tasks if x["id"] == p.get("task_id")), None)
    if not t or _fail(): return False
    t.setdefault("history", []).append({"from": t.get("assignee"), "to": p.get("to"), "at": time.time()})
    t["assignee"], t["updated"] = p.get("to"), time.time(); persist.put("tasks", tasks)
    return next((x for x in persist.get("tasks", []) if x["id"] == p.get("task_id")), {}).get("assignee") == p.get("to")

def _task_status(p):
    """update_task_record: write a status back to the task tool."""
    tasks = list(persist.get("tasks", []))
    t = next((x for x in tasks if x["id"] == p.get("task_id")), None)
    if not t or _fail(): return False
    p["_status_was"] = t["status"]; t["status"], t["updated"] = p.get("status", t["status"]), time.time(); persist.put("tasks", tasks)
    return next((x for x in persist.get("tasks", []) if x["id"] == p.get("task_id")), {}).get("status") == p.get("status")

def _project(p):
    """decompose_project: attach the subtasks to the project already identified for this client, or record a new one."""
    ps = list(persist.get("projects", []))
    open_ = next((x for x in reversed(ps) if x.get("client_id") == p.get("client_id") and not x.get("subtasks")), None)
    if open_: p["_subtasks_was"] = open_.get("subtasks", []); open_["subtasks"] = p.get("subtasks", []); row = open_
    else:
        row = {"id": len(ps) + 1, "name": p.get("project"), "client": p.get("client", ""), "client_id": p.get("client_id", ""), "subtasks": p.get("subtasks", [])}; ps.append(row)
    persist.put("projects", ps); p["_project_id"] = row["id"]
    return any(x["id"] == row["id"] and x.get("subtasks") == p.get("subtasks", []) for x in persist.get("projects", []))

def _identify_project(p):
    """Owner confirmed this is new work: it becomes a project (planning is chained by the server)."""
    ps = list(persist.get("projects", [])); row = {"id": len(ps) + 1, "name": p.get("project"), "client": p.get("client", ""), "client_id": p.get("client_id", ""), "subtasks": [], "brief": p.get("summary", "")}
    ps.append(row); persist.put("projects", ps); p["_project_id"] = row["id"]
    return any(x["id"] == row["id"] for x in persist.get("projects", []))

# ---------------------------------------------------------------- memory and records
def _record_facts(p):
    """record_correspondence_fact: what the message said becomes memory, owned by that client, with its source."""
    ids = [STORE.add_fact(p["owner"], p.get("kind", "client.fact"), t, source=p.get("message")) for t in p.get("facts", []) if t]
    return bool(ids) and all(STORE.facts.get(i, {}).get("owner") == p["owner"] for i in ids)

def _read_doc(p):
    persist.append("documents_read", {"name": p.get("name"), "chars": p.get("chars")})
    return any(r.get("name") == p.get("name") for r in persist.tail("documents_read", 5))

def _client_update(p):
    c = STORE.client(p["client"]) or {}
    p["_was"] = c.get("contact", {}).get("email") if p["field"] == "contact.email" else c.get("contact", {}).get("name") if p["field"] == "contact.name" else c.get(p["field"])
    done = STORE.update_client(p["client"], p["field"], p["value"])
    if p["field"] == "contact.email": return done and (STORE.client(p["client"]) or {}).get("contact", {}).get("email") == p["value"]
    return done

def _crm(p):
    crm = dict(persist.get("crm", {})); key = p.get("client", "unknown")
    if _fail(): return False
    p["_crm_was"] = crm.get(key, {}).get(p.get("field", "note")); crm.setdefault(key, {})[p.get("field", "note")] = p.get("value"); persist.put("crm", crm)
    return persist.get("crm", {}).get(key, {}).get(p.get("field", "note")) == p.get("value")

# ---------------------------------------------------------------- marketing
def _save_draft(p):
    d = list(persist.get("drafts", [])); row = {"id": len(d) + 1, **p}; d.append(row); persist.put("drafts", d); p["_draft_id"] = row["id"]
    return any(x["id"] == row["id"] for x in persist.get("drafts", []))

def _retain(p):
    r = list(persist.get("retained", [])); row = {"id": len(r) + 1, **p}; r.append(row); persist.put("retained", r); p["_retained_id"] = row["id"]
    return any(x["id"] == row["id"] for x in persist.get("retained", []))

def _brand(p):
    c = p.get("changes", {})
    STORE.update_brand(c.get("voice"), c.get("positioning"), c.get("add_permitted"), c.get("add_prohibited"))
    b = STORE.profile.get("brand", {}); have = {x["text"].strip().lower() for x in b.get("permitted_claims", []) + b.get("prohibited_claims", [])}
    return all(t.strip().lower() in have for t in (c.get("add_permitted") or []) + (c.get("add_prohibited") or [])) and (not c.get("voice") or b.get("voice") == c["voice"])

# ---------------------------------------------------------------- undo (reversible actions only)
def _drop(key, rid):
    rows = list(persist.get(key, []) or []); keep = [x for x in rows if x.get("id") != rid]
    if len(keep) == len(rows): return False
    persist.put(key, keep); return True

def undo(cls, p):
    """Reverse what an executor did, using what it remembered. Returns True only if the record is back as it was."""
    try:
        if cls == "assign_subtask": return _drop("tasks", p.get("_task_id"))
        if cls == "reassign_stalled_task":
            tasks = list(persist.get("tasks", []) or []); t = next((x for x in tasks if x["id"] == p.get("task_id")), None)
            if not t or t.get("assignee") != p.get("to"): return False
            t["assignee"], t["updated"] = p.get("from"), time.time(); persist.put("tasks", tasks); return True
        if cls == "update_task_record":
            tasks = list(persist.get("tasks", []) or []); t = next((x for x in tasks if x["id"] == p.get("task_id")), None)
            if not t or "_status_was" not in p: return False
            t["status"] = p["_status_was"]; persist.put("tasks", tasks); return True
        if cls == "update_client_record": return "_was" in p and STORE.update_client(p["client"], p["field"], p["_was"])
        if cls == "flag_relationship_risk":
            crm = dict(persist.get("crm", {}) or {}); rec = dict(crm.get(p.get("client", "unknown"), {}))
            if p.get("_crm_was") is None: rec.pop(p.get("field", "note"), None)
            else: rec[p.get("field", "note")] = p["_crm_was"]
            crm[p.get("client", "unknown")] = rec; persist.put("crm", crm); return True
        if cls == "draft_content": return _drop("drafts", p.get("_draft_id"))
        if cls == "retain_approved_content": return _drop("retained", p.get("_retained_id"))
        if cls == "identify_project": return _drop("projects", p.get("_project_id"))
        if cls == "decompose_project":
            ps = list(persist.get("projects", []) or []); row = next((x for x in ps if x["id"] == p.get("_project_id")), None)
            if not row: return False
            if "_subtasks_was" in p: row["subtasks"] = p["_subtasks_was"]; persist.put("projects", ps); return True
            return _drop("projects", row["id"])
    except Exception:
        return False
    return False

def _publish(p):
    # The system never places content anywhere itself (FYP scope). Hackathon demo: the post is held, not sent.
    persist.append("published_blocked", {"post": p}); return None

def _record_only(label):
    def run(p):
        print(f"[EXEC] {label}: {p}"); return None          # nothing external to verify
    return run

EXECUTORS = {c: _record_only(c) for c in CLASSES}
EXECUTORS.update({
    "reply_to_client": send_email, "followup_client_no_reply": send_email, "send_lead_followup": send_email, "reply_to_enquiry": send_email,
    "notify_owner_unread_file": lambda p: send_email(p, internal=True), "notify_teammate_assignment": lambda p: send_email(p, internal=True),
    "send_lead_outreach": lambda p: send_campaign(p) if "recipients" in p else send_email(p),
    "assign_subtask": _task, "reassign_stalled_task": _reassign, "update_task_record": _task_status, "decompose_project": _project, "identify_project": _identify_project,
    "record_correspondence_fact": _record_facts, "read_attached_document": _read_doc, "update_client_record": _client_update, "flag_relationship_risk": _crm,
    "draft_content": _save_draft, "retain_approved_content": _retain, "update_brand_record": _brand, "publish_post": _publish,
})
