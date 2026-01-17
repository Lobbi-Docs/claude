---
name: lg:create
description: Create new LangGraph projects, agents, workflows, or multi-agent systems with configurable patterns and integrations
version: 1.0.0
category: langgraph
author: Claude Code
arguments:
  - name: name
    description: Name of the project/agent to create
    required: true
    type: string
flags:
  - name: type
    description: Type of LangGraph component to create
    type: choice
    choices: [agent, workflow, multi-agent, subgraph]
    default: agent
  - name: pattern
    description: Architecture pattern to use
    type: choice
    choices: [supervisor, swarm, pipeline, react, reflection, tool-calling]
    default: react
  - name: memory
    description: Memory/checkpoint system to include
    type: choice
    choices: [none, checkpoint, sqlite, postgres, redis, mongodb, longterm]
    default: checkpoint
  - name: mcp
    description: Enable MCP server wrapper
    type: boolean
    default: false
  - name: cli
    description: Generate CLI wrapper
    type: boolean
    default: true
  - name: llm
    description: LLM provider to use
    type: choice
    choices: [anthropic, openai, azure-openai, bedrock, vertex, ollama]
    default: anthropic
  - name: tools
    description: Comma-separated list of built-in tools to include
    type: string
    default: ""
  - name: streaming
    description: Enable streaming responses
    type: boolean
    default: true
  - name: tracing
    description: Enable LangSmith tracing
    type: boolean
    default: true
  - name: path
    description: Output directory path
    type: string
    default: "."
presets:
  - name: basic-agent
    description: Simple ReAct agent with memory and tools
    flags:
      type: agent
      pattern: react
      memory: checkpoint
      cli: true
  - name: supervisor-system
    description: Multi-agent supervisor pattern with memory
    flags:
      type: multi-agent
      pattern: supervisor
      memory: sqlite
      mcp: true
  - name: swarm-agents
    description: Swarm of collaborative agents
    flags:
      type: multi-agent
      pattern: swarm
      memory: checkpoint
      cli: true
  - name: pipeline-workflow
    description: Linear pipeline workflow
    flags:
      type: workflow
      pattern: pipeline
      memory: none
      streaming: true
  - name: mcp-server
    description: Agent wrapped as MCP server
    flags:
      type: agent
      pattern: react
      mcp: true
      cli: false
---

# lg:create - LangGraph Project Creator

Create production-ready LangGraph projects with best practices built-in.

## Workflow Steps

1. **Validate Input**
   - Check project name validity
   - Verify output path exists
   - Validate flag combinations

2. **Generate Project Structure**
   - Create directory structure based on type
   - Generate pyproject.toml with dependencies
   - Create .env.example file
   - Setup configuration files

3. **Generate Core Components**
   - Create state schema
   - Generate graph definition
   - Implement chosen pattern
   - Add memory/checkpoint system

4. **Add Integrations**
   - Setup LLM provider configuration
   - Add tool definitions
   - Configure streaming (if enabled)
   - Setup LangSmith tracing (if enabled)

5. **Generate Wrappers**
   - Create CLI wrapper (if --cli)
   - Create MCP server wrapper (if --mcp)
   - Add FastAPI server (optional)

6. **Create Tests**
   - Generate test files
   - Add example test cases
   - Create test fixtures

7. **Generate Documentation**
   - Create README.md
   - Add architecture diagram
   - Document API/CLI usage
   - Add deployment guide

8. **Setup Development Environment**
   - Create virtual environment
   - Install dependencies
   - Run initial tests
   - Verify graph structure

## Architecture Patterns

### ReAct Pattern
```python
# Reasoning and Acting loop
graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")
```

### Supervisor Pattern
```python
# Supervisor delegates to workers
graph = StateGraph(State)
graph.add_node("supervisor", supervisor_node)
graph.add_node("worker_1", worker_1_node)
graph.add_node("worker_2", worker_2_node)
graph.add_conditional_edges("supervisor", route_to_worker)
```

### Swarm Pattern
```python
# Autonomous agents collaborate
graph = StateGraph(SwarmState)
for agent in agents:
    graph.add_node(agent.name, agent.node)
    graph.add_edge(agent.name, "coordinator")
graph.add_conditional_edges("coordinator", route_next)
```

### Pipeline Pattern
```python
# Sequential processing
graph = StateGraph(State)
graph.add_node("step_1", step_1)
graph.add_node("step_2", step_2)
graph.add_node("step_3", step_3)
graph.add_edge("step_1", "step_2")
graph.add_edge("step_2", "step_3")
```

## Memory Systems

### Checkpoint (In-Memory)
```python
from langgraph.checkpoint.memory import MemorySaver
checkpointer = MemorySaver()
```

### SQLite
```python
from langgraph.checkpoint.sqlite import SqliteSaver
checkpointer = SqliteSaver.from_conn_string("checkpoints.db")
```

### PostgreSQL
```python
from langgraph.checkpoint.postgres import PostgresSaver
checkpointer = PostgresSaver.from_conn_string(os.getenv("POSTGRES_URL"))
```

