---
name: jira:compliance
description: Generate compliance reports, track controls, export audit evidence, and manage exceptions for SOC2, GDPR, and ISO27001
arguments:
  - name: action
    description: Action to perform (report|controls|evidence|exceptions|dashboard)
    required: true
  - name: framework
    description: Compliance framework (SOC2|GDPR|ISO27001|ALL)
    required: false
    default: ALL
  - name: time_period
    description: Time period for reports (monthly|quarterly|annual)
    default: monthly
  - name: format
    description: Output format (summary|detailed|audit|json)
    default: summary
---

# Jira Compliance Management Command

Comprehensive compliance reporting, control tracking, and audit evidence management for SOC2, GDPR, and ISO27001 frameworks.

## Usage Examples

```bash
# Generate compliance report for all frameworks
/jira:compliance report ALL monthly

# Generate SOC2 audit report
/jira:compliance report SOC2 quarterly audit

# View control effectiveness for GDPR
/jira:compliance controls GDPR

# Export audit evidence for SOC2 CC7.2
/jira:compliance evidence SOC2:CC7.2

# View all compliance exceptions
/jira:compliance exceptions ALL

# View compliance dashboard
/jira:compliance dashboard

# Generate annual ISO27001 compliance report
/jira:compliance report ISO27001 annual detailed
```

## Command Actions

### 1. Report Action

Generate comprehensive compliance reports for audit and certification.

**Syntax:**
```bash
/jira:compliance report <framework> <time_period> [format]
```

**Examples:**
```bash
/jira:compliance report SOC2 quarterly          # SOC2 quarterly report
/jira:compliance report GDPR monthly audit      # GDPR audit-ready report
/jira:compliance report ISO27001 annual         # ISO27001 annual report
/jira:compliance report ALL quarterly detailed  # All frameworks detailed
```

**Report Generation Flow:**

```yaml
step_1_collect_evidence:
  for_each_control_in_framework:
    - Execute evidence collection method
    - Fetch relevant Jira issues
    - Calculate control effectiveness
    - Identify gaps and exceptions

step_2_calculate_compliance:
  overall_metrics:
    - Total controls assessed
    - Controls passing (>= 70% effective)
    - Controls failing (< 70% effective)
    - Overall compliance percentage

  by_category:
    SOC2:
      - CC1: Control Environment
      - CC2: Communication
      - CC3: Risk Assessment
      - CC6: Logical Access
      - CC7: System Operations
      - CC8: Change Management
      - CC9: Risk Mitigation

    GDPR:
      - Article 5: Principles
      - Article 15: Access Rights
      - Article 17: Erasure
      - Article 32: Security
      - Article 33: Breach Notification
      - Article 35: DPIA

    ISO27001:
      - A5-A18: Control categories

step_3_identify_findings:
  severity_levels:
    critical:
      - Controls completely failing
      - No evidence found
      - Regulatory violation risk

    high:
      - Controls partially effective
      - Significant gaps
      - Remediation needed

    medium:
      - Minor gaps
      - Process improvements needed

    low:
      - Documentation improvements
      - Best practice recommendations

step_4_generate_recommendations:
  - Prioritized remediation plan
  - Resource requirements
  - Timeline estimates
  - Risk mitigation strategies

step_5_format_output:
  if: "format = summary"
    output: "Executive summary with key findings"

  elif: "format = detailed"
    output: "Complete report with all evidence"

  elif: "format = audit"
    output: "Audit-ready package with evidence links"

  elif: "format = json"
    output: "Machine-readable data export"

step_6_save_and_distribute:
  - Save to Obsidian vault
  - Generate PDF for auditors
  - Send to stakeholders
  - Create action items for findings
```

**Report Output (Summary Format):**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║               COMPLIANCE AUDIT REPORT - Q1 2025                               ║
║                        All Frameworks                                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report Period:          Q1 2025 (January 1 - March 31, 2025)
Generated:              2025-04-01 09:00:00 UTC
Frameworks Assessed:    SOC2, GDPR, ISO27001
Total Controls:         127 controls assessed
Overall Status:         ✅ COMPLIANT (92.1% overall compliance)

