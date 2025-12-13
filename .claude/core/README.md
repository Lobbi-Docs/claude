# Plugin Dependency Resolution System

A comprehensive dependency resolution system for Claude Code plugins, inspired by npm/pnpm algorithms.

## Features

- **Dependency Graph**: Topological sorting for correct installation order
- **Cycle Detection**: Automatic detection of circular dependencies
- **Semantic Versioning**: Full semver support (^, ~, >=, <=, ||, exact, *)
- **Conflict Resolution**: Automatic resolution of version conflicts
- **Lockfile Management**: Deterministic installations with integrity checking
- **Plugin Installation**: Complete installation orchestration

## Architecture

### Components

1. **types.ts** - TypeScript type definitions
2. **dependency-resolver.ts** - Core resolution logic
   - `DependencyGraph` - Graph-based dependency management
   - `SemverResolver` - Semantic version matching
   - `ConflictResolver` - Version conflict resolution
3. **lockfile-manager.ts** - Lockfile operations
   - Generate, read, write, validate lockfiles
   - Integrity checking with SHA-256 hashes
4. **plugin-installer.ts** - Installation orchestration
   - Dependency resolution
   - Installation workflow
   - Upgrade/uninstall operations

## Usage

### Basic Installation

```typescript
import { PluginInstaller } from './plugin-installer.js';

const installer = new PluginInstaller('/path/to/plugins');

// Install a plugin
const result = await installer.install('my-plugin', {
  dev: false,
  force: false,
});

console.log('Installed:', result.installed);
console.log('Errors:', result.errors);
```

### Install from Lockfile

```typescript
// Deterministic install from lockfile
const result = await installer.installFromLockfile('./claude-plugins-lock.json');
```

### Dependency Resolution

```typescript
import { DependencyGraph, SemverResolver } from './dependency-resolver.js';

const graph = new DependencyGraph();

// Add nodes
graph.addNode('plugin-a', '1.0.0');
graph.addNode('plugin-b', '2.0.0');

// Add dependencies
graph.addEdge('plugin-a', 'plugin-b', '^2.0.0');

// Resolve install order
const installOrder = graph.resolve();
console.log('Install order:', installOrder);

// Check for cycles
const cycles = graph.detectCycles();
if (cycles.length > 0) {
  console.error('Circular dependencies detected:', cycles);
}
```

### Semantic Versioning

```typescript
import { SemverResolver } from './dependency-resolver.js';

const resolver = new SemverResolver();

// Check if version satisfies range
resolver.satisfies('1.2.3', '^1.0.0'); // true
resolver.satisfies('2.0.0', '^1.0.0'); // false

// Find max satisfying version
const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
resolver.maxSatisfying(versions, '^1.0.0'); // '1.2.0'
```

### Lockfile Management

```typescript
import { LockfileManager } from './lockfile-manager.js';

const manager = new LockfileManager();

// Generate lockfile from resolved dependencies
const lockfile = manager.generateLockfile(resolved);

// Write to disk
manager.writeLockfile(lockfile, './claude-plugins-lock.json');

// Read and validate
const existing = manager.readLockfile('./claude-plugins-lock.json');
const validation = manager.validateIntegrity(existing);

if (!validation.valid) {
  console.error('Integrity check failed:', validation.errors);
}
```

## Semver Support

The system supports all standard semver ranges:

| Range | Description | Example |
|-------|-------------|---------|
| `exact` | Exact version | `1.2.3` |
| `^` | Compatible changes | `^1.2.3` matches `>=1.2.3 <2.0.0` |
| `~` | Patch changes only | `~1.2.3` matches `>=1.2.3 <1.3.0` |
| `>=` | Greater or equal | `>=1.2.3` |
| `<=` | Less or equal | `<=1.2.3` |
| `>` | Greater than | `>1.2.3` |
| `<` | Less than | `<1.2.3` |
| `\|\|` | OR operator | `^1.0.0 \|\| ^2.0.0` |
| `*` | Any version | `*` |

### Caret (^) Behavior

- `^1.2.3` := `>=1.2.3 <2.0.0`
- `^0.2.3` := `>=0.2.3 <0.3.0`
- `^0.0.3` := `>=0.0.3 <0.0.4`

### Tilde (~) Behavior

- `~1.2.3` := `>=1.2.3 <1.3.0`
- `~1.2` := `>=1.2.0 <1.3.0`

## Lockfile Format

