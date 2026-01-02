---
name: jira:release
description: Multi-project release planning, coordination, and execution with automated release notes, go/no-go decisions, and rollback management
arguments:
  - name: action
    description: |
      Release action to perform:
      - plan: Plan a new release
      - status: Check release status
      - notes: Generate release notes
      - readiness: Assess release readiness
      - go-no-go: Conduct go/no-go decision
      - deploy: Execute release deployment
      - rollback: Rollback a release
      - calendar: View release calendar
    required: true
  - name: version
    description: Release version (e.g., v2.5.0, 2024.Q2). Required for most actions.
    required: false
  - name: projects
    description: Comma-separated project keys (e.g., PROJ1,PROJ2). If omitted, uses projects linked to version.
    required: false
  - name: date
    description: Release date (YYYY-MM-DD). Required for 'plan' action.
    required: false
version: 1.0.0
---

# Release Management Command

You are executing the **Jira Release Management** command to plan, coordinate, and execute releases across multiple projects.

## Command Details

**Action:** ${action}
**Version:** ${version || "Not specified"}
**Projects:** ${projects || "Auto-detect from version"}
**Release Date:** ${date || "Not specified"}

---

## Action: Plan

**Objective:** Plan a new release

**Prerequisites:**
- Version name must be provided
- Release date must be provided
- Projects can be specified or auto-detected

**Steps:**

### 1. Validate Inputs
```python
if not version:
    return "Error: Version name required. Example: /jira:release plan version=v2.5.0 date=2024-06-30"

if not date:
    return "Error: Release date required. Format: YYYY-MM-DD"

# Validate date format
try:
    release_date = datetime.strptime(date, "%Y-%m-%d")
except:
    return "Error: Invalid date format. Use YYYY-MM-DD"
```

### 2. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: plan_release
- Version: ${version}
- Projects: ${projects}
- Release Date: ${date}
```

### 3. Expected Planning Output

```markdown
# Release Plan - ${version}

## Overview
- **Version:** ${version}
- **Target Date:** ${date}
- **Projects:** ${projects}
- **Release Type:** Major/Minor/Patch

## Scope

### Features (45 issues, 234 SP)
- **PORTAL-100:** New payment gateway integration (13 SP)
- **MOBILE-200:** Push notifications system (21 SP)
- **API-300:** GraphQL API v2 (34 SP)
- [See full feature list]

### Bug Fixes (23 issues, 67 SP)
- **PORTAL-150:** Login timeout issue (5 SP)
- **API-350:** Rate limiting bug (8 SP)
- [See full bug list]

### Improvements (12 issues, 45 SP)
- **PORTAL-180:** Dashboard performance (8 SP)
- **MOBILE-220:** Offline mode (13 SP)
- [See full improvement list]

## Timeline

| Milestone               | Date       | Status   |
|-------------------------|------------|----------|
| Code Freeze             | 2024-06-16 | Upcoming |
| QA Complete             | 2024-06-26 | Upcoming |
| UAT Complete            | 2024-06-28 | Upcoming |
| Go/No-Go Decision       | 2024-06-28 | Upcoming |
| Production Deployment   | 2024-06-30 | Upcoming |
| Post-Release Monitoring | 2024-07-01 | Upcoming |

## Dependencies
- Data migration must complete before API deployment
- Payment gateway integration blocks checkout features
- [See dependency map]

## Risks
1. **Payment Gateway Integration** (High)
   - External vendor dependency
   - Mitigation: Fallback to v1 gateway

2. **Database Migration Complexity** (Medium)
   - Large schema changes
   - Mitigation: Extended rollback window

## Team Allocation
- **Customer Portal:** 8 developers, 2 QA
- **Mobile App:** 6 developers, 1 QA
- **API Platform:** 10 developers, 3 QA

## Success Criteria
- ✓ All features complete and tested
- ✓ Zero critical bugs
- ✓ Test coverage > 80%
- ✓ Performance benchmarks met
- ✓ Security scan passed
- ✓ Stakeholder sign-off obtained

