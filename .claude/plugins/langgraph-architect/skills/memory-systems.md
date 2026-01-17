# Memory Systems Skill

```yaml
---
category: infrastructure
activation_keywords:
  - memory
  - persistence
  - checkpointing
  - checkpoint
  - vector store
  - semantic memory
  - long-term memory
  - short-term memory
  - memory architecture
description: Comprehensive guide to memory and persistence strategies in LangGraph including checkpointing, vector stores, and production memory architectures
---
```

## Overview

Memory systems enable LangGraph applications to persist state across executions, implement human-in-the-loop workflows, and provide long-term context. This skill covers checkpointing strategies, semantic memory integration, and production memory architectures.

## Memory Types

### 1. Short-Term Memory (Checkpointing)

**Purpose:** Persist graph state between executions within a conversation/session.

**Use Cases:**
- Resume interrupted workflows
- Human-in-the-loop patterns
- Error recovery
- Multi-turn conversations
- Time-travel debugging

### 2. Long-Term Memory (Semantic Memory)

**Purpose:** Store and retrieve relevant historical information across sessions.

**Use Cases:**
- User preferences and history
- Knowledge base integration
- Learning from past interactions
- Contextual personalization

### 3. Working Memory (In-Process State)

**Purpose:** Temporary state during graph execution.

**Use Cases:**
- Current execution context
- Intermediate results
- Routing decisions

---

## Checkpointing Strategies

### 1. In-Memory Checkpointer (Development)

**When to Use:**
- Development and testing
- Prototyping
- Single-process applications
- No persistence needed across restarts

**Pros:**
- Fastest performance
- Simple setup
- No external dependencies

**Cons:**
- Lost on process restart
- Not suitable for production
- No distributed support

**Implementation:**

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph

# Create in-memory checkpointer
memory = MemorySaver()

# Compile graph with checkpointer
graph = workflow.compile(checkpointer=memory)

# Use with thread_id
config = {"configurable": {"thread_id": "conversation-123"}}

# Execute with checkpointing
result = graph.invoke(input_data, config=config)

# Resume from checkpoint
continued = graph.invoke(None, config=config)
```

---

### 2. SQLite Checkpointer (Single-Node Production)

**When to Use:**
- Production single-node deployments
- Need persistence across restarts
- Local file-based storage
- Moderate scale (< 10k sessions)

**Pros:**
- Persistent across restarts
- No external dependencies
- Simple setup
- Good performance for single node

**Cons:**
- Single node only (file-based)
- Limited concurrency
- Not suitable for distributed systems

**Implementation:**

```python
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import StateGraph

# Create SQLite checkpointer
# Option 1: File-based
checkpointer = SqliteSaver.from_conn_string("checkpoints.db")

# Option 2: In-memory SQLite (for testing)
checkpointer = SqliteSaver.from_conn_string(":memory:")

# Compile graph
graph = workflow.compile(checkpointer=checkpointer)

# Use with thread_id
config = {"configurable": {"thread_id": "user-456"}}
result = graph.invoke(input_data, config=config)

# Access checkpoint history
history = list(graph.get_state_history(config))
for checkpoint in history:
    print(f"Checkpoint {checkpoint.id}: {checkpoint.values}")
```

**Setup:**

```python
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3

def create_sqlite_checkpointer(db_path: str) -> SqliteSaver:
    """Create SQLite checkpointer with connection pool"""

    # Create connection
    conn = sqlite3.connect(
        db_path,
        check_same_thread=False,
        timeout=10.0
    )

    # Create checkpointer
    checkpointer = SqliteSaver(conn)

    return checkpointer

# Usage
checkpointer = create_sqlite_checkpointer("data/checkpoints.db")
graph = workflow.compile(checkpointer=checkpointer)
```

---

### 3. PostgreSQL Checkpointer (Distributed Production)

**When to Use:**
- Production distributed deployments
- High concurrency requirements
- Multiple server instances
- Large scale (> 10k sessions)

**Pros:**
- Distributed support
- High concurrency
- Robust and scalable
- Transaction support
- Production-grade

**Cons:**
- Requires PostgreSQL server
- More complex setup
- Network overhead

**Implementation:**

```python
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg2.pool import SimpleConnectionPool

