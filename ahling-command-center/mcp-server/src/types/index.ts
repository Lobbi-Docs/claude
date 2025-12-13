/**
 * Shared TypeScript Types and Interfaces
 * Ahling Command Center MCP Server
 */

/**
 * Environment Configuration
 */
export interface EnvironmentConfig {
  // Neo4j Configuration
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database?: string;
    maxConnectionPoolSize?: number;
  };

  // Qdrant Configuration
  qdrant: {
    url: string;
    apiKey?: string;
    timeout?: number;
  };

  // Ollama Configuration
  ollama: {
    url: string;
    defaultModel?: string;
    embeddingModel?: string;
  };

  // Vault Configuration (optional)
  vault?: {
    endpoint: string;
    token?: string;
    roleId?: string;
    secretId?: string;
  };

  // Home Assistant Configuration (optional)
  homeAssistant?: {
    url: string;
    token: string;
  };

  // Docker Configuration (optional)
  docker?: {
    socketPath?: string;
    host?: string;
    port?: number;
  };
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  service: string;
  healthy: boolean;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * MCP Tool Response
 */
export interface MCPToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Knowledge Graph Node
 */
export interface KnowledgeGraphNode {
  id: string | number;
  labels: string[];
  properties: Record<string, unknown>;
}

/**
 * Knowledge Graph Relationship
 */
export interface KnowledgeGraphRelationship {
  id: string | number;
  type: string;
  startNodeId: string | number;
  endNodeId: string | number;
  properties: Record<string, unknown>;
}

/**
 * Vector Search Result
 */
export interface VectorSearchResult {
  id: string | number;
  score: number;
  content: string;
  metadata?: Record<string, unknown>;
  vector?: number[];
}

/**
 * RAG Response
 */
export interface RAGResponse {
  answer: string;
  sources: Array<{
    id: string | number;
    score: number;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  query: string;
  context?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    retrievalTime?: number;
    generationTime?: number;
  };
}

/**
 * Document Chunk
 */
export interface DocumentChunk {
  id: string;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

/**
 * Ingestion Result
 */
export interface IngestionResult {
  success: boolean;
  chunksProcessed: number;
  collection: string;
  pointIds: (string | number)[];
  neo4jStored: boolean;
  neo4jResults?: number;
  errors?: string[];
}

/**
 * Client Status
 */
export interface ClientStatus {
  name: string;
  connected: boolean;
  healthy: boolean;
  lastChecked: string;
  details?: Record<string, unknown>;
}

/**
 * MCP Server Status
 */
export interface MCPServerStatus {
  uptime: number;
  version: string;
  clients: {
    neo4j?: ClientStatus;
    qdrant?: ClientStatus;
    ollama?: ClientStatus;
    vault?: ClientStatus;
    homeAssistant?: ClientStatus;
    docker?: ClientStatus;
  };
  tools: {
    registered: number;
    available: string[];
  };
}

/**
 * Tool Metadata
 */
export interface ToolMetadata {
  name: string;
  description: string;
  category: 'knowledge' | 'infrastructure' | 'automation' | 'security' | 'monitoring';
  version: string;
  schema: Record<string, unknown>;
}

/**
 * Query Performance Metrics
 */
export interface QueryMetrics {
  queryId: string;
  toolName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logging Configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destinations: Array<'console' | 'file' | 'neo4j'>;
  neo4jLogging?: {
    enabled: boolean;
    batchSize?: number;
    flushInterval?: number;
  };
}

/**
 * Error Types
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Custom Error Class
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Utility type for async handlers
 */
export type AsyncHandler<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

/**
 * Utility type for tool handlers
 */
export type ToolHandler<TArgs = unknown, TResult = unknown> = AsyncHandler<TArgs, MCPToolResponse<TResult>>;
