/**
 * Secret Manager - Unified Secret Management API
 *
 * Business Value: Provides a single, consistent interface for secret management
 * across multiple backend providers (local, environment, Azure Key Vault), with
 * automatic failover, template substitution, and audit logging.
 *
 * Key Features:
 * - Multi-provider support with priority-based fallback
 * - Template variable substitution in configuration
 * - Comprehensive audit logging
 * - Access control integration
 * - Graceful degradation when providers fail
 *
 * Best Practices:
 * - Initialize providers in priority order (cloud > local > env)
 * - Use environment provider as fallback for maximum compatibility
 * - Enable audit logging for compliance requirements
 * - Implement access control for production deployments
 */

import type { SecretProvider } from './providers/base.js';
import type {
  SecretMetadata,
  SecretValue,
  GetSecretOptions,
  SetSecretOptions,
  ListSecretsOptions,
  RotateSecretOptions,
  SecretAccessLogEntry,
} from './types.js';

export interface SecretManagerOptions {
  /**
   * Secret providers in priority order
   *
   * Business Value: Enables layered secret resolution with automatic
   * fallback. Example: try Azure Key Vault first, fall back to local
   * encrypted storage, finally try environment variables.
   */
  providers: SecretProvider[];

  /**
   * Default provider for write operations
   *
   * Business Value: Determines where new secrets are stored when not
   * explicitly specified.
   */
  defaultWriteProvider?: string;

  /**
   * Enable audit logging
   *
   * Business Value: Supports compliance requirements by tracking all
   * secret access for security investigations.
   */
  enableAuditLog?: boolean;

  /**
   * Audit log callback
   *
   * Business Value: Enables custom audit log storage (database, file,
   * monitoring system) for centralized security monitoring.
   */
  auditLogCallback?: (entry: SecretAccessLogEntry) => Promise<void>;
}

export class SecretManager {
  private providers: Map<string, SecretProvider> = new Map();
  private sortedProviders: SecretProvider[] = [];
  private options: Required<Omit<SecretManagerOptions, 'auditLogCallback'>> & {
    auditLogCallback?: (entry: SecretAccessLogEntry) => Promise<void>;
  };

  constructor(options: SecretManagerOptions) {
    this.options = {
      defaultWriteProvider:
        options.providers[0]?.name || 'local',
      enableAuditLog: true,
      ...options,
    };

    // Register providers
    for (const provider of options.providers) {
      this.providers.set(provider.name, provider);
    }

    // Sort providers by priority (highest first)
    this.sortedProviders = [...options.providers].sort(
      (a, b) => b.priority - a.priority
    );
  }

