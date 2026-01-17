"""
Installation script for LangGraph MCP Server

Automates the setup process for the MCP server integration.

Usage:
    python install.py
"""

import json
import os
import sys
import subprocess
from pathlib import Path
import shutil


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")


def print_step(step_num, text):
    """Print a step number"""
    print(f"\n[{step_num}] {text}")


def print_success(text):
    """Print success message"""
    print(f"    ✓ {text}")


def print_warning(text):
    """Print warning message"""
    print(f"    ⚠ {text}")


def print_error(text):
    """Print error message"""
    print(f"    ✗ {text}")


def check_python_version():
    """Check Python version"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print_error(f"Python 3.10+ required, found {version.major}.{version.minor}")
        return False
    print_success(f"Python {version.major}.{version.minor}.{version.micro}")
    return True


def install_dependencies():
    """Install Python dependencies"""
    requirements_file = Path(__file__).parent / "requirements.txt"

    if not requirements_file.exists():
        print_error("requirements.txt not found")
        return False

    print("    Installing dependencies...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE
        )
        print_success("Dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install dependencies: {e}")
        return False


def create_agent_registry():
    """Create agent registry directory"""
    if sys.platform == 'win32':
        registry_path = Path.home() / ".langgraph" / "agents"
    else:
        registry_path = Path.home() / ".langgraph" / "agents"

    try:
        registry_path.mkdir(parents=True, exist_ok=True)
        print_success(f"Agent registry created at: {registry_path}")
        return str(registry_path)
    except Exception as e:
        print_error(f"Failed to create registry: {e}")
        return None


def setup_example_agent(registry_path):
    """Set up example agent"""
    example_agent = Path(__file__).parent / "example_agent.py"
    agent_dir = Path(registry_path) / "hello_world"

    try:
        agent_dir.mkdir(parents=True, exist_ok=True)
        agent_file = agent_dir / "agent.py"

        shutil.copy(example_agent, agent_file)

        # Create config.json
        config = {
            "name": "Hello World",
            "description": "Simple greeting agent for testing",
            "version": "1.0.0",
            "agent_type": "general",
            "capabilities": ["greeting", "conversation"],
            "default_config": {
                "temperature": 0.7
            }
        }

        config_file = agent_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        print_success(f"Example agent installed at: {agent_dir}")
        return True
    except Exception as e:
        print_error(f"Failed to setup example agent: {e}")
        return False


def discover_agents():
    """Run agent discovery"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "langgraph_mcp_server", "--discover"],
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print_success("Agents discovered and registered")
            # Print discovery output
            for line in result.stdout.split('\n'):
                if line.strip():
                    print(f"      {line}")
            return True
        else:
            print_error("Agent discovery failed")
            print(f"      {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Failed to run discovery: {e}")
        return False


def get_claude_desktop_config_path():
    """Get Claude Desktop config path for current platform"""
    if sys.platform == 'win32':
        config_dir = Path(os.environ.get('APPDATA', '')) / "Claude"
    elif sys.platform == 'darwin':
        config_dir = Path.home() / "Library" / "Application Support" / "Claude"
    else:  # Linux
        config_dir = Path.home() / ".config" / "Claude"

    return config_dir / "claude_desktop_config.json"


def generate_claude_config(registry_path):
    """Generate Claude Desktop configuration"""
    mcp_dir = Path(__file__).parent.absolute()

    config = {
        "mcpServers": {
            "langgraph-agents": {
                "command": "python" if sys.platform == 'win32' else "python3",
                "args": ["-m", "langgraph_mcp_server"],
                "env": {
                    "AGENT_REGISTRY_PATH": str(registry_path),
                    "PYTHONPATH": str(mcp_dir),
                    "LOG_LEVEL": "INFO"
                }
            }
        }
    }

    config_path = get_claude_desktop_config_path()

    print(f"\n    Claude Desktop config path: {config_path}")
    print("\n    Suggested configuration:")
    print(json.dumps(config, indent=2))

    return config, config_path


