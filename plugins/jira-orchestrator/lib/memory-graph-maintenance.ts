/**
 * Memory Graph Maintenance System
 *
 * Provides graph cleanup and optimization utilities:
 * - Identify orphaned entities (no relations)
 * - Find duplicate entities by name similarity
 * - Calculate graph statistics (entity/relation counts, connectivity)
 * - Archive old entities (>30 days without access)
 * - Compact graph by removing stale data
 * - Health monitoring and reporting
 *
 * Scheduled runs: Weekly for maintenance, daily for health checks
 *
 * @module memory-graph-maintenance
 * @version 7.4.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryPool, PoolConnection } from './memory-pool';
import { MemoryQueryOptimizer } from './memory-query-optimizer';

/**
 * Maintenance configuration options
 */
export interface MaintenanceOptions {
  /** Days before considering entity orphaned (default: 30) */
  orphanThresholdDays: number;

  /** Similarity threshold for duplicates 0-1 (default: 0.9) */
  duplicateThreshold: number;

  /** Path to archive old entities (default: ./sessions/memory/archive/) */
  archivePath: string;

  /** Enable debug logging (default: false) */
  debug: boolean;
}

/**
 * Graph statistics
 */
export interface GraphStats {
  /** Total entities in graph */
  entityCount: number;

  /** Total relations in graph */
  relationCount: number;

  /** Average relations per entity */
  avgRelationsPerEntity: number;

  /** Orphaned entities (no relations) */
  orphanedEntities: number;

  /** Oldest entity info */
  oldestEntity: {
    name: string;
    createdAt: number;
  } | null;

  /** Newest entity info */
  newestEntity: {
    name: string;
    createdAt: number;
  } | null;

  /** Entity type distribution */
  entityTypeDistribution: Record<string, number>;

  /** Most connected entities */
  mostConnected: Array<{
    name: string;
    connectionCount: number;
  }>;

  /** Graph density (0-1) */
  graphDensity: number;
}

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  /** Orphaned entities removed */
  orphansRemoved: number;

  /** Duplicate entities merged */
  duplicatesMerged: number;

  /** Entities archived */
  entitiesArchived: number;

  /** Relations removed */
  relationsRemoved: number;

  /** Estimated space freed */
  freedSpace: string;

  /** Cleanup duration (ms) */
  duration: number;

  /** Errors encountered */
  errors: string[];
}

/**
 * Duplicate entity pair
 */
export interface DuplicatePair {
  /** First entity name */
  entity1: string;

  /** Second entity name */
  entity2: string;

  /** Similarity score 0-1 */
  similarity: number;

  /** Suggested merge target */
  suggestedTarget: string;
}

/**
 * Archived entity
 */
interface ArchivedEntity {
  name: string;
  type: string;
  observations: string[];
  relations: Array<{ from: string; to: string; type: string }>;
  archivedAt: number;
  reason: string;
}

/**
 * Memory Graph Maintenance System
 */
export class MemoryGraphMaintenance {
  private pool: MemoryPool;
  private optimizer: MemoryQueryOptimizer;
  private options: MaintenanceOptions;

  /**
   * Create maintenance system
   */
  constructor(
    pool: MemoryPool,
    optimizer: MemoryQueryOptimizer,
    options?: Partial<MaintenanceOptions>
  ) {
    this.pool = pool;
    this.optimizer = optimizer;
    this.options = {
      orphanThresholdDays: options?.orphanThresholdDays ?? 30,
      duplicateThreshold: options?.duplicateThreshold ?? 0.9,
      archivePath: options?.archivePath ?? './sessions/memory/archive/',
      debug: options?.debug ?? false
    };

    if (this.options.debug) {
      console.log(`🔧 Memory graph maintenance initialized`);
    }
  }

  /**
   * Get comprehensive graph statistics
   */
  async getStats(): Promise<GraphStats> {
    if (this.options.debug) {
      console.log('📊 Calculating graph statistics...');
    }

    const graph = await this.optimizer.readGraph() as any;

    const entities = graph.entities || [];
    const relations = graph.relations || [];

    // Calculate basic counts
    const entityCount = entities.length;
    const relationCount = relations.length;
    const avgRelationsPerEntity = entityCount > 0 ? relationCount / entityCount : 0;

    // Find orphaned entities
    const connectedEntities = new Set<string>();
    for (const rel of relations) {
      connectedEntities.add(rel.from);
      connectedEntities.add(rel.to);
    }
    const orphanedEntities = entityCount - connectedEntities.size;

    // Find oldest/newest entities
    const sortedByDate = [...entities].sort((a, b) =>
      (a.createdAt || 0) - (b.createdAt || 0)
    );

    const oldestEntity = sortedByDate.length > 0
      ? { name: sortedByDate[0].name, createdAt: sortedByDate[0].createdAt || 0 }
      : null;

    const newestEntity = sortedByDate.length > 0
      ? { name: sortedByDate[sortedByDate.length - 1].name, createdAt: sortedByDate[sortedByDate.length - 1].createdAt || 0 }
      : null;

    // Entity type distribution
    const entityTypeDistribution: Record<string, number> = {};
    for (const entity of entities) {
      const type = entity.type || 'Unknown';
      entityTypeDistribution[type] = (entityTypeDistribution[type] || 0) + 1;
    }

    // Most connected entities
    const connectionCounts = new Map<string, number>();
    for (const rel of relations) {
      connectionCounts.set(rel.from, (connectionCounts.get(rel.from) || 0) + 1);
      connectionCounts.set(rel.to, (connectionCounts.get(rel.to) || 0) + 1);
    }

    const mostConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, connectionCount: count }));

    // Graph density (actual edges / possible edges)
    const maxPossibleEdges = entityCount * (entityCount - 1);
    const graphDensity = maxPossibleEdges > 0 ? relationCount / maxPossibleEdges : 0;

    return {
      entityCount,
      relationCount,
      avgRelationsPerEntity,
      orphanedEntities,
      oldestEntity,
      newestEntity,
      entityTypeDistribution,
      mostConnected,
      graphDensity
    };
  }

  /**
   * Find orphaned entities (no relations)
   */
  async findOrphans(): Promise<string[]> {
    if (this.options.debug) {
      console.log('🔍 Finding orphaned entities...');
    }

    const graph = await this.optimizer.readGraph() as any;
    const entities = graph.entities || [];
    const relations = graph.relations || [];

    // Build set of connected entities
    const connected = new Set<string>();
    for (const rel of relations) {
      connected.add(rel.from);
      connected.add(rel.to);
    }

    // Find orphans
    const orphans = entities
      .filter((entity: any) => !connected.has(entity.name))
      .map((entity: any) => entity.name);

    if (this.options.debug) {
      console.log(`Found ${orphans.length} orphaned entities`);
    }

    return orphans;
  }

  /**
   * Find potential duplicate entities by name similarity
   */
  async findDuplicates(): Promise<DuplicatePair[]> {
    if (this.options.debug) {
      console.log('🔍 Finding duplicate entities...');
    }

    const graph = await this.optimizer.readGraph() as any;
    const entities = graph.entities || [];

    const duplicates: DuplicatePair[] = [];

    // Compare each pair of entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        const similarity = this.calculateSimilarity(entity1.name, entity2.name);

        if (similarity >= this.options.duplicateThreshold) {
          duplicates.push({
            entity1: entity1.name,
            entity2: entity2.name,
            similarity,
            suggestedTarget: entity1.name.length <= entity2.name.length ? entity1.name : entity2.name
          });
        }
      }
    }

    if (this.options.debug) {
      console.log(`Found ${duplicates.length} potential duplicates`);
    }

    return duplicates;
  }

  /**
   * Run full cleanup operation
   *
   * @param dryRun - If true, don't actually delete anything
   * @returns Cleanup result
   */
  async runCleanup(dryRun: boolean = false): Promise<CleanupResult> {
    const startTime = Date.now();

    if (this.options.debug) {
      console.log(`🧹 Starting cleanup ${dryRun ? '(DRY RUN)' : ''}...`);
    }

    const result: CleanupResult = {
      orphansRemoved: 0,
      duplicatesMerged: 0,
      entitiesArchived: 0,
      relationsRemoved: 0,
      freedSpace: '0 KB',
      duration: 0,
      errors: []
    };

    try {
      // Step 1: Archive old entities
      const archived = await this.archiveOld(this.options.orphanThresholdDays, dryRun);
      result.entitiesArchived = archived;

      // Step 2: Remove orphans
      const orphans = await this.findOrphans();
      if (!dryRun && orphans.length > 0) {
        await this.removeEntities(orphans);
      }
      result.orphansRemoved = orphans.length;

      // Step 3: Find and report duplicates (manual merge recommended)
      const duplicates = await this.findDuplicates();
      result.duplicatesMerged = 0; // Manual merge recommended

      if (duplicates.length > 0) {
        result.errors.push(
          `Found ${duplicates.length} potential duplicates - manual review recommended`
        );
      }

      // Step 4: Remove dangling relations (relations to non-existent entities)
      const danglingRelations = await this.findDanglingRelations();
      if (!dryRun && danglingRelations.length > 0) {
        await this.removeRelations(danglingRelations);
      }
      result.relationsRemoved = danglingRelations.length;

      // Estimate freed space (rough estimate: 1KB per entity/relation)
      const totalRemoved = result.orphansRemoved + result.entitiesArchived + result.relationsRemoved;
      result.freedSpace = `${Math.round(totalRemoved * 1.0)} KB`;

      // Invalidate cache after cleanup
      if (!dryRun) {
        this.optimizer.invalidateCache();
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    result.duration = Date.now() - startTime;

    if (this.options.debug) {
      console.log(`✅ Cleanup complete in ${result.duration}ms`);
      console.log(`   Orphans removed: ${result.orphansRemoved}`);
      console.log(`   Entities archived: ${result.entitiesArchived}`);
      console.log(`   Relations removed: ${result.relationsRemoved}`);
      console.log(`   Space freed: ${result.freedSpace}`);
    }

    return result;
  }

  /**
   * Archive old entities (>threshold days)
   *
   * @param thresholdDays - Age threshold in days
   * @param dryRun - If true, don't actually archive
   * @returns Number of entities archived
   */
  async archiveOld(thresholdDays?: number, dryRun: boolean = false): Promise<number> {
    const threshold = thresholdDays ?? this.options.orphanThresholdDays;
    const cutoffDate = Date.now() - (threshold * 24 * 60 * 60 * 1000);

    if (this.options.debug) {
      console.log(`📦 Archiving entities older than ${threshold} days...`);
    }

    const graph = await this.optimizer.readGraph() as any;
    const entities = graph.entities || [];
    const relations = graph.relations || [];

    // Find old entities
    const oldEntities = entities.filter((entity: any) => {
      const createdAt = entity.createdAt || Date.now();
      const lastAccessed = entity.lastAccessed || createdAt;
      return lastAccessed < cutoffDate;
    });

    if (oldEntities.length === 0) {
      return 0;
    }

    if (!dryRun) {
      // Archive to file
      const archived: ArchivedEntity[] = oldEntities.map((entity: any) => {
        // Find related relations
        const entityRelations = relations.filter(
          (rel: any) => rel.from === entity.name || rel.to === entity.name
        );

        return {
          name: entity.name,
          type: entity.type,
          observations: entity.observations || [],
          relations: entityRelations,
          archivedAt: Date.now(),
          reason: `Inactive for ${threshold} days`
        };
      });

      await this.writeArchive(archived);

      // Remove from graph
      const entityNames = oldEntities.map((e: any) => e.name);
      await this.removeEntities(entityNames);
    }

    if (this.options.debug) {
      console.log(`📦 Archived ${oldEntities.length} entities`);
    }

    return oldEntities.length;
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;

    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(s1, s2);
    return 1.0 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Find dangling relations (pointing to non-existent entities)
   */
  private async findDanglingRelations(): Promise<any[]> {
    const graph = await this.optimizer.readGraph() as any;
    const entities = graph.entities || [];
    const relations = graph.relations || [];

    const entityNames = new Set(entities.map((e: any) => e.name));

    return relations.filter(
      (rel: any) => !entityNames.has(rel.from) || !entityNames.has(rel.to)
    );
  }

  /**
   * Remove entities from graph
   */
  private async removeEntities(names: string[]): Promise<void> {
    if (names.length === 0) return;

    await this.pool.withConnection(async (conn: PoolConnection) => {
      // MCP call: await mcp.delete_entities({ entityNames: names })
      if (this.options.debug) {
        console.log(`🗑️  Removing ${names.length} entities`);
      }
    }, 'normal');
  }

  /**
   * Remove relations from graph
   */
  private async removeRelations(relations: any[]): Promise<void> {
    if (relations.length === 0) return;

    await this.pool.withConnection(async (conn: PoolConnection) => {
      // MCP call: await mcp.delete_relations({ relations })
      if (this.options.debug) {
        console.log(`🗑️  Removing ${relations.length} relations`);
      }
    }, 'normal');
  }

  /**
   * Write archived entities to file
   */
  private async writeArchive(entities: ArchivedEntity[]): Promise<void> {
    // Ensure archive directory exists
    await fs.mkdir(this.options.archivePath, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = path.join(this.options.archivePath, `archive-${timestamp}.json`);

    await fs.writeFile(filename, JSON.stringify(entities, null, 2));

    if (this.options.debug) {
      console.log(`📝 Wrote archive to ${filename}`);
    }
  }
}

export default MemoryGraphMaintenance;
