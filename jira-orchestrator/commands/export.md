---
name: jira:export
description: Export Jira issues and generate reports in PDF, Excel, CSV, or JSON formats with custom templates and scheduling
arguments:
  - name: type
    description: Export type (issues, report, schedule)
    required: true
  - name: target
    description: Target issues (JQL query or specific issue keys)
    required: false
  - name: --format
    description: Output format (pdf, excel, csv, json)
    required: false
  - name: --template
    description: Template name to use for export
    required: false
  - name: --output
    description: Output file path
    required: false
  - name: --schedule
    description: Schedule recurring export (cron expression)
    required: false
  - name: --email
    description: Email recipients (comma-separated)
    required: false
version: 1.0.0
---

# Jira Export & Reporting Command

You are generating an **export or report** from Jira data. This command supports multiple output formats, custom templates, scheduled exports, and automated distribution.

## Export Types

**Available Types:**
- `issues` - Export issues to file
- `report` - Generate formatted report
- `schedule` - Set up recurring export

**Supported Formats:**
- `pdf` - Professional PDF reports
- `excel` - Excel workbooks (.xlsx)
- `csv` - Comma-separated values
- `json` - JSON data export

---

## COMMAND OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JIRA EXPORT & REPORTING                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PARSE REQUEST       ─→  Parse export type, format, parameters    │
│               ↓                                                             │
│  PHASE 2: LOAD TEMPLATE       ─→  Load template or use default             │
│               ↓                                                             │
│  PHASE 3: FETCH DATA          ─→  Execute JQL, fetch issues                │
│               ↓                                                             │
│  PHASE 4: PROCESS DATA        ─→  Transform and format data                │
│               ↓                                                             │
│  PHASE 5: GENERATE EXPORT     ─→  Create output file in format             │
│               ↓                                                             │
│  PHASE 6: DISTRIBUTION        ─→  Save file, email if configured           │
│               ↓                                                             │
│  PHASE 7: ARCHIVE             ─→  Archive export if enabled                │
│               ↓                                                             │
│  PHASE 8: SUMMARY             ─→  Display export summary                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Parse Export Request

### Extract Parameters

```markdown
1. **Export Type**: ${type}
2. **Target**: ${target}
3. **Format**: ${format}
4. **Template**: ${template}
5. **Output Path**: ${output}
6. **Schedule**: ${schedule}
7. **Email**: ${email}
```

### Validate Parameters

```markdown
✓ Validate export type (issues, report, schedule)
✓ Validate format (pdf, excel, csv, json)
✓ Check template exists (if provided)
✓ Validate output path is writable
✓ Validate cron expression (if schedule provided)
✓ Validate email addresses (if provided)
```

---

## PHASE 2: Load Template

### Activate Export Generator Agent

```markdown
**Agent:** export-generator
**Task:** Load template and prepare export configuration
```

### Template Loading

```markdown
If template provided:
1. Search for template in template directory
2. Load template configuration
3. Validate template format matches requested format
4. Parse template sections and styling

If no template provided:
1. Use default template for format
2. Apply standard formatting
3. Use default column selection
```

**Example Template:**
```yaml
Template: "Sprint Report"
Format: PDF
Sections:
  - Title Page
  - Executive Summary
  - Burndown Chart
  - Issue List
  - Team Metrics
  - Retrospective Notes
```

---

## PHASE 3: Fetch Data

### Execute JQL Query

```markdown
1. Parse JQL query: ${target}
2. Execute search via Jira API
3. Fetch all matching issues
4. Paginate if necessary (100 issues per page)
5. Count total results
```

**Example:**
```bash
/jira:export issues \
  --target "project = MYPROJ AND sprint = 42" \
  --format excel \
  --output sprint_42_issues.xlsx
```

**Data Fetching:**
```markdown
Fetching issues...
JQL: project = MYPROJ AND sprint = 42
Page 1: 100 issues
Page 2: 100 issues
Page 3: 50 issues
Total: 250 issues

Extracting fields:
  ✓ Key
  ✓ Summary
  ✓ Type
  ✓ Status
  ✓ Priority
  ✓ Assignee
  ✓ Story Points
  ✓ Created
  ✓ Updated
```

---

## PHASE 4: Process Data

### Transform Data

```markdown
**Export Generator Agent** processes data:

1. Extract relevant fields from issues
2. Format dates and timestamps
3. Transform custom fields
4. Calculate metrics (if report)
5. Generate charts (if PDF/Excel)
6. Apply filters and sorting
7. Group data by categories
```

### Data Processing Example

```markdown
Processing 250 issues...

Field Extraction:
  ✓ Standard fields: 9 columns
  ✓ Custom fields: 3 columns
  ✓ Calculated fields: 2 columns

Data Transformation:
  ✓ Date formatting: ISO 8601 → YYYY-MM-DD
  ✓ User fields: Account ID → Display Name
  ✓ Priority: ID → Name
  ✓ Status: ID → Name

Metrics Calculation:
  ✓ Total story points: 450
  ✓ Completed: 380 (84%)
  ✓ Average cycle time: 4.2 days
  ✓ Velocity: 380 points

Chart Generation:
  ✓ Status distribution pie chart
  ✓ Burndown line chart
  ✓ Velocity bar chart
```

---

## PHASE 5: Generate Export

### Format-Specific Generation

#### PDF Export

```markdown
**Export Generator Agent** creates PDF:

1. Initialize PDF document
2. Add title page with branding
3. Generate table of contents
4. Add summary section with metrics
5. Create issue tables with formatting
6. Embed charts and visualizations
7. Add page numbers and headers
8. Generate final PDF
```

**Output:**
```markdown
Generating PDF report...

✓ Title page created
✓ Table of contents (3 pages)
✓ Executive summary (2 pages)
✓ Issue list table (12 pages)
✓ Charts embedded (3 charts)
✓ Appendix added (2 pages)

PDF generated: sprint_42_report.pdf
Pages: 22
Size: 1.8 MB
```

#### Excel Export

```markdown
**Export Generator Agent** creates Excel workbook:

1. Create workbook with multiple sheets
2. Add "Issues" sheet with data table
3. Format headers (bold, colored, frozen)
4. Add "Summary" sheet with metrics
5. Create pivot tables
6. Embed charts
7. Apply conditional formatting
8. Auto-size columns
9. Save workbook
```

**Output:**
```markdown
Generating Excel workbook...

Sheet 1: "Issues" (250 rows, 14 columns)
  ✓ Headers formatted
  ✓ Freeze panes at row 2
  ✓ Auto-filter enabled
  ✓ Columns auto-sized

Sheet 2: "Summary"
  ✓ Metrics table added
  ✓ Status pie chart embedded
  ✓ Velocity bar chart embedded
  ✓ Pivot table created

Excel workbook saved: sprint_42_issues.xlsx
Size: 245 KB
```

#### CSV Export

```markdown
**Export Generator Agent** creates CSV:

1. Write header row
2. Write data rows
3. Apply proper escaping
4. Handle special characters
5. Save CSV file
```

**Output:**
```markdown
Generating CSV export...

✓ Header row written
✓ 250 data rows written
✓ Special characters escaped
✓ UTF-8 encoding applied

CSV saved: sprint_42_issues.csv
Size: 85 KB
```

#### JSON Export

```markdown
**Export Generator Agent** creates JSON:

1. Build JSON structure
2. Add metadata section
3. Add issues array
4. Format nested objects
5. Apply pretty printing (if requested)
6. Save JSON file
```

**Output:**
```markdown
Generating JSON export...

✓ Metadata section created
✓ 250 issues serialized
✓ Nested objects formatted
✓ Pretty printing applied

JSON saved: sprint_42_issues.json
Size: 312 KB
```

---

## PHASE 6: Distribution

### Save Export File

```markdown
1. Write export to output path
2. Set file permissions
3. Verify file integrity
4. Calculate file checksum
5. Log export metadata
```

### Email Distribution (if configured)

```markdown
If --email parameter provided:

1. Parse recipient email addresses
2. Load email template
3. Populate template variables
4. Attach export file
5. Send email via SMTP
6. Track delivery status
7. Log email sent
```

**Email Example:**
```markdown
Sending email...

From: jira-reports@company.com
To: team@company.com, manager@company.com
Subject: Sprint 42 Report - 2025-01-15
Attachment: sprint_42_report.pdf (1.8 MB)

Email sent successfully!
✓ Delivered to: team@company.com
✓ Delivered to: manager@company.com
```