def update_claude_config(config, config_path):
    """Update Claude Desktop configuration"""
    try:
        # Check if config file exists
        if config_path.exists():
            print_warning("Claude Desktop config already exists")
            response = input("\n    Merge with existing config? (y/n): ").lower()

            if response != 'y':
                print("    Skipping config update")
                return False

            # Read existing config
            with open(config_path, 'r') as f:
                existing_config = json.load(f)

            # Merge configs
            if "mcpServers" not in existing_config:
                existing_config["mcpServers"] = {}

            existing_config["mcpServers"].update(config["mcpServers"])
            config = existing_config

        # Create directory if needed
        config_path.parent.mkdir(parents=True, exist_ok=True)

        # Write config
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        print_success(f"Claude Desktop config updated: {config_path}")
        return True

    except Exception as e:
        print_error(f"Failed to update config: {e}")
        print("\n    Please manually add the configuration shown above.")
        return False


def run_tests():
    """Run test suite"""
    test_file = Path(__file__).parent / "test_mcp_server.py"

    if not test_file.exists():
        print_warning("Test file not found, skipping tests")
        return True

    try:
        result = subprocess.run(
            [sys.executable, str(test_file)],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            print_success("All tests passed")
            return True
        else:
            print_error("Some tests failed")
            print(f"\n{result.stdout}")
            return False
    except subprocess.TimeoutExpired:
        print_error("Tests timed out")
        return False
    except Exception as e:
        print_error(f"Failed to run tests: {e}")
        return False


def main():
    """Main installation flow"""
    print_header("LangGraph MCP Server Installation")

    # Step 1: Check Python version
    print_step(1, "Checking Python version...")
    if not check_python_version():
        sys.exit(1)

    # Step 2: Install dependencies
    print_step(2, "Installing dependencies...")
    if not install_dependencies():
        print_warning("Some dependencies may have failed to install")
        print("    You can install manually with: pip install -r requirements.txt")

    # Step 3: Create agent registry
    print_step(3, "Creating agent registry...")
    registry_path = create_agent_registry()
    if not registry_path:
        print_error("Failed to create agent registry")
        sys.exit(1)

    # Step 4: Setup example agent
    print_step(4, "Setting up example agent...")
    if not setup_example_agent(registry_path):
        print_warning("Example agent setup failed, continuing anyway")

    # Step 5: Discover agents
    print_step(5, "Discovering agents...")
    if not discover_agents():
        print_warning("Agent discovery failed, you may need to run it manually")

    # Step 6: Generate Claude Desktop config
    print_step(6, "Generating Claude Desktop configuration...")
    config, config_path = generate_claude_config(registry_path)

    response = input("\n    Update Claude Desktop config automatically? (y/n): ").lower()

    if response == 'y':
        update_claude_config(config, config_path)
    else:
        print("\n    Please manually update your Claude Desktop configuration.")
        print(f"    Config file: {config_path}")
        print("\n    Add this to your configuration:")
        print(json.dumps(config, indent=2))

    # Step 7: Run tests
    print_step(7, "Running tests...")
    response = input("\n    Run tests now? (y/n): ").lower()

    if response == 'y':
        if not run_tests():
            print_warning("Some tests failed, but installation may still work")

    # Final instructions
    print_header("Installation Complete!")

    print("Next steps:")
    print("  1. Restart Claude Desktop (completely quit and reopen)")
    print("  2. In Claude Desktop, ask: 'What LangGraph agents are available?'")
    print("  3. Try: 'Use the hello_world agent to greet me'")
    print("\nFor more information:")
    print("  - See QUICKSTART.md for usage guide")
    print("  - See README.md for detailed documentation")
    print("  - Run: python -m langgraph_mcp_server --health")
    print()

    print("Useful commands:")
    print("  python -m langgraph_mcp_server --discover  # Find new agents")
    print("  python -m langgraph_mcp_server --health    # Check agent status")
    print("  python -m langgraph_mcp_server --validate  # Validate agents")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInstallation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nInstallation failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
