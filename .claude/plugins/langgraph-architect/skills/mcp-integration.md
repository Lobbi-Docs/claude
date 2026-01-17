# MCP Integration Skill

```yaml
---
category: integration
activation_keywords:
  - mcp
  - model context protocol
  - mcp server
  - mcp client
  - mcp tools
  - tool integration
  - external tools
  - claude code
  - cli integration
description: Comprehensive guide to Model Context Protocol integration for consuming MCP servers and exposing LangGraph agents as MCP tools
---
```

## Overview

Model Context Protocol (MCP) enables LangGraph agents to consume external tools via MCP servers and expose themselves as tools for other AI applications (like Claude Code). This skill covers both consumption and serving patterns.

## MCP Concepts

### What is MCP?

**Model Context Protocol** is a standard for:
- **Tools:** Functions AI models can call
- **Resources:** Data AI models can access
- **Prompts:** Reusable prompt templates

### MCP in LangGraph Context

```
┌─────────────────┐
│  LangGraph      │
│  Agent          │
└────┬────────────┘
     │
     │ Consumes
     │
┌────▼────────────┐
│  MCP Server     │
│  (Filesystem,   │
│   GitHub, etc)  │
└─────────────────┘

        AND

┌─────────────────┐
│  Claude Code    │
│  or other AI    │
└────┬────────────┘
     │
     │ Consumes
     │
┌────▼────────────┐
│  MCP Server     │
│  (Your          │
│   LangGraph)    │
└─────────────────┘
```

---

## Part 1: Consuming MCP Servers

### 1.1 Basic MCP Tool Consumption

**Use Case:** Add external tool capabilities (filesystem, GitHub, databases, etc.) to your LangGraph agent.

**Implementation:**

```python
from langchain_mcp_adapters import MCPToolkit
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage, add_messages

class AgentWithMCPState(TypedDict):
    """State with MCP tools"""
    messages: Annotated[list[BaseMessage], add_messages]

# Connect to MCP server
filesystem_toolkit = MCPToolkit(
    server_params={
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            "/workspace"
        ]
    }
)

# Get tools from MCP server
filesystem_tools = filesystem_toolkit.get_tools()

# Create model with MCP tools
model = ChatOpenAI(model="gpt-4").bind_tools(filesystem_tools)

# Agent node using MCP tools
def agent_with_mcp(state: AgentWithMCPState):
    response = model.invoke(state["messages"])
    return {"messages": [response]}

# Tool executor for MCP tools
from langgraph.prebuilt import ToolNode
tool_node = ToolNode(filesystem_tools)

# Build graph
workflow = StateGraph(AgentWithMCPState)
workflow.add_node("agent", agent_with_mcp)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {"continue": "tools", "end": END}
)
workflow.add_edge("tools", "agent")

graph = workflow.compile()
```

### 1.2 Multiple MCP Servers

**Use Case:** Combine tools from multiple MCP servers in one agent.

**Implementation:**

```python
from langchain_mcp_adapters import MCPToolkit

# Connect to multiple MCP servers
filesystem_toolkit = MCPToolkit(
    server_params={
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    }
)

github_toolkit = MCPToolkit(
    server_params={
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
            "GITHUB_TOKEN": os.getenv("GITHUB_TOKEN")
        }
    }
)

postgres_toolkit = MCPToolkit(
    server_params={
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres"],
        "env": {
            "POSTGRES_CONNECTION_STRING": os.getenv("DATABASE_URL")
        }
    }
)

# Combine all tools
all_mcp_tools = (
    filesystem_toolkit.get_tools() +
    github_toolkit.get_tools() +
    postgres_toolkit.get_tools()
)

# Add custom tools
custom_tools = [search_tool, calculator_tool]
all_tools = all_mcp_tools + custom_tools

# Create agent with all tools
model = ChatOpenAI(model="gpt-4").bind_tools(all_tools)

def multi_mcp_agent(state: AgentState):
    response = model.invoke(state["messages"])
    return {"messages": [response]}
```

