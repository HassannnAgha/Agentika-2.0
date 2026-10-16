"""Read the last 3 Gmail messages and have a Groq model summarise them.

First run opens a browser for Google sign-in and saves token.json (the refresh
token). Later runs reuse it. Needs credentials.json (Desktop OAuth client) and
GROQ_API_KEY in .env, both gitignored.
"""
import base64
import os
from pathlib import Path

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from groq import Groq

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# gmail.modify = read, label, draft and send (no permanent delete)
SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
CREDS = ROOT / "credentials.json"
TOKEN = ROOT / "token.json"
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")


def gmail():
    creds = Credentials.from_authorized_user_file(TOKEN, SCOPES) if TOKEN.exists() else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDS, SCOPES)
        creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    TOKEN.write_text(creds.to_json())
    os.chmod(TOKEN, 0o600)
    return build("gmail", "v1", credentials=creds)


def body_text(payload):
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode(errors="replace")
    for part in payload.get("parts", []):
        text = body_text(part)
        if text:
            return text
    return ""


def last_messages(service, n=3):
    ids = service.users().messages().list(userId="me", maxResults=n).execute().get("messages", [])
    out = []
    for m in ids:
        msg = service.users().messages().get(userId="me", id=m["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
        out.append({
            "from": headers.get("From", ""),
            "subject": headers.get("Subject", ""),
            "date": headers.get("Date", ""),
            "body": (body_text(msg["payload"]) or msg.get("snippet", ""))[:2000],
        })
    return out


def main():
    mails = last_messages(gmail())
    print(f"Fetched {len(mails)} emails from Gmail:")
    for m in mails:
        print(f"  - {m['date']} | {m['from']} | {m['subject']}")

    listing = "\n\n".join(
        f"Email {i}\nFrom: {m['from']}\nSubject: {m['subject']}\nDate: {m['date']}\n{m['body']}"
        for i, m in enumerate(mails, 1)
    )
    reply = Groq().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "Summarise each email in one or two lines and flag anything needing action."},
            {"role": "user", "content": listing},
        ],
    )
    print(f"\nGroq ({MODEL}) summary:\n{reply.choices[0].message.content}")


if __name__ == "__main__":
    main()
