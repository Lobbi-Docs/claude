/**
 * Agent Loader with Lazy Loading and Caching
 *
 * Loads agents on-demand instead of upfront, with intelligent caching
 * and preloading strategies. Reduces startup time and memory usage
 * while maintaining fast access to frequently-used agents.
 *
 * @module agent-loader
 * @version 7.4.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentCache, LoadedAgent } from './agent-cache';

/**
 * Agent loader configuration
 */
export interface AgentLoaderOptions {
  /** Path to agents.index.json registry */
  registryPath: string;

  /** Directory containing agent .md files */
  agentsDir: string;

  /** Maximum number of cached agents (default: 30) */
  maxCachedAgents: number;

  /** Load timeout in milliseconds (default: 500) */
  loadTimeoutMs: number;

  /** Agents to preload at startup */
  preloadAgents: string[];
}

/**
 * Agent registry entry (minimal metadata)
 */
interface AgentRegistryEntry {
  name: string;
  type: string;
  category: string;
  skills?: string[];
  models?: string[];
  file?: string;
  loadPriority?: 'high' | 'medium' | 'low';
  expectedLoadTimeMs?: number;
}

/**
 * Agent registry structure
 */
interface AgentRegistry {
  version: string;
  totalAgents: number;
  preloadHints?: string[];
  agents: Record<string, AgentRegistryEntry>;
}

/**
 * Loader statistics
 */
export interface LoaderStats {
  /** Total agents in registry */
  totalAgentsInRegistry: number;

  /** Currently cached agents */
  cachedAgents: number;

  /** Successfully preloaded agents */
  preloadedAgents: number;

  /** Average load time in milliseconds */
  avgLoadTimeMs: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Number of cache evictions */
  evictionCount: number;
}

/**
 * Default preload list (most commonly used agents)
 */
export const DEFAULT_PRELOAD = [
  'triage-agent',
  'code-reviewer',
  'task-enricher',
  'documentation-writer'
];

/**
 * Agent loader with lazy loading and intelligent caching
 *
 * Features:
 * - Load agents on-demand instead of upfront
 * - LRU cache for frequently accessed agents
 * - Parallel preloading of common agents
 * - Load timeout protection
 * - Performance metrics tracking
 */
export class AgentLoader {
  private registry: AgentRegistry | null = null;
  private cache: AgentCache;
  private options: AgentLoaderOptions;
  private loadTimes: number[] = [];
  private preloadedCount: number = 0;

  constructor(options: Partial<AgentLoaderOptions> = {}) {
    this.options = {
      registryPath: options.registryPath || './registry/agents.index.json',
      agentsDir: options.agentsDir || './agents',
      maxCachedAgents: options.maxCachedAgents || 30,
      loadTimeoutMs: options.loadTimeoutMs || 500,
      preloadAgents: options.preloadAgents || DEFAULT_PRELOAD
    };

    this.cache = new AgentCache({
      maxSize: this.options.maxCachedAgents
    });
  }

  /**
   * Initialize loader (load registry, preload agents)
   */
  async initialize(): Promise<void> {
    // Load registry
    await this.loadRegistry();

    // Preload frequently-used agents in parallel
    if (this.options.preloadAgents.length > 0) {
      await this.warmCache(this.options.preloadAgents);
    }
  }

