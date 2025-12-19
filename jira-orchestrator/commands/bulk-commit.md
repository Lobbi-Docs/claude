---
name: bulk-commit
description: Process multiple existing commits and send aggregated updates to Jira
arguments:
  - name: commit-range
    description: Git commit range (e.g., HEAD~5..HEAD, main..feature)
    required: true
  - name: aggregate-time
    description: Aggregate time logs per issue instead of individual logs
    required: false
    default: true
  - name: deduplicate-comments
    description: Combine similar comments instead of adding duplicates
    required: false
    default: true
  - name: dry-run
    description: Preview what would be sent to Jira without executing
    required: false
    default: false
  - name: skip-errors
    description: Continue processing even if individual commits fail
    required: false
    default: true
  - name: verbose
    description: Show detailed processing output
    required: false
    default: false
tags:
  - jira
  - git
  - batch
  - smart-commits
  - time-tracking
---

# Bulk Commit Processing Workflow

This command processes multiple existing commits in batch and sends aggregated updates to Jira using smart commit syntax.

## Prerequisites

- Atlassian Cloud access configured
- Git repository with commit history
- Jira project access with edit permissions
- Commits using Jira smart commit syntax

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BULK COMMIT PROCESSING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   PARSE     │ -> │  AGGREGATE  │ -> │   PREVIEW   │ -> │   EXECUTE   │ │
│   │  Commits    │    │  Commands   │    │  Changes    │    │   Updates   │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                  │                  │                  │         │
│         v                  v                  v                  v         │
│   Extract smart      Group by issue     Show planned      Apply to Jira   │
│   commit commands    Deduplicate         updates          if not dry-run  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Smart Commit Syntax Support

The command recognizes standard Jira smart commit syntax:

```
<ISSUE-KEY> #<command> <arguments>
```

