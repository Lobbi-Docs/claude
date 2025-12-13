/**
 * Environment Variable Secret Provider
 *
 * Business Value: Enables reading secrets from environment variables, supporting
 * standard deployment patterns (Kubernetes secrets, Docker env vars, CI/CD systems)
 * without requiring additional infrastructure.
 *
 * Best for:
 * - Container deployments (Docker, Kubernetes)
 * - CI/CD pipelines (GitHub Actions, GitLab CI)
 * - Platform-as-a-Service deployments (Heroku, Railway, Render)
 * - Quick prototypes and simple configurations
 *
 * Limitations:
 * - Read-only (cannot modify environment variables at runtime)
 * - No versioning or rotation support
 * - No expiration or audit logging
 * - Secrets visible in process environment
 *
 * Security Considerations:
 * - Environment variables are readable by the process and child processes
 * - No encryption at rest (relies on OS/platform security)
 * - Use only for non-critical secrets or as fallback
 */

import { BaseSecretProvider } from './base.js';
import type {
  SecretMetadata,
  SecretValue,
  GetSecretOptions,
  SetSecretOptions,
  ListSecretsOptions,
  RotateSecretOptions,
} from '../types.js';

export interface EnvProviderOptions {
  /**
   * Prefix for secret environment variables (default: "CLAUDE_SECRET_")
   *
   * Business Value: Enables namespacing to avoid conflicts with other
   * environment variables and clearly identify secret values.
   *
   * Example: With prefix "CLAUDE_SECRET_", the secret "api-key-stripe"
   * would be read from environment variable "CLAUDE_SECRET_API_KEY_STRIPE"
   */
  prefix?: string;

  /**
   * Whether to transform secret names to uppercase (default: true)
   *
   * Business Value: Matches standard environment variable conventions
   * (UPPER_CASE) while allowing kebab-case secret names.
   */
  uppercaseNames?: boolean;

  /**
   * Delimiter for name transformation (default: "_")
   *
   * Business Value: Controls how hyphens in secret names are converted
   * for environment variable lookup.
   *
   * Example: "api-key-stripe" -> "API_KEY_STRIPE"
   */
  delimiter?: string;

  /**
   * Fallback environment variables without prefix
   *
   * Business Value: Enables reading standard environment variables
   * (e.g., DATABASE_URL, REDIS_URL) as secrets.
   */
  allowUnprefixed?: boolean;
}

export class EnvSecretProvider extends BaseSecretProvider {
  readonly name = 'env';
  readonly priority = 10; // Low priority - use as fallback

  private options: Required<EnvProviderOptions>;

  constructor(options: EnvProviderOptions = {}) {
    super();
    this.options = {
      prefix: 'CLAUDE_SECRET_',
      uppercaseNames: true,
      delimiter: '_',
      allowUnprefixed: false,
      ...options,
    };
  }

  /**
   * Initialize the environment provider
   *
   * Business Value: Validates configuration and scans available
   * environment variables for secrets.
   */
  async initialize(): Promise<void> {
    // Environment provider is always ready
    this.initialized = true;
  }

  /**
   * Get a secret from environment variables
   *
   * Business Value: Retrieves secrets from the process environment,
   * enabling standard deployment patterns without additional setup.
   *
   * @param name - Secret name (e.g., "api-key-stripe")
   * @param options - Retrieval options
   * @returns Secret value if found in environment
   */
  async get(
    name: string,
    options?: GetSecretOptions
  ): Promise<SecretValue | undefined> {
    this.ensureInitialized();
    this.validateSecretName(name);

    const envVarName = this.transformSecretName(name);
    const value = process.env[envVarName];

    if (!value) {
      // Try unprefixed if allowed
      if (this.options.allowUnprefixed) {
        const unprefixedName = this.transformSecretName(name, true);
        const unprefixedValue = process.env[unprefixedName];

        if (unprefixedValue) {
          return this.createSecretValue(name, unprefixedValue);
        }
      }

      if (options?.required) {
        throw new Error(
          `Secret not found in environment: ${name} (looked for ${envVarName})`
        );
      }
      return undefined;
    }

    return this.createSecretValue(name, value);
  }

