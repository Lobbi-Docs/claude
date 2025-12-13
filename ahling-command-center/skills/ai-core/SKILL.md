# AI Core Skill

This skill provides comprehensive knowledge for deploying and managing the Ahling Command Center AI core services: LiteLLM proxy, vLLM inference server, Ollama, Qdrant vector database, LangFuse observability, and n8n workflow automation.

## Trigger Phrases

- "litellm", "llm proxy", "model routing"
- "vllm", "inference server", "model serving"
- "langfuse", "llm observability", "tracing"
- "n8n", "workflow automation", "integrations"
- "ai pipeline", "llm deployment"

## AI Core Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI CORE LAYER (Phase 4)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                      LLM SERVING                               │    │
│   │                                                                │    │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │    │
│   │   │   LiteLLM   │───▶│   Ollama    │───▶│    vLLM     │      │    │
│   │   │   (Proxy)   │    │  (Local)    │    │  (Serving)  │      │    │
│   │   └─────────────┘    └─────────────┘    └─────────────┘      │    │
│   │          │                  │                  │              │    │
│   │          └──────────────────┼──────────────────┘              │    │
│   │                             ▼                                 │    │
│   │                      ┌─────────────┐                          │    │
│   │                      │  LangFuse   │                          │    │
│   │                      │ (Observ.)   │                          │    │
│   │                      └─────────────┘                          │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                    EMBEDDINGS & STORAGE                        │    │
│   │                                                                │    │
│   │   ┌─────────────┐              ┌─────────────┐                │    │
│   │   │   Qdrant    │◄────────────▶│     n8n     │                │    │
│   │   │  (Vectors)  │              │ (Workflows) │                │    │
│   │   └─────────────┘              └─────────────┘                │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## LiteLLM Proxy

### Docker Compose

```yaml
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm
    command: --config /app/config.yaml --detailed_debug
    environment:
      LITELLM_MASTER_KEY: ${LITELLM_MASTER_KEY}
      DATABASE_URL: postgresql://litellm:${LITELLM_DB_PASSWORD}@postgres:5432/litellm
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    ports:
      - "4000:4000"
    volumes:
      - ./litellm/config.yaml:/app/config.yaml
    depends_on:
      - postgres
      - redis
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.litellm.rule=Host(`llm.ahling.local`)"
      - "traefik.http.services.litellm.loadbalancer.server.port=4000"
```

### LiteLLM Configuration

```yaml
# litellm/config.yaml
model_list:
  # Local Ollama models
  - model_name: llama3.2-70b
    litellm_params:
      model: ollama/llama3.2:70b
      api_base: http://ollama:11434
    model_info:
      max_tokens: 8192
      supports_function_calling: true

  - model_name: llama3.2-7b
    litellm_params:
      model: ollama/llama3.2:7b
      api_base: http://ollama:11434
    model_info:
      max_tokens: 8192

  - model_name: codellama-34b
    litellm_params:
      model: ollama/codellama:34b
      api_base: http://ollama:11434
    model_info:
      max_tokens: 16384

  - model_name: nomic-embed
    litellm_params:
      model: ollama/nomic-embed-text
      api_base: http://ollama:11434

  # vLLM models (for high-throughput)
  - model_name: llama3.2-70b-vllm
    litellm_params:
      model: openai/meta-llama/Llama-3.2-70B
      api_base: http://vllm:8000/v1
      api_key: "none"

  # External fallbacks (optional)
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: os.environ/OPENAI_API_KEY

  - model_name: claude-3-opus
    litellm_params:
      model: claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  drop_params: true
  set_verbose: true
  cache: true
  cache_params:
    type: redis
    host: redis
    port: 6379
    password: os.environ/REDIS_PASSWORD

router_settings:
  routing_strategy: least-busy
  model_group_alias:
    fast: [llama3.2-7b]
    smart: [llama3.2-70b, llama3.2-70b-vllm, gpt-4]
    code: [codellama-34b]
    embed: [nomic-embed]

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  alerting:
    - slack
  alerting_threshold: 300
```

### LiteLLM API Usage

```python
import openai

# Connect via LiteLLM proxy
client = openai.OpenAI(
    base_url="http://litellm:4000/v1",
    api_key="${LITELLM_MASTER_KEY}"
)

# Use model aliases
response = client.chat.completions.create(
    model="smart",  # Routes to best available model
    messages=[
        {"role": "user", "content": "Explain quantum computing"}
    ]
)

# Embeddings
embeddings = client.embeddings.create(
    model="embed",
    input="Smart home automation"
)
```

