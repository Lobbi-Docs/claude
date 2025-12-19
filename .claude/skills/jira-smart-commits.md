---
name: jira-smart-commits
description: Generate and validate Jira smart commit messages with automatic issue linking, commenting, time logging, and status transitions
category: jira
keywords:
  - jira
  - smart-commits
  - git
  - commit
  - time-tracking
  - workflow
  - issue-transition
model: sonnet-4.5
arguments:
  - name: issue-key
    description: Jira issue key (e.g., PROJ-123)
    required: false
  - name: command
    description: Smart commit command (comment, time, transition)
    required: false
  - name: message
    description: Commit message or command parameter
    required: false
tags:
  - type/skill
  - category/jira
  - category/git
  - status/active
---

# Jira Smart Commits Skill

Generate and validate Jira smart commit messages that automatically:
- Link commits to Jira issues
- Add comments to issues
- Log work time
- Transition issues between statuses

## Smart Commits Syntax Reference

### Issue Key Format

```regex
[A-Z]{2,10}-\d+
```

**Examples:**
- `PROJ-123`
- `ALPHA-456`
- `MYPROJECT-789`

**Rules:**
- Issue key MUST appear before any commands
- Project key: 2-10 uppercase letters
- Issue number: 1+ digits

### Available Commands

#### 1. Comment Command

**Syntax:** `#comment <message>`

**Purpose:** Add a comment to the Jira issue

**Examples:**
```bash
# Simple comment
PROJ-123 #comment Fixed the login validation bug

# Comment with technical details
PROJ-123 #comment Refactored authentication service to use JWT tokens

# Multi-line comment (use git commit body)
PROJ-123 #comment Added user authentication

Implemented JWT-based auth with refresh tokens.
Updated tests and documentation.
```

**Best Practices:**
- Keep comments concise and meaningful
- Reference what was changed and why
- Include technical context for future reference

#### 2. Time Tracking Command

**Syntax:** `#time <duration> [<comment>]`

**Duration Format:** `[Xw] [Xd] [Xh] [Xm]`
- `w` = weeks (5 working days)
- `d` = days (8 working hours)
- `h` = hours
- `m` = minutes

**Examples:**
```bash
# Log 2 hours
PROJ-123 #time 2h Implemented user authentication

# Log 30 minutes
PROJ-123 #time 30m Quick bug fix

# Log 1 hour 30 minutes
PROJ-123 #time 1h 30m Refactored login service

# Log 2 days
PROJ-123 #time 2d Completed feature implementation

# Log complex duration
PROJ-123 #time 1w 2d 4h 30m Full sprint work on authentication module
```

**Duration Calculations:**
- `1w` = 5 days = 40 hours
- `1d` = 8 hours
- `2h 30m` = 2.5 hours = 150 minutes
- `1w 1d` = 6 days = 48 hours

**Best Practices:**
- Log time immediately after completing work
- Be realistic with estimates
- Include work comment for context
- Round to nearest 15-minute interval

#### 3. Transition Command

**Syntax:** `#transition <status>`

**Purpose:** Move issue to a new workflow status

**Common Statuses:**
- `To Do` - Not started
- `In Progress` - Actively working
- `In Review` - Ready for code review
- `QA` - Ready for testing
- `Done` - Completed
- `Blocked` - Cannot proceed

**Examples:**
```bash
# Start work on issue
PROJ-123 #transition In Progress Starting authentication implementation

# Move to review
PROJ-123 #transition In Review Completed implementation, ready for review

# Mark as done
PROJ-123 #transition Done All tests passing, feature complete

# Move to QA
PROJ-123 #transition QA Ready for testing on staging environment
```

**Status Name Rules:**
- Use exact status names from your Jira workflow
- Case-sensitive in some Jira configurations
- Enclose multi-word statuses in quotes if needed
- Check workflow transitions are valid

**Best Practices:**
- Verify status exists in your workflow
- Only transition when work stage actually changes
- Include reason for transition in commit message
- Ensure you have permission to perform transition

### Multi-Command Commits

**Syntax:** Combine multiple commands in single commit