### 1.3 Conditional MCP Tool Loading

**Use Case:** Load different MCP tools based on agent context or user permissions.

**Implementation:**

```python
def get_mcp_tools_for_context(user_role: str, task_type: str) -> list:
    """Load MCP tools based on context"""
    tools = []

    # Base tools for everyone
    filesystem_toolkit = MCPToolkit(
        server_params={
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
        }
    )
    tools.extend(filesystem_toolkit.get_tools())

    # Admin-only tools
    if user_role == "admin":
        github_toolkit = MCPToolkit(
            server_params={
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-github"]
            }
        )
        tools.extend(github_toolkit.get_tools())

        database_toolkit = MCPToolkit(
            server_params={
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-postgres"]
            }
        )
        tools.extend(database_toolkit.get_tools())

    # Task-specific tools
    if task_type == "research":
        web_toolkit = MCPToolkit(
            server_params={
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-brave-search"]
            }
        )
        tools.extend(web_toolkit.get_tools())

    return tools

# Use in agent
def contextual_agent(state: AgentState):
    user_role = state.get("user_role", "user")
    task_type = state.get("task_type", "general")

    # Get appropriate tools
    tools = get_mcp_tools_for_context(user_role, task_type)

    # Create model with contextual tools
    model = ChatOpenAI(model="gpt-4").bind_tools(tools)
    response = model.invoke(state["messages"])

    return {"messages": [response]}
```

### 1.4 MCP Resource Access

**Use Case:** Access data/resources from MCP servers (not just tools).

**Implementation:**

```python
from langchain_mcp_adapters import MCPToolkit

# Connect to MCP server with resources
toolkit = MCPToolkit(
    server_params={
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    }
)

# List available resources
resources = toolkit.list_resources()
print(f"Available resources: {resources}")

# Read specific resource
resource_content = toolkit.read_resource("file:///workspace/README.md")

# Use resource in agent
def agent_with_resources(state: AgentState):
    # Read relevant resources
    relevant_docs = [
        toolkit.read_resource(uri)
        for uri in find_relevant_resources(state["messages"])
    ]

    # Add to context
    context = "\n\n".join(relevant_docs)
    messages = [
        SystemMessage(content=f"Relevant documentation:\n{context}"),
        *state["messages"]
    ]

    response = model.invoke(messages)
    return {"messages": [response]}
```

---

## Part 2: Exposing LangGraph as MCP Server

### 2.1 Basic MCP Server

**Use Case:** Make your LangGraph agent available as a tool for Claude Code and other AI applications.

**Implementation:**

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import asyncio

# Your LangGraph agent
def create_research_agent():
    """Create research agent graph"""
    # ... graph implementation ...
    return workflow.compile(checkpointer=checkpointer)

research_agent = create_research_agent()

# Create MCP server
server = Server("research-agent")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools (your agent)"""
    return [
        Tool(
            name="research_topic",
            description="Research a topic comprehensively using multi-agent workflow",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "Topic to research"
                    },
                    "depth": {
                        "type": "string",
                        "enum": ["shallow", "medium", "deep"],
                        "description": "Research depth"
                    }
                },
                "required": ["topic"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Execute tool (your agent)"""
    if name == "research_topic":
        # Execute LangGraph agent
        config = {
            "configurable": {
                "thread_id": f"research-{time.time()}"
            }
        }

        result = research_agent.invoke(
            {
                "topic": arguments["topic"],
                "depth": arguments.get("depth", "medium")
            },
            config
        )

        # Return result
        return [
            TextContent(
                type="text",
                text=result["summary"]
            )
        ]

    raise ValueError(f"Unknown tool: {name}")

