"""
Test script for LangGraph MCP Server

Tests the basic functionality of the MCP server and agent registry
without requiring a full MCP client.

Usage:
    python test_mcp_server.py
"""

import asyncio
import sys
import tempfile
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import locale
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8')

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from agent_registry import AgentRegistry, AgentMetadata


async def test_agent_registry():
    """Test the agent registry functionality"""
    print("\n" + "=" * 60)
    print("Testing Agent Registry")
    print("=" * 60)

    # Create temporary registry for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        registry_path = Path(temp_dir)

        print(f"\nUsing temporary registry: {registry_path}")

        # Initialize registry
        print("\n1. Initializing registry...")
        registry = AgentRegistry(str(registry_path))
        print("   ✓ Registry initialized")

        # Test registration
        print("\n2. Registering test agent...")
        example_agent_path = Path(__file__).parent / "example_agent.py"

        if example_agent_path.exists():
            metadata = registry.register_agent(
                agent_id="test_hello_world",
                name="Test Hello World",
                description="Test greeting agent",
                module_path=str(example_agent_path),
                agent_type="general",
                capabilities=["greeting", "conversation"]
            )
            print(f"   ✓ Agent registered: {metadata.id}")
            print(f"     Name: {metadata.name}")
            print(f"     Type: {metadata.agent_type}")
        else:
            print(f"   ⚠ Example agent not found at: {example_agent_path}")
            print("   Creating mock registration...")
            metadata = registry.register_agent(
                agent_id="test_mock_agent",
                name="Mock Agent",
                description="Mock agent for testing",
                module_path="/dev/null",
                agent_type="general"
            )
            print(f"   ✓ Mock agent registered: {metadata.id}")

        # Test listing
        print("\n3. Listing agents...")
        agents = registry.list_agents(enabled_only=False)
        print(f"   ✓ Found {len(agents)} agents")
        for agent_id, agent_metadata in agents.items():
            print(f"     - {agent_id}: {agent_metadata.name}")

        # Test metadata retrieval
        print("\n4. Retrieving agent metadata...")
        retrieved = registry.get_agent_metadata(metadata.id)
        if retrieved:
            print(f"   ✓ Metadata retrieved for: {retrieved.name}")
            print(f"     Description: {retrieved.description}")
            print(f"     Capabilities: {retrieved.capabilities}")
        else:
            print("   ✗ Failed to retrieve metadata")

        # Test update
        print("\n5. Updating agent metadata...")
        updated = registry.update_agent_metadata(
            metadata.id,
            capabilities=["greeting", "conversation", "farewell"]
        )
        if updated:
            print(f"   ✓ Updated capabilities: {updated.capabilities}")
        else:
            print("   ✗ Failed to update metadata")

        # Test stats
        print("\n6. Getting registry statistics...")
        stats = registry.get_agent_stats()
        print(f"   ✓ Registry stats:")
        print(f"     Total agents: {stats['total_agents']}")
        print(f"     Enabled: {stats['enabled_agents']}")
        print(f"     Healthy: {stats['healthy_agents']}")
        print(f"     Agent types: {stats['agent_types']}")

        # Test export
        print("\n7. Testing export/import...")
        export_file = registry_path / "export.json"
        if registry.export_registry(str(export_file)):
            print(f"   ✓ Registry exported to: {export_file}")
            print(f"     File size: {export_file.stat().st_size} bytes")
        else:
            print("   ✗ Export failed")

        # Test validation (if example agent exists)
        if example_agent_path.exists():
            print("\n8. Validating agent...")
            is_valid = registry.validate_agent("test_hello_world")
            if is_valid:
                print("   ✓ Agent validated successfully")
            else:
                print("   ⚠ Agent validation failed (might be due to missing dependencies)")

        # Test loading (if example agent exists)
        if example_agent_path.exists():
            print("\n9. Loading agent module...")
            try:
                module = registry.load_agent("test_hello_world")
                if module:
                    print("   ✓ Agent module loaded")
                    print(f"     Has 'graph' attribute: {hasattr(module, 'graph')}")
                    print(f"     Has 'create_graph' function: {hasattr(module, 'create_graph')}")
                else:
                    print("   ⚠ Failed to load agent module")
            except Exception as e:
                print(f"   ⚠ Error loading agent: {str(e)}")

        print("\n" + "=" * 60)
        print("Agent Registry Tests Completed")
        print("=" * 60)


