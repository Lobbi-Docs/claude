---
name: jira:commit-template
description: Generate commit message templates from Jira issue context for conventional commits
arguments:
  - name: issue-key
    description: Jira issue key (auto-detect from branch if not provided)
    required: false
  - name: time
    description: Time to include in smart commit (e.g., 2h, 30m, 1d)
    required: false
  - name: transition
    description: Target transition to include (e.g., "In Review", "Done")
    required: false
  - name: auto-time
    description: Auto-estimate time based on git diff complexity
    required: false
    default: false
  - name: scope
    description: Override the scope in conventional commit
    required: false
  - name: clipboard
    description: Copy result to clipboard
    required: false
    default: false
tags:
  - jira
  - git
  - commit
  - conventional-commits
  - smart-commits
examples:
  - command: /jira:commit-template PROJ-123
    description: Generate template from specific issue
  - command: /jira:commit-template --time 2h --transition "In Review"
    description: Generate template with smart commit commands
  - command: /jira:commit-template --auto-time --clipboard
    description: Auto-estimate time and copy to clipboard
  - command: /jira:commit-template --scope auth
    description: Override scope for commit
---

# Commit Template Generator

This command generates conventional commit message templates from Jira issue context, with support for smart commit commands and automatic time estimation.

## Prerequisites

- Atlassian Cloud access configured
- Git repository with Jira-linked branches
- Valid Jira issue key (from branch or argument)

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMMIT TEMPLATE GENERATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   DETECT    │ -> │    FETCH    │ -> │  GENERATE   │ -> │   OUTPUT    │ │
│   │ Issue Key   │    │   Details   │    │  Template   │    │  Template   │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                  │                  │                  │         │
│         v                  v                  v                  v         │
│   From branch or     Get issue from     Build commit       Copy or print  │
│   argument           Jira API           message            template       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Execution Steps

### Step 1: Detect Issue Key

If no issue key provided, auto-detect from current git branch:

```yaml
action: Get Current Branch
tool: Bash
command: git rev-parse --abbrev-ref HEAD
expected_patterns:
  - feature/PROJ-123-description
  - bugfix/PROJ-456-fix
  - PROJ-789-hotfix
  - proj-123/description  # case insensitive
```

**Branch Parsing Rules:**
- Extract issue key using pattern: `[A-Z]+-\d+` (case insensitive)
- Support common branch naming conventions
- Fallback to prompt user if not found

### Step 2: Fetch Jira Issue Details

Retrieve issue information from Jira:

```yaml
action: Get Issue Details
tool: mcp__plugin_jira-orchestrator_atlassian__getJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${issue-key}
  expand: renderedFields,components
  fields:
    - summary
    - description
    - issuetype
    - components
    - priority
    - status
```

**Issue Type to Commit Type Mapping:**

| Jira Issue Type | Conventional Commit Type |
|----------------|--------------------------|
| Bug | fix |
| Story | feat |
| Task | chore |
| Epic | feat |
| Improvement | feat |
| Sub-task | chore |
| Technical Debt | refactor |
| Documentation | docs |
| Test | test |

### Step 3: Determine Commit Scope

**Priority Order:**
1. User-provided `--scope` argument
2. Jira components (first component if multiple)
3. Most modified directory from git diff
4. Fallback to empty scope

```yaml
action: Analyze Modified Files (if no scope provided)
tool: Bash
command: |
  git diff --name-only --cached |
  sed 's|/.*||' |
  sort |
  uniq -c |
  sort -rn |
  head -1 |
  awk '{print $2}'
```

**Common Scopes:**
- `api` - API changes
- `auth` - Authentication/authorization
- `ui` - User interface
- `db` - Database changes
- `config` - Configuration changes
- `deps` - Dependency updates
- `ci` - CI/CD changes

### Step 4: Auto-Estimate Time (if --auto-time)

Analyze git diff to estimate work time:

```yaml
action: Calculate Complexity
tool: Bash
command: |
  git diff --cached --stat | tail -1
metrics:
  - files_changed: count
  - insertions: count
  - deletions: count
```

**Estimation Algorithm:**