## vLLM Inference Server

### Docker Compose with ROCm

```yaml
services:
  vllm:
    image: vllm/vllm-openai:latest
    container_name: vllm
    command: >
      --model meta-llama/Llama-3.2-70B-Instruct
      --dtype float16
      --max-model-len 8192
      --gpu-memory-utilization 0.9
      --tensor-parallel-size 1
      --port 8000
    devices:
      - /dev/kfd:/dev/kfd
      - /dev/dri:/dev/dri
    environment:
      HIP_VISIBLE_DEVICES: "0"
      HSA_OVERRIDE_GFX_VERSION: "11.0.0"
      HUGGING_FACE_HUB_TOKEN: ${HF_TOKEN}
    ports:
      - "8000:8000"
    volumes:
      - vllm_cache:/root/.cache/huggingface
    shm_size: "16gb"
    group_add:
      - video
      - render
    deploy:
      resources:
        reservations:
          devices:
            - driver: amdgpu
              count: 1
              capabilities: [gpu]
```

### vLLM API

```python
from openai import OpenAI

# vLLM supports OpenAI-compatible API
client = OpenAI(
    base_url="http://vllm:8000/v1",
    api_key="not-needed"
)

# Streaming completion
stream = client.chat.completions.create(
    model="meta-llama/Llama-3.2-70B-Instruct",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## LangFuse Observability

### Docker Compose

```yaml
services:
  langfuse:
    image: langfuse/langfuse:latest
    container_name: langfuse
    environment:
      DATABASE_URL: postgresql://langfuse:${LANGFUSE_DB_PASSWORD}@postgres:5432/langfuse
      NEXTAUTH_SECRET: ${LANGFUSE_AUTH_SECRET}
      NEXTAUTH_URL: http://langfuse.ahling.local
      SALT: ${LANGFUSE_SALT}
      ENCRYPTION_KEY: ${LANGFUSE_ENCRYPTION_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.langfuse.rule=Host(`langfuse.ahling.local`)"
```

### LangFuse Integration with LiteLLM

```yaml
# Add to litellm/config.yaml
litellm_settings:
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]

environment:
  - LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY}
  - LANGFUSE_SECRET_KEY=${LANGFUSE_SECRET_KEY}
  - LANGFUSE_HOST=http://langfuse:3000
```

### Manual Tracing

```python
from langfuse import Langfuse

langfuse = Langfuse(
    public_key="${LANGFUSE_PUBLIC_KEY}",
    secret_key="${LANGFUSE_SECRET_KEY}",
    host="http://langfuse:3000"
)

# Create trace
trace = langfuse.trace(
    name="home-automation-query",
    user_id="markus",
    metadata={"source": "voice"}
)

# Log generation
generation = trace.generation(
    name="intent-detection",
    model="llama3.2:7b",
    input={"messages": [...]},
    output={"content": "..."},
    usage={"prompt_tokens": 100, "completion_tokens": 50}
)

# Score the response
trace.score(
    name="accuracy",
    value=0.95,
    comment="Correct intent detected"
)
```

## n8n Workflow Automation

### Docker Compose

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${N8N_DB_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      N8N_BASIC_AUTH_ACTIVE: true
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: ${N8N_ADMIN_PASSWORD}
      WEBHOOK_URL: https://n8n.ahling.local
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(`n8n.ahling.local`)"
```

### n8n Workflow Examples

#### LLM-Powered Automation

```json
{
  "name": "Smart Home Event Handler",
  "nodes": [
    {
      "name": "MQTT Trigger",
      "type": "n8n-nodes-base.mqtt",
      "parameters": {
        "topics": "frigate/events"
      }
    },
    {
      "name": "Parse Event",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "code": "return { event: JSON.parse($input.item.json.message) };"
      }
    },
    {
      "name": "LLM Analysis",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://litellm:4000/v1/chat/completions",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer ${LITELLM_KEY}"
        },
        "body": {
          "model": "fast",
          "messages": [
            {"role": "system", "content": "Analyze home security events"},
            {"role": "user", "content": "{{ $json.event }}"}
          ]
        }
      }
    },
    {
      "name": "Route Action",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": [
          {"condition": "{{ $json.priority == 'high' }}"},
          {"condition": "{{ $json.priority == 'medium' }}"}
        ]
      }
    },
    {
      "name": "HA Notification",
      "type": "n8n-nodes-base.homeAssistant",
      "parameters": {
        "operation": "callService",
        "domain": "notify",
        "service": "mobile_app"
      }
    }
  ]
}
```

