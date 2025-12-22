# Quality Intelligence - Quick Start Guide

## Overview

The Quality Intelligence agent provides comprehensive code quality analytics, technical debt tracking, and predictive quality metrics for your jira-orchestrator workflow.

## Getting Started

### 1. Run Initial Quality Analysis

```bash
# Navigate to your project
cd /path/to/your/project

# Run complete quality analysis
quality-intelligence analyze-all

# This will:
# - Scan for technical debt
# - Calculate health scores
# - Identify hotspots
# - Analyze security posture
# - Generate baseline metrics
```

### 2. Establish Project Baseline

```bash
# Set your project baseline (run once at project start)
quality-intelligence establish-baseline

# This creates:
# - Current quality snapshot
# - Quality targets
# - Quality gates based on your project needs
```

### 3. Daily Quality Monitoring (CI/CD Integration)

Add to your `.github/workflows/quality.yml`:

```yaml
name: Quality Intelligence
on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for trend analysis

      - name: Install Dependencies
        run: npm install

      - name: Run Tests with Coverage
        run: npm run test:coverage

      - name: Security Audit
        run: npm audit --json > /tmp/npm-audit.json || true

      - name: Quality Intelligence Analysis
        run: |
          # Collect quality snapshot
          quality-intelligence snapshot

          # Analyze hotspots
          quality-intelligence analyze-hotspots

          # Predict bugs for changed files
          quality-intelligence predict-bugs

          # Assess change risk
          quality-intelligence assess-risk

      - name: Generate Quality Dashboard
        run: quality-intelligence dashboard

      - name: Validate Quality Gates
        run: quality-intelligence validate-gates --fail-on-critical
```

## Common Use Cases

### Use Case 1: Pre-Merge Quality Check

```bash
# Before creating a PR
git checkout feature/my-feature

# Run quality analysis on changes
quality-intelligence analyze-changes

# Get risk assessment
quality-intelligence assess-risk --commit HEAD

# Get recommended quality gates
quality-intelligence recommend-gates

# Generate review context for code-reviewer
quality-intelligence export-review-context > /tmp/review-context.json
```

### Use Case 2: Sprint Retrospective

```bash
# At end of sprint
quality-intelligence sprint-report --sprint-id SPRINT-123

# This generates:
# - Quality trend analysis for the sprint
# - Technical debt added vs paid down
# - Hotspots that emerged
# - Quality gate compliance
# - Recommendations for next sprint
```

### Use Case 3: Release Quality Report

```bash
# Before major release
quality-intelligence release-report --version 2.0.0

# This includes:
# - Overall health score vs baseline
# - Security posture assessment
# - Critical issues summary
# - Risk assessment
# - Production readiness checklist
```

### Use Case 4: Technical Debt Management

```bash
# Scan for technical debt
quality-intelligence scan-debt

# Calculate debt score and interest
quality-intelligence calculate-debt-score

# Prioritize debt items
quality-intelligence prioritize-debt

# Export to Jira for sprint planning
quality-intelligence export-debt --format jira --sprint SPRINT-124
```

### Use Case 5: Hotspot Analysis

```bash
# Identify problematic areas
quality-intelligence analyze-hotspots

# Get high-churn files
quality-intelligence high-churn --top 20

# Get bug-prone files
quality-intelligence bug-prone --top 20

# Generate risk matrix
quality-intelligence risk-matrix

# Create refactoring tickets
quality-intelligence create-refactoring-tickets --risk critical
```

## Integration with Other Agents

### With Code Reviewer

```bash
# 1. Quality Intelligence runs first
quality-intelligence analyze-changes --export-context

# 2. Code Reviewer uses quality context
code-reviewer review --with-quality-context

# 3. Quality Intelligence learns from review
quality-intelligence learn-from-review
```

### With PR Creator

```bash
# 1. Get quality assessment
quality-intelligence assess-pr-readiness

# 2. Create PR with quality report
pr-creator create --include-quality-report

# Quality metrics automatically added to PR description
```

### With Test Strategist

```bash
# 1. Get coverage recommendations
quality-intelligence recommend-tests

# 2. Test Strategist uses recommendations
test-strategist generate-tests --priority quality-gaps
```

## Interpreting Results

### Health Score (0-100)

| Score | Grade | Status | Action Required |
|-------|-------|--------|-----------------|
| 90-100 | A | Excellent | Maintain |
| 80-89 | B | Good | Monitor |
| 70-79 | C | Fair | Improve |
| 60-69 | D | Poor | Action Needed |
| 0-59 | F | Critical | Immediate Action |

**Health Score Components:**
- Security: 30%
- Maintainability: 35%
- Performance: 20%
- Reliability: 15%

### Technical Debt Ratio

**Formula:** Debt Hours / 1000 Lines of Code

| Ratio | Assessment | Action |
|-------|------------|--------|
| < 3 | Excellent | Continue practices |
| 3-5 | Good | Monitor trends |
| 5-10 | Fair | Allocate 20% capacity |
| 10-15 | Poor | Allocate 30% capacity |
| > 15 | Critical | Dedicated cleanup sprint |

