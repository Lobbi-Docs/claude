---
description: Install a Claude Code plugin from name, Git URL, or local path
argument-hint: <plugin-name|git-url|path> [--dev] [--force] [--no-deps]
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Plugin Install

Install a Claude Code plugin from multiple sources: registry name, Git repository, or local filesystem.

## Usage

```bash
# Install from registry
/plugin-install <plugin-name>

# Install from Git URL
/plugin-install <git-url>

# Install from local path
/plugin-install <local-path> [--dev]

# Force reinstall
/plugin-install <source> --force

# Skip dependency installation
/plugin-install <source> --no-deps
```

## Installation Sources

### 1. Registry Name

Install a plugin from the official Claude Code plugin registry:

```bash
/plugin-install claude-frontend-toolkit
/plugin-install team-collaboration-suite
/plugin-install cloud-infrastructure-manager
```

The registry is defined in `.claude/registry/plugins.index.json`.

### 2. Git Repository URL

Install directly from a Git repository:

```bash
# HTTPS
/plugin-install https://github.com/user/my-claude-plugin

# Git SSH
/plugin-install git@github.com:user/my-claude-plugin.git

# With branch/tag
/plugin-install https://github.com/user/my-claude-plugin#develop
/plugin-install https://github.com/user/my-claude-plugin#v1.2.0
```

Plugins are cloned to `.claude-plugins/{plugin-name}/`.

### 3. Local Path

Install from a local directory (useful for development):

```bash
# Copy mode (default)
/plugin-install ./my-plugin

# Development mode (symlink)
/plugin-install ./my-plugin --dev
```

Development mode creates a symlink, so changes to the source directory are immediately reflected.

## Options

| Option | Description |
|--------|-------------|
| `--dev` | Install in development mode (symlink instead of copy) |
| `--force` | Force reinstall even if already installed |
| `--no-deps` | Skip dependency installation |
| `--skip-hooks` | Skip post-install hooks |
| `--skip-validation` | Skip plugin validation (not recommended) |

## Installation Process

The installation process follows these steps:

1. **Parse Source**: Determine if source is registry name, Git URL, or local path
2. **Validate Plugin**: Check plugin structure and manifest (`plugin.json`)
3. **Check Dependencies**: Resolve and validate dependencies
4. **Install Dependencies**: Install required dependencies (unless `--no-deps`)
5. **Copy/Clone/Link**: Move plugin to `.claude-plugins/`
6. **Register Plugin**: Update registry indexes
7. **Run Post-Install Hooks**: Execute any post-install scripts
8. **Generate Report**: Show installation summary

## Plugin Validation

The installer validates:

- ✅ `plugin.json` exists and is valid JSON
- ✅ Required fields: `name`, `version`, `description`
- ✅ Valid semantic version format
- ✅ Command handlers exist
- ✅ Agent files exist
- ✅ Skill files exist
- ✅ Hook scripts are executable
- ✅ No conflicting commands with other plugins
- ✅ Dependencies are available

## Dependency Resolution

If a plugin declares dependencies:

```json
{
  "dependencies": {
    "core-utils": "^1.0.0",
    "shared-skills": "~2.1.0"
  }
}
```

The installer will:

1. Check if dependencies are already installed
2. Verify version compatibility
3. Install missing dependencies
4. Detect circular dependencies
5. Create a dependency graph

Use `--no-deps` to skip this process.

## Registry Integration

After installation, the plugin is registered in:

- `.claude/registry/plugins.index.json` - Plugin metadata
- `.claude/registry/commands.index.json` - New commands
- `.claude/registry/agents.index.json` - New agents
- `.claude/registry/skills.index.json` - New skills
- `.claude/registry/workflows.index.json` - New workflows (if any)

## Examples

### Install from Registry

```bash
# Standard install
/plugin-install lobbi-platform-manager

# Force reinstall
/plugin-install lobbi-platform-manager --force

# Install without dependencies
/plugin-install cloud-infrastructure-manager --no-deps
```

### Install from Git

