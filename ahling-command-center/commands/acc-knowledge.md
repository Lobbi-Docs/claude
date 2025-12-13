---
description: Query and update the knowledge graph (Neo4j) with vector search (Qdrant) integration
argument-hint: "<operation> [query] [--embed]"
allowed-tools: ["Bash", "Read"]
---

Manage ACC knowledge graph using Neo4j for structured data and Qdrant for vector embeddings with semantic search capabilities.

## Your Task

You are managing the ACC knowledge graph. Query Neo4j, perform vector searches in Qdrant, create relationships, and integrate with LLMs for RAG (Retrieval-Augmented Generation).

## Arguments

- `operation` (required): Operation (query, search, add, relate, embed, rag)
- `query` (optional): Cypher query or search text
- `--embed` (optional): Generate embeddings for text
- `--collection` (optional): Qdrant collection name
- `--limit` (optional): Result limit (default: 10)

## Steps to Execute

### 1. Check Knowledge Systems

```bash
check_knowledge_systems() {
  echo "=== Knowledge Systems Status ==="
  echo ""

  # Neo4j
  curl -s -u neo4j:${NEO4J_PASSWORD} \
    http://neo4j.ahling.local:7474/db/system/tx/commit > /dev/null && {
    echo "✅ Neo4j: Running"
  } || {
    echo "❌ Neo4j: Not accessible"
  }

  # Qdrant
  curl -s http://qdrant.ahling.local:6333/healthz > /dev/null && {
    echo "✅ Qdrant: Running"
  } || {
    echo "❌ Qdrant: Not accessible"
  }

  # Ollama (for embeddings)
  curl -s http://ollama.ahling.local:11434/api/tags > /dev/null && {
    echo "✅ Ollama: Running (for embeddings)"
  } || {
    echo "❌ Ollama: Not accessible"
  }
}
```

### 2. Query Neo4j Knowledge Graph

```bash
query_neo4j() {
  CYPHER_QUERY=$1

  echo "=== Querying Knowledge Graph ==="
  echo "Query: $CYPHER_QUERY"
  echo ""

  RESULT=$(curl -s -X POST \
    -u neo4j:${NEO4J_PASSWORD} \
    -H "Content-Type: application/json" \
    -d "{\"statements\": [{\"statement\": \"$CYPHER_QUERY\"}]}" \
    http://neo4j.ahling.local:7474/db/neo4j/tx/commit)

  # Display results
  echo "$RESULT" | jq -r '.results[0].data[] |
    .row | @json'
}
```

### 3. Semantic Search with Qdrant

```bash
semantic_search() {
  QUERY_TEXT=$1
  COLLECTION=${2:-knowledge}
  LIMIT=${3:-10}

  echo "=== Semantic Search ==="
  echo "Query: $QUERY_TEXT"
  echo "Collection: $COLLECTION"
  echo ""

  # Generate embedding using Ollama
  echo "Generating embedding..."
  EMBEDDING=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"nomic-embed-text\", \"prompt\": \"$QUERY_TEXT\"}" \
    http://ollama.ahling.local:11434/api/embeddings | jq -r '.embedding')

  # Search Qdrant
  RESULTS=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"vector\": $EMBEDDING,
      \"limit\": $LIMIT,
      \"with_payload\": true
    }" \
    http://qdrant.ahling.local:6333/collections/$COLLECTION/points/search)

  # Display results
  echo "Results:"
  echo "$RESULTS" | jq -r '.result[] |
    "Score: \(.score) - \(.payload.text)"'
}
```

### 4. Add Knowledge to Graph

```bash
add_knowledge() {
  NODE_TYPE=$1
  PROPERTIES=$2

  echo "=== Adding Knowledge Node ==="
  echo "Type: $NODE_TYPE"
  echo ""

  # Create node
  CYPHER="CREATE (n:$NODE_TYPE $PROPERTIES) RETURN n"

  RESULT=$(curl -s -X POST \
    -u neo4j:${NEO4J_PASSWORD} \
    -H "Content-Type: application/json" \
    -d "{\"statements\": [{\"statement\": \"$CYPHER\"}]}" \
    http://neo4j.ahling.local:7474/db/neo4j/tx/commit)

  echo "✅ Node created"
  echo "$RESULT" | jq -r '.results[0].data[]'
}
```

### 5. Create Relationships

```bash
create_relationship() {
  NODE1_ID=$1
  REL_TYPE=$2
  NODE2_ID=$3

  echo "=== Creating Relationship ==="
  echo "$NODE1_ID -[$REL_TYPE]-> $NODE2_ID"
  echo ""

  CYPHER="MATCH (a), (b) WHERE id(a)=$NODE1_ID AND id(b)=$NODE2_ID CREATE (a)-[:$REL_TYPE]->(b)"

  curl -s -X POST \
    -u neo4j:${NEO4J_PASSWORD} \
    -H "Content-Type: application/json" \
    -d "{\"statements\": [{\"statement\": \"$CYPHER\"}]}" \
    http://neo4j.ahling.local:7474/db/neo4j/tx/commit > /dev/null

  echo "✅ Relationship created"
}
```

