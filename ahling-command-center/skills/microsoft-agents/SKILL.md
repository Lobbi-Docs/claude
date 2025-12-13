# Microsoft Agents Skill

This skill provides comprehensive knowledge for Microsoft Agent Framework integration in the Ahling Command Center, including AutoGen, Semantic Kernel, and multi-agent orchestration patterns.

## Trigger Phrases

- "microsoft agents", "autogen", "semantic kernel"
- "multi-agent", "agent workflow", "agent orchestration"
- "create agent", "agent conversation", "group chat"
- "tool registration", "function calling"
- "morning briefing", "self-healing", "coordinator"

## Framework Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                 MICROSOFT AGENT FRAMEWORK                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐         ┌─────────────────┐              │
│   │    AutoGen      │◄───────►│ Semantic Kernel │              │
│   │  (Multi-Agent)  │         │ (Functions/Mem) │              │
│   └────────┬────────┘         └────────┬────────┘              │
│            │                           │                        │
│            └───────────┬───────────────┘                        │
│                        │                                        │
│                        ▼                                        │
│            ┌─────────────────────┐                              │
│            │    Ollama Backend   │                              │
│            │  (Local LLM Serving)│                              │
│            └─────────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## AutoGen Configuration

### Ollama as LLM Backend

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# Configure Ollama as LLM backend
config_list = [
    {
        "model": "llama3.2:70b",
        "base_url": "http://ollama:11434/v1",
        "api_type": "openai",  # Ollama supports OpenAI-compatible API
        "api_key": "ollama",   # Placeholder, not used
    }
]

llm_config = {
    "config_list": config_list,
    "temperature": 0.7,
    "timeout": 120,
}
```

### Agent Types

#### Coordinator Agent

```python
coordinator = AssistantAgent(
    name="coordinator",
    llm_config=llm_config,
    system_message="""You are the Ahling Command Center Coordinator.

Your responsibilities:
1. Orchestrate multi-agent workflows
2. Delegate tasks to specialist agents
3. Synthesize information from multiple sources
4. Make decisions affecting the entire system
5. Provide status reports and briefings

You have access to:
- Home Agent: Controls physical home devices
- Research Agent: Information retrieval
- Code Agent: Code generation and debugging
- Knowledge Agent: Graph and RAG queries

Always think step-by-step and explain your reasoning.
When delegating, specify which agent should handle each task.
""",
    human_input_mode="NEVER",
)
```

#### Home Agent

```python
home_agent = AssistantAgent(
    name="home_agent",
    llm_config={
        "config_list": [
            {
                "model": "ahling-home",  # Custom home-optimized model
                "base_url": "http://ollama:11434/v1",
                "api_key": "ollama",
            }
        ],
        "temperature": 0.5,
    },
    system_message="""You are the Home Agent, responsible for Home Assistant control.

Your capabilities:
- Control lights, switches, climate, covers, locks
- Monitor sensors and binary sensors
- Manage automations and scripts
- Process voice commands
- Track presence and energy

Always respond with specific HA service calls when asked to control devices.
Format: domain.service with entity_id and optional data.

Example: light.turn_on(entity_id="light.living_room", brightness_pct=80)
""",
)
```

#### Research Agent

```python
research_agent = AssistantAgent(
    name="research_agent",
    llm_config=llm_config,
    system_message="""You are the Research Agent for information retrieval.

Your capabilities:
- Query the knowledge graph (Neo4j)
- Search vector database (Qdrant)
- Retrieve context from AnythingLLM
- Summarize and synthesize information
- Track historical events and patterns

When asked questions, first check available knowledge sources.
Cite your sources and indicate confidence levels.
""",
)
```

#### Code Agent

```python
code_agent = AssistantAgent(
    name="code_agent",
    llm_config={
        "config_list": [
            {
                "model": "codellama:34b",
                "base_url": "http://ollama:11434/v1",
                "api_key": "ollama",
            }
        ],
        "temperature": 0.2,  # Lower for more precise code
    },
    system_message="""You are the Code Agent for code generation and debugging.

Your capabilities:
- Generate Python, YAML, TypeScript, Bash code
- Debug errors and issues
- Create Docker Compose configurations
- Write automations and scripts
- Review and optimize code

Always provide complete, working code with comments.
Test your code mentally before providing it.
""",
)
```

### Conversation Patterns

#### Two-Agent Chat

```python
async def two_agent_conversation(user_message: str):
    """Simple two-agent conversation."""
    user_proxy = UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=0,
    )

    await user_proxy.a_initiate_chat(
        coordinator,
        message=user_message,
    )