## Next Steps
1. Create Jira versions for all projects
2. Assign issues to version
3. Schedule code freeze
4. Plan QA activities
5. Schedule go/no-go meeting
```

### 4. Actions After Planning
- Create Jira versions in all projects
- Link issues to versions
- Create release calendar event
- Notify stakeholders
- Save plan to `/jira-orchestrator/sessions/releases/${version}/plan.md`

---

## Action: Status

**Objective:** Check current release status

**Steps:**

### 1. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: get_release_status
- Version: ${version}
```

### 2. Expected Status Output

```markdown
# Release Status - ${version}

## Progress Overview
- **Target Date:** 2024-06-30 (15 days away)
- **Overall Completion:** 76.5%
- **Status:** ON TRACK ✓

## Completion by Type

| Type         | Total | Done | In Progress | To Do | Completion |
|--------------|-------|------|-------------|-------|------------|
| Features     | 45    | 32   | 10          | 3     | 71.1%      |
| Bugs         | 23    | 20   | 2           | 1     | 87.0%      |
| Improvements | 12    | 9    | 2           | 1     | 75.0%      |
| **Total**    | 80    | 61   | 14          | 5     | 76.3%      |

## Completion by Project

| Project         | Total | Done | Completion | Status    |
|-----------------|-------|------|------------|-----------|
| Customer Portal | 30    | 24   | 80.0%      | On Track  |
| Mobile App      | 25    | 19   | 76.0%      | On Track  |
| API Platform    | 25    | 18   | 72.0%      | At Risk   |

## Blockers (2)
⚠️ **PORTAL-234:** Payment gateway API not responding
- **Priority:** Blocker
- **Assignee:** John Smith
- **Status:** In Progress
- **Impact:** Blocks checkout feature

⚠️ **API-456:** Database migration script failing
- **Priority:** Blocker
- **Assignee:** Alice Johnson
- **Status:** To Do
- **Impact:** Blocks data layer changes

## Risks
- API Platform behind schedule (need 8% more completion)
- 2 blocking issues unresolved
- Code freeze in 1 day

## Upcoming Milestones
- **Code Freeze:** Tomorrow (2024-06-16)
- **QA Complete:** June 26 (10 days)
- **Go/No-Go:** June 28 (12 days)

## Recommendations
- ✓ Resolve blockers before code freeze
- ⚠️ Consider extending code freeze by 2 days if blockers remain
- ✓ Increase QA resources for API Platform
```

---

## Action: Notes

**Objective:** Generate release notes

**Steps:**

### 1. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: generate_release_notes
- Version: ${version}
```

### 2. Expected Release Notes Output

```markdown
# Release Notes - ${version}
**Release Date:** June 30, 2024

## Summary
This release includes 45 new features, 23 bug fixes, and 12 improvements across Customer Portal, Mobile App, and API Platform. Highlights include the new payment gateway integration, push notification system, and GraphQL API v2.

## What's New

### 🚀 Features

#### Customer Portal
- **New Payment Gateway Integration** (PORTAL-100)
  - Support for credit cards, PayPal, and Apple Pay
  - PCI DSS compliant
  - Automatic retry on failure

- **Enhanced Dashboard Analytics** (PORTAL-105)
  - Real-time metrics visualization
  - Custom report builder
  - Export to CSV/PDF

#### Mobile App
- **Push Notifications** (MOBILE-200)
  - Order status updates
  - Promotional messages
  - Customizable preferences

- **Offline Mode** (MOBILE-220)
  - Browse catalog offline
  - Sync when connection restored
  - Queue actions for later

#### API Platform
- **GraphQL API v2** (API-300)
  - More flexible queries
  - Reduced over-fetching
  - Real-time subscriptions

