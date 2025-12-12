# Claude Code Hooks

This directory contains hooks that integrate with Claude Code to enforce best practices, manage documentation, and maintain code quality.

## Overview

Hooks are shell scripts that run automatically at specific points in your workflow:
- **Pre-task hooks**: Run before starting a task
- **Post-task hooks**: Run after completing a task
- **File hooks**: Run when files are saved/edited
- **Session hooks**: Run at session start/end

## Core Generic Hooks

These hooks are designed to work across all projects:

### Documentation & Context Management

| Hook | Purpose | Trigger | Environment Variables |
|------|---------|---------|----------------------|
| `obsidian-documentation-sync.sh` | Auto-syncs documentation to Obsidian vault | task:complete, phase:complete | `OBSIDIAN_VAULT_PATH`, `PROJECT_NAME` |
| `doc-logging.sh` | Logs documentation changes to orchestration DB | file:save (*.md) | `OBSIDIAN_VAULT_PATH`, `PROJECT_NAME`, `DB_PATH` |
| `repo-cleanup-manager.sh` | Archives old .md files to Obsidian, declutters repo | manual, scheduled | `OBSIDIAN_VAULT_PATH`, `MAX_AGE_DAYS` |
| `context-management-hook.sh` | Enforces token budget and checkpointing | pre/post operation | `OBSIDIAN_VAULT_PATH` |

### Orchestration & Protocol Enforcement

| Hook | Purpose | Trigger | Environment Variables |
|------|---------|---------|----------------------|
| `enforce-subagent-usage.sh` | Reminds to use sub-agents for complex tasks | task:start, user-prompt-submit | None |
| `orchestration-protocol-enforcer.sh` | Enforces 6-phase protocol (EXPLORE→PLAN→CODE→TEST→FIX→DOCUMENT) | pre-task, post-task | None |
| `orchestration-hooks.sh` | General orchestration coordination | various | None |

### Session Management

| Hook | Purpose | Trigger | Environment Variables |
|------|---------|---------|----------------------|
| `session-start.sh` | Initializes orchestration system | session:start | None |
| `pre-task.sh` | Pre-task validation and setup | task:start | `CLAUDE_AGENT_COUNT`, `CLAUDE_STARTING_PHASE` |
| `post-task.sh` | Post-task validation and cleanup | task:complete | None |
| `post-edit.sh` | Generic post-edit hook | file:save | None |
| `post-edit-documentation.sh` | Documentation-specific post-edit | file:save (*.md) | None |
| `tool-hooks.sh` | Tool usage hooks | tool:use | None |

## Platform-Specific Examples

The `platform-examples/` directory contains hooks that were built for specific platforms (Lobbi multi-tenant SaaS). These serve as examples for creating your own project-specific hooks:

| Hook | Purpose | Domain |
|------|---------|--------|
| `tenant-isolation-validator.sh` | Validates tenant isolation in multi-tenant apps | Multi-tenant SaaS |
| `stripe-webhook-security.sh` | Validates Stripe webhook security | Payment integration |
| `member-data-privacy.sh` | Validates PII handling | Data privacy |
| `subscription-billing-audit.sh` | Audits subscription billing code | Subscription management |
| `keycloak-config-validator.sh` | Validates Keycloak configuration | Authentication |
| `e2e-test-data-cleanup.sh` | Cleans up E2E test data | Testing |
| `atlassian-hooks.sh` | Jira/Confluence integration | Atlassian products |

## Required Environment Variables

### Essential Variables (All Projects)

```bash
# Obsidian vault location (defaults to ${HOME}/obsidian)
export OBSIDIAN_VAULT_PATH="/path/to/your/obsidian/vault"

# Project identifier (defaults to "project")
export PROJECT_NAME="my-awesome-app"

# Project root directory
export PROJECT_ROOT="/path/to/project"
```

### Optional Configuration Variables