  /**
   * Set a secret (NOT SUPPORTED for environment provider)
   *
   * Business Value: Environment variables are read-only at runtime.
   * Use local or cloud providers for writable secret storage.
   *
   * @throws Error - Environment provider is read-only
   */
  async set(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void> {
    throw new Error(
      'Environment provider is read-only. Use local or cloud provider for writable secrets.'
    );
  }

  /**
   * Delete a secret (NOT SUPPORTED for environment provider)
   *
   * Business Value: Environment variables cannot be deleted at runtime.
   *
   * @throws Error - Environment provider is read-only
   */
  async delete(name: string): Promise<boolean> {
    throw new Error(
      'Environment provider is read-only. Cannot delete secrets from environment.'
    );
  }

  /**
   * List secrets from environment variables
   *
   * Business Value: Enables discovery of available secrets for debugging
   * and configuration validation.
   *
   * @param options - Filtering options (pattern matching supported)
   * @returns Metadata for matching environment secrets
   */
  async list(options?: ListSecretsOptions): Promise<SecretMetadata[]> {
    this.ensureInitialized();

    const results: SecretMetadata[] = [];
    const prefix = this.options.prefix;

    for (const [envVar, value] of Object.entries(process.env)) {
      // Skip if doesn't start with prefix
      if (!envVar.startsWith(prefix)) {
        if (!this.options.allowUnprefixed) {
          continue;
        }
      }

      // Extract secret name
      const secretName = this.reverseTransformSecretName(envVar);
      if (!secretName) {
        continue;
      }

      // Apply pattern filter
      if (options?.pattern && !this.matchesPattern(secretName, options.pattern)) {
        continue;
      }

      // Environment secrets are always global scope
      if (options?.scope && options.scope !== 'global') {
        continue;
      }

      results.push({
        id: `env:${secretName}`,
        name: secretName,
        provider: this.name,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scope: 'global',
      });
    }

    return results;
  }

  /**
   * Rotate a secret (NOT SUPPORTED for environment provider)
   *
   * Business Value: Secret rotation requires writable storage.
   * Use local or cloud providers for rotation support.
   *
   * @throws Error - Environment provider is read-only
   */
  async rotate(name: string, options: RotateSecretOptions): Promise<void> {
    throw new Error(
      'Environment provider does not support rotation. Use local or cloud provider.'
    );
  }

  /**
   * Check if the provider is healthy
   *
   * Business Value: Environment provider is always available if the
   * process is running.
   */
  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  /**
   * Close the provider
   *
   * Business Value: Environment provider has no resources to clean up.
   */
  async close(): Promise<void> {
    this.initialized = false;
  }

  // Private helper methods

  /**
   * Transform a secret name to environment variable format
   *
   * Business Value: Converts kebab-case secret names to UPPER_CASE
   * environment variable names following standard conventions.
   *
   * Example: "api-key-stripe" -> "CLAUDE_SECRET_API_KEY_STRIPE"
   */
  private transformSecretName(name: string, skipPrefix = false): string {
    let transformed = name;

    if (this.options.uppercaseNames) {
      transformed = transformed.toUpperCase();
    }

    // Replace hyphens with delimiter
    transformed = transformed.replace(/-/g, this.options.delimiter);

    // Add prefix
    if (!skipPrefix) {
      transformed = this.options.prefix + transformed;
    }

    return transformed;
  }

  /**
   * Reverse transform environment variable name to secret name
   *
   * Business Value: Enables listing and discovery by converting env var
   * names back to standard secret naming format.
   *
   * Example: "CLAUDE_SECRET_API_KEY_STRIPE" -> "api-key-stripe"
   */
  private reverseTransformSecretName(envVar: string): string | null {
    let name = envVar;

    // Remove prefix if present
    if (name.startsWith(this.options.prefix)) {
      name = name.substring(this.options.prefix.length);
    }

    // Convert to lowercase if uppercase was applied
    if (this.options.uppercaseNames) {
      name = name.toLowerCase();
    }

    // Replace delimiter with hyphens
    name = name.replace(new RegExp(this.options.delimiter, 'g'), '-');

    // Validate the result is a valid secret name
    try {
      this.validateSecretName(name);
      return name;
    } catch {
      return null;
    }
  }

  /**
   * Create a SecretValue object from environment variable
   *
   * Business Value: Wraps environment variables in the standard secret
   * interface for consistent API across providers.
   */
  private createSecretValue(name: string, value: string): SecretValue {
    return {
      metadata: {
        id: `env:${name}`,
        name,
        provider: this.name,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scope: 'global',
      },
      value,
    };
  }

  /**
   * Check if a secret name matches a glob pattern
   *
   * Business Value: Enables filtering secrets by pattern for discovery
   * and management workflows.
   */
  private matchesPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(name);
  }
}