```bash
# Install from GitHub
/plugin-install https://github.com/the-lobbi/keycloak-alpha

# Install specific version
/plugin-install https://github.com/user/plugin#v1.0.0

# Install from private repo (requires SSH key)
/plugin-install git@github.com:company/private-plugin.git
```

### Install from Local Path

```bash
# Development mode (symlink)
/plugin-install ../my-plugin --dev

# Production mode (copy)
/plugin-install /path/to/plugin

# Update local plugin
/plugin-install ./lobbi-platform-manager --force --dev
```

## Post-Install Hooks

Plugins can define post-install hooks in `plugin.json`:

```json
{
  "postInstall": {
    "script": "scripts/setup.sh",
    "description": "Initialize plugin configuration"
  }
}
```

These run automatically after installation. Skip with `--skip-hooks`.

## Troubleshooting

### Installation Failed

**Problem:** Installation fails with validation errors

**Solutions:**
1. Check `plugin.json` is valid: `cat plugin.json | jq`
2. Verify all handlers exist: `ls -la commands/ agents/ skills/`
3. Use `--skip-validation` to bypass checks (not recommended)
4. Check error message for specific missing files

### Dependency Conflicts

**Problem:** Cannot install due to dependency version conflicts

**Solutions:**
1. Update conflicting plugins: `/plugin-update <plugin-name>`
2. Install without dependencies: `/plugin-install <source> --no-deps`
3. Check dependency tree: `/plugin-list --tree`
4. Manually resolve conflicts in `plugin.json`

### Git Clone Failures

**Problem:** Cannot clone Git repository

**Solutions:**
1. Verify URL is correct: `git ls-remote <url>`
2. Check network connectivity
3. For private repos, ensure SSH key is configured
4. Try HTTPS instead of SSH (or vice versa)

### Symlink Issues (Windows)

**Problem:** `--dev` mode fails on Windows

**Solutions:**
1. Run terminal as Administrator
2. Enable Developer Mode in Windows Settings
3. Use copy mode instead: remove `--dev` flag
4. Use WSL for development

### Permission Errors

**Problem:** Cannot write to `.claude-plugins/`

**Solutions:**
1. Check directory permissions: `ls -la .claude-plugins`
2. Create directory: `mkdir -p .claude-plugins`
3. Fix ownership: `chown -R $USER .claude-plugins`

## Configuration

Create `.claude/plugin-install.config.json` to customize installation:

```json
{
  "defaultSource": "registry",
  "pluginsDir": ".claude-plugins",
  "registryUrl": "https://registry.claude-code.com/plugins",
  "autoInstallDeps": true,
  "runHooks": true,
  "validatePlugins": true,
  "gitCloneOptions": "--depth=1"
}
```

## Security

The installer performs security checks:

- ⚠️ Warns if plugin requests dangerous permissions
- ⚠️ Alerts on untrusted sources (non-registry)
- ⚠️ Validates hook scripts before execution
- ⚠️ Checks for known malicious patterns
- ⚠️ Scans for hardcoded secrets in plugin files

Review warnings before proceeding.

## Agent Assignment

This command uses the **plugin-manager** agent for execution.

## See Also

- `/plugin-uninstall` - Uninstall a plugin
- `/plugin-list` - List installed plugins
- `/plugin-update` - Update plugins
- `/plugin-search` - Search registry
- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)

---

**Installation Report Format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Plugin Installation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plugin: lobbi-platform-manager
Version: 1.0.0
Source: registry
Installed: .claude-plugins/lobbi-platform-manager

✓ Validation passed
✓ Dependencies installed (0 required)
✓ Registered 8 commands
✓ Registered 4 agents
✓ Registered 3 skills
✓ Registered 3 hooks
✓ Post-install hooks completed

Commands available:
  /lobbi:keycloak-setup
  /lobbi:keycloak-user
  /lobbi:keycloak-theme
  /lobbi:health
  /lobbi:env-validate
  /lobbi:env-generate
  /lobbi:test-gen
  /lobbi:service

Installation completed successfully! 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
