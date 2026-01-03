---
name: jira:docs
description: Generate documentation for completed Jira issue work
arguments:
  - name: issue_key
    description: Jira issue key
    required: true
  - name: --type
    description: Type (readme|api|adr|changelog|all)
    required: false
    default: all
  - name: --sync
    description: Sync to Confluence/Obsidian
    required: false
    default: true
---

# Jira Documentation Generator

Validate issue → Analyze changes → Generate docs → Sync external → Update Jira → Commit

## Workflow

1. Validate (fetch Jira, expect Done/Resolved)
2. Analyze (git history, PR, file categorization)
3. Generate (by type: readme/api/adr/changelog/code/all)
4. Sync (Obsidian + Confluence if --sync)
5. Update (Jira comment + "documented" label)
6. Commit (git with conventional format)

## Issue Detection

1. Argument: `${issue_key}`
2. Branch: `feature/PROJ-123-desc`
3. Env: `$JIRA_ISSUE_KEY`
4. Session

## Doc Types

| Type | Output |
|------|--------|
| readme | README update (summary, changes, usage, migrations) |
| api | API docs (endpoints, requests, responses, auth) |
| adr | Architecture Decision Record (context, drivers, decision) |
| changelog | CHANGELOG (Added/Changed/Fixed/Deprecated/Removed/Security) |
| code | JSDoc/docstrings (all modified files) |
| all | All above |

## File Categories

Frontend: src/components/, *.tsx, *.jsx, *.vue | Backend: src/api/, *.go, *.py
Database: migrations/ | Config: *.config.js, *.yaml | Tests: *.test.*, __tests__/
Docs: *.md, docs/

## Usage

```bash
/jira:docs ABC-123
/jira:docs ABC-123 --type readme|api|adr|changelog
/jira:docs ABC-123 --type all --sync false
```

## External Sync

**Obsidian:** `C:\Users\MarkusAhling\obsidian\Repositories\${org}\${repo}\Issues\${issue_key}.md`
**Confluence:** Space ${project_space}, parent "Development Log"

## ADR Generation

If: label "architecture"/"adr" OR core changes OR new technology
Location: `docs/adr/XXXX-${title_slug}.md` + Obsidian Decisions/

## CHANGELOG

Story+"feature"→Added | Story+"enhancement"→Changed | Bug→Fixed
Task+"deprecation"→Deprecated | Task+"removal"→Removed | Bug+"security"→Security

## Code Comments

**JS/TS:** JSDoc | **Python:** Docstring | **Go/Java:** GoDoc/JavaDoc

## Quality Checks

Accurate details, valid examples, correct links, no placeholders, ISO dates, versions, grammar, code formatted

## Errors

| Error | Action |
|-------|--------|
| Not found | Exit with error |
| No commits | Warn, search PR |
| Vault fail | Warn, skip |
| Git fail | Log, manual cmd |

## Auto Time Tracking

Duration >= 60s → Post worklog: `[Claude] /jira:docs - {duration}`

**⚓ Golden Armada** | *The Fleet Stands Ready*