### 🐛 Bug Fixes
- Fixed login timeout issue after 15 minutes (PORTAL-150)
- Resolved data export corruption on large datasets (PORTAL-155)
- Fixed rate limiting causing 429 errors (API-350)
- Corrected timezone handling in reports (ANALYTICS-100)
- [See full list]

### ✨ Improvements
- Dashboard loads 40% faster (PORTAL-180)
- Reduced API response time by 25% (API-360)
- Improved mobile app startup time (MOBILE-230)
- Enhanced search relevance (PORTAL-190)

## Breaking Changes
⚠️ **API v1 Deprecation**
- API v1 will be deprecated in 90 days (Sept 30, 2024)
- Migrate to v2 using our [Migration Guide](link)
- v1 endpoints will return deprecation warnings

## Upgrade Instructions

### Database Migration
```bash
# Backup database
pg_dump production > backup.sql

# Run migration
npm run db:migrate

# Verify migration
npm run db:verify
```

### Application Deployment
```bash
# Deploy backend
kubectl apply -f k8s/backend/

# Deploy frontend
kubectl apply -f k8s/frontend/

# Run smoke tests
npm run smoke-test
```

### Rollback Procedure
If issues arise, rollback using:
```bash
# Rollback application
kubectl rollout undo deployment/app

# Rollback database
psql production < rollback.sql
```

## Known Issues
- Mobile app may crash on iOS 14.x when using offline mode (MOBILE-250)
  - Workaround: Update to iOS 15+
  - Fix planned for v2.5.1

## Feedback
Report issues: [Support Portal](link)
Feature requests: [Feedback Form](link)

---

**Full Changelog:** [JIRA Release](jira-link)
**Documentation:** [Docs Portal](docs-link)
**Migration Guide:** [API v2 Migration](migration-link)
```

### 3. Actions After Notes Generation
- Save to `/jira-orchestrator/sessions/releases/${version}/release-notes.md`
- Publish to Confluence
- Create GitHub release with notes
- Email to all stakeholders
- Post in Slack/Teams

---

## Action: Readiness

**Objective:** Assess if release is ready

**Steps:**

### 1. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: assess_readiness
- Version: ${version}
```

### 2. Expected Readiness Output

```markdown
# Release Readiness Assessment - ${version}

## Overall Readiness: 72/100 (AT RISK)

## Criteria Checklist

| Criterion              | Required | Actual | Met | Weight |
|------------------------|----------|--------|-----|--------|
| Completion             | 100%     | 98%    | ⚠️  | 40%    |
| Blockers               | 0        | 1      | ⚠️  | 30%    |
| Critical Bugs          | 0        | 0      | ✅  | 20%    |
| Test Coverage          | 80%      | 85%    | ✅  | 10%    |
| Code Review            | 100%     | 100%   | ✅  | 5%     |
| Security Scan          | Pass     | Pass   | ✅  | 5%     |
| Performance Benchmarks | Pass     | Pass   | ✅  | 5%     |
| Stakeholder Approval   | Yes      | Yes    | ✅  | 5%     |

## Detailed Analysis

### ⚠️ Completion (40 points / 40)
- **Actual:** 98% (78/80 issues done)
- **Status:** Nearly complete, 2 issues remaining
- **Issues:**
  - PORTAL-234: Payment gateway API (In Progress)
  - API-456: Database migration (To Do)
- **Recommendation:** Complete before release

### ⚠️ Blockers (0 points / 30)
- **Actual:** 1 blocker
- **Issue:** PORTAL-234 blocking checkout feature
- **Impact:** Critical feature unavailable
- **Mitigation:** Fallback to old gateway implemented
- **Recommendation:** Resolve or accept mitigation

### ✅ Quality Metrics
- **Critical Bugs:** 0 ✓
- **Test Coverage:** 85% ✓ (Target: 80%)
- **Code Review:** 100% ✓
- **Security Scan:** Passed ✓
- **Performance:** Passed ✓

## Risk Assessment

### High Risks (2)
1. **Payment Gateway Blocker**
   - Probability: High
   - Impact: High
   - Mitigation: Fallback available

2. **Database Migration Untested**
   - Probability: Medium
   - Impact: High
   - Mitigation: Rollback plan ready

### Medium Risks (1)
1. **API Platform Timeline**
   - Probability: Medium
   - Impact: Medium
   - Mitigation: Extra QA resources added

## Recommendations

### Go Forward IF:
- ✓ PORTAL-234 resolved by code freeze
- ✓ Database migration tested successfully
- ✓ Fallback payment gateway verified

### Delay IF:
- ⚠️ PORTAL-234 not resolved and fallback fails
- ⚠️ Database migration causes data issues
- ⚠️ New critical bugs discovered

### Decision:
**CONDITIONAL GO** - Proceed if conditions met by code freeze

## Next Steps
1. Complete PORTAL-234 by EOD today
2. Test database migration in staging
3. Verify payment gateway fallback
4. Conduct go/no-go meeting on June 28
```

