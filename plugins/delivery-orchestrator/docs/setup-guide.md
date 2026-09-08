---
name: Setup Guide
description: Step-by-step setup guide for linear-orchestrator including Linear, Harness, and Microsoft Planner configuration
---

# Setup Guide

## Prerequisites

- Linear workspace + admin access
- Harness account + API token (for Harness Code two-way sync)
- Azure tenant with admin consent for `Tasks.ReadWrite.All` (for MS Planner two-way sync)
- Node.js 20+, pnpm

## Step 1 — Install the plugin

```bash
# In your Claude Code marketplace
/plugin install linear-orchestrator
```

## Step 2 — Configure Linear authentication

```bash
/linear:setup --mode oauth
```

Follow the prompts to:
1. Register an OAuth application at https://linear.app/settings/api/applications
2. Set redirect URI to your deployment's `/oauth/callback` endpoint
3. Capture client ID + secret in environment variables

Alternative for service-account use:
```bash
/linear:setup --mode apikey
```

## Step 3 — Install the Linear MCP server (optional)

```bash
/linear:mcp --install
```

This adds `@linear/mcp` to `.mcp.json` for direct tool access from Claude Code.

## Step 4 — Register webhooks

```bash
/linear:webhook --register --url https://your-app.example.com/linear/webhook
```

The plugin will:
- Generate a fresh `LINEAR_WEBHOOK_SECRET`
- Subscribe to relevant resource types
- Verify signature on first delivery before declaring success

## Step 5 — Configure Harness Code two-way sync

```bash
/linear:setup --mode bridges --harness
```

Inputs:
- `HARNESS_API_TOKEN` — from Account Settings → API Keys
- `HARNESS_ACCOUNT_ID`
- (optional) `HARNESS_ORG_ID`, `HARNESS_PROJECT_ID` for scope narrowing

Then enable specific repos:
```bash
/linear:sync enable --org <org> --project <project> --repo my-service
```

If you want full Git Experience integration:
```bash
/linear:harness-git enable --account <id> --org <id> --project <id>
/linear:harness-git bidir --enable
/linear:harness-git sign --enable --keys add <gpg-key>
```

## Step 6 — Configure Microsoft Planner two-way sync

```bash
/linear:setup --mode bridges --planner
```

Inputs:
- `GRAPH_TENANT_ID`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`

Required app permissions (admin consent):
- `Tasks.ReadWrite.All`
- `Group.Read.All`
- `User.Read.All`
- `Files.ReadWrite.All` (for attachment mirror)

Then bind a plan:
```bash
/linear:planner-sync enable --plan-id <plan-id>
```

## Step 7 — Smoke test

```bash
# Should return your viewer
/linear:query 'query { viewer { name email } }'

# Should list teams
/linear:team list

# Should return current cycle for ENG
/linear:cycle current --team ENG

# Should show bridge health
/linear:sync status
/linear:planner-sync status
```

## Step 8 — Daily operations

| Task | Command |
|------|---------|
| Plan next cycle | `/linear:cycle plan --team ENG` |
| Triage queue review | `/linear:triage list` |
| File a customer request | `/linear:customer create-request --customer Acme --body "..."` |
| Reconcile bridges | `/linear:sync reconcile` + `/linear:planner-sync reconcile` |
| Replay failed webhooks | `/linear:webhook replay --since 24h` |
| Check SLA breaches | `/linear:sla breaches` |

## Troubleshooting

### Webhook signature failures
Check that `LINEAR_WEBHOOK_SECRET` matches the value Linear provided. Rotate if unsure: `/linear:webhook unregister <id>` then `/linear:webhook --register`.

### Harness 401
Token expired or wrong account. Re-run `/linear:setup --mode bridges --harness`.

### Graph 403 on Planner reads
Admin consent missing for `Tasks.ReadWrite.All`. Have a tenant admin approve the app.

### DLQ filling up
Run `/linear:webhook dlq` to inspect; common causes: downstream service down, mapping config wrong, idempotency table corrupt. Replay with `/linear:webhook replay`.