┌─────────────┬──────────┬────────────┬──────────┬─────────┬──────────┐
│ Framework   │ Controls │ Compliance │ Passing  │ Failing │ Status   │
├─────────────┼──────────┼────────────┼──────────┼─────────┼──────────┤
│ SOC2        │ 28       │ 89.3%      │ 25       │ 3       │ ⚠️ Needs │
│ GDPR        │ 32       │ 93.8%      │ 30       │ 2       │ ✅ Pass  │
│ ISO27001    │ 67       │ 92.5%      │ 62       │ 5       │ ✅ Pass  │
└─────────────┴──────────┴────────────┴──────────┴─────────┴──────────┘

KEY FINDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Critical Issues (Immediate Action Required):
  🚨 None - No critical compliance failures identified

High Priority Issues (Remediate within 30 days):
  ⚠️ SOC2:CC7.2 - System monitoring gaps during weekend hours
  ⚠️ GDPR:Article33 - Breach notification procedure needs update
  ⚠️ ISO27001:A12.6 - Vulnerability management process incomplete

Medium Priority Issues (Remediate within 90 days):
  • SOC2:CC6.3 - Quarterly access reviews delayed by 2 weeks
  • ISO27001:A8.1 - Asset inventory missing 12 devices
  • ISO27001:A14.2 - Secure development training completion 78%

COMPLIANCE HIGHLIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ STRENGTHS:
  • Incident response procedures well documented (ISO27001:A16.1: 98%)
  • Access control implementation excellent (SOC2:CC6.1: 96%)
  • Data subject rights processes robust (GDPR:Article15: 95%)
  • Change management highly effective (SOC2:CC8.1: 94%)

EVIDENCE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Evidence Items Collected:    1,847
Evidence by Type:
  • Jira Issues:                    1,234 (67%)
  • Documented Procedures:          156 (8%)
  • Access Review Records:          287 (16%)
  • Training Completions:           98 (5%)
  • Security Assessments:           72 (4%)

Evidence Quality Score:             87.3% (Target: >85%)

EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active Exceptions:                  3
Expiring Soon (< 30 days):         1

  1. Exception #EXC-2024-07 (Medium Risk)
     Control: ISO27001:A9.4 (Privileged Access Management)
     Reason: Legacy system doesn't support MFA
     Compensating Control: Enhanced logging + weekly reviews
     Expiration: 2025-04-15 (14 days remaining)
     Status: Remediation project 60% complete

  2. Exception #EXC-2025-02 (Low Risk)
     Control: ISO27001:A7.2 (Security Training)
     Reason: New contractor onboarding delay
     Compensating Control: Supervised access only
     Expiration: 2025-06-30
     Status: Active, monitoring

REMEDIATION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Priority 1 - Complete by April 30, 2025:
  [ ] Implement 24/7 system monitoring (SOC2:CC7.2)
  [ ] Update breach notification SOP (GDPR:Article33)
  [ ] Complete vulnerability management framework (ISO27001:A12.6)

Priority 2 - Complete by June 30, 2025:
  [ ] Automate quarterly access reviews (SOC2:CC6.3)
  [ ] Update asset inventory with missing devices (ISO27001:A8.1)
  [ ] Achieve 100% secure development training (ISO27001:A14.2)

Estimated Effort:       240 hours
Resources Needed:       2 security engineers, 1 compliance analyst
Budget Required:        $35,000

AUDITOR READINESS ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Readiness:      ⚠️ MOSTLY READY (92.1%)
Audit Confidence:       HIGH
Recommendations:
  • Complete Priority 1 remediation items before audit
  • Prepare narrative explanations for exceptions
  • Organize evidence package by control

Estimated Audit Date:   Q2 2025 (May - June)
Next Internal Review:   2025-05-01

TREND ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────┬─────────┬─────────┬─────────┬──────────┐
│ Framework   │ Q4 2024 │ Q1 2025 │ Change  │ Trend    │
├─────────────┼─────────┼─────────┼─────────┼──────────┤
│ SOC2        │ 87.5%   │ 89.3%   │ +1.8%   │ ↗️       │
│ GDPR        │ 91.2%   │ 93.8%   │ +2.6%   │ ↗️       │
│ ISO27001    │ 90.1%   │ 92.5%   │ +2.4%   │ ↗️       │
│ Overall     │ 89.6%   │ 92.1%   │ +2.5%   │ ↗️       │
└─────────────┴─────────┴─────────┴─────────┴──────────┘

CONCLUSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Compliance Status: ✅ COMPLIANT

