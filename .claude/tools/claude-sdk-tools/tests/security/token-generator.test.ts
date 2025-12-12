/**
 * @claude-sdk/tools - TokenGeneratorTool Tests
 * Comprehensive tests for token generation and JWT handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenGeneratorTool } from '../../src/tools/security/token-generator.js';
import { testUtils } from '../setup.js';
import type { ToolContext } from '../../src/types/index.js';

describe('TokenGeneratorTool', () => {
  let context: ToolContext;

  beforeEach(() => {
    context = {
      toolName: 'token-generator',
      timestamp: new Date(),
      requestId: `test_${Date.now()}`,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    };
  });

  describe('Random Token Generation', () => {
    it('should generate random token with default settings', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.operation).toBe('random');
      expect(result.data.token).toBeDefined();
      expect(result.data.encoding).toBe('base64url');
      expect(result.data.length).toBe(32);
    });

    it('should generate tokens in hex encoding', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 16,
          encoding: 'hex',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toBeDefined();
      expect(result.data.token).toMatch(/^[0-9a-f]+$/); // Hex characters only
      expect(result.data.encoding).toBe('hex');
    });

    it('should generate tokens in base64 encoding', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 24,
          encoding: 'base64',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toBeDefined();
      expect(result.data.token).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 characters
      expect(result.data.encoding).toBe('base64');
    });

    it('should generate tokens in base64url encoding', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toBeDefined();
      expect(result.data.token).toMatch(/^[A-Za-z0-9_-]+$/); // Base64url characters
      expect(result.data.encoding).toBe('base64url');
    });

    it('should add prefix to token', async () => {
      const prefix = 'test';
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 16,
          encoding: 'hex',
          prefix,
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toMatch(new RegExp(`^${prefix}_`));
    });

    it('should generate different tokens each time', async () => {
      const result1 = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      const result2 = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result1);
      testUtils.assertSuccess(result2);
      expect(result1.data.token).not.toBe(result2.data.token);
    });

    it('should handle minimum length', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 8, // Minimum
          encoding: 'hex',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toBeDefined();
    });

    it('should handle maximum length', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 512, // Maximum
          encoding: 'hex',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toBeDefined();
      expect(result.data.token!.length).toBeGreaterThan(100);
    });
  });

  describe('API Key Generation', () => {
    it('should generate API key with default prefix', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'apiKey',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.operation).toBe('apiKey');
      expect(result.data.token).toBeDefined();
      expect(result.data.token).toMatch(/^sk_/); // Default prefix is 'sk'
      expect(result.data.encoding).toBe('base64url');
    });

    it('should generate API key with custom prefix', async () => {
      const prefix = 'api';
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'apiKey',
          length: 32,
          encoding: 'base64url',
          prefix,
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.token).toMatch(new RegExp(`^${prefix}_`));
    });

    it('should generate different API keys each time', async () => {
      const result1 = await TokenGeneratorTool.execute(
        {
          operation: 'apiKey',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      const result2 = await TokenGeneratorTool.execute(
        {
          operation: 'apiKey',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result1);
      testUtils.assertSuccess(result2);
      expect(result1.data.token).not.toBe(result2.data.token);
    });

    it('should use base64url encoding for API keys', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'apiKey',
          length: 32,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result);
      const tokenWithoutPrefix = result.data.token!.split('_')[1];
      expect(tokenWithoutPrefix).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('JWT Generation', () => {
    it('should generate JWT token', async () => {
      const payload = { userId: '123', role: 'admin' };
      const secret = 'my-secret-key';

      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.operation).toBe('jwt');
      expect(result.data.jwt).toBeDefined();
      expect(result.data.jwt!.token).toBeDefined();
      expect(result.data.jwt!.header).toBeDefined();
      expect(result.data.jwt!.payload).toBeDefined();
      expect(result.data.jwt!.token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should include standard claims in JWT', async () => {
      const payload = { userId: '456' };
      const secret = 'test-secret';

      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
            issuer: 'test-issuer',
            audience: 'test-audience',
            subject: 'test-subject',
            expiresIn: 3600,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.jwt!.payload).toMatchObject({
        userId: '456',
        iss: 'test-issuer',
        aud: 'test-audience',
        sub: 'test-subject',
      });
      expect(result.data.jwt!.payload.iat).toBeDefined();
      expect(result.data.jwt!.payload.exp).toBeDefined();
    });

    it('should generate JWT with HS256 algorithm', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload: { test: 'data' },
            secret: 'secret',
            algorithm: 'HS256',
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.jwt!.header.alg).toBe('HS256');
    });

    it('should generate JWT with HS384 algorithm', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload: { test: 'data' },
            secret: 'secret',
            algorithm: 'HS384',
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.jwt!.header.alg).toBe('HS384');
    });

    it('should generate JWT with HS512 algorithm', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload: { test: 'data' },
            secret: 'secret',
            algorithm: 'HS512',
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.jwt!.header.alg).toBe('HS512');
    });

    it('should handle complex payload data', async () => {
      const payload = {
        user: { id: '123', name: 'John Doe' },
        permissions: ['read', 'write'],
        metadata: { created: '2024-01-01' },
      };

      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret: 'secret',
            algorithm: 'HS256',
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.jwt!.payload.user).toEqual(payload.user);
      expect(result.data.jwt!.payload.permissions).toEqual(payload.permissions);
    });
  });

  describe('JWT Verification', () => {
    it('should verify valid JWT token', async () => {
      const payload = { userId: '789' };
      const secret = 'verification-secret';

      // Generate JWT
      const generated = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
          },
        },
        context
      );

      testUtils.assertSuccess(generated);

      // Verify JWT
      const verified = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          verify: {
            token: generated.data.jwt!.token,
            secret,
          },
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
      expect(verified.data.payload).toMatchObject(payload);
    });

    it('should fail verification with wrong secret', async () => {
      const payload = { userId: '999' };
      const secret = 'correct-secret';
      const wrongSecret = 'wrong-secret';

      // Generate JWT
      const generated = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
          },
        },
        context
      );

      testUtils.assertSuccess(generated);

      // Try to verify with wrong secret
      const verified = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          verify: {
            token: generated.data.jwt!.token,
            secret: wrongSecret,
          },
        },
        context
      );

      testUtils.assertFailure(verified);
    });

    it('should fail verification of expired token', async () => {
      const payload = { userId: '888' };
      const secret = 'test-secret';

      // Generate JWT with immediate expiration
      const generated = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
            expiresIn: -1, // Already expired
          },
        },
        context
      );

      testUtils.assertSuccess(generated);

      // Try to verify expired token
      const verified = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          verify: {
            token: generated.data.jwt!.token,
            secret,
          },
        },
        context
      );

      testUtils.assertFailure(verified);
    });

    it('should fail verification of malformed token', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          verify: {
            token: 'invalid.token',
            secret: 'secret',
          },
        },
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail verification of tampered token', async () => {
      const payload = { userId: '111' };
      const secret = 'tamper-secret';

      // Generate JWT
      const generated = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
          },
        },
        context
      );

      testUtils.assertSuccess(generated);

      // Tamper with the token
      const parts = generated.data.jwt!.token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ userId: '222' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const tamperedToken = parts.join('.');

      // Try to verify tampered token
      const verified = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          verify: {
            token: tamperedToken,
            secret,
          },
        },
        context
      );

      testUtils.assertFailure(verified);
    });

    it('should verify token with future expiration', async () => {
      const payload = { userId: '777' };
      const secret = 'future-secret';

      // Generate JWT with 1 hour expiration
      const generated = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          jwt: {
            payload,
            secret,
            algorithm: 'HS256',
            expiresIn: 3600,
          },
        },
        context
      );

      testUtils.assertSuccess(generated);

      // Verify immediately
      const verified = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
          verify: {
            token: generated.data.jwt!.token,
            secret,
          },
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should fail with missing JWT configuration', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail with missing verification configuration', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'jwt',
          length: 32,
          encoding: 'base64url',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });
  });

  describe('Token Format', () => {
    it('should generate URL-safe tokens', async () => {
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length: 64,
          encoding: 'base64url',
        },
        context
      );

      testUtils.assertSuccess(result);
      // base64url should not contain +, /, or =
      expect(result.data.token).not.toContain('+');
      expect(result.data.token).not.toContain('/');
      expect(result.data.token).not.toContain('=');
    });

    it('should generate hex tokens with correct length', async () => {
      const length = 32;
      const result = await TokenGeneratorTool.execute(
        {
          operation: 'random',
          length,
          encoding: 'hex',
        },
        context
      );

      testUtils.assertSuccess(result);
      // Hex encoding doubles the length
      expect(result.data.token!.length).toBe(length * 2);
    });
  });
});