# Create connection pool
connection_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    host="localhost",
    port=5432,
    database="langgraph",
    user="postgres",
    password="password"
)

# Create checkpointer
checkpointer = PostgresSaver(connection_pool)

# Or use connection string
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost:5432/langgraph"
)

# Compile graph
graph = workflow.compile(checkpointer=checkpointer)

# Use with thread_id
config = {"configurable": {"thread_id": "session-789"}}
result = graph.invoke(input_data, config=config)
```

**Production Setup:**

```python
import os
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg2.pool import ThreadedConnectionPool

def create_postgres_checkpointer() -> PostgresSaver:
    """Production Postgres checkpointer with connection pooling"""

    # Get connection details from environment
    db_url = os.getenv("DATABASE_URL")

    # Create threaded connection pool
    pool = ThreadedConnectionPool(
        minconn=5,
        maxconn=20,
        dsn=db_url,
        connect_timeout=10
    )

    # Create checkpointer
    checkpointer = PostgresSaver(pool)

    # Initialize schema
    checkpointer.setup()

    return checkpointer

# Usage
checkpointer = create_postgres_checkpointer()
graph = workflow.compile(checkpointer=checkpointer)
```

**Schema:**

```sql
-- PostgreSQL checkpoint schema
CREATE TABLE checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_id TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX idx_checkpoints_thread ON checkpoints(thread_id);
CREATE INDEX idx_checkpoints_created ON checkpoints(created_at);
```

---

## Checkpoint Usage Patterns

### 1. Basic Checkpointing

```python
# Execute with checkpointing
config = {"configurable": {"thread_id": "user-123"}}

# First turn
result1 = graph.invoke({"messages": [HumanMessage("Hello")]}, config)

# Second turn (resumes from checkpoint)
result2 = graph.invoke({"messages": [HumanMessage("Follow-up")]}, config)
```

### 2. Time-Travel Debugging

```python
# Get all checkpoints for a thread
config = {"configurable": {"thread_id": "user-123"}}
history = list(graph.get_state_history(config))

# Inspect checkpoint
for i, checkpoint in enumerate(history):
    print(f"Step {i}:")
    print(f"  Checkpoint ID: {checkpoint.id}")
    print(f"  Values: {checkpoint.values}")
    print(f"  Next: {checkpoint.next}")
    print()

# Replay from specific checkpoint
specific_config = {
    "configurable": {
        "thread_id": "user-123",
        "checkpoint_id": history[2].id
    }
}
replayed = graph.invoke(None, specific_config)
```

### 3. Human-in-the-Loop with Interrupts

```python
# Define graph with interrupt points
graph = workflow.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_review"],  # Pause before this node
    interrupt_after=["agent"]  # Pause after this node
)

# Execute - will pause at interrupt
config = {"configurable": {"thread_id": "approval-456"}}
result = graph.invoke({"task": "Deploy to production"}, config)

# Check if interrupted
state = graph.get_state(config)
if state.next:
    print(f"Paused at: {state.next}")
    print(f"State: {state.values}")

    # Human reviews and decides
    approval = input("Approve? (yes/no): ")

    # Update state with human decision
    if approval == "yes":
        graph.update_state(
            config,
            {"approval_status": "approved"},
            as_node="human_review"
        )
    else:
        graph.update_state(
            config,
            {"approval_status": "rejected", "reason": "Human rejected"},
            as_node="human_review"
        )

    # Resume execution
    final = graph.invoke(None, config)
```

### 4. Checkpoint Branching

```python
# Create alternate timeline from checkpoint
config = {"configurable": {"thread_id": "experiment-789"}}

# Execute to checkpoint
result1 = graph.invoke(input_data, config)

# Get current state
current_state = graph.get_state(config)

# Branch 1: Continue normally
branch1_config = {"configurable": {"thread_id": "experiment-789-branch1"}}
graph.update_state(branch1_config, current_state.values)
result_branch1 = graph.invoke({"strategy": "A"}, branch1_config)

