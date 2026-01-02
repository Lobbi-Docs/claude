# Jira Orchestrator Hooks

This directory contains Claude Code plugin hooks that enhance the Jira orchestration workflow with intelligent automation and quality gates.

## Hooks Overview

### 1. **detect-jira-issue** (UserPromptSubmit)
- **Event**: UserPromptSubmit
- **Matcher**: Regex pattern for Jira issue keys (e.g., `PROJ-123`)
- **Purpose**: Auto-detects Jira issues in user messages and suggests orchestration
- **Blocking**: No
- **Script**: `detect-jira-key.sh`

**Triggers when:**
- User mentions a Jira issue key like "work on PROJ-123"
- Suggests using `/jira:work` command for full orchestration

---

### 2. **triage-completion-trigger** (PostToolUse)
- **Event**: PostToolUse
- **Matcher**: `jira_get_issue` tool
- **Purpose**: Suggests triage analysis after fetching issue details
- **Blocking**: No
- **Script**: `triage-check.sh`

**Triggers when:**
- `jira_get_issue` MCP tool is used
- Checks if triage analysis is needed
- Auto-suggests running triage-orchestrator agent

**Script Output:**
```
TRIAGE_COMPLETED    # Triage already done
TRIAGE_IN_PROGRESS  # Triage currently running
TRIAGE_FAILED       # Triage encountered errors
NO_TRIAGE           # No triage found
```

---

### 3. **code-review-gate** (PreToolUse)
- **Event**: PreToolUse
- **Matcher**: `gh_pr_create` or `mcp__github__create_pull_request` tools
- **Purpose**: Ensures code review passed before creating PR
- **Blocking**: **YES** - Critical quality gate
- **Script**: `review-gate.sh`

**Triggers when:**
- About to create a GitHub pull request
- Blocks PR creation until code review passes

**Script Output:**
```
REVIEW_PASSED       # Review completed and passed - allow PR
REVIEW_FAILED       # Review found issues - block PR
NO_REVIEW           # Review not performed - block PR
REVIEW_IN_PROGRESS  # Review running - wait
REVIEW_ERROR        # Review encountered errors - block PR
```

**Exit Codes:**
- `0`: Review passed, allow PR creation
- `1`: Review failed or missing, block PR creation
- `2`: Review in progress, wait for completion

---

### 4. **documentation-reminder** (Stop)
- **Event**: Stop (session/agent completion)
- **Purpose**: Reminds to document work after completion
- **Blocking**: No
- **Script**: `docs-reminder.sh`

**Triggers when:**
- A session or sub-agent stops
- Checks if significant work was completed
- Reminds to create documentation in Obsidian vault

**Script Output:**
```
DOCS_COMPLETE  # Documentation already created
DOCS_NEEDED    # Work completed but no docs
NO_WORK        # No significant work to document
```

**Checks:**
- Number of agents that ran
- Files modified
- Existing documentation in Obsidian vault
- Session documentation files

---

### 5. **active-issue-check** (SessionStart)
- **Event**: SessionStart
- **Purpose**: Shows active Jira orchestrations on session start
- **Blocking**: No
- **Script**: `session-resume.sh`

**Triggers when:**
- New Claude Code session starts
- Lists active orchestrations
- Offers to resume or clean up stale sessions

**Script Commands:**
```bash
# List active sessions
./session-resume.sh list

# Get session details
./session-resume.sh details <session-id>

# Clean up stale sessions (>24h)
./session-resume.sh cleanup

# Show help
./session-resume.sh help
```

---

## Helper Scripts

### triage-check.sh
**Purpose**: Check if triage analysis is in progress or completed

**Usage:**
```bash
./triage-check.sh ISSUE-KEY
```

**Output:**
- Current triage status
- Session information
- Output file location
- Triage results (if completed)

---

### review-gate.sh
**Purpose**: Verify code review status before PR creation

**Usage:**
```bash
./review-gate.sh ISSUE-KEY
```

