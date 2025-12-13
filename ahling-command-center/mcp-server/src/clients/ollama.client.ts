/**
 * Ollama API Client
 *
 * Full-featured client for interacting with Ollama API endpoints.
 * Includes support for:
 * - Text generation and chat completions
 * - Embeddings
 * - Model management (list, pull, show, delete)
 * - GPU status monitoring (AMD RX 7900 XTX with ROCm)
 * - Health checks and diagnostics
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaEmbedRequest,
  OllamaEmbedResponse,
  OllamaListResponse,
  OllamaShowRequest,
  OllamaShowResponse,
  OllamaPullRequest,
  OllamaPullResponse,
  OllamaDeleteRequest,
  OllamaVersionResponse,
  OllamaHealthCheck,
  GPUStatus,
  OllamaError,
  OllamaClientConfig,
  ChatMessage,
  ModelOptions,
} from '../types/ollama.types.js';

const execAsync = promisify(exec);

/**
 * Ollama API Client
 *
 * Provides methods for interacting with local Ollama instance.
 * Optimized for AMD RX 7900 XTX GPU with ROCm support.
 */
export class OllamaClient {
  private client: AxiosInstance;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config?: Partial<OllamaClientConfig>) {
    this.baseURL = config?.baseURL || process.env['OLLAMA_URL'] || 'http://localhost:11434';
    this.timeout = config?.timeout || 300000; // 5 minutes default for large models
    this.maxRetries = config?.maxRetries || 3;
    this.retryDelay = config?.retryDelay || 1000;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  // ========================================================================
  // Core API Methods
  // ========================================================================

  /**
   * Generate text completion from a prompt
   *
   * @param request - Generation request parameters
   * @returns Generated text and metadata
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const response = await this.client.post<OllamaGenerateResponse>('/api/generate', {
      ...request,
      stream: request.stream ?? false, // Default to non-streaming
    });

    return response.data;
  }

  /**
   * Chat completion with message history
   *
   * @param model - Model name to use
   * @param messages - Array of chat messages
   * @param options - Optional model parameters
   * @returns Chat completion response
   */
  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ModelOptions
  ): Promise<OllamaChatResponse> {
    const request: OllamaChatRequest = {
      model,
      messages,
      options,
      stream: false,
    };

    const response = await this.client.post<OllamaChatResponse>('/api/chat', request);
    return response.data;
  }

  /**
   * Generate embeddings for text input
   *
   * @param model - Embedding model name
   * @param input - Text or array of texts to embed
   * @returns Embedding vectors
   */
  async embed(model: string, input: string | string[]): Promise<OllamaEmbedResponse> {
    const request: OllamaEmbedRequest = {
      model,
      input,
    };

    const response = await this.client.post<OllamaEmbedResponse>('/api/embed', request);
    return response.data;
  }

  // ========================================================================
  // Model Management
  // ========================================================================

  /**
   * List all available models
   *
   * @returns Array of model information
   */
  async listModels(): Promise<OllamaListResponse> {
    const response = await this.client.get<OllamaListResponse>('/api/tags');
    return response.data;
  }

  /**
   * Pull/download a model from the Ollama registry
   *
   * @param name - Model name (e.g., 'llama3.2:3b', 'mistral:latest')
   * @param insecure - Allow insecure connections
   * @returns Pull status
   */
  async pull(name: string, insecure: boolean = false): Promise<OllamaPullResponse> {
    const request: OllamaPullRequest = {
      name,
      insecure,
      stream: false,
    };

    const response = await this.client.post<OllamaPullResponse>('/api/pull', request);
    return response.data;
  }

  /**
   * Get detailed information about a model
   *
   * @param name - Model name
   * @param verbose - Include full modelfile and parameters
   * @returns Model details
   */
  async show(name: string, verbose: boolean = false): Promise<OllamaShowResponse> {
    const request: OllamaShowRequest = {
      name,
      verbose,
    };

    const response = await this.client.post<OllamaShowResponse>('/api/show', request);
    return response.data;
  }

  /**
   * Delete a model
   *
   * @param name - Model name to delete
   */
  async delete(name: string): Promise<void> {
    const request: OllamaDeleteRequest = {
      name,
    };

    await this.client.delete('/api/delete', { data: request });
  }

  /**
   * Copy a model
   *
   * @param source - Source model name
   * @param destination - Destination model name
   */
  async copy(source: string, destination: string): Promise<void> {
    await this.client.post('/api/copy', {
      source,
      destination,
    });
  }

  // ========================================================================
  // GPU Monitoring (AMD RX 7900 XTX with ROCm)
  // ========================================================================

  /**
   * Get GPU status using rocm-smi
   *
   * Monitors AMD RX 7900 XTX GPU status including:
   * - Temperature
   * - Memory usage
   * - Utilization
   * - Power consumption
   * - Clock speeds
   *
   * @returns GPU status information
   */
  async getGPUStatus(): Promise<GPUStatus[]> {
    try {
      // Try rocm-smi first (AMD GPUs)
      const { stdout } = await execAsync('rocm-smi --json');
      const rocmData = JSON.parse(stdout);

      return this.parseROCmSMIOutput(rocmData);
    } catch (error) {
      // Fallback to basic stats if rocm-smi not available
      console.warn('rocm-smi not available, returning basic GPU info');
      return this.getBasicGPUInfo();
    }
  }

  /**
   * Parse rocm-smi JSON output to GPUStatus format
   */
  private parseROCmSMIOutput(rocmData: any): GPUStatus[] {
    const gpus: GPUStatus[] = [];

    // ROCm SMI JSON format varies, handle common structures
    if (rocmData.card0) {
      // Format: { card0: {...}, card1: {...} }
      Object.entries(rocmData).forEach(([cardKey, cardData]: [string, any], index) => {
        if (cardKey.startsWith('card')) {
          gpus.push(this.parseGPUCard(cardData, index));
        }
      });
    } else if (Array.isArray(rocmData)) {
      // Format: [{...}, {...}]
      rocmData.forEach((cardData, index) => {
        gpus.push(this.parseGPUCard(cardData, index));
      });
    } else if (rocmData.gpu) {
      // Single GPU format
      gpus.push(this.parseGPUCard(rocmData.gpu, 0));
    }

    return gpus;
  }

  /**
   * Parse individual GPU card data
   */
  private parseGPUCard(cardData: any, index: number): GPUStatus {
    // Extract temperature (may be in different fields)
    const temp = parseFloat(
      cardData.Temperature?.['GPU Temperature']?.value ||
      cardData.temperature ||
      cardData.temp ||
      '0'
    );

    // Extract memory info
    const memTotal = parseInt(
      cardData.VRAM?.['Total VRAM']?.value ||
      cardData.memory?.total ||
      '24576' // Default to 24GB for RX 7900 XTX
    );
    const memUsed = parseInt(
      cardData.VRAM?.['Used VRAM']?.value ||
      cardData.memory?.used ||
      '0'
    );

    // Extract utilization
    const utilization = parseFloat(
      cardData.GPU?.['GPU Use']?.value ||
      cardData.utilization ||
      '0'
    );

    // Extract power
    const powerCurrent = parseFloat(
      cardData.Power?.['Average Graphics Package Power']?.value ||
      cardData.power?.current ||
      '0'
    );
    const powerAvg = parseFloat(
      cardData.Power?.['Average Graphics Package Power']?.value ||
      powerCurrent
    );
    const powerLimit = parseFloat(
      cardData.Power?.['Power Cap']?.value ||
      '355' // RX 7900 XTX default TDP
    );

    // Extract clocks
    const gpuClock = parseInt(
      cardData.Clocks?.['GPU Clock']?.value ||
      cardData.clocks?.gpu ||
      '0'
    );
    const gpuMaxClock = parseInt(
      cardData.Clocks?.['Max GPU Clock']?.value ||
      '2500' // RX 7900 XTX boost clock
    );
    const memClock = parseInt(
      cardData.Clocks?.['Memory Clock']?.value ||
      cardData.clocks?.memory ||
      '0'
    );
    const memMaxClock = parseInt(
      cardData.Clocks?.['Max Memory Clock']?.value ||
      '2500' // RX 7900 XTX memory clock
    );

    // Extract fan speed
    const fanSpeed = parseFloat(
      cardData.Fan?.['Fan Speed']?.value ||
      cardData.fan ||
      '0'
    );

    return {
      gpu_index: index,
      gpu_id: cardData.GPU?.ID?.value || cardData.id || `gpu${index}`,
      gpu_name: cardData.Card?.['Card Model']?.value || 'AMD Radeon RX 7900 XTX',
      temperature: temp,
      utilization: utilization,
      memory: {
        total: memTotal,
        used: memUsed,
        free: memTotal - memUsed,
        utilization: (memUsed / memTotal) * 100,
      },
      power: {
        current: powerCurrent,
        average: powerAvg,
        limit: powerLimit,
        utilization: (powerCurrent / powerLimit) * 100,
      },
      clock_speeds: {
        gpu_current: gpuClock,
        gpu_max: gpuMaxClock,
        memory_current: memClock,
        memory_max: memMaxClock,
      },
      fan_speed: fanSpeed,
      performance_level: cardData.Performance?.Level?.value || 'auto',
    };
  }

  /**
   * Fallback GPU info when rocm-smi is not available
   */
  private async getBasicGPUInfo(): Promise<GPUStatus[]> {
    return [
      {
        gpu_index: 0,
        gpu_id: 'gpu0',
        gpu_name: 'AMD Radeon RX 7900 XTX',
        temperature: 0,
        utilization: 0,
        memory: {
          total: 24576, // 24GB
          used: 0,
          free: 24576,
          utilization: 0,
        },
        power: {
          current: 0,
          average: 0,
          limit: 355,
          utilization: 0,
        },
        clock_speeds: {
          gpu_current: 0,
          gpu_max: 2500,
          memory_current: 0,
          memory_max: 2500,
        },
      },
    ];
  }

  // ========================================================================
  // Health & Diagnostics
  // ========================================================================

  /**
   * Check Ollama service health
   *
   * @returns Health status with GPU info
   */
  async healthCheck(): Promise<OllamaHealthCheck> {
    try {
      // Check if service is responding
      const versionResponse = await this.client.get<OllamaVersionResponse>('/api/version');

      // Get model list
      const models = await this.listModels();

      // Get GPU status
      let gpuStatus: GPUStatus[] | undefined;
      let gpuAvailable = false;

      try {
        gpuStatus = await this.getGPUStatus();
        gpuAvailable = gpuStatus.length > 0;
      } catch (error) {
        console.warn('GPU status check failed:', error);
      }

      return {
        status: 'healthy',
        version: versionResponse.data.version,
        models_loaded: models.models.length,
        gpu_available: gpuAvailable,
        gpu_status: gpuStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        models_loaded: 0,
        gpu_available: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get Ollama version
   */
  async version(): Promise<string> {
    const response = await this.client.get<OllamaVersionResponse>('/api/version');
    return response.data.version;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Test connection to Ollama service
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Handle axios errors
   */
  private handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error
      const data = error.response.data as OllamaError;
      throw new Error(
        `Ollama API error: ${error.response.status} - ${data.error || error.message}`
      );
    } else if (error.request) {
      // No response received
      throw new Error(
        `Ollama service unreachable at ${this.baseURL}. Is Ollama running?`
      );
    } else {
      // Request setup error
      throw new Error(`Ollama client error: ${error.message}`);
    }
  }

  /**
   * Retry helper for transient failures
   * Reserved for future use with streaming operations
   */
  protected async retryOperation<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(fn, retries - 1);
      }
      throw error;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Ollama client instance
 */
export function createOllamaClient(config?: Partial<OllamaClientConfig>): OllamaClient {
  return new OllamaClient(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default OllamaClient;
