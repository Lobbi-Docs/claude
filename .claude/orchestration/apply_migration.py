#!/usr/bin/env python3
"""
Apply database migrations to the orchestration database.
"""

import sqlite3
import sys
from pathlib import Path

def apply_migration(db_path: str, migration_path: str):
    """Apply a SQL migration file to the database."""
    print(f"Applying migration: {migration_path}")
    print(f"Database: {db_path}")

    # Read migration SQL
    with open(migration_path, 'r') as f:
        migration_sql = f.read()

    # Connect to database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    try:
        # Execute migration
        conn.executescript(migration_sql)
        conn.commit()
        print("✓ Migration applied successfully")

        # Verify tables were created
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'documentation%'"
        )
        tables = [row[0] for row in cursor.fetchall()]

        if tables:
            print(f"\n✓ Tables created: {', '.join(tables)}")
        else:
            print("\n⚠ Warning: No documentation tables found after migration")

        # Verify views were created
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='view' AND name LIKE 'v_%doc%'"
        )
        views = [row[0] for row in cursor.fetchall()]

        if views:
            print(f"✓ Views created: {', '.join(views)}")

        return True

    except sqlite3.Error as e:
        print(f"✗ Migration failed: {e}", file=sys.stderr)
        conn.rollback()
        return False

    finally:
        conn.close()

if __name__ == '__main__':
    script_dir = Path(__file__).parent
    db_path = script_dir / 'db' / 'agents.db'
    migration_path = script_dir / 'db' / 'migration_documentation_log.sql'

    if not db_path.exists():
        print(f"✗ Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    if not migration_path.exists():
        print(f"✗ Migration file not found: {migration_path}", file=sys.stderr)
        sys.exit(1)

    success = apply_migration(str(db_path), str(migration_path))
    sys.exit(0 if success else 1)