```
Base time = 15 minutes
+ Files changed × 5 minutes
+ (Insertions + Deletions) / 100 × 10 minutes

Round to nearest 15 minutes
Format: {hours}h or {minutes}m
```

**Example Calculations:**
- 2 files, 50 lines changed → 30m
- 5 files, 200 lines changed → 1h
- 10 files, 500 lines changed → 2h

### Step 5: Build Commit Template

Generate conventional commit message:

```markdown
{type}({scope}): {summary}

[DETAILED_DESCRIPTION_PLACEHOLDER]

{issue-key} #comment [DESCRIPTION] {#time {time}} {#transition "{transition}"}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Template Components:**

1. **Header Line:**
   - Type: Derived from issue type
   - Scope: From component/files/argument
   - Summary: Cleaned Jira summary (remove issue key prefix, trim to 72 chars)

2. **Body Placeholder:**
   - Include `[DETAILED_DESCRIPTION_PLACEHOLDER]` for manual completion
   - OR auto-generate from git diff summary if available

3. **Smart Commit Commands:**
   - Always include `#comment` directive
   - Include `#time` if time provided or auto-estimated
   - Include `#transition` if specified

4. **Footer:**
   - Standard Claude Code attribution
   - Co-authored-by line

### Step 6: Output Template

**Copy to Clipboard (if --clipboard):**
```yaml
action: Copy to System Clipboard
tool: Bash
command: |
  echo "${template}" | clip  # Windows
  echo "${template}" | pbcopy  # macOS
  echo "${template}" | xclip -selection clipboard  # Linux
```

**Print to Console:**
```yaml
action: Display Template
output: |
  ╔═══════════════════════════════════════════════════════════╗
  ║           COMMIT TEMPLATE GENERATED                       ║
  ╚═══════════════════════════════════════════════════════════╝

  ${template}

  ─────────────────────────────────────────────────────────────
  Issue: ${issue-key}
  Type: ${commit-type}
  Scope: ${scope}
  Time: ${time}
  ─────────────────────────────────────────────────────────────

  ${clipboard ? "✓ Copied to clipboard" : "Use --clipboard to copy"}
```

## Usage Examples

### Basic Usage

Auto-detect from branch and generate template:
```bash
/jira:commit-template
```

Output:
```
feat(auth): Implement OAuth2 login flow

[DETAILED_DESCRIPTION_PLACEHOLDER]

PROJ-123 #comment Implement OAuth2 login flow

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### With Smart Commit Commands

Include time tracking and transition:
```bash
/jira:commit-template --time 2h --transition "In Review"
```

Output:
```
feat(auth): Implement OAuth2 login flow

[DETAILED_DESCRIPTION_PLACEHOLDER]

PROJ-123 #comment Implement OAuth2 login flow #time 2h #transition "In Review"

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Auto-Time Estimation

Let the tool estimate work time:
```bash
/jira:commit-template --auto-time
```

Output:
```
fix(api): Resolve null pointer exception in user service

[DETAILED_DESCRIPTION_PLACEHOLDER]

PROJ-456 #comment Fix null pointer exception #time 1h

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Override Scope

Manually specify scope:
```bash
/jira:commit-template --scope database --time 30m
```

Output:
```
chore(database): Update migration scripts for user table

[DETAILED_DESCRIPTION_PLACEHOLDER]

PROJ-789 #comment Update migration scripts #time 30m

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Copy to Clipboard

Generate and copy for immediate use:
```bash
/jira:commit-template --clipboard
```

### Specific Issue

Generate template for different issue:
```bash
/jira:commit-template PROJ-999 --auto-time --clipboard
```

## Smart Commit Command Reference

Jira supports these smart commit commands:

| Command | Format | Example |
|---------|--------|---------|
| Comment | `#comment {text}` | `#comment Fixed the bug` |
| Time | `#time {value}` | `#time 2h 30m` |
| Transition | `#transition "{name}"` | `#transition "In Review"` |

**Time Format:**
- `w` - weeks
- `d` - days
- `h` - hours
- `m` - minutes

**Valid Transitions:**
- Check your Jira workflow for valid transition names
- Use quotes for multi-word transitions
- Case-sensitive

## Conventional Commit Format

This command follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Valid Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Revert previous commit

