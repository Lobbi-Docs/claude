# Versioning and Migration System

Comprehensive semantic versioning, migration management, and compatibility checking for the Claude Code plugin system.

## Overview

This system provides three main capabilities:

1. **Semantic Versioning** - Parse, compare, and manage versions following semver 2.0.0
2. **Migration Engine** - Execute and track database migrations with rollback support
3. **Compatibility Checker** - Validate plugin compatibility with Claude Code versions

## Quick Start

```typescript
import {
  versionManager,
  migrationEngine,
  compatibilityChecker,
} from './.claude/core/versioning/index.js';

// Version management
const version = versionManager.parse('1.2.3-beta.1');
const isNewer = versionManager.compare('2.0.0', '1.9.9'); // 1
const nextVersion = versionManager.increment('1.2.3', 'minor'); // '1.3.0'

// Migration management
migrationEngine.registerMigration({
  version: '1.0.0',
  description: 'Initial schema',
  async up() {
    // Apply migration
  },
  async down() {
    // Rollback migration
  },
});

await migrationEngine.migrate();

// Compatibility checking
const report = compatibilityChecker.checkApiCompatibility({
  name: 'my-plugin',
  version: '1.0.0',
  apiVersion: '1.0.0',
});

console.log(`Compatible: ${report.compatible}`);
```

## Components

### VersionManager

Handles semantic versioning operations:

```typescript
// Parse semantic version
const parts = versionManager.parse('1.2.3-beta.1+build.123');
// { major: 1, minor: 2, patch: 3, prerelease: ['beta', '1'], build: ['build', '123'] }

// Compare versions
versionManager.compare('2.0.0', '1.9.9'); // 1 (newer)
versionManager.compare('1.0.0', '2.0.0'); // -1 (older)
versionManager.compare('1.0.0', '1.0.0'); // 0 (equal)

// Check version satisfies range
versionManager.satisfies('1.5.0', '^1.2.0'); // true
versionManager.satisfies('2.0.0', '^1.2.0'); // false
versionManager.satisfies('1.2.5', '~1.2.0'); // true

// Increment version
versionManager.increment('1.2.3', 'major'); // '2.0.0'
versionManager.increment('1.2.3', 'minor'); // '1.3.0'
versionManager.increment('1.2.3', 'patch'); // '1.2.4'

// Sort versions
versionManager.sort(['1.10.0', '1.2.0', '2.0.0']); // ['1.2.0', '1.10.0', '2.0.0']

// Get latest version
versionManager.latest(['1.0.0', '2.0.0', '1.5.0']); // '2.0.0'
```

#### Conventional Commits

```typescript
// Parse conventional commit
const commit = versionManager.parseCommit('feat(auth): add OAuth support');
// { type: 'feat', scope: 'auth', subject: 'add OAuth support', breaking: false }

// Parse breaking change
const breaking = versionManager.parseCommit('feat!: breaking change');
// { type: 'feat', subject: 'breaking change', breaking: true }

// Generate changelog
const changelog = versionManager.generateChangelog(commits, {
  toVersion: '2.0.0',
  includeDate: true,
});

// Format changelog as markdown
const markdown = versionManager.formatChangelog(changelog);

// Get recommended version bump
const bump = versionManager.getRecommendedBump(commits); // 'major' | 'minor' | 'patch'
```

### MigrationEngine

Manages database migrations with tracking and rollback:

```typescript
// Create migration
const migration: Migration = {
  version: '1.0.0',
  description: 'Add user preferences table',

  async up() {
    // Apply migration
    // - Create tables
    // - Migrate data
    // - Add features
  },

  async down() {
    // Rollback migration
    // - Drop tables
    // - Restore data
    // - Remove features
  },

  metadata: {
    author: 'developer',
    createdAt: '2025-12-12',
    tags: ['schema', 'users'],
  },
};

// Register migration
migrationEngine.registerMigration(migration);

// Execute all pending migrations
const result = await migrationEngine.migrate();
// { success: true, migrationsApplied: ['1.0.0'], errors: [], ... }

// Execute up to specific version
await migrationEngine.migrate('1.5.0');

// Rollback last migration
await migrationEngine.rollback(1);

// Rollback to specific version
await migrationEngine.rollback(10, '1.0.0');

// Get migration status
const statuses = await migrationEngine.status();
// [
//   { version: '1.0.0', description: '...', applied: true, appliedAt: '...' },
//   { version: '1.1.0', description: '...', applied: false },
// ]

// Close database connection
migrationEngine.close();
```

#### Migration Options

```typescript
const engine = new MigrationEngine({
  migrationsPath: '.claude/core/versioning/migrations',
  dbPath: '.claude/orchestration/db/orchestration.db',
  tableName: 'migrations',
  dryRun: false, // Preview without executing
  verbose: true, // Enable logging
});
```

### CompatibilityChecker

Validates plugin compatibility:

