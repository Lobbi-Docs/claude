/**
 * @claude-sdk/tools - StringManipulatorTool Tests
 * Comprehensive tests for string manipulation operations
 */

import { describe, it, expect } from 'vitest';
import { StringManipulatorTool } from '../../src/tools/core/string-manipulator.js';

// ============================================================================
// Split Operation Tests
// ============================================================================

describe('StringManipulatorTool - Split', () => {
  it('should split string by delimiter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'split',
      input: 'hello,world,test',
      separator: ',',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['hello', 'world', 'test']);
    expect(result.data?.metadata?.resultLength).toBe(3);
  });

  it('should split string with limit', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'split',
      input: 'a,b,c,d,e',
      separator: ',',
      limit: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['a', 'b', 'c']);
  });

  it('should split by empty separator (split each character)', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'split',
      input: 'hello',
      separator: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['h', 'e', 'l', 'l', 'o']);
  });

  it('should handle empty string split', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'split',
      input: '',
      separator: ',',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['']);
  });

  it('should fail when input is not a string', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'split',
      input: ['not', 'a', 'string'] as any,
      separator: ',',
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Join Operation Tests
// ============================================================================

describe('StringManipulatorTool - Join', () => {
  it('should join array with delimiter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'join',
      input: ['hello', 'world', 'test'],
      delimiter: ' ',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world test');
  });

  it('should join with empty delimiter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'join',
      input: ['a', 'b', 'c'],
      delimiter: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('abc');
  });

  it('should join empty array', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'join',
      input: [],
      delimiter: ',',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('');
  });

  it('should fail when input is not an array', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'join',
      input: 'not an array' as any,
      delimiter: ',',
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Replace Operation Tests
// ============================================================================

describe('StringManipulatorTool - Replace', () => {
  it('should replace first occurrence', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'replace',
      input: 'hello world world',
      search: 'world',
      replacement: 'there',
      replaceAll: false,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello there world');
    expect(result.data?.metadata?.matchCount).toBe(1);
  });

  it('should replace all occurrences', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'replace',
      input: 'hello world world',
      search: 'world',
      replacement: 'there',
      replaceAll: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello there there');
    expect(result.data?.metadata?.matchCount).toBe(2);
  });

  it('should handle no matches', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'replace',
      input: 'hello world',
      search: 'foo',
      replacement: 'bar',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world');
    expect(result.data?.metadata?.matchCount).toBe(0);
  });

  it('should fail without search parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'replace',
      input: 'hello world',
      replacement: 'there',
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Case Convert Operation Tests
// ============================================================================

describe('StringManipulatorTool - Case Convert', () => {
  it('should convert to camelCase', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'hello_world_test',
      caseType: 'camel',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('helloWorldTest');
  });

  it('should convert to PascalCase', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'hello_world_test',
      caseType: 'pascal',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('HelloWorldTest');
  });

  it('should convert to snake_case', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'helloWorldTest',
      caseType: 'snake',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello_world_test');
  });

  it('should convert to kebab-case', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'helloWorldTest',
      caseType: 'kebab',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello-world-test');
  });

  it('should convert to UPPERCASE', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'hello world',
      caseType: 'upper',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('HELLO WORLD');
  });

  it('should convert to lowercase', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'HELLO WORLD',
      caseType: 'lower',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world');
  });

  it('should convert to Title Case', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'hello world test',
      caseType: 'title',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('Hello World Test');
  });

  it('should convert to Sentence case', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'HELLO WORLD',
      caseType: 'sentence',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('Hello world');
  });

  it('should fail without caseType parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'hello world',
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Template Operation Tests
// ============================================================================

describe('StringManipulatorTool - Template', () => {
  it('should interpolate variables', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'template',
      input: 'Hello {{name}}, you are {{age}} years old',
      variables: { name: 'John', age: 30 },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('Hello John, you are 30 years old');
  });

  it('should handle missing variables', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'template',
      input: 'Hello {{name}}, welcome to {{place}}',
      variables: { name: 'John' },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('Hello John, welcome to {{place}}');
  });

  it('should handle whitespace in placeholders', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'template',
      input: 'Hello {{ name }}, age: {{ age }}',
      variables: { name: 'Jane', age: 25 },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('Hello Jane, age: 25');
  });

  it('should fail without variables parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'template',
      input: 'Hello {{name}}',
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Regex Match Operation Tests
// ============================================================================

describe('StringManipulatorTool - Regex Match', () => {
  it('should match pattern with global flag', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_match',
      input: 'test123abc456def789',
      pattern: '\\d+',
      flags: 'g',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['123', '456', '789']);
    expect(result.data?.metadata?.matchCount).toBe(3);
  });

  it('should match pattern without global flag', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_match',
      input: 'test123abc456',
      pattern: '\\d+',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['123']);
  });

  it('should handle no matches', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_match',
      input: 'hello world',
      pattern: '\\d+',
      flags: 'g',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([]);
    expect(result.data?.metadata?.matchCount).toBe(0);
  });

  it('should match with case-insensitive flag', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_match',
      input: 'Hello WORLD',
      pattern: 'hello',
      flags: 'gi',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['Hello']);
  });

  it('should fail without pattern parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_match',
      input: 'hello world',
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Regex Replace Operation Tests
// ============================================================================

describe('StringManipulatorTool - Regex Replace', () => {
  it('should replace with regex pattern', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_replace',
      input: 'test123abc456',
      pattern: '\\d+',
      replacement: 'NUM',
      flags: 'g',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('testNUMabcNUM');
    expect(result.data?.metadata?.matchCount).toBe(2);
  });

  it('should replace first match only without global flag', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_replace',
      input: 'test123abc456',
      pattern: '\\d+',
      replacement: 'NUM',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('testNUMabc456');
  });

  it('should fail without pattern parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_replace',
      input: 'hello world',
      replacement: 'test',
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Trim Operation Tests
// ============================================================================

describe('StringManipulatorTool - Trim', () => {
  it('should trim both sides', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'trim',
      input: '  hello world  ',
      trimType: 'both',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world');
  });

  it('should trim start only', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'trim',
      input: '  hello world  ',
      trimType: 'start',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world  ');
  });

  it('should trim end only', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'trim',
      input: '  hello world  ',
      trimType: 'end',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('  hello world');
  });

  it('should trim custom characters', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'trim',
      input: '***hello***',
      trimType: 'both',
      chars: '*',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello');
  });

  it('should trim multiple custom characters', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'trim',
      input: '.-+hello.-+',
      trimType: 'both',
      chars: '.-+',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello');
  });
});

