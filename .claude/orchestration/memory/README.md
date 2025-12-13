# Agent Memory System

A persistent memory system for AI agents that enables learning from past experiences, building knowledge graphs, and reusing successful action patterns.

## Overview

The Agent Memory System provides three types of memory inspired by human cognition:

1. **Episodic Memory**: Records of complete task executions (what happened, when, and why)
2. **Semantic Memory**: Facts and relationships in a knowledge graph
3. **Procedural Memory**: Reusable action sequences abstracted from successful episodes

## Features

- **Vector-based semantic search** with hybrid keyword + embedding matching
- **Full-text search** using SQLite FTS5 for fast keyword queries
- **Knowledge graph** with subject-predicate-object triples
- **Automatic fact extraction** from episode context
- **Procedure abstraction** from successful episodes
- **Quality scoring** for episodes based on outcomes and success rates
- **Memory consolidation** to manage database size
- **Export/import** for backup and sharing
- **Namespace support** for multi-tenant usage
- **Obsidian integration** for knowledge graph visualization

## Architecture

```
.claude/orchestration/memory/
├── types.ts                  # Type definitions
├── memory-index.ts           # Vector storage and hybrid search
├── episodic-memory.ts        # Task execution records
├── semantic-memory.ts        # Knowledge graph and facts
├── procedural-memory.ts      # Reusable procedures
└── index.ts                  # Unified interface

.claude/orchestration/db/
└── memory.sql                # SQLite schema with FTS5

.claude/commands/
└── memory.md                 # CLI commands
```

## Installation

### Prerequisites

```bash
npm install better-sqlite3 uuid
```

Or with yarn:

```bash
yarn add better-sqlite3 uuid
```

### Database Initialization

The database is automatically initialized on first use. The schema is loaded from `memory.sql`.

```typescript
import { createMemory } from '.claude/orchestration/memory';

const memory = createMemory('default');
await memory.initialize();
```

## Quick Start

### Basic Usage

```typescript
import { createMemory } from '.claude/orchestration/memory';

// Create memory instance
const memory = createMemory('my-project');

// Initialize database
await memory.initialize();

// Store a task execution
const episodeId = await memory.storeExecution(
  'Deploy application to production',
  'Deploying version 2.1.0 to Kubernetes cluster',
  [
    {
      id: 'action-1',
      type: 'helm_upgrade',
      description: 'Upgrade helm release',
      timestamp: new Date(),
      success: true,
    },
    {
      id: 'action-2',
      type: 'verify_deployment',
      description: 'Verify pods are running',
      timestamp: new Date(),
      success: true,
    },
  ],
  'success',
  {
    agentType: 'deployer',
    tags: ['deployment', 'production', 'k8s'],
    extractFacts: true,
    createProcedure: true,
  }
);

// Search memory
const results = await memory.search('kubernetes deployment');

// Get statistics
const stats = memory.getStats();
console.log(stats);
```

### Episodic Memory

```typescript
// Store an episode
const episode = await memory.episodic.store({
  taskDescription: 'Fix authentication bug',
  context: 'Users unable to login after OAuth update',
  actions: [
    {
      id: 'a1',
      type: 'code_analysis',
      description: 'Analyzed OAuth callback handler',
      timestamp: new Date(),
      success: true,
    },
    {
      id: 'a2',
      type: 'code_fix',
      description: 'Fixed token validation logic',
      timestamp: new Date(),
      success: true,
    },
  ],
  outcome: 'success',
  tags: ['bug-fix', 'authentication', 'oauth'],
  notes: 'Token expiry validation was incorrectly checking UTC vs local time',
});

// Retrieve similar episodes
const similar = await memory.episodic.retrieveSimilar(
  'oauth authentication issues',
  5
);

// Query episodes
const successful = memory.episodic.getSuccessful(10);
const failed = memory.episodic.getFailed(10);

// Add reflections
memory.episodic.addNotes(
  episodeId,
  'Always check timezone handling in token validation'
);
```

