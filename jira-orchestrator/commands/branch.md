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
examples:
  - command: /jira:branch PROJ-123
    description: Create branch from issue (auto-generates description)
  - command: /jira:branch PROJ-123 user-authentication
    description: Create branch with custom description
  - command: /jira:branch PROJ-456 fix-memory-leak bugfix
    description: Create bugfix branch
  - command: /jira:branch PROJ-789 critical-patch hotfix true
    description: Create hotfix branch without transitioning issue
---

# Jira Branch Creation Command

Create a feature branch with Jira issue key naming convention, auto-generate description from issue summary, and optionally transition the issue to "In Progress".

## Issue Details

**Issue Key:** ${issue_key}
**Description:** ${description}
**Branch Type:** ${type}
**Skip Transition:** ${no_transition}

## Step 1: Validate Issue Key

Before creating the branch, validate the issue key format and check if the issue exists.

### Actions:
```
1. Validate issue key matches pattern: [A-Z]+-[0-9]+ (e.g., ABC-123, PROJ-456)
2. If invalid format, respond with error and exit
3. Clean up issue key (trim whitespace, uppercase)
4. No Jira API calls at this stage (validation only)
```

### Validation Logic:
```bash
# Validate issue key format
ISSUE_KEY="${issue_key}"
ISSUE_KEY_PATTERN='^[A-Z]+-[0-9]+$'

if ! [[ $ISSUE_KEY =~ $ISSUE_KEY_PATTERN ]]; then
  echo "❌ Error: Invalid issue key format"
  echo "Expected: PROJECT-123 (uppercase letters + dash + numbers)"
  echo "Got: $ISSUE_KEY"
  exit 1
fi
```

### Validation Checklist:
- [ ] Issue key format valid ([A-Z]+-[0-9]+)
- [ ] Issue key trimmed and cleaned
- [ ] Ready to proceed with Git checks

## Step 2: Check Git Repository Status

Verify we are in a valid git repository and get current branch state.

### Actions:
```
1. Verify we are in a git repository
2. Check if there are uncommitted changes
3. Get current branch name
4. Fetch latest remote branches
5. Check if we are already on main/master
6. Prepare for branch creation
```

### Git Validation Commands:
```bash
# Check if in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Error: Not in a git repository"
  echo "Navigate to a git repository before creating a branch"
  exit 1
fi

# Check for uncommitted changes (warning, not blocker)
UNCOMMITTED=$(git status --porcelain)
if [ -n "$UNCOMMITTED" ]; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "These changes will remain in your working directory"
  echo ""
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Fetch latest remote branches
echo "Fetching latest branches from remote..."
git fetch origin --prune
```

### Git Status Checklist:
- [ ] In a valid git repository
- [ ] Current branch identified
- [ ] Remote branches fetched
- [ ] Uncommitted changes noted (if any)

## Step 3: Fetch Jira Issue Details

Retrieve the issue from Jira to get the summary for branch naming.

### Actions:
```
1. Use mcp__atlassian__jira_get_issue with issue_key parameter
2. Extract relevant fields:
   - summary: Issue title
   - status: Current status
   - issuetype: Bug, Story, Task, etc.
   - assignee: Assigned user
3. If issue not found, exit with error
4. Prepare summary for branch name generation
```

### Issue Data Extraction:
```
Expected fields from Jira API:
{
  "key": "${issue_key}",
  "fields": {
    "summary": "Implement user authentication with OAuth2",
    "status": {"name": "To Do"},
    "issuetype": {"name": "Story"},
    "assignee": {"displayName": "Developer"}
  }
}

Extract summary for auto-naming
```

### Error Handling:
```
If issue not found (404):
  Message: "Issue ${issue_key} not found in Jira"
  Suggestions:
    - Verify issue key spelling
    - Check Jira permissions
    - Ensure issue exists in the project
  Exit code: 1

If API error:
  Message: "Failed to fetch issue from Jira: {error}"
  Suggestions:
    - Check JIRA_API_TOKEN environment variable
    - Verify network connectivity
    - Check Jira instance URL
  Exit code: 1
```