// ============================================================================
// Pad Operation Tests
// ============================================================================

describe('StringManipulatorTool - Pad', () => {
  it('should pad at end', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'test',
      length: 10,
      padChar: '0',
      padSide: 'end',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('test000000');
  });

  it('should pad at start', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'test',
      length: 10,
      padChar: '0',
      padSide: 'start',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('000000test');
  });

  it('should pad both sides', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'test',
      length: 10,
      padChar: '*',
      padSide: 'both',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('***test***');
  });

  it('should not pad if already at target length', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'hello',
      length: 5,
      padChar: '0',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello');
  });

  it('should not pad if string longer than target', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'hello world',
      length: 5,
      padChar: '0',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world');
  });

  it('should fail without length parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'test',
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Truncate Operation Tests
// ============================================================================

describe('StringManipulatorTool - Truncate', () => {
  it('should truncate long string with ellipsis', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'truncate',
      input: 'This is a very long string',
      maxLength: 10,
      ellipsis: '...',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('This is...');
    expect(result.data?.result?.length).toBe(10);
  });

  it('should truncate with custom ellipsis', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'truncate',
      input: 'This is a very long string',
      maxLength: 15,
      ellipsis: '…',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('This is a very…');
  });

  it('should not truncate short strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'truncate',
      input: 'short',
      maxLength: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('short');
  });

  it('should handle edge case where maxLength equals ellipsis length', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'truncate',
      input: 'hello world',
      maxLength: 3,
      ellipsis: '...',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('...');
  });

  it('should fail without maxLength parameter', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'truncate',
      input: 'hello world',
    } as any);

    expect(result.success).toBe(false);
  });
});