The organization demonstrates strong compliance across SOC2, GDPR, and ISO27001
frameworks with a 92.1% overall compliance rate. All frameworks show positive
trends with improving compliance scores quarter-over-quarter.

Key areas of excellence include incident response, access control, and data
subject rights management. Identified gaps are manageable and have clear
remediation plans with appropriate resourcing.

Recommendation: READY FOR AUDIT with completion of Priority 1 remediation items.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report prepared by: compliance-reporter agent
Reviewed by: [Compliance Manager Name]
Next review: 2025-07-01 (Q2 2025 report)

Attachments:
  • Detailed Evidence Package (1,847 items)
  • Control Effectiveness Scorecards
  • Exception Documentation
  • Remediation Project Plans
```

**Detailed Format - Control Breakdown:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    SOC2 DETAILED COMPLIANCE REPORT                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

CC1: CONTROL ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Category Score: 92.3% ✅ EFFECTIVE

┌──────────┬────────────────────────────────────────────┬─────────┬──────────┐
│ Control  │ Description                                │ Score   │ Status   │
├──────────┼────────────────────────────────────────────┼─────────┼──────────┤
│ CC1.1    │ Commitment to integrity and ethics        │ 94.2%   │ ✅ Pass  │
│ CC1.2    │ Board independence and oversight           │ 90.5%   │ ✅ Pass  │
└──────────┴────────────────────────────────────────────┴─────────┴──────────┘

CC1.1: Commitment to Integrity and Ethical Values
────────────────────────────────────────────────────────────────────────────────
Effectiveness Score: 94.2% (Highly Effective)

Evidence Collected:
  • 47 security training completion records
  • 23 ethics policy acknowledgment tickets
  • 12 code of conduct violation investigations
  • 8 whistleblower process tests

Evidence Quality Breakdown:
  Completeness: 96% ✅ (45/47 employees completed training)
  Timeliness:   92% ✅ (Training completed within 30 days of hire)
  Quality:      95% ✅ (All required documentation present)
  Remediation:  93% ✅ (2 violations remediated appropriately)

Sample Evidence:
  • TRAIN-2025-0123: Security awareness training - John Doe (Completed 2025-01-15)
  • ETHICS-2025-0045: Ethics policy acknowledgment - Jane Smith (Signed 2025-02-01)
  • INVEST-2025-0007: Code violation investigation (Resolved, training provided)

Findings: None

Recommendations:
  • Continue quarterly ethics training refreshers
  • Consider adding scenario-based training modules

───────────────────────────────────────────────────────────────────────────────

CC1.2: Board Independence and Oversight
────────────────────────────────────────────────────────────────────────────────
Effectiveness Score: 90.5% (Effective)

Evidence Collected:
  • 4 quarterly security review meeting minutes
  • 3 board-level security reports
  • 2 risk committee meeting records
  • 1 annual security budget approval

Evidence Quality Breakdown:
  Completeness: 100% ✅ (All quarterly reviews conducted)
  Timeliness:   85% ⚠️ (One review delayed by 1 week)
  Quality:      88% ✅ (All required topics covered)
  Remediation:  N/A

Sample Evidence:
  • BOARD-2025-Q1: Q1 Security Review (2025-04-05, 1 week late)
  • RISK-2025-01: Risk committee meeting minutes (2025-01-20)
  • BUDGET-2025: Security budget approval ($500K approved)

Findings:
  • Minor: Q1 board review delayed by 1 week due to scheduling conflicts

Recommendations:
  • Set board meeting dates 6 months in advance to avoid delays
  • Create backup presenter for security reviews

───────────────────────────────────────────────────────────────────────────────

[... Additional controls ...]

CC7: SYSTEM OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Category Score: 86.7% ⚠️ NEEDS IMPROVEMENT

┌──────────┬────────────────────────────────────────────┬─────────┬──────────┐
│ Control  │ Description                                │ Score   │ Status   │
├──────────┼────────────────────────────────────────────┼─────────┼──────────┤
│ CC7.1    │ Change management                          │ 94.2%   │ ✅ Pass  │
│ CC7.2    │ System monitoring                          │ 68.5%   │ ⚠️ Fail  │
│ CC7.3    │ Change implementation                      │ 97.3%   │ ✅ Pass  │
└──────────┴────────────────────────────────────────────┴─────────┴──────────┘

CC7.2: System Monitoring ⚠️ REQUIRES REMEDIATION
────────────────────────────────────────────────────────────────────────────────
Effectiveness Score: 68.5% (Partially Effective)

Evidence Collected:
  • 892 monitoring alerts generated
  • 847 alerts acknowledged (95%)
  • 234 incident tickets created from alerts
  • 18 SLA compliance reports

Evidence Quality Breakdown:
  Completeness: 75% ⚠️ (Weekend monitoring gaps identified)
  Timeliness:   68% ⚠️ (Weekend response times exceed SLA)
  Quality:      92% ✅ (Alerts properly categorized)
  Remediation:  58% ❌ (Weekend incident response inadequate)

Sample Evidence:
  • ALERT-2025-0234: Database CPU spike (Weekday, responded in 5 min) ✅
  • ALERT-2025-0567: API timeout (Saturday, responded in 2.3 hours) ❌
  • INCIDENT-2025-089: Production outage (Weekend, delayed response) ❌

Findings:
  🚨 HIGH: System monitoring during weekend hours insufficient
     - 24/7 monitoring configured but weekend staff reduced
     - Average weekend response time: 2.1 hours (vs 15 min SLA)
     - 12 weekend incidents with delayed response in Q1
     - Potential SOC2 certification risk

Root Cause:
  • Weekend on-call rotation understaffed
  • Alert escalation not configured for weekends
  • Monitoring dashboard not checked outside business hours

Impact:
  • SOC2 CC7.2 control failure
  • Customer SLA breaches
  • Potential audit finding

Remediation Plan:
  Priority: HIGH (Complete by April 30, 2025)

  Actions:
    1. Implement 24/7 on-call rotation with backup coverage
    2. Configure automatic escalation for critical alerts
    3. Add weekend monitoring checklist
    4. Implement PagerDuty integration for immediate alerting
    5. Hire additional on-call engineer or contract NOC service

  Owner: Director of Engineering
  Budget: $25,000 (staffing + tools)
  Timeline: 4 weeks

  Success Criteria:
    - Weekend response time < 15 minutes (90% of alerts)
    - Zero weekend alerts missed
    - Control effectiveness score > 90%

Compensating Controls (Temporary):
  • Executive on-call for critical customer issues
  • Enhanced logging and post-incident review
  • Customer communication protocol for weekend incidents

───────────────────────────────────────────────────────────────────────────────
```

