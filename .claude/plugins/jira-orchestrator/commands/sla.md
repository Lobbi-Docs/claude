---
name: jira:sla
description: Monitor SLA status, configure SLA rules, generate SLA reports, and analyze SLA breaches
arguments:
  - name: action
    description: Action to perform (status|configure|report|breach-analysis|dashboard)
    required: true
  - name: target
    description: Target for action (issue key, priority level, or 'all')
    required: false
  - name: time_period
    description: Time period for reports (daily|weekly|monthly|quarterly|custom)
    default: weekly
  - name: format
    description: Output format (summary|detailed|json|csv)
    default: summary
---

# Jira SLA Management Command

Comprehensive SLA monitoring, configuration, reporting, and breach analysis system for Jira issues.

## Usage Examples

```bash
# View SLA status for specific issue
/jira:sla status PROJ-123

# View SLA status for all critical issues
/jira:sla status critical

# View SLA dashboard for all issues
/jira:sla dashboard

# Configure SLA rules for a priority level
/jira:sla configure high

# Generate weekly SLA report
/jira:sla report all weekly

# Generate monthly SLA report with detailed breakdown
/jira:sla report all monthly detailed

# Analyze SLA breaches from last month
/jira:sla breach-analysis all monthly

# Export SLA data as CSV
/jira:sla report all monthly csv
```

## Command Actions

### 1. Status Action

View current SLA status for one or more issues.

**Syntax:**
```bash
/jira:sla status <issue_key|priority|all> [format]
```

**Examples:**
```bash
/jira:sla status PROJ-123           # Single issue status
/jira:sla status critical           # All critical issues
/jira:sla status high summary       # All high priority (summary format)
/jira:sla status all detailed       # All issues (detailed format)
```

**Execution Flow:**

```yaml
step_1_parse_target:
  if: "target is issue key (e.g., PROJ-123)"
  action:
    - Fetch single issue
    - Calculate SLA status for all SLA types
    - Display detailed SLA information

  elif: "target is priority level (critical|high|medium|low)"
  action:
    - Search for all open issues with that priority
    - Calculate SLA status for each issue
    - Display summary table

  else: "target is 'all'"
  action:
    - Search for all open issues
    - Group by priority
    - Calculate SLA status for each
    - Display overview dashboard

step_2_calculate_sla:
  for_each_issue:
    - Calculate first response SLA
    - Calculate resolution SLA
    - Calculate update frequency SLA
    - Determine overall SLA health (compliant|warning|breached)

step_3_format_output:
  if: "format = summary"
  display:
    - Issue key and summary
    - Priority and customer tier
    - Overall SLA status (✅ compliant, ⚠️ warning, 🚨 breached)
    - Time remaining or breach amount
    - Quick action recommendations

  elif: "format = detailed"
  display:
    - All summary information
    - Breakdown by SLA type (first response, resolution, update frequency)
    - Percentage consumed for each SLA
    - Business hours calculation details
    - Historical SLA performance for this issue type
    - Predicted breach time if at risk

  elif: "format = json"
  display:
    - Machine-readable JSON output
    - All calculated metrics
    - Suitable for integration or automation

step_4_add_recommendations:
  if: "any SLA in warning or breached state"
  recommend:
    - Immediate actions to take
    - Whether escalation is needed
    - Resource reallocation suggestions
```

**Output Format (Summary):**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                            SLA STATUS REPORT                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Generated: 2025-01-15 14:30:00 UTC                                           ║
║ Scope: Critical Priority Issues                                              ║
║ Total Issues: 5                                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────┬──────────────────────────────┬──────────┬─────────────┬───────────┐
│ Issue       │ Summary                      │ Status   │ SLA Status  │ Remaining │
├─────────────┼──────────────────────────────┼──────────┼─────────────┼───────────┤
│ PROJ-101    │ Production API down          │ In Prog  │ 🚨 BREACH   │ -45 min   │
│ PROJ-102    │ Database connection errors   │ In Prog  │ ⚠️ WARNING  │ 22 min    │
│ PROJ-103    │ Critical security flaw       │ Open     │ ✅ OK       │ 3h 15m    │
│ PROJ-104    │ Payment processing failure   │ In Prog  │ ⚠️ WARNING  │ 38 min    │
│ PROJ-105    │ Data sync issue              │ Open     │ ✅ OK       │ 3h 42m    │
└─────────────┴──────────────────────────────┴──────────┴─────────────┴───────────┘