### Risk Quadrants

**Churn vs Complexity Matrix:**

```
High Complexity
     │
     │  Refactor       │  CRITICAL
     │  Candidate      │  (Fix Now!)
     │                │
─────┼────────────────┼─────────── High Churn
     │                │
     │  Stable        │  Monitor
     │  (Good)        │  (Volatile)
     │                │
Low Complexity
```

### Bug Prediction

| Likelihood | Action | Testing Strategy |
|------------|--------|------------------|
| > 80% | Comprehensive review + pair programming | 100% coverage required |
| 60-80% | Thorough review | 90% coverage required |
| 40-60% | Standard review | 80% coverage required |
| 20-40% | Light review | Standard coverage |
| < 20% | Standard process | Standard coverage |

## Quality Metrics Reference

### Key Metrics to Track

1. **Overall Health Score** - Primary quality indicator
2. **Test Coverage** - % of code tested
3. **Bug Density** - Bugs per 1000 LOC
4. **Technical Debt Ratio** - Debt hours per 1000 LOC
5. **Security Posture** - Security health score
6. **Cyclomatic Complexity** - Code complexity measure
7. **Code Churn Rate** - Change frequency
8. **MTTR** - Mean time to resolve issues

### Quality Gates by Risk Level

**Low Risk Changes:**
- Test Coverage: ≥ 70%
- Critical Vulnerabilities: 0
- Complexity: ≤ 15

**Medium Risk Changes:**
- Test Coverage: ≥ 80%
- Critical + High Vulnerabilities: 0
- Complexity: ≤ 12

**High Risk Changes:**
- Test Coverage: ≥ 85%
- Critical + High Vulnerabilities: 0
- Complexity: ≤ 10
- Peer Review: Required

**Critical Risk Changes:**
- Test Coverage: ≥ 90%
- All Vulnerabilities: 0
- Complexity: ≤ 8
- Senior Peer Review: 2+ reviewers
- Deployment: Staged rollout required

## Troubleshooting

### Issue: No historical data for trends

**Solution:**
```bash
# Run daily snapshots for at least 7 days
quality-intelligence snapshot --daily

# Or backfill from git history
quality-intelligence backfill-history --days 30
```

### Issue: Inaccurate bug predictions

**Solution:**
```bash
# Retrain model with actual bug data
quality-intelligence train-bug-model --training-data /path/to/bugs.json

# Minimum 50 bug samples recommended
```

### Issue: Too many technical debt items

**Solution:**
```bash
# Filter critical items only
quality-intelligence scan-debt --severity critical,high

# Set debt thresholds
quality-intelligence configure --debt-threshold 100
```

### Issue: Slow analysis on large codebase

**Solution:**
```bash
# Incremental analysis (only changed files)
quality-intelligence snapshot --incremental

# Exclude directories
quality-intelligence configure --exclude "node_modules,dist,build"
```

## Data Storage Location

All quality data is stored in:
```
/home/user/claude/jira-orchestrator/sessions/quality/
```

Structure:
- `technical-debt/` - Debt tracking
- `health-scores/` - Health metrics
- `trends/` - Trend analysis
- `hotspots/` - Hotspot detection
- `security/` - Security intelligence
- `predictions/` - Predictive analytics
- `reports/` - Generated reports
- `benchmarks/` - Baseline and industry benchmarks

## Best Practices

### 1. Daily Snapshots
Run quality snapshots daily via CI/CD to build trend history.

### 2. Sprint Planning
Review technical debt and hotspots during sprint planning.

### 3. Pre-Merge Checks
Always run change risk assessment before merging to main.

### 4. Debt Allocation
Allocate 20% of sprint capacity to technical debt repayment.

### 5. Quality Gates
Adjust gates based on change risk - higher risk = stricter gates.

### 6. Security First
Zero tolerance for critical vulnerabilities in production.

### 7. Benchmark Comparison
Compare to industry benchmarks quarterly, adjust targets accordingly.

### 8. Continuous Learning
Update bug prediction models monthly with actual defect data.

## Next Steps

1. ✅ Run initial quality analysis
2. ✅ Establish project baseline
3. ✅ Configure CI/CD integration
4. ✅ Set up quality gates
5. ✅ Review first quality dashboard
6. ✅ Create debt backlog in Jira
7. ✅ Schedule weekly quality reviews
8. ✅ Set sprint quality targets

## Resources

- **Agent Documentation:** `/home/user/claude/jira-orchestrator/agents/quality-intelligence.md`
- **Data Directory:** `/home/user/claude/jira-orchestrator/sessions/quality/`
- **Industry Benchmarks:** `sessions/quality/benchmarks/industry-benchmarks.json`
- **Project Baseline:** `sessions/quality/benchmarks/project-baselines.json`

## Support

For issues or questions:
- Check agent documentation
- Review example reports in `sessions/quality/reports/`
- Consult industry benchmarks for comparison
- Verify data directory structure matches README

---

**Quality Intelligence Agent - Driving Data-Driven Quality Improvements**

*Remember: Quality is a journey, not a destination. Continuous monitoring and improvement are key to long-term success.*
