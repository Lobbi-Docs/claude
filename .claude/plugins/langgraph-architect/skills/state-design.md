# State Design Skill

```yaml
---
category: architecture
activation_keywords:
  - state schema
  - state design
  - typed dict
  - reducer
  - state management
  - state transformation
  - state validation
description: Comprehensive guide to state schema design patterns, reducers, and state management best practices in LangGraph
---
```

## Overview

State design is the foundation of every LangGraph application. This skill covers state schema patterns, reducer strategies, validation approaches, and best practices for managing state across complex agent systems.

## Core Concepts

### State in LangGraph

State is:
- **Shared:** Accessible to all nodes in the graph
- **Typed:** Defined using TypedDict for type safety
- **Immutable:** Nodes return new state, don't mutate
- **Cumulative:** Updates are merged, not replaced
- **Checkpointed:** Can be persisted and resumed

## State Schema Patterns

### 1. Message-Only State (Chat Applications)

**Use Case:** Simple conversational agents without complex state tracking.

**When to Use:**
- Pure chat interfaces
- Conversation history only
- No additional context needed
- Simple Q&A systems

**Implementation:**

```python
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, add_messages

class MessageOnlyState(TypedDict):
    """Minimal state for chat applications"""
    messages: Annotated[Sequence[BaseMessage], add_messages]

# Usage
def agent_node(state: MessageOnlyState) -> MessageOnlyState:
    messages = state["messages"]
    response = model.invoke(messages)
    return {"messages": [response]}  # add_messages merges automatically
```

**Pros:**
- Simplest state design
- Built-in message handling with add_messages
- Minimal overhead

**Cons:**
- Limited context storage
- Hard to track metadata
- No structured data beyond messages

---

### 2. Message + Metadata State

**Use Case:** Chat with additional tracking (user info, session data, metadata).

**When to Use:**
- Need user context
- Track conversation metadata
- Store session information
- Analytics and monitoring

**Implementation:**

```python
from datetime import datetime
import operator

class MessageMetadataState(TypedDict):
    """State with messages and metadata"""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_id: str
    session_id: str
    metadata: dict  # Flexible metadata storage
    created_at: datetime
    updated_at: datetime

    # Optional: Track counts
    turn_count: int
    token_count: int

# Usage with metadata
def agent_with_metadata(state: MessageMetadataState):
    messages = state["messages"]
    user_id = state["user_id"]

    # Personalized response using metadata
    system_msg = f"User {user_id} context: {state['metadata']}"
    response = model.invoke([system_msg] + messages)

    return {
        "messages": [response],
        "turn_count": state.get("turn_count", 0) + 1,
        "updated_at": datetime.now()
    }
```

**Pros:**
- Structured metadata storage
- Track session information
- User personalization
- Analytics capabilities

**Cons:**
- More complex than message-only
- Need to maintain metadata consistency

---

### 3. Multi-Agent Shared State

**Use Case:** Multiple agents coordinating with shared context.

**When to Use:**
- Supervisor patterns
- Swarm collaboration
- Agent handoffs
- Shared context needed

**Implementation:**

```python
class MultiAgentState(TypedDict):
    """Shared state for multi-agent systems"""
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # Routing
    next_agent: str
    agent_history: Annotated[list[str], operator.add]

    # Shared context (all agents can access/update)
    shared_context: dict

    # Per-agent state (isolated)
    agent_states: dict[str, dict]

    # Coordination
    handoff_reason: str
    collaboration_data: dict

# Example: Agent updates shared context
def researcher_agent(state: MultiAgentState):
    findings = conduct_research(state["messages"])

    # Update shared context for other agents
    shared_ctx = state.get("shared_context", {})
    shared_ctx["research_findings"] = findings
    shared_ctx["research_timestamp"] = datetime.now()

    return {
        "messages": [HumanMessage(content="Research complete")],
        "agent_history": ["researcher"],
        "shared_context": shared_ctx,
        "next_agent": "writer"  # Hand off to writer
    }

def writer_agent(state: MultiAgentState):
    # Access research findings from shared context
    findings = state["shared_context"].get("research_findings", {})

    draft = write_content(findings)

    return {
        "messages": [HumanMessage(content=draft)],
        "agent_history": ["writer"],
        "next_agent": "FINISH"
    }
```

