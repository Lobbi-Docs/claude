---
name: jira:install-hooks
description: Install and manage git hooks for Jira smart commit integration
arguments:
  - name: action
    description: Action to perform (install, uninstall, list, test, status, configure)
    required: true
  - name: hook-type
    description: Specific hook to manage (prepare-commit-msg, commit-msg, post-commit, all)
    required: false
    default: all
  - name: force
    description: Overwrite existing hooks without prompting
    required: false
    default: false
  - name: sync-mode
    description: Jira sync mode for post-commit hook (sync, async, manual)
    required: false
    default: async
  - name: debug
    description: Enable debug logging in hooks
    required: false
    default: false
  - name: notify
    description: Enable notification messages from hooks
    required: false
    default: true
tags:
  - jira
  - git
  - hooks
  - smart-commits
  - installation
---

# Install Git Hooks

Manage git hooks for Jira smart commit integration. Provides automatic issue key prepending, smart commit validation, and Jira synchronization.

## Prerequisites

- Git repository initialized
- Jira orchestrator configured
- Bash shell (Git Bash on Windows)
- jq command-line JSON processor (for post-commit hook)

## Hook Overview

| Hook | Purpose | When It Runs |
|------|---------|--------------|
| **prepare-commit-msg** | Auto-prepend issue key from branch name | Before commit message editor |
| **commit-msg** | Validate smart commit syntax | After commit message saved |
| **post-commit** | Process smart commands, sync to Jira | After commit created |

## Actions

### Install Hooks

Install git hooks into the repository.

```bash
# Install all hooks
/jira-orchestrator:install-hooks install

# Install specific hook
/jira-orchestrator:install-hooks install --hook-type prepare-commit-msg

# Force overwrite existing hooks
/jira-orchestrator:install-hooks install --force true

# Install with custom sync mode
/jira-orchestrator:install-hooks install --sync-mode sync

# Install with debug enabled
/jira-orchestrator:install-hooks install --debug true
```

**Process:**

1. Locate git repository root
2. Check for existing hooks
3. Backup existing hooks if present
4. Copy hooks from jira-orchestrator/hooks/git/
5. Make hooks executable (chmod +x)
6. Configure hook environment variables
7. Test hook installation
8. Report status

**Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║          Git Hooks Installation                               ║
╚═══════════════════════════════════════════════════════════════╝

Repository: C:\Users\...\project\.git

Installing hooks:
  ✓ prepare-commit-msg  (backed up existing)
  ✓ commit-msg          (new installation)
  ✓ post-commit         (new installation)

Configuration:
  JIRA_SYNC_MODE=async
  JIRA_HOOK_DEBUG=false
  JIRA_NOTIFY=true

Testing hooks:
  ✓ prepare-commit-msg  (executable, valid syntax)
  ✓ commit-msg          (executable, valid syntax)
  ✓ post-commit         (executable, valid syntax)

Installation complete!

Next steps:
  1. Create branch: git checkout -b feature/LF-27-description
  2. Make commit: git commit -m "Add feature"
  3. Hook will prepend: "LF-27: Add feature"
```

### Uninstall Hooks

Remove installed git hooks.

```bash
# Uninstall all hooks
/jira-orchestrator:install-hooks uninstall

# Uninstall specific hook
/jira-orchestrator:install-hooks uninstall --hook-type post-commit

# Force removal without prompting
/jira-orchestrator:install-hooks uninstall --force true
```

**Process:**

1. Locate installed hooks
2. Verify hooks belong to jira-orchestrator
3. Backup hooks before removal
4. Remove hook files
5. Restore previous hooks if backups exist
6. Report status

**Output:**
```
Uninstalling git hooks...

Removed hooks:
  ✓ .git/hooks/prepare-commit-msg  (backed up)
  ✓ .git/hooks/commit-msg          (backed up)
  ✓ .git/hooks/post-commit         (backed up)

Backups saved to: .git/hooks/backup/2025-12-19/

Uninstall complete!
```

### List Hooks

List currently installed hooks and their status.

```bash
# List all hooks
/jira-orchestrator:install-hooks list

# List specific hook type
/jira-orchestrator:install-hooks list --hook-type prepare-commit-msg
```

**Output:**
```
Git Hooks Status
================

Hook: prepare-commit-msg
  Status:     Installed
  Source:     jira-orchestrator v1.0
  Executable: Yes
  Location:   .git/hooks/prepare-commit-msg
  Size:       3.2 KB
  Modified:   2025-12-19 14:30:00
  Config:     JIRA_HOOK_DEBUG=false

