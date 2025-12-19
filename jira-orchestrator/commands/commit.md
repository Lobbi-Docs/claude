---
name: jira:commit
description: Create git commit with Jira smart commit syntax for automatic issue updates
arguments:
  - name: message
    description: Commit message or 'auto' to generate from issue context
    required: false
  - name: --issue
    description: Jira issue key (auto-detected from branch if not provided)
    required: false
  - name: --time
    description: Work time to log (e.g., 2h, 1d 4h 30m)
    required: false
  - name: --transition
    description: Jira status to transition to (e.g., "In Review", "Done")
    required: false
  - name: --comment
    description: Additional comment to add to Jira issue
    required: false
  - name: --validate
    description: Validate smart commit syntax without committing
    required: false
    type: boolean
  - name: --dry-run
    description: Show what would be committed without making changes
    required: false
    type: boolean
tags:
  - jira
  - git
  - smart-commit
  - automation
examples:
  - command: /jira:commit "Fixed authentication bug" --time 2h
    description: Commit with time logging
  - command: /jira:commit auto --issue PROJ-123 --transition "In Review"
    description: Auto-generate message with transition
  - command: /jira:commit --validate
    description: Validate current staged changes
  - command: /jira:commit "Add OAuth2 support" --comment "Implemented Google OAuth" --time "3h 15m"
    description: Commit with comment and time tracking
---

# Jira Smart Commit Command

This command enables developers to create git commits with Jira smart commit syntax, automatically updating issues with comments, time tracking, and workflow transitions.

## Prerequisites

- Git repository initialized
- Atlassian Cloud access configured
- Jira project access with edit permissions
- Changes staged for commit (or use with existing commits)

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      JIRA SMART COMMIT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   DETECT    │ -> │   VALIDATE  │ -> │   GENERATE  │ -> │   EXECUTE   │ │
│   │ Issue Key   │    │   Syntax    │    │   Message   │    │   Commit    │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                  │                  │                  │         │
│         v                  v                  v                  v         │
│   From branch       Time format       Build smart          Git commit    │
│   or argument       Transition        commit message       Jira update   │
│                     validation        with commands                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Execution Steps

### Step 1: Detect Issue Key

Automatically detect the Jira issue key from:

1. **--issue argument** (highest priority)
2. **Current branch name** (e.g., `feature/PROJ-123-description`)
3. **Prompt user** if not detectable

```yaml
action: Detect Issue Key
tool: Bash
command: |
  # Get current branch
  BRANCH=$(git branch --show-current)

  # Extract issue key from branch name
  ISSUE_KEY=$(echo "$BRANCH" | grep -oE '[A-Z]+-[0-9]+')

  if [ -n "$ISSUE_KEY" ]; then
    echo "Detected issue: $ISSUE_KEY"
  else
    echo "No issue key found in branch name"
  fi
```

**Supported branch patterns:**
- `feature/PROJ-123-description` → `PROJ-123`
- `bugfix/PROJ-456-fix-bug` → `PROJ-456`
- `hotfix/PROJ-789-critical` → `PROJ-789`
- `PROJ-321-my-feature` → `PROJ-321`

### Step 2: Validate Inputs

Validate all smart commit parameters before proceeding:

```yaml
agent: smart-commit-validator
model: haiku
tasks:
  - Validate issue key format (e.g., PROJ-123)
  - Verify issue exists in Jira
  - Validate time format if provided
  - Check transition name against available transitions
  - Verify git status (staged changes exist)
validations:
  issue_key_pattern: "^[A-Z]+-\\d+$"
  time_pattern: "^(\\d+[wdhm]\\s*)+$"
  transition_check: Query Jira for available transitions
```

#### Time Format Validation

Supported time formats:
- `2h` - 2 hours
- `30m` - 30 minutes
- `1d` - 1 day (8 hours)
- `1w` - 1 week (5 days, 40 hours)
- `2h 30m` - 2 hours 30 minutes
- `1d 4h 30m` - 1 day, 4 hours, 30 minutes

**Invalid formats will be rejected with helpful error messages.**

#### Transition Validation

