# Jira Orchestrator Metrics

This directory stores all metrics and analytics data for the jira-orchestrator plugin.

## Directory Structure

```
metrics/
├── orchestrations/           # Per-orchestration session data
│   └── {issue-key}/
│       ├── metadata.json    # Orchestration metadata
│       ├── phases.json      # Phase timing and status
│       ├── agents.json      # Agent execution records
│       └── events.json      # Event timeline
│
├── aggregated/              # Aggregated metrics
│   ├── daily/
│   │   └── {YYYY-MM-DD}.json
│   ├── weekly/
│   │   └── {YYYY-WW}.json
│   └── monthly/
│       └── {YYYY-MM}.json
│
├── sla/                     # SLA tracking
│   ├── definitions.json     # SLA definitions per issue type
│   ├── violations.json      # SLA breach log
│   └── compliance.json      # Compliance rates
│
├── quality/                 # Quality metrics
│   ├── test-coverage.json   # Test coverage trends
│   ├── bug-rates.json       # Bug escape rates
│   └── rework.json          # Rework percentage
│
├── agents/                  # Agent performance
│   ├── success-rates.json   # Per-agent success rates
│   ├── execution-times.json # Average execution times
│   └── cost-analysis.json   # Cost per agent/model
│
└── dashboards/              # Generated dashboards
    └── dashboard-{date}.md
```

## Data Retention

- **Orchestration data**: 90 days
- **Aggregated daily**: 1 year
- **Aggregated weekly**: 2 years
- **Aggregated monthly**: 5 years
- **SLA violations**: Indefinite
- **Dashboards**: 30 days

## Usage

Metrics are collected automatically by the orchestration system and analyzed by the `metrics-dashboard` agent.

To generate a dashboard:

```bash
# Generate ASCII dashboard for today
claude-code --agent metrics-dashboard "Generate metrics dashboard for today"

# Generate markdown report for this week
claude-code --agent metrics-dashboard "Generate weekly metrics report"

# Post dashboard to Jira issue
claude-code --agent metrics-dashboard "Post metrics dashboard to PROJ-123"
```

## Metric Definitions

### Success Rate
Percentage of orchestrations completed successfully without critical failures.

Formula: `(successful_completions / total_completions) * 100`

### SLA Compliance
Percentage of issues meeting defined response and resolution time SLAs.

Formula: `(issues_meeting_sla / total_issues) * 100`

### Bug Escape Rate
Percentage of bugs found in production vs total bugs found.

Formula: `(production_bugs / total_bugs) * 100`

### First-time Pass Rate
Percentage of issues passing all validation on first attempt.

Formula: `(first_time_passes / total_issues) * 100`

### Lead Time
Time from issue creation to completion.

Calculation: `completion_time - creation_time`

### Cycle Time
Time spent actively working on an issue (excludes wait time).

Calculation: Sum of all phase durations

## Integration

The metrics system integrates with:

- **Jira** - Issue data and status tracking
- **GitHub** - Code changes and PR metrics
- **Obsidian** - Long-term metric storage and reporting
- **Orchestration System** - Real-time event collection

## Configuration

SLA definitions can be customized in `sla/definitions.json`.

Default targets:
- Test coverage: 90%
- Bug escape rate: ≤5%
- First-time pass rate: 80%
- Rework percentage: ≤10%
- SLA compliance: 90%

## Troubleshooting

If metrics are missing:
1. Check that orchestration events are being logged
2. Verify file permissions on metrics directory
3. Ensure agents have access to MCP tools
4. Review agent logs for errors

## Contributing

To add new metrics:
1. Define metric in appropriate JSON file
2. Update `metrics-dashboard` agent with calculation logic
3. Add metric to dashboard templates
4. Document metric definition above