Summary:
  ✅ Compliant: 2 (40%)
  ⚠️ Warning:   2 (40%)
  🚨 Breached:  1 (20%)

Action Required:
  • PROJ-101: IMMEDIATE ESCALATION - SLA breached by 45 minutes
  • PROJ-102: Priority attention needed - Will breach in 22 minutes
  • PROJ-104: Monitor closely - Will breach in 38 minutes
```

**Output Format (Detailed - Single Issue):**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                       DETAILED SLA STATUS: PROJ-102                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Summary: Database connection errors affecting production                     ║
║ Priority: Critical                                                           ║
║ Customer: Acme Corp (Enterprise Tier)                                        ║
║ Created: 2025-01-15 12:00:00 UTC                                            ║
║ Status: In Progress                                                          ║
║ Assignee: john.doe@company.com                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ FIRST RESPONSE SLA                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status:          ✅ MET                                                     │
│ Target:          15 minutes                                                  │
│ Actual:          8 minutes                                                   │
│ Response By:     jane.smith@company.com                                      │
│ Response Time:   2025-01-15 12:08:00 UTC                                    │
│ Performance:     53% of target (7 minutes ahead of SLA)                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RESOLUTION SLA                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status:          ⚠️ WARNING (88% consumed)                                  │
│ Target:          4 hours (240 minutes)                                       │
│ Elapsed:         3h 38m (218 minutes)                                        │
│ Remaining:       22 minutes                                                  │
│ Warning At:      3h 0m (reached)                                             │
│ Breach Time:     2025-01-15 16:00:00 UTC                                    │
│                                                                              │
│ Business Hours:  NO (24/7 SLA for Critical Enterprise)                       │
│ Time Paused:     None                                                        │
│                                                                              │
│ Progress Bar:    [████████████████████▓▓] 88%                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ UPDATE FREQUENCY SLA                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status:          ✅ COMPLIANT                                               │
│ Target:          30 minutes between updates                                  │
│ Last Update:     12 minutes ago                                              │
│ Last Update By:  john.doe@company.com                                        │
│ Update Count:    6 updates since creation                                    │
│ Average Freq:    36 minutes (within target)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ BREACH PREDICTION                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Will Breach:     ⚠️ LIKELY (78% confidence)                                 │
│ Predicted Time:  2025-01-15 15:52:00 UTC (in 14 minutes)                   │
│ Basis:           Current velocity indicates insufficient progress            │
│ Contributing Factors:                                                        │
│   • Issue complexity higher than typical database issues                     │
│   • Required expertise not yet engaged                                       │
│   • Similar issues averaged 5.2 hours to resolve                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RECOMMENDATIONS                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🚨 URGENT ACTIONS REQUIRED:                                                 │
│                                                                              │
│ 1. Escalate to Level 2 (Engineering Manager)                                │
│    - Issue is predicted to breach SLA in 14 minutes                         │
│    - Manager can allocate additional resources                              │
│                                                                              │
│ 2. Engage Database Expert                                                   │
│    - Similar issues resolved 40% faster with DB expert                      │
│    - Recommended: sarah.johnson@company.com (DB team lead)                  │
│                                                                              │
│ 3. Increase Update Frequency                                                │
│    - Customer expects updates every 15-20 minutes for critical issues       │
│    - Current 30-minute target may not meet customer expectations            │
│                                                                              │
│ 4. Consider Workaround                                                      │
│    - If root cause fix will breach SLA, implement temporary workaround      │
│    - Restore service now, fix underlying issue after                        │
└─────────────────────────────────────────────────────────────────────────────┘

Actions:
  [Escalate Now] [Request Expert] [Add Update] [View History]
```