**Examples:**
```bash
# Comment + Time
PROJ-123 #comment Fixed validation bug #time 1h

# Time + Transition
PROJ-123 #time 2h #transition In Review Completed user authentication

# All three commands
PROJ-123 #comment Added JWT auth #time 3h #transition Done

# Complex workflow
PROJ-123 #comment Implemented OAuth2 flow #time 4h 30m #transition In Review
```

**Command Order:**
- Issue key MUST be first
- Command order doesn't matter after issue key
- Separate commands with spaces
- Each command processes independently

## Validation Rules

### Issue Key Validation

```javascript
function validateIssueKey(key) {
  const pattern = /^[A-Z]{2,10}-\d+$/;
  return pattern.test(key);
}

// Valid
validateIssueKey("PROJ-123")    // true
validateIssueKey("ALPHA-1")     // true
validateIssueKey("MYTEAM-9999") // true

// Invalid
validateIssueKey("proj-123")    // false (lowercase)
validateIssueKey("P-123")       // false (too short)
validateIssueKey("PROJ123")     // false (no dash)
validateIssueKey("PROJ-")       // false (no number)
```

### Duration Validation

```javascript
function validateDuration(duration) {
  const pattern = /^(\d+w\s?)?(\d+d\s?)?(\d+h\s?)?(\d+m\s?)?$/;
  return pattern.test(duration.trim());
}

// Valid
validateDuration("2h")          // true
validateDuration("1h 30m")      // true
validateDuration("1w 2d 4h")    // true

// Invalid
validateDuration("2hours")      // false
validateDuration("90m")         // true (but use 1h 30m)
validateDuration("2.5h")        // false (no decimals)
```

### Smart Commit Pattern Validation

```javascript
function validateSmartCommit(message) {
  const issueKeyPattern = /^[A-Z]{2,10}-\d+/;
  const commandPattern = /#(comment|time|transition)/;

  const hasIssueKey = issueKeyPattern.test(message);
  const hasCommand = commandPattern.test(message);

  return {
    valid: hasIssueKey,
    hasCommands: hasCommand,
    issueKey: message.match(issueKeyPattern)?.[0]
  };
}

// Valid commits
validateSmartCommit("PROJ-123 #comment Fixed bug")
// { valid: true, hasCommands: true, issueKey: "PROJ-123" }

validateSmartCommit("PROJ-123 Update README")
// { valid: true, hasCommands: false, issueKey: "PROJ-123" }

// Invalid commits
validateSmartCommit("#comment Fix without issue key")
// { valid: false, hasCommands: true, issueKey: null }
```

## Branch Naming Integration

### Automatic Issue Linking

Branches named with issue keys automatically link commits:

```bash
# Create branch with issue key
git checkout -b PROJ-123-add-user-auth

# Normal commits auto-link to PROJ-123
git commit -m "Add JWT token generation"
git commit -m "Add refresh token support"

# Smart commits work too
git commit -m "#comment Implemented OAuth2 #time 2h"
```

**Branch Naming Conventions:**
```
<issue-key>-<description>
<issue-key>-<type>/<description>
<type>/<issue-key>-<description>
```

**Examples:**
- `PROJ-123-user-authentication`
- `PROJ-123-feature/oauth2-login`
- `feature/PROJ-123-add-sso`
- `bugfix/PROJ-456-fix-validation`

## Usage Examples

### Development Workflow

```bash
# 1. Start work on issue
git checkout -b PROJ-123-user-auth
git commit -m "PROJ-123 #transition In Progress Initial setup"

# 2. Make progress commits
git commit -m "PROJ-123 #comment Added JWT service #time 1h"
git commit -m "PROJ-123 #comment Added token validation #time 45m"

# 3. Complete feature
git commit -m "PROJ-123 #comment Tests passing #time 30m"

# 4. Ready for review
git commit -m "PROJ-123 #transition In Review #comment Ready for code review"

# 5. After approval
git commit -m "PROJ-123 #transition Done #comment Merged to main"
```

### Bug Fix Workflow

