"""Sales agent, lead side: discover -> read the lead's own website -> score -> draft first outreach.
Everything here PROPOSES. Sending goes through the gate (class send_lead_outreach, always escalated by F2).

Discovery uses OpenStreetMap Nominatim (public data, no key, 1 request per search). If the network or the search
fails it falls back to clearly labelled SAMPLE leads so the demo never depends on Wi-Fi. A lead's facts are only
what a source actually said: nothing is invented."""
import os, json, re, uuid, time, threading
from urllib.parse import urlparse
import httpx
from store import STORE
import crawl, llm, persist

lock = threading.RLock()
LEADS: dict = persist.get("leads") or {}

def _save(): persist.put("leads", LEADS)

SAMPLE = [  # invented, flagged sample=True, pre-enriched because the .example domains cannot be crawled
    {"name": "Lakeview Dental Care", "category": "dental clinic", "address": "12 Garden Road, Lahore", "website": "https://lakeviewdental.example", "phone": "+92 300 0000001",
     "email": "hello@lakeviewdental.example", "signals": {"hiring": False, "has_booking": False, "has_chat": False, "has_pricing": False}},
    {"name": "Ravi Logistics Pvt", "category": "logistics firm", "address": "Plot 4, Industrial Area, Lahore", "website": "https://ravilogistics.example", "phone": "",
     "email": "info@ravilogistics.example", "signals": {"hiring": True, "has_booking": False, "has_chat": False, "has_pricing": False}},
    {"name": "Zaitoon Physio", "category": "physiotherapy clinic", "address": "DHA Phase 5, Lahore", "website": "https://zaitoonphysio.example", "phone": "+92 300 0000003",
     "email": "contact@zaitoonphysio.example", "signals": {"hiring": False, "has_booking": True, "has_chat": False, "has_pricing": True}},
]

def _domain(u): return (urlparse(u if "//" in (u or "") else "//" + (u or "")).hostname or "").removeprefix("www.")
def _key(l): return _domain(l.get("website", "")) or re.sub(r"\W+", "", l["name"].lower() + l.get("address", "")[:20])

def discover(keyword: str, geo: str, limit: int = 8) -> dict:
    """Find businesses. Returns {added, skipped, source, note}."""
    limit = max(1, min(int(limit or 8), 15)); found, note, source = [], "", "openstreetmap"
    try:
        r = httpx.get("https://nominatim.openstreetmap.org/search", timeout=12,
                      headers={"User-Agent": "BizziiHackathon/1.0 (prototype; one query per search)"},
                      params={"q": f"{keyword} {geo}".strip(), "format": "jsonv2", "extratags": 1, "addressdetails": 0, "limit": 40})
        r.raise_for_status()
        for it in r.json():
            tags, name = it.get("extratags") or {}, it.get("name") or ""
            if not name or it.get("category") in ("boundary", "place", "highway", "landuse", "natural"): continue
            found.append({"name": name, "category": keyword, "address": it.get("display_name", "")[:140],
                          "website": tags.get("website") or tags.get("contact:website") or "", "phone": tags.get("phone") or tags.get("contact:phone") or "",
                          "email": tags.get("email") or tags.get("contact:email") or "", "signals": {}})
    except Exception as e:
        note = f"Live search unavailable ({type(e).__name__}); showing sample leads."
    sample = False
    if not found:
        found, source, sample = [dict(s) for s in SAMPLE], "sample", True
        note = note or "No public listings matched; showing sample leads."
    added = skipped = 0
    with lock:
        have = {_key(l) for l in LEADS.values()}
        for l in found:
            if added >= limit: break
            if _key(l) in have: skipped += 1; continue
            have.add(_key(l)); lid = "ld-" + uuid.uuid4().hex[:6]
            LEADS[lid] = {"id": lid, "status": "new", "source": source, "sample": sample, "score": None, "reasons": [], "facts": {},
                          "draft": None, "proposal": None, "geo": geo, **l}
            _facts(LEADS[lid], listing=True); added += 1
        _save()
    return {"added": added, "skipped_duplicates": skipped, "source": source, "note": note}

