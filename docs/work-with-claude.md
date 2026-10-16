# Working with Claude during the hackathon

## Setup (once, 5 minutes)
1. In the Claude desktop app → Code tab → **new session**, working folder = `~/projects/agentika-2.0`.
   (MCP servers load when a session *starts*, so a session opened elsewhere won't see fastn.)
2. The folder's `.mcp.json` points at fastn's hosted MCP server. Approve it when asked.
3. **You** sign in: run `/mcp` → fastn → Authenticate. A browser window opens; log in with your fastn account. (Claude never types your password.)
4. Test: ask *"List my fastn connectors"*. If it answers, Claude can now use fastn tools directly.

## Which fastn address?
- `https://app.fastn.ai`  + MCP `https://mcp.live.fastn.ai/shttp` is what fastn's official README documents (`.mcp.json` uses this).
- `https://app.fastn.dev` also exists. **Use whichever the workshop tells you.** If it's `.dev`:
  `cp mcp-config/claude-code.dev.mcp.json .mcp.json` (MCP host `mcp.fastn.dev`, **unverified**: confirm in the workshop).
- Your account and connectors exist **per environment**: sign up on the one you'll actually use.

## What to ask Claude (once connected)
- "Find a fastn tool that <does X>, show me its inputs."
- "Run it with these parameters and show me the result."
- "Design a 3-step pipeline for <idea> using my connected apps; list tools per step."
- "Write the pitch (problem / pipeline / how fastn MCP + agents are used)."
- "Turn this into the 4 submission items" (description, demo script, pipeline explanation).

## What Claude can't do
- Enter your passwords or complete CAPTCHAs / "verify you are human"
- Pay the fee, register, or accept terms for you
- Decide the idea for you: mentors must approve *your* pitch
