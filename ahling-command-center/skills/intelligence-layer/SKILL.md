# Intelligence Layer Skill

This skill provides comprehensive knowledge for deploying and managing the Ahling Command Center intelligence layer: Neo4j knowledge graph, Qdrant vector database, CrewAI multi-agent orchestration, Temporal workflow engine, and AnythingLLM for RAG.

## Trigger Phrases

- "neo4j", "knowledge graph", "cypher query", "graph database"
- "qdrant", "vector database", "embeddings", "semantic search"
- "crewai", "crew ai", "agent crew", "multi-agent"
- "temporal", "workflow", "durable execution"
- "anythingllm", "rag", "retrieval augmented generation"
- "knowledge base", "context retrieval"

## Intelligence Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     INTELLIGENCE LAYER (Phase 6)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                    KNOWLEDGE STORAGE                           │    │
│   │   ┌─────────────┐              ┌─────────────┐                │    │
│   │   │   Neo4j     │◄────────────▶│   Qdrant    │                │    │
│   │   │   (Graph)   │              │  (Vectors)  │                │    │
│   │   └─────────────┘              └─────────────┘                │    │
│   │          │                            │                        │    │
│   │          └──────────┬─────────────────┘                        │    │
│   │                     ▼                                          │    │
│   │              ┌─────────────┐                                   │    │
│   │              │ AnythingLLM │                                   │    │
│   │              │    (RAG)    │                                   │    │
│   │              └─────────────┘                                   │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                    ORCHESTRATION                               │    │
│   │   ┌─────────────┐              ┌─────────────┐                │    │
│   │   │   CrewAI    │◄────────────▶│  Temporal   │                │    │
│   │   │  (Agents)   │              │ (Workflows) │                │    │
│   │   └─────────────┘              └─────────────┘                │    │
│   │          │                            │                        │    │
│   │          └──────────┬─────────────────┘                        │    │
│   │                     ▼                                          │    │
│   │              ┌─────────────┐                                   │    │
│   │              │   Ollama    │                                   │    │
│   │              │   (LLM)     │                                   │    │
│   │              └─────────────┘                                   │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Neo4j Knowledge Graph

### Docker Compose

```yaml
services:
  neo4j:
    image: neo4j:5.15-community
    container_name: neo4j
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      NEO4J_dbms_memory_heap_initial__size: 2G
      NEO4J_dbms_memory_heap_max__size: 4G
      NEO4J_dbms_memory_pagecache_size: 2G
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_plugins:/plugins
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
```

### Knowledge Graph Schema

```cypher
// Core entity types for ACC
CREATE CONSTRAINT entity_id IF NOT EXISTS
FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Device nodes
CREATE (d:Device {
  id: "device_123",
  name: "Living Room Light",
  type: "light",
  location: "living_room",
  ha_entity_id: "light.living_room",
  created: datetime()
});

// Event nodes
CREATE (e:Event {
  id: "event_123",
  type: "motion_detected",
  source: "camera_front",
  timestamp: datetime(),
  confidence: 0.95
});

// Person nodes
CREATE (p:Person {
  id: "person_markus",
  name: "Markus",
  role: "owner",
  face_embedding_id: "qdrant_123"
});

// Relationships
MATCH (d:Device), (l:Location)
WHERE d.location = l.name
CREATE (d)-[:LOCATED_IN]->(l);

MATCH (e:Event), (d:Device)
WHERE e.source = d.id
CREATE (e)-[:TRIGGERED_BY]->(d);

MATCH (e:Event), (p:Person)
WHERE e.detected_person = p.id
CREATE (e)-[:DETECTED]->(p);
```

### Common Cypher Queries