```

#### Group Chat

```python
async def group_chat_workflow(task: str):
    """Multi-agent group chat for complex tasks."""

    # Create group chat
    group_chat = GroupChat(
        agents=[coordinator, home_agent, research_agent, code_agent],
        messages=[],
        max_round=10,
        speaker_selection_method="auto",
    )

    # Manager orchestrates the conversation
    manager = GroupChatManager(
        groupchat=group_chat,
        llm_config=llm_config,
    )

    # User proxy initiates
    user_proxy = UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
    )

    await user_proxy.a_initiate_chat(
        manager,
        message=task,
    )

    return group_chat.messages
```

#### Hierarchical Pattern

```python
async def hierarchical_workflow(task: str):
    """Coordinator delegates to specialists."""

    # Coordinator receives task
    coordinator_response = await coordinator.a_generate_reply(
        messages=[{"role": "user", "content": task}]
    )

    # Parse which agents to involve
    agents_needed = parse_agent_assignments(coordinator_response)

    # Execute each sub-task
    results = {}
    for agent_name, sub_task in agents_needed.items():
        agent = get_agent(agent_name)
        result = await agent.a_generate_reply(
            messages=[{"role": "user", "content": sub_task}]
        )
        results[agent_name] = result

    # Coordinator synthesizes
    synthesis = await coordinator.a_generate_reply(
        messages=[
            {"role": "user", "content": f"Synthesize these results: {results}"}
        ]
    )

    return synthesis
```

## Semantic Kernel Integration

### Kernel Setup

```python
import semantic_kernel as sk
from semantic_kernel.connectors.ai.ollama import OllamaChatCompletion

# Create kernel
kernel = sk.Kernel()

# Add Ollama as chat service
kernel.add_service(
    OllamaChatCompletion(
        ai_model_id="llama3.2:70b",
        url="http://ollama:11434",
    )
)
```

### Native Functions (Tools)

```python
from semantic_kernel.functions import kernel_function

class HomeAssistantPlugin:
    """Home Assistant control functions."""

    @kernel_function(
        name="get_entity_state",
        description="Get the current state of a Home Assistant entity"
    )
    async def get_entity_state(self, entity_id: str) -> str:
        """Get entity state from Home Assistant."""
        state = await ha_client.get_state(entity_id)
        return f"{entity_id} is {state['state']}"

    @kernel_function(
        name="call_service",
        description="Call a Home Assistant service to control devices"
    )
    async def call_service(
        self,
        domain: str,
        service: str,
        entity_id: str,
        data: str = "{}"
    ) -> str:
        """Call HA service."""
        result = await ha_client.call_service(
            domain, service, {"entity_id": entity_id, **json.loads(data)}
        )
        return f"Called {domain}.{service} on {entity_id}"

# Register plugin
kernel.add_plugin(HomeAssistantPlugin(), "home_assistant")
```

### Memory Store

```python
from semantic_kernel.memory import VolatileMemoryStore
from semantic_kernel.connectors.memory.qdrant import QdrantMemoryStore

# Add Qdrant for persistent memory
kernel.add_memory_store(
    QdrantMemoryStore(
        url="http://qdrant:6333",
        collection_name="semantic_memory"
    )
)

# Save memory
await kernel.memory.save_information(
    collection="conversations",
    text="User prefers lights at 80% brightness",
    id="user_pref_1"
)