```yaml
action: Get Available Transitions
tool: mcp__plugin_jira-orchestrator_atlassian__getJiraIssueTransitions
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${issue_key}
expected_output:
  - "To Do"
  - "In Progress"
  - "In Review"
  - "In QA"
  - "Done"
```

**If provided transition is not available:**
- Show list of valid transitions
- Suggest closest match
- Allow user to select or skip

### Step 3: Generate Commit Message

Generate or validate the commit message with smart commit syntax.

#### Auto-Generation Mode

When `message` argument is `'auto'`:

```yaml
agent: smart-commit-generator
model: sonnet
tasks:
  - Fetch Jira issue details (summary, description, type)
  - Analyze staged git changes
  - Generate conventional commit message
  - Build smart commit commands
  - Format complete commit message
output:
  commit_message: |
    feat(auth): Implement OAuth2 authentication

    - Added Google OAuth2 provider integration
    - Created OAuth callback handler
    - Implemented token refresh mechanism
    - Added user session management

    PROJ-123 #comment Implemented OAuth2 with Google provider #time 3h 15m #transition "In Review"
```

**Auto-generation process:**

1. **Fetch Jira Issue:**
   ```yaml
   tool: mcp__plugin_jira-orchestrator_atlassian__getJiraIssue
   parameters:
     cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
     issueIdOrKey: ${issue_key}
   ```

2. **Analyze Git Changes:**
   ```bash
   git diff --cached --stat
   git diff --cached --name-only
   git diff --cached
   ```

3. **Generate Message:**
   - Use issue type for commit type (Bug → fix, Story → feat, Task → chore)
   - Use issue summary as basis for description
   - Analyze code changes for detailed bullet points
   - Use conventional commit format

#### Manual Message Mode

When user provides a message:

```yaml
action: Build Smart Commit Message
input:
  user_message: "Fixed authentication bug"
  issue_key: "PROJ-123"
  time: "2h"
  comment: "Resolved OAuth2 token refresh issue"
  transition: "In Review"
output:
  commit_message: |
    Fixed authentication bug

    PROJ-123 #comment Resolved OAuth2 token refresh issue #time 2h #transition "In Review"
```

**Smart commit syntax:**
```
[Conventional commit message]

ISSUE-KEY #command value #command value #command value
```

**Supported commands:**
- `#comment <text>` - Add comment to issue
- `#time <duration>` - Log work time
- `#transition "<status>"` - Transition issue (use quotes for multi-word statuses)

**Multiple commands example:**
```
PROJ-123 #comment Fixed the bug #time 2h 30m #transition "In Review"
```

### Step 4: Validate Smart Commit Syntax

Validate the complete commit message:

```yaml
action: Validate Smart Commit Message
validations:
  - Issue key present
  - Commands properly formatted
  - Time values valid
  - Transition status valid
  - No syntax errors
  - Message not empty
```

**Validation patterns:**
```regex
issue_key: ([A-Z]+-\d+)
comment: #comment\s+([^#\n]+)
time: #time\s+((?:\d+[wdhm]\s*)+)
transition: #transition\s+"([^"]+)"
```

**If validation fails:**
- Show specific error
- Suggest corrections
- Allow user to edit or cancel

### Step 5: Preview (Dry Run or Validate Mode)

If `--dry-run` or `--validate` flags are set:

```markdown
## Commit Preview (DRY RUN)

### Commit Message
```
feat(auth): Implement OAuth2 authentication

- Added Google OAuth2 provider integration
- Created OAuth callback handler
- Implemented token refresh mechanism

PROJ-123 #comment Implemented OAuth2 with Google provider #time 3h 15m #transition "In Review"
```

### Jira Updates (WOULD BE APPLIED)

**Issue:** PROJ-123 - Implement user authentication

**Comment:**
> Implemented OAuth2 with Google provider

**Time Logged:** 3h 15m (11,700 seconds)

**Transition:** Current: "In Progress" → New: "In Review"

### Git Status
```
On branch feature/PROJ-123-oauth
Changes to be committed:
  modified:   src/auth/oauth.js
  new file:   src/auth/providers/google.js
  modified:   tests/auth.test.js
```

### Would Execute
```bash
git commit -m "feat(auth): Implement OAuth2 authentication

- Added Google OAuth2 provider integration
- Created OAuth callback handler
- Implemented token refresh mechanism

