---
name: jira:approve
description: Request, view, and process approvals for actions with configurable workflows, escalation, and comprehensive audit trails
arguments:
  - name: action
    description: |
      Approval action:
      - request: Request approval for an action
      - approve: Approve a pending request
      - reject: Reject a pending request
      - status: View approval status
      - list: List pending approvals
      - history: View approval history
      - configure: Configure approval workflows
    required: true

  - name: target
    description: |
      Target for approval (depends on action):
      - For request: pr|deploy|release|issue
      - For approve/reject/status: approval_id
      - For history: issue_key or user_id
      - For configure: workflow_name
    required: false

  - name: identifier
    description: |
      Identifier for the target:
      - For pr: PR number or URL
      - For deploy: environment name
      - For release: version number
      - For issue: Jira issue key
    required: false

  - name: comment
    description: Comment or justification for approval decision
    required: false

version: 1.0.0
---

# Jira Approval Workflow Command

You are managing approval workflows for the Jira Orchestrator. This command enables comprehensive approval management including requesting approvals, making decisions, viewing status, and configuring workflows.

## Command Actions

### 1. Request Approval

**Usage:**
```bash
/jira:approve request pr 456
/jira:approve request pr https://github.com/org/repo/pull/456
/jira:approve request deploy production
/jira:approve request release v2.0.0
/jira:approve request issue PROJ-123
```

**Workflow:**
```
1. Parse approval request:
   - Determine approval type (pr, deploy, release, issue)
   - Extract identifier
   - Link to Jira issue if available

2. Determine applicable workflow:
   - Load workflows from config/approvals.yaml
   - Match based on type and context
   - Select workflow (standard, production, hotfix, etc.)

3. Evaluate conditions:
   - Check if auto-approval criteria met
   - Check if approval required (based on risk, size, etc.)
   - Determine approval levels needed

4. Gather context:
   a. For PR approval:
      - Get PR metadata (files changed, size, tests)
      - Run policy checks (code quality, security)
      - Get test results
      - Calculate risk score

   b. For deployment approval:
      - Get deployment target (environment)
      - Get change scope
      - Check recent deployment history
      - Calculate deployment risk

   c. For release approval:
      - Get release notes
      - Get included changes
      - Check compliance requirements
      - Calculate release risk

   d. For issue approval:
      - Get issue details
      - Check issue type and priority
      - Get related PRs and commits
      - Assess business impact

5. Create approval request:
   - Generate unique approval_id
   - Initialize workflow state
   - Set timeouts for each level
   - Record in audit trail

6. Notify approvers:
   - Send Slack/Teams notifications
   - Send email notifications
   - Post Jira comment
   - Start timeout timers

7. Return approval request details:
   - Approval ID
   - Workflow name
   - Required approvers
   - Timeout deadlines
   - Approval URL
```

**Example Output:**
```
APPROVAL REQUEST CREATED
=======================

Approval ID: APPR-2025-12345
Type: Pull Request Merge
Target: PR #456 (https://github.com/org/repo/pull/456)
Issue: PROJ-123
Requester: john.doe
Created: 2025-12-22 14:30:00

WORKFLOW: production_pr_approval
Risk Level: MEDIUM (Score: 45/100)

APPROVAL LEVELS:
Level 1: Technical Review
  Approvers: backend_lead_1, backend_lead_2
  Quorum: 1 of 2
  Timeout: 24 hours
  Status: ⏳ PENDING

Level 2: Security Review
  Approvers: security_team
  Quorum: 1 of 1
  Timeout: 12 hours
  Status: ⏸️ WAITING (after Level 1)

NOTIFICATIONS SENT:
✅ Slack: #engineering (@backend_lead_1, @backend_lead_2)
✅ Email: backend_lead_1@company.com, backend_lead_2@company.com
✅ Jira: Comment posted on PROJ-123

APPROVAL ACTIONS:
- Approve: /jira:approve approve APPR-2025-12345 "comment"
- Reject: /jira:approve reject APPR-2025-12345 "comment"
- Status: /jira:approve status APPR-2025-12345

APPROVAL URL:
https://approvals.company.com/approve/APPR-2025-12345
```

### 2. Approve Request

**Usage:**
```bash
/jira:approve approve APPR-2025-12345
/jira:approve approve APPR-2025-12345 "LGTM, code quality is excellent"
```

