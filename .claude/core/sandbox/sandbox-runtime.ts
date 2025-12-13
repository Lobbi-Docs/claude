/**
 * Sandbox Runtime
 * Isolated execution environment for plugin code
 */

import {
  SandboxContext,
  ExecutionResult,
  PermissionSet,
  ResourceLimits,
  SecurityViolation,
  SandboxOptions,
} from './types.js';
import { PermissionValidator } from './permission-validator.js';
import { DEFAULT_POLICY } from './security-policy.js';

/**
 * Sandboxed runtime for executing plugin code
 */
export class SandboxRuntime {
  private validator: PermissionValidator;
  private contexts: Map<string, SandboxContext> = new Map();
  private options: SandboxOptions;

  constructor(options: SandboxOptions = {}) {
    this.options = options;
    const policy = options.policy
      ? { ...DEFAULT_POLICY, ...options.policy }
      : DEFAULT_POLICY;
    this.validator = new PermissionValidator(policy);
  }

  /**
   * Create isolated execution context
   */
  createContext(
    plugin: string,
    permissions: PermissionSet,
    limits?: Partial<ResourceLimits>
  ): SandboxContext {
    const contextId = this.generateContextId();

    const defaultLimits: ResourceLimits = {
      memoryLimit: '256MB',
      cpuTimeMs: 30000,
      networkCalls: 100,
      filesystemOps: 500,
      ...limits,
    };

    const context: SandboxContext = {
      id: contextId,
      plugin,
      permissions,
      limits: defaultLimits,
      allowedGlobals: this.getAllowedGlobals(),
      startTime: Date.now(),
      usage: {
        memoryBytes: 0,
        cpuTimeMs: 0,
        networkCalls: 0,
        filesystemOps: 0,
      },
    };

    this.contexts.set(contextId, context);
    return context;
  }

