---
name: jira:enterprise
description: Enterprise features - notifications, approvals, portfolio, compliance, exports
arguments:
  - name: action
    description: Action (notify, approve, portfolio, release, batch, export, sla, compliance)
    required: true
  - name: options
    description: Action-specific options
    required: false
---

# /jira:enterprise

Consolidated command for all enterprise features. Most features are config-driven and auto-triggered via hooks.

## Quick Usage

```bash
# Configure notifications
/jira:enterprise notify --channel slack --webhook URL

# Start approval workflow
/jira:enterprise approve PROJ-123

# View portfolio dashboard
/jira:enterprise portfolio

# Generate compliance report
/jira:enterprise compliance SOC2
```

## Subcommands

| Action | Description | Example |
|--------|-------------|---------|
| `notify` | Configure alerts (Slack/Teams/Email) | `notify --channel slack` |
| `approve` | Multi-level approval workflows | `approve PROJ-123` |
| `portfolio` | Multi-project dashboard | `portfolio --projects PROJ,PLAT` |
| `release` | Release planning and notes | `release --version 2.0.0` |
| `batch` | Bulk operations | `batch transition "status = 'Done'"` |
| `export` | Generate reports | `export pdf --jql "project = PROJ"` |
| `sla` | SLA monitoring | `sla --tier enterprise` |
| `compliance` | Regulatory reports | `compliance SOC2` |

## Notifications (notify)

```bash
# Configure Slack notifications
/jira:enterprise notify --channel slack --webhook $SLACK_WEBHOOK

# Configure email
/jira:enterprise notify --channel email --recipients team@company.com

# Test notification
/jira:enterprise notify --test
```

**Config-driven:** Add to `.jira/config.yml`:
```yaml
notifications:
  slack:
    webhook: ${SLACK_WEBHOOK}
    channels:
      deployments: "#deployments"
      alerts: "#jira-alerts"
  events:
    - on_pr_merge
    - on_deploy
    - on_sla_breach
```

## Approvals (approve)

```bash
# Start approval workflow
/jira:enterprise approve PROJ-123

# View pending approvals
/jira:enterprise approve --pending

# Auto-approve based on rules
/jira:enterprise approve PROJ-123 --auto
```

## Portfolio (portfolio)

```bash
# Multi-project dashboard
/jira:enterprise portfolio

# Specific projects
/jira:enterprise portfolio --projects PROJ,PLAT,INFRA
```

## Releases (release)

```bash
# Generate release notes
/jira:enterprise release --version 2.0.0

# Plan release
/jira:enterprise release plan --date 2025-02-01
```

## Batch Operations (batch)

```bash
# Bulk transition
/jira:enterprise batch transition --jql "status = 'Done'" --to "Released"

# Bulk assign
/jira:enterprise batch assign --jql "assignee is EMPTY" --to @team-lead

# Bulk update
/jira:enterprise batch update --jql "project = PROJ" --set "labels += released"
```

## Exports (export)

```bash
# PDF report
/jira:enterprise export pdf --jql "project = PROJ AND sprint = 'Sprint 42'"

# Excel
/jira:enterprise export excel --output sprint-report.xlsx

# CSV
/jira:enterprise export csv --fields key,summary,status,assignee
```

## SLA Monitoring (sla)

```bash
# Check SLA status
/jira:enterprise sla

# By customer tier
/jira:enterprise sla --tier enterprise

# Breached items
/jira:enterprise sla --breached
```

## Compliance (compliance)

```bash
# SOC2 report
/jira:enterprise compliance SOC2

# GDPR audit
/jira:enterprise compliance GDPR

# ISO27001
/jira:enterprise compliance ISO27001 --output audit-report.pdf
```

## Replaces

This command consolidates:
- `/jira:notify` → `/jira:enterprise notify`
- `/jira:approve` → `/jira:enterprise approve`
- `/jira:portfolio` → `/jira:enterprise portfolio`
- `/jira:release` → `/jira:enterprise release`
- `/jira:batch` → `/jira:enterprise batch`
- `/jira:export` → `/jira:enterprise export`
- `/jira:sla` → `/jira:enterprise sla`
- `/jira:compliance` → `/jira:enterprise compliance`

Old commands still work as aliases.

## Configuration

Most enterprise features can be configured in `.jira/config.yml` to run automatically:

```yaml
enterprise:
  sla:
    enabled: true
    check_interval: 1h
    alert_threshold: 80%

  compliance:
    frameworks: [SOC2, GDPR]
    auto_report: weekly

  notifications:
    on_sla_breach: true
    on_approval_needed: true
```
