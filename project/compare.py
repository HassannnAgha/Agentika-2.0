"""The closer. Three (agent, owner) pairs with EXACTLY the same approval rate (82.5%) for very different reasons.
A pooled-approval gate sees one number and treats all three the same. This gate keeps competence and consent separate.

Counts are exact, not sampled, so the comparison is deterministic and the approval rates are identical by construction.
It runs the real Gate on recorded decisions. It is an illustration, not owner data."""
from gate import Gate, wilson, tau, risk

CLS, AGENT, N = "reply_to_client", "operations", 200
APPROVE = 0.825          # share of proposals approved, identical for all three pairs
FAIL = 0.03              # share of approved actions whose outcome check failed
# name, share refused as "I'd rather do it myself" (rp); the rest of the refusals are "wrong" (rq)
PAIRS = [("Sound agent, mildly reluctant owner", 0.05),
         ("Mediocre agent, willing owner", 0.0),
         ("Flawless agent, owner prefers own work", 1 - APPROVE)]

def run(n: int = N) -> list:
    out = []
    a = round(APPROVE * n)
    for name, rp_share in PAIRS:
        rp = round(rp_share * n); rq = n - a - rp
        g = Gate(window=n, seed=1)
        for _ in range(a): g.record_decision(AGENT, CLS, "approve")
        for _ in range(rp): g.record_decision(AGENT, CLS, "preference")
        for _ in range(rq): g.record_decision(AGENT, CLS, "quality")
        fails = round(FAIL * a)
        for i in range(a): g.record_outcome(AGENT, CLS, i >= fails)
        ok, why, m = g.evaluate(AGENT, CLS)
        out.append({"pair": name, "decisions": n, "approved": a, "prefer_own": rp, "wrong": rq, "approval_rate": round(a / n, 3),
                    "p_appropriate": round((a + rp) / n, 3), "q_prefers_own": round(rp / (a + rp), 3) if a + rp else 0.0,
                    "W": round(m["W"], 2), "A": round(m["A"], 2), "D": round(m["D"], 2), "threshold": round(tau(risk(CLS)), 2),
                    "pooled_gate": "promoted" if wilson(a, n) >= tau(risk(CLS)) else "blocked",
                    "risk_trust_gate": "promoted" if ok else "blocked", "diagnosis": why})
    return out
