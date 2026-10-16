"""Live sending mode (SEND_LIVE=1) with SMTP stubbed: nothing here sends a real email."""
import os, sys, tempfile
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = ""
os.environ.pop("GROQ_API_KEY", None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, executors

c = TestClient(server.app)

class FakeSMTP:
    sent = []
    def __init__(self, host, port, **kw): pass
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def login(self, u, p): pass
    def send_message(self, m): FakeSMTP.sent.append(m)

@pytest.fixture
def live(monkeypatch):
    for k, v in dict(SEND_LIVE="1", SMTP_HOST="smtp.example.com", SMTP_USER="agency@example.com", SMTP_PASSWORD="pw", BUSINESS_ADDRESS="12 Garden Road, Lahore",
                     BUSINESS_NAME="Northline Studio", PUBLIC_URL="https://bizzii.example", UNSUB_SECRET="s3cret", LIVE_DAILY_CAP="30").items(): monkeypatch.setenv(k, v)
    monkeypatch.setattr(executors.smtplib, "SMTP_SSL", FakeSMTP); FakeSMTP.sent.clear()
    c.post("/reset?seed=true&full=true")

def test_default_is_test_mode_nothing_real_is_sent(monkeypatch):
    monkeypatch.delenv("SEND_LIVE", raising=False); monkeypatch.setattr(executors.smtplib, "SMTP_SSL", FakeSMTP); FakeSMTP.sent.clear()
    assert executors.live_mode() is False
    assert executors.send_email({"to": "real@client.example", "subject": "s", "body": "b"}) is True and FakeSMTP.sent == []

def test_live_mail_goes_to_the_real_recipient_with_footer_and_one_click_header(live):
    assert executors.send_email({"to": "owner@clinic.example", "subject": "Hello", "body": "Body text"}) is True
    m = FakeSMTP.sent[0]
    assert m["To"] == "owner@clinic.example" and m["From"] == "agency@example.com"
    body = m.get_content()
    assert "Northline Studio, 12 Garden Road, Lahore" in body and "https://bizzii.example/u/" in body
    assert m["List-Unsubscribe"].startswith("<https://bizzii.example/u/") and m["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert executors.persist.tail("outbox", 1)[0]["live"] is True

def test_no_business_address_means_no_marketing_email_but_internal_mail_still_goes(live, monkeypatch):
    monkeypatch.delenv("BUSINESS_ADDRESS")
    monkeypatch.setattr(executors.STORE, "profile", {**executors.STORE.profile, "business": {**executors.STORE.profile["business"], "custom": []}})
    assert executors.send_email({"to": "owner@clinic.example", "subject": "s", "body": "b"}) is False and FakeSMTP.sent == []   # refused, and said so
    assert "postal address" in executors.persist.tail("outbox", 1)[0]["error"]
    assert executors.send_email({"to": "me@agency.example", "subject": "s", "body": "internal note"}, internal=True) is True
    assert "Do not want to hear" not in FakeSMTP.sent[0].get_content()                                                          # no footer on mail to ourselves

def test_daily_cap_is_enforced(live, monkeypatch):
    monkeypatch.setenv("LIVE_DAILY_CAP", "2")
    results = [executors.send_email({"to": f"p{i}@x.example", "subject": "s", "body": "b"}) for i in range(4)]
    assert results == [True, True, False, False] and len(FakeSMTP.sent) == 2

def test_unsubscribe_link_opts_out_the_signed_address_only(live):
    link = executors.unsub_url("lead@clinic.example"); token = link.rsplit("/u/", 1)[1]
    assert c.get(f"/u/{token}").status_code == 200 and executors.suppressed("lead@clinic.example")
    assert executors.send_email({"to": "lead@clinic.example", "subject": "s", "body": "b"}) is None and FakeSMTP.sent == []   # never contacted again
    assert c.post(f"/u/{token}").status_code == 200                                                                           # the one-click POST works too
    other = executors.unsub_token("someone.else@x.example"); forged = other.split(".")[0] + "." + token.split(".")[1]
    assert c.get(f"/u/{forged}").status_code == 400 and not executors.suppressed("someone.else@x.example")                   # a forged link does nothing
    assert any(e["event"] == "unsubscribed" for e in c.get("/api/audit").json())

def test_unsubscribing_also_marks_the_lead(live):
    import leadgen
    l = leadgen.pick_lead(); c.get("/u/" + executors.unsub_token(l["email"]))
    assert leadgen.LEADS[l["id"]]["status"] == "opted_out"

def test_campaign_in_live_mode_sends_one_message_per_lead_with_their_own_link(live):
    import leadgen
    leadgen.pick_lead()
    r = c.post("/api/agents/sales/campaign", json={}).json()
    assert c.post("/decision", json={"id": r["id"], "kind": "approve"}).json()["verified"] is True
    assert len(FakeSMTP.sent) == 3 and len({m["To"] for m in FakeSMTP.sent}) == 3
    for m in FakeSMTP.sent: assert executors.unsub_verify(m["List-Unsubscribe"].strip("<>").rsplit("/u/", 1)[1]) == m["To"]

def test_name_and_address_come_from_onboarding_not_settings(live, monkeypatch):
    monkeypatch.delenv("BUSINESS_ADDRESS"); monkeypatch.delenv("BUSINESS_NAME")
    prof = server.STORE.profile
    monkeypatch.setattr(executors.STORE, "profile", {**prof, "business": {**prof["business"], "name": "Cedar Studio", "custom": [{"label": "Postal address", "value": "7 Mall Road, Lahore"}]}})
    assert executors.send_email({"to": "owner@clinic.example", "subject": "s", "body": "b"}) is True
    body = FakeSMTP.sent[-1].get_content()
    assert "Cedar Studio, 7 Mall Road, Lahore" in body
