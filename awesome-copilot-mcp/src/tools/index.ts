/**
 * Awesome Copilot MCP Tools
 * 
 * Provides tools to access and search awesome-copilot repository resources
 */

import { z } from 'zod';
import type { GitHubClient } from '../clients/github.client.js';
import type { AwesomeCopilotResource, AwesomeCopilotSearchResult } from '../types/index.js';

/**
 * Tool definitions for awesome-copilot MCP server
 */
export const AWESOME_COPILOT_TOOLS = [
  {
    name: 'awesome_copilot_list_resources',
    description: 'List all resources (prompts, instructions, agents, collections) from awesome-copilot repository. Optionally filter by type or category.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['prompt', 'instruction', 'config', 'agent', 'collection', 'all'],
          description: 'Filter by resource type. Use "all" to get all resources.',
          default: 'all',
        },
        category: {
          type: 'string',
          description: 'Filter by category (e.g., "prompts", "instructions", "agents", "collections")',
        },
        path: {
          type: 'string',
          description: 'Specific directory path to list (e.g., "prompts", "instructions/web")',
        },
      },
    },
  },
  {
    name: 'awesome_copilot_get_resource',
    description: 'Get the contents of a specific resource file from awesome-copilot repository.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the resource file (e.g., "prompts/web-development.md", "instructions/code-review.md")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'awesome_copilot_search',
    description: 'Search for resources in awesome-copilot repository by name, path, or content.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (searches in file names and paths)',
        },
        type: {
          type: 'string',
          enum: ['prompt', 'instruction', 'config', 'agent', 'collection', 'all'],
          description: 'Filter results by resource type',
          default: 'all',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'awesome_copilot_get_prompt',
    description: 'Get a specific prompt from the prompts directory. Convenience method for accessing prompts.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the prompt file (with or without .md extension, e.g., "web-development" or "web-development.md")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'awesome_copilot_get_instruction',
    description: 'Get a specific instruction from the instructions directory. Convenience method for accessing instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the instruction file (with or without .md extension, e.g., "code-review" or "code-review.md")',
        },
      },
      required: ['name'],
    },
  },
];

/**
 * Tool handler schemas for validation
 */
export const ListResourcesSchema = z.object({
  type: z.enum(['prompt', 'instruction', 'config', 'agent', 'collection', 'all']).optional().default('all'),
  category: z.string().optional(),
  path: z.string().optional(),
});

export const GetResourceSchema = z.object({
  path: z.string(),
});

export const SearchSchema = z.object({
  query: z.string(),
  type: z.enum(['prompt', 'instruction', 'config', 'agent', 'collection', 'all']).optional().default('all'),
});

export const GetPromptSchema = z.object({
  name: z.string(),
});

export const GetInstructionSchema = z.object({
  name: z.string(),
});

/**
 * Handle awesome_copilot_list_resources tool
 */
export async function handleListResources(
  client: GitHubClient,
  args: z.infer<typeof ListResourcesSchema>
): Promise<{ resources: AwesomeCopilotResource[]; total: number }> {
  let resources: AwesomeCopilotResource[];

  if (args.path) {
    resources = await client.listDirectory(args.path);
  } else {
    resources = await client.getRepositoryTree();
  }

  // Filter by type
  if (args.type && args.type !== 'all') {
    resources = resources.filter(r => r.type === args.type);
  }

  // Filter by category
  if (args.category) {
    resources = resources.filter(r => r.category === args.category);
  }

  return {
    resources,
    total: resources.length,
  };
}

/**
 * Handle awesome_copilot_get_resource tool
 */
export async function handleGetResource(
  client: GitHubClient,
  args: z.infer<typeof GetResourceSchema>
): Promise<{ path: string; content: string; type: string }> {
  const content = await client.getFileContents(args.path);
  
  // Determine type from path
  let type = 'other';
  if (args.path.includes('/prompts/')) type = 'prompt';
  else if (args.path.includes('/instructions/')) type = 'instruction';
  else if (args.path.includes('/agents/')) type = 'agent';
  else if (args.path.includes('/collections/')) type = 'collection';
  else if (args.path.match(/\.(json|yaml|yml|toml)$/i)) type = 'config';

  return {
    path: args.path,
    content,
    type,
  };
}

/**
 * Handle awesome_copilot_search tool
 */
export async function handleSearch(
  client: GitHubClient,
  args: z.infer<typeof SearchSchema>
): Promise<AwesomeCopilotSearchResult> {
  const resources = await client.searchFiles(args.query);

  // Filter by type if specified
  let filtered = resources;
  if (args.type && args.type !== 'all') {
    filtered = resources.filter(r => r.type === args.type);
  }

  return {
    resources: filtered,
    total: filtered.length,
    query: args.query,
  };
}

/**
 * Handle awesome_copilot_get_prompt tool
 */
export async function handleGetPrompt(
  client: GitHubClient,
  args: z.infer<typeof GetPromptSchema>
): Promise<{ path: string; content: string }> {
  const name = args.name.endsWith('.md') ? args.name : `${args.name}.md`;
  const path = `prompts/${name}`;
  
  try {
    const content = await client.getFileContents(path);
    return { path, content };
  } catch (error: any) {
    // Only retry with alternative path if the error is "File not found" (404)
    // Re-throw other errors (timeout, network issues, etc.) to avoid returning wrong files
    if (error.message?.includes('File not found')) {
      // Try without .md extension
      const altPath = `prompts/${args.name}`;
      try {
        const content = await client.getFileContents(altPath);
        return { path: altPath, content };
      } catch (altError: any) {
        // If alternative path also fails, throw original error
        throw error;
      }
    }
    // Re-throw non-404 errors (timeout, network issues, etc.)
    throw error;
  }
}

/**
 * Handle awesome_copilot_get_instruction tool
 */
export async function handleGetInstruction(
  client: GitHubClient,
  args: z.infer<typeof GetInstructionSchema>
): Promise<{ path: string; content: string }> {
  const name = args.name.endsWith('.md') ? args.name : `${args.name}.md`;
  const path = `instructions/${name}`;
  
  try {
    const content = await client.getFileContents(path);
    return { path, content };
  } catch (error: any) {
    // Only retry with alternative path if the error is "File not found" (404)
    // Re-throw other errors (timeout, network issues, etc.) to avoid returning wrong files
    if (error.message?.includes('File not found')) {
      // Try without .md extension
      const altPath = `instructions/${args.name}`;
      try {
        const content = await client.getFileContents(altPath);
        return { path: altPath, content };
      } catch (altError: any) {
        // If alternative path also fails, throw original error
        throw error;
      }
    }
    // Re-throw non-404 errors (timeout, network issues, etc.)
    throw error;
  }
}