### 2. Configure Action

Configure SLA rules for priority levels or customer tiers.

**Syntax:**
```bash
/jira:sla configure <priority|tier> [interactive]
```

**Examples:**
```bash
/jira:sla configure high            # Configure SLA for high priority
/jira:sla configure enterprise      # Configure SLA for enterprise tier
/jira:sla configure all interactive # Interactive configuration wizard
```

**Configuration Flow:**

```yaml
step_1_show_current_config:
  display:
    - Current SLA rules for target
    - First response target and warning threshold
    - Resolution target and warning threshold
    - Update frequency target
    - Business hours settings
    - Customer tier multipliers

step_2_prompt_for_changes:
  interactive_mode:
    prompts:
      - "First Response Target (current: 1 hour): "
      - "First Response Warning Threshold % (current: 75%): "
      - "Resolution Target (current: 8 hours): "
      - "Resolution Warning Threshold % (current: 75%): "
      - "Business Hours Only? (current: yes): "
      - "Business Hours Timezone (current: UTC): "
      - "Apply to all customers or specific tier?: "

  non_interactive_mode:
    display:
      - Instructions for manual configuration
      - File location for SLA rules
      - Format and examples

step_3_validate_config:
  validations:
    - First response target < Resolution target
    - Warning threshold between 50% and 95%
    - Business hours properly defined
    - Timezone valid
    - No conflicting rules

step_4_apply_config:
  actions:
    - Update SLA configuration
    - Recalculate SLA for affected issues
    - Notify teams of SLA changes
    - Log configuration change for audit

step_5_test_config:
  actions:
    - Run test scenarios
    - Show sample SLA calculations with new rules
    - Identify any issues that will be affected
    - Confirm changes
```

**Configuration Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                     SLA CONFIGURATION: HIGH PRIORITY                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Current Configuration:
┌──────────────────────────┬──────────────┬──────────────┬─────────────────────┐
│ SLA Type                 │ Target       │ Warning At   │ Business Hours Only │
├──────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ First Response           │ 1 hour       │ 45 minutes   │ No                  │
│ Resolution               │ 8 hours      │ 6 hours      │ Yes                 │
│ Update Frequency         │ 2 hours      │ 1.5 hours    │ Yes                 │
└──────────────────────────┴──────────────┴──────────────┴─────────────────────┘

Business Hours: Monday-Friday, 09:00-17:00 UTC
Timezone: UTC
Applies To: All customers (Standard tier and above)

Customer Tier Multipliers:
  • Enterprise: 0.5x (50% faster SLA)
  • Premium:    0.75x (25% faster SLA)
  • Standard:   1.0x (standard SLA)

Do you want to modify this configuration? (yes/no): yes

--- Interactive Configuration ---

First Response Target (current: 1 hour): 30 minutes
First Response Warning % (current: 75%): 80%
Resolution Target (current: 8 hours): 6 hours
Resolution Warning % (current: 75%): 75%
Business Hours Only for Resolution? (current: yes): yes
Update Frequency Target (current: 2 hours): 1 hour

--- Configuration Preview ---

New Configuration:
┌──────────────────────────┬──────────────┬──────────────┬─────────────────────┐
│ SLA Type                 │ Target       │ Warning At   │ Business Hours Only │
├──────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ First Response           │ 30 minutes   │ 24 minutes   │ No                  │
│ Resolution               │ 6 hours      │ 4.5 hours    │ Yes                 │
│ Update Frequency         │ 1 hour       │ 45 minutes   │ Yes                 │
└──────────────────────────┴──────────────┴──────────────┴─────────────────────┘