def add_by_website(url: str, category: str = "") -> dict:
    """Owner pastes a prospect's website: read it (robots-respecting), take the public email and what the site shows."""
    site = crawl.read_site(url, max_pages=4)
    if not site["pages"]: return {"error": "Could not read that website: " + (", ".join(site["errors"]) or "blocked or unreachable")}
    name = re.split(r"\s[|\-–—:]\s", site["title"])[0].strip() or _domain(site["url"])
    with lock:
        for l in LEADS.values():
            if _domain(l.get("website", "")) == _domain(site["url"]): return {"error": f"{l['name']} is already in the lead bank", "id": l["id"]}
        lid = "ld-" + uuid.uuid4().hex[:6]
        LEADS[lid] = {"id": lid, "status": "new", "source": "website", "sample": False, "score": None, "reasons": [], "facts": {}, "draft": None, "proposal": None,
                      "geo": "", "name": name[:80], "category": category or "business", "address": site["description"][:140] or site["url"], "website": site["url"], "phone": "",
                      "email": site["emails"][0] if site["emails"] else "", "signals": site["signals"],
                      "crawl": {"pages": len(site["pages"]), "errors": site["errors"][:2]}}
        l = LEADS[lid]; _facts(l, listing=True, obs=True); score(l); l["status"] = "enriched"; _save()
    return l

def _facts(l, listing=False, obs=False):
    """Record only what a source said, each as a fact owned by this lead (the guardrail's scope)."""
    S, f = STORE, l["facts"]
    if listing and "listing" not in f:
        how = ("sample data, not a real business" if l["sample"] else "read from its own website" if l.get("source") == "website" else "public OpenStreetMap listing")
        f["listing"] = S.add_lead_fact(l["id"], "lead.listing", f"{l['name']} is listed as a {l['category']} at {l['address']} ({how})")
    if l.get("email") and "email" not in f:
        f["email"] = S.add_lead_fact(l["id"], "lead.email", f"A public email address for {l['name']} is {l['email']}")
    if obs:
        sig = l.get("signals") or {}
        if l.get("website") and "obs_booking" not in f and sig and not sig.get("has_booking"):
            f["obs_booking"] = S.add_lead_fact(l["id"], "lead.obs", f"The website of {l['name']} shows no online booking option")
        if "obs_chat" not in f and sig and not sig.get("has_chat") and l.get("website"):
            f["obs_chat"] = S.add_lead_fact(l["id"], "lead.obs", f"The website of {l['name']} shows no live chat")
        if sig.get("hiring") and "obs_hiring" not in f:
            f["obs_hiring"] = S.add_lead_fact(l["id"], "lead.obs", f"{l['name']} is advertising open positions, so it appears to be growing")

def enrich(lid: str) -> dict:
    with lock: l = LEADS.get(lid)
    if not l: return {"error": "unknown lead"}
    if l["website"] and not l["sample"]:
        r = crawl.read_site(l["website"], max_pages=4)
        if r["emails"] and not l["email"]: l["email"] = r["emails"][0]
        l["signals"] = r["signals"] if r["pages"] else l.get("signals", {})
        l["crawl"] = {"pages": len(r["pages"]), "errors": r["errors"][:2]}
    _facts(l, obs=True); score(l); l["status"] = "enriched" if l["status"] == "new" else l["status"]
    with lock: _save()
    return l

