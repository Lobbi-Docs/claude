/**
 * Memory Optimization System - Usage Example
 *
 * Demonstrates how to use the v7.4.0 memory optimization components together.
 * This example shows the complete workflow from pool initialization to cleanup.
 *
 * @module memory-optimization-example
 * @version 7.4.0
 */

import { MemoryPool } from './memory-pool';
import { MemoryBatcher } from './batch-memory-operations';
import { MemoryQueryOptimizer } from './memory-query-optimizer';
import { MemoryGraphMaintenance } from './memory-graph-maintenance';
import { MemoryConsolidationSystem } from './memory-consolidation';

/**
 * Example: Complete memory optimization setup
 */
async function exampleFullSetup() {
  console.log('🚀 Memory Optimization System v7.4.0\n');

  // Step 1: Initialize connection pool
  console.log('1. Initializing connection pool...');
  const pool = new MemoryPool({
    maxConnections: 10,
    connectionTimeout: 5000,
    idleTimeout: 30000,
    maxWaiting: 50,
    debug: true
  });

  // Step 2: Initialize batch processor
  console.log('2. Initializing batch processor...');
  const batcher = new MemoryBatcher(pool, {
    maxBatchSize: 10,
    flushIntervalMs: 1000,
    retryOnFailure: true,
    maxRetries: 2,
    debug: true
  });

  // Step 3: Initialize query optimizer with cache
  console.log('3. Initializing query optimizer...');
  const optimizer = new MemoryQueryOptimizer(pool, {
    cachePath: './sessions/cache/memory-query.db',
    cacheTtlMs: 300000,
    maxResultsPerQuery: 100,
    enabled: true,
    debug: true
  });

  // Step 4: Initialize maintenance system
  console.log('4. Initializing maintenance system...');
  const maintenance = new MemoryGraphMaintenance(pool, optimizer, {
    orphanThresholdDays: 30,
    duplicateThreshold: 0.9,
    archivePath: './sessions/memory/archive/',
    debug: true
  });

  // Step 5: Use the system
  console.log('\n5. Using the optimization system...\n');

  // Example: Batch create entities
  await batcher.queue({
    type: 'create_entity',
    payload: {
      name: 'AI-1099',
      entityType: 'JiraIssue',
      observations: ['Foundation fixes for v7.4']
    },
    callback: (result) => console.log('  ✅ Entity created:', result)
  });

  // Example: Optimized search
  const searchResult = await optimizer.searchNodes('AI-1099', 10);
  console.log(`  🔍 Search result (from cache: ${searchResult.fromCache}):`, searchResult.totalCount, 'nodes');

  // Example: Get pool stats
  const poolStats = pool.getStats();
  console.log(`  📊 Pool stats: ${poolStats.activeConnections} active, ${poolStats.idleConnections} idle`);

  // Example: Get cache stats
  const cacheStats = optimizer.getCacheStats();
  console.log(`  💾 Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses (${(cacheStats.hitRate * 100).toFixed(1)}% hit rate)`);

  // Example: Get graph stats
  const graphStats = await maintenance.getStats();
  console.log(`  📈 Graph stats: ${graphStats.entityCount} entities, ${graphStats.relationCount} relations`);

  // Step 6: Cleanup
  console.log('\n6. Cleaning up...');
  await batcher.shutdown();
  optimizer.close();
  await pool.drain();

  console.log('✅ Done!\n');
}

/**
 * Example: Integration with memory consolidation
 */
async function exampleConsolidationIntegration() {
  console.log('🔗 Memory Consolidation Integration\n');

  // Create consolidation system
  const consolidation = new MemoryConsolidationSystem('./sessions/intelligence');

  // Initialize optimization (v7.4.0)
  consolidation.initializeOptimization();

  // Run consolidation with optimization
  const report = await consolidation.consolidate(24);

  console.log('📊 Consolidation report:');
  console.log(`  Episodes processed: ${report.episodesProcessed}`);
  console.log(`  Patterns extracted: ${report.patternsExtracted}`);
  console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);

  // Cleanup
  await consolidation.cleanupOptimization();

  console.log('✅ Done!\n');
}

/**
 * Example: Maintenance workflow
 */
async function exampleMaintenanceWorkflow() {
  console.log('🔧 Maintenance Workflow\n');

  const pool = new MemoryPool({ debug: true });
  const optimizer = new MemoryQueryOptimizer(pool, { debug: true });
  const maintenance = new MemoryGraphMaintenance(pool, optimizer, { debug: true });

  // Get current stats
  const stats = await maintenance.getStats();
  console.log('📊 Current graph statistics:');
  console.log(`  Entities: ${stats.entityCount}`);
  console.log(`  Relations: ${stats.relationCount}`);
  console.log(`  Orphans: ${stats.orphanedEntities}`);
  console.log(`  Density: ${(stats.graphDensity * 100).toFixed(2)}%`);

  // Find issues
  const orphans = await maintenance.findOrphans();
  const duplicates = await maintenance.findDuplicates();

  console.log(`\n🔍 Found ${orphans.length} orphaned entities`);
  console.log(`🔍 Found ${duplicates.length} potential duplicates`);

  // Run cleanup (dry run)
  const cleanupResult = await maintenance.runCleanup(true);
  console.log('\n🧹 Cleanup result (dry run):');
  console.log(`  Would remove ${cleanupResult.orphansRemoved} orphans`);
  console.log(`  Would archive ${cleanupResult.entitiesArchived} entities`);
  console.log(`  Would free ${cleanupResult.freedSpace}`);

  // Cleanup
  optimizer.close();
  await pool.drain();

  console.log('\n✅ Done!\n');
}

/**
 * Example: Performance comparison
 */
async function examplePerformanceComparison() {
  console.log('⚡ Performance Comparison\n');

  const pool = new MemoryPool();
  const optimizer = new MemoryQueryOptimizer(pool, { enabled: true });

  // First query (cache miss)
  const start1 = Date.now();
  const result1 = await optimizer.searchNodes('test query', 10);
  const time1 = Date.now() - start1;

  // Second query (cache hit)
  const start2 = Date.now();
  const result2 = await optimizer.searchNodes('test query', 10);
  const time2 = Date.now() - start2;

  console.log('📊 Query performance:');
  console.log(`  First query (cache miss): ${time1}ms`);
  console.log(`  Second query (cache hit): ${time2}ms`);
  console.log(`  Speedup: ${(time1 / time2).toFixed(1)}x faster`);

  // Cleanup
  optimizer.close();
  await pool.drain();

  console.log('\n✅ Done!\n');
}

// Export examples
export {
  exampleFullSetup,
  exampleConsolidationIntegration,
  exampleMaintenanceWorkflow,
  examplePerformanceComparison
};

// Run examples if executed directly
if (require.main === module) {
  (async () => {
    console.log('='.repeat(60));
    await exampleFullSetup();
    console.log('='.repeat(60));
    await exampleMaintenanceWorkflow();
    console.log('='.repeat(60));
    await examplePerformanceComparison();
  })();
}
