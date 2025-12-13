# Memory Commands

Agent Memory System commands for searching, storing, and managing persistent memory.

## Usage

These commands are available through the Claude Code CLI for interacting with the agent memory system.

## Commands

### /memory search [query]

Search across all memory types (episodic, semantic, procedural).

**Examples:**
```bash
/memory search "how to deploy kubernetes"
/memory search "authentication errors"
/memory search "successful test implementations"
```

**What it does:**
- Performs hybrid keyword + semantic search
- Returns relevant episodes, facts, and procedures
- Ranks results by relevance score

---

### /memory store [fact]

Manually store a fact in semantic memory.

**Examples:**
```bash
/memory store "PostgreSQL uses port 5432"
/memory store "Claude API has rate limit of 100 requests per minute"
/memory store "Project uses React 18 with TypeScript"
```

**What it does:**
- Parses fact into subject-predicate-object triple
- Stores in knowledge graph
- Updates entity relationships

**Format:**
Facts should follow the pattern "Subject predicate Object" where:
- **Subject**: Entity or concept
- **Predicate**: Relationship (is, has, uses, etc.)
- **Object**: Value or related entity

---

### /memory export [format]

Export memory to a snapshot file.

**Examples:**
```bash
/memory export json
/memory export obsidian
```

**Formats:**
- **json**: Export to JSON snapshot file
- **obsidian**: Sync knowledge graph to Obsidian vault

**What it does:**
- Creates exportable snapshot of all memory
- Includes episodes, facts, and procedures
- Can be imported to restore memory state

---

### /memory import [file]

Import memory from a snapshot file.

**Examples:**
```bash
/memory import backup-2025-01-15.json
/memory import ../shared-memory/team-knowledge.json
```

**What it does:**
- Loads memory snapshot from file
- Merges with existing memory
- Updates indexes and embeddings

---

### /memory stats

Display memory system statistics.

**Example:**
```bash
/memory stats
```

**What it shows:**
- Total episodes, facts, procedures
- Success/failure breakdown
- Most accessed episodes
- Most used procedures
- Database size
- Quality metrics

---

### /memory query [type] [filters]

Advanced querying with filters.

**Examples:**
```bash
# Query episodes by outcome
/memory query episodes --outcome=success --limit=10

# Query facts about an entity
/memory query facts --entity="PostgreSQL"

# Query procedures by tag
/memory query procedures --tag="deployment" --min-success-rate=0.8

# Query episodes by agent type
/memory query episodes --agent-type="tester" --outcome=failure
```

**Filter Options:**

**Episodes:**
- `--outcome`: success | failure | partial
- `--agent-type`: Filter by agent type
- `--tags`: Comma-separated tags
- `--min-quality`: Minimum quality score (0-1)
- `--limit`: Max results

**Facts:**
- `--entity`: Entity name
- `--predicate`: Relationship type
- `--min-confidence`: Minimum confidence (0-1)
- `--tags`: Comma-separated tags

**Procedures:**
- `--tag`: Filter by tag
- `--min-success-rate`: Minimum success rate (0-1)
- `--limit`: Max results

---

### /memory consolidate [options]

Consolidate old, low-value memories.

**Examples:**
```bash
# Consolidate episodes older than 30 days
/memory consolidate --older-than=30d --min-quality=0.3

# Keep top 100 most accessed
/memory consolidate --keep-top=100

# Prune low-access memories
/memory consolidate --prune --access-threshold=0
```

**Options:**
- `--older-than`: Age threshold (e.g., 30d, 60d, 90d)
- `--min-quality`: Minimum quality to keep (0-1)
- `--keep-top`: Keep top N most accessed
- `--prune`: Remove low-value memories
- `--access-threshold`: Minimum access count to keep

**What it does:**
- Summarizes or removes old episodes
- Frees up database space
- Preserves high-value memories
- Returns count of removed items

---

### /memory learn [episode-id]

Extract learnings from a specific episode.

**Examples:**
```bash
/memory learn ep-abc123
/memory learn --recent=5  # Learn from 5 most recent episodes
```

**What it does:**
- Extracts facts from episode context
- Creates procedure if successful
- Updates knowledge graph
- Adds reflections/notes

---

### /memory suggest [task]

Get procedure suggestions for a task.

