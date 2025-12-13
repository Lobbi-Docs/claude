# Plugin Manager Utilities

TypeScript utilities for managing Claude Code plugins including installation, validation, and dependency resolution.

## Modules

### PluginManager (`index.ts`)

Core plugin management functionality.

**Key Features:**
- Get installed plugins
- Register/unregister plugins
- Update plugin registries
- Check for updates
- Search available plugins

**Usage:**

```typescript
import PluginManager from './index';

const manager = new PluginManager();

// Get all installed plugins
const plugins = manager.getInstalledPlugins();

// Get specific plugin info
const plugin = manager.getPluginInfo('lobbi-platform-manager');

// Check if plugin is installed
if (manager.isPluginInstalled('team-collaboration-suite')) {
  console.log('Plugin is installed');
}

// Register a new plugin
manager.registerPlugin('/path/to/plugin', 'local');

// Unregister a plugin
manager.unregisterPlugin('plugin-name');

// Get statistics
const stats = manager.getStats();
console.log(`Total installed: ${stats.totalInstalled}`);
console.log(`Total commands: ${stats.totalCommands}`);
```

**API Reference:**

| Method | Description | Returns |
|--------|-------------|---------|
| `getInstalledPlugins()` | Get all installed plugins | `PluginInfo[]` |
| `getPluginInfo(name)` | Get specific plugin | `PluginInfo \| null` |
| `isPluginInstalled(name)` | Check if installed | `boolean` |
| `getPluginPath(name)` | Get plugin directory | `string \| null` |
| `registerPlugin(path, source)` | Register plugin | `void` |
| `unregisterPlugin(name)` | Unregister plugin | `void` |
| `getAvailablePlugins()` | Get registry plugins | `PluginRegistryEntry[]` |
| `searchPlugins(query)` | Search plugins | `PluginRegistryEntry[]` |
| `getStats()` | Get statistics | `object` |

---

### PluginValidator (`validator.ts`)

Validates plugin structure, manifest, and security.

**Key Features:**
- Validate plugin.json manifest
- Check file structure
- Verify resource handlers exist
- Security scanning
- Semver validation

**Usage:**

```typescript
import PluginValidator from './validator';

const validator = new PluginValidator({
  strictMode: true,
  checkSecurity: true,
  checkFileExistence: true,
});

// Validate a plugin
const result = validator.validatePlugin('/path/to/plugin');

if (!result.valid) {
  console.error('Validation failed:');
  result.errors.forEach(err => {
    console.error(`  [${err.code}] ${err.message}`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Warnings:');
  result.warnings.forEach(warn => {
    console.warn(`  [${warn.code}] ${warn.message}`);
  });
}
```

**Validation Checks:**

✅ **Manifest:**
- `plugin.json` exists and is valid JSON
- Required fields: name, version, description
- Valid semantic version format
- Valid plugin name (lowercase, alphanumeric, hyphens)

✅ **Structure:**
- Expected directories exist (commands/, agents/, skills/, hooks/)
- Handler files exist
- Correct file permissions (hooks are executable)

✅ **Resources:**
- Command handlers exist
- Agent handlers exist
- Skill handlers exist
- Hook scripts exist and are executable
- Valid model types (opus, sonnet, haiku)
- Valid event types (PreToolUse, PostToolUse, etc.)

✅ **Security:**
- No hardcoded secrets (API keys, passwords, tokens)
- No dangerous shell commands (rm -rf /, curl | bash)
- No suspicious patterns (eval, wget | sh)

**Error Codes:**

| Code | Description |
|------|-------------|
| `PLUGIN_NOT_FOUND` | Plugin directory not found |
| `MANIFEST_NOT_FOUND` | plugin.json missing |
| `MANIFEST_INVALID_JSON` | Invalid JSON in manifest |
| `MANIFEST_MISSING_FIELD` | Required field missing |
| `MANIFEST_INVALID_VERSION` | Invalid semver version |
| `MANIFEST_INVALID_NAME` | Invalid plugin name |
| `RESOURCE_HANDLER_NOT_FOUND` | Handler file missing |
| `RESOURCE_INVALID_COMMAND_NAME` | Invalid command name |
| `RESOURCE_INVALID_MODEL` | Invalid agent model |
| `RESOURCE_INVALID_EVENT` | Invalid hook event |
| `SECURITY_HARDCODED_SECRET` | Possible secret found |
| `SECURITY_DANGEROUS_TOOLS` | Uses dangerous tools |
| `SECURITY_SUSPICIOUS_PATTERN` | Suspicious code pattern |

---

### DependencyResolver (`dependency-resolver.ts`)

