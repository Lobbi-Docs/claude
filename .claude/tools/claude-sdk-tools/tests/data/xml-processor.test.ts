/**
 * @claude-sdk/tools - XML Processor Tests
 * Comprehensive tests for XML parsing, JSON conversion, and querying
 */

import { describe, it, expect } from 'vitest';
import { executeXmlProcessor } from '../../src/tools/data/xml-processor.js';
import type { ToolContext } from '../../src/types/index.js';

// Mock context for tests
const mockContext: ToolContext = {
  sessionId: 'test-session',
  userId: 'test-user',
  timestamp: new Date(),
  metadata: {},
};

// ============================================================================
// Parse to JSON Operation Tests
// ============================================================================

describe('XmlProcessorTool - Parse to JSON Operation', () => {
  it('should parse simple XML to JSON', async () => {
    const xmlData = `<root><name>John</name><age>30</age></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.name).toBe('John');
    expect(parsed.root.age).toBe(30);
  });

  it('should parse XML with attributes', async () => {
    const xmlData = `<root><person id="1" role="admin">John</person></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
        options: { ignoreAttributes: false },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.person['@_id']).toBe(1);
    expect(parsed.root.person['@_role']).toBe('admin');
  });

  it('should ignore attributes when configured', async () => {
    const xmlData = `<root><person id="1">John</person></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
        options: { ignoreAttributes: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.person).toBe('John');
  });

  it('should parse nested XML', async () => {
    const xmlData = `
      <root>
        <user>
          <name>John</name>
          <address>
            <city>NYC</city>
            <zip>10001</zip>
          </address>
        </user>
      </root>
    `;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.user.name).toBe('John');
    expect(parsed.root.user.address.city).toBe('NYC');
  });

  it('should parse XML arrays', async () => {
    const xmlData = `
      <root>
        <item>Item 1</item>
        <item>Item 2</item>
        <item>Item 3</item>
      </root>
    `;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
        options: { arrayMode: false },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle empty XML tags', async () => {
    const xmlData = `<root><empty></empty><value>text</value></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle self-closing tags', async () => {
    const xmlData = `<root><item/><value>text</value></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle CDATA sections', async () => {
    const xmlData = `<root><![CDATA[This is CDATA content with <special> chars]]></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle XML declaration', async () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?><root><name>John</name></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
        options: { ignoreDeclaration: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.name).toBe('John');
  });

  it('should trim whitespace', async () => {
    const xmlData = `<root>  <name>  John  </name>  </root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
        options: { trimValues: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.name).toBe('John');
  });

  it('should handle invalid XML', async () => {
    const xmlData = `<root><unclosed>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle empty string', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: '',
      },
      mockContext
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// JSON to XML Operation Tests
// ============================================================================

describe('XmlProcessorTool - JSON to XML Operation', () => {
  it('should convert simple JSON to XML', async () => {
    const jsonData = {
      root: {
        name: 'John',
        age: 30,
      },
    };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('<root>');
    expect(result.data).toContain('<name>John</name>');
    expect(result.data).toContain('<age>30</age>');
  });

  it('should convert JSON with attributes', async () => {
    const jsonData = {
      root: {
        person: {
          '@_id': '1',
          '@_role': 'admin',
          '#text': 'John',
        },
      },
    };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
        options: { ignoreAttributes: false },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('id="1"');
    expect(result.data).toContain('role="admin"');
  });

  it('should format XML with indentation', async () => {
    const jsonData = {
      root: {
        child1: 'value1',
        child2: 'value2',
      },
    };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
        options: { format: true, indentBy: '  ' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('  ');
  });

  it('should convert nested JSON to XML', async () => {
    const jsonData = {
      root: {
        user: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
      },
    };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('<address>');
    expect(result.data).toContain('<city>NYC</city>');
  });

  it('should convert JSON arrays to XML', async () => {
    const jsonData = {
      root: {
        items: ['item1', 'item2', 'item3'],
      },
    };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('item1');
    expect(result.data).toContain('item2');
  });

  it('should handle empty object', async () => {
    const jsonData = { root: {} };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should suppress empty nodes when configured', async () => {
    const jsonData = {
      root: {
        empty: '',
        value: 'text',
      },
    };

    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: jsonData,
        options: { suppressEmptyNode: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should require object data', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: 'not an object',
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle null data', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: null,
      },
      mockContext
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Query Operation Tests
// ============================================================================

describe('XmlProcessorTool - Query Operation', () => {
  const xmlData = `
    <root>
      <users>
        <user>
          <name>John</name>
          <age>30</age>
        </user>
        <user>
          <name>Jane</name>
          <age>25</age>
        </user>
      </users>
      <metadata>
        <total>2</total>
      </metadata>
    </root>
  `;

  it('should query simple path', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'query',
        data: xmlData,
        options: { path: 'root.metadata.total' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(2);
  });

  it('should query nested path', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'query',
        data: xmlData,
        options: { path: 'root.users.user' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    // Result should contain user data
  });

  it('should handle array indexing', async () => {
    const arrayXml = `<root><items><item>first</item><item>second</item></items></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'query',
        data: arrayXml,
        options: { path: 'root.items.item[0]' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should return undefined for non-existent path', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'query',
        data: xmlData,
        options: { path: 'root.nonexistent' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('should require path option', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'query',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Transform Operation Tests
// ============================================================================

describe('XmlProcessorTool - Transform Operation', () => {
  it('should transform data (placeholder)', async () => {
    const xmlData = `<root><name>John</name></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'transform',
        data: xmlData,
        options: { transformFn: 'data => data' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    // Currently returns data as-is
  });

  it('should require transformFn option', async () => {
    const xmlData = `<root><name>John</name></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'transform',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('XmlProcessorTool - Edge Cases', () => {
  it('should handle XML with namespaces', async () => {
    const xmlData = `<root xmlns:custom="http://example.com"><custom:element>value</custom:element></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle special characters', async () => {
    const xmlData = `<root><text>&lt;special&gt; &amp; chars</text></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle unicode characters', async () => {
    const xmlData = `<root><emoji>😀</emoji><chinese>你好</chinese></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.root.emoji).toBe('😀');
  });

  it('should handle mixed content', async () => {
    const xmlData = `<root>Text before <tag>inner</tag> text after</root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle comments', async () => {
    const xmlData = `<root><!-- This is a comment --><value>text</value></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle processing instructions', async () => {
    const xmlData = `<?xml-stylesheet type="text/xsl" href="style.xsl"?><root><value>text</value></root>`;

    const result = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: xmlData,
        options: { ignorePiNode: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle unknown operation', async () => {
    const result = await executeXmlProcessor(
      {
        operation: 'unknown' as any,
        data: '<root/>',
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should round-trip XML to JSON and back', async () => {
    const originalXml = `<root><name>John</name><age>30</age></root>`;

    // Parse XML to JSON
    const parseResult = await executeXmlProcessor(
      {
        operation: 'parse_to_json',
        data: originalXml,
      },
      mockContext
    );

    expect(parseResult.success).toBe(true);

    // Convert JSON back to XML
    const stringifyResult = await executeXmlProcessor(
      {
        operation: 'json_to_xml',
        data: parseResult.data,
      },
      mockContext
    );

    expect(stringifyResult.success).toBe(true);
    expect(stringifyResult.data).toContain('<name>John</name>');
    expect(stringifyResult.data).toContain('<age>30</age>');
  });
});
