# Knowledge & RAG Tools Module

This module provides Neo4j graph database queries, Qdrant vector search, and RAG (Retrieval-Augmented Generation) capabilities for the Ahling Command Center MCP server.

## Overview

The Knowledge Tools module integrates:

- **Neo4j** - Graph database for knowledge graphs and relationships
- **Qdrant** - Vector database for semantic search
- **Ollama** - Local LLM for embeddings and text generation
- **RAG Pipeline** - Complete retrieval-augmented generation workflow

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Knowledge Tools Module                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Neo4j      │  │   Qdrant     │  │   Ollama     │     │
│  │   Client     │  │   Client     │  │   API        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                          │                                 │
│              ┌───────────┴───────────┐                     │
│              │                       │                     │
│     ┌────────▼────────┐    ┌────────▼────────┐           │
│     │  Graph Queries  │    │  Vector Search  │           │
│     │  neo4j_query    │    │  qdrant_search  │           │
│     └─────────────────┘    └─────────────────┘           │
│                                                             │
│     ┌─────────────────────────────────────────┐           │
│     │         RAG Pipeline Tools              │           │
│     │  ┌────────────┐    ┌─────────────────┐ │           │
│     │  │ rag_query  │    │ knowledge_ingest│ │           │
│     │  └────────────┘    └─────────────────┘ │           │
│     └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Available Tools

### 1. neo4j_query

Execute Cypher queries against the Neo4j graph database.

**Parameters:**
- `cypher` (string, required): Cypher query to execute
- `parameters` (object, optional): Query parameters
- `database` (string, optional): Database name (default: "neo4j")
- `readOnly` (boolean, optional): Execute as read-only query (default: true)

**Example:**
```typescript
{
  "cypher": "MATCH (n:Person) WHERE n.name = $name RETURN n",
  "parameters": { "name": "Alice" },
  "readOnly": true
}
```

### 2. qdrant_search

Search Qdrant vector database for similar vectors.

**Parameters:**
- `collection` (string, required): Collection name to search
- `queryVector` (number[], required): Query vector for similarity search
- `limit` (number, optional): Maximum number of results (default: 10)
- `filter` (object, optional): Filter conditions
- `withPayload` (boolean, optional): Include payload in results (default: true)
- `withVector` (boolean, optional): Include vectors in results (default: false)
- `scoreThreshold` (number, optional): Minimum similarity score threshold

**Example:**
```typescript
{
  "collection": "documents",
  "queryVector": [0.1, 0.2, ..., 0.9],
  "limit": 5,
  "scoreThreshold": 0.7
}
```

### 3. rag_query

Retrieve relevant documents from Qdrant and generate an answer using Ollama (RAG).

**Parameters:**
- `query` (string, required): Natural language query
- `collection` (string, required): Qdrant collection to search
- `limit` (number, optional): Number of documents to retrieve (default: 5)
- `ollamaModel` (string, optional): Ollama model for generation (default: "llama2")
- `ollamaUrl` (string, optional): Ollama API URL (default: "http://localhost:11434")
- `embeddingModel` (string, optional): Ollama embedding model (default: "nomic-embed-text")
- `systemPrompt` (string, optional): System prompt for RAG generation
- `scoreThreshold` (number, optional): Minimum similarity score threshold

**Example:**
```typescript
{
  "query": "What is the capital of France?",
  "collection": "knowledge_base",
  "limit": 3,
  "ollamaModel": "llama2",
  "embeddingModel": "nomic-embed-text"
}
```

**Response:**
```json
{
  "answer": "The capital of France is Paris.",
  "sources": [
    {
      "id": "doc_123",
      "score": 0.95,
      "payload": { "text": "Paris is the capital city of France..." }
    }
  ],
  "query": "What is the capital of France?",
  "context": "[Document 1] (Score: 0.950)\nParis is the capital city of France..."
}
```

### 4. knowledge_ingest

Ingest text content by chunking, embedding, and storing in Qdrant (and optionally Neo4j).

**Parameters:**
- `text` (string, required): Text content to ingest
- `collection` (string, required): Qdrant collection name
- `metadata` (object, optional): Metadata to attach to chunks
- `chunkSize` (number, optional): Maximum characters per chunk (default: 500)
- `chunkOverlap` (number, optional): Overlap between chunks (default: 50)
- `embeddingModel` (string, optional): Ollama embedding model (default: "nomic-embed-text")
- `ollamaUrl` (string, optional): Ollama API URL (default: "http://localhost:11434")
- `storeInNeo4j` (boolean, optional): Also store chunks in Neo4j (default: false)
- `neo4jLabel` (string, optional): Neo4j node label (default: "Document")

**Example:**
```typescript
{
  "text": "This is a long document that will be chunked and embedded...",
  "collection": "my_knowledge_base",
  "metadata": {
    "source": "user_upload",
    "topic": "AI"
  },
  "chunkSize": 500,
  "chunkOverlap": 50,
  "storeInNeo4j": true
}
```

**Response:**
```json
{
  "success": true,
  "chunksProcessed": 5,
  "collection": "my_knowledge_base",
  "pointIds": ["1234567890_0", "1234567890_1", "1234567890_2", ...],
  "neo4jStored": true,
  "neo4jResults": 5
}
```