Hook: commit-msg
  Status:     Installed
  Source:     jira-orchestrator v1.0
  Executable: Yes
  Location:   .git/hooks/commit-msg
  Size:       4.5 KB
  Modified:   2025-12-19 14:30:00
  Config:     JIRA_HOOK_DEBUG=false

Hook: post-commit
  Status:     Installed
  Source:     jira-orchestrator v1.0
  Executable: Yes
  Location:   .git/hooks/post-commit
  Size:       5.8 KB
  Modified:   2025-12-19 14:30:00
  Config:     JIRA_SYNC_MODE=async
              JIRA_HOOK_DEBUG=false
              JIRA_NOTIFY=true

Sync Queue: 3 pending tasks
  LF-27: Awaiting sync
  LF-28: Awaiting sync
  LF-29: Awaiting sync
```

### Test Hooks

Test hook functionality without making actual commits.

```bash
# Test all hooks
/jira-orchestrator:install-hooks test

# Test specific hook
/jira-orchestrator:install-hooks test --hook-type commit-msg
```

**Test Cases:**

**prepare-commit-msg:**
- Branch with issue key → Message prepended
- Branch without issue key → No changes
- Merge commit → Skipped
- Existing issue key → Not duplicated

**commit-msg:**
- Valid smart commit → Passes
- Invalid time format → Fails
- Invalid transition format → Fails
- Missing issue key with smart commands → Fails

**post-commit:**
- Smart commit detected → Queue created
- Commands parsed correctly → Verified
- Sync triggered (if sync mode) → Confirmed

**Output:**
```
Testing Git Hooks
=================

Test: prepare-commit-msg
  ✓ Branch with issue key (LF-27)
  ✓ Message prepended correctly
  ✓ Existing key not duplicated
  ✓ Merge commits skipped
  PASS (4/4 tests)

Test: commit-msg
  ✓ Valid smart commit accepted
  ✓ Invalid time format rejected
  ✓ Invalid transition format rejected
  ✓ Missing issue key rejected
  ✓ Unknown commands warned
  PASS (5/5 tests)

Test: post-commit
  ✓ Smart commands detected
  ✓ Commands parsed correctly
  ✓ Queue task created
  ✓ Sync triggered (mode: async)
  PASS (4/4 tests)

All tests passed!
```

### Status

Show comprehensive hook status and configuration.

```bash
# Show full status
/jira-orchestrator:install-hooks status
```

**Output:**
```
Jira Git Hooks Status Report
=============================

Repository: C:\Users\...\project
Branch:     feature/LF-27-add-oauth
Remote:     origin (git@github.com:org/repo.git)

Installed Hooks:
  ✓ prepare-commit-msg  (v1.0, 3.2 KB)
  ✓ commit-msg          (v1.0, 4.5 KB)
  ✓ post-commit         (v1.0, 5.8 KB)

Configuration:
  JIRA_SYNC_MODE=async
  JIRA_HOOK_DEBUG=false
  JIRA_NOTIFY=true
  CLAUDE_CLI=claude

Sync Queue: 3 pending tasks
  LF-27: Add OAuth support #time 2h
  LF-28: Fix login bug #transition "In Review"
  LF-29: Update docs #comment Documentation complete

Recent Smart Commits (Last 5):
  abc123 - LF-27: Add OAuth support #time 2h
  def456 - LF-27: Update tests #comment Added unit tests
  ghi789 - LF-28: Fix login #transition "In Review"

Health:
  ✓ All hooks executable
  ✓ Valid bash syntax
  ✓ Dependencies available (git, grep, jq)
  ✓ Queue file accessible
```

### Configure

Update hook configuration without reinstalling.

```bash
# Change sync mode
/jira-orchestrator:install-hooks configure --sync-mode sync

# Enable debug mode
/jira-orchestrator:install-hooks configure --debug true

# Disable notifications
/jira-orchestrator:install-hooks configure --notify false

# Configure multiple options
/jira-orchestrator:install-hooks configure --sync-mode manual --debug true
```

**Configuration Options:**

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| sync-mode | sync, async, manual | async | How to process smart commits |
| debug | true, false | false | Enable debug logging |
| notify | true, false | true | Show hook notifications |

**Sync Mode Details:**

- **sync**: Immediately sync to Jira after commit (requires Claude CLI)
- **async**: Queue for later sync (run `git jira-sync` manually)
- **manual**: Only queue, never auto-sync

## Hook Details

### prepare-commit-msg

**Purpose:** Auto-prepend Jira issue key from branch name.

**Branch Patterns:**
```
feature/LF-27-description  → LF-27
bugfix/PROJ-123-fix        → PROJ-123
hotfix/ABC-456             → ABC-456
```

**Behavior:**
```bash
# Branch: feature/LF-27-add-oauth
git commit -m "Add OAuth support"

