/**
 * Clients Export Index
 * Central export point for all client modules
 *
 * Ahling Command Center service clients:
 * - Ollama: Local LLM inference with ROCm GPU support
 * - Home Assistant: REST + WebSocket smart home API
 * - Vault: HashiCorp Vault KV v1/v2 secrets
 * - Neo4j: Graph database for knowledge graphs
 * - Qdrant: Vector database for semantic search
 */

// Ollama client (Intelligence Trinity)
export { OllamaClient } from './ollama.client.js';
export * from '../types/ollama.types.js';

// Home Assistant client (Intelligence Trinity)
export { HomeAssistantClient } from './homeassistant.client.js';
export * from './types/homeassistant.types.js';

// Vault client (Secrets management)
export {
  VaultClient,
  VaultError,
  VaultKVVersion,
  type VaultConfig,
  type VaultReadOptions,
  type VaultWriteOptions,
  type VaultDeleteOptions,
  type VaultSecretData,
  type VaultReadResponse,
  type VaultListResponse,
  type VaultHealthResponse,
} from './vault.client.js';

// Neo4j client (Knowledge Graph)
export { getNeo4jClient } from './neo4j.client.js';

// Qdrant client (Vector Database)
export {
  getQdrantClient,
  type QdrantSearchFilter,
} from './qdrant.client.js';
