# fastn MCP: quickstart (condensed)

Source: the official repo README (https://github.com/fastnai/mcp-fastn) and https://app.fastn.ai.
Re-check there if something differs; the workshop may add specifics.

## What it is
A hosted **MCP gateway**: one endpoint that gives AI agents access to **250+ connectors**
(Slack, Jira, GitHub, Salesforce, HubSpot, Postgres, Stripe, Notion, Linear, Gmail...), with auth handled for you.

> **Connectors** provide tools. **Flows** compose tools. **Agents** run flows and tools with reasoning.

## Fastest path (no install)
1. Sign up at https://app.fastn.ai and connect a connector.
2. Point your MCP client at: `https://mcp.live.fastn.ai/shttp`
3. Sign in via the OAuth 2.1 prompt.

## Endpoints
| Endpoint | Gives you |
|---|---|
| `/shttp` | All 11 tools (find/execute tools + flows) |
| `/shttp/tools` | 5 tools: `find_tools`, `execute_tool`, `list_connectors`, `list_skills`, `list_projects` (**recommended for Cursor**) |
| `/shttp/tools/{project_id}` | 4 tools, pre-scoped to one project |
| `/shttp/tools/{project_id}/{skill_id}` | 3 tools, pre-scoped to project + skill |

## The tools
| Tool | Use |
|---|---|
| `list_connectors` | Browse all connectors, including not-yet-connected ones |
| `find_tools` | Natural-language search for a tool (returns IDs + input schema) |
| `execute_tool` | Run a tool by ID with parameters |
| `list_skills`, `list_projects` | Discover skills / projects |
| `list_flows`, `run_flow`, `delete_flow` | Manage saved automations |
| `create_flow`, `update_flow` | *Marked "under development"*; don't depend on them |

**Typical loop:** `find_tools` -> `execute_tool`. If nothing relevant comes back -> `list_connectors` (the connector may need connecting in app.fastn.ai).

## Auth options
1. **MCP OAuth 2.1** (recommended): only the URL; the client prompts you.
2. **Token / API key**: header `Authorization: Bearer <token>`, optional `x-project-id`.
   **Never commit tokens.** Keep them in `.env` (git-ignored).

## Gotchas
- `pip install fastn-mcp-server` (self-hosting) is **not on PyPI** as of Oct 15 2026. Use the hosted URL.
- The hosted server needs internet. Have a hotspot ready.
- Don't build around `create_flow` / `update_flow` yet.
