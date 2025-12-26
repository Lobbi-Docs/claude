/**
 * Workflow Cache Module for Jira Work Orchestrator v5.0
 *
 * Provides memoization and caching for Jira, Confluence, and file analysis
 * to reduce redundant API calls and speed up repeated runs.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  type: string;
  priority: string;
  labels: string[];
  status: string;
  assignee?: string;
  linkedIssues?: string[];
  storyPoints?: number;
}

interface ConfluencePage {
  id: string;
  title: string;
  space: string;
  url: string;
  excerpt?: string;
}

interface FileAnalysis {
  path: string;
  hash: string;
  lines: number;
  complexity?: number;
  lastModified: number;
}

interface GateResult {
  gate: string;
  passed: boolean;
  score: number;
  timestamp: number;
  fileHashes: Record<string, string>;
}

// TTL values in milliseconds
const TTL = {
  JIRA: 5 * 60 * 1000,          // 5 minutes
  CONFLUENCE: 10 * 60 * 1000,   // 10 minutes
  FILE_ANALYSIS: Infinity,       // Until file changes
  GATE_RESULTS: Infinity         // Until code changes
} as const;

/**
 * Workflow Cache singleton
 */
class WorkflowCache {
  private jira: Map<string, CacheEntry<JiraIssue>> = new Map();
  private confluence: Map<string, CacheEntry<ConfluencePage[]>> = new Map();
  private fileAnalysis: Map<string, CacheEntry<FileAnalysis>> = new Map();
  private gateResults: Map<string, CacheEntry<GateResult>> = new Map();

  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  /**
   * Check if cache entry is expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    if (entry.ttl === Infinity) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get Jira issue from cache
   */
  getJira(issueKey: string): JiraIssue | null {
    const entry = this.jira.get(issueKey);
    if (entry && !this.isExpired(entry)) {
      this.stats.hits++;
      return entry.value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Cache Jira issue
   */
  setJira(issueKey: string, issue: JiraIssue): void {
    this.jira.set(issueKey, {
      value: issue,
      timestamp: Date.now(),
      ttl: TTL.JIRA
    });
  }

  /**
   * Get Confluence pages from cache
   */
  getConfluence(query: string): ConfluencePage[] | null {
    const entry = this.confluence.get(query);
    if (entry && !this.isExpired(entry)) {
      this.stats.hits++;
      return entry.value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Cache Confluence search results
   */
  setConfluence(query: string, pages: ConfluencePage[]): void {
    this.confluence.set(query, {
      value: pages,
      timestamp: Date.now(),
      ttl: TTL.CONFLUENCE
    });
  }

  /**
   * Get file analysis from cache (checks hash for validity)
   */
  getFileAnalysis(filePath: string, currentHash?: string): FileAnalysis | null {
    const entry = this.fileAnalysis.get(filePath);
    if (entry) {
      // If hash provided, check if file has changed
      if (currentHash && entry.value.hash !== currentHash) {
        this.stats.evictions++;
        this.fileAnalysis.delete(filePath);
        return null;
      }
      this.stats.hits++;
      return entry.value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Cache file analysis
   */
  setFileAnalysis(filePath: string, analysis: FileAnalysis): void {
    this.fileAnalysis.set(filePath, {
      value: analysis,
      timestamp: Date.now(),
      ttl: TTL.FILE_ANALYSIS
    });
  }

  /**
   * Get gate results from cache (checks file hashes)
   */
  getGateResult(gateName: string, fileHashes: Record<string, string>): GateResult | null {
    const entry = this.gateResults.get(gateName);
    if (entry) {
      // Check if any files have changed
      const cachedHashes = entry.value.fileHashes;
      const filesChanged = Object.keys(fileHashes).some(
        path => cachedHashes[path] !== fileHashes[path]
      );

      if (filesChanged) {
        this.stats.evictions++;
        this.gateResults.delete(gateName);
        return null;
      }

      this.stats.hits++;
      return entry.value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Cache gate result
   */
  setGateResult(gateName: string, result: GateResult): void {
    this.gateResults.set(gateName, {
      value: result,
      timestamp: Date.now(),
      ttl: TTL.GATE_RESULTS
    });
  }

  /**
   * Pre-warm cache for an issue (call at workflow start)
   */
  async prewarm(issueKey: string, fetchJira: () => Promise<JiraIssue>, fetchConfluence: () => Promise<ConfluencePage[]>): Promise<void> {
    const promises: Promise<void>[] = [];

    // Warm Jira cache if not present
    if (!this.getJira(issueKey)) {
      promises.push(
        fetchJira().then(issue => this.setJira(issueKey, issue))
      );
    }

    // Warm Confluence cache
    const projectKey = issueKey.split('-')[0];
    if (!this.getConfluence(projectKey)) {
      promises.push(
        fetchConfluence().then(pages => this.setConfluence(projectKey, pages))
      );
    }

    await Promise.all(promises);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.jira.clear();
    this.confluence.clear();
    this.fileAnalysis.clear();
    this.gateResults.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Clear expired entries
   */
  prune(): number {
    let pruned = 0;

    for (const [key, entry] of this.jira) {
      if (this.isExpired(entry)) {
        this.jira.delete(key);
        pruned++;
      }
    }

    for (const [key, entry] of this.confluence) {
      if (this.isExpired(entry)) {
        this.confluence.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache statistics
   */
  getStats(): typeof this.stats & { size: { jira: number; confluence: number; files: number; gates: number } } {
    return {
      ...this.stats,
      size: {
        jira: this.jira.size,
        confluence: this.confluence.size,
        files: this.fileAnalysis.size,
        gates: this.gateResults.size
      }
    };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
  }
}

// Export singleton instance
export const workflowCache = new WorkflowCache();

// Export types
export type { JiraIssue, ConfluencePage, FileAnalysis, GateResult };