  /**
   * Initialize all providers
   *
   * Business Value: Prepares all secret backends for use, with detailed
   * error reporting for troubleshooting connectivity issues.
   */
  async initialize(): Promise<void> {
    const errors: Array<{ provider: string; error: Error }> = [];

    for (const provider of this.providers.values()) {
      try {
        await provider.initialize();
      } catch (error) {
        errors.push({
          provider: provider.name,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // If all providers failed, throw
    if (errors.length === this.providers.size) {
      throw new Error(
        `All providers failed to initialize:\n${errors
          .map((e) => `  - ${e.provider}: ${e.error.message}`)
          .join('\n')}`
      );
    }

    // Log warnings for failed providers
    if (errors.length > 0) {
      console.warn(
        `Some providers failed to initialize:\n${errors
          .map((e) => `  - ${e.provider}: ${e.error.message}`)
          .join('\n')}`
      );
    }
  }

  /**
   * Get a secret value
   *
   * Business Value: Retrieves secrets with automatic provider fallback,
   * ensuring maximum availability even if individual providers fail.
   *
   * Provider Resolution:
   * 1. Try providers in priority order (highest first)
   * 2. Return first successful result
   * 3. Throw error if all providers fail (when required=true)
   *
   * @param name - Secret name to retrieve
   * @param options - Retrieval options (provider, version, accessor)
   * @returns Secret value with metadata, or undefined if not found
   */
  async get(
    name: string,
    options?: GetSecretOptions & { provider?: string }
  ): Promise<SecretValue | undefined> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    // Use specific provider if requested
    if (options?.provider) {
      const provider = this.providers.get(options.provider);
      if (!provider) {
        throw new Error(`Provider not found: ${options.provider}`);
      }

      try {
        const result = await provider.get(name, options);
        await this.logAccess({
          secretName: name,
          action: 'get',
          accessor: options.accessor || 'system',
          success: result !== undefined,
          provider: provider.name,
          version: options.version,
        });
        return result;
      } catch (error) {
        await this.logAccess({
          secretName: name,
          action: 'get',
          accessor: options.accessor || 'system',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          provider: provider.name,
        });
        throw error;
      }
    }

    // Try providers in priority order
    for (const provider of this.sortedProviders) {
      try {
        const result = await provider.get(name, options);
        if (result !== undefined) {
          await this.logAccess({
            secretName: name,
            action: 'get',
            accessor: options?.accessor || 'system',
            success: true,
            provider: provider.name,
            version: result.metadata.version,
          });
          return result;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue to next provider
      }
    }

    // None of the providers had the secret
    if (options?.required) {
      await this.logAccess({
        secretName: name,
        action: 'get',
        accessor: options.accessor || 'system',
        success: false,
        error: lastError?.message || 'Secret not found in any provider',
      });

      throw new Error(
        `Required secret not found: ${name}${
          lastError ? ` (last error: ${lastError.message})` : ''
        }`
      );
    }

    await this.logAccess({
      secretName: name,
      action: 'get',
      accessor: options?.accessor || 'system',
      success: false,
    });

    return undefined;
  }

  /**
   * Set a secret value
   *
   * Business Value: Stores secrets securely with automatic provider
   * selection and comprehensive audit logging.
   *
   * @param name - Secret name to set
   * @param value - Secret value (NEVER logged)
   * @param options - Storage options (provider, scope, expiration, tags)
   */
  async set(
    name: string,
    value: string,
    options?: SetSecretOptions & { provider?: string }
  ): Promise<void> {
    const providerName =
      options?.provider || this.options.defaultWriteProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    try {
      await provider.set(name, value, options);
      await this.logAccess({
        secretName: name,
        action: 'set',
        accessor: options?.actor || 'system',
        success: true,
        provider: provider.name,
      });
    } catch (error) {
      await this.logAccess({
        secretName: name,
        action: 'set',
        accessor: options?.actor || 'system',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: provider.name,
      });
      throw error;
    }
  }

  /**
   * Delete a secret
   *
   * Business Value: Removes secrets permanently, supporting compliance
   * requirements and reducing attack surface.
   *
   * @param name - Secret name to delete
   * @param provider - Optional provider name (defaults to all writable providers)
   * @returns True if secret was deleted from any provider
   */
  async delete(
    name: string,
    options?: { provider?: string; accessor?: string }
  ): Promise<boolean> {
    if (options?.provider) {
      const provider = this.providers.get(options.provider);
      if (!provider) {
        throw new Error(`Provider not found: ${options.provider}`);
      }

      try {
        const deleted = await provider.delete(name);
        await this.logAccess({
          secretName: name,
          action: 'delete',
          accessor: options.accessor || 'system',
          success: deleted,
          provider: provider.name,
        });
        return deleted;
      } catch (error) {
        await this.logAccess({
          secretName: name,
          action: 'delete',
          accessor: options.accessor || 'system',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          provider: provider.name,
        });
        throw error;
      }
    }

    // Delete from all writable providers
    let anyDeleted = false;
    for (const provider of this.providers.values()) {
      try {
        const deleted = await provider.delete(name);
        anyDeleted = anyDeleted || deleted;
      } catch {
        // Ignore errors (provider might be read-only)
      }
    }

    await this.logAccess({
      secretName: name,
      action: 'delete',
      accessor: options?.accessor || 'system',
      success: anyDeleted,
    });

    return anyDeleted;
  }

  /**
   * List secrets matching criteria
   *
   * Business Value: Enables discovery and inventory of stored secrets
   * across all providers for auditing and management.
   *
   * @param options - Filtering options (pattern, scope, tags, provider)
   * @returns Array of secret metadata from all matching providers
   */
  async list(
    options?: ListSecretsOptions & { provider?: string; accessor?: string }
  ): Promise<SecretMetadata[]> {
    const results: SecretMetadata[] = [];
    const seenNames = new Set<string>();

    const providers = options?.provider
      ? [this.providers.get(options.provider)].filter(
          (p): p is SecretProvider => p !== undefined
        )
      : this.sortedProviders;

    for (const provider of providers) {
      try {
        const providerResults = await provider.list(options);

        // Deduplicate by name (prefer higher priority providers)
        for (const result of providerResults) {
          if (!seenNames.has(result.name)) {
            seenNames.add(result.name);
            results.push(result);
          }
        }
      } catch (error) {
        // Log error but continue with other providers
        console.warn(
          `Failed to list secrets from ${provider.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    await this.logAccess({
      secretName: '*',
      action: 'list',
      accessor: options?.accessor || 'system',
      success: true,
    });

    return results;
  }

  /**
   * Rotate a secret to a new value
   *
   * Business Value: Supports security best practices by enabling regular
   * credential rotation across all providers.
   *
   * @param name - Secret name to rotate
   * @param options - Rotation options (new value, provider)
   */
  async rotate(
    name: string,
    options: RotateSecretOptions & { provider?: string }
  ): Promise<void> {
    const providerName =
      options.provider || this.options.defaultWriteProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    try {
      await provider.rotate(name, options);
      await this.logAccess({
        secretName: name,
        action: 'rotate',
        accessor: options.actor || 'system',
        success: true,
        provider: provider.name,
      });
    } catch (error) {
      await this.logAccess({
        secretName: name,
        action: 'rotate',
        accessor: options.actor || 'system',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: provider.name,
      });
      throw error;
    }
  }

  /**
   * Substitute secret references in a configuration object
   *
   * Business Value: Enables declarative secret injection into configuration
   * without hardcoding credentials, supporting GitOps and infrastructure-as-code.
   *
   * Template syntax: ${secret:name} or ${secret:name:default-value}
   *
   * Example:
   *   config = { apiKey: "${secret:api-key-stripe}" }
   *   result = { apiKey: "sk_live_123..." }
   *
   * @param config - Configuration object with secret references
   * @param options - Substitution options (accessor for audit)
   * @returns Configuration with secrets replaced
   */
  async substituteSecrets<T>(
    config: T,
    options?: { accessor?: string }
  ): Promise<T> {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    if (Array.isArray(config)) {
      return (await Promise.all(
        config.map((item) => this.substituteSecrets(item, options))
      )) as T;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        result[key] = await this.substituteString(value, options);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = await this.substituteSecrets(value, options);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Check health of all providers
   *
   * Business Value: Enables monitoring and alerting for secret provider
   * availability, supporting high-availability deployments.
   *
   * @returns Map of provider names to health status
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        health.set(name, isHealthy);
      } catch {
        health.set(name, false);
      }
    }

    return health;
  }

  /**
   * Close all providers
   *
   * Business Value: Ensures clean shutdown with proper cleanup of
   * resources (connections, cached secrets, encryption keys).
   */
  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.providers.values()).map((p) => p.close())
    );
  }

  // Private helper methods

  /**
   * Substitute secret references in a string
   *
   * Supports:
   * - ${secret:name} - Required secret
   * - ${secret:name:default} - Optional secret with default
   */
  private async substituteString(
    str: string,
    options?: { accessor?: string }
  ): Promise<string> {
    const secretRegex = /\$\{secret:([^:}]+)(?::([^}]+))?\}/g;
    let result = str;
    let match;

    while ((match = secretRegex.exec(str)) !== null) {
      const [fullMatch, secretName, defaultValue] = match;

      try {
        const secret = await this.get(secretName, {
          accessor: options?.accessor || 'system',
          required: defaultValue === undefined,
        });

        const value = secret?.value || defaultValue || '';
        result = result.replace(fullMatch, value);
      } catch (error) {
        if (defaultValue === undefined) {
          throw new Error(
            `Failed to substitute secret ${secretName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        result = result.replace(fullMatch, defaultValue);
      }
    }

    return result;
  }

  /**
   * Log secret access for audit trail
   */
  private async logAccess(params: {
    secretName: string;
    action: 'get' | 'set' | 'delete' | 'rotate' | 'list';
    accessor: string;
    success: boolean;
    error?: string;
    provider?: string;
    version?: number;
  }): Promise<void> {
    if (!this.options.enableAuditLog) {
      return;
    }

    const entry: SecretAccessLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      secretId: params.secretName,
      secretName: params.secretName,
      accessor: params.accessor,
      action: params.action,
      timestamp: new Date().toISOString(),
      success: params.success,
      error: params.error,
      version: params.version,
    };

    if (this.options.auditLogCallback) {
      try {
        await this.options.auditLogCallback(entry);
      } catch (error) {
        console.error('Failed to write audit log:', error);
      }
    }
  }
}
