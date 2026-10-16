"""Risk-Trust Gate. Deterministic, no LLM in routing, no I/O.
Agents propose, the gate decides. Same proposal + same evidence = same route.

Evaluation order: guardrail (refuse) -> floor rules (escalate, never earnable) -> evidence against a risk-scaled threshold
(ask / recall window / automatic). Competence (W), appropriateness (A) and delegation willingness (D) are three separate
Wilson lower bounds and are never blended into one score."""
import math, random, re
from collections import deque

Z = 1.645                       # one-sided 95% Wilson multiplier
# Threshold curve tau(R) = TAU_MIN + (TAU_MAX - TAU_MIN) * R**GAMMA. These bounds reproduce the report: across the 22 FYP
# classes the evidence minimum N_min(R) runs from 7 to 18 (tau about 0.70 to 0.87). Provisional, not calibrated on owners.
TAU_MIN, TAU_MAX, GAMMA = 0.70, 0.93, 1.0
DEAD_BAND = 0.05                # once granted, autonomy is withdrawn only below tau - DEAD_BAND (no flapping at the line)
AUDIT_RATE = 0.10               # share of promoted actions still sent to the owner, so A and D stay observable after promotion
WINDOW = 50                     # last L owner decisions and last L verified outcomes, kept separately, per (agent, class)

LEVELS = {  # ordered low -> high risk
    "t": ["internal", "teammate", "client", "prospect", "public"],
    "e": ["read", "create", "modify", "delete", "communicate", "broadcast"],
    "b": ["none", "one_person", "one_party", "everyone"],
    "v": ["full", "partial", "none"],
}
WEIGHTS = {"t": .25, "e": .25, "b": .25, "v": .25}

# Declared by developers once (catalogue.py). Never by the model, never by the owner.
from catalogue import CLASSES, INBOUND

def risk(cls):
    s = CLASSES[cls]["sig"]
    total = 0.0
    for f, val in zip("tebv", s):
        lv = LEVELS[f]
        total += WEIGHTS[f] * lv.index(val) / (len(lv) - 1)
    return total

def floor_rule(cls, ctx):
    t, e, b, v = CLASSES[cls]["sig"]
    ie = LEVELS["e"].index
    hit = []                                   # disjunctive: every rule that fires is reported
    if t == "public" and v != "full": hit.append("F1 public and not cleanly undoable")
    if t == "prospect" and ie(e) >= ie("communicate") and not (ctx.get("prior_contact") or cls in INBOUND):
        hit.append("F2 unsolicited contact")   # replying to someone who wrote first is not unsolicited
    if b == "everyone": hit.append("F3 unbounded reach")
    if e == "delete" and v == "none": hit.append("F4 permanent destruction")
    return " + ".join(hit) or None

def guardrail(cited, allowed):
    """Must cite something, and every cited fact must belong to this counterparty or the business."""
    cited = set(cited or [])
    if not cited: return "cites no facts"
    leaked = cited - set(allowed)
    if leaked: return f"cites facts outside this client/business: {sorted(leaked)}"
    return None

# ---- content guardrail: an outward message may state no price and no date that a cited fact does not record
_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
_M = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec"
MONEY_RE = re.compile(r"(?:pkr|rs\.?|usd|\$|€|£)\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:pkr|usd|rupees|dollars)\b", re.I)
DATE_RE = re.compile(rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{_M})[a-z]*\b|\b(?:{_M})[a-z]*\s+\d{{1,2}}(?:st|nd|rd|th)?\b|\b\d{{4}}-\d{{2}}-\d{{2}}\b|\b\d{{1,2}}/\d{{1,2}}/\d{{2,4}}\b", re.I)

def _norm(s):
    s = s.lower()
    for full in _MONTHS: s = s.replace(full, full[:3])
    s = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", s)
    return re.sub(r"[\s,.]", "", s).replace("rs", "pkr").replace("rupees", "pkr")

def content_guardrail(text, cited_texts):
    """FYP guardrail: may state no price or date that is not already stored. Every money amount and explicit date in the
    message must appear in one of the facts the proposal cites. Returns a reason string, or None."""
    stored = _norm(" ".join(cited_texts or []))
    found = [m.group(0).strip() for rx in (MONEY_RE, DATE_RE) for m in rx.finditer(text or "")]
    bad = sorted({f for f in found if _norm(f) not in stored})
    return f"states {', '.join(bad[:3])}, which no cited fact records" if bad else None

def wilson(k, m, z=Z):
    if m == 0: return 0.0
    p = k / m
    d = 1 + z * z / m
    c = p + z * z / (2 * m)
    r = z * math.sqrt(p * (1 - p) / m + z * z / (4 * m * m))
    return (c - r) / d

def tau(R): return TAU_MIN + (TAU_MAX - TAU_MIN) * R ** GAMMA
def n_min(R): return math.ceil(Z * Z * tau(R) / (1 - tau(R)))

class Pair:
    """Evidence for one (agent, class). Nothing transfers between pairs. Decisions and outcomes are windowed separately so a
    burst of one can never push the other out of the window."""
    def __init__(self, window=WINDOW):
        self.dec = deque(maxlen=window)        # owner decisions: a | rp | rq
        self.out = deque(maxlen=window)        # verified outcomes: ok | fail
        self.granted = False
    def counts(self): return _counts(self.dec, self.out)
    def measures(self): return _measures(self.dec, self.out)