### 6. Embed and Store Document

```bash
embed_document() {
  TEXT=$1
  COLLECTION=${2:-knowledge}

  echo "=== Embedding Document ==="
  echo "Collection: $COLLECTION"
  echo ""

  # Generate embedding
  EMBEDDING=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"nomic-embed-text\", \"prompt\": \"$TEXT\"}" \
    http://ollama.ahling.local:11434/api/embeddings | jq -r '.embedding')

  # Generate ID
  DOC_ID=$(echo -n "$TEXT" | md5sum | cut -d' ' -f1)

  # Store in Qdrant
  curl -s -X PUT \
    -H "Content-Type: application/json" \
    -d "{
      \"points\": [{
        \"id\": \"$DOC_ID\",
        \"vector\": $EMBEDDING,
        \"payload\": {
          \"text\": \"$TEXT\",
          \"timestamp\": \"$(date -Iseconds)\"
        }
      }]
    }" \
    http://qdrant.ahling.local:6333/collections/$COLLECTION/points > /dev/null

  echo "✅ Document embedded and stored"
  echo "ID: $DOC_ID"
}
```

### 7. RAG Query (Retrieval-Augmented Generation)

```bash
rag_query() {
  QUERY=$1
  MODEL=${2:-llama2}

  echo "=== RAG Query ==="
  echo "Question: $QUERY"
  echo ""

  # Step 1: Retrieve relevant context
  echo "Retrieving context..."
  EMBEDDING=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"nomic-embed-text\", \"prompt\": \"$QUERY\"}" \
    http://ollama.ahling.local:11434/api/embeddings | jq -r '.embedding')

  CONTEXT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"vector\": $EMBEDDING, \"limit\": 3, \"with_payload\": true}" \
    http://qdrant.ahling.local:6333/collections/knowledge/points/search | \
    jq -r '.result[].payload.text' | tr '\n' ' ')

  echo "Context retrieved ($(echo "$CONTEXT" | wc -w) words)"
  echo ""

  # Step 2: Generate answer with LLM
  echo "Generating answer..."
  PROMPT="Based on the following context, answer the question.

Context: $CONTEXT

Question: $QUERY

Answer:"

  ANSWER=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"$MODEL\",
      \"prompt\": \"$PROMPT\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "Answer:"
  echo "$ANSWER"
}
```

## Usage Examples

### Query knowledge graph
```
/acc:knowledge query "MATCH (n:Service) RETURN n.name, n.status LIMIT 10"
```

### Semantic search
```
/acc:knowledge search "how to configure ollama" --collection knowledge
```

### Add knowledge node
```
/acc:knowledge add Service '{"name":"Ollama","status":"running"}'
```

### Embed document
```
/acc:knowledge embed "Ollama is a local LLM server that runs on ACC infrastructure"
```

### RAG query
```
/acc:knowledge rag "What services are running in ACC?"
```

## Expected Outputs

### Query Results
```
=== Querying Knowledge Graph ===
Query: MATCH (n:Service) RETURN n.name, n.status LIMIT 5

["Ollama","running"]
["Neo4j","running"]
["Qdrant","running"]
["Home Assistant","running"]
["Whisper","running"]
```

### Semantic Search
```
=== Semantic Search ===
Query: how to configure ollama
Collection: knowledge

Generating embedding...
Results:
Score: 0.85 - Ollama configuration requires setting GPU layers and model parameters
Score: 0.78 - To configure Ollama, edit the docker-compose file and set environment variables
Score: 0.72 - Ollama supports custom Modelfiles for advanced configuration
```

### RAG Query
```
=== RAG Query ===
Question: What services are running in ACC?

Retrieving context...
Context retrieved (150 words)

Generating answer...
Answer:
The Ahling Command Center is currently running several services including Ollama for local LLM inference, Neo4j for the knowledge graph, Qdrant for vector search, Home Assistant for smart home automation, and Whisper for speech-to-text. These services work together to provide AI-powered automation and voice control capabilities.
```

## Success Criteria

- Neo4j and Qdrant are accessible
- Cypher queries execute successfully
- Embeddings are generated correctly
- Vector search returns relevant results
- Documents can be added and retrieved
- RAG queries produce coherent answers
- Relationships are created properly

## Notes

- Use nomic-embed-text model for embeddings (384 dimensions)
- Neo4j default credentials: neo4j / set in Vault
- Qdrant collections must be created before use
- Vector embeddings improve with better models
- RAG quality depends on context relevance
- Use graph database for structured knowledge
- Use vector database for semantic search
- Combine both for powerful knowledge retrieval
- Consider chunking large documents before embedding
- Monitor Qdrant memory usage for large collections