**Workflow:**
```
1. Validate approval request:
   - Load approval by ID
   - Verify approval is pending
   - Check user is authorized approver

2. Check delegation:
   - Check if user is delegated approver
   - Verify delegation is active and in scope
   - Record delegation if applicable

3. Record approval:
   - Update approval workflow state
   - Record approver, timestamp, comment
   - Calculate level completion

4. Check quorum:
   - Count approvals for current level
   - Check if quorum met
   - If met, advance to next level

5. Check workflow completion:
   - If all levels approved, mark complete
   - Execute completion actions
   - Update target (enable PR merge, open deployment gate, etc.)

6. Send notifications:
   - Notify requester of approval
   - Update Slack message
   - Post Jira comment
   - If workflow complete, notify all stakeholders

7. Record in audit trail:
   - Create approval event
   - Record evidence (who, when, why)
   - Store immutably

8. Return approval confirmation
```

**Example Output:**
```
APPROVAL RECORDED
=================

Approval ID: APPR-2025-12345
Your Decision: ✅ APPROVED
Approver: backend_lead_1
Timestamp: 2025-12-22 15:45:00
Comment: "LGTM, code quality is excellent"

WORKFLOW STATUS: In Progress

Level 1: Technical Review
  Status: ✅ COMPLETED
  Your approval: ✅ Approved at 15:45
  Quorum: 1 of 2 (MET)
  Duration: 1h 15m

Level 2: Security Review
  Status: ⏳ PENDING
  Approvers: security_team
  Notified: 15:45 (just now)
  Timeout: 12 hours

NEXT STEPS:
- Waiting for security_team approval
- Auto-escalate in 12 hours if no response

NOTIFICATIONS SENT:
✅ Slack: Workflow message updated
✅ Slack: security_team notified (#security)
✅ Jira: Comment posted
✅ Email: Requester notified

AUDIT TRAIL:
Event ID: AUD-2025-67890
Recorded: ✅ Immutable audit trail
```

### 3. Reject Request

**Usage:**
```bash
/jira:approve reject APPR-2025-12345 "Security scan found critical vulnerabilities"
```

**Workflow:**
```
1. Validate rejection:
   - Load approval by ID
   - Verify approval is pending
   - Check user is authorized approver
   - Require rejection comment

2. Record rejection:
   - Update approval workflow state
   - Record approver, timestamp, comment
   - Mark workflow as rejected

3. Execute rejection actions:
   - Block target action (PR merge, deployment, etc.)
   - Create remediation tasks
   - Update labels/status

4. Send notifications:
   - Notify requester of rejection
   - Update Slack message
   - Post detailed Jira comment
   - Alert relevant teams

5. Record in audit trail:
   - Create rejection event
   - Record evidence and reasoning
   - Store immutably

6. Provide remediation guidance:
   - Suggest fixes
   - Link to policies
   - Assign remediation tasks
```

**Example Output:**
```
APPROVAL REJECTED
=================

Approval ID: APPR-2025-12345
Decision: ❌ REJECTED
Rejected By: security_team
Timestamp: 2025-12-22 16:30:00
Reason: "Security scan found critical vulnerabilities"

WORKFLOW STATUS: Rejected

Level 1: Technical Review
  Status: ✅ APPROVED
  Approved by: backend_lead_1

Level 2: Security Review
  Status: ❌ REJECTED
  Rejected by: security_team
  Reason: Security scan found critical vulnerabilities

BLOCKING ACTION:
❌ PR #456 merge blocked
❌ Deployment gate closed

VULNERABILITIES FOUND:
1. CVE-2025-12345 (CRITICAL)
   - SQL Injection in user authentication
   - Location: src/auth/login.js:45
   - Fix: Use parameterized queries

2. CVE-2025-12346 (HIGH)
   - XSS vulnerability in user profile
   - Location: src/profile/edit.js:89
   - Fix: Implement output encoding

REMEDIATION TASKS CREATED:
- PROJ-456: Fix SQL injection vulnerability (P0)
- PROJ-457: Fix XSS vulnerability (P1)

NEXT STEPS:
1. Fix security vulnerabilities
2. Re-run security scan
3. Request new approval

NOTIFICATIONS SENT:
✅ Slack: Requester notified
✅ Jira: Detailed comment with vulnerabilities
✅ Email: Security team and requester
```

