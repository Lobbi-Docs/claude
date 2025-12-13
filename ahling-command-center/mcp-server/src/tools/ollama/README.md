# Ollama Tools Module

Comprehensive Ollama integration for the Ahling Command Center MCP server, providing access to local LLM inference, embeddings, model management, and GPU monitoring.

## Overview

This module provides MCP tools for interacting with Ollama running on the local machine. Optimized for the AMD RX 7900 XTX GPU with ROCm support.

## Features

- **Text Generation**: Generate completions with customizable parameters
- **Chat Completions**: Multi-turn conversations with message history
- **Embeddings**: Generate vector embeddings for semantic search
- **Model Management**: List, pull, and manage models
- **GPU Monitoring**: Real-time AMD GPU status via ROCm SMI
- **Health Checks**: Service health and diagnostics

## Architecture

```
tools/ollama/
├── index.ts              # Tool definitions and handlers
├── README.md            # This file
../../clients/
├── ollama.client.ts     # Ollama API client
../../types/
└── ollama.types.ts      # TypeScript type definitions
```

## Available Tools

### 1. ollama_generate

Generate text completions from a prompt.

**Input Schema:**
```json
{
  "model": "llama3.2:3b",
  "prompt": "Explain quantum computing in simple terms",
  "system": "You are a helpful AI assistant",
  "temperature": 0.8,
  "max_tokens": 128,
  "stream": false
}
```

**Response:**
```json
{
  "model": "llama3.2:3b",
  "response": "Quantum computing is...",
  "created_at": "2025-12-13T...",
  "done": true,
  "metrics": {
    "total_duration_ms": 1234,
    "tokens_per_second": "45.67"
  }
}
```

### 2. ollama_chat

Chat with an Ollama model using conversation history.

**Input Schema:**
```json
{
  "model": "llama3.2:3b",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant"
    },
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "temperature": 0.7
}
```

**Response:**
```json
{
  "model": "llama3.2:3b",
  "message": {
    "role": "assistant",
    "content": "The capital of France is Paris."
  },
  "done": true,
  "metrics": {
    "tokens_per_second": "52.34"
  }
}
```

### 3. ollama_embed

Generate embeddings for text or batch of texts.

**Input Schema:**
```json
{
  "model": "nomic-embed-text",
  "input": "Text to embed",
  "truncate": true
}
```

Or batch processing:
```json
{
  "model": "nomic-embed-text",
  "input": ["Text 1", "Text 2", "Text 3"]
}
```

**Response:**
```json
{
  "model": "nomic-embed-text",
  "embeddings": [[0.123, -0.456, ...]],
  "embedding_count": 1,
  "dimensions": 768,
  "metrics": {
    "total_duration_ms": 234
  }
}
```

### 4. ollama_models

List all available Ollama models.

**Input Schema:**
```json
{}
```

**Response:**
```json
{
  "models": [
    {
      "name": "llama3.2:3b",
      "size_gb": "2.03",
      "modified_at": "2025-12-13T...",
      "details": {
        "format": "gguf",
        "family": "llama",
        "parameter_size": "3.2B",
        "quantization_level": "Q4_0"
      }
    }
  ],
  "total_models": 5,
  "total_size_gb": "45.67"
}
```

### 5. ollama_pull

Pull/download a model from the Ollama registry.

**Input Schema:**
```json
{
  "name": "qwen2.5-coder:32b",
  "insecure": false
}
```

**Response:**
```json
{
  "model": "qwen2.5-coder:32b",
  "status": "success",
  "digest": "sha256:abc123...",
  "progress": "100.00%"
}
```

### 6. ollama_gpu_status

Get AMD RX 7900 XTX GPU status via ROCm SMI.

**Input Schema:**
```json
{
  "detailed": false
}
```

**Response (Simple):**
```json
{
  "gpus": [
    {
      "gpu_index": 0,
      "name": "AMD Radeon RX 7900 XTX",
      "temperature_c": 65,
      "utilization_percent": 87,
      "memory_used_mb": 16384,
      "memory_total_mb": 24576,
      "memory_percent": "66.67",
      "power_watts": 285,
      "power_percent": "80.28"
    }
  ],
  "gpu_count": 1
}
```

**Response (Detailed):**
```json
{
  "gpus": [
    {
      "gpu_index": 0,
      "gpu_name": "AMD Radeon RX 7900 XTX",
      "temperature": 65,
      "utilization": 87,
      "memory": {
        "total": 24576,
        "used": 16384,
        "free": 8192,
        "utilization": 66.67
      },
      "power": {
        "current": 285,
        "average": 280,
        "limit": 355,
        "utilization": 80.28
      },
      "clock_speeds": {
        "gpu_current": 2450,
        "gpu_max": 2500,
        "memory_current": 2500,
        "memory_max": 2500
      },
      "fan_speed": 65,
      "performance_level": "auto"
    }
  ],
  "summary": {
    "total_vram_gb": "24.00",
    "used_vram_gb": "16.00",
    "total_power_watts": "285.00",
    "avg_temperature_c": "65.00",
    "avg_utilization": "87.00"
  }
}
```

