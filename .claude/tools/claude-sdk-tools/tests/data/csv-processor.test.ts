/**
 * @claude-sdk/tools - CSV Processor Tests
 * Comprehensive tests for CSV parsing, stringifying, filtering, sorting, and transforming
 */

import { describe, it, expect } from 'vitest';
import { executeCsvProcessor } from '../../src/tools/data/csv-processor.js';
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

describe('CsvProcessorTool - Parse Operation', () => {
  it('should parse basic CSV with headers', async () => {
    const csvData = `name,age,city
John,30,NYC
Jane,25,LA`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0]).toEqual({ name: 'John', age: 30, city: 'NYC' });
    expect(parsed.data[1]).toEqual({ name: 'Jane', age: 25, city: 'LA' });
  });

  it('should parse CSV without headers', async () => {
    const csvData = `John,30,NYC
Jane,25,LA`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: false },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(Array.isArray(parsed.data[0])).toBe(true);
  });

  it('should parse CSV with custom delimiter', async () => {
    const csvData = `name;age;city
John;30;NYC
Jane;25;LA`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { delimiter: ';', header: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data[0]).toEqual({ name: 'John', age: 30, city: 'NYC' });
  });

  it('should parse CSV with quoted values', async () => {
    const csvData = `name,description
"John Doe","A person with, comma"
"Jane Smith","Another ""quoted"" value"`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data[0].name).toBe('John Doe');
    expect(parsed.data[0].description).toBe('A person with, comma');
  });

  it('should handle empty CSV', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: '',
        options: { header: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data).toHaveLength(0);
  });

  it('should skip empty lines', async () => {
    const csvData = `name,age

John,30

Jane,25`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true, skipEmptyLines: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data).toHaveLength(2);
  });

  it('should handle dynamic typing', async () => {
    const csvData = `name,age,score,active
John,30,95.5,true
Jane,25,87.3,false`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true, dynamicTyping: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(typeof parsed.data[0].age).toBe('number');
    expect(typeof parsed.data[0].score).toBe('number');
    expect(typeof parsed.data[0].active).toBe('boolean');
  });

  it('should handle comments', async () => {
    const csvData = `# This is a comment
name,age
John,30
# Another comment
Jane,25`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true, comments: '#' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data).toHaveLength(2);
  });

  it('should handle invalid CSV', async () => {
    const csvData = `name,age,city
John,30,NYC,ExtraColumn
Jane,25`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true },
      },
      mockContext
    );

    // Parser should handle malformed data gracefully
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Stringify Operation Tests
// ============================================================================