**Output:**
- Review status (passed/failed/missing)
- Review findings and issues
- File locations
- Summary statistics

**Exit Codes:**
- `0`: Review passed
- `1`: Review failed or missing
- `2`: Review in progress

---

### docs-reminder.sh
**Purpose**: Check documentation status for completed work

**Usage:**
```bash
./docs-reminder.sh ISSUE-KEY
```

**Output:**
- Documentation status
- Work significance check
- Suggested documentation topics
- Obsidian vault references

**Checks:**
- Session state (agents run, files modified)
- Documentation agent execution
- Obsidian vault for existing docs
- Manual documentation files

---

### session-resume.sh
**Purpose**: Manage active Jira orchestration sessions

**Usage:**
```bash
# List all active sessions
./session-resume.sh list

# Show session details
./session-resume.sh details <session-id>

# Clean up stale sessions
./session-resume.sh cleanup
```

**Output:**
- Active sessions with issue keys
- Current phase and progress
- Agent completion status
- Last activity time
- Stale session detection (>24 hours)

---

## Configuration

Hooks are configured in `hooks.json`:

```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "name": "triage-completion-trigger",
      "type": "prompt",
      "matcher": {
        "type": "tool_name",
        "pattern": "jira_get_issue"
      },
      "blocking": false,
      "prompt": "..."
    }
  ],
  "scripts": {
    "triage-check": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/triage-check.sh"
  }
}
```

---

## Environment Variables

The scripts use these environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `CLAUDE_PLUGIN_ROOT` | Plugin root directory | Auto-detected |
| `OBSIDIAN_VAULT_PATH` | Obsidian vault location | `$HOME/obsidian` |
| `JIRA_KEY` | Current Jira issue key | Passed as argument |

---

## Session State Structure

Sessions are stored in: `${CLAUDE_PLUGIN_ROOT}/sessions/`

```
sessions/
├── active/           # Active orchestrations
│   └── session-id/
│       ├── state.json
│       ├── triage-output.json
│       ├── code-review.json
│       └── logs/
├── completed/        # Completed orchestrations
└── stale/           # Stale sessions (>24h)
```

### state.json Structure

```json
{
  "issue_key": "PROJ-123",
  "issue_summary": "Implement feature X",
  "issue_type": "Story",
  "current_phase": "code",
  "created_at": "2025-12-17T10:00:00Z",
  "updated_at": "2025-12-17T11:30:00Z",
  "agents": {
    "triage": {
      "status": "completed",
      "result": "passed",
      "output": "/path/to/triage-output.json",
      "summary": "Medium complexity, no blockers",
      "completed_at": "2025-12-17T10:15:00Z"
    },
    "code_reviewer": {
      "status": "completed",
      "result": "passed",
      "output": "/path/to/code-review.json",
      "summary": "No critical issues found",
      "completed_at": "2025-12-17T11:20:00Z"
    }
  },
  "workflow": ["explore", "triage", "plan", "code", "test", "review", "fix", "document"],
  "files_modified": [
    "src/feature.ts",
    "src/feature.test.ts"
  ]
}
```

---

## Quality Gates

### Code Review Gate (BLOCKING)

This is a **critical quality gate** that prevents PR creation without code review:

1. **Triggered**: When `gh_pr_create` or similar tool is used
2. **Blocks**: PR creation until review passes
3. **Checks**:
   - Code review agent completed
   - Review result is "passed" or "approved"
   - No critical issues found
   - Tests are passing

**Bypass**: Not allowed - this gate ensures code quality

---

## Integration with Orchestration

These hooks integrate with the main orchestration workflow:

```
User Message → detect-jira-issue hook
    ↓
Fetch Issue → triage-completion-trigger hook
    ↓
[EXPLORE → PLAN → CODE → TEST → FIX phases]
    ↓
Create PR → code-review-gate hook (BLOCKING)
    ↓
Complete → documentation-reminder hook
```