---

## PHASE 7: Archive Management

### Archive Export

```markdown
If archive enabled in configuration:

1. Create archive directory structure
2. Copy export to archive location
3. Compress if configured
4. Update archive index
5. Apply retention policy
```

**Archive Structure:**
```
/exports/archive/sprint_reports/2025-01/
└── sprint_42_report_2025-01-15.pdf
```

### Retention Policy

```markdown
Apply retention policy:
1. Check archive age
2. Compress files older than 30 days
3. Delete files older than 90 days
4. Log cleanup actions
```

---

## PHASE 8: Export Summary

### Generate Summary Report

```markdown
╔══════════════════════════════════════════════════════════════════╗
║                    EXPORT SUMMARY                                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Export Type: Sprint Report                                     ║
║  Format: PDF                                                    ║
║  Template: Sprint Report v2.0                                   ║
║                                                                  ║
║  Data Source:                                                   ║
║  JQL: project = MYPROJ AND sprint = 42                          ║
║  Issues: 250                                                    ║
║                                                                  ║
║  Export Details:                                                ║
║  ✓ File: /exports/sprint_42_report.pdf                         ║
║  ✓ Size: 1.8 MB                                                 ║
║  ✓ Pages: 22                                                    ║
║  ✓ Generated: 2025-01-15 16:30:00                              ║
║                                                                  ║
║  Distribution:                                                  ║
║  ✓ Email sent to 2 recipients                                   ║
║  ✓ Archived: /exports/archive/sprint_reports/2025-01/          ║
║                                                                  ║
║  Summary Metrics:                                               ║
║  • Total Story Points: 450                                      ║
║  • Completed: 380 (84%)                                         ║
║  • Velocity: 380 points                                         ║
║  • Avg Cycle Time: 4.2 days                                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

✓ Export completed successfully
✓ File available at: /exports/sprint_42_report.pdf
✓ Email sent to: team@company.com, manager@company.com
✓ Archive created: /exports/archive/sprint_reports/2025-01/
```

---

## Export Examples

### Example 1: PDF Sprint Report

```bash
/jira:export report \
  --target "sprint = 42" \
  --format pdf \
  --template "Sprint Report" \
  --output sprint_42_report.pdf \
  --email "team@company.com"
```

**Output:**
- Professional PDF with charts and metrics
- Emailed to team
- Archived for future reference

### Example 2: Excel Issue Export

```bash
/jira:export issues \
  --target "project = MYPROJ AND created >= -30d" \
  --format excel \
  --output recent_issues.xlsx
```

**Output:**
- Excel workbook with multiple sheets
- Issues sheet with all data
- Summary sheet with charts and pivot tables

### Example 3: CSV Backlog Export

```bash
/jira:export issues \
  --target "project = MYPROJ AND status = Backlog" \
  --format csv \
  --output backlog.csv
```

**Output:**
- Simple CSV file
- All backlog issues
- Ready for import to other tools

### Example 4: JSON API Export

```bash
/jira:export issues \
  --target "project = API AND updated >= -7d" \
  --format json \
  --output api_changes.json
```

**Output:**
- Structured JSON file
- API-compatible format
- Includes metadata and nested objects

### Example 5: Scheduled Weekly Report

```bash
/jira:export schedule \
  --name "Weekly Sprint Report" \
  --target "sprint in openSprints()" \
  --format pdf \
  --template "Sprint Report" \
  --schedule "0 17 * * 5" \
  --email "team@company.com,manager@company.com"
```

**Output:**
```markdown
Scheduled export created successfully!

Schedule Details:
─────────────────────────────────────────────
Name: Weekly Sprint Report
Schedule: Every Friday at 5:00 PM
Next Run: 2025-01-17 17:00:00
Format: PDF
Template: Sprint Report

Distribution:
─────────────────────────────────────────────
Email Recipients:
  • team@company.com
  • manager@company.com

Archive:
─────────────────────────────────────────────
Path: /exports/archive/sprint_reports/
Retention: 90 days
Compression: After 30 days

✓ Schedule activated
✓ First export will run on: 2025-01-17 17:00:00
```

---

## Template Management

### List Available Templates

```bash
/jira:export templates --list
```