def _counts(dec, out):
    c = {"a": 0, "rp": 0, "rq": 0, "ok": 0, "fail": 0}
    for k in dec: c[k] += 1
    for k in out: c[k] += 1
    return c

def _measures(dec, out):
    c = _counts(dec, out)
    n = c["ok"] + c["fail"]
    return {
        "W": wilson(c["ok"], n), "nW": n,                                    # outcome competence
        "A": wilson(c["a"] + c["rp"], c["a"] + c["rp"] + c["rq"]),           # appropriateness
        "D": wilson(c["a"], c["a"] + c["rp"]),                               # delegation willingness
        "counts": c,
    }

def _clears(dec, out, R, granted):
    m, th = _measures(dec, out), tau(R) - (DEAD_BAND if granted else 0)
    return m["nW"] >= n_min(R) and min(m["W"], m["A"], m["D"]) >= th

class Gate:
    def __init__(self, window=WINDOW, seed=None):
        self.pairs, self.window, self.rng = {}, window, random.Random(seed)
    def pair(self, agent, cls):
        return self.pairs.setdefault((agent, cls), Pair(self.window))

    def evaluate(self, agent, cls):
        """Returns (earned, why, measures). Conjunction on purpose, no blended score."""
        R, p = risk(cls), self.pair(agent, cls)
        m, th = p.measures(), tau(R)
        if m["nW"] < n_min(R):
            return False, f"needs {n_min(R)} verified outcomes, has {m['nW']}", m
        fails = [k for k in "WAD" if m[k] < th - (DEAD_BAND if p.granted else 0)]
        if not fails: return True, "all three measures clear threshold", m
        why = {"W": "agent executes unreliably", "A": "owner keeps judging its proposals unsuitable",
               "D": "agent is sound but owner prefers to do this personally"}
        return False, "; ".join(why[k] for k in fails), m

    def decide(self, agent, cls, cited_facts, allowed_facts, ctx=None):
        ctx = ctx or {}
        R = risk(cls)
        g = guardrail(cited_facts, allowed_facts)
        if g: return {"route": "refuse", "risk": R, "why": g}          # touches no counter
        f = floor_rule(cls, ctx)
        if f: return {"route": "escalate", "risk": R, "why": f}        # never earnable
        p = self.pair(agent, cls)
        earned, why, m = self.evaluate(agent, cls)
        p.granted = earned
        base = {"risk": R, "tau": tau(R), "why": why,
                "W": m["W"], "A": m["A"], "D": m["D"], "nW": m["nW"]}
        if not earned: return {"route": "approval", **base}
        if ctx.get("uncertain"):                                        # escalate when unsure: earned or not, an unsure agent asks
            return {"route": "approval", **base, "why": f"earned, but the agent is unsure: {ctx['uncertain']}"}
        if self.rng.random() < AUDIT_RATE:                              # keeps A and D observable
            return {"route": "approval", **base, "why": "audit sample of a promoted class"}
        v = CLASSES[cls]["sig"][3]
        return {"route": "auto" if v == "full" else "recall", **base}

    def steps_to_earn(self, agent, cls, extra=(), cap=60):
        """How many more clean runs (an owner approval plus a verified outcome) until all three measures clear tau, after the
        hypothetical events in `extra` (("dec", "a"|"rp"|"rq") or ("out", "ok"|"fail")). 0 = earned. None = not within `cap`
        runs, or never (a floor rule). Simulated on copies of the windows, so window eviction is exact. Changes nothing."""
        if floor_rule(cls, {}): return None
        R, p = risk(cls), self.pair(agent, cls)
        dec, out = deque(p.dec, maxlen=self.window), deque(p.out, maxlen=self.window)
        for kind, v in extra: (dec if kind == "dec" else out).append(v)
        for k in range(cap + 1):
            if _clears(dec, out, R, p.granted): return k
            dec.append("a"); out.append("ok")
        return None

    def what_if(self, agent, cls):
        """Runs to go now, and after each answer the owner could give to the action in front of them."""
        return {"now": self.steps_to_earn(agent, cls),
                "approve": self.steps_to_earn(agent, cls, [("dec", "a"), ("out", "ok")]),
                "preference": self.steps_to_earn(agent, cls, [("dec", "rp")]),
                "quality": self.steps_to_earn(agent, cls, [("dec", "rq")])}

    def record_decision(self, agent, cls, kind):
        """kind: approve | preference (sound, but I'd rather do it) | quality (content/timing wrong)"""
        self.pair(agent, cls).dec.append({"approve": "a", "preference": "rp", "quality": "rq"}[kind])
    def record_outcome(self, agent, cls, success):
        self.pair(agent, cls).out.append("ok" if success else "fail")

    def dump(self):
        return {f"{a}|{c}": {"dec": list(p.dec), "out": list(p.out), "granted": p.granted} for (a, c), p in self.pairs.items()}
    def load(self, d):
        self.pairs.clear()
        for k, v in (d or {}).items():
            a, c = k.split("|", 1)
            if c not in CLASSES: continue                                 # a class removed from the catalogue: its evidence is dropped
            p = self.pair(a, c)
            rec = v.get("rec")                                            # older single-window format
            p.dec.extend(v.get("dec", [x for x in rec or [] if x in ("a", "rp", "rq")]))
            p.out.extend(v.get("out", [x for x in rec or [] if x in ("ok", "fail")]))
            p.granted = bool(v.get("granted"))