```cypher
// Get all devices in a location with their recent events
MATCH (d:Device)-[:LOCATED_IN]->(l:Location {name: $location})
OPTIONAL MATCH (e:Event)-[:TRIGGERED_BY]->(d)
WHERE e.timestamp > datetime() - duration('PT1H')
RETURN d, collect(e) as events;

// Find correlated events (motion → person detected)
MATCH path = (e1:Event)-[:FOLLOWED_BY*1..3]->(e2:Event)
WHERE e1.type = 'motion_detected'
  AND e2.type = 'person_detected'
  AND duration.between(e1.timestamp, e2.timestamp).seconds < 30
RETURN path;

// Get person's activity timeline
MATCH (p:Person {name: $name})<-[:DETECTED]-(e:Event)
WHERE e.timestamp > datetime() - duration('P1D')
RETURN e ORDER BY e.timestamp DESC LIMIT 50;

// Find automation suggestions
MATCH (e1:Event)-[:TRIGGERS]->(a:Action)
WHERE e1.type = $event_type
WITH a, count(*) as frequency
ORDER BY frequency DESC
RETURN a.name, frequency LIMIT 5;
```

## Qdrant Vector Database

### Docker Compose

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # gRPC
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      QDRANT__SERVICE__GRPC_PORT: 6334
      QDRANT__SERVICE__HTTP_PORT: 6333
      QDRANT__LOG_LEVEL: INFO
    deploy:
      resources:
        limits:
          memory: 4G
```

### Collection Setup

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(host="qdrant", port=6333)

# Create collections for different data types
collections = {
    "documents": {
        "size": 768,  # nomic-embed-text dimension
        "distance": Distance.COSINE
    },
    "conversations": {
        "size": 768,
        "distance": Distance.COSINE
    },
    "events": {
        "size": 768,
        "distance": Distance.COSINE
    },
    "face_embeddings": {
        "size": 512,  # CompreFace dimension
        "distance": Distance.COSINE
    }
}

for name, config in collections.items():
    client.create_collection(
        collection_name=name,
        vectors_config=VectorParams(
            size=config["size"],
            distance=config["distance"]
        )
    )
```

### Vector Operations

```python
async def embed_and_store(text: str, collection: str, metadata: dict):
    """Embed text using Ollama and store in Qdrant."""

    # Generate embedding
    embedding = await ollama.embed(
        model="nomic-embed-text",
        input=text
    )

    # Store in Qdrant
    point_id = str(uuid.uuid4())
    client.upsert(
        collection_name=collection,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding["embedding"],
                payload={
                    "text": text,
                    "timestamp": datetime.now().isoformat(),
                    **metadata
                }
            )
        ]
    )

    return point_id


async def semantic_search(query: str, collection: str, limit: int = 5):
    """Search for similar vectors."""

    # Embed query
    query_embedding = await ollama.embed(
        model="nomic-embed-text",
        input=query
    )

    # Search
    results = client.search(
        collection_name=collection,
        query_vector=query_embedding["embedding"],
        limit=limit,
        with_payload=True
    )

    return results
```

## CrewAI Multi-Agent

### Docker Compose

```yaml
services:
  crewai:
    build:
      context: ./crewai
      dockerfile: Dockerfile
    container_name: crewai
    environment:
      OLLAMA_URL: http://ollama:11434
      NEO4J_URL: bolt://neo4j:7687
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      QDRANT_URL: http://qdrant:6333
    volumes:
      - ./crewai/crews:/app/crews
      - crewai_data:/app/data
    ports:
      - "8080:8080"
```

### Crew Definition

```python
from crewai import Agent, Task, Crew, Process
from langchain_community.llms import Ollama

# Initialize Ollama
llm = Ollama(
    model="llama3.2:7b",
    base_url="http://ollama:11434"
)

# Define agents
home_analyst = Agent(
    role="Home Analyst",
    goal="Analyze home sensor data and identify patterns",
    backstory="Expert in smart home analytics with deep knowledge of sensor patterns.",
    llm=llm,
    verbose=True
)

automation_designer = Agent(
    role="Automation Designer",
    goal="Design optimal home automations based on patterns",
    backstory="Specialist in creating efficient and user-friendly automations.",
    llm=llm,
    verbose=True
)

energy_optimizer = Agent(
    role="Energy Optimizer",
    goal="Optimize energy usage while maintaining comfort",
    backstory="Expert in energy efficiency and sustainable home management.",
    llm=llm,
    verbose=True
)

# Define tasks
analyze_patterns = Task(
    description="Analyze the last 7 days of sensor data to identify usage patterns.",
    agent=home_analyst,
    expected_output="List of identified patterns with confidence scores"
)

design_automations = Task(
    description="Based on patterns, design 3 new automations to improve efficiency.",
    agent=automation_designer,
    expected_output="YAML definitions for 3 automations"
)

optimize_energy = Task(
    description="Review automations and optimize for energy savings.",
    agent=energy_optimizer,
    expected_output="Optimized automation configs with energy impact analysis"
)

# Create crew
home_optimization_crew = Crew(
    agents=[home_analyst, automation_designer, energy_optimizer],
    tasks=[analyze_patterns, design_automations, optimize_energy],
    process=Process.sequential,
    verbose=True
)
```

