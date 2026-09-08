---
name: deploy:rollback
intent: Rollback a deployment
tags:
  - deployment-pipeline
  - command
  - rollback
inputs: []
risk: medium
cost: medium
description: Rollback a deployment
allowed-tools:
  - Bash
  - Read
  - Write
---

# Deploy Rollback

Rollback a deployment to the previous stable version.

## Usage

```bash
/deploy:rollback <deployment-id> [--reason="explanation"] [--force]
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `deployment-id` | ID of deployment to rollback | Yes |
| `--reason` | Reason for rollback | No |
| `--force` | Skip confirmation prompt | No |

## Examples

```bash
# Rollback deployment
/deploy:rollback deploy-1705123456789-abc123def

# Rollback with reason
/deploy:rollback deploy-1705123456789-abc123def --reason="Memory leak detected in prod"

# Force rollback without confirmation
/deploy:rollback deploy-1705123456789-abc123def --force
```

## Rollback States

Rollback is available from these states:
- `deploying-dev`
- `deploying-staging`
- `awaiting-approval` (rejection)
- `deploying-prod`
- `failed`

## Workflow

1. Validates deployment can be rolled back
2. Confirms action (unless `--force`)
3. Identifies last stable deployment
4. Initiates Harness rollback workflow
5. Transitions state to `rolled-back`
6. Sends `pipeline.rollback` notification

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Deployment Rollback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deployment ID:      deploy-1705123456789-abc123def
Rolling Back From:  deploying-prod
Reason:             Memory leak detected in prod

Rolling back to:    deploy-1705123000000-prev123
Previous Commit:    x9y8z7w6

Rollback Progress:
  ✓ Production rollback initiated
  ✓ Staging rollback initiated
  ✓ Dev rollback initiated
  ✓ State updated to rolled-back

Rollback completed successfully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Harness Integration

Rollback triggers Harness CD rollback pipeline:
- Reverts Kubernetes deployments
- Restores previous ConfigMaps/Secrets
- Updates ingress routing
- Clears caches if configured

## Notifications

- `pipeline.rollback` notification sent
- Includes rollback reason and initiator
- Alerts on-call team if production affected

## Audit Trail

Rollback actions are logged with:
- Initiator identity
- Timestamp
- Reason
- Affected environments
- Reverted commit SHA

## See Also

- `/deploy:status` - Check deployment status
- `/deploy:history` - View deployment history
