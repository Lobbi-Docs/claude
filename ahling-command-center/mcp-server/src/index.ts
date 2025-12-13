#!/usr/bin/env node

/**
 * Ahling Command Center MCP Server
 *
 * Central orchestration server implementing the Intelligence Trinity:
 * - Ollama (local LLM inference with ROCm GPU support)
 * - Home Assistant (smart home automation via REST + WebSocket)
 * - Microsoft Agent Framework integration points
 *
 * Additional integrations:
 * - HashiCorp Vault (secrets management)
 * - Neo4j (knowledge graph)
 * - Qdrant (vector database for semantic search)
 * - Docker (container lifecycle management)
 *
 * This MCP server provides a unified interface for Claude to interact
 * with all command center services through the Model Context Protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  loadConfig,
  printConfigSummary,
  checkRequiredEnvVars,
  printEnvVarGuide,
} from './config.js';
import type { ServerConfig } from './types.js';

// Import clients
import { OllamaClient } from './clients/ollama.client.js';
import { VaultClient, VaultKVVersion } from './clients/vault.client.js';
import { getNeo4jClient } from './clients/neo4j.client.js';
import { getQdrantClient } from './clients/qdrant.client.js';

// Import tool handlers
import { dockerTools, handleDockerTool } from './tools/docker/index.js';
import { OLLAMA_TOOLS, handleOllamaTool } from './tools/ollama/index.js';
import { HomeAssistantTools } from './tools/homeassistant/index.js';
import { getVaultToolDefinitions } from './tools/vault/index.js';
import { knowledgeTools } from './tools/knowledge/index.js';

// ============================================================================
// Global State
// ============================================================================

let config: ServerConfig;
let ollamaClient: OllamaClient;
let haTools: HomeAssistantTools;
let vaultClient: VaultClient;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize all service clients
 */
async function initializeClients(): Promise<void> {
  console.error('Initializing service clients...');

  try {
    // Initialize Ollama client (Intelligence Trinity)
    ollamaClient = new OllamaClient({
      baseURL: config.ollama.url,
      timeout: config.ollama.timeout || 300000,
    });

    try {
      const ollamaHealth = await ollamaClient.healthCheck();
      console.error(`✓ Ollama client initialized (${ollamaHealth.status}, ${ollamaHealth.models_loaded} models, GPU: ${ollamaHealth.gpu_available})`);
    } catch (error) {
      console.error('⚠ Ollama client initialized but health check failed - will retry on first request');
    }

    // Initialize Home Assistant client (Intelligence Trinity)
    haTools = new HomeAssistantTools({
      url: config.homeAssistant.url,
      token: config.homeAssistant.token,
      // WebSocket URL is derived from the main URL by the client
    });
    console.error('✓ Home Assistant tools initialized');

    // Initialize Vault client (Secrets Management)
    if (config.vault.addr && config.vault.token) {
      vaultClient = new VaultClient(
        {
          address: config.vault.addr,
          token: config.vault.token,
          namespace: config.vault.namespace,
        },
        VaultKVVersion.V2,
        'secret'
      );

      try {
        const vaultHealth = await vaultClient.healthCheck();
        console.error(`✓ Vault client initialized (version: ${vaultHealth.version}, sealed: ${vaultHealth.sealed})`);
      } catch (error) {
        console.error('⚠ Vault client initialized but health check failed - service may be unavailable');
      }
    } else {
      console.error('⚠ Vault client skipped - VAULT_ADDR or VAULT_TOKEN not configured');
    }

    // Initialize Neo4j client (Knowledge Graph)
    if (config.neo4j.url && config.neo4j.username && config.neo4j.password) {
      getNeo4jClient({
        uri: config.neo4j.url,
        username: config.neo4j.username,
        password: config.neo4j.password,
        database: config.neo4j.database,
      });
      console.error('✓ Neo4j client initialized');
    } else {
      console.error('⚠ Neo4j client skipped - NEO4J_URL, NEO4J_USERNAME, or NEO4J_PASSWORD not configured');
    }

    // Initialize Qdrant client (Vector Database)
    if (config.qdrant.url) {
      getQdrantClient({
        url: config.qdrant.url,
        apiKey: config.qdrant.apiKey,
      });
      console.error('✓ Qdrant client initialized');
    } else {
      console.error('⚠ Qdrant client skipped - QDRANT_URL not configured');
    }

    console.error('Service client initialization complete');
  } catch (error) {
    console.error('Failed to initialize service clients:', error);
    throw error;
  }
}