---

## Action: Go-No-Go

**Objective:** Conduct formal go/no-go decision

**Steps:**

### 1. Run Readiness Assessment First
```bash
/jira:release readiness version=${version}
```

### 2. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: conduct_go_no_go
- Version: ${version}
```

### 3. Expected Go/No-Go Output

```markdown
# Go/No-Go Decision - ${version}
**Date:** 2024-06-28, 10:00 AM
**Decision:** GO WITH CONDITIONS

## Attendees
- Jane Doe (Release Manager)
- John Smith (Engineering Lead)
- Alice Johnson (QA Lead)
- Bob Wilson (Product Owner)
- Carol Davis (DevOps Lead)

## Criteria Review

| Criterion              | Required | Actual | Met |
|------------------------|----------|--------|-----|
| Completion             | 100%     | 100%   | ✅  |
| Blockers               | 0        | 0      | ✅  |
| Critical Bugs          | 0        | 0      | ✅  |
| Test Coverage          | 80%      | 85%    | ✅  |
| Code Review            | 100%     | 100%   | ✅  |
| Security Scan          | Pass     | Pass   | ✅  |
| Stakeholder Approval   | Yes      | Yes    | ✅  |

**Criteria Met:** 7/7 ✅

## Decision: GO WITH CONDITIONS

### Rationale
All release criteria have been met. PORTAL-234 was resolved yesterday and verified in staging. Database migration tested successfully with rollback procedure validated. Team is confident in release readiness.

### Conditions for Release
1. ✅ Monitor payment gateway metrics for first 4 hours
2. ✅ Have rollback team on standby for 24 hours
3. ✅ Keep extended monitoring until July 2

### Deployment Plan
- **Date:** June 30, 2024
- **Time:** 02:00 UTC (Off-peak)
- **Duration:** 2 hours estimated
- **Rollback Window:** 4 hours

### Communication Plan
- T-24h: Email to all users
- T-2h: System maintenance notice
- T+1h: Release complete notification
- T+4h: Success metrics report

### Rollback Triggers
Will rollback if:
- Error rate > 5%
- Response time > 2x baseline
- Payment processing fails
- Data corruption detected

### Sign-Off
- ✅ Engineering Lead: John Smith
- ✅ Product Owner: Bob Wilson
- ✅ QA Lead: Alice Johnson
- ✅ Release Manager: Jane Doe

## Next Steps
1. Final deployment checklist
2. Notify stakeholders of GO decision
3. Prepare monitoring dashboards
4. Brief rollback team
5. Deploy on June 30 at 02:00 UTC
```

### 4. Actions After Go/No-Go
- Document decision in Confluence
- Update Jira versions
- Send decision email to stakeholders
- Update release calendar
- Prepare deployment checklist

---

## Action: Deploy

**Objective:** Execute release deployment

**Steps:**

### 1. Pre-Deployment Validation
```python
# Check go/no-go decision
decision = get_latest_go_no_go_decision(version)
if decision != "GO" and decision != "GO_WITH_CONDITIONS":
    return "Error: Cannot deploy without GO decision"

