"""Bizzii as an MCP server: the Risk-Trust Gate as a trust layer any AI agent can run through.

Claude Desktop, Claude Code, Cursor, n8n or any MCP client connects to /mcp and proposes actions instead of taking them. Each
proposal is routed by the same gate as Bizzii's own agents: refused by a guardrail, held by a floor rule, sent to the owner, held in
a recall window, or carried out once the agent has earned it.

Two rules make this safe to expose:
  - An outside agent's evidence is its own. It is recorded as "mcp:<name>", so it can never borrow the trust Bizzii's own agents
    have earned, and it starts at zero like any newcomer.
  - There is no tool to approve, decline or reset. Decisions come only from the owner (the dashboard or the approval link sent to them).
"""
from mcp.server.mcpserver import MCPServer

INSTRUCTIONS = (
    "Bizzii is a Risk-Trust Gate for a small business. Do not act on the business's behalf directly: propose actions with "
    "propose_action and the gate decides how much the owner needs to be involved. Always call get_facts first and cite the ids of the "
    "facts your action relies on; a proposal citing nothing, or citing another client's facts, is refused. You cannot approve your own "
    "proposals: only the owner can. Check the outcome with check_action. Your trust is your own and starts at zero."
)

def build(srv):
    """srv is the server module (its gate, store and _propose), passed in to avoid a circular import."""
    mcp = MCPServer(name="bizzii-trust-gate", title="Bizzii Risk-Trust Gate", instructions=INSTRUCTIONS, version="1.0")
    S, G = srv.STORE, srv.G

    def _agent(name: str) -> str:
        name = "".join(ch for ch in (name or "external").strip().lower() if ch.isalnum() or ch in "-_.")[:40] or "external"
        return name if name.startswith("mcp:") else f"mcp:{name}"

    @mcp.tool(description="The business this gate protects, whether it is set up, which of its agents are active, and how many actions are waiting on the owner.")
    def bizzii_status() -> dict:
        st = srv.state()
        return {"business": st["business"], "set_up": st["onboarded"], "mode": st["mode"], "agents_active": {k: v["active"] for k, v in st["agents"].items()},
                "waiting_on_owner": len(st["pending"]), "email": "test mode" if not st["email"]["live"] else "live"}

    @mcp.tool(description="Every kind of action the gate knows: its risk, how many verified outcomes it needs before it can run alone, and the best route it can ever reach (escalation means it always needs the owner).")
    def list_action_types() -> dict:
        return {"action_types": [{"action_type": c["cls"], "label": c["label"], "owner_agent": c["agent"], "risk": c["risk"], "needs_outcomes": c["n_min"], "best_route": c["ceiling"]}
                for c in srv.catalogue_view()]}

    @mcp.tool(description="The recorded facts an action about this counterparty may cite: its own facts plus the business's. counterparty is a client id (e.g. cl-1), a lead id, or 'business'.")
    def get_facts(counterparty: str) -> dict:
        return {"counterparty": counterparty, "facts": [{"id": i, "about": x["owner"], "fact": x["text"]} for i, x in S.facts.items() if x["owner"] in (counterparty, "business")]}

    @mcp.tool(description="List the business's clients and team, to find the counterparty id and the recorded addresses.")
    def list_records() -> dict:
        return {"clients": [{"id": c["id"], "name": c["name"], "status": c.get("status"), "contact": c["contact"]} for c in S.clients()],
                "team": [{"name": m["name"], "role": m.get("role"), "email": m.get("email")} for m in S.team()]}

    @mcp.tool(description="Propose an action. The gate returns the route (refuse, escalate, approval, recall, auto) and why. For an email, payload is {to, subject, body}; the recipient must be on record and the message may state no price or date that a cited fact does not record.")
    def propose_action(agent_name: str, action_type: str, counterparty: str, cited_fact_ids: list[int], payload: dict, prior_contact: bool = False) -> dict:
        if action_type not in srv.CLASSES:
            return {"error": f"unknown action_type; call list_action_types", "route": "refuse"}
        a = srv._propose(srv.Proposal(agent=_agent(agent_name), cls=action_type, counterparty=counterparty, cited=list(cited_fact_ids or []),
                                      payload=payload or {}, prior_contact=prior_contact))
        d = a["decision"]
        return {"action_id": a["id"], "route": d["route"], "why": d["why"], "status": a["status"], "risk": round(d["risk"], 2),
                "as_agent": a["agent"], "note": "The owner decides; poll check_action for the outcome." if a["status"] in ("awaiting", "recall") else ""}

    @mcp.tool(description="Where a proposed action stands: waiting, in its recall window, done (with whether its outcome was verified), declined, refused or expired.")
    def check_action(action_id: int) -> dict:
        a = srv.PENDING.get(int(action_id))
        if not a: return {"error": "unknown action_id"}
        return {"action_id": a["id"], "status": a["status"], "route": a["decision"]["route"], "why": a["decision"]["why"],
                "verified": a.get("verified"), "label": a["label"], "who": a["who"]}

    @mcp.tool(description="Actions waiting on the owner right now (read only: only the owner can decide them).")
    def list_waiting() -> dict:
        return {"waiting": [{"action_id": a["id"], "label": a["label"], "who": a["who"], "agent": a["agent"], "route": a["decision"]["route"], "why": a["decision"]["why"]}
                for a in srv.PENDING.values() if a.get("status") in ("awaiting", "recall")]}

    @mcp.tool(description="An agent's track record per kind of action: competence (W), appropriateness (A), delegation willingness (D) against the threshold, and whether it has earned the right to act alone. Pass your own agent_name to see your record.")
    def trust_record(agent_name: str) -> dict:
        ag = agent_name if agent_name in srv.AGENT_NAMES else _agent(agent_name)
        out = []
        for (a, cls), _ in list(srv.gate.pairs.items()):
            if a != ag: continue
            ok, why, m = srv.gate.evaluate(a, cls); R = G.risk(cls)
            out.append({"action_type": cls, "earned": ok, "why": why, "W": round(m["W"], 3), "A": round(m["A"], 3), "D": round(m["D"], 3),
                        "threshold": round(G.tau(R), 3), "verified_outcomes": m["nW"], "needs": G.n_min(R)})
        return {"agent": ag, "record": out, "note": "" if out else "no record yet: every action starts by asking the owner"}

    return mcp