## Client API

The `OllamaClient` class provides low-level access to the Ollama API:

```typescript
import { OllamaClient } from './clients/ollama.client.js';

const client = new OllamaClient({
  baseURL: 'http://localhost:11434',
  timeout: 300000,
});

// Generate text
const result = await client.generate({
  model: 'llama3.2:3b',
  prompt: 'Hello, world!',
  options: {
    temperature: 0.8,
    num_predict: 128,
  },
});

// Chat
const chat = await client.chat('llama3.2:3b', [
  { role: 'user', content: 'Hi there!' },
]);

// Embeddings
const embeddings = await client.embed('nomic-embed-text', 'Text to embed');

// Model management
const models = await client.listModels();
await client.pull('mistral:latest');

// GPU status
const gpuStatus = await client.getGPUStatus();

// Health check
const health = await client.healthCheck();
```

## Configuration

Set the Ollama URL via environment variable:

```bash
export OLLAMA_URL=http://localhost:11434
```

Or in the MCP server config.

## GPU Monitoring

The module uses `rocm-smi` to monitor AMD GPU status. Ensure ROCm is installed:

```bash
# Check ROCm installation
rocm-smi --version

# View GPU status
rocm-smi --json
```

If `rocm-smi` is not available, the module falls back to basic GPU info.

## Model Recommendations

### For RX 7900 XTX (24GB VRAM)

| Use Case | Recommended Model | VRAM Usage |
|----------|------------------|------------|
| Fast generation | llama3.2:3b | ~2GB |
| Balanced | llama3.2:7b-instruct | ~4GB |
| Code generation | qwen2.5-coder:14b | ~8GB |
| Large context | qwen2.5:32b | ~20GB |
| Embeddings | nomic-embed-text | ~500MB |
| Embeddings (large) | mxbai-embed-large | ~1GB |

### Quantization Levels

- `Q4_0` - Fastest, lowest quality (50% VRAM)
- `Q4_K_M` - Good balance (55% VRAM)
- `Q5_K_M` - Better quality (65% VRAM)
- `Q6_K` - High quality (75% VRAM)
- `Q8_0` - Highest quality (90% VRAM)

## Error Handling

All tools include comprehensive error handling:

```typescript
try {
  const result = await handleOllamaTool(client, 'ollama_generate', {
    model: 'llama3.2:3b',
    prompt: 'Hello!',
  });
} catch (error) {
  // Errors include:
  // - Model not found
  // - Ollama service unreachable
  // - GPU out of memory
  // - Invalid parameters
  console.error('Tool error:', error.message);
}
```

## Performance Tips

1. **Keep models loaded**: Use `keep_alive` to keep models in VRAM
2. **Batch embeddings**: Process multiple texts in one call
3. **Monitor GPU temp**: Use `ollama_gpu_status` to watch thermals
4. **Adjust context size**: Use `num_ctx` option to control VRAM usage
5. **Use appropriate quantization**: Balance quality vs speed/VRAM

## Integration Example

```typescript
// Generate embeddings for semantic search
const embedResult = await handleOllamaTool(client, 'ollama_embed', {
  model: 'nomic-embed-text',
  input: ['Document 1', 'Document 2', 'Document 3'],
});

// Store in Qdrant
await qdrantClient.upsert({
  collection: 'documents',
  points: embedResult.embeddings.map((emb, i) => ({
    id: i,
    vector: emb,
    payload: { text: input[i] },
  })),
});

// Generate response with context
const chatResult = await handleOllamaTool(client, 'ollama_chat', {
  model: 'llama3.2:7b-instruct',
  messages: [
    { role: 'system', content: 'Use the following context: ...' },
    { role: 'user', content: 'Question about the documents' },
  ],
});
```

## Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama
ollama serve
```

### GPU not detected

```bash
# Check ROCm
rocm-smi

# Set GPU visibility
export HIP_VISIBLE_DEVICES=0
```

### Out of VRAM

- Use smaller model or lower quantization
- Reduce `num_ctx` context size
- Unload other models with `ollama rm`
- Monitor with `ollama_gpu_status`

## References

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [ROCm SMI Documentation](https://github.com/RadeonOpenCompute/rocm_smi_lib)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [RX 7900 XTX Specs](https://www.amd.com/en/products/graphics/amd-radeon-rx-7900xtx)

## License

MIT License - See repository root for details.
