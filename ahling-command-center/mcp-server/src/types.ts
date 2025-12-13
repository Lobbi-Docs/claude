/**
 * Shared TypeScript types for Ahling Command Center MCP Server
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface ServerConfig {
  vault: VaultConfig;
  ollama: OllamaConfig;
  homeAssistant: HomeAssistantConfig;
  neo4j: Neo4jConfig;
  qdrant: QdrantConfig;
  server: MCPServerConfig;
}

export interface VaultConfig {
  addr: string;
  token: string;
  namespace?: string;
}

export interface OllamaConfig {
  url: string;
  defaultModel: string;
  timeout: number;
}

export interface HomeAssistantConfig {
  url: string;
  token: string;
  websocketUrl?: string;
}

export interface Neo4jConfig {
  url: string;
  username: string;
  password: string;
  database: string;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  defaultCollection: string;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// Home Assistant Types
// ============================================================================

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context?: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

export interface HAServiceCall {
  domain: string;
  service: string;
  target?: {
    entity_id?: string | string[];
    area_id?: string | string[];
    device_id?: string | string[];
  };
  data?: Record<string, unknown>;
}

export interface HAAutomation {
  alias: string;
  description?: string;
  trigger: AutomationTrigger[];
  condition?: AutomationCondition[];
  action: AutomationAction[];
  mode?: 'single' | 'restart' | 'queued' | 'parallel';
}

export interface AutomationTrigger {
  platform: string;
  [key: string]: unknown;
}

export interface AutomationCondition {
  condition: string;
  [key: string]: unknown;
}

export interface AutomationAction {
  [key: string]: unknown;
}

// ============================================================================
// Vault Types
// ============================================================================

export interface VaultSecret {
  path: string;
  data: Record<string, unknown>;
  metadata?: {
    created_time: string;
    deletion_time?: string;
    destroyed: boolean;
    version: number;
  };
}

export interface VaultPolicy {
  name: string;
  rules: string;
}

export interface VaultToken {
  client_token: string;
  accessor: string;
  policies: string[];
  metadata?: Record<string, string>;
  ttl: number;
  renewable: boolean;
}

// ============================================================================
// Neo4j Types
// ============================================================================

export interface Neo4jNode {
  identity: number | string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface Neo4jRelationship {
  identity: number | string;
  start: number | string;
  end: number | string;
  type: string;
  properties: Record<string, unknown>;
}

export interface Neo4jQueryResult {
  records: Neo4jRecord[];
  summary: {
    query: string;
    parameters: Record<string, unknown>;
    counters: {
      nodesCreated: number;
      nodesDeleted: number;
      relationshipsCreated: number;
      relationshipsDeleted: number;
      propertiesSet: number;
    };
  };
}

export interface Neo4jRecord {
  keys: string[];
  length: number;
  _fields: unknown[];
  _fieldLookup: Record<string, number>;
}

// ============================================================================
// Qdrant Types
// ============================================================================

export interface QdrantPoint {
  id: string | number;
  vector: number[] | Record<string, number[]>;
  payload?: Record<string, unknown>;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[] | Record<string, number[]>;
}

export interface QdrantCollection {
  name: string;
  config: {
    params: {
      vectors: {
        size: number;
        distance: 'Cosine' | 'Euclid' | 'Dot';
      };
    };
  };
  status: string;
  points_count: number;
}

// ============================================================================
// Ollama Types
// ============================================================================

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

// ============================================================================
// Docker Types (for Ollama container management)
// ============================================================================

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
}

export interface DockerContainerStats {
  cpu_usage: number;
  memory_usage: number;
  memory_limit: number;
  network_rx: number;
  network_tx: number;
}

// ============================================================================
// MCP Protocol Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// ============================================================================
// Orchestration Types
// ============================================================================

export interface OrchestrationTask {
  id: string;
  name: string;
  type: 'automation' | 'query' | 'deployment' | 'analysis';
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: OrchestrationStep[];
  context: Record<string, unknown>;
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface OrchestrationStep {
  id: string;
  name: string;
  service: 'vault' | 'ollama' | 'ha' | 'neo4j' | 'qdrant';
  action: string;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

// ============================================================================
// Knowledge Graph Types (Neo4j-based)
// ============================================================================

export interface KnowledgeEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  relationships?: KnowledgeRelationship[];
}

export interface KnowledgeRelationship {
  id: string;
  type: string;
  from: string;
  to: string;
  properties?: Record<string, unknown>;
}

export interface KnowledgeQuery {
  pattern: string;
  parameters?: Record<string, unknown>;
  limit?: number;
}

// ============================================================================
// Semantic Search Types (Qdrant-based)
// ============================================================================

export interface SemanticDocument {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface SemanticSearchQuery {
  query: string;
  collection?: string;
  limit?: number;
  filter?: Record<string, unknown>;
  scoreThreshold?: number;
}

export interface SemanticSearchResult {
  document: SemanticDocument;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

// ============================================================================
// Agent Types (for Claude integration)
// ============================================================================

export interface AgentContext {
  task: string;
  history: AgentMessage[];
  tools: string[];
  resources: string[];
  constraints?: Record<string, unknown>;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AgentAction {
  type: 'tool_call' | 'resource_read' | 'prompt_fill';
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class VaultError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VAULT_ERROR', details);
    this.name = 'VaultError';
  }
}

export class OllamaError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'OLLAMA_ERROR', details);
    this.name = 'OllamaError';
  }
}

export class HomeAssistantError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HA_ERROR', details);
    this.name = 'HomeAssistantError';
  }
}

export class Neo4jError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NEO4J_ERROR', details);
    this.name = 'Neo4jError';
  }
}

export class QdrantError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'QDRANT_ERROR', details);
    this.name = 'QdrantError';
  }
}
