"""The mailbox poller, against a fake IMAP server. No network."""
import os, sys, tempfile
from email.message import EmailMessage
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = ""
os.environ.pop("GROQ_API_KEY", None)
for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"): os.environ.pop(k, None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
import server, inbox

c = TestClient(server.app)

def mail(sender, subject, body, att=None, auto=False, mid="<1@x>"):
    m = EmailMessage(); m["From"] = f"Someone <{sender}>"; m["To"] = "agency@example.com"; m["Subject"] = subject; m["Message-ID"] = mid
    if auto: m["Auto-Submitted"] = "auto-replied"
    m.set_content(body)
    if att: m.add_attachment(att[1], subtype="plain", filename=att[0])
    return m.as_bytes()

class FakeIMAP:
    def __init__(self, msgs): self.msgs, self.seen = msgs, []
    def select(self, box): return "OK", [b"1"]
    def search(self, charset, crit): return "OK", [b" ".join(str(i + 1).encode() for i in range(len(self.msgs)))]
    def fetch(self, num, spec): return "OK", [(b"1 (RFC822)", self.msgs[int(num) - 1])]
    def store(self, num, op, flag): self.seen.append(int(num)); return "OK", []
    def logout(self): return "BYE", []

def test_unconfigured_mailbox_is_a_clear_409_not_a_crash():
    assert c.post("/api/inbox/poll").status_code == 409
    s = c.get("/api/inbox/status").json(); assert s["configured"] is False and s["polling"] is False

def test_poll_gives_each_real_message_to_the_operations_agent_and_skips_noise():
    c.post("/reset?seed=true&full=true")
    msgs = [mail("omar@meridian.example", "Scope", "The refresh is wanted by 14 November. Please confirm the budget is agreed.", ("scope.txt", "Scope covers the homepage and three pages. Delivery by 14 November."), mid="<a@x>"),
            mail("noreply@service.example", "Your receipt", "Thanks for your order", mid="<b@x>"),
            mail("zoya@harbourfin.example", "Out of office", "I am away", auto=True, mid="<c@x>"),
            mail("someone@newco.example", "Do you build sites?", "Hello, do you build websites for clinics?", mid="<d@x>")]
    fake = FakeIMAP(msgs)
    r = inbox.poll_once(server.process_inbound, imap_factory=lambda: fake)
    assert r["processed"] == 2
    assert {s["why"] for s in r["skipped"]} == {"automated message"}
    first = next(m for m in r["messages"] if m["from"] == "omar@meridian.example")
    assert {"reply_to_client", "read_attached_document", "record_correspondence_fact"} <= set(first["proposals"])
    enq = next(m for m in r["messages"] if m["from"] == "someone@newco.example"); assert "reply_to_enquiry" in enq["proposals"]
    assert sorted(fake.seen) == [1, 2, 3, 4]                      # every message is marked read, including the skipped ones
    again = inbox.poll_once(server.process_inbound, imap_factory=lambda: FakeIMAP(msgs))
    assert again["processed"] == 0 and {s["why"] for s in again["skipped"]} >= {"already processed"}   # never handled twice
    assert c.get("/api/console/memory").json()["messages"][0]["attachments"] in (0, 1)

def test_own_address_is_never_processed(monkeypatch):
    monkeypatch.setenv("TEST_INBOX", "agency.test@example.com")
    r = inbox.poll_once(server.process_inbound, imap_factory=lambda: FakeIMAP([mail("agency.test@example.com", "Re: [TEST for x] hello", "A copy of our own test email.", mid="<e@x>")]))
    assert r["processed"] == 0 and r["skipped"][0]["why"] == "from our own address"

def test_html_only_mail_is_reduced_to_text():
    m = EmailMessage(); m["From"] = "a@b.example"; m["Subject"] = "Hi"; m["Message-ID"] = "<h@x>"
    m.set_content("<html><style>p{}</style><body><p>Our budget is agreed at PKR 200,000.</p></body></html>", subtype="html")
    p = inbox.parse_message(m.as_bytes()); assert "PKR 200,000" in p["body"] and "<p>" not in p["body"] and "style" not in p["body"].lower()