  /**
   * Get agent by name (lazy load if not cached)
   */
  async getAgent(name: string): Promise<LoadedAgent | null> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached) {
      return cached;
    }

    // Load from disk
    return await this.loadAgent(name);
  }

  /**
   * Check if agent exists without loading
   */
  hasAgent(name: string): boolean {
    if (!this.registry) {
      return false;
    }

    return name in this.registry.agents;
  }

  /**
   * Get multiple agents (parallel loading)
   */
  async getAgents(names: string[]): Promise<LoadedAgent[]> {
    const promises = names.map(name => this.getAgent(name));
    const results = await Promise.all(promises);

    // Filter out nulls
    return results.filter((agent): agent is LoadedAgent => agent !== null);
  }

  /**
   * List all available agents (from registry, not loaded)
   */
  listAgents(): Array<{ name: string; type: string; category: string }> {
    if (!this.registry) {
      return [];
    }

    return Object.entries(this.registry.agents).map(([name, entry]) => ({
      name,
      type: entry.type,
      category: entry.category
    }));
  }

  /**
   * Search agents by criteria
   */
  searchAgents(criteria: {
    type?: string;
    category?: string;
    skill?: string;
  }): string[] {
    if (!this.registry) {
      return [];
    }

    const results: string[] = [];

    for (const [name, entry] of Object.entries(this.registry.agents)) {
      let matches = true;

      if (criteria.type && entry.type !== criteria.type) {
        matches = false;
      }

      if (criteria.category && entry.category !== criteria.category) {
        matches = false;
      }

      if (criteria.skill && entry.skills) {
        const hasSkill = entry.skills.some(s => s.includes(criteria.skill!));
        if (!hasSkill) {
          matches = false;
        }
      }

      if (matches) {
        results.push(name);
      }
    }

    return results;
  }

  /**
   * Force unload agent from cache
   */
  unloadAgent(name: string): void {
    this.cache.delete(name);
  }

  /**
   * Get loader statistics
   */
  getStats(): LoaderStats {
    const cacheStats = this.cache.getStats();

    const avgLoadTime = this.loadTimes.length > 0
      ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length
      : 0;

    return {
      totalAgentsInRegistry: this.registry?.totalAgents || 0,
      cachedAgents: cacheStats.size,
      preloadedAgents: this.preloadedCount,
      avgLoadTimeMs: avgLoadTime,
      cacheHitRate: cacheStats.hitRate,
      evictionCount: cacheStats.evictions
    };
  }

  /**
   * Warm cache with specific agents (parallel loading)
   */
  async warmCache(agentNames: string[]): Promise<void> {
    const startTime = Date.now();

    // Load all agents in parallel
    const promises = agentNames.map(name => this.loadAgent(name));
    const results = await Promise.all(promises);

    // Count successful preloads
    this.preloadedCount = results.filter(agent => agent !== null).length;

    const duration = Date.now() - startTime;
    console.log(`Preloaded ${this.preloadedCount}/${agentNames.length} agents in ${duration}ms`);
  }

  /**
   * Load agent registry from disk
   */
  private async loadRegistry(): Promise<void> {
    try {
      const registryPath = path.resolve(this.options.registryPath);

      if (!fs.existsSync(registryPath)) {
        throw new Error(`Agent registry not found: ${registryPath}`);
      }

      const content = fs.readFileSync(registryPath, 'utf-8');
      const data = JSON.parse(content);

      // Transform registry format if needed
      if (data.agents) {
        this.registry = data as AgentRegistry;
      } else {
        // Handle old format (flat list)
        this.registry = {
          version: data.version || '7.4.0',
          totalAgents: Object.keys(data).length,
          agents: data
        };
      }
    } catch (error) {
      console.error('Failed to load agent registry:', error);
      throw error;
    }
  }

  /**
   * Load single agent from disk
   */
  private async loadAgent(name: string): Promise<LoadedAgent | null> {
    if (!this.registry) {
      console.error('Registry not loaded');
      return null;
    }

    const entry = this.registry.agents[name];
    if (!entry) {
      console.warn(`Agent not found in registry: ${name}`);
      return null;
    }

    const startTime = Date.now();

    try {
      // Determine file path
      const fileName = entry.file || `${name}.md`;
      const filePath = path.join(this.options.agentsDir, fileName);

      if (!fs.existsSync(filePath)) {
        console.warn(`Agent file not found: ${filePath}`);
        return null;
      }

      // Read agent definition
      const definition = fs.readFileSync(filePath, 'utf-8');

      const loadTime = Date.now() - startTime;
      this.loadTimes.push(loadTime);

      // Check if load exceeded timeout
      if (loadTime > this.options.loadTimeoutMs) {
        console.warn(`Agent ${name} took ${loadTime}ms to load (timeout: ${this.options.loadTimeoutMs}ms)`);
      }

      const loadedAgent: LoadedAgent = {
        name,
        type: entry.type,
        category: entry.category,
        skills: entry.skills || [],
        models: entry.models || [],
        loadedAt: Date.now(),
        lastUsedAt: Date.now(),
        loadTimeMs: loadTime,
        definition
      };

      // Cache the loaded agent
      this.cache.set(name, loadedAgent);

      return loadedAgent;
    } catch (error) {
      console.error(`Failed to load agent ${name}:`, error);
      return null;
    }
  }

  /**
   * Get cache instance (for advanced operations)
   */
  getCache(): AgentCache {
    return this.cache;
  }

  /**
   * Export cache statistics to file
   */
  exportStats(outputPath: string): void {
    const stats = this.getStats();
    const cacheUsage = this.cache.getUsageReport();

    const report = {
      timestamp: Date.now(),
      loaderStats: stats,
      cacheUsage,
      loadTimeDistribution: {
        min: Math.min(...this.loadTimes),
        max: Math.max(...this.loadTimes),
        avg: stats.avgLoadTimeMs,
        p50: this.calculatePercentile(this.loadTimes, 0.5),
        p95: this.calculatePercentile(this.loadTimes, 0.95)
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index];
  }
}
