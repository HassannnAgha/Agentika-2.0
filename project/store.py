"""Business memory: the onboarding profile (fixture format) and the fact store the guardrail checks against.

Every fact has an id and an owner: a client id, a lead id, or "business". The gate refuses any proposal that
cites a fact whose owner is neither the counterparty nor the business. Profile facts are rebuilt whenever the
profile changes (ids 1..9999); lead facts are added by lead gen (ids 10000+) and survive profile changes."""
import threading, datetime
import persist
from catalogue import AGENT_NEEDS

DATA = persist.DATA
LEAD_BASE = 10000
lock = threading.RLock()

def _ago(days): return (datetime.date.today() - datetime.timedelta(days=days)).isoformat()

def demo_profile():
    """Invented agency, same shape the onboarding wizard exports. Clearly labelled as sample data."""
    return {
        "fixture_version": 2, "source": "demo",
        "business": {"name": "Northline Studio", "category": "Design and web studio", "team_size": 5,
                     "description": "We build websites and brand material for independent practices and small logistics firms, mostly in Lahore.",
                     "timezone": "Asia/Karachi", "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                     "working_hours": {"start": "09:00", "end": "18:00"},
                     "owner": {"name": "Ayesha Rauf", "email": "ayesha@northline.example"}, "custom": []},
        "team": [
            {"id": "tm-1", "name": "Ayesha Rauf", "role": "Owner", "email": "ayesha@northline.example", "skills": ["strategy", "client work"], "weekly_capacity_hours": 20},
            {"id": "tm-2", "name": "Sana Malik", "role": "Designer", "email": "sana@northline.example", "skills": ["branding", "Figma", "illustration"], "weekly_capacity_hours": 40},
            {"id": "tm-3", "name": "Imran Qureshi", "role": "Developer", "email": "imran@northline.example", "skills": ["React", "Next.js", "SEO"], "weekly_capacity_hours": 40},
            {"id": "tm-4", "name": "Hira Tahir", "role": "Project manager", "email": "hira@northline.example", "skills": ["planning", "scoping"], "weekly_capacity_hours": 35}],
        "clients": [
            {"id": "cl-1", "name": "Meridian Design Co.", "contact": {"name": "Omar Sheikh", "email": "omar@meridian.example"}, "relationship_start": "2025-03-10", "status": "active", "last_contact": _ago(4), "notes": "Prefers weekly status updates. Brand refresh due Nov 3."},
            {"id": "cl-2", "name": "Harbour & Fin", "contact": {"name": "Zoya Ali", "email": "zoya@harbourfin.example"}, "relationship_start": "2025-08-01", "status": "active", "last_contact": _ago(14), "notes": "Renewal quote is confidential. No reply to last email in 9 days."},
            {"id": "cl-3", "name": "Avery Logistics", "contact": {"name": "Bilal Avery", "email": "bilal@avery.example"}, "relationship_start": "2024-11-20", "status": "active", "last_contact": _ago(25), "notes": "Site refresh in progress."}],
        "brand": {"voice": "Plain, warm, direct", "positioning": "A small studio that ships clear websites on a fixed scope and price.",
                  "permitted_claims": [{"text": "We build websites and brand material for small businesses."}, {"text": "Projects are scoped in writing before work starts."}, {"text": "Based in Lahore, Pakistan."}],
                  "prohibited_claims": [{"text": "Any guarantee of rankings, traffic or revenue."}, {"text": "Any price not already quoted in writing."}], "custom": []},
        "connections": {"email": {"status": "connected", "simulated": True}, "task_tool": {"status": "connected", "simulated": True}},
        "take_up": [],
    }

def agent_status(profile):
    conn = profile.get("connections", {})
    out = {}
    for a, needs in AGENT_NEEDS.items():
        missing = [n for n in needs if conn.get(n, {}).get("status") != "connected"]
        out[a] = {"active": not missing, "missing": missing}
    return out

