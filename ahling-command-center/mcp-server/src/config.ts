/**
 * Configuration loader with Zod validation for Ahling Command Center MCP Server
 */

import { z } from 'zod';
import type { ServerConfig } from './types.js';

// ============================================================================
// Zod Schemas for Configuration Validation
// ============================================================================

const VaultConfigSchema = z.object({
  addr: z.string().url().describe('Vault server address (e.g., http://vault:8200)'),
  token: z.string().min(1).describe('Vault authentication token'),
  namespace: z.string().optional().describe('Vault namespace (optional)'),
});

const OllamaConfigSchema = z.object({
  url: z.string().url().describe('Ollama server URL (e.g., http://ollama:11434)'),
  defaultModel: z.string().default('llama3.2:3b').describe('Default Ollama model'),
  timeout: z.number().positive().default(300000).describe('Request timeout in milliseconds (default: 5 minutes)'),
});

const HomeAssistantConfigSchema = z.object({
  url: z.string().url().describe('Home Assistant server URL (e.g., http://homeassistant.local:8123)'),
  token: z.string().min(1).describe('Home Assistant long-lived access token'),
  websocketUrl: z.string().url().optional().describe('WebSocket URL (optional, defaults to url)'),
});

const Neo4jConfigSchema = z.object({
  url: z.string().url().describe('Neo4j server URL (e.g., bolt://neo4j:7687)'),
  username: z.string().min(1).describe('Neo4j username'),
  password: z.string().min(1).describe('Neo4j password'),
  database: z.string().default('neo4j').describe('Neo4j database name (default: neo4j)'),
});

const QdrantConfigSchema = z.object({
  url: z.string().url().describe('Qdrant server URL (e.g., http://qdrant:6333)'),
  apiKey: z.string().optional().describe('Qdrant API key (optional)'),
  defaultCollection: z.string().default('command_center').describe('Default collection name'),
});

const MCPServerConfigSchema = z.object({
  name: z.string().default('ahling-command-center-mcp').describe('MCP server name'),
  version: z.string().default('1.0.0').describe('MCP server version'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info').describe('Log level'),
});

const ServerConfigSchema = z.object({
  vault: VaultConfigSchema,
  ollama: OllamaConfigSchema,
  homeAssistant: HomeAssistantConfigSchema,
  neo4j: Neo4jConfigSchema,
  qdrant: QdrantConfigSchema,
  server: MCPServerConfigSchema,
});

// ============================================================================
// Environment Variable Loading
// ============================================================================

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): z.infer<typeof ServerConfigSchema> {
  const config = {
    vault: {
      addr: process.env['VAULT_ADDR'] || '',
      token: process.env['VAULT_TOKEN'] || '',
      namespace: process.env['VAULT_NAMESPACE'],
    },
    ollama: {
      url: process.env['OLLAMA_URL'] || 'http://localhost:11434',
      defaultModel: process.env['OLLAMA_DEFAULT_MODEL'] || 'llama3.2:3b',
      timeout: parseInt(process.env['OLLAMA_TIMEOUT'] || '300000', 10),
    },
    homeAssistant: {
      url: process.env['HA_URL'] || '',
      token: process.env['HA_TOKEN'] || '',
      websocketUrl: process.env['HA_WEBSOCKET_URL'],
    },
    neo4j: {
      url: process.env['NEO4J_URL'] || '',
      username: process.env['NEO4J_USERNAME'] || '',
      password: process.env['NEO4J_PASSWORD'] || '',
      database: process.env['NEO4J_DATABASE'] || 'neo4j',
    },
    qdrant: {
      url: process.env['QDRANT_URL'] || '',
      apiKey: process.env['QDRANT_API_KEY'],
      defaultCollection: process.env['QDRANT_DEFAULT_COLLECTION'] || 'command_center',
    },
    server: {
      name: process.env['MCP_SERVER_NAME'] || 'ahling-command-center-mcp',
      version: process.env['MCP_SERVER_VERSION'] || '1.0.0',
      logLevel: (process.env['LOG_LEVEL'] || 'info') as 'debug' | 'info' | 'warn' | 'error',
    },
  };

  return config;
}

// ============================================================================
// Configuration Validation and Export
// ============================================================================

/**
 * Load and validate server configuration
 *
 * @throws {ZodError} If configuration is invalid
 * @returns {ServerConfig} Validated server configuration
 */
export function loadConfig(): ServerConfig {
  const rawConfig = loadFromEnv();

  // Validate configuration
  const validationResult = ServerConfigSchema.safeParse(rawConfig);

  if (!validationResult.success) {
    console.error('Configuration validation failed:');
    console.error(JSON.stringify(validationResult.error.format(), null, 2));
    throw new Error('Invalid configuration. Please check environment variables.');
  }

  return validationResult.data;
}

/**
 * Validate configuration without throwing errors
 *
 * @returns {object} Validation result with success flag and errors
 */
export function validateConfig(): {
  success: boolean;
  errors?: z.ZodError;
  config?: ServerConfig
} {
  const rawConfig = loadFromEnv();
  const validationResult = ServerConfigSchema.safeParse(rawConfig);

  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.error,
    };
  }

  return {
    success: true,
    config: validationResult.data,
  };
}