### 2. Controls Action

View control effectiveness and status for a specific framework.

**Syntax:**
```bash
/jira:compliance controls <framework>
```

**Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      GDPR CONTROL EFFECTIVENESS                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Overall GDPR Compliance: 93.8% ✅

ARTICLE 5: PRINCIPLES OF PROCESSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────┬─────────┬──────────┬──────────┬───────────────┐
│ Control                     │ Score   │ Evidence │ Status   │ Last Assessed │
├─────────────────────────────┼─────────┼──────────┼──────────┼───────────────┤
│ Lawfulness & Transparency   │ 91.2%   │ 45 items │ ✅ Pass  │ 2025-03-28    │
│ Purpose Limitation          │ 88.7%   │ 23 items │ ✅ Pass  │ 2025-03-28    │
│ Data Minimization           │ 94.3%   │ 67 items │ ✅ Pass  │ 2025-03-28    │
│ Accuracy                    │ 89.1%   │ 34 items │ ✅ Pass  │ 2025-03-28    │
│ Storage Limitation          │ 92.5%   │ 78 items │ ✅ Pass  │ 2025-03-28    │
│ Integrity & Confidentiality │ 96.8%   │ 156 items│ ✅ Pass  │ 2025-03-28    │
└─────────────────────────────┴─────────┴──────────┴──────────┴───────────────┘

ARTICLE 15: RIGHT OF ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────┬─────────┬──────────┬──────────┬───────────────┐
│ Control                     │ Score   │ Evidence │ Status   │ Last Assessed │
├─────────────────────────────┼─────────┼──────────┼──────────┼───────────────┤
│ Data Subject Access Req.    │ 95.2%   │ 89 items │ ✅ Pass  │ 2025-03-30    │
└─────────────────────────────┴─────────┴──────────┴──────────┴───────────────┘

Performance Metrics:
  • Average DSAR response time: 12.3 days (Target: <30 days) ✅
  • DSAR completion rate: 100% (89/89 requests completed) ✅
  • Average data export generation time: 2.1 hours ✅