# Branch 2: Try different approach
branch2_config = {"configurable": {"thread_id": "experiment-789-branch2"}}
graph.update_state(branch2_config, current_state.values)
result_branch2 = graph.invoke({"strategy": "B"}, branch2_config)

# Compare results
compare_branches(result_branch1, result_branch2)
```

---

## Semantic Memory (Long-Term)

### 1. Vector Store Integration

**Purpose:** Store and retrieve relevant historical context using semantic search.

**Implementation with ChromaDB:**

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.messages import BaseMessage
from typing import TypedDict, Annotated
import operator

class SemanticMemoryState(TypedDict):
    """State with semantic memory"""
    messages: Annotated[list[BaseMessage], add_messages]
    retrieved_context: str
    memory_metadata: dict

# Initialize vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma(
    collection_name="agent_memory",
    embedding_function=embeddings,
    persist_directory="./chroma_db"
)

# Memory retrieval node
def retrieve_memory(state: SemanticMemoryState):
    """Retrieve relevant memories from vector store"""
    query = state["messages"][-1].content

    # Semantic search
    relevant_docs = vectorstore.similarity_search(
        query,
        k=5,
        filter={"thread_id": state.get("thread_id")}
    )

    # Format context
    context = "\n".join([doc.page_content for doc in relevant_docs])

    return {
        "retrieved_context": context,
        "memory_metadata": {
            "retrieved_count": len(relevant_docs),
            "sources": [doc.metadata for doc in relevant_docs]
        }
    }

# Memory storage node
def store_memory(state: SemanticMemoryState):
    """Store interaction in vector store"""
    messages = state["messages"]

    # Extract last Q&A pair
    if len(messages) >= 2:
        question = messages[-2].content
        answer = messages[-1].content

        # Store in vector store
        vectorstore.add_texts(
            texts=[f"Q: {question}\nA: {answer}"],
            metadatas=[{
                "thread_id": state.get("thread_id"),
                "timestamp": datetime.now().isoformat(),
                "type": "qa_pair"
            }]
        )

    return {}

# Integrate into graph
workflow = StateGraph(SemanticMemoryState)
workflow.add_node("retrieve_memory", retrieve_memory)
workflow.add_node("agent", agent_node)
workflow.add_node("store_memory", store_memory)

workflow.add_edge(START, "retrieve_memory")
workflow.add_edge("retrieve_memory", "agent")
workflow.add_edge("agent", "store_memory")
workflow.add_edge("store_memory", END)

graph = workflow.compile(checkpointer=checkpointer)
```

**Memory Management:**

```python
# Prune old memories
def prune_old_memories(days: int = 30):
    """Remove memories older than specified days"""
    cutoff = datetime.now() - timedelta(days=days)

    vectorstore.delete(
        filter={
            "timestamp": {"$lt": cutoff.isoformat()}
        }
    )

# Update memory
def update_memory(memory_id: str, new_content: str):
    """Update existing memory"""
    vectorstore.update_document(
        document_id=memory_id,
        document=new_content
    )

# Search with filters
def search_user_memories(user_id: str, query: str, k: int = 5):
    """Search memories for specific user"""
    return vectorstore.similarity_search(
        query,
        k=k,
        filter={"user_id": user_id}
    )
```

### 2. Hybrid Memory (Short + Long Term)

