"""
Research Assistant MCP Server

Exposes the research assistant as an MCP (Model Context Protocol) server.
"""

import asyncio
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from main import research


# Create MCP server
mcp_server = Server("research-assistant")


@mcp_server.list_tools()
async def list_tools() -> list[Tool]:
    """
    List available MCP tools.
    """
    return [
        Tool(
            name="research_topic",
            description=(
                "Conduct comprehensive research on a topic using web search, "
                "academic papers, and semantic memory. Returns a detailed "
                "synthesis with sources and confidence assessment."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "The topic to research"
                    },
                    "depth": {
                        "type": "string",
                        "enum": ["quick", "standard", "comprehensive"],
                        "description": "Depth of research to perform",
                        "default": "standard"
                    },
                    "focus": {
                        "type": "string",
                        "description": "Specific aspect to focus on (optional)"
                    }
                },
                "required": ["topic"]
            }
        ),
        Tool(
            name="verify_claim",
            description=(
                "Verify a factual claim using research sources. "
                "Returns verification status, confidence, and supporting sources."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "claim": {
                        "type": "string",
                        "description": "The claim to verify"
                    },
                    "context": {
                        "type": "string",
                        "description": "Additional context for verification (optional)"
                    }
                },
                "required": ["claim"]
            }
        ),
        Tool(
            name="compare_topics",
            description=(
                "Research and compare multiple topics side-by-side. "
                "Returns a comparative analysis with similarities and differences."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "topics": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Topics to compare (2-5 topics)",
                        "minItems": 2,
                        "maxItems": 5
                    },
                    "criteria": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Comparison criteria (optional)"
                    }
                },
                "required": ["topics"]
            }
        )
    ]


@mcp_server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """
    Handle MCP tool calls.

    Args:
        name: Tool name
        arguments: Tool arguments

    Returns:
        List of text content responses
    """
    try:
        if name == "research_topic":
            return await handle_research_topic(arguments)

        elif name == "verify_claim":
            return await handle_verify_claim(arguments)

        elif name == "compare_topics":
            return await handle_compare_topics(arguments)

        else:
            return [TextContent(
                type="text",
                text=f"Unknown tool: {name}"
            )]

    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Error executing tool '{name}': {str(e)}"
        )]


async def handle_research_topic(arguments: dict) -> list[TextContent]:
    """
    Handle research_topic tool calls.

    Args:
        arguments: Tool arguments

    Returns:
        Research results as text content
    """
    topic = arguments.get("topic")
    depth = arguments.get("depth", "standard")
    focus = arguments.get("focus", "")

    # Build enhanced query
    query = topic
    if focus:
        query = f"{topic} (focusing on: {focus})"

    # Generate unique session ID
    from datetime import datetime
    session_id = f"mcp-research-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Conduct research
    result = await research(query, session_id=session_id)

    # Format response
    synthesis = result.get("synthesis", "No synthesis generated")
    confidence = result.get("confidence", 0)
    web_count = len(result.get("web_results", []))
    paper_count = len(result.get("paper_results", []))

    response_text = f"""# Research Results: {topic}

{synthesis}

---

**Metadata:**
- Confidence: {confidence:.1%}
- Web Sources: {web_count}
- Academic Sources: {paper_count}
- Research Depth: {depth}
"""

    if focus:
        response_text += f"- Focus Area: {focus}\n"

    return [TextContent(
        type="text",
        text=response_text
    )]


async def handle_verify_claim(arguments: dict) -> list[TextContent]:
    """
    Handle verify_claim tool calls.

    Args:
        arguments: Tool arguments

    Returns:
        Verification results
    """
    claim = arguments.get("claim")
    context = arguments.get("context", "")

    # Build verification query
    query = f"Verify this claim: {claim}"
    if context:
        query += f"\n\nContext: {context}"

    # Generate session ID
    from datetime import datetime
    session_id = f"mcp-verify-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Conduct research for verification
    result = await research(query, session_id=session_id)

    # Format response
    synthesis = result.get("synthesis", "No verification available")
    confidence = result.get("confidence", 0)

    response_text = f"""# Claim Verification

**Claim:** {claim}

**Verification Results:**

{synthesis}

---

**Verification Confidence:** {confidence:.1%}
"""

    if context:
        response_text += f"\n**Context Provided:** {context}\n"

    return [TextContent(
        type="text",
        text=response_text
    )]


async def handle_compare_topics(arguments: dict) -> list[TextContent]:
    """
    Handle compare_topics tool calls.

    Args:
        arguments: Tool arguments

    Returns:
        Comparison results
    """
    topics = arguments.get("topics", [])
    criteria = arguments.get("criteria", [])

    if len(topics) < 2:
        return [TextContent(
            type="text",
            text="Error: At least 2 topics are required for comparison"
        )]

    # Build comparison query
    topics_str = ", ".join(topics)
    query = f"Compare and contrast these topics: {topics_str}"

    if criteria:
        criteria_str = ", ".join(criteria)
        query += f"\n\nCompare based on these criteria: {criteria_str}"

    # Generate session ID
    from datetime import datetime
    session_id = f"mcp-compare-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Conduct comparative research
    result = await research(query, session_id=session_id)

    # Format response
    synthesis = result.get("synthesis", "No comparison available")
    confidence = result.get("confidence", 0)

    response_text = f"""# Topic Comparison

**Topics:** {topics_str}

**Comparative Analysis:**

{synthesis}

---

**Analysis Confidence:** {confidence:.1%}
**Topics Analyzed:** {len(topics)}
"""

    if criteria:
        response_text += f"**Comparison Criteria:** {', '.join(criteria)}\n"

    return [TextContent(
        type="text",
        text=response_text
    )]


async def main():
    """
    Run the MCP server using stdio transport.
    """
    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(
            read_stream,
            write_stream,
            mcp_server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())


# ============================================================================
# Claude Desktop Configuration
# ============================================================================

"""
To use this MCP server with Claude Desktop, add to your config:

macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
Windows: %APPDATA%/Claude/claude_desktop_config.json

{
  "mcpServers": {
    "research-assistant": {
      "command": "python",
      "args": ["/path/to/research-assistant/mcp_server.py"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here",
        "OPENAI_API_KEY": "your-key-here"
      }
    }
  }
}

Then restart Claude Desktop.
"""

# ============================================================================
# Testing
# ============================================================================

"""
Test the MCP server:

1. Start the server:
   python mcp_server.py

2. Use MCP Inspector:
   npx @modelcontextprotocol/inspector python mcp_server.py

3. Test tool calls:
   mcp call research-assistant research_topic '{"topic": "LangGraph"}'
   mcp call research-assistant verify_claim '{"claim": "The Earth is round"}'
   mcp call research-assistant compare_topics '{"topics": ["Python", "JavaScript"]}'
"""