# Hook prepends issue key:
# Result: "LF-27: Add OAuth support"
```

**Skips:**
- Merge commits
- Squash commits
- Cherry-pick commits
- Messages already containing issue key

### commit-msg

**Purpose:** Validate smart commit syntax before commit is created.

**Valid Smart Commits:**
```bash
# Comment only
git commit -m "LF-27: Fix bug #comment Fixed authentication flow"

# Time logging
git commit -m "LF-27: Add feature #time 2h 30m"

# Transition
git commit -m "LF-27: Complete work #transition \"In Review\""

# Multiple commands
git commit -m "LF-27: Update #time 1h #comment Done #transition \"Done\""
```

**Invalid Examples:**
```bash
# Missing issue key
git commit -m "Fix bug #time 2h"
# ERROR: Smart commit commands require issue key

# Invalid time format
git commit -m "LF-27: Fix #time 2 hours"
# ERROR: Invalid time format. Use: 2h, 30m, 1d 4h

# Unquoted transition
git commit -m "LF-27: Done #transition Done"
# ERROR: Transition status must be quoted

# Invalid time unit
git commit -m "LF-27: Work #time 2x"
# ERROR: Invalid time format (valid units: w, d, h, m)
```

**Time Format:**
```
Valid: 2h, 30m, 1d 4h, 2w 3d 4h 30m
Units: w=weeks, d=days, h=hours, m=minutes
```

**Warnings (non-fatal):**
- Unknown smart command
- Non-standard status name
- Very short comment
- Long first line (>72 chars)

### post-commit

**Purpose:** Process smart commands and trigger Jira sync.

**Smart Commands:**

```bash
# Add comment to issue
#comment <text>

# Log work time
#time <duration>

# Transition issue status
#transition "<status>"
```

**Queue File:**
```json
// .git/jira-sync-queue.json
[
  {
    "issue_key": "LF-27",
    "commit_sha": "abc123def456",
    "commit_message": "LF-27: Add OAuth #time 2h",
    "commit_author": "John Doe",
    "commit_email": "john@example.com",
    "commit_date": "2025-12-19 14:30:00",
    "commands": [
      "time:2h"
    ],
    "queued_at": "2025-12-19T14:30:00Z",
    "status": "pending"
  }
]
```

**Processing Queue:**
```bash
# Manual sync
git jira-sync

# Or via Claude CLI
claude /jira-orchestrator:sync --process-queue
```

## Installation Workflow

### Standard Installation

```bash
# 1. Install hooks with default settings
/jira-orchestrator:install-hooks install

# 2. Verify installation
/jira-orchestrator:install-hooks status

# 3. Test hooks
/jira-orchestrator:install-hooks test

# 4. Make first commit
git checkout -b feature/LF-27-add-oauth
git add .
git commit -m "Add OAuth support #time 2h"
# Hook prepends: "LF-27: Add OAuth support #time 2h"
```

### Custom Configuration

```bash
# Install with immediate sync
/jira-orchestrator:install-hooks install --sync-mode sync

# Install with debug logging
/jira-orchestrator:install-hooks install --debug true

# Install specific hooks only
/jira-orchestrator:install-hooks install --hook-type prepare-commit-msg
/jira-orchestrator:install-hooks install --hook-type commit-msg
```

### Team Installation

```bash
# Install for all team members via script
cat > .git/hooks/install-jira-hooks.sh << 'EOF'
#!/bin/bash
claude /jira-orchestrator:install-hooks install --force true
EOF

chmod +x .git/hooks/install-jira-hooks.sh

# Run on each developer machine
.git/hooks/install-jira-hooks.sh
```

## Troubleshooting

### Hook Not Running

**Symptoms:**
- Issue key not prepended
- Smart commits not validated
- No sync queue created

**Solutions:**
```bash
# Check hook is executable
ls -la .git/hooks/

# Make executable if needed
chmod +x .git/hooks/prepare-commit-msg
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/post-commit

# Test hook manually
.git/hooks/prepare-commit-msg .git/COMMIT_EDITMSG
```

### Validation Failing

**Symptoms:**
- Commits rejected with errors
- Smart commands not recognized

**Debug:**
```bash
# Enable debug mode
/jira-orchestrator:install-hooks configure --debug true

# Make test commit
git commit -m "LF-27: Test #time 2h"

