"""
LangGraph MCP Server Package

Provides MCP (Model Context Protocol) server functionality for LangGraph agents.
Allows LangGraph agents to be discovered and invoked as MCP tools from Claude Desktop
and Claude Code.

Main components:
- langgraph_mcp_server: MCP server implementation
- agent_registry: Agent registration and discovery system

Usage:
    # Run as a module
    python -m langgraph_mcp_server

    # Import in Python
    from langgraph_mcp_server import LangGraphMCPServer
    from agent_registry import AgentRegistry

Version: 1.0.0
Author: Brookside BI
License: MIT
"""

__version__ = "1.0.0"
__author__ = "Brookside BI"
__license__ = "MIT"

# Core components
from .agent_registry import AgentRegistry, AgentMetadata

# Optional: Only import server if running as main
try:
    from .langgraph_mcp_server import LangGraphMCPServer
except ImportError:
    # MCP SDK might not be installed yet
    LangGraphMCPServer = None

__all__ = [
    "AgentRegistry",
    "AgentMetadata",
    "LangGraphMCPServer",
    "__version__",
]
