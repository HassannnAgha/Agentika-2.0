# MCP client configs for fastn (no secrets inside)

All use the **hosted** server with OAuth. You'll get a sign-in prompt, so there is no key to store.

| Client | What to do |
|---|---|
| **Claude Code** | Already done: `../.mcp.json` is picked up when you run `claude` in this folder. |
| **Cursor** | Copy `cursor.mcp.json` to `<your project>/.cursor/mcp.json` |
| **Claude Desktop** | Merge `claude-desktop.snippet.json` into `~/.config/Claude/claude_desktop_config.json` (the `mcpServers` key), then restart the app. This uses `npx mcp-remote` as a bridge, since the plain JSON `url` form isn't accepted by every desktop version. In recent versions you can instead add it via Settings -> Connectors / Extensions with the URL `https://mcp.live.fastn.ai/shttp`. |

Using an API key instead? Add `"headers": {"Authorization": "Bearer <token>"}` and keep the token in `.env`, never in git.