PROJ-123 #comment Implemented OAuth2 with Google provider #time 3h 15m #transition \"In Review\"

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**To apply these changes, run without --dry-run**
```

### Step 6: Execute Git Commit

Create the git commit with the smart commit message:

```yaml
action: Create Git Commit
tool: Bash
command: |
  git commit -m "$(cat <<'EOF'
  feat(auth): Implement OAuth2 authentication

  - Added Google OAuth2 provider integration
  - Created OAuth callback handler
  - Implemented token refresh mechanism

  PROJ-123 #comment Implemented OAuth2 with Google provider #time 3h 15m #transition "In Review"

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
  EOF
  )"
```

**Important notes:**
- Use HEREDOC for proper formatting
- Include smart commit commands in commit body
- Add Claude Code attribution
- Preserve exact formatting (spaces, newlines)

### Step 7: Process Smart Commit Commands

After successful commit, process the smart commit commands in Jira:

```yaml
agent: github-jira-sync
model: sonnet
tasks:
  - Parse smart commit commands from commit message
  - Execute #comment commands
  - Execute #time tracking commands
  - Execute #transition commands
  - Report results
```

#### Parse Commands

```python
# Extract commands from commit message
commit_message = get_last_commit_message()
commands = parse_smart_commit(commit_message)

# Example parsed output:
# [
#   SmartCommitCommand(issue_key='PROJ-123', type='comment', value='Implemented OAuth2'),
#   SmartCommitCommand(issue_key='PROJ-123', type='time', value='3h 15m'),
#   SmartCommitCommand(issue_key='PROJ-123', type='transition', value='In Review')
# ]
```

#### Execute Comment Command

```yaml
action: Add Comment to Jira
tool: mcp__plugin_jira-orchestrator_atlassian__addJiraComment
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: PROJ-123
  comment: |
    💬 **Smart Commit:**

    Implemented OAuth2 with Google provider

    **Commit:** [abc1234](https://github.com/org/repo/commit/abc1234)
```

#### Execute Time Tracking Command

```yaml
action: Log Work Time
tool: mcp__plugin_jira-orchestrator_atlassian__addWorklog
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: PROJ-123
  timeSpentSeconds: 11700  # 3h 15m = 11,700 seconds
  comment: Time logged via smart commit
```

**Time conversion:**
```
3h 15m = (3 × 3600) + (15 × 60) = 10,800 + 900 = 11,700 seconds
1d = 8 hours = 28,800 seconds (configurable work day)
1w = 5 days = 40 hours = 144,000 seconds
```

#### Execute Transition Command

```yaml
action: Transition Issue
tool: mcp__plugin_jira-orchestrator_atlassian__transitionJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: PROJ-123
  transitionName: In Review
```

**If transition fails:**
- Log error
- Add comment to issue explaining failure
- Continue with other commands
- Report failure to user

### Step 8: Generate Summary Report

Provide comprehensive summary of the commit and Jira updates:

```markdown
✅ Smart Commit Created Successfully

## Commit Details

**Commit SHA:** abc1234def5678
**Branch:** feature/PROJ-123-oauth
**Message:** feat(auth): Implement OAuth2 authentication

**Files Changed:**
- Modified: 2 files
- Added: 1 file
- Total: 3 files

## Jira Updates

**Issue:** [PROJ-123 - Implement user authentication](https://thelobbi.atlassian.net/browse/PROJ-123)

### Comment Added ✅
> Implemented OAuth2 with Google provider

### Time Logged ✅
- Duration: 3h 15m
- Total logged: 11,700 seconds

### Issue Transitioned ✅
- From: "In Progress"
- To: "In Review"

## Next Steps

1. Push commit to remote: `git push origin feature/PROJ-123-oauth`
2. Create pull request: `/jira-orchestrator:pr`
3. Monitor Jira issue for updates

**Commit URL:** https://github.com/org/repo/commit/abc1234def5678
**Jira URL:** https://thelobbi.atlassian.net/browse/PROJ-123
```

## Smart Commit Syntax Reference

### Basic Syntax

```
ISSUE-KEY #command value
```

### Multiple Commands

```
ISSUE-KEY #command1 value1 #command2 value2 #command3 value3
```

### Examples

#### Simple Comment
```
PROJ-123 #comment Fixed the authentication bug
```

#### Time Logging
```
PROJ-123 #time 2h 30m
```

#### Workflow Transition
```
PROJ-123 #transition "In Review"
```

#### Combined Commands
```
PROJ-123 #comment Implemented OAuth2 #time 3h 15m #transition "In Review"
```

#### Multiple Issues
```
feat: Add authentication

Implemented OAuth2 for PROJ-123 and updated tests for PROJ-124

PROJ-123 #comment Implemented OAuth2 #time 3h #transition "In Review"
PROJ-124 #comment Updated integration tests #time 1h
```

### Command Reference

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| comment | `#comment <text>` | Add comment to issue | `#comment Fixed bug` |
| time | `#time <duration>` | Log work time | `#time 2h 30m` |
| transition | `#transition "<status>"` | Change issue status | `#transition "In Review"` |

### Time Duration Formats

| Format | Meaning | Seconds |
|--------|---------|---------|
| `30m` | 30 minutes | 1,800 |
| `2h` | 2 hours | 7,200 |
| `1d` | 1 day (8h) | 28,800 |
| `1w` | 1 week (40h) | 144,000 |
| `2h 30m` | 2.5 hours | 9,000 |
| `1d 4h` | 12 hours | 43,200 |

## Usage Examples

### Example 1: Basic Commit with Time

```bash
/jira:commit "Fixed authentication bug" --time 2h
```

**What happens:**
1. Detects issue key from branch (e.g., `PROJ-123`)
2. Creates commit message:
   ```
   Fixed authentication bug

   PROJ-123 #time 2h

   🤖 Generated with Claude Code
   ```
3. Logs 2 hours to PROJ-123 in Jira

### Example 2: Auto-Generated Message with Transition

```bash
/jira:commit auto --issue PROJ-123 --transition "In Review"
```

**What happens:**
1. Fetches PROJ-123 details from Jira
2. Analyzes staged changes
3. Generates conventional commit message
4. Adds smart commit commands
5. Creates commit
6. Transitions issue to "In Review"

### Example 3: Full Smart Commit

```bash
/jira:commit "Add OAuth2 support" --comment "Implemented Google OAuth" --time "3h 15m" --transition "In Review"
```

**What happens:**
1. Creates commit with message "Add OAuth2 support"
2. Adds comment to Jira issue
3. Logs 3h 15m work time
4. Transitions issue to "In Review"

### Example 4: Validate Only

```bash
/jira:commit --validate
```

**What happens:**
1. Checks for staged changes
2. Detects issue key
3. Validates smart commit syntax
4. Shows what would happen
5. Does NOT create commit
6. Does NOT update Jira

### Example 5: Dry Run

```bash
/jira:commit "Fix login bug" --time 1h 30m --dry-run
```

**What happens:**
1. Generates complete commit message
2. Shows preview of commit
3. Shows preview of Jira updates
4. Does NOT execute git commit
5. Does NOT update Jira

### Example 6: Manual Issue Key

```bash
/jira:commit "Update documentation" --issue PROJ-456 --time 30m
```

**What happens:**
1. Uses PROJ-456 instead of detecting from branch
2. Creates commit with smart commands
3. Updates PROJ-456 in Jira

## Agent Orchestration

This command orchestrates multiple specialized agents:

| Agent | Model | Purpose |
|-------|-------|---------|
| smart-commit-validator | haiku | Input validation and error checking |
| smart-commit-generator | sonnet | Auto-generate commit messages from context |
| github-jira-sync | sonnet | Execute smart commit commands in Jira |

**Execution Pattern:**
1. Validator runs first to check all inputs
2. Generator creates message (if auto mode)
3. Git commit executes
4. Sync agent processes Jira updates

## Error Handling

### Issue Key Not Found

```markdown
❌ Error: Could not detect Jira issue key

**Possible solutions:**
1. Provide issue key explicitly: --issue PROJ-123
2. Rename branch to include issue key: feature/PROJ-123-description
3. Check branch name format

**Current branch:** main
**Expected format:** feature/PROJ-123-description
```

### Invalid Time Format

```markdown
❌ Error: Invalid time format: "2hours"

**Valid formats:**
- 2h (2 hours)
- 30m (30 minutes)
- 1d (1 day = 8 hours)
- 2h 30m (2 hours 30 minutes)

**Your input:** 2hours
**Suggestion:** 2h
```

### Invalid Transition

```markdown
❌ Error: Transition "Ready for Review" not available

**Available transitions for PROJ-123:**
1. In Progress
2. In Review
3. In QA
4. Done
5. Cancelled

**Your input:** Ready for Review
**Suggestion:** In Review (closest match)
```

### No Staged Changes

```markdown
❌ Error: No changes staged for commit

**To stage changes:**
git add <file>        # Stage specific file
git add .             # Stage all changes
git add -u            # Stage all modified files

**Current status:**
On branch feature/PROJ-123-oauth
Changes not staged for commit:
  modified:   src/auth/oauth.js
```

### Jira API Failure

```markdown
⚠️ Warning: Git commit succeeded, but Jira update failed

**Commit:** abc1234def5678
**Issue:** PROJ-123

**Error:** Failed to add comment: API rate limit exceeded

**Retry command:**
/jira:sync --commit abc1234

**Manual actions:**
1. Add comment manually in Jira
2. Log time: 3h 15m
3. Transition to: In Review
```

## Integration with Existing Workflows

### After Development Work

```bash
# 1. Complete work on feature
# 2. Stage changes
git add .

# 3. Create smart commit
/jira:commit auto --time 4h --transition "In Review"

# 4. Push to remote
git push origin feature/PROJ-123-oauth

# 5. Create pull request
/jira-orchestrator:pr
```

### During Active Development

```bash
# Regular commits with time tracking
/jira:commit "Implement OAuth callback" --time 1h 30m

/jira:commit "Add token refresh" --time 2h

/jira:commit "Add integration tests" --time 1h

# Final commit with transition
/jira:commit "Complete OAuth implementation" --time 30m --transition "In Review"
```

### Quick Bug Fix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/PROJ-789-login-fix

# 2. Fix bug, stage changes
git add .

# 3. Smart commit
/jira:commit "Fix login redirect bug" --time 45m --transition "In QA"

# 4. Push and create PR
git push -u origin hotfix/PROJ-789-login-fix
/jira-orchestrator:pr
```

## Configuration

### Git Hooks Integration

Add to `.git/hooks/post-commit` for automatic smart commit processing:

```bash
#!/bin/bash
# .git/hooks/post-commit

COMMIT_MSG=$(git log -1 --pretty=%B)

# Check if commit contains smart commit commands
if echo "$COMMIT_MSG" | grep -qE '#(comment|time|transition)'; then
    echo "Processing smart commit..."

    # Extract issue key
    ISSUE_KEY=$(echo "$COMMIT_MSG" | grep -oE '[A-Z]+-[0-9]+' | head -1)

    if [ -n "$ISSUE_KEY" ]; then
        echo "Found issue: $ISSUE_KEY"
        # Process via github-jira-sync agent
        # (This would be triggered automatically)
    fi
fi
```

### Commit Message Template

Create `.gitmessage` template:

```
# Title: <type>(<scope>): <subject>
# |<----   Using a Maximum Of 50 Characters   ---->|

# Body: Explain *what* and *why* (not *how*). Include task ID (PROJ-XXX).
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|

# Smart Commit Commands:
# PROJ-XXX #comment <description>
# PROJ-XXX #time <duration> (e.g., 2h 30m)
# PROJ-XXX #transition "<status>" (e.g., "In Review")

# Type: feat, fix, docs, style, refactor, test, chore
# Scope: auth, api, ui, db, etc.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Configure git to use template:
```bash
git config commit.template .gitmessage
```

## Best Practices

### 1. Commit Message Quality

**Good:**
```
feat(auth): Implement OAuth2 authentication

- Added Google OAuth2 provider integration
- Created secure token storage
- Implemented automatic token refresh

PROJ-123 #comment OAuth2 fully implemented and tested #time 4h #transition "In Review"
```

**Bad:**
```
updated stuff

PROJ-123 #time 4h
```

### 2. Time Tracking Accuracy

- Log time when work is fresh in your mind
- Be honest about actual time spent
- Break down large tasks into smaller commits
- Use consistent time units

### 3. Transition Timing

**Transition when:**
- ✅ Work is complete
- ✅ Tests are passing
- ✅ Ready for next stage

**Don't transition if:**
- ❌ Work in progress
- ❌ Tests failing
- ❌ Incomplete implementation

### 4. Comment Clarity

**Good comments:**
- "Implemented OAuth2 with Google provider, including token refresh"
- "Fixed race condition in user session management"
- "Added comprehensive integration tests for authentication flow"

**Bad comments:**
- "fixed stuff"
- "updates"
- "done"

### 5. Multiple Commits

For large features, create multiple commits:

```bash
# Commit 1: Foundation
/jira:commit "Add OAuth2 base structure" --time 1h 30m

# Commit 2: Google provider
/jira:commit "Implement Google OAuth provider" --time 2h

# Commit 3: Token refresh
/jira:commit "Add token refresh mechanism" --time 1h 30m

# Commit 4: Tests
/jira:commit "Add OAuth integration tests" --time 1h

# Commit 5: Complete
/jira:commit "Complete OAuth2 implementation" --time 30m --transition "In Review"
```

### 6. Branch Naming

Always include issue key in branch name:

**Recommended patterns:**
- `feature/PROJ-123-oauth-implementation`
- `bugfix/PROJ-456-login-redirect`
- `hotfix/PROJ-789-security-patch`

### 7. Validation Before Commit

Always validate before actual commit:

```bash
# 1. Validate syntax
/jira:commit "My changes" --time 2h --validate

# 2. Review preview
/jira:commit "My changes" --time 2h --dry-run

# 3. Execute if looks good
/jira:commit "My changes" --time 2h
```

## Troubleshooting

### Commit Created but Jira Not Updated

**Check:**
1. Jira API connectivity
2. Issue key is valid
3. Permissions to update issue
4. Rate limits not exceeded

**Solution:**
```bash
# Retry Jira sync for specific commit
/jira:sync --commit abc1234
```

### Smart Commit Commands Not Executed

**Check:**
1. Syntax is correct (quotes, spaces)
2. Commands in commit message body (not title)
3. Issue key present
4. GitHub-Jira sync agent is running

**Example of correct format:**
```
feat: Add feature

PROJ-123 #comment Description #time 2h
```

### Time Not Logged Correctly

**Check:**
1. Time format is valid (2h, 30m, 1d)
2. No spaces in time value except between units
3. Jira work log permissions

**Valid:** `2h 30m`
**Invalid:** `2 hours 30 minutes`

### Transition Failed

**Check:**
1. Transition name is exact (case-sensitive)
2. Transition is available from current status
3. No required fields blocking transition

**Solution:**
```bash
# Check available transitions
/jira:commit --validate --transition "In Review"
```

## Related Commands

- `/jira-orchestrator:work` - Full development workflow
- `/jira-orchestrator:pr` - Create pull request
- `/jira:sync` - Manually sync commit to Jira
- `/qa-review` - Review QA tickets

## Success Criteria

A successful smart commit execution means:

- [x] Issue key detected or provided
- [x] All parameters validated
- [x] Commit message generated/formatted
- [x] Git commit created successfully
- [x] Smart commit commands parsed
- [x] Jira comment added (if specified)
- [x] Time logged to Jira (if specified)
- [x] Issue transitioned (if specified)
- [x] Summary report generated
- [x] No errors during execution

## Additional Resources

### Smart Commit Documentation

- [Atlassian Smart Commits Guide](https://support.atlassian.com/jira-software-cloud/docs/process-issues-with-smart-commits/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub-Jira Integration](https://github.com/marketplace/jira-software-github)

### Related Agents

- `github-jira-sync.md` - Bidirectional GitHub-Jira synchronization
- `pr-creator.md` - Create pull requests with Jira integration
- `smart-commit-generator.md` - Auto-generate smart commit messages

### Configuration Files

- `.jira/config.yml` - Jira integration configuration
- `.gitmessage` - Git commit message template
- `.git/hooks/post-commit` - Automatic smart commit processing

---

**Remember:** Smart commits save time by automating Jira updates during your natural git workflow. Use them consistently to maintain accurate project tracking without context switching.
