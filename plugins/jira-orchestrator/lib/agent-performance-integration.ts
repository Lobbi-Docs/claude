/**
 * Agent Performance Integration
 *
 * Demonstrates integration of agent loader, cache, and metrics
 * for optimized agent performance tracking and management.
 *
 * @module agent-performance-integration
 * @version 7.4.0
 */

import { AgentLoader, DEFAULT_PRELOAD } from './agent-loader';
import { AgentCache } from './agent-cache';
import { AgentMetricsCollector } from './agent-metrics';
import * as path from 'path';

/**
 * Integrated agent performance system
 *
 * Combines lazy loading, caching, and metrics tracking
 * for optimal agent performance.
 */
export class AgentPerformanceSystem {
  private loader: AgentLoader;
  private metrics: AgentMetricsCollector;

  constructor(
    registryPath: string = './registry/agents.index.json',
    agentsDir: string = './agents',
    metricsPath: string = './sessions/metrics/agents'
  ) {
    // Initialize loader with default preload list
    this.loader = new AgentLoader({
      registryPath,
      agentsDir,
      maxCachedAgents: 30,
      loadTimeoutMs: 500,
      preloadAgents: DEFAULT_PRELOAD
    });

    // Initialize metrics collector
    this.metrics = new AgentMetricsCollector(metricsPath);
  }

  /**
   * Initialize the performance system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Agent Performance System...');

    // Initialize loader (loads registry and preloads agents)
    await this.loader.initialize();

    // Print loader statistics
    const loaderStats = this.loader.getStats();
    console.log('Loader Statistics:');
    console.log(`  Total Agents: ${loaderStats.totalAgentsInRegistry}`);
    console.log(`  Preloaded: ${loaderStats.preloadedAgents}`);
    console.log(`  Avg Load Time: ${loaderStats.avgLoadTimeMs.toFixed(0)}ms`);
    console.log('');
  }

  /**
   * Execute agent with performance tracking
   *
   * @param agentName - Name of agent to execute
   * @param model - Model to use (opus, sonnet, haiku)
   * @param taskType - Optional task categorization
   * @param executionFn - Function that executes the agent
   */
  async executeAgent<T>(
    agentName: string,
    model: string,
    taskType: string | undefined,
    executionFn: () => Promise<T>
  ): Promise<T> {
    // Load agent (from cache if available)
    const agent = await this.loader.getAgent(agentName);

    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    // Start metrics tracking
    const executionId = this.metrics.startExecution(agentName, model, taskType);

    try {
      // Execute agent logic
      const result = await executionFn();

      // Record success
      this.metrics.endExecution(executionId, true);

      return result;
    } catch (error) {
      // Record failure
      const errorType = error instanceof Error ? error.name : 'UnknownError';
      this.metrics.endExecution(executionId, false, errorType);

      throw error;
    }
  }

  /**
   * Get performance report for all agents
   */
  getPerformanceReport(): string {
    return this.metrics.getSummaryReport();
  }

  /**
   * Get loader statistics
   */
  getLoaderStats() {
    return this.loader.getStats();
  }

  /**
   * Get metrics for specific agent
   */
  getAgentMetrics(agentName: string) {
    return this.metrics.getAgentMetrics(agentName);
  }

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(timeRangeMs?: number) {
    return this.metrics.getAggregateMetrics(timeRangeMs);
  }

  /**
   * Export comprehensive performance report
   */
  exportReport(outputPath: string): void {
    const fs = require('fs');

    const report = {
      timestamp: Date.now(),
      loader: this.loader.getStats(),
      metrics: {
        aggregate: this.metrics.getAggregateMetrics(),
        byAgent: this.metrics.getAllMetrics()
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Performance report exported to: ${outputPath}`);
  }

  /**
   * Persist all data to disk
   */
  async persist(): Promise<void> {
    this.metrics.persist();
    this.loader.getCache().persist();
  }

  /**
   * Cleanup old metrics
   */
  cleanupMetrics(retentionDays: number = 30): number {
    return this.metrics.cleanup(retentionDays);
  }
}

/**
 * Example usage demonstrating the performance system
 */
export async function exampleUsage() {
  // Initialize performance system
  const perfSystem = new AgentPerformanceSystem(
    path.join(__dirname, '../registry/agents.index.json'),
    path.join(__dirname, '../agents'),
    path.join(__dirname, '../sessions/metrics/agents')
  );

  await perfSystem.initialize();

  // Execute an agent with tracking
  try {
    const result = await perfSystem.executeAgent(
      'triage-agent',
      'sonnet',
      'triage',
      async () => {
        // Agent execution logic here
        console.log('Executing triage agent...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, issues: [] };
      }
    );

    console.log('Agent execution result:', result);
  } catch (error) {
    console.error('Agent execution failed:', error);
  }

  // Get performance report
  console.log('\n' + perfSystem.getPerformanceReport());

  // Export detailed report
  perfSystem.exportReport('./sessions/metrics/agents/performance-report.json');

  // Persist metrics
  await perfSystem.persist();
}

/**
 * Integration with existing AgentSwarm
 *
 * Shows how to integrate metrics collection into AgentSwarm
 */
export function integrateWithSwarm() {
  // In agent-swarm.ts, add at the top:
  // import { AgentMetricsCollector } from './agent-metrics';

  // In AgentSwarm class constructor:
  // private metricsCollector: AgentMetricsCollector;
  // this.metricsCollector = new AgentMetricsCollector('./sessions/metrics/agents');

  // In solve() method, wrap agent execution:
  // const executionId = this.metricsCollector.startExecution(
  //   agentName,
  //   model,
  //   'swarm-exploration'
  // );
  //
  // try {
  //   // ... existing agent execution logic
  //   this.metricsCollector.endExecution(executionId, true);
  // } catch (error) {
  //   this.metricsCollector.endExecution(executionId, false, error.name);
  // }

  // In getMetrics() method, merge with agent metrics:
  // return {
  //   ...this.metrics,
  //   agentMetrics: this.metricsCollector.getAggregateMetrics()
  // };
}

/**
 * Command-line interface for performance reports
 */
export async function generateReport(args: {
  registryPath?: string;
  agentsDir?: string;
  metricsPath?: string;
  outputPath?: string;
}) {
  const perfSystem = new AgentPerformanceSystem(
    args.registryPath,
    args.agentsDir,
    args.metricsPath
  );

  await perfSystem.initialize();

  const outputPath = args.outputPath || './sessions/metrics/agents/report.json';
  perfSystem.exportReport(outputPath);

  console.log('\n=== Performance Summary ===');
  console.log(perfSystem.getPerformanceReport());
}
