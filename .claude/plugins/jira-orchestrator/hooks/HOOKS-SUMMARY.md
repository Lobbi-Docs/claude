# Jira Orchestrator Hooks - Implementation Summary

This document provides a comprehensive overview of all hooks implemented for the Jira Orchestrator plugin.

## Overview

The hooks system provides intelligent automation and quality gates throughout the Jira orchestration workflow:

- **5 Hooks** implemented across 4 event types
- **4 Helper Scripts** for validation and session management
- **1 Blocking Hook** (code-review-gate) for quality enforcement
- **Full Integration** with orchestration workflow phases

---

## Hooks Implemented

### 1. detect-jira-issue (UserPromptSubmit)

**Purpose**: Auto-detect Jira issue keys in user messages and suggest orchestration

**Event**: `UserPromptSubmit`
**Type**: Prompt-based
**Blocking**: No
**Script**: `detect-jira-key.sh`

**Behavior**:
- Detects Jira keys using regex: `\b[A-Z]{2,10}-\d+\b`
- Identifies action verbs: "work on", "fix", "implement", etc.
- Suggests `/jira:work` command when appropriate
- Non-intrusive for casual mentions

**Example**:
```
User: "I need to work on PROJ-123"
Hook: Suggests using /jira:work for orchestrated workflow
```

---

### 2. triage-completion-trigger (PostToolUse)

**Purpose**: Auto-suggest triage analysis after fetching issue details

**Event**: `PostToolUse`
**Matcher**: `jira_get_issue` tool
**Type**: Prompt-based
**Blocking**: No
**Script**: `triage-check.sh`

**Behavior**:
- Triggers after `jira_get_issue` MCP tool is used
- Checks if triage analysis already exists
- Suggests running triage-orchestrator agent
- Auto-triggers for `/jira:work` workflow

**Status Outputs**:
- `TRIAGE_COMPLETED`: Already done
- `TRIAGE_IN_PROGRESS`: Currently running
- `TRIAGE_FAILED`: Encountered errors
- `NO_TRIAGE`: Not found

**Example**:
```
User: Fetches PROJ-123 details
Hook: Suggests comprehensive triage analysis
Agent: Runs triage-orchestrator automatically (if /jira:work)
```

---

### 3. code-review-gate (PreToolUse) **[BLOCKING]**

**Purpose**: Enforce code review before PR creation - CRITICAL QUALITY GATE

**Event**: `PreToolUse`
**Matcher**: `gh_pr_create|mcp__github__create_pull_request`
**Type**: Prompt-based
**Blocking**: **YES**
**Script**: `review-gate.sh`

**Behavior**:
- Triggers before creating GitHub pull request
- **BLOCKS** PR creation until code review passes
- Checks review status, findings, and test results
- No bypass allowed - ensures code quality

**Status Outputs**:
- `REVIEW_PASSED` (exit 0): Review passed, allow PR
- `REVIEW_FAILED` (exit 1): Issues found, block PR
- `NO_REVIEW` (exit 1): Review missing, block PR
- `REVIEW_IN_PROGRESS` (exit 2): Wait for completion
- `REVIEW_ERROR` (exit 1): Review error, block PR

**Example**:
```
Agent: Attempts to create PR for PROJ-123
Hook: BLOCKS - Checks review status
  → If NO_REVIEW: Invokes code-reviewer agent first
  → If REVIEW_FAILED: Shows findings, blocks PR
  → If REVIEW_PASSED: Allows PR creation
```

---

### 4. documentation-reminder (Stop)

**Purpose**: Remind to document work after completion

**Event**: `Stop` (session/agent completion)
**Type**: Prompt-based
**Blocking**: No
**Script**: `docs-reminder.sh`

**Behavior**:
- Triggers when session or sub-agent stops
- Checks if significant work was completed (>2 agents, files modified)
- Searches for existing documentation
- Suggests creating docs in Obsidian vault

**Status Outputs**:
- `DOCS_COMPLETE`: Documentation exists
- `DOCS_NEEDED`: Work done, no docs
- `NO_WORK`: Trivial task, no docs needed

**Checks**:
- Agents executed
- Files modified
- Obsidian vault documentation
- Session documentation files

**Example**:
```
Session: Completes PROJ-123 implementation
Hook: Detects 5 agents ran, 10 files modified
  → Checks Obsidian vault: No docs found
  → Status: DOCS_NEEDED
  → Suggests: Create documentation in vault
```

---

### 5. active-issue-check (SessionStart)

**Purpose**: Show active orchestrations on session start

**Event**: `SessionStart`
**Type**: Prompt-based
**Blocking**: No
**Script**: `session-resume.sh`

**Behavior**:
- Triggers when new Claude Code session starts
- Lists all active orchestrations
- Shows current phase and progress
- Offers to resume or clean up stale sessions (>24h)