```bash
# Git branch (defaults to current branch)
export GIT_BRANCH="main"

# Database path for orchestration (defaults to .claude/orchestration/db/agents.db)
export DB_PATH=".claude/orchestration/db/agents.db"

# Max age for file archival in days (defaults to 30)
export MAX_AGE_DAYS=30

# Obsidian API URL for MCP sync (defaults to http://localhost:27123)
export OBSIDIAN_API_URL="http://localhost:27123"

# Agent count for protocol enforcement (defaults to 5)
export CLAUDE_AGENT_COUNT=5

# Starting phase for orchestration (defaults to "explore")
export CLAUDE_STARTING_PHASE="explore"
```

### LLM API Keys (For Sub-Agents)

```bash
export ANTHROPIC_API_KEY="your-claude-api-key"
export OPENAI_API_KEY="your-openai-api-key"
export GOOGLE_API_KEY="your-gemini-api-key"
```

### Integration Keys (Optional)

```bash
export GITHUB_TOKEN="your-github-token"
export JIRA_API_TOKEN="your-jira-token"
export DOCKER_REGISTRY="ghcr.io/your-org"
export HELM_RELEASE_NAME="${PROJECT_NAME}"
export K8S_NAMESPACE="${PROJECT_NAME}-prod"
```

## Creating Custom Hooks

### Basic Hook Structure

```bash
#!/bin/bash
# Hook Name
# Purpose description
#
# Hook Configuration
# Event: <event_type>
# Pattern: <file_pattern>
# Priority: <low|medium|high|critical>

set -e

HOOK_NAME="my-custom-hook"
PARAM1="${1:-default}"

# Use environment variables for portability
PROJECT_NAME="${PROJECT_NAME:-project}"
OBSIDIAN_VAULT="${OBSIDIAN_VAULT_PATH:-${HOME}/obsidian}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[${HOOK_NAME}]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[${HOOK_NAME}]${NC} $1"
}

log_error() {
    echo -e "${RED}[${HOOK_NAME}]${NC} $1"
}

# Your hook logic here
log_info "Hook executing..."

exit 0
```

### Hook Events

Common events you can hook into:

- `session:start` - Beginning of Claude session
- `session:end` - End of Claude session
- `task:start` - Before starting a task
- `task:complete` - After completing a task
- `phase:complete` - After completing a phase (EXPLORE, PLAN, CODE, TEST, FIX, DOCUMENT)
- `file:save` - When a file is saved
- `tool:use` - When a tool is used
- `user-prompt-submit` - When user submits a prompt

### File Patterns

- `*` - All files
- `**/*.ts` - All TypeScript files
- `**/*.md` - All Markdown files
- `**/test/**` - All files in test directories
- `webhook*.ts` - Files starting with "webhook"

### Priority Levels

- `low` - Nice to have, won't block
- `medium` - Important, may warn
- `high` - Critical, should block on failure
- `critical` - Must pass, blocks all operations

## Best Practices

### 1. Use Environment Variables

**Always** use environment variables for paths and configuration:

```bash
# Good
OBSIDIAN_VAULT="${OBSIDIAN_VAULT_PATH:-${HOME}/obsidian}"
PROJECT_NAME="${PROJECT_NAME:-project}"

# Bad
OBSIDIAN_VAULT="/home/user/obsidian"
PROJECT_NAME="Alpha-1.4"
```

### 2. Provide Defaults

Always provide sensible defaults for environment variables:

```bash
# Uses OBSIDIAN_VAULT_PATH if set, otherwise ${HOME}/obsidian
OBSIDIAN_VAULT="${OBSIDIAN_VAULT_PATH:-${HOME}/obsidian}"
```

### 3. Cross-Platform Compatibility

Use POSIX-compliant commands when possible:

```bash
# Good (works on Linux, macOS, Windows with Git Bash)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Bad (macOS-specific)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" -r "$FILE")
```

### 4. Error Handling

Always include error handling:

```bash
set -e  # Exit on error

# Check if file exists
if [ ! -f "$FILE" ]; then
    log_error "File not found: $FILE"
    exit 1
fi

# Use || true for non-critical operations
sqlite3 "$DB" "DELETE FROM old_data;" 2>/dev/null || true
```

