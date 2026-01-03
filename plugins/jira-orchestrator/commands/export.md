---
name: jira:export
description: Export Jira issues and generate reports in multiple formats with templates and scheduling
arguments:
  - name: type
    description: Export type (issues, report, schedule)
    required: true
  - name: target
    description: Target issues (JQL query or issue keys)
    required: false
  - name: --format
    description: Output format (pdf, excel, csv, json)
    required: false
  - name: --template
    description: Template name to use
    required: false
  - name: --output
    description: Output file path
    required: false
  - name: --schedule
    description: Cron expression for recurring export
    required: false
  - name: --email
    description: Email recipients (comma-separated)
    required: false
---

# Jira Export & Reporting

Parse request → Load template → Fetch JQL → Process → Generate → Email/Archive → Summary

## Types & Formats

**Types:** issues | report | schedule

**Formats:** PDF (charts, TOC) | Excel (sheets, pivot) | CSV (UTF-8) | JSON (structured)

## Usage

```bash
/jira:export report --target "sprint = 42" --format pdf --output report.pdf
/jira:export issues --target "project = PROJ" --format excel --email team@example.com
/jira:export schedule --name "Weekly" --target "sprint in openSprints()" \
  --format pdf --schedule "0 17 * * 5" --email team@example.com
```

## Workflow

1. Parse & validate (type, format, params)
2. Load template or default
3. Execute JQL, paginate 100/page
4. Transform fields, metrics, charts
5. Format output (PDF/Excel/CSV/JSON)
6. Save, email if configured
7. Archive with retention (compress 30d, delete 90d)
8. Report summary

## Templates

```yaml
If provided: Search → Validate format → Parse
Else: Use default for format
```

## Best Practices

- Test JQL before export
- Schedule off-peak hours
- Validate emails pre-schedule
- Monitor scheduled jobs

## Errors

| Issue | Fix |
|-------|-----|
| No issues | Verify JQL, permissions |
| Template missing | List templates, use default |
| Email failed | Check SMTP, recipients |
| File error | Verify path, perms, disk |

## Scheduled Exports

```bash
create --name "Daily" --target "status = Backlog" --format csv --schedule "0 9 * * 1-5"
list
disable/delete "Daily"
```

## Archive

Path: `/exports/archive/{type}/{YYYY-MM}/`
- Compress after 30 days
- Delete after 90 days

**⚓ Golden Armada** | *The Fleet Stands Ready*