Impact Analysis:
  • 12 currently open HIGH priority issues will be affected
  • 3 issues will move from COMPLIANT to WARNING status
  • 1 issue will move from WARNING to BREACHED status
  • Teams will be notified of the change

Apply changes? (yes/no): yes

✅ Configuration updated successfully!
✅ SLA recalculated for 12 affected issues
✅ Teams notified via email and Slack

Affected Issues:
  ⚠️ PROJ-234: Now in WARNING status (was compliant)
  ⚠️ PROJ-235: Now in WARNING status (was compliant)
  ⚠️ PROJ-236: Now in WARNING status (was compliant)
  🚨 PROJ-237: Now BREACHED (was in warning)
```

### 3. Report Action

Generate comprehensive SLA reports for analysis and compliance.

**Syntax:**
```bash
/jira:sla report <target> <time_period> [format]
```

**Examples:**
```bash
/jira:sla report all weekly              # Weekly report for all issues
/jira:sla report critical monthly        # Monthly report for critical issues
/jira:sla report enterprise quarterly    # Quarterly report for enterprise customers
/jira:sla report all monthly detailed    # Detailed monthly report
/jira:sla report all monthly csv         # Export monthly data as CSV
```

**Report Generation Flow:**

```yaml
step_1_collect_data:
  time_period_ranges:
    daily: "Last 24 hours"
    weekly: "Last 7 days"
    monthly: "Last 30 days"
    quarterly: "Last 90 days"
    custom: "User-specified date range"

  data_points:
    - All issues created in period
    - All issues resolved in period
    - SLA compliance per issue
    - SLA breach incidents
    - First response times
    - Resolution times
    - Update frequency compliance

step_2_calculate_metrics:
  overall_metrics:
    - Total issues handled
    - Overall SLA compliance rate
    - Total SLA breaches
    - Average first response time
    - Average resolution time
    - Customer satisfaction scores

  by_priority:
    - Compliance rate per priority
    - Breach count per priority
    - Average times per priority

  by_customer_tier:
    - Compliance rate per tier
    - Breach count per tier
    - Customer satisfaction per tier

  by_team:
    - Compliance rate per team
    - Team performance metrics
    - Top performers

step_3_analyze_trends:
  - Week-over-week comparison
  - Month-over-month comparison
  - Identify improving/degrading metrics
  - Highlight anomalies

step_4_generate_report:
  if: "format = summary"
    output: "Executive-level summary with key metrics and trends"

  elif: "format = detailed"
    output: "Comprehensive report with all metrics, charts, and detailed analysis"

  elif: "format = json"
    output: "Machine-readable JSON for integration"

  elif: "format = csv"
    output: "CSV export for Excel analysis"

step_5_save_report:
  - Save to Obsidian vault for historical tracking
  - Generate shareable link
  - Send to stakeholders if configured