**Subject Line Rules:**
- Max 72 characters
- Lowercase first letter
- No period at end
- Imperative mood ("add" not "added")

## Error Handling

### Issue Key Not Found

```yaml
error: Issue key not detected
resolution:
  - Check branch naming follows pattern: {type}/PROJ-123-description
  - Provide issue key explicitly: /jira:commit-template PROJ-123
  - Verify branch is Jira-linked
```

### Jira API Failure

```yaml
error: Cannot fetch issue details
resolution:
  - Verify Atlassian authentication
  - Check issue key is valid and accessible
  - Confirm Jira API token has read permissions
fallback:
  - Generate minimal template without Jira context
  - Use git commit message conventions
```

### Git Repository Not Found

```yaml
error: Not in a git repository
resolution:
  - Navigate to project root
  - Initialize git if needed: git init
  - Clone repository if needed
```

### Clipboard Access Failure

```yaml
error: Cannot copy to clipboard
resolution:
  - Install clipboard utility (xclip/pbcopy/clip)
  - Remove --clipboard flag and copy manually
  - Check system clipboard permissions
```

## Integration with Workflows

### After Work Command

```bash
# Complete development
/jira:work PROJ-123

# Stage changes
git add .

# Generate commit template
/jira:commit-template --auto-time --transition "In Review" --clipboard

# Commit with template
git commit
# Paste template from clipboard
```

### Pre-Commit Hook Integration

Create `.git/hooks/prepare-commit-msg`:

```bash
#!/bin/bash
# Auto-generate commit template

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only run for regular commits (not merge, etc.)
if [ -z "$COMMIT_SOURCE" ]; then
  # Generate template and prepend to commit message
  /jira:commit-template --auto-time > "$COMMIT_MSG_FILE"
fi
```

### CI/CD Integration

Validate commit messages in pipeline:

```yaml
# .gitlab-ci.yml or .github/workflows/validate-commits.yml
validate-commit:
  script:
    - |
      # Check commit message follows conventional commits
      git log -1 --pretty=%B | grep -E '^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,72}'

      # Check for Jira issue reference
      git log -1 --pretty=%B | grep -E '[A-Z]+-[0-9]+'
```

## Best Practices

### Commit Message Quality

1. **Be Specific:**
   - ✅ `fix(auth): Prevent race condition in token refresh`
   - ❌ `fix: Bug fix`

2. **Use Imperative Mood:**
   - ✅ `feat(api): Add user search endpoint`
   - ❌ `feat(api): Added user search endpoint`

3. **Explain Why, Not What:**
   - ✅ `refactor(db): Use connection pooling to improve performance`
   - ❌ `refactor(db): Changed database code`

4. **Keep Subject Line Concise:**
   - Max 72 characters
   - Save details for body

### Time Tracking

1. **Log Actual Time:**
   - Use `--time` for completed work
   - Be realistic with estimates

2. **Auto-Time as Starting Point:**
   - Use `--auto-time` for quick estimation
   - Adjust manually if needed

3. **Track in Increments:**
   - Round to 15-minute increments
   - Aggregate multiple commits if needed

### Scope Selection

1. **Use Project Conventions:**
   - Check existing commits for scope patterns
   - Maintain consistency across team

2. **Match Jira Components:**
   - Align scopes with component names
   - Use component hierarchy if available

3. **Avoid Over-Scoping:**
   - Keep scopes broad and reusable
   - Don't create unique scope per commit

## Configuration

### Environment Variables

```bash
# Default Jira cloud ID
export JIRA_CLOUD_ID="c4423066-5fa2-4ba6-b734-21595003e7dd"

# Default transition for commits
export JIRA_DEFAULT_TRANSITION="In Review"

# Auto-time by default
export JIRA_AUTO_TIME="true"

# Auto-clipboard by default
export JIRA_AUTO_CLIPBOARD="true"
```

### Project Configuration

Create `.jirarc.json` in project root:

```json
{
  "commitTemplate": {
    "defaultTransition": "In Review",
    "autoTime": true,
    "autoClipboard": false,
    "scopeMappings": {
      "src/auth": "auth",
      "src/api": "api",
      "src/ui": "ui",
      "database/migrations": "db"
    },
    "typeOverrides": {
      "Technical Debt": "refactor",
      "Documentation": "docs"
    }
  }
}
```

