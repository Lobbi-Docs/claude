---
name: deploy:history
intent: View deployment history
tags:
  - deployment-pipeline
  - command
  - history
inputs: []
risk: medium
cost: medium
description: View deployment history
allowed-tools:
  - Read
  - Grep
---

# Deploy History

View deployment history and audit trail.

## Usage

```bash
/deploy:history [--limit=10] [--state=completed|failed] [--repo=name]
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--limit` | Number of deployments to show | 10 |
| `--state` | Filter by final state | All |
| `--repo` | Filter by repository | All |

## Examples

```bash
# Show recent deployments
/deploy:history

# Show last 20 deployments
/deploy:history --limit=20

# Show only failed deployments
/deploy:history --state=failed

# Show deployments for specific repo
/deploy:history --repo=my-service
```

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Deployment History
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID                              Repository      Branch    State      Duration   Date
────────────────────────────────────────────────────────────────────────────────────────
deploy-1705200000000-abc123def  my-service      main      ✓ completed  18m 42s   Jan 13
deploy-1705190000000-def456ghi  api-gateway     develop   ✗ failed     4m 15s    Jan 13
deploy-1705180000000-ghi789jkl  my-service      hotfix/1  ✓ completed  12m 30s   Jan 12
deploy-1705170000000-jkl012mno  auth-service    main      ↺ rolled-back 22m 18s  Jan 12
deploy-1705160000000-mno345pqr  my-service      main      ✓ completed  15m 55s   Jan 11

Summary:
  Total: 5
  Completed: 3 (60%)
  Failed: 1 (20%)
  Rolled Back: 1 (20%)

Average Duration: 14m 48s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Detailed View

To see detailed history for a specific deployment:

```bash
/deploy:status deploy-1705200000000-abc123def
```

Shows complete state transition history with timestamps.

## Export

Export history to JSON:

```bash
/deploy:history --limit=100 --format=json > deployments.json
```

## State Icons

| Icon | State |
|------|-------|
| ✓ | completed |
| ✗ | failed |
| ↺ | rolled-back |

## See Also

- `/deploy:status` - Detailed deployment status
- `/deploy:start` - Start new deployment