/**
 * Cleanup all service clients
 */
async function cleanupClients(): Promise<void> {
  console.error('Cleaning up service clients...');

  try {
    // Cleanup Home Assistant subscriptions
    if (haTools) {
      await haTools.cleanup();
    }

    // Cleanup Neo4j connections
    try {
      const neo4j = getNeo4jClient();
      await neo4j.close();
    } catch {
      // Neo4j may not have been initialized
    }

    console.error('All service clients cleaned up successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// ============================================================================
// MCP Tool Definitions
// ============================================================================

/**
 * Get all available MCP tools
 */
function getTools() {
  const tools: any[] = [];

  // Docker Tools (6 tools)
  tools.push(...dockerTools);

  // Ollama Tools (6 tools - Intelligence Trinity)
  tools.push(...OLLAMA_TOOLS);

  // Home Assistant Tools (11 tools - Intelligence Trinity)
  const haToolDefs = haTools.getTools();
  tools.push(...haToolDefs.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: 'object' as const,
      properties: tool.inputSchema.shape
        ? Object.fromEntries(
            Object.entries(tool.inputSchema.shape).map(([key, value]: [string, any]) => [
              key,
              { type: 'string', description: value.description || key }
            ])
          )
        : {},
      required: [],
    },
  })));

  // Vault Tools (4 tools)
  tools.push(...getVaultToolDefinitions());

  // Knowledge Tools (4 tools - Neo4j + Qdrant + RAG)
  tools.push(
    {
      name: 'neo4j_query',
      description: 'Execute a Cypher query against Neo4j graph database for knowledge graph operations',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cypher: { type: 'string', description: 'Cypher query to execute' },
          parameters: { type: 'object', description: 'Query parameters' },
          database: { type: 'string', description: 'Database name (default: neo4j)' },
          readOnly: { type: 'boolean', description: 'Execute as read-only query (default: true)' },
        },
        required: ['cypher'],
      },
    },
    {
      name: 'qdrant_search',
      description: 'Search Qdrant vector database for similar vectors using semantic search',
      inputSchema: {
        type: 'object' as const,
        properties: {
          collection: { type: 'string', description: 'Collection name to search' },
          queryVector: { type: 'array', items: { type: 'number' }, description: 'Query vector for similarity search' },
          limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
          filter: { type: 'object', description: 'Filter conditions' },
          scoreThreshold: { type: 'number', description: 'Minimum similarity score threshold' },
        },
        required: ['collection', 'queryVector'],
      },
    },
    {
      name: 'rag_query',
      description: 'Retrieve relevant documents from Qdrant and generate an answer using Ollama (RAG pipeline)',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Natural language query' },
          collection: { type: 'string', description: 'Qdrant collection to search' },
          limit: { type: 'number', description: 'Number of documents to retrieve (default: 5)' },
          ollamaModel: { type: 'string', description: 'Ollama model for generation (default: llama2)' },
          embeddingModel: { type: 'string', description: 'Ollama embedding model (default: nomic-embed-text)' },
          systemPrompt: { type: 'string', description: 'System prompt for RAG generation' },
        },
        required: ['query', 'collection'],
      },
    },
    {
      name: 'knowledge_ingest',
      description: 'Ingest text content by chunking, embedding, and storing in Qdrant (and optionally Neo4j)',
      inputSchema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Text content to ingest' },
          collection: { type: 'string', description: 'Qdrant collection name' },
          metadata: { type: 'object', description: 'Metadata to attach to chunks' },
          chunkSize: { type: 'number', description: 'Maximum characters per chunk (default: 500)' },
          chunkOverlap: { type: 'number', description: 'Overlap between chunks (default: 50)' },
          storeInNeo4j: { type: 'boolean', description: 'Also store chunks in Neo4j' },
        },
        required: ['text', 'collection'],
      },
    }
  );

  // Orchestration Tools
  tools.push({
    name: 'orchestrate_trinity',
    description: 'Execute a coordinated task across the Intelligence Trinity (Ollama + Home Assistant + Knowledge Stack)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'Task description' },
        context: { type: 'object', description: 'Additional context for the task' },
        useRag: { type: 'boolean', description: 'Include RAG knowledge retrieval' },
        targetDevices: { type: 'array', items: { type: 'string' }, description: 'Home Assistant entities to control' },
      },
      required: ['task'],
    },
  });

  return tools;
}

// ============================================================================
// MCP Resource Definitions
// ============================================================================

/**
 * Get all available MCP resources
 */
function getResources() {
  return [
    {
      uri: 'vault://secrets',
      name: 'Vault Secrets',
      description: 'List of available secrets in Vault',
      mimeType: 'application/json',
    },
    {
      uri: 'ha://entities',
      name: 'Home Assistant Entities',
      description: 'List of all Home Assistant entities',
      mimeType: 'application/json',
    },
    {
      uri: 'ha://areas',
      name: 'Home Assistant Areas',
      description: 'List of all Home Assistant areas',
      mimeType: 'application/json',
    },
    {
      uri: 'neo4j://graph',
      name: 'Knowledge Graph Overview',
      description: 'Overview of the knowledge graph schema and statistics',
      mimeType: 'application/json',
    },
    {
      uri: 'qdrant://collections',
      name: 'Qdrant Collections',
      description: 'List of Qdrant vector collections',
      mimeType: 'application/json',
    },
    {
      uri: 'ollama://models',
      name: 'Ollama Models',
      description: 'List of available Ollama models',
      mimeType: 'application/json',
    },
    {
      uri: 'docker://containers',
      name: 'Docker Containers',
      description: 'List of Docker containers',
      mimeType: 'application/json',
    },
  ];
}

// ============================================================================
// MCP Prompt Definitions
// ============================================================================

/**
 * Get all available MCP prompts
 */
function getPrompts() {
  return [
    {
      name: 'automation_wizard',
      description: 'Guide for creating Home Assistant automations with natural language',
      arguments: [
        {
          name: 'goal',
          description: 'What you want to automate',
          required: true,
        },
      ],
    },
    {
      name: 'knowledge_query',
      description: 'Query the knowledge graph with natural language using RAG',
      arguments: [
        {
          name: 'question',
          description: 'Your question about the knowledge graph',
          required: true,
        },
      ],
    },
    {
      name: 'device_control',
      description: 'Natural language control of smart home devices',
      arguments: [
        {
          name: 'command',
          description: 'What you want to do (e.g., "turn on living room lights")',
          required: true,
        },
      ],
    },
    {
      name: 'system_status',
      description: 'Get comprehensive status of all Command Center services',
      arguments: [],
    },
  ];
}

// ============================================================================
// MCP Request Handlers
// ============================================================================

/**
 * Handle tool execution
 */
async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  console.error(`Executing tool: ${name}`);

  // Docker tools
  if (name.startsWith('docker_')) {
    return handleDockerTool(name, args);
  }

  // Ollama tools
  if (name.startsWith('ollama_')) {
    return handleOllamaTool(ollamaClient, name, args);
  }

  // Home Assistant tools
  if (name.startsWith('ha_')) {
    return haTools.executeTool(name, args);
  }

  // Vault tools
  if (name.startsWith('vault_')) {
    if (!vaultClient) {
      throw new Error('Vault client not initialized - check VAULT_ADDR and VAULT_TOKEN');
    }

    switch (name) {
      case 'vault_read':
        const readResult = await vaultClient.read(args['path'] as string, {
          version: args['version'] as number | undefined,
        });
        return { success: true, data: readResult.data, metadata: readResult.metadata };

      case 'vault_write':
        const writeResult = await vaultClient.write(
          args['path'] as string,
          args['data'] as Record<string, any>,
          { cas: args['cas'] as number | undefined }
        );
        return { success: true, message: 'Secret written', metadata: writeResult };

      case 'vault_list':
        const listResult = await vaultClient.list(args['path'] as string);
        return { success: true, keys: listResult.keys };

      case 'vault_delete':
        await vaultClient.delete(args['path'] as string, {
          versions: args['versions'] as number[] | undefined,
        });
        return { success: true, message: 'Secret deleted' };

      default:
        throw new Error(`Unknown Vault tool: ${name}`);
    }
  }

  // Knowledge tools (Neo4j + Qdrant + RAG)
  if (name === 'neo4j_query') {
    return knowledgeTools.neo4j_query.handler(args as any);
  }
  if (name === 'qdrant_search') {
    return knowledgeTools.qdrant_search.handler(args as any);
  }
  if (name === 'rag_query') {
    return knowledgeTools.rag_query.handler(args as any);
  }
  if (name === 'knowledge_ingest') {
    return knowledgeTools.knowledge_ingest.handler(args as any);
  }

  // Orchestration tool
  if (name === 'orchestrate_trinity') {
    return handleTrinityOrchestration(args);
  }

  throw new Error(`Unknown tool: ${name}`);
}

