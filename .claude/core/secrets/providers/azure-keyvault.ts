/**
 * Azure Key Vault Secret Provider
 *
 * Business Value: Integrates with Azure Key Vault for enterprise-grade secret
 * management, leveraging Azure's security, compliance, and high availability.
 *
 * Best for:
 * - Production deployments on Azure
 * - Enterprise environments with compliance requirements
 * - Multi-team organizations requiring centralized secret management
 * - High-availability deployments requiring redundancy
 *
 * Features:
 * - Managed identity support (no credentials in code)
 * - Hardware security module (HSM) backing
 * - Audit logging via Azure Monitor
 * - Secret versioning and rotation
 * - In-memory caching with TTL
 * - Automatic retry with exponential backoff
 *
 * Prerequisites:
 * - Azure subscription with Key Vault resource
 * - Managed identity or service principal credentials
 * - Network access to Azure Key Vault endpoint
 *
 * Installation:
 *   npm install @azure/keyvault-secrets @azure/identity
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

// Types for Azure SDK (will be imported at runtime)
interface AzureSecretClient {
  getSecret(name: string, options?: any): Promise<any>;
  setSecret(name: string, value: string, options?: any): Promise<any>;
  beginDeleteSecret(name: string): Promise<any>;
  listPropertiesOfSecrets(options?: any): AsyncIterable<any>;
  purgeDeletedSecret(name: string): Promise<void>;
}

interface AzureCredential {
  getToken(scopes: string | string[], options?: any): Promise<any>;
}

export interface AzureKeyVaultProviderOptions {
  /**
   * Azure Key Vault URL (e.g., "https://my-vault.vault.azure.net")
   *
   * Business Value: Identifies the specific Key Vault instance,
   * supporting multi-vault deployments for environment separation.
   */
  vaultUrl: string;

  /**
   * Azure credential (DefaultAzureCredential, ManagedIdentityCredential, etc.)
   *
   * Business Value: Enables authentication via managed identities,
   * service principals, or developer credentials without hardcoded secrets.
   *
   * If not provided, will use DefaultAzureCredential (recommended for Azure deployments).
   */
  credential?: AzureCredential;

  /**
   * Cache TTL in seconds (default: 300 = 5 minutes)
   *
   * Business Value: Reduces API calls and improves performance while
   * maintaining reasonable freshness for secret rotation.
   */
  cacheTtlSeconds?: number;

  /**
   * Tag prefix for secret metadata (default: "claude-")
   *
   * Business Value: Enables storing custom metadata (scope, tags) as
   * Azure Key Vault tags without conflicts.
   */
  tagPrefix?: string;

  /**
   * Maximum retry attempts for transient failures (default: 3)
   *
   * Business Value: Improves reliability by automatically recovering
   * from network glitches and temporary service issues.
   */
  maxRetries?: number;
}

interface CachedSecret {
  value: SecretValue;
  expiresAt: number;
}

export class AzureKeyVaultProvider extends BaseSecretProvider {
  readonly name = 'azure-keyvault';
  readonly priority = 100; // Highest priority - use for production

  private options: Required<
    Omit<AzureKeyVaultProviderOptions, 'credential'>
  > & { credential?: AzureCredential };
  private client?: AzureSecretClient;
  private cache = new Map<string, CachedSecret>();

  constructor(options: AzureKeyVaultProviderOptions) {
    super();
    this.options = {
      cacheTtlSeconds: 300,
      tagPrefix: 'claude-',
      maxRetries: 3,
      ...options,
    };
  }

