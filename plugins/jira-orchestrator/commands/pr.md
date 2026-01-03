---
name: jira:pr
description: Create, fix, or iterate on pull requests for Jira issues
arguments:
  - name: issue_key
    description: Jira issue key for PR
    required: true
  - name: base
    description: Base branch for PR
    default: main
  - name: draft
    description: Create as draft PR
    default: false
  - name: reviewers
    description: Comma-separated list of reviewers
    required: false
  - name: fix
    description: Fix review comments and re-review (replaces /pr-fix)
    default: false
  - name: iterate
    description: Iterate on feedback with auto-review (replaces /iterate)
    default: false
  - name: max_iterations
    description: Max fix attempts before escalation (with --iterate)
    default: 3
tags:
  - jira
  - harness
  - pull-request
  - automation
version: 2.0.0
examples:
  - command: /jira:pr ABC-123
  - command: /jira:pr ABC-123 --fix
  - command: /jira:pr ABC-123 --iterate --max_iterations 5
  - command: /jira:pr ABC-123 main false user1,user2
aliases:
  - pr-fix (deprecated -> use --fix)
  - iterate (deprecated -> use --iterate)
---

> ⚠️ **Migration Notice:** This command now consolidates `/pr-fix` and `/jira:iterate`.
> - Old: `/pr-fix <pr-url> --jira PROJ-123` → New: `/jira:pr PROJ-123 --fix`
> - Old: `/jira:iterate PROJ-123 --max_iterations 3` → New: `/jira:pr PROJ-123 --iterate --max_iterations 3`
>
> The deprecated commands still work but will be removed in a future release.

# Jira PR Creation Command

Create comprehensive pull requests via Harness Code for completed Jira issues with automated validation, Confluence documentation, and Jira updates.

**Auto time logging:** Command duration >= 60s auto-posts worklog (via `jira-orchestrator/config/time-logging.yml`)

## Prerequisites

- Git repository initialized in Harness Code
- All work committed and pushed to Harness repository
- No uncommitted changes
- Tests passing
- No merge conflicts with base branch
- Harness API key configured (`HARNESS_API_KEY`)
- Harness account/org/project configured

## Flag Validation

**Mutual Exclusivity Rules:**
```yaml
# --fix and --iterate cannot be used together
validation:
  mutually_exclusive:
    - [fix, iterate]

# Error if both specified
if: fix == true AND iterate == true
error: "Cannot use --fix and --iterate together. Use --fix for one-time fixes, --iterate for continuous fix-review loops."

# Mode determination
mode:
  create: fix == false AND iterate == false  # Default: create new PR
  fix:    fix == true                         # One-time fix cycle
  iterate: iterate == true                    # Continuous fix-review loop
```

**Validation Example:**
```bash
# Valid usage
/jira:pr ABC-123                           # Create PR
/jira:pr ABC-123 --fix                     # Fix review comments
/jira:pr ABC-123 --iterate --max_iterations 5  # Iterate until approved

# Invalid - will error
/jira:pr ABC-123 --fix --iterate  # ERROR: mutually exclusive flags
```

## Core Workflow

**Validate → Fetch Issue → Branch → Analyze Changes → Discover Confluence Docs → Generate PR (with Doc Links) → Push → Create PR → Update Jira**

## Quick Start

```bash
# Basic PR creation
/jira:pr ABC-123

# PR with specific base branch
/jira:pr ABC-123 develop

# Draft PR
/jira:pr ABC-123 main true

# PR with reviewers
/jira:pr ABC-123 main false user1,user2,team:backend-team
```

## PR Generation Details

**Title Format:** `ISSUE-KEY: Summary` (max 72 chars)

**Description Includes:**
- Summary overview
- Feature list with categorized changes
- **Documentation section with Confluence links (REQUIRED)**
- Acceptance criteria from Jira
- Test coverage report
- Manual testing instructions
- Deployment notes (breaking changes, migrations, env vars, dependencies)
- Related issues
- Code review checklist

## Confluence Documentation Section (REQUIRED)

**Every PR MUST include a Documentation section linking to Confluence pages.**

### PR Documentation Template

```markdown
## Documentation

### Confluence Pages
| Document | Link | Status |
|----------|------|--------|
| Technical Design | [View](confluence-url) | ✅ Complete |
| Implementation Notes | [View](confluence-url) | ✅ Complete |
| Test Plan & Results | [View](confluence-url) | ✅ Complete |
| Runbook | [View](confluence-url) | ✅ Complete |

### Hub Page
[{ISSUE-KEY} - {Feature Name}](confluence-hub-url)

### Related Documentation
- [Architecture Decision Record](confluence-url) (if applicable)
- [API Documentation](confluence-url) (if applicable)
```

