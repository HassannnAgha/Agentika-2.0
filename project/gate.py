"""Risk-Trust Gate: hackathon slice of Bizzii. Deterministic, no LLM in routing.
Agents propose, the gate decides. Same proposal + same evidence = same route."""
import math, random, json
from collections import deque

Z = 1.645                       # 95% one-sided Wilson
TAU_MIN, TAU_MAX, GAMMA = 0.60, 0.90, 1.0
DEAD_BAND = 0.05                # demotion only below tau - DEAD_BAND
AUDIT_RATE = 0.10               # promoted classes still sampled to owner
WINDOW = 30                     # last L records per (agent, class)

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
    """Evidence for one (agent, class). Nothing transfers between pairs."""
    def __init__(self, window=WINDOW):
        self.rec = deque(maxlen=window)
        self.granted = False
    def counts(self):
        c = {"a": 0, "rp": 0, "rq": 0, "ok": 0, "fail": 0}
        for k in self.rec: c[k] += 1
        return c
    def measures(self):
        c = self.counts()
        n = c["ok"] + c["fail"]
        return {
            "W": wilson(c["ok"], n), "nW": n,                                    # outcome competence
            "A": wilson(c["a"] + c["rp"], c["a"] + c["rp"] + c["rq"]),           # appropriateness
            "D": wilson(c["a"], c["a"] + c["rp"]),                               # delegation willingness
            "counts": c,
        }

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
        if self.rng.random() < AUDIT_RATE:                              # keeps A and D observable
            return {"route": "approval", **base, "why": "audit sample of a promoted class"}
        v = CLASSES[cls]["sig"][3]
        return {"route": "auto" if v == "full" else "recall", **base}

    def record_decision(self, agent, cls, kind):
        """kind: approve | preference (sound, but I'd rather do it) | quality (content/timing wrong)"""
        self.pair(agent, cls).rec.append({"approve": "a", "preference": "rp", "quality": "rq"}[kind])
    def record_outcome(self, agent, cls, success):
        self.pair(agent, cls).rec.append("ok" if success else "fail")

    def dump(self):
        return {f"{a}|{c}": {"rec": list(p.rec), "granted": p.granted} for (a, c), p in self.pairs.items()}
    def load(self, d):
        for k, v in d.items():
            a, c = k.split("|"); p = self.pair(a, c)
            p.rec.extend(v["rec"]); p.granted = v["granted"]