## Output Formats

### Standard Output

```
feat(auth): Implement OAuth2 login flow

[DETAILED_DESCRIPTION_PLACEHOLDER]

PROJ-123 #comment Implement OAuth2 login flow #time 2h #transition "In Review"

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### With Body Auto-Generation

```
feat(auth): Implement OAuth2 login flow

- Add OAuth2 provider configuration
- Implement authorization code flow
- Add token refresh mechanism
- Update user session handling

Changes:
- 5 files modified
- 234 insertions
- 67 deletions

PROJ-123 #comment Implement OAuth2 login flow #time 2h #transition "In Review"

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Minimal (No Jira Access)

```
feat: Implement OAuth2 login flow

[DETAILED_DESCRIPTION_PLACEHOLDER]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Troubleshooting

### Template Not Generating

**Issue:** No output or error

**Solutions:**
1. Check git repository status: `git status`
2. Verify branch naming: `git branch --show-current`
3. Test Jira connectivity: `/jira:sync`
4. Check issue exists: `PROJ-123` in Jira

### Wrong Commit Type

**Issue:** Generated type doesn't match work

**Solutions:**
1. Check Jira issue type is correct
2. Update issue type in Jira if needed
3. Manually edit commit type after generation
4. Configure type override in `.jirarc.json`

### Scope Not Detected

**Issue:** Empty or incorrect scope

**Solutions:**
1. Use `--scope` argument explicitly
2. Add Jira component to issue
3. Stage files before generating: `git add .`
4. Configure scope mappings in `.jirarc.json`

### Time Estimation Off

**Issue:** Auto-time not accurate

**Solutions:**
1. Use manual `--time` argument
2. Adjust estimation algorithm in config
3. Track actual time and compare
4. Use Jira time tracking for accuracy

## Related Commands

- `/jira:work` - Start work on issue
- `/jira:sync` - Sync progress to Jira
- `/jira:pr` - Create pull request
- `/jira:transition` - Transition issue status

## Advanced Usage

### Multi-Issue Commits

For commits affecting multiple issues:

```bash
/jira:commit-template PROJ-123 --clipboard

# Edit to include additional references
# feat(auth): Implement OAuth2 and SAML login
#
# PROJ-123 #comment OAuth2 implementation #time 2h
# PROJ-124 #comment SAML integration #time 1h
```

### Batch Template Generation

Generate templates for multiple branches:

```bash
#!/bin/bash
# generate-templates.sh

for branch in $(git branch | grep -E 'PROJ-[0-9]+'); do
  git checkout $branch
  echo "=== $branch ==="
  /jira:commit-template --auto-time
  echo ""
done
```

### Template Validation

Validate generated template:

```bash
#!/bin/bash
# validate-template.sh

TEMPLATE=$(/jira:commit-template)

# Check conventional commit format
echo "$TEMPLATE" | head -1 | grep -E '^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .{1,72}$'

# Check Jira reference
echo "$TEMPLATE" | grep -E '[A-Z]+-[0-9]+'

# Check smart commit syntax
echo "$TEMPLATE" | grep -E '#(comment|time|transition)'
```

## Success Criteria

A successful commit template generation means:

- [ ] Valid conventional commit format
- [ ] Correct type derived from Jira issue
- [ ] Appropriate scope determined
- [ ] Jira issue key included
- [ ] Smart commit commands formatted correctly
- [ ] Time tracking included (if requested)
- [ ] Transition command included (if requested)
- [ ] Template copied to clipboard (if requested)
- [ ] Follows team commit message conventions

## Performance Considerations

**Typical Execution Time:**
- Issue key detection: < 100ms
- Jira API call: 200-500ms
- Git diff analysis: 100-300ms
- Template generation: < 50ms
- **Total:** < 1 second

**Optimization Tips:**
- Cache Jira issue data locally
- Batch multiple template generations
- Pre-fetch common transitions
- Use local git branch parsing

## Security Notes

- API tokens never exposed in commit messages
- Clipboard cleared after configurable timeout
- Templates don't include sensitive issue details
- Smart commit commands validated before inclusion