### Confluence Discovery Steps

Before PR creation, discover all Confluence documentation:

1. **Query Jira Remote Links:** `mcp__atlassian__getJiraIssueRemoteIssueLinks`
2. **Search by Issue Key:** `mcp__atlassian__searchConfluenceUsingCql` with `label = "{ISSUE-KEY}"`
3. **Search by Title:** `mcp__atlassian__searchConfluenceUsingCql` with `title ~ "{ISSUE-KEY}"`
4. **Validate Required Pages:** Check for TDD, Implementation Notes, Test Plan, Runbook
5. **Build Documentation Section:** Construct markdown table with all discovered links

### Documentation Validation

```yaml
validation:
  required_pages:
    - Technical Design
    - Implementation Notes
    - Test Plan & Results
    - Runbook

  on_missing:
    - Log warning
    - Add "documentation-incomplete" label to PR
    - Post warning in Jira comment
```

**Example Generated Title:**
```
ABC-123: Implement user authentication with OAuth2
```

## Step-by-Step Execution

### 1. Pre-flight Validation
- Check git repository status
- Verify no uncommitted changes
- Validate tests are passing
- Check for merge conflicts with base branch

### 2. Fetch Jira Issue Details
- Retrieve issue summary, description, type
- Extract acceptance criteria
- Get issue labels, priority, story points
- Identify subtasks and related issues

### 3. Create/Verify Feature Branch
- Auto-detect or create feature branch
- Follow convention: `feature/ISSUE-KEY-description`
- Fetch base branch for conflict check

### 4. Analyze Changes
- Get commit history since base branch
- Categorize changed files (frontend/backend/tests/docs)
- Count insertions/deletions
- Identify breaking changes

### 5. Discover Confluence Documentation
- Query Jira issue for remote links to Confluence
- Search Confluence by issue key label and title
- Validate required pages exist (TDD, Implementation Notes, Test Plan, Runbook)
- Build Documentation section with all discovered links
- Warn if required pages are missing

### 6. Generate PR Metadata
- Build title with issue key and summary
- Categorize commits into sections
- **Include Documentation section with Confluence links**
- Extract test results
- Generate manual testing steps

### 7. Push to Remote
- Push feature branch with upstream tracking
- Handle push conflicts (rebase and retry)
- Re-run tests after rebase

### 8. Dynamic Reviewer Selection
Agent-router automatically selects domain-specific reviewers:

| File Domain | Recommended Reviewers |
|---|---|
| Frontend (.tsx, .jsx, .css) | react-component-architect, accessibility-expert |
| Backend (api/, service/) | backend-architect, api-security-expert |
| Database (.prisma, .sql) | database-specialist, data-architect |
| Testing (.test.ts, .spec.ts) | test-writer-fixer, coverage-analyzer |
| Documentation (.md, ADR) | codebase-documenter, technical-writer |

Manual override via `--reviewers` argument merges with auto-selected reviewers.

### 9. Create PR via Harness Code API
- Build labels from Jira issue type and labels
- Add milestone from Jira fixVersion
- Create PR via `harness_create_pull_request` with Documentation section
- Capture PR URL and number

```yaml
harness_pr_creation:
  tool: harness_create_pull_request
  params:
    title: "${issue_key}: ${summary}"
    source_branch: "feature/${issue_key}-${slug}"
    target_branch: "${base_branch}"
    description: |
      ## Summary
      Resolves: [${issue_key}](jira-url)

      ## Documentation
      [Include Confluence links table]

      ## Changes
      [Categorized changes]
    draft: ${draft}
```

### 10. Update Jira Issue
- Add comment with PR link and summary
- Transition issue to "In Review" (unless draft)
- Log dynamic reviewer selection details
- Add "has-pr" label

### 11. Request Reviews
- Request reviews from dynamically selected agents
- Document which reviewers were auto-selected vs. manual
- Mention reviewers in Jira comment

## Error Handling

| Error | Solution |
|-------|----------|
| Invalid issue key | Must match PROJECT-123 format |
| Issue not found | Verify issue exists and you have access |
| Uncommitted changes | Commit all changes first |
| Tests failing | Fix failing tests before PR |
| Merge conflicts | Rebase on base branch |
| Push failed | Check Harness permissions and network |
| Harness API error | Verify HARNESS_API_KEY is set |
| Harness not configured | Set HARNESS_ACCOUNT_ID, HARNESS_ORG_ID, HARNESS_PROJECT_ID |
| Reviewer not found | Verify Harness username and repo access |
| Confluence page missing | Create required pages before PR |

