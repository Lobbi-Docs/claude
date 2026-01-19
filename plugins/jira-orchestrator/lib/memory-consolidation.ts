/**
 * Memory Consolidation System
 *
 * Implements "sleep-like" processing to strengthen important patterns and prune noise.
 * Runs periodically (e.g., nightly) to transfer valuable episodic memories to
 * long-term semantic memory, similar to how human memory consolidation works during sleep.
 *
 * This enables the Jira orchestrator to:
 * - Retain important lessons learned
 * - Discard low-value noise
 * - Build stronger meta-patterns over time
 * - Continuously improve without human intervention
 *
 * Enhanced in v7.4.0 with:
 * - Connection pooling for Memory MCP access
 * - Batch operations for efficient write operations
 * - Query caching for faster reads
 * - Graph maintenance integration
 *
 * @module memory-consolidation
 * @version 7.4.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryPool } from './memory-pool';
import { MemoryBatcher } from './batch-memory-operations';
import { MemoryQueryOptimizer } from './memory-query-optimizer';
import { MemoryGraphMaintenance } from './memory-graph-maintenance';

/**
 * Episodic memory - specific task execution
 */
export interface Episode {
  /** Unique episode identifier */
  id: string;

  /** When this episode occurred */
  timestamp: Date;

  /** Task that was executed */
  task: {
    key: string;
    type: string;
    complexity: number;
    domain: string[];
  };

  /** Outcome of the task */
  outcome: {
    success: boolean;
    duration: number;
    quality: number;
    issuesEncountered: string[];
  };

  /** Patterns observed during execution */
  patterns: Pattern[];

  /** Importance score (0-1) */
  importance: number;

  /** Agents involved */
  agentsInvolved: string[];

  /** User feedback (if any) */
  userFeedback?: {
    rating: number;
    comments: string;
  };
}

/**
 * Pattern extracted from episodes
 */
export interface Pattern {
  /** Pattern identifier */
  id: string;

  /** Pattern type */
  type: 'success-strategy' | 'failure-mode' | 'agent-combination' | 'workflow-sequence' | 'optimization';

  /** Pattern description */
  description: string;

  /** How often this pattern appears */
  frequency: number;

  /** Success rate when this pattern is used */
  successRate: number;

  /** How transferable to other tasks (0-1) */
  transferability: number;

  /** Contexts where this pattern applies */
  applicableContexts: string[];

  /** Evidence supporting this pattern */
  evidence: string[];

  /** Confidence in this pattern (0-1) */
  confidence: number;
}

/**
 * Semantic memory - generalized knowledge
 */
export interface SemanticKnowledge {
  /** Knowledge identifier */
  id: string;

  /** Category of knowledge */
  category: string;

  /** Knowledge content */
  content: string;

  /** Strength of this knowledge (0-1, decays over time if not reinforced) */
  strength: number;

  /** Number of times this has been useful */
  utilityCount: number;

  /** Last time this was accessed */
  lastAccessed: Date;

  /** Last time this was reinforced */
  lastReinforced: Date;

  /** Derived from these patterns */
  derivedFrom: string[];
}

/**
 * Consolidation report
 */
export interface ConsolidationReport {
  /** When consolidation ran */
  timestamp: Date;

  /** Episodes processed */
  episodesProcessed: number;

  /** Patterns extracted */
  patternsExtracted: number;

  /** Semantic entries created/updated */
  semanticEntriesUpdated: number;

  /** Episodes pruned */
  episodesPruned: number;

  /** Insights generated */
  insights: Insight[];

  /** Duration of consolidation (ms) */
  duration: number;

  /** Storage stats */
  storage: {
    episodicMemorySize: number;
    semanticMemorySize: number;
    patternLibrarySize: number;
  };
}

/**
 * Insight generated from consolidation
 */
export interface Insight {
  /** Insight type */
  type: 'trend' | 'anomaly' | 'recommendation' | 'warning';

  /** Insight description */
  description: string;

  /** Confidence (0-1) */
  confidence: number;

  /** Supporting data */
  supportingData: any;

  /** Recommended actions */
  actions?: string[];
}

/**
 * Memory Consolidation System
 */
