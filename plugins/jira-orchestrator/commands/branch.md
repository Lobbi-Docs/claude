---
name: jira:branch
description: Create feature branch with Jira issue key naming and auto-transition
arguments:
  - name: issue_key
    description: Jira issue key (e.g., PROJ-123)
    required: true
  - name: description
    description: Branch description (kebab-case, auto-generated from issue if omitted)
    required: false
  - name: type
    description: Branch type (feature, bugfix, hotfix, release)
    default: feature
  - name: no_transition
    description: Skip auto-transitioning Jira issue to "In Progress"
    default: false
tags:
  - jira
  - git
  - branches
---

# Jira Branch Creation

Create a feature branch with Jira issue key naming, auto-generate description from issue summary, and optionally transition issue to "In Progress".

## Flags Table

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| issue_key | string | required | Issue identifier (PROJ-123) |
| description | string | optional | Branch description (kebab-case) |
| type | enum | feature | Branch type (feature, bugfix, hotfix, release) |
| no_transition | bool | false | Skip auto-transition to In Progress |

## Execution Steps

**Step 1: Validate Issue Key**
- Pattern: `[A-Z]+-[0-9]+` (e.g., ABC-123)
- Trim and uppercase
- Exit if invalid format

**Step 2: Git Repository Check**
- Verify in git repo
- Note uncommitted changes
- Fetch latest remote branches

**Step 3: Fetch Jira Issue**
- Get issue details (summary, status, type)
- Extract summary for auto-naming
- Exit if issue not found

**Step 4: Generate Description**
- Use provided or auto-generate from summary
- Convert to kebab-case (lowercase, hyphens only)
- Truncate to 50 characters max
- Remove special characters and consecutive hyphens

**Step 5: Build Branch Name**
```
{type}/{ISSUE-KEY}-{description}

Valid Types: feature, bugfix, hotfix, release
Example: feature/PROJ-123-implement-user-auth
```

**Step 6: Check Branch Existence**
- Skip if exists remotely (checkout)
- Error if exists locally and remotely
- Proceed if new

**Step 7: Create Branch**
- Create from current HEAD with git checkout -b
- Verify successful creation
- Switch to new branch

**Step 8: Transition Issue (Optional)**
- If no_transition=false, transition to "In Progress"
- Find matching transition name
- Add Jira comment with branch info
- Non-blocking if transition fails

## Usage Examples

```bash
# Basic: auto-generate description
/jira:branch PROJ-123

# Custom description
/jira:branch PROJ-123 user-auth

# Different branch types
/jira:branch PROJ-456 fix-memory-leak bugfix
/jira:branch PROJ-789 critical-patch hotfix

# Skip transition
/jira:branch PROJ-123 feature true
```

## Error Handling

| Error | Action |
|-------|--------|
| Invalid issue key | Exit immediately, show pattern |
| Not in git repo | Exit with helpful message |
| Issue not found | Exit, verify key and permissions |
| Branch exists locally & remotely | Exit, offer to checkout |
| Branch exists remotely only | Auto-checkout existing branch |
| Transition fails | Warning only, branch created |

## Branch Naming Convention

```
DO:
  ✅ feature/PROJ-123-short-description
  ✅ bugfix/PROJ-456-fix-specific-issue
  ✅ hotfix/PROJ-789-critical-patch

DON'T:
  ❌ PROJ-123 (no type)
  ❌ feature/proj-123 (lowercase key)
  ❌ feature/PROJ-123-Not-Kebab-Case
```

## Integration

- Pairs with `/jira:work` for orchestrated development
- Use before manual git work or with `/jira:pr`
- Auto-transitions issue to "In Progress" by default
- Preserves uncommitted changes in working directory

## Configuration

```bash
# Environment defaults
DEFAULT_BRANCH_TYPE=feature
BRANCH_DESC_MAX_LENGTH=50
TRANSITION_NAMES=("In Progress" "Start Progress" "In Development")
```

---

🎭 Golden Armada | Jira Orchestrator v1.0
