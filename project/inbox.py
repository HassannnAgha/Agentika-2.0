"""Mailbox poller: reads UNSEEN mail over IMAP (Gmail with an app password, or any IMAP server) and hands each message to the
Operations agent. Reading never marks anything as answered and nothing is ever sent from here: the agent only PROPOSES.
Set IMAP_HOST (imap.gmail.com), IMAP_USER, IMAP_PASSWORD. Off unless all three are set.

Safety: it only reads UNSEEN mail received SINCE a date (IMAP_SINCE, default today) in one folder (IMAP_FOLDER, default INBOX), and at most
`limit` messages per poll, so connecting a mailbox that already holds thousands of unread messages never sweeps through them.
Best practice: a dedicated mailbox, or a Gmail label such as "bizzii" set as IMAP_FOLDER."""
import os, re, base64, email, imaplib, threading, time, datetime, html as _html
from email import policy
from email.utils import parseaddr
import persist

STATE = {"last_poll": None, "last_result": None, "running": False}
SKIP_SENDERS = re.compile(r"(no-?reply|donotreply|mailer-daemon|postmaster|notifications?@|bounce)", re.I)

def since_date() -> str:
    """IMAP date criterion, e.g. 16-Oct-2026. IMAP_SINCE (YYYY-MM-DD) or today: never the backlog."""
    raw = os.getenv("IMAP_SINCE", "").strip()
    try: d = datetime.date.fromisoformat(raw) if raw else datetime.date.today()
    except ValueError: d = datetime.date.today()
    return d.strftime("%d-%b-%Y")

def configured() -> bool: return all(os.getenv(k) for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"))

def parse_message(raw: bytes) -> dict:
    m = email.message_from_bytes(raw, policy=policy.default)
    part = m.get_body(preferencelist=("plain", "html"))
    body = part.get_content() if part is not None else ""
    if part is not None and part.get_content_type() == "text/html": body = _html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style).*?</\1>", " ", body)))
    atts = []
    for a in m.iter_attachments():
        data = a.get_payload(decode=True) or b""
        atts.append({"name": a.get_filename() or "attachment", "content_b64": base64.b64encode(data[:8_000_000]).decode()})
    return {"sender": parseaddr(str(m.get("From", "")))[1], "subject": str(m.get("Subject", "")), "body": re.sub(r"\s+\n", "\n", body).strip(),
            "attachments": atts, "message_id": str(m.get("Message-ID", "")).strip(), "auto": str(m.get("Auto-Submitted", "no")).lower() != "no" or
            str(m.get("Precedence", "")).lower() in ("bulk", "list", "junk")}

def skip_reason(msg: dict):
    own = {os.getenv("IMAP_USER", "").lower(), os.getenv("SMTP_USER", "").lower(), os.getenv("TEST_INBOX", "").lower()} - {""}
    if not msg["sender"]: return "no sender"
    if msg["sender"].lower() in own: return "from our own address"
    if msg["auto"] or SKIP_SENDERS.search(msg["sender"]): return "automated message"
    if not msg["body"].strip() and not msg["attachments"]: return "empty"
    return None

def poll_once(handler, limit: int = 10, imap_factory=None) -> dict:
    """Process up to `limit` unseen messages. handler(sender, subject, body, attachments) -> proposals."""
    if not configured() and imap_factory is None: raise RuntimeError("mailbox not configured")
    seen = set(persist.get("inbox_seen", []) or [])
    done, skipped = [], []
    box = imap_factory() if imap_factory else imaplib.IMAP4_SSL(os.environ["IMAP_HOST"])
    try:
        if imap_factory is None: box.login(os.environ["IMAP_USER"], os.environ["IMAP_PASSWORD"])
        box.select(os.getenv("IMAP_FOLDER", "INBOX"))
        typ, data = box.search(None, "UNSEEN", "SINCE", since_date())
        for num in (data[0].split() if data and data[0] else [])[:limit]:
            typ, parts = box.fetch(num, "(BODY.PEEK[])")
            msg = parse_message(parts[0][1])
            mid = msg["message_id"] or f"{msg['sender']}|{msg['subject']}"
            why = "already processed" if mid in seen else skip_reason(msg)
            if why: skipped.append({"from": msg["sender"], "why": why})
            else:
                out = handler(msg["sender"], msg["subject"], msg["body"], msg["attachments"], message_id=msg["message_id"])
                done.append({"from": msg["sender"], "subject": msg["subject"], "proposals": [x["cls"] for x in out]})
            seen.add(mid); box.store(num, "+FLAGS", "\\Seen")
    finally:
        try: box.logout()
        except Exception: pass
    persist.put("inbox_seen", sorted(seen)[-500:])
    STATE.update(last_poll=time.strftime("%Y-%m-%d %H:%M:%S"), last_result={"processed": len(done), "skipped": skipped, "messages": done})
    return STATE["last_result"]

def start_background(handler, every: int = 60):
    """Poll on a timer when a mailbox is configured. A failure is logged and retried; it never takes the server down."""
    if STATE["running"] or not configured() or os.getenv("INBOX_POLL", "1") == "0": return False
    STATE["running"] = True
    def loop():
        while True:
            try: poll_once(handler)
            except Exception as e: STATE["last_result"] = {"error": type(e).__name__}; print(f"[inbox] poll failed: {type(e).__name__}")
            time.sleep(every)
    threading.Thread(target=loop, daemon=True).start(); return True