```python
class HybridMemoryState(TypedDict):
    """State with both checkpoint and semantic memory"""
    # Short-term (checkpoint)
    messages: Annotated[list[BaseMessage], add_messages]
    working_memory: dict

    # Long-term (vector store)
    retrieved_context: str
    user_preferences: dict
    historical_patterns: dict

def create_hybrid_memory_agent():
    """Agent with both short and long-term memory"""

    # Short-term: Checkpointer for conversation
    checkpointer = PostgresSaver.from_conn_string(db_url)

    # Long-term: Vector store for history
    vectorstore = Chroma(
        collection_name="long_term_memory",
        embedding_function=OpenAIEmbeddings()
    )

    # Retrieve from long-term memory
    def retrieve_long_term(state: HybridMemoryState):
        query = state["messages"][-1].content
        user_id = state.get("user_id")

        # Get user preferences
        preferences = vectorstore.similarity_search(
            query,
            k=3,
            filter={"user_id": user_id, "type": "preference"}
        )

        # Get historical patterns
        patterns = vectorstore.similarity_search(
            query,
            k=5,
            filter={"user_id": user_id, "type": "interaction"}
        )

        return {
            "user_preferences": format_preferences(preferences),
            "historical_patterns": format_patterns(patterns)
        }

    # Agent with both memory types
    def agent_with_memory(state: HybridMemoryState):
        # Use short-term: Recent messages from checkpoint
        recent_context = state["messages"][-10:]

        # Use long-term: Retrieved context and preferences
        long_term_context = f"""
        User Preferences: {state.get('user_preferences', {})}
        Historical Patterns: {state.get('historical_patterns', {})}
        """

        # Combine memories
        full_context = [
            SystemMessage(content=long_term_context),
            *recent_context
        ]

        response = model.invoke(full_context)
        return {"messages": [response]}

    # Store to long-term memory
    def store_long_term(state: HybridMemoryState):
        messages = state["messages"]
        user_id = state.get("user_id")

        # Store interaction
        if len(messages) >= 2:
            vectorstore.add_texts(
                texts=[format_interaction(messages[-2:])],
                metadatas=[{
                    "user_id": user_id,
                    "type": "interaction",
                    "timestamp": datetime.now().isoformat()
                }]
            )

        # Extract and store preferences if detected
        if detected_preference(messages[-1]):
            vectorstore.add_texts(
                texts=[extract_preference(messages[-1])],
                metadatas=[{
                    "user_id": user_id,
                    "type": "preference",
                    "timestamp": datetime.now().isoformat()
                }]
            )

        return {}

    # Build graph
    workflow = StateGraph(HybridMemoryState)
    workflow.add_node("retrieve_long_term", retrieve_long_term)
    workflow.add_node("agent", agent_with_memory)
    workflow.add_node("store_long_term", store_long_term)

    workflow.add_edge(START, "retrieve_long_term")
    workflow.add_edge("retrieve_long_term", "agent")
    workflow.add_edge("agent", "store_long_term")
    workflow.add_edge("store_long_term", END)

    # Compile with checkpointer for short-term
    return workflow.compile(checkpointer=checkpointer)
```

---

## Memory Scope Patterns

### 1. Thread-Scoped Memory

```python
# Each conversation has isolated memory
config1 = {"configurable": {"thread_id": "conversation-1"}}
config2 = {"configurable": {"thread_id": "conversation-2"}}

# Separate memory spaces
result1 = graph.invoke(input, config1)
result2 = graph.invoke(input, config2)
```

### 2. User-Scoped Memory

```python
# Share memory across all conversations for a user
config = {
    "configurable": {
        "thread_id": f"user-{user_id}-{conversation_id}",
        "user_id": user_id  # Used for vector store filtering
    }
}

# Retrieve memories across all user's conversations
user_memories = vectorstore.similarity_search(
    query,
    filter={"user_id": user_id}
)
```

### 3. Global Memory

```python
# Shared memory across all users (knowledge base)
global_knowledge = vectorstore.similarity_search(
    query,
    filter={"scope": "global", "type": "knowledge"}
)
```

### 4. Hierarchical Memory

```python
def retrieve_hierarchical_memory(
    query: str,
    user_id: str,
    org_id: str
) -> str:
    """Retrieve memories at multiple scopes"""

    # Level 1: Personal memories
    personal = vectorstore.similarity_search(
        query,
        k=3,
        filter={"user_id": user_id, "scope": "personal"}
    )

    # Level 2: Team/org memories
    org = vectorstore.similarity_search(
        query,
        k=3,
        filter={"org_id": org_id, "scope": "organization"}
    )

    # Level 3: Global knowledge
    global_mem = vectorstore.similarity_search(
        query,
        k=2,
        filter={"scope": "global"}
    )

    # Combine with priority
    return format_hierarchical_context(personal, org, global_mem)
```

