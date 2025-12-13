---
description: Manage plugin migrations - upgrade, downgrade, status, and create migrations
category: plugin-management
keywords: [migration, version, upgrade, downgrade, database]
allowedTools: [Bash, Read, Write, Edit]
---

# Plugin Migration Management

Manage database migrations for Claude Code plugins with upgrade, downgrade, status checking, and migration creation.

## Usage

```bash
/plugin-migrate <command> [options]
```

## Commands

### upgrade - Run pending migrations

Apply all pending migrations up to the latest or target version.

**Syntax:**
```bash
/plugin-migrate upgrade [target-version] [options]
```

**Options:**
- `[target-version]` - Optional target version (default: latest)
- `--dry-run` - Show what would be migrated without executing
- `--verbose` - Show detailed migration output

**Examples:**
```bash
# Upgrade to latest
/plugin-migrate upgrade

# Upgrade to specific version
/plugin-migrate upgrade 2.0.0

# Dry run
/plugin-migrate upgrade --dry-run

# Verbose output
/plugin-migrate upgrade --verbose
```

**Process:**
1. Load registered migrations
2. Check current database version
3. Determine pending migrations
4. Execute migrations in order
5. Track applied migrations in database
6. Report results

---

### downgrade - Rollback migrations

Rollback migrations by steps or to a target version.

**Syntax:**
```bash
/plugin-migrate downgrade [version|steps] [options]
```

**Options:**
- `[version]` - Target version to downgrade to
- `[steps]` - Number of migrations to rollback (e.g., `1`, `3`)
- `--dry-run` - Show what would be rolled back without executing
- `--verbose` - Show detailed rollback output

**Examples:**
```bash
# Rollback last migration
/plugin-migrate downgrade 1

# Rollback to version
/plugin-migrate downgrade 1.5.0

# Rollback 3 migrations
/plugin-migrate downgrade 3

# Dry run
/plugin-migrate downgrade 2 --dry-run
```

**Process:**
1. Identify migrations to rollback
2. Execute down() functions in reverse order
3. Remove migration records from database
4. Report results

---

### status - Show migration status

Display the status of all registered migrations.

**Syntax:**
```bash
/plugin-migrate status [options]
```

**Options:**
- `--format=<format>` - Output format: `table`, `json`, `list` (default: table)
- `--pending-only` - Show only pending migrations
- `--applied-only` - Show only applied migrations

**Examples:**
```bash
# Show all migrations
/plugin-migrate status

# Table format
/plugin-migrate status --format=table

# JSON output
/plugin-migrate status --format=json

# Pending only
/plugin-migrate status --pending-only
```

**Output:**
- Version
- Description
- Status (applied/pending)
- Applied date/time
- Checksum

---

### create - Create new migration

Generate a new migration file from template.

**Syntax:**
```bash
/plugin-migrate create <name> [options]
```

**Options:**
- `<name>` - Migration name (e.g., `add-user-preferences`)
- `--description=<desc>` - Migration description
- `--template=<type>` - Template type: `empty`, `plugin`, `schema`, `data` (default: empty)
- `--version=<version>` - Specify version (default: auto-incremented)

**Examples:**
```bash
# Create basic migration
/plugin-migrate create add-user-settings

# With description
/plugin-migrate create add-oauth --description="Add OAuth authentication"

# From template
/plugin-migrate create schema-update --template=schema

# Specific version
/plugin-migrate create initial-setup --version=1.0.0
```

**Output:**
Creates migration file at: `.claude/core/versioning/migrations/<version>-<name>.ts`

**Migration Template:**
```typescript
import type { Migration } from '../types.js';

export const migration: Migration = {
  version: '1.0.0',
  description: 'Description of migration',

  async up() {
    // Apply migration
    // - Update schemas
    // - Migrate data
    // - Add new features
  },

  async down() {
    // Rollback migration
    // - Revert schemas
    // - Restore data
    // - Remove features
  },

  metadata: {
    author: 'system',
    createdAt: '2025-12-12T20:00:00Z',
    tags: ['schema', 'plugin'],
  },
};
```

