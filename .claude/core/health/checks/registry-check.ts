/**
 * Registry Health Check
 *
 * Validates registry index files and their integrity
 */

import * as fs from 'fs';
import * as path from 'path';
import { HealthCheck, HealthCheckResult, HealthStatus, HealthIssue, Severity } from '../types.js';

const REGISTRY_DIR = path.join(process.cwd(), '.claude', 'registry');

const EXPECTED_INDEXES = [
  'agents.index.json',
  'skills.index.json',
  'workflows.index.json',
  'mcps.index.json',
  'tools.index.json',
  'commands.index.json'
];

export const registryCheck: HealthCheck = {
  name: 'registry',
  description: 'Validates registry index files and their integrity',
  priority: 'critical',
  timeout: 5000,
  retryable: false,

  check: async (): Promise<HealthCheckResult> => {
    const issues: HealthIssue[] = [];
    const details: Record<string, any> = {
      registryPath: REGISTRY_DIR,
      indexes: {},
      missingIndexes: [],
      invalidIndexes: [],
      brokenReferences: []
    };

    try {
      // Check if registry directory exists
      if (!fs.existsSync(REGISTRY_DIR)) {
        issues.push({
          severity: Severity.CRITICAL,
          code: 'REGISTRY_DIR_MISSING',
          message: 'Registry directory does not exist',
          component: 'registry',
          details: { path: REGISTRY_DIR },
          remediation: 'Run registry initialization or check .claude setup',
          autoFixable: true
        });

        return {
          name: 'registry',
          status: HealthStatus.UNHEALTHY,
          message: 'Registry directory missing',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Check each expected index
      for (const indexName of EXPECTED_INDEXES) {
        const indexPath = path.join(REGISTRY_DIR, indexName);

        if (!fs.existsSync(indexPath)) {
          details.missingIndexes.push(indexName);
          issues.push({
            severity: Severity.CRITICAL,
            code: 'INDEX_MISSING',
            message: `Registry index missing: ${indexName}`,
            component: 'registry',
            details: { indexName, path: indexPath },
            remediation: `Create or regenerate ${indexName}`,
            autoFixable: true
          });
          continue;
        }

        // Validate JSON structure
        try {
          const content = fs.readFileSync(indexPath, 'utf-8');
          const data = JSON.parse(content);

          details.indexes[indexName] = {
            exists: true,
            valid: true,
            size: content.length,
            version: data.version || 'unknown'
          };

          // Validate file references (for agents, skills, workflows)
          if (indexName === 'agents.index.json' && data.agents) {
            const brokenRefs = validateAgentReferences(data.agents);
            if (brokenRefs.length > 0) {
              details.brokenReferences.push(...brokenRefs);
              issues.push({
                severity: Severity.WARNING,
                code: 'BROKEN_AGENT_REFERENCES',
                message: `Found ${brokenRefs.length} broken agent references`,
                component: 'registry',
                details: { brokenRefs },
                remediation: 'Update registry index to remove broken references',
                autoFixable: true
              });
            }
          }

          // Check schema validity
          if (data.$schema) {
            const schemaPath = path.join(REGISTRY_DIR, data.$schema);
            if (!fs.existsSync(schemaPath)) {
              issues.push({
                severity: Severity.INFO,
                code: 'SCHEMA_MISSING',
                message: `Schema file missing for ${indexName}`,
                component: 'registry',
                details: { indexName, schemaPath },
                remediation: 'Schema validation disabled or schema file missing',
                autoFixable: false
              });
            }
          }

        } catch (error) {
          details.invalidIndexes.push(indexName);
          details.indexes[indexName] = {
            exists: true,
            valid: false,
            error: (error as Error).message
          };

          issues.push({
            severity: Severity.CRITICAL,
            code: 'INDEX_INVALID_JSON',
            message: `Invalid JSON in ${indexName}`,
            component: 'registry',
            details: {
              indexName,
              error: (error as Error).message
            },
            remediation: 'Fix JSON syntax or regenerate index',
            autoFixable: false
          });
        }
      }

      // Determine status
      let status = HealthStatus.HEALTHY;
      let message = 'All registry indexes are valid';

      if (details.missingIndexes.length > 0) {
        status = HealthStatus.UNHEALTHY;
        message = `${details.missingIndexes.length} index(es) missing`;
      } else if (details.invalidIndexes.length > 0) {
        status = HealthStatus.UNHEALTHY;
        message = `${details.invalidIndexes.length} index(es) invalid`;
      } else if (details.brokenReferences.length > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.brokenReferences.length} broken reference(s) found`;
      }

      return {
        name: 'registry',
        status,
        message,
        timestamp: new Date(),
        duration: 0,
        issues,
        details
      };

    } catch (error) {
      issues.push({
        severity: Severity.CRITICAL,
        code: 'REGISTRY_CHECK_FAILED',
        message: `Registry check failed: ${(error as Error).message}`,
        component: 'registry',
        details: { error: (error as Error).stack }
      });

      return {
        name: 'registry',
        status: HealthStatus.UNHEALTHY,
        message: `Check failed: ${(error as Error).message}`,
        timestamp: new Date(),
        duration: 0,
        issues,
        details
      };
    }
  }
};

/**
 * Validate agent file references
 */
function validateAgentReferences(agents: Record<string, any>): string[] {
  const brokenRefs: string[] = [];
  const basePath = path.join(process.cwd(), '.claude');

  for (const [category, agentsInCategory] of Object.entries(agents)) {
    if (typeof agentsInCategory !== 'object') continue;

    for (const [agentName, agentData] of Object.entries(agentsInCategory as Record<string, any>)) {
      if (agentData.path) {
        const agentPath = path.join(basePath, agentData.path);
        if (!fs.existsSync(agentPath)) {
          brokenRefs.push(`${category}.${agentName} -> ${agentData.path}`);
        }
      }
    }
  }

  return brokenRefs;
}
