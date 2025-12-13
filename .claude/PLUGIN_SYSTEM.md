# Claude Code Plugin System

Complete plugin management system for Claude Code with installation, validation, dependency resolution, and lifecycle management.

## Overview

The plugin system provides a comprehensive framework for extending Claude Code with custom commands, agents, skills, and hooks through a modular plugin architecture.

### Key Features

- **Plugin Installation** - Install from registry, Git, or local path
- **Dependency Resolution** - Automatic dependency management with semver
- **Plugin Validation** - Comprehensive validation and security checks
- **Version Management** - Update plugins with semver constraints
- **Registry System** - Central registry for plugin discovery
- **Development Mode** - Symlink plugins for local development

## Quick Start

### Install a Plugin

```bash
# From registry
/plugin-install lobbi-platform-manager

# From Git repository
/plugin-install https://github.com/the-lobbi/keycloak-alpha

# From local path (development mode)
/plugin-install ./my-plugin --dev
```

### List Installed Plugins

```bash
# Basic list
/plugin-list

# Show dependency tree
/plugin-list --tree

# Check for updates
/plugin-list --outdated
```

### Update Plugins

```bash
# Update specific plugin
/plugin-update lobbi-platform-manager

# Update all plugins
/plugin-update --all

# Preview updates
/plugin-update --all --dry-run
```

### Uninstall a Plugin

```bash
# Standard uninstall
/plugin-uninstall lobbi-platform-manager

# Keep configuration
/plugin-uninstall lobbi-platform-manager --keep-config

# Force uninstall
/plugin-uninstall lobbi-platform-manager --force
```

## File Structure

```
.claude/
├── commands/
│   ├── plugin-install.md          # Install command
│   ├── plugin-uninstall.md        # Uninstall command
│   ├── plugin-list.md             # List command
│   └── plugin-update.md           # Update command
├── registry/
│   ├── plugins.index.json         # Plugin registry
│   └── commands.index.json        # Updated with plugin commands
└── tools/
    └── plugin-manager/
        ├── index.ts               # Core plugin manager
        ├── validator.ts           # Plugin validation
        ├── dependency-resolver.ts # Dependency resolution
        └── README.md              # Tool documentation

.claude-plugins/                    # Installed plugins directory
├── lobbi-platform-manager/
├── team-collaboration-suite/
└── cloud-infrastructure-manager/
```

## Plugin Structure

### Required Files

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json               # Plugin manifest (REQUIRED)
├── commands/                     # Slash commands
│   ├── my-command.md
│   └── another-command.md
├── agents/                       # Autonomous agents
│   ├── my-agent.md
│   └── specialist-agent.md
├── skills/                       # Domain knowledge
│   ├── skill-1/
│   │   └── SKILL.md
│   └── skill-2/
│       └── SKILL.md
├── hooks/                        # Lifecycle hooks
│   └── scripts/
│       ├── pre-install.sh
│       └── post-install.sh
└── README.md                     # Documentation
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome Claude Code plugin",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "categories": ["category1", "category2"],
  "repository": {
    "type": "git",
    "url": "https://github.com/user/my-plugin"
  },
  "commands": {
    "/my-command": {
      "description": "My custom command",
      "handler": "commands/my-command.md",
      "argumentHint": "[options]",
      "allowedTools": ["Bash", "Read", "Write"]
    }
  },
  "agents": {
    "my-agent": {
      "description": "Specialized agent for X",
      "model": "sonnet",
      "handler": "agents/my-agent.md",
      "keywords": ["keyword1", "keyword2"],
      "capabilities": ["capability1", "capability2"]
    }
  },
  "skills": {
    "my-skill": {
      "description": "Domain knowledge for X",
      "handler": "skills/my-skill/SKILL.md"
    }
  },
  "hooks": {
    "security-check": {
      "description": "Security validation",
      "event": "PreToolUse",
      "toolPattern": "(Write|Edit)",
      "filePattern": "\\.(env|json)$",
      "handler": "hooks/scripts/security-check.sh"
    }
  },
  "dependencies": {
    "core-utils": "^1.0.0",
    "shared-skills": "~2.1.0"
  },
  "configuration": {
    "localConfig": ".claude/my-plugin.local.md",
    "requiredEnvVars": ["MY_API_KEY"],
    "optionalEnvVars": ["MY_OPTION"]
  },
  "postInstall": {
    "script": "hooks/scripts/setup.sh",
    "description": "Initialize plugin"
  }
}
```

## Commands

### /plugin-install

Install a Claude Code plugin from multiple sources.

**Usage:**
```bash
/plugin-install <plugin-name|git-url|path> [options]
```

**Options:**
- `--dev` - Development mode (symlink)
- `--force` - Force reinstall
- `--no-deps` - Skip dependencies
- `--skip-hooks` - Skip post-install hooks
- `--skip-validation` - Skip validation (not recommended)

**Examples:**
```bash
# Registry install
/plugin-install lobbi-platform-manager