# Recall memory
results = await kernel.memory.search(
    collection="conversations",
    query="light preferences",
    limit=5
)
```

### Planners

```python
from semantic_kernel.planners import SequentialPlanner

# Create planner
planner = SequentialPlanner(kernel)

# Generate plan for complex task
plan = await planner.create_plan(
    goal="Turn on all lights in the house and set thermostat to 72"
)

# Execute plan
result = await plan.invoke(kernel)
```

## Workflows

### Morning Briefing Workflow

```python
async def morning_briefing():
    """Generate and deliver morning briefing."""

    # 1. Home Agent: Get home status
    home_status = await home_agent.a_generate_reply([{
        "role": "user",
        "content": "Summarize overnight home events and current status"
    }])

    # 2. Research Agent: Get calendar and news
    calendar_news = await research_agent.a_generate_reply([{
        "role": "user",
        "content": "Get today's calendar events, weather, and top news"
    }])

    # 3. Coordinator: Synthesize briefing
    briefing = await coordinator.a_generate_reply([{
        "role": "user",
        "content": f"""Create a morning briefing from:
        Home Status: {home_status}
        Calendar/News: {calendar_news}

        Format as a natural spoken briefing, 30 seconds max.
        """
    }])

    # 4. Deliver via TTS
    await piper.speak(briefing)

    # 5. Adjust home for morning
    await home_agent.a_generate_reply([{
        "role": "user",
        "content": "Set home to morning mode: lights on, comfortable temperature"
    }])

    return briefing
```

### Self-Healing Workflow

```python
async def self_healing(error_event: dict):
    """Automatically diagnose and fix infrastructure issues."""

    service = error_event["service"]
    error = error_event["error"]

    # 1. Code Agent: Diagnose
    diagnosis = await code_agent.a_generate_reply([{
        "role": "user",
        "content": f"""Diagnose this error:
        Service: {service}
        Error: {error}

        Check logs, identify root cause.
        """
    }])

    # 2. Code Agent: Generate fix
    fix = await code_agent.a_generate_reply([{
        "role": "user",
        "content": f"""Based on diagnosis: {diagnosis}

        Generate a fix. Options:
        - Restart service
        - Modify configuration
        - Scale resources
        - Rollback

        Provide specific commands.
        """
    }])

    # 3. Execute fix (with approval for destructive actions)
    if is_safe_action(fix):
        result = await execute_fix(fix)
    else:
        # Notify for approval
        await notify_user(f"Fix required approval: {fix}")
        return

    # 4. Verify fix
    verification = await code_agent.a_generate_reply([{
        "role": "user",
        "content": f"Verify that {service} is healthy after fix: {fix}"
    }])

    # 5. Update knowledge graph
    await knowledge_agent.a_generate_reply([{
        "role": "user",
        "content": f"""Log incident:
        Service: {service}
        Error: {error}
        Diagnosis: {diagnosis}
        Fix: {fix}
        Result: {verification}
        """
    }])

    return verification
```

### Voice Command Workflow

```python
async def process_voice_command(transcription: str):
    """Process voice command through agent system."""

    # Coordinator decides routing
    routing = await coordinator.a_generate_reply([{
        "role": "user",
        "content": f"""Route this voice command: "{transcription}"

        Options:
        - home_agent: Device control, automations
        - research_agent: Information queries
        - code_agent: Technical requests
        - direct: Simple responses

        Respond with: ROUTE: <agent_name> or ROUTE: direct
        """
    }])

    agent_name = parse_routing(routing)

    if agent_name == "direct":
        # Simple response
        response = await coordinator.a_generate_reply([{
            "role": "user",
            "content": transcription
        }])
    else:
        # Delegate to specialist
        agent = get_agent(agent_name)
        response = await agent.a_generate_reply([{
            "role": "user",
            "content": transcription
        }])

    # TTS response
    await piper.speak(response)

    return response
```

## Tool Registration

### Register MCP Tools as Agent Tools

```python
from autogen import register_function

