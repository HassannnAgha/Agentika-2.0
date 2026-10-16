"""Prints the closer: same approval rate, different diagnosis. Run: python demo_sim.py  (the logic lives in compare.py)"""
import compare

for r in compare.run():
    print(f"\n{r['pair']}  (p={r['p_appropriate']}, q={r['q_prefers_own']})")
    print(f"  raw approval rate {r['approval_rate']:.3f} | A={r['A']:.2f} D={r['D']:.2f} W={r['W']:.2f} (threshold {r['threshold']:.2f})")
    print(f"  pooled-approval gate after {r['decisions']} decisions: {r['pooled_gate'].upper()}")
    print(f"  Risk-Trust gate after {r['decisions']} decisions:      {r['risk_trust_gate'].upper()} ({r['diagnosis']})")
