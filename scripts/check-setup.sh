#!/usr/bin/env bash
# Quick readiness check for Agentika 2.0. Safe: it only reads versions and pings a URL.
ok(){ printf "  \033[32m✔\033[0m %s\n" "$1"; }
no(){ printf "  \033[31m✘\033[0m %s\n" "$1"; BAD=1; }
BAD=0
echo "Tools"
command -v python3 >/dev/null && ok "python3 $(python3 --version 2>&1 | cut -d' ' -f2)" || no "python3 missing"
command -v node    >/dev/null && ok "node $(node --version)" || no "node missing (needed for npx mcp-remote)"
command -v npx     >/dev/null && ok "npx present" || no "npx missing"
command -v git     >/dev/null && ok "git $(git --version | cut -d' ' -f3)" || no "git missing"
echo "Network"
code=$(curl -s -o /dev/null -m 10 -w "%{http_code}" https://mcp.live.fastn.ai/shttp 2>/dev/null)
if [ -n "$code" ] && [ "$code" != "000" ]; then ok "fastn MCP endpoint reachable (HTTP $code; 401/406 is normal without a client)"; else no "can't reach https://mcp.live.fastn.ai/shttp (check Wi-Fi)"; fi
curl -s -o /dev/null -m 10 -w "" https://app.fastn.ai && ok "app.fastn.ai reachable" || no "can't reach app.fastn.ai"
echo "Config"
[ -f "$(dirname "$0")/../.mcp.json" ] && ok ".mcp.json present (Claude Code)" || no ".mcp.json missing"
echo
[ $BAD -eq 0 ] && echo "All good. Now do docs/00-TONIGHT-CHECKLIST.md" || echo "Fix the ✘ items above."
