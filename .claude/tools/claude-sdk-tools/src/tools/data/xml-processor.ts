/**
 * @claude-sdk/tools - XML Processor Tool
 * Parse XML to JSON, JSON to XML, query, and transform XML data
 */

import { z } from 'zod';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError, ToolError } from '../../types/errors.js';
import type { ToolResult, ToolContext, ToolDefinition } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const XmlProcessorSchema = z.object({
  operation: z.enum([
    'parse_to_json',
    'json_to_xml',
    'query',
    'transform',
  ]),
  data: z.unknown(),
  options: z
    .object({
      // Parser options
      ignoreAttributes: z.boolean().default(false),
      attributeNamePrefix: z.string().default('@_'),
      textNodeName: z.string().default('#text'),
      ignoreDeclaration: z.boolean().default(false),
      ignorePiNode: z.boolean().default(false),
      parseTagValue: z.boolean().default(true),
      parseAttributeValue: z.boolean().default(true),
      trimValues: z.boolean().default(true),
      cdataTagName: z.string().optional(),
      cdataPositionChar: z.string().default('\\c'),
      parseTrueNumberOnly: z.boolean().default(false),
      arrayMode: z.boolean().default(false),
      stopNodes: z.array(z.string()).optional(),

      // Builder options
      format: z.boolean().default(true),
      indentBy: z.string().default('  '),
      suppressEmptyNode: z.boolean().default(false),
      suppressUnpairedNode: z.boolean().default(true),
      suppressBooleanAttributes: z.boolean().default(true),
      tagValueProcessor: z.string().optional(),
      attributeValueProcessor: z.string().optional(),

      // Query options
      path: z.string().optional(), // Simple path like 'root.child.item'

      // Transform options
      transformFn: z.string().optional(),
    })
    .optional(),
});

export type XmlProcessorInput = z.infer<typeof XmlProcessorSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

export const xmlProcessorTool: ToolDefinition<XmlProcessorInput, unknown> = {
  name: 'xml_processor',
  description: 'Process XML data with operations: parse_to_json, json_to_xml, query (simple path), transform',
  version: '1.0.0',
  category: 'data',
  schema: XmlProcessorSchema as any, // Type assertion to work around optional field defaults
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Query JSON object by path
 */
function queryByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    // Handle array indexing like 'items[0]'
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleParseToJson(
  input: XmlProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  try {
    const xmlString = typeof input.data === 'string' ? input.data : String(input.data);

    const parser = new XMLParser({
      ignoreAttributes: input.options?.ignoreAttributes ?? false,
      attributeNamePrefix: input.options?.attributeNamePrefix ?? '@_',
      textNodeName: input.options?.textNodeName ?? '#text',
      ignoreDeclaration: input.options?.ignoreDeclaration ?? false,
      parseTagValue: input.options?.parseTagValue ?? true,
      parseAttributeValue: input.options?.parseAttributeValue ?? true,
      trimValues: input.options?.trimValues ?? true,
      isArray: () => input.options?.arrayMode ?? false,
      stopNodes: input.options?.stopNodes,
    });

    const result = parser.parse(xmlString);
    return result;
  } catch (error) {
    throw new ValidationError(
      `Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`,
      ['data'],
      input.data,
      'valid XML string'
    );
  }
}

async function handleJsonToXml(
  input: XmlProcessorInput,
  _context: ToolContext
): Promise<string> {
  try {
    if (typeof input.data !== 'object' || input.data === null) {
      throw new ValidationError(
        'JSON to XML requires object data',
        ['data'],
        typeof input.data,
        'object'
      );
    }

    const builder = new XMLBuilder({
      ignoreAttributes: input.options?.ignoreAttributes ?? false,
      attributeNamePrefix: input.options?.attributeNamePrefix ?? '@_',
      textNodeName: input.options?.textNodeName ?? '#text',
      format: input.options?.format ?? true,
      indentBy: input.options?.indentBy ?? '  ',
      suppressEmptyNode: input.options?.suppressEmptyNode ?? false,
      suppressUnpairedNode: input.options?.suppressUnpairedNode ?? true,
      suppressBooleanAttributes: input.options?.suppressBooleanAttributes ?? true,
    });

    const xmlString = builder.build(input.data);
    return xmlString;
  } catch (error) {
    throw new ToolError(
      `Failed to convert JSON to XML: ${error instanceof Error ? error.message : String(error)}`,
      'JSON_TO_XML_ERROR'
    );
  }
}

async function handleQuery(
  input: XmlProcessorInput,
  context: ToolContext
): Promise<unknown> {
  if (!input.options?.path) {
    throw new ValidationError(
      'Query operation requires a path in options.path',
      ['options', 'path'],
      undefined,
      'object path string'
    );
  }

  try {
    // First parse XML to JSON
    const parsed = await handleParseToJson(input, context);

    // Then query the result
    const result = queryByPath(parsed, input.options.path);
    return result;
  } catch (error) {
    throw new ToolError(
      `XML query failed: ${error instanceof Error ? error.message : String(error)}`,
      'QUERY_ERROR',
      { path: input.options.path }
    );
  }
}

async function handleTransform(
  input: XmlProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  if (!input.options?.transformFn) {
    throw new ValidationError(
      'Transform operation requires transformFn in options',
      ['options', 'transformFn'],
      undefined,
      'transform function'
    );
  }

  try {
    // In production, implement safe transform function evaluation
    // For now, return data as-is
    return input.data;
  } catch (error) {
    throw new ToolError(
      `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
      'TRANSFORM_ERROR'
    );
  }
}

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeXmlProcessor(
  input: XmlProcessorInput,
  context: ToolContext
): Promise<ToolResult<unknown>> {
  return wrapExecution('xml_processor', async (input, context) => {
    switch (input.operation) {
      case 'parse_to_json':
        return handleParseToJson(input, context);
      case 'json_to_xml':
        return handleJsonToXml(input, context);
      case 'query':
        return handleQuery(input, context);
      case 'transform':
        return handleTransform(input, context);
      default:
        throw new ValidationError(
          `Unknown operation: ${(input as { operation: string }).operation}`,
          ['operation'],
          (input as { operation: string }).operation,
          'parse_to_json|json_to_xml|query|transform'
        );
    }
  }, input, context);
}
