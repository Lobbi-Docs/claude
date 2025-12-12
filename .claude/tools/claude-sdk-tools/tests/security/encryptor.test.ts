/**
 * @claude-sdk/tools - EncryptorTool Tests
 * Comprehensive tests for encryption/decryption capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptorTool } from '../../src/tools/security/encryptor.js';
import { testUtils } from '../setup.js';
import type { ToolContext } from '../../src/types/index.js';

describe('EncryptorTool', () => {
  let context: ToolContext;

  beforeEach(() => {
    context = {
      toolName: 'encryptor',
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

  describe('AES-256-GCM Encryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'This is a secret message';

      // Encrypt
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);
      expect(encrypted.data.operation).toBe('encrypt');
      expect(encrypted.data.algorithm).toBe('aes-256-gcm');
      expect(encrypted.data.ciphertext).toBeDefined();
      expect(encrypted.data.key).toBeDefined();
      expect(encrypted.data.iv).toBeDefined();
      expect(encrypted.data.authTag).toBeDefined();

      // Decrypt
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.operation).toBe('decrypt');
      expect(decrypted.data.plaintext).toBe(plaintext);
    });

    it('should handle provided key correctly', async () => {
      const plaintext = 'Secret data';
      const key = Buffer.from('a'.repeat(32)).toString('base64'); // 32 bytes

      // Encrypt with provided key
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
          key,
        },
        context
      );

      testUtils.assertSuccess(encrypted);
      expect(encrypted.data.key).toBe(key);

      // Decrypt with same key
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });

    it('should fail decryption with wrong key', async () => {
      const plaintext = 'Secret message';

      // Encrypt
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      // Try to decrypt with wrong key
      const wrongKey = Buffer.from('b'.repeat(32)).toString('base64');
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key: wrongKey,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertFailure(decrypted);
      expect(decrypted.error).toBeDefined();
    });

    it('should fail decryption without authTag', async () => {
      const plaintext = 'Secret message';

      // Encrypt
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      // Try to decrypt without authTag
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
        },
        context
      );

      testUtils.assertFailure(decrypted);
    });

    it('should handle unicode and special characters', async () => {
      const plaintext = '🔐 Secret: Köln, 北京, مرحبا! @#$%^&*()';

      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });
  });

  describe('AES-256-CBC Encryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'CBC mode secret message';

      // Encrypt
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-cbc',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);
      expect(encrypted.data.operation).toBe('encrypt');
      expect(encrypted.data.algorithm).toBe('aes-256-cbc');
      expect(encrypted.data.ciphertext).toBeDefined();
      expect(encrypted.data.key).toBeDefined();
      expect(encrypted.data.iv).toBeDefined();
      expect(encrypted.data.authTag).toBeUndefined(); // CBC doesn't use authTag

      // Decrypt
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-cbc',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });

    it('should handle long text', async () => {
      const plaintext = 'A'.repeat(10000); // 10KB of text

      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-cbc',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-cbc',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });
  });

  describe('ChaCha20-Poly1305 Encryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'ChaCha20 secret message';

      // Encrypt
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'chacha20-poly1305',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);
      expect(encrypted.data.operation).toBe('encrypt');
      expect(encrypted.data.algorithm).toBe('chacha20-poly1305');
      expect(encrypted.data.authTag).toBeDefined(); // ChaCha20 uses authTag

      // Decrypt
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'chacha20-poly1305',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from passphrase', async () => {
      const passphrase = 'my-strong-passphrase';

      const result = await EncryptorTool.execute(
        {
          operation: 'deriveKey',
          algorithm: 'aes-256-gcm',
          key: passphrase,
          keyDerivation: {
            iterations: 100000,
            keyLength: 32,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.operation).toBe('deriveKey');
      expect(result.data.algorithm).toBe('pbkdf2-sha256');
      expect(result.data.key).toBeDefined();
      expect(result.data.salt).toBeDefined();
    });

    it('should derive same key with same salt', async () => {
      const passphrase = 'my-passphrase';

      // First derivation
      const result1 = await EncryptorTool.execute(
        {
          operation: 'deriveKey',
          algorithm: 'aes-256-gcm',
          key: passphrase,
          keyDerivation: {
            iterations: 100000,
            keyLength: 32,
          },
        },
        context
      );

      testUtils.assertSuccess(result1);

      // Second derivation with same salt
      const result2 = await EncryptorTool.execute(
        {
          operation: 'deriveKey',
          algorithm: 'aes-256-gcm',
          key: passphrase,
          keyDerivation: {
            salt: result1.data.salt,
            iterations: 100000,
            keyLength: 32,
          },
        },
        context
      );

      testUtils.assertSuccess(result2);
      expect(result1.data.key).toBe(result2.data.key);
    });

    it('should encrypt and decrypt with derived key', async () => {
      const passphrase = 'my-secure-passphrase';
      const plaintext = 'Secret message';

      // Encrypt with key derivation
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
          key: passphrase,
          keyDerivation: {
            iterations: 100000,
            keyLength: 32,
          },
        },
        context
      );

      testUtils.assertSuccess(encrypted);
      expect(encrypted.data.salt).toBeDefined();

      // Decrypt with same passphrase and salt
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key: passphrase,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
          keyDerivation: {
            salt: encrypted.data.salt,
            iterations: 100000,
            keyLength: 32,
          },
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });

    it('should use minimum iterations', async () => {
      const passphrase = 'test-passphrase';

      const result = await EncryptorTool.execute(
        {
          operation: 'deriveKey',
          algorithm: 'aes-256-gcm',
          key: passphrase,
          keyDerivation: {
            iterations: 10000, // Minimum allowed
            keyLength: 32,
          },
        },
        context
      );

      testUtils.assertSuccess(result);
      expect(result.data.key).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should fail with missing required parameters', async () => {
      const result = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: 'some-data',
          // Missing key and iv
        } as any,
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail with invalid base64 ciphertext', async () => {
      const key = Buffer.from('a'.repeat(32)).toString('base64');
      const iv = Buffer.from('b'.repeat(12)).toString('base64');
      const authTag = Buffer.from('c'.repeat(16)).toString('base64');

      const result = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: 'invalid-base64!!!',
          key,
          iv,
          authTag,
        },
        context
      );

      testUtils.assertFailure(result);
    });

    it('should fail with tampered ciphertext', async () => {
      const plaintext = 'Secret message';

      // Encrypt
      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      // Tamper with ciphertext
      const tamperedCiphertext = encrypted.data.ciphertext!.slice(0, -4) + 'XXXX';

      // Try to decrypt tampered data
      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: tamperedCiphertext,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertFailure(decrypted);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty string', async () => {
      const plaintext = '';

      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-gcm',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
          authTag: encrypted.data.authTag,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe('');
    });

    it('should handle single character', async () => {
      const plaintext = 'X';

      const encrypted = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-cbc',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted);

      const decrypted = await EncryptorTool.execute(
        {
          operation: 'decrypt',
          algorithm: 'aes-256-cbc',
          data: encrypted.data.ciphertext!,
          key: encrypted.data.key,
          iv: encrypted.data.iv,
        },
        context
      );

      testUtils.assertSuccess(decrypted);
      expect(decrypted.data.plaintext).toBe(plaintext);
    });

    it('should generate unique IVs for each encryption', async () => {
      const plaintext = 'Same message';

      const encrypted1 = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      const encrypted2 = await EncryptorTool.execute(
        {
          operation: 'encrypt',
          algorithm: 'aes-256-gcm',
          data: plaintext,
        },
        context
      );

      testUtils.assertSuccess(encrypted1);
      testUtils.assertSuccess(encrypted2);

      // Different IVs should produce different ciphertexts
      expect(encrypted1.data.iv).not.toBe(encrypted2.data.iv);
      expect(encrypted1.data.ciphertext).not.toBe(encrypted2.data.ciphertext);
    });
  });
});
