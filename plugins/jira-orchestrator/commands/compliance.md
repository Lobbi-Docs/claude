---
name: jira:compliance
description: Generate compliance reports, track controls, export audit evidence, and manage exceptions for SOC2, GDPR, and ISO27001
arguments:
  - name: action
    description: Action (report|controls|evidence|exceptions|dashboard)
    required: true
  - name: framework
    description: Framework (SOC2|GDPR|ISO27001|ALL)
    required: false
    default: ALL
  - name: time_period
    description: Period (monthly|quarterly|annual)
    default: monthly
  - name: format
    description: Format (summary|detailed|audit|json)
    default: summary
---

# Compliance Management Command

Comprehensive compliance reporting, control tracking, and audit evidence management for SOC2, GDPR, and ISO27001 frameworks.

## Quick Usage

```bash
/jira:compliance report ALL monthly                    # All frameworks
/jira:compliance report SOC2 quarterly audit           # SOC2 audit-ready
/jira:compliance controls GDPR                         # Control status
/jira:compliance evidence SOC2:CC7.2                   # Export evidence
/jira:compliance exceptions ALL                        # All exceptions
/jira:compliance dashboard                             # Real-time view
```

## 1. Report Action

Generate compliance reports for audit and certification.

**Syntax:**
```bash
/jira:compliance report <framework> <time_period> [format]
```

**Report Flow:**
- Collect evidence from Jira (via JQL)
- Calculate control effectiveness scores
- Identify gaps and exceptions
- Generate findings by severity
- Create remediation plans
- Export in requested format
- Save to Obsidian vault

**Framework Controls:**
- SOC2: CC1-CC9 (control environment, operations, change mgmt)
- GDPR: Articles 5, 15, 17, 32, 33, 35 (principles, rights, security)
- ISO27001: A5-A18 (all control categories)

**Scoring Logic:**
- >= 70% effectiveness: PASS
- < 70% effectiveness: FAIL (requires remediation)
- Weighted by completeness, timeliness, quality

**Report Formats:**
- summary: Executive overview with key findings
- detailed: All controls with evidence breakdown
- audit: Audit-ready package with evidence links
- json: Machine-readable export

## 2. Controls Action

View control effectiveness for a specific framework.

**Syntax:**
```bash
/jira:compliance controls <framework>
```

**Output:** Status table by control with scores, evidence count, and assessment date

## 3. Evidence Action

Export audit evidence for a specific control.

**Syntax:**
```bash
/jira:compliance evidence <framework:control_id> [format]
```

**Collects:**
- Monitoring/incident data from Jira (JQL search)
- SLA compliance reports
- Review records
- Assessment narratives

**Export:** Complete evidence package with audit narrative

## 4. Exceptions Action

Manage compliance exceptions and compensating controls.

**Syntax:**
```bash
/jira:compliance exceptions <framework|ALL> [status]
```

**Displays:**
- Exception ID, framework, control, risk level
- Business justification and impact
- Compensating controls (list)
- Approval details and expiration dates
- Remediation plan with milestones
- Alert if expiring < 30 days

## 5. Dashboard Action

Real-time compliance status dashboard.

**Syntax:**
```bash
/jira:compliance dashboard [auto-refresh]
```

**Shows:**
- Framework compliance scores (table with progress bars)
- Critical/high/medium priority alerts
- Recent activity (7 days)
- Upcoming milestones with dates
- Overall target vs. current gap

## Implementation

**Agent:** compliance-reporter
**Collects evidence via:** Jira JQL queries
**Outputs:** PDF, JSON, CSV, Obsidian vault

## Key Metrics

| Metric | Target |
|--------|--------|
| Audit report generation | < 48 hours |
| Evidence auto-collection | > 80% |
| Control coverage | > 95% |
| Overall compliance score | > 95% |
| Exception resolution rate | > 90% before expiry |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Evidence not collected | Verify Jira labels, JQL queries, project config |
| Low control scores | Review evidence quality factors, documentation |
| Slow report generation | Use summary format; run detailed off-peak |

---

**⚓ Golden Armada** | *The Fleet Stands Ready*