```typescript
// Check plugin API compatibility
const report = compatibilityChecker.checkApiCompatibility({
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin',
  apiVersion: '1.0.0',
  engines: {
    claudeCode: '^1.0.0',
    node: '>=18.0.0',
  },
});

console.log(`Compatible: ${report.compatible}`);
console.log(`Issues: ${report.issues.length}`);
console.log(`Warnings: ${report.warnings.length}`);

// Check signature compatibility between versions
const sigReport = compatibilityChecker.checkSignatureCompatibility('1.0.0', '2.0.0');
console.log(`Breaking changes: ${sigReport.breaking.length}`);
console.log(`Additions: ${sigReport.additions.length}`);
console.log(`Removals: ${sigReport.removals.length}`);

// Generate compatibility matrix for multiple plugins
const matrix = compatibilityChecker.generateMatrix([plugin1, plugin2, plugin3]);
console.log(`Compatible: ${matrix.summary.compatible}/${matrix.summary.total}`);

// Format reports
const reportText = compatibilityChecker.formatReport(report);
const matrixText = compatibilityChecker.formatMatrix(matrix);
```

## Command-Line Interface

Use the `/plugin-migrate` command for migration management:

```bash
# Run pending migrations
/plugin-migrate upgrade

# Upgrade to specific version
/plugin-migrate upgrade 2.0.0

# Dry run (preview without executing)
/plugin-migrate upgrade --dry-run

# Rollback last migration
/plugin-migrate downgrade 1

# Rollback to version
/plugin-migrate downgrade 1.5.0

# View migration status
/plugin-migrate status

# Create new migration
/plugin-migrate create add-oauth-support
```

## Database Schema

Migrations are tracked in SQLite:

```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_by TEXT DEFAULT 'system',
  execution_time_ms INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down'))
);
```

## Migration Files

Create migrations in `.claude/core/versioning/migrations/`:

```typescript
// 1.0.0-initial-schema.ts
import type { Migration } from '../types.js';

export const migration: Migration = {
  version: '1.0.0',
  description: 'Initial database schema',

  async up() {
    // Create tables, add columns, etc.
  },

  async down() {
    // Reverse changes
  },

  metadata: {
    author: 'system',
    createdAt: '2025-12-12',
    tags: ['schema', 'initial'],
  },
};
```

## Type Definitions

All types are exported from `types.ts`:

```typescript
import type {
  SemverParts,
  ConventionalCommit,
  Migration,
  MigrationResult,
  CompatibilityReport,
  PluginManifest,
} from './.claude/core/versioning/types.js';
```

## Testing

Run tests with Vitest:

```bash
cd .claude/core
npm test versioning
```

Test coverage includes:
- Semver parsing and comparison
- Version range satisfaction
- Conventional commit parsing
- Changelog generation
- Migration execution and rollback
- Compatibility checking
- Error handling

## Best Practices

### Version Management

1. **Always use semver** - Follow semantic versioning 2.0.0
2. **Increment appropriately** - Major for breaking, minor for features, patch for fixes
3. **Use conventional commits** - Enable automatic changelog generation
4. **Tag releases** - Tag Git commits with version numbers

### Migration Management

1. **Make migrations idempotent** - Safe to run multiple times
2. **Test both up() and down()** - Ensure rollbacks work
3. **Use transactions** - Wrap database changes
4. **Keep migrations small** - One logical change per migration
5. **Never modify existing migrations** - Create new ones instead
6. **Document complex migrations** - Add clear descriptions

### Compatibility Checking

1. **Specify apiVersion** - Always include in plugin.json
2. **Define engine requirements** - Be explicit about version needs
3. **Check before installing** - Validate compatibility first
4. **Handle warnings** - Address deprecation warnings promptly
5. **Test across versions** - Verify compatibility

## Integration

### With Plugin System

```typescript
import { versionManager, compatibilityChecker } from './.claude/core/versioning/index.js';
import { PluginManager } from './.claude/core/plugin-manager.js';

// Check compatibility before installing
const pluginManifest = await loadPluginManifest();
const report = compatibilityChecker.checkApiCompatibility(pluginManifest);

if (!report.compatible) {
  console.error('Plugin is incompatible:', report.issues);
  return;
}

// Install plugin if compatible
await pluginManager.install(pluginManifest);
```

### With Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
# Auto-generate changelog from commits
node .claude/core/versioning/scripts/generate-changelog.js
```

## Troubleshooting

### Migration fails

- Check error message in migration_errors table
- Verify migration code is correct
- Ensure database is accessible
- Check for schema conflicts

### Rollback fails

- Verify down() function is implemented
- Check database state
- Manual intervention may be needed

### Compatibility issues

- Update plugin apiVersion
- Check breaking changes in changelog
- Review engine requirements
- Update to latest API version

## See Also

- [Plugin System](../PLUGIN_SYSTEM.md)
- [Migration Command](../../commands/plugin-migrate.md)
- [Database Schema](../../orchestration/db/migrations.sql)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Version:** 1.0.0
**Last Updated:** 2025-12-12
**License:** MIT