**Commands**:
```bash
./session-resume.sh list      # List active sessions
./session-resume.sh details   # Show session details
./session-resume.sh cleanup   # Clean stale sessions
```

**Example**:
```
User: Starts new Claude Code session
Hook: Finds 2 active orchestrations
  → PROJ-123: Phase=test, 4/6 agents complete, 2h ago
  → PROJ-456: Phase=plan, 2/6 agents complete, 30m ago
  → Offers: Resume, View details, or Start fresh
```

---

## Helper Scripts

### triage-check.sh

**Purpose**: Check triage analysis status

**Usage**: `./triage-check.sh ISSUE-KEY`

**Returns**:
- Triage status
- Session information
- Output file location
- Triage results (if completed)

**Integration**: Used by `triage-completion-trigger` hook

---

### review-gate.sh

**Purpose**: Validate code review before PR creation

**Usage**: `./review-gate.sh ISSUE-KEY`

**Returns**:
- Review status (passed/failed/missing)
- Review findings
- Summary statistics
- File locations

**Exit Codes**:
- `0`: Review passed
- `1`: Review failed or missing
- `2`: Review in progress

**Integration**: Used by `code-review-gate` hook

---

### docs-reminder.sh

**Purpose**: Check documentation status

**Usage**: `./docs-reminder.sh ISSUE-KEY`

**Returns**:
- Documentation status
- Work significance
- Suggested topics
- Obsidian vault references

**Integration**: Used by `documentation-reminder` hook

---

### session-resume.sh

**Purpose**: Manage orchestration sessions

**Usage**:
```bash
./session-resume.sh list           # List active sessions
./session-resume.sh details <id>   # Show session details
./session-resume.sh cleanup        # Clean stale sessions
```

**Returns**:
- Active sessions with issue keys
- Current phase and progress
- Last activity time
- Stale session detection

**Integration**: Used by `active-issue-check` hook

---

## Workflow Integration

The hooks integrate seamlessly with the orchestration workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Message: "work on PROJ-123"             │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
                 ┌────────────────────┐
                 │ detect-jira-issue  │ (UserPromptSubmit)
                 │   Suggests /jira   │
                 └────────┬───────────┘
                          ↓
                 ┌────────────────────┐
                 │  Fetch Issue via   │
                 │  jira_get_issue    │
                 └────────┬───────────┘
                          ↓
                 ┌────────────────────┐
                 │ triage-completion  │ (PostToolUse)
                 │  Triggers triage   │
                 └────────┬───────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │   ORCHESTRATION WORKFLOW PHASES     │
        │   EXPLORE → PLAN → CODE → TEST      │
        │        → REVIEW → FIX               │
        └─────────────────┬───────────────────┘
                          ↓
                 ┌────────────────────┐
                 │  code-review-gate  │ (PreToolUse) **BLOCKING**
                 │  Before creating   │
                 │  Pull Request      │
                 └────────┬───────────┘
                          ↓
          ┌──────────────────────────┐
          │   Review Status Check    │
          ├──────────────────────────┤
          │ PASSED → Allow PR        │
          │ FAILED → Block PR, fix   │
          │ MISSING → Run review     │
          └──────────┬───────────────┘
                     ↓
           ┌────────────────────┐
           │   Create PR        │
           │   Complete Work    │
           └────────┬───────────┘
                    ↓
           ┌────────────────────┐
           │ documentation-     │ (Stop)
           │ reminder           │
           │ Suggest docs       │
           └────────────────────┘
```

---

## Session State Management

Sessions are stored in: `jira-orchestrator/sessions/`

### Directory Structure

```
sessions/
├── active/           # Currently running orchestrations
│   └── session-abc123/
│       ├── state.json           # Session state
│       ├── triage-output.json   # Triage analysis results
│       ├── code-review.json     # Review findings
│       └── logs/
│           ├── triage.log
│           ├── code-reviewer.log
│           └── ...
├── completed/        # Finished orchestrations
│   └── session-xyz789/
│       └── ...
└── stale/           # Stale sessions (>24h inactive)
    └── session-old456/
        └── ...
```

### state.json Schema

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

The **code-review-gate** hook is a **critical quality gate**:

**Enforcement**:
- Cannot create PR without code review
- No bypass mechanism
- Must address all review findings
- Tests must pass

**Workflow**:
1. Agent attempts PR creation
2. Hook intercepts (PreToolUse)
3. Runs `review-gate.sh ISSUE-KEY`
4. Checks review status:
   - **NO_REVIEW**: Invoke code-reviewer agent
   - **REVIEW_FAILED**: Show findings, block PR
   - **REVIEW_IN_PROGRESS**: Wait for completion
   - **REVIEW_PASSED**: Allow PR creation

**Benefits**:
- Enforces code quality standards
- Catches issues before PR
- Prevents technical debt
- Ensures testing coverage
- Documents review decisions

---

## Environment Variables

The hooks use these environment variables:

| Variable | Purpose | Default | Used By |
|----------|---------|---------|---------|
| `CLAUDE_PLUGIN_ROOT` | Plugin root directory | Auto-detected | All scripts |
| `OBSIDIAN_VAULT_PATH` | Obsidian vault location | `$HOME/obsidian` | docs-reminder.sh |
| `JIRA_KEY` | Current Jira issue key | Passed as arg | All scripts |

---

## Testing

### Quick Test Suite

```bash
# Create test environment
mkdir -p sessions/active/test-session
cd sessions/active/test-session