# Run MCP server
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())
```

### 2.2 Multi-Agent MCP Server

**Use Case:** Expose multiple LangGraph agents as separate MCP tools.

**Implementation:**

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Create multiple agents
research_agent = create_research_agent()
code_agent = create_code_generation_agent()
review_agent = create_code_review_agent()

# MCP Server
server = Server("multi-agent-system")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List all available agents as tools"""
    return [
        Tool(
            name="research",
            description="Research a topic using multi-source research agent",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "sources": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Preferred sources"
                    }
                },
                "required": ["topic"]
            }
        ),
        Tool(
            name="generate_code",
            description="Generate code from specifications",
            inputSchema={
                "type": "object",
                "properties": {
                    "specification": {"type": "string"},
                    "language": {"type": "string"},
                    "framework": {"type": "string"}
                },
                "required": ["specification", "language"]
            }
        ),
        Tool(
            name="review_code",
            description="Review code for quality, security, and best practices",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "language": {"type": "string"},
                    "focus_areas": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["code", "language"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Route to appropriate agent"""

    config = {"configurable": {"thread_id": f"{name}-{time.time()}"}}

    if name == "research":
        result = research_agent.invoke(arguments, config)
        return [TextContent(type="text", text=result["summary"])]

    elif name == "generate_code":
        result = code_agent.invoke(arguments, config)
        return [TextContent(type="text", text=result["code"])]

    elif name == "review_code":
        result = review_agent.invoke(arguments, config)
        return [TextContent(type="text", text=result["review"])]

    raise ValueError(f"Unknown tool: {name}")

# Run server
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())
```

### 2.3 Streaming MCP Server

**Use Case:** Stream agent responses for real-time feedback.

