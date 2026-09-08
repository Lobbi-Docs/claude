---
name: deploy:approve
intent: Approve deployment to production
tags:
  - deployment-pipeline
  - command
  - approve
inputs: []
risk: medium
cost: medium
description: Approve deployment to production
allowed-tools:
  - Read
  - Write
---

# Deploy Approve

Approve a deployment for production release.

## Usage

```bash
/deploy:approve <deployment-id> [--comment="reason"]
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `deployment-id` | ID of deployment to approve | Yes |
| `--comment` | Approval comment/reason | No |

## Examples

```bash
# Approve deployment
/deploy:approve deploy-1705123456789-abc123def

# Approve with comment
/deploy:approve deploy-1705123456789-abc123def --comment="Tested in staging, ready for prod"
```

## Prerequisites

The deployment must be in `awaiting-approval` state.

## Workflow

1. Validates deployment is in correct state
2. Records approver and timestamp
3. Transitions state to `deploying-prod`
4. Sends `pipeline.approved` notification
5. Initiates production deployment

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Deployment Approved
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deployment ID:  deploy-1705123456789-abc123def
Approved By:    markus.ahling
Approved At:    2025-01-13 10:50:00
Comment:        Tested in staging, ready for prod

State Change:   awaiting-approval → deploying-prod

Production deployment initiated...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rejection

To reject a deployment instead:

```bash
/deploy:rollback <deployment-id> --reason="Failed QA review"
```

## Notifications

- Slack/Teams notification sent to configured channels
- Email notification to stakeholders

## Audit Trail

All approvals are logged with:
- Approver identity
- Timestamp
- Comment/reason
- Previous state
- New state

## See Also

- `/deploy:status` - Check deployment status
- `/deploy:rollback` - Reject/rollback deployment
