---
description: Update Claude Code plugins to latest versions
argument-hint: [plugin-name|--all] [--major] [--dry-run]
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Plugin Update

Update installed Claude Code plugins to their latest versions.

## Usage

```bash
# Update a specific plugin
/plugin-update <plugin-name>

# Update all plugins
/plugin-update --all

# Dry run (show what would be updated)
/plugin-update --all --dry-run

# Allow major version updates
/plugin-update <plugin-name> --major
```

## Update Strategies

### Semantic Versioning

Updates respect semantic versioning constraints:

| Current | Constraint | Updates To | Reason |
|---------|-----------|------------|--------|
| 1.2.3 | patch | 1.2.4 | Bug fixes only |
| 1.2.3 | minor | 1.3.0 | New features, backwards compatible |
| 1.2.3 | major | 2.0.0 | Breaking changes (requires `--major`) |

### Default Behavior

- ✅ Patch updates: Automatic
- ✅ Minor updates: Automatic
- ⚠️ Major updates: Requires `--major` flag

### Version Constraints

If a plugin specifies version constraints in dependencies:

```json
{
  "dependencies": {
    "core-utils": "^1.0.0",     // Allows 1.x.x (minor + patch)
    "shared-skills": "~2.1.0"   // Allows 2.1.x (patch only)
  }
}
```

Updates respect these constraints and check compatibility.

## Options

| Option | Description |
|--------|-------------|
| `--all` | Update all installed plugins |
| `--major` | Allow major version updates (breaking changes) |
| `--dry-run` | Show what would be updated without updating |
| `--force` | Force update even if validation fails |
| `--no-deps` | Don't update dependencies |
| `--skip-hooks` | Skip pre/post-update hooks |
| `--lockfile` | Generate/update plugin lockfile |

## Update Process

1. **Check Current Version**: Read installed plugin version
2. **Query Registry**: Find latest available version
3. **Check Compatibility**: Verify semver constraints
4. **Check Dependencies**: Ensure dependency compatibility
5. **Run Pre-Update Hooks**: Execute plugin's pre-update script
6. **Backup Current Version**: Create backup (optional)
7. **Download/Clone New Version**: Fetch updated plugin
8. **Validate New Version**: Check plugin structure
9. **Update Registry**: Update plugin metadata
10. **Run Post-Update Hooks**: Execute plugin's post-update script
11. **Run Tests**: Validate plugin works (if configured)
12. **Generate Report**: Show update summary

## Examples

### Update Single Plugin

```bash
/plugin-update lobbi-platform-manager
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Updating lobbi-platform-manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current version: 1.0.0
Latest version:  1.1.2

Changes:
  • Fixed health check timeout issue
  • Added support for Keycloak 24.x
  • Improved test generation templates

✓ Backup created
✓ Downloaded v1.1.2
✓ Validation passed
✓ Registry updated

Updated successfully! 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Update All Plugins

```bash
/plugin-update --all
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Updating All Plugins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking for updates...

lobbi-platform-manager       1.0.0 → 1.1.2   ✓ Updated
claude-frontend-toolkit      1.0.0 → 1.0.1   ✓ Updated
team-collaboration-suite     1.0.0 → 1.1.0   ✓ Updated
cloud-infrastructure-mgr     0.9.2 → 0.9.3   ✓ Updated

4 plugins updated successfully! 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Dry Run

```bash
/plugin-update --all --dry-run
```

Shows what would be updated without actually updating:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Update Preview (Dry Run)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following updates would be performed:

lobbi-platform-manager       1.0.0 → 1.1.2   (minor update)
team-collaboration-suite     1.0.0 → 1.1.0   (minor update)

2 plugins would be updated
2 plugins are already up-to-date

Run without --dry-run to apply these updates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Major Version Update

```bash
/plugin-update team-collaboration-suite --major
```

Prompts for confirmation:
```
⚠️  Warning: Major version update (1.1.0 → 2.0.0)

Breaking changes:
  • /jira:create command signature changed
  • Removed deprecated /confluence:legacy commands
  • New required dependency: atlassian-core@2.0.0

This may break existing workflows.

Continue? (y/N):
```

### Update with Dependencies