Resolves plugin dependencies and checks version compatibility.

**Key Features:**
- Resolve dependency versions
- Detect circular dependencies
- Check version conflicts
- Topological sort for install order
- Semver constraint checking

**Usage:**

```typescript
import DependencyResolver, { DependencyNode } from './dependency-resolver';

// Create resolver with installed and registry plugins
const installed = new Map<string, DependencyNode>();
const registry = new Map<string, DependencyNode>();

// Add installed plugins
installed.set('core-utils', {
  name: 'core-utils',
  version: '1.2.0',
  dependencies: {},
  source: 'installed',
});

// Add registry plugins
registry.set('team-collaboration-suite', {
  name: 'team-collaboration-suite',
  version: '1.1.0',
  dependencies: {
    'core-utils': '^1.0.0',
    'jira-api-wrapper': '^3.0.0',
  },
  source: 'registry',
});

const resolver = new DependencyResolver(installed, registry);

// Resolve dependencies
const result = resolver.resolveDependencies('team-collaboration-suite', {
  'core-utils': '^1.0.0',
  'jira-api-wrapper': '^3.0.0',
});

if (result.success) {
  console.log('Resolved dependencies:');
  result.resolved.forEach((version, name) => {
    console.log(`  ${name}@${version}`);
  });

  console.log('\nInstall order:');
  result.installOrder.forEach(name => {
    console.log(`  ${name}`);
  });
} else {
  console.error('Resolution failed:');
  result.errors.forEach(err => {
    console.error(`  [${err.code}] ${err.message}`);
  });
}
```

**Version Constraints:**

| Constraint | Meaning | Example |
|------------|---------|---------|
| `1.2.3` | Exact version | Only 1.2.3 |
| `^1.2.3` | Caret (minor updates) | 1.x.x (≥1.2.3, <2.0.0) |
| `~1.2.3` | Tilde (patch updates) | 1.2.x (≥1.2.3, <1.3.0) |
| `*` | Any version | Latest available |

**API Reference:**

| Method | Description | Returns |
|--------|-------------|---------|
| `resolveDependencies(name, deps)` | Resolve all dependencies | `ResolutionResult` |
| `satisfiesConstraint(version, constraint)` | Check version compatibility | `boolean` |
| `getAllDependencies(name, deps)` | Get transitive dependencies | `Set<string>` |
| `findDependents(name)` | Find plugins that depend on this | `string[]` |
| `compareVersions(a, b)` | Compare two versions | `-1 \| 0 \| 1` |
| `getLatestVersion(versions, constraint)` | Get latest satisfying version | `string \| null` |

**Resolution Errors:**

| Code | Description |
|------|-------------|
| `CIRCULAR_DEPENDENCY` | Circular dependency detected |
| `DEPENDENCY_NOT_FOUND` | Dependency not available |
| `VERSION_CONFLICT` | Version constraint conflict |

---

## Type Definitions

### PluginManifest

```typescript
interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  keywords?: string[];
  categories?: string[];
  repository?: {
    type: string;
    url: string;
  };
  commands?: Record<string, CommandDefinition>;
  agents?: Record<string, AgentDefinition>;
  skills?: Record<string, SkillDefinition>;
  hooks?: Record<string, HookDefinition>;
  dependencies?: Record<string, string>;
  configuration?: {
    localConfig?: string;
    requiredEnvVars?: string[];
    optionalEnvVars?: string[];
  };
  resources?: Record<string, any>;
}
```

### PluginInfo

```typescript
interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  path: string;
  source: 'registry' | 'git' | 'local';
  installedAt: string;
  dependencies: Record<string, string>;
  provides: {
    commands: number;
    agents: number;
    skills: number;
    hooks: number;
  };
  status: 'active' | 'broken' | 'outdated';
  updateAvailable?: string;
  isDev?: boolean;
}
```

---

## Integration

These utilities are used by the plugin management commands:

- `/plugin-install` - Uses PluginManager, PluginValidator, DependencyResolver
- `/plugin-uninstall` - Uses PluginManager, DependencyResolver
- `/plugin-list` - Uses PluginManager
- `/plugin-update` - Uses PluginManager, DependencyResolver

## Testing

```bash
# Run tests (when available)
npm test

# Type checking
npx tsc --noEmit
```

## Contributing

When adding new features:

1. Update type definitions
2. Add validation checks in PluginValidator
3. Update dependency resolution logic if needed
4. Document in this README
5. Update commands that use these utilities

## See Also

- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)
- [Plugin Commands](../../commands/)
- [Plugin Registry](../../registry/plugins.index.json)
