/**
 * @claude-sdk/tools - MCP Server Factory
 * Creates an MCP server with all custom tools registered
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import all tools
import * as CoreTools from './tools/core/index.js';
import * as ApiTools from './tools/api/index.js';
import * as DataTools from './tools/data/index.js';
import * as SystemTools from './tools/system/index.js';
import * as SecurityTools from './tools/security/index.js';
import * as TestingTools from './tools/testing/index.js';

/**
 * Tool registry mapping tool names to their implementations
 */
interface ToolEntry {
  name: string;
  description: string;
  schema: unknown;
  execute: (input: unknown) => Promise<unknown>;
}

/**
 * Build the complete tool registry from all tool modules
 */
function buildToolRegistry(): Map<string, ToolEntry> {
  const registry = new Map<string, ToolEntry>();

  // Helper to register tools from a module
  const registerModule = (module: Record<string, unknown>, prefix: string) => {
    for (const [_key, value] of Object.entries(module)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'name' in value &&
        'description' in value &&
        'schema' in value &&
        'execute' in value
      ) {
        const tool = value as ToolEntry;
        registry.set(`${prefix}_${tool.name}`, {
          name: `${prefix}_${tool.name}`,
          description: tool.description,
          schema: tool.schema,
          execute: tool.execute as (input: unknown) => Promise<unknown>,
        });
      }
    }
  };

  // Register all tool categories
  registerModule(CoreTools, 'core');
  registerModule(ApiTools, 'api');
  registerModule(DataTools, 'data');
  registerModule(SystemTools, 'system');
  registerModule(SecurityTools, 'security');
  registerModule(TestingTools, 'testing');

  return registry;
}

/**
 * Create and configure the MCP server
 */
export function createMCPServer(options?: {
  name?: string;
  version?: string;
}) {
  const serverName = options?.name ?? 'claude-sdk-tools';
  const serverVersion = options?.version ?? '1.0.0';

  const server = new Server(
    {
      name: serverName,
      version: serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const toolRegistry = buildToolRegistry();

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Array.from(toolRegistry.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
    }));

    return { tools };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = toolRegistry.get(name);
    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'TOOL_NOT_FOUND',
                message: `Tool "${name}" not found`,
              },
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.execute(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'EXECUTION_ERROR',
                message: errorMessage,
              },
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('Claude SDK Tools MCP Server started');

  // Handle shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch(console.error);
}
