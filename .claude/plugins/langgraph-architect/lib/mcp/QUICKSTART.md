# LangGraph MCP Server - Quick Start Guide

Get your LangGraph agents running as MCP tools in 5 minutes!

## Prerequisites

- Python 3.10 or higher
- Claude Desktop installed
- Basic familiarity with LangGraph

## Step 1: Install Dependencies (2 minutes)

```bash
cd .claude/plugins/langgraph-architect/lib/mcp
pip install -r requirements.txt
```

Or install individually:

```bash
pip install mcp langgraph langchain-core langchain-anthropic
```

## Step 2: Set Up Agent Registry (30 seconds)

```bash
# Windows
mkdir %USERPROFILE%\.langgraph\agents

# macOS/Linux
mkdir -p ~/.langgraph/agents
```

## Step 3: Test with Example Agent (1 minute)

Copy the example agent to your registry:

```bash
# Windows
mkdir %USERPROFILE%\.langgraph\agents\hello_world
copy example_agent.py %USERPROFILE%\.langgraph\agents\hello_world\agent.py

# macOS/Linux
mkdir -p ~/.langgraph/agents/hello_world
cp example_agent.py ~/.langgraph/agents/hello_world/agent.py
```

Register the agent:

```bash
python -m langgraph_mcp_server --discover
```

You should see:
```
Discovered and registered 1 agents
Total agents in registry: 1
```

## Step 4: Configure Claude Desktop (1 minute)

Open your Claude Desktop config file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "langgraph-agents": {
      "command": "python",
      "args": ["-m", "langgraph_mcp_server"],
      "env": {
        "AGENT_REGISTRY_PATH": "REPLACE_WITH_YOUR_HOME/.langgraph/agents",
        "PYTHONPATH": "REPLACE_WITH_PATH_TO_PLUGIN/lib/mcp"
      }
    }
  }
}
```

**Important**: Replace the paths:

- `AGENT_REGISTRY_PATH`: Full path to `.langgraph/agents` directory
- `PYTHONPATH`: Full path to the MCP server directory

Example for Windows:
```json
{
  "mcpServers": {
    "langgraph-agents": {
      "command": "python",
      "args": ["-m", "langgraph_mcp_server"],
      "env": {
        "AGENT_REGISTRY_PATH": "C:\\Users\\YourName\\.langgraph\\agents",
        "PYTHONPATH": "C:\\Users\\YourName\\pro\\alpha-0.1\\claude\\.claude\\plugins\\langgraph-architect\\lib\\mcp"
      }
    }
  }
}
```

Example for macOS/Linux:
```json
{
  "mcpServers": {
    "langgraph-agents": {
      "command": "python3",
      "args": ["-m", "langgraph_mcp_server"],
      "env": {
        "AGENT_REGISTRY_PATH": "/Users/yourname/.langgraph/agents",
        "PYTHONPATH": "/Users/yourname/pro/alpha-0.1/claude/.claude/plugins/langgraph-architect/lib/mcp"
      }
    }
  }
}
```

## Step 5: Restart Claude Desktop (30 seconds)

1. **Completely quit** Claude Desktop (not just close window)
2. Restart the application
3. Wait for it to fully load

## Step 6: Test It! (30 seconds)

In Claude Desktop, try:

```
What LangGraph agents are available?
```

Claude should respond with information about the `hello_world` agent.

Then try:

```
Use the hello_world agent to greet me
```

Claude will invoke your agent and show the response!

## Verify Installation

### Check Server Status

```bash
python -m langgraph_mcp_server --health
```

Expected output:
```
=== Agent Registry Health Status ===

Registry Path: /path/to/.langgraph/agents
Total Agents: 1
Enabled: 1
Healthy: 1
Unhealthy: 0
```

### List Registered Agents

```bash
python -m langgraph_mcp_server --health
```

### Validate Agents

```bash
python -m langgraph_mcp_server --validate
```

All agents should show "OK".

## Create Your First Agent

### 1. Create Agent Directory

```bash
mkdir ~/.langgraph/agents/my_first_agent
```

### 2. Create agent.py

```python
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

# Define state
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# Define node
def my_node(state: AgentState) -> AgentState:
    messages = state.get("messages", [])
    last_message = messages[-1]

    # Your agent logic here
    response = f"You said: {last_message.content}"

    return {"messages": [AIMessage(content=response)]}

# Create graph
def create_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("process", my_node)
    workflow.set_entry_point("process")
    workflow.add_edge("process", END)

    return workflow.compile(checkpointer=MemorySaver())

# Export compiled graph
graph = create_graph()
```

### 3. Create config.json (Optional)

```json
{
  "name": "My First Agent",
  "description": "My first LangGraph agent",
  "agent_type": "general",
  "capabilities": ["echo", "response"]
}
```

### 4. Register the Agent

```bash
python -m langgraph_mcp_server --discover
```

### 5. Test in Claude Desktop

```
Use my_first_agent to say hello
```

## Next Steps

### Add More Capabilities

Enhance your agent with:
- External tool calls (web search, APIs)
- Multiple nodes and conditional routing
- Long-term memory with vector stores
- Structured output with Pydantic models

### Example: Add Web Search

```python
from langchain_community.tools.tavily_search import TavilySearchResults

search_tool = TavilySearchResults()

def search_node(state: AgentState) -> AgentState:
    query = state["messages"][-1].content
    results = search_tool.invoke(query)
    return {"messages": [AIMessage(content=str(results))]}
```

### Create Multi-Agent Systems

Use the orchestration patterns from the plugin:
- Supervisor pattern
- Worker teams
- Hierarchical agents
- Parallel execution

## Common Issues

### Issue: Server won't start

**Solution**:
```bash
# Check Python version
python --version  # Should be 3.10+

# Verify MCP is installed
pip show mcp

# Test server manually
python -m langgraph_mcp_server
```

### Issue: Agents not visible in Claude

**Solution**:
```bash
# Check registry
cat ~/.langgraph/agents/registry.json

# Re-discover agents
python -m langgraph_mcp_server --discover

# Check Claude Desktop logs
# Windows: %APPDATA%\Claude\logs\
# macOS: ~/Library/Logs/Claude/
```

### Issue: Agent invocation fails

**Solution**:
```bash
# Validate agent
python -m langgraph_mcp_server --validate

# Test agent directly
python ~/.langgraph/agents/my_agent/agent.py

# Check agent health
python -m langgraph_mcp_server --health
```

## Useful Commands

```bash
# Discover new agents
python -m langgraph_mcp_server --discover

# Check health status
python -m langgraph_mcp_server --health

# Validate all agents
python -m langgraph_mcp_server --validate

# Export registry backup
python -m langgraph_mcp_server --export backup.json

# Import registry
python -m langgraph_mcp_server --import backup.json

# Run with custom registry
python -m langgraph_mcp_server --registry-path /custom/path

# Set log level
python -m langgraph_mcp_server --log-level DEBUG
```

## Getting Help

- Check `README.md` for detailed documentation
- Review `claude_desktop_config.json` for configuration examples
- See `example_agent.py` for a complete agent example
- Run tests: `python test_mcp_server.py`

## What's Next?

1. **Explore Examples**: Check the `examples/` directory for more agent patterns
2. **Read Documentation**: Full docs in `README.md`
3. **Join Community**: Share your agents and learn from others
4. **Build Cool Stuff**: Create agents that solve real problems!

---

Happy agent building! 🚀
