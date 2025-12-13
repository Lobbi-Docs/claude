/**
 * Ollama API TypeScript Type Definitions
 *
 * Complete type definitions for the Ollama API including:
 * - Generation, Chat, and Embedding endpoints
 * - Model management (list, pull, show)
 * - GPU status monitoring for AMD RX 7900 XTX
 */

// ============================================================================
// Request Types
// ============================================================================

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  suffix?: string;
  images?: string[]; // base64 encoded images
  format?: 'json';
  options?: ModelOptions;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  keep_alive?: string | number;
}

export interface OllamaChatRequest {
  model: string;
  messages: ChatMessage[];
  format?: 'json';
  options?: ModelOptions;
  stream?: boolean;
  keep_alive?: string | number;
}

export interface OllamaEmbedRequest {
  model: string;
  input: string | string[];
  truncate?: boolean;
  options?: ModelOptions;
  keep_alive?: string | number;
}

export interface OllamaPullRequest {
  name: string;
  insecure?: boolean;
  stream?: boolean;
}

export interface OllamaShowRequest {
  name: string;
  verbose?: boolean;
}

export interface OllamaCopyRequest {
  source: string;
  destination: string;
}

export interface OllamaDeleteRequest {
  name: string;
}

export interface OllamaPushRequest {
  name: string;
  insecure?: boolean;
  stream?: boolean;
}

export interface OllamaCreateRequest {
  name: string;
  modelfile?: string;
  path?: string;
  stream?: boolean;
}

// ============================================================================
// Response Types
// ============================================================================

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][] | number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

export interface OllamaListResponse {
  models: ModelInfo[];
}

export interface OllamaShowResponse {
  modelfile: string;
  parameters: string;
  template: string;
  details: ModelDetails;
  model_info?: Record<string, any>;
}

export interface OllamaPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface OllamaVersionResponse {
  version: string;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[]; // base64 encoded
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface ModelOptions {
  // Model parameters
  mirostat?: number; // 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0
  mirostat_eta?: number; // Learning rate (default: 0.1)
  mirostat_tau?: number; // Controls output coherence (default: 5.0)
  num_ctx?: number; // Context window size (default: 2048)
  repeat_last_n?: number; // Last n tokens to consider for penalties (default: 64)
  repeat_penalty?: number; // Penalty for repetition (default: 1.1)
  temperature?: number; // Randomness (default: 0.8)
  seed?: number; // Random seed
  stop?: string[]; // Stop sequences
  tfs_z?: number; // Tail free sampling (default: 1.0)
  num_predict?: number; // Max tokens to generate (default: 128, -1 = infinite, -2 = fill context)
  top_k?: number; // Top-k sampling (default: 40)
  top_p?: number; // Top-p sampling (default: 0.9)
  min_p?: number; // Min-p sampling (default: 0.0)

  // Performance tuning
  num_thread?: number; // Number of threads
  num_gpu?: number; // Number of GPU layers to use (-1 = all)
  main_gpu?: number; // GPU to use for main computation
  low_vram?: boolean; // Reduce VRAM usage
  f16_kv?: boolean; // Use half-precision for key/value cache
  vocab_only?: boolean; // Only load vocabulary
  use_mmap?: boolean; // Use memory mapping
  use_mlock?: boolean; // Lock model in RAM
  num_batch?: number; // Batch size for prompt processing
  num_keep?: number; // Number of tokens to keep from initial prompt
}

export interface ModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
}

export interface ModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families?: string[];
  parameter_size: string;
  quantization_level: string;
}

// ============================================================================
// GPU Status Types (AMD RX 7900 XTX with ROCm)
// ============================================================================

export interface GPUStatus {
  gpu_index: number;
  gpu_id: string;
  gpu_name: string;
  temperature: number; // Celsius
  utilization: number; // Percentage
  memory: GPUMemory;
  power: GPUPower;
  clock_speeds: GPUClocks;
  fan_speed?: number; // Percentage
  performance_level?: string;
}

export interface GPUMemory {
  total: number; // MB
  used: number; // MB
  free: number; // MB
  utilization: number; // Percentage
}

export interface GPUPower {
  current: number; // Watts
  average: number; // Watts
  limit: number; // Watts
  utilization: number; // Percentage
}

export interface GPUClocks {
  gpu_current: number; // MHz
  gpu_max: number; // MHz
  memory_current: number; // MHz
  memory_max: number; // MHz
}

export interface ROCmSMIOutput {
  gpus: GPUStatus[];
  driver_version: string;
  rocm_version: string;
  system_info?: {
    pcie_bw?: string;
    link_speed?: string;
    link_width?: string;
  };
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface OllamaHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version?: string;
  models_loaded: number;
  gpu_available: boolean;
  gpu_status?: GPUStatus[];
  uptime?: number; // seconds
  error?: string;
  timestamp: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface OllamaError {
  error: string;
  status?: number;
  details?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type OllamaStreamCallback = (chunk: OllamaGenerateResponse | OllamaChatResponse | OllamaPullResponse) => void;

export interface OllamaClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

// ============================================================================
// Tool-specific Types
// ============================================================================

export interface OllamaGenerateToolArgs {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OllamaChatToolArgs {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OllamaEmbedToolArgs {
  model: string;
  input: string | string[];
  truncate?: boolean;
}

export interface OllamaPullToolArgs {
  name: string;
  insecure?: boolean;
}

export interface OllamaModelsToolArgs {
  // No args needed for listing models
}

export interface OllamaGPUStatusToolArgs {
  detailed?: boolean;
}
