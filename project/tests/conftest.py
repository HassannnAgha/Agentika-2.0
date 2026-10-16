"""Runs before any test module is imported. Tests are hermetic: they never read .env, never see a real key, never touch the real
database or a mailbox, and never send anything. A test that wants a key sets a fake one itself with monkeypatch."""
import os

os.environ["BIZZII_NO_DOTENV"] = "1"          # persist.py must not load the developer's .env
for _k in list(os.environ):
    if _k.startswith(("GROQ_", "IMAP_", "SMTP_", "SEND_LIVE", "TEST_INBOX", "APP_", "GEMINI_", "PUBLIC_URL", "UNSUB_", "LIVE_DAILY", "BUSINESS_")):
        os.environ.pop(_k)
os.environ["DATABASE_URL"] = ""