# Register Home Assistant tool
def ha_control(entity_id: str, action: str, **kwargs) -> str:
    """Control Home Assistant entity."""
    domain, _ = entity_id.split(".", 1)
    ha_client.call_service(domain, action, {"entity_id": entity_id, **kwargs})
    return f"Executed {action} on {entity_id}"

register_function(
    ha_control,
    caller=coordinator,
    executor=home_agent,
    name="ha_control",
    description="Control a Home Assistant entity"
)

# Register knowledge query tool
def knowledge_query(query: str, source: str = "all") -> str:
    """Query knowledge graph or vector DB."""
    if source == "graph":
        return neo4j_client.query(query)
    elif source == "vector":
        return qdrant_client.search(query)
    else:
        # Hybrid search
        return hybrid_search(query)

register_function(
    knowledge_query,
    caller=coordinator,
    executor=research_agent,
    name="knowledge_query",
    description="Query the knowledge base"
)
```

## MCP Tool Definitions

```typescript
// agent_create
{
  name: "agent_create",
  description: "Create a new AutoGen agent",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      role: { type: "string", enum: ["coordinator", "specialist", "executor"] },
      model: { type: "string", default: "llama3.2:7b" },
      system_message: { type: "string" },
      tools: { type: "array", items: { type: "string" } }
    },
    required: ["name", "role", "system_message"]
  }
}

// agent_workflow
{
  name: "agent_workflow",
  description: "Execute a predefined multi-agent workflow",
  inputSchema: {
    type: "object",
    properties: {
      workflow: {
        type: "string",
        enum: ["morning_briefing", "self_healing", "voice_command", "research"]
      },
      params: { type: "object" }
    },
    required: ["workflow"]
  }
}

// agent_chat
{
  name: "agent_chat",
  description: "Send a message to an agent and get response",
  inputSchema: {
    type: "object",
    properties: {
      agent: { type: "string" },
      message: { type: "string" },
      context: { type: "array", items: { type: "object" } }
    },
    required: ["agent", "message"]
  }
}
```

## Configuration Files

### agents.yaml

```yaml
agents:
  coordinator:
    model: llama3.2:70b
    temperature: 0.7
    max_tokens: 4096
    system_message: |
      You are the Ahling Command Center Coordinator...

  home_agent:
    model: ahling-home
    temperature: 0.5
    max_tokens: 2048
    tools:
      - ha_control
      - ha_get_state
      - ha_automation

  research_agent:
    model: llama3.2:7b
    temperature: 0.7
    tools:
      - knowledge_query
      - web_search

  code_agent:
    model: codellama:34b
    temperature: 0.2
    tools:
      - file_read
      - file_write
      - bash_execute

workflows:
  morning_briefing:
    agents: [coordinator, home_agent, research_agent]
    schedule: "0 7 * * *"  # 7 AM daily

  self_healing:
    agents: [coordinator, code_agent]
    trigger: error_detected

  voice_command:
    agents: [coordinator, home_agent, research_agent]
    trigger: voice_input
```

## Best Practices

1. **Model Selection**: Use appropriate models for each agent type
2. **Temperature Tuning**: Lower for code, higher for creative tasks
3. **Tool Scoping**: Limit tools per agent to relevant ones
4. **Memory Management**: Use Qdrant for long-term, volatile for session
5. **Error Handling**: Implement graceful degradation in workflows
6. **Logging**: Log all agent interactions for debugging
7. **Rate Limiting**: Prevent runaway agent conversations

## Related Skills

- [[ollama-mastery]] - LLM backend configuration
- [[home-assistant-brain]] - HA integration for home_agent
- [[intelligence-layer]] - Neo4j, Qdrant, RAG integration

## References

- [AutoGen Documentation](https://microsoft.github.io/autogen/)
- [Semantic Kernel](https://learn.microsoft.com/semantic-kernel/)
- [AutoGen with Ollama](https://microsoft.github.io/autogen/docs/topics/non-openai-models/local-ollama)
