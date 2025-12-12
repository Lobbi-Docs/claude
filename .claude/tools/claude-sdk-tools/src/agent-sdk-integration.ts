/**
 * @claude-sdk/tools - Claude Agent SDK Integration
 * Factory functions for creating in-process MCP tools compatible with Claude Agent SDK
 */

// Import all tool classes
import * as CoreTools from './tools/core/index.js';
import * as ApiTools from './tools/api/index.js';
import * as DataTools from './tools/data/index.js';
import * as SystemTools from './tools/system/index.js';
import * as SecurityTools from './tools/security/index.js';
import * as TestingTools from './tools/testing/index.js';

import type { ToolResult } from './types/index.js';

/**
 * Tool definition compatible with Claude Agent SDK's createSdkMcpServer
 */
export interface AgentSdkTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown) => Promise<ToolResult>;
}

/**
 * Convert a tool class to Claude Agent SDK format
 */
function toAgentSdkTool(
  toolClass: {
    name: string;
    description: string;
    schema: { _def?: { shape?: () => Record<string, unknown> } };
    execute: (input: unknown) => Promise<ToolResult>;
  },
  category: string
): AgentSdkTool {
  // Convert Zod schema to JSON Schema-like format
  const zodToJsonSchema = (zodSchema: unknown): Record<string, unknown> => {
    // Basic conversion - in production, use zod-to-json-schema
    if (typeof zodSchema === 'object' && zodSchema !== null) {
      const schema = zodSchema as { _def?: { shape?: () => Record<string, unknown>; typeName?: string } };
      if (schema._def?.typeName === 'ZodObject' && schema._def?.shape) {
        const shape = schema._def.shape();
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
          const fieldSchema = value as { _def?: { typeName?: string; description?: string } };
          properties[key] = {
            type: getJsonType(fieldSchema),
            description: fieldSchema._def?.description,
          };
          // Assume all fields are required unless optional
          if (!fieldSchema._def?.typeName?.includes('Optional')) {
            required.push(key);
          }
        }

        return {
          type: 'object',
          properties,
          required,
        };
      }
    }
    return { type: 'object' };
  };

  const getJsonType = (zodField: { _def?: { typeName?: string } }): string => {
    const typeName = zodField._def?.typeName || '';
    if (typeName.includes('String')) return 'string';
    if (typeName.includes('Number')) return 'number';
    if (typeName.includes('Boolean')) return 'boolean';
    if (typeName.includes('Array')) return 'array';
    if (typeName.includes('Object')) return 'object';
    return 'string';
  };

  return {
    name: `${category}_${toolClass.name}`,
    description: toolClass.description,
    inputSchema: zodToJsonSchema(toolClass.schema),
    execute: toolClass.execute,
  };
}

/**
 * Get all tools for a specific category
 */
export function getCategoryTools(category: 'core' | 'api' | 'data' | 'system' | 'security' | 'testing'): AgentSdkTool[] {
  const modules: Record<string, Record<string, unknown>> = {
    core: CoreTools,
    api: ApiTools,
    data: DataTools,
    system: SystemTools,
    security: SecurityTools,
    testing: TestingTools,
  };

  const module = modules[category];
  if (!module) return [];

  const tools: AgentSdkTool[] = [];

  for (const value of Object.values(module)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      'description' in value &&
      'schema' in value &&
      'execute' in value
    ) {
      tools.push(toAgentSdkTool(value as Parameters<typeof toAgentSdkTool>[0], category));
    }
  }

  return tools;
}

/**
 * Get all available tools across all categories
 */
export function getAllTools(): AgentSdkTool[] {
  const categories: Array<'core' | 'api' | 'data' | 'system' | 'security' | 'testing'> = [
    'core',
    'api',
    'data',
    'system',
    'security',
    'testing',
  ];

  return categories.flatMap((category) => getCategoryTools(category));
}

/**
 * Get specific tools by name
 */
export function getToolsByName(names: string[]): AgentSdkTool[] {
  const allTools = getAllTools();
  return allTools.filter((tool) => names.includes(tool.name));
}

/**
 * Tool manifest for Claude Agent SDK registration
 */
export function getToolManifest(): {
  name: string;
  version: string;
  description: string;
  tools: Array<{ name: string; description: string; category: string }>;
} {
  const allTools = getAllTools();

  return {
    name: '@claude-sdk/tools',
    version: '1.0.0',
    description: 'Comprehensive custom tools library for Claude Agent SDK - 35+ production-ready tools',
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.name.split('_')[0],
    })),
  };
}

/**
 * Example usage with Claude Agent SDK:
 *
 * ```typescript
 * import Anthropic from '@anthropic-ai/sdk';
 * import { createSdkMcpServer, tool } from '@anthropic-ai/sdk/mcp';
 * import { getAllTools } from '@claude-sdk/tools';
 *
 * const client = new Anthropic();
 * const tools = getAllTools();
 *
 * // Register tools with the SDK
 * const server = createSdkMcpServer({
 *   tools: tools.map(t => tool(t.name, t.inputSchema, async (input) => {
 *     const result = await t.execute(input);
 *     return JSON.stringify(result);
 *   })),
 * });
 *
 * // Use with Claude
 * const response = await client.messages.create({
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: 1024,
 *   tools: server.tools,
 *   messages: [{ role: 'user', content: 'Calculate the SHA-256 hash of "hello"' }],
 * });
 * ```
 */
