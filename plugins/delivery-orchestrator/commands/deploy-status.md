---
name: deploy:status
intent: Check deployment pipeline status
tags:
  - deployment-pipeline
  - command
  - status
inputs: []
risk: medium
cost: medium
description: Check deployment pipeline status
allowed-tools:
  - Read
  - Grep
---

# Deploy Status

Check the status of a deployment pipeline.

## Usage

```bash
/deploy:status [deployment-id]
/deploy:status --all
/deploy:status --active
```

## Arguments

| Argument | Description |
|----------|-------------|
| `deployment-id` | Specific deployment ID to check |
| `--all` | Show all deployments |
| `--active` | Show only active (non-terminal) deployments |

## Examples

```bash
# Check specific deployment
/deploy:status deploy-1705123456789-abc123def

# Show all active deployments
/deploy:status --active

# Show all deployments
/deploy:status --all
```

## Output: Single Deployment

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Deployment Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deployment ID:  deploy-1705123456789-abc123def
Repository:     my-service
Branch:         main
Commit:         a1b2c3d4

Current State:  awaiting-approval
Started At:     2025-01-13 10:30:45
Updated At:     2025-01-13 10:45:22
Duration:       14m 37s

State Flow:
  ✓ pending           10:30:45
  ✓ validating        10:30:46  (1s)
  ✓ building          10:32:15  (1m 29s)
  ✓ testing           10:38:42  (6m 27s)
  ✓ deploying-dev     10:40:18  (1m 36s)
  ✓ deploying-staging 10:44:55  (4m 37s)
  → awaiting-approval 10:45:22  (waiting...)
  ○ deploying-prod
  ○ completed

Available Actions:
  • /deploy:approve deploy-1705123456789-abc123def
  • /deploy:rollback deploy-1705123456789-abc123def

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Output: Active Deployments

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Active Deployments
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID                              Repository      Branch    State              Duration
────────────────────────────────────────────────────────────────────────────────────
deploy-1705123456789-abc123def  my-service      main      awaiting-approval  14m 37s
deploy-1705123456123-xyz789abc  api-gateway     develop   building           2m 15s

Total: 2 active deployments

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## State Indicators

| Icon | Meaning |
|------|---------|
| ✓ | Completed successfully |
| → | Current state (in progress) |
| ○ | Pending (not yet reached) |
| ✗ | Failed |
| ↺ | Rolled back |

## See Also

- `/deploy:start` - Start new deployment
- `/deploy:approve` - Approve for production
- `/deploy:history` - View deployment history
