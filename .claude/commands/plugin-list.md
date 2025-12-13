---
description: List installed Claude Code plugins with versions and details
argument-hint: [--tree] [--outdated] [--format=table|json|tree]
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
---

# Plugin List

Display all installed Claude Code plugins with detailed information.

## Usage

```bash
# List all installed plugins
/plugin-list

# Show dependency tree
/plugin-list --tree

# Show outdated plugins
/plugin-list --outdated

# Custom output format
/plugin-list --format=json
/plugin-list --format=tree
/plugin-list --format=table
```

## Output Formats

### Table Format (Default)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Installed Plugins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name                        Version    Commands  Agents  Skills  Status
────────────────────────────────────────────────────────────────────────
lobbi-platform-manager      1.0.0      8         4       3       ✓
claude-frontend-toolkit     1.0.0      6         3       5       ✓
team-collaboration-suite    1.0.0      10        6       4       ⚠ 1.1.0
cloud-infrastructure-mgr    0.9.2      12        5       6       ✓

Total: 4 plugins installed
Updates available: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Tree Format

Shows dependency relationships:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Plugin Dependency Tree
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lobbi-platform-manager@1.0.0
├── (no dependencies)

claude-frontend-toolkit@1.0.0
├── core-utils@^1.0.0
└── shared-skills@~2.1.0

team-collaboration-suite@1.0.0
├── core-utils@^1.2.0
│   └── (already listed above)
├── jira-api-wrapper@^3.0.0
└── confluence-api-wrapper@^2.5.0

cloud-infrastructure-manager@0.9.2
├── core-utils@^1.1.0 (⚠ version conflict with team-collaboration-suite)
├── terraform-utils@^1.0.0
└── kubernetes-utils@^2.0.0
    └── kubectl-wrapper@^1.5.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### JSON Format

Machine-readable output:

```json
{
  "plugins": [
    {
      "name": "lobbi-platform-manager",
      "version": "1.0.0",
      "description": "Streamline development on the-lobbi/keycloak-alpha",
      "author": "Markus Ahling",
      "license": "MIT",
      "source": "local",
      "path": ".claude-plugins/lobbi-platform-manager",
      "installedAt": "2025-12-12T20:15:00Z",
      "provides": {
        "commands": 8,
        "agents": 4,
        "skills": 3,
        "hooks": 3
      },
      "dependencies": {},
      "status": "active",
      "updateAvailable": false
    }
  ],
  "stats": {
    "total": 4,
    "active": 4,
    "outdated": 1,
    "broken": 0
  }
}
```

## Options

| Option | Description |
|--------|-------------|
| `--tree` | Show dependency tree |
| `--outdated` | Only show plugins with updates available |
| `--format=<format>` | Output format: `table`, `json`, `tree` |
| `--verbose` | Show detailed information |
| `--broken` | Only show broken/inactive plugins |
| `--sort=<field>` | Sort by: `name`, `version`, `date`, `commands` |

## Plugin Status Indicators

| Icon | Status | Description |
|------|--------|-------------|
| ✓ | Active | Plugin is working correctly |
| ⚠ | Update Available | Newer version in registry |
| ⚠ | Version Conflict | Dependency version mismatch |
| ✗ | Broken | Plugin validation failed |
| 🔗 | Symlinked | Development mode (symlink) |
| 📦 | Installed | Standard installation |

## Examples

### List All Plugins

```bash
/plugin-list
```

Shows table with all installed plugins.

### Show Dependency Tree

```bash
/plugin-list --tree
```

Visualizes plugin dependencies and version conflicts.

### Check for Updates

```bash
/plugin-list --outdated
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Outdated Plugins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name                        Current    Latest     Update Command
────────────────────────────────────────────────────────────────────────
team-collaboration-suite    1.0.0      1.1.0      /plugin-update team-collaboration-suite

1 plugin with updates available
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Export to JSON

```bash
/plugin-list --format=json > plugins.json
```

Save plugin inventory to file for automation.

### Verbose Output

```bash
/plugin-list --verbose
```

Shows:
- Full descriptions
- Installation paths
- Installation dates
- Dependency details
- Command list
- Agent list
- Skill list
- Hook list

### Show Broken Plugins

```bash
/plugin-list --broken
```

Lists plugins with validation errors:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Broken Plugins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name                  Error
────────────────────────────────────────────────────────────────
old-plugin            Missing plugin.json
incomplete-plugin     Command handler not found: commands/test.md

2 broken plugins found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Sort Plugins

```bash
# By name (default)
/plugin-list --sort=name

# By installation date
/plugin-list --sort=date

# By number of commands
/plugin-list --sort=commands
```

## Detailed View

Use `--verbose` for comprehensive information:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Plugin: lobbi-platform-manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:        lobbi-platform-manager
Version:     1.0.0
Author:      Markus Ahling
License:     MIT
Description: Streamline development on the-lobbi/keycloak-alpha with
             Keycloak management, service orchestration, and test generation

Repository:  https://github.com/the-lobbi/keycloak-alpha
Path:        .claude-plugins/lobbi-platform-manager
Source:      local
Installed:   2025-12-12 20:15:00
Status:      ✓ Active

Categories:  devops, authentication, testing, platform
Keywords:    keycloak, multi-tenant, mern, microservices, docker, testing

Commands (8):
  • /lobbi:keycloak-setup
  • /lobbi:keycloak-user
  • /lobbi:keycloak-theme
  • /lobbi:health
  • /lobbi:env-validate
  • /lobbi:env-generate
  • /lobbi:test-gen
  • /lobbi:service

Agents (4):
  • keycloak-admin (sonnet)
  • service-orchestrator (sonnet)
  • test-generator (haiku)
  • env-manager (haiku)

Skills (3):
  • keycloak-admin
  • mern-patterns
  • multi-tenant

Hooks (3):
  • pre-commit-security (PreToolUse)
  • service-health-check (PostToolUse)
  • keycloak-validation (PostToolUse)

Dependencies: (none)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Filtering

Combine options for specific queries:

```bash
# Outdated plugins in tree view
/plugin-list --outdated --tree

# Verbose output for broken plugins
/plugin-list --broken --verbose

# JSON export of outdated plugins
/plugin-list --outdated --format=json
```

## Statistics Summary

At the bottom of each listing:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Plugins:        4
Active:               4
Broken:               0
Updates Available:    1

Total Commands:       36
Total Agents:         18
Total Skills:         18
Total Hooks:          10

Storage Used:         45.2 MB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Registry Integration

The command reads from:

- `.claude/registry/plugins.index.json` - Plugin metadata
- `.claude/registry/commands.index.json` - Command details
- `.claude/registry/agents.index.json` - Agent details
- `.claude/registry/skills.index.json` - Skill details

And checks registry for updates:
- Compares installed versions with registry versions
- Shows available updates

## Agent Assignment

This command uses the **plugin-manager** agent for execution.

## See Also

- `/plugin-install` - Install a plugin
- `/plugin-uninstall` - Uninstall a plugin
- `/plugin-update` - Update plugins
- `/plugin-search` - Search plugin registry
- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)

---

**Quick Reference:**

```bash
# Basic listing
/plugin-list

# Check for updates
/plugin-list --outdated

# View dependencies
/plugin-list --tree

# Export inventory
/plugin-list --format=json > plugins.json

# Find broken plugins
/plugin-list --broken --verbose

# Sort by installation date
/plugin-list --sort=date
```