```

**Report Output (Summary):**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                       SLA COMPLIANCE REPORT - MONTHLY                         ║
║                          Period: December 2024                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall SLA Compliance:        94.2% ✅ (Target: >95%, -0.8% from target)
Total Issues Handled:          324
SLA Breaches:                  19 (5.8%)
Avg First Response Time:       42 minutes
Avg Resolution Time:           6.3 hours
Customer Satisfaction:         4.6/5.0 ⭐

Trend: ↗️ +2.3% improvement from previous month

COMPLIANCE BY PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────┬────────┬────────────┬──────────┬─────────────┬─────────────────┐
│ Priority │ Issues │ Compliance │ Breaches │ Avg Response│ Avg Resolution  │
├──────────┼────────┼────────────┼──────────┼─────────────┼─────────────────┤
│ Critical │ 23     │ 95.7% ✅   │ 1        │ 12 min      │ 3.2 hours       │
│ High     │ 87     │ 93.1% ⚠️   │ 6        │ 38 min      │ 6.8 hours       │
│ Medium   │ 156    │ 94.9% ✅   │ 8        │ 2.1 hours   │ 18.4 hours      │
│ Low      │ 58     │ 93.1% ⚠️   │ 4        │ 4.2 hours   │ 42.6 hours      │
└──────────┴────────┴────────────┴──────────┴─────────────┴─────────────────┘

COMPLIANCE BY CUSTOMER TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌────────────┬────────┬────────────┬──────────┬──────────────┐
│ Tier       │ Issues │ Compliance │ Breaches │ CSAT Score   │
├────────────┼────────┼────────────┼──────────┼──────────────┤
│ Enterprise │ 45     │ 97.8% ✅   │ 1        │ 4.8/5.0 ⭐   │
│ Premium    │ 89     │ 95.5% ✅   │ 4        │ 4.7/5.0 ⭐   │
│ Standard   │ 190    │ 92.6% ⚠️   │ 14       │ 4.5/5.0      │
└────────────┴────────┴────────────┴──────────┴──────────────┘

TOP SLA BREACH REASONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Insufficient staffing during peak hours           (6 breaches, 31.6%)
2. Complex technical issues requiring research        (5 breaches, 26.3%)
3. Waiting for third-party vendor response           (4 breaches, 21.1%)
4. Incomplete requirements from customer             (3 breaches, 15.8%)
5. Infrastructure issues                             (1 breach, 5.2%)

TREND ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Metric       │ Nov 2024 │ Dec 2024 │ Change   │ Trend    │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Compliance   │ 91.9%    │ 94.2%    │ +2.3%    │ ↗️       │
│ Breaches     │ 26       │ 19       │ -27%     │ ↗️       │
│ Avg Response │ 48 min   │ 42 min   │ -12.5%   │ ↗️       │
│ Avg Resolut. │ 7.1 hrs  │ 6.3 hrs  │ -11.3%   │ ↗️       │
│ CSAT         │ 4.4/5.0  │ 4.6/5.0  │ +4.5%    │ ↗️       │
└──────────────┴──────────┴──────────┴──────────┴──────────┘

RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DOING WELL:
  • Critical issue SLA compliance excellent at 95.7%
  • Enterprise customer satisfaction very high
  • Overall trend improving across all metrics

⚠️ NEEDS IMPROVEMENT:
  • High priority SLA compliance below target (93.1% vs 95%)
  • Peak hour staffing causing 32% of breaches
  • Third-party dependencies causing delays

🎯 ACTION ITEMS:
  1. Increase staffing during peak hours (14:00-18:00 UTC)
  2. Implement proactive vendor escalation process
  3. Create customer requirements checklist to reduce incomplete info
  4. Continue current process improvements (trending positive)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report generated: 2025-01-15 14:30:00 UTC
Report saved to: Obsidian/Reports/SLA/2024-12-Monthly-SLA-Report.md
```

### 4. Breach Analysis Action

Detailed analysis of SLA breaches to identify patterns and root causes.

**Syntax:**
```bash
/jira:sla breach-analysis <target> <time_period>
```

**Analysis Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                     SLA BREACH ANALYSIS - MONTHLY                             ║
║                          Period: December 2024                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

BREACH SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Breaches:                19
Breach Rate:                   5.8%
Total Impact Hours:            127.3 hours of cumulative breach time
Avg Breach Duration:           6.7 hours
Max Breach Duration:           18.4 hours (PROJ-456)

BREACH BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
By SLA Type:
  First Response SLA:     3 breaches (15.8%)
  Resolution SLA:         14 breaches (73.7%)
  Update Frequency SLA:   2 breaches (10.5%)

By Priority:
  Critical:  1 breach   (5.3%) - UNACCEPTABLE
  High:      6 breaches (31.6%)
  Medium:    8 breaches (42.1%)
  Low:       4 breaches (21.1%)

By Customer Tier:
  Enterprise:  1 breach   (5.3%) - Contract violation
  Premium:     4 breaches (21.1%)
  Standard:    14 breaches (73.7%)

ROOT CAUSE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Resource Constraints (31.6% - 6 breaches)
   • Peak hour understaffing
   • Key personnel on vacation
   • Too many concurrent critical issues

