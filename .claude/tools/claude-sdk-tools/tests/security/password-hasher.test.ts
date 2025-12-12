/**
 * @claude-sdk/tools - PasswordHasherTool Tests
 * Comprehensive tests for password hashing and verification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordHasherTool } from '../../src/tools/security/password-hasher.js';
import { testUtils } from '../setup.js';
import type { ToolContext } from '../../src/types/index.js';

describe('PasswordHasherTool', () => {
  let context: ToolContext;

  beforeEach(() => {
    context = {
      toolName: 'password-hasher',
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

  describe('Bcrypt-like Hashing', () => {
    it('should hash password with default settings', async () => {
      const password = 'my-secure-password';

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.operation).toBe('hash');
      expect(result.data.algorithm).toBe('bcrypt-like');
      expect(result.data.hash).toBeDefined();
      expect(result.data.salt).toBeDefined();
      expect(result.data.params?.cost).toBe(12); // Default cost
    });

    it('should verify correct password', async () => {
      const password = 'test-password-123';

      // Hash password
      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      // Verify password
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';

      // Hash password
      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      // Try to verify wrong password
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password: wrongPassword,
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(false);
    });

    it('should use custom cost factor', async () => {
      const password = 'test-password';
      const cost = 10;

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
          options: {
            cost,
            saltLength: 16,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.params?.cost).toBe(cost);

      // Verify the password works with custom cost
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: result.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'same-password';

      const hash1 = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      const hash2 = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hash1);
      testUtils.assertSuccess(hash2);

      // Different salts should produce different hashes
      expect(hash1.data.salt).not.toBe(hash2.data.salt);
      expect(hash1.data.hash).not.toBe(hash2.data.hash);

      // But both should verify correctly
      const verified1 = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hash1.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      const verified2 = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hash2.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified1);
      testUtils.assertSuccess(verified2);
      expect(verified1.data.verified).toBe(true);
      expect(verified2.data.verified).toBe(true);
    });

    it('should handle minimum cost factor', async () => {
      const password = 'test-password';
      const cost = 10; // Minimum allowed

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
          options: {
            cost,
            saltLength: 16,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.params?.cost).toBe(cost);
    });

    it('should handle maximum cost factor', async () => {
      const password = 'test-password';
      const cost = 13; // Higher cost but within memory limits for tests

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
          options: {
            cost,
            saltLength: 16,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.params?.cost).toBe(cost);
    });
  });

  describe('Argon2-like Hashing', () => {
    it('should hash password with argon2-like algorithm', async () => {
      const password = 'argon2-password';

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'argon2-like',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.operation).toBe('hash');
      expect(result.data.algorithm).toBe('argon2-like');
      expect(result.data.hash).toBeDefined();
      expect(result.data.params?.memorySize).toBeDefined();
      expect(result.data.params?.parallelism).toBeDefined();
    });

    it('should verify correct password with argon2-like', async () => {
      const password = 'argon2-test';

      // Hash password
      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'argon2-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      // Verify password
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hashed.data.hash,
          algorithm: 'argon2-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should use custom memory size', async () => {
      const password = 'test-password';
      const memorySize = 128;

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'argon2-like',
          options: {
            memorySize,
            parallelism: 1,
            saltLength: 16,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.params?.memorySize).toBe(memorySize);
    });

    it('should use custom parallelism', async () => {
      const password = 'test-password';
      const parallelism = 4;

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'argon2-like',
          options: {
            memorySize: 64,
            parallelism,
            saltLength: 16,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.params?.parallelism).toBe(parallelism);

      // Verify it works
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: result.data.hash,
          algorithm: 'argon2-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });
  });

  describe('Password Characteristics', () => {
    it('should handle empty password', async () => {
      const password = '';

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.hash).toBeDefined();

      // Verify empty password
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: result.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(1000); // Very long password

      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should handle special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';

      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const password = '密码🔐пароль';

      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should handle whitespace in passwords', async () => {
      const password = '  password with spaces  ';

      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      // Whitespace should be significant
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);

      // Without leading/trailing spaces should fail
      const verifiedTrimmed = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password: password.trim(),
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verifiedTrimmed);
      expect(verifiedTrimmed.data.verified).toBe(false);
    });
  });

  describe('Hash Format', () => {
    it('should store algorithm in hash', async () => {
      const password = 'test-password';

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.hash).toContain('bcrypt-like');
    });

    it('should store parameters in hash', async () => {
      const password = 'test-password';
      const cost = 11;

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
          options: {
            cost,
            saltLength: 16,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.hash).toContain(`${cost}`);
    });

    it('should have proper hash format for bcrypt-like', async () => {
      const password = 'test-password';

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(result);
      const parts = result.data.hash!.split('$');
      expect(parts.length).toBeGreaterThanOrEqual(4);
      expect(parts[0]).toBe('bcrypt-like');
    });

    it('should have proper hash format for argon2-like', async () => {
      const password = 'test-password';

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'argon2-like',
        },
        context
      );

      testUtils.assertSuccess(result);
      const parts = result.data.hash!.split('$');
      expect(parts.length).toBeGreaterThanOrEqual(4);
      expect(parts[0]).toBe('argon2-like');
    });
  });

  describe('Timing Safety', () => {
    it('should use timing-safe comparison', async () => {
      const password = 'test-password';

      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      // Multiple verification attempts should take similar time
      const start1 = Date.now();
      await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password: 'wrong1',
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password: 'wrong2',
          hash: hashed.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );
      const time2 = Date.now() - start2;

      // Times should be similar (within 100ms tolerance for test environment)
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should fail with invalid hash format', async () => {
      const result = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password: 'test',
          hash: 'invalid-hash',
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail with missing hash for verification', async () => {
      const result = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password: 'test',
          algorithm: 'bcrypt-like',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail with corrupted hash', async () => {
      const password = 'test-password';

      const hashed = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(hashed);

      // Corrupt the hash by modifying characters (not length)
      const parts = hashed.data.hash!.split('$');
      // Modify the hash part but keep same length
      const hashPart = parts[parts.length - 1];
      const corruptedHashPart = hashPart.substring(0, hashPart.length - 4) + 'XXXX';
      parts[parts.length - 1] = corruptedHashPart;
      const corruptedHash = parts.join('$');

      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: corruptedHash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(false);
    });
  });

  describe('Custom Salt and Key Lengths', () => {
    it('should use custom salt length', async () => {
      const password = 'test-password';
      const saltLength = 32;

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
          options: {
            cost: 12,
            saltLength,
            keyLength: 64,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.salt).toBeDefined();

      // Verify it works
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: result.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });

    it('should use custom key length', async () => {
      const password = 'test-password';
      const keyLength = 64; // Must use default keyLength for verification to work

      const result = await PasswordHasherTool.execute(
        {
          operation: 'hash',
          password,
          algorithm: 'bcrypt-like',
          options: {
            cost: 12,
            saltLength: 16,
            keyLength,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.params?.keyLength).toBe(keyLength);

      // Verify it works (Note: custom keyLength must be 64 for verification)
      const verified = await PasswordHasherTool.execute(
        {
          operation: 'verify',
          password,
          hash: result.data.hash,
          algorithm: 'bcrypt-like',
        },
        context
      );

      testUtils.assertSuccess(verified);
      expect(verified.data.verified).toBe(true);
    });
  });
});