export class MemoryConsolidationSystem {
  private episodicMemory: Episode[] = [];
  private semanticMemory: Map<string, SemanticKnowledge> = new Map();
  private patternLibrary: Map<string, Pattern> = new Map();

  private storagePath: string;
  private consolidationHistory: ConsolidationReport[] = [];

  // v7.4.0: Memory optimization components (optional - use when available)
  private memoryPool?: MemoryPool;
  private memoryBatcher?: MemoryBatcher;
  private memoryOptimizer?: MemoryQueryOptimizer;
  private memoryMaintenance?: MemoryGraphMaintenance;

  constructor(storagePath: string = './sessions/intelligence') {
    this.storagePath = storagePath;
  }

  /**
   * Initialize memory optimization components (v7.4.0)
   * Call this to enable pooling, batching, caching, and maintenance features
   */
  initializeOptimization(): void {
    this.memoryPool = new MemoryPool({
      maxConnections: 10,
      connectionTimeout: 5000,
      idleTimeout: 30000,
      maxWaiting: 50,
      debug: false
    });

    this.memoryBatcher = new MemoryBatcher(this.memoryPool, {
      maxBatchSize: 10,
      flushIntervalMs: 1000,
      retryOnFailure: true,
      maxRetries: 2,
      debug: false
    });

    this.memoryOptimizer = new MemoryQueryOptimizer(this.memoryPool, {
      cachePath: path.join(this.storagePath, '../cache/memory-query.db'),
      cacheTtlMs: 300000,
      maxResultsPerQuery: 100,
      enabled: true,
      debug: false
    });

    this.memoryMaintenance = new MemoryGraphMaintenance(
      this.memoryPool,
      this.memoryOptimizer,
      {
        orphanThresholdDays: 30,
        duplicateThreshold: 0.9,
        archivePath: path.join(this.storagePath, '../memory/archive/'),
        debug: false
      }
    );

    console.log('✨ Memory optimization enabled (v7.4.0)');
  }

  /**
   * Cleanup optimization resources
   */
  async cleanupOptimization(): Promise<void> {
    if (this.memoryBatcher) {
      await this.memoryBatcher.shutdown();
    }
    if (this.memoryOptimizer) {
      this.memoryOptimizer.close();
    }
    if (this.memoryPool) {
      await this.memoryPool.drain();
    }
  }

  /**
   * Load memories from storage
   */
  async load(): Promise<void> {
    try {
      // Load episodic memory
      const episodicPath = path.join(this.storagePath, 'task-outcome-history.json');
      const episodicData = await fs.readFile(episodicPath, 'utf-8');
      const episodic = JSON.parse(episodicData);
      this.episodicMemory = episodic.history || [];

      // Load semantic memory
      const semanticPath = path.join(this.storagePath, 'semantic-memory.json');
      try {
        const semanticData = await fs.readFile(semanticPath, 'utf-8');
        const semantic = JSON.parse(semanticData);
        this.semanticMemory = new Map(Object.entries(semantic.knowledge || {}));
      } catch {
        // File doesn't exist yet
        this.semanticMemory = new Map();
      }

      // Load pattern library
      const patternPath = path.join(this.storagePath, 'pattern-library.json');
      try {
        const patternData = await fs.readFile(patternPath, 'utf-8');
        const patterns = JSON.parse(patternData);
        this.patternLibrary = new Map(Object.entries(patterns.patterns || {}));
      } catch {
        // File doesn't exist yet
        this.patternLibrary = new Map();
      }

      console.log(`📚 Loaded ${this.episodicMemory.length} episodes, ${this.semanticMemory.size} semantic entries, ${this.patternLibrary.size} patterns`);
    } catch (error) {
      console.warn('⚠️  Could not load memory:', error);
    }
  }

  /**
   * Save memories to storage
   */
  async save(): Promise<void> {
    // Save episodic memory
    const episodicPath = path.join(this.storagePath, 'task-outcome-history.json');
    await fs.writeFile(
      episodicPath,
      JSON.stringify({ history: this.episodicMemory }, null, 2)
    );

    // Save semantic memory
    const semanticPath = path.join(this.storagePath, 'semantic-memory.json');
    const semanticObj = Object.fromEntries(this.semanticMemory.entries());
    await fs.writeFile(
      semanticPath,
      JSON.stringify({ knowledge: semanticObj }, null, 2)
    );

    // Save pattern library
    const patternPath = path.join(this.storagePath, 'pattern-library.json');
    const patternObj = Object.fromEntries(this.patternLibrary.entries());
    await fs.writeFile(
      patternPath,
      JSON.stringify({ patterns: patternObj }, null, 2)
    );

    console.log('💾 Memories saved to storage');
  }

