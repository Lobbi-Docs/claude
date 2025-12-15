#!/usr/bin/env node

/**
 * Awesome Copilot MCP Server
 *
 * Provides access to GitHub awesome-copilot repository resources including:
 * - Prompts for GitHub Copilot
 * - Instructions and configurations
 * - Agent definitions
 * - Collections of resources
 *
 * This MCP server allows Claude to access and utilize community-contributed
 * prompts, instructions, and configurations from the awesome-copilot repository.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { GitHubClient } from './clients/github.client.js';
import {
  AWESOME_COPILOT_TOOLS,
  ListResourcesSchema,
  GetResourceSchema,
  SearchSchema,
  GetPromptSchema,
  GetInstructionSchema,
  handleListResources,
  handleGetResource,
  handleSearch,
  handleGetPrompt,
  handleGetInstruction,
} from './tools/index.js';
import type { ServerConfig } from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: ServerConfig = {
  github: {
    owner: 'github',
    repo: 'awesome-copilot',
    branch: 'main',
    apiUrl: 'https://api.github.com',
    rawUrl: 'https://raw.githubusercontent.com',
  },
  cache: {
    enabled: false,
    ttl: 3600000, // 1 hour
  },
};

// ============================================================================
// Global State
// ============================================================================

let config: ServerConfig = DEFAULT_CONFIG;
let githubClient: GitHubClient;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the GitHub client
 */
function initializeClient(): void {
  githubClient = new GitHubClient(config.github);
}

// ============================================================================
// MCP Server Setup
// ============================================================================

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: 'awesome-copilot-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // ========================================================================
  // Tool Handlers
  // ========================================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: AWESOME_COPILOT_TOOLS,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'awesome_copilot_list_resources': {
          const listArgs = ListResourcesSchema.parse(args || {});
          const result = await handleListResources(githubClient, listArgs);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'awesome_copilot_get_resource': {
          const getArgs = GetResourceSchema.parse(args);
          const result = await handleGetResource(githubClient, getArgs);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'awesome_copilot_search': {
          const searchArgs = SearchSchema.parse(args);
          const result = await handleSearch(githubClient, searchArgs);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'awesome_copilot_get_prompt': {
          const promptArgs = GetPromptSchema.parse(args);
          const result = await handleGetPrompt(githubClient, promptArgs);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'awesome_copilot_get_instruction': {
          const instructionArgs = GetInstructionSchema.parse(args);
          const result = await handleGetInstruction(githubClient, instructionArgs);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: error.message,
              details: error.stack,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  // ========================================================================
  // Resource Handlers
  // ========================================================================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const resources = await githubClient.getRepositoryTree();
      return {
        resources: resources.map(resource => ({
          uri: `awesome-copilot://${resource.path}`,
          name: resource.name,
          description: `${resource.type} - ${resource.category || 'uncategorized'}`,
          mimeType: resource.path.endsWith('.md') ? 'text/markdown' : 'text/plain',
        })),
      };
    } catch (error: any) {
      console.error('Error listing resources:', error);
      return {
        resources: [],
      };
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const path = uri.replace('awesome-copilot://', '');

    try {
      const content = await githubClient.getFileContents(path);
      return {
        contents: [
          {
            uri,
            mimeType: path.endsWith('.md') ? 'text/markdown' : 'text/plain',
            text: content,
          },
        ],
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  });

  return server;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  // Initialize client
  initializeClient();

  // Create server
  const server = createServer();

  // Create transport
  const transport = new StdioServerTransport();

  // Connect and start
  await server.connect(transport);

  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║       Awesome Copilot MCP Server v1.0.0                      ║');
  console.error('║                                                               ║');
  console.error('║  Repository: github/awesome-copilot                          ║');
  console.error('║  Branch: main                                                ║');
  console.error('║                                                               ║');
  console.error('║  MCP Server running on stdio - Ready for Claude requests   ║');
  console.error('╚═══════════════════════════════════════════════════════════════╝');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

