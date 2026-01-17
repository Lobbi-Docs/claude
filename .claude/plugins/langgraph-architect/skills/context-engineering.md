# Context Engineering Skill

```yaml
---
category: optimization
activation_keywords:
  - context window
  - token budget
  - message pruning
  - context optimization
  - prompt engineering
  - token management
  - context compression
  - summarization
description: Context window optimization strategies including pruning, summarization, compression, and prompt engineering for LangGraph agents
---
```

## Overview

Context engineering is the practice of maximizing the value extracted from limited context windows. This skill covers token budget management, message pruning strategies, summarization patterns, and prompt optimization techniques for LangGraph agents.

## The Context Window Challenge

### Problem

```
Context Window: 200K tokens
├─ System Prompt: 5K tokens
├─ Conversation History: 150K tokens (growing)
├─ Retrieved Context: 30K tokens
├─ Tools/Examples: 10K tokens
└─ Room for Output: 5K tokens (not enough!)
```

### Solution Framework: WSCI

**W**rite - **S**elect - **C**ompress - **I**solate

```python
def optimize_context(state: State, budget: int = 100000) -> State:
    """
    Apply WSCI framework:
    1. Write: Create comprehensive context
    2. Select: Choose most relevant information
    3. Compress: Summarize and condense
    4. Isolate: Separate critical vs nice-to-have
    """

    # Write: Gather all available context
    full_context = gather_all_context(state)

    # Select: Choose most relevant
    relevant = select_by_relevance(full_context, state["query"])

    # Compress: Summarize if still too large
    if estimate_tokens(relevant) > budget:
        relevant = compress_context(relevant)

    # Isolate: Separate must-have from optional
    critical, optional = isolate_by_priority(relevant)

    # Fit to budget
    final_context = fit_to_budget(critical, optional, budget)

    return {"context": final_context}
```

---

## Part 1: Token Budget Management

### 1.1 Token Estimation

```python
import tiktoken

def estimate_tokens(text: str, model: str = "gpt-4") -> int:
    """Estimate token count for text"""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def estimate_message_tokens(messages: list[BaseMessage], model: str = "gpt-4") -> int:
    """Estimate tokens for message list"""
    encoding = tiktoken.encoding_for_model(model)

    total = 0
    for message in messages:
        # Message overhead (role, etc.)
        total += 4

        # Message content
        total += len(encoding.encode(message.content))

        # Tool calls if present
        if hasattr(message, "tool_calls") and message.tool_calls:
            for tool_call in message.tool_calls:
                total += len(encoding.encode(str(tool_call)))

    # Conversation overhead
    total += 2

    return total
```

### 1.2 Budget Allocation

```python
class ContextBudget:
    """Manage token budget allocation"""

    def __init__(self, total_budget: int = 100000):
        self.total_budget = total_budget
        self.allocations = {}

    def allocate(self, component: str, tokens: int):
        """Allocate tokens to component"""
        self.allocations[component] = tokens

    def remaining(self) -> int:
        """Get remaining budget"""
        used = sum(self.allocations.values())
        return self.total_budget - used

    def budget_for(self, component: str) -> int:
        """Get budget for component"""
        return self.allocations.get(component, 0)

# Usage
budget = ContextBudget(total_budget=100000)

# Allocate budget
budget.allocate("system_prompt", 5000)
budget.allocate("conversation", 50000)
budget.allocate("retrieved_docs", 20000)
budget.allocate("examples", 10000)
budget.allocate("output_buffer", 15000)

# Check remaining
remaining = budget.remaining()  # 0

# Adjust if needed
if remaining < 0:
    budget.allocate("conversation", 45000)  # Reduce
```

### 1.3 Dynamic Budget Adjustment

