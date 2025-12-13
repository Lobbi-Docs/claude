---
name: migrate
description: Run Beanie/MongoDB migrations and index management
argument-hint: "[create|run|status|rollback] [--name migration_name]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
---

# Beanie/MongoDB Migrations

Manage MongoDB schema changes, indexes, and data migrations with Beanie ODM.

## Migration Strategy

Unlike SQL databases, MongoDB doesn't require schema migrations for structural changes.
However, you need migrations for:
1. **Index creation/modification**
2. **Data transformations**
3. **Field renaming/restructuring**
4. **Data backfills**

## Migration System Setup

### Migration Registry

```python
# app/migrations/__init__.py
from typing import List, Callable, Awaitable
from datetime import datetime
import structlog

logger = structlog.get_logger()

# Migration registry
_migrations: List[dict] = []

def migration(version: str, description: str):
    """Decorator to register a migration."""
    def decorator(func: Callable[[], Awaitable[None]]):
        _migrations.append({
            "version": version,
            "description": description,
            "func": func,
            "name": func.__name__
        })
        return func
    return decorator

def get_migrations() -> List[dict]:
    """Get all registered migrations sorted by version."""
    return sorted(_migrations, key=lambda m: m["version"])
```

### Migration Tracking Model

```python
# app/models/migration.py
from beanie import Document
from datetime import datetime
from pydantic import Field

class MigrationRecord(Document):
    """Tracks applied migrations."""

    version: str
    name: str
    description: str
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: float
    status: str = "completed"  # completed, failed, rolled_back

    class Settings:
        name = "_migrations"
```

### Migration Runner

```python
# app/migrations/runner.py
import asyncio
import time
from typing import Optional, List
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import structlog

from app.config import get_settings
from app.models.migration import MigrationRecord
from app.migrations import get_migrations

logger = structlog.get_logger()
settings = get_settings()

class MigrationRunner:
    """Runs database migrations."""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

    async def connect(self):
        """Connect to database."""
        self.client = AsyncIOMotorClient(settings.mongodb_url)
        self.db = self.client[settings.database_name]

        # Initialize Beanie with migration model
        await init_beanie(
            database=self.db,
            document_models=[MigrationRecord]
        )

    async def disconnect(self):
        """Disconnect from database."""
        if self.client:
            self.client.close()

    async def get_applied_versions(self) -> set:
        """Get set of applied migration versions."""
        records = await MigrationRecord.find(
            MigrationRecord.status == "completed"
        ).to_list()
        return {r.version for r in records}

    async def run_pending(self) -> List[str]:
        """Run all pending migrations."""
        applied = await self.get_applied_versions()
        migrations = get_migrations()
        results = []

        for migration in migrations:
            if migration["version"] in applied:
                continue

            logger.info(
                "running_migration",
                version=migration["version"],
                name=migration["name"]
            )

            start_time = time.perf_counter()

            try:
                await migration["func"]()
                duration_ms = (time.perf_counter() - start_time) * 1000

                # Record successful migration
                await MigrationRecord(
                    version=migration["version"],
                    name=migration["name"],
                    description=migration["description"],
                    duration_ms=duration_ms,
                    status="completed"
                ).insert()

                logger.info(
                    "migration_completed",
                    version=migration["version"],
                    duration_ms=round(duration_ms, 2)
                )
                results.append(migration["version"])

            except Exception as e:
                duration_ms = (time.perf_counter() - start_time) * 1000

                # Record failed migration
                await MigrationRecord(
                    version=migration["version"],
                    name=migration["name"],
                    description=migration["description"],
                    duration_ms=duration_ms,
                    status="failed"
                ).insert()

                logger.error(
                    "migration_failed",
                    version=migration["version"],
                    error=str(e)
                )
                raise

        return results

    async def status(self) -> dict:
        """Get migration status."""
        applied = await self.get_applied_versions()
        migrations = get_migrations()

        pending = [
            {"version": m["version"], "description": m["description"]}
            for m in migrations
            if m["version"] not in applied
        ]

        applied_list = [
            {"version": m["version"], "description": m["description"]}
            for m in migrations
            if m["version"] in applied
        ]

        return {
            "applied": applied_list,
            "pending": pending,
            "total": len(migrations)
        }

async def run_migrations():
    """CLI entry point for running migrations."""
    runner = MigrationRunner()
    await runner.connect()

    try:
        results = await runner.run_pending()
        if results:
            print(f"Applied {len(results)} migrations: {results}")
        else:
            print("No pending migrations")
    finally:
        await runner.disconnect()

if __name__ == "__main__":
    asyncio.run(run_migrations())
```