### 5. Informative Output

Use colored logging for clarity:

```bash
log_info "Processing file: $FILE"
log_warn "File is large, may take time"
log_error "Failed to process file"
```

### 6. Documentation

Always include:
- Purpose description
- Event type
- File pattern (if applicable)
- Priority level
- Environment variables used
- Example usage

## Hook Lifecycle

### Session Start
1. `session-start.sh` - Initialize orchestration DB, create session
2. Environment setup

### Task Execution
1. `pre-task.sh` - Validate environment, check context health
2. `context-management-hook.sh pre-operation` - Check token budget
3. `orchestration-protocol-enforcer.sh pre-task` - Validate sub-agent count, starting phase
4. `enforce-subagent-usage.sh` - Remind about sub-agent requirements
5. **Task execution**
6. `post-task.sh` - Validate completion, log activity
7. `orchestration-protocol-enforcer.sh post-task` - Ensure all phases completed
8. `context-management-hook.sh post-operation` - Checkpoint if needed

### File Save
1. `post-edit.sh` - Generic file handling
2. `post-edit-documentation.sh` - If .md file
3. `doc-logging.sh` - Log to orchestration DB
4. `obsidian-documentation-sync.sh` - Sync to Obsidian vault
5. Platform-specific hooks (if applicable)

### Session End
1. Final checkpoints
2. Archive phase logs
3. Update session status

## Debugging Hooks

### Enable Verbose Output

```bash
# Add to hook for debugging
set -x  # Print commands as they execute
```

### Check Hook Execution

```bash
# View orchestration logs
tail -f .claude/orchestration/logs/$(date +%Y-%m-%d).log

# View database activity
sqlite3 .claude/orchestration/db/agents.db "SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10;"

# Check for violations
cat .claude/orchestration/state/protocol_violations.log
```

### Test Hooks Manually

```bash
# Test a hook manually
.claude/hooks/my-hook.sh "test parameter"

# Test pre-task hook
.claude/hooks/pre-task.sh "Test task" "test-agent"

# Test documentation sync
.claude/hooks/obsidian-documentation-sync.sh
```

## Disabling Hooks

To temporarily disable a hook:

```bash
# Rename to .disabled
mv .claude/hooks/my-hook.sh .claude/hooks/my-hook.sh.disabled

# Or remove execute permission
chmod -x .claude/hooks/my-hook.sh
```

## Contributing Custom Hooks

When creating hooks for your project:

1. Start with generic hooks as templates
2. Use environment variables for all configuration
3. Provide clear documentation in the hook header
4. Test on multiple platforms if possible
5. Consider contributing back to platform-examples/ if useful for others

## Troubleshooting

### Hook Not Running

- Check file has execute permission: `chmod +x .claude/hooks/my-hook.sh`
- Verify hook pattern matches files: `echo **/*.ts` in your shell
- Check event type is correct
- Review logs: `.claude/orchestration/logs/*.log`

### Environment Variables Not Set

- Add to `.env` file in project root
- Export in shell: `export OBSIDIAN_VAULT_PATH="/path/to/vault"`
- Add to `.claude/orchestration/.session_env`
- Check with: `echo $OBSIDIAN_VAULT_PATH`

### Permission Errors

- Ensure scripts have execute permission
- Check database file permissions
- Verify Obsidian vault directory is writable

### Path Issues on Windows

- Use Git Bash or WSL
- Convert paths: `/c/Users/...` instead of `C:\Users\...`
- Or use `cygpath` for conversion

## Related Documentation

- **Orchestration Protocol**: See CLAUDE.md for full protocol details
- **Agent System**: `.claude/registry/agents.index.json`
- **External Documentation**: See `${OBSIDIAN_VAULT_PATH}/System/Claude-Instructions/`

## Version History

- **v1.0.0** (2025-12-12): Initial portable version
  - Removed hardcoded paths
  - Added environment variable support
  - Moved platform-specific hooks to examples
  - Created comprehensive documentation
