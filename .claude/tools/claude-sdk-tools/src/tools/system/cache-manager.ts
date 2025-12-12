/**
 * @claude-sdk/tools - CacheManagerTool
 * In-memory cache with TTL and LRU eviction
 */

import { z } from 'zod';
import { success, failure } from '../../utils/index.js';
import { ConfigurationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const CacheManagerSchema = z.object({
  operation: z.enum(['get', 'set', 'delete', 'clear', 'has', 'stats', 'configure']),
  key: z.string().optional(),
  value: z.unknown().optional(),
  ttl: z.number().min(0).optional(), // TTL in seconds
  // Configuration
  maxSize: z.number().min(1).max(100000).optional(),
  defaultTtl: z.number().min(0).optional(),
});

export type CacheManagerInput = z.infer<typeof CacheManagerSchema>;

interface CacheEntry {
  value: unknown;
  expiresAt: number | null; // null means no expiration
  accessedAt: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  defaultTtl: number;
}

export interface CacheManagerOutput {
  operation: string;
  key?: string;
  value?: unknown;
  exists?: boolean;
  deleted?: boolean;
  cleared?: boolean;
  stats?: CacheStats;
}

// ============================================================================
// CacheManagerTool Implementation
// ============================================================================

export class CacheManagerTool {
  private static cache = new Map<string, CacheEntry>();
  private static maxSize = 1000;
  private static defaultTtl = 300; // 5 minutes in seconds
  private static hits = 0;
  private static misses = 0;
  private static evictions = 0;

  /**
   * Execute cache operations
   */
  static async execute(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    try {
      // Clean expired entries before each operation
      this.cleanExpired();

      switch (input.operation) {
        case 'get':
          return this.get(input, context);
        case 'set':
          return this.set(input, context);
        case 'delete':
          return this.delete(input, context);
        case 'clear':
          return this.clear(input, context);
        case 'has':
          return this.has(input, context);
        case 'stats':
          return this.stats(input, context);
        case 'configure':
          return this.configure(input, context);
        default:
          throw new ConfigurationError(
            `Unknown operation: ${input.operation}`,
            'operation',
            input.operation
          );
      }
    } catch (error) {
      context.logger?.error('CacheManager operation failed', error);
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get value from cache
   */
  private static async get(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('key is required for get operation', 'key', undefined);
    }

    const entry = this.cache.get(input.key);

    if (!entry) {
      this.misses++;
      context.logger?.debug(`CacheManager: Miss for key ${input.key}`);
      return success({
        operation: 'get',
        key: input.key,
        value: null,
        exists: false,
      });
    }

    // Check expiration
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(input.key);
      this.misses++;
      context.logger?.debug(`CacheManager: Expired key ${input.key}`);
      return success({
        operation: 'get',
        key: input.key,
        value: null,
        exists: false,
      });
    }

    // Update access time for LRU
    entry.accessedAt = Date.now();
    this.hits++;

    context.logger?.debug(`CacheManager: Hit for key ${input.key}`);

    return success({
      operation: 'get',
      key: input.key,
      value: entry.value,
      exists: true,
    });
  }

  /**
   * Set value in cache
   */
  private static async set(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('key is required for set operation', 'key', undefined);
    }
    if (input.value === undefined) {
      throw new ConfigurationError('value is required for set operation', 'value', undefined);
    }

    // Apply LRU eviction if at max size and key doesn't exist
    if (!this.cache.has(input.key) && this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const ttl = input.ttl ?? this.defaultTtl;
    const now = Date.now();

    const entry: CacheEntry = {
      value: input.value,
      expiresAt: ttl > 0 ? now + ttl * 1000 : null,
      accessedAt: now,
      createdAt: now,
    };

    this.cache.set(input.key, entry);

    context.logger?.debug(`CacheManager: Set key ${input.key}`, { ttl });

    return success({
      operation: 'set',
      key: input.key,
      value: input.value,
    });
  }

  /**
   * Delete key from cache
   */
  private static async delete(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('key is required for delete operation', 'key', undefined);
    }

    const existed = this.cache.has(input.key);
    this.cache.delete(input.key);

    context.logger?.debug(`CacheManager: Deleted key ${input.key}`, { existed });

    return success({
      operation: 'delete',
      key: input.key,
      deleted: existed,
    });
  }

  /**
   * Clear all cache entries
   */
  private static async clear(
    _input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;

    context.logger?.info(`CacheManager: Cleared ${size} entries`);

    return success({
      operation: 'clear',
      cleared: true,
    });
  }

  /**
   * Check if key exists in cache
   */
  private static async has(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    void input; // Mark as used
    if (!input.key) {
      throw new ConfigurationError('key is required for has operation', 'key', undefined);
    }

    const entry = this.cache.get(input.key);
    let exists = false;

    if (entry) {
      // Check expiration
      if (entry.expiresAt === null || Date.now() <= entry.expiresAt) {
        exists = true;
      } else {
        // Clean up expired entry
        this.cache.delete(input.key);
      }
    }

    context.logger?.debug(`CacheManager: Check key ${input.key}`, { exists });

    return success({
      operation: 'has',
      key: input.key,
      exists,
    });
  }

  /**
   * Get cache statistics
   */
  private static async stats(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    void input; // Mark as used
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    const stats: CacheStats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      evictions: this.evictions,
      defaultTtl: this.defaultTtl,
    };

    context.logger?.debug('CacheManager: Stats retrieved', stats);

    return success({
      operation: 'stats',
      stats,
    });
  }

  /**
   * Configure cache settings
   */
  private static async configure(
    input: CacheManagerInput,
    context: ToolContext
  ): Promise<ToolResult<CacheManagerOutput>> {
    if (input.maxSize !== undefined) {
      this.maxSize = input.maxSize;
      // Evict if over new max size
      while (this.cache.size > this.maxSize) {
        this.evictLRU();
      }
    }

    if (input.defaultTtl !== undefined) {
      this.defaultTtl = input.defaultTtl;
    }

    context.logger?.info('CacheManager: Configuration updated', {
      maxSize: this.maxSize,
      defaultTtl: this.defaultTtl,
    });

    return success({
      operation: 'configure',
      stats: {
        size: this.cache.size,
        maxSize: this.maxSize,
        hits: this.hits,
        misses: this.misses,
        hitRate: 0,
        evictions: this.evictions,
        defaultTtl: this.defaultTtl,
      },
    });
  }

  /**
   * Clean expired entries
   */
  private static cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Evict least recently used entry
   */
  private static evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  /**
   * Get current cache size
   */
  static getSize(): number {
    this.cleanExpired();
    return this.cache.size;
  }

  /**
   * Reset cache (for testing)
   */
  static reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.maxSize = 1000;
    this.defaultTtl = 300;
  }
}