---

## Testing Hooks

### Test triage-check.sh
```bash
# Create test session
mkdir -p sessions/active/test-session
echo '{"issue_key":"TEST-123","agents":{"triage":{"status":"completed"}}}' > sessions/active/test-session/state.json

# Run check
./hooks/scripts/triage-check.sh TEST-123
```

### Test review-gate.sh
```bash
# Create test with passing review
echo '{"issue_key":"TEST-123","agents":{"code_reviewer":{"status":"completed","result":"passed"}}}' > sessions/active/test-session/state.json

# Run check
./hooks/scripts/review-gate.sh TEST-123
echo "Exit code: $?"  # Should be 0
```

### Test docs-reminder.sh
```bash
# Create test session with work
echo '{"issue_key":"TEST-123","agents":{"code":{"status":"completed"},"test":{"status":"completed"}},"files_modified":["file.ts"]}' > sessions/active/test-session/state.json

# Run check
./hooks/scripts/docs-reminder.sh TEST-123
```

### Test session-resume.sh
```bash
# List sessions
./hooks/scripts/session-resume.sh list

# Get details
./hooks/scripts/session-resume.sh details test-session

# Cleanup stale
./hooks/scripts/session-resume.sh cleanup
```

---

## Troubleshooting

### Script not executing

**Windows (Git Bash/WSL):**
```bash
# Make executable
chmod +x hooks/scripts/*.sh

# Run with bash explicitly
bash hooks/scripts/triage-check.sh ISSUE-KEY
```

### Session state not found

Check that sessions are being created in the correct location:
```bash
# Verify plugin root
echo $CLAUDE_PLUGIN_ROOT

# List sessions
ls -la sessions/active/
```

### jq not available

Install jq for JSON parsing:
```bash
# Windows (chocolatey)
choco install jq

# WSL/Linux
sudo apt-get install jq

# macOS
brew install jq
```

---

## Best Practices

1. **Review Gate**: Never bypass the code review gate - it ensures quality
2. **Session Cleanup**: Regularly run `session-resume.sh cleanup` to remove stale sessions
3. **Documentation**: Always document significant work in the Obsidian vault
4. **State Files**: Keep state.json updated with agent progress
5. **Logs**: Store agent logs in `sessions/{id}/logs/` for debugging

---

---

## Future Enhancements

Potential improvements:

- [ ] Parallel agent execution tracking
- [ ] Automated rollback on review failure
- [ ] Integration with Jira webhooks
- [ ] Real-time session monitoring dashboard
- [ ] Performance metrics collection
- [ ] Smart session resumption with context recovery
- [ ] Multi-repository orchestration support

---

## Related Documentation

- Main Plugin: `../plugin.json`
- Commands: `../commands/`
- Agents: `../agents/`
- Workflows: `../workflows/`
- Original detect-jira-issue hook: See below

---

## Legacy: Jira Key Detection

### `detect-jira-key.sh`

**Location:** `hooks/scripts/detect-jira-key.sh`

**Purpose:** Extracts Jira issue keys from text input and returns structured JSON data.

**Input:** Text via stdin or first argument

**Output:** JSON object with:
```json
{
  "detected": 2,
  "keys": ["PROJ-123", "PROJ-456"],
  "keys_list": "PROJ-123,PROJ-456",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Fields:**
- `detected`: Number of unique Jira keys found
- `keys`: Array of detected issue keys
- `keys_list`: Comma-separated string of keys
- `action_detected`: Boolean indicating if action verbs were found
- `suggest_orchestration`: Boolean recommending `/jira:work` usage

**Usage:**
```bash
# Via stdin
echo "Let's work on PROJ-123" | ./detect-jira-key.sh