## Step 4: Generate Branch Description

Create a clean, kebab-case description for the branch name.

### Description Generation Logic:
```
If ${description} provided:
  Use provided description as-is
  Validate kebab-case format (lowercase, hyphens only)
  Truncate to 50 characters max

If ${description} NOT provided:
  Extract summary from Jira issue
  Convert to kebab-case:
    1. Lowercase all characters
    2. Replace spaces with hyphens
    3. Remove special characters (keep letters, numbers, hyphens)
    4. Remove consecutive hyphens
    5. Trim leading/trailing hyphens
    6. Truncate to 50 characters
  Examples:
    "Implement user authentication with OAuth2" → "implement-user-authentication-with-oauth2"
    "Fix: Memory leak in image processing" → "fix-memory-leak-in-image-processing"
    "Add structured logging & error handling!!" → "add-structured-logging-error-handling"
```

### Description Generation Code:
```bash
if [ -n "${description}" ]; then
  # Use provided description
  BRANCH_DESC="${description}"

  # Validate format (warn if not kebab-case)
  if [[ ! $BRANCH_DESC =~ ^[a-z0-9-]+$ ]]; then
    echo "⚠️  Warning: Description should be kebab-case (lowercase, hyphens only)"
    echo "Auto-converting: $BRANCH_DESC"
    BRANCH_DESC=$(echo "$BRANCH_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
  fi
else
  # Generate from Jira summary
  SUMMARY="${summary from Jira}"
  echo "Auto-generating description from issue summary..."
  echo "Summary: $SUMMARY"

  # Convert to kebab-case
  BRANCH_DESC=$(echo "$SUMMARY" | \
    tr '[:upper:]' '[:lower:]' | \
    sed 's/[^a-z0-9]/-/g' | \
    sed 's/--*/-/g' | \
    sed 's/^-//' | \
    sed 's/-$//' | \
    cut -c1-50)

  echo "Generated description: $BRANCH_DESC"
fi

# Ensure not empty
if [ -z "$BRANCH_DESC" ]; then
  echo "❌ Error: Could not generate branch description"
  echo "Please provide a description manually"
  exit 1
fi
```

### Description Rules:
- **Format:** kebab-case (lowercase with hyphens)
- **Max Length:** 50 characters
- **Allowed:** letters, numbers, hyphens
- **No:** Uppercase, spaces, special characters, consecutive hyphens

## Step 5: Build Branch Name

Construct the full branch name following the naming convention.

### Branch Naming Convention:
```
{type}/{ISSUE-KEY}-{description}

Examples:
  feature/PROJ-123-implement-user-authentication-with-oauth2
  bugfix/PROJ-456-fix-memory-leak-in-image-processing
  hotfix/PROJ-789-critical-security-patch
  release/PROJ-999-prepare-v2-0-release
```

### Branch Type Mapping:
```
feature:  New features, enhancements, stories
bugfix:   Bug fixes, defect corrections
hotfix:   Critical production fixes, urgent patches
release:  Release preparation, version bumps
```

### Branch Name Construction:
```bash
# Branch types
VALID_TYPES=("feature" "bugfix" "hotfix" "release")
BRANCH_TYPE="${type:-feature}"

# Validate branch type
if [[ ! " ${VALID_TYPES[@]} " =~ " ${BRANCH_TYPE} " ]]; then
  echo "⚠️  Warning: Invalid branch type '$BRANCH_TYPE'"
  echo "Valid types: ${VALID_TYPES[@]}"
  echo "Defaulting to 'feature'"
  BRANCH_TYPE="feature"
fi

# Build full branch name
BRANCH_NAME="${BRANCH_TYPE}/${ISSUE_KEY}-${BRANCH_DESC}"
echo "Branch name: $BRANCH_NAME"
```

### Branch Name Validation:
- [ ] Type is valid (feature, bugfix, hotfix, release)
- [ ] Issue key is uppercase
- [ ] Description is kebab-case
- [ ] Total length < 100 characters
- [ ] No invalid characters

