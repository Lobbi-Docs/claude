---
name: jira:bulk-commit
description: Process multiple existing commits and send aggregated updates to Jira
arguments:
  - name: commit-range
    description: Git commit range (e.g., HEAD~5..HEAD, main..feature)
    required: true
  - name: aggregate-time
    description: Aggregate time logs per issue instead of individual logs
    default: true
  - name: deduplicate-comments
    description: Combine similar comments instead of adding duplicates
    default: true
  - name: dry-run
    description: Preview changes without executing
    default: false
  - name: skip-errors
    description: Continue processing even if individual commits fail
    default: true
  - name: verbose
    description: Show detailed processing output
    default: false
tags:
  - jira
  - git
  - batch
  - smart-commits
  - time-tracking
---

# Bulk Commit Processing

Process multiple commits and send aggregated updates to Jira using smart commit syntax.

## Smart Commit Syntax

```
<ISSUE-KEY> #<command> <arguments>

Supported: #time <value>, #comment <text>, #<transition>
Examples:
  LF-27 #time 2h 30m #comment Fixed auth bug
  PROJ-123 #done #comment Complete
  LF-28 #in-review #time 1h
```

## Workflow

1. **Parse Commits** - Extract issue keys and commands from git log
2. **Aggregate** - Group time logs per issue, deduplicate comments
3. **Preview** - Show planned changes (--dry-run or --verbose)
4. **Execute** - Apply time logs, comments, and transitions to Jira

## Key Processing Rules

| Task | Default | Notes |
|------|---------|-------|
| Time Aggregation | On | Sum all time logs per issue |
| Comment Dedup | On | Merge similar comments (>80%) |
| Error Handling | Skip | Continue if individual commits fail |
| Dry Run | Off | Preview without making changes |

## Usage Examples

```bash
# Preview bulk update
/jira:bulk-commit HEAD~5..HEAD --dry-run

# Process feature branch
/jira:bulk-commit main..feature/PROJ-123

# Process with individual time logs
/jira:bulk-commit HEAD~5..HEAD --aggregate-time=false

# Verbose execution
/jira:bulk-commit HEAD~5..HEAD --verbose
```

## Error Handling

- **Issue Not Found** - Skip issue, continue processing
- **Invalid Transition** - Skip transition, apply other commands
- **Permission Denied** - Skip command, continue
- **API Rate Limit** - Exponential backoff (3 attempts)

## Integration

- Pairs with `/jira:work` for orchestrated development
- Use before `/jira:pr` to ensure Jira is synced
- Works with smart commit convention in repos

---

🎭 Golden Armada | Jira Orchestrator v1.0