# Review debug output
# [commit-msg] Message: LF-27: Test #time 2h
# [commit-msg] Smart commit commands detected
# ...
```

### Sync Not Triggering

**Symptoms:**
- Queue file created but sync doesn't run
- Smart commands not processed

**Check:**
```bash
# Verify sync mode
/jira-orchestrator:install-hooks status

# Check queue file
cat .git/jira-sync-queue.json

# Manually trigger sync
claude /jira-orchestrator:sync --process-queue

# Or change to sync mode
/jira-orchestrator:install-hooks configure --sync-mode sync
```

### Windows Git Bash Issues

**Symptoms:**
- Hooks fail with "bad interpreter"
- Line ending issues

**Solutions:**
```bash
# Convert line endings to Unix format
dos2unix .git/hooks/prepare-commit-msg
dos2unix .git/hooks/commit-msg
dos2unix .git/hooks/post-commit

# Or reinstall with proper line endings
/jira-orchestrator:install-hooks uninstall
/jira-orchestrator:install-hooks install
```

### jq Not Found

**Symptoms:**
- post-commit hook fails
- "jq: command not found" error

**Solutions:**
```bash
# Install jq
# Windows (Git Bash): Download from https://stedolan.github.io/jq/
# macOS: brew install jq
# Linux: apt-get install jq / yum install jq

# Verify installation
which jq
jq --version
```

## Advanced Usage

### Custom Hook Scripts

Extend hooks with custom logic:

```bash
# .git/hooks/post-commit.local
#!/bin/bash
# Custom post-commit actions

echo "Running custom post-commit logic..."
# Your custom logic here
```

Reference from main hook:
```bash
# In .git/hooks/post-commit
if [ -x .git/hooks/post-commit.local ]; then
  .git/hooks/post-commit.local
fi
```

### Hook Chaining

Run multiple hooks:

```bash
# .git/hooks/prepare-commit-msg
#!/bin/bash

# Run jira hook
.git/hooks/prepare-commit-msg.jira "$@"

# Run other hooks
.git/hooks/prepare-commit-msg.other "$@"
```

### Environment Configuration

Set environment variables:

```bash
# In .bashrc or .zshrc
export JIRA_SYNC_MODE=sync
export JIRA_HOOK_DEBUG=true
export JIRA_NOTIFY=false
export CLAUDE_CLI=/usr/local/bin/claude
```

### Per-Repository Configuration

```bash
# .git/config
[jira]
  syncMode = async
  hookDebug = false
  notify = true
```

Read in hooks:
```bash
SYNC_MODE=$(git config jira.syncMode || echo "async")
```

## Integration with Workflows

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/LF-27-add-oauth

# 2. Make changes
# ... edit files ...

# 3. Commit with smart commands
git commit -m "Add OAuth provider #time 3h"
# Hook: "LF-27: Add OAuth provider #time 3h"

# 4. Continue work
git commit -m "Add tests #time 1h #comment Added unit tests"

# 5. Complete feature
git commit -m "Update docs #time 30m #transition \"In Review\""

# 6. Process queue (if async mode)
git jira-sync
```

### CI/CD Integration

```bash
# In CI pipeline (.github/workflows/ci.yml)
- name: Process Jira Smart Commits
  run: |
    claude /jira-orchestrator:sync --process-queue --ci-mode true
```

### Pre-Push Sync

```bash
# .git/hooks/pre-push
#!/bin/bash

# Sync any pending smart commits before push
if [ -f .git/jira-sync-queue.json ]; then
  echo "Syncing pending Jira updates..."
  claude /jira-orchestrator:sync --process-queue
fi
```

## Related Commands

- `/jira-orchestrator:sync` - Process smart commit queue
- `/jira-orchestrator:work` - Full development workflow
- `/jira-orchestrator:commit` - Create smart commit
- `/jira-orchestrator:branch` - Create feature branch

## Examples

### Basic Installation

```bash
# Install all hooks with defaults
/jira-orchestrator:install-hooks install
```

### Custom Installation

```bash
# Install with immediate sync
/jira-orchestrator:install-hooks install --sync-mode sync --notify true
```

### Update Configuration

```bash
# Switch to async mode
/jira-orchestrator:install-hooks configure --sync-mode async

# Enable debugging
/jira-orchestrator:install-hooks configure --debug true
```

### Maintenance

```bash
# Check status
/jira-orchestrator:install-hooks status

# Test hooks
/jira-orchestrator:install-hooks test

# Uninstall
/jira-orchestrator:install-hooks uninstall
```

### Team Setup

```bash
# Install for team with consistent config
/jira-orchestrator:install-hooks install \
  --sync-mode async \
  --debug false \
  --notify true \
  --force true
```
