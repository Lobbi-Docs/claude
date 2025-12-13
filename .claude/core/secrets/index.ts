/**
 * Secrets Management Integration
 *
 * Business Value: Provides enterprise-grade secret management for the Claude
 * orchestration platform, supporting multiple storage backends, encryption at rest,
 * access control, and comprehensive audit logging.
 *
 * This module establishes a unified API for secure credential management across:
 * - Local encrypted file storage (development, small deployments)
 * - Environment variables (container deployments, CI/CD)
 * - Azure Key Vault (production, enterprise)
 *
 * Key Features:
 * - AES-256-GCM encryption for secrets at rest
 * - Multi-provider support with automatic failover
 * - Versioning and rotation for secret lifecycle management
 * - Role-based access control (RBAC) with scope isolation
 * - Comprehensive audit logging for compliance
 * - Template substitution for configuration injection
 *
 * @example
 * ```typescript
 * import { createSecretManager } from '@claude/core/secrets';
 *
 * // Initialize secret manager with providers
 * const secretManager = await createSecretManager({
 *   providers: [
 *     new AzureKeyVaultProvider({ vaultUrl: process.env.AZURE_VAULT_URL }),
 *     new LocalSecretProvider({
 *       storePath: '.claude/secrets/local.enc.json',
 *       masterKey: process.env.CLAUDE_SECRETS_MASTER_KEY,
 *     }),
 *     new EnvSecretProvider({ prefix: 'CLAUDE_SECRET_' }),
 *   ],
 * });
 *
 * // Get a secret with automatic provider fallback
 * const apiKey = await secretManager.get('api-key-stripe', {
 *   required: true,
 *   accessor: 'payment-plugin',
 * });
 *
 * // Set a secret with expiration
 * await secretManager.set('temp-token', 'xyz123', {
 *   expiresAt: '24h',
 *   scope: 'agent',
 *   tags: ['temporary', 'test'],
 * });
 *
 * // Rotate a secret
 * await secretManager.rotate('database-password', {
 *   newValue: 'new_secure_password',
 *   actor: 'admin',
 *   expireOldVersion: false, // Keep old version valid for 30 days
 * });
 *
 * // Substitute secrets in configuration
 * const config = await secretManager.substituteSecrets({
 *   stripe: {
 *     apiKey: '${secret:api-key-stripe}',
 *     webhookSecret: '${secret:webhook-secret-stripe}',
 *   },
 *   database: {
 *     url: '${secret:database-url}',
 *     password: '${secret:database-password}',
 *   },
 * });
 * ```
 *
 * @module secrets
 */

// Core types
export type {
  SecretMetadata,
  SecretValue,
  SecretScope,
  GetSecretOptions,
  SetSecretOptions,
  ListSecretsOptions,
  RotateSecretOptions,
  SecretAccessLogEntry,
  SecretPermission,
  EncryptionResult,
  DecryptionInput,
  SecretVersion,
  EncryptionKeyMetadata,
} from './types.js';

// Encryption
export { SecretEncryption, hashKey, secureCompare } from './encryption.js';

// Providers
export {
  type SecretProvider,
  BaseSecretProvider,
} from './providers/base.js';

export {
  LocalSecretProvider,
  type LocalProviderOptions,
} from './providers/local.js';

export {
  EnvSecretProvider,
  type EnvProviderOptions,
} from './providers/env.js';

export {
  AzureKeyVaultProvider,
  type AzureKeyVaultProviderOptions,
} from './providers/azure-keyvault.js';

// Secret Manager
export {
  SecretManager,
  type SecretManagerOptions,
} from './secret-manager.js';

// Access Control
export {
  SecretAccessControl,
  type AccessControlOptions,
  type Permission,
  PERMISSION_HIERARCHY,
  getEffectivePermissions,
} from './access-control.js';

