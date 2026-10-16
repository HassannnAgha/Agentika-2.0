"""The REAL system (DEMO_MODE off): nothing seeded, nothing sampled, evidence and open actions persisted, real connection status,
expiry, recipient-on-record and no-unrecorded-price-or-date guardrails, scheduled sweeps without duplicates, prospecting by business type."""
import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pytest
from fastapi.testclient import TestClient
import server, persist, leadgen, gate as G
from store import STORE
from catalogue import CLASSES, HACKATHON_EXTENSIONS

c = TestClient(server.app)

PROFILE = {"business": {"name": "Cedar Studio", "category": "Design studio", "description": "We build websites for dental clinics and logistics firms in Lahore.",
                        "owner": {"name": "Hina Baig", "email": "hina@cedar.example"}, "working_days": ["Mon"], "working_hours": {"start": "09:00", "end": "18:00"}, "custom": []},
           "team": [{"id": "tm-1", "name": "Hina Baig", "role": "Owner", "email": "hina@cedar.example", "skills": ["strategy"], "weekly_capacity_hours": 20},
                    {"id": "tm-2", "name": "Danish Ali", "role": "Developer", "email": "danish@cedar.example", "skills": ["react", "next.js"], "weekly_capacity_hours": 40}],
           "clients": [{"id": "cl-1", "name": "Orchid Clinic", "contact": {"name": "Dr Sara", "email": "sara@orchid.example"}, "status": "active",
                        "relationship_start": "2025-01-10", "last_contact": "2026-01-01", "custom": []}],
           "brand": {"voice": "plain", "positioning": "Clear sites on a fixed scope.", "permitted_claims": [{"text": "We build websites for clinics."}], "prohibited_claims": []},
           "connections": {"email": {"status": "connected"}, "task_tool": {"status": "connected"}}}

@pytest.fixture
def real(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "0"); monkeypatch.setenv("AUDIT_RATE", "0"); G.AUDIT_RATE = 0
    for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SEED_HISTORY", "GROQ_API_KEY", "LEAD_TARGETS", "GOOGLE_PLACES_API_KEY"): monkeypatch.delenv(k, raising=False)
    with server.lock:
        server._reset_gate(False); server.META["seeded"] = False
        for k in ("gate_state", "actions", "profile", "lead_facts", "tasks", "sales_targets", "suppressed", "crm", "projects"): persist.delete(k)
        leadgen.clear(); STORE.lead_facts.clear(); STORE.load()
    yield monkeypatch
    os.environ["DEMO_MODE"] = "1"
    with server.lock:
        for k in ("gate_state", "actions", "profile", "lead_facts", "sales_targets"): persist.delete(k)
        leadgen.clear(); STORE.lead_facts.clear(); STORE.load(); server._reset_gate(True)

def mailbox(mp):
    mp.setenv("SMTP_HOST", "smtp.example.com"); mp.setenv("SMTP_USER", "me@cedar.example"); mp.setenv("SMTP_PASSWORD", "x")

def onboard(): assert c.post("/api/profile", json=PROFILE).json()["ok"]
def state(): return c.get("/state").json()
def counts(cls): return next(x for x in state()["classes"] if x["cls"] == cls)["counts"]
def propose(**kw): return c.post("/propose", json=kw).json()
def fid(owner, kind): return STORE.fid(owner, kind)

def test_thresholds_match_the_report():
    ns = [G.n_min(G.risk(k)) for k in CLASSES if k not in HACKATHON_EXTENSIONS]
    assert min(ns) == 7 and max(ns) == 18
    for k in CLASSES: assert G.wilson(G.n_min(G.risk(k)), G.n_min(G.risk(k))) >= G.tau(G.risk(k)) - 1e-9   # a clean record of N_min clears tau

def test_before_onboarding_every_agent_is_refused(real):
    s = state(); assert s["mode"] == "real" and s["onboarded"] is False and s["business"] == ""
    r = c.post("/api/agents/marketing/draft", json={"topic": "Hello"}).json()[0]
    assert r["route"] == "refuse" and "complete onboarding" in r["why"]

def test_nothing_is_seeded_and_demo_controls_are_off(real):
    onboard()
    assert all(sum(x["counts"].values()) == 0 for x in state()["classes"]) and state()["seeded_history"] is False
    assert c.post("/scenario/task").status_code == 403 and c.post("/reset").status_code == 403 and c.post("/api/demo/age_tasks").status_code == 403

def test_email_agents_need_a_real_mailbox_not_a_consent_screen(real):
    onboard()                                                     # onboarding said "connected", but no SMTP is configured
    r = c.post("/api/agents/ops/inbound", json={"sender": "sara@orchid.example", "subject": "Hi", "body": "Any update?"}).json()
    assert r[0]["route"] == "refuse" and "no mailbox configured" in r[0]["why"]
    assert c.post("/api/agents/marketing/draft", json={"topic": "Scoped sites"}).json()[0]["route"] == "approval"   # Marketing needs no mailbox
    mailbox(real)
    r = c.post("/api/agents/ops/inbound", json={"sender": "sara@orchid.example", "subject": "Hi", "body": "Any update?"}).json()
    assert r[0]["cls"] == "reply_to_client" and r[0]["route"] == "approval"

