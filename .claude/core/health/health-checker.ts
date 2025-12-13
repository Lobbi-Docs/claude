/**
 * Health Checker Engine
 *
 * Core health monitoring system for Claude orchestration framework
 */

import {
  HealthCheck,
  HealthCheckResult,
  HealthStatus,
  OverallHealth,
  HealthIssue,
  Severity,
  HealthConfiguration,
  HealthMetrics,
  ComponentStatus
} from './types.js';

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private config: HealthConfiguration;
  private metrics: HealthMetrics;
  private startTime: Date;

  constructor(config?: Partial<HealthConfiguration>) {
    this.config = {
      enabled: true,
      checksEnabled: [],
      checksDisabled: [],
      timeout: 5000,
      retryAttempts: 2,
      autoFix: false,
      reportingLevel: 'standard',
      ...config
    };

    this.startTime = new Date();
    this.metrics = {
      uptime: 0,
      lastHealthCheck: new Date(),
      totalChecks: 0,
      failedChecks: 0,
      averageCheckDuration: 0,
      componentStatuses: []
    };
  }

  /**
   * Register a health check
   */
  register(check: HealthCheck): void {
    if (this.checks.has(check.name)) {
      console.warn(`Health check "${check.name}" already registered, overwriting`);
    }
    this.checks.set(check.name, check);
  }

  /**
   * Register multiple health checks
   */
  registerAll(checks: HealthCheck[]): void {
    checks.forEach(check => this.register(check));
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * Get list of registered checks
   */
  listChecks(): string[] {
    return Array.from(this.checks.keys());
  }

  /**
   * Run a specific health check
   */
  async run(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      return {
        name,
        status: HealthStatus.UNKNOWN,
        message: `Health check "${name}" not found`,
        timestamp: new Date(),
        duration: 0,
        issues: [{
          severity: Severity.CRITICAL,
          code: 'CHECK_NOT_FOUND',
          message: `Health check "${name}" is not registered`,
          component: 'health-checker'
        }]
      };
    }

    return this.executeCheck(check);
  }

  /**
   * Run all registered health checks
   */
  async runAll(): Promise<OverallHealth> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];
    const allIssues: HealthIssue[] = [];

    // Sort checks by dependencies
    const sortedChecks = this.topologicalSort();

    // Execute checks in order
    for (const checkName of sortedChecks) {
      const check = this.checks.get(checkName);
      if (!check) continue;

      // Skip if disabled
      if (this.isCheckDisabled(check.name)) {
        continue;
      }

      const result = await this.executeCheck(check);
      results.push(result);

      if (result.issues) {
        allIssues.push(...result.issues);
      }
    }

    const duration = Date.now() - startTime;

    // Calculate summary
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === HealthStatus.HEALTHY).length,
      degraded: results.filter(r => r.status === HealthStatus.DEGRADED).length,
      unhealthy: results.filter(r => r.status === HealthStatus.UNHEALTHY).length,
      unknown: results.filter(r => r.status === HealthStatus.UNKNOWN).length
    };

    // Determine overall status
    const overallStatus = this.calculateOverallStatus(results);

    // Update metrics
    this.updateMetrics(results, duration);

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks: results,
      summary,
      issues: allIssues,
      duration
    };
  }

  /**
   * Execute a single health check with timeout and retry
   */
  private async executeCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const timeout = check.timeout || this.config.timeout;
    const startTime = Date.now();

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= (check.retryable ? this.config.retryAttempts : 0)) {
      try {
        const result = await this.withTimeout(check.check(), timeout);
        const duration = Date.now() - startTime;

        return {
          ...result,
          duration
        };
      } catch (error) {
        lastError = error as Error;
        attempts++;

        if (attempts > (check.retryable ? this.config.retryAttempts : 0)) {
          break;
        }

        // Wait before retry (exponential backoff)
        await this.sleep(Math.pow(2, attempts) * 100);
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    return {
      name: check.name,
      status: HealthStatus.UNHEALTHY,
      message: `Check failed: ${lastError?.message || 'Unknown error'}`,
      timestamp: new Date(),
      duration,
      issues: [{
        severity: Severity.CRITICAL,
        code: 'CHECK_EXECUTION_FAILED',
        message: lastError?.message || 'Unknown error',
        component: check.name,
        details: {
          attempts,
          error: lastError?.stack
        }
      }]
    };
  }

  /**
   * Run health check with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      visiting.add(name);

      const check = this.checks.get(name);
      if (check?.dependencies) {
        for (const dep of check.dependencies) {
          if (this.checks.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(name);
    };

    for (const name of this.checks.keys()) {
      visit(name);
    }

    return sorted;
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallStatus(results: HealthCheckResult[]): HealthStatus {
    if (results.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    // If any critical check is unhealthy, overall is unhealthy
    const criticalChecks = results.filter(r => {
      const check = this.checks.get(r.name);
      return check?.priority === 'critical' || check?.priority === 'high';
    });

    const hasCriticalFailure = criticalChecks.some(r => r.status === HealthStatus.UNHEALTHY);
    if (hasCriticalFailure) {
      return HealthStatus.UNHEALTHY;
    }

    // If any check is unhealthy, overall is unhealthy
    const hasUnhealthy = results.some(r => r.status === HealthStatus.UNHEALTHY);
    if (hasUnhealthy) {
      return HealthStatus.UNHEALTHY;
    }

    // If any check is degraded, overall is degraded
    const hasDegraded = results.some(r => r.status === HealthStatus.DEGRADED);
    if (hasDegraded) {
      return HealthStatus.DEGRADED;
    }

    // All checks healthy
    return HealthStatus.HEALTHY;
  }

  /**
   * Check if a health check is disabled
   */
  private isCheckDisabled(name: string): boolean {
    if (this.config.checksDisabled.includes(name)) {
      return true;
    }

    if (this.config.checksEnabled.length > 0 && !this.config.checksEnabled.includes(name)) {
      return true;
    }

    return false;
  }

  /**
   * Update health metrics
   */
  private updateMetrics(results: HealthCheckResult[], duration: number): void {
    this.metrics.lastHealthCheck = new Date();
    this.metrics.totalChecks += results.length;
    this.metrics.failedChecks += results.filter(
      r => r.status === HealthStatus.UNHEALTHY
    ).length;

    // Update average duration
    const totalDuration = this.metrics.averageCheckDuration * (this.metrics.totalChecks - results.length) + duration;
    this.metrics.averageCheckDuration = totalDuration / this.metrics.totalChecks;

    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime.getTime();

    // Update component statuses
    this.metrics.componentStatuses = results.map(r => ({
      name: r.name,
      type: this.inferComponentType(r.name),
      status: r.status,
      message: r.message,
      lastChecked: r.timestamp,
      metadata: r.metadata
    }));
  }

  /**
   * Infer component type from check name
   */
  private inferComponentType(name: string): ComponentStatus['type'] {
    if (name.includes('database') || name.includes('db')) return 'database';
    if (name.includes('mcp')) return 'mcp';
    if (name.includes('registry')) return 'registry';
    if (name.includes('hook')) return 'hook';
    if (name.includes('agent')) return 'agent';
    if (name.includes('file')) return 'file';
    return 'system';
  }

  /**
   * Get current health status (quick check)
   */
  getStatus(): HealthStatus {
    if (this.metrics.componentStatuses.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    const statuses = this.metrics.componentStatuses.map(c => c.status);
    return this.calculateOverallStatus(
      statuses.map((status, i) => ({
        name: this.metrics.componentStatuses[i].name,
        status,
        message: '',
        timestamp: new Date(),
        duration: 0
      }))
    );
  }

  /**
   * Get health metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all registered checks
   */
  clear(): void {
    this.checks.clear();
  }
}