## Step 6: Check Branch Existence

Verify the branch doesn't already exist locally or remotely.

### Actions:
```
1. Check if branch exists locally
2. Check if branch exists on remote (origin)
3. If exists locally but not remotely: Offer to push
4. If exists remotely but not locally: Offer to checkout
5. If exists in both: Exit with error (already exists)
6. If doesn't exist: Proceed with creation
```

### Branch Existence Check:
```bash
# Check local branches
LOCAL_EXISTS=$(git branch --list "$BRANCH_NAME")

# Check remote branches
REMOTE_EXISTS=$(git branch -r --list "origin/$BRANCH_NAME")

if [ -n "$LOCAL_EXISTS" ] && [ -n "$REMOTE_EXISTS" ]; then
  echo "❌ Error: Branch already exists locally and remotely"
  echo "Branch: $BRANCH_NAME"
  echo ""
  echo "Options:"
  echo "  1. Checkout existing branch: git checkout $BRANCH_NAME"
  echo "  2. Choose a different description"
  exit 1
fi

if [ -n "$LOCAL_EXISTS" ] && [ -z "$REMOTE_EXISTS" ]; then
  echo "⚠️  Branch exists locally but not remotely"
  echo "Branch: $BRANCH_NAME"
  echo ""
  echo "Options:"
  echo "  1. Checkout existing branch: git checkout $BRANCH_NAME"
  echo "  2. Push to remote: git push -u origin $BRANCH_NAME"
  echo "  3. Delete and recreate: git branch -D $BRANCH_NAME"
  exit 1
fi

if [ -z "$LOCAL_EXISTS" ] && [ -n "$REMOTE_EXISTS" ]; then
  echo "⚠️  Branch exists remotely but not locally"
  echo "Branch: $BRANCH_NAME"
  echo ""
  echo "Checking out existing remote branch..."
  git checkout -b "$BRANCH_NAME" "origin/$BRANCH_NAME"

  # Skip to transition (branch already exists)
  BRANCH_EXISTS=true
fi
```

### Branch Existence Scenarios:

#### Scenario 1: Branch doesn't exist anywhere
```
✅ Good to proceed
Create new branch from current HEAD
```

#### Scenario 2: Branch exists locally only
```
⚠️  Branch exists locally but not pushed
Options:
  - Checkout existing branch
  - Push to remote
  - Delete and recreate
Exit with error
```

#### Scenario 3: Branch exists remotely only
```
⚠️  Branch exists remotely
Action: Checkout remote branch
Continue to transition step
```

#### Scenario 4: Branch exists in both places
```
❌ Branch already exists
Action: Exit with error
Suggest: Checkout existing branch or choose different description
```

## Step 7: Create Branch

If the branch doesn't exist, create it from the current HEAD.

### Actions:
```
1. Determine base branch (current branch or main/master)
2. Create new branch using git checkout -b
3. Verify branch was created successfully
4. Display branch creation confirmation
```

### Branch Creation Commands:
```bash
# Skip if branch already exists remotely (checked out in Step 6)
if [ "$BRANCH_EXISTS" = true ]; then
  echo "✅ Checked out existing branch: $BRANCH_NAME"
else
  # Create new branch from current HEAD
  echo "Creating new branch: $BRANCH_NAME"
  echo "Base: $CURRENT_BRANCH"

  if git checkout -b "$BRANCH_NAME"; then
    echo "✅ Branch created successfully"
    NEW_BRANCH_CREATED=true
  else
    echo "❌ Error: Failed to create branch"
    exit 1
  fi
fi

# Verify we are on the new branch
VERIFY_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$VERIFY_BRANCH" != "$BRANCH_NAME" ]; then
  echo "❌ Error: Branch creation verification failed"
  echo "Expected: $BRANCH_NAME"
  echo "Got: $VERIFY_BRANCH"
  exit 1
fi
```

