---
name: jira:docs
description: Generate documentation for completed Jira issue work with Confluence sync
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
version: 1.1.0
---

# Jira Documentation Generator

Validate issue → Analyze changes → Generate docs → Sync to Confluence → Update Jira → Create Harness PR

**Auto time logging:** Command duration >= 60s auto-posts worklog (via `jira-orchestrator/config/time-logging.yml`)

## Workflow

1. Validate (fetch Jira, expect Done/Resolved)
2. Analyze (git history, Harness PR, file categorization)
3. Generate (by type: readme/api/adr/changelog/code/all)
4. **Sync Confluence** (create/update pages, build hub)
5. Sync Obsidian (if --sync)
6. Update Jira (comment + "documented" label + Confluence links)
7. Create Harness PR (with Documentation section)

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

## Confluence Sync (MANDATORY)

**All documentation MUST be synced to Confluence with proper linking.**

### Confluence Page Structure

```
{Project Space}/Features/
└── {ISSUE-KEY} - {Feature Name}/     [Hub Page]
    ├── Technical Design               [From PLAN phase]
    ├── Implementation Notes           [From CODE phase]
    ├── Test Plan & Results            [From TEST phase]
    └── Runbook                         [From DOCUMENT phase]
```

### Confluence Sync Workflow

```yaml
confluence_sync:
  1_discover_existing:
    - Search by issue key label
    - Check Jira remote links
    - Validate page hierarchy

  2_create_update_pages:
    - Create missing pages (TDD, Impl Notes, Test Plan, Runbook)
    - Update existing pages with latest content
    - Ensure proper parent-child relationships

  3_build_hub_page:
    - Create hub page if missing
    - Link all child documents
    - Add summary and status table

  4_link_to_jira:
    - Add remote links for all pages
    - Post comment with documentation summary
    - Add "documented" label
```

### MCP Tools for Confluence

```yaml
tools:
  - mcp__atlassian__searchConfluenceUsingCql  # Find existing pages
  - mcp__atlassian__getConfluencePage         # Get page content
  - mcp__atlassian__createConfluencePage      # Create new pages
  - mcp__atlassian__updateConfluencePage      # Update existing
  - mcp__atlassian__getJiraIssueRemoteIssueLinks # Get linked docs
  - mcp__atlassian__addCommentToJiraIssue     # Post summary
```

## External Sync

**Obsidian:** `C:\Users\MarkusAhling\obsidian\Repositories\${org}\${repo}\Issues\${issue_key}.md`
**Confluence:** Space ${project_space}, parent "Features/${issue_key}"

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

**⚓ Golden Armada** | *You ask - The Fleet Ships*