---

## Production Memory Architectures

### 1. Single-Node Architecture

```
┌─────────────────────┐
│   Application       │
│                     │
│  ┌──────────────┐   │
│  │  LangGraph   │   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │   SQLite     │   │
│  │ Checkpoints  │   │
│  └──────────────┘   │
└─────────────────────┘
```

**Setup:**
```python
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("checkpoints.db")
graph = workflow.compile(checkpointer=checkpointer)
```

### 2. Distributed Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   App 1     │  │   App 2     │  │   App 3     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                 ┌──────▼──────┐
                 │  PostgreSQL │
                 │ Checkpoints │
                 └─────────────┘
```

**Setup:**
```python
from langgraph.checkpoint.postgres import PostgresSaver

# Shared Postgres across all instances
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@postgres-server:5432/langgraph"
)
graph = workflow.compile(checkpointer=checkpointer)
```

### 3. Hybrid Architecture (Checkpoint + Vector Store)

```
┌─────────────────────────────────────────┐
│            Application                  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  LangGraph   │    │ Vector Store │  │
│  │              │    │ Integration  │  │
│  └──────┬───────┘    └──────┬───────┘  │
│         │                   │          │
└─────────┼───────────────────┼──────────┘
          │                   │
   ┌──────▼───────┐    ┌──────▼──────┐
   │  PostgreSQL  │    │   ChromaDB  │
   │ (Short-term) │    │ (Long-term) │
   └──────────────┘    └─────────────┘
```

**Setup:**
```python
# Short-term: PostgreSQL checkpointer
checkpointer = PostgresSaver.from_conn_string(db_url)

# Long-term: Vector store
vectorstore = Chroma(
    collection_name="long_term_memory",
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./chroma_db"
)

# Compile with both
graph = create_hybrid_memory_agent(checkpointer, vectorstore)
```

---

## Best Practices

### 1. Thread ID Strategy

```python
# Good: Predictable, hierarchical thread IDs
thread_id = f"{user_id}:{session_id}:{conversation_id}"

# Good: Include timestamp for time-based queries
thread_id = f"{user_id}:{datetime.now().strftime('%Y%m%d')}:{session_id}"

# Avoid: Random UUIDs (hard to query)
thread_id = str(uuid.uuid4())  # Not great for production
```

### 2. Checkpoint Cleanup

```python
def cleanup_old_checkpoints(days: int = 30):
    """Remove old checkpoints to manage storage"""
    cutoff = datetime.now() - timedelta(days=days)

    # For PostgreSQL
    conn.execute("""
        DELETE FROM checkpoints
        WHERE created_at < %s
    """, (cutoff,))
```

### 3. Memory Budget Management

```python
def manage_memory_budget(state: State, max_tokens: int = 4000):
    """Keep memory within token budget"""

    # Prune old messages
    if len(state["messages"]) > 20:
        state = prune_messages(state, max_messages=15)

    # Summarize if still too large
    if estimate_tokens(state["messages"]) > max_tokens:
        state = summarize_history(state)

    return state
```

### 4. Error Handling

```python
def checkpoint_with_retry(graph, input_data, config, max_retries=3):
    """Execute with checkpoint retry logic"""
    for attempt in range(max_retries):
        try:
            return graph.invoke(input_data, config)
        except CheckpointError as e:
            if attempt == max_retries - 1:
                raise
            logger.warning(f"Checkpoint failed (attempt {attempt + 1}): {e}")
            time.sleep(2 ** attempt)  # Exponential backoff
```

---

## Resources

- **Checkpointing:** https://langchain-ai.github.io/langgraph/how-tos/persistence/
- **PostgreSQL Setup:** https://langchain-ai.github.io/langgraph/how-tos/persistence_postgres/
- **Vector Stores:** https://python.langchain.com/docs/integrations/vectorstores/
- **Human-in-the-Loop:** https://langchain-ai.github.io/langgraph/how-tos/human-in-the-loop/

---

**Use this skill when designing memory and persistence strategies for production LangGraph applications.**