**Pros:**
- Clear agent coordination
- Shared context prevents duplication
- Track agent history
- Flexible collaboration

**Cons:**
- More complex state structure
- Need to manage shared vs isolated state
- Potential for state conflicts

---

### 4. Isolated Subgraph State

**Use Case:** Subgraphs that need independent state, separate from parent.

**When to Use:**
- Hierarchical graphs
- Reusable subgraphs
- Isolated workflows
- State encapsulation needed

**Implementation:**

```python
# Parent State
class ParentState(TypedDict):
    """Parent graph state"""
    messages: Annotated[list[BaseMessage], add_messages]
    task: str
    subgraph_results: dict

# Subgraph State (isolated)
class SubgraphState(TypedDict):
    """Isolated subgraph state"""
    query: str
    findings: Annotated[list, operator.add]
    summary: str

# Map parent state to subgraph input
def enter_subgraph(parent_state: ParentState) -> SubgraphState:
    """Transform parent state for subgraph"""
    return {
        "query": parent_state["task"],
        "findings": [],
        "summary": ""
    }

# Map subgraph output back to parent
def exit_subgraph(
    parent_state: ParentState,
    subgraph_state: SubgraphState
) -> ParentState:
    """Merge subgraph results into parent"""
    return {
        "subgraph_results": {
            "summary": subgraph_state["summary"],
            "findings": subgraph_state["findings"]
        },
        "messages": [HumanMessage(content=subgraph_state["summary"])]
    }

# Create subgraph with state mapping
subgraph = create_research_subgraph()

# Add to parent graph with state transformation
workflow.add_node(
    "research_subgraph",
    subgraph,
    input_transform=enter_subgraph,
    output_transform=exit_subgraph
)
```

**Pros:**
- State encapsulation
- Reusable subgraphs
- Clear boundaries
- Independent testing

**Cons:**
- Requires state mapping logic
- More complex setup
- Potential data loss in transformations

---

### 5. Task-Based State (Workflow Automation)

**Use Case:** Workflows tracking tasks, steps, and results.

**When to Use:**
- Task automation
- Multi-step workflows
- Result aggregation
- Status tracking

**Implementation:**

```python
class TaskState(TypedDict):
    """State for task-based workflows"""
    task: str
    steps: Annotated[list[dict], operator.add]  # Track all steps
    results: dict  # Accumulated results
    status: str  # "pending", "in_progress", "complete", "failed"
    errors: Annotated[list[dict], operator.add]  # Track errors
    progress: float  # 0.0 to 1.0

    # Optional: Task metadata
    priority: int
    deadline: datetime
    assignee: str

# Usage
def execute_step(state: TaskState):
    step_result = perform_step(state["task"])

    if step_result["success"]:
        return {
            "steps": [{
                "name": "execute",
                "status": "complete",
                "result": step_result["data"]
            }],
            "results": {
                "execute": step_result["data"]
            },
            "progress": calculate_progress(state),
            "status": "in_progress"
        }
    else:
        return {
            "steps": [{
                "name": "execute",
                "status": "failed",
                "error": step_result["error"]
            }],
            "errors": [{
                "step": "execute",
                "error": step_result["error"],
                "timestamp": datetime.now()
            }],
            "status": "failed"
        }
```

**Pros:**
- Clear task tracking
- Structured error handling
- Progress monitoring
- Audit trail via steps

**Cons:**
- State can grow large
- Need to manage status transitions
- Pruning may be needed

---

### 6. Research/Data Gathering State

**Use Case:** Agents gathering, analyzing, and synthesizing information.

**When to Use:**
- Research workflows
- Data collection
- Source aggregation
- Fact-finding missions

**Implementation:**