### Running Crews

```python
async def run_home_optimization():
    """Run the home optimization crew."""

    # Get recent data from Neo4j
    events = await neo4j.query("""
        MATCH (e:Event)
        WHERE e.timestamp > datetime() - duration('P7D')
        RETURN e
        ORDER BY e.timestamp
    """)

    # Run crew
    result = home_optimization_crew.kickoff(
        inputs={
            "sensor_data": events,
            "current_automations": await ha.get_automations()
        }
    )

    return result
```

## Temporal Workflow Engine

### Docker Compose

```yaml
services:
  temporal:
    image: temporalio/auto-setup:1.22
    container_name: temporal
    environment:
      DB: postgresql
      DB_PORT: 5432
      POSTGRES_USER: temporal
      POSTGRES_PWD: ${TEMPORAL_DB_PASSWORD}
      POSTGRES_SEEDS: postgres
      DYNAMIC_CONFIG_FILE_PATH: /etc/temporal/dynamicconfig.yaml
    ports:
      - "7233:7233"
    volumes:
      - ./temporal/dynamicconfig.yaml:/etc/temporal/dynamicconfig.yaml
    depends_on:
      - postgres

  temporal-ui:
    image: temporalio/ui:2.21
    container_name: temporal-ui
    environment:
      TEMPORAL_ADDRESS: temporal:7233
      TEMPORAL_CORS_ORIGINS: http://localhost:3000
    ports:
      - "8088:8080"
    depends_on:
      - temporal

  temporal-worker:
    build:
      context: ./temporal/worker
    container_name: temporal-worker
    environment:
      TEMPORAL_ADDRESS: temporal:7233
      OLLAMA_URL: http://ollama:11434
    depends_on:
      - temporal
```

### Workflow Definitions

```python
from temporalio import workflow, activity
from temporalio.client import Client
from datetime import timedelta

@activity.defn
async def analyze_home_state():
    """Get current home state from HA."""
    states = await ha.get_all_states()
    return {"states": states, "timestamp": datetime.now().isoformat()}

@activity.defn
async def generate_briefing(state_data: dict):
    """Generate morning briefing using Ollama."""
    prompt = f"Generate a morning briefing based on: {state_data}"
    response = await ollama.generate(
        model="llama3.2:7b",
        prompt=prompt
    )
    return response["response"]

@activity.defn
async def speak_briefing(text: str):
    """Speak briefing via Piper TTS."""
    await piper.speak(text)

@workflow.defn
class MorningBriefingWorkflow:
    @workflow.run
    async def run(self) -> str:
        # Get home state
        state = await workflow.execute_activity(
            analyze_home_state,
            start_to_close_timeout=timedelta(seconds=30)
        )

        # Generate briefing
        briefing = await workflow.execute_activity(
            generate_briefing,
            args=[state],
            start_to_close_timeout=timedelta(seconds=60)
        )

        # Speak briefing
        await workflow.execute_activity(
            speak_briefing,
            args=[briefing],
            start_to_close_timeout=timedelta(seconds=120)
        )

        return briefing
```

### Scheduling Workflows

```python
async def schedule_morning_briefing():
    """Schedule daily morning briefing."""
    client = await Client.connect("temporal:7233")

    # Create schedule
    await client.create_schedule(
        "morning-briefing",
        Schedule(
            action=ScheduleActionStartWorkflow(
                MorningBriefingWorkflow.run,
                id="morning-briefing-daily",
                task_queue="home-automation"
            ),
            spec=ScheduleSpec(
                cron_expressions=["0 7 * * *"]  # 7 AM daily
            )
        )
    )
```