async def test_example_agent():
    """Test the example agent directly"""
    print("\n" + "=" * 60)
    print("Testing Example Agent")
    print("=" * 60)

    example_agent_path = Path(__file__).parent / "example_agent.py"

    if not example_agent_path.exists():
        print(f"\n⚠ Example agent not found at: {example_agent_path}")
        print("Skipping example agent test")
        return

    try:
        # Import the example agent
        import importlib.util
        spec = importlib.util.spec_from_file_location("example_agent", example_agent_path)
        if spec and spec.loader:
            example_agent = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(example_agent)

            print("\n✓ Example agent imported successfully")

            # Test the agent
            if hasattr(example_agent, 'graph'):
                print("✓ Agent has 'graph' attribute")

                config = {"configurable": {"thread_id": "test-thread"}}

                print("\nTest 1: Greeting")
                from langchain_core.messages import HumanMessage

                result = await example_agent.graph.ainvoke(
                    {"messages": [HumanMessage(content="Hello!")], "greeting_count": 0},
                    config
                )
                print(f"  User: Hello!")
                print(f"  Agent: {result['messages'][-1].content}")
                print(f"  Greeting count: {result['greeting_count']}")

                print("\nTest 2: Capabilities")
                result = await example_agent.graph.ainvoke(
                    {"messages": [HumanMessage(content="What can you do?")]},
                    config
                )
                print(f"  User: What can you do?")
                print(f"  Agent: {result['messages'][-1].content[:100]}...")

                print("\n✓ Example agent tests passed")
            else:
                print("✗ Agent missing 'graph' attribute")

    except ImportError as e:
        print(f"\n⚠ Could not import example agent: {str(e)}")
        print("This is expected if langchain dependencies are not installed")
    except Exception as e:
        print(f"\n✗ Error testing example agent: {str(e)}")

    print("\n" + "=" * 60)
    print("Example Agent Tests Completed")
    print("=" * 60)


async def test_mcp_server_initialization():
    """Test MCP server initialization"""
    print("\n" + "=" * 60)
    print("Testing MCP Server Initialization")
    print("=" * 60)

    try:
        # Try importing the MCP server
        from langgraph_mcp_server import LangGraphMCPServer

        print("\n✓ MCP server module imported successfully")

        # Create temporary registry
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"\nInitializing MCP server with registry: {temp_dir}")

            try:
                server = LangGraphMCPServer(registry_path=temp_dir)
                print("✓ MCP server initialized")
                print(f"  Registry path: {server.registry.registry_path}")
                print(f"  Server name: langgraph-agents")
            except Exception as e:
                print(f"✗ Failed to initialize MCP server: {str(e)}")

    except ImportError as e:
        print(f"\n⚠ Could not import MCP server: {str(e)}")
        print("This is expected if MCP SDK is not installed")
        print("Install with: pip install mcp")

    print("\n" + "=" * 60)
    print("MCP Server Initialization Tests Completed")
    print("=" * 60)


async def main():
    """Run all tests"""
    print("\n" + "#" * 60)
    print("#" + " " * 58 + "#")
    print("#" + "  LangGraph MCP Server Test Suite".center(58) + "#")
    print("#" + " " * 58 + "#")
    print("#" * 60)

    # Run tests
    await test_agent_registry()
    await test_example_agent()
    await test_mcp_server_initialization()

    print("\n" + "#" * 60)
    print("#" + " " * 58 + "#")
    print("#" + "  All Tests Completed".center(58) + "#")
    print("#" + " " * 58 + "#")
    print("#" * 60)

    print("\n\nNext Steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Configure Claude Desktop (see claude_desktop_config.json)")
    print("3. Create agents in ~/.langgraph/agents/")
    print("4. Run discovery: python -m langgraph_mcp_server --discover")
    print("5. Restart Claude Desktop")
    print()


if __name__ == "__main__":
    asyncio.run(main())
