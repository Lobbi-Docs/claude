/**
 * @claude-sdk/tools - SecretsManagerTool Tests
 * Comprehensive tests for secrets storage and management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecretsManagerTool } from '../../src/tools/security/secrets-manager.js';
import { testUtils } from '../setup.js';
import type { ToolContext } from '../../src/types/index.js';

describe('SecretsManagerTool', () => {
  let context: ToolContext;

  beforeEach(() => {
    context = {
      toolName: 'secrets-manager',
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

  afterEach(() => {
    // Reset secrets manager after each test
    SecretsManagerTool.reset();
  });

  describe('Store and Retrieve Secrets', () => {
    it('should store and retrieve a secret', async () => {
      const secretName = 'api-key';
      const secretValue = 'sk_test_1234567890';

      // Store secret
      const stored = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
        },
        context
      );

      testUtils.assertSuccess(stored);
      expect(stored.data.operation).toBe('store');
      expect(stored.data.name).toBe(secretName);
      expect(stored.data.metadata?.created).toBeDefined();

      // Retrieve secret
      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.operation).toBe('retrieve');
      expect(retrieved.data.value).toBe(secretValue);
      expect(retrieved.data.metadata?.accessCount).toBe(1);
    });

    it('should encrypt secrets by default', async () => {
      const secretName = 'password';
      const secretValue = 'my-secret-password';

      const stored = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
        },
        context
      );

      testUtils.assertSuccess(stored);
      expect(stored.data.metadata?.encrypted).toBe(true);

      // Retrieved value should be decrypted
      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
    });

    it('should store unencrypted secrets when configured', async () => {
      const secretName = 'public-key';
      const secretValue = 'public-value';

      const stored = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
          options: {
            encrypted: false,
          },
        },
        context
      );

      testUtils.assertSuccess(stored);
      expect(stored.data.metadata?.encrypted).toBe(false);

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
    });

    it('should provide custom master key', async () => {
      const masterKey = Buffer.from('a'.repeat(32)).toString('base64');
      const secretName = 'custom-key-secret';
      const secretValue = 'encrypted-with-custom-key';

      const stored = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
          masterKey,
        },
        context
      );

      testUtils.assertSuccess(stored);

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
          masterKey,
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
    });

    it('should track access count', async () => {
      const secretName = 'access-tracked';
      const secretValue = 'secret-value';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
        },
        context
      );

      // Access multiple times
      for (let i = 1; i <= 3; i++) {
        const retrieved = await SecretsManagerTool.execute(
          {
            operation: 'retrieve',
            name: secretName,
          },
          context
        );

        testUtils.assertSuccess(retrieved);
        expect(retrieved.data.metadata?.accessCount).toBe(i);
      }
    });
  });

  describe('Secret Expiration', () => {
    it('should store secret with expiration', async () => {
      const secretName = 'expiring-secret';
      const secretValue = 'expires-soon';

      const stored = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
          options: {
            expiresIn: 3600, // 1 hour
          },
        },
        context
      );

      testUtils.assertSuccess(stored);
      expect(stored.data.metadata?.expiresAt).toBeDefined();
    });

    it('should retrieve secret before expiration', async () => {
      const secretName = 'valid-secret';
      const secretValue = 'still-valid';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
          options: {
            expiresIn: 60, // 60 seconds
          },
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
    });

    it('should fail to retrieve expired secret', async () => {
      const secretName = 'expired-secret';
      const secretValue = 'already-expired';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
          options: {
            expiresIn: -1, // Already expired
          },
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertFailure(retrieved);
    });
  });

  describe('Secret Tags', () => {
    it('should store secret with tags', async () => {
      const secretName = 'tagged-secret';
      const secretValue = 'tagged-value';
      const tags = ['production', 'api-key'];

      const stored = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
          options: {
            tags,
          },
        },
        context
      );

      testUtils.assertSuccess(stored);
      expect(stored.data.metadata?.tags).toEqual(tags);
    });

    it('should list secrets by tags', async () => {
      // Store multiple secrets with different tags
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'prod-secret-1',
          value: 'value1',
          options: { tags: ['production'] },
        },
        context
      );

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'dev-secret-1',
          value: 'value2',
          options: { tags: ['development'] },
        },
        context
      );

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'prod-secret-2',
          value: 'value3',
          options: { tags: ['production'] },
        },
        context
      );

      // List production secrets
      const listed = await SecretsManagerTool.execute(
        {
          operation: 'list',
          options: {
            filterTags: ['production'],
          },
        },
        context
      );

      testUtils.assertSuccess(listed);
      expect(listed.data.secrets).toHaveLength(2);
      expect(listed.data.secrets).toContain('prod-secret-1');
      expect(listed.data.secrets).toContain('prod-secret-2');
      expect(listed.data.secrets).not.toContain('dev-secret-1');
    });
  });

  describe('List Secrets', () => {
    it('should list all secrets', async () => {
      // Store multiple secrets
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'secret-1',
          value: 'value-1',
        },
        context
      );

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'secret-2',
          value: 'value-2',
        },
        context
      );

      const listed = await SecretsManagerTool.execute(
        {
          operation: 'list',
        },
        context
      );

      testUtils.assertSuccess(listed);
      expect(listed.data.secrets).toHaveLength(2);
      expect(listed.data.secrets).toContain('secret-1');
      expect(listed.data.secrets).toContain('secret-2');
    });

    it('should exclude expired secrets from list', async () => {
      // Store valid secret
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'valid-secret',
          value: 'valid',
          options: { expiresIn: 3600 },
        },
        context
      );

      // Store expired secret
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'expired-secret',
          value: 'expired',
          options: { expiresIn: -1 },
        },
        context
      );

      const listed = await SecretsManagerTool.execute(
        {
          operation: 'list',
          options: {
            includeExpired: false,
          },
        },
        context
      );

      testUtils.assertSuccess(listed);
      expect(listed.data.secrets).toContain('valid-secret');
      expect(listed.data.secrets).not.toContain('expired-secret');
    });

    it('should include expired secrets when configured', async () => {
      // Store expired secret
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'expired-secret',
          value: 'expired',
          options: { expiresIn: -1 },
        },
        context
      );

      const listed = await SecretsManagerTool.execute(
        {
          operation: 'list',
          options: {
            includeExpired: true,
          },
        },
        context
      );

      testUtils.assertSuccess(listed);
      expect(listed.data.secrets).toContain('expired-secret');
    });
  });

  describe('Delete Secrets', () => {
    it('should delete existing secret', async () => {
      const secretName = 'deletable-secret';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: 'to-be-deleted',
        },
        context
      );

      const deleted = await SecretsManagerTool.execute(
        {
          operation: 'delete',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(deleted);
      expect(deleted.data.exists).toBe(true);

      // Verify secret is gone
      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertFailure(retrieved);
    });

    it('should handle deleting non-existent secret', async () => {
      const deleted = await SecretsManagerTool.execute(
        {
          operation: 'delete',
          name: 'non-existent',
        },
        context
      );

      testUtils.assertSuccess(deleted);
      expect(deleted.data.exists).toBe(false);
    });
  });

  describe('Check Existence', () => {
    it('should check if secret exists', async () => {
      const secretName = 'existing-secret';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: 'exists',
        },
        context
      );

      const exists = await SecretsManagerTool.execute(
        {
          operation: 'exists',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(exists);
      expect(exists.data.exists).toBe(true);
    });

    it('should return false for non-existent secret', async () => {
      const exists = await SecretsManagerTool.execute(
        {
          operation: 'exists',
          name: 'non-existent',
        },
        context
      );

      testUtils.assertSuccess(exists);
      expect(exists.data.exists).toBe(false);
    });

    it('should return false for expired secret', async () => {
      const secretName = 'expired-check';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: 'expired',
          options: { expiresIn: -1 },
        },
        context
      );

      const exists = await SecretsManagerTool.execute(
        {
          operation: 'exists',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(exists);
      expect(exists.data.exists).toBe(false);
    });
  });

  describe('Clear All Secrets', () => {
    it('should clear all secrets', async () => {
      // Store multiple secrets
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'secret-1',
          value: 'value-1',
        },
        context
      );

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'secret-2',
          value: 'value-2',
        },
        context
      );

      const cleared = await SecretsManagerTool.execute(
        {
          operation: 'clear',
        },
        context
      );

      testUtils.assertSuccess(cleared);
      expect(cleared.data.metadata?.accessCount).toBe(2);

      // Verify all secrets are gone
      const listed = await SecretsManagerTool.execute(
        {
          operation: 'list',
        },
        context
      );

      testUtils.assertSuccess(listed);
      expect(listed.data.secrets).toHaveLength(0);
    });
  });

  describe('Encryption Round-trip', () => {
    it('should encrypt and decrypt complex data', async () => {
      const secretName = 'complex-secret';
      const secretValue = JSON.stringify({
        apiKey: 'sk_test_1234',
        metadata: { user: 'admin', permissions: ['read', 'write'] },
      });

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
      expect(JSON.parse(retrieved.data.value!)).toEqual(JSON.parse(secretValue));
    });

    it('should handle unicode and special characters', async () => {
      const secretValue = '🔐 密码 пароль مرحبا !@#$%^&*()';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'unicode-secret',
          value: secretValue,
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: 'unicode-secret',
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
    });

    it('should reject empty string value', async () => {
      // Reset to ensure clean state
      SecretsManagerTool.reset();

      // Empty strings are not allowed as secret values
      const result = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'empty-secret',
          value: '',
        },
        context
      );

      // Should fail because value is required to be non-empty
      testUtils.assertFailure(result);
    });

    it('should handle very long secrets', async () => {
      const secretValue = 'A'.repeat(10000);

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'long-secret',
          value: secretValue,
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: 'long-secret',
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.value).toBe(secretValue);
    });
  });

  describe('Retrieve Options', () => {
    it('should retrieve encrypted value without decryption', async () => {
      const secretName = 'no-decrypt';
      const secretValue = 'encrypted-value';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: secretValue,
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
          options: {
            decrypt: false,
          },
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      // Should return encrypted value (base64)
      expect(retrieved.data.value).not.toBe(secretValue);
      expect(retrieved.data.metadata?.encrypted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should fail to store without name', async () => {
      const result = await SecretsManagerTool.execute(
        {
          operation: 'store',
          value: 'some-value',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail to store without value', async () => {
      const result = await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'some-name',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail to retrieve non-existent secret', async () => {
      const result = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: 'does-not-exist',
        },
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail to retrieve without name', async () => {
      const result = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail to delete without name', async () => {
      const result = await SecretsManagerTool.execute(
        {
          operation: 'delete',
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });
  });

  describe('Access Logging', () => {
    it('should log secret access', async () => {
      const secretName = 'logged-secret';

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: secretName,
          value: 'value',
        },
        context
      );

      await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: secretName,
        },
        context
      );

      const accessLog = SecretsManagerTool.getAccessLog();
      expect(accessLog.length).toBeGreaterThan(0);
      expect(accessLog.some(log => log.name === secretName && log.operation === 'store')).toBe(true);
      expect(accessLog.some(log => log.name === secretName && log.operation === 'retrieve')).toBe(true);
    });

    it('should log failed access attempts', async () => {
      const result = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: 'non-existent',
        },
        context
      );

      testUtils.assertFailure(result);

      const accessLog = SecretsManagerTool.getAccessLog();
      expect(accessLog.some(log => log.name === 'non-existent' && log.success === false)).toBe(true);
    });
  });

  describe('Metadata', () => {
    it('should include creation time', async () => {
      const before = new Date();

      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'timed-secret',
          value: 'value',
        },
        context
      );

      const after = new Date();

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: 'timed-secret',
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      const created = new Date(retrieved.data.metadata!.created!);
      expect(created.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include all metadata fields', async () => {
      await SecretsManagerTool.execute(
        {
          operation: 'store',
          name: 'meta-secret',
          value: 'value',
          options: {
            tags: ['test'],
            expiresIn: 3600,
          },
        },
        context
      );

      const retrieved = await SecretsManagerTool.execute(
        {
          operation: 'retrieve',
          name: 'meta-secret',
        },
        context
      );

      testUtils.assertSuccess(retrieved);
      expect(retrieved.data.metadata).toBeDefined();
      expect(retrieved.data.metadata!.created).toBeDefined();
      expect(retrieved.data.metadata!.expiresAt).toBeDefined();
      expect(retrieved.data.metadata!.tags).toEqual(['test']);
      expect(retrieved.data.metadata!.accessCount).toBe(1);
      expect(retrieved.data.metadata!.encrypted).toBe(true);
    });
  });
});
