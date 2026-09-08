---
name: linear:mcp
intent: Connect and operate Linear's official remote MCP server, and decide when to route through it versus this plugin's own client
tags:
  - linear-orchestrator
  - command
  - mcp
inputs:
  - action
risk: low
cost: low
description: Linear MCP server at https://mcp.linear.app/mcp (https://linear.app/docs/mcp)
---

# /linear:mcp

Linear publishes an official **remote** MCP server. This command wires it up and
routes work between it and the plugin's own GraphQL client.

> **Corrected in 2.0.0.** The 1.0.0 version told you to add a local stdio server
> via `npx -y @linear/mcp` with a `LINEAR_API_KEY` env var. That is not how the
> Linear MCP works and the package it names is not the server. Linear's MCP is
> centrally hosted and speaks Streamable HTTP.

## Connection

| | |
|---|---|
| Endpoint | `https://mcp.linear.app/mcp` |
| Read-only endpoint | `https://mcp.linear.app/mcp/readonly` |
| Transport | Streamable HTTP |
| Auth | OAuth 2.1 with dynamic client registration, or `Authorization: Bearer <token>` |
| Deprecated | `https://mcp.linear.app/sse` — SSE is a legacy fallback; do not use for new setups |

### `install [--scope user|project] [--readonly]`

For Claude Code:

```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

Then run `/mcp` in a session to complete the OAuth flow.

For clients without remote MCP support, bridge with `mcp-remote`:

```json
{
  "mcpServers": {
    "linear": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"] }
  }
}
```

Two ways to get read-only: connect to `/mcp/readonly`, or use `/mcp` and request
only the `read` scope — a token granted `read` cannot reach write APIs either
way. A Linear API key created with only the Read permission achieves the same.

### `tools`
Lists what the server exposes. Current surface spans issues, comments, projects,
initiatives, cycles, milestones, documents, customers and customer needs,
labels, templates, releases and release notes, diffs and diff review threads,
attachments, status updates, notifications, teams, users, agent skills, and a
documentation search.

### `doctor`
Diagnoses the common failures:

| Symptom | Cause | Fix |
|---|---|---|
| Internal server error on connect | Stale cached auth | `rm -rf ~/.mcp-auth`, reconnect |
| Wrong workspace | One OAuth session per workspace | Separate `MCP_REMOTE_CONFIG_DIR` per workspace |
| Connection drops | Client-side reset | Disconnect and reconnect; data is unaffected |
| Fails under WSL | Streamable HTTP unsupported there | Fall back to the `/sse` legacy path |

## Routing: MCP or this plugin's client

| Use the Linear MCP | Use this plugin |
|---|---|
| Interactive CRUD in a session | Webhook-driven bridge (runs outside a session) |
| Ad-hoc questions about the workspace | Bulk operations needing complexity-budget pacing |
| Anything a human is watching | Agent sessions and activities |
| Reading docs (`search_documentation`) | Swarm dispatch and claim management |

Rule of thumb: **if a human is in the loop, prefer the MCP** — it is
better-maintained than any client here and its auth is handled for you. Reach
for `lib/linear-client.mjs` when there is no session to host an MCP connection,
or when you need the rate-limit headers.

Enterprise workspaces can put the MCP behind Okta-managed auth: configure SAML
via Okta's OIN, then enable enterprise-managed authentication in Linear and
paste the Okta issuer URI.

## See also
- `lib/linear-client.mjs`
- `skills/linear-graphql/SKILL.md`