```json
{
  "version": "1.0.0",
  "generated": "2024-12-12T20:00:00.000Z",
  "plugins": {
    "plugin-name": {
      "version": "1.2.3",
      "resolved": "/path/to/plugin or https://registry/plugin.tar.gz",
      "integrity": "sha256-base64hash==",
      "dependencies": {
        "dep-a": "1.0.0",
        "dep-b": "2.0.0"
      }
    }
  }
}
```

## Conflict Resolution

When multiple plugins require different versions of the same dependency:

```typescript
import { ConflictResolver } from './dependency-resolver.js';

const resolver = new ConflictResolver();

const conflict = {
  pluginName: 'shared-dep',
  requestedBy: [
    { requester: 'plugin-a', versionRange: '^1.0.0' },
    { requester: 'plugin-b', versionRange: '^1.1.0' }
  ],
  availableVersions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0']
};

// Resolve using 'highest' strategy
const resolved = resolver.resolveConflict(conflict, 'highest');
console.log(resolved); // '1.2.0'

// Get suggestions for all conflicts
const suggestions = resolver.suggestResolution([conflict]);
```

### Strategies

- `highest` - Select highest version satisfying all requirements
- `lowest` - Select lowest version satisfying all requirements
- `prompt` - Require user interaction (throws error)

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Test Coverage

The test suite includes:

- ✅ Dependency graph operations (add nodes, edges)
- ✅ Topological sorting (simple chains, diamond patterns, parallel dependencies)
- ✅ Cycle detection (simple, indirect, acyclic validation)
- ✅ Conflict detection
- ✅ Semantic versioning (exact, caret, tilde, comparisons, wildcards, OR)
- ✅ Version selection (maxSatisfying)
- ✅ Conflict resolution (highest, lowest strategies)
- ✅ Lockfile operations (generate, read, write, validate)
- ✅ Integrity checking

## Error Handling

The system provides detailed error messages:

```typescript
// Circular dependency
Error: Circular dependencies detected: plugin-a -> plugin-b -> plugin-a

// Version conflict
Error: No version of plugin-x satisfies all requirements: plugin-a@^1.0.0, plugin-b@^2.0.0

// Missing dependency
Error: No version of dep-y satisfies ^1.0.0 required by plugin-z

// Lockfile validation
Error: Lockfile validation failed: Plugin plugin-a missing integrity hash
```

## Integration

### With Plugin System

```typescript
// Example: Integrate with plugin marketplace
class PluginMarketplace {
  private installer: PluginInstaller;

  async installPlugin(name: string, version?: string) {
    const result = await this.installer.install(name, {
      production: true,
      force: false,
    });

    if (result.errors.length > 0) {
      throw new Error(`Installation failed: ${result.errors.map(e => e.error.message).join(', ')}`);
    }

    return result;
  }
}
```

### With CLI

```typescript
// Example CLI integration
import { PluginInstaller } from './plugin-installer.js';

async function cli(args: string[]) {
  const [command, ...params] = args;
  const installer = new PluginInstaller(process.cwd());

  switch (command) {
    case 'install':
      const result = await installer.install(params[0]);
      console.log(`✓ Installed ${result.installed.join(', ')}`);
      break;

    case 'uninstall':
      await installer.uninstall(params[0]);
      console.log(`✓ Uninstalled ${params[0]}`);
      break;

    case 'upgrade':
      await installer.upgrade(params[0], params[1]);
      console.log(`✓ Upgraded ${params[0]}`);
      break;
  }
}
```

## Performance Considerations

- **Topological Sort**: O(V + E) where V = vertices, E = edges
- **Cycle Detection**: O(V + E) using DFS
- **Version Matching**: O(n) where n = number of versions
- **Integrity Hashing**: O(n) where n = file size

## Future Enhancements

- [ ] Remote registry support (npm, GitHub releases)
- [ ] Parallel downloads
- [ ] Progress reporting
- [ ] Plugin caching
- [ ] Workspace support (monorepos)
- [ ] Peer dependency validation
- [ ] Optional dependency handling
- [ ] Post-install scripts
- [ ] Plugin verification/signing

## License

MIT

## See Also

- [npm dependency resolution](https://npm.github.io/how-npm-works-docs/npm3/how-npm3-works.html)
- [pnpm algorithm](https://pnpm.io/how-peers-are-resolved)
- [Semantic Versioning 2.0.0](https://semver.org/)
