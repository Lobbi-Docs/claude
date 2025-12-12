/**
 * @claude-sdk/tools - HashGeneratorTool
 * Cryptographic hashing with multiple algorithms and HMAC support
 */

import { z } from 'zod';
import { createHash, createHmac } from 'crypto';
import { wrapExecution } from '../../utils/index.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const HashAlgorithmEnum = z.enum(['md5', 'sha1', 'sha256', 'sha512']);

const EncodingEnum = z.enum(['hex', 'base64', 'base64url']);

export const HashGeneratorSchema = z.object({
  // Input data
  input: z.union([z.string(), z.instanceof(Buffer)]),

  // Hash algorithm
  algorithm: HashAlgorithmEnum,

  // Output encoding
  encoding: EncodingEnum.optional(),

  // HMAC support
  hmac: z.boolean().optional(),
  secret: z.string().optional(),

  // Multiple rounds of hashing
  rounds: z.number().int().min(1).max(1000).optional(),
});

export type HashGeneratorInput = z.infer<typeof HashGeneratorSchema>;

export interface HashGeneratorOutput {
  hash: string;
  algorithm: string;
  encoding: string;
  metadata?: {
    inputLength?: number;
    outputLength?: number;
    hmac?: boolean;
    rounds?: number;
  };
}

// ============================================================================
// HashGeneratorTool Implementation
// ============================================================================

export class HashGeneratorTool {
  static readonly name = 'hash_generator';
  static readonly description = 'Generate cryptographic hashes using MD5, SHA1, SHA256, or SHA512 algorithms with optional HMAC support';
  static readonly schema = HashGeneratorSchema;

  static async execute(
    input: HashGeneratorInput,
    context?: ToolContext
  ): Promise<ToolResult<HashGeneratorOutput>> {
    return wrapExecution(this.name, async (input, _ctx) => {
      const {
        input: data,
        algorithm,
        encoding = 'hex',
        hmac = false,
        secret,
        rounds = 1,
      } = input;

      // Validate HMAC requirements
      if (hmac && !secret) {
        throw new Error('HMAC mode requires secret parameter');
      }

      // Convert input to buffer
      const inputBuffer = this.toBuffer(data);
      const inputLength = inputBuffer.length;

      // Generate hash
      let hash: string;
      if (hmac) {
        hash = this.generateHmac(inputBuffer, algorithm, secret!, encoding, rounds);
      } else {
        hash = this.generateHash(inputBuffer, algorithm, encoding, rounds);
      }

      return {
        hash,
        algorithm,
        encoding,
        metadata: {
          inputLength,
          outputLength: hash.length,
          hmac,
          rounds: rounds > 1 ? rounds : undefined,
        },
      };
    }, input, context);
  }

  // ============================================================================
  // Hash Generation Methods
  // ============================================================================

  private static generateHash(
    input: Buffer,
    algorithm: z.infer<typeof HashAlgorithmEnum>,
    encoding: z.infer<typeof EncodingEnum>,
    rounds: number
  ): string {
    let current = input;

    for (let i = 0; i < rounds; i++) {
      const hash = createHash(algorithm);
      hash.update(current);
      current = hash.digest();
    }

    return this.encodeBuffer(current, encoding);
  }

  private static generateHmac(
    input: Buffer,
    algorithm: z.infer<typeof HashAlgorithmEnum>,
    secret: string,
    encoding: z.infer<typeof EncodingEnum>,
    rounds: number
  ): string {
    let current = input;

    for (let i = 0; i < rounds; i++) {
      const hmac = createHmac(algorithm, secret);
      hmac.update(current);
      current = hmac.digest();
    }

    return this.encodeBuffer(current, encoding);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private static toBuffer(input: string | Buffer): Buffer {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    return Buffer.from(input, 'utf8');
  }

  private static encodeBuffer(buffer: Buffer, encoding: z.infer<typeof EncodingEnum>): string {
    switch (encoding) {
      case 'hex':
        return buffer.toString('hex');
      case 'base64':
        return buffer.toString('base64');
      case 'base64url':
        return buffer
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }

  // ============================================================================
  // Static Helper Methods
  // ============================================================================

  /**
   * Quick hash generation helper
   */
  static quickHash(
    input: string,
    algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512' = 'sha256'
  ): string {
    const hash = createHash(algorithm);
    hash.update(input);
    return hash.digest('hex');
  }

  /**
   * Quick HMAC generation helper
   */
  static quickHmac(
    input: string,
    secret: string,
    algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512' = 'sha256'
  ): string {
    const hmac = createHmac(algorithm, secret);
    hmac.update(input);
    return hmac.digest('hex');
  }

  /**
   * Verify hash matches input
   */
  static verifyHash(input: string, hash: string, algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512'): boolean {
    const computedHash = this.quickHash(input, algorithm);
    return this.constantTimeCompare(computedHash, hash);
  }

  /**
   * Verify HMAC matches input
   */
  static verifyHmac(
    input: string,
    secret: string,
    hmac: string,
    algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512'
  ): boolean {
    const computedHmac = this.quickHmac(input, secret, algorithm);
    return this.constantTimeCompare(computedHmac, hmac);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
