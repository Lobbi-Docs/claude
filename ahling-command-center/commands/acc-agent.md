---
description: Create and manage Microsoft Agent Framework multi-agent systems (AutoGen, Semantic Kernel)
argument-hint: "<operation> [agent-name] [--framework FRAMEWORK]"
allowed-tools: ["Bash", "Read", "Write"]
---

Manage Microsoft Agent Framework including AutoGen and Semantic Kernel agents, multi-agent workflows, tool registration, and integration with ACC services.

## Your Task

You are managing AI agent systems using Microsoft Agent Framework. Create agents, configure workflows, register tools, and orchestrate multi-agent collaborations.

## Arguments

- `operation` (required): Operation (create, list, run, delete, register-tool, workflow)
- `agent-name` (optional): Name of the agent
- `--framework` (optional): Framework to use (autogen, semantic-kernel)
- `--model` (optional): LLM model to use (via Ollama)
- `--tools` (optional): Comma-separated list of tools to enable
- `--workflow` (optional): Path to workflow definition file

## Steps to Execute

### 1. Check Agent Framework Setup

```bash
check_agent_framework() {
  echo "=== Checking Agent Framework Setup ==="

  # Check if AutoGen is available
  docker exec acc-autogen python -c "import autogen" 2>/dev/null && {
    echo "✅ AutoGen available"
  } || {
    echo "⚠️  AutoGen not available"
  }

  # Check if Semantic Kernel is available
  docker exec acc-semantic-kernel python -c "import semantic_kernel" 2>/dev/null && {
    echo "✅ Semantic Kernel available"
  } || {
    echo "⚠️  Semantic Kernel not available"
  }

  # Check Ollama connectivity
  curl -s http://ollama.ahling.local:11434/api/tags > /dev/null && {
    echo "✅ Ollama accessible"
  } || {
    echo "❌ Ollama not accessible"
    exit 1
  }
}
```

### 2. Create AutoGen Agent

```bash
create_autogen_agent() {
  AGENT_NAME=$1
  MODEL=${2:-llama2}
  TOOLS=$3

  echo "=== Creating AutoGen Agent: $AGENT_NAME ==="

  AGENT_FILE="/app/agents/${AGENT_NAME}.py"

  cat > /tmp/agent_code.py <<EOF
import autogen
from autogen import AssistantAgent, UserProxyAgent

# LLM configuration using Ollama
llm_config = {
    "config_list": [{
        "model": "$MODEL",
        "base_url": "http://ollama.ahling.local:11434/v1",
        "api_key": "ollama",
    }],
    "temperature": 0.7,
    "timeout": 120,
}

# Create assistant agent
$AGENT_NAME = AssistantAgent(
    name="$AGENT_NAME",
    system_message="""You are a helpful AI assistant.
    You can help with various tasks using the tools available.""",
    llm_config=llm_config,
)

# Create user proxy agent for tool execution
user_proxy = UserProxyAgent(
    name="${AGENT_NAME}_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=10,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
    code_execution_config={
        "work_dir": "coding",
        "use_docker": True,
    },
)

def run_agent(task: str):
    """Run the agent with a task."""
    user_proxy.initiate_chat(
        $AGENT_NAME,
        message=task,
    )

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        run_agent(" ".join(sys.argv[1:]))
    else:
        print("Usage: python ${AGENT_NAME}.py <task>")
EOF

  # Copy to container
  docker cp /tmp/agent_code.py acc-autogen:$AGENT_FILE

  echo "✅ AutoGen agent created: $AGENT_NAME"
  echo "Run with: /acc:agent run $AGENT_NAME \"<task>\""
}
```

### 3. Create Semantic Kernel Agent

```bash
create_sk_agent() {
  AGENT_NAME=$1
  MODEL=${2:-llama2}

  echo "=== Creating Semantic Kernel Agent: $AGENT_NAME ==="

  AGENT_FILE="/app/agents/${AGENT_NAME}_sk.py"

  cat > /tmp/sk_agent_code.py <<EOF
import semantic_kernel as sk
from semantic_kernel.connectors.ai.ollama import OllamaChatCompletion

# Initialize kernel
kernel = sk.Kernel()

# Add Ollama service
kernel.add_chat_service(
    "ollama_chat",
    OllamaChatCompletion(
        ai_model_id="$MODEL",
        url="http://ollama.ahling.local:11434",
    ),
)

# Define agent persona
persona = """You are $AGENT_NAME, an intelligent AI assistant.
You are helpful, creative, and efficient.
You can use various tools to accomplish tasks."""

# Create semantic function
agent_function = kernel.create_semantic_function(
    prompt_template="""{{\\$persona}}

User: {{\\$input}}