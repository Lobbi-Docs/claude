/**
 * Encryption Module for Secrets Management
 *
 * Business Value: Provides military-grade encryption (AES-256-GCM) for protecting
 * sensitive credentials at rest, ensuring compliance with security standards and
 * preventing unauthorized access to secrets.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with 100,000 iterations
 * - Random initialization vectors for each encryption
 * - Authentication tags to detect tampering
 * - Secure random salt generation
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import type { EncryptionResult, DecryptionInput } from './types.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha256';

export class SecretEncryption {
  private masterKey: Buffer;
  private keyId: string;

  /**
   * Initialize encryption with a master key
   *
   * @param masterKey - Master encryption key (32 bytes) or passphrase
   * @param keyId - Identifier for this key (for key rotation support)
   * @param salt - Optional salt for key derivation (generated if not provided)
   */
  constructor(
    masterKey: string | Buffer,
    keyId: string,
    private salt?: Buffer
  ) {
    this.keyId = keyId;

    if (typeof masterKey === 'string') {
      // Derive key from passphrase using PBKDF2
      if (!this.salt) {
        this.salt = randomBytes(SALT_LENGTH);
      }
      this.masterKey = pbkdf2Sync(
        masterKey,
        this.salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        PBKDF2_DIGEST
      );
    } else {
      // Use provided key directly
      if (masterKey.length !== KEY_LENGTH) {
        throw new Error(`Master key must be ${KEY_LENGTH} bytes`);
      }
      this.masterKey = masterKey;
    }
  }

  /**
   * Generate a new random master key
   *
   * Business Value: Enables secure key generation for new installations
   * without requiring external key management infrastructure.
   */
  static generateMasterKey(): Buffer {
    return randomBytes(KEY_LENGTH);
  }

  /**
   * Generate a secure random salt for key derivation
   *
   * Business Value: Ensures unique derived keys even with the same passphrase,
   * protecting against rainbow table attacks.
   */
  static generateSalt(): Buffer {
    return randomBytes(SALT_LENGTH);
  }

  /**
   * Get the salt used for key derivation
   *
   * Business Value: Allows persisting the salt so the same key can be
   * derived from the passphrase later.
   */
  getSalt(): Buffer | undefined {
    return this.salt;
  }

  /**
   * Encrypt a secret value
   *
   * Business Value: Protects sensitive data at rest, ensuring secrets remain
   * confidential even if storage is compromised.
   *
   * Security: Uses AES-256-GCM with random IV for each encryption,
   * providing both confidentiality and authenticity.
   *
   * @param plaintext - The secret value to encrypt
   * @returns Encryption result with ciphertext, IV, and auth tag
   */
  encrypt(plaintext: string): EncryptionResult {
    // Generate random IV for this encryption
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);

    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: ALGORITHM,
      keyId: this.keyId,
    };
  }

  /**
   * Decrypt a secret value
   *
   * Business Value: Enables authorized access to protected secrets while
   * maintaining audit trail and access control.
   *
   * Security: Verifies authentication tag to detect tampering before
   * returning the plaintext value.
   *
   * @param input - Decryption input with ciphertext, IV, and auth tag
   * @returns Decrypted plaintext value
   * @throws Error if authentication tag verification fails (tampering detected)
   */
  decrypt(input: DecryptionInput): string {
    if (input.keyId !== this.keyId) {
      throw new Error(
        `Key ID mismatch: expected ${this.keyId}, got ${input.keyId}`
      );
    }

    if (input.algorithm !== ALGORITHM) {
      throw new Error(
        `Algorithm mismatch: expected ${ALGORITHM}, got ${input.algorithm}`
      );
    }

    // Parse IV and auth tag from base64
    const iv = Buffer.from(input.iv, 'base64');
    const authTag = Buffer.from(input.authTag, 'base64');

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the ciphertext
    let plaintext = decipher.update(input.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Securely wipe the master key from memory
   *
   * Business Value: Reduces attack surface by clearing sensitive key material
   * from memory when no longer needed.
   *
   * Security: Overwrites key buffer with random data before releasing.
   */
  destroy(): void {
    // Overwrite the key buffer with random data
    randomBytes(KEY_LENGTH).copy(this.masterKey);
  }
}

/**
 * Generate a cryptographic hash of a key for verification
 *
 * Business Value: Enables key verification without storing the key itself,
 * supporting key rotation and validation workflows.
 *
 * @param key - The key to hash
 * @returns Base64-encoded SHA-256 hash
 */
export async function hashKey(key: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(key).digest('base64');
}

/**
 * Securely compare two strings in constant time
 *
 * Business Value: Prevents timing attacks when comparing secret values,
 * maintaining security even against sophisticated adversaries.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export async function secureCompare(a: string, b: string): Promise<boolean> {
  const crypto = await import('crypto');
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
