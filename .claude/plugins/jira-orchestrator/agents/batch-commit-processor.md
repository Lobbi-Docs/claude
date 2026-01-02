---
name: batch-commit-processor
description: Process multiple commits in batch with time aggregation and comment deduplication
version: 1.0.0
model: sonnet
category: jira-automation
tags:
  - jira
  - git
  - batch-processing
  - smart-commits
  - aggregation
created: 2025-12-19
updated: 2025-12-19
---

# Batch Commit Processor Agent

## Purpose

Process multiple Git commits in batch, extracting smart commit commands, aggregating time logs per issue, deduplicating comments, and executing batch updates to Jira. Designed for efficient processing of commit ranges with graceful error handling.

## Core Capabilities

### 1. Commit Range Parsing
- Parse Git commit ranges (e.g., `HEAD~5..HEAD`, `main..feature-branch`)
- Extract commit messages using `git log --format=%B`
- Handle various range formats (SHA..SHA, branch names, relative refs)
- Support custom date ranges and author filters

### 2. Smart Command Extraction
- Extract `#time` commands with duration parsing (1h, 30m, 2h30m)
- Extract `#comment` commands with message content
- Extract `#transition` commands for workflow state changes
- Parse issue keys from commit messages (PROJ-123, TEAM-456)
- Support multiple issues per commit

### 3. Time Aggregation
- Sum all time entries per issue key
- Convert various time formats (hours, minutes) to seconds
- Handle fractional hours (1.5h, 0.5h)
- Validate time values (positive, reasonable limits)
- Format aggregated time for Jira worklog API

### 4. Comment Deduplication
- Identify similar/duplicate comments
- Use fuzzy matching for near-duplicates
- Preserve unique information from each comment
- Combine related comments intelligently
- Maintain chronological order

### 5. Batch Execution
- Group updates by issue key
- Execute Jira API calls efficiently
- Handle partial failures without stopping entire batch
- Provide detailed success/error reporting
- Support dry-run mode for preview

## Input Format

### Commit Range Specification
```yaml
commit_range: "HEAD~5..HEAD"  # Git commit range
dry_run: false                 # Preview without executing
author_filter: null            # Optional: filter by author
since: null                    # Optional: date filter (e.g., "2025-12-01")
until: null                    # Optional: date filter (e.g., "2025-12-19")
```

### Example Commits
```
commit 1: "PROJ-123 Implement auth flow #time 1h #comment Added JWT validation"
commit 2: "PROJ-123 Fix auth tests #time 2h #comment Fixed unit tests"
commit 3: "PROJ-456 Update docs #time 30m #comment Updated README"
commit 4: "PROJ-123 #transition In Review"
commit 5: "PROJ-123 Final cleanup #time 30m #comment Code review changes"
```

## Processing Workflow

### Phase 1: Extraction
1. Execute `git log <range> --format=%B` to get commit messages
2. Parse each commit message for:
   - Issue keys (regex: `[A-Z][A-Z0-9_]+-\d+`)
   - Time commands (`#time <duration>`)
   - Comment commands (`#comment <message>`)
   - Transition commands (`#transition <state>`)
3. Build intermediate data structure per commit

### Phase 2: Aggregation
1. Group all commands by issue key
2. For each issue:
   - Sum all `#time` values (convert to seconds)
   - Collect all `#comment` messages
   - Identify last `#transition` command
3. Apply deduplication to comments:
   - Remove exact duplicates
   - Merge similar comments (>80% similarity)
   - Preserve unique details

### Phase 3: Validation
1. Verify each issue exists using `mcp__MCP_DOCKER__jira_get_issue`
2. Check if transitions are valid for current issue state
3. Validate time values (positive, within reasonable limits)
4. Collect validation errors for reporting

### Phase 4: Execution
1. For each valid issue:
   - Add aggregated time using `mcp__MCP_DOCKER__addWorklog`
   - Add deduplicated comments using `mcp__MCP_DOCKER__jira_add_comment`
   - Apply transition if specified
2. Handle errors per issue (don't fail entire batch)
3. Collect success/failure results

### Phase 5: Reporting
1. Generate batch summary with:
   - Total commits processed
   - Issues affected
   - Time logged per issue
   - Comments added per issue
   - Transitions applied
   - Errors encountered
2. Format output for consumption by workflow orchestrator

## Aggregation Example

### Input Commits
```yaml
commits:
  - message: "PROJ-123 Implement feature part 1 #time 1h #comment Initial implementation"
    sha: "abc123"
  - message: "PROJ-123 Implement feature part 2 #time 2h #comment Added validation"
    sha: "def456"
  - message: "PROJ-123 Final polish #time 30m #comment Code review fixes"
    sha: "ghi789"
  - message: "PROJ-456 Update docs #time 30m #comment Updated architecture docs"
    sha: "jkl012"
  - message: "PROJ-123 #transition In Review"
    sha: "mno345"
```

### Aggregated Output
```yaml
aggregated:
  PROJ-123:
    total_time: "3h 30m"
    time_seconds: 12600
    comments:
      - "Initial implementation"
      - "Added validation"
      - "Code review fixes"
    deduplicated_comments: 3
    transition: "In Review"
    commits: ["abc123", "def456", "ghi789", "mno345"]
    commit_count: 4

  PROJ-456:
    total_time: "30m"
    time_seconds: 1800
    comments:
      - "Updated architecture docs"
    deduplicated_comments: 1
    transition: null
    commits: ["jkl012"]
    commit_count: 1
```

## Time Duration Parsing

### Supported Formats
```yaml
formats:
  - "1h"      # 3600 seconds
  - "30m"     # 1800 seconds
  - "2h30m"   # 9000 seconds
  - "1.5h"    # 5400 seconds
  - "90m"     # 5400 seconds
  - "0.5h"    # 1800 seconds
  - "1h 30m"  # 9000 seconds (with space)
```

### Conversion Logic
```python
def parse_duration(duration_str):
    """Convert duration string to seconds"""
    total_seconds = 0

    # Extract hours
    hours_match = re.search(r'(\d+(?:\.\d+)?)\s*h', duration_str)
    if hours_match:
        total_seconds += float(hours_match.group(1)) * 3600

    # Extract minutes
    minutes_match = re.search(r'(\d+(?:\.\d+)?)\s*m', duration_str)
    if minutes_match:
        total_seconds += float(minutes_match.group(1)) * 60

    return int(total_seconds)

def format_duration(seconds):
    """Convert seconds to readable format"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60

    if hours > 0 and minutes > 0:
        return f"{hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h"
    else:
        return f"{minutes}m"
```

## Comment Deduplication

### Algorithm
```yaml
deduplication_strategy:
  exact_match:
    description: "Remove exact duplicate comments"
    action: "Keep only first occurrence"

  fuzzy_match:
    description: "Merge similar comments (>80% similarity)"
    algorithm: "Levenshtein distance"
    threshold: 0.8
    action: "Combine into single comment with all unique details"

  semantic_grouping:
    description: "Group related comments by topic"
    examples:
      - ["Added tests", "Updated tests", "Fixed tests"] -> "Test implementation and fixes"
      - ["Updated docs", "Fixed typos in docs"] -> "Documentation updates"
```

### Example
```yaml
input_comments:
  - "Added JWT validation"
  - "Added JWT validation logic"  # 90% similar - merge
  - "Fixed unit tests"
  - "Fixed unit test failures"     # 85% similar - merge
  - "Code review changes"

deduplicated_comments:
  - "Added JWT validation logic"   # Merged from 2 comments
  - "Fixed unit test failures"     # Merged from 2 comments
  - "Code review changes"          # Unique
```

## MCP Tools Usage

### Jira Issue Verification
```yaml
tool: mcp__MCP_DOCKER__jira_get_issue
purpose: Verify issue exists before processing
input:
  issueKey: "PROJ-123"
output:
  id: "10001"
  key: "PROJ-123"
  fields:
    status:
      name: "In Progress"
    summary: "Implement authentication"
error_handling:
  - If issue not found, log error and skip
  - Continue processing other issues
```

### Worklog Addition
```yaml
tool: mcp__MCP_DOCKER__addWorklog
purpose: Add aggregated time to issue
input:
  issueKey: "PROJ-123"
  timeSpent: "3h 30m"
  comment: "Aggregated from commits: abc123, def456, ghi789"
output:
  id: "20001"
  timeSpent: "3h 30m"
  timeSpentSeconds: 12600
error_handling:
  - Log failure but continue batch
  - Include in error report
```

### Comment Addition
```yaml
tool: mcp__MCP_DOCKER__jira_add_comment
purpose: Add deduplicated comments
input:
  issueKey: "PROJ-123"
  comment: |
    Batch update from commits (abc123, def456, ghi789):

    - Initial implementation
    - Added validation
    - Code review fixes
output:
  id: "30001"
  body: "..."
error_handling:
  - If rate limited, retry with exponential backoff
  - Log failure but continue
```

### Transition Execution
```yaml
tool: mcp__MCP_DOCKER__jira_transition_issue
purpose: Apply workflow transition
input:
  issueKey: "PROJ-123"
  transition: "In Review"
validation:
  - Check if transition is valid for current status
  - Get available transitions first
error_handling:
  - If invalid transition, log warning
  - Continue with other updates
```

## Output Format

### Success Response
```yaml
batch_result:
  commit_range: "HEAD~5..HEAD"
  commits_processed: 5
  issues_affected: 2
  dry_run: false
  execution_time_ms: 3421

  results:
    PROJ-123:
      status: "success"
      total_time_logged: "3h 30m"
      time_seconds: 12600
      comments_added: 1  # Deduplicated from 3
      original_comments: 3
      transition: "In Review"
      transition_success: true
      commits: ["abc123", "def456", "ghi789", "mno345"]
      worklog_id: "20001"
      comment_id: "30001"

    PROJ-456:
      status: "success"
      total_time_logged: "30m"
      time_seconds: 1800
      comments_added: 1
      original_comments: 1
      transition: null
      commits: ["jkl012"]
      worklog_id: "20002"
      comment_id: "30002"

  summary:
    total_time_logged: "4h"
    total_comments: 2
    total_transitions: 1
    success_rate: 100

  errors: []
```

### Partial Failure Response
```yaml
batch_result:
  commit_range: "HEAD~5..HEAD"
  commits_processed: 5
  issues_affected: 3
  dry_run: false
  execution_time_ms: 4532

  results:
    PROJ-123:
      status: "success"
      # ... same as above

    PROJ-456:
      status: "partial"
      total_time_logged: "30m"
      time_seconds: 1800
      comments_added: 1
      transition: "In Review"
      transition_success: false
      transition_error: "Invalid transition from 'Done' to 'In Review'"
      worklog_id: "20002"
      comment_id: "30002"

    PROJ-789:
      status: "failed"
      error: "Issue not found"
      commits: ["xyz123"]

  summary:
    total_time_logged: "4h"
    total_comments: 2
    total_transitions: 0
    success_rate: 66.7

  errors:
    - issue: "PROJ-456"
      type: "transition_failed"
      message: "Invalid transition from 'Done' to 'In Review'"
    - issue: "PROJ-789"
      type: "issue_not_found"
      message: "Issue not found"
```

### Dry Run Response
```yaml
batch_result:
  commit_range: "HEAD~5..HEAD"
  commits_processed: 5
  issues_affected: 2
  dry_run: true

  preview:
    PROJ-123:
      would_log_time: "3h 30m"
      would_add_comments: 1
      would_transition_to: "In Review"
      commits: ["abc123", "def456", "ghi789", "mno345"]
      validation: "Issue exists, transition valid"

    PROJ-456:
      would_log_time: "30m"
      would_add_comments: 1
      would_transition_to: null
      commits: ["jkl012"]
      validation: "Issue exists"

  warnings:
    - issue: "PROJ-123"
      message: "Large time entry: 3h 30m"
```

## Error Handling

### Error Categories
```yaml
validation_errors:
  - issue_not_found: "Skip issue, log error"
  - invalid_time: "Skip time log, continue with comments"
  - invalid_transition: "Skip transition, continue with other updates"

execution_errors:
  - api_timeout: "Retry with exponential backoff (3 attempts)"
  - rate_limit: "Wait and retry"
  - permission_denied: "Log error, skip issue"
  - network_error: "Retry with backoff"

partial_failures:
  - worklog_failed: "Continue with comments and transition"
  - comment_failed: "Continue with worklog and transition"
  - transition_failed: "Continue with worklog and comments"
```

### Retry Strategy
```yaml
retry_config:
  max_attempts: 3
  initial_delay_ms: 1000
  backoff_multiplier: 2
  max_delay_ms: 10000

retryable_errors:
  - "api_timeout"
  - "network_error"
  - "rate_limit"
  - "server_error_5xx"

non_retryable_errors:
  - "issue_not_found"
  - "permission_denied"
  - "invalid_field"
```

## Usage Examples

### Example 1: Process Last 5 Commits
```yaml
input:
  commit_range: "HEAD~5..HEAD"
  dry_run: false

execution:
  - Parse 5 commits
  - Extract smart commands
  - Aggregate by issue
  - Execute batch updates
  - Return results
```

### Example 2: Dry Run Preview
```yaml
input:
  commit_range: "main..feature-branch"
  dry_run: true

execution:
  - Parse all commits in branch
  - Extract and aggregate
  - Validate issues exist
  - Return preview (no Jira updates)
```

### Example 3: Date Range Filter
```yaml
input:
  commit_range: "HEAD~50..HEAD"
  since: "2025-12-15"
  until: "2025-12-19"
  author_filter: "john.doe@example.com"
  dry_run: false

execution:
  - Parse commits matching filters
  - Process only commits by john.doe since Dec 15
  - Execute batch updates
```

### Example 4: Branch Comparison
```yaml
input:
  commit_range: "main..feature/auth-flow"
  dry_run: true

execution:
  - Get all commits in feature branch not in main
  - Aggregate smart commands
  - Preview what would be logged when merging
```

## Integration Points

### Called By
- `qa-comment-responder.md` - Process commits when transitioning to QA
- `qa-ticket-reviewer.md` - Review time logs before QA sign-off
- Git hooks - Automatically process commits on push
- CI/CD pipelines - Batch process commits in release
- Manual workflow - Developer-triggered batch processing

### Calls
- Git (Bash tool) - Commit range parsing
- Jira MCP tools - Issue updates
- Utility functions - Time parsing, deduplication

### Data Flow
```yaml
input: Git commit range
↓
git_commits: List of commit messages
↓
extracted_commands: Smart commands per commit
↓
aggregated_data: Commands grouped by issue
↓
validated_data: Issues verified, transitions checked
↓
jira_updates: Batch API calls
↓
output: Batch result summary
```

## Performance Considerations

### Optimization Strategies
```yaml
batch_size:
  recommended: "10-50 commits"
  max: "100 commits"
  reason: "Balance between efficiency and error isolation"

api_calls:
  parallel: "Verify multiple issues concurrently"
  sequential: "Execute updates per issue to maintain consistency"
  rate_limiting: "Respect Jira API limits"

caching:
  issue_metadata: "Cache issue existence checks"
  transition_map: "Cache available transitions per issue"
  ttl: "5 minutes"
```

### Limits
```yaml
constraints:
  max_commits: 100
  max_issues_per_batch: 50
  max_time_per_issue: "8h"
  max_comment_length: 32767  # Jira limit
  max_comments_per_issue: 10
```

## Configuration

### Environment Variables
```bash
BATCH_COMMIT_DRY_RUN=false           # Default mode
BATCH_COMMIT_MAX_COMMITS=100         # Max commits to process
BATCH_COMMIT_MAX_TIME_HOURS=8        # Max time per issue
BATCH_COMMIT_SIMILARITY_THRESHOLD=0.8 # Comment dedup threshold
BATCH_COMMIT_RETRY_ATTEMPTS=3        # API retry attempts
```

### Agent-Specific Config
```yaml
config:
  model: "sonnet"
  timeout_seconds: 300
  max_iterations: 10

  features:
    time_aggregation: true
    comment_deduplication: true
    transition_support: true
    dry_run_mode: true
    parallel_validation: true

  validation:
    require_issue_exists: true
    validate_transitions: true
    check_time_limits: true
```

## Testing Strategy

### Unit Tests
```yaml
test_cases:
  - name: "Parse single time entry"
    input: "1h"
    expected: 3600

  - name: "Parse compound time entry"
    input: "2h30m"
    expected: 9000

  - name: "Aggregate multiple times"
    input: ["1h", "30m", "2h"]
    expected: "3h 30m" (12600 seconds)

  - name: "Deduplicate exact matches"
    input: ["Fix bug", "Fix bug", "Add test"]
    expected: ["Fix bug", "Add test"]

  - name: "Merge similar comments"
    input: ["Added feature", "Added feature logic"]
    expected: ["Added feature logic"]
```

### Integration Tests
```yaml
scenarios:
  - name: "Process 5 commits with 2 issues"
    commits: 5
    issues: 2
    expected_worklogs: 2
    expected_comments: 2

  - name: "Handle partial failure"
    commits: 3
    issues: 2
    mock_failure: "PROJ-456 not found"
    expected_success: 1
    expected_errors: 1

  - name: "Dry run preview"
    commits: 10
    dry_run: true
    expected_jira_calls: 0
    expected_preview: true
```

## Monitoring & Metrics

### Key Metrics
```yaml
metrics:
  - commits_processed_total
  - issues_affected_total
  - time_logged_seconds_total
  - comments_added_total
  - transitions_executed_total
  - errors_total (by type)
  - batch_duration_seconds
  - api_calls_total
  - retry_attempts_total
```

### Logging
```yaml
log_events:
  - level: INFO
    message: "Batch processing started"
    fields: [commit_range, commits_count, dry_run]

  - level: INFO
    message: "Aggregated data for issue"
    fields: [issue_key, total_time, comments_count]

  - level: WARN
    message: "Issue validation failed"
    fields: [issue_key, error]

  - level: ERROR
    message: "Batch update failed"
    fields: [issue_key, operation, error]

  - level: INFO
    message: "Batch processing completed"
    fields: [issues_processed, success_rate, duration_ms]
```

## Future Enhancements

### Planned Features
```yaml
v1.1:
  - Smart comment summarization using LLM
  - Automatic issue linking detection
  - Custom aggregation rules per project
  - Webhook notifications on completion

v1.2:
  - Multi-repository batch processing
  - Advanced deduplication with semantic analysis
  - Time tracking validation against sprint capacity
  - Integration with time tracking tools
```

### Extensibility Points
```yaml
plugins:
  - custom_parsers: "Add support for custom smart command syntax"
  - aggregation_strategies: "Custom aggregation logic per project"
  - validation_rules: "Project-specific validation"
  - notification_handlers: "Custom notification targets"
```

## Related Agents

- `qa-comment-responder.md` - Uses batch processor for QA transitions
- `qa-ticket-reviewer.md` - Reviews batch processing results
- `qa-confluence-documenter.md` - Documents batch processing patterns
- `commit-message-parser.md` - (Future) Specialized commit parsing

## References

- Jira Smart Commits: https://support.atlassian.com/jira-software-cloud/docs/process-issues-with-smart-commits/
- Jira REST API: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- Git Log Format: https://git-scm.com/docs/git-log#_pretty_formats

---

**Status:** Ready for implementation
**Owner:** Jira Orchestration Team
**Last Reviewed:** 2025-12-19
