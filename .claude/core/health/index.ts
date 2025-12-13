/**
 * Health Check System - Main Export
 *
 * Comprehensive health monitoring for Claude orchestration framework
 */

export * from './types.js';
export { HealthChecker } from './health-checker.js';
export { HealthRemediation } from './remediation.js';
export { HealthAPI, createHealthServer } from './health-api.js';
export * from './checks/index.js';

import { HealthAPI } from './health-api.js';

/**
 * Quick health check function
 */
export async function quickHealthCheck(): Promise<any> {
  const api = new HealthAPI();
  return await api.getHealth(false);
}

/**
 * Detailed health check function
 */
export async function detailedHealthCheck(): Promise<any> {
  const api = new HealthAPI();
  return await api.getHealth(true);
}

/**
 * Health check with auto-fix
 */
export async function healthCheckWithFix(): Promise<any> {
  const api = new HealthAPI({ enableAutoFix: true });
  const health = await api.getHealth(true);

  if ('issues' in health && health.issues && health.issues.length > 0) {
    const fixes = await api.fixIssues(true);
    return {
      health,
      fixes
    };
  }

  return { health };
}
