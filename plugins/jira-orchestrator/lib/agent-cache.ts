/**
 * Agent Cache with LRU Eviction
 *
 * Provides memory-efficient caching for loaded agent definitions with
 * Least Recently Used (LRU) eviction strategy. Tracks access patterns
 * for optimization and supports optional persistence to disk.
 *
 * @module agent-cache
 * @version 7.4.0
 */

/**
 * Configuration options for LRU cache
 */
export interface CacheOptions {
  /** Maximum number of items to cache (default: 30) */
  maxSize: number;

  /** Optional path for persistence to disk */
  persistPath?: string;

  /** Enable compression for cached values (default: false) */
  compressionEnabled: boolean;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  /** Cache key */
  key: string;

  /** Cached value */
  value: T;

  /** Approximate size in bytes */
  size: number;

  /** Number of times accessed */
  accessCount: number;

  /** Timestamp when created */
  createdAt: number;

  /** Timestamp of last access */
  lastAccessedAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Current number of cached items */
  size: number;

  /** Maximum allowed size */
  maxSize: number;

  /** Cache hit rate (0-1) */
  hitRate: number;

  /** Total number of evictions */
  evictions: number;

  /** Most frequently accessed keys */
  mostAccessed: string[];
}

/**
 * Generic LRU (Least Recently Used) cache implementation
 *
 * Uses a Map for O(1) lookups and maintains LRU order.
 * Evicts least recently used items when maxSize is reached.
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private options: CacheOptions;
  private hits: number = 0;
  private misses: number = 0;
  private evictionCount: number = 0;

  constructor(options?: Partial<CacheOptions>) {
    this.options = {
      maxSize: 30,
      compressionEnabled: false,
      ...options
    };
    this.cache = new Map();
  }

  /**
   * Get item from cache (updates LRU order)
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    this.hits++;

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set item in cache (may trigger eviction)
   */
  set(key: string, value: T): void {
    // Check if update to existing item
    const existing = this.cache.get(key);
    if (existing) {
      existing.value = value;
      existing.lastAccessedAt = Date.now();

      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, existing);
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      key,
      value,
      size: this.estimateSize(value),
      accessCount: 0,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists without updating LRU order
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete specific item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictionCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalAccesses = this.hits + this.misses;

    // Sort by access count to find most accessed
    const byAccessCount = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5)
      .map(e => e.key);

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: totalAccesses > 0 ? this.hits / totalAccesses : 0,
      evictions: this.evictionCount,
      mostAccessed: byAccessCount
    };
  }

  /**
   * Persist cache to disk (if persistPath configured)
   */
  persist(): void {
    if (!this.options.persistPath) {
      return;
    }

    const fs = require('fs');
    const path = require('path');

    try {
      // Create directory if needed
      const dir = path.dirname(this.options.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert Map to array for serialization
      const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        entry
      }));

      const data = {
        version: '7.4.0',
        timestamp: Date.now(),
        options: this.options,
        entries,
        stats: {
          hits: this.hits,
          misses: this.misses,
          evictions: this.evictionCount
        }
      };

      fs.writeFileSync(this.options.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  /**
   * Load cache from disk
   */
  restore(): void {
    if (!this.options.persistPath) {
      return;
    }

    const fs = require('fs');

    try {
      if (!fs.existsSync(this.options.persistPath)) {
        return;
      }

      const data = JSON.parse(fs.readFileSync(this.options.persistPath, 'utf-8'));

      // Restore entries
      this.cache.clear();
      for (const { key, entry } of data.entries) {
        this.cache.set(key, entry);
      }

      // Restore stats
      if (data.stats) {
        this.hits = data.stats.hits || 0;
        this.misses = data.stats.misses || 0;
        this.evictionCount = data.stats.evictions || 0;
      }
    } catch (error) {
      console.error('Failed to restore cache:', error);
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    // First item in Map is least recently used
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.evictionCount++;
    }
  }

  /**
   * Estimate size of cached value in bytes
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1000; // Default estimate if can't serialize
    }
  }
}

/**
 * Loaded agent definition
 */
export interface LoadedAgent {
  /** Agent name */
  name: string;

  /** Agent type (core, intelligence, workflows, etc.) */
  type: string;

  /** Agent category */
  category: string;

  /** Required skills */
  skills: string[];

  /** Supported models */
  models: string[];

  /** Timestamp when loaded */
  loadedAt: number;

  /** Timestamp of last use */
  lastUsedAt: number;

  /** Load time in milliseconds */
  loadTimeMs: number;

  /** Full agent definition content */
  definition: string;
}

/**
 * Specialized cache for agent definitions
 *
 * Extends LRUCache with agent-specific queries and reporting.
 */
export class AgentCache extends LRUCache<LoadedAgent> {
  constructor(options?: Partial<CacheOptions>) {
    super({
      maxSize: 30,
      ...options
    });
  }

  /**
   * Get all cached agents by category
   */
  getByCategory(category: string): LoadedAgent[] {
    const results: LoadedAgent[] = [];

    for (const entry of (this as any).cache.values()) {
      if (entry.value.category === category) {
        results.push(entry.value);
      }
    }

    return results;
  }

  /**
   * Get all cached agents by type
   */
  getByType(type: string): LoadedAgent[] {
    const results: LoadedAgent[] = [];

    for (const entry of (this as any).cache.values()) {
      if (entry.value.type === type) {
        results.push(entry.value);
      }
    }

    return results;
  }

  /**
   * Get usage report sorted by access frequency
   */
  getUsageReport(): Array<{ name: string; accessCount: number; lastUsed: number }> {
    const entries = Array.from((this as any).cache.values()) as CacheEntry<LoadedAgent>[];

    return entries
      .map(entry => ({
        name: entry.value.name,
        accessCount: entry.accessCount,
        lastUsed: entry.lastAccessedAt
      }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Get all cached agents (for inspection)
   */
  getAllAgents(): LoadedAgent[] {
    return Array.from((this as any).cache.values()).map((entry: CacheEntry<LoadedAgent>) => entry.value);
  }
}