```python
def adjust_budget_dynamically(state: State) -> dict:
    """Dynamically adjust budget based on task"""

    # Analyze task complexity
    complexity = assess_complexity(state)

    # Base budget
    total_budget = 100000

    if complexity == "simple":
        # Simple task: small output, less context
        return {
            "system_prompt": 3000,
            "conversation": 40000,
            "retrieved": 10000,
            "output": 5000
        }

    elif complexity == "medium":
        # Medium task: balanced allocation
        return {
            "system_prompt": 5000,
            "conversation": 50000,
            "retrieved": 20000,
            "output": 10000
        }

    else:  # complex
        # Complex task: more output space, compress history
        return {
            "system_prompt": 10000,
            "conversation": 30000,  # Compressed
            "retrieved": 30000,
            "output": 20000
        }
```

---

## Part 2: Pruning Strategies

### 2.1 Token-Based Pruning

```python
from langchain_core.messages import trim_messages, SystemMessage

def prune_by_tokens(
    messages: list[BaseMessage],
    max_tokens: int = 50000,
    strategy: str = "last"
) -> list[BaseMessage]:
    """Keep only messages within token budget"""

    # Always keep system message
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    other_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

    # Trim to budget
    trimmed = trim_messages(
        other_msgs,
        max_tokens=max_tokens,
        strategy=strategy,  # "last" or "first"
        token_counter=tiktoken.encoding_for_model("gpt-4")
    )

    return system_msgs + trimmed
```

### 2.2 Recency-Based Pruning

```python
def prune_by_recency(
    messages: list[BaseMessage],
    keep_recent: int = 20,
    keep_first: int = 2
) -> list[BaseMessage]:
    """Keep first N and last N messages"""

    if len(messages) <= keep_recent + keep_first:
        return messages

    # Keep system message + first few + recent
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    other_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

    first_msgs = other_msgs[:keep_first]
    recent_msgs = other_msgs[-keep_recent:]

    return system_msgs + first_msgs + recent_msgs
```

### 2.3 Importance-Based Pruning

```python
def prune_by_importance(
    messages: list[BaseMessage],
    max_messages: int = 30
) -> list[BaseMessage]:
    """Keep most important messages"""

    def calculate_importance(msg: BaseMessage) -> float:
        """Score message importance (0-1)"""
        score = 0.0

        # System messages always important
        if isinstance(msg, SystemMessage):
            return 1.0

        # Tool calls are important
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            score += 0.3

        # Long messages more important
        if len(msg.content) > 500:
            score += 0.2

        # Recent messages more important
        # (would need timestamp in real impl)
        score += 0.1

        # Contains key terms
        key_terms = ["error", "important", "critical", "required"]
        if any(term in msg.content.lower() for term in key_terms):
            score += 0.2

        return min(score, 1.0)

    # Score all messages
    scored = [(msg, calculate_importance(msg)) for msg in messages]

    # Sort by importance
    scored.sort(key=lambda x: x[1], reverse=True)

    # Keep top N
    important = [msg for msg, score in scored[:max_messages]]

    # Re-sort by original order
    important.sort(key=lambda x: messages.index(x))

    return important
```

### 2.4 Semantic Clustering Pruning

```python
from sklearn.cluster import KMeans
from langchain_openai import OpenAIEmbeddings

def prune_by_semantic_similarity(
    messages: list[BaseMessage],
    target_count: int = 20
) -> list[BaseMessage]:
    """Keep diverse messages via clustering"""

    if len(messages) <= target_count:
        return messages

    # Generate embeddings
    embeddings = OpenAIEmbeddings()
    contents = [msg.content for msg in messages]
    vectors = embeddings.embed_documents(contents)

    # Cluster messages
    n_clusters = target_count
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(vectors)

    # Keep one message per cluster (closest to centroid)
    kept_indices = []
    for i in range(n_clusters):
        cluster_indices = [idx for idx, c in enumerate(clusters) if c == i]
        if cluster_indices:
            # Find message closest to centroid
            centroid = kmeans.cluster_centers_[i]
            distances = [
                np.linalg.norm(vectors[idx] - centroid)
                for idx in cluster_indices
            ]
            closest = cluster_indices[np.argmin(distances)]
            kept_indices.append(closest)

    # Sort to maintain order
    kept_indices.sort()

    return [messages[i] for i in kept_indices]
```