# Test 1: Triage Check
echo '{"issue_key":"TEST-123","agents":{"triage":{"status":"completed"}}}' > state.json
bash ../../hooks/scripts/triage-check.sh TEST-123
# Expected: TRIAGE_COMPLETED

# Test 2: Review Gate (Passing)
echo '{"issue_key":"TEST-123","agents":{"code_reviewer":{"status":"completed","result":"passed"}}}' > state.json
bash ../../hooks/scripts/review-gate.sh TEST-123
echo "Exit code: $?"  # Expected: 0

# Test 3: Review Gate (Failed)
echo '{"issue_key":"TEST-123","agents":{"code_reviewer":{"status":"completed","result":"failed"}}}' > state.json
bash ../../hooks/scripts/review-gate.sh TEST-123
echo "Exit code: $?"  # Expected: 1

# Test 4: Documentation Reminder
echo '{"issue_key":"TEST-123","agents":{"code":{"status":"completed"},"test":{"status":"completed"}},"files_modified":["file.ts"]}' > state.json
bash ../../hooks/scripts/docs-reminder.sh TEST-123
# Expected: DOCS_NEEDED

# Test 5: Session Resume
bash ../../hooks/scripts/session-resume.sh list
# Expected: List of active sessions

# Cleanup
cd ../../..
rm -rf sessions/active/test-session
```

---

## Best Practices

1. **Never Bypass Review Gate**: The code-review-gate is a critical quality control
2. **Regular Cleanup**: Run `session-resume.sh cleanup` to remove stale sessions
3. **Document Everything**: Use Obsidian vault for all documentation
4. **Monitor Sessions**: Check active sessions on startup
5. **Review Logs**: Store agent logs in `sessions/{id}/logs/` for debugging
6. **Update State Files**: Keep state.json current with agent progress
7. **Handle Failures**: Don't mark agents as complete if they failed
8. **Test Before PR**: Always run code review before creating PR

---

## Future Enhancements

Planned improvements:

- [ ] **Parallel Agent Tracking**: Monitor multiple agents running in parallel
- [ ] **Auto-Rollback**: Automatic rollback on review failure
- [ ] **Jira Webhooks**: Real-time issue updates
- [ ] **Session Dashboard**: Web UI for monitoring active sessions
- [ ] **Metrics Collection**: Performance and quality metrics
- [ ] **Smart Resume**: Context-aware session resumption
- [ ] **Multi-Repo Support**: Orchestrate across multiple repositories
- [ ] **Risk Assessment**: Pre-flight risk analysis
- [ ] **Dependency Detection**: Auto-detect blocking issues
- [ ] **Time Tracking**: Automatic time logging to Jira

---

## Files Structure

```
jira-orchestrator/
├── hooks/
│   ├── hooks.json                    # Hook configurations
│   ├── README.md                     # Detailed documentation
│   ├── HOOKS-SUMMARY.md              # This file
│   └── scripts/
│       ├── detect-jira-key.sh        # Jira key detection
│       ├── triage-check.sh           # Triage status validation
│       ├── review-gate.sh            # Code review enforcement
│       ├── docs-reminder.sh          # Documentation checker
│       └── session-resume.sh         # Session management
├── sessions/
│   ├── active/                       # Active orchestrations
│   ├── completed/                    # Completed orchestrations
│   └── stale/                        # Stale sessions (>24h)
├── agents/                           # Orchestration agents
├── commands/                         # Slash commands
└── workflows/                        # Workflow definitions
```

---

## Related Documentation

- **Main Plugin**: `../plugin.json`
- **Commands**: `../commands/work.md`, `../commands/triage.md`
- **Agents**: `../agents/triage-orchestrator.md`, `../agents/code-reviewer.md`
- **Workflows**: `../workflows/jira-workflow.md`
- **Hooks Detail**: `./README.md`

---

## Summary

The hooks system provides:

✓ **5 Intelligent Hooks** covering the entire workflow
✓ **1 Critical Quality Gate** (code-review-gate) - BLOCKING
✓ **4 Helper Scripts** for validation and management
✓ **Seamless Integration** with orchestration phases
✓ **Session Management** with state tracking
✓ **Documentation Enforcement** via Obsidian vault
✓ **Quality Assurance** before PR creation
✓ **Session Resumption** with context preservation

**Result**: A comprehensive, intelligent orchestration system with built-in quality gates and automation.