## Qdrant Vector Database

### Docker Compose

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    environment:
      QDRANT__SERVICE__HTTP_PORT: 6333
      QDRANT__SERVICE__GRPC_PORT: 6334
      QDRANT__CLUSTER__ENABLED: false
      QDRANT__STORAGE__STORAGE_PATH: /qdrant/storage
      QDRANT__STORAGE__SNAPSHOTS_PATH: /qdrant/snapshots
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
      - qdrant_snapshots:/qdrant/snapshots
    deploy:
      resources:
        limits:
          memory: 4G
```

### Qdrant Integration

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(host="qdrant", port=6333)

# Create collection for home automation context
client.create_collection(
    collection_name="home_context",
    vectors_config=VectorParams(
        size=768,  # nomic-embed-text dimension
        distance=Distance.COSINE
    )
)

# Store automation patterns
async def store_automation_pattern(pattern: dict):
    # Get embedding from LiteLLM
    embedding = await litellm.embed(
        model="embed",
        input=pattern["description"]
    )

    client.upsert(
        collection_name="home_context",
        points=[
            PointStruct(
                id=pattern["id"],
                vector=embedding["data"][0]["embedding"],
                payload=pattern
            )
        ]
    )

# Semantic search for similar patterns
async def find_similar_patterns(query: str, limit: int = 5):
    query_embedding = await litellm.embed(
        model="embed",
        input=query
    )

    results = client.search(
        collection_name="home_context",
        query_vector=query_embedding["data"][0]["embedding"],
        limit=limit
    )

    return results
```

## Resource Allocation

### VRAM Budget (RX 7900 XTX - 24GB)

| Component | VRAM | Notes |
|-----------|------|-------|
| Ollama (primary) | 16GB | llama3.2:70b |
| Ollama (secondary) | 4GB | llama3.2:7b |
| Ollama (embed) | 2GB | nomic-embed-text |
| vLLM | 20GB | When using instead of Ollama |
| **Note**: Ollama and vLLM share GPU, not concurrent |

### Memory Budget (61GB RAM)

| Component | RAM |
|-----------|-----|
| LiteLLM | 2GB |
| vLLM | 4GB |
| LangFuse | 1GB |
| n8n | 1GB |
| Qdrant | 4GB |
| **Total** | **12GB** |

## Model Routing Strategy

```python
class AIRouter:
    """Route requests to appropriate LLM based on task."""

    ROUTING_MAP = {
        "home_control": {
            "model": "fast",
            "temperature": 0.5,
            "max_tokens": 256
        },
        "analysis": {
            "model": "smart",
            "temperature": 0.7,
            "max_tokens": 2048
        },
        "code_generation": {
            "model": "code",
            "temperature": 0.2,
            "max_tokens": 4096
        },
        "embedding": {
            "model": "embed"
        }
    }

    async def route(self, task_type: str, prompt: str):
        config = self.ROUTING_MAP.get(task_type, self.ROUTING_MAP["analysis"])

        if task_type == "embedding":
            return await litellm.embed(model=config["model"], input=prompt)

        return await litellm.chat(
            model=config["model"],
            messages=[{"role": "user", "content": prompt}],
            temperature=config.get("temperature", 0.7),
            max_tokens=config.get("max_tokens", 1024)
        )
```

## Best Practices

1. **LiteLLM**: Use model aliases for flexibility
2. **vLLM**: Reserve for high-throughput batch processing
3. **LangFuse**: Trace all production LLM calls
4. **n8n**: Use credentials store for API keys
5. **Qdrant**: Create indexes for frequently filtered fields
6. **GPU**: Don't run Ollama and vLLM simultaneously

## Monitoring

```yaml
# prometheus/ai-core.yml
- job_name: 'litellm'
  static_configs:
    - targets: ['litellm:4000']
  metrics_path: '/metrics'

- job_name: 'vllm'
  static_configs:
    - targets: ['vllm:8000']
  metrics_path: '/metrics'

- job_name: 'qdrant'
  static_configs:
    - targets: ['qdrant:6333']
  metrics_path: '/metrics'
```

## Related Skills

- [[ollama-mastery]] - Deep Ollama configuration
- [[intelligence-layer]] - Neo4j, Qdrant, RAG
- [[microsoft-agents]] - Multi-agent orchestration

## References

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [vLLM Documentation](https://docs.vllm.ai/)
- [LangFuse Documentation](https://langfuse.com/docs)
- [n8n Documentation](https://docs.n8n.io/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
