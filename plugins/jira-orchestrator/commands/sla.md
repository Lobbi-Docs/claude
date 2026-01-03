---
name: jira:sla
description: Monitor SLA status, configure SLA rules, generate SLA reports, and analyze SLA breaches
arguments:
  - name: action
    description: status|configure|report|breach-analysis|dashboard
    required: true
  - name: target
    description: Issue key, priority (critical|high|medium|low), or 'all'
    required: false
  - name: time_period
    description: daily|weekly|monthly|quarterly|custom
    default: weekly
  - name: format
    description: summary|detailed|json|csv
    default: summary
version: 1.0.0
---

# Jira SLA Management Command

Monitor, configure, report on, and analyze SLA compliance across issues.

## Actions

| Action | Purpose | Args |
|--------|---------|------|
| **status** | Check SLA status | target, (format) |
| **configure** | Set SLA rules | target |
| **report** | Generate SLA report | target, time_period, (format) |
| **breach-analysis** | Analyze breaches | target, time_period |
| **dashboard** | Real-time monitoring | (auto-refresh) |

### Status
1. Parse target: issue key, priority, or 'all'
2. Calculate SLA for: first response, resolution, update frequency
3. Format output: summary (table), detailed (all metrics), json, or csv
4. Add recommendations if at-risk or breached
5. Show breach predictions with confidence levels

### Configure
1. Display current SLA rules
2. Prompt for changes (first response, resolution, update freq, business hours)
3. Validate: response < resolution, thresholds 50-95%, timezones valid
4. Apply changes, recalculate affected issues
5. Notify teams of changes

### Report
1. Collect data per time period: daily|weekly|monthly|quarterly|custom
2. Calculate overall metrics: compliance %, breaches, avg times, CSAT
3. Analyze trends: WoW/MoW comparison, anomalies
4. Generate output: summary|detailed|json|csv
5. Save to Obsidian vault

### Breach Analysis
1. Aggregate breach data by type, priority, tier
2. Perform root cause analysis: staffing, complexity, external deps, process, infrastructure
3. Identify patterns: time-of-day, day-of-week, teams, repeat issues
4. List preventive measures: implemented, in-progress, recommended
5. Flag compliance impacts (SOC2, contracts)

### Dashboard
1. Show real-time status: priority summary table
2. Alert on critical/at-risk issues
3. Display team workload capacity
4. Show 24h metrics: resolved, compliance %, breaches, avg times
5. Auto-refresh every 60 seconds

## Implementation

**Agent:** sla-monitor | **Calculations:** first response, resolution, update frequency

SLA Tracking:
- Business hours support (timezone-aware)
- Pause time tracking (customer wait, blocked, etc.)
- Breach prediction with confidence scoring
- Tier-based multipliers (Enterprise 0.5x, Premium 0.75x, Standard 1.0x)

## Best Practices

1. **Status:** Review weekly, prioritize at-risk issues
2. **Configure:** Validate before applying, test impact
3. **Reports:** Save monthly for compliance/trends
4. **Breach Analysis:** Use patterns to prevent future breaches
5. **Dashboard:** Monitor critical issues 24/7

---

**Golden Armada Signature:** This command provides comprehensive SLA lifecycle management with automated calculation, reporting, and breach analysis to maintain service level compliance and identify improvement opportunities.

**Version:** 1.0.0 | **Type:** SLA Management | **Agent:** sla-monitor
