# Metrics Dashboard Agent - Quick Start Guide

## Overview

The **metrics-dashboard** agent provides comprehensive real-time monitoring and analytics for the jira-orchestrator plugin. It tracks orchestration performance, SLA compliance, quality metrics, throughput, and agent performance.

## Agent Details

- **File:** `/home/user/claude/jira-orchestrator/agents/metrics-dashboard.md`
- **Model:** Haiku (fast, cost-effective for metrics)
- **Size:** 1,703 lines, 44KB
- **Color:** Cyan

## Key Features

### 1. Real-time Orchestration Metrics
- Active orchestrations count
- Phase distribution tracking
- Agent utilization rates
- Success/failure rates
- Average completion times

### 2. SLA Tracking
- Pre-configured SLAs for all issue types and priorities
- Real-time compliance monitoring
- Automatic violation detection and alerting
- SLA breach predictions using velocity analysis
- Escalation policies for critical breaches

### 3. Quality Metrics
- Test coverage trends (unit, integration, e2e)
- Bug escape rate tracking
- Rework percentage analysis
- First-time pass rate monitoring

### 4. Throughput Metrics
- Issues completed per day/week/month
- Story points delivered
- Lead time distribution (creation to completion)
- Cycle time breakdown (time per phase)

### 5. Agent Performance
- Success rate per agent
- Average execution time per agent
- Cost analysis (opus vs sonnet vs haiku)
- Agent utilization and bottleneck detection

### 6. Dashboard Generation
- **ASCII Dashboard** - Console-friendly with box drawing
- **Markdown Dashboard** - For Jira comments and documentation
- **JSON Dashboard** - For API consumption and automation
- **Confluence Page** - Monthly reports with charts and trends

## Directory Structure

```
/home/user/claude/jira-orchestrator/sessions/metrics/
├── orchestrations/           # Per-issue orchestration data
├── aggregated/              # Daily/weekly/monthly rollups
│   ├── daily/
│   ├── weekly/
│   └── monthly/
├── sla/                     # SLA definitions and tracking
│   ├── definitions.json     # SLA configs (customizable)
│   ├── violations.json      # Breach log
│   └── compliance.json      # Compliance rates
├── quality/                 # Quality metrics
│   ├── test-coverage.json
│   ├── bug-rates.json
│   └── rework.json
├── agents/                  # Agent performance data
│   ├── success-rates.json
│   ├── execution-times.json
│   └── cost-analysis.json
└── dashboards/              # Generated dashboards
```

## Usage Examples

### Example 1: Generate Daily Dashboard

```bash
# Generate ASCII dashboard for console viewing
Generate metrics dashboard for today in ASCII format
```

**Output:** Real-time dashboard with all current metrics in box-drawing ASCII format

### Example 2: Weekly Report

```bash
# Generate markdown report for the week
Generate weekly metrics report in markdown format
```

**Output:** Comprehensive markdown report with trends and comparisons

### Example 3: SLA Violation Alert

```bash
# Check for SLA violations and generate alert report
Check SLA compliance and highlight any violations or at-risk issues
```

**Output:** Focused report on SLA violations with recommended actions

### Example 4: Agent Performance Analysis

```bash
# Analyze agent performance and identify optimization opportunities
Analyze agent performance for last 7 days, identify cost optimization opportunities
```

**Output:** Detailed agent metrics with cost savings recommendations

### Example 5: Post to Jira

```bash
# Post dashboard as Jira comment
Generate metrics dashboard and post as comment to PROJ-123
```

**Output:** Formatted dashboard posted as Jira comment

### Example 6: Monthly Report to Confluence

```bash
# Generate comprehensive monthly report
Generate monthly metrics report for December and save to Confluence
```

**Output:** Full monthly report saved to Obsidian vault (synced to Confluence)

## SLA Configuration

SLAs are defined in `/home/user/claude/jira-orchestrator/sessions/metrics/sla/definitions.json`

### Default SLA Times

**Bugs:**
- **Highest:** 15m response, 4h resolution (24/7)
- **High:** 1h response, 24h resolution (24/7)
- **Medium:** 4h response, 72h resolution (business hours)
- **Low:** 24h response, 168h resolution (business hours)

**Stories:**
- **Highest:** 2h response, 16h resolution
- **High:** 8h response, 40h resolution
- **Medium:** 24h response, 80h resolution

**Tasks:**
- **High:** 4h response, 24h resolution
- **Medium:** 24h response, 80h resolution

**Epics:**
- **Highest:** 4h response, 80h resolution
- **High:** 24h response, 160h resolution

### Customizing SLAs

Edit `definitions.json` to adjust:
- Response and resolution times
- Business hours vs 24/7
- Escalation policies
- Holiday calendar