  /**
   * Execute code in sandbox
   */
  async execute(code: string, context: SandboxContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const violations: SecurityViolation[] = [];

    try {
      // Validate context is still active
      if (!this.contexts.has(context.id)) {
        throw new Error('Invalid or expired context');
      }

      // Check if code contains forbidden patterns
      const forbiddenCheck = this.checkForbiddenPatterns(code);
      if (!forbiddenCheck.allowed) {
        violations.push({
          type: 'pattern',
          severity: 'critical',
          message: `Forbidden pattern detected: ${forbiddenCheck.pattern}`,
          timestamp: Date.now(),
        });

        return {
          success: false,
          error: new Error(`Security violation: ${forbiddenCheck.pattern}`),
          executionTimeMs: Date.now() - startTime,
          usage: context.usage,
          violations,
        };
      }

      // Create sandboxed environment
      const sandbox = this.createSandboxEnvironment(context, violations);

      // Wrap code in async function
      const wrappedCode = `
        (async () => {
          'use strict';
          ${code}
        })()
      `;

      // Execute with timeout
      const timeoutMs = context.limits.cpuTimeMs;
      const result = await this.executeWithTimeout(
        wrappedCode,
        sandbox,
        timeoutMs
      );

      // Update usage stats
      const executionTimeMs = Date.now() - startTime;
      context.usage.cpuTimeMs += executionTimeMs;

      return {
        success: true,
        value: result,
        executionTimeMs,
        usage: { ...context.usage },
        violations: violations.length > 0 ? violations : undefined,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      // Check if timeout
      if (error instanceof Error && error.message.includes('timeout')) {
        violations.push({
          type: 'timeout',
          severity: 'high',
          message: `Execution exceeded timeout of ${context.limits.cpuTimeMs}ms`,
          timestamp: Date.now(),
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTimeMs,
        usage: context.usage,
        violations: violations.length > 0 ? violations : undefined,
      };
    }
  }

  /**
   * Create sandboxed environment with restricted globals
   */
  private createSandboxEnvironment(
    context: SandboxContext,
    violations: SecurityViolation[]
  ): Record<string, unknown> {
    const self = this;

    // Create restricted console
    const restrictedConsole = {
      log: (...args: unknown[]) => console.log(`[${context.plugin}]`, ...args),
      error: (...args: unknown[]) => console.error(`[${context.plugin}]`, ...args),
      warn: (...args: unknown[]) => console.warn(`[${context.plugin}]`, ...args),
      info: (...args: unknown[]) => console.info(`[${context.plugin}]`, ...args),
    };

    // Create restricted setTimeout/setInterval
    const timeouts = new Set<NodeJS.Timeout>();

    const restrictedSetTimeout = (
      callback: () => void,
      delay: number
    ): NodeJS.Timeout => {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        callback();
      }, delay);
      timeouts.add(timeout);
      return timeout;
    };

    const restrictedClearTimeout = (timeout: NodeJS.Timeout): void => {
      timeouts.delete(timeout);
      clearTimeout(timeout);
    };

    // Create permission-checked fetch
    const restrictedFetch = async (
      url: string,
      options?: RequestInit
    ): Promise<Response> => {
      // Check network permission
      const urlObj = new URL(url);
      const hasPermission = self.validator.checkPermission(
        'network:fetch',
        urlObj.hostname,
        context.permissions
      );

      if (!hasPermission) {
        violations.push({
          type: 'permission',
          severity: 'high',
          message: `Network access denied: ${urlObj.hostname}`,
          timestamp: Date.now(),
        });
        throw new Error(`Permission denied: network access to ${urlObj.hostname}`);
      }

      // Check network call limit
      if (context.usage.networkCalls >= context.limits.networkCalls) {
        violations.push({
          type: 'resource',
          severity: 'medium',
          message: `Network call limit exceeded: ${context.limits.networkCalls}`,
          timestamp: Date.now(),
        });
        throw new Error('Network call limit exceeded');
      }

      context.usage.networkCalls++;
      return fetch(url, options);
    };

    // Build sandbox with only allowed globals
    const sandbox: Record<string, unknown> = {
      console: restrictedConsole,
      setTimeout: restrictedSetTimeout,
      clearTimeout: restrictedClearTimeout,
      Promise,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      Math,
      JSON,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Error,
      RegExp,
      fetch: restrictedFetch,
    };

    // Add only allowed globals from context
    for (const global of context.allowedGlobals) {
      if (!(global in sandbox)) {
        // Only add if not already defined
        if (typeof globalThis[global as keyof typeof globalThis] !== 'undefined') {
          sandbox[global] = globalThis[global as keyof typeof globalThis];
        }
      }
    }

    return sandbox;
  }

  /**
   * Execute code with timeout
   */
  private async executeWithTimeout(
    code: string,
    sandbox: Record<string, unknown>,
    timeoutMs: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        // Create function in sandbox context
        const fn = new Function(...Object.keys(sandbox), `return ${code}`);
        const result = fn(...Object.values(sandbox));

        // Handle promises
        if (result instanceof Promise) {
          result
            .then((value) => {
              clearTimeout(timeout);
              resolve(value);
            })
            .catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
        } else {
          clearTimeout(timeout);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Check for forbidden patterns in code
   */
  private checkForbiddenPatterns(code: string): {
    allowed: boolean;
    pattern?: string;
  } {
    const policy = this.options.policy || DEFAULT_POLICY;

    for (const pattern of policy.bannedPatterns) {
      if (pattern.test(code)) {
        return {
          allowed: false,
          pattern: pattern.source,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get allowed global variables
   */
  private getAllowedGlobals(): Set<string> {
    return new Set([
      'console',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Promise',
      'fetch',
      'URL',
      'URLSearchParams',
      'TextEncoder',
      'TextDecoder',
      'Buffer',
    ]);
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Destroy context and cleanup resources
   */
  destroyContext(contextId: string): void {
    this.contexts.delete(contextId);
  }

  /**
   * Get context by ID
   */
  getContext(contextId: string): SandboxContext | undefined {
    return this.contexts.get(contextId);
  }

  /**
   * Get all active contexts
   */
  getActiveContexts(): SandboxContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Cleanup expired contexts
   */
  cleanupExpiredContexts(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [id, context] of this.contexts.entries()) {
      if (now - context.startTime > maxAgeMs) {
        this.destroyContext(id);
      }
    }
  }
}