Evidence Sample:
  • DSAR-2025-001: Data access request (Completed in 8 days) ✅
  • DSAR-2025-034: Data access request (Completed in 15 days) ✅
  • DSAR-2025-089: Complex multi-system request (Completed in 27 days) ✅

ARTICLE 17: RIGHT TO ERASURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────┬─────────┬──────────┬──────────┬───────────────┐
│ Control                     │ Score   │ Evidence │ Status   │ Last Assessed │
├─────────────────────────────┼─────────┼──────────┼──────────┼───────────────┤
│ Right to Erasure (RTBF)     │ 91.7%   │ 34 items │ ✅ Pass  │ 2025-03-30    │
└─────────────────────────────┴─────────┴──────────┴──────────┴───────────────┘

Performance Metrics:
  • Deletion requests received: 34
  • Deletions completed: 34 (100%) ✅
  • Average deletion time: 5.2 days (Target: <30 days) ✅
  • Verification audits passed: 32/34 (94%) ✅

ARTICLE 32: SECURITY OF PROCESSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────┬─────────┬──────────┬──────────┬───────────────┐
│ Control                     │ Score   │ Evidence │ Status   │ Last Assessed │
├─────────────────────────────┼─────────┼──────────┼──────────┼───────────────┤
│ Security Measures           │ 94.6%   │ 234 items│ ✅ Pass  │ 2025-03-31    │
└─────────────────────────────┴─────────┴──────────┴──────────┴───────────────┘

Implemented Security Measures:
  ✅ Encryption at rest (AES-256)
  ✅ Encryption in transit (TLS 1.3)
  ✅ Access controls (RBAC + MFA)
  ✅ Regular security assessments (Quarterly)
  ✅ Penetration testing (Annual)
  ✅ Vulnerability scanning (Weekly)
  ✅ Security monitoring (24/7)

ARTICLE 33: BREACH NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────┬─────────┬──────────┬──────────┬───────────────┐
│ Control                     │ Score   │ Evidence │ Status   │ Last Assessed │
├─────────────────────────────┼─────────┼──────────┼──────────┼───────────────┤
│ 72-Hour Notification        │ 68.2%   │ 3 items  │ ⚠️ Needs │ 2025-03-25    │
└─────────────────────────────┴─────────┴──────────┴──────────┴───────────────┘

⚠️ FINDING: Breach notification procedure needs update

Evidence:
  • 3 data breaches in Q1
  • 2/3 notifications sent within 72 hours ✅
  • 1/3 notification sent in 76 hours (4 hours late) ❌

Root Cause:
  • Notification procedure outdated
  • Weekend breach assessment delayed
  • DPO contact information not current

Remediation:
  • Update breach notification SOP (In Progress: 40%)
  • Implement automated breach timeline tracking
  • Update DPO emergency contact procedures
  • Target completion: April 15, 2025

