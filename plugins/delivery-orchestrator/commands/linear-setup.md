---
name: linear:setup
intent: Configure the plugin end to end — Linear auth, the remote MCP server, webhooks, and the GitHub or Harness Code bridge
tags:
  - linear-orchestrator
  - command
  - setup
  - auth
  - oauth
inputs:
  - mode
risk: medium
cost: low
description: One-shot Linear setup covering auth, MCP, webhooks, and the VCS bridge for GitHub or Harness Code
---

# /linear:setup

Configures the plugin end to end. Idempotent — re-runnable.

## Modes

### `--mode apikey`
For service accounts and unattended bridges.

- Prompts for `LINEAR_API_KEY` (Settings → Security & access → New API key)
- Validates with `query { viewer { id name email } }`
- Budget: 2,500 requests/hr + 3,000,000 complexity/hr

The key is sent **verbatim** in the `Authorization` header. Prefixing it with
`Bearer ` is a 401 — a common and confusing failure.

### `--mode oauth`
Required for anything that should appear as an agent.

- Registers an OAuth app at https://linear.app/settings/api/applications
- Sets `LINEAR_OAUTH_CLIENT_ID` and `LINEAR_OAUTH_CLIENT_SECRET`
- Scopes: `read`, `write`, `app:assignable`, `app:mentionable`
- Uses `actor=app` so writes are attributed to the app user
- Sends and verifies `state` for CSRF protection
- Budget: 5,000 requests/hr + 2,000,000 complexity/hr

`app:assignable` is what lets users **delegate** issues to the agent;
`app:mentionable` is what lets them @mention it. There is no `agents:create` or
`agents:signal` scope — see `CHANGELOG.md`.

### `--mode mcp`
Connects Linear's official **remote** MCP server.

```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

Then run `/mcp` in a session to complete OAuth. For read-only, use
`https://mcp.linear.app/mcp/readonly` or request only the `read` scope.

There is no local stdio server; `/sse` is deprecated. See `commands/mcp.md`.

### `--mode webhook`
- Generates `LINEAR_WEBHOOK_SECRET`
- Registers the webhook via the `webhookCreate` mutation
- Subscribes to the narrowest useful set: `Issue`, `Comment`, `IssueLabel`,
  `Cycle`, `Project`, `ProjectUpdate`, `Initiative`, `AgentSessionEvent`
- Returns the webhook id and verification status

Subscribe narrowly. Every extra resource type is delivery volume you must
verify, dedupe and then ignore.

### `--mode vcs`
Wires the git host.

```
/linear:setup --mode vcs --provider github    # GITHUB_TOKEN, GITHUB_OWNER
/linear:setup --mode vcs --provider harness   # HARNESS_API_TOKEN, HARNESS_ACCOUNT_ID
```

Sets `LINEAR_VCS_PROVIDER`, optionally `HARNESS_ORG_ID` / `HARNESS_PROJECT_ID`,
and tests each with a read call before storing.

If you are on GitHub and want Linear Diffs, also grant the GitHub integration
**code access** and enable Settings → Code & reviews → *Enable code reviews*.
Diffs do not work with Harness Code.

### `--mode swarm`
Prepares the conductor: `workspaceRoot` (must be outside the repo checkout),
`baseRef`, `concurrency`, and the issue filter. Runs a dry dispatch to show
which issues would be claimed without starting workers.

### `--mode verify`
Health check. Probes auth, introspects the schema to confirm
`agentActivityCreate` exists, checks webhook reachability, and validates VCS
credentials. Reports rather than throws.

### `--mode all` (default)
Runs the above in order, with confirmations.

## Outputs
- `setup-report.json` summarising what was configured and what failed
- A short markdown summary printed to the user

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Linear 401 | API key sent with a `Bearer ` prefix | Send the key verbatim |
| Linear 400 `RATELIMITED` | Over budget | Back off to the reset header; this is retried automatically |
| Webhook create 403 | OAuth token lacks `admin` | Re-authorize with `admin`, or register in the UI |
| Every delivery fails verification | Signature checked against a re-serialised body, or a `sha256=` prefix assumed | Verify bare hex against the raw body |
| Sessions marked `stale` | Nothing emitted within 10s of session creation | Emit a `thought` before slow setup work |
| GitHub 404 on a repo you can see | Token lacks scope; GitHub 404s rather than 403s | Re-scope the token |
| Harness 401 | Wrong account identifier, or expired key | Check `HARNESS_ACCOUNT_ID` |

Bridges are optional. Missing VCS credentials degrade to Linear-only mode with
a warning — the plugin never silently skips writes.
