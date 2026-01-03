---
name: jira:review
description: Comprehensive code review with security, performance, quality, and accessibility analysis
arguments:
  - name: issue_key
    description: Jira issue key (e.g., ABC-123)
    required: true
  - name: scope
    description: security|performance|quality|accessibility|full
    default: full
  - name: fix
    description: Auto-fix issues (true|false)
    default: false
---

# Code Review Command

Comprehensive review with automated scoring and optional fixes. Auto-logs worklog if duration >= 60s.

**Issue Key Detection:** argument → git branch → JIRA_ISSUE_KEY env var → session

---

## Workflow

### 1. Validate & Fetch
- Validate issue key format: `[A-Z]+-[0-9]+`
- Fetch issue details (summary, description, status, assignee, labels)

### 2. Identify Changed Files
Strategy priority: branch detection → commit log → session tracking

### 3. Load Files
- Read all changed files
- Categorize: frontend (.tsx), backend (.ts), styles, config, tests, docs
- Get IDE diagnostics for TypeScript/JavaScript

## 4. Analysis Scopes

### Security (pass threshold: 85/100)
- Hardcoded secrets, SQL injection, XSS vulnerabilities
- Auth/authorization checks, insecure dependencies
- .env file exposure
**Scoring:** Base 100 → -50 (secrets), -40 (SQL), -30 (XSS), -25 (auth), -20 (critical deps), -10 (high deps), -5 (validation)

### Performance (pass threshold: 80/100)
- React anti-patterns (inline objects, arrow functions, missing deps)
- Database N+1 queries, missing indexes
- Bundle size (full imports), memory leaks (listeners, effects)
**Scoring:** Base 100 → -30 (N+1), -25 (leaks), -15 (memoization), -10 (inline), -8 (imports), -5 (bundle)

### Quality (pass threshold: 75/100)
- TypeScript errors/warnings, async error handling, null safety
- Code duplication, cyclomatic complexity, naming conventions
**Scoring:** Base 100 → -15 (TS errors), -12 (async), -8 (any), -10 (duplication), -10 (complexity), -5 (warnings), -3 (naming)

### Accessibility (pass threshold: 90/100)
- Semantic HTML, ARIA labels, keyboard navigation
- Form labels, focus management, alt text, color contrast
**Scoring:** Base 100 → -20 (keyboard), -15 (non-semantic), -12 (ARIA/forms), -10 (alt), -15 (focus), -5 (contrast)

### Full Scope
- All above + test coverage + documentation
- **Overall:** 30% security + 25% performance + 20% quality + 15% a11y + 10% coverage
- **Pass threshold:** 80/100

## 5. Auto-Fix (if enabled)
- Code formatting (Prettier, ESLint)
- Import organization
- Type annotations, security quick-fixes, a11y quick-fixes
- Generate auto-fix report

## 6. Generate Report
**Components:** Summary table, critical issues, warnings, auto-fixed items, metrics breakdown, recommendations, checklist

## 7. Post to Jira
- Add comment with score, summary, labels (review-passed/failed)
- Save to Obsidian: `Repositories/{org}/{repo}/Reviews/{issue_key}-review-{timestamp}.md`

## Error Handling

| Error | Action |
|-------|--------|
| Invalid issue key | Exit with format error |
| Issue not found | Exit with 404 error |
| No changed files | Prompt user for scope (uncommitted/manual/branch/abort) |
| Auto-fix failure | Log error, continue, report in summary |
| Tool unavailable | Skip check, note in report, continue |

## Pass/Fail Criteria

**PASS:** Overall ≥ 80 AND Security ≥ 85 AND no critical issues AND no TS errors AND coverage ≥ 80% (full scope)
**CONDITIONAL:** Overall ≥ 70 AND Security ≥ 85 AND warnings present AND coverage 70-79% AND no critical issues
**FAIL:** Overall < 70 OR Security < 85 OR critical issues OR TS errors OR coverage < 70%

## Examples

```bash
/jira:review ABC-123 --scope=full --fix=true
/jira:review DEV-456 --scope=security
/jira:review PERF-789 --scope=performance --fix=false
/jira:review UI-321 --scope=accessibility --fix=true
/jira:review TECH-654 --scope=quality
```

## Environment Variables

`JIRA_URL`, `JIRA_API_TOKEN`, `OBSIDIAN_VAULT_PATH`, `REVIEW_SECURITY_THRESHOLD`, `REVIEW_OVERALL_THRESHOLD`

## Workflow

Integrates in: EXPLORE → PLAN → CODE → **REVIEW** → TEST → FIX → DOCUMENT

---

**Golden Armada** | Code Quality Signature
