---
description: Uninstall a Claude Code plugin and clean up registry entries
argument-hint: <plugin-name> [--force] [--keep-config]
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Plugin Uninstall

Safely uninstall a Claude Code plugin and clean up all registry entries.

## Usage

```bash
# Uninstall a plugin
/plugin-uninstall <plugin-name>

# Force uninstall (ignore dependents)
/plugin-uninstall <plugin-name> --force

# Keep configuration files
/plugin-uninstall <plugin-name> --keep-config

# Dry run (show what would be removed)
/plugin-uninstall <plugin-name> --dry-run
```

## Uninstallation Process

The uninstaller follows these steps:

1. **Validate Plugin**: Check if plugin is installed
2. **Check Dependents**: Find plugins that depend on this one
3. **Prompt Confirmation**: Ask for confirmation (unless `--force`)
4. **Run Pre-Uninstall Hooks**: Execute cleanup scripts
5. **Unregister Commands**: Remove from command registry
6. **Unregister Agents**: Remove from agent registry
7. **Unregister Skills**: Remove from skill registry
8. **Unregister Hooks**: Remove from hook registry
9. **Remove Files**: Delete plugin directory
10. **Update Registry**: Clean up `plugins.index.json`
11. **Generate Report**: Show removal summary

## Dependency Checking

Before uninstalling, the system checks if other plugins depend on it:

```
⚠️  Warning: The following plugins depend on 'core-utils':

  • team-collaboration-suite (requires ^1.0.0)
  • cloud-infrastructure-manager (requires ^1.2.0)

Uninstalling 'core-utils' will break these plugins.

Options:
  1. Cancel uninstall
  2. Uninstall dependents first
  3. Force uninstall (--force)
```

Use `--force` to override this check.

## Options

| Option | Description |
|--------|-------------|
| `--force` | Ignore dependents and force uninstall |
| `--keep-config` | Keep configuration files (`.local.md`, `.config.json`) |
| `--dry-run` | Show what would be removed without actually removing |
| `--skip-hooks` | Skip pre-uninstall hooks |
| `--clean` | Remove all traces including cached data |

## What Gets Removed

### Plugin Files
- `.claude-plugins/<plugin-name>/` directory
- All commands, agents, skills, hooks within

### Registry Entries
- Commands from `.claude/registry/commands.index.json`
- Agents from `.claude/registry/agents.index.json`
- Skills from `.claude/registry/skills.index.json`
- Hooks registry updates
- Plugin metadata from `.claude/registry/plugins.index.json`

### Configuration (Optional)
- `.claude/<plugin-name>.local.md` (kept by default, use `--clean` to remove)
- `.claude/<plugin-name>.config.json` (kept by default)

### Cached Data
- MCP server caches (if `--clean` flag used)
- Obsidian vault plugin documentation (if `--clean` flag used)

## Pre-Uninstall Hooks

Plugins can define cleanup hooks in `plugin.json`:

```json
{
  "preUninstall": {
    "script": "scripts/cleanup.sh",
    "description": "Clean up plugin resources"
  }
}
```

These run before removal. Skip with `--skip-hooks`.

## Examples

### Basic Uninstall

```bash
# Uninstall a plugin
/plugin-uninstall lobbi-platform-manager

# Confirm when prompted
# > Are you sure? (y/N): y
```

### Force Uninstall

```bash
# Ignore dependent plugins
/plugin-uninstall core-utils --force

# Warning: This may break other plugins!
```

### Dry Run

```bash
# See what would be removed
/plugin-uninstall team-collaboration-suite --dry-run

# Output shows files/entries to be removed
# Nothing is actually deleted
```

### Keep Configuration

```bash
# Uninstall but preserve settings
/plugin-uninstall cloud-infrastructure-manager --keep-config

# Configuration files remain in .claude/
```

### Complete Removal

```bash
# Remove everything including config and cache
/plugin-uninstall lobbi-platform-manager --clean

# Removes all traces of the plugin
```

## Dependency Chain Uninstall

To uninstall a plugin with dependents:

```bash
# Option 1: Uninstall dependents first
/plugin-uninstall team-collaboration-suite
/plugin-uninstall core-utils

# Option 2: Force uninstall (may break things)
/plugin-uninstall core-utils --force

# Option 3: View dependency tree first
/plugin-list --tree
```

## Troubleshooting

### Cannot Uninstall (Dependents)

**Problem:** Uninstall blocked by dependent plugins

**Solutions:**
1. Check dependents: `/plugin-list --tree`
2. Uninstall dependents first
3. Update dependents to not require this plugin
4. Force uninstall: `/plugin-uninstall <name> --force`

### Files Not Removed

**Problem:** Plugin directory still exists after uninstall

**Solutions:**
1. Check permissions: `ls -la .claude-plugins/`
2. Manually remove: `rm -rf .claude-plugins/<plugin-name>`
3. Use `--clean` flag for thorough removal
4. Check if plugin is symlinked: `ls -l .claude-plugins/<plugin-name>`

### Registry Not Updated

**Problem:** Commands still appear after uninstall

**Solutions:**
1. Manually edit registry: `.claude/registry/commands.index.json`
2. Regenerate registry: `/registry-rebuild`
3. Restart Claude Code session
4. Check for multiple installations: `/plugin-list`

### Hook Failures

**Problem:** Pre-uninstall hooks fail and block uninstall

**Solutions:**
1. Check hook output for errors
2. Skip hooks: `/plugin-uninstall <name> --skip-hooks`
3. Manually run hook to debug: `./scripts/cleanup.sh`
4. Force uninstall to bypass: `--force`

## Configuration

Create `.claude/plugin-uninstall.config.json` to customize behavior:

```json
{
  "confirmUninstall": true,
  "keepConfigByDefault": true,
  "runHooks": true,
  "checkDependents": true,
  "backupBeforeUninstall": true,
  "backupDir": ".claude/backups/plugins"
}
```

## Backup Before Uninstall

Enable automatic backups:

```json
{
  "backupBeforeUninstall": true
}
```

Plugins are backed up to `.claude/backups/plugins/<plugin-name>-<timestamp>.tar.gz`.

Restore with:

```bash
/plugin-install .claude/backups/plugins/lobbi-platform-manager-20251212.tar.gz
```

## Safety Features

The uninstaller includes safety checks:

- ⚠️ Confirms before permanent deletion
- ⚠️ Checks for dependent plugins
- ⚠️ Validates plugin exists before proceeding
- ⚠️ Creates backup if configured
- ⚠️ Runs cleanup hooks to prevent orphaned resources
- ⚠️ Preserves configuration by default

## Agent Assignment

This command uses the **plugin-manager** agent for execution.

## See Also

- `/plugin-install` - Install a plugin
- `/plugin-list` - List installed plugins
- `/plugin-update` - Update plugins
- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)

---

**Uninstallation Report Format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Plugin Uninstallation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plugin: lobbi-platform-manager
Version: 1.0.0
Installed: .claude-plugins/lobbi-platform-manager

Pre-uninstall checks:
✓ No dependent plugins found
✓ Pre-uninstall hooks completed

Removed:
✓ 8 commands
✓ 4 agents
✓ 3 skills
✓ 3 hooks
✓ Plugin directory (.claude-plugins/lobbi-platform-manager)

Preserved:
• Configuration (.claude/lobbi-platform-manager.local.md)

Backup created:
.claude/backups/plugins/lobbi-platform-manager-20251212-203045.tar.gz

Uninstallation completed successfully! 🗑️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