---

## Implementation

When this command is invoked, execute the following based on the subcommand:

### For `upgrade`:

1. Import migration engine:
```typescript
import { migrationEngine } from './.claude/core/versioning/index.js';
```

2. Load all migration files from `.claude/core/versioning/migrations/`

3. Register migrations:
```typescript
for (const migrationFile of migrationFiles) {
  const { migration } = await import(migrationFile);
  migrationEngine.registerMigration(migration);
}
```

4. Execute migrations:
```typescript
const result = await migrationEngine.migrate(targetVersion);
```

5. Report results:
```
✓ Applied 3 migration(s) in 1.2s
  • 1.0.0 - Initial schema
  • 1.1.0 - Add user preferences
  • 1.2.0 - Add OAuth support
```

### For `downgrade`:

1. Parse version or steps argument
2. Execute rollback:
```typescript
const result = await migrationEngine.rollback(steps, targetVersion);
```

3. Report results:
```
✓ Rolled back 2 migration(s)
  • 1.2.0 - Add OAuth support
  • 1.1.0 - Add user preferences
```

### For `status`:

1. Get migration status:
```typescript
const statuses = await migrationEngine.status();
```

2. Format output:
```
Migration Status:
┌──────────┬─────────────────────────┬──────────┬─────────────────────┐
│ Version  │ Description             │ Status   │ Applied At          │
├──────────┼─────────────────────────┼──────────┼─────────────────────┤
│ 1.0.0    │ Initial schema          │ Applied  │ 2025-12-12 10:00:00 │
│ 1.1.0    │ Add user preferences    │ Applied  │ 2025-12-12 11:30:00 │
│ 1.2.0    │ Add OAuth support       │ Pending  │ -                   │
└──────────┴─────────────────────────┴──────────┴─────────────────────┘

Summary: 2 applied, 1 pending
```

### For `create`:

1. Determine next version:
```typescript
import { versionManager } from './.claude/core/versioning/index.js';

const latestVersion = getLatestMigrationVersion();
const nextVersion = versionManager.increment(latestVersion, 'patch');
```

2. Create migration file:
```typescript
const filename = `${nextVersion}-${name}.ts`;
const filepath = `.claude/core/versioning/migrations/${filename}`;
```

3. Write template to file

4. Report:
```
✓ Created migration: 1.2.0-add-oauth.ts
  Path: .claude/core/versioning/migrations/1.2.0-add-oauth.ts

Next steps:
  1. Edit the migration file
  2. Implement up() and down() functions
  3. Run: /plugin-migrate upgrade
```

---

## Error Handling

### Migration Fails
- Stop execution immediately
- Don't track failed migration
- Report error details
- Suggest rollback if needed

### Rollback Fails
- Stop rollback immediately
- Leave database in current state
- Report error
- Manual intervention may be required

### Invalid Version
```
✗ Error: Invalid version format: '1.a.0'
  Expected semantic version: X.Y.Z
```

### No Pending Migrations
```
✓ No pending migrations
  Current version: 1.2.0
  All migrations up to date
```

---

## Database Schema

Migrations are tracked in SQLite database:

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

CREATE INDEX idx_migrations_version ON migrations(version);
CREATE INDEX idx_migrations_applied_at ON migrations(applied_at);
```

---

## Best Practices

1. **Always test migrations** - Test both up() and down() before applying
2. **Make migrations idempotent** - Safe to run multiple times
3. **Use transactions** - Wrap database changes in transactions
4. **Version incrementally** - Use patch versions for migrations
5. **Document changes** - Clear descriptions in migration metadata
6. **Test rollbacks** - Ensure down() properly reverses up()
7. **Backup before migrating** - Especially for production

---

## See Also

- [Version Manager](./.claude/core/versioning/version-manager.ts)
- [Migration Engine](./.claude/core/versioning/migration-engine.ts)
- [Plugin System](../PLUGIN_SYSTEM.md)
- [Database Schema](./.claude/orchestration/db/migrations.sql)
