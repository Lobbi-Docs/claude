/**
 * Health Check API
 *
 * HTTP endpoints for health monitoring
 */

import { HealthChecker } from './health-checker.js';
import { HealthRemediation } from './remediation.js';
import { ALL_CHECKS } from './checks/index.js';
import { HealthStatus, STATUS_EMOJI, SEVERITY_EMOJI } from './types.js';

export interface HealthAPIOptions {
  port?: number;
  host?: string;
  enableAutoFix?: boolean;
}

/**
 * Health API Class
 *
 * Provides programmatic and HTTP access to health checks
 */
export class HealthAPI {
  private checker: HealthChecker;
  private remediation: HealthRemediation;
  private options: Required<HealthAPIOptions>;

  constructor(options: HealthAPIOptions = {}) {
    this.options = {
      port: options.port || 8080,
      host: options.host || 'localhost',
      enableAutoFix: options.enableAutoFix || false
    };

    this.checker = new HealthChecker({
      autoFix: this.options.enableAutoFix
    });

    this.remediation = new HealthRemediation();

    // Register all checks
    this.checker.registerAll(ALL_CHECKS);
  }

  /**
   * Get overall health status
   * Endpoint: GET /health
   */
  async getHealth(verbose: boolean = false) {
    const health = await this.checker.runAll();

    if (!verbose) {
      return {
        status: health.status,
        timestamp: health.timestamp,
        summary: health.summary,
        duration: health.duration
      };
    }

    return health;
  }

  /**
   * Get liveness status
   * Endpoint: GET /health/live
   *
   * Returns whether the system is running (always true if responding)
   */
  async getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date(),
      uptime: process.uptime()
    };
  }

  /**
   * Get readiness status
   * Endpoint: GET /health/ready
   *
   * Returns whether the system can handle requests
   */
  async getReadiness() {
    const health = await this.checker.runAll();

    // System is ready if no critical failures
    const ready = health.status !== HealthStatus.UNHEALTHY;

    return {
      ready,
      status: health.status,
      timestamp: health.timestamp,
      summary: health.summary
    };
  }

  /**
   * Get specific component health
   * Endpoint: GET /health/:component
   */
  async getComponentHealth(component: string) {
    const result = await this.checker.run(component);

    return {
      component,
      status: result.status,
      message: result.message,
      timestamp: result.timestamp,
      duration: result.duration,
      issues: result.issues,
      details: result.details
    };
  }

  /**
   * List all available health checks
   * Endpoint: GET /health/checks
   */
  listChecks() {
    const checks = this.checker.listChecks();

    return {
      total: checks.length,
      checks: checks.map(name => {
        const check = ALL_CHECKS.find(c => c.name === name);
        return {
          name,
          description: check?.description,
          priority: check?.priority,
          dependencies: check?.dependencies
        };
      })
    };
  }

  /**
   * Get health metrics
   * Endpoint: GET /health/metrics
   */
  getMetrics() {
    return this.checker.getMetrics();
  }

  /**
   * Attempt to fix issues
   * Endpoint: POST /health/fix
   */
  async fixIssues(autoFixOnly: boolean = true) {
    const health = await this.checker.runAll();
    const fixResults = [];

    for (const issue of health.issues) {
      if (autoFixOnly && !issue.autoFixable) {
        continue;
      }

      const result = await this.remediation.fix(issue);
      fixResults.push(result);
    }

    return {
      total: fixResults.length,
      successful: fixResults.filter(r => r.success).length,
      failed: fixResults.filter(r => !r.success).length,
      results: fixResults
    };
  }

  /**
   * Rebuild registry indexes
   * Endpoint: POST /health/rebuild-indexes
   */
  async rebuildIndexes() {
    return await this.remediation.rebuildIndexes();
  }

  /**
   * Format health status as text
   */
  async formatHealthText(verbose: boolean = false): Promise<string> {
    const health = await this.checker.runAll();
      const lines: string[] = [];

      // Header
      lines.push(`\n${STATUS_EMOJI[health.status]} System Health: ${health.status.toUpperCase()}`);
      lines.push(`Timestamp: ${health.timestamp.toISOString()}`);
      lines.push(`Duration: ${health.duration}ms\n`);

      // Summary
      lines.push('Summary:');
      lines.push(`  Total Checks: ${health.summary.total}`);
      lines.push(`  ${STATUS_EMOJI[HealthStatus.HEALTHY]} Healthy: ${health.summary.healthy}`);
      lines.push(`  ${STATUS_EMOJI[HealthStatus.DEGRADED]} Degraded: ${health.summary.degraded}`);
      lines.push(`  ${STATUS_EMOJI[HealthStatus.UNHEALTHY]} Unhealthy: ${health.summary.unhealthy}`);
      lines.push(`  ${STATUS_EMOJI[HealthStatus.UNKNOWN]} Unknown: ${health.summary.unknown}\n`);

      // Component Status
      lines.push('Components:');
      for (const check of health.checks) {
        lines.push(`  ${STATUS_EMOJI[check.status]} ${check.name}: ${check.message}`);

        if (verbose && check.details) {
          lines.push(`     Details: ${JSON.stringify(check.details, null, 2)}`);
        }
      }

      // Issues
      if (health.issues.length > 0) {
        lines.push(`\nIssues (${health.issues.length}):`);
        for (const issue of health.issues) {
          lines.push(`  ${SEVERITY_EMOJI[issue.severity]} [${issue.code}] ${issue.message}`);

          if (issue.remediation) {
            lines.push(`     Remediation: ${issue.remediation}`);
          }

          if (issue.autoFixable) {
            lines.push(`     Auto-fixable: Yes`);
          }

          if (verbose && issue.details) {
            lines.push(`     Details: ${JSON.stringify(issue.details, null, 2)}`);
          }
        }
      }

      return lines.join('\n');
  }

  /**
   * Format health status as JSON
   */
  async formatHealthJSON(pretty: boolean = false): Promise<string> {
    const health = await this.checker.runAll();
    return JSON.stringify(health, null, pretty ? 2 : 0);
  }

  /**
   * Get health checker instance
   */
  getChecker(): HealthChecker {
    return this.checker;
  }

  /**
   * Get remediation instance
   */
  getRemediation(): HealthRemediation {
    return this.remediation;
  }
}

/**
 * Create and start HTTP server (optional)
 */
export async function createHealthServer(options: HealthAPIOptions = {}): Promise<any> {
  const api = new HealthAPI(options);

  // This would use Express or a lightweight HTTP server
  // For now, just return the API instance
  return {
    api,
    message: 'HTTP server not implemented - use API instance directly',
    endpoints: {
      'GET /health': 'Overall health status',
      'GET /health/live': 'Liveness probe',
      'GET /health/ready': 'Readiness probe',
      'GET /health/:component': 'Component-specific health',
      'GET /health/checks': 'List all checks',
      'GET /health/metrics': 'System metrics',
      'POST /health/fix': 'Attempt to fix issues',
      'POST /health/rebuild-indexes': 'Rebuild registry indexes'
    }
  };
}