```python
class ResearchState(TypedDict):
    """State for research workflows"""
    query: str
    sources: Annotated[list[dict], operator.add]  # All sources checked
    findings: dict  # Organized findings by topic
    citations: Annotated[list[str], operator.add]  # All citations
    summary: str  # Final summary
    confidence: float  # 0.0 to 1.0

    # Quality tracking
    source_count: int
    fact_checked: bool
    verification_status: str

# Custom reducer for findings (merge by topic)
def merge_findings(left: dict, right: dict) -> dict:
    """Custom reducer to merge findings by topic"""
    merged = left.copy()
    for topic, data in right.items():
        if topic in merged:
            # Combine existing and new data
            merged[topic] = {
                "facts": merged[topic]["facts"] + data["facts"],
                "sources": merged[topic]["sources"] + data["sources"]
            }
        else:
            merged[topic] = data
    return merged

# Apply custom reducer
class ResearchStateWithReducer(TypedDict):
    query: str
    sources: Annotated[list[dict], operator.add]
    findings: Annotated[dict, merge_findings]  # Custom reducer
    summary: str
    confidence: float

# Usage
def gather_sources(state: ResearchState):
    sources = search_sources(state["query"])
    return {
        "sources": sources,
        "source_count": len(sources)
    }

def analyze_sources(state: ResearchState):
    findings = {}
    for source in state["sources"]:
        topic = categorize(source)
        findings[topic] = {
            "facts": extract_facts(source),
            "sources": [source["url"]]
        }

    return {"findings": findings}  # Merged with custom reducer
```

**Pros:**
- Organized data collection
- Citation tracking
- Quality metrics
- Topic organization

**Cons:**
- Can accumulate large data
- Need pruning strategy
- Complex merge logic

---

## Reducer Patterns

### Built-in Reducers

#### 1. `add_messages` (Message Handling)

```python
from langchain_core.messages import add_messages

class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# Behavior:
# - Appends new messages to existing list
# - Deduplicates by message ID
# - Handles message updates by ID
# - Preserves message order
```

#### 2. `operator.add` (List Accumulation)

```python
import operator

class State(TypedDict):
    items: Annotated[list, operator.add]

# Behavior:
# - Concatenates lists: [1, 2] + [3] = [1, 2, 3]
# - No deduplication
# - Preserves order
```

#### 3. `operator.or_` (Dict Merging)

```python
import operator

class State(TypedDict):
    data: Annotated[dict, operator.or_]

# Behavior:
# - Merges dicts: {a: 1} | {b: 2} = {a: 1, b: 2}
# - Right dict overwrites left on conflicts
# - Shallow merge only
```

### Custom Reducers

#### 1. Deep Dict Merge

```python
def deep_merge_dicts(left: dict, right: dict) -> dict:
    """Recursively merge nested dictionaries"""
    merged = left.copy()

    for key, value in right.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            # Recursively merge nested dicts
            merged[key] = deep_merge_dicts(merged[key], value)
        else:
            # Overwrite with new value
            merged[key] = value

    return merged

class State(TypedDict):
    config: Annotated[dict, deep_merge_dicts]

# Example:
# left = {"a": {"b": 1, "c": 2}}
# right = {"a": {"c": 3, "d": 4}}
# result = {"a": {"b": 1, "c": 3, "d": 4}}
```

#### 2. Unique List (Set-Based)

```python
def unique_list_reducer(left: list, right: list) -> list:
    """Combine lists while removing duplicates"""
    # Preserve order, remove duplicates
    seen = set()
    result = []

    for item in left + right:
        if item not in seen:
            seen.add(item)
            result.append(item)

    return result

class State(TypedDict):
    tags: Annotated[list[str], unique_list_reducer]
```

#### 3. Max Value Reducer

```python
def max_reducer(left: float, right: float) -> float:
    """Keep maximum value"""
    return max(left, right)

class State(TypedDict):
    confidence: Annotated[float, max_reducer]

# Each update keeps the highest confidence score
```

#### 4. Time-Windowed List