**Output:**
```markdown
Available Export Templates
─────────────────────────────────────────────

PDF Templates:
  • Sprint Report (v2.0)
    - Sprint summary with burndown and metrics
  • Release Report (v1.5)
    - Release notes and feature list
  • Executive Dashboard (v1.0)
    - High-level metrics and KPIs

Excel Templates:
  • Issue Export (v2.0)
    - Detailed issue export with custom fields
  • Backlog Export (v1.0)
    - Backlog items with priorities
  • Changelog Export (v1.0)
    - Issue history and changes

CSV Templates:
  • Simple Export (v1.0)
    - Basic issue fields
  • Custom Fields Export (v1.0)
    - All custom fields included

JSON Templates:
  • API Export (v1.0)
    - API-compatible format
  • Full Export (v1.0)
    - Complete issue data
```

### Create Custom Template

```bash
/jira:export template create \
  --name "My Custom Report" \
  --format pdf \
  --config template_config.yaml
```

---

## Scheduled Exports

### Schedule Commands

```bash
# Create schedule
/jira:export schedule create \
  --name "Daily Backlog" \
  --target "status = Backlog" \
  --format csv \
  --schedule "0 9 * * 1-5" \
  --email "team@company.com"

# List schedules
/jira:export schedule list

# Disable schedule
/jira:export schedule disable "Daily Backlog"

# Delete schedule
/jira:export schedule delete "Daily Backlog"
```

### Schedule Management Output

```markdown
Active Scheduled Exports
─────────────────────────────────────────────

1. Weekly Sprint Report
   Schedule: 0 17 * * 5 (Every Friday at 5 PM)
   Format: PDF
   Next Run: 2025-01-17 17:00:00
   Status: Active ✓

2. Daily Backlog
   Schedule: 0 9 * * 1-5 (Weekdays at 9 AM)
   Format: CSV
   Next Run: 2025-01-16 09:00:00
   Status: Active ✓

3. Monthly Status Report
   Schedule: 0 8 1 * * (1st of month at 8 AM)
   Format: PDF
   Next Run: 2025-02-01 08:00:00
   Status: Active ✓
```

---

## Workflow Decision Tree

```markdown
START
  ↓
Parse export type
  ├─ issues → Issue export workflow
  ├─ report → Report generation workflow
  └─ schedule → Schedule management workflow
       ↓
Activate export-generator agent
       ↓
Load template (if provided)
  ├─ Template exists → Load configuration
  └─ No template → Use default
       ↓
Fetch data via JQL
       ↓
Process and transform data
       ↓
Generate export in format
  ├─ PDF → Generate PDF report
  ├─ Excel → Create Excel workbook
  ├─ CSV → Write CSV file
  └─ JSON → Serialize to JSON
       ↓
Save export file
       ↓
Email distribution?
  ├─ YES → Send email with attachment
  └─ NO → Skip
       ↓
Archive export?
  ├─ YES → Copy to archive, apply retention
  └─ NO → Skip
       ↓
Generate export summary
       ↓
END
```

---

## Agent Activation Protocol

### Primary Agent: export-generator

**Activates for:** All export operations

**Responsibilities:**
- Load templates
- Fetch Jira data
- Process and transform data
- Generate exports (PDF, Excel, CSV, JSON)
- Handle distribution
- Manage archives
- Generate summaries

---

## Best Practices

1. **Use templates** for consistent formatting
2. **Test JQL queries** before large exports
3. **Schedule reports** during off-peak hours
4. **Apply retention policies** to manage storage
5. **Compress large exports** for email distribution
6. **Validate email addresses** before scheduling
7. **Monitor scheduled jobs** for failures
8. **Archive important reports** for compliance

---

## Error Handling

### Common Errors

```markdown
1. **No issues found**
   - Verify JQL query is correct
   - Check permissions

2. **Template not found**
   - List available templates
   - Use default template

3. **Email delivery failed**
   - Verify SMTP configuration
   - Check recipient addresses
   - Review email logs

4. **File write error**
   - Check output path exists
   - Verify write permissions
   - Check disk space
```

---

## Command Execution

**Export Generator Agent** handles all export operations with comprehensive template support, multiple format options, and automated distribution capabilities.

Execute the export workflow based on the provided type, format, and parameters.