---

## Part 3: Summarization Strategies

### 3.1 Rolling Summarization

```python
def rolling_summarize(
    messages: list[BaseMessage],
    window_size: int = 20,
    summarize_threshold: int = 50
) -> list[BaseMessage]:
    """Summarize old messages, keep recent ones"""

    if len(messages) <= summarize_threshold:
        return messages

    # Keep system message
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    other_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

    # Split into old (to summarize) and recent (to keep)
    old_msgs = other_msgs[:-window_size]
    recent_msgs = other_msgs[-window_size:]

    # Summarize old messages
    summary = summarize_messages(old_msgs)
    summary_msg = HumanMessage(
        content=f"[Previous conversation summary: {summary}]"
    )

    return system_msgs + [summary_msg] + recent_msgs

def summarize_messages(messages: list[BaseMessage]) -> str:
    """Create summary of message list"""
    llm = ChatOpenAI(model="gpt-4o-mini")  # Cheap model for summaries

    conversation_text = "\n".join([
        f"{msg.__class__.__name__}: {msg.content}"
        for msg in messages
    ])

    summary_prompt = f"""
    Summarize this conversation in 2-3 paragraphs, focusing on:
    1. Key decisions made
    2. Important information shared
    3. Actions taken or planned

    Conversation:
    {conversation_text}
    """

    summary = llm.invoke(summary_prompt)
    return summary.content
```

### 3.2 Hierarchical Summarization

```python
def hierarchical_summarize(
    messages: list[BaseMessage],
    levels: int = 3
) -> str:
    """Multi-level summarization for long histories"""

    # Level 1: Summarize in chunks
    chunk_size = len(messages) // levels
    level1_summaries = []

    for i in range(0, len(messages), chunk_size):
        chunk = messages[i:i + chunk_size]
        summary = summarize_messages(chunk)
        level1_summaries.append(summary)

    # Level 2: Summarize the summaries
    level2_summary = summarize_summaries(level1_summaries)

    return level2_summary

def summarize_summaries(summaries: list[str]) -> str:
    """Create meta-summary"""
    llm = ChatOpenAI(model="gpt-4o-mini")

    combined = "\n\n".join([
        f"Section {i+1}: {summary}"
        for i, summary in enumerate(summaries)
    ])

    meta_prompt = f"""
    Create a cohesive summary combining these section summaries:

    {combined}

    Focus on overarching themes and progression.
    """

    meta_summary = llm.invoke(meta_prompt)
    return meta_summary.content
```

### 3.3 Selective Summarization

```python
def selective_summarize(
    messages: list[BaseMessage],
    preserve_types: list = None
) -> list[BaseMessage]:
    """Summarize everything except specified types"""

    if preserve_types is None:
        preserve_types = [SystemMessage, ToolMessage]

    # Separate messages
    preserve = [m for m in messages if type(m) in preserve_types]
    summarizable = [m for m in messages if type(m) not in preserve_types]

    # Summarize the rest
    if summarizable:
        summary = summarize_messages(summarizable)
        summary_msg = HumanMessage(content=f"[Context: {summary}]")
        return preserve + [summary_msg]

    return preserve
```

---

## Part 4: Compression Techniques

### 4.1 Prompt Compression

```python
def compress_prompt(prompt: str, target_ratio: float = 0.5) -> str:
    """Compress prompt while preserving meaning"""

    llm = ChatOpenAI(model="gpt-4o-mini")

    compression_prompt = f"""
    Compress this prompt to {int(target_ratio * 100)}% of original length
    while preserving all critical information and instructions.

    Original prompt:
    {prompt}

    Compressed version:
    """

    compressed = llm.invoke(compression_prompt)
    return compressed.content
```

