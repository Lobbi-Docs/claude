/**
 * Base Secret Provider Interface
 *
 * Business Value: Defines a common contract for secret storage backends,
 * enabling seamless switching between local files, environment variables,
 * and cloud key vaults without changing application code.
 *
 * This abstraction supports:
 * - Local development with encrypted file storage
 * - Production deployments with cloud key management (Azure Key Vault)
 * - Environment variable fallbacks for simple configurations
 * - Custom provider implementations for specialized requirements
 */

import type {
  SecretMetadata,
  SecretValue,
  GetSecretOptions,
  SetSecretOptions,
  ListSecretsOptions,
  RotateSecretOptions,
} from '../types.js';

export interface SecretProvider {
  /**
   * Provider name (e.g., "local", "env", "azure-keyvault")
   *
   * Business Value: Identifies the storage backend for auditing and
   * troubleshooting, enabling multi-provider deployments.
   */
  readonly name: string;

  /**
   * Provider priority for fallback chains (higher = higher priority)
   *
   * Business Value: Enables layered secret resolution (e.g., check
   * Azure Key Vault first, fall back to environment variables).
   *
   * Recommended priorities:
   * - Cloud key vaults: 100
   * - Encrypted local storage: 50
   * - Environment variables: 10
   */
  readonly priority: number;

  /**
   * Initialize the provider
   *
   * Business Value: Performs one-time setup (e.g., connecting to cloud APIs,
   * loading encryption keys) to prepare the provider for use.
   *
   * @throws Error if initialization fails (e.g., network error, missing credentials)
   */
  initialize(): Promise<void>;

  /**
   * Get a secret value
   *
   * Business Value: Retrieves sensitive configuration securely, with
   * audit logging and access control enforcement.
   *
   * @param name - Secret name to retrieve
   * @param options - Retrieval options (version, accessor for audit)
   * @returns Secret value with metadata, or undefined if not found
   */
  get(
    name: string,
    options?: GetSecretOptions
  ): Promise<SecretValue | undefined>;

  /**
   * Set a secret value
   *
   * Business Value: Stores sensitive configuration securely, with
   * versioning and optional expiration.
   *
   * @param name - Secret name to set
   * @param value - Secret value (NEVER logged)
   * @param options - Storage options (scope, expiration, tags)
   */
  set(name: string, value: string, options?: SetSecretOptions): Promise<void>;

  /**
   * Delete a secret
   *
   * Business Value: Removes secrets that are no longer needed, reducing
   * attack surface and supporting compliance (e.g., GDPR right to erasure).
   *
   * @param name - Secret name to delete
   * @returns True if secret was deleted, false if not found
   */
  delete(name: string): Promise<boolean>;

  /**
   * List secrets matching criteria
   *
   * Business Value: Enables discovery and auditing of stored secrets,
   * supporting inventory management and compliance reporting.
   *
   * @param options - Filtering options (pattern, scope, tags)
   * @returns Array of secret metadata (values NOT included)
   */
  list(options?: ListSecretsOptions): Promise<SecretMetadata[]>;

  /**
   * Rotate a secret to a new value
   *
   * Business Value: Supports security best practices by enabling regular
   * secret rotation without service interruption.
   *
   * Implementation: Creates a new version while optionally retaining the
   * old version for graceful migration.
   *
   * @param name - Secret name to rotate
   * @param options - Rotation options (new value, expiration policy)
   */
  rotate(name: string, options: RotateSecretOptions): Promise<void>;

  /**
   * Check if the provider is healthy and available
   *
   * Business Value: Enables health checks and failover logic for
   * high-availability deployments.
   *
   * @returns True if provider is operational
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close the provider and release resources
   *
   * Business Value: Ensures clean shutdown (e.g., closing database
   * connections, clearing encryption keys from memory).
   */
  close(): Promise<void>;
}

/**
 * Base provider class with common functionality
 *
 * Business Value: Reduces code duplication across provider implementations
 * by providing shared utilities (caching, validation, logging).
 */
export abstract class BaseSecretProvider implements SecretProvider {
  abstract readonly name: string;
  abstract readonly priority: number;

  protected initialized = false;

  /**
   * Validate secret name format
   *
   * Business Value: Enforces naming conventions to prevent errors and
   * improve discoverability (e.g., kebab-case, no spaces).
   *
   * Rules:
   * - Only lowercase letters, numbers, hyphens, underscores
   * - Must start with a letter
   * - 3-128 characters
   */
  protected validateSecretName(name: string): void {
    if (!name || name.length < 3 || name.length > 128) {
      throw new Error(
        'Secret name must be between 3 and 128 characters'
      );
    }

    if (!/^[a-z][a-z0-9\-_]*$/.test(name)) {
      throw new Error(
        'Secret name must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores'
      );
    }
  }

  /**
   * Ensure provider is initialized before use
   *
   * Business Value: Prevents runtime errors from using uninitialized
   * providers, improving reliability.
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `Provider ${this.name} must be initialized before use`
      );
    }
  }

  /**
   * Check if a secret is expired
   *
   * Business Value: Enforces secret expiration policies, supporting
   * security best practices and compliance requirements.
   */
  protected isExpired(expiresAt?: string): boolean {
    if (!expiresAt) {
      return false;
    }

    const expiryDate = new Date(expiresAt);
    return expiryDate < new Date();
  }

  abstract initialize(): Promise<void>;
  abstract get(
    name: string,
    options?: GetSecretOptions
  ): Promise<SecretValue | undefined>;
  abstract set(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void>;
  abstract delete(name: string): Promise<boolean>;
  abstract list(options?: ListSecretsOptions): Promise<SecretMetadata[]>;
  abstract rotate(name: string, options: RotateSecretOptions): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
  abstract close(): Promise<void>;
}