def test_evidence_and_waiting_actions_survive_a_restart(real):
    onboard(); mailbox(real)
    a = c.post("/api/agents/marketing/draft", json={"topic": "One"}).json()[0]
    c.post("/decision", json={"id": a["id"], "kind": "approve"})
    waiting = c.post("/api/agents/marketing/draft", json={"topic": "Two"}).json()[0]
    before = counts("draft_content"); persist.flush()
    with server.lock: server.gate.pairs.clear(); server.PENDING.clear(); server._seq[0] = 0       # the process dies
    server.load_state()                                                                          # and comes back
    assert counts("draft_content") == before and before["a"] == 1 and before["ok"] == 1
    assert server.PENDING[waiting["id"]]["status"] == "awaiting"
    assert c.post("/decision", json={"id": waiting["id"], "kind": "approve"}).json()["status"] == "executed"
    assert c.post("/api/agents/marketing/draft", json={"topic": "Three"}).json()[0]["id"] > waiting["id"]   # ids never repeat

def test_undecided_actions_expire_and_count_for_nothing(real):
    onboard()
    a = c.post("/api/agents/marketing/draft", json={"topic": "Stale"}).json()[0]
    before = counts("draft_content")
    assert server.expire(now=time.time() + 97 * 3600) == 1
    assert server.PENDING[a["id"]]["status"] == "expired" and counts("draft_content") == before
    assert c.post("/decision", json={"id": a["id"], "kind": "approve"}).status_code == 409
    assert any(e["event"] == "expired" and e["id"] == a["id"] for e in c.get("/api/audit").json())

def test_outward_mail_may_only_go_to_an_address_on_record(real):
    onboard(); mailbox(real)
    cite = [fid("cl-1", "client.status")]
    bad = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=cite, payload={"to": "someone@else.example", "subject": "Hi", "body": "Hello"})
    assert bad["decision"]["route"] == "refuse" and "not on record" in bad["decision"]["why"]
    good = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=cite, payload={"to": "sara@orchid.example", "subject": "Hi", "body": "Hello"})
    assert good["decision"]["route"] == "approval"
    team = propose(agent="project", cls="notify_teammate_assignment", counterparty="cl-1", cited=[fid("business", "biz.team.1")], payload={"to": "stranger@x.example", "subject": "s", "body": "b"})
    assert team["decision"]["route"] == "refuse"

def test_a_reply_may_not_state_a_price_or_date_nobody_recorded(real):
    onboard(); mailbox(real)
    cite = [fid("cl-1", "client.status")]
    r = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=cite, payload={"to": "sara@orchid.example", "subject": "Quote", "body": "The total is PKR 99,000, ready by 3 March."})
    assert r["decision"]["route"] == "refuse" and "PKR 99,000" in r["decision"]["why"]
    c.post("/api/agents/ops/inbound", json={"sender": "sara@orchid.example", "subject": "Budget", "body": "We agreed PKR 99,000 and need it by 3 March."})
    msg = max(i for i, f in STORE.facts.items() if f["owner"] == "cl-1" and f["kind"] == "message")
    r = propose(agent="operations", cls="reply_to_client", counterparty="cl-1", cited=cite + [msg], payload={"to": "sara@orchid.example", "subject": "Quote", "body": "Confirming PKR 99,000 by 3 March."})
    assert r["decision"]["route"] == "approval"                    # the sender stated it, it is on record, so repeating it is allowed

def test_scheduled_sweeps_never_duplicate_an_open_proposal(real):
    onboard(); mailbox(real)
    first = server.run_scans(); second = server.run_scans()
    assert len(first["quiet_clients"]) == 2 and len(second["quiet_clients"]) == 0   # flag + chase for the quiet client, once

def test_seed_history_is_opt_in_once_and_labelled(real):
    real.setenv("SEED_HISTORY", "1"); real.setenv("AGENT_SCHEDULE", "0")
    server.boot(); persist.flush()
    assert state()["seeded_history"] is True and counts("assign_subtask")["a"] == 7
    server.boot()                                                  # a restart must not seed again on top
    assert counts("assign_subtask")["a"] == 7 and state()["seeded_history"] is True

def test_real_discovery_never_invents_leads(real):
    def boom(*a, **k): raise RuntimeError("offline")
    real.setattr(leadgen.httpx, "get", boom)
    r = leadgen.discover("dental clinic", "Lahore", 5)
    assert r["added"] == 0 and r["source"] == "openstreetmap" and not leadgen.LEADS

def test_who_to_prospect_comes_from_the_profile_and_the_owner_can_override(real):
    onboard(); plan = c.get("/api/sales/targets").json()
    assert plan["by"] == "rules" and any("dental clinics" in t["keyword"] for t in plan["targets"]) and all(t["geo"] == "Lahore" for t in plan["targets"])
    own = c.put("/api/sales/targets", json={"targets": [{"keyword": "physiotherapy clinic", "geo": "Islamabad"}]}).json()
    assert own["by"] == "owner" and c.get("/api/sales/targets").json()["targets"][0]["keyword"] == "physiotherapy clinic"

def test_scheduled_prospecting_ends_in_one_escalated_campaign(real):
    onboard(); mailbox(real); real.setenv("LEAD_MIN_SCORE", "40")
    real.setattr(leadgen, "_from_osm", lambda kw, geo: [{"name": f"{kw.title()} {i}", "category": kw, "address": f"{i} Main Road, {geo}", "website": "", "phone": "",
                                                         "email": f"hello{i}@{kw.split()[0]}{i}.example", "signals": {}} for i in range(3)])
    r = server.run_prospecting()
    assert len(r["found"]["ids"]) == 3 and r["campaign"]["route"] == "escalate" and r["campaign"]["recipients"] == 3
    again = server.run_prospecting()                              # next target, but a campaign is still waiting on the owner: no second one
    assert "campaign" not in again
    pend = [a for a in state()["pending"] if a["cls"] == "send_lead_outreach"]
    assert len(pend) == 1 and "F2" in pend[0]["decision"]["why"]