# Via argument
./detect-jira-key.sh "Fix ABC-456 and DEV-789"
```

## Detection Patterns

### Jira Key Format
- 2-10 uppercase letters (project key)
- Hyphen
- One or more digits (issue number)
- Examples: `ABC-123`, `PROJ-456`, `DEVELOPMENT-1234`

### Action Verbs Detected
The hook recognizes these action verbs to determine if orchestration should be suggested:

- work on
- fix
- implement
- complete
- start
- begin
- solve
- resolve
- address
- help with
- tackle

## Example Interactions

### Scenario 1: User wants to work on an issue

**User:** "I need to work on PROJ-123"

**Hook Response:**
> I noticed you mentioned PROJ-123. Would you like me to use the `/jira:work` command to orchestrate a complete solution? This will automatically explore the issue, create a plan, implement the code, run tests, fix any issues, and commit the changes.

### Scenario 2: User mentions issue casually

**User:** "PROJ-123 is related to the authentication system"

**Hook Response:**
> I see you're referring to PROJ-123. [Then addresses the actual question without pushing orchestration]

### Scenario 3: Multiple issues with action intent

**User:** "Fix PROJ-123 and implement PROJ-456"

**Hook Response:**
> I noticed you mentioned PROJ-123, PROJ-456. Would you like me to use `/jira:work` for each issue to orchestrate complete solutions?

## Technical Details

### Hook Flow

1. **User submits message** → `UserPromptSubmit` event fires
2. **Regex matcher** checks for Jira key pattern
3. **If match found** → Prompt-based hook activates
4. **Claude receives prompt** with detected issues injected as context
5. **Claude responds** intelligently based on user intent
6. **Non-blocking** → Normal conversation continues even if hook has issues

### Context Variables Available in Prompt

- `${DETECTED_ISSUES}`: Comma-separated list of detected Jira keys
- `${USER_MESSAGE}`: The full user message
- `${CLAUDE_PLUGIN_ROOT}`: Plugin root directory path

### Performance Considerations

- **Timeout:** 5 seconds prevents hanging on slow operations
- **Non-blocking:** Failures don't interrupt user workflow
- **Regex-based:** Fast pattern matching without external API calls
- **Prompt-based:** Leverages Claude's intelligence for context-aware responses

## Customization

### Adjusting Detection Sensitivity

Edit the regex pattern in `hooks.json`:

```json
"matcher": {
  "type": "regex",
  "pattern": "\\b[A-Z]{3,5}-\\d{1,5}\\b"  // Only 3-5 letter projects, 1-5 digit issues
}
```

### Adding More Action Verbs

Edit `detect-jira-key.sh` and add verbs to the `ACTION_VERBS` array:

```bash
ACTION_VERBS=("work on" "fix" "implement" "your-custom-verb")
```

### Changing Hook Behavior

Modify the prompt in `hooks.json` to change how Claude responds to detected issues.

## Troubleshooting

### Hook not triggering

1. Check that Jira key matches the pattern `[A-Z]{2,10}-\d+`
2. Verify hooks are enabled in Claude Code settings
3. Check hook timeout hasn't been exceeded

### False positives

- Tighten the regex pattern to be more specific
- Adjust the minimum/maximum project key length
- Add project key whitelist in the script

### Performance issues

- Reduce timeout value if responses are too slow
- Ensure script is executable: `chmod +x detect-jira-key.sh`
- Check for shell compatibility issues (script requires bash)

## Future Enhancements

Potential improvements for this hook:

1. **Jira API integration:** Fetch issue details when detected
2. **Issue validation:** Check if detected keys exist in Jira
3. **Smart project detection:** Learn common project keys over time
4. **Context enrichment:** Inject issue summary/status into conversation
5. **Multi-issue orchestration:** Handle multiple issues in one command
6. **Issue prioritization:** Suggest which issue to work on first

## Related Files

- `hooks.json` - Hook configuration
- `hooks/scripts/detect-jira-key.sh` - Detection script
- `commands/work.md` - The `/jira:work` command this hook suggests
- `agents/orchestrator-agent.md` - Main orchestration agent

## License

MIT License - See plugin root for details
