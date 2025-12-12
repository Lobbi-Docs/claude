/**
 * @claude-sdk/tools - BenchmarkRunnerTool
 * Performance benchmarking and comparison utilities
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schemas
// ============================================================================

export const BenchmarkSchema = z.object({
  name: z.string(),
  fn: z.string(), // Serialized function code
  iterations: z.number().min(1).max(1000000).default(1000),
  warmup: z.number().min(0).max(100).default(10),
  options: z
    .object({
      trackMemory: z.boolean().default(false),
      async: z.boolean().default(false),
    })
    .optional(),
});

export const CompareBenchmarksSchema = z.object({
  action: z.literal('compare'),
  benchmarks: z.array(BenchmarkSchema).min(2),
});

export const RunBenchmarkSchema = z.object({
  action: z.literal('run'),
  benchmark: BenchmarkSchema,
});

export const BenchmarkRunnerSchema = z.discriminatedUnion('action', [
  RunBenchmarkSchema,
  CompareBenchmarksSchema,
]);

// ============================================================================
// Types
// ============================================================================

export type BenchmarkInput = z.infer<typeof BenchmarkSchema>;
export type BenchmarkRunnerInput = z.infer<typeof BenchmarkRunnerSchema>;

interface BenchmarkStats {
  name: string;
  iterations: number;
  warmup: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
  opsPerSecond: number;
  totalTime: number;
  memoryUsed?: number;
}

interface ComparisonResult {
  benchmarks: BenchmarkStats[];
  fastest: string;
  slowest: string;
  comparison: Record<string, { fasterThan: Record<string, number> }>;
}

// ============================================================================
// BenchmarkRunnerTool Implementation
// ============================================================================

export class BenchmarkRunnerTool {
  /**
   * Run a single benchmark
   */
  private static async runBenchmark(
    config: BenchmarkInput
  ): Promise<BenchmarkStats> {
    const { name, fn, iterations, warmup, options } = config;
    const isAsync = options?.async || false;
    const trackMemory = options?.trackMemory || false;

    // Create function from string
    // Note: In real usage, this would need proper sandboxing
    const func = this.createFunction(fn, isAsync);

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await func();
    }

    // Collect memory before (if tracking)
    const memoryBefore = trackMemory ? this.getMemoryUsage() : 0;

    // Benchmark runs
    const timings: number[] = [];
    const startTotal = performance.now();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await func();
      const end = performance.now();
      timings.push(end - start);
    }

    const endTotal = performance.now();
    const totalTime = endTotal - startTotal;

    // Collect memory after (if tracking)
    const memoryAfter = trackMemory ? this.getMemoryUsage() : 0;
    const memoryUsed = trackMemory ? memoryAfter - memoryBefore : undefined;

    // Calculate statistics
    const sorted = timings.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / iterations;
    const median = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    // Calculate standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);

    // Operations per second
    const opsPerSecond = (1000 / mean) * 1;

    return {
      name,
      iterations,
      warmup,
      min,
      max,
      mean,
      median,
      p95,
      p99,
      stdDev,
      opsPerSecond,
      totalTime,
      memoryUsed,
    };
  }

  /**
   * Compare multiple benchmarks
   */
  private static async compareBenchmarks(
    benchmarks: BenchmarkInput[]
  ): Promise<ComparisonResult> {
    // Run all benchmarks
    const results: BenchmarkStats[] = [];
    for (const benchmark of benchmarks) {
      const stats = await this.runBenchmark(benchmark);
      results.push(stats);
    }

    // Find fastest and slowest
    const sorted = [...results].sort((a, b) => a.mean - b.mean);
    const fastest = sorted[0].name;
    const slowest = sorted[sorted.length - 1].name;

    // Create comparison matrix
    const comparison: Record<string, { fasterThan: Record<string, number> }> = {};

    for (const result of results) {
      comparison[result.name] = { fasterThan: {} };

      for (const other of results) {
        if (result.name !== other.name) {
          const speedup = other.mean / result.mean;
          comparison[result.name].fasterThan[other.name] = speedup;
        }
      }
    }

    return {
      benchmarks: results,
      fastest,
      slowest,
      comparison,
    };
  }

  /**
   * Create executable function from string
   */
  private static createFunction(code: string, isAsync: boolean): () => Promise<unknown> | unknown {
    // Simple eval-based approach (would need sandboxing in production)
    // This is a simplified version for demonstration
    try {
      if (isAsync) {
        // eslint-disable-next-line no-new-func
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        return new AsyncFunction(code) as () => Promise<unknown>;
      } else {
        // Wrap synchronous function in Promise for consistency
        // eslint-disable-next-line no-new-func
        const fn = new Function(code) as () => unknown;
        return () => Promise.resolve(fn());
      }
    } catch (error) {
      // Fallback to simple execution
      return () => Promise.resolve(undefined);
    }
  }

  /**
   * Calculate percentile
   */
  private static percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get current memory usage
   */
  private static getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Format statistics for display
   */
  private static formatStats(stats: BenchmarkStats): string {
    const lines = [
      `Benchmark: ${stats.name}`,
      `Iterations: ${stats.iterations} (${stats.warmup} warmup)`,
      ``,
      `Timings (ms):`,
      `  Min:    ${stats.min.toFixed(4)}`,
      `  Max:    ${stats.max.toFixed(4)}`,
      `  Mean:   ${stats.mean.toFixed(4)}`,
      `  Median: ${stats.median.toFixed(4)}`,
      `  P95:    ${stats.p95.toFixed(4)}`,
      `  P99:    ${stats.p99.toFixed(4)}`,
      `  StdDev: ${stats.stdDev.toFixed(4)}`,
      ``,
      `Performance:`,
      `  ${stats.opsPerSecond.toFixed(2)} ops/sec`,
      `  Total time: ${stats.totalTime.toFixed(2)}ms`,
    ];

    if (stats.memoryUsed !== undefined) {
      lines.push(`  Memory: ${(stats.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    }

    return lines.join('\n');
  }

  /**
   * Format comparison for display
   */
  private static formatComparison(result: ComparisonResult): string {
    const lines = [
      `Benchmark Comparison`,
      `===================`,
      ``,
      `Fastest: ${result.fastest}`,
      `Slowest: ${result.slowest}`,
      ``,
      `Results:`,
    ];

    // Add individual results
    for (const stats of result.benchmarks) {
      lines.push(``);
      lines.push(this.formatStats(stats));
    }

    // Add comparison matrix
    lines.push(``);
    lines.push(`Comparison Matrix:`);
    lines.push(`-----------------`);

    for (const [name, data] of Object.entries(result.comparison)) {
      lines.push(`${name}:`);
      for (const [other, speedup] of Object.entries(data.fasterThan)) {
        const percentage = ((speedup - 1) * 100).toFixed(2);
        lines.push(`  ${speedup.toFixed(2)}x faster than ${other} (${percentage}% faster)`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Main execution method
   */
  static async execute(
    input: BenchmarkRunnerInput,
    context?: ToolContext
  ): Promise<ToolResult<BenchmarkStats | ComparisonResult>> {
    return wrapExecution(
      'BenchmarkRunnerTool',
      async (inp: BenchmarkRunnerInput): Promise<BenchmarkStats | ComparisonResult> => {
        // Validate input
        const parsed = BenchmarkRunnerSchema.safeParse(inp);
        if (!parsed.success) {
          throw ValidationError.fromZodError(parsed.error);
        }

        const { action } = parsed.data;

        if (action === 'run') {
          const stats = await this.runBenchmark(parsed.data.benchmark);
          context?.logger?.info('Benchmark completed', this.formatStats(stats));
          return stats;
        } else if (action === 'compare') {
          const comparison = await this.compareBenchmarks(parsed.data.benchmarks);
          context?.logger?.info('Benchmark comparison completed', this.formatComparison(comparison));
          return comparison;
        }

        throw new ValidationError(
          'Invalid action',
          ['action'],
          action,
          'run|compare'
        );
      },
      input,
      context
    );
  }
}