/**
 * Handle Intelligence Trinity orchestration
 */
async function handleTrinityOrchestration(args: Record<string, unknown>): Promise<unknown> {
  const task = args['task'] as string;
  const context = args['context'] as Record<string, unknown> | undefined;
  const useRag = args['useRag'] as boolean | undefined;
  const targetDevices = args['targetDevices'] as string[] | undefined;

  const results: Record<string, unknown> = {
    task,
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // Step 1: If RAG enabled, gather knowledge context
    if (useRag) {
      try {
        const ragResult = await knowledgeTools.rag_query.handler({
          query: task,
          collection: config.qdrant.defaultCollection,
          limit: 3,
          ollamaModel: config.ollama.defaultModel,
          ollamaUrl: config.ollama.url,
          embeddingModel: 'nomic-embed-text',
        });
        (results.steps as any[]).push({ step: 'rag', success: true, data: ragResult });
      } catch (error) {
        (results.steps as any[]).push({ step: 'rag', success: false, error: String(error) });
      }
    }

    // Step 2: Use Ollama to interpret the task
    const interpretPrompt = `You are the Ahling Command Center AI assistant.
Task: ${task}
${context ? `Context: ${JSON.stringify(context)}` : ''}
${targetDevices ? `Target devices: ${targetDevices.join(', ')}` : ''}

Provide a brief response about how to accomplish this task.`;

    const ollamaResult = await ollamaClient.generate({
      model: config.ollama.defaultModel,
      prompt: interpretPrompt,
    });
    (results.steps as any[]).push({ step: 'ollama_interpret', success: true, response: ollamaResult.response });

    // Step 3: If target devices specified, interact with Home Assistant (parallel execution)
    if (targetDevices && targetDevices.length > 0) {
      // Fix N+1 query pattern: Execute all device state queries in parallel
      const devicePromises = targetDevices.map(async (entityId) => {
        try {
          const state = await haTools.executeTool('ha_get_state', { entity_id: entityId });
          return { entity_id: entityId, state, success: true };
        } catch (error) {
          return { entity_id: entityId, success: false, error: String(error) };
        }
      });

      const haResults = await Promise.all(devicePromises);
      (results.steps as any[]).push({ step: 'ha_devices', success: true, devices: haResults });
    }

    results['success'] = true;
  } catch (error) {
    results['success'] = false;
    results['error'] = String(error);
  }

  return results;
}

/**
 * Handle resource reads
 */