**Implementation:**

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("streaming-agent")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="chat",
            description="Chat with streaming agent",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                },
                "required": ["message"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Execute with streaming"""
    if name == "chat":
        config = {"configurable": {"thread_id": f"chat-{time.time()}"}}

        # Stream agent responses
        full_response = ""
        async for chunk in agent_graph.astream(
            {"messages": [HumanMessage(content=arguments["message"])]},
            config
        ):
            # Accumulate chunks
            if "messages" in chunk:
                for msg in chunk["messages"]:
                    if hasattr(msg, "content"):
                        full_response += msg.content

        return [TextContent(type="text", text=full_response)]

    raise ValueError(f"Unknown tool: {name}")
```

---

## Part 3: Claude Code Integration

### 3.1 Making LangGraph Agents CLI-Accessible

**Use Case:** Use your LangGraph agents directly in Claude Code.

**Setup:**

```python
# agent_cli.py
import sys
import json
from langgraph_agent import create_agent

def main():
    """CLI wrapper for LangGraph agent"""
    if len(sys.argv) < 2:
        print("Usage: python agent_cli.py <command> [args...]")
        sys.exit(1)

    command = sys.argv[1]
    agent = create_agent()

    if command == "research":
        topic = sys.argv[2] if len(sys.argv) > 2 else ""
        config = {"configurable": {"thread_id": f"research-{time.time()}"}}

        result = agent.invoke({"topic": topic}, config)
        print(json.dumps(result, indent=2))

    elif command == "chat":
        message = sys.argv[2] if len(sys.argv) > 2 else ""
        config = {"configurable": {"thread_id": "cli-session"}}

        result = agent.invoke(
            {"messages": [HumanMessage(content=message)]},
            config
        )
        print(result["messages"][-1].content)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

**MCP Config for Claude Code:**

```json
{
  "mcpServers": {
    "langgraph-research-agent": {
      "command": "python",
      "args": ["/path/to/agent_mcp_server.py"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

### 3.2 Full Claude Code Integration

**agent_mcp_server.py:**

```python
#!/usr/bin/env python3
"""MCP server exposing LangGraph agent for Claude Code"""

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, Resource, TextResourceContents
import asyncio
from langgraph_agent import create_agent

# Create agent
agent = create_agent()

# MCP Server
server = Server("langgraph-agent")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="research_topic",
            description="Deep research on any topic using multi-agent system",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Topic to research"},
                    "depth": {"type": "string", "enum": ["shallow", "medium", "deep"]}
                },
                "required": ["topic"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "research_topic":
        config = {"configurable": {"thread_id": f"research-{time.time()}"}}
        result = agent.invoke(arguments, config)
        return [TextContent(type="text", text=result["summary"])]

    raise ValueError(f"Unknown tool: {name}")

@server.list_resources()
async def list_resources() -> list[Resource]:
    """Expose agent state as resources"""
    return [
        Resource(
            uri="agent://state",
            name="Agent State",
            description="Current agent state and memory"
        )
    ]

@server.read_resource()
async def read_resource(uri: str) -> TextResourceContents:
    if uri == "agent://state":
        state = agent.get_state({"configurable": {"thread_id": "default"}})
        return TextResourceContents(
            uri=uri,
            mimeType="application/json",
            text=json.dumps(state.values, indent=2)
        )

    raise ValueError(f"Unknown resource: {uri}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Part 4: Distributed Agent Architectures

### 4.1 Agent Network via MCP

**Architecture:**

```
┌──────────────┐
│  Claude Code │
└──────┬───────┘
       │
       │ MCP
       │
┌──────▼────────┐     MCP      ┌──────────────┐
│ Coordinator   ├──────────────►│ Research     │
│ Agent         │               │ Agent (MCP)  │
└──────┬────────┘               └──────────────┘
       │
       │ MCP
       │
┌──────▼────────┐               ┌──────────────┐
│ Code          │     MCP       │ Review       │
│ Agent (MCP)   ├──────────────►│ Agent (MCP)  │
└───────────────┘               └──────────────┘
```

**Implementation:**

```python
# Coordinator agent that calls other MCP agents
from langchain_mcp_adapters import MCPToolkit

# Connect to other agents as MCP servers
research_toolkit = MCPToolkit(
    server_params={
        "command": "python",
        "args": ["research_agent_mcp.py"]
    }
)

code_toolkit = MCPToolkit(
    server_params={
        "command": "python",
        "args": ["code_agent_mcp.py"]
    }
)

review_toolkit = MCPToolkit(
    server_params={
        "command": "python",
        "args": ["review_agent_mcp.py"]
    }
)

# Combine tools from all agents
all_agent_tools = (
    research_toolkit.get_tools() +
    code_toolkit.get_tools() +
    review_toolkit.get_tools()
)

# Coordinator agent
model = ChatOpenAI(model="gpt-4").bind_tools(all_agent_tools)

def coordinator_agent(state: CoordinatorState):
    """Coordinates calls to specialized agents via MCP"""
    response = model.invoke(state["messages"])
    return {"messages": [response]}

# Build coordinator graph
workflow = StateGraph(CoordinatorState)
workflow.add_node("coordinator", coordinator_agent)
workflow.add_node("tools", ToolNode(all_agent_tools))

# ... rest of graph setup ...
```

---

## Best Practices

### 1. MCP Server Design
- Keep tool schemas clear and well-documented
- Implement proper error handling
- Use streaming for long-running operations
- Version your tool interfaces

### 2. Security
- Validate all inputs
- Implement authentication when needed
- Sandbox tool execution
- Rate limit requests

### 3. Performance
- Cache MCP connections
- Use connection pooling
- Implement timeouts
- Monitor resource usage

### 4. Testing
- Test MCP servers independently
- Mock MCP servers in agent tests
- Test error conditions
- Load testing for production

### 5. Deployment
- Package MCP servers properly
- Document dependencies
- Provide setup instructions
- Monitor in production

---

## Resources

- **MCP Specification:** https://modelcontextprotocol.io/
- **LangChain MCP:** https://github.com/langchain-ai/langchain-mcp-adapters
- **MCP Servers:** https://github.com/modelcontextprotocol/servers
- **Claude Code MCP:** https://docs.anthropic.com/claude/docs/mcp

---

**Use this skill when integrating external tools via MCP or exposing your LangGraph agents as MCP services.**