[View Detailed Evidence] [Export Control Report] [Create Remediation Ticket]
```

### 3. Evidence Action

Export audit evidence for a specific control.

**Syntax:**
```bash
/jira:compliance evidence <framework:control_id> [format]
```

**Examples:**
```bash
/jira:compliance evidence SOC2:CC7.2           # Export CC7.2 evidence
/jira:compliance evidence GDPR:Article15       # Export GDPR Article 15 evidence
/jira:compliance evidence ISO27001:A9.2 json   # Export as JSON
```

**Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                   AUDIT EVIDENCE EXPORT: SOC2:CC7.2                           ║
║                      System Monitoring Control                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Control Information:
  Framework:     SOC2 Trust Services Criteria
  Control ID:    CC7.2
  Control Name:  Entity monitors system components
  Description:   The entity monitors system components and the operation of
                 those components for anomalies that are indicative of
                 malicious acts, natural disasters, and errors affecting the
                 entity's ability to meet its objectives; anomalies are
                 analyzed to determine whether they represent security events.

Assessment Period: Q1 2025 (January 1 - March 31, 2025)
Assessment Date:   2025-03-31
Control Score:     68.5% (Partially Effective)
Status:            ⚠️ REMEDIATION REQUIRED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVIDENCE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Evidence Items:        1,191
Evidence Collection Method:  Automated via Jira JQL search
Evidence Types:
  • Monitoring Alerts:       892 items (75%)
  • Incident Tickets:        234 items (20%)
  • SLA Reports:            18 items (1.5%)
  • Review Records:         47 items (3.5%)

Evidence Quality Score:      87.2%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVIDENCE PACKAGE CONTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. MONITORING ALERTS (892 items)
   ─────────────────────────────────────────────────────────────────────────
   Sample Evidence Items:

   ALERT-2025-0001
     Date: 2025-01-02 03:42:15 UTC
     Type: Database CPU Spike
     Severity: High
     Response Time: 8 minutes
     Status: Resolved
     Jira: MON-2025-0001
     Evidence Link: https://jira.example.com/browse/MON-2025-0001

   ALERT-2025-0056
     Date: 2025-01-08 14:23:45 UTC
     Type: API Response Time Degradation
     Severity: Medium
     Response Time: 12 minutes
     Status: Resolved
     Jira: MON-2025-0056
     Evidence Link: https://jira.example.com/browse/MON-2025-0056

   [... 890 more alert records ...]

   Full Alert List: evidence-exports/SOC2-CC7.2-alerts.csv

2. INCIDENT TICKETS (234 items)
   ─────────────────────────────────────────────────────────────────────────
   Sample Evidence Items:

   INCIDENT-2025-001
     Title: Production database connection pool exhaustion
     Created: 2025-01-05 02:15:00 UTC
     Priority: Critical
     Trigger: Monitoring alert ALERT-2025-0034
     Response SLA: Met (5 minutes)
     Resolution SLA: Met (2.3 hours)
     Root Cause: Connection leak in payment service
     Jira: INC-2025-001
     Evidence Link: https://jira.example.com/browse/INC-2025-001

   INCIDENT-2025-089
     Title: API gateway timeout - Weekend outage
     Created: 2025-02-12 15:42:00 UTC (Saturday)
     Priority: High
     Trigger: Monitoring alert ALERT-2025-0567
     Response SLA: ❌ BREACHED (2.3 hours, target 15 minutes)
     Resolution SLA: ❌ BREACHED (8.7 hours, target 4 hours)
     Root Cause: Weekend on-call engineer unreachable
     Note: Evidence of control gap
     Jira: INC-2025-089
     Evidence Link: https://jira.example.com/browse/INC-2025-089

   [... 232 more incident records ...]

   Full Incident List: evidence-exports/SOC2-CC7.2-incidents.csv

3. SLA COMPLIANCE REPORTS (18 items)
   ─────────────────────────────────────────────────────────────────────────
   Weekly SLA reports showing monitoring and response effectiveness:

   WEEK-2025-01
     Period: Jan 1-7, 2025
     Alerts: 67
     Response SLA Met: 64/67 (95.5%)
     Average Response: 6.2 minutes
     Incidents: 18
     Resolution SLA Met: 17/18 (94.4%)

   WEEK-2025-06 (Weekend Gap Identified)
     Period: Feb 8-14, 2025
     Alerts: 45
     Response SLA Met: 38/45 (84.4%) ⚠️
     Average Response: 32.1 minutes (Weekend: 2.1 hours)
     Incidents: 12
     Resolution SLA Met: 9/12 (75.0%) ⚠️
     Note: Weekend monitoring gap identified

   [... 16 more SLA reports ...]

   Full SLA Reports: evidence-exports/SOC2-CC7.2-sla-reports.pdf

4. MONITORING REVIEW RECORDS (47 items)
   ─────────────────────────────────────────────────────────────────────────
   Evidence of regular monitoring system reviews:

   REVIEW-2025-01
     Date: 2025-01-15
     Type: Monthly Monitoring Review
     Reviewed By: Security Team Lead
     Items Reviewed:
       - Alert coverage and effectiveness
       - False positive rate
       - Response procedures
       - On-call rotation effectiveness
     Findings: 2 minor improvements identified
     Actions: Tuned 3 alert thresholds
     Jira: SEC-REVIEW-2025-01

   [... 46 more review records ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTROL ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Design Effectiveness:        ✅ EFFECTIVE (92%)
  • Monitoring tools properly configured
  • Alert coverage comprehensive
  • Escalation procedures documented

Operating Effectiveness:     ⚠️ PARTIALLY EFFECTIVE (68.5%)
  • Weekday performance: Excellent (96% SLA compliance)
  • Weekend performance: Poor (68% SLA compliance)
  • Gap: Insufficient weekend on-call coverage

Overall Rating: PARTIALLY EFFECTIVE - Remediation Required

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUDIT NARRATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The organization has implemented comprehensive system monitoring using
monitoring platforms that generate alerts for anomalies, performance issues,
and security events. During business hours (Monday-Friday 9am-5pm UTC),
monitoring is highly effective with 96% of alerts responded to within SLA
targets.

However, testing identified a significant gap in weekend monitoring coverage.
Weekend response times average 2.1 hours compared to the 15-minute target,
and 12 weekend incidents in Q1 2025 experienced delayed response. This
represents a material control deficiency that could impact the organization's
ability to detect and respond to security events during weekend hours.

Management has acknowledged this finding and implemented a remediation plan
including enhanced 24/7 on-call coverage and automated escalation procedures,
with target completion of April 30, 2025.

Based on the evidence reviewed, the control is assessed as PARTIALLY EFFECTIVE
pending completion of the remediation plan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVIDENCE EXPORT OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Download Complete Evidence Package (ZIP)]
[Export as PDF for Auditor]
[Export as JSON for GRC Tool]
[Generate Evidence Index (CSV)]
[View in Obsidian Vault]

Evidence Package Saved To:
  /Obsidian/Compliance/Evidence/SOC2/CC7.2/Q1-2025/
```

