/**
 * Qdrant Vector Database Client
 * Provides vector search and storage capabilities for the Ahling Command Center
 */

import { QdrantClient as QdrantRestClient } from '@qdrant/js-client-rest';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
}

export interface QdrantPoint {
  id: string | number;
  vector: number[] | Record<string, number[]>;
  payload?: Record<string, unknown>;
}

export interface QdrantSearchFilter {
  must?: Array<{
    key: string;
    match?: { value: string | number | boolean };
    range?: {
      gte?: number;
      lte?: number;
      gt?: number;
      lt?: number;
    };
  }>;
  should?: Array<{
    key: string;
    match?: { value: string | number | boolean };
  }>;
  must_not?: Array<{
    key: string;
    match?: { value: string | number | boolean };
  }>;
}

export interface QdrantSearchParams {
  collection: string;
  queryVector: number[] | Record<string, number[]>;
  limit?: number;
  offset?: number;
  filter?: QdrantSearchFilter;
  withPayload?: boolean | string[];
  withVector?: boolean;
  scoreThreshold?: number;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[] | Record<string, number[]>;
}

export interface QdrantCollectionInfo {
  status: string;
  optimizer_status: string;
  vectors_count: number;
  indexed_vectors_count: number;
  points_count: number;
  segments_count: number;
}

export interface QdrantCollectionConfig {
  vectors: {
    size: number;
    distance: 'Cosine' | 'Euclidean' | 'Dot' | 'Manhattan';
  } | Record<string, {
    size: number;
    distance: 'Cosine' | 'Euclidean' | 'Dot' | 'Manhattan';
  }>;
  optimizers_config?: {
    indexing_threshold?: number;
  };
  hnsw_config?: {
    m?: number;
    ef_construct?: number;
    full_scan_threshold?: number;
  };
}

export interface QdrantHealthStatus {
  healthy: boolean;
  message: string;
  details?: {
    version?: string;
    collections?: number;
  };
}

/**
 * Qdrant Vector Database Client
 */
export class QdrantClient {
  private client: QdrantRestClient;
  private config: QdrantConfig;

  constructor(config: QdrantConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config
    };

