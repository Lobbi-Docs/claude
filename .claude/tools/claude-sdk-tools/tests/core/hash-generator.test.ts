/**
 * @claude-sdk/tools - HashGeneratorTool Tests
 * Comprehensive tests for cryptographic hash generation
 */

import { describe, it, expect } from 'vitest';
import { HashGeneratorTool } from '../../src/tools/core/hash-generator.js';

// ============================================================================
// MD5 Hash Tests
// ============================================================================

describe('HashGeneratorTool - MD5', () => {
  it('should generate MD5 hash', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'md5',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    expect(result.data?.algorithm).toBe('md5');
    expect(result.data?.encoding).toBe('hex');
  });

  it('should generate consistent MD5 hashes', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'md5',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'md5',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).toBe(result2.data?.hash);
  });

  it('should generate different hashes for different inputs', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'hello',
      algorithm: 'md5',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'world',
      algorithm: 'md5',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).not.toBe(result2.data?.hash);
  });

  it('should handle empty string', async () => {
    const result = await HashGeneratorTool.execute({
      input: '',
      algorithm: 'md5',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('should hash special characters', async () => {
    const result = await HashGeneratorTool.execute({
      input: '!@#$%^&*()',
      algorithm: 'md5',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.hash).toHaveLength(32);
  });

  it('should hash unicode characters', async () => {
    const result = await HashGeneratorTool.execute({
      input: '你好世界',
      algorithm: 'md5',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
  });
});

// ============================================================================
// SHA-1 Hash Tests
// ============================================================================

describe('HashGeneratorTool - SHA-1', () => {
  it('should generate SHA-1 hash', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha1',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
    expect(result.data?.algorithm).toBe('sha1');
  });

  it('should generate consistent SHA-1 hashes', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha1',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha1',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).toBe(result2.data?.hash);
  });

  it('should have correct SHA-1 hash length', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha1',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toHaveLength(40);
  });
});

// ============================================================================
// SHA-256 Hash Tests
// ============================================================================

describe('HashGeneratorTool - SHA-256', () => {
  it('should generate SHA-256 hash', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    expect(result.data?.algorithm).toBe('sha256');
  });

  it('should generate consistent SHA-256 hashes', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).toBe(result2.data?.hash);
  });

  it('should have correct SHA-256 hash length', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toHaveLength(64);
  });

  it('should hash long text', async () => {
    const longText = 'a'.repeat(10000);
    const result = await HashGeneratorTool.execute({
      input: longText,
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.metadata?.inputLength).toBe(10000);
  });
});

// ============================================================================
// SHA-512 Hash Tests
// ============================================================================

describe('HashGeneratorTool - SHA-512', () => {
  it('should generate SHA-512 hash', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha512',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe(
      '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f'
    );
    expect(result.data?.algorithm).toBe('sha512');
  });

  it('should have correct SHA-512 hash length', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha512',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toHaveLength(128);
  });

  it('should generate consistent SHA-512 hashes', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha512',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha512',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).toBe(result2.data?.hash);
  });
});

// ============================================================================
// Encoding Tests
// ============================================================================

describe('HashGeneratorTool - Encoding', () => {
  it('should support hex encoding (default)', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      encoding: 'hex',
    });

    expect(result.success).toBe(true);
    expect(result.data?.encoding).toBe('hex');
    expect(result.data?.hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should support base64 encoding', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
      encoding: 'base64',
    });

    expect(result.success).toBe(true);
    expect(result.data?.encoding).toBe('base64');
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should support base64url encoding', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
      encoding: 'base64url',
    });

    expect(result.success).toBe(true);
    expect(result.data?.encoding).toBe('base64url');
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should produce different output for different encodings', async () => {
    const hexResult = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      encoding: 'hex',
    });

    const base64Result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      encoding: 'base64',
    });

    expect(hexResult.success).toBe(true);
    expect(base64Result.success).toBe(true);
    expect(hexResult.data?.hash).not.toBe(base64Result.data?.hash);
  });
});

// ============================================================================
// HMAC Tests
// ============================================================================