### Redis
```python
from langgraph.checkpoint.redis import RedisSaver
checkpointer = RedisSaver.from_conn_string(os.getenv("REDIS_URL"))
```

### MongoDB
```python
from langgraph.checkpoint.mongodb import MongoDBSaver
checkpointer = MongoDBSaver(connection_string=os.getenv("MONGODB_URL"))
```

## Examples

### Create Basic ReAct Agent
```bash
lg:create my-agent \
  --type agent \
  --pattern react \
  --memory checkpoint \
  --cli \
  --tools "search,calculator"
```

### Create Multi-Agent Supervisor System
```bash
lg:create research-team \
  --type multi-agent \
  --pattern supervisor \
  --memory sqlite \
  --mcp \
  --tracing
```

### Create MCP Server
```bash
lg:create tool-server \
  --type agent \
  --pattern tool-calling \
  --mcp \
  --memory none
```

### Create Pipeline Workflow
```bash
lg:create data-pipeline \
  --type workflow \
  --pattern pipeline \
  --memory none \
  --streaming
```

### Use Preset
```bash
lg:create my-agent --preset basic-agent
lg:create my-system --preset supervisor-system
```

## Generated Project Structure

### Agent Project
```
my-agent/
├── pyproject.toml
├── .env.example
├── README.md
├── src/
│   ├── __init__.py
│   ├── agent.py          # Main agent definition
│   ├── state.py          # State schema
│   ├── nodes.py          # Node implementations
│   ├── tools.py          # Tool definitions
│   └── config.py         # Configuration
├── cli.py                # CLI wrapper
├── mcp_server.py         # MCP server (if --mcp)
├── tests/
│   ├── test_agent.py
│   └── test_tools.py
└── docs/
    └── architecture.md
```

### Multi-Agent Project
```
research-team/
├── pyproject.toml
├── .env.example
├── README.md
├── src/
│   ├── __init__.py
│   ├── supervisor.py     # Supervisor agent
│   ├── agents/
│   │   ├── researcher.py
│   │   ├── writer.py
│   │   └── reviewer.py
│   ├── state.py
│   ├── routing.py        # Routing logic
│   └── config.py
├── cli.py
├── mcp_server.py
└── tests/
```

## Dependencies Generated

### Core Dependencies
```toml
[project]
dependencies = [
    "langgraph>=0.2.0",
    "langchain>=0.3.0",
    "langchain-anthropic>=0.2.0",  # if --llm anthropic
    "langsmith>=0.1.0",             # if --tracing
    "typer>=0.12.0",                # if --cli
    "mcp>=1.0.0",                   # if --mcp
]
```

### Memory Dependencies
```toml
# if --memory sqlite
"langgraph-checkpoint-sqlite>=1.0.0"

# if --memory postgres
"langgraph-checkpoint-postgres>=1.0.0"
"psycopg>=3.0.0"

# if --memory redis
"langgraph-checkpoint-redis>=1.0.0"
"redis>=5.0.0"

# if --memory mongodb
"langgraph-checkpoint-mongodb>=1.0.0"
"pymongo>=4.0.0"
```

## Configuration Files Generated

### .env.example
```bash
# LLM Configuration
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here

# LangSmith (if --tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-key-here
LANGCHAIN_PROJECT=my-agent

# Memory Configuration (if applicable)
DATABASE_URL=sqlite:///checkpoints.db
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017
```

### pyproject.toml
```toml
[project]
name = "my-agent"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [...]

[project.scripts]
my-agent = "cli:app"

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
testpaths = ["tests"]
```

## Post-Creation Steps

1. **Setup Environment**
   ```bash
   cd my-agent
   python -m venv .venv
   source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows
   pip install -e .
   ```

2. **Configure API Keys**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run Tests**
   ```bash
   pytest
   ```

4. **Visualize Graph**
   ```bash
   lg:test my-agent --visualize
   ```

5. **Run Agent**
   ```bash
   # If CLI generated
   my-agent "What is LangGraph?"

   # If MCP generated
   mcp run my-agent
   ```

## Error Handling

- **Invalid project name**: Must be valid Python module name
- **Path exists**: Use --force to overwrite
- **Missing API keys**: Warns but continues (add to .env later)
- **Incompatible flags**: Some combinations not allowed (e.g., --type workflow with --pattern supervisor)

## Notes

- All projects use Python 3.11+ for best type checking
- Streaming enabled by default for better UX
- LangSmith tracing recommended for debugging
- Memory systems can be changed later with `lg:memory migrate`
- MCP wrapper can be added later with `lg:mcp expose`

## Related Commands

- `lg:agent add` - Add agents to multi-agent systems
- `lg:node add` - Add nodes to existing graphs
- `lg:memory setup` - Change memory system
- `lg:mcp expose` - Add MCP wrapper
- `lg:deploy` - Deploy to production

## See Also

- LangGraph Documentation: https://langchain-ai.github.io/langgraph/
- Pattern Library: https://langchain-ai.github.io/langgraph/concepts/agentic_concepts/
- MCP Integration: https://modelcontextprotocol.io/