2. Technical Complexity (26.3% - 5 breaches)
   • Issues required deep research
   • Undocumented legacy systems
   • Rare edge cases

3. External Dependencies (21.1% - 4 breaches)
   • Waiting for vendor responses
   • Third-party API issues
   • External approvals needed

4. Process Issues (15.8% - 3 breaches)
   • Incomplete initial information
   • Incorrect priority assignment
   • Delayed escalation

5. Infrastructure (5.2% - 1 breach)
   • Development environment outage

DETAILED BREACH LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Top 5 most severe breaches]

1. PROJ-456 (Critical, Enterprise - ACME Corp)
   SLA Type: Resolution
   Target: 4 hours | Actual: 22.4 hours | Breach: 18.4 hours
   Root Cause: Vendor API outage + escalation delay
   Impact: $50,000 contract penalty clause triggered
   Actions Taken: Vendor SLA review, improved escalation process
   Status: RCA completed, remediation in progress

2. PROJ-478 (High, Premium)
   SLA Type: Resolution
   Target: 8 hours | Actual: 14.2 hours | Breach: 6.2 hours
   Root Cause: Complex database migration issue
   Impact: Customer dissatisfaction, threatened to leave
   Actions Taken: Database expert consultation, better documentation
   Status: Customer relationship restored

[... additional breaches ...]

PATTERNS AND TRENDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time Patterns:
  • 47% of breaches occurred between 14:00-18:00 UTC (peak hours)
  • 21% occurred on Fridays (end of week fatigue)
  • 16% occurred during holiday period (reduced staffing)

Team Patterns:
  • Backend team: 8 breaches (highest)
  • Frontend team: 4 breaches
  • DevOps team: 3 breaches
  • Database team: 2 breaches
  • Security team: 2 breaches

Repeat Issues:
  • "Database connection pool exhaustion" - 3 occurrences
  • "Third-party payment gateway timeout" - 2 occurrences

PREVENTIVE MEASURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implemented:
  ✅ Added 2 engineers to peak hour rotation
  ✅ Created escalation checklist
  ✅ Improved vendor SLA monitoring

In Progress:
  🔄 Documenting legacy systems (60% complete)
  🔄 Implementing automatic priority detection
  🔄 Setting up vendor status page monitoring

Recommended:
  💡 Hire 1 additional senior engineer for complex issues
  💡 Create "known issues" playbook
  💡 Implement customer self-service portal to reduce ticket volume
  💡 Review and tighten vendor contracts

COMPLIANCE IMPACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOC2 CC7.2 Compliance: ⚠️ AT RISK
  • Target: <2% breach rate for monitoring controls
  • Actual: 5.8% breach rate
  • Remediation: Implement improved monitoring and escalation

Customer Contract Compliance:
  • 1 Enterprise SLA violation (PROJ-456)
  • Potential financial impact: $50,000 penalty
  • Contract review meeting scheduled with legal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analysis complete: 2025-01-15 14:30:00 UTC