# Git install
/plugin-install https://github.com/user/plugin

# Local install (dev mode)
/plugin-install ./my-plugin --dev

# Force reinstall
/plugin-install lobbi-platform-manager --force
```

**Installation Process:**
1. Parse source (registry/git/local)
2. Validate plugin structure
3. Check dependencies
4. Install dependencies
5. Copy/clone/symlink plugin
6. Register in indexes
7. Run post-install hooks
8. Generate report

---

### /plugin-uninstall

Uninstall a Claude Code plugin and clean up.

**Usage:**
```bash
/plugin-uninstall <plugin-name> [options]
```

**Options:**
- `--force` - Ignore dependents
- `--keep-config` - Keep configuration files
- `--dry-run` - Show what would be removed
- `--skip-hooks` - Skip pre-uninstall hooks
- `--clean` - Remove all traces including cache

**Examples:**
```bash
# Standard uninstall
/plugin-uninstall team-collaboration-suite

# Keep config
/plugin-uninstall cloud-infrastructure-manager --keep-config

# Force uninstall
/plugin-uninstall core-utils --force

# Dry run
/plugin-uninstall lobbi-platform-manager --dry-run
```

**Uninstallation Process:**
1. Validate plugin is installed
2. Check for dependents
3. Prompt confirmation
4. Run pre-uninstall hooks
5. Unregister from indexes
6. Remove plugin directory
7. Clean up configuration (optional)
8. Generate report

---

### /plugin-list

List installed plugins with details.

**Usage:**
```bash
/plugin-list [options]
```

**Options:**
- `--tree` - Show dependency tree
- `--outdated` - Only show plugins with updates
- `--format=<format>` - Output format (table, json, tree)
- `--verbose` - Show detailed information
- `--broken` - Only show broken plugins
- `--sort=<field>` - Sort by (name, version, date, commands)

**Examples:**
```bash
# List all
/plugin-list

# Dependency tree
/plugin-list --tree

# Check updates
/plugin-list --outdated

# JSON export
/plugin-list --format=json > plugins.json

# Verbose details
/plugin-list --verbose
```

**Output Formats:**
- **table** - Default tabular view
- **json** - Machine-readable JSON
- **tree** - Dependency tree visualization

---

### /plugin-update

Update plugins to latest versions.

**Usage:**
```bash
/plugin-update [plugin-name|--all] [options]
```

**Options:**
- `--all` - Update all plugins
- `--major` - Allow major version updates
- `--dry-run` - Preview updates
- `--force` - Force update
- `--no-deps` - Don't update dependencies
- `--skip-hooks` - Skip pre/post-update hooks
- `--lockfile` - Generate lockfile

**Examples:**
```bash
# Update one
/plugin-update lobbi-platform-manager

# Update all
/plugin-update --all

# Preview
/plugin-update --all --dry-run

# Allow major updates
/plugin-update team-collaboration-suite --major