# Verify deployment checklist
checklist_complete = verify_deployment_checklist(version)
if not checklist_complete:
    return "Error: Pre-deployment checklist incomplete"
```

### 2. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: execute_deployment
- Version: ${version}
```

### 3. Expected Deployment Output

```markdown
# Release Deployment - ${version}
**Started:** 2024-06-30 02:00:00 UTC
**Status:** IN PROGRESS

## Pre-Deployment Checklist ✅
- ✅ Database backup completed
- ✅ Git tags created
- ✅ Release artifacts built
- ✅ Smoke tests passed
- ✅ Stakeholders notified
- ✅ Maintenance mode enabled
- ✅ Rollback plan verified

## Deployment Steps

### 1. Database Migration ✅
- **Started:** 02:05:00
- **Completed:** 02:12:00
- **Duration:** 7 minutes
- **Status:** Success
- **Changes:** 15 migrations applied

### 2. Backend Services ⏳
- **Started:** 02:15:00
- **Status:** In Progress
- **Progress:** 60%
- **Services:**
  - ✅ Auth Service (v2.5.0)
  - ✅ API Gateway (v2.5.0)
  - ⏳ Payment Service (deploying...)
  - ⏳ Analytics Service (queued)

### 3. Frontend Applications (Pending)
- **Status:** Waiting for backend
- **Applications:**
  - Customer Portal
  - Admin Dashboard
  - Mobile App

## Real-Time Metrics
- **Error Rate:** 0.2% (Normal)
- **Response Time:** 145ms (Normal)
- **Active Users:** 234 (Low - maintenance window)
- **CPU Usage:** 45%
- **Memory Usage:** 62%

## Logs
```
[02:05:00] Starting database migration...
[02:12:00] Database migration complete
[02:15:00] Deploying backend services...
[02:18:00] Auth service healthy
[02:20:00] API gateway healthy
[02:22:00] Deploying payment service...
```

## Rollback Status
- **Rollback Available:** Yes
- **Rollback Tested:** Yes
- **Rollback Time:** ~15 minutes
```

### 4. Post-Deployment
Once deployment completes:

```markdown
# Deployment Complete ✅

**Completed:** 2024-06-30 03:45:00 UTC
**Duration:** 1h 45m
**Status:** SUCCESS

## Deployment Summary
- ✅ All components deployed
- ✅ Smoke tests passed
- ✅ Health checks green
- ✅ Maintenance mode disabled

## Post-Deployment Metrics
- **Error Rate:** 0.3% (Normal)
- **Response Time:** 152ms (Acceptable)
- **Availability:** 100%
- **Successful Transactions:** 45

## Next Steps
- Monitor for 24 hours
- Track key metrics
- Respond to incidents
- Complete post-release review

## Monitoring Dashboard
[View Live Dashboard](link)
```

---

## Action: Rollback

**Objective:** Rollback a problematic release

**Steps:**

### 1. Confirm Rollback Decision
```python
print("⚠️ WARNING: You are about to rollback release ${version}")
print("This will:")
print("- Revert application to previous version")
print("- Rollback database migrations")
print("- Restore previous configuration")
print()
confirm = input("Type 'ROLLBACK' to confirm: ")

if confirm != "ROLLBACK":
    return "Rollback cancelled"
```

### 2. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: execute_rollback
- Version: ${version}
- Reason: ${reason}
```

### 3. Expected Rollback Output

```markdown
# Release Rollback - ${version}
**Started:** 2024-06-30 08:30:00 UTC
**Reason:** Critical payment processing errors
**Status:** IN PROGRESS

## Rollback Steps

### 1. Enable Maintenance Mode ✅
- **Started:** 08:30:00
- **Completed:** 08:31:00
- **Status:** Users notified

### 2. Rollback Database ⏳
- **Started:** 08:32:00
- **Status:** In Progress
- **Rollback To:** v2.4.0 schema
- **Migrations to Undo:** 15

