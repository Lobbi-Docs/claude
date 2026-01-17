---
name: lg:memory
description: Setup, configure, and manage memory/checkpoint systems for LangGraph agents including persistence, migration, and cleanup
version: 1.0.0
category: langgraph
author: Claude Code
arguments:
  - name: action
    description: Action to perform
    required: true
    type: choice
    choices: [setup, migrate, clear, list, export, import, info]
  - name: name
    description: Configuration or checkpoint name
    required: false
    type: string
flags:
  - name: project
    description: Project directory path
    type: string
    default: "."
  - name: type
    description: Memory system type
    type: choice
    choices: [memory, sqlite, postgres, redis, mongodb, custom]
    default: sqlite
  - name: connection-string
    description: Database connection string
    type: string
    default: ""
  - name: thread-id
    description: Thread ID for checkpoint operations
    type: string
    default: ""
  - name: checkpoint-id
    description: Specific checkpoint ID
    type: string
    default: ""
  - name: from-type
    description: Source memory type for migration
    type: string
    default: ""
  - name: to-type
    description: Target memory type for migration
    type: string
    default: ""
  - name: async
    description: Use async checkpoint implementation
    type: boolean
    default: false
  - name: namespace
    description: Checkpoint namespace
    type: string
    default: "default"
  - name: ttl
    description: Checkpoint TTL in seconds (for Redis)
    type: number
    default: 0
presets:
  - name: sqlite-persistent
    description: SQLite with persistent storage
    flags:
      type: sqlite
      connection-string: "checkpoints.db"
  - name: postgres-production
    description: PostgreSQL for production
    flags:
      type: postgres
      async: true
  - name: redis-distributed
    description: Redis for distributed systems
    flags:
      type: redis
      ttl: 86400
  - name: mongodb-cloud
    description: MongoDB Atlas for cloud deployments
    flags:
      type: mongodb
      async: true
---

# lg:memory - Memory System Management

Setup and manage memory/checkpoint systems for LangGraph agents enabling state persistence, resumption, and time-travel debugging.

## Workflow Steps

### Setup Memory System

1. **Validate Configuration**
   - Check memory type
   - Verify connection string
   - Test database connectivity

2. **Install Dependencies**
   - Add required packages to pyproject.toml
   - Install checkpoint library
   - Install database drivers

3. **Generate Configuration**
   - Create checkpoint configuration
   - Setup environment variables
   - Generate initialization code

4. **Initialize Storage**
   - Create database/tables
   - Setup indexes
   - Configure retention policies

5. **Update Graph**
   - Add checkpointer to graph compilation
   - Configure checkpoint strategy
   - Setup interrupt points

6. **Update Tests**
   - Add checkpoint tests
   - Test persistence
   - Test resumption

7. **Update Documentation**
   - Document memory system
   - Add checkpoint examples
   - Document thread management

### Migrate Memory System

1. **Backup Current State**
   - Export all checkpoints
   - Verify backup integrity

2. **Setup New System**
   - Install new dependencies
   - Configure new storage
   - Initialize new database

3. **Migrate Data**
   - Transform checkpoint format
   - Copy thread data
   - Verify migration

4. **Update Configuration**
   - Update graph code
   - Update environment variables
   - Update deployment configs

5. **Validate Migration**
   - Test checkpoint loading
   - Verify data integrity
   - Test resumption

### Clear Checkpoints

1. **Identify Scope**
   - Single thread vs all threads
   - Specific checkpoint vs all
   - Namespace filtering

2. **Backup (Optional)**
   - Export before clearing
   - Confirm destructive action

3. **Clear Data**
   - Delete checkpoints
   - Clean up metadata
   - Update indexes

4. **Verify Cleanup**
   - Confirm deletion
   - Check storage freed

## Memory System Types

### In-Memory (MemorySaver)
Ephemeral storage for development/testing.

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()

app = graph.compile(checkpointer=checkpointer)
```

**Pros:**
- Fast
- No setup required
- Good for testing

**Cons:**
- Lost on restart
- Not suitable for production
- Limited to single process

### SQLite
File-based persistent storage.

```python
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("checkpoints.db")

app = graph.compile(checkpointer=checkpointer)
```

**Pros:**
- Persistent across restarts
- No external dependencies
- Good for single-server deployments

**Cons:**
- Not suitable for distributed systems
- File locking issues with high concurrency
- Limited scalability

### PostgreSQL
Production-grade relational database.

```python
from langgraph.checkpoint.postgres import PostgresSaver

# Sync version
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/db"
)

