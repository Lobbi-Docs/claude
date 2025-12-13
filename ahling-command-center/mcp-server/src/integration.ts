/**
 * Integration Module
 * Initializes and integrates Neo4j and Qdrant clients with the MCP server
 */

import { getNeo4jClient } from './clients/neo4j.client.js';
import { getQdrantClient } from './clients/qdrant.client.js';
import { knowledgeTools } from './tools/knowledge/index.js';
import type { EnvironmentConfig } from './types/index.js';

/**
 * Initialize knowledge clients (Neo4j and Qdrant)
 */
export async function initializeKnowledgeClients(config: EnvironmentConfig): Promise<void> {
  console.error('Initializing knowledge clients...');

  try {
    // Initialize Neo4j client
    const neo4jClient = getNeo4jClient({
      uri: config.neo4j.uri,
      username: config.neo4j.username,
      password: config.neo4j.password,
      database: config.neo4j.database,
      maxConnectionPoolSize: config.neo4j.maxConnectionPoolSize
    });
    await neo4jClient.connect();
    console.error('✓ Neo4j client initialized');

    // Verify Neo4j connection
    const neo4jHealth = await neo4jClient.healthCheck();
    if (!neo4jHealth.healthy) {
      throw new Error(`Neo4j health check failed: ${neo4jHealth.message}`);
    }
    console.error('✓ Neo4j connection verified');

    // Initialize Qdrant client
    const qdrantClient = getQdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      timeout: config.qdrant.timeout
    });
    console.error('✓ Qdrant client initialized');

    // Verify Qdrant connection
    const qdrantHealth = await qdrantClient.healthCheck();
    if (!qdrantHealth.healthy) {
      throw new Error(`Qdrant health check failed: ${qdrantHealth.message}`);
    }
    console.error('✓ Qdrant connection verified');

    console.error('All knowledge clients initialized successfully');
  } catch (error) {
    console.error('Failed to initialize knowledge clients:', error);
    throw error;
  }
}

/**
 * Cleanup knowledge clients
 */
export async function cleanupKnowledgeClients(): Promise<void> {
  try {
    const neo4jClient = getNeo4jClient();
    await neo4jClient.close();
    console.error('✓ Neo4j client closed');
  } catch (error) {
    console.error('Error closing Neo4j client:', error);
  }
}

/**
 * Get knowledge tools for MCP registration
 */
export function getKnowledgeTools() {
  return Object.entries(knowledgeTools).map(([name, tool]) => {
    const shape = tool.schema.shape as Record<string, { _def?: { defaultValue?: unknown }; isOptional?: () => boolean }>;
    return {
      name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: shape,
        required: Object.keys(shape).filter(
          key => !shape[key]?._def?.defaultValue && !shape[key]?.isOptional?.()
        )
      }
    };
  });
}

/**
 * Handle knowledge tool calls
 */
export async function handleKnowledgeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = knowledgeTools[name as keyof typeof knowledgeTools];

  if (!tool) {
    throw new Error(`Unknown knowledge tool: ${name}`);
  }

  // Validate arguments
  const validatedArgs = tool.schema.parse(args);

  // Execute the tool - type assertion needed due to union type complexity
  return await (tool.handler as (args: unknown) => Promise<unknown>)(validatedArgs);
}

/**
 * Check if a tool name is a knowledge tool
 */
export function isKnowledgeTool(name: string): boolean {
  return name in knowledgeTools;
}