```bash
/plugin-update cloud-infrastructure-manager
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Updating cloud-infrastructure-manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking dependencies...

Dependencies to update:
  • terraform-utils: 1.0.0 → 1.1.0
  • kubernetes-utils: 2.0.0 → 2.1.0

✓ cloud-infrastructure-manager updated
✓ terraform-utils updated
✓ kubernetes-utils updated

3 packages updated successfully! 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Lockfile Management

Generate a lockfile to ensure reproducible installations:

```bash
# Generate lockfile during update
/plugin-update --all --lockfile
```

Creates `.claude/plugin-lock.json`:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-12-12T20:30:00Z",
  "plugins": {
    "lobbi-platform-manager": {
      "version": "1.1.2",
      "resolved": "https://github.com/the-lobbi/keycloak-alpha#v1.1.2",
      "integrity": "sha512-abc123...",
      "dependencies": {}
    },
    "team-collaboration-suite": {
      "version": "1.1.0",
      "resolved": "registry:team-collaboration-suite@1.1.0",
      "integrity": "sha512-def456...",
      "dependencies": {
        "core-utils": "1.2.0",
        "jira-api-wrapper": "3.1.0"
      }
    }
  }
}
```

Install from lockfile:

```bash
/plugin-install --lockfile .claude/plugin-lock.json
```

## Rollback

If an update breaks something, rollback to previous version:

```bash
# Automatic rollback (if update fails)
# Update system keeps backup in .claude/backups/plugins/

# Manual rollback
/plugin-uninstall team-collaboration-suite
/plugin-install .claude/backups/plugins/team-collaboration-suite-1.0.0.tar.gz
```

Or use version pinning:

```bash
/plugin-install team-collaboration-suite@1.0.0 --force
```

## Pre/Post-Update Hooks

Plugins can define update hooks in `plugin.json`:

```json
{
  "preUpdate": {
    "script": "scripts/migrate-config.sh",
    "description": "Migrate configuration to new format"
  },
  "postUpdate": {
    "script": "scripts/verify-setup.sh",
    "description": "Verify plugin is working correctly"
  }
}
```

Skip with `--skip-hooks`.

## Troubleshooting

### Update Failed

**Problem:** Update fails with validation errors

**Solutions:**
1. Check error message for specific issue
2. Try dry run first: `/plugin-update <name> --dry-run`
3. Force update: `/plugin-update <name> --force`
4. Manually download and install: `/plugin-install <git-url>`
5. Check plugin repository for known issues

### Dependency Conflicts

**Problem:** Update blocked by dependency version conflicts

**Solutions:**
1. Update dependencies first: `/plugin-update --all`
2. Check dependency tree: `/plugin-list --tree`
3. Update without deps: `/plugin-update <name> --no-deps`
4. Manually resolve in `plugin.json`

### Broken After Update

**Problem:** Plugin doesn't work after update

**Solutions:**
1. Check changelog for breaking changes
2. Review pre-update warnings
3. Rollback to previous version (see Rollback section)
4. Report issue to plugin repository
5. Check plugin documentation for migration guide

### Network Issues

**Problem:** Cannot download updates

**Solutions:**
1. Check network connectivity
2. Verify registry URL is accessible
3. Use local cache if available
4. Download manually and install from file
5. Check proxy/firewall settings

## Configuration

Create `.claude/plugin-update.config.json`:

```json
{
  "autoUpdate": false,
  "updateCheckInterval": "daily",
  "allowMajorUpdates": false,
  "backupBeforeUpdate": true,
  "runHooks": true,
  "validateAfterUpdate": true,
  "notifyOnUpdates": true,
  "registryUrl": "https://registry.claude-code.com/plugins"
}
```

## Auto-Update

Enable automatic updates:

```json
{
  "autoUpdate": true,
  "updateCheckInterval": "daily",
  "autoUpdateExclude": [
    "custom-plugin",
    "development-plugin"
  ]
}
```

Automatic updates run:
- When starting Claude Code (if interval elapsed)
- Via scheduled task (if configured)
- Manually: `/plugin-check-updates`

## Change Detection

Updates show what changed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Changelog: lobbi-platform-manager 1.1.2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New Features:
  • Added Keycloak 24.x support
  • New command: /lobbi:realm-export

Bug Fixes:
  • Fixed health check timeout issue (#45)
  • Improved error messages (#47)

Improvements:
  • Faster service discovery
  • Better test generation templates

Breaking Changes: None
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Agent Assignment

This command uses the **plugin-manager** agent for execution.

## See Also

- `/plugin-install` - Install a plugin
- `/plugin-uninstall` - Uninstall a plugin
- `/plugin-list` - List installed plugins
- `/plugin-check-updates` - Check for updates without installing
- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)

---

**Quick Reference:**

```bash
# Update single plugin
/plugin-update lobbi-platform-manager

# Update all plugins
/plugin-update --all

# Preview updates
/plugin-update --all --dry-run

# Allow major updates
/plugin-update <name> --major

# Generate lockfile
/plugin-update --all --lockfile
```