# Async version
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
checkpointer = AsyncPostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/db"
)

app = graph.compile(checkpointer=checkpointer)
```

**Pros:**
- Production-ready
- ACID guarantees
- Good for distributed systems
- Rich querying capabilities

**Cons:**
- External dependency
- More setup required
- Higher resource usage

### Redis
In-memory cache with optional persistence.

```python
from langgraph.checkpoint.redis import RedisSaver

checkpointer = RedisSaver.from_conn_string(
    "redis://localhost:6379",
    ttl=86400  # 24 hours
)

app = graph.compile(checkpointer=checkpointer)
```

**Pros:**
- Very fast
- Good for distributed systems
- Built-in TTL support
- Pub/sub capabilities

**Cons:**
- Higher cost
- Data loss risk without persistence
- Memory constraints

### MongoDB
Document-based NoSQL database.

```python
from langgraph.checkpoint.mongodb import MongoDBSaver

# Sync version
checkpointer = MongoDBSaver(
    connection_string="mongodb://localhost:27017",
    db_name="langgraph"
)

# Async version
from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver
checkpointer = AsyncMongoDBSaver(
    connection_string="mongodb://localhost:27017",
    db_name="langgraph"
)

app = graph.compile(checkpointer=checkpointer)
```

**Pros:**
- Flexible schema
- Good for complex state
- Cloud-native (Atlas)
- Good scalability

**Cons:**
- External dependency
- Learning curve
- Eventual consistency

### Custom Checkpointer
Implement custom storage backend.

```python
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint

class CustomCheckpointer(BaseCheckpointSaver):
    def __init__(self, connection_string: str):
        self.conn = connect(connection_string)

    def get(self, config: dict) -> Checkpoint | None:
        # Load checkpoint from storage
        pass

    def put(self, config: dict, checkpoint: Checkpoint) -> dict:
        # Save checkpoint to storage
        pass

    def list(self, config: dict) -> list[Checkpoint]:
        # List checkpoints
        pass
```

## Examples

### Setup SQLite Memory
```bash
lg:memory setup --type sqlite --connection-string "checkpoints.db"
```

### Setup PostgreSQL with Async
```bash
lg:memory setup \
  --type postgres \
  --connection-string "postgresql://user:pass@localhost/langgraph" \
  --async
```

### Setup Redis with TTL
```bash
lg:memory setup \
  --type redis \
  --connection-string "redis://localhost:6379" \
  --ttl 86400
```

### Setup MongoDB
```bash
lg:memory setup \
  --type mongodb \
  --connection-string "mongodb://localhost:27017"
```

### Use Preset
```bash
lg:memory setup --preset sqlite-persistent
lg:memory setup --preset postgres-production
```

### Migrate from SQLite to PostgreSQL
```bash
lg:memory migrate \
  --from-type sqlite \
  --to-type postgres \
  --connection-string "postgresql://user:pass@localhost/langgraph"
```

### List All Checkpoints
```bash
lg:memory list --project ./my-agent
```

Output:
```
Thread: thread_1 (5 checkpoints)
  checkpoint_1  2024-01-15 10:30:00  step: agent
  checkpoint_2  2024-01-15 10:30:15  step: tools
  checkpoint_3  2024-01-15 10:30:30  step: agent
  checkpoint_4  2024-01-15 10:30:45  step: human_review (interrupted)
  checkpoint_5  2024-01-15 10:31:00  step: finalize

Thread: thread_2 (3 checkpoints)
  ...
```

### List Checkpoints for Thread
```bash
lg:memory list --thread-id thread_1 --project ./my-agent
```

### Export Checkpoints
```bash
lg:memory export \
  --thread-id thread_1 \
  --project ./my-agent \
  > backup.json
```

### Import Checkpoints
```bash
lg:memory import backup.json --project ./my-agent
```

### Clear All Checkpoints
```bash
lg:memory clear --project ./my-agent
```

### Clear Thread Checkpoints
```bash
lg:memory clear --thread-id thread_1 --project ./my-agent
```

### Clear Specific Checkpoint
```bash
lg:memory clear \
  --thread-id thread_1 \
  --checkpoint-id checkpoint_3 \
  --project ./my-agent
```

### Get Memory Info
```bash
lg:memory info --project ./my-agent
```

Output:
```
Memory System: PostgreSQL
Connection: postgresql://localhost/langgraph
Async: enabled
Threads: 42
Total Checkpoints: 156
Namespace: default
Storage Size: 15.3 MB
```

## Generated Configuration

### Environment Variables
```bash
# .env
# SQLite
CHECKPOINT_DB_PATH=checkpoints.db