### Semantic Memory

```typescript
// Add facts manually
memory.semantic.addFact({
  subject: 'PostgreSQL',
  predicate: 'uses',
  object: 'port 5432',
  confidence: 0.95,
  source: 'configuration',
  tags: ['database', 'postgres'],
});

// Add relationships
memory.semantic.addRelationship(
  'Authentication Service',
  'depends_on',
  'PostgreSQL',
  0.9
);

// Extract facts from text
const facts = memory.semantic.extractFacts(
  'The application uses Redis for caching. Redis runs on port 6379.',
  'documentation'
);

// Query entity knowledge
const knowledge = memory.semantic.queryEntity('PostgreSQL');
console.log(knowledge.facts);
console.log(knowledge.related);

// Get knowledge graph
const graph = memory.semantic.getKnowledgeGraph({
  subjects: ['Authentication Service'],
  minConfidence: 0.7,
});

// Sync to Obsidian
await memory.semantic.syncToObsidian(
  'C:\\Users\\MarkusAhling\\obsidian'
);
```

### Procedural Memory

```typescript
// Record a procedure from an episode
const procedure = memory.procedural.recordProcedure(
  'task-123',
  [
    {
      type: 'git_pull',
      description: 'Pull latest changes',
      parameters: { branch: 'main' },
    },
    {
      type: 'npm_install',
      description: 'Install dependencies',
    },
    {
      type: 'npm_test',
      description: 'Run tests',
    },
    {
      type: 'npm_build',
      description: 'Build application',
    },
  ]
);

// Get procedure suggestions
const suggestions = memory.procedural.suggestProcedures(
  'deploy to production'
);

// Get procedure by ID
const proc = memory.procedural.getProcedure(procedureId);

// Update procedure
memory.procedural.updateProcedure(procedureId, {
  type: 'add_step',
  step: {
    order: 4,
    description: 'Run smoke tests',
    actionType: 'test',
  },
  reason: 'Added smoke tests to verify deployment',
  author: 'agent-deployer',
});

// Record usage
memory.procedural.recordUsage(procedureId, true); // success
```

## Memory Index and Search

### Vector Search

The memory index supports semantic search using vector embeddings:

```typescript
import { MemoryIndex } from '.claude/orchestration/memory';

const index = new MemoryIndex(dbConfig, embeddingConfig);

// Generate embedding
const embedding = await index.embed('kubernetes deployment error');

// Store vector
index.store('episode-123', embedding, { type: 'episode' });

// Hybrid search (keyword + semantic)
const results = await index.search('authentication bug', {
  limit: 10,
  minSimilarity: 0.5,
  hybridWeights: {
    keyword: 0.4,
    semantic: 0.6,
  },
});
```

### Embedding Providers

Configure the embedding provider in the constructor:

```typescript
const embeddingConfig = {
  provider: 'claude',  // 'claude', 'openai', or 'local'
  model: 'claude-3-sonnet-20240229',
  apiKey: process.env.ANTHROPIC_API_KEY,
  dimensions: 384,
  batchSize: 32,
};
```

**Note**: The current implementation uses a simple hash-based embedding for demonstration. In production, integrate with Claude, OpenAI, or a local embedding model.

## Database Schema

The system uses SQLite with the following key tables:

- **episodes**: Task execution records
- **episode_tags**: Tags for categorization
- **actions**: Individual actions within episodes
- **episode_embeddings**: Vector embeddings for semantic search
- **facts**: Knowledge graph triples
- **fact_tags**: Fact categorization
- **procedures**: Reusable action sequences
- **procedure_steps**: Steps within procedures
- **procedure_tags**: Procedure categorization

### FTS5 Indexes

Full-text search is enabled on:
- `episodes_fts`: Episode descriptions, context, notes
- `facts_fts`: Subject, predicate, object
- `procedures_fts`: Name, trigger pattern, description

## Memory Consolidation

Over time, memory can accumulate. Use consolidation to manage size:

```typescript
// Consolidate episodes older than 60 days with quality < 0.3
const removed = memory.episodic.consolidate({
  olderThan: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  minQuality: 0.3,
  keepTopN: 100,
  strategy: 'aggregate',
});

console.log(`Removed ${removed} old episodes`);

// Prune low-access memories
const pruned = memory.episodic.prune(0);
console.log(`Pruned ${pruned} unused episodes`);

// Clean up low-confidence facts
const factsPruned = memory.semantic.pruneLowConfidence(0.3);
```

## Export and Import

### Export to JSON

```typescript
const snapshot = memory.exportSnapshot();

// Save to file
const fs = require('fs');
fs.writeFileSync(
  'memory-backup.json',
  JSON.stringify(snapshot, null, 2)
);
```

### Import from JSON

```typescript
const snapshot = JSON.parse(
  fs.readFileSync('memory-backup.json', 'utf-8')
);

memory.importSnapshot(snapshot);
```

### Sync to Obsidian

```typescript
// Sync knowledge graph to Obsidian vault
await memory.semantic.syncToObsidian(
  process.env.OBSIDIAN_VAULT_PATH
);
```

Creates markdown files in `System/Knowledge-Graph/` with:
- Entity facts
- Related entities
- Mermaid graph diagrams

## Namespace Support

Use namespaces to isolate memory for different projects:

```typescript
// Project A memory
const memoryA = createMemory('project-a');

// Project B memory
const memoryB = createMemory('project-b');

// They use the same database but separate namespaces
```

## Statistics and Monitoring

```typescript
const stats = memory.getStats();

console.log(`Episodes: ${stats.episodeCount}`);
console.log(`Facts: ${stats.factCount}`);
console.log(`Procedures: ${stats.procedureCount}`);
console.log(`Avg Quality: ${stats.avgEpisodeQuality}`);
console.log(`Outcome Breakdown:`, stats.outcomeBreakdown);
```

## CLI Commands

See [.claude/commands/memory.md](C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\commands\memory.md) for available CLI commands:

- `/memory search [query]` - Search memory
- `/memory store [fact]` - Store a fact
- `/memory export [format]` - Export memory
- `/memory stats` - View statistics
- `/memory consolidate` - Clean up old memories
- And more...

## Integration with Agent Orchestration

The memory system integrates with the agent orchestration protocol:

```typescript
import { AgentActivity } from '.claude/orchestration/types/agent-activity';
import { createMemory } from '.claude/orchestration/memory';

const memory = createMemory();

// After agent completes a task
const activity: AgentActivity = {
  // ... activity data
};

// Store the episode
await memory.storeExecution(
  activity.currentAction,
  `Agent ${activity.agentType} - Task ${activity.taskId}`,
  actions,
  activity.status === 'completed' ? 'success' : 'failure',
  {
    agentType: activity.agentType,
    tags: [activity.phase, activity.agentType],
    extractFacts: true,
    createProcedure: activity.status === 'completed',
  }
);
```

## Best Practices

### Tagging Strategy

Use consistent tags for better retrieval:

```typescript
const tags = [
  // Category
  'deployment',
  'bug-fix',
  'feature',

  // Technology
  'kubernetes',
  'postgres',
  'react',

  // Status
  'production',
  'staging',
  'dev',

  // Agent type
  'deployer',
  'tester',
  'coder',
];
```

### Quality Scoring

Episodes are automatically scored based on:
- Outcome (success = +0.3, partial = +0.1)
- Action success rate (+0.2)
- Base score of 0.5

Improve scores by:
- Adding detailed notes
- Tagging appropriately
- Recording complete context

### Memory Lifecycle

1. **Record**: Store episodes during task execution
2. **Search**: Retrieve relevant past experiences
3. **Learn**: Extract facts and procedures
4. **Consolidate**: Clean up old/low-value memories
5. **Export**: Back up periodically

### Performance Optimization

For large memory databases:

1. **Use indexes**: Queries on tags, timestamps are indexed
2. **Limit results**: Always specify a limit for queries
3. **Consolidate regularly**: Monthly or when DB > 100MB
4. **Use namespaces**: Separate projects to reduce search space
5. **Batch operations**: Use transactions for multiple inserts

## Troubleshooting

### Database Locked

If you get "database is locked" errors:

```typescript
// Ensure WAL mode is enabled
const config = {
  dbPath: 'memory.db',
  enableWAL: true,  // This helps
};

// Close connections when done
memory.close();
```

### Low Search Quality

Improve search relevance:

1. **Use better embeddings**: Switch from 'local' to 'claude' or 'openai'
2. **Add more context**: Include detailed task descriptions
3. **Tag consistently**: Use standardized tags
4. **Add reflections**: Notes improve semantic matching

### Large Database Size

Monitor size and consolidate:

```bash
# Check size
ls -lh .claude/orchestration/db/memory.db

# Consolidate
/memory consolidate --older-than=60d --keep-top=200
```

## API Reference

### AgentMemory

Main class combining all memory types.

**Methods:**
- `initialize()`: Initialize database schema
- `storeExecution(...)`: Store complete task execution
- `search(query, options)`: Search across all memory types
- `getStats()`: Get comprehensive statistics
- `exportSnapshot()`: Export memory snapshot
- `importSnapshot(snapshot)`: Import memory snapshot
- `close()`: Close database connections

### EpisodicMemory

Manages task execution records.

**Methods:**
- `store(episode)`: Store new episode
- `retrieve(id)`: Get episode by ID
- `retrieveSimilar(query, limit)`: Vector search
- `consolidate(options)`: Consolidate old episodes
- `prune(threshold)`: Remove low-value episodes
- `query(filters)`: Query with filters
- `addNotes(id, notes)`: Add reflections
- `getStats()`: Get statistics

### SemanticMemory

Manages knowledge graph and facts.

**Methods:**
- `extractFacts(text, source)`: Extract facts from text
- `addFact(fact)`: Add fact to graph
- `addRelationship(from, relation, to)`: Add relationship
- `queryEntity(entity)`: Get entity knowledge
- `getFactsAbout(subject)`: Get facts about subject
- `getKnowledgeGraph(options)`: Get graph triples
- `syncToObsidian(vaultPath)`: Sync to Obsidian
- `searchFacts(query, limit)`: FTS search
- `getStats()`: Get statistics

### ProceduralMemory

Manages reusable procedures.

**Methods:**
- `recordProcedure(taskId, actions)`: Record from episode
- `abstractProcedure(episodes)`: Abstract from multiple episodes
- `suggestProcedures(task)`: Get suggestions
- `getProcedure(id)`: Get by ID
- `updateProcedure(id, changes)`: Version procedure
- `recordUsage(id, success)`: Track usage
- `getAllProcedures(options)`: Get all procedures
- `getStats()`: Get statistics

### MemoryIndex

Manages vector storage and search.

**Methods:**
- `embed(text)`: Generate embedding
- `store(id, vector, metadata)`: Store vector
- `getVector(id)`: Retrieve vector
- `search(query, options)`: Hybrid search
- `setNamespace(namespace)`: Set namespace
- `export()`: Export snapshot
- `import(snapshot)`: Import snapshot
- `close()`: Close connection

## Examples

See the test file for comprehensive examples:

```bash
C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\orchestration\memory\test-memory.ts
```

## Contributing

When extending the memory system:

1. **Add types** to `types.ts`
2. **Update schema** in `memory.sql`
3. **Add methods** to appropriate class
4. **Update tests**
5. **Document in README**

## License

Part of the Claude Orchestration System.

## See Also

- [Memory Commands](..\..\..\commands\memory.md)
- [Agent Activity Types](C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\orchestration\types\agent-activity.ts)
- [Orchestration Protocol](C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\orchestration\PROTOCOL.md)
- [Obsidian Integration](C:\Users\MarkusAhling\obsidian\System\Claude-Instructions\Agent-Activity-Integration.md)