## Metric Calculation Formulas

### Success Rate
```
(successful_completions / total_completions) × 100
```

### SLA Compliance
```
(issues_meeting_sla / total_issues) × 100
```

### Bug Escape Rate
```
(production_bugs / total_bugs_found) × 100
```

### First-time Pass Rate
```
(first_time_passes / total_issues) × 100
```

### Lead Time
```
completion_time - creation_time
```

### Cycle Time
```
Sum of all phase durations (excludes wait time)
```

### Agent Success Rate
```
(successful_executions / total_executions) × 100
```

### Cost per Issue
```
Sum of (agent_executions × cost_per_model)
```

## Dashboard Templates

### ASCII Dashboard
- Box-drawing characters for visual appeal
- Progress bars for percentages
- Color-coded status indicators
- Compact console-friendly format

### Markdown Dashboard
- Tables for structured data
- Progress bars using Unicode blocks
- Emoji indicators (✅ ⚠️ 🔴)
- Collapsible sections
- Suitable for Jira comments

### JSON Dashboard
- Structured data for API consumption
- Nested metrics by category
- ISO timestamps
- Machine-readable format

### Confluence Page
- Full monthly report
- Trend charts (when available)
- Executive summary
- Detailed breakdowns
- Recommendations section

## Metrics Targets

| Metric | Target | Current Default |
|--------|--------|-----------------|
| **Test Coverage** | ≥90% | 0% (no data yet) |
| **Bug Escape Rate** | ≤5% | 0% (no data yet) |
| **First-time Pass Rate** | ≥80% | 0% (no data yet) |
| **Rework Percentage** | ≤10% | 0% (no data yet) |
| **SLA Compliance** | ≥90% | 0% (no data yet) |
| **Agent Success Rate** | ≥95% | 0% (no data yet) |

## Integration Points

The metrics dashboard integrates with:

- **All orchestration agents** - Collects execution metrics
- **triage-agent** - Issue classification data
- **completion-orchestrator** - Completion time tracking
- **test-strategist** - Test coverage data
- **qa-ticket-reviewer** - Quality metrics
- **worklog-manager** - Time tracking data
- **Jira MCP** - Real-time issue data
- **Obsidian MCP** - Long-term metric storage

## Data Collection

Metrics are collected automatically through:

1. **Event Logging** - Orchestration events logged to `events.json`
2. **Phase Tracking** - Phase durations and status in `phases.json`
3. **Agent Execution** - Agent performance in `agents.json`
4. **Aggregation** - Daily/weekly/monthly rollups

## Data Retention

- **Orchestration data:** 90 days
- **Aggregated daily:** 1 year
- **Aggregated weekly:** 2 years
- **Aggregated monthly:** 5 years
- **SLA violations:** Indefinite
- **Dashboards:** 30 days

## Performance Optimization

The agent is optimized for:
- **Fast execution** - Haiku model for speed
- **Low cost** - Efficient metric calculations
- **Scalability** - Handles thousands of orchestrations
- **Real-time** - Live data from active orchestrations

## Troubleshooting

### No Metrics Showing

**Cause:** No orchestrations have been tracked yet

**Solution:** Start using the orchestration system, metrics will accumulate automatically

### SLA Violations Not Detected

**Cause:** Issue priority or type not in SLA definitions

**Solution:** Add custom SLA rules to `definitions.json`

### Agent Performance Data Missing

**Cause:** Agents not logging execution metrics

**Solution:** Ensure agents write to metrics files during execution

### Dashboard Format Issues

**Cause:** Terminal doesn't support box-drawing characters

**Solution:** Use markdown or JSON format instead of ASCII

## Best Practices

1. **Review Daily** - Check dashboard each morning for violations
2. **Analyze Trends** - Look for patterns in weekly reports
3. **Optimize Costs** - Use cost analysis to identify savings
4. **Track Quality** - Monitor test coverage and bug rates
5. **Adjust SLAs** - Refine SLAs based on actual performance
6. **Share Reports** - Post monthly reports to team channels

## Future Enhancements

Planned features:
- Automated SLA alerting via Slack/email
- Predictive analytics for capacity planning
- Custom metric definitions
- Chart generation for dashboards
- Historical trend analysis
- Anomaly detection
- Team leaderboards
- Sprint burndown integration

## Support

For questions or issues with the metrics dashboard:
1. Check the agent file: `/home/user/claude/jira-orchestrator/agents/metrics-dashboard.md`
2. Review metrics README: `/home/user/claude/jira-orchestrator/sessions/metrics/README.md`
3. Inspect metric files for data issues
4. Verify MCP tool connectivity

---

**Created:** 2025-12-22
**Agent Version:** 1.0
**Last Updated:** 2025-12-22