  /**
   * Run memory consolidation (typically nightly)
   */
  async consolidate(hoursBack: number = 24): Promise<ConsolidationReport> {
    console.log('\n🌙 Starting memory consolidation...');
    const startTime = Date.now();

    await this.load();

    // Phase 1: Review recent episodes
    const recentEpisodes = this.getRecentEpisodes(hoursBack);
    console.log(`  Phase 1: Reviewing ${recentEpisodes.length} recent episodes`);

    // Phase 2: Extract important patterns
    const patterns = await this.extractPatterns(recentEpisodes);
    console.log(`  Phase 2: Extracted ${patterns.length} patterns`);

    // Phase 3: Rank by utility
    const importantPatterns = this.rankByUtility(patterns);
    console.log(`  Phase 3: Identified ${importantPatterns.length} important patterns`);

    // Phase 4: Transfer to semantic memory
    let semanticUpdates = 0;
    for (const pattern of importantPatterns.slice(0, 100)) {
      await this.strengthenSemanticMemory(pattern);
      semanticUpdates++;
    }
    console.log(`  Phase 4: Updated ${semanticUpdates} semantic entries`);

    // Phase 5: Prune low-value episodes
    const pruned = this.pruneEpisodicMemory(0.3);
    console.log(`  Phase 5: Pruned ${pruned} low-value episodes`);

    // Phase 6: Generate insights
    const insights = await this.generateInsights(importantPatterns);
    console.log(`  Phase 6: Generated ${insights.length} insights`);

    // Phase 7: Decay unused semantic knowledge
    this.decayUnusedKnowledge();

    await this.save();

    const report: ConsolidationReport = {
      timestamp: new Date(),
      episodesProcessed: recentEpisodes.length,
      patternsExtracted: patterns.length,
      semanticEntriesUpdated: semanticUpdates,
      episodesPruned: pruned,
      insights,
      duration: Date.now() - startTime,
      storage: {
        episodicMemorySize: this.episodicMemory.length,
        semanticMemorySize: this.semanticMemory.size,
        patternLibrarySize: this.patternLibrary.size
      }
    };

    this.consolidationHistory.push(report);

    console.log(`\n✅ Consolidation complete in ${(report.duration / 1000).toFixed(1)}s`);

    return report;
  }

  /**
   * Get recent episodes within time window
   */
  private getRecentEpisodes(hoursBack: number): Episode[] {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return this.episodicMemory.filter(
      ep => new Date(ep.timestamp) >= cutoff
    );
  }