# PostgreSQL
POSTGRES_URL=postgresql://user:pass@localhost/langgraph

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=86400

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=langgraph
```

### Dependencies Added
```toml
# pyproject.toml

# SQLite
dependencies = [
    "langgraph-checkpoint-sqlite>=1.0.0",
]

# PostgreSQL
dependencies = [
    "langgraph-checkpoint-postgres>=1.0.0",
    "psycopg[binary]>=3.0.0",  # or psycopg2-binary
]

# Redis
dependencies = [
    "langgraph-checkpoint-redis>=1.0.0",
    "redis>=5.0.0",
]

# MongoDB
dependencies = [
    "langgraph-checkpoint-mongodb>=1.0.0",
    "pymongo>=4.0.0",
]
```

### Graph Update
```python
# src/graph.py
import os
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import StateGraph

# Setup checkpointer
checkpointer = PostgresSaver.from_conn_string(
    os.getenv("POSTGRES_URL")
)

# Build graph
graph = StateGraph(State)
# ... add nodes and edges ...

# Compile with checkpointer
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_review"],  # Optional interrupts
    interrupt_after=["critical_step"]
)
```

### Configuration Module
```python
# src/config.py
import os
from typing import Literal
from langgraph.checkpoint.base import BaseCheckpointSaver

CheckpointType = Literal["memory", "sqlite", "postgres", "redis", "mongodb"]

def get_checkpointer(
    checkpoint_type: CheckpointType = "sqlite"
) -> BaseCheckpointSaver:
    """Get configured checkpointer."""
    if checkpoint_type == "memory":
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()

    elif checkpoint_type == "sqlite":
        from langgraph.checkpoint.sqlite import SqliteSaver
        db_path = os.getenv("CHECKPOINT_DB_PATH", "checkpoints.db")
        return SqliteSaver.from_conn_string(db_path)

    elif checkpoint_type == "postgres":
        from langgraph.checkpoint.postgres import PostgresSaver
        conn_string = os.getenv("POSTGRES_URL")
        if not conn_string:
            raise ValueError("POSTGRES_URL not set")
        return PostgresSaver.from_conn_string(conn_string)

    elif checkpoint_type == "redis":
        from langgraph.checkpoint.redis import RedisSaver
        conn_string = os.getenv("REDIS_URL")
        ttl = int(os.getenv("REDIS_TTL", "0"))
        return RedisSaver.from_conn_string(conn_string, ttl=ttl)

    elif checkpoint_type == "mongodb":
        from langgraph.checkpoint.mongodb import MongoDBSaver
        conn_string = os.getenv("MONGODB_URL")
        db_name = os.getenv("MONGODB_DB", "langgraph")
        return MongoDBSaver(
            connection_string=conn_string,
            db_name=db_name
        )

    raise ValueError(f"Unknown checkpoint type: {checkpoint_type}")
```

## Usage Patterns

### Thread-Based Conversations
```python
# Different threads for different conversations
config_1 = {"configurable": {"thread_id": "user_123"}}
config_2 = {"configurable": {"thread_id": "user_456"}}

# Each maintains separate state
result_1 = app.invoke({"messages": [...]}, config_1)
result_2 = app.invoke({"messages": [...]}, config_2)
```

### Human-in-the-Loop
```python
# Graph with interrupt
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_review"]
)

# First invocation - runs until interrupt
config = {"configurable": {"thread_id": "thread_1"}}
result = app.invoke(input, config)

# State is saved at interrupt point
# Human reviews and modifies state
state = app.get_state(config)
state.values["approved"] = True
app.update_state(config, state.values)

# Resume from checkpoint
result = app.invoke(None, config)
```

### Time-Travel Debugging
```python
# Get all checkpoints for a thread
config = {"configurable": {"thread_id": "thread_1"}}
checkpoints = list(app.get_state_history(config))

# Replay from specific checkpoint
checkpoint_to_replay = checkpoints[2]  # Third checkpoint
config_with_checkpoint = {
    "configurable": {
        "thread_id": "thread_1",
        "checkpoint_id": checkpoint_to_replay.id
    }
}
result = app.invoke(None, config_with_checkpoint)
```

### Streaming with Checkpoints
```python
config = {"configurable": {"thread_id": "thread_1"}}

for chunk in app.stream(input, config, stream_mode="values"):
    print(chunk)
    # Each chunk is checkpointed