### 4. View Approval Status

**Usage:**
```bash
/jira:approve status APPR-2025-12345
```

**Workflow:**
```
1. Load approval by ID
2. Get current workflow state
3. Get all approval/rejection events
4. Calculate durations and progress
5. Display detailed status
```

**Example Output:**
```
APPROVAL STATUS
===============

Approval ID: APPR-2025-12345
Type: Pull Request Merge
Target: PR #456 (PROJ-123)
Status: ⏳ IN PROGRESS
Created: 2025-12-22 14:30:00
Elapsed Time: 2h 15m

WORKFLOW: production_pr_approval

Level 1: Technical Review ✅ COMPLETED
  Quorum: 1 of 2 required
  Duration: 1h 15m

  Approvers:
  ✅ backend_lead_1 - Approved at 15:45
     Comment: "LGTM, code quality is excellent"
  ⏸️  backend_lead_2 - Not responded (quorum already met)

Level 2: Security Review ⏳ PENDING
  Quorum: 1 of 1 required
  Elapsed: 1h 0m
  Timeout: 11h remaining

  Approvers:
  ⏳ security_team - Notified at 15:45
     Last viewed: 16:20 (25 minutes ago)

RISK ASSESSMENT:
Overall Risk: MEDIUM (45/100)
- Security: 30/100 (2 medium vulnerabilities)
- Compliance: 60/100 (missing 1 approval)
- Operational: 40/100 (coverage decreased)
- Business: 20/100 (low impact)

NEXT STEPS:
- Waiting for security_team approval
- If approved, PR can be merged
- Auto-escalate to security_director in 11h

TIMELINE:
14:30 - Approval request created
14:35 - Notifications sent
15:45 - backend_lead_1 approved (Level 1 complete)
15:45 - security_team notified (Level 2 started)
16:20 - security_team viewed request
16:45 - [CURRENT TIME]

APPROVAL URL:
https://approvals.company.com/approve/APPR-2025-12345
```

### 5. List Pending Approvals

**Usage:**
```bash
/jira:approve list
/jira:approve list --assignee me
/jira:approve list --type pr
/jira:approve list --priority high
```

**Workflow:**
```
1. Query approval database
2. Filter by user (approvals assigned to current user)
3. Filter by type/priority if specified
4. Sort by urgency (timeout closest first)
5. Display summary list
```

**Example Output:**
```
PENDING APPROVALS
=================

Assigned to: current_user (john.doe)
Total: 5 approvals pending

URGENT (Timeout < 4h):
1. APPR-2025-12340 - Production Deployment
   Issue: PROJ-120
   Timeout: 2h 15m remaining
   Escalates to: director in 2h

HIGH PRIORITY:
2. APPR-2025-12345 - PR Merge
   Issue: PROJ-123
   Timeout: 11h remaining
   Waiting since: 2h 15m

3. APPR-2025-12347 - Security Hotfix
   Issue: PROJ-125
   Timeout: 6h remaining
   Waiting since: 30m

NORMAL PRIORITY:
4. APPR-2025-12350 - Feature Release
   Issue: PROJ-128
   Timeout: 36h remaining
   Waiting since: 12h

5. APPR-2025-12352 - Configuration Change
   Issue: PROJ-130
   Timeout: 48h remaining
   Waiting since: 1h

ACTIONS:
- Approve: /jira:approve approve APPR-ID "comment"
- Reject: /jira:approve reject APPR-ID "comment"
- View Details: /jira:approve status APPR-ID

BULK ACTIONS:
- Approve all low-risk: /jira:approve bulk-approve --risk low
```

### 6. View Approval History

**Usage:**
```bash
/jira:approve history PROJ-123
/jira:approve history --user john.doe
/jira:approve history --date-range 2025-12-01:2025-12-31
```

**Workflow:**
```
1. Query audit trail
2. Filter by issue, user, or date range
3. Get all approval events
4. Calculate statistics
5. Display history
```

