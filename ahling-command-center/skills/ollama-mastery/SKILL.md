# Ollama Mastery Skill

This skill provides comprehensive knowledge for Ollama integration in the Ahling Command Center, including model management, GPU optimization for AMD RX 7900 XTX, custom Modelfiles, and multi-model orchestration.

## Trigger Phrases

- "deploy ollama", "setup ollama", "configure ollama"
- "pull model", "download model", "ollama models"
- "gpu allocation", "vram management", "rocm setup"
- "custom modelfile", "fine-tune ollama"
- "model routing", "multi-model", "load balancing"
- "embeddings", "vector generation"

## Hardware Context

```yaml
target_gpu: AMD RX 7900 XTX
vram_total: 24GB
rocm_version: ">=6.0"

vram_allocation:
  primary_model: 16GB      # Large models (70B Q4, 34B)
  secondary_model: 4GB     # Fast models (7B, 3B)
  embeddings: 2GB          # nomic-embed-text
  reserved: 2GB            # Whisper, Frigate overlap
```

## Model Routing Strategy

Route requests to appropriate models based on task complexity:

| Task Type | Model | VRAM | Use Case |
|-----------|-------|------|----------|
| Complex Reasoning | llama3.2:70b-q4 | 16GB | Planning, analysis, code review |
| Quick Response | llama3.2:7b | 4GB | Simple queries, fast interactions |
| Code Generation | codellama:34b-q4 | 12GB | Code writing, debugging |
| Home Assistant | fixt/home-3b-v3 | 2GB | HA entity control, automation |
| Embeddings | nomic-embed-text | 1GB | Vector generation for RAG |
| Vision | llava:13b | 8GB | Image analysis (when needed) |

## Ollama API Reference

### Generate Text

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:70b",
  "prompt": "Explain quantum computing",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "num_ctx": 8192,
    "num_gpu": 99
  }
}'
```

### Chat Completion

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2:7b",
  "messages": [
    {"role": "system", "content": "You are the Ahling Command Center AI."},
    {"role": "user", "content": "What is the status of my home?"}
  ],
  "stream": true
}'
```

### Generate Embeddings

```bash
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Home Assistant automation for motion-activated lights"
}'
```

### Model Management

```bash
# List models
curl http://localhost:11434/api/tags

# Pull model
curl http://localhost:11434/api/pull -d '{"name": "llama3.2:70b"}'

# Delete model
curl http://localhost:11434/api/delete -d '{"name": "old-model"}'

# Show model info
curl http://localhost:11434/api/show -d '{"name": "llama3.2:70b"}'
```

## Custom Modelfiles

### Ahling Home Assistant Model

```dockerfile
# Modelfile.ahling-home
FROM fixt/home-3b-v3

PARAMETER temperature 0.7
PARAMETER num_ctx 4096
PARAMETER stop "<|im_end|>"

SYSTEM """
You are the Ahling Command Center AI, integrated with Home Assistant.
You control a smart home with these capabilities:
- Lights in all rooms (living room, bedroom, office, kitchen, garage)
- Climate control (HVAC, fans)
- Security (cameras, locks, motion sensors)
- Media (TV, speakers)
- Energy monitoring (solar, battery, consumption)

When asked to control devices, respond with the exact service call needed.
Be concise and action-oriented.
"""
```

### Ahling Coordinator Model

```dockerfile
# Modelfile.ahling-coordinator
FROM llama3.2:7b

PARAMETER temperature 0.8
PARAMETER num_ctx 8192
PARAMETER top_p 0.9

SYSTEM """
You are the Ahling Command Center Coordinator, responsible for:
1. Orchestrating multi-agent workflows
2. Synthesizing information from multiple sources
3. Making decisions that affect the entire home system
4. Providing morning briefings and status reports

You have access to:
- Home Assistant for physical control
- Knowledge graph (Neo4j) for context
- Vector database (Qdrant) for semantic search
- Multiple specialist agents

Always think step-by-step and explain your reasoning.
"""
```

## ROCm GPU Optimization

### Environment Variables

```bash
# ROCm for AMD GPU
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export OLLAMA_NUM_GPU=99
export OLLAMA_GPU_OVERHEAD=256m
export OLLAMA_MAX_LOADED_MODELS=3

# Memory optimization
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
```

### Docker Compose with ROCm

```yaml
services:
  ollama:
    image: ollama/ollama:rocm
    container_name: ollama
    devices:
      - /dev/kfd
      - /dev/dri
    volumes:
      - ollama_data:/root/.ollama
      - ./modelfiles:/modelfiles
    environment:
      - HSA_OVERRIDE_GFX_VERSION=11.0.0
      - OLLAMA_NUM_GPU=99
      - OLLAMA_FLASH_ATTENTION=1
    ports:
      - "11434:11434"
    group_add:
      - video
      - render
    security_opt:
      - seccomp:unconfined
    cap_add:
      - SYS_PTRACE
```