```bash
# Start bug fix
git checkout -b PROJ-456-fix-login-bug
git commit -m "PROJ-456 #transition In Progress Investigating login bug"

# Fix and log time
git commit -m "PROJ-456 #comment Fixed null pointer in auth service #time 2h"

# Complete
git commit -m "PROJ-456 #transition Done #comment Bug fixed and tested #time 30m"
```

### Code Review Workflow

```bash
# After review comments
git commit -m "PROJ-789 #comment Addressed review comments #time 1h"

# Request re-review
git commit -m "PROJ-789 #comment Updated per feedback, ready for re-review"

# Final approval
git commit -m "PROJ-789 #transition Done #comment LGTM, merging"
```

## Helper Functions

### Generate Smart Commit Message

```javascript
function generateSmartCommit(options) {
  const {
    issueKey,
    message,
    comment,
    time,
    transition
  } = options;

  let commitMsg = issueKey;

  if (comment) {
    commitMsg += ` #comment ${comment}`;
  }

  if (time) {
    commitMsg += ` #time ${time}`;
  }

  if (transition) {
    commitMsg += ` #transition ${transition}`;
  }

  if (message && !comment) {
    commitMsg += ` ${message}`;
  }

  return commitMsg;
}

// Usage examples
generateSmartCommit({
  issueKey: "PROJ-123",
  comment: "Fixed bug",
  time: "2h"
});
// "PROJ-123 #comment Fixed bug #time 2h"

generateSmartCommit({
  issueKey: "PROJ-123",
  message: "Update README"
});
// "PROJ-123 Update README"

generateSmartCommit({
  issueKey: "PROJ-123",
  comment: "Feature complete",
  time: "4h 30m",
  transition: "Done"
});
// "PROJ-123 #comment Feature complete #time 4h 30m #transition Done"
```

### Parse Duration to Minutes

```javascript
function parseDuration(duration) {
  const weeks = duration.match(/(\d+)w/)?.[1] || 0;
  const days = duration.match(/(\d+)d/)?.[1] || 0;
  const hours = duration.match(/(\d+)h/)?.[1] || 0;
  const minutes = duration.match(/(\d+)m/)?.[1] || 0;

  const totalMinutes =
    (weeks * 5 * 8 * 60) +  // weeks to minutes
    (days * 8 * 60) +        // days to minutes
    (hours * 60) +           // hours to minutes
    parseInt(minutes);       // minutes

  return totalMinutes;
}

// Examples
parseDuration("2h 30m")      // 150 minutes
parseDuration("1d")          // 480 minutes (8 hours)
parseDuration("1w")          // 2400 minutes (40 hours)
parseDuration("1w 2d 4h")    // 3120 minutes (52 hours)
```

### Format Duration for Display

```javascript
function formatDuration(minutes) {
  const weeks = Math.floor(minutes / (5 * 8 * 60));
  minutes %= (5 * 8 * 60);

  const days = Math.floor(minutes / (8 * 60));
  minutes %= (8 * 60);

  const hours = Math.floor(minutes / 60);
  minutes %= 60;

  const parts = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
}

// Examples
formatDuration(150)    // "2h 30m"
formatDuration(480)    // "1d"
formatDuration(3120)   // "1w 2d 4h"
```

## Error Handling

### Common Errors and Solutions

#### Issue Key Not Found

**Error:** `Issue key 'PROJ-123' not found`

**Solutions:**
- Verify issue exists in Jira
- Check project key spelling
- Ensure you have access to the issue
- Confirm issue hasn't been deleted

#### Invalid Transition

**Error:** `Cannot transition to 'Done'`

**Solutions:**
- Check workflow allows this transition
- Verify current issue status
- Ensure you have permission
- Use correct status name (case-sensitive)

#### Invalid Time Format

**Error:** `Invalid time format '2.5h'`

**Solutions:**
- Use `2h 30m` instead of `2.5h`
- Don't use decimals
- Use valid units: w, d, h, m
- Include space between units

#### Permission Denied

**Error:** `You do not have permission to log work`

**Solutions:**
- Check Jira permissions
- Verify project role
- Contact project admin
- Use correct Jira credentials

### Validation Before Commit

```bash
#!/bin/bash
# Smart commit validation hook

