/**
 * Neo4j Client with Connection Pooling
 * Provides graph database query capabilities for the Ahling Command Center
 */

import neo4j, {
  Driver,
  auth,
  Integer,
  Node,
  Relationship,
  Path
} from 'neo4j-driver';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
  maxConnectionPoolSize?: number;
  connectionAcquisitionTimeout?: number;
  maxTransactionRetryTime?: number;
}

export interface Neo4jQueryOptions {
  database?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface Neo4jHealthStatus {
  healthy: boolean;
  message: string;
  details?: {
    serverInfo?: {
      address: string;
      agent: string;
      protocolVersion: number;
    };
    connectionPoolSize?: number;
  };
}

/**
 * Neo4j Client with connection pooling and transaction management
 */
export class Neo4jClient {
  private driver: Driver | null = null;
  private config: Neo4jConfig;
  private defaultDatabase: string;

  constructor(config: Neo4jConfig) {
    this.config = {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60000, // 60 seconds
      maxTransactionRetryTime: 30000, // 30 seconds
      ...config
    };
    this.defaultDatabase = config.database || 'neo4j';
  }

  /**
   * Initialize the Neo4j driver with connection pooling
   */
  async connect(): Promise<void> {
    if (this.driver) {
      console.warn('Neo4j driver already connected');
      return;
    }

    try {
      this.driver = neo4j.driver(
        this.config.uri,
        auth.basic(this.config.username, this.config.password),
        {
          maxConnectionPoolSize: this.config.maxConnectionPoolSize,
          connectionAcquisitionTimeout: this.config.connectionAcquisitionTimeout,
          maxTransactionRetryTime: this.config.maxTransactionRetryTime,
          disableLosslessIntegers: true, // Convert Neo4j integers to JavaScript numbers
        }
      );

      // Verify connectivity
      await this.driver.verifyConnectivity();
      console.log('Neo4j driver connected successfully');
    } catch (error) {
      throw new Error(`Failed to connect to Neo4j: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a read-only Cypher query
   * @param cypher The Cypher query string
   * @param parameters Query parameters
   * @param options Query options including database name
   * @returns Query result records
   */
  async query<T = Record<string, unknown>>(
    cypher: string,
    parameters: Record<string, unknown> = {},
    options: Neo4jQueryOptions = {}
  ): Promise<T[]> {
    if (!this.driver) {
      throw new Error('Neo4j driver not connected. Call connect() first.');
    }

    const session = this.driver.session({
      database: options.database || this.defaultDatabase,
      defaultAccessMode: neo4j.session.READ
    });

    try {
      const result = await session.run(cypher, parameters, {
        timeout: options.timeout,
        metadata: options.metadata
      });

      return result.records.map(record => this.serializeRecord(record)) as T[];
    } catch (error) {
      throw new Error(`Neo4j query failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write Cypher query (CREATE, UPDATE, DELETE, MERGE)
   * @param cypher The Cypher query string
   * @param parameters Query parameters
   * @param options Query options including database name
   * @returns Query result records
   */
  async write<T = Record<string, unknown>>(
    cypher: string,
    parameters: Record<string, unknown> = {},
    options: Neo4jQueryOptions = {}
  ): Promise<T[]> {
    if (!this.driver) {
      throw new Error('Neo4j driver not connected. Call connect() first.');
    }

    const session = this.driver.session({
      database: options.database || this.defaultDatabase,
      defaultAccessMode: neo4j.session.WRITE
    });

    try {
      const result = await session.run(cypher, parameters, {
        timeout: options.timeout,
        metadata: options.metadata
      });

      return result.records.map(record => this.serializeRecord(record)) as T[];
    } catch (error) {
      throw new Error(`Neo4j write failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a transaction with automatic retry logic
   * @param txFunction Transaction function
   * @param database Database name
   * @returns Transaction result
   */
  async executeTransaction<T>(
    txFunction: (tx: any) => Promise<T>,
    database?: string
  ): Promise<T> {
    if (!this.driver) {
      throw new Error('Neo4j driver not connected. Call connect() first.');
    }

    const session = this.driver.session({
      database: database || this.defaultDatabase,
      defaultAccessMode: neo4j.session.WRITE
    });

    try {
      const result = await session.executeWrite(txFunction);
      return result;
    } catch (error) {
      throw new Error(`Neo4j transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Health check for Neo4j connection
   * @returns Health status
   */
  async healthCheck(): Promise<Neo4jHealthStatus> {
    if (!this.driver) {
      return {
        healthy: false,
        message: 'Neo4j driver not initialized'
      };
    }

    try {
      await this.driver.verifyConnectivity();
      const serverInfo = await this.driver.getServerInfo();

      return {
        healthy: true,
        message: 'Neo4j connection is healthy',
        details: {
          serverInfo: {
            address: serverInfo.address ?? 'unknown',
            agent: serverInfo.agent ?? 'unknown',
            protocolVersion: serverInfo.protocolVersion ?? 0
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Neo4j health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Close the Neo4j driver and release all connections
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('Neo4j driver closed');
    }
  }

  /**
   * Serialize a Neo4j record to plain JavaScript object
   * Handles Neo4j types (Node, Relationship, Path, Integer, etc.)
   */
  private serializeRecord(record: any): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    record.keys.forEach((key: string) => {
      const value = record.get(key);
      result[key] = this.serializeValue(value);
    });

    return result;
  }

  /**
   * Serialize Neo4j values to JavaScript types
   */
  private serializeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle Neo4j Integer
    if (neo4j.isInt(value)) {
      return neo4j.integer.toNumber(value as Integer);
    }

    // Handle Neo4j Node
    if (neo4j.isNode(value)) {
      const node = value as Node;
      return {
        identity: neo4j.integer.toNumber(node.identity),
        labels: node.labels,
        properties: this.serializeProperties(node.properties)
      };
    }

    // Handle Neo4j Relationship
    if (neo4j.isRelationship(value)) {
      const rel = value as Relationship;
      return {
        identity: neo4j.integer.toNumber(rel.identity),
        type: rel.type,
        start: neo4j.integer.toNumber(rel.start),
        end: neo4j.integer.toNumber(rel.end),
        properties: this.serializeProperties(rel.properties)
      };
    }

    // Handle Neo4j Path
    if (neo4j.isPath(value)) {
      const path = value as Path;
      return {
        start: this.serializeValue(path.start),
        end: this.serializeValue(path.end),
        segments: path.segments.map(segment => ({
          start: this.serializeValue(segment.start),
          relationship: this.serializeValue(segment.relationship),
          end: this.serializeValue(segment.end)
        })),
        length: path.length
      };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.serializeValue(item));
    }

    // Handle objects
    if (typeof value === 'object') {
      return this.serializeProperties(value as Record<string, unknown>);
    }

    // Return primitive values as-is
    return value;
  }

  /**
   * Serialize object properties
   */
  private serializeProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    Object.entries(properties).forEach(([key, value]) => {
      result[key] = this.serializeValue(value);
    });

    return result;
  }
}

/**
 * Thread-safe singleton instance management
 * Prevents race conditions during initialization
 */
let neo4jClientInstance: Neo4jClient | null = null;
let neo4jInitPromise: Promise<Neo4jClient> | null = null;

/**
 * Get or create Neo4j client instance (synchronous)
 * Note: Does not connect automatically - call connect() after
 */
export function getNeo4jClient(config?: Neo4jConfig): Neo4jClient {
  if (!neo4jClientInstance && config) {
    neo4jClientInstance = new Neo4jClient(config);
  }

  if (!neo4jClientInstance) {
    throw new Error('Neo4j client not initialized. Provide config on first call.');
  }

  return neo4jClientInstance;
}

/**
 * Get or create Neo4j client with automatic connection (thread-safe async)
 * Use this when you need a connected client
 */
export async function getNeo4jClientAsync(config?: Neo4jConfig): Promise<Neo4jClient> {
  // Return existing connected instance
  if (neo4jClientInstance) {
    return neo4jClientInstance;
  }

  // Prevent race conditions during initialization
  if (neo4jInitPromise) {
    return neo4jInitPromise;
  }

  if (!config) {
    throw new Error('Neo4j client not initialized. Provide config on first call.');
  }

  neo4jInitPromise = (async () => {
    const client = new Neo4jClient(config);
    await client.connect();
    neo4jClientInstance = client;
    return client;
  })();

  try {
    return await neo4jInitPromise;
  } finally {
    neo4jInitPromise = null;
  }
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetNeo4jClient(): void {
  neo4jClientInstance = null;
  neo4jInitPromise = null;
}
