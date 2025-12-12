/**
 * @claude-sdk/tools - YAML Processor Tests
 * Comprehensive tests for YAML parsing, stringifying, merging, and multi-document support
 */

import { describe, it, expect } from 'vitest';
import { executeYamlProcessor } from '../../src/tools/data/yaml-processor.js';
import type { ToolContext } from '../../src/types/index.js';

// Mock context for tests
const mockContext: ToolContext = {
  sessionId: 'test-session',
  userId: 'test-user',
  timestamp: new Date(),
  metadata: {},
};

// ============================================================================
// Parse Operation Tests
// ============================================================================

describe('YamlProcessorTool - Parse Operation', () => {
  it('should parse simple YAML', async () => {
    const yamlData = `
name: John
age: 30
city: NYC
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'John', age: 30, city: 'NYC' });
  });

  it('should parse nested YAML', async () => {
    const yamlData = `
user:
  name: John
  address:
    city: NYC
    zip: 10001
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.user.name).toBe('John');
    expect(parsed.user.address.city).toBe('NYC');
  });

  it('should parse YAML arrays', async () => {
    const yamlData = `
items:
  - item1
  - item2
  - item3
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.items).toEqual(['item1', 'item2', 'item3']);
  });

  it('should parse YAML with different types', async () => {
    const yamlData = `
string: hello
number: 42
float: 3.14
boolean: true
null_value: null
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(typeof parsed.string).toBe('string');
    expect(typeof parsed.number).toBe('number');
    expect(typeof parsed.float).toBe('number');
    expect(typeof parsed.boolean).toBe('boolean');
    expect(parsed.null_value).toBeNull();
  });

  it('should parse multi-line strings', async () => {
    const yamlData = `
description: |
  This is a multi-line
  string with line breaks
  preserved.
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.description).toContain('\n');
  });

  it('should parse multi-document YAML', async () => {
    const yamlData = `---
doc1:
  name: First
---
doc2:
  name: Second
---
doc3:
  name: Third
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
        options: { multiDocument: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    const docs = result.data as any[];
    expect(docs).toHaveLength(3);
    expect(docs[0].doc1.name).toBe('First');
  });

  it('should handle empty YAML', async () => {
    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: '',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should handle YAML with comments', async () => {
    const yamlData = `
# This is a comment
name: John # inline comment
age: 30
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.name).toBe('John');
  });

  it('should handle anchors and aliases', async () => {
    const yamlData = `
defaults: &defaults
  adapter: postgres
  host: localhost

development:
  <<: *defaults
  database: dev_db
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.development.adapter).toBe('postgres');
  });

  it('should handle invalid YAML', async () => {
    const yamlData = `
name: John
  invalid indentation
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should use JSON schema when specified', async () => {
    const yamlData = `{"name": "John", "age": 30}`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
        options: { schema: 'JSON_SCHEMA', json: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Stringify Operation Tests
// ============================================================================

describe('YamlProcessorTool - Stringify Operation', () => {
  it('should stringify simple object', async () => {
    const data = { name: 'John', age: 30, city: 'NYC' };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('name: John');
    expect(result.data).toContain('age: 30');
  });

  it('should stringify with custom indentation', async () => {
    const data = { a: { b: 1 } };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
        options: { indent: 4 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('    ');
  });

  it('should stringify nested objects', async () => {
    const data = {
      user: {
        name: 'John',
        address: {
          city: 'NYC',
          zip: 10001,
        },
      },
    };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('user:');
    expect(result.data).toContain('address:');
  });

  it('should stringify arrays', async () => {
    const data = { items: ['item1', 'item2', 'item3'] };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('- item1');
    expect(result.data).toContain('- item2');
  });

  it('should stringify multi-document YAML', async () => {
    const data = [
      { doc1: { name: 'First' } },
      { doc2: { name: 'Second' } },
      { doc3: { name: 'Third' } },
    ];

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
        options: { multiDocument: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('---');
  });

  it('should sort keys when configured', async () => {
    const data = { z: 1, a: 2, m: 3 };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
        options: { sortKeys: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const lines = (result.data as string).split('\n');
    const keys = lines.filter(l => l.includes(': ')).map(l => l.split(':')[0].trim());
    expect(keys).toEqual(['a', 'm', 'z']);
  });

  it('should handle empty object', async () => {
    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data: {},
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('{}\n');
  });

  it('should handle empty array', async () => {
    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data: [],
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('[]\n');
  });

  it('should use flow style when configured', async () => {
    const data = { a: 1, b: 2, c: 3 };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
        options: { flowLevel: 0 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('{');
  });

  it('should force quotes when configured', async () => {
    const data = { name: 'John', city: 'NYC' };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data,
        options: { forceQuotes: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('"');
  });
});

// ============================================================================
// Merge Operation Tests
// ============================================================================

describe('YamlProcessorTool - Merge Operation', () => {
  it('should perform deep merge', async () => {
    const data = { a: 1, b: { c: 2 } };

    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data,
        options: {
          mergeWith: { b: { d: 3 }, e: 4 },
          deepMerge: true,
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
  });

  it('should perform shallow merge', async () => {
    const data = { a: 1, b: { c: 2 } };

    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data,
        options: {
          mergeWith: { b: { d: 3 } },
          deepMerge: false,
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.b).toEqual({ d: 3 }); // Shallow merge replaces
  });

  it('should merge arrays with replace strategy', async () => {
    const data = { items: [1, 2] };

    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data,
        options: {
          mergeWith: { items: [3, 4] },
          arrayMergeStrategy: 'replace',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([3, 4]);
  });

  it('should merge arrays with concat strategy', async () => {
    const data = { items: [1, 2] };

    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data,
        options: {
          mergeWith: { items: [3, 4] },
          arrayMergeStrategy: 'concat',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([1, 2, 3, 4]);
  });

  it('should merge arrays with union strategy', async () => {
    const data = { items: [1, 2, 3] };

    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data,
        options: {
          mergeWith: { items: [3, 4, 5] },
          arrayMergeStrategy: 'union',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toHaveLength(5); // [1, 2, 3, 4, 5]
  });

  it('should handle empty source', async () => {
    const data = { a: 1 };

    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data,
        options: { mergeWith: {} },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 });
  });

  it('should require mergeWith option', async () => {
    const result = await executeYamlProcessor(
      {
        operation: 'merge',
        data: { a: 1 },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Validate Operation Tests
// ============================================================================

describe('YamlProcessorTool - Validate Operation', () => {
  it('should validate valid YAML', async () => {
    const yamlData = 'name: John\nage: 30';

    const result = await executeYamlProcessor(
      {
        operation: 'validate',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate object data', async () => {
    const result = await executeYamlProcessor(
      {
        operation: 'validate',
        data: { name: 'John', age: 30 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should detect invalid YAML', async () => {
    const yamlData = 'name: John\n  invalid: indentation';

    const result = await executeYamlProcessor(
      {
        operation: 'validate',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('YamlProcessorTool - Edge Cases', () => {
  it('should handle null values', async () => {
    const yamlData = 'value: null';

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.value).toBeNull();
  });

  it('should handle unicode characters', async () => {
    const yamlData = 'emoji: 😀\nchinese: 你好';

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.emoji).toBe('😀');
    expect(parsed.chinese).toBe('你好');
  });

  it('should handle special YAML values', async () => {
    const yamlData = `
yes_value: yes
no_value: no
on_value: on
off_value: off
`;

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle dates', async () => {
    const yamlData = 'date: 2024-01-15';

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle unknown operation', async () => {
    const result = await executeYamlProcessor(
      {
        operation: 'unknown' as any,
        data: {},
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should round-trip YAML to object and back', async () => {
    const originalYaml = 'name: John\nage: 30\ncity: NYC';

    // Parse YAML
    const parseResult = await executeYamlProcessor(
      {
        operation: 'parse',
        data: originalYaml,
      },
      mockContext
    );

    expect(parseResult.success).toBe(true);

    // Stringify back to YAML
    const stringifyResult = await executeYamlProcessor(
      {
        operation: 'stringify',
        data: parseResult.data,
      },
      mockContext
    );

    expect(stringifyResult.success).toBe(true);
    expect(stringifyResult.data).toContain('name: John');
    expect(stringifyResult.data).toContain('age: 30');
  });

  it('should handle large nested structures', async () => {
    const deepData = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: 'deep',
            },
          },
        },
      },
    };

    const result = await executeYamlProcessor(
      {
        operation: 'stringify',
        data: deepData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle empty multi-document', async () => {
    const yamlData = '---\n---\n---';

    const result = await executeYamlProcessor(
      {
        operation: 'parse',
        data: yamlData,
        options: { multiDocument: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
