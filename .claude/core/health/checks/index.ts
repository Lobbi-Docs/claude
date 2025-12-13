/**
 * Health Checks Index
 *
 * Export all health checks for registration
 */

export { databaseCheck } from './database-check.js';
export { mcpCheck } from './mcp-check.js';
export { registryCheck } from './registry-check.js';
export { hookCheck } from './hook-check.js';
export { agentCheck } from './agent-check.js';

import { databaseCheck } from './database-check.js';
import { mcpCheck } from './mcp-check.js';
import { registryCheck } from './registry-check.js';
import { hookCheck } from './hook-check.js';
import { agentCheck } from './agent-check.js';
import { HealthCheck } from '../types.js';

/**
 * All available health checks
 */
export const ALL_CHECKS: HealthCheck[] = [
  registryCheck,
  mcpCheck,
  hookCheck,
  agentCheck,
  databaseCheck
];

/**
 * Critical health checks (must pass for system to be healthy)
 */
export const CRITICAL_CHECKS: HealthCheck[] = ALL_CHECKS.filter(
  check => check.priority === 'critical'
);

/**
 * Get checks by priority
 */
export function getChecksByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): HealthCheck[] {
  return ALL_CHECKS.filter(check => check.priority === priority);
}

/**
 * Get check by name
 */
export function getCheckByName(name: string): HealthCheck | undefined {
  return ALL_CHECKS.find(check => check.name === name);
}