### 4.2 Semantic Compression

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_compressors import LLMChainExtractor

def semantic_compress(
    documents: list[str],
    query: str,
    compression_ratio: float = 0.3
) -> str:
    """Extract only relevant information"""

    # Create compressor
    llm = ChatOpenAI(model="gpt-4o-mini")
    compressor = LLMChainExtractor.from_llm(llm)

    # Split documents
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    splits = splitter.create_documents(documents)

    # Compress based on query
    compressed = compressor.compress_documents(
        documents=splits,
        query=query
    )

    # Combine compressed chunks
    return "\n\n".join([doc.page_content for doc in compressed])
```

### 4.3 Embedding-Based Deduplication

```python
from langchain_openai import OpenAIEmbeddings
from sklearn.metrics.pairwise import cosine_similarity

def deduplicate_by_similarity(
    texts: list[str],
    threshold: float = 0.9
) -> list[str]:
    """Remove near-duplicate texts"""

    if len(texts) <= 1:
        return texts

    # Generate embeddings
    embeddings = OpenAIEmbeddings()
    vectors = embeddings.embed_documents(texts)

    # Calculate similarity matrix
    similarity = cosine_similarity(vectors)

    # Find duplicates
    keep = []
    seen = set()

    for i in range(len(texts)):
        if i in seen:
            continue

        keep.append(texts[i])

        # Mark similar texts as seen
        for j in range(i + 1, len(texts)):
            if similarity[i][j] > threshold:
                seen.add(j)

    return keep
```

---

## Part 5: Isolation Patterns

### 5.1 Critical Context Isolation

```python
class ContextManager:
    """Manage critical vs optional context"""

    def __init__(self):
        self.critical = []
        self.optional = []

    def add_critical(self, content: str, label: str = ""):
        """Add critical context that must be included"""
        self.critical.append({"content": content, "label": label})

    def add_optional(self, content: str, priority: int = 0):
        """Add optional context with priority"""
        self.optional.append({
            "content": content,
            "priority": priority
        })

    def build_context(self, budget: int) -> str:
        """Build context within budget"""

        # Critical context always included
        critical_text = "\n\n".join([
            f"[{c['label']}]\n{c['content']}" if c['label'] else c['content']
            for c in self.critical
        ])

        critical_tokens = estimate_tokens(critical_text)

        if critical_tokens > budget:
            raise ValueError("Critical context exceeds budget")

        # Add optional by priority until budget filled
        remaining = budget - critical_tokens
        self.optional.sort(key=lambda x: x["priority"], reverse=True)

        optional_text = ""
        for item in self.optional:
            tokens = estimate_tokens(item["content"])
            if tokens <= remaining:
                optional_text += "\n\n" + item["content"]
                remaining -= tokens
            else:
                break

        return critical_text + optional_text

# Usage
cm = ContextManager()

# Critical
cm.add_critical(system_prompt, "System Instructions")
cm.add_critical(current_query, "Current Query")

# Optional
cm.add_optional(retrieved_doc1, priority=10)
cm.add_optional(retrieved_doc2, priority=8)
cm.add_optional(examples, priority=5)

# Build
final_context = cm.build_context(budget=50000)
```

### 5.2 Subgraph State Isolation

```python
# Parent doesn't need all subgraph state
def isolate_subgraph_state(
    parent_state: ParentState,
    subgraph_result: SubgraphState
) -> ParentState:
    """Extract only essential results from subgraph"""

    # Don't pass full subgraph state to parent
    # Extract only the summary
    return {
        "subgraph_summary": subgraph_result["summary"],
        "subgraph_status": "complete"
        # Don't include: intermediate_steps, full_data, etc.
    }