## AnythingLLM for RAG

### Docker Compose

```yaml
services:
  anythingllm:
    image: mintplexlabs/anythingllm:latest
    container_name: anythingllm
    environment:
      STORAGE_DIR: /app/server/storage
      LLM_PROVIDER: ollama
      OLLAMA_BASE_PATH: http://ollama:11434
      OLLAMA_MODEL_PREF: llama3.2:7b
      EMBEDDING_ENGINE: ollama
      EMBEDDING_MODEL_PREF: nomic-embed-text
      VECTOR_DB: qdrant
      QDRANT_ENDPOINT: http://qdrant:6333
    ports:
      - "3001:3001"
    volumes:
      - anythingllm_data:/app/server/storage
```

### Workspace Configuration

```python
# AnythingLLM API for workspace management
import httpx

async def create_workspace(name: str, documents: list[str]):
    """Create an AnythingLLM workspace with documents."""

    async with httpx.AsyncClient() as client:
        # Create workspace
        workspace = await client.post(
            "http://anythingllm:3001/api/v1/workspace/new",
            json={"name": name}
        )
        workspace_slug = workspace.json()["workspace"]["slug"]

        # Upload documents
        for doc_path in documents:
            with open(doc_path, "rb") as f:
                await client.post(
                    f"http://anythingllm:3001/api/v1/workspace/{workspace_slug}/upload",
                    files={"file": f}
                )

        return workspace_slug


async def query_workspace(workspace_slug: str, query: str):
    """Query a workspace using RAG."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://anythingllm:3001/api/v1/workspace/{workspace_slug}/chat",
            json={
                "message": query,
                "mode": "chat"  # or "query" for just retrieval
            }
        )
        return response.json()
```

## Hybrid RAG Pipeline

Combine Neo4j (structured) + Qdrant (semantic) for powerful RAG:

```python
async def hybrid_rag_query(query: str, context_type: str = "all"):
    """Perform hybrid RAG using graph + vector search."""

    # 1. Embed query
    query_embedding = await ollama.embed(
        model="nomic-embed-text",
        input=query
    )

    # 2. Vector search in Qdrant
    vector_results = await qdrant.search(
        collection_name="documents",
        query_vector=query_embedding["embedding"],
        limit=5
    )

    # 3. Extract entities for graph search
    entities = await extract_entities(query)

    # 4. Graph traversal in Neo4j
    graph_context = await neo4j.query("""
        MATCH (e:Entity)-[r*1..2]-(related)
        WHERE e.name IN $entities
        RETURN e, r, related
        LIMIT 20
    """, {"entities": entities})

    # 5. Combine contexts
    combined_context = {
        "semantic": [r.payload["text"] for r in vector_results],
        "structured": format_graph_results(graph_context)
    }

    # 6. Generate response with Ollama
    response = await ollama.chat(
        model="llama3.2:70b",
        messages=[
            {
                "role": "system",
                "content": f"Use this context to answer: {combined_context}"
            },
            {"role": "user", "content": query}
        ]
    )

    return response["message"]["content"]
```

## Resource Allocation

### Memory Budget (61GB)

| Component | RAM | Notes |
|-----------|-----|-------|
| Neo4j | 8GB | heap + pagecache |
| Qdrant | 4GB | vector storage |
| Temporal | 2GB | workflow engine |
| AnythingLLM | 2GB | RAG service |
| CrewAI | 1GB | agent runtime |
| **Total** | **17GB** | |

## Best Practices

1. **Neo4j**: Index properties used in WHERE clauses
2. **Qdrant**: Use payload filtering to reduce search space
3. **Temporal**: Design idempotent activities
4. **AnythingLLM**: Chunk documents appropriately (512-1024 tokens)
5. **CrewAI**: Use specific agent roles, avoid overlap

## Related Skills

- [[ollama-mastery]] - LLM backend for all components
- [[microsoft-agents]] - Alternative agent framework
- [[home-assistant-brain]] - Data source for knowledge graph

## References

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [Temporal Documentation](https://docs.temporal.io/)
- [AnythingLLM Documentation](https://docs.useanything.com/)
