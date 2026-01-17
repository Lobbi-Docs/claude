"""
LangGraph MCP Server

A Model Context Protocol (MCP) server that exposes LangGraph agents as callable tools.
This allows Claude Code and other MCP clients to discover and invoke LangGraph agents.

Features:
- Dynamic agent discovery and loading
- Streaming response support
- State/checkpoint management
- Agent introspection
- Error handling and logging

Usage:
    python -m langgraph_mcp_server

    Or configure in Claude Desktop:
    {
      "mcpServers": {
        "langgraph-agents": {
          "command": "python",
          "args": ["-m", "langgraph_mcp_server"],
          "env": {
            "AGENT_REGISTRY_PATH": "/path/to/agents"
          }
        }
      }
    }
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from contextlib import asynccontextmanager

# MCP SDK imports
try:
    from mcp.server.models import InitializationOptions
    from mcp.server import NotificationOptions, Server
    from mcp.server.stdio import stdio_server
    from mcp import types
except ImportError:
    print("Error: MCP SDK not installed. Run: pip install mcp", file=sys.stderr)
    sys.exit(1)

# LangGraph imports
try:
    from langgraph.graph import StateGraph
    from langgraph.checkpoint.memory import MemorySaver
    from langchain_core.messages import HumanMessage, AIMessage
except ImportError:
    print("Error: LangGraph not installed. Run: pip install langgraph langchain-core", file=sys.stderr)
    sys.exit(1)

# Local imports
from .agent_registry import AgentRegistry, AgentMetadata

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("langgraph-mcp-server")


class LangGraphMCPServer:
    """MCP Server for LangGraph agents"""

    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize the LangGraph MCP server.

        Args:
            registry_path: Path to agent registry directory.
                          Defaults to ~/.langgraph/agents
        """
        self.server = Server("langgraph-agents")
        self.registry = AgentRegistry(registry_path)
        self.active_threads: Dict[str, Dict[str, Any]] = {}

        # Register handlers
        self._register_handlers()

        logger.info(f"Initialized LangGraph MCP Server with registry at: {self.registry.registry_path}")

    def _register_handlers(self):
        """Register MCP protocol handlers"""

        @self.server.list_tools()
        async def handle_list_tools() -> List[types.Tool]:
            """List all available LangGraph agents as tools"""
            agents = self.registry.list_agents()
            tools = []

            for agent_id, metadata in agents.items():
                tool = types.Tool(
                    name=f"agent_{agent_id}",
                    description=self._build_tool_description(metadata),
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "input": {
                                "type": "string",
                                "description": "Input message or query for the agent"
                            },
                            "thread_id": {
                                "type": "string",
                                "description": "Optional thread ID for conversation continuity"
                            },
                            "config": {
                                "type": "object",
                                "description": "Optional configuration overrides",
                                "properties": {
                                    "model": {"type": "string"},
                                    "temperature": {"type": "number"},
                                    "max_tokens": {"type": "integer"}
                                }
                            }
                        },
                        "required": ["input"]
                    }
                )
                tools.append(tool)

            logger.info(f"Listed {len(tools)} agent tools")
            return tools

        @self.server.call_tool()
        async def handle_call_tool(
            name: str,
            arguments: Dict[str, Any]
        ) -> Sequence[types.TextContent | types.ImageContent | types.EmbeddedResource]:
            """Execute a LangGraph agent tool"""

            # Extract agent ID from tool name
            if not name.startswith("agent_"):
                raise ValueError(f"Invalid tool name: {name}")

            agent_id = name[6:]  # Remove "agent_" prefix

            logger.info(f"Calling agent: {agent_id} with arguments: {arguments}")

            # Validate agent exists
            if not self.registry.agent_exists(agent_id):
                raise ValueError(f"Agent not found: {agent_id}")

            # Extract parameters
            input_message = arguments.get("input")
            thread_id = arguments.get("thread_id")
            config = arguments.get("config", {})

            if not input_message:
                raise ValueError("Missing required parameter: input")

            try:
                # Load and invoke agent
                result = await self._invoke_agent(
                    agent_id=agent_id,
                    input_message=input_message,
                    thread_id=thread_id,
                    config=config
                )

                return [types.TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]

            except Exception as e:
                logger.error(f"Error invoking agent {agent_id}: {str(e)}", exc_info=True)
                return [types.TextContent(
                    type="text",
                    text=json.dumps({
                        "error": str(e),
                        "agent_id": agent_id,
                        "status": "failed"
                    }, indent=2)
                )]

        @self.server.list_resources()
        async def handle_list_resources() -> List[types.Resource]:
            """List available agent resources"""
            agents = self.registry.list_agents()
            resources = []

            for agent_id, metadata in agents.items():
                resource = types.Resource(
                    uri=f"agent://{agent_id}",
                    name=metadata.name,
                    description=metadata.description,
                    mimeType="application/json"
                )
                resources.append(resource)

            return resources

        @self.server.read_resource()
        async def handle_read_resource(uri: str) -> str:
            """Read agent metadata and configuration"""
            if not uri.startswith("agent://"):
                raise ValueError(f"Invalid resource URI: {uri}")

            agent_id = uri[8:]  # Remove "agent://" prefix
            metadata = self.registry.get_agent_metadata(agent_id)

            if not metadata:
                raise ValueError(f"Agent not found: {agent_id}")

            return json.dumps(metadata.to_dict(), indent=2)

        @self.server.list_prompts()
        async def handle_list_prompts() -> List[types.Prompt]:
            """List available agent prompts"""
            agents = self.registry.list_agents()
            prompts = []

            for agent_id, metadata in agents.items():
                prompt = types.Prompt(
                    name=f"invoke_{agent_id}",
                    description=f"Invoke the {metadata.name} agent",
                    arguments=[
                        types.PromptArgument(
                            name="query",
                            description="Query or task for the agent",
                            required=True
                        )
                    ]
                )
                prompts.append(prompt)

            return prompts

        @self.server.get_prompt()
        async def handle_get_prompt(
            name: str,
            arguments: Dict[str, str]
        ) -> types.GetPromptResult:
            """Get a prompt for invoking an agent"""
            if not name.startswith("invoke_"):
                raise ValueError(f"Invalid prompt name: {name}")

            agent_id = name[7:]  # Remove "invoke_" prefix
            metadata = self.registry.get_agent_metadata(agent_id)

            if not metadata:
                raise ValueError(f"Agent not found: {agent_id}")

            query = arguments.get("query", "")

            prompt_text = f"""You are about to invoke the {metadata.name} agent.

Agent Description: {metadata.description}

Capabilities:
{self._format_capabilities(metadata)}

Your Query: {query}

The agent will process your query and return a response. You can continue the conversation by providing a thread_id."""

            return types.GetPromptResult(
                description=f"Prompt for invoking {metadata.name}",
                messages=[
                    types.PromptMessage(
                        role="user",
                        content=types.TextContent(
                            type="text",
                            text=prompt_text
                        )
                    )
                ]
            )

    def _build_tool_description(self, metadata: AgentMetadata) -> str:
        """Build a comprehensive tool description from agent metadata"""
        description_parts = [
            f"{metadata.name}: {metadata.description}",
            f"\nAgent Type: {metadata.agent_type}",
        ]

        if metadata.capabilities:
            capabilities_str = ", ".join(metadata.capabilities)
            description_parts.append(f"Capabilities: {capabilities_str}")

        if metadata.model:
            description_parts.append(f"Model: {metadata.model}")

        if metadata.tools:
            tools_str = ", ".join(metadata.tools)
            description_parts.append(f"Available Tools: {tools_str}")

        return "\n".join(description_parts)

    def _format_capabilities(self, metadata: AgentMetadata) -> str:
        """Format agent capabilities as a bullet list"""
        if not metadata.capabilities:
            return "- General purpose agent"

        return "\n".join(f"- {cap}" for cap in metadata.capabilities)

    async def _invoke_agent(
        self,
        agent_id: str,
        input_message: str,
        thread_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Invoke a LangGraph agent and return the result.

        Args:
            agent_id: Unique identifier for the agent
            input_message: Input message for the agent
            thread_id: Optional thread ID for conversation continuity
            config: Optional configuration overrides

        Returns:
            Dictionary containing agent response and metadata
        """
        # Load agent
        agent_module = self.registry.load_agent(agent_id)

        if not agent_module:
            raise ValueError(f"Failed to load agent: {agent_id}")

        # Get or create compiled graph
        if hasattr(agent_module, 'graph'):
            graph = agent_module.graph
        elif hasattr(agent_module, 'create_graph'):
            graph = agent_module.create_graph()
        else:
            raise ValueError(f"Agent {agent_id} does not expose a graph or create_graph function")

        # Ensure graph is compiled with checkpointer
        if not hasattr(graph, 'invoke'):
            # Not compiled yet, compile with memory saver
            checkpointer = MemorySaver()
            graph = graph.compile(checkpointer=checkpointer)

        # Prepare invocation config
        invoke_config = config or {}

        if thread_id:
            invoke_config["configurable"] = {"thread_id": thread_id}
        else:
            # Generate a new thread ID
            import uuid
            thread_id = str(uuid.uuid4())
            invoke_config["configurable"] = {"thread_id": thread_id}

        # Store thread info
        self.active_threads[thread_id] = {
            "agent_id": agent_id,
            "created_at": asyncio.get_event_loop().time(),
            "message_count": 0
        }

        # Prepare input
        if isinstance(input_message, str):
            agent_input = {"messages": [HumanMessage(content=input_message)]}
        else:
            agent_input = input_message

        try:
            # Invoke agent (streaming if supported)
            if hasattr(graph, 'astream'):
                # Streaming invocation
                response_chunks = []
                async for chunk in graph.astream(agent_input, invoke_config):
                    response_chunks.append(chunk)

                # Combine chunks
                result = self._combine_chunks(response_chunks)
            else:
                # Regular invocation
                result = await graph.ainvoke(agent_input, invoke_config)

            # Update thread info
            self.active_threads[thread_id]["message_count"] += 1
            self.active_threads[thread_id]["last_activity"] = asyncio.get_event_loop().time()

            # Format response
            return {
                "status": "success",
                "agent_id": agent_id,
                "thread_id": thread_id,
                "response": self._format_agent_response(result),
                "message_count": self.active_threads[thread_id]["message_count"]
            }

        except Exception as e:
            logger.error(f"Error during agent invocation: {str(e)}", exc_info=True)
            raise

    def _combine_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Combine streaming chunks into a single result"""
        if not chunks:
            return {}

        # Most LangGraph streams return state updates
        # The last chunk usually contains the final state
        return chunks[-1] if chunks else {}

    def _format_agent_response(self, result: Any) -> Any:
        """Format agent response for JSON serialization"""
        if isinstance(result, dict):
            formatted = {}
            for key, value in result.items():
                if key == "messages" and isinstance(value, list):
                    # Format message list
                    formatted[key] = [self._format_message(msg) for msg in value]
                else:
                    formatted[key] = value
            return formatted
        return result

    def _format_message(self, message: Any) -> Dict[str, Any]:
        """Format a LangChain message for JSON serialization"""
        if hasattr(message, 'content') and hasattr(message, 'type'):
            return {
                "type": message.type,
                "content": message.content
            }
        return str(message)

    async def run(self):
        """Run the MCP server"""
        async with stdio_server() as (read_stream, write_stream):
            logger.info("Starting LangGraph MCP server on stdio")
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="langgraph-agents",
                    server_version="1.0.0",
                    capabilities=self.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={}
                    )
                )
            )


async def main():
    """Main entry point"""
    import os

    # Get registry path from environment or use default
    registry_path = os.getenv("AGENT_REGISTRY_PATH")

    # Create and run server
    server = LangGraphMCPServer(registry_path=registry_path)

    try:
        await server.run()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