# Generate lockfile
/plugin-update --all --lockfile
```

**Update Process:**
1. Check current version
2. Query registry for latest
3. Check compatibility
4. Validate dependencies
5. Run pre-update hooks
6. Backup current version
7. Download/clone new version
8. Validate new version
9. Update registries
10. Run post-update hooks
11. Generate report

## Plugin Registry

### Registry Structure

The plugin registry (`plugins.index.json`) tracks:

- **Installed plugins** - Currently installed with metadata
- **Registry plugins** - Available in registry
- **Statistics** - Totals and last updated

Example:
```json
{
  "version": "1.0.0",
  "installed": {
    "lobbi-platform-manager": {
      "version": "1.0.0",
      "path": "../lobbi-platform-manager",
      "source": "local",
      "installedAt": "2025-12-12T20:15:00Z",
      "dependencies": {}
    }
  },
  "registry": {
    "lobbi-platform-manager": {
      "name": "lobbi-platform-manager",
      "version": "1.0.0",
      "description": "Platform manager for Lobbi",
      "repository": "https://github.com/the-lobbi/keycloak-alpha",
      "keywords": ["keycloak", "multi-tenant"],
      "provides": {
        "commands": 8,
        "agents": 4,
        "skills": 3,
        "hooks": 3
      }
    }
  }
}
```

### Adding to Registry

To make your plugin discoverable:

1. Create plugin with valid `plugin.json`
2. Publish to Git repository
3. Submit PR to registry with plugin metadata
4. Once merged, users can install with `/plugin-install <name>`

## Validation

The validator checks:

### Manifest Validation
- ✅ `plugin.json` exists and is valid JSON
- ✅ Required fields: name, version, description
- ✅ Valid semantic version format
- ✅ Valid plugin name (lowercase, alphanumeric, hyphens)

### Structure Validation
- ✅ Expected directories exist
- ✅ Handler files exist
- ✅ Correct file permissions

### Resource Validation
- ✅ Command handlers exist
- ✅ Agent handlers exist
- ✅ Skill handlers exist
- ✅ Hook scripts exist and are executable
- ✅ Valid model types (opus, sonnet, haiku)
- ✅ Valid event types

### Security Validation
- ⚠️ No hardcoded secrets
- ⚠️ No dangerous shell commands
- ⚠️ No suspicious patterns

### Validation Errors

| Code | Description |
|------|-------------|
| `PLUGIN_NOT_FOUND` | Plugin directory not found |
| `MANIFEST_NOT_FOUND` | plugin.json missing |
| `MANIFEST_INVALID_JSON` | Invalid JSON |
| `MANIFEST_MISSING_FIELD` | Required field missing |
| `MANIFEST_INVALID_VERSION` | Invalid semver |
| `RESOURCE_HANDLER_NOT_FOUND` | Handler file missing |
| `SECURITY_HARDCODED_SECRET` | Possible secret found |

## Dependency Resolution

### Version Constraints

| Constraint | Meaning | Example |
|------------|---------|---------|
| `1.2.3` | Exact version | Only 1.2.3 |
| `^1.2.3` | Caret (minor) | 1.x.x (≥1.2.3, <2.0.0) |
| `~1.2.3` | Tilde (patch) | 1.2.x (≥1.2.3, <1.3.0) |
| `*` | Any version | Latest available |

### Dependency Graph

The resolver:
- ✅ Builds dependency graph
- ✅ Detects circular dependencies
- ✅ Checks version conflicts
- ✅ Topological sort for install order
- ✅ Transitive dependency resolution

### Example

```json
{
  "dependencies": {
    "core-utils": "^1.0.0",
    "shared-skills": "~2.1.0",
    "helper-functions": "*"
  }
}
```

## Plugin Development

### Creating a Plugin

1. **Initialize structure:**
```bash
mkdir my-plugin
cd my-plugin
mkdir -p .claude-plugin commands agents skills hooks/scripts
```

2. **Create manifest:**
```bash
cat > .claude-plugin/plugin.json <<EOF
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My plugin description",
  "commands": {},
  "agents": {},
  "skills": {}
}
EOF
```

3. **Add commands:**
```bash
cat > commands/my-command.md <<EOF
---
description: My custom command
---