def score(l):
    """Transparent fit score 0-100, each point traceable to a reason. No model involved."""
    pts, why, sig = 15, ["listed publicly (+15)"], l.get("signals") or {}
    def add(c, n, t):
        nonlocal pts
        if c: pts += n; why.append(f"{t} (+{n})")
    add(l.get("website"), 20, "has a website"); add(l.get("email"), 30, "public email found"); add(l.get("phone"), 5, "phone listed")
    add(sig.get("hiring"), 10, "hiring, so growing"); add(l.get("website") and sig and not sig.get("has_booking"), 15, "no online booking, a clear gap")
    add(l.get("website") and sig and not sig.get("has_chat"), 5, "no live chat")
    l["score"], l["reasons"] = min(pts, 100), why

def draft(lid: str) -> dict:
    """Draft first outreach citing recorded facts. LLM if a key is set, else a template. Either way the gate re-checks."""
    l = LEADS.get(lid)
    if not l: return {"error": "unknown lead"}
    if l["status"] == "new": enrich(lid)
    biz, owner = STORE.profile["business"], STORE.profile["business"]["owner"]
    lead_f = {i: x["text"] for i, x in STORE.of(lid).items()}
    claims = {i: x["text"] for i, x in STORE.of("business").items() if x["kind"].startswith("biz.claim")}
    never = [x["text"] for x in STORE.of("business").values() if x["kind"].startswith("biz.never")]
    out = None
    if llm.available():
        out = llm.json_call(
            "You write a short, polite first email from a small business to a prospect. Use ONLY the numbered facts given. "
            "Never state a price, date, guarantee or result. Under 90 words. Offer a short call. Say how to opt out. Never write fact ids or numbers in brackets in the text. "
            'Return {"subject": str, "body": str, "cited": [fact ids you used]}. Facts never to contradict: ' + json.dumps(never),
            json.dumps({"from": f"{owner['name']} at {biz['name']}", "about_the_sender": claims, "about_the_prospect": lead_f}))
        if out and not (isinstance(out.get("cited"), list) and out.get("subject") and out.get("body")): out = None
    if out:
        out["cited"] = [int(c) for c in out["cited"] if str(c).lstrip("-").isdigit()]; out["by"] = "llm"
        out["body"] = llm.strip_citations(out["body"], set(STORE.facts)); out["subject"] = llm.strip_citations(out["subject"], set(STORE.facts))
    else:
        obs = next((lead_f[i] for k, i in l["facts"].items() if k.startswith("obs_") and i in lead_f), None)
        if obs:
            o = obs.replace(l["name"], "your business"); hook = "I noticed that " + o[0].lower() + o[1:].rstrip(".") + "."
        else:
            hook = "I found your business through its public listing."
        cited = [i for k, i in l["facts"].items() if k in ("listing", "obs_booking", "obs_chat", "obs_hiring") and i in lead_f][:2]
        claim_id, claim = next(iter(claims.items()), (None, ""))
        if claim_id: cited.append(claim_id)
        out = {"by": "template", "cited": cited, "subject": f"A quick idea for {l['name']}",
               "body": f"Hi {l['name']} team,\n\nI'm {owner['name']} from {biz['name']}. {hook} {claim.replace('Permitted claim: ', '')}\n\n"
                       f"Would a short call next week be useful? If not, just reply and we won't contact you again.\n\n{owner['name']}, {biz['name']}"}
    out["to"] = l.get("email", "")
    l["draft"] = out; l["status"] = "drafted"
    with lock: _save()
    return out

def proposal_for(lid: str) -> dict | None:
    """The gate's proposal contract for this lead's drafted first email."""
    l = LEADS.get(lid)
    if not l or not l.get("draft"): return None
    d = l["draft"]
    return {"agent": "sales", "cls": "send_lead_outreach", "counterparty": lid, "cited": d["cited"],
            "payload": {"to": d["to"], "subject": d["subject"], "body": d["body"], "lead": l["name"]}, "prior_contact": False}