describe('CsvProcessorTool - Stringify Operation', () => {
  it('should stringify array to CSV with headers', async () => {
    const data = [
      { name: 'John', age: 30, city: 'NYC' },
      { name: 'Jane', age: 25, city: 'LA' },
    ];

    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data,
        options: { headerStringify: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('name,age,city');
    expect(result.data).toContain('John,30,NYC');
    expect(result.data).toContain('Jane,25,LA');
  });

  it('should stringify without headers', async () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data,
        options: { headerStringify: false },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).not.toContain('name');
    expect(result.data).toContain('John');
  });

  it('should stringify with custom delimiter', async () => {
    const data = [{ name: 'John', age: 30 }];

    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data,
        options: { delimiterStringify: ';' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain(';');
  });

  it('should quote values with special characters', async () => {
    const data = [{ name: 'John, Jr.', description: 'A "special" person' }];

    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data,
        options: { quotes: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('"John, Jr."');
  });

  it('should handle empty array', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data: [],
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('');
  });

  it('should handle single row', async () => {
    const data = [{ name: 'John', age: 30 }];

    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('John');
  });

  it('should require array data', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'stringify',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Filter Operation Tests
// ============================================================================

describe('CsvProcessorTool - Filter Operation', () => {
  const testData = [
    { name: 'John', age: 30, city: 'NYC', active: true },
    { name: 'Jane', age: 25, city: 'LA', active: false },
    { name: 'Bob', age: 35, city: 'NYC', active: true },
    { name: 'Alice', age: 28, city: 'SF', active: true },
  ];

  it('should filter by equality', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'city',
          filterValue: 'NYC',
          filterOperator: 'eq',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect((result.data as any[]).every(r => r.city === 'NYC')).toBe(true);
  });

  it('should filter by greater than', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'age',
          filterValue: 30,
          filterOperator: 'gt',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect((result.data as any[])[0].name).toBe('Bob');
  });

  it('should filter by less than or equal', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'age',
          filterValue: 28,
          filterOperator: 'lte',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should filter by contains', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'name',
          filterValue: 'J',
          filterOperator: 'contains',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2); // John and Jane
  });

  it('should filter by startsWith', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'name',
          filterValue: 'J',
          filterOperator: 'startsWith',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should filter by endsWith', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'name',
          filterValue: 'e',
          filterOperator: 'endsWith',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2); // Jane and Alice
  });

  it('should filter by not equal', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
        options: {
          filterColumn: 'city',
          filterValue: 'NYC',
          filterOperator: 'ne',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should require filterColumn and filterValue', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: testData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should require array data', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'filter',
        data: { name: 'John' },
        options: { filterColumn: 'name', filterValue: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Sort Operation Tests
// ============================================================================

describe('CsvProcessorTool - Sort Operation', () => {
  const testData = [
    { name: 'Charlie', age: 30, score: 85 },
    { name: 'Alice', age: 25, score: 92 },
    { name: 'Bob', age: 35, score: 78 },
  ];

  it('should sort by string column ascending', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'sort',
        data: testData,
        options: { sortColumn: 'name', sortOrder: 'asc' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const sorted = result.data as any[];
    expect(sorted[0].name).toBe('Alice');
    expect(sorted[1].name).toBe('Bob');
    expect(sorted[2].name).toBe('Charlie');
  });

  it('should sort by string column descending', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'sort',
        data: testData,
        options: { sortColumn: 'name', sortOrder: 'desc' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const sorted = result.data as any[];
    expect(sorted[0].name).toBe('Charlie');
    expect(sorted[2].name).toBe('Alice');
  });

  it('should sort by number column ascending', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'sort',
        data: testData,
        options: { sortColumn: 'age', sortOrder: 'asc' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const sorted = result.data as any[];
    expect(sorted[0].age).toBe(25);
    expect(sorted[1].age).toBe(30);
    expect(sorted[2].age).toBe(35);
  });

  it('should sort by number column descending', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'sort',
        data: testData,
        options: { sortColumn: 'score', sortOrder: 'desc' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const sorted = result.data as any[];
    expect(sorted[0].score).toBe(92);
    expect(sorted[2].score).toBe(78);
  });

  it('should not modify original data', async () => {
    const original = [...testData];

    await executeCsvProcessor(
      {
        operation: 'sort',
        data: testData,
        options: { sortColumn: 'name' },
      },
      mockContext
    );

    expect(testData).toEqual(original);
  });

  it('should require sortColumn option', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'sort',
        data: testData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should require array data', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'sort',
        data: { name: 'John' },
        options: { sortColumn: 'name' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Select Columns Operation Tests
// ============================================================================

describe('CsvProcessorTool - Select Columns Operation', () => {
  const testData = [
    { name: 'John', age: 30, city: 'NYC', email: 'john@example.com' },
    { name: 'Jane', age: 25, city: 'LA', email: 'jane@example.com' },
  ];

  it('should select specific columns', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'select_columns',
        data: testData,
        options: { columns: ['name', 'age'] },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const selected = result.data as any[];
    expect(selected[0]).toEqual({ name: 'John', age: 30 });
    expect(selected[0]).not.toHaveProperty('city');
    expect(selected[0]).not.toHaveProperty('email');
  });

  it('should select single column', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'select_columns',
        data: testData,
        options: { columns: ['name'] },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const selected = result.data as any[];
    expect(Object.keys(selected[0])).toEqual(['name']);
  });

  it('should handle non-existent columns', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'select_columns',
        data: testData,
        options: { columns: ['name', 'nonexistent'] },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const selected = result.data as any[];
    expect(selected[0].nonexistent).toBeUndefined();
  });

  it('should require columns option', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'select_columns',
        data: testData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should require array data', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'select_columns',
        data: { name: 'John' },
        options: { columns: ['name'] },
      },
      mockContext
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Transform Operation Tests
// ============================================================================

describe('CsvProcessorTool - Transform Operation', () => {
  const testData = [
    { name: 'john', age: 30 },
    { name: 'jane', age: 25 },
  ];

  it('should transform data (placeholder)', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'transform',
        data: testData,
        options: { transformFn: 'row => row' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    // Currently returns data as-is
    expect(result.data).toEqual(testData);
  });

  it('should require array data', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'transform',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('CsvProcessorTool - Edge Cases', () => {
  it('should handle CSV with BOM', async () => {
    const csvData = '\ufeffname,age\nJohn,30';

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle different newline formats', async () => {
    const csvData = 'name,age\r\nJohn,30\rJane,25\n';

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.data.length).toBeGreaterThan(0);
  });

  it('should handle unknown operation', async () => {
    const result = await executeCsvProcessor(
      {
        operation: 'unknown' as any,
        data: [],
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle mixed data types in columns', async () => {
    const csvData = `value
123
abc
456.78
true`;

    const result = await executeCsvProcessor(
      {
        operation: 'parse',
        data: csvData,
        options: { header: true, dynamicTyping: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });
});