  /**
   * Initialize the Azure Key Vault provider
   *
   * Business Value: Establishes connection to Azure Key Vault and
   * validates credentials before accepting secret operations.
   */
  async initialize(): Promise<void> {
    try {
      // Dynamically import Azure SDK
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const { DefaultAzureCredential } = await import('@azure/identity');

      // Use provided credential or default
      const credential = this.options.credential || new DefaultAzureCredential();

      // Create client
      this.client = new SecretClient(this.options.vaultUrl, credential as any);

      // Verify connectivity with a health check
      const healthSecret = `${this.options.tagPrefix}health-check`;
      try {
        await this.client!.getSecret(healthSecret);
      } catch (error: any) {
        // Expected if secret doesn't exist
        if (error?.code !== 'SecretNotFound') {
          throw error;
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize Azure Key Vault provider: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get a secret from Azure Key Vault
   *
   * Business Value: Retrieves secrets from Azure's secure vault with
   * automatic caching for performance and retry logic for reliability.
   */
  async get(
    name: string,
    options?: GetSecretOptions
  ): Promise<SecretValue | undefined> {
    this.ensureInitialized();
    this.validateSecretName(name);

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    // Check cache first (unless specific version requested)
    if (!options?.version) {
      const cached = this.getCached(name);
      if (cached) {
        return cached;
      }
    }

    try {
      // Transform name for Azure (replace hyphens with underscores)
      const azureName = this.transformSecretName(name);

      // Get secret from Azure
      const getOptions = options?.version
        ? { version: String(options.version) }
        : undefined;

      const azureSecret = await this.retryOperation(() =>
        this.client!.getSecret(azureName, getOptions)
      );

      if (!azureSecret || !azureSecret.value) {
        if (options?.required) {
          throw new Error(`Secret not found: ${name}`);
        }
        return undefined;
      }

      // Extract metadata from tags
      const scope = azureSecret.properties.tags?.[`${this.options.tagPrefix}scope`] || 'global';
      const tagsJson = azureSecret.properties.tags?.[`${this.options.tagPrefix}tags`];
      const tags = tagsJson ? JSON.parse(tagsJson) : undefined;

      const metadata: SecretMetadata = {
        id: azureSecret.properties.id || azureSecret.name,
        name,
        provider: this.name,
        version: parseInt(azureSecret.properties.version || '1', 10),
        createdAt:
          azureSecret.properties.createdOn?.toISOString() ||
          new Date().toISOString(),
        updatedAt:
          azureSecret.properties.updatedOn?.toISOString() ||
          new Date().toISOString(),
        expiresAt: azureSecret.properties.expiresOn?.toISOString(),
        tags,
        scope: scope as any,
      };

      const secretValue: SecretValue = {
        metadata,
        value: azureSecret.value,
      };

      // Cache the result
      this.setCached(name, secretValue);

      return secretValue;
    } catch (error: any) {
      if (error?.code === 'SecretNotFound') {
        if (options?.required) {
          throw new Error(`Secret not found: ${name}`);
        }
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Set a secret in Azure Key Vault
   *
   * Business Value: Stores secrets in Azure's secure vault with
   * automatic versioning and metadata tagging.
   */
  async set(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void> {
    this.ensureInitialized();
    this.validateSecretName(name);

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const azureName = this.transformSecretName(name);

    // Prepare metadata as tags
    const tags: Record<string, string> = {
      [`${this.options.tagPrefix}scope`]: options?.scope || 'global',
    };

    if (options?.tags && options.tags.length > 0) {
      tags[`${this.options.tagPrefix}tags`] = JSON.stringify(options.tags);
    }

    // Set expiration
    const setOptions: any = {
      tags,
    };

    if (options?.expiresAt) {
      const expiresAt =
        typeof options.expiresAt === 'string'
          ? new Date(options.expiresAt)
          : new Date(Date.now() + options.expiresAt * 1000);
      setOptions.expiresOn = expiresAt;
    }

    // Set secret in Azure
    await this.retryOperation(() =>
      this.client!.setSecret(azureName, value, setOptions)
    );

    // Invalidate cache
    this.cache.delete(name);
  }

  /**
   * Delete a secret from Azure Key Vault
   *
   * Business Value: Removes secrets from Azure vault, supporting
   * compliance requirements and reducing attack surface.
   *
   * Note: Azure soft-deletes secrets by default. Use purge for permanent deletion.
   */
  async delete(name: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const azureName = this.transformSecretName(name);

      // Begin delete operation
      const poller = await this.retryOperation(() =>
        this.client!.beginDeleteSecret(azureName)
      );

      // Wait for deletion to complete
      await poller.pollUntilDone();

      // Invalidate cache
      this.cache.delete(name);

      return true;
    } catch (error: any) {
      if (error?.code === 'SecretNotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List secrets from Azure Key Vault
   *
   * Business Value: Enables discovery and inventory of stored secrets
   * for auditing and management.
   */
  async list(options?: ListSecretsOptions): Promise<SecretMetadata[]> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const results: SecretMetadata[] = [];

    try {
      for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
        const name = this.reverseTransformSecretName(secretProperties.name);

        // Apply filters
        if (options?.pattern && !this.matchesPattern(name, options.pattern)) {
          continue;
        }

        const scope =
          secretProperties.tags?.[`${this.options.tagPrefix}scope`] || 'global';
        if (options?.scope && scope !== options.scope) {
          continue;
        }

        const tagsJson = secretProperties.tags?.[`${this.options.tagPrefix}tags`];
        const tags = tagsJson ? JSON.parse(tagsJson) : undefined;

        if (options?.tags && !this.matchesTags(tags, options.tags)) {
          continue;
        }

        if (
          !options?.includeExpired &&
          secretProperties.expiresOn &&
          secretProperties.expiresOn < new Date()
        ) {
          continue;
        }

        results.push({
          id: secretProperties.id || secretProperties.name,
          name,
          provider: this.name,
          version: parseInt(secretProperties.version || '1', 10),
          createdAt:
            secretProperties.createdOn?.toISOString() ||
            new Date().toISOString(),
          updatedAt:
            secretProperties.updatedOn?.toISOString() ||
            new Date().toISOString(),
          expiresAt: secretProperties.expiresOn?.toISOString(),
          tags,
          scope: scope as any,
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to list secrets: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return results;
  }

  /**
   * Rotate a secret in Azure Key Vault
   *
   * Business Value: Supports security best practices by enabling regular
   * credential rotation with automatic versioning.
   */
  async rotate(name: string, options: RotateSecretOptions): Promise<void> {
    this.ensureInitialized();

    const existing = await this.get(name, { required: true });
    if (!existing) {
      throw new Error(`Cannot rotate non-existent secret: ${name}`);
    }

    // Set new version (Azure automatically versions)
    await this.set(name, options.newValue, {
      scope: existing.metadata.scope,
      tags: existing.metadata.tags,
      expiresAt: existing.metadata.expiresAt,
    });

    // Note: Azure Key Vault keeps old versions automatically
    // They can be accessed by version number
  }

  /**
   * Check if Azure Key Vault is accessible
   *
   * Business Value: Enables health monitoring and automatic failover
   * to backup providers if Azure is unavailable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized || !this.client) {
        return false;
      }

      // Try to list secrets (limited to 1 for performance)
      const iterator = this.client.listPropertiesOfSecrets();
      const result = await iterator[Symbol.asyncIterator]().next();

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the provider and clear cache
   *
   * Business Value: Ensures clean shutdown with proper cleanup of
   * cached secret values.
   */
  async close(): Promise<void> {
    this.cache.clear();
    this.client = undefined;
    this.initialized = false;
  }

  // Private helper methods

  /**
   * Transform secret name for Azure Key Vault
   *
   * Azure Key Vault naming rules:
   * - Only alphanumeric and hyphens allowed
   * - We already enforce this in validateSecretName
   */
  private transformSecretName(name: string): string {
    return name;
  }

  /**
   * Reverse transform Azure name to secret name
   */
  private reverseTransformSecretName(azureName: string): string {
    return azureName;
  }

  /**
   * Get cached secret if still valid
   */
  private getCached(name: string): SecretValue | undefined {
    const cached = this.cache.get(name);
    if (!cached) {
      return undefined;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(name);
      return undefined;
    }

    return cached.value;
  }

  /**
   * Cache a secret value
   */
  private setCached(name: string, value: SecretValue): void {
    this.cache.set(name, {
      value,
      expiresAt: Date.now() + this.options.cacheTtlSeconds * 1000,
    });
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-transient errors
        if (!this.isTransientError(error)) {
          throw error;
        }

        if (attempt < this.options.maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delay = 100 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Check if an error is transient (should retry)
   */
  private isTransientError(error: any): boolean {
    const transientCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ServiceUnavailable',
      'TooManyRequests',
    ];

    return transientCodes.some(
      (code) => error?.code === code || error?.message?.includes(code)
    );
  }

  /**
   * Check if a secret name matches a glob pattern
   */
  private matchesPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(name);
  }

  /**
   * Check if secret tags match required tags
   */
  private matchesTags(
    secretTags: string[] | undefined,
    requiredTags: string[]
  ): boolean {
    if (!secretTags) {
      return false;
    }

    return requiredTags.every((tag) => secretTags.includes(tag));
  }
}
