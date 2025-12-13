/**
 * Fallback Chain - Graceful failure handling with model fallbacks
 * Implements retry logic, rate limit handling, and prompt adaptation
 */

import {
  ModelName,
  FallbackConfig,
  FallbackResult,
  RateLimitInfo,
} from './types';

export class FallbackChain {
  private fallbackConfigs: Map<ModelName, FallbackConfig> = new Map();
  private rateLimits: Map<ModelName, RateLimitInfo> = new Map();
  private promptAdapters: Map<ModelName, (prompt: string) => string> = new Map();

  constructor() {
    this.initializeDefaultAdapters();
  }

  /**
   * Define fallback sequence for a model
   */
  defineFallbacks(primary: ModelName, fallbacks: ModelName[], config?: Partial<FallbackConfig>): void {
    const fullConfig: FallbackConfig = {
      primary,
      fallbacks,
      maxRetries: config?.maxRetries || 3,
      timeout: config?.timeout || 60000,
      backoff: config?.backoff || 'exponential',
      initialDelay: config?.initialDelay || 1000,
    };

    this.fallbackConfigs.set(primary, fullConfig);
    console.log(`[Fallback] Configured ${primary} -> [${fallbacks.join(', ')}]`);
  }

  /**
   * Execute task with fallback chain
   */
  async executeWithFallback<T>(
    taskFn: (model: ModelName) => Promise<T>,
    modelChain: ModelName[]
  ): Promise<FallbackResult<T>> {
    const startTime = Date.now();
    const errors: FallbackResult<T>['errors'] = [];
    let attempts = 0;

    for (let i = 0; i < modelChain.length; i++) {
      const model = modelChain[i];

      // Check rate limits
      if (this.isRateLimited(model)) {
        const rateLimitInfo = this.rateLimits.get(model)!;
        const waitTime = rateLimitInfo.resetAt.getTime() - Date.now();

        console.log(`[Fallback] ${model} rate limited, waiting ${waitTime}ms`);

        errors.push({
          model,
          error: `Rate limited until ${rateLimitInfo.resetAt.toISOString()}`,
          timestamp: new Date(),
        });

        // Wait if reasonable, otherwise try next model
        if (waitTime < 60000 && i === modelChain.length - 1) {
          await this.sleep(waitTime);
        } else {
          continue;
        }
      }

      // Try execution with retries
      const config = this.fallbackConfigs.get(model) || this.getDefaultConfig(model);

      for (let retry = 0; retry < config.maxRetries; retry++) {
        attempts++;

        try {
          console.log(`[Fallback] Attempting ${model} (attempt ${retry + 1}/${config.maxRetries})`);

          const result = await this.executeWithTimeout(
            () => taskFn(model),
            config.timeout
          );

          const totalTime = Date.now() - startTime;

          console.log(`[Fallback] Success with ${model} after ${attempts} attempts (${totalTime}ms)`);

          return {
            value: result,
            model,
            usedFallback: i > 0,
            attempts,
            totalTime,
            errors,
          };
        } catch (error: any) {
          const errorMsg = error?.message || String(error);

          console.log(`[Fallback] ${model} attempt ${retry + 1} failed: ${errorMsg}`);

          errors.push({
            model,
            error: errorMsg,
            timestamp: new Date(),
          });

          // Check if rate limit error
          if (this.isRateLimitError(errorMsg)) {
            this.handleRateLimit(model, error);
            break; // Move to next model
          }

          // Check if should retry
          if (retry < config.maxRetries - 1) {
            const delay = this.calculateBackoff(retry, config);
            console.log(`[Fallback] Retrying ${model} in ${delay}ms`);
            await this.sleep(delay);
          }
        }
      }
    }

    // All models failed
    const totalTime = Date.now() - startTime;
    throw new Error(
      `All models failed after ${attempts} attempts (${totalTime}ms):\n` +
      errors.map(e => `- ${e.model}: ${e.error}`).join('\n')
    );
  }

