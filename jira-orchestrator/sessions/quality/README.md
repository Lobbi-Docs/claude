# Quality Intelligence Data Storage

This directory stores all quality intelligence data collected and analyzed by the `quality-intelligence` agent.

## Directory Structure

```
quality/
├── technical-debt/          # Technical debt tracking
│   ├── debt-registry.json          # All tracked debt items
│   ├── debt-trends.json            # Historical debt metrics
│   ├── debt-priority.json          # Prioritized debt backlog
│   └── debt-interest.json          # Cost of delay calculations
│
├── health-scores/           # Health scoring data
│   ├── overall-health.json         # Overall health scores over time
│   ├── security-score.json         # Security health tracking
│   ├── maintainability-score.json  # Maintainability metrics
│   ├── performance-score.json      # Performance health
│   └── reliability-score.json      # Reliability metrics
│
├── trends/                  # Quality trend analysis
│   ├── quality-trends.json         # Overall quality trends
│   ├── coverage-trends.json        # Test coverage over time
│   ├── bug-density-trends.json     # Bug rates over time
│   ├── complexity-trends.json      # Complexity evolution
│   └── churn-trends.json           # Code churn patterns
│
├── hotspots/                # Hotspot detection results
│   ├── high-churn-files.json       # Frequently changing files
│   ├── bug-prone-files.json        # Files with high bug rates
│   ├── coupling-analysis.json      # Dependency coupling
│   └── risk-matrix.json            # Churn vs complexity risk
│
├── security/                # Security intelligence
│   ├── vulnerability-trends.json   # CVE and vuln tracking
│   ├── security-debt.json          # Security debt items
│   ├── dependency-health.json      # Dependency status
│   └── security-posture.json       # Overall security metrics
│
├── predictions/             # Predictive quality analytics
│   ├── bug-predictions.json        # Predicted bug likelihood
│   ├── risk-scores.json            # Risk scores for changes
│   ├── quality-gates.json          # Recommended quality gates
│   └── coverage-recommendations.json
│
├── reports/                 # Generated reports and dashboards
│   ├── dashboard-{timestamp}.json  # Generated dashboards
│   ├── sprint-report-{id}.md       # Sprint quality reports
│   ├── release-report-{version}.md # Release quality reports
│   └── executive-summary-{date}.md # Executive summaries
│
└── benchmarks/              # Benchmark data
    ├── industry-benchmarks.json    # Industry standard metrics
    └── project-baselines.json      # Project baseline metrics
```

## Data Retention

- **Daily snapshots**: Kept for 90 days
- **Weekly aggregates**: Kept for 1 year
- **Monthly summaries**: Kept indefinitely
- **Reports**: Kept for 1 year (archive older reports to Obsidian vault)

## Usage

### Initialize Baseline

```bash
# Run initial quality analysis to establish baseline
quality-intelligence calculate-health --save-baseline
```

### Daily Quality Snapshot

```bash
# Collect daily quality metrics (run in CI/CD)
quality-intelligence snapshot --save
```

### Generate Reports

```bash
# Weekly quality report
quality-intelligence report --period weekly

# Sprint retrospective report
quality-intelligence sprint-report --sprint-id SPRINT-123

# Release quality report
quality-intelligence release-report --version 2.0.0
```

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# .github/workflows/quality-intelligence.yml
name: Quality Intelligence
on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  quality-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Quality Intelligence
        run: |
          quality-intelligence snapshot
          quality-intelligence analyze-hotspots
          quality-intelligence predict-bugs

      - name: Generate Dashboard
        run: quality-intelligence dashboard --save

      - name: Check Quality Gates
        run: quality-intelligence validate-gates --fail-on-critical
```

## Data Format Examples

### Debt Registry Item

```json
{
  "id": "DEBT-001",
  "type": "code_smell",
  "severity": "high",
  "file": "src/services/UserService.ts",
  "line": 45,
  "description": "Complex method with cyclomatic complexity of 28",
  "estimatedHours": 8,
  "businessImpact": 7,
  "technicalImpact": 8,
  "createdDate": "2025-11-15T10:00:00Z",
  "lastModified": "2025-11-15T10:00:00Z"
}
```

### Health Score Snapshot

```json
{
  "timestamp": "2025-12-22T10:30:00Z",
  "score": 78,
  "grade": "C",
  "components": {
    "security": 82,
    "maintainability": 75,
    "performance": 80,
    "reliability": 76
  },
  "trend": "improving"
}
```

### Hotspot Entry

```json
{
  "file": "src/components/Dashboard.tsx",
  "churnScore": 45,
  "complexityScore": 18,
  "bugDensity": 8.5,
  "riskQuadrant": "critical",
  "recommendedAction": "Immediate refactoring required. High risk of bugs."
}
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Scores are normalized to 0-100 scale
- Risk levels: `critical`, `high`, `medium`, `low`
- Trends: `improving`, `stable`, `declining`
- All data files are in JSON format for easy parsing and analysis

## Maintenance

Clean up old data:

```bash
# Remove snapshots older than 90 days
find quality/trends/ -name "*.json" -mtime +90 -delete

# Archive old reports to Obsidian vault
quality-intelligence archive-reports --older-than 365
```

---

**Quality Intelligence Data Store - v1.0.0**