/**
 * Get configuration with default values for missing optional fields
 */
export function getConfigWithDefaults(): ServerConfig {
  try {
    return loadConfig();
  } catch (error) {
    console.error('Failed to load configuration, using defaults where possible');
    throw error;
  }
}

/**
 * Print configuration summary (without sensitive data)
 */
export function printConfigSummary(config: ServerConfig): void {
  console.log('='.repeat(60));
  console.log('Ahling Command Center MCP Server Configuration');
  console.log('='.repeat(60));
  console.log();

  console.log('Server:');
  console.log(`  Name:      ${config.server.name}`);
  console.log(`  Version:   ${config.server.version}`);
  console.log(`  Log Level: ${config.server.logLevel}`);
  console.log();

  console.log('Vault:');
  console.log(`  Address:   ${config.vault.addr}`);
  console.log(`  Token:     ${config.vault.token ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log(`  Namespace: ${config.vault.namespace || '[DEFAULT]'}`);
  console.log();

  console.log('Ollama:');
  console.log(`  URL:           ${config.ollama.url}`);
  console.log(`  Default Model: ${config.ollama.defaultModel}`);
  console.log(`  Timeout:       ${config.ollama.timeout}ms`);
  console.log();

  console.log('Home Assistant:');
  console.log(`  URL:   ${config.homeAssistant.url}`);
  console.log(`  Token: ${config.homeAssistant.token ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log(`  WS:    ${config.homeAssistant.websocketUrl || '[AUTO]'}`);
  console.log();

  console.log('Neo4j:');
  console.log(`  URL:      ${config.neo4j.url}`);
  console.log(`  Username: ${config.neo4j.username || '[MISSING]'}`);
  console.log(`  Password: ${config.neo4j.password ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log(`  Database: ${config.neo4j.database}`);
  console.log();

  console.log('Qdrant:');
  console.log(`  URL:        ${config.qdrant.url}`);
  console.log(`  API Key:    ${config.qdrant.apiKey ? '[CONFIGURED]' : '[NOT SET]'}`);
  console.log(`  Collection: ${config.qdrant.defaultCollection}`);
  console.log();

  console.log('='.repeat(60));
}

/**
 * Required environment variables for the server to function
 */
export const REQUIRED_ENV_VARS = [
  'VAULT_ADDR',
  'VAULT_TOKEN',
  'HA_URL',
  'HA_TOKEN',
  'NEO4J_URL',
  'NEO4J_USERNAME',
  'NEO4J_PASSWORD',
  'QDRANT_URL',
] as const;

/**
 * Optional environment variables with defaults
 */
export const OPTIONAL_ENV_VARS = [
  'VAULT_NAMESPACE',
  'OLLAMA_URL',
  'OLLAMA_DEFAULT_MODEL',
  'OLLAMA_TIMEOUT',
  'HA_WEBSOCKET_URL',
  'NEO4J_DATABASE',
  'QDRANT_API_KEY',
  'QDRANT_DEFAULT_COLLECTION',
  'MCP_SERVER_NAME',
  'MCP_SERVER_VERSION',
  'LOG_LEVEL',
] as const;

/**
 * Check if all required environment variables are set
 */
export function checkRequiredEnvVars(): {
  allSet: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    allSet: missing.length === 0,
    missing,
  };
}

/**
 * Print environment variable setup guide
 */
export function printEnvVarGuide(): void {
  console.log('='.repeat(60));
  console.log('Environment Variable Setup Guide');
  console.log('='.repeat(60));
  console.log();

  console.log('Required Variables:');
  console.log('-------------------');
  for (const envVar of REQUIRED_ENV_VARS) {
    console.log(`  ${envVar}=${process.env[envVar] ? '[SET]' : '[MISSING]'}`);
  }
  console.log();

  console.log('Optional Variables (with defaults):');
  console.log('-----------------------------------');
  for (const envVar of OPTIONAL_ENV_VARS) {
    console.log(`  ${envVar}=${process.env[envVar] ? '[SET]' : '[USING DEFAULT]'}`);
  }
  console.log();

  console.log('Example .env file:');
  console.log('------------------');
  console.log(`# Vault Configuration
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=your-vault-token
VAULT_NAMESPACE=admin

# Ollama Configuration
OLLAMA_URL=http://ollama:11434
OLLAMA_DEFAULT_MODEL=llama3.2:3b
OLLAMA_TIMEOUT=300000

# Home Assistant Configuration
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your-ha-long-lived-token
HA_WEBSOCKET_URL=ws://homeassistant.local:8123

# Neo4j Configuration
NEO4J_URL=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-neo4j-password
NEO4J_DATABASE=neo4j

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_DEFAULT_COLLECTION=command_center

# Server Configuration
MCP_SERVER_NAME=ahling-command-center-mcp
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info
`);
  console.log('='.repeat(60));
}

// Export schemas for testing and external validation
export {
  VaultConfigSchema,
  OllamaConfigSchema,
  HomeAssistantConfigSchema,
  Neo4jConfigSchema,
  QdrantConfigSchema,
  MCPServerConfigSchema,
  ServerConfigSchema,
};