### 4. Exceptions Action

Manage compliance exceptions and compensating controls.

**Syntax:**
```bash
/jira:compliance exceptions <framework|ALL> [status]
```

**Examples:**
```bash
/jira:compliance exceptions ALL              # All exceptions
/jira:compliance exceptions SOC2             # SOC2 exceptions only
/jira:compliance exceptions ALL expiring     # Expiring soon
```

**Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      COMPLIANCE EXCEPTIONS REGISTER                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

ACTIVE EXCEPTIONS: 3
EXPIRED: 0
PENDING APPROVAL: 1
REMEDIATION IN PROGRESS: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXCEPTION #EXC-2024-07 ⚠️ EXPIRING SOON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework:            ISO27001
Control:              A9.4 - Privileged Access Management
Risk Level:           MEDIUM
Status:               ACTIVE - Remediation 60% Complete

Exception Details:
  System:             Legacy billing system (BillingSys v2.1)
  Non-Compliance:     System does not support multi-factor authentication (MFA)
                      for privileged users

  Business Justification:
    • Legacy system critical for billing operations
    • Vendor no longer provides updates
    • Migration to new system planned for Q2 2025
    • Replacing system mid-fiscal year would disrupt billing

  Impact if Enforced:
    • $2M revenue at risk from billing disruptions
    • 45,000 customers affected
    • Regulatory compliance for billing continuity required

Compensating Controls:
  ✅ Enhanced logging of all privileged access
  ✅ Weekly manual review of privileged user activity
  ✅ Restricted network access (IP whitelist only)
  ✅ Privileged access requires manager approval
  ✅ Session recording for all privileged sessions

Risk Assessment:
  Inherent Risk:      HIGH (No MFA for privileged access)
  Residual Risk:      MEDIUM (With compensating controls)
  Acceptable:         YES (Board approved)

Approval:
  Requested By:       Director of IT
  Approved By:        CISO + CFO
  Approval Date:      2024-10-15
  Expiration Date:    2025-04-15 (⚠️ 14 days remaining)
  Review Frequency:   Weekly

Remediation Plan:
  Project:            BillingSys Migration to Cloud Platform
  Status:             60% Complete
  Target Completion:  2025-04-10 (5 days before exception expires)
  Owner:              IT Migration Team Lead
  Budget:             $125,000

  Milestones:
    ✅ New system procurement (Complete)
    ✅ Data migration planning (Complete)
    🔄 Data migration execution (80% complete)
    🔄 User acceptance testing (50% complete)
    ⏳ Production cutover (Scheduled for 2025-04-08)
    ⏳ Legacy system decommission (Scheduled for 2025-04-12)

Monitoring:
  Last Review:        2025-03-28 (3 days ago)
  Next Review:        2025-04-04 (4 days)
  Compensating Control Checks: All passing
  Incidents:          0 security incidents related to this exception

[Extend Exception] [Close Exception] [View Full Details] [Download Approval]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXCEPTION #EXC-2025-02
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework:            ISO27001
Control:              A7.2 - Security Awareness Training
Risk Level:           LOW
Status:               ACTIVE - Monitoring