### Branch Creation Checklist:
- [ ] Branch created from current HEAD
- [ ] Switched to new branch
- [ ] Branch name verified
- [ ] Uncommitted changes preserved

## Step 8: Transition Jira Issue (Optional)

If ${no_transition} is false, transition the issue to "In Progress".

### Actions:
```
1. Check ${no_transition} flag
2. If false (default), transition issue
3. Find available transitions for the issue
4. Identify "In Progress" transition (or similar)
5. Execute transition
6. Add comment to Jira issue with branch info
7. Log work start time
```

### Transition Logic:
```
If ${no_transition} is true:
  Skip transition
  Log: "Skipping Jira transition (--no-transition flag)"

If ${no_transition} is false (default):
  1. Use mcp__atlassian__jira_get_transitions to get available transitions
  2. Find transition with name matching:
     - "In Progress" (exact match, case-insensitive)
     - "Start Progress"
     - "In Development"
     - "Start Work"
  3. If multiple matches, prefer exact "In Progress"
  4. If no match found, log warning and continue
  5. If match found, execute transition
  6. Add comment with branch details
```

### Transition Execution:
```
Use mcp__atlassian__jira_transition_issue:
  issue_key: ${issue_key}
  transition: "In Progress" (or matching transition)

Handle errors:
  - If transition not available: Log warning, continue
  - If API error: Log warning, continue (don't block branch creation)
  - If success: Confirm transition
```

### Jira Comment on Transition:
```markdown
🌿 Branch created: `{branch_name}`

**Type:** {branch_type}
**Based on:** {base_branch}
**Created by:** Claude Code Orchestrator

Development started. Branch is ready for work.

---
Use `/jira:work ${issue_key}` to start full orchestrated development.
```

### Status Transition Mapping:
| Current Status | Target Status | Transition Name |
|---------------|---------------|-----------------|
| To Do | In Progress | Start Progress |
| Open | In Progress | Start Work |
| Backlog | In Progress | Start Development |
| Selected for Development | In Progress | Begin Work |

### Transition Error Handling:

#### No matching transition found:
```
⚠️  Warning: Could not find "In Progress" transition
Available transitions: {list}
Branch created successfully, but issue status not updated.
Please transition manually if needed.
```

#### Transition failed (API error):
```
⚠️  Warning: Failed to transition issue to "In Progress"
Error: {error_message}
Branch created successfully, but issue status not updated.
Please transition manually in Jira.
```

#### Transition successful:
```
✅ Issue transitioned to "In Progress"
Comment added to Jira issue
```

## Step 9: Success Output

Display comprehensive summary after successful branch creation.

### Success Message Format:
```
✅ Branch Created Successfully!

Issue: ${issue_key}
Summary: ${issue_summary}
Branch: ${branch_name}

Details:
  Type: ${branch_type}
  Description: ${branch_desc}
  Base: ${base_branch}

Jira Status: $(if [ "$TRANSITION_SUCCESS" = true ]; then echo "✅ In Progress"; else echo "⚠️  Not Updated (manual transition needed)"; fi)

Next Steps:
  1. Make your changes on this branch
  2. Commit with message format: "${issue_key}: Description"
  3. Push branch: git push -u origin ${branch_name}
  4. Create PR: /jira:pr ${issue_key}

Or use full orchestration:
  /jira:work ${issue_key}

Current branch: ${branch_name}
```

### Success Checklist:
- [ ] Branch created successfully
- [ ] Switched to new branch
- [ ] Jira issue fetched
- [ ] Jira transition attempted (if enabled)
- [ ] Success message displayed
- [ ] Next steps provided

## Error Handling

Comprehensive error handling for all failure scenarios.

### Error Scenarios:

#### 1. Invalid Issue Key Format
```
If issue_key does not match [A-Z]+-[0-9]+ pattern:
  Message: "❌ Invalid issue key format"
  Expected: "PROJECT-123 (uppercase letters + dash + numbers)"
  Got: "${issue_key}"
  Exit code: 1
  No API calls made
```