```python
from datetime import datetime, timedelta

def time_windowed_reducer(
    left: list[dict],
    right: list[dict],
    window_seconds: int = 3600
) -> list[dict]:
    """Keep only recent items within time window"""
    combined = left + right
    now = datetime.now()
    cutoff = now - timedelta(seconds=window_seconds)

    # Filter to items within window
    filtered = [
        item for item in combined
        if item.get("timestamp", now) > cutoff
    ]

    return filtered

class State(TypedDict):
    recent_events: Annotated[list[dict], time_windowed_reducer]
```

#### 5. Prioritized Merge

```python
def prioritized_merge(left: dict, right: dict) -> dict:
    """Merge dicts, keeping higher priority values"""
    merged = {}

    all_keys = set(left.keys()) | set(right.keys())

    for key in all_keys:
        left_val = left.get(key, {"priority": 0, "value": None})
        right_val = right.get(key, {"priority": 0, "value": None})

        # Keep value with higher priority
        if right_val["priority"] > left_val["priority"]:
            merged[key] = right_val
        else:
            merged[key] = left_val

    return merged

class State(TypedDict):
    settings: Annotated[dict, prioritized_merge]
```

---

## State Transformation Patterns

### 1. State Enrichment

```python
def enrich_state(state: BaseState) -> EnrichedState:
    """Add computed fields to state"""
    enriched = state.copy()

    # Add derived fields
    enriched["message_count"] = len(state["messages"])
    enriched["last_speaker"] = get_last_speaker(state["messages"])
    enriched["conversation_duration"] = calculate_duration(state)

    return enriched
```

### 2. State Projection (Select Fields)

```python
def project_state(state: FullState, fields: list[str]) -> PartialState:
    """Extract only specified fields"""
    return {k: v for k, v in state.items() if k in fields}

# Example: Only pass messages to subgraph
minimal_state = project_state(state, ["messages", "task"])
```

### 3. State Pruning

```python
def prune_messages(state: MessageState, max_messages: int = 20):
    """Keep only recent messages"""
    messages = state["messages"]

    if len(messages) <= max_messages:
        return state

    # Keep system message + recent messages
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    other_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

    pruned = system_msgs + other_msgs[-max_messages:]

    return {"messages": pruned}
```

### 4. State Validation

```python
from pydantic import BaseModel, validator

class ValidatedState(BaseModel):
    """Pydantic model for state validation"""
    messages: list[BaseMessage]
    confidence: float
    status: str

    @validator("confidence")
    def confidence_range(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence must be between 0 and 1")
        return v

    @validator("status")
    def valid_status(cls, v):
        valid_statuses = ["pending", "in_progress", "complete", "failed"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v

def validate_state(state: dict) -> dict:
    """Validate state against schema"""
    try:
        validated = ValidatedState(**state)
        return validated.dict()
    except Exception as e:
        # Handle validation error
        raise StateValidationError(f"Invalid state: {e}")
```

---

## Best Practices

### 1. State Design Principles

**Keep State Flat:**
```python
# Good: Flat structure
class GoodState(TypedDict):
    user_id: str
    user_name: str
    user_email: str

# Avoid: Deep nesting
class BadState(TypedDict):
    user: dict[str, dict[str, dict[str, str]]]  # Too nested
```

**Use Type Annotations:**
```python
# Good: Typed
class GoodState(TypedDict):
    count: int
    ratio: float
    items: list[str]

# Bad: Untyped
class BadState(TypedDict):
    count: Any
    ratio: Any
    items: Any
```

**Annotate Reducers:**
```python
# Good: Explicit reducer
class GoodState(TypedDict):
    items: Annotated[list, operator.add]

# Bad: No reducer (will overwrite instead of merge)
class BadState(TypedDict):
    items: list
```

### 2. Immutability

**Always Return New State:**
```python
# Good: Return new dict
def good_node(state: State) -> State:
    return {"count": state["count"] + 1}

# Bad: Mutate state
def bad_node(state: State) -> State:
    state["count"] += 1  # DON'T MUTATE!
    return state
```