**Examples:**
```bash
/memory suggest "deploy to production"
/memory suggest "fix authentication bug"
/memory suggest "write integration tests"
```

**What it does:**
- Searches for relevant procedures
- Ranks by success rate and usage
- Returns step-by-step instructions
- Shows preconditions and postconditions

---

### /memory reflect [episode-id] [notes]

Add reflections or notes to an episode.

**Examples:**
```bash
/memory reflect ep-abc123 "This approach worked well for large datasets"
/memory reflect ep-def456 "Need to add retry logic for network errors"
```

**What it does:**
- Adds human insights to episode
- Updates episode quality score
- Improves future retrieval relevance

---

### /memory graph [entity]

Visualize knowledge graph for an entity.

**Examples:**
```bash
/memory graph "PostgreSQL"
/memory graph "Authentication"
```

**What it does:**
- Shows all facts about entity
- Displays related entities
- Generates graph visualization
- Exports to Obsidian with Mermaid diagram

---

## Configuration

### Environment Variables

```bash
# Memory database location
export MEMORY_DB_PATH=".claude/orchestration/db/memory.db"

# Namespace for multi-tenant support
export MEMORY_NAMESPACE="default"

# Embedding provider (claude, openai, local)
export MEMORY_EMBEDDING_PROVIDER="local"

# Obsidian vault path for syncing
export OBSIDIAN_VAULT_PATH="C:\Users\MarkusAhling\obsidian"
```

### Database Location

Default: `.claude/orchestration/db/memory.db`

The database is automatically created on first use.

---

## Integration with Agents

Agents can automatically store episodes:

```typescript
import { createMemory } from '.claude/orchestration/memory';

const memory = createMemory();

// Store task execution
await memory.storeExecution(
  'Deploy to production',
  'Deploying version 2.1.0 to k8s cluster',
  actions,
  'success',
  {
    agentType: 'deployer',
    tags: ['deployment', 'production', 'k8s'],
    extractFacts: true,
    createProcedure: true,
  }
);
```

---

## Best Practices

1. **Tag Consistently**: Use consistent tags for better retrieval
2. **Add Reflections**: Add notes to successful/failed episodes for context
3. **Consolidate Regularly**: Run consolidation monthly to manage size
4. **Export Backups**: Export memory snapshots regularly
5. **Namespace Projects**: Use different namespaces for different projects
6. **Quality Scoring**: Higher quality episodes are prioritized in search

---

## Example Workflow

```bash
# Start a task
# ... agent performs work ...

# Store the execution
/memory store "Kubernetes uses namespace isolation"

# Search for similar past experiences
/memory search "kubernetes deployment issues"

# Get procedure suggestions
/memory suggest "deploy to kubernetes"

# After task completion, add reflection
/memory reflect ep-xyz789 "Using rolling updates prevented downtime"

# View statistics
/memory stats

# Consolidate old memories
/memory consolidate --older-than=60d --keep-top=200
```

---

## Technical Details

### Memory Types

1. **Episodic Memory**: Complete task execution records
   - What was done
   - How it was done
   - What the outcome was
   - Context and reflections

2. **Semantic Memory**: Facts and knowledge graph
   - Entity relationships
   - Configuration values
   - Best practices
   - Domain knowledge

3. **Procedural Memory**: Reusable action sequences
   - Abstracted patterns
   - Step-by-step procedures
   - Success rates
   - Preconditions/postconditions

### Search Mechanism

- **Keyword Search**: FTS5 full-text search
- **Semantic Search**: Vector embeddings with cosine similarity
- **Hybrid Search**: Combines both with configurable weights

### Storage

- SQLite database with FTS5 extensions
- WAL mode for better concurrency
- Namespace support for multi-tenant
- Automatic indexing

---

## Troubleshooting

### Database locked
- Ensure no other processes are accessing the database
- Check for stale lock files

### Low search quality
- Generate better embeddings (use Claude or OpenAI provider)
- Add more context to episodes
- Tag consistently

### Large database size
- Run consolidation regularly
- Prune low-quality memories
- Export and archive old data

---

## See Also

- [Agent Memory Documentation](C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\orchestration\memory\README.md)
- [Orchestration System](C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\CLAUDE.md)
- [Agent Activity Logging](C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\orchestration\PROTOCOL.md)
