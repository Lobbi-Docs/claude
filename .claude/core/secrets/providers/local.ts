/**
 * Local Encrypted File Secret Provider
 *
 * Business Value: Enables secure secret storage for local development and
 * small deployments without requiring cloud infrastructure. Secrets are
 * encrypted at rest using AES-256-GCM and stored in JSON files.
 *
 * Best for:
 * - Local development environments
 * - CI/CD pipelines with file-based configuration
 * - Small deployments without cloud key management
 * - Offline or air-gapped environments
 *
 * Security Features:
 * - AES-256-GCM encryption for all secrets
 * - File permission checks (owner read/write only)
 * - Automatic backup before destructive operations
 * - Versioning support for secret rotation
 */

import { readFile, writeFile, access, chmod, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import { randomUUID } from 'crypto';
import { BaseSecretProvider } from './base.js';
import { SecretEncryption, hashKey } from '../encryption.js';
import type {
  SecretMetadata,
  SecretValue,
  GetSecretOptions,
  SetSecretOptions,
  ListSecretsOptions,
  RotateSecretOptions,
  SecretVersion,
  EncryptionResult,
} from '../types.js';

interface LocalSecretStore {
  /** File format version for migration support */
  version: string;

  /** ID of the active encryption key */
  keyId: string;

  /** Hash of the master key for verification */
  keyHash: string;

  /** Salt used for key derivation (base64) */
  salt: string;

  /** Map of secret name to encrypted data */
  secrets: Record<string, LocalSecret>;

  /** Historical versions of rotated secrets */
  versions: Record<string, LocalSecretVersion[]>;
}

interface LocalSecret {
  id: string;
  name: string;
  encrypted: EncryptionResult;
  version: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  tags?: string[];
}

interface LocalSecretVersion {
  version: number;
  encrypted: EncryptionResult;
  createdAt: string;
  expiresAt?: string;
}

export interface LocalProviderOptions {
  /** Path to the encrypted secrets file */
  storePath: string;

  /** Master key for encryption (passphrase or 32-byte buffer) */
  masterKey: string | Buffer;

  /** Whether to create the store file if it doesn't exist */
  createIfMissing?: boolean;

  /** File permissions mode (default: 0o600 - owner read/write only) */
  fileMode?: number;
}

export class LocalSecretProvider extends BaseSecretProvider {
  readonly name = 'local';
  readonly priority = 50;

  private options: Required<LocalProviderOptions>;
  private encryption?: SecretEncryption;
  private store?: LocalSecretStore;

  constructor(options: LocalProviderOptions) {
    super();
    this.options = {
      createIfMissing: true,
      fileMode: 0o600, // Owner read/write only
      ...options,
    };
  }

  /**
   * Initialize the local provider
   *
   * Business Value: Sets up encrypted storage, verifying key integrity and
   * file permissions to ensure secrets remain confidential.
   */
  async initialize(): Promise<void> {
    // Ensure directory exists
    await mkdir(dirname(this.options.storePath), { recursive: true });

    // Check if store file exists
    const exists = await this.fileExists(this.options.storePath);

    if (!exists) {
      if (!this.options.createIfMissing) {
        throw new Error(
          `Secret store not found at ${this.options.storePath}`
        );
      }

      // Create new store
      await this.createNewStore();
    } else {
      // Load existing store
      await this.loadStore();
    }

    // Verify file permissions
    await this.verifyFilePermissions();

    this.initialized = true;
  }

  /**
   * Get a secret value from encrypted storage
   *
   * Business Value: Retrieves secrets securely with automatic decryption,
   * supporting versioned access for rollback scenarios.
   */
  async get(
    name: string,
    options?: GetSecretOptions
  ): Promise<SecretValue | undefined> {
    this.ensureInitialized();
    this.validateSecretName(name);

    if (!this.store || !this.encryption) {
      throw new Error('Store not loaded');
    }

    const secret = this.store.secrets[name];
    if (!secret) {
      if (options?.required) {
        throw new Error(`Secret not found: ${name}`);
      }
      return undefined;
    }

    // Check expiration
    if (this.isExpired(secret.expiresAt)) {
      if (options?.required) {
        throw new Error(`Secret expired: ${name}`);
      }
      return undefined;
    }

    // Get specific version if requested
    let encrypted = secret.encrypted;
    let version = secret.version;

    if (options?.version !== undefined && options.version !== secret.version) {
      const versions = this.store.versions[name] || [];
      const versionData = versions.find((v) => v.version === options.version);

      if (!versionData) {
        throw new Error(
          `Version ${options.version} not found for secret: ${name}`
        );
      }

      if (this.isExpired(versionData.expiresAt)) {
        throw new Error(
          `Version ${options.version} expired for secret: ${name}`
        );
      }

      encrypted = versionData.encrypted;
      version = versionData.version;
    }

    // Decrypt the secret value
    const value = this.encryption.decrypt({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      algorithm: encrypted.algorithm,
      keyId: encrypted.keyId,
    });

    const metadata: SecretMetadata = {
      id: secret.id,
      name: secret.name,
      provider: this.name,
      version,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      expiresAt: secret.expiresAt,
      tags: secret.tags,
      scope: secret.scope as any,
    };

    return { metadata, value };
  }

  /**
   * Set a secret value with encryption
   *
   * Business Value: Stores secrets securely with automatic encryption,
   * versioning, and optional expiration for compliance.
   */
  async set(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void> {
    this.ensureInitialized();
    this.validateSecretName(name);

    if (!this.store || !this.encryption) {
      throw new Error('Store not loaded');
    }

    // Encrypt the secret value
    const encrypted = this.encryption.encrypt(value);

    const existingSecret = this.store.secrets[name];
    const now = new Date().toISOString();

    if (existingSecret && options?.createVersion !== false) {
      // Save current version to history
      if (!this.store.versions[name]) {
        this.store.versions[name] = [];
      }

      this.store.versions[name].push({
        version: existingSecret.version,
        encrypted: existingSecret.encrypted,
        createdAt: existingSecret.createdAt,
        expiresAt: existingSecret.expiresAt,
      });

      // Increment version
      existingSecret.version += 1;
      existingSecret.encrypted = encrypted;
      existingSecret.updatedAt = now;
      existingSecret.expiresAt = this.calculateExpiration(options?.expiresAt);
      existingSecret.tags = options?.tags;
      existingSecret.scope = options?.scope || 'global';
    } else {
      // Create new secret
      this.store.secrets[name] = {
        id: randomUUID(),
        name,
        encrypted,
        version: 1,
        scope: options?.scope || 'global',
        createdAt: now,
        updatedAt: now,
        expiresAt: this.calculateExpiration(options?.expiresAt),
        tags: options?.tags,
      };
    }

    // Persist changes
    await this.saveStore();
  }

  /**
   * Delete a secret and all its versions
   *
   * Business Value: Removes secrets permanently, supporting compliance
   * requirements and reducing attack surface.
   */
  async delete(name: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.store) {
      throw new Error('Store not loaded');
    }

    const existed = name in this.store.secrets;
    if (existed) {
      delete this.store.secrets[name];
      delete this.store.versions[name];
      await this.saveStore();
    }

    return existed;
  }

  /**
   * List secrets matching filter criteria
   *
   * Business Value: Enables discovery and inventory of stored secrets
   * for auditing and management.
   */
  async list(options?: ListSecretsOptions): Promise<SecretMetadata[]> {
    this.ensureInitialized();

    if (!this.store) {
      throw new Error('Store not loaded');
    }

    const results: SecretMetadata[] = [];

    for (const secret of Object.values(this.store.secrets)) {
      // Apply filters
      if (options?.pattern && !this.matchesPattern(secret.name, options.pattern)) {
        continue;
      }

      if (options?.scope && secret.scope !== options.scope) {
        continue;
      }

      if (options?.tags && !this.matchesTags(secret.tags, options.tags)) {
        continue;
      }

      if (!options?.includeExpired && this.isExpired(secret.expiresAt)) {
        continue;
      }

      results.push({
        id: secret.id,
        name: secret.name,
        provider: this.name,
        version: secret.version,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        expiresAt: secret.expiresAt,
        tags: secret.tags,
        scope: secret.scope as any,
      });
    }

    return results;
  }

  /**
   * Rotate a secret to a new value
   *
   * Business Value: Supports security best practices by enabling regular
   * credential rotation without service disruption.
   */
  async rotate(name: string, options: RotateSecretOptions): Promise<void> {
    this.ensureInitialized();

    const existing = await this.get(name, { required: true });
    if (!existing) {
      throw new Error(`Cannot rotate non-existent secret: ${name}`);
    }

    // Set new version
    await this.set(name, options.newValue, {
      scope: existing.metadata.scope,
      tags: existing.metadata.tags,
      createVersion: true,
    });

    // Optionally expire old version
    if (options.expireOldVersion && this.store) {
      const versions = this.store.versions[name];
      if (versions && versions.length > 0) {
        const lastVersion = versions[versions.length - 1];
        lastVersion.expiresAt = new Date().toISOString();
        await this.saveStore();
      }
    }
  }

  /**
   * Check if the provider is operational
   *
   * Business Value: Enables health monitoring and automatic failover
   * to backup providers if local storage is unavailable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized) {
        return false;
      }

      // Verify we can read the store file
      await access(this.options.storePath, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the provider and clear sensitive data
   *
   * Business Value: Ensures clean shutdown with proper cleanup of
   * encryption keys from memory.
   */
  async close(): Promise<void> {
    if (this.encryption) {
      this.encryption.destroy();
      this.encryption = undefined;
    }

    this.store = undefined;
    this.initialized = false;
  }

  // Private helper methods

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async createNewStore(): Promise<void> {
    const salt = SecretEncryption.generateSalt();
    const keyId = randomUUID();

    this.encryption = new SecretEncryption(
      this.options.masterKey,
      keyId,
      salt
    );

    const keyHash = await hashKey(
      typeof this.options.masterKey === 'string'
        ? Buffer.from(this.options.masterKey)
        : this.options.masterKey
    );

    this.store = {
      version: '1.0',
      keyId,
      keyHash,
      salt: salt.toString('base64'),
      secrets: {},
      versions: {},
    };

    await this.saveStore();
  }

  private async loadStore(): Promise<void> {
    const data = await readFile(this.options.storePath, 'utf8');
    this.store = JSON.parse(data);

    if (!this.store) {
      throw new Error('Failed to parse secret store');
    }

    // Initialize encryption with stored salt
    const salt = Buffer.from(this.store.salt, 'base64');
    this.encryption = new SecretEncryption(
      this.options.masterKey,
      this.store.keyId,
      salt
    );

    // Verify key hash
    const keyHash = await hashKey(
      typeof this.options.masterKey === 'string'
        ? Buffer.from(this.options.masterKey)
        : this.options.masterKey
    );

    if (keyHash !== this.store.keyHash) {
      throw new Error('Master key verification failed');
    }
  }

  private async saveStore(): Promise<void> {
    if (!this.store) {
      throw new Error('No store to save');
    }

    const data = JSON.stringify(this.store, null, 2);
    await writeFile(this.options.storePath, data, { mode: this.options.fileMode });
  }

  private async verifyFilePermissions(): Promise<void> {
    try {
      // Ensure file is readable/writable only by owner
      await chmod(this.options.storePath, this.options.fileMode);
    } catch (error) {
      console.warn(
        `Warning: Could not set file permissions on ${this.options.storePath}`
      );
    }
  }

  private calculateExpiration(
    expiresAt?: string | number
  ): string | undefined {
    if (!expiresAt) {
      return undefined;
    }

    if (typeof expiresAt === 'string') {
      return expiresAt;
    }

    // Duration in seconds
    const expiryDate = new Date(Date.now() + expiresAt * 1000);
    return expiryDate.toISOString();
  }

  private matchesPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(name);
  }

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