#### 2. Not in Git Repository
```
If git rev-parse --git-dir fails:
  Message: "❌ Not in a git repository"
  Suggestion: "Navigate to a git repository before creating a branch"
  Exit code: 1
```

#### 3. Issue Not Found in Jira
```
If Jira API returns 404:
  Message: "❌ Issue ${issue_key} not found in Jira"
  Suggestions:
    - "Verify issue key spelling"
    - "Check Jira permissions"
    - "Ensure issue exists in the project"
  Exit code: 1
```

#### 4. Jira API Error
```
If Jira API fails (network, auth, etc.):
  Message: "❌ Failed to fetch issue from Jira"
  Error: {error_details}
  Suggestions:
    - "Check JIRA_API_TOKEN environment variable"
    - "Verify network connectivity"
    - "Check Jira instance URL"
  Exit code: 1
```

#### 5. Empty Description
```
If description cannot be generated:
  Message: "❌ Could not generate branch description"
  Suggestion: "Please provide a description manually"
  Example: "/jira:branch ${issue_key} my-feature-description"
  Exit code: 1
```

#### 6. Branch Already Exists
```
If branch exists locally and remotely:
  Message: "❌ Branch already exists"
  Branch: "${branch_name}"
  Options:
    1. "Checkout existing branch: git checkout ${branch_name}"
    2. "Choose a different description"
  Exit code: 1
```

#### 7. Branch Creation Failed
```
If git checkout -b fails:
  Message: "❌ Failed to create branch"
  Error: {git_error}
  Suggestion: "Check git status and resolve any issues"
  Exit code: 1
```

#### 8. Transition Warning (Non-Blocking)
```
If transition fails but branch created:
  Message: "⚠️  Warning: Could not transition issue to 'In Progress'"
  Reason: {reason}
  Impact: "Branch created successfully, but issue status not updated"
  Action: "Please transition manually in Jira if needed"
  Exit code: 0 (success with warning)
```

## Integration with Workflow

This command fits into the complete development workflow:

```
/jira:branch ABC-123          # Create branch (THIS COMMAND)
  ↓
  (Work on feature)
  ↓
/jira:work ABC-123            # Start full orchestration
  ↓
  (All phases complete)
  ↓
/jira:pr ABC-123              # Create PR
  ↓
  (Code review)
  ↓
/jira:sync                    # Sync after merge
```

## Alternative Workflow (Manual Development)

For developers who prefer manual control:

```
/jira:branch PROJ-123         # Create branch only
  ↓
  (Manual development)
  ↓
git commit -m "PROJ-123: Implement feature"
git push -u origin feature/PROJ-123-description
  ↓
/jira:pr PROJ-123             # Create PR when ready
```

## Advanced Features

### Smart Branch Type Detection

Automatically suggest branch type based on Jira issue type:

```
Issue Type Mapping:
  Bug → bugfix
  Story → feature
  Task → feature
  Epic → feature
  Hotfix → hotfix
  Release → release

If ${type} not provided:
  - Check Jira issue type
  - Suggest appropriate branch type
  - Use default (feature) if no match
```

### Branch Name Validation

Validate branch name meets all requirements:

```
Validation Rules:
  - Total length < 100 characters
  - No uppercase in description (converted automatically)
  - No special characters (removed automatically)
  - No consecutive hyphens (collapsed automatically)
  - Issue key is uppercase
  - Type is valid
```

### Base Branch Detection

Intelligently detect the correct base branch:

```
Base Branch Logic:
  1. Use current branch as base (default)
  2. If on main/master, create from current HEAD
  3. If on existing feature branch, warn user
  4. Suggest: checkout main first if unsure

Warning for Feature-from-Feature:
  "⚠️  Creating feature branch from another feature branch: ${current_branch}"
  "Consider: git checkout main && /jira:branch ${issue_key}"
```

## Configuration

Environment variables and defaults:

```bash
# Jira Configuration
JIRA_URL=https://your-instance.atlassian.net
JIRA_API_TOKEN=<from-environment>
JIRA_USER_EMAIL=<from-environment>

# Default Values
DEFAULT_BRANCH_TYPE=feature
DEFAULT_NO_TRANSITION=false
BRANCH_DESC_MAX_LENGTH=50

# Valid Branch Types
VALID_BRANCH_TYPES=("feature" "bugfix" "hotfix" "release")

# Transition Names (searched in order)
PROGRESS_TRANSITIONS=("In Progress" "Start Progress" "In Development" "Start Work")
```

## Example Usage

### Basic Usage
```bash
# Create feature branch (auto-generated description)
/jira:branch PROJ-123

# Output:
# ✅ Branch Created Successfully!
# Issue: PROJ-123
# Summary: Implement user authentication with OAuth2
# Branch: feature/PROJ-123-implement-user-authentication-with-oauth2
# Jira Status: ✅ In Progress
```

### With Custom Description
```bash
# Create branch with custom description
/jira:branch PROJ-123 user-auth

# Output:
# Branch: feature/PROJ-123-user-auth
```

### Different Branch Types
```bash
# Create bugfix branch
/jira:branch PROJ-456 fix-memory-leak bugfix

# Create hotfix branch
/jira:branch PROJ-789 critical-patch hotfix

# Create release branch
/jira:branch PROJ-999 prepare-v2-release release
```

### Skip Transition
```bash
# Create branch without transitioning Jira issue
/jira:branch PROJ-123 user-auth feature true

# Output:
# ✅ Branch Created Successfully!
# Jira Status: ⚠️  Not Updated (--no-transition flag)
```

## Notes

- Branch names are auto-generated from Jira issue summary if not provided
- Issue key is always validated against Jira before creating branch
- Transition to "In Progress" is automatic unless disabled
- Branch creation never fails due to transition errors (warnings only)
- Supports all standard branch types (feature, bugfix, hotfix, release)
- Works with uncommitted changes (they remain in working directory)
- Compatible with git flow and trunk-based development
- Integration with `/jira:work` for full orchestration
- Integration with `/jira:pr` for pull request creation

## Git Best Practices

### Commit Message Format
```
{ISSUE-KEY}: Brief description of changes

Examples:
  PROJ-123: Add OAuth2 authentication flow
  PROJ-456: Fix memory leak in image processing
  PROJ-789: Update user profile component
```

### Smart Commits
```
If Jira smart commits are enabled, you can use:

  PROJ-123 #comment Added user authentication
  PROJ-123 #time 2h Work on OAuth integration
  PROJ-123 #close Fixed in OAuth implementation
```

### Branch Naming Best Practices
```
DO:
  ✅ feature/PROJ-123-short-clear-description
  ✅ bugfix/PROJ-456-fix-specific-issue
  ✅ hotfix/PROJ-789-critical-security-patch

DON'T:
  ❌ feature/PROJ-123 (no description)
  ❌ PROJ-123-my-feature (no type prefix)
  ❌ feature/proj-123-description (lowercase issue key)
  ❌ feature/PROJ-123-This-Is-Not-Kebab-Case
```

## Troubleshooting

### Branch creation fails silently
```
Check:
  - Are you in a git repository?
  - Do you have write permissions?
  - Is the issue key valid?

Debug:
  git status
  git branch -a
  /jira:branch PROJ-123 --verbose
```

### Transition doesn't work
```
Reasons:
  - Issue is already "In Progress"
  - Workflow doesn't have "In Progress" status
  - Insufficient Jira permissions
  - Custom workflow with different status names

Solution:
  - Use --no-transition flag
  - Transition manually in Jira
  - Check workflow configuration
```

### Description is too long or truncated
```
Max length: 50 characters

If truncated:
  - Provide custom description manually
  - Use shorter, clearer description

Example:
  /jira:branch PROJ-123 auth-flow
  (Instead of auto-generated 50-char description)
```

## See Also

- `/jira:work` - Start full orchestrated development
- `/jira:pr` - Create pull request for completed work
- `/jira:status` - Check issue and orchestration status
- `/jira:sync` - Sync Jira issues with GitHub