```

### Multi-Namespace Organization
```python
# Separate namespaces for different contexts
config_dev = {
    "configurable": {
        "thread_id": "user_123",
        "namespace": "development"
    }
}

config_prod = {
    "configurable": {
        "thread_id": "user_123",
        "namespace": "production"
    }
}
```

## Testing Generated

### Checkpoint Test Template
```python
# tests/test_checkpoints.py
import pytest
from src.graph import app
from src.config import get_checkpointer

def test_checkpoint_persistence():
    """Test state persists across invocations."""
    checkpointer = get_checkpointer("sqlite")
    config = {"configurable": {"thread_id": "test_1"}}

    # First invocation
    result1 = app.invoke({"messages": ["Hello"]}, config)

    # Second invocation - should have context
    result2 = app.invoke({"messages": ["Continue"]}, config)

    # Check state maintained
    state = app.get_state(config)
    assert len(state.values["messages"]) > 1

def test_checkpoint_isolation():
    """Test threads are isolated."""
    config1 = {"configurable": {"thread_id": "test_1"}}
    config2 = {"configurable": {"thread_id": "test_2"}}

    app.invoke({"messages": ["Hello"]}, config1)
    app.invoke({"messages": ["Hi"]}, config2)

    state1 = app.get_state(config1)
    state2 = app.get_state(config2)

    # Different messages
    assert state1.values["messages"] != state2.values["messages"]

def test_interrupt_resume():
    """Test interrupt and resume."""
    config = {"configurable": {"thread_id": "test_3"}}

    # Run until interrupt
    result = app.invoke({"messages": ["Start"]}, config)

    # Should be interrupted
    state = app.get_state(config)
    assert state.next == ("human_review",)

    # Update and resume
    app.update_state(config, {"approved": True})
    result = app.invoke(None, config)

    # Should complete
    state = app.get_state(config)
    assert state.next == ()

@pytest.mark.integration
def test_checkpoint_migration():
    """Test migrating between checkpoint types."""
    # Setup SQLite
    checkpointer_old = get_checkpointer("sqlite")
    app_old = graph.compile(checkpointer=checkpointer_old)

    config = {"configurable": {"thread_id": "test_4"}}
    app_old.invoke({"messages": ["Test"]}, config)

    # Export checkpoints
    checkpoints = list(app_old.get_state_history(config))

    # Setup Postgres
    checkpointer_new = get_checkpointer("postgres")
    app_new = graph.compile(checkpointer=checkpointer_new)

    # Import checkpoints (manual process)
    # Verify migration
    state = app_new.get_state(config)
    assert state.values["messages"] == ["Test"]
```

## Database Schemas

### SQLite/PostgreSQL Schema
```sql
CREATE TABLE checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    checkpoint BLOB NOT NULL,
    metadata BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX idx_thread_created ON checkpoints(thread_id, created_at);
CREATE INDEX idx_parent ON checkpoints(parent_checkpoint_id);
```

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  thread_id: String,
  checkpoint_id: String,
  parent_checkpoint_id: String,
  checkpoint: Object,
  metadata: Object,
  created_at: ISODate
}

// Indexes
db.checkpoints.createIndex({ thread_id: 1, created_at: -1 })
db.checkpoints.createIndex({ parent_checkpoint_id: 1 })
```

### Redis Keys
```
langgraph:checkpoints:{namespace}:{thread_id}:{checkpoint_id}
langgraph:threads:{namespace}:{thread_id}  # Thread metadata
```

## Error Handling

- **Connection failed**: Cannot connect to database
- **Migration error**: Data transformation failed
- **Checkpoint not found**: Invalid thread_id or checkpoint_id
- **Storage full**: Database capacity exceeded
- **Corruption**: Checkpoint data corrupted

## Notes

- Always backup before migration
- Consider checkpoint retention policies
- Monitor storage usage
- Redis TTL applies to entire checkpoint
- Async checkpointers required for async graphs
- Namespace allows logical separation without separate databases
- Checkpoints include full state snapshot

## Related Commands

- `lg:create` - Create project with memory system
- `lg:node add` - Add interrupt points for human-in-the-loop
- `lg:test run` - Test checkpoint functionality
- `lg:deploy` - Deploy with production memory system

## See Also

- Persistence: https://langchain-ai.github.io/langgraph/concepts/persistence/
- Human-in-the-Loop: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
- Time Travel: https://langchain-ai.github.io/langgraph/how-tos/time-travel/
- Checkpointers: https://langchain-ai.github.io/langgraph/reference/checkpoints/