[... exception details ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXCEPTION #EXC-2025-03
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework:            GDPR
Control:              Article 30 - Records of Processing Activities
Risk Level:           LOW
Status:               ACTIVE - Remediation 30% Complete

[... exception details ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PENDING APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXCEPTION REQUEST #EXC-2025-04
Framework:            SOC2
Control:              CC6.1 - Logical Access Controls
Risk Level:           MEDIUM
Requested:            2025-03-25
Pending Approval By:  CISO
Status:               Under Review

[... pending exception details ...]

[Approve] [Reject] [Request More Information]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. Dashboard Action

Real-time compliance status dashboard.

**Syntax:**
```bash
/jira:compliance dashboard [auto-refresh]
```

**Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    COMPLIANCE STATUS DASHBOARD                                ║
║                   Last Updated: 2025-04-01 09:15:30 UTC                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

OVERALL COMPLIANCE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────┬────────────┬──────────────────────────────────────┬───────────┐
│ Framework   │ Compliance │ Progress Bar                         │ Status    │
├─────────────┼────────────┼──────────────────────────────────────┼───────────┤
│ SOC2        │ 89.3%      │ [████████████████████▓▓▓▓]          │ ⚠️ Review │
│ GDPR        │ 93.8%      │ [████████████████████████▓]         │ ✅ Pass   │
│ ISO27001    │ 92.5%      │ [███████████████████████▓▓]         │ ✅ Pass   │
│ Overall     │ 92.1%      │ [███████████████████████▓▓]         │ ✅ Pass   │
└─────────────┴────────────┴──────────────────────────────────────┴───────────┘

🎯 Target: >95% | Current: 92.1% | Gap: -2.9%

ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL: None

⚠️ HIGH PRIORITY:
  • SOC2:CC7.2 - System monitoring gaps (68.5%, requires remediation)
  • Exception #EXC-2024-07 expiring in 14 days

💡 MEDIUM PRIORITY:
  • GDPR:Article33 - Breach notification procedure update needed
  • ISO27001:A12.6 - Vulnerability management process incomplete

RECENT ACTIVITY (Last 7 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SOC2:CC6.1 - Access control review completed (Score improved to 96%)
✅ GDPR:Article15 - 12 DSAR requests processed (100% within SLA)
🔄 ISO27001:A8.1 - Asset inventory update in progress (78% complete)
📋 GDPR:Article30 - Processing activities record updated

UPCOMING MILESTONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 April 10:  BillingSys migration completion (Exception #EXC-2024-07)
📅 April 15:  Exception #EXC-2024-07 expiration
📅 April 30:  SOC2:CC7.2 remediation deadline
📅 May 15:    Q2 2025 compliance report due
📅 June 1:    Annual SOC2 audit begins

[Auto-refresh in 60 seconds... Press 'r' to refresh, 'q' to quit]
```

## Implementation Details

### Agent Integration

This command invokes the `compliance-reporter` agent:

```python
from agents.compliance_reporter import (
    collect_compliance_evidence,
    generate_audit_report,
    calculate_control_effectiveness,
    manage_exceptions
)

# Example: Report action
if action == "report":
    report = generate_audit_report(
        framework=framework,
        time_period=time_period,
        report_type=format
    )
    display_report(report)

# Example: Evidence action
elif action == "evidence":
    framework, control_id = target.split(":")
    evidence = collect_compliance_evidence(
        framework=framework,
        control_id=control_id,
        time_period=time_period
    )
    export_evidence(evidence, format=format)
```

## Success Metrics

- **Audit Readiness**: Time to generate audit-ready report < 48 hours
- **Evidence Collection**: >80% evidence auto-collected
- **Control Coverage**: >95% controls with evidence
- **Compliance Score**: Target >95% across all frameworks
- **Exception Management**: >90% exceptions resolved before expiration

## Troubleshooting

**Issue: Evidence not being collected**
- Check JQL queries in control definitions
- Verify Jira labels and project configurations
- Review collection methods for accuracy

**Issue: Control scores seem low**
- Review evidence quality factors (completeness, timeliness)
- Check if business processes are properly documented in Jira
- Consider adjusting effectiveness calculation weights

**Issue: Report generation takes too long**
- Use summary format for quick reports
- Generate detailed reports during off-peak hours
- Consider caching evidence collection results
