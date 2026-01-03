---
name: jira:release
description: Multi-project release planning, coordination, and execution with automated release notes, go/no-go decisions, and rollback management
arguments:
  - name: action
    description: plan|status|notes|readiness|go-no-go|deploy|rollback|calendar
    required: true
  - name: version
    description: Release version (e.g., v2.5.0). Required for most actions.
    required: false
  - name: projects
    description: Comma-separated project keys. Auto-detected from version if omitted.
    required: false
  - name: date
    description: Release date (YYYY-MM-DD). Required for 'plan' action.
    required: false
version: 1.0.0
---

# Release Management Command

Execute Jira Release Management actions: **${action}** | **Version:** ${version} | **Date:** ${date}

## Actions

| Action | Purpose | Required Args |
|--------|---------|---------------|
| **plan** | Create release plan | version, date |
| **status** | Check release progress | version |
| **notes** | Generate release notes | version |
| **readiness** | Assess go/no-go | version |
| **go-no-go** | Formal go/no-go decision | version |
| **deploy** | Execute deployment | version |
| **rollback** | Rollback release | version |
| **calendar** | View release schedule | (optional) |

### Plan
1. Validate version + date (YYYY-MM-DD format)
2. Activate release-coordinator agent
3. Generate plan: scope, timeline, risks, team allocation
4. Create Jira versions, link issues, notify stakeholders

### Status
1. Query release version data
2. Calculate completion % by type/project
3. Identify blockers and risks
4. Show upcoming milestones

### Notes
1. Aggregate all issues in version
2. Categorize: features, bugs, improvements
3. Generate formatted release notes
4. Publish to Confluence + Harness Code

### Readiness
1. Score against criteria: completion, blockers, quality, tests, security
2. Show risk assessment
3. Recommend GO/NO-GO/CONDITIONAL
4. Document decision

### Go-No-Go
1. Run readiness assessment first
2. Conduct formal review meeting
3. Verify all criteria met
4. Collect stakeholder sign-offs
5. Document decision with rollback triggers

### Deploy
1. Verify GO decision + checklist complete
2. Database migration
3. Backend services
4. Frontend applications
5. Smoke tests + health checks
6. Enable monitoring

### Rollback
1. Confirm decision (safety check)
2. Enable maintenance mode
3. Revert database migrations
4. Deploy previous version
5. Run smoke tests + verify SLAs

### Calendar
1. Show quarterly release schedule
2. Mark blackout periods (holidays, all-hands)
3. Preferred windows: last Friday 02:00 UTC
4. Hotfix windows: Tue/Wed 14:00 UTC

## Implementation

**Agent:** release-coordinator | **Output Path:** `/jira-orchestrator/sessions/releases/${version}/`

Artifacts: plan.md, status.md, release-notes.md, readiness-assessment.md, go-no-go-decision.md, deployment-log.md, rollback-log.md

## Best Practices

1. Plan 6-8 weeks before release
2. Check status weekly
3. Run readiness assessment before go/no-go
4. Document all decisions
5. Monitor 24h post-release
6. Conduct retrospectives

---

**Golden Armada Signature:** This command orchestrates multi-project releases with automated coordination, quality gates, and rollback management capabilities.

**Version:** 1.0.0 | **Type:** Release Management | **Agent:** release-coordinator