class Store:
    def __init__(self):
        self.profile, self.facts, self.lead_facts, self._next_lead = None, {}, {}, LEAD_BASE
        self.load()

    # ---- persistence
    def load(self):
        with lock:
            self.profile = persist.get("profile") or demo_profile()
            d = persist.get("lead_facts") or {}
            self.lead_facts = {int(k): v for k, v in d.items()}
            self._next_lead = max([LEAD_BASE - 1, *self.lead_facts]) + 1
            self._rebuild()

    def set_profile(self, p):
        with lock:
            self.profile = p
            persist.put("profile", p); self._rebuild()

    def reset_demo(self):
        with lock:
            persist.delete("profile"); self.profile = demo_profile(); self._rebuild()

    # ---- facts
    def _rebuild(self):
        p, b, f = self.profile, self.profile.get("business", {}), {}
        ids = self.__dict__.setdefault("_idmap", {})        # (owner, kind) -> id, stable while the process lives, so a pending proposal's
        def add(owner, kind, text):                         # cited ids stay valid after the profile is edited (e.g. a brand change)
            if not str(text).strip(): return
            i = ids.setdefault((owner, kind), len(ids) + 1)
            f[i] = {"owner": owner, "kind": kind, "text": str(text).strip()}
        add("business", "biz.summary", f"{b.get('name','')} is a {b.get('category','')}. {b.get('description','')}")
        wh = b.get("working_hours", {})
        add("business", "biz.hours", f"Working {', '.join(b.get('working_days', []))}, {wh.get('start','')} to {wh.get('end','')} ({b.get('timezone','')})")
        br = p.get("brand", {})
        add("business", "biz.positioning", br.get("positioning", "")); add("business", "biz.voice", f"Voice: {br.get('voice','')}")
        for i, c in enumerate(br.get("permitted_claims", [])): add("business", f"biz.claim.{i}", "Permitted claim: " + c.get("text", ""))
        for i, c in enumerate(br.get("prohibited_claims", [])): add("business", f"biz.never.{i}", "Never claim: " + c.get("text", ""))
        for i, m in enumerate(p.get("team", [])): add("business", f"biz.team.{i}", f"Team: {m.get('name','')} ({m.get('role','')}), skills {', '.join(m.get('skills', []))}")
        for c in p.get("clients", []):
            cid, ct = c["id"], c.get("contact", {})
            add(cid, "client.status", f"{c['name']} is a {c.get('status','active')} client; contact {ct.get('name','')}")
            add(cid, "client.since", f"Working together since {c.get('relationship_start','')}")
            add(cid, "client.last", f"Last contact {c.get('last_contact','')}")
            add(cid, "client.notes", c.get("notes", ""))
            for j, x in enumerate(c.get("custom") or []): add(cid, f"client.custom.{j}", f"{x.get('label','')}: {x.get('value','')}")
        self.facts = {**f, **self.lead_facts}

    def add_fact(self, owner, kind, text, source=None):
        """A fact learned after onboarding (about a lead, or from a client's correspondence). Persisted; ids 10000+."""
        with lock:
            i = self._next_lead; self._next_lead += 1
            self.lead_facts[i] = {"owner": owner, "kind": kind, "text": text, **({"source": source} if source else {})}; self.facts[i] = self.lead_facts[i]
            persist.put("lead_facts", {str(k): v for k, v in self.lead_facts.items()}); return i
    add_lead_fact = add_fact

    # ---- record changes made by approved actions
    def update_client(self, cid, field, value):
        with lock:
            c = self.client(cid)
            if not c: return False
            if field == "contact.email": c["contact"]["email"] = value
            elif field == "contact.name": c["contact"]["name"] = value
            elif field == "status" and value in ("active", "past", "prospect"): c["status"] = value
            elif field == "last_contact": c["last_contact"] = value
            else: return False
            persist.put("profile", self.profile); self._rebuild(); return True

    def update_brand(self, voice=None, positioning=None, add_permitted=None, add_prohibited=None):
        with lock:
            b = self.profile.setdefault("brand", {})
            if voice: b["voice"] = voice
            if positioning: b["positioning"] = positioning
            for key, new in (("permitted_claims", add_permitted), ("prohibited_claims", add_prohibited)):
                have = {x["text"].strip().lower() for x in b.setdefault(key, [])}
                for t in new or []:
                    if t.strip() and t.strip().lower() not in have: b[key].append({"text": t.strip()}); have.add(t.strip().lower())
            persist.put("profile", self.profile); self._rebuild(); return True

    def fid(self, owner, kind):
        for i, x in self.facts.items():
            if x["owner"] == owner and x["kind"] == kind: return i
    def of(self, owner): return {i: x for i, x in self.facts.items() if x["owner"] == owner}
    def allowed_for(self, counterparty): return {i for i, x in self.facts.items() if x["owner"] in (counterparty, "business")}

    # ---- lookups used by agents
    def clients(self): return self.profile.get("clients", [])
    def client(self, cid): return next((c for c in self.clients() if c["id"] == cid), None)
    def team(self): return self.profile.get("team", [])

STORE = Store()
