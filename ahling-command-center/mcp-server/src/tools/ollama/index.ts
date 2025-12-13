/**
 * Ollama MCP Tools
 *
 * Model Context Protocol tool definitions for Ollama integration.
 * Provides comprehensive access to:
 * - Text generation and chat
 * - Embeddings
 * - Model management
 * - GPU monitoring (AMD RX 7900 XTX)
 */

import { OllamaClient } from '../../clients/ollama.client.js';
import type {
  OllamaGenerateToolArgs,
  OllamaChatToolArgs,
  OllamaEmbedToolArgs,
  OllamaPullToolArgs,
  OllamaGPUStatusToolArgs,
} from '../../types/ollama.types.js';

// ============================================================================
// Tool Schemas
// ============================================================================

/**
 * Tool definitions following MCP JSON Schema format
 */
export const OLLAMA_TOOLS = [
  {
    name: 'ollama_generate',
    description:
      'Generate text completion using a local Ollama model. Supports system prompts, temperature control, and streaming.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model name (e.g., llama3.2:3b, mistral:latest, qwen2.5-coder:32b)',
        },
        prompt: {
          type: 'string',
          description: 'The prompt to send to the model',
        },
        system: {
          type: 'string',
          description: 'System prompt to set behavior/context',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0.0-2.0, default: 0.8)',
          minimum: 0,
          maximum: 2,
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate (-1 for unlimited, default: 128)',
        },
        stream: {
          type: 'boolean',
          description: 'Enable streaming responses (default: false)',
        },
      },
      required: ['model', 'prompt'],
    },
  },
  {
    name: 'ollama_chat',
    description:
      'Chat with an Ollama model using conversation history. Supports multi-turn dialogues with system messages.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model name to use for chat',
        },
        messages: {
          type: 'array',
          description: 'Array of chat messages with role and content',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['system', 'user', 'assistant', 'tool'],
                description: 'Message role',
              },
              content: {
                type: 'string',
                description: 'Message content',
              },
            },
            required: ['role', 'content'],
          },
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0.0-2.0)',
          minimum: 0,
          maximum: 2,
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate',
        },
        stream: {
          type: 'boolean',
          description: 'Enable streaming responses',
        },
      },
      required: ['model', 'messages'],
    },
  },
  {
    name: 'ollama_embed',
    description:
      'Generate embeddings for text using an Ollama embedding model. Supports batch processing.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Embedding model name (e.g., nomic-embed-text, mxbai-embed-large)',
        },
        input: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
          description: 'Text or array of texts to embed',
        },
        truncate: {
          type: 'boolean',
          description: 'Truncate input to fit model context (default: true)',
        },
      },
      required: ['model', 'input'],
    },
  },
  {
    name: 'ollama_models',
    description:
      'List all available Ollama models with details including size, format, and quantization level.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ollama_pull',
    description:
      'Pull/download a model from the Ollama registry. Supports various model sizes and quantization levels.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Model name to pull (e.g., llama3.2:3b, mistral:7b-instruct-q4_K_M)',
        },
        insecure: {
          type: 'boolean',
          description: 'Allow insecure connections (default: false)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'ollama_gpu_status',
    description:
      'Get GPU status for AMD RX 7900 XTX including temperature, VRAM usage, utilization, power draw, and clock speeds using ROCm.',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Include detailed GPU metrics (default: false)',
        },
      },
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle Ollama tool calls
 *
 * @param client - Ollama client instance
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result
 */
export async function handleOllamaTool(
  client: OllamaClient,
  name: string,
  args: any
): Promise<any> {
  switch (name) {
    case 'ollama_generate':
      return await handleGenerate(client, args);

    case 'ollama_chat':
      return await handleChat(client, args);

    case 'ollama_embed':
      return await handleEmbed(client, args);

    case 'ollama_models':
      return await handleModels(client);

    case 'ollama_pull':
      return await handlePull(client, args);

    case 'ollama_gpu_status':
      return await handleGPUStatus(client, args);

    default:
      throw new Error(`Unknown Ollama tool: ${name}`);
  }
}

// ============================================================================
// Individual Tool Handlers
// ============================================================================

async function handleGenerate(
  client: OllamaClient,
  args: OllamaGenerateToolArgs
): Promise<any> {
  const { model, prompt, system, temperature, max_tokens, stream } = args;

  const response = await client.generate({
    model,
    prompt,
    system,
    options: {
      temperature: temperature ?? 0.8,
      num_predict: max_tokens ?? 128,
    },
    stream: stream ?? false,
  });

  return {
    model: response.model,
    response: response.response,
    created_at: response.created_at,
    done: response.done,
    done_reason: response.done_reason,
    metrics: {
      total_duration_ms: response.total_duration ? response.total_duration / 1_000_000 : 0,
      load_duration_ms: response.load_duration ? response.load_duration / 1_000_000 : 0,
      prompt_eval_count: response.prompt_eval_count,
      eval_count: response.eval_count,
      tokens_per_second: response.eval_count && response.eval_duration
        ? (response.eval_count / (response.eval_duration / 1_000_000_000)).toFixed(2)
        : 0,
    },
    context: response.context,
  };
}