## Output

Success message shows:
- PR URL and number
- Issue key and branch info
- File changes summary
- Test status and coverage
- Dynamically selected reviewers
- Jira updates confirmation

## Configuration

```bash
# Harness Environment Variables (REQUIRED)
HARNESS_API_KEY=your-api-key
HARNESS_ACCOUNT_ID=your-account-id
HARNESS_ORG_ID=your-org-id
HARNESS_PROJECT_ID=your-project-id
HARNESS_BASE_URL=https://app.harness.io
HARNESS_CODE_API=${HARNESS_BASE_URL}/code/api/v1

# Jira Environment Variables
JIRA_URL=https://your-instance.atlassian.net
DEFAULT_BASE_BRANCH=main

# Customizable
JIRA_CUSTOM_FIELD_STORY_POINTS=customfield_10016
TEST_COMMAND="npm test"  # or pytest, mvn test
COVERAGE_COMMAND="npm run coverage"
```

## Harness MCP Tools

```yaml
harness_tools:
  - harness_create_pull_request    # Create PR in Harness Code
  - harness_get_pull_request       # Get PR details
  - harness_list_pull_requests     # List PRs
  - harness_get_pull_request_checks # Get PR status checks
  - harness_get_pull_request_activities # Get PR comments/activities
  - harness_list_repositories      # List repos in project
  - harness_get_repository         # Get repo details
```

## Dynamic Reviewer Selection Notes

- Agent-router analyzes changed files during PR creation
- Selection based on file-agent-mapping.yaml patterns
- Manual reviewers specified via `--reviewers` merge with auto-selected
- Selection logic documented in Jira comments
- Enables focused code reviews by domain experts

---

## Fix Mode (`--fix`)

When `--fix` is enabled, the command enters PR fix workflow:

### Fix Workflow
1. **Collect Issues** - Fetch PR comments, categorize by severity (critical/high/medium/low)
2. **Plan Fixes** - Group by file, order by dependency (security→structural→quality)
3. **Execute Fixes** - Apply fixes, run tests, verify resolution
4. **Update PR** - Push commits, reply to comments, update description
5. **Council Review** - Run focused council review (code-reviewer + domain specialists)

### Fix Priorities
```yaml
critical: always fix (security, breaking changes)
high: always fix (quality, performance)
medium: fix if time permits
low: optional (nitpicks)
```

---

## Iterate Mode (`--iterate`)

When `--iterate` is enabled, runs iterative fix-review loop:

### Iterate Workflow
1. **Gather Feedback** - Auto-detect PR, fetch comments
2. **Categorize** - critical | warning | suggestion | question | resolved
3. **Apply Fixes** - Per-file fixes with test validation
4. **Push & Update** - Commit, push, update PR description
5. **Re-Review** - Spawn focused council, verify fixes
6. **Loop** - Repeat until approved or max_iterations reached

### Escalation (after max_iterations)
- Same comment unfixed 2x → escalate
- Critical count not decreasing → escalate
- Iteration > 30 min → escalate

---

## Query Optimization

All Jira/Confluence queries use optimized patterns:
- Field limiting: `fields: ["key", "summary", "status"]`
- Pagination: `maxResults: 25`
- Indexed fields first in JQL

---

## Troubleshooting

**PR created but Jira not updated:**
- Check Jira API connectivity and permissions
- Verify issue key is valid
- Manually add PR link to Jira comment

**Reviewers not requested:**
- Verify Harness usernames are correct
- Check Harness Code repository access permissions
- Confirm account exists in Harness

**Tests not detected:**
- Configure TEST_COMMAND for your project type
- Ensure test runner is installed

**Harness API connection failed:**
- Verify HARNESS_API_KEY is valid
- Check HARNESS_ACCOUNT_ID, HARNESS_ORG_ID, HARNESS_PROJECT_ID
- Ensure network connectivity to app.harness.io

**Documentation section missing from PR:**
- Run Confluence discovery before PR creation
- Ensure required pages exist (TDD, Implementation Notes, Test Plan, Runbook)
- Use `/jira:docs` to generate missing documentation

## Integration

Complete development workflow:
```
/jira:work ABC-123 → develop → /jira:commit → /jira:pr ABC-123 → review → merge
```

## Related Commands

- `/jira:commit` - Create smart commit with Jira updates
- `/jira:sync` - Manually sync PR to Jira
- `/jira:work` - Start work on issue
- `/jira:docs` - Generate Confluence documentation

**⚓ Golden Armada** | *You ask - The Fleet Ships*