validate_smart_commit() {
  local message="$1"

  # Check for issue key
  if ! echo "$message" | grep -qE '^[A-Z]{2,10}-[0-9]+'; then
    echo "Error: Commit must start with issue key (e.g., PROJ-123)"
    return 1
  fi

  # Check time format if present
  if echo "$message" | grep -q '#time'; then
    local time_part=$(echo "$message" | grep -oP '#time \K[^#]+')
    if ! echo "$time_part" | grep -qE '^([0-9]+w\s?)?([0-9]+d\s?)?([0-9]+h\s?)?([0-9]+m\s?)?$'; then
      echo "Error: Invalid time format. Use format like '2h 30m'"
      return 1
    fi
  fi

  return 0
}

# Usage in git hook
validate_smart_commit "$(cat $1)"
if [ $? -ne 0 ]; then
  exit 1
fi
```

## Best Practices

### 1. Commit Message Guidelines

**Do:**
- Always start with issue key
- Use clear, descriptive messages
- Log time when completing work
- Transition issues at appropriate times
- Keep commits atomic and focused

**Don't:**
- Make commits without issue key
- Use vague messages
- Log unrealistic time estimates
- Transition prematurely
- Bundle unrelated changes

### 2. Time Logging Guidelines

**Do:**
- Log time in 15-minute increments
- Be honest and accurate
- Include what was done
- Log regularly, not all at end

**Don't:**
- Over-estimate to look busy
- Under-estimate to appear fast
- Forget to log time
- Log time for meetings (use Jira directly)

### 3. Transition Guidelines

**Do:**
- Only transition when status actually changes
- Verify transition is valid
- Include reason for transition
- Follow team workflow

**Don't:**
- Skip statuses
- Transition back and forth unnecessarily
- Mark incomplete work as Done
- Bypass required approvals

### 4. Branch Naming Guidelines

**Do:**
- Include issue key in branch name
- Use descriptive names
- Follow team conventions
- Keep names lowercase with hyphens

**Don't:**
- Create branches without issue keys
- Use special characters
- Make overly long names
- Use spaces

## Integration with Git Workflow

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/prepare-commit-msg

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Get current branch name
BRANCH_NAME=$(git symbolic-ref --short HEAD)

# Extract issue key from branch name
ISSUE_KEY=$(echo "$BRANCH_NAME" | grep -oE '[A-Z]{2,10}-[0-9]+')

if [ -n "$ISSUE_KEY" ]; then
  # Get commit message
  COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

  # Check if message already has issue key
  if ! echo "$COMMIT_MSG" | grep -qE '^[A-Z]{2,10}-[0-9]+'; then
    # Prepend issue key
    echo "$ISSUE_KEY $COMMIT_MSG" > "$COMMIT_MSG_FILE"
  fi
fi
```

### Commit Message Template

```bash
# .gitmessage template

# Format: ISSUE-KEY #command message
#
# Commands:
#   #comment <text>     - Add comment to issue
#   #time <duration>    - Log work time (e.g., 2h 30m)
#   #transition <status> - Change issue status
#
# Examples:
#   PROJ-123 #comment Fixed login bug
#   PROJ-123 #time 2h Implemented feature
#   PROJ-123 #transition Done Feature complete
#   PROJ-123 #comment Added tests #time 1h #transition In Review
#
# Set template: git config commit.template .gitmessage
```

### Git Aliases

```bash
# ~/.gitconfig

[alias]
  # Smart commit with comment
  sc = "!f() { git commit -m \"$1 #comment $2\"; }; f"

  # Smart commit with time
  st = "!f() { git commit -m \"$1 #time $2 $3\"; }; f"

  # Smart commit with transition
  str = "!f() { git commit -m \"$1 #transition $2 $3\"; }; f"

  # Smart commit with all
  sct = "!f() { git commit -m \"$1 #comment $2 #time $3 #transition $4\"; }; f"

# Usage examples:
# git sc PROJ-123 "Fixed validation bug"
# git st PROJ-123 "2h 30m" "Implemented auth"
# git str PROJ-123 "Done" "Feature complete"
# git sct PROJ-123 "Added tests" "1h" "In Review"
```

