/**
 * @claude-sdk/tools - UuidGeneratorTool Tests
 * Comprehensive tests for UUID generation, validation, and parsing
 */

import { describe, it, expect } from 'vitest';
import { UuidGeneratorTool } from '../../src/tools/core/uuid-generator.js';

// ============================================================================
// Generate Operation Tests - V4
// ============================================================================

describe('UuidGeneratorTool - Generate V4', () => {
  it('should generate valid UUID v4', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('string');
    expect(result.data?.result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(result.data?.metadata?.version).toBe('v4');
  });

  it('should generate different UUIDs each time', async () => {
    const result1 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    const result2 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.result).not.toBe(result2.data?.result);
  });

  it('should default to v4 when version not specified', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should have correct version nibble (4)', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    expect(result.success).toBe(true);
    const uuid = result.data?.result as string;
    const versionChar = uuid.split('-')[2][0];
    expect(versionChar).toBe('4');
  });

  it('should have correct variant bits', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    expect(result.success).toBe(true);
    const uuid = result.data?.result as string;
    const variantChar = uuid.split('-')[3][0];
    expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase());
  });
});

// ============================================================================
// Generate Operation Tests - V5
// ============================================================================

describe('UuidGeneratorTool - Generate V5', () => {
  it('should generate valid UUID v5', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('string');
    expect(result.data?.result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(result.data?.metadata?.version).toBe('v5');
  });

  it('should generate same UUID for same namespace and name', async () => {
    const result1 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    const result2 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.result).toBe(result2.data?.result);
  });

  it('should generate different UUIDs for different names', async () => {
    const result1 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    const result2 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'different.com',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.result).not.toBe(result2.data?.result);
  });

  it('should generate different UUIDs for different namespaces', async () => {
    const result1 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    const result2 = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_URL,
      name: 'example.com',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data?.result).not.toBe(result2.data?.result);
  });

  it('should use DNS namespace constant', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'test.com',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.namespace).toBe(UuidGeneratorTool.NAMESPACE_DNS);
  });

  it('should use URL namespace constant', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_URL,
      name: 'https://example.com',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.namespace).toBe(UuidGeneratorTool.NAMESPACE_URL);
  });

  it('should use OID namespace constant', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_OID,
      name: '1.3.6.1',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.namespace).toBe(UuidGeneratorTool.NAMESPACE_OID);
  });

  it('should use X500 namespace constant', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_X500,
      name: 'CN=Test',
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.namespace).toBe(UuidGeneratorTool.NAMESPACE_X500);
  });

  it('should fail without namespace parameter', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      name: 'example.com',
    } as any);

    expect(result.success).toBe(false);
  });

  it('should fail without name parameter', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
    } as any);

    expect(result.success).toBe(false);
  });

  it('should have correct version nibble (5)', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'test.com',
    });

    expect(result.success).toBe(true);
    const uuid = result.data?.result as string;
    const versionChar = uuid.split('-')[2][0];
    expect(versionChar).toBe('5');
  });
});

// ============================================================================
// Validate Operation Tests
// ============================================================================

describe('UuidGeneratorTool - Validate', () => {
  it('should validate valid UUID v4', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(true);
    expect(result.data?.metadata?.version).toBeDefined();
    expect(result.data?.metadata?.variant).toBeDefined();
  });

  it('should validate lowercase UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(true);
  });

  it('should validate uppercase UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550E8400-E29B-41D4-A716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(true);
  });

  it('should validate mixed case UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-E29B-41d4-A716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(true);
  });

  it('should invalidate UUID without hyphens', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400e29b41d4a716446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(false);
  });

  it('should invalidate UUID with wrong format', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: 'not-a-uuid',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(false);
  });

  it('should invalidate UUID with invalid characters', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716-44665544000g',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(false);
  });

  it('should invalidate too short UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(false);
  });

  it('should invalidate too long UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716-446655440000-extra',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(false);
  });

  it('should handle empty string validation', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '',
    });

    // Should either fail validation or return false
    if (result.success) {
      expect(result.data?.result).toBe(false);
    } else {
      // Schema validation caught it
      expect(result.success).toBe(false);
    }
  });

  it('should fail without uuid parameter', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
    } as any);

    expect(result.success).toBe(false);
  });

  it('should identify UUID version', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(true);
    expect(result.data?.metadata?.version).toBe('4');
  });
});

// ============================================================================
// Parse Operation Tests
// ============================================================================

describe('UuidGeneratorTool - Parse', () => {
  it('should parse valid UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toHaveProperty('uuid');
    expect(result.data?.result).toHaveProperty('version');
    expect(result.data?.result).toHaveProperty('variant');
    expect(result.data?.result).toHaveProperty('timeLow');
    expect(result.data?.result).toHaveProperty('timeMid');
    expect(result.data?.result).toHaveProperty('timeHiAndVersion');
    expect(result.data?.result).toHaveProperty('clockSeqHiAndReserved');
    expect(result.data?.result).toHaveProperty('clockSeqLow');
    expect(result.data?.result).toHaveProperty('node');
  });

  it('should parse UUID components correctly', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid,
    });

    expect(result.success).toBe(true);
    const parsed = result.data?.result as any;
    expect(parsed.uuid).toBe(uuid);
    expect(parsed.timeLow).toBe('550e8400');
    expect(parsed.timeMid).toBe('e29b');
    expect(parsed.timeHiAndVersion).toBe('41d4');
    expect(parsed.clockSeqHiAndReserved).toBe('a7');
    expect(parsed.clockSeqLow).toBe('16');
    expect(parsed.node).toBe('446655440000');
  });

  it('should identify version in parsed UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    const parsed = result.data?.result as any;
    expect(parsed.version).toBe(4);
  });

  it('should identify variant in parsed UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    const parsed = result.data?.result as any;
    expect(parsed.variant).toBeDefined();
    expect(typeof parsed.variant).toBe('string');
  });

  it('should parse UUID v5', async () => {
    const genResult = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    const parseResult = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: genResult.data?.result as string,
    });

    expect(parseResult.success).toBe(true);
    const parsed = parseResult.data?.result as any;
    expect(parsed.version).toBe(5);
  });

  it('should fail to parse invalid UUID', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('should fail without uuid parameter', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
    } as any);

    expect(result.success).toBe(false);
  });

  it('should parse and validate round-trip', async () => {
    const genResult = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    const parseResult = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: genResult.data?.result as string,
    });

    expect(genResult.success).toBe(true);
    expect(parseResult.success).toBe(true);
    const parsed = parseResult.data?.result as any;
    expect(parsed.uuid).toBe(genResult.data?.result);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('UuidGeneratorTool - Integration', () => {
  it('should generate, validate, and parse UUID v4', async () => {
    const genResult = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    const validateResult = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: genResult.data?.result as string,
    });

    const parseResult = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: genResult.data?.result as string,
    });

    expect(genResult.success).toBe(true);
    expect(validateResult.success).toBe(true);
    expect(validateResult.data?.result).toBe(true);
    expect(parseResult.success).toBe(true);
    expect((parseResult.data?.result as any).version).toBe(4);
  });

  it('should generate, validate, and parse UUID v5', async () => {
    const genResult = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    const validateResult = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: genResult.data?.result as string,
    });

    const parseResult = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: genResult.data?.result as string,
    });

    expect(genResult.success).toBe(true);
    expect(validateResult.success).toBe(true);
    expect(validateResult.data?.result).toBe(true);
    expect(parseResult.success).toBe(true);
    expect((parseResult.data?.result as any).version).toBe(5);
  });

  it('should handle batch generation', async () => {
    const results = await Promise.all([
      UuidGeneratorTool.execute({ operation: 'generate', version: 'v4' }),
      UuidGeneratorTool.execute({ operation: 'generate', version: 'v4' }),
      UuidGeneratorTool.execute({ operation: 'generate', version: 'v4' }),
    ]);

    expect(results.every((r) => r.success)).toBe(true);
    const uuids = results.map((r) => r.data?.result);
    const uniqueUuids = new Set(uuids);
    expect(uniqueUuids.size).toBe(3);
  });
});