```

---

## Part 6: Prompt Engineering for Nodes

### 6.1 Structured Prompts

```python
def create_structured_prompt(
    role: str,
    task: str,
    context: dict,
    constraints: list[str],
    examples: list[dict] = None
) -> str:
    """Create well-structured prompt"""

    prompt_parts = []

    # Role
    prompt_parts.append(f"# Role\nYou are {role}")

    # Task
    prompt_parts.append(f"\n# Task\n{task}")

    # Context
    if context:
        context_str = "\n".join([f"- {k}: {v}" for k, v in context.items()])
        prompt_parts.append(f"\n# Context\n{context_str}")

    # Constraints
    if constraints:
        constraints_str = "\n".join([f"{i+1}. {c}" for i, c in enumerate(constraints)])
        prompt_parts.append(f"\n# Constraints\n{constraints_str}")

    # Examples
    if examples:
        examples_str = "\n\n".join([
            f"Example {i+1}:\nInput: {ex['input']}\nOutput: {ex['output']}"
            for i, ex in enumerate(examples)
        ])
        prompt_parts.append(f"\n# Examples\n{examples_str}")

    return "\n".join(prompt_parts)

# Usage
prompt = create_structured_prompt(
    role="a code review specialist",
    task="Review the following code for security issues",
    context={"language": "Python", "framework": "FastAPI"},
    constraints=[
        "Focus on OWASP Top 10",
        "Provide specific line numbers",
        "Suggest fixes"
    ],
    examples=[{"input": "...", "output": "..."}]
)
```

### 6.2 Few-Shot Prompting

```python
def create_few_shot_prompt(
    task_description: str,
    examples: list[tuple[str, str]],
    current_input: str
) -> str:
    """Create few-shot prompt with examples"""

    prompt_parts = [task_description, ""]

    # Add examples
    for i, (input_ex, output_ex) in enumerate(examples, 1):
        prompt_parts.append(f"Example {i}:")
        prompt_parts.append(f"Input: {input_ex}")
        prompt_parts.append(f"Output: {output_ex}")
        prompt_parts.append("")

    # Add current input
    prompt_parts.append("Now your turn:")
    prompt_parts.append(f"Input: {current_input}")
    prompt_parts.append("Output:")

    return "\n".join(prompt_parts)
```

---

## Best Practices

### 1. Measure Before Optimizing
```python
def profile_context_usage(state: State) -> dict:
    """Profile token usage"""
    return {
        "system_tokens": estimate_tokens(state["system_prompt"]),
        "message_tokens": estimate_message_tokens(state["messages"]),
        "context_tokens": estimate_tokens(state.get("context", "")),
        "total_tokens": estimate_tokens(str(state))
    }
```

### 2. Progressive Optimization
- Start with simple pruning
- Add summarization if needed
- Use compression as last resort
- Measure impact of each technique

### 3. Quality Checks
- Verify critical information preserved
- Test on edge cases
- Monitor output quality
- A/B test optimizations

### 4. Budget Monitoring
```python
class TokenBudgetMonitor:
    """Monitor token usage over time"""

    def __init__(self):
        self.usage_history = []

    def log_usage(self, state: State, budget: int):
        tokens = estimate_tokens(str(state))
        utilization = tokens / budget
        self.usage_history.append({
            "timestamp": datetime.now(),
            "tokens": tokens,
            "budget": budget,
            "utilization": utilization
        })

    def get_stats(self) -> dict:
        if not self.usage_history:
            return {}

        utilizations = [h["utilization"] for h in self.usage_history]
        return {
            "avg_utilization": sum(utilizations) / len(utilizations),
            "max_utilization": max(utilizations),
            "over_budget_count": sum(1 for u in utilizations if u > 1.0)
        }
```

---

## Resources

- **Token Counting:** https://github.com/openai/tiktoken
- **LangChain Text Splitting:** https://python.langchain.com/docs/modules/data_connection/document_transformers/
- **Prompt Engineering:** https://docs.anthropic.com/claude/docs/prompt-engineering

---

**Use this skill when optimizing context usage and managing token budgets in your LangGraph applications.**