## Multi-Model Orchestration

### Load Balancing Strategy

```python
class ModelRouter:
    """Route requests to appropriate Ollama models."""

    ROUTING_TABLE = {
        "complex": "llama3.2:70b",      # Complex reasoning
        "fast": "llama3.2:7b",           # Quick responses
        "code": "codellama:34b",         # Code tasks
        "home": "ahling-home",           # Home Assistant
        "embed": "nomic-embed-text",     # Embeddings
        "vision": "llava:13b",           # Image analysis
    }

    def route(self, task_type: str, complexity: float = 0.5) -> str:
        """Select model based on task type and complexity."""
        if task_type == "auto":
            if complexity > 0.7:
                return self.ROUTING_TABLE["complex"]
            else:
                return self.ROUTING_TABLE["fast"]
        return self.ROUTING_TABLE.get(task_type, "llama3.2:7b")
```

### Concurrent Model Loading

```yaml
# Maximum 3 models loaded simultaneously
# Priority order: home (always), fast (high), complex (on-demand)

model_priority:
  1: ahling-home      # Always loaded for HA control
  2: llama3.2:7b      # Fast responses, always ready
  3: llama3.2:70b     # Load on-demand for complex tasks

unload_strategy:
  idle_timeout: 300   # Unload after 5 minutes idle
  priority_keep: 2    # Keep top 2 priority models loaded
```

## Integration Patterns

### With Home Assistant

```python
async def ha_control_with_ollama(user_request: str):
    """Process voice command through Ollama for HA control."""

    # Use the home-optimized model
    response = await ollama.chat(
        model="ahling-home",
        messages=[
            {"role": "user", "content": user_request}
        ]
    )

    # Parse the service call from response
    service_call = parse_ha_service(response["message"]["content"])

    # Execute on Home Assistant
    await ha.call_service(**service_call)
```

### With Microsoft Agents

```python
# Register Ollama as LLM backend for AutoGen
config_list = [
    {
        "model": "llama3.2:70b",
        "base_url": "http://ollama:11434/v1",
        "api_type": "ollama",
        "api_key": "ollama",  # Placeholder
    }
]

# Create AutoGen agent with Ollama
coordinator = AssistantAgent(
    name="coordinator",
    llm_config={"config_list": config_list},
    system_message="You are the Ahling Command Center coordinator..."
)
```

### With RAG Pipeline

```python
async def rag_with_ollama(query: str):
    """RAG query using Ollama embeddings and generation."""

    # Generate query embedding
    query_embedding = await ollama.embeddings(
        model="nomic-embed-text",
        prompt=query
    )

    # Search Qdrant
    results = await qdrant.search(
        collection="knowledge",
        query_vector=query_embedding,
        limit=5
    )

    # Generate response with context
    context = "\n".join([r.payload["text"] for r in results])
    response = await ollama.chat(
        model="llama3.2:70b",
        messages=[
            {"role": "system", "content": f"Context:\n{context}"},
            {"role": "user", "content": query}
        ]
    )

    return response["message"]["content"]
```

## Troubleshooting

### GPU Not Detected

```bash
# Check ROCm installation
rocm-smi

# Verify device access
ls -la /dev/kfd /dev/dri

# Check Ollama GPU usage
curl http://localhost:11434/api/ps
```

### Out of VRAM

```bash
# Unload unused models
curl http://localhost:11434/api/generate -d '{
  "model": "large-model",
  "keep_alive": 0
}'

# Check current VRAM usage
rocm-smi --showmeminfo vram
```

### Slow Inference

```bash
# Enable flash attention
export OLLAMA_FLASH_ATTENTION=1

# Reduce context length
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:70b",
  "options": {"num_ctx": 4096}
}'
```

## Best Practices

1. **Always specify num_gpu**: Set to 99 to use all available VRAM
2. **Use appropriate context lengths**: 4K for simple, 8K for complex
3. **Preload priority models**: Keep home and fast models loaded
4. **Monitor VRAM**: Use rocm-smi to track usage
5. **Use streaming**: Enable for real-time responses
6. **Batch embeddings**: Process multiple texts in batches
7. **Custom Modelfiles**: Create task-specific models for better performance

## Related Skills

- [[home-assistant-brain]] - HA integration patterns
- [[microsoft-agents]] - Multi-agent orchestration
- [[perception-pipeline]] - Voice pipeline (Whisper + Piper)

## References

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [ROCm Installation Guide](https://rocm.docs.amd.com/)
- [Ollama Model Library](https://ollama.com/library)