    this.client = new QdrantRestClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout
    });
  }

  /**
   * Search for similar vectors in a collection
   * @param params Search parameters
   * @returns Array of search results with scores
   */
  async search(params: QdrantSearchParams): Promise<QdrantSearchResult[]> {
    try {
      const searchParams: any = {
        vector: params.queryVector,
        limit: params.limit || 10,
        offset: params.offset || 0,
        with_payload: params.withPayload ?? true,
        with_vector: params.withVector ?? false
      };

      if (params.filter) {
        searchParams.filter = params.filter;
      }

      if (params.scoreThreshold !== undefined) {
        searchParams.score_threshold = params.scoreThreshold;
      }

      const response = await this.client.search(params.collection, searchParams);

      return response.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload ?? undefined,
        vector: result.vector as number[] | Record<string, number[]> | undefined
      })) as QdrantSearchResult[];
    } catch (error) {
      throw new Error(`Qdrant search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Insert or update points in a collection
   * @param collection Collection name
   * @param points Array of points to upsert
   * @param wait Wait for operation to complete
   * @returns Operation result
   */
  async upsert(
    collection: string,
    points: QdrantPoint[],
    wait: boolean = true
  ): Promise<{ operation_id: number; status: string }> {
    try {
      const response = await this.client.upsert(collection, {
        wait,
        points: points.map(point => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload || {}
        }))
      });

      return {
        operation_id: response.operation_id ?? 0,
        status: response.status
      };
    } catch (error) {
      throw new Error(`Qdrant upsert failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete points from a collection
   * @param collection Collection name
   * @param pointIds Array of point IDs to delete
   * @param wait Wait for operation to complete
   * @returns Operation result
   */
  async delete(
    collection: string,
    pointIds: (string | number)[],
    wait: boolean = true
  ): Promise<{ operation_id: number; status: string }> {
    try {
      const response = await this.client.delete(collection, {
        wait,
        points: pointIds
      });

      return {
        operation_id: response.operation_id ?? 0,
        status: response.status
      };
    } catch (error) {
      throw new Error(`Qdrant delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new collection
   * @param collection Collection name
   * @param config Collection configuration
   * @returns Operation result
   */
  async createCollection(
    collection: string,
    config: QdrantCollectionConfig
  ): Promise<boolean> {
    try {
      // Cast config to match Qdrant client's expected types
      const response = await this.client.createCollection(collection, config as unknown as Parameters<typeof this.client.createCollection>[1]);
      return response;
    } catch (error) {
      throw new Error(`Qdrant create collection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a collection
   * @param collection Collection name
   * @returns Operation result
   */
  async deleteCollection(collection: string): Promise<boolean> {
    try {
      const response = await this.client.deleteCollection(collection);
      return response;
    } catch (error) {
      throw new Error(`Qdrant delete collection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get collection information
   * @param collection Collection name
   * @returns Collection information
   */
  async getCollectionInfo(collection: string): Promise<QdrantCollectionInfo> {
    try {
      const response = await this.client.getCollection(collection);
      return {
        status: response.status,
        optimizer_status: String(response.optimizer_status),
        vectors_count: (response as unknown as Record<string, number>)['vectors_count'] ?? response.points_count ?? 0,
        indexed_vectors_count: response.indexed_vectors_count ?? 0,
        points_count: response.points_count ?? 0,
        segments_count: response.segments_count ?? 0
      };
    } catch (error) {
      throw new Error(`Qdrant get collection info failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all collections
   * @returns Array of collection names
   */
  async listCollections(): Promise<string[]> {
    try {
      const response = await this.client.getCollections();
      return response.collections.map(c => c.name);
    } catch (error) {
      throw new Error(`Qdrant list collections failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a collection exists
   * @param collection Collection name
   * @returns True if collection exists
   */
  async collectionExists(collection: string): Promise<boolean> {
    try {
      await this.client.getCollection(collection);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scroll through points in a collection
   * @param collection Collection name
   * @param limit Number of points to retrieve
   * @param offset Offset for pagination
   * @param filter Optional filter
   * @param withPayload Include payload in results
   * @param withVector Include vector in results
   * @returns Array of points
   */
  async scroll(
    collection: string,
    limit: number = 10,
    offset?: string | number,
    filter?: QdrantSearchFilter,
    withPayload: boolean = true,
    withVector: boolean = false
  ): Promise<{ points: QdrantPoint[]; nextOffset?: string | number }> {
    try {
      const response = await this.client.scroll(collection, {
        limit,
        offset,
        filter,
        with_payload: withPayload,
        with_vector: withVector
      });

      const nextPageOffset = response.next_page_offset;
      return {
        points: response.points.map(p => ({
          id: p.id,
          vector: (p.vector || []) as number[] | Record<string, number[]>,
          payload: p.payload ?? undefined
        })) as QdrantPoint[],
        nextOffset: (typeof nextPageOffset === 'string' || typeof nextPageOffset === 'number') ? nextPageOffset : undefined
      };
    } catch (error) {
      throw new Error(`Qdrant scroll failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve specific points by ID
   * @param collection Collection name
   * @param ids Array of point IDs
   * @param withPayload Include payload in results
   * @param withVector Include vector in results
   * @returns Array of points
   */
  async retrieve(
    collection: string,
    ids: (string | number)[],
    withPayload: boolean = true,
    withVector: boolean = false
  ): Promise<QdrantPoint[]> {
    try {
      const response = await this.client.retrieve(collection, {
        ids,
        with_payload: withPayload,
        with_vector: withVector
      });

      return response.map(p => ({
        id: p.id,
        vector: (p.vector || []) as number[] | Record<string, number[]>,
        payload: p.payload ?? undefined
      })) as QdrantPoint[];
    } catch (error) {
      throw new Error(`Qdrant retrieve failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check for Qdrant connection
   * @returns Health status
   */
  async healthCheck(): Promise<QdrantHealthStatus> {
    try {
      // Try to list collections as a health check
      const collections = await this.listCollections();

      return {
        healthy: true,
        message: 'Qdrant connection is healthy',
        details: {
          collections: collections.length
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Qdrant health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get the underlying Qdrant REST client
   * @returns Qdrant REST client instance
   */
  getClient(): QdrantRestClient {
    return this.client;
  }
}

/**
 * Thread-safe singleton instance management
 * Prevents race conditions during initialization
 */
let qdrantClientInstance: QdrantClient | null = null;
let qdrantInitPromise: Promise<QdrantClient> | null = null;

/**
 * Get or create Qdrant client instance (synchronous)
 */
export function getQdrantClient(config?: QdrantConfig): QdrantClient {
  if (!qdrantClientInstance && config) {
    qdrantClientInstance = new QdrantClient(config);
  }

  if (!qdrantClientInstance) {
    throw new Error('Qdrant client not initialized. Provide config on first call.');
  }

  return qdrantClientInstance;
}

/**
 * Get or create Qdrant client with health verification (thread-safe async)
 * Use this when you need a verified working client
 */
export async function getQdrantClientAsync(config?: QdrantConfig): Promise<QdrantClient> {
  // Return existing verified instance
  if (qdrantClientInstance) {
    return qdrantClientInstance;
  }

  // Prevent race conditions during initialization
  if (qdrantInitPromise) {
    return qdrantInitPromise;
  }

  if (!config) {
    throw new Error('Qdrant client not initialized. Provide config on first call.');
  }

  qdrantInitPromise = (async () => {
    const client = new QdrantClient(config);
    // Verify connectivity
    const health = await client.healthCheck();
    if (!health.healthy) {
      throw new Error(`Qdrant health check failed: ${health.message}`);
    }
    qdrantClientInstance = client;
    return client;
  })();

  try {
    return await qdrantInitPromise;
  } finally {
    qdrantInitPromise = null;
  }
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetQdrantClient(): void {
  qdrantClientInstance = null;
  qdrantInitPromise = null;
}
