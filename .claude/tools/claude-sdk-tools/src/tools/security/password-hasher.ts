/**
 * @claude-sdk/tools - PasswordHasherTool
 * Provides secure password hashing using scrypt (bcrypt-like and argon2-like configurations)
 */

import { z } from 'zod';
import * as crypto from 'node:crypto';
import { success, failure } from '../../utils/index.js';
import { SecurityError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const PasswordHasherSchema = z.object({
  operation: z.enum(['hash', 'verify']),
  password: z.string().min(1).describe('Password to hash or verify'),
  hash: z.string().optional().describe('Hash to verify against (for verify operation)'),
  algorithm: z.enum(['bcrypt-like', 'argon2-like']).default('bcrypt-like'),
  options: z.object({
    // Bcrypt-like options (using scrypt)
    cost: z.number().min(10).max(20).default(12).describe('Cost factor (2^cost iterations)'),

    // Argon2-like options (using scrypt with different params)
    memorySize: z.number().min(16).max(1024).default(64).describe('Memory size in MB'),
    parallelism: z.number().min(1).max(10).default(1).describe('Parallelism factor'),

    // Common options
    saltLength: z.number().min(16).max(64).default(16).describe('Salt length in bytes'),
    keyLength: z.number().min(32).max(128).default(64).describe('Derived key length in bytes'),
  }).optional(),
});

export type PasswordHasherInput = z.infer<typeof PasswordHasherSchema>;

export interface PasswordHasherOutput {
  operation: string;
  algorithm: string;
  hash?: string;
  verified?: boolean;
  salt?: string;
  params?: {
    cost?: number;
    memorySize?: number;
    parallelism?: number;
    keyLength: number;
  };
}

// ============================================================================
// PasswordHasherTool Implementation
// ============================================================================

export class PasswordHasherTool {
  /**
   * Execute password hashing operations
   */
  static async execute(
    input: PasswordHasherInput,
    context: ToolContext
  ): Promise<ToolResult<PasswordHasherOutput>> {
    try {
      context.logger?.info(`Executing ${input.operation} with ${input.algorithm}`);

      switch (input.operation) {
        case 'hash':
          return await this.hashPassword(input, context);
        case 'verify':
          return await this.verifyPassword(input, context);
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
          `Password hashing failed: ${error instanceof Error ? error.message : String(error)}`,
          'ENCRYPTION_FAILED',
          { operation: input.operation, algorithm: input.algorithm }
        )
      );
    }
  }

  /**
   * Hash a password
   */
  private static async hashPassword(
    input: PasswordHasherInput,
    _context: ToolContext
  ): Promise<ToolResult<PasswordHasherOutput>> {
    try {
      const options = input.options || {
        cost: 12,
        memorySize: 64,
        parallelism: 1,
        saltLength: 16,
        keyLength: 64,
      };
      const algorithm = input.algorithm;

      // Generate salt
      const saltLength = options.saltLength || 16;
      const salt = crypto.randomBytes(saltLength);

      // Determine scrypt parameters based on algorithm
      let N: number; // CPU/memory cost parameter
      let r: number; // Block size parameter
      let p: number; // Parallelization parameter
      const keyLength = options.keyLength || 64;

      if (algorithm === 'bcrypt-like') {
        // Bcrypt-like configuration
        const cost = options.cost || 12;
        N = Math.pow(2, cost); // 2^cost iterations
        r = 8; // Standard block size
        p = 1; // Single thread
      } else if (algorithm === 'argon2-like') {
        // Argon2-like configuration
        const memorySize = options.memorySize || 64; // in MB
        const parallelism = options.parallelism || 1;

        // Convert memory size to N parameter
        // N = memorySize * 1024 / (128 * r * p)
        r = 8;
        p = parallelism;
        N = Math.floor((memorySize * 1024) / (128 * r * p));

        // Ensure N is a power of 2 and at least 2
        N = Math.pow(2, Math.max(1, Math.floor(Math.log2(N))));
      } else {
        throw new SecurityError(
          `Unsupported algorithm: ${algorithm}`,
          'ENCRYPTION_FAILED'
        );
      }

      // Hash password using scrypt
      const derivedKey = await this.scrypt(
        input.password,
        salt,
        keyLength,
        { N, r, p }
      );

      // Create hash string with format: algorithm$params$salt$hash
      const params =
        algorithm === 'bcrypt-like'
          ? `${options.cost || 12}`
          : `${options.memorySize || 64}$${options.parallelism || 1}`;

      const hashString = `${algorithm}$${params}$${salt.toString('base64')}$${derivedKey.toString('base64')}`;

      return success({
        operation: 'hash',
        algorithm,
        hash: hashString,
        salt: salt.toString('base64'),
        params: {
          cost: algorithm === 'bcrypt-like' ? (options.cost || 12) : undefined,
          memorySize: algorithm === 'argon2-like' ? (options.memorySize || 64) : undefined,
          parallelism: algorithm === 'argon2-like' ? (options.parallelism || 1) : undefined,
          keyLength,
        },
      });
    } catch (error) {
      throw new SecurityError(
        `Password hashing failed: ${error instanceof Error ? error.message : String(error)}`,
        'ENCRYPTION_FAILED'
      );
    }
  }

  /**
   * Verify a password against a hash
   */
  private static async verifyPassword(
    input: PasswordHasherInput,
    _context: ToolContext
  ): Promise<ToolResult<PasswordHasherOutput>> {
    try {
      if (!input.hash) {
        throw new SecurityError(
          'Hash is required for verification',
          'DECRYPTION_FAILED'
        );
      }

      // Parse hash string: algorithm$params$salt$hash
      const parts = input.hash.split('$');
      if (parts.length < 4) {
        throw new SecurityError(
          'Invalid hash format',
          'DECRYPTION_FAILED'
        );
      }

      const [algorithm, ...paramsParts] = parts;
      const storedHash = paramsParts.pop()!;
      const storedSalt = paramsParts.pop()!;

      // Parse parameters based on algorithm
      let N: number;
      let r: number;
      let p: number;
      let keyLength: number;

      if (algorithm === 'bcrypt-like') {
        const cost = parseInt(paramsParts[0], 10);
        N = Math.pow(2, cost);
        r = 8;
        p = 1;
        keyLength = 64;
      } else if (algorithm === 'argon2-like') {
        const memorySize = parseInt(paramsParts[0], 10);
        const parallelism = parseInt(paramsParts[1], 10);

        r = 8;
        p = parallelism;
        N = Math.pow(2, Math.max(1, Math.floor(Math.log2((memorySize * 1024) / (128 * r * p)))));
        keyLength = 64;
      } else {
        throw new SecurityError(
          `Unsupported algorithm: ${algorithm}`,
          'DECRYPTION_FAILED'
        );
      }

      // Hash the provided password with the same salt and parameters
      const salt = Buffer.from(storedSalt, 'base64');
      const derivedKey = await this.scrypt(
        input.password,
        salt,
        keyLength,
        { N, r, p }
      );

      // Compare hashes using timing-safe comparison
      const derivedHashString = derivedKey.toString('base64');
      const verified = crypto.timingSafeEqual(
        Buffer.from(derivedHashString),
        Buffer.from(storedHash)
      );

      return success({
        operation: 'verify',
        algorithm,
        verified,
      });
    } catch (error) {
      throw new SecurityError(
        `Password verification failed: ${error instanceof Error ? error.message : String(error)}`,
        'DECRYPTION_FAILED'
      );
    }
  }

  /**
   * Scrypt key derivation
   */
  private static async scrypt(
    password: string,
    salt: Buffer,
    keyLength: number,
    options: { N: number; r: number; p: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        keyLength,
        {
          N: options.N,
          r: options.r,
          p: options.p,
        },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }
}