describe('HashGeneratorTool - HMAC', () => {
  it('should generate HMAC with SHA-256', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
      hmac: true,
      secret: 'secret-key',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.metadata?.hmac).toBe(true);
  });

  it('should generate consistent HMAC', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'my-secret',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'my-secret',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).toBe(result2.data?.hash);
  });

  it('should generate different HMAC for different secrets', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'secret1',
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'secret2',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).not.toBe(result2.data?.hash);
  });

  it('should generate HMAC with MD5', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'md5',
      hmac: true,
      secret: 'key',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should generate HMAC with SHA-512', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha512',
      hmac: true,
      secret: 'key',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should fail HMAC without secret', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
    } as any);

    expect(result.success).toBe(false);
  });

  it('should support HMAC with base64 encoding', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'key',
      encoding: 'base64',
    });

    expect(result.success).toBe(true);
    expect(result.data?.encoding).toBe('base64');
  });
});

// ============================================================================
// Multiple Rounds Tests
// ============================================================================

describe('HashGeneratorTool - Multiple Rounds', () => {
  it('should support single round (default)', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBeUndefined();
  });

  it('should support multiple rounds', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBe(3);
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should produce different hash for different rounds', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 1,
    });

    const result2 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 2,
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).not.toBe(result2.data?.hash);
  });

  it('should support high number of rounds', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 100,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBe(100);
  });

  it('should support multiple rounds with HMAC', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'key',
      rounds: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBe(5);
    expect(result.data?.metadata?.hmac).toBe(true);
  });

  it('should handle rounds at minimum value', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 1,
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should handle rounds at maximum value', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 1000,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBe(1000);
  });
});

// ============================================================================
// Metadata Tests
// ============================================================================

describe('HashGeneratorTool - Metadata', () => {
  it('should include input length in metadata', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.inputLength).toBe(5);
  });

  it('should include output length in metadata', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.outputLength).toBe(64); // hex sha256 length
  });

  it('should include HMAC flag in metadata when used', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      hmac: true,
      secret: 'key',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.hmac).toBe(true);
  });

  it('should include rounds in metadata when > 1', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBe(5);
  });

  it('should not include rounds in metadata when = 1', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBeUndefined();
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('HashGeneratorTool - Edge Cases', () => {
  it('should hash empty string', async () => {
    const result = await HashGeneratorTool.execute({
      input: '',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.metadata?.inputLength).toBe(0);
  });

  it('should hash very long string', async () => {
    const longString = 'a'.repeat(100000);
    const result = await HashGeneratorTool.execute({
      input: longString,
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.metadata?.inputLength).toBe(100000);
  });

  it('should hash binary-like data', async () => {
    const result = await HashGeneratorTool.execute({
      input: '\x00\x01\x02\x03',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should hash newlines and whitespace', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'line1\nline2\r\nline3',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
  });

  it('should handle all algorithms', async () => {
    const algorithms = ['md5', 'sha1', 'sha256', 'sha512'] as const;
    const results = await Promise.all(
      algorithms.map((algo) =>
        HashGeneratorTool.execute({
          input: 'test',
          algorithm: algo,
        })
      )
    );

    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should produce different hashes for different algorithms', async () => {
    const md5Result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'md5',
    });

    const sha256Result = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    expect(md5Result.success).toBe(true);
    expect(sha256Result.success).toBe(true);
    expect(md5Result.data?.hash).not.toBe(sha256Result.data?.hash);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('HashGeneratorTool - Integration', () => {
  it('should support chaining with multiple rounds manually', async () => {
    const result1 = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    const result2 = await HashGeneratorTool.execute({
      input: result1.data?.hash as string,
      algorithm: 'sha256',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.hash).not.toBe(result2.data?.hash);
  });

  it('should match single round with rounds parameter', async () => {
    const singleResult = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
    });

    const roundsResult = await HashGeneratorTool.execute({
      input: 'test',
      algorithm: 'sha256',
      rounds: 1,
    });

    expect(singleResult.success).toBe(true);
    expect(roundsResult.success).toBe(true);
    expect(singleResult.data?.hash).toBe(roundsResult.data?.hash);
  });

  it('should handle batch hashing', async () => {
    const inputs = ['test1', 'test2', 'test3'];
    const results = await Promise.all(
      inputs.map((input) =>
        HashGeneratorTool.execute({
          input,
          algorithm: 'sha256',
        })
      )
    );

    expect(results.every((r) => r.success)).toBe(true);
    const hashes = results.map((r) => r.data?.hash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(3);
  });
});