**Supported Commands:**
- `#time <value> <unit>` - Log work time
- `#comment <text>` - Add comment
- `#<transition>` - Transition issue (e.g., #done, #in-progress)

**Examples:**
```
LF-27 #time 2h 30m #comment Fixed authentication bug
PROJ-123 #done #comment Feature complete and tested
LF-28 #in-review #time 1h #comment Ready for review
```

## Execution Steps

### Step 1: Environment Setup

First, establish connection to Atlassian:

```yaml
action: Get Atlassian Resources
tool: mcp__plugin_jira-orchestrator_atlassian__getAccessibleAtlassianResources
expected_output:
  - cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  - site: thelobbi.atlassian.net
```

### Step 2: Parse Commit Range

Extract commits from the specified range:

```yaml
action: Get Commit History
tool: git log
parameters:
  range: ${commit-range}
  format: "%H|%an|%ae|%ai|%s|%b"
  no-merges: true
output:
  commits: [
    {
      hash: "abc123...",
      author_name: "John Doe",
      author_email: "john@example.com",
      date: "2025-12-19T10:30:00Z",
      subject: "LF-27 #time 2h 30m #comment Fixed auth bug",
      body: "Detailed description..."
    }
  ]
```

**Git Command:**
```bash
git log --no-merges --format="%H|%an|%ae|%ai|%s|%b" ${commit-range}
```

### Step 3: Extract Smart Commit Commands

Parse each commit for Jira smart commit syntax:

```yaml
action: Parse Smart Commits
processing:
  - Scan subject and body for issue keys (e.g., LF-27, PROJ-123)
  - Extract time logging commands (#time 2h 30m)
  - Extract comments (#comment text)
  - Extract transitions (#done, #in-progress, #in-review)
  - Associate commands with issue keys
  - Track commit metadata (hash, author, date)
output:
  issue_commands: {
    "LF-27": {
      commits: ["abc123", "def456"],
      time_logs: [
        { value: 150, unit: "m", commit: "abc123", date: "..." },
        { value: 60, unit: "m", commit: "def456", date: "..." }
      ],
      comments: [
        { text: "Fixed auth bug", commit: "abc123" },
        { text: "Added tests", commit: "def456" }
      ],
      transitions: [
        { state: "In Review", commit: "def456" }
      ]
    }
  }
```

**Pattern Matching:**
```regex
Issue Key: ([A-Z]+-\d+)
Time Log: #time\s+(\d+)\s*([hm])\s*(\d+)?\s*([hm])?
Comment: #comment\s+(.+?)(?=#|$)
Transition: #([\w-]+)(?:\s|$)
```

### Step 4: Aggregate Commands

Group and deduplicate commands per issue:

```yaml
action: Aggregate Issue Commands
parameters:
  aggregate_time: ${aggregate-time}
  deduplicate_comments: ${deduplicate-comments}
processing:
  time_aggregation:
    - Sum all time logs per issue
    - Convert to consistent unit (minutes)
    - Preserve individual logs if aggregate_time=false
  comment_deduplication:
    - Compare comment similarity (Levenshtein distance)
    - Merge similar comments (>80% similarity)
    - Preserve unique comments
    - Maintain chronological order
  transition_resolution:
    - Use most recent transition per issue
    - Warn if conflicting transitions detected
output:
  aggregated_commands: {
    "LF-27": {
      total_time: 210, # minutes
      unique_comments: [
        "Fixed auth bug and added tests"
      ],
      final_transition: "In Review",
      commit_count: 2,
      original_time_logs: [...] # if aggregate_time=false
    }
  }
```

**Comment Deduplication Algorithm:**
```
1. Group comments by issue
2. For each comment pair:
   - Calculate similarity score
   - If similarity > 80%: merge into single comment
3. Combine merged comments with connector ("; ")
4. Preserve distinct comments separately
```

### Step 5: Preview Changes (Dry Run or Verbose)

Generate preview of planned updates:

```yaml
action: Generate Preview
conditions:
  - dry_run: true OR verbose: true
output_format: markdown
output:
  preview: |
    ## Bulk Commit Preview

    **Commit Range:** HEAD~5..HEAD
    **Commits Found:** 5
    **Issues Affected:** 2

    ### LF-27
    - **Commits:** 3 (abc123, def456, ghi789)
    - **Total Time:** 4h 30m (270 minutes, aggregated from 3 commits)
    - **Comments:** 2 unique (3 total, 1 deduplicated)
      - "Fixed authentication bug and added tests"
      - "Updated documentation"
    - **Transition:** "In Review" (from commit ghi789)

    ### PROJ-456
    - **Commits:** 2 (jkl012, mno345)
    - **Total Time:** 1h 15m (75 minutes, aggregated from 2 commits)
    - **Comments:** 2 unique
      - "Implemented feature X"
      - "Added unit tests"
    - **Transition:** None

    **To execute:** Remove --dry-run flag
```

### Step 6: Execute Updates (Agent: jira-bulk-updater)

Apply aggregated updates to Jira:

```yaml
agent: jira-bulk-updater
model: sonnet
conditions:
  - dry_run: false
tasks:
  - Validate issue existence for each key
  - Apply time logs (aggregated or individual)
  - Post comments with commit metadata
  - Execute transitions (most recent only)
  - Handle errors per skip_errors setting
  - Track success/failure per issue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  skip_errors: ${skip-errors}
output:
  results: {
    "LF-27": {
      status: "success",
      time_logged: "4h 30m",
      comments_posted: 2,
      transition_applied: "In Review"
    },
    "PROJ-456": {
      status: "partial",
      time_logged: "1h 15m",
      comments_posted: 2,
      transition_applied: null,
      error: "Invalid transition state"
    }
  }
```

**Jira API Calls:**

**Log Work:**
```yaml
tool: mcp__plugin_jira-orchestrator_atlassian__addJiraWorklog
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: LF-27
  timeSpentSeconds: 16200  # 4h 30m
  started: "2025-12-19T10:30:00.000+0000"
  comment: "Aggregated from 3 commits (abc123, def456, ghi789)"
```

**Add Comment:**
```yaml
tool: mcp__plugin_jira-orchestrator_atlassian__addJiraComment
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: LF-27
  body: |
    Fixed authentication bug and added tests

    _From commits: abc123, def456_
```

**Transition Issue:**
```yaml
tool: mcp__plugin_jira-orchestrator_atlassian__transitionJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: LF-27
  transitionId: [resolved from state name]
  comment: "Transitioned via bulk commit (ghi789)"
```

### Step 7: Generate Summary Report

Compile final results:

```yaml
action: Generate Summary
output_format: markdown
output: |
  ## Bulk Commit Processing Summary

  **Date:** 2025-12-19T12:45:00Z
  **Commit Range:** HEAD~5..HEAD
  **Mode:** ${dry-run ? "DRY RUN" : "EXECUTED"}

  ### Commits Processed

  - **Total Commits:** 5
  - **Issues Affected:** 2
  - **Successful Updates:** 2
  - **Failed Updates:** 0
  - **Skipped Commits:** 0 (no smart commit syntax)

  ### Aggregation Results

  - **Time Aggregation:** ${aggregate-time ? "Enabled" : "Disabled"}
    - Total Time Logged: 5h 45m (across 2 issues)
  - **Comment Deduplication:** ${deduplicate-comments ? "Enabled" : "Disabled"}
    - Original Comments: 5
    - Unique Comments Posted: 4 (1 merged)
  - **Transitions Applied:** 1

  ### Issues Updated

  | Issue | Commits | Time Logged | Comments | Transition | Status |
  |-------|---------|-------------|----------|------------|--------|
  | LF-27 | 3 | 4h 30m | 2 | In Review | ✓ Success |
  | PROJ-456 | 2 | 1h 15m | 2 | - | ✓ Success |

  ### Detailed Results

  #### LF-27
  - **Commits:** abc123, def456, ghi789
  - **Time:** 4h 30m (aggregated from 3 entries)
  - **Comments Posted:**
    1. "Fixed authentication bug and added tests" (merged from 2 similar)
    2. "Updated documentation"
  - **Transition:** None → In Review
  - **Status:** ✓ Successfully updated

  #### PROJ-456
  - **Commits:** jkl012, mno345
  - **Time:** 1h 15m (aggregated from 2 entries)
  - **Comments Posted:**
    1. "Implemented feature X"
    2. "Added unit tests"
  - **Transition:** None
  - **Status:** ✓ Successfully updated

  ### Links

  - [LF-27](https://thelobbi.atlassian.net/browse/LF-27)
  - [PROJ-456](https://thelobbi.atlassian.net/browse/PROJ-456)

  ### Execution Time

  - **Started:** 2025-12-19T12:45:00Z
  - **Completed:** 2025-12-19T12:45:15Z
  - **Duration:** 15 seconds
```

## Usage Examples

### Preview bulk update without executing
```bash
/jira:bulk-commit HEAD~5..HEAD --dry-run
```

**Output:**
```markdown
## Bulk Commit Preview

**Commit Range:** HEAD~5..HEAD
**Commits Found:** 5
**Issues Affected:** 2

### LF-27
- **Total Time:** 4h 30m (aggregated from 3 commits)
- **Comments:** 2 unique (3 total, 1 deduplicated)
- **Transition:** "In Review" (from last commit)

### PROJ-456
- **Total Time:** 1h 15m (aggregated from 2 commits)
- **Comments:** 2 unique
- **Transition:** None

**To execute:** Remove --dry-run flag
```

### Process feature branch commits
```bash
/jira:bulk-commit main..feature/PROJ-123
```

Process all commits from main to the feature branch and update Jira.

### Process release commits with aggregation
```bash
/jira:bulk-commit v1.0.0..v1.1.0 --aggregate-time
```

Process all commits between two release tags with time aggregation.

### Process without deduplication
```bash
/jira:bulk-commit HEAD~10..HEAD --deduplicate-comments=false
```

Post all comments individually without merging similar ones.

### Verbose output without dry run
```bash
/jira:bulk-commit HEAD~5..HEAD --verbose
```

Execute updates but show detailed preview before execution.

### Process with individual time logs
```bash
/jira:bulk-commit HEAD~5..HEAD --aggregate-time=false
```

Log each commit's time separately instead of aggregating.

## Aggregation Strategies

### Time Log Aggregation

**Enabled (default):**
```
Commits:
  - LF-27 #time 2h
  - LF-27 #time 1h 30m
  - LF-27 #time 1h

Result: Single worklog of 4h 30m
```

**Disabled:**
```
Result: Three separate worklogs (2h, 1h 30m, 1h)
```

### Comment Deduplication

**Enabled (default):**
```
Commits:
  - "Fixed auth bug"
  - "Fixed authentication bug"
  - "Updated docs"

Result:
  - "Fixed auth bug" (merged with similar)
  - "Updated docs"
```

**Disabled:**
```
Result: All three comments posted separately
```

## Error Handling

### Skip Errors Mode (default: true)

**Enabled:**
- Continue processing remaining issues
- Log failures in summary
- Return partial success status

**Disabled:**
- Stop on first error
- Rollback is not supported (Jira changes are immediate)
- Return failure status

### Common Errors

**Issue Not Found:**
```
Error: Issue LF-999 not found
Action: Skip issue, continue processing
Logged: Yes, in summary report
```

**Invalid Transition:**
```
Error: Invalid transition "Complete" for issue LF-27
Action: Skip transition, apply other commands
Logged: Yes, with available transitions
```

**Permission Denied:**
```
Error: No permission to log work on PROJ-123
Action: Skip time log, apply other commands
Logged: Yes, in summary report
```

**API Rate Limit:**
```
Error: Jira API rate limit exceeded
Action: Exponential backoff and retry (3 attempts)
Logged: Yes, with retry count
```

## Dry Run Mode

When `--dry-run` flag is set:

1. **All parsing runs normally:** Commits are analyzed
2. **Aggregation runs normally:** Commands are grouped
3. **Preview is generated:** Full report of planned changes
4. **NO Jira updates:** Nothing is sent to Jira
5. **Validation runs:** Issues are checked for existence

**Dry Run Benefits:**
- Verify commit parsing accuracy
- Review aggregation results
- Identify potential errors before execution
- Test commit range selection

## Verbose Mode

When `--verbose` flag is set:

1. **Shows commit parsing details:** Each commit and extracted commands
2. **Displays aggregation process:** Before/after for each issue
3. **Generates preview:** Same as dry run
4. **Executes updates:** Unless --dry-run is also set
5. **Shows API responses:** Detailed Jira API results

**Verbose Output Example:**
```markdown
### Parsing Commits...

**Commit:** abc123 (John Doe, 2025-12-19 10:30)
- Subject: LF-27 #time 2h 30m #comment Fixed auth bug
- Extracted Commands:
  - Issue: LF-27
  - Time: 2h 30m (150 minutes)
  - Comment: "Fixed auth bug"

**Commit:** def456 (Jane Smith, 2025-12-19 11:45)
- Subject: LF-27 #time 1h #in-review
- Extracted Commands:
  - Issue: LF-27
  - Time: 1h (60 minutes)
  - Transition: In Review

### Aggregating Commands for LF-27...

**Time Logs:**
- Original: 2h 30m, 1h
- Aggregated: 3h 30m (210 minutes)

**Comments:**
- Original: 1 ("Fixed auth bug")
- After Deduplication: 1 (no duplicates)

**Transitions:**
- Latest: In Review (from def456)

### Executing Updates...

**LF-27:**
- ✓ Logged work: 3h 30m (worklog ID: 12345)
- ✓ Posted comment (comment ID: 67890)
- ✓ Transitioned to In Review
```

## Integration with Development Workflow

### After Feature Branch Completion

```bash
# Develop feature with smart commits
git commit -m "LF-27 #time 1h #comment Initial implementation"
git commit -m "LF-27 #time 2h #comment Added tests"
git commit -m "LF-27 #time 30m #in-review #comment Ready for review"

# Bulk process before merge
/jira:bulk-commit main..feature/LF-27 --dry-run
/jira:bulk-commit main..feature/LF-27
```

### Release Processing

```bash
# Process all commits in release
/jira:bulk-commit v1.0.0..v1.1.0 --aggregate-time

# Generate release summary in Jira
```

### Sprint Retrospective

```bash
# Review time logged for sprint commits
/jira:bulk-commit --since "2 weeks ago" --dry-run --verbose

# Bulk update if missing logs
```

## Integration with Other Commands

### After /jira-orchestrator:work

```bash
# Work on issue with commits
/jira-orchestrator:work LF-27

# Later, bulk process branch
/jira:bulk-commit main..feature/LF-27
```

### Before /jira-orchestrator:pr

```bash
# Bulk process commits
/jira:bulk-commit main..feature/LF-27

# Create PR with updated Jira state
/jira-orchestrator:pr LF-27
```

## Performance Considerations

### Batch Size Recommendations

| Commits | Processing Time | Recommendation |
|---------|----------------|----------------|
| 1-10 | < 30s | Optimal |
| 10-50 | 30s - 2m | Good |
| 50-100 | 2m - 5m | Consider splitting |
| 100+ | 5m+ | Split into ranges |

### API Rate Limits

**Atlassian Cloud Rate Limits:**
- 10 requests per second per IP
- 3600 requests per hour per user

**Mitigation:**
- Batch API calls where possible
- Implement exponential backoff
- Process in smaller ranges if needed

### Memory Usage

**Commit Range Limits:**
- Recommended: < 100 commits
- Maximum: 1000 commits
- Large ranges: Process in batches

## Success Criteria

A successful bulk commit processing session means:

- [ ] All commits in range parsed
- [ ] Smart commit syntax correctly extracted
- [ ] Commands aggregated per configuration
- [ ] Dry run preview (if requested) generated
- [ ] Jira updates applied without errors
- [ ] Summary report generated
- [ ] All affected issues updated consistently

## Troubleshooting

### No Smart Commits Found

**Symptoms:**
```
Commits Found: 10
Issues Affected: 0
```

**Causes:**
- Commits don't use smart commit syntax
- Issue keys not in recognized format
- Commands not properly formatted

**Solution:**
```bash
# Review commit messages
git log HEAD~10..HEAD --oneline

# Check for pattern: ISSUE-123 #command
```

### Time Aggregation Incorrect

**Symptoms:**
```
Expected: 5h 30m
Actual: 3h 30m
```

**Causes:**
- Parsing error on time format
- Mixed time units not converted
- Partial commit range

**Solution:**
```bash
# Use verbose mode to see parsing
/jira:bulk-commit HEAD~5..HEAD --verbose --dry-run

# Check individual commit parsing
```

### Deduplication Too Aggressive

**Symptoms:**
```
Original Comments: 5
After Deduplication: 1
```

**Causes:**
- Similarity threshold too low
- Comments genuinely similar

**Solution:**
```bash
# Disable deduplication
/jira:bulk-commit HEAD~5..HEAD --deduplicate-comments=false

# Review with verbose mode first
/jira:bulk-commit HEAD~5..HEAD --verbose --dry-run
```

### Transition Failures

**Symptoms:**
```
Error: Invalid transition "Complete" for LF-27
```

**Causes:**
- Transition name doesn't match workflow
- Issue in state that doesn't allow transition
- Permission issues

**Solution:**
```bash
# Check available transitions in Jira
# Use exact transition name from workflow
# Verify current issue state

# Get issue details
/jira:get-issue LF-27
```

## Related Commands

- `/jira-orchestrator:work` - Full development workflow with auto-commits
- `/jira-orchestrator:sync` - Sync individual commit to Jira
- `/jira-orchestrator:pr` - Create PR with Jira integration
- `/jira:get-issue` - Get issue details and available transitions

## Examples

### Review sprint commits before applying
```bash
/jira:bulk-commit HEAD~20..HEAD --dry-run --verbose
```

### Process feature branch with all aggregation
```bash
/jira:bulk-commit main..feature/PROJ-123 --aggregate-time --deduplicate-comments
```

### Process release with individual time logs
```bash
/jira:bulk-commit v1.0.0..v1.1.0 --aggregate-time=false
```

### Emergency update with error skipping
```bash
/jira:bulk-commit main..hotfix/urgent --skip-errors
```

### Detailed audit trail (no aggregation)
```bash
/jira:bulk-commit HEAD~10..HEAD --aggregate-time=false --deduplicate-comments=false
```

## Advanced Usage

### Custom Commit Range Syntax

**Last N commits:**
```bash
/jira:bulk-commit HEAD~5..HEAD
```

**Between branches:**
```bash
/jira:bulk-commit main..develop
```

**Between tags:**
```bash
/jira:bulk-commit v1.0.0..v1.1.0
```

**Since date:**
```bash
/jira:bulk-commit --since="2025-12-01"
```

**Specific commits:**
```bash
/jira:bulk-commit abc123..def456
```

### Combined Flags

**Full audit mode:**
```bash
/jira:bulk-commit HEAD~10..HEAD \
  --aggregate-time=false \
  --deduplicate-comments=false \
  --verbose
```

**Safe preview mode:**
```bash
/jira:bulk-commit HEAD~20..HEAD \
  --dry-run \
  --verbose \
  --skip-errors=false
```

**Quick batch update:**
```bash
/jira:bulk-commit main..feature/PROJ-123 \
  --aggregate-time \
  --skip-errors
```

## Output Formats

### Summary Table

```markdown
| Issue | Commits | Time | Comments | Transition | Status |
|-------|---------|------|----------|------------|--------|
| LF-27 | 3 | 4h 30m | 2 | In Review | ✓ |
| LF-28 | 2 | 1h 15m | 1 | - | ✓ |
| PROJ-123 | 1 | 30m | 1 | Done | ✗ Error |
```

### Detailed Report

```markdown
## LF-27
**Commits:** abc123, def456, ghi789
**Time Logged:** 4h 30m (aggregated from 3 entries)
**Comments:**
- "Fixed authentication bug and added tests"
- "Updated documentation"
**Transition:** In Review
**Status:** ✓ Success
```

### Error Log

```markdown
## Errors

### PROJ-123
**Error:** Invalid transition "Complete"
**Commits Affected:** jkl012
**Available Transitions:** To Do, In Progress, In Review, Done
**Suggestion:** Use #done instead of #complete
```