def followup_proposal(lid: str) -> dict:
    """A short, polite second note. Cites the same recorded facts as the first email."""
    l = LEADS[lid]; d, biz, owner = l["draft"], STORE.profile["business"], STORE.profile["business"]["owner"]
    body = (f"Hi {l['name']} team,\n\nJust following up on my earlier note in case it got buried. Happy to send two or three examples if that would help, "
            f"and equally fine to leave it there.\n\n{owner['name']}, {biz['name']}")
    return {"agent": "sales", "cls": "send_lead_followup", "counterparty": lid, "cited": d["cited"], "prior_contact": False,
            "payload": {"to": d["to"], "subject": "Re: " + d["subject"], "body": body, "lead": l["name"]}}

def mark_contacted(lid, ok=True):
    with lock:
        if lid in LEADS: LEADS[lid]["status"] = "contacted" if ok else "failed"; _save()

def release(lid):
    with lock:
        if lid in LEADS and LEADS[lid]["status"] == "proposed": LEADS[lid]["status"] = "drafted"; LEADS[lid]["proposal"] = None; _save()

def optout(lid: str):
    """The lead asked not to be contacted: suppress the address everywhere, now and for every later send."""
    from executors import suppress
    l = LEADS.get(lid)
    if not l: return None
    if l.get("email"): suppress(l["email"])
    with lock: l["status"] = "opted_out"; _save()
    return l

def campaign_proposal(lead_ids=None, name=None):
    """One proposal for a whole batch (the FYP's campaign): one decision from the owner covers every message in it. Each message
    keeps its own citations, and the server checks each against ITS recipient, so one lead's facts can never ride in another's email."""
    from executors import suppressed
    cap = int(os.getenv("CAMPAIGN_DAILY_CAP", "25"))
    pool = [LEADS[i] for i in (lead_ids or [l["id"] for l in listing()]) if i in LEADS]
    chosen, skipped = [], []
    for l in pool:
        why = ("already approached" if l["status"] in ("proposed", "contacted", "failed") else "opted out" if l["status"] == "opted_out"
               else "no public email" if not l.get("email") else "address opted out" if suppressed(l["email"]) else None)
        if why: skipped.append({"lead": l["name"], "why": why}); continue
        if len(chosen) >= cap: skipped.append({"lead": l["name"], "why": f"over the daily cap of {cap}"}); continue
        if not l.get("draft"): draft(l["id"])
        chosen.append(l)
    if not chosen: return None, skipped
    spec = {"agent": "sales", "cls": "send_lead_outreach", "counterparty": "campaign", "who": f"{len(chosen)} leads",
            "cited": sorted({c for l in chosen for c in l["draft"]["cited"]}),
            "items": [{"counterparty": l["id"], "cited": l["draft"]["cited"]} for l in chosen],
            "payload": {"campaign": name or f"Outreach {time.strftime('%d %b')}",
                        "recipients": [{"lead": l["id"], "name": l["name"], "to": l["email"], "subject": l["draft"]["subject"], "body": l["draft"]["body"]} for l in chosen]}}
    return spec, skipped

def mark(lid, proposal_id):
    if lid in LEADS: LEADS[lid]["status"] = "proposed"; LEADS[lid]["proposal"] = proposal_id; _save()

def pick_lead():
    """The best drafted lead with a public email; seeds offline sample leads first if the bank is empty."""
    from fastapi import HTTPException
    with lock:
        if not LEADS:
            for s in SAMPLE:
                lid = "ld-" + uuid.uuid4().hex[:6]
                LEADS[lid] = {"id": lid, "status": "new", "source": "sample", "sample": True, "score": None, "reasons": [], "facts": {},
                              "draft": None, "proposal": None, "geo": "Lahore", **dict(s)}
                _facts(LEADS[lid], listing=True)
            _save()
    for l in listing():
        if l["email"] and l["status"] in ("new", "enriched", "drafted"):
            if not l.get("draft"): draft(l["id"])
            return l
    raise HTTPException(409, "no lead with a public email left to propose; discover more on the Leads page")

def listing(): return sorted(LEADS.values(), key=lambda l: -(l["score"] or 0))
def clear():
    with lock: LEADS.clear(); _save()
