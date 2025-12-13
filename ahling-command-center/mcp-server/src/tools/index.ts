/**
 * Tools Export Index
 * Central export point for all tool modules
 *
 * Ahling Command Center MCP Server integrates:
 * - Docker: Container lifecycle management
 * - Ollama: Local LLM inference (Intelligence Trinity)
 * - Home Assistant: Smart home control (Intelligence Trinity)
 * - Vault: Secrets management
 * - Knowledge (Neo4j + Qdrant): Graph + Vector RAG
 */

// Docker tools
export { dockerTools, handleDockerTool } from './docker/index.js';

// Ollama tools
export { OLLAMA_TOOLS, handleOllamaTool } from './ollama/index.js';

// Home Assistant tools
export { HomeAssistantTools } from './homeassistant/index.js';

// Vault tools
export { registerVaultTools, getVaultToolDefinitions } from './vault/index.js';

// Knowledge tools (Neo4j + Qdrant + RAG)
export {
  knowledgeTools,
  neo4jQuery,
  qdrantSearch,
  ragQuery,
  knowledgeIngest,
  Neo4jQuerySchema,
  QdrantSearchSchema,
  RagQuerySchema,
  KnowledgeIngestSchema,
} from './knowledge/index.js';
