"""What the owner teaches the agents, kept per (agent, kind of action).

  - "Wrong, because ..." and "I'd rather do it myself, because ..." reasons
  - edits the owner made to a draft before approving it (before and after)

Every AI drafting prompt for that agent and kind of action is given this guidance, so a correction made once shapes the next draft.
The gate's evidence is untouched by it: guidance changes what the agent writes, never how the gate routes."""
import time
import persist

KEEP = 10

def _key(agent, cls): return f"{agent}|{cls}"

def add_reason(agent, cls, kind, reason):
    reason = " ".join((reason or "").split())[:300]
    if not reason: return
    g = dict(persist.get("guidance", {}) or {})
    g.setdefault(_key(agent, cls), []).append({"t": time.strftime("%Y-%m-%d %H:%M"), "kind": kind, "reason": reason})
    g[_key(agent, cls)] = g[_key(agent, cls)][-KEEP:]
    persist.put("guidance", g)

def add_edit(agent, cls, before, after):
    if not before or not after or before.strip() == after.strip(): return
    e = dict(persist.get("edits", {}) or {})
    e.setdefault(_key(agent, cls), []).append({"t": time.strftime("%Y-%m-%d %H:%M"), "before": before[:800], "after": after[:800]})
    e[_key(agent, cls)] = e[_key(agent, cls)][-5:]
    persist.put("edits", e)

def reasons(agent, cls): return (persist.get("guidance", {}) or {}).get(_key(agent, cls), [])
def edits(agent, cls): return (persist.get("edits", {}) or {}).get(_key(agent, cls), [])

def guidance(agent, cls) -> str:
    """Text appended to a drafting prompt. Empty when the owner has taught nothing yet."""
    rs, es = reasons(agent, cls), edits(agent, cls)
    if not rs and not es: return ""
    out = ["The business owner has corrected drafts like this before. Follow their guidance:"]
    out += [f"- They said ({r['kind']}): {r['reason']}" for r in rs[-6:]]
    for e in es[-2:]:
        out.append(f"- They rewrote a draft. Before: {e['before'][:300]!r} After: {e['after'][:300]!r}. Write the way they rewrote it.")
    return "\n".join(out)

def summary():
    g, e = persist.get("guidance", {}) or {}, persist.get("edits", {}) or {}
    keys = sorted(set(g) | set(e))
    return [{"agent": k.split("|")[0], "cls": k.split("|")[1], "reasons": g.get(k, []), "edits": len(e.get(k, []))} for k in keys]