  /**
   * Handle rate limit
   */
  handleRateLimit(model: ModelName, error: any): void {
    // Parse rate limit info from error
    const resetAt = this.parseResetTime(error);
    const remaining = 0;
    const limit = error?.limit || 0;

    const rateLimitInfo: RateLimitInfo = {
      model,
      resetAt,
      remaining,
      limit,
    };

    this.rateLimits.set(model, rateLimitInfo);

    console.log(`[Fallback] Rate limit recorded for ${model}, resets at ${resetAt.toISOString()}`);
  }

  /**
   * Check if model is rate limited
   */
  isRateLimited(model: ModelName): boolean {
    const info = this.rateLimits.get(model);
    if (!info) return false;

    const now = new Date();
    if (now >= info.resetAt) {
      this.rateLimits.delete(model);
      return false;
    }

    return true;
  }

  /**
   * Adapt prompt for different models
   */
  adaptPrompt(prompt: string, targetModel: ModelName): string {
    const adapter = this.promptAdapters.get(targetModel);
    if (adapter) {
      return adapter(prompt);
    }

    // Default: no adaptation
    return prompt;
  }

  /**
   * Register custom prompt adapter
   */
  registerAdapter(model: ModelName, adapter: (prompt: string) => string): void {
    this.promptAdapters.set(model, adapter);
    console.log(`[Fallback] Registered prompt adapter for ${model}`);
  }

  /**
   * Initialize default prompt adapters
   */
  private initializeDefaultAdapters(): void {
    // Claude models - prefer structured output
    this.promptAdapters.set('opus', (prompt) => {
      if (!prompt.includes('Think step by step')) {
        return `${prompt}\n\nThink step by step and provide a detailed response.`;
      }
      return prompt;
    });

    this.promptAdapters.set('sonnet', (prompt) => prompt); // No adaptation needed

    this.promptAdapters.set('haiku', (prompt) => {
      // Haiku prefers concise prompts
      return prompt.replace(/Think step by step and provide a detailed response\./g, '');
    });

    // GPT models - prefer clear instructions
    this.promptAdapters.set('gpt-4', (prompt) => {
      if (!prompt.includes('Be specific')) {
        return `${prompt}\n\nBe specific and thorough in your response.`;
      }
      return prompt;
    });

    this.promptAdapters.set('gpt-3.5', (prompt) => {
      // GPT-3.5 prefers shorter, more direct prompts
      return prompt.replace(/detailed|comprehensive|thorough/gi, '').trim();
    });
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoff(retry: number, config: FallbackConfig): number {
    if (config.backoff === 'linear') {
      return config.initialDelay * (retry + 1);
    }

    // Exponential backoff
    return config.initialDelay * Math.pow(2, retry);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(errorMsg: string): boolean {
    const rateLimitKeywords = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      '429',
      'throttled',
    ];

    return rateLimitKeywords.some(keyword =>
      errorMsg.toLowerCase().includes(keyword)
    );
  }

  /**
   * Parse reset time from error
   */
  private parseResetTime(error: any): Date {
    // Try to extract reset time from error
    if (error?.resetAt) {
      return new Date(error.resetAt);
    }

    if (error?.headers?.['x-ratelimit-reset']) {
      return new Date(parseInt(error.headers['x-ratelimit-reset']) * 1000);
    }

    // Default: 60 seconds from now
    return new Date(Date.now() + 60000);
  }

  /**
   * Get default config for model
   */
  private getDefaultConfig(model: ModelName): FallbackConfig {
    return {
      primary: model,
      fallbacks: [],
      maxRetries: 3,
      timeout: 60000,
      backoff: 'exponential',
      initialDelay: 1000,
    };
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(model: ModelName): RateLimitInfo | undefined {
    return this.rateLimits.get(model);
  }

  /**
   * Clear rate limit
   */
  clearRateLimit(model: ModelName): void {
    this.rateLimits.delete(model);
    console.log(`[Fallback] Cleared rate limit for ${model}`);
  }

  /**
   * Get all fallback configs
   */
  getFallbackConfigs(): Map<ModelName, FallbackConfig> {
    return new Map(this.fallbackConfigs);
  }
}
