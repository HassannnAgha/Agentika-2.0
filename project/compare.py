"""The closer. Three (agent, owner) pairs with the same EXPECTED approval rate (0.7225) for very different reasons. The
sampled rates land within a few points of each other, not identical. A pooled-approval gate cannot tell the pairs apart.
This gate keeps competence and consent separate, so it can. Runs the real Gate on simulated decisions with fixed seeds,
so the result is reproducible. It is a simulation, not owner data."""
import random
from gate import Gate, wilson, tau, risk

CLS, AGENT, N = "reply_to_client", "operations", 200
PAIRS = [("Sound agent, reluctant owner", 0.85, 0.15),
         ("Mediocre agent, willing owner", 0.7225, 0.0),
         ("Flawless agent, owner prefers own work", 1.0, 0.2775)]

def run(n: int = N, outcome_ok: float = 0.97) -> list:
    out = []
    for name, p, q in PAIRS:           # p: share of proposals that are appropriate. q: share of those the owner would rather do themselves
        g, r = Gate(window=n, seed=1), random.Random(7)
        approved = 0
        for _ in range(n):
            if r.random() < p:
                if r.random() < q: g.record_decision(AGENT, CLS, "preference")
                else:
                    g.record_decision(AGENT, CLS, "approve"); approved += 1
                    g.record_outcome(AGENT, CLS, r.random() < outcome_ok)
            else: g.record_decision(AGENT, CLS, "quality")
        ok, why, m = g.evaluate(AGENT, CLS)
        out.append({"pair": name, "p_appropriate": p, "q_prefers_own": q, "decisions": n, "approval_rate": round(approved / n, 3),
                    "W": round(m["W"], 2), "A": round(m["A"], 2), "D": round(m["D"], 2), "threshold": round(tau(risk(CLS)), 2),
                    "pooled_gate": "promoted" if wilson(approved, n) >= tau(risk(CLS)) else "blocked",
                    "risk_trust_gate": "promoted" if ok else "blocked", "diagnosis": why})
    return out