/**
 * Create a secret manager with common configuration
 *
 * Business Value: Simplifies secret manager initialization with sensible
 * defaults for common deployment patterns.
 *
 * @param options - Secret manager options
 * @returns Initialized secret manager
 */
export async function createSecretManager(
  options: Partial<{
    localStorePath: string;
    localMasterKey: string | Buffer;
    envPrefix: string;
    azureVaultUrl: string;
    enableAuditLog: boolean;
    defaultProvider: string;
  }> = {}
): Promise<InstanceType<typeof SecretManager>> {
  const { SecretManager } = await import('./secret-manager.js');
  const { LocalSecretProvider } = await import('./providers/local.js');
  const { EnvSecretProvider } = await import('./providers/env.js');
  const { AzureKeyVaultProvider } = await import('./providers/azure-keyvault.js');

  const providers: any[] = [];

  // Add Azure Key Vault if configured
  if (options.azureVaultUrl) {
    providers.push(
      new AzureKeyVaultProvider({
        vaultUrl: options.azureVaultUrl,
      })
    );
  }

  // Add local provider if configured
  if (options.localStorePath && options.localMasterKey) {
    providers.push(
      new LocalSecretProvider({
        storePath: options.localStorePath,
        masterKey: options.localMasterKey,
      })
    );
  }

  // Always add environment provider as fallback
  providers.push(
    new EnvSecretProvider({
      prefix: options.envPrefix || 'CLAUDE_SECRET_',
    })
  );

  const manager = new SecretManager({
    providers,
    defaultWriteProvider: options.defaultProvider,
    enableAuditLog: options.enableAuditLog !== false,
  });

  await manager.initialize();

  return manager;
}

/**
 * Create a secret manager from environment variables
 *
 * Business Value: Zero-configuration setup for container deployments,
 * reading all configuration from environment variables.
 *
 * Environment Variables:
 * - CLAUDE_SECRETS_PROVIDER: Default provider (local, env, azure-keyvault)
 * - CLAUDE_SECRETS_LOCAL_PATH: Path to local encrypted store
 * - CLAUDE_SECRETS_MASTER_KEY: Master encryption key
 * - AZURE_VAULT_URL: Azure Key Vault URL
 * - CLAUDE_SECRET_*: Environment variable secrets
 *
 * @returns Initialized secret manager
 */
export async function createSecretManagerFromEnv(): Promise<InstanceType<typeof SecretManager>> {
  return createSecretManager({
    localStorePath:
      process.env.CLAUDE_SECRETS_LOCAL_PATH || '.claude/secrets/local.enc.json',
    localMasterKey: process.env.CLAUDE_SECRETS_MASTER_KEY,
    envPrefix: 'CLAUDE_SECRET_',
    azureVaultUrl: process.env.AZURE_VAULT_URL,
    enableAuditLog: process.env.CLAUDE_SECRETS_AUDIT !== 'false',
    defaultProvider: process.env.CLAUDE_SECRETS_PROVIDER || 'local',
  });
}

/**
 * Singleton secret manager instance
 *
 * Business Value: Provides a globally accessible secret manager for
 * simple use cases without manual initialization.
 *
 * @example
 * ```typescript
 * import { getSecretManager } from '@claude/core/secrets';
 *
 * const manager = await getSecretManager();
 * const apiKey = await manager.get('api-key-stripe');
 * ```
 */
let globalSecretManager: InstanceType<typeof SecretManager> | undefined;

export async function getSecretManager(): Promise<InstanceType<typeof SecretManager>> {
  if (!globalSecretManager) {
    globalSecretManager = await createSecretManagerFromEnv();
  }
  return globalSecretManager;
}

/**
 * Reset the global secret manager
 *
 * Business Value: Enables testing and re-initialization with different
 * configuration without restarting the process.
 */
export async function resetSecretManager(): Promise<void> {
  if (globalSecretManager) {
    await globalSecretManager.close();
    globalSecretManager = undefined;
  }
}