Next review: 2025-02-15 (monthly cadence)
```

### 5. Dashboard Action

Real-time SLA monitoring dashboard with live updates.

**Syntax:**
```bash
/jira:sla dashboard [auto-refresh]
```

**Dashboard Output:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      REAL-TIME SLA DASHBOARD                                  ║
║                    Last Updated: 2025-01-15 14:30:15 UTC                     ║
║                    Auto-Refresh: Every 60 seconds                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

CURRENT STATUS (All Open Issues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────┬────────┬──────────┬─────────┬──────────┐
│ Priority    │ Total  │ ✅ OK    │ ⚠️ Warn │ 🚨 Breach│
├─────────────┼────────┼──────────┼─────────┼──────────┤
│ Critical    │ 5      │ 2  (40%) │ 2 (40%) │ 1  (20%) │
│ High        │ 18     │ 12 (67%) │ 5 (28%) │ 1  (5%)  │
│ Medium      │ 34     │ 28 (82%) │ 6 (18%) │ 0  (0%)  │
│ Low         │ 12     │ 11 (92%) │ 1 (8%)  │ 0  (0%)  │
├─────────────┼────────┼──────────┼─────────┼──────────┤
│ TOTAL       │ 69     │ 53 (77%) │ 14(20%) │ 2  (3%)  │
└─────────────┴────────┴──────────┴─────────┴──────────┘

🚨 CRITICAL ALERTS (Immediate Action Required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROJ-101 - Production API down
   Customer: Enterprise (ACME Corp)
   Breach: -45 minutes (SLA exceeded by 45 min)
   Action: ESCALATE TO DIRECTOR NOW

2. PROJ-237 - Payment processing failure
   Customer: Premium
   Breach: -12 minutes
   Action: Manager intervention required

⚠️ AT RISK (Will Breach Soon)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issues that will breach in next 30 minutes:
  • PROJ-102 - Database errors (22 min remaining)
  • PROJ-104 - Data sync issue (28 min remaining)

Issues predicted to breach in next 2 hours:
  • PROJ-203 - UI rendering bug (1h 15m, 78% confidence)
  • PROJ-215 - Email delivery delays (1h 42m, 65% confidence)

TEAM WORKLOAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌────────────────┬────────┬──────────┬─────────┬──────────┐
│ Team           │ Active │ Critical │ At Risk │ Capacity │
├────────────────┼────────┼──────────┼─────────┼──────────┤
│ Backend        │ 24     │ 3        │ 6       │ 🔴 HIGH  │
│ Frontend       │ 18     │ 1        │ 3       │ 🟡 MED   │
│ DevOps         │ 12     │ 0        │ 2       │ 🟢 OK    │
│ Database       │ 8      │ 1        │ 2       │ 🟡 MED   │
│ Security       │ 7      │ 0        │ 1       │ 🟢 OK    │
└────────────────┴────────┴──────────┴─────────┴──────────┘

📊 TODAY'S METRICS (Last 24 Hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issues Resolved:        23
SLA Compliance:         91.3% (21/23 within SLA)
Breaches:              2
Avg First Response:    38 minutes
Avg Resolution:        5.8 hours

[Auto-refresh in 45 seconds... Press 'r' to refresh now, 'q' to quit]
```

## Implementation Details

### Agent Integration

This command invokes the `sla-monitor` agent:

```python
from agents.sla_monitor import (
    calculate_sla_time,
    generate_sla_report,
    track_first_response_sla,
    track_resolution_sla,
    predict_sla_breach
)

# Example: Status action
if action == "status":
    if target is issue_key:
        issue = get_issue(target)
        sla_status = calculate_sla_time(issue, "RESOLUTION")
        display_sla_status(issue, sla_status)

    elif target in ["critical", "high", "medium", "low"]:
        issues = search_issues_by_priority(target)
        for issue in issues:
            sla_status = calculate_sla_time(issue, "RESOLUTION")
            display_summary_row(issue, sla_status)

# Example: Report action
elif action == "report":
    report = generate_sla_report(
        time_period=time_period,
        filters={"priority": target} if target != "all" else None
    )
    display_report(report, format=format)
```

## Success Metrics

- **Command Usage**: Track how often each action is used
- **Time to Insight**: Measure how quickly users can understand SLA status
- **Breach Prevention**: Count issues where early warning prevented breach
- **Report Adoption**: Track report downloads and stakeholder engagement

## Troubleshooting

**Issue: SLA calculations seem incorrect**
- Check business hours configuration
- Verify timezone settings
- Review pause time exclusions

**Issue: Report generation is slow**
- Use summary format for quick insights
- Filter to specific priority or timeframe
- Consider running reports during off-peak hours

**Issue: Too many false warnings**
- Adjust warning threshold percentage
- Review SLA targets for appropriateness
- Fine-tune prediction model confidence thresholds