async function handleResourceRead(uri: string): Promise<string> {
  console.error(`Reading resource: ${uri}`);

  switch (uri) {
    case 'vault://secrets':
      if (!vaultClient) {
        return JSON.stringify({ error: 'Vault client not initialized' });
      }
      try {
        const secrets = await vaultClient.list('');
        return JSON.stringify({ keys: secrets.keys }, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    case 'ha://entities':
      try {
        const entities = await haTools.executeTool('ha_list_entities', {});
        return JSON.stringify(entities, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    case 'ha://areas':
      try {
        const areas = await haTools.executeTool('ha_get_areas', {});
        return JSON.stringify(areas, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    case 'neo4j://graph':
      try {
        const neo4j = getNeo4jClient();
        const stats = await neo4j.query('CALL db.stats.retrieve("NODE COUNT") YIELD data RETURN data');
        return JSON.stringify({ stats }, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    case 'qdrant://collections':
      try {
        const qdrant = getQdrantClient();
        const collections = await qdrant.listCollections();
        return JSON.stringify({ collections }, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    case 'ollama://models':
      try {
        const models = await ollamaClient.listModels();
        return JSON.stringify(models, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    case 'docker://containers':
      try {
        const containers = await handleDockerTool('docker_ps', { all: true });
        return JSON.stringify(containers, null, 2);
      } catch (error) {
        return JSON.stringify({ error: String(error) }, null, 2);
      }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}

/**
 * Handle prompt retrieval
 */
async function handleGetPrompt(
  name: string,
  args: Record<string, string>
): Promise<{ description?: string; messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  console.error(`Getting prompt: ${name}`);

  switch (name) {
    case 'automation_wizard':
      return {
        description: 'Home Assistant automation creation wizard',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to create a Home Assistant automation. Goal: ${args['goal'] || '[goal not specified]'}

Please help me design an automation by:
1. Understanding my goal
2. Identifying required triggers, conditions, and actions
3. Suggesting the YAML configuration
4. Offering to create the automation using ha_create_automation`,
            },
          },
        ],
      };

    case 'knowledge_query':
      return {
        description: 'Knowledge graph query assistant with RAG',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Query the knowledge base: ${args['question'] || '[question not specified]'}

Use the rag_query tool to search for relevant information and provide a comprehensive answer.`,
            },
          },
        ],
      };

    case 'device_control':
      return {
        description: 'Natural language device control',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Control smart home devices: ${args['command'] || '[command not specified]'}

Use ha_list_entities to find matching devices, then ha_call_service to execute the command.`,
            },
          },
        ],
      };

    case 'system_status':
      return {
        description: 'System status check',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Provide a comprehensive status report of all Command Center services:
- Ollama (ollama_models, ollama_gpu_status)
- Home Assistant (ha_health_check)
- Docker containers (docker_ps)
- Vault (if configured)
- Neo4j and Qdrant (if configured)`,
            },
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// ============================================================================
// Main Server Setup
// ============================================================================

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: config.server.name,
      version: config.server.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getTools(),
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, args || {});
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: getResources(),
  }));

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      const content = await handleResourceRead(uri);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: getPrompts(),
  }));

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      return await handleGetPrompt(name, args || {});
    } catch (error) {
      throw new Error(`Failed to get prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return server;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main function
 */
async function main(): Promise<void> {
  console.error('');
  console.error('╔════════════════════════════════════════════════════════════╗');
  console.error('║       Ahling Command Center MCP Server v1.0.0              ║');
  console.error('║       Intelligence Trinity Integration Layer               ║');
  console.error('╚════════════════════════════════════════════════════════════╝');
  console.error('');

  // Check required environment variables
  const envCheck = checkRequiredEnvVars();
  if (!envCheck.allSet) {
    console.error('WARNING: Some environment variables are missing:');
    envCheck.missing.forEach((varName) => console.error(`  - ${varName}`));
    console.error('');
    console.error('Server will start with limited functionality.');
    console.error('Run with --help for environment variable guide.');
    console.error('');
  }

  // Handle --help flag
  if (process.argv.includes('--help')) {
    printEnvVarGuide();
    process.exit(0);
  }

  // Load and validate configuration
  try {
    config = loadConfig();
    printConfigSummary(config);
  } catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }

  // Initialize service clients
  try {
    await initializeClients();
  } catch (error) {
    console.error('Failed to initialize clients:', error);
    console.error('Server will start with limited functionality.');
  }

  // Create and start MCP server
  const server = createServer();
  const transport = new StdioServerTransport();

  // Setup cleanup on exit
  process.on('SIGINT', async () => {
    console.error('\nReceived SIGINT, shutting down...');
    await cleanupClients();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\nReceived SIGTERM, shutting down...');
    await cleanupClients();
    process.exit(0);
  });

  // Start the server
  await server.connect(transport);
  console.error('');
  console.error('╔════════════════════════════════════════════════════════════╗');
  console.error('║  MCP Server running on stdio - Ready for Claude requests   ║');
  console.error('╚════════════════════════════════════════════════════════════╝');
  console.error('');
}

// ============================================================================
// Run the server
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