# My Command

Implementation details...
EOF
```

4. **Test locally:**
```bash
/plugin-install ./my-plugin --dev
/my-command
```

5. **Publish:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/user/my-plugin
git push -u origin main
```

### Best Practices

- ✅ Use semantic versioning
- ✅ Document all commands and agents
- ✅ Add examples to README
- ✅ Validate before publishing
- ✅ Test with dependencies
- ✅ Add security hooks
- ✅ Keep dependencies minimal
- ✅ Use clear, descriptive names

## Utilities

### PluginManager

Core plugin management API:

```typescript
import PluginManager from '.claude/tools/plugin-manager';

const manager = new PluginManager();

// Get installed plugins
const plugins = manager.getInstalledPlugins();

// Check if installed
if (manager.isPluginInstalled('my-plugin')) {
  console.log('Plugin is installed');
}

// Register plugin
manager.registerPlugin('/path/to/plugin', 'local');

// Get statistics
const stats = manager.getStats();
```

### PluginValidator

Validate plugin structure:

```typescript
import PluginValidator from '.claude/tools/plugin-manager/validator';

const validator = new PluginValidator({
  strictMode: true,
  checkSecurity: true,
});

const result = validator.validatePlugin('/path/to/plugin');

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### DependencyResolver

Resolve dependencies:

```typescript
import DependencyResolver from '.claude/tools/plugin-manager/dependency-resolver';

const resolver = new DependencyResolver(installed, registry);

const result = resolver.resolveDependencies('my-plugin', {
  'core-utils': '^1.0.0',
});

if (result.success) {
  console.log('Install order:', result.installOrder);
}
```

## Troubleshooting

### Common Issues

**Installation Fails**
- Check manifest is valid JSON
- Verify all handlers exist
- Check network for Git clones
- Review error messages

**Dependency Conflicts**
- Use `/plugin-list --tree` to visualize
- Update conflicting plugins
- Use `--no-deps` to skip dependencies

**Validation Errors**
- Run validation manually
- Fix missing files
- Update manifest format
- Check semver version

**Permission Errors**
- Check directory permissions
- On Windows, enable Developer Mode
- Run as Administrator if needed

### Debug Commands

```bash
# Validate plugin
/plugin-list --broken --verbose

# Check dependencies
/plugin-list --tree

# Preview updates
/plugin-update --all --dry-run

# Test install
/plugin-install ./my-plugin --dev --skip-validation
```

## Examples

### Example 1: Install and Configure

```bash
# Install plugin
/plugin-install lobbi-platform-manager

# Configure (create .claude/lobbi-platform-manager.local.md)
# Edit configuration as needed

# Test commands
/lobbi:health
/lobbi:env-validate
```

### Example 2: Development Workflow

```bash
# Clone plugin repo
git clone https://github.com/user/my-plugin
cd my-plugin

# Install in dev mode
/plugin-install . --dev

# Make changes to commands/my-command.md
# Test immediately (symlinked)
/my-command

# Commit changes
git add .
git commit -m "Update my-command"
git push

# Update version in plugin.json
# Tag release
git tag v1.1.0
git push --tags
```

### Example 3: Publishing a Plugin

```bash
# 1. Create plugin structure
mkdir my-awesome-plugin
cd my-awesome-plugin

# 2. Add files
mkdir -p .claude-plugin commands agents
# ... create plugin.json, commands, etc.

# 3. Test locally
/plugin-install . --dev
/my-command  # test it works

# 4. Validate
/plugin-list --broken --verbose

# 5. Publish to Git
git init
git add .
git commit -m "Initial release"
git tag v1.0.0
git push origin main --tags

# 6. Submit to registry
# Create PR to add to plugins.index.json
```

## See Also

- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)
- [Command Development](../commands/README.md)
- [Agent Development](../agents/README.md)
- [Lobbi Platform Manager](../../lobbi-platform-manager/README.md) - Example plugin

---

**Plugin System Version:** 1.0.0
**Last Updated:** 2025-12-12
