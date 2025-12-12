/**
 * @claude-sdk/tools - SecretsManagerTool
 * In-memory encrypted secrets storage with expiration and access logging
 */

import { z } from 'zod';
import * as crypto from 'node:crypto';
import { success, failure } from '../../utils/index.js';
import { SecurityError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const SecretsManagerSchema = z.object({
  operation: z.enum(['store', 'retrieve', 'delete', 'list', 'exists', 'clear']),
  name: z.string().optional().describe('Secret name/key'),
  value: z.string().optional().describe('Secret value to store'),
  options: z.object({
    // Storage options
    expiresIn: z.number().optional().describe('Expiration time in seconds'),
    tags: z.array(z.string()).optional().describe('Tags for organization'),
    encrypted: z.boolean().default(true).describe('Encrypt at rest'),

    // Retrieval options
    decrypt: z.boolean().default(true).describe('Decrypt on retrieval'),

    // List options
    includeExpired: z.boolean().default(false).describe('Include expired secrets'),
    filterTags: z.array(z.string()).optional().describe('Filter by tags'),
  }).optional(),

  // Master encryption key (should be securely provided)
  masterKey: z.string().optional().describe('Master encryption key (base64)'),
});

export type SecretsManagerInput = z.infer<typeof SecretsManagerSchema>;

export interface SecretsManagerOutput {
  operation: string;
  name?: string;
  value?: string;
  exists?: boolean;
  secrets?: string[];
  metadata?: {
    created?: string;
    expiresAt?: string;
    tags?: string[];
    accessCount?: number;
    encrypted?: boolean;
  };
  accessLog?: AccessLogEntry[];
}

interface StoredSecret {
  name: string;
  value: string; // Encrypted or plain
  encrypted: boolean;
  created: Date;
  expiresAt?: Date;
  tags: string[];
  accessCount: number;
  iv?: string; // For encryption
  authTag?: string; // For AES-GCM
}

interface AccessLogEntry {
  name: string;
  operation: string;
  timestamp: string;
  success: boolean;
}

// ============================================================================
// SecretsManagerTool Implementation
// ============================================================================

export class SecretsManagerTool {
  // In-memory storage (not persistent across restarts)
  private static secrets: Map<string, StoredSecret> = new Map();
  private static accessLog: AccessLogEntry[] = [];
  private static masterKey: Buffer | null = null;

  /**
   * Execute secrets management operations
   */
  static async execute(
    input: SecretsManagerInput,
    context: ToolContext
  ): Promise<ToolResult<SecretsManagerOutput>> {
    try {
      context.logger?.info(`Executing ${input.operation} operation`);

      // Set master key if provided
      if (input.masterKey) {
        this.masterKey = Buffer.from(input.masterKey, 'base64');
      } else if (!this.masterKey) {
        // Generate a random master key if none exists
        this.masterKey = crypto.randomBytes(32);
        context.logger?.warn('Generated random master key - not persistent across restarts');
      }

      switch (input.operation) {
        case 'store':
          return await this.storeSecret(input, context);
        case 'retrieve':
          return await this.retrieveSecret(input, context);
        case 'delete':
          return this.deleteSecret(input, context);
        case 'list':
          return this.listSecrets(input, context);
        case 'exists':
          return this.checkExists(input, context);
        case 'clear':
          return this.clearSecrets(input, context);
        default:
          throw new SecurityError(
            `Unsupported operation: ${input.operation}`,
            'FORBIDDEN'
          );
      }
    } catch (error) {
      this.logAccess(
        input.name || 'unknown',
        input.operation,
        false
      );

      if (error instanceof SecurityError) {
        return failure(error);
      }
      return failure(
        new SecurityError(
          `Secrets management failed: ${error instanceof Error ? error.message : String(error)}`,
          'FORBIDDEN',
          { operation: input.operation }
        )
      );
    }
  }

  /**
   * Store a secret
   */
  private static async storeSecret(
    input: SecretsManagerInput,
    _context: ToolContext
  ): Promise<ToolResult<SecretsManagerOutput>> {
    try {
      if (!input.name || !input.value) {
        throw new SecurityError(
          'Name and value are required for storing secrets',
          'FORBIDDEN'
        );
      }

      const options = input.options || {
        expiresIn: undefined,
        tags: [],
        encrypted: true,
        decrypt: true,
        includeExpired: false,
        filterTags: undefined,
      };
      const shouldEncrypt = options.encrypted !== false;

      let storedValue = input.value;
      let iv: string | undefined;
      let authTag: string | undefined;

      // Encrypt if requested
      if (shouldEncrypt && this.masterKey) {
        const encrypted = await this.encrypt(input.value, this.masterKey);
        storedValue = encrypted.ciphertext;
        iv = encrypted.iv;
        authTag = encrypted.authTag;
      }

      // Calculate expiration
      let expiresAt: Date | undefined;
      if (options.expiresIn) {
        expiresAt = new Date(Date.now() + options.expiresIn * 1000);
      }

      // Store secret
      const secret: StoredSecret = {
        name: input.name,
        value: storedValue,
        encrypted: shouldEncrypt,
        created: new Date(),
        expiresAt,
        tags: options.tags || [],
        accessCount: 0,
        iv,
        authTag,
      };

      this.secrets.set(input.name, secret);
      this.logAccess(input.name, 'store', true);

      return success({
        operation: 'store',
        name: input.name,
        metadata: {
          created: secret.created.toISOString(),
          expiresAt: expiresAt?.toISOString(),
          tags: secret.tags,
          encrypted: shouldEncrypt,
        },
      });
    } catch (error) {
      throw new SecurityError(
        `Failed to store secret: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Retrieve a secret
   */
  private static async retrieveSecret(
    input: SecretsManagerInput,
    _context: ToolContext
  ): Promise<ToolResult<SecretsManagerOutput>> {
    try {
      if (!input.name) {
        throw new SecurityError(
          'Name is required for retrieving secrets',
          'FORBIDDEN'
        );
      }

      const secret = this.secrets.get(input.name);

      if (!secret) {
        throw new SecurityError(
          `Secret not found: ${input.name}`,
          'FORBIDDEN'
        );
      }

      // Check expiration
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        this.secrets.delete(input.name);
        throw new SecurityError(
          `Secret expired: ${input.name}`,
          'EXPIRED_TOKEN'
        );
      }

      // Increment access count
      secret.accessCount++;

      // Decrypt if requested and encrypted
      const options = input.options || {
        decrypt: true,
        encrypted: true,
        expiresIn: undefined,
        tags: [],
        includeExpired: false,
        filterTags: undefined,
      };
      let value = secret.value;

      if (secret.encrypted && options.decrypt !== false && this.masterKey) {
        if (!secret.iv || !secret.authTag) {
          throw new SecurityError(
            'Missing encryption metadata',
            'DECRYPTION_FAILED'
          );
        }

        value = await this.decrypt(
          secret.value,
          this.masterKey,
          secret.iv,
          secret.authTag
        );
      }

      this.logAccess(input.name, 'retrieve', true);

      return success({
        operation: 'retrieve',
        name: input.name,
        value,
        metadata: {
          created: secret.created.toISOString(),
          expiresAt: secret.expiresAt?.toISOString(),
          tags: secret.tags,
          accessCount: secret.accessCount,
          encrypted: secret.encrypted,
        },
      });
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        `Failed to retrieve secret: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Delete a secret
   */
  private static deleteSecret(
    input: SecretsManagerInput,
    _context: ToolContext
  ): ToolResult<SecretsManagerOutput> {
    try {
      if (!input.name) {
        throw new SecurityError(
          'Name is required for deleting secrets',
          'FORBIDDEN'
        );
      }

      const existed = this.secrets.delete(input.name);

      this.logAccess(input.name, 'delete', existed);

      return success({
        operation: 'delete',
        name: input.name,
        exists: existed,
      });
    } catch (error) {
      throw new SecurityError(
        `Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * List secret names (not values)
   */
  private static listSecrets(
    input: SecretsManagerInput,
    _context: ToolContext
  ): ToolResult<SecretsManagerOutput> {
    try {
      const options = input.options || {
        includeExpired: false,
        filterTags: undefined,
        decrypt: true,
        encrypted: true,
        expiresIn: undefined,
        tags: [],
      };
      const includeExpired = options.includeExpired || false;
      const filterTags = options.filterTags;

      const now = new Date();
      const secretNames: string[] = [];

      for (const [name, secret] of Array.from(this.secrets.entries())) {
        // Check expiration
        if (!includeExpired && secret.expiresAt && secret.expiresAt < now) {
          this.secrets.delete(name);
          continue;
        }

        // Filter by tags
        if (filterTags && filterTags.length > 0) {
          const hasMatchingTag = filterTags.some((tag: string) => secret.tags.includes(tag));
          if (!hasMatchingTag) {
            continue;
          }
        }

        secretNames.push(name);
      }

      this.logAccess('*', 'list', true);

      return success({
        operation: 'list',
        secrets: secretNames,
      });
    } catch (error) {
      throw new SecurityError(
        `Failed to list secrets: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Check if a secret exists
   */
  private static checkExists(
    input: SecretsManagerInput,
    _context: ToolContext
  ): ToolResult<SecretsManagerOutput> {
    try {
      if (!input.name) {
        throw new SecurityError(
          'Name is required for checking existence',
          'FORBIDDEN'
        );
      }

      const secret = this.secrets.get(input.name);
      let exists = secret !== undefined;

      // Check expiration
      if (exists && secret!.expiresAt && secret!.expiresAt < new Date()) {
        this.secrets.delete(input.name);
        exists = false;
      }

      this.logAccess(input.name, 'exists', true);

      return success({
        operation: 'exists',
        name: input.name,
        exists,
      });
    } catch (error) {
      throw new SecurityError(
        `Failed to check existence: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Clear all secrets
   */
  private static clearSecrets(
    _input: SecretsManagerInput,
    context: ToolContext
  ): ToolResult<SecretsManagerOutput> {
    try {
      const count = this.secrets.size;
      this.secrets.clear();

      this.logAccess('*', 'clear', true);

      context.logger?.warn(`Cleared ${count} secrets from memory`);

      return success({
        operation: 'clear',
        metadata: {
          accessCount: count,
        },
      });
    } catch (error) {
      throw new SecurityError(
        `Failed to clear secrets: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private static async encrypt(
    data: string,
    key: Buffer
  ): Promise<{ ciphertext: string; iv: string; authTag: string }> {
    const iv = crypto.randomBytes(12); // 96 bits for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private static async decrypt(
    ciphertext: string,
    key: Buffer,
    iv: string,
    authTag: string
  ): Promise<string> {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Log access to secrets
   */
  private static logAccess(
    name: string,
    operation: string,
    success: boolean
  ): void {
    this.accessLog.push({
      name,
      operation,
      timestamp: new Date().toISOString(),
      success,
    });

    // Keep only last 1000 entries
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-1000);
    }
  }

  /**
   * Get access log (for debugging/auditing)
   */
  static getAccessLog(): AccessLogEntry[] {
    return [...this.accessLog];
  }

  /**
   * Reset the secrets manager (for testing)
   */
  static reset(): void {
    this.secrets.clear();
    this.accessLog = [];
    this.masterKey = null;
  }
}