### 3. Deploy Previous Version (Pending)
- **Status:** Waiting for database rollback
- **Target Version:** v2.4.0

## Incident Details
- **Severity:** P1 - Critical
- **Impact:** Payment processing failing (error rate: 45%)
- **Users Affected:** ~500
- **Decision:** Immediate rollback

## Rollback Logs
```
[08:30:00] Rollback initiated
[08:31:00] Maintenance mode enabled
[08:32:00] Starting database rollback...
[08:35:00] Rolling back migrations...
```

## Rollback Complete ✅

**Completed:** 2024-06-30 08:55:00 UTC
**Duration:** 25 minutes
**Status:** SUCCESS

## Verification
- ✅ Database rolled back
- ✅ Application version: v2.4.0
- ✅ Smoke tests passed
- ✅ Payment processing restored
- ✅ Error rate: 0.4% (Normal)

## Post-Rollback Actions
1. ✅ Investigate payment processing issue
2. ✅ Fix identified bug (PORTAL-300)
3. ⏳ Plan hotfix release (v2.5.1)
4. ⏳ Conduct incident retrospective

## Incident Report
[Full Incident Report](link)
```

---

## Action: Calendar

**Objective:** View release calendar

**Steps:**

### 1. Activate Release Coordinator Agent
```
Use Task tool to activate release-coordinator agent with:
- Action: generate_calendar
- Year: 2024
```

### 2. Expected Calendar Output

```markdown
# Release Calendar 2024

## Q2 2024 (April - June)

### June 2024
- **June 15:** Code Freeze for v2.5.0
- **June 26:** QA Complete for v2.5.0
- **June 28:** Go/No-Go for v2.5.0
- **June 30:** 🚀 Release v2.5.0

## Q3 2024 (July - September)

### July 2024
- **July 15:** Planning for v2.6.0
- **July 30:** Sprint 1 Complete

### August 2024
- **August 15:** Code Freeze for v2.6.0
- **August 26:** QA Complete for v2.6.0
- **August 28:** Go/No-Go for v2.6.0
- **August 30:** 🚀 Release v2.6.0

### September 2024
- **Sept 15:** Planning for v3.0.0
- **Sept 30:** API v1 Deprecation

## Q4 2024 (October - December)

### October 2024
- **Oct 15:** Code Freeze for v3.0.0
- **Oct 28:** Go/No-Go for v3.0.0
- **Oct 31:** 🚀 Release v3.0.0 (Major Release)

### November 2024
- **Nov 15:** Planning for v3.1.0
- **Nov 25-29:** 🚫 Blackout Period (Thanksgiving)

### December 2024
- **Dec 1:** Code Freeze for v3.1.0
- **Dec 15:** 🚀 Release v3.1.0
- **Dec 20-31:** 🚫 Blackout Period (Holidays)

## Release Train Schedule

**Cadence:** Monthly releases
**Blackout Periods:**
- Thanksgiving Week
- December 20 - January 5
- Company All-Hands Week

**Release Windows:**
- Preferred: Last Friday of month, 02:00 UTC
- Hotfixes: Any Tuesday/Wednesday, 14:00 UTC
```

---

## Output Artifacts

All release outputs saved to:
```
/jira-orchestrator/sessions/releases/${version}/
  ├── plan.md
  ├── status.md
  ├── release-notes.md
  ├── readiness-assessment.md
  ├── go-no-go-decision.md
  ├── deployment-log.md
  └── rollback-log.md
```

## Best Practices

1. **Plan Early:** Start planning 6-8 weeks before release
2. **Regular Status:** Check status weekly
3. **Quality Gates:** Don't skip readiness assessment
4. **Clear Decisions:** Document all go/no-go decisions
5. **Monitor Closely:** Watch metrics for 24h post-release
6. **Learn:** Conduct retrospective after each release

---

**Version:** 1.0.0
**Command Type:** Release Management
**Agent:** release-coordinator