## Client Modules

### Neo4j Client

Located at: `src/clients/neo4j.client.ts`

**Features:**
- Connection pooling with configurable pool size
- Automatic transaction retry logic
- Health check endpoint
- Record serialization (converts Neo4j types to JavaScript types)
- Singleton pattern for global client instance

**Configuration:**
```typescript
{
  uri: "bolt://localhost:7687",
  username: "neo4j",
  password: "your_password",
  database: "neo4j",
  maxConnectionPoolSize: 50
}
```

### Qdrant Client

Located at: `src/clients/qdrant.client.ts`

**Features:**
- Vector search with filtering
- Point upsert and deletion
- Collection management (create, delete, info)
- Scroll and retrieve operations
- Health check endpoint
- Singleton pattern for global client instance

**Configuration:**
```typescript
{
  url: "http://localhost:6333",
  apiKey: "your_api_key", // optional
  timeout: 30000
}
```

## Environment Variables

Required environment variables:

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
NEO4J_MAX_POOL_SIZE=50

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_api_key  # optional
QDRANT_TIMEOUT=30000

# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

See `.env.example` for a complete list of environment variables.

## Usage Examples

### Example 1: Query Neo4j Graph

```typescript
import { neo4jQuery } from './tools/knowledge/index.js';

const result = await neo4jQuery({
  cypher: 'MATCH (p:Person)-[:KNOWS]->(friend) WHERE p.name = $name RETURN friend.name',
  parameters: { name: 'Alice' },
  readOnly: true
});
```

### Example 2: Semantic Search with Qdrant

```typescript
import { qdrantSearch } from './tools/knowledge/index.js';
import { generateEmbedding } from './tools/knowledge/index.js';

// First, generate embedding for your query
const queryEmbedding = await generateEmbedding('machine learning basics');

// Then search
const results = await qdrantSearch({
  collection: 'ml_docs',
  queryVector: queryEmbedding,
  limit: 5,
  scoreThreshold: 0.7
});
```

### Example 3: RAG Query

```typescript
import { ragQuery } from './tools/knowledge/index.js';

const result = await ragQuery({
  query: 'Explain how transformers work in deep learning',
  collection: 'ai_knowledge',
  limit: 5,
  ollamaModel: 'llama2'
});

console.log(result.answer);
console.log('Sources:', result.sources);
```

### Example 4: Ingest Knowledge

```typescript
import { knowledgeIngest } from './tools/knowledge/index.js';

const result = await knowledgeIngest({
  text: `
    Transformers are a type of neural network architecture...
    [long document content]
  `,
  collection: 'ai_knowledge',
  metadata: {
    source: 'research_paper',
    author: 'Vaswani et al.',
    year: 2017
  },
  chunkSize: 500,
  storeInNeo4j: true,
  neo4jLabel: 'ResearchPaper'
});
```

## Integration with MCP Server

The knowledge tools are automatically integrated into the MCP server through the `integration.ts` module:

```typescript
import { initializeKnowledgeClients, handleKnowledgeTool, getKnowledgeTools } from './integration.js';

// Initialize clients
await initializeKnowledgeClients(config);

// Get tools for MCP registration
const knowledgeTools = getKnowledgeTools();

// Handle tool calls
const result = await handleKnowledgeTool('rag_query', args);
```

## Testing

To test the knowledge tools:

1. **Start required services:**
   ```bash
   # Neo4j
   docker run -d --name neo4j \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/your_password \
     neo4j:latest

   # Qdrant
   docker run -d --name qdrant \
     -p 6333:6333 \
     qdrant/qdrant:latest

   # Ollama
   docker run -d --name ollama \
     -p 11434:11434 \
     -v ollama:/root/.ollama \
     ollama/ollama:latest
   ```

2. **Pull Ollama models:**
   ```bash
   docker exec ollama ollama pull llama2
   docker exec ollama ollama pull nomic-embed-text
   ```

3. **Set environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Performance Considerations

- **Neo4j Connection Pool**: Configured for 50 concurrent connections by default
- **Qdrant Timeout**: 30-second timeout for vector operations
- **Chunking**: 500 characters per chunk with 50-character overlap
- **Embeddings**: Batch embedding generation for large documents
- **Ollama**: Local deployment recommended for low-latency RAG queries

## Error Handling

All tools provide detailed error messages:

```typescript
try {
  const result = await neo4jQuery({ cypher: 'INVALID QUERY' });
} catch (error) {
  console.error('Neo4j query failed:', error.message);
  // Error: Neo4j query failed: Invalid Cypher syntax...
}
```

## Security Notes

- Never commit `.env` files to version control
- Use Qdrant API keys for production deployments
- Configure Neo4j authentication properly
- Run Ollama in a secure environment
- Validate all user inputs before querying

## Contributing

When adding new knowledge tools:

1. Add the tool schema in `tools/knowledge/index.ts`
2. Implement the handler function
3. Add the tool to the `knowledgeTools` export
4. Update this README with usage examples
5. Add tests for the new tool

## License

MIT
