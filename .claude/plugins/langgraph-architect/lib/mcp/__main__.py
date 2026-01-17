"""
Main entry point for LangGraph MCP Server

Allows the package to be run as a module:
    python -m langgraph_mcp_server

Supports command-line arguments for various operations:
    --discover          Discover and register agents from registry path
    --validate          Validate all registered agents
    --health            Show health status of all agents
    --export FILE       Export registry to JSON file
    --import FILE       Import registry from JSON file
    --config FILE       Use custom configuration file
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

from .langgraph_mcp_server import LangGraphMCPServer, main as run_server
from .agent_registry import AgentRegistry


def setup_logging(log_level: str = "INFO"):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def discover_agents(registry_path: str = None):
    """Discover and register agents"""
    registry = AgentRegistry(registry_path)
    count = registry.discover_agents()
    print(f"Discovered and registered {count} agents")
    print(f"Total agents in registry: {len(registry.list_agents())}")
    return 0


def validate_agents(registry_path: str = None):
    """Validate all registered agents"""
    registry = AgentRegistry(registry_path)
    agents = registry.list_agents()

    if not agents:
        print("No agents registered")
        return 1

    print(f"Validating {len(agents)} agents...")
    valid_count = 0
    invalid_count = 0

    for agent_id, metadata in agents.items():
        print(f"  Validating {agent_id}... ", end="")
        if registry.validate_agent(agent_id):
            print("OK")
            valid_count += 1
        else:
            print("FAILED")
            invalid_count += 1

    print(f"\nResults: {valid_count} valid, {invalid_count} invalid")
    return 0 if invalid_count == 0 else 1


def show_health(registry_path: str = None):
    """Show health status of all agents"""
    registry = AgentRegistry(registry_path)
    stats = registry.get_agent_stats()

    print("\n=== Agent Registry Health Status ===\n")
    print(f"Registry Path: {stats['registry_path']}")
    print(f"Total Agents: {stats['total_agents']}")
    print(f"Enabled: {stats['enabled_agents']}")
    print(f"Healthy: {stats['healthy_agents']}")
    print(f"Unhealthy: {stats['unhealthy_agents']}")

    if stats['agent_types']:
        print("\nAgent Types:")
        for agent_type, count in stats['agent_types'].items():
            print(f"  {agent_type}: {count}")

    agents = registry.list_agents(enabled_only=False)

    if agents:
        print("\n=== Individual Agent Status ===\n")
        for agent_id, metadata in agents.items():
            status_icon = "✓" if metadata.health_status == "healthy" else "✗"
            enabled_icon = "●" if metadata.enabled else "○"
            print(f"{status_icon} {enabled_icon} {agent_id}")
            print(f"    Name: {metadata.name}")
            print(f"    Type: {metadata.agent_type}")
            print(f"    Health: {metadata.health_status}")
            print(f"    Invocations: {metadata.invocation_count}")
            if metadata.last_invoked:
                print(f"    Last Invoked: {metadata.last_invoked}")
            print()

    return 0


def export_registry(registry_path: str = None, output_file: str = "registry_export.json"):
    """Export registry to JSON file"""
    registry = AgentRegistry(registry_path)
    if registry.export_registry(output_file):
        print(f"Registry exported to: {output_file}")
        return 0
    else:
        print("Export failed")
        return 1


def import_registry(registry_path: str = None, input_file: str = None, merge: bool = True):
    """Import registry from JSON file"""
    if not input_file or not Path(input_file).exists():
        print(f"File not found: {input_file}")
        return 1

    registry = AgentRegistry(registry_path)
    count = registry.import_registry(input_file, merge=merge)
    print(f"Imported {count} agents from: {input_file}")
    return 0


def main():
    """Main entry point with argument parsing"""
    parser = argparse.ArgumentParser(
        description="LangGraph MCP Server - Expose LangGraph agents as MCP tools"
    )

    parser.add_argument(
        "--discover",
        action="store_true",
        help="Discover and register agents from registry path"
    )

    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate all registered agents"
    )

    parser.add_argument(
        "--health",
        action="store_true",
        help="Show health status of all agents"
    )

    parser.add_argument(
        "--export",
        type=str,
        metavar="FILE",
        help="Export registry to JSON file"
    )

    parser.add_argument(
        "--import",
        dest="import_file",
        type=str,
        metavar="FILE",
        help="Import registry from JSON file"
    )

    parser.add_argument(
        "--registry-path",
        type=str,
        metavar="PATH",
        help="Path to agent registry directory"
    )

    parser.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging level (default: INFO)"
    )

    parser.add_argument(
        "--config",
        type=str,
        metavar="FILE",
        help="Path to configuration file (not implemented yet)"
    )

    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Replace registry when importing (default is merge)"
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)

    # Handle operations
    if args.discover:
        return discover_agents(args.registry_path)

    elif args.validate:
        return validate_agents(args.registry_path)

    elif args.health:
        return show_health(args.registry_path)

    elif args.export:
        return export_registry(args.registry_path, args.export)

    elif args.import_file:
        return import_registry(args.registry_path, args.import_file, merge=not args.no_merge)

    else:
        # Default: Run MCP server
        try:
            asyncio.run(run_server())
            return 0
        except KeyboardInterrupt:
            print("\nServer stopped")
            return 0
        except Exception as e:
            print(f"Server error: {str(e)}", file=sys.stderr)
            return 1


if __name__ == "__main__":
    sys.exit(main())