## Example Migrations

### Index Creation Migration

```python
# app/migrations/v001_create_indexes.py
from app.migrations import migration
from app.models.user import User
from app.models.product import Product
import structlog

logger = structlog.get_logger()

@migration("001", "Create initial indexes")
async def create_indexes():
    """Create indexes for User and Product collections."""

    # User indexes
    await User.get_motor_collection().create_index(
        "email",
        unique=True,
        name="email_unique_idx"
    )

    await User.get_motor_collection().create_index(
        [("created_at", -1)],
        name="created_at_desc_idx"
    )

    # Product indexes
    await Product.get_motor_collection().create_index(
        [("name", "text"), ("description", "text")],
        name="product_search_idx"
    )

    await Product.get_motor_collection().create_index(
        [("category", 1), ("price", 1)],
        name="category_price_idx"
    )

    logger.info("indexes_created")
```

### Data Transformation Migration

```python
# app/migrations/v002_normalize_emails.py
from app.migrations import migration
from app.models.user import User
import structlog

logger = structlog.get_logger()

@migration("002", "Normalize user emails to lowercase")
async def normalize_emails():
    """Convert all user emails to lowercase."""

    # Find users with uppercase emails
    users = await User.find(
        {"email": {"$regex": "[A-Z]"}}
    ).to_list()

    count = 0
    for user in users:
        user.email = user.email.lower()
        await user.save()
        count += 1

    logger.info("emails_normalized", count=count)
```

### Field Renaming Migration

```python
# app/migrations/v003_rename_field.py
from app.migrations import migration
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings
import structlog

logger = structlog.get_logger()
settings = get_settings()

@migration("003", "Rename 'fullName' to 'full_name'")
async def rename_fullname_field():
    """Rename fullName field to full_name for consistency."""

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    result = await db.users.update_many(
        {"fullName": {"$exists": True}},
        {"$rename": {"fullName": "full_name"}}
    )

    logger.info("field_renamed", modified_count=result.modified_count)
    client.close()
```

### Add New Field Migration

```python
# app/migrations/v004_add_status_field.py
from app.migrations import migration
from app.models.order import Order
import structlog

logger = structlog.get_logger()

@migration("004", "Add status field to orders")
async def add_status_field():
    """Add status field with default value to existing orders."""

    result = await Order.get_motor_collection().update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "pending"}}
    )

    logger.info("status_field_added", modified_count=result.modified_count)
```

## CLI Commands

### Run Migrations

```bash
# Run all pending migrations
python -m app.migrations.runner

# Or with a script
python scripts/migrate.py run
```

### Check Status

```python
# scripts/migrate.py
import asyncio
import sys
from app.migrations.runner import MigrationRunner

async def main():
    runner = MigrationRunner()
    await runner.connect()

    command = sys.argv[1] if len(sys.argv) > 1 else "status"

    try:
        if command == "run":
            results = await runner.run_pending()
            print(f"Applied: {results}")

        elif command == "status":
            status = await runner.status()
            print(f"Applied: {len(status['applied'])}")
            print(f"Pending: {len(status['pending'])}")
            for m in status['pending']:
                print(f"  - {m['version']}: {m['description']}")

        else:
            print(f"Unknown command: {command}")
            print("Usage: python scripts/migrate.py [run|status]")

    finally:
        await runner.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### Docker Integration

```dockerfile
# Run migrations before starting app
CMD ["sh", "-c", "python -m app.migrations.runner && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### Kubernetes Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrations
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:latest
          command: ["python", "-m", "app.migrations.runner"]
          envFrom:
            - secretRef:
                name: app-secrets
      restartPolicy: Never
  backoffLimit: 3
```

## Index Management

### List Indexes

```python
async def list_indexes(collection_name: str):
    """List all indexes on a collection."""
    collection = db[collection_name]
    indexes = await collection.index_information()
    for name, info in indexes.items():
        print(f"{name}: {info}")
```

### Drop Index

```python
async def drop_index(collection_name: str, index_name: str):
    """Drop an index."""
    collection = db[collection_name]
    await collection.drop_index(index_name)
```

### Rebuild Indexes

```python
async def rebuild_indexes(collection_name: str):
    """Rebuild all indexes on a collection."""
    collection = db[collection_name]
    await collection.reindex()
```

## Output Files

Generate at:
- `app/migrations/__init__.py` - Migration registry
- `app/migrations/runner.py` - Migration runner
- `app/migrations/v{NNN}_{name}.py` - Individual migrations
- `app/models/migration.py` - Migration tracking model
- `scripts/migrate.py` - CLI script