async function handleChat(
  client: OllamaClient,
  args: OllamaChatToolArgs
): Promise<any> {
  const { model, messages, temperature, max_tokens } = args;
  // Note: 'stream' parameter is reserved for future streaming support

  const response = await client.chat(model, messages, {
    temperature: temperature ?? 0.8,
    num_predict: max_tokens ?? 128,
  });

  return {
    model: response.model,
    message: response.message,
    created_at: response.created_at,
    done: response.done,
    done_reason: response.done_reason,
    metrics: {
      total_duration_ms: response.total_duration ? response.total_duration / 1_000_000 : 0,
      load_duration_ms: response.load_duration ? response.load_duration / 1_000_000 : 0,
      prompt_eval_count: response.prompt_eval_count,
      eval_count: response.eval_count,
      tokens_per_second: response.eval_count && response.eval_duration
        ? (response.eval_count / (response.eval_duration / 1_000_000_000)).toFixed(2)
        : 0,
    },
  };
}

async function handleEmbed(
  client: OllamaClient,
  args: OllamaEmbedToolArgs
): Promise<any> {
  const { model, input } = args;
  // Note: 'truncate' parameter is reserved for future truncation support

  const response = await client.embed(model, input);

  const embeddings = Array.isArray(response.embeddings[0])
    ? response.embeddings as number[][]
    : [response.embeddings as number[]];

  return {
    model: response.model,
    embeddings,
    embedding_count: embeddings.length,
    dimensions: Array.isArray(embeddings[0]) ? embeddings[0].length : 0,
    metrics: {
      total_duration_ms: response.total_duration ? response.total_duration / 1_000_000 : 0,
      load_duration_ms: response.load_duration ? response.load_duration / 1_000_000 : 0,
    },
  };
}

async function handleModels(client: OllamaClient): Promise<any> {
  const response = await client.listModels();

  const models = response.models.map((model) => ({
    name: model.name,
    model: model.model,
    size_gb: (model.size / 1024 / 1024 / 1024).toFixed(2),
    size_bytes: model.size,
    modified_at: model.modified_at,
    digest: model.digest,
    details: {
      format: model.details.format,
      family: model.details.family,
      families: model.details.families,
      parameter_size: model.details.parameter_size,
      quantization_level: model.details.quantization_level,
    },
  }));

  return {
    models,
    total_models: models.length,
    total_size_gb: models
      .reduce((sum, m) => sum + parseFloat(m.size_gb), 0)
      .toFixed(2),
  };
}

async function handlePull(
  client: OllamaClient,
  args: OllamaPullToolArgs
): Promise<any> {
  const { name, insecure } = args;

  const response = await client.pull(name, insecure ?? false);

  return {
    model: name,
    status: response.status,
    digest: response.digest,
    total: response.total,
    completed: response.completed,
    progress: response.total && response.completed
      ? ((response.completed / response.total) * 100).toFixed(2) + '%'
      : 'unknown',
  };
}

async function handleGPUStatus(
  client: OllamaClient,
  args: OllamaGPUStatusToolArgs
): Promise<any> {
  const { detailed } = args;

  const gpuStatus = await client.getGPUStatus();

  if (!detailed) {
    // Return simplified status
    return {
      gpus: gpuStatus.map((gpu) => ({
        gpu_index: gpu.gpu_index,
        name: gpu.gpu_name,
        temperature_c: gpu.temperature,
        utilization_percent: gpu.utilization,
        memory_used_mb: gpu.memory.used,
        memory_total_mb: gpu.memory.total,
        memory_percent: gpu.memory.utilization.toFixed(2),
        power_watts: gpu.power.current,
        power_percent: gpu.power.utilization.toFixed(2),
      })),
      gpu_count: gpuStatus.length,
    };
  }

  // Return detailed status
  return {
    gpus: gpuStatus,
    gpu_count: gpuStatus.length,
    summary: {
      total_vram_gb: (gpuStatus.reduce((sum, gpu) => sum + gpu.memory.total, 0) / 1024).toFixed(2),
      used_vram_gb: (gpuStatus.reduce((sum, gpu) => sum + gpu.memory.used, 0) / 1024).toFixed(2),
      total_power_watts: gpuStatus.reduce((sum, gpu) => sum + gpu.power.current, 0).toFixed(2),
      avg_temperature_c: (
        gpuStatus.reduce((sum, gpu) => sum + gpu.temperature, 0) / gpuStatus.length
      ).toFixed(2),
      avg_utilization: (
        gpuStatus.reduce((sum, gpu) => sum + gpu.utilization, 0) / gpuStatus.length
      ).toFixed(2),
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export { OllamaClient } from '../../clients/ollama.client.js';
export * from '../../types/ollama.types.js';
