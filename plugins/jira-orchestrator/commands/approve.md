---
name: jira:approve
description: Request, view, and process approvals (pr, deploy, release, issue)
arguments:
  - name: action
    description: request|approve|reject|status|list|history|configure
    required: true
  - name: target
    description: Type (pr|deploy|release|issue) or approval_id
    required: false
  - name: identifier
    description: PR#, environment, version, or issue key
    required: false
  - name: comment
    description: Justification for approval/rejection
    required: false
version: 1.0.0
---

# Jira Approval Workflows

## Request
```bash
/jira:approve request pr 456
/jira:approve request deploy production
/jira:approve request release v2.0.0
/jira:approve request issue PROJ-123
```
Parse type → Load workflow → Auto-approve if low-risk → Create approval_id → Notify approvers

## Approve
```bash
/jira:approve approve APPR-2025-12345 "LGTM"
```
Validate → Check auth → Record → Check quorum → Advance level → Notify

## Reject
```bash
/jira:approve reject APPR-2025-12345 "Security issues"
```
Validate → Record rejection → Block action → Create remediation tasks

## Status
```bash
/jira:approve status APPR-2025-12345
```
Show: current level, approvers, progress, timeouts, risk score

## List Pending
```bash
/jira:approve list --priority high
```
Sort by urgency (timeout closest first)

## History
```bash
/jira:approve history PROJ-123
```
Show approved/rejected, stats, timeline

## Configure
```bash
/jira:approve configure standard_pr_approval
```
Show workflow levels, approvers, timeouts, escalation

## Approval Types
- PR: Files changed, size, tests, risk score
- Deploy: Environment, change scope, history
- Release: Notes, changes, compliance
- Issue: Type, priority, impact

## Features
- Multi-level workflows (parallel/sequential)
- Quorum requirements (1 of N, all)
- Auto-escalate on timeout
- Risk-based routing
- Slack/Email/Jira notifications
- Delegation with scope
- Immutable audit trail (SOC2, ISO27001)

## Agents
- approval-orchestrator: Executes workflows
- policy-enforcer: Evaluates policies
- governance-auditor: Records events

## Config
`/home/user/claude/jira-orchestrator/config/approvals.yaml`

## Best Practices
1. Provide context in comments
2. Respond within timeout
3. Review thoroughly
4. Document exceptions
5. Monitor pending approvals
6. Set up delegations before leave

## Common Errors
- "Not found" → Check approval ID
- "Not authorized" → Not in approver list
- "Already decided" → Already processed
- "Comment required" → Rejection needs reason

---

**⚓ Golden Armada** | *The Fleet Stands Ready*