## Testing Smart Commits

### Dry Run Validation

```bash
#!/bin/bash
# Test smart commit without actually committing

test_smart_commit() {
  local message="$1"

  echo "Testing commit message:"
  echo "  $message"
  echo ""

  # Extract components
  local issue_key=$(echo "$message" | grep -oE '^[A-Z]{2,10}-[0-9]+')
  local has_comment=$(echo "$message" | grep -q '#comment' && echo "Yes" || echo "No")
  local has_time=$(echo "$message" | grep -q '#time' && echo "Yes" || echo "No")
  local has_transition=$(echo "$message" | grep -q '#transition' && echo "Yes" || echo "No")

  echo "Issue Key: $issue_key"
  echo "Has Comment: $has_comment"
  echo "Has Time: $has_time"
  echo "Has Transition: $has_transition"

  if [ -n "$issue_key" ]; then
    echo ""
    echo "This commit will:"
    [ "$has_comment" = "Yes" ] && echo "  - Add comment to $issue_key"
    [ "$has_time" = "Yes" ] && echo "  - Log time to $issue_key"
    [ "$has_transition" = "Yes" ] && echo "  - Transition $issue_key"
    [ "$has_comment" = "No" ] && [ "$has_time" = "No" ] && [ "$has_transition" = "No" ] && echo "  - Link commit to $issue_key"
  else
    echo ""
    echo "WARNING: No issue key found. Commit will not link to Jira."
  fi
}

# Usage
test_smart_commit "PROJ-123 #comment Fixed bug #time 2h #transition Done"
```

## Quick Reference

### Command Cheat Sheet

```
# Basic linking
ISSUE-KEY message

# Add comment
ISSUE-KEY #comment <text>

# Log time
ISSUE-KEY #time <duration>

# Transition
ISSUE-KEY #transition <status>

# Combine commands
ISSUE-KEY #comment <text> #time <duration> #transition <status>
```

### Duration Cheat Sheet

```
30m      = 30 minutes
1h       = 1 hour
1h 30m   = 1.5 hours
2h       = 2 hours
1d       = 8 hours (1 working day)
1w       = 40 hours (5 working days)
1w 2d    = 56 hours
```

### Common Transitions

```
To Do → In Progress → In Review → QA → Done
                      ↓
                   Blocked
```

## Troubleshooting

### Commit Not Appearing in Jira

**Check:**
1. Issue key format is correct
2. You have access to the issue
3. Jira smart commits are enabled
4. Git email matches Jira account
5. Repository is connected to Jira

### Time Not Logging

**Check:**
1. Duration format is valid
2. You have log work permission
3. Issue allows time tracking
4. Time wasn't already logged

### Transition Failing

**Check:**
1. Status name is exact match
2. Transition is allowed from current status
3. You have transition permission
4. Required fields are filled

## Resources

### Documentation Links

- [Atlassian Smart Commits Guide](https://support.atlassian.com/jira-software-cloud/docs/process-issues-with-smart-commits/)
- [Jira Workflow Documentation](https://support.atlassian.com/jira-cloud-administration/docs/what-is-a-jira-workflow/)
- [Git Hooks Guide](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

### Configuration Files

- `.git/hooks/prepare-commit-msg` - Auto-add issue key
- `.git/hooks/commit-msg` - Validate smart commits
- `.gitmessage` - Commit message template
- `~/.gitconfig` - Git aliases for smart commits

## Success Metrics

Track smart commit adoption:

```sql
-- Example analytics query
SELECT
  issue_key,
  COUNT(*) as commit_count,
  SUM(time_logged) as total_time,
  COUNT(DISTINCT status) as transitions
FROM jira_smart_commits
WHERE commit_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY issue_key
ORDER BY commit_count DESC;
```

## See Also

- [[Skills-and-Commands]] - Other Jira skills
- [[MCP-Servers#github]] - GitHub integration
- [[Workflows#git-workflow]] - Git workflow documentation
- [[Agent-Categories#jira]] - Jira orchestration agents
