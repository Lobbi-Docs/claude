/**
 * @claude-sdk/tools - TokenGeneratorTool
 * Generates secure random tokens, API keys, and JWT tokens
 */

import { z } from 'zod';
import * as crypto from 'node:crypto';
import { success, failure } from '../../utils/index.js';
import { SecurityError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const TokenGeneratorSchema = z.object({
  operation: z.enum(['random', 'apiKey', 'jwt']),
  length: z.number().min(8).max(512).default(32).describe('Token length in bytes'),
  encoding: z.enum(['hex', 'base64', 'base64url']).default('base64url'),
  prefix: z.string().optional().describe('Optional prefix for the token'),

  // JWT-specific options
  jwt: z.object({
    payload: z.record(z.unknown()).describe('JWT payload claims'),
    secret: z.string().describe('Secret key for signing'),
    algorithm: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
    expiresIn: z.number().optional().describe('Expiration time in seconds'),
    issuer: z.string().optional(),
    audience: z.string().optional(),
    subject: z.string().optional(),
  }).optional(),

  // Verification options
  verify: z.object({
    token: z.string().describe('JWT token to verify'),
    secret: z.string().describe('Secret key for verification'),
  }).optional(),
});

export type TokenGeneratorInput = z.infer<typeof TokenGeneratorSchema>;

export interface TokenGeneratorOutput {
  operation: string;
  token?: string;
  encoding?: string;
  length?: number;

  // JWT-specific outputs
  jwt?: {
    token: string;
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
  };

  // Verification outputs
  verified?: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// TokenGeneratorTool Implementation
// ============================================================================

export class TokenGeneratorTool {
  /**
   * Execute token generation operations
   */
  static async execute(
    input: TokenGeneratorInput,
    context: ToolContext
  ): Promise<ToolResult<TokenGeneratorOutput>> {
    try {
      context.logger?.info(`Executing ${input.operation} token generation`);

      switch (input.operation) {
        case 'random':
          return this.generateRandom(input, context);
        case 'apiKey':
          return this.generateApiKey(input, context);
        case 'jwt':
          if (input.verify) {
            return this.verifyJWT(input, context);
          }
          return this.generateJWT(input, context);
        default:
          throw new SecurityError(
            `Unsupported operation: ${input.operation}`,
            'INVALID_TOKEN'
          );
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        return failure(error);
      }
      return failure(
        new SecurityError(
          `Token generation failed: ${error instanceof Error ? error.message : String(error)}`,
          'INVALID_TOKEN',
          { operation: input.operation }
        )
      );
    }
  }

  /**
   * Generate random token
   */
  private static generateRandom(
    input: TokenGeneratorInput,
    _context: ToolContext
  ): ToolResult<TokenGeneratorOutput> {
    try {
      const randomBytes = crypto.randomBytes(input.length);
      let token: string;

      switch (input.encoding) {
        case 'hex':
          token = randomBytes.toString('hex');
          break;
        case 'base64':
          token = randomBytes.toString('base64');
          break;
        case 'base64url':
          token = randomBytes.toString('base64url');
          break;
        default:
          throw new SecurityError(
            `Unsupported encoding: ${input.encoding}`,
            'INVALID_TOKEN'
          );
      }

      if (input.prefix) {
        token = `${input.prefix}_${token}`;
      }

      return success({
        operation: 'random',
        token,
        encoding: input.encoding,
        length: input.length,
      });
    } catch (error) {
      throw new SecurityError(
        `Random token generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'INVALID_TOKEN'
      );
    }
  }

  /**
   * Generate API key
   */
  private static generateApiKey(
    input: TokenGeneratorInput,
    _context: ToolContext
  ): ToolResult<TokenGeneratorOutput> {
    try {
      // Generate a secure random token for API key
      const randomBytes = crypto.randomBytes(input.length);
      const token = randomBytes.toString('base64url');

      // Add prefix (default to 'sk' for secret key)
      const prefix = input.prefix || 'sk';
      const apiKey = `${prefix}_${token}`;

      return success({
        operation: 'apiKey',
        token: apiKey,
        encoding: 'base64url',
        length: input.length,
      });
    } catch (error) {
      throw new SecurityError(
        `API key generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'INVALID_TOKEN'
      );
    }
  }

  /**
   * Generate JWT token
   */
  private static generateJWT(
    input: TokenGeneratorInput,
    _context: ToolContext
  ): ToolResult<TokenGeneratorOutput> {
    try {
      if (!input.jwt) {
        throw new SecurityError(
          'JWT configuration is required',
          'INVALID_TOKEN'
        );
      }

      const { payload, secret, algorithm, expiresIn, issuer, audience, subject } = input.jwt;

      // Create header
      const header = {
        alg: algorithm,
        typ: 'JWT',
      };

      // Create payload with standard claims
      const now = Math.floor(Date.now() / 1000);
      const jwtPayload: Record<string, unknown> = {
        ...payload,
        iat: now,
      };

      if (expiresIn) {
        jwtPayload.exp = now + expiresIn;
      }
      if (issuer) {
        jwtPayload.iss = issuer;
      }
      if (audience) {
        jwtPayload.aud = audience;
      }
      if (subject) {
        jwtPayload.sub = subject;
      }

      // Encode header and payload
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));

      // Create signature
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const signature = this.createSignature(signatureInput, secret, algorithm);

      // Combine to create JWT
      const token = `${signatureInput}.${signature}`;

      return success({
        operation: 'jwt',
        jwt: {
          token,
          header,
          payload: jwtPayload,
        },
      });
    } catch (error) {
      throw new SecurityError(
        `JWT generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'INVALID_TOKEN'
      );
    }
  }

  /**
   * Verify JWT token
   */
  private static verifyJWT(
    input: TokenGeneratorInput,
    _context: ToolContext
  ): ToolResult<TokenGeneratorOutput> {
    try {
      if (!input.verify) {
        throw new SecurityError(
          'Verification configuration is required',
          'INVALID_TOKEN'
        );
      }

      const { token, secret } = input.verify;

      // Split JWT into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new SecurityError(
          'Invalid JWT format',
          'INVALID_TOKEN'
        );
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Decode header and payload
      const header = JSON.parse(this.base64UrlDecode(encodedHeader));
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

      // Verify signature
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = this.createSignature(
        signatureInput,
        secret,
        header.alg
      );

      if (signature !== expectedSignature) {
        throw new SecurityError(
          'Invalid signature',
          'INVALID_SIGNATURE'
        );
      }

      // Check expiration
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (now > payload.exp) {
          throw new SecurityError(
            'Token has expired',
            'EXPIRED_TOKEN'
          );
        }
      }

      return success({
        operation: 'jwt',
        verified: true,
        payload,
      });
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        `JWT verification failed: ${error instanceof Error ? error.message : String(error)}`,
        'INVALID_TOKEN'
      );
    }
  }

  /**
   * Create signature for JWT
   */
  private static createSignature(
    data: string,
    secret: string,
    algorithm: string
  ): string {
    let hashAlgorithm: string;

    switch (algorithm) {
      case 'HS256':
        hashAlgorithm = 'sha256';
        break;
      case 'HS384':
        hashAlgorithm = 'sha384';
        break;
      case 'HS512':
        hashAlgorithm = 'sha512';
        break;
      default:
        throw new SecurityError(
          `Unsupported algorithm: ${algorithm}`,
          'INVALID_SIGNATURE'
        );
    }

    const hmac = crypto.createHmac(hashAlgorithm, secret);
    hmac.update(data);
    return this.base64UrlEncode(hmac.digest());
  }

  /**
   * Base64 URL encode
   */
  private static base64UrlEncode(input: string | Buffer): string {
    const buffer = typeof input === 'string' ? Buffer.from(input) : input;
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private static base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    return Buffer.from(base64, 'base64').toString('utf8');
  }
}