  /**
   * Extract patterns from episodes using meta-analysis
   */
  private async extractPatterns(episodes: Episode[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Success strategies
    const successEpisodes = episodes.filter(ep => ep.outcome.success);
    if (successEpisodes.length > 3) {
      // Find common patterns in successful episodes
      const commonStrategies = this.findCommonalities(
        successEpisodes,
        'success-strategy'
      );
      patterns.push(...commonStrategies);
    }

    // Failure modes
    const failureEpisodes = episodes.filter(ep => !ep.outcome.success);
    if (failureEpisodes.length > 2) {
      const commonFailures = this.findCommonalities(
        failureEpisodes,
        'failure-mode'
      );
      patterns.push(...commonFailures);
    }

    // Effective agent combinations
    const agentCombinations = this.findEffectiveAgentCombinations(episodes);
    patterns.push(...agentCombinations);

    // Workflow optimizations
    const optimizations = this.findOptimizations(episodes);
    patterns.push(...optimizations);

    return patterns;
  }

  /**
   * Find commonalities in a set of episodes
   */
  private findCommonalities(
    episodes: Episode[],
    patternType: Pattern['type']
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Group by domain
    const byDomain = new Map<string, Episode[]>();
    for (const ep of episodes) {
      for (const domain of ep.task.domain) {
        if (!byDomain.has(domain)) {
          byDomain.set(domain, []);
        }
        byDomain.get(domain)!.push(ep);
      }
    }

    // Extract patterns for each domain
    for (const [domain, domainEpisodes] of byDomain.entries()) {
      if (domainEpisodes.length < 2) continue;

      // Find common agents
      const agentCounts = new Map<string, number>();
      for (const ep of domainEpisodes) {
        for (const agent of ep.agentsInvolved) {
          agentCounts.set(agent, (agentCounts.get(agent) || 0) + 1);
        }
      }

      const commonAgents = Array.from(agentCounts.entries())
        .filter(([_, count]) => count >= domainEpisodes.length * 0.5)
        .map(([agent]) => agent);

      if (commonAgents.length > 0) {
        patterns.push({
          id: `${patternType}-${domain}-${Date.now()}`,
          type: patternType,
          description: `${patternType} for ${domain}: Use ${commonAgents.join(', ')}`,
          frequency: domainEpisodes.length,
          successRate: patternType === 'success-strategy' ? 1.0 : 0.0,
          transferability: 0.7,
          applicableContexts: [domain],
          evidence: domainEpisodes.map(ep => ep.task.key),
          confidence: Math.min(0.9, domainEpisodes.length / 10)
        });
      }
    }

    return patterns;
  }

  /**
   * Find effective agent combinations
   */
  private findEffectiveAgentCombinations(episodes: Episode[]): Pattern[] {
    const patterns: Pattern[] = [];
    const combinations = new Map<string, { success: number; total: number }>();

    for (const ep of episodes) {
      const combo = ep.agentsInvolved.sort().join('+');
      if (!combinations.has(combo)) {
        combinations.set(combo, { success: 0, total: 0 });
      }

      const stats = combinations.get(combo)!;
      stats.total++;
      if (ep.outcome.success) stats.success++;
    }

    // Filter for combinations with good success rate
    for (const [combo, stats] of combinations.entries()) {
      if (stats.total >= 3 && stats.success / stats.total >= 0.8) {
        patterns.push({
          id: `agent-combo-${combo}-${Date.now()}`,
          type: 'agent-combination',
          description: `Effective combination: ${combo}`,
          frequency: stats.total,
          successRate: stats.success / stats.total,
          transferability: 0.6,
          applicableContexts: ['multi-agent-orchestration'],
          evidence: [`${stats.success}/${stats.total} successes`],
          confidence: Math.min(0.9, stats.total / 10)
        });
      }
    }

    return patterns;
  }

  /**
   * Find optimization opportunities
   */
  private findOptimizations(episodes: Episode[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Find tasks that were faster than average
    const byType = new Map<string, Episode[]>();
    for (const ep of episodes) {
      if (!byType.has(ep.task.type)) {
        byType.set(ep.task.type, []);
      }
      byType.get(ep.task.type)!.push(ep);
    }

    for (const [type, typeEpisodes] of byType.entries()) {
      if (typeEpisodes.length < 5) continue;

      const durations = typeEpisodes.map(ep => ep.outcome.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const fastEpisodes = typeEpisodes.filter(
        ep => ep.outcome.duration < avgDuration * 0.7
      );

      if (fastEpisodes.length >= 2) {
        patterns.push({
          id: `optimization-${type}-${Date.now()}`,
          type: 'optimization',
          description: `Fast ${type} execution pattern`,
          frequency: fastEpisodes.length,
          successRate: fastEpisodes.filter(ep => ep.outcome.success).length / fastEpisodes.length,
          transferability: 0.8,
          applicableContexts: [type],
          evidence: fastEpisodes.map(ep => `${ep.task.key}: ${ep.outcome.duration}ms`),
          confidence: Math.min(0.9, fastEpisodes.length / 5)
        });
      }
    }

    return patterns;
  }

  /**
   * Rank patterns by utility for semantic memory transfer
   */
  private rankByUtility(patterns: Pattern[]): Pattern[] {
    return patterns.sort((a, b) => {
      // Utility = frequency × success_rate × transferability × confidence
      const utilityA = a.frequency * a.successRate * a.transferability * a.confidence;
      const utilityB = b.frequency * b.successRate * b.transferability * b.confidence;
      return utilityB - utilityA;
    });
  }

  /**
   * Transfer pattern to semantic memory (strengthen knowledge)
   */
  private async strengthenSemanticMemory(pattern: Pattern): Promise<void> {
    const existingKey = pattern.description;
    const existing = this.semanticMemory.get(existingKey);

    if (existing) {
      // Strengthen existing knowledge
      existing.strength = Math.min(1.0, existing.strength + 0.1);
      existing.utilityCount++;
      existing.lastReinforced = new Date();
      existing.derivedFrom.push(pattern.id);
    } else {
      // Create new semantic knowledge
      this.semanticMemory.set(existingKey, {
        id: `semantic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category: pattern.type,
        content: pattern.description,
        strength: pattern.confidence,
        utilityCount: 1,
        lastAccessed: new Date(),
        lastReinforced: new Date(),
        derivedFrom: [pattern.id]
      });
    }

    // Also update pattern library
    this.patternLibrary.set(pattern.id, pattern);
  }

  /**
   * Prune low-value episodic memories
   */
  private pruneEpisodicMemory(threshold: number): number {
    const before = this.episodicMemory.length;

    this.episodicMemory = this.episodicMemory.filter(
      ep => ep.importance >= threshold
    );

    return before - this.episodicMemory.length;
  }

  /**
   * Generate insights from consolidated patterns
   */
  private async generateInsights(patterns: Pattern[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Trend: Increasing success rate
    const successPatterns = patterns.filter(p => p.type === 'success-strategy');
    if (successPatterns.length > 5) {
      insights.push({
        type: 'trend',
        description: `Found ${successPatterns.length} successful strategies, system is learning effectively`,
        confidence: 0.8,
        supportingData: { patterns: successPatterns.length },
        actions: ['Continue current approach', 'Share learnings across agents']
      });
    }

    // Warning: High failure rate in specific domain
    const failurePatterns = patterns.filter(p => p.type === 'failure-mode');
    const failureDomains = new Map<string, number>();
    for (const pattern of failurePatterns) {
      for (const context of pattern.applicableContexts) {
        failureDomains.set(context, (failureDomains.get(context) || 0) + 1);
      }
    }

    for (const [domain, count] of failureDomains.entries()) {
      if (count >= 3) {
        insights.push({
          type: 'warning',
          description: `High failure rate in ${domain} domain (${count} failure patterns)`,
          confidence: 0.7,
          supportingData: { domain, failures: count },
          actions: [
            `Review ${domain} agent configuration`,
            `Add specialized agent for ${domain}`,
            'Increase testing in this domain'
          ]
        });
      }
    }

    // Recommendation: Adopt high-utility patterns
    const topPatterns = patterns
      .sort((a, b) => (b.frequency * b.successRate) - (a.frequency * a.successRate))
      .slice(0, 3);

    for (const pattern of topPatterns) {
      if (pattern.successRate > 0.9 && pattern.frequency > 5) {
        insights.push({
          type: 'recommendation',
          description: `Adopt pattern: ${pattern.description}`,
          confidence: pattern.confidence,
          supportingData: {
            frequency: pattern.frequency,
            successRate: pattern.successRate
          },
          actions: [`Apply this pattern to all ${pattern.applicableContexts.join(', ')} tasks`]
        });
      }
    }

    return insights;
  }

  /**
   * Decay strength of unused semantic knowledge
   */
  private decayUnusedKnowledge(): void {
    const now = new Date();
    const decayThresholdDays = 30;

    for (const [key, knowledge] of this.semanticMemory.entries()) {
      const daysSinceAccess =
        (now.getTime() - new Date(knowledge.lastAccessed).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceAccess > decayThresholdDays) {
        // Decay by 10% per month
        knowledge.strength *= 0.9;

        // Remove if strength falls below threshold
        if (knowledge.strength < 0.1) {
          this.semanticMemory.delete(key);
        }
      }
    }
  }

  /**
   * Get consolidation history
   */
  getHistory(): ConsolidationReport[] {
    return [...this.consolidationHistory];
  }

  /**
   * Get semantic knowledge
   */
  getSemanticKnowledge(): Map<string, SemanticKnowledge> {
    return new Map(this.semanticMemory);
  }

  /**
   * Get pattern library
   */
  getPatternLibrary(): Map<string, Pattern> {
    return new Map(this.patternLibrary);
  }
}

export default MemoryConsolidationSystem;