### 3. Partial Updates

**Return Only Changed Fields:**
```python
# Good: Return only updates
def efficient_node(state: State) -> State:
    return {"updated_field": "new_value"}

# Unnecessary: Return entire state
def inefficient_node(state: State) -> State:
    return {
        "field1": state["field1"],  # Unchanged
        "field2": state["field2"],  # Unchanged
        "updated_field": "new_value"  # Changed
    }
```

### 4. State Size Management

**Prune Large State:**
```python
def manage_state_size(state: State) -> State:
    """Keep state size manageable"""

    # Prune messages
    if len(state["messages"]) > 50:
        state = prune_messages(state, max_messages=30)

    # Remove old temporary data
    if "temp_data" in state:
        old_keys = [k for k, v in state["temp_data"].items()
                    if is_old(v["timestamp"])]
        for key in old_keys:
            del state["temp_data"][key]

    return state
```

---

## Common Pitfalls

### 1. Missing Reducer

```python
# Problem: List overwrites instead of accumulates
class BadState(TypedDict):
    items: list  # No reducer!

def node1(state): return {"items": [1, 2]}
def node2(state): return {"items": [3, 4]}
# Result: items = [3, 4] (overwrote, didn't accumulate)

# Solution: Add reducer
class GoodState(TypedDict):
    items: Annotated[list, operator.add]
# Result: items = [1, 2, 3, 4] (accumulated)
```

### 2. State Mutation

```python
# Problem: Mutating state
def bad_node(state: State):
    state["data"]["nested_field"] = "new_value"  # MUTATION!
    return state

# Solution: Copy and update
def good_node(state: State):
    updated_data = state["data"].copy()
    updated_data["nested_field"] = "new_value"
    return {"data": updated_data}
```

### 3. Unbounded Growth

```python
# Problem: State grows forever
class BadState(TypedDict):
    all_events: Annotated[list, operator.add]  # Grows unbounded!

# Solution: Time-windowed or size-limited
class GoodState(TypedDict):
    recent_events: Annotated[list, time_windowed_reducer]
```

### 4. Wrong Reducer

```python
# Problem: Using add for dict (doesn't merge)
class BadState(TypedDict):
    config: Annotated[dict, operator.add]  # Wrong! Lists only

# Solution: Use dict merge reducer
class GoodState(TypedDict):
    config: Annotated[dict, operator.or_]  # Correct for dicts
```

---

## Testing State Schemas

```python
import pytest

def test_state_schema():
    """Test state schema and reducers"""

    # Test initial state
    initial = State(messages=[], count=0)
    assert len(initial["messages"]) == 0
    assert initial["count"] == 0

    # Test state updates
    update1 = {"count": 5}
    update2 = {"count": 3}

    # Merge updates
    merged = {**initial, **update1, **update2}
    assert merged["count"] == 3  # Last update wins

def test_reducer_behavior():
    """Test custom reducer"""

    left = {"items": [1, 2]}
    right = {"items": [3, 4]}

    # Test reducer
    reducer = operator.add
    result = reducer(left["items"], right["items"])

    assert result == [1, 2, 3, 4]

def test_state_validation():
    """Test state validation"""

    valid_state = {"confidence": 0.8, "status": "complete"}
    assert validate_state(valid_state)  # Should pass

    invalid_state = {"confidence": 1.5, "status": "invalid"}
    with pytest.raises(StateValidationError):
        validate_state(invalid_state)  # Should fail
```

---

## Resources

- **TypedDict:** https://docs.python.org/3/library/typing.html#typing.TypedDict
- **Annotated:** https://docs.python.org/3/library/typing.html#typing.Annotated
- **LangGraph State:** https://langchain-ai.github.io/langgraph/concepts/low_level/#state
- **Reducers:** https://langchain-ai.github.io/langgraph/concepts/low_level/#reducers

---

**Use this skill when designing state schemas to ensure type-safe, maintainable, and performant state management in your LangGraph applications.**
