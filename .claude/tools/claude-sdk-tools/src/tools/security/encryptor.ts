/**
 * @claude-sdk/tools - EncryptorTool
 * Provides encryption and decryption capabilities using modern algorithms
 */

import { z } from 'zod';
import * as crypto from 'node:crypto';
import { success, failure } from '../../utils/index.js';
import { SecurityError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const EncryptorSchema = z.object({
  operation: z.enum(['encrypt', 'decrypt', 'deriveKey']),
  algorithm: z.enum(['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305']),
  data: z.string().describe('Data to encrypt/decrypt (base64 for decrypt)'),
  key: z.string().optional().describe('Encryption key (base64) or passphrase for key derivation'),
  iv: z.string().optional().describe('Initialization vector (base64, for decrypt)'),
  authTag: z.string().optional().describe('Authentication tag (base64, for AES-GCM decrypt)'),
  keyDerivation: z.object({
    salt: z.string().optional().describe('Salt for key derivation (base64)'),
    iterations: z.number().min(10000).default(100000).describe('PBKDF2 iterations'),
    keyLength: z.number().default(32).describe('Key length in bytes'),
  }).optional(),
});

export type EncryptorInput = z.infer<typeof EncryptorSchema>;

export interface EncryptorOutput {
  operation: string;
  algorithm: string;
  ciphertext?: string;
  plaintext?: string;
  key?: string;
  iv?: string;
  authTag?: string;
  salt?: string;
}

// ============================================================================
// EncryptorTool Implementation
// ============================================================================

export class EncryptorTool {
  /**
   * Execute encryption/decryption operations
   */
  static async execute(
    input: EncryptorInput,
    context: ToolContext
  ): Promise<ToolResult<EncryptorOutput>> {
    try {
      context.logger?.info(`Executing ${input.operation} with ${input.algorithm}`);

      switch (input.operation) {
        case 'encrypt':
          return await this.encrypt(input, context);
        case 'decrypt':
          return await this.decrypt(input, context);
        case 'deriveKey':
          return await this.deriveKey(input, context);
        default:
          throw new SecurityError(
            `Unsupported operation: ${input.operation}`,
            'ENCRYPTION_FAILED'
          );
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        return failure(error);
      }
      return failure(
        new SecurityError(
          `Encryption operation failed: ${error instanceof Error ? error.message : String(error)}`,
          'ENCRYPTION_FAILED',
          { operation: input.operation, algorithm: input.algorithm }
        )
      );
    }
  }

  /**
   * Encrypt data
   */
  private static async encrypt(
    input: EncryptorInput,
    _context: ToolContext
  ): Promise<ToolResult<EncryptorOutput>> {
    try {
      // Derive or use provided key
      let keyBuffer: Buffer;
      let salt: string | undefined;

      if (input.keyDerivation && input.key) {
        // Derive key from passphrase
        const derivedResult = await this.deriveKeyFromPassphrase(
          input.key,
          input.keyDerivation
        );
        keyBuffer = derivedResult.key;
        salt = derivedResult.salt;
      } else if (input.key) {
        // Use provided key
        keyBuffer = Buffer.from(input.key, 'base64');
      } else {
        // Generate random key
        keyBuffer = crypto.randomBytes(32);
      }

      // Generate IV
      const ivLength = this.getIvLength(input.algorithm);
      const iv = crypto.randomBytes(ivLength);

      // Encrypt based on algorithm
      let ciphertext: Buffer;
      let authTag: string | undefined;

      if (input.algorithm === 'aes-256-gcm') {
        const cipher = crypto.createCipheriv(input.algorithm, keyBuffer, iv);
        const encrypted = Buffer.concat([
          cipher.update(input.data, 'utf8'),
          cipher.final(),
        ]);
        authTag = cipher.getAuthTag().toString('base64');
        ciphertext = encrypted;
      } else if (input.algorithm === 'aes-256-cbc') {
        const cipher = crypto.createCipheriv(input.algorithm, keyBuffer, iv);
        ciphertext = Buffer.concat([
          cipher.update(input.data, 'utf8'),
          cipher.final(),
        ]);
      } else if (input.algorithm === 'chacha20-poly1305') {
        const cipher = crypto.createCipheriv(input.algorithm, keyBuffer, iv);
        const encrypted = Buffer.concat([
          cipher.update(input.data, 'utf8'),
          cipher.final(),
        ]);
        authTag = cipher.getAuthTag().toString('base64');
        ciphertext = encrypted;
      } else {
        throw new SecurityError(
          `Unsupported algorithm: ${input.algorithm}`,
          'ENCRYPTION_FAILED'
        );
      }

      return success({
        operation: 'encrypt',
        algorithm: input.algorithm,
        ciphertext: ciphertext.toString('base64'),
        key: keyBuffer.toString('base64'),
        iv: iv.toString('base64'),
        authTag,
        salt,
      });
    } catch (error) {
      throw new SecurityError(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
        'ENCRYPTION_FAILED'
      );
    }
  }

  /**
   * Decrypt data
   */
  private static async decrypt(
    input: EncryptorInput,
    _context: ToolContext
  ): Promise<ToolResult<EncryptorOutput>> {
    try {
      if (!input.key || !input.iv) {
        throw new SecurityError(
          'Key and IV are required for decryption',
          'DECRYPTION_FAILED'
        );
      }

      // Derive or use provided key
      let keyBuffer: Buffer;

      if (input.keyDerivation && input.keyDerivation.salt) {
        // Derive key from passphrase
        const derivedResult = await this.deriveKeyFromPassphrase(
          input.key,
          input.keyDerivation
        );
        keyBuffer = derivedResult.key;
      } else {
        // Use provided key
        keyBuffer = Buffer.from(input.key, 'base64');
      }

      const iv = Buffer.from(input.iv, 'base64');
      const ciphertext = Buffer.from(input.data, 'base64');

      // Decrypt based on algorithm
      let plaintext: string;

      if (input.algorithm === 'aes-256-gcm') {
        if (!input.authTag) {
          throw new SecurityError(
            'Authentication tag is required for AES-GCM decryption',
            'DECRYPTION_FAILED'
          );
        }
        const decipher = crypto.createDecipheriv(input.algorithm, keyBuffer, iv);
        decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
        plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString('utf8');
      } else if (input.algorithm === 'aes-256-cbc') {
        const decipher = crypto.createDecipheriv(input.algorithm, keyBuffer, iv);
        plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString('utf8');
      } else if (input.algorithm === 'chacha20-poly1305') {
        if (!input.authTag) {
          throw new SecurityError(
            'Authentication tag is required for ChaCha20-Poly1305 decryption',
            'DECRYPTION_FAILED'
          );
        }
        const decipher = crypto.createDecipheriv(input.algorithm, keyBuffer, iv);
        decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
        plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString('utf8');
      } else {
        throw new SecurityError(
          `Unsupported algorithm: ${input.algorithm}`,
          'DECRYPTION_FAILED'
        );
      }

      return success({
        operation: 'decrypt',
        algorithm: input.algorithm,
        plaintext,
      });
    } catch (error) {
      throw new SecurityError(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
        'DECRYPTION_FAILED'
      );
    }
  }

  /**
   * Derive key from passphrase
   */
  private static async deriveKey(
    input: EncryptorInput,
    _context: ToolContext
  ): Promise<ToolResult<EncryptorOutput>> {
    try {
      if (!input.key) {
        throw new SecurityError(
          'Passphrase is required for key derivation',
          'ENCRYPTION_FAILED'
        );
      }

      const keyDerivation = input.keyDerivation || {
        iterations: 100000,
        keyLength: 32,
      };

      const derivedResult = await this.deriveKeyFromPassphrase(
        input.key,
        keyDerivation
      );

      return success({
        operation: 'deriveKey',
        algorithm: 'pbkdf2-sha256',
        key: derivedResult.key.toString('base64'),
        salt: derivedResult.salt,
      });
    } catch (error) {
      throw new SecurityError(
        `Key derivation failed: ${error instanceof Error ? error.message : String(error)}`,
        'ENCRYPTION_FAILED'
      );
    }
  }

  /**
   * Derive key from passphrase using PBKDF2
   */
  private static async deriveKeyFromPassphrase(
    passphrase: string,
    options: {
      salt?: string;
      iterations?: number;
      keyLength?: number;
    }
  ): Promise<{ key: Buffer; salt: string }> {
    const salt = options.salt
      ? Buffer.from(options.salt, 'base64')
      : crypto.randomBytes(16);
    const iterations = options.iterations || 100000;
    const keyLength = options.keyLength || 32;

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        passphrase,
        salt,
        iterations,
        keyLength,
        'sha256',
        (err, derivedKey) => {
          if (err) reject(err);
          else
            resolve({
              key: derivedKey,
              salt: salt.toString('base64'),
            });
        }
      );
    });
  }

  /**
   * Get IV length for algorithm
   */
  private static getIvLength(algorithm: string): number {
    switch (algorithm) {
      case 'aes-256-gcm':
        return 12; // 96 bits recommended for GCM
      case 'aes-256-cbc':
        return 16; // 128 bits for CBC
      case 'chacha20-poly1305':
        return 12; // 96 bits for ChaCha20-Poly1305
      default:
        return 16;
    }
  }
}
