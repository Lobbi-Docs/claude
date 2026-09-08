---
name: deploy:start
intent: Start a new deployment pipeline
tags:
  - deployment-pipeline
  - command
  - start
inputs: []
risk: medium
cost: medium
description: Start a new deployment pipeline
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
---

# Deploy Start

Start a new deployment pipeline for a repository.

## Usage

```bash
/deploy:start [repository] [branch] [--env=dev|staging|prod]
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `repository` | Repository name or path | Current directory |
| `branch` | Branch to deploy | `main` |
| `--env` | Target environment | `dev` |

## Examples

```bash
# Start deployment for current repo
/deploy:start

# Deploy specific branch
/deploy:start . feature/new-feature

# Deploy to staging
/deploy:start my-service main --env=staging
```

## Workflow

This command initiates the deployment state machine:

```
pending → validating → building → testing → deploying-dev → deploying-staging → awaiting-approval → deploying-prod → completed
```

## State Machine Events

1. **START** - Initiates pipeline, moves to `validating`
2. **VALIDATION_COMPLETE** - Moves to `building`
3. **BUILD_COMPLETE** - Moves to `testing`
4. **TESTS_PASSED** - Moves to `deploying-dev`
5. **DEV_DEPLOYED** - Moves to `deploying-staging`
6. **STAGING_DEPLOYED** - Moves to `awaiting-approval`
7. **APPROVED** - Moves to `deploying-prod`
8. **PROD_DEPLOYED** - Moves to `completed`

## Notifications

The following notifications are sent:
- `pipeline.started` - When deployment begins
- `pipeline.stage.completed` - After each stage
- `pipeline.approval.required` - When awaiting production approval

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Deployment Pipeline Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deployment ID:  deploy-1705123456789-abc123def
Repository:     my-service
Branch:         main
Commit:         a1b2c3d4
Environment:    dev → staging → prod

Current State:  validating
Started At:     2025-01-13 10:30:45

Next Steps:
  • Validating configuration...
  • Run /deploy:status deploy-1705123456789-abc123def to check progress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling

If validation fails:
- Pipeline transitions to `failed` state
- Notification sent with error details
- Use `/deploy:history` to see failure reason

## Retry Behavior

Retryable states (`validating`, `building`, `testing`):
- Max attempts: 3
- Backoff: 1s, 2s, 4s (exponential)
- Retryable errors: network timeouts, service unavailable

## See Also

- `/deploy:status` - Check deployment status
- `/deploy:approve` - Approve production deployment
- `/deploy:rollback` - Rollback a deployment