**Example Output:**
```
APPROVAL HISTORY
================

Issue: PROJ-123
Period: All time

SUMMARY:
Total Approvals: 12
Approved: 10 (83%)
Rejected: 2 (17%)
Average Time: 4.5 hours

APPROVAL RECORDS:

1. APPR-2025-12345 - PR Merge ✅ APPROVED
   Requested: 2025-12-22 14:30
   Completed: 2025-12-22 18:00
   Duration: 3h 30m
   Workflow: production_pr_approval
   Approvers:
   - backend_lead_1 (approved 15:45)
   - security_team (approved 17:30)

2. APPR-2025-12340 - Production Deployment ✅ APPROVED
   Requested: 2025-12-20 09:00
   Completed: 2025-12-20 15:30
   Duration: 6h 30m
   Workflow: production_deployment
   Approvers:
   - engineering_manager (approved 11:00)
   - security_team (approved 13:00)
   - cto (approved 15:30)
   Escalations: 1 (engineering_manager timeout, escalated to director)

3. APPR-2025-12335 - PR Merge ❌ REJECTED
   Requested: 2025-12-18 11:00
   Rejected: 2025-12-18 12:30
   Duration: 1h 30m
   Rejected by: security_team
   Reason: "Critical security vulnerabilities found"
   Remediation: PROJ-145, PROJ-146

PERFORMANCE METRICS:
Fastest approval: 45 minutes
Slowest approval: 24 hours
Escalation rate: 8.3% (1 of 12)
Rejection rate: 16.7% (2 of 12)
```

### 7. Configure Approval Workflows

**Usage:**
```bash
/jira:approve configure standard_pr_approval
/jira:approve configure --list
/jira:approve configure --validate production_deployment
```

**Workflow:**
```
1. Load workflow configuration from config/approvals.yaml
2. Display or validate workflow
3. Allow modifications if needed
4. Save updated configuration
```

**Example Output:**
```
APPROVAL WORKFLOW CONFIGURATION
================================

Workflow: standard_pr_approval
Version: 1.0.0
Status: Active

APPLIES TO:
- Type: pull_request
- Target Branches: main, production
- Exclude: hotfix_*, emergency_*

WORKFLOW LEVELS:

Level 1: Technical Review
  Type: Parallel
  Approvers:
  - Role: backend_lead (1 required)
  - Role: frontend_lead (if UI files changed)
  Timeout: 24 hours
  Escalation: team_director

Level 2: Security Review
  Type: Sequential (after Level 1)
  Approvers:
  - Team: security_team (1 required)
  Timeout: 12 hours
  Conditions:
  - Skip if: security_scan == "passed" AND no_security_files_changed
  Escalation: security_director

CONDITIONAL LOGIC:
- Auto-approve if: risk_level == "low" AND coverage >= 80
- Require Level 3 (CTO) if: risk_level == "critical"
- Skip security if: no security-related changes

NOTIFICATIONS:
- Slack: #engineering, #approvals
- Email: Yes
- Jira: Comment on issue

ESCALATION RULES:
- Level 1: Remind at 12h, escalate at 24h
- Level 2: Escalate at 12h
- Final: Auto-approve at 48h if low risk

AUDIT:
- All decisions recorded
- Immutable audit trail
- Compliance: SOC2, ISO27001

USAGE STATISTICS:
- Times used: 145
- Avg completion time: 3.5 hours
- Success rate: 94%
- Escalation rate: 6%
```

## Integration with Agents

This command coordinates with:
- **approval-orchestrator**: Executes approval workflows
- **policy-enforcer**: Evaluates policies before approval
- **governance-auditor**: Records all approval events

## Configuration

All approval workflows are defined in:
```
/home/user/claude/jira-orchestrator/config/approvals.yaml
```

## Best Practices

1. **Always provide context**: Include comments explaining approval/rejection decisions
2. **Act promptly**: Respond to approval requests within timeout period
3. **Review thoroughly**: Check all evidence before approving
4. **Document exceptions**: If overriding policies, document reasoning
5. **Monitor pending**: Regularly check for pending approvals
6. **Configure delegation**: Set up delegations before going on leave

## Error Handling

Common errors and solutions:
- **"Approval not found"**: Check approval ID is correct
- **"Not authorized"**: You are not an approver for this request
- **"Already decided"**: Approval already processed
- **"Comment required"**: Must provide comment for rejection
- **"Workflow not found"**: Check workflow configuration

---

Execute the requested approval action and provide detailed status and next steps.
