/**
 * Configuration Module for Ahling Command Center MCP Server
 * Loads and validates environment variables
 */

import { EnvironmentConfig } from '../types/index.js';

/**
 * Load environment variable with fallback
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

/**
 * Load optional environment variable
 */
function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Parse number environment variable
 */
function getNumberEnv(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    // Neo4j Configuration
    neo4j: {
      uri: getEnv('NEO4J_URI', 'bolt://localhost:7687'),
      username: getEnv('NEO4J_USERNAME', 'neo4j'),
      password: getEnv('NEO4J_PASSWORD'),
      database: getOptionalEnv('NEO4J_DATABASE', 'neo4j'),
      maxConnectionPoolSize: getNumberEnv('NEO4J_MAX_POOL_SIZE', 50)
    },

    // Qdrant Configuration
    qdrant: {
      url: getEnv('QDRANT_URL', 'http://localhost:6333'),
      apiKey: getOptionalEnv('QDRANT_API_KEY'),
      timeout: getNumberEnv('QDRANT_TIMEOUT', 30000)
    },

    // Ollama Configuration
    ollama: {
      url: getEnv('OLLAMA_URL', 'http://localhost:11434'),
      defaultModel: getOptionalEnv('OLLAMA_DEFAULT_MODEL', 'llama2'),
      embeddingModel: getOptionalEnv('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text')
    }
  };

  // Optional Vault Configuration
  const vaultEndpoint = getOptionalEnv('VAULT_ADDR');
  if (vaultEndpoint) {
    config.vault = {
      endpoint: vaultEndpoint,
      token: getOptionalEnv('VAULT_TOKEN'),
      roleId: getOptionalEnv('VAULT_ROLE_ID'),
      secretId: getOptionalEnv('VAULT_SECRET_ID')
    };
  }

  // Optional Home Assistant Configuration
  const homeAssistantUrl = getOptionalEnv('HOME_ASSISTANT_URL');
  const homeAssistantToken = getOptionalEnv('HOME_ASSISTANT_TOKEN');
  if (homeAssistantUrl && homeAssistantToken) {
    config.homeAssistant = {
      url: homeAssistantUrl,
      token: homeAssistantToken
    };
  }

  // Optional Docker Configuration
  const dockerSocketPath = getOptionalEnv('DOCKER_SOCKET_PATH');
  const dockerHost = getOptionalEnv('DOCKER_HOST');
  if (dockerSocketPath || dockerHost) {
    config.docker = {
      socketPath: dockerSocketPath,
      host: dockerHost,
      port: getNumberEnv('DOCKER_PORT', 2375)
    };
  }

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: EnvironmentConfig): void {
  // Validate Neo4j configuration
  if (!config.neo4j.uri) {
    throw new Error('Neo4j URI is required');
  }
  if (!config.neo4j.username) {
    throw new Error('Neo4j username is required');
  }
  if (!config.neo4j.password) {
    throw new Error('Neo4j password is required');
  }

  // Validate Qdrant configuration
  if (!config.qdrant.url) {
    throw new Error('Qdrant URL is required');
  }

  // Validate Ollama configuration
  if (!config.ollama.url) {
    throw new Error('Ollama URL is required');
  }

  console.log('Configuration validated successfully');
}

/**
 * Global configuration instance
 */
let configInstance: EnvironmentConfig | null = null;

/**
 * Get configuration instance (singleton)
 */
export function getConfig(): EnvironmentConfig {
  if (!configInstance) {
    configInstance = loadConfig();
    validateConfig(configInstance);
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Print configuration (masks sensitive data)
 */
export function printConfig(config: EnvironmentConfig): void {
  const masked = {
    neo4j: {
      ...config.neo4j,
      password: '***MASKED***'
    },
    qdrant: {
      ...config.qdrant,
      apiKey: config.qdrant.apiKey ? '***MASKED***' : undefined
    },
    ollama: { ...config.ollama },
    vault: config.vault ? {
      endpoint: config.vault.endpoint,
      token: config.vault.token ? '***MASKED***' : undefined,
      roleId: config.vault.roleId ? '***MASKED***' : undefined,
      secretId: config.vault.secretId ? '***MASKED***' : undefined
    } : undefined,
    homeAssistant: config.homeAssistant ? {
      url: config.homeAssistant.url,
      token: '***MASKED***'
    } : undefined,
    docker: config.docker
  };

  console.log('Configuration:', JSON.stringify(masked, null, 2));
}
