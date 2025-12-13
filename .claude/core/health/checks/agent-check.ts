/**
 * Agent Health Check
 *
 * Validates agent file existence and YAML frontmatter
 */

import * as fs from 'fs';
import * as path from 'path';
import { HealthCheck, HealthCheckResult, HealthStatus, HealthIssue, Severity } from '../types.js';

const AGENTS_DIR = path.join(process.cwd(), '.claude', 'agents');
const AGENTS_INDEX_PATH = path.join(process.cwd(), '.claude', 'registry', 'agents.index.json');

export const agentCheck: HealthCheck = {
  name: 'agents',
  description: 'Validates agent file existence and configuration',
  priority: 'high',
  timeout: 10000,
  retryable: false,
  dependencies: ['registry'],

  check: async (): Promise<HealthCheckResult> => {
    const issues: HealthIssue[] = [];
    const details: Record<string, any> = {
      agentsPath: AGENTS_DIR,
      indexPath: AGENTS_INDEX_PATH,
      totalAgents: 0,
      validAgents: 0,
      missingAgents: [],
      invalidAgents: [],
      agents: {}
    };

    try {
      // Check if agents directory exists
      if (!fs.existsSync(AGENTS_DIR)) {
        issues.push({
          severity: Severity.WARNING,
          code: 'AGENTS_DIR_MISSING',
          message: 'Agents directory does not exist',
          component: 'agents',
          details: { path: AGENTS_DIR },
          remediation: 'Create agents directory',
          autoFixable: true
        });

        return {
          name: 'agents',
          status: HealthStatus.DEGRADED,
          message: 'Agents directory missing',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Check if agents index exists
      if (!fs.existsSync(AGENTS_INDEX_PATH)) {
        issues.push({
          severity: Severity.CRITICAL,
          code: 'AGENTS_INDEX_MISSING',
          message: 'Agents index file missing',
          component: 'agents',
          details: { path: AGENTS_INDEX_PATH },
          remediation: 'Run registry regeneration',
          autoFixable: true
        });

        return {
          name: 'agents',
          status: HealthStatus.UNHEALTHY,
          message: 'Agents index missing',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Load agents index
      const agentsIndex = JSON.parse(fs.readFileSync(AGENTS_INDEX_PATH, 'utf-8'));
      const agentsConfig = agentsIndex.agents || {};

      // Flatten all agents
      const allAgents: Array<[string, any]> = [];
      for (const [category, agents] of Object.entries(agentsConfig)) {
        if (typeof agents === 'object') {
          for (const [agentName, agentData] of Object.entries(agents as Record<string, any>)) {
            allAgents.push([`${category}.${agentName}`, agentData]);
          }
        }
      }

      details.totalAgents = allAgents.length;

      // Check each agent
      for (const [agentFullName, agentData] of allAgents) {
        const agentDetails: Record<string, any> = {
          path: agentData.path,
          exists: false,
          valid: false,
          type: agentData.type,
          model: agentData.model,
          priority: agentData.priority
        };

        if (!agentData.path) {
          details.invalidAgents.push(agentFullName);
          issues.push({
            severity: Severity.WARNING,
            code: 'AGENT_MISSING_PATH',
            message: `Agent missing path: ${agentFullName}`,
            component: 'agents',
            details: { agentName: agentFullName },
            remediation: 'Add path to agent in registry',
            autoFixable: false
          });
          details.agents[agentFullName] = agentDetails;
          continue;
        }

        const agentPath = path.join(process.cwd(), '.claude', agentData.path);

        if (!fs.existsSync(agentPath)) {
          details.missingAgents.push(agentFullName);
          issues.push({
            severity: Severity.WARNING,
            code: 'AGENT_FILE_MISSING',
            message: `Agent file not found: ${agentFullName}`,
            component: 'agents',
            details: {
              agentName: agentFullName,
              path: agentPath
            },
            remediation: 'Create agent file or update registry',
            autoFixable: false
          });
        } else {
          agentDetails.exists = true;

          // Validate agent file content
          try {
            const content = fs.readFileSync(agentPath, 'utf-8');
            const stats = fs.statSync(agentPath);
            agentDetails.size = stats.size;

            // Check for YAML frontmatter
            if (content.startsWith('---')) {
              const frontmatterEnd = content.indexOf('---', 3);
              if (frontmatterEnd > 0) {
                const frontmatter = content.substring(3, frontmatterEnd);
                agentDetails.hasFrontmatter = true;

                // Check for required fields
                const requiredFields = ['name', 'type', 'model'];
                const missingFields = requiredFields.filter(
                  field => !frontmatter.includes(`${field}:`)
                );

                if (missingFields.length > 0) {
                  issues.push({
                    severity: Severity.INFO,
                    code: 'AGENT_MISSING_FRONTMATTER_FIELDS',
                    message: `Agent missing frontmatter fields: ${agentFullName}`,
                    component: 'agents',
                    details: {
                      agentName: agentFullName,
                      missingFields
                    },
                    remediation: `Add frontmatter fields: ${missingFields.join(', ')}`,
                    autoFixable: false
                  });
                  agentDetails.missingFields = missingFields;
                } else {
                  agentDetails.valid = true;
                  details.validAgents++;
                }
              } else {
                agentDetails.hasFrontmatter = false;
                issues.push({
                  severity: Severity.INFO,
                  code: 'AGENT_INVALID_FRONTMATTER',
                  message: `Agent has incomplete frontmatter: ${agentFullName}`,
                  component: 'agents',
                  details: { agentName: agentFullName },
                  remediation: 'Fix frontmatter syntax',
                  autoFixable: false
                });
              }
            } else {
              agentDetails.hasFrontmatter = false;
              issues.push({
                severity: Severity.INFO,
                code: 'AGENT_NO_FRONTMATTER',
                message: `Agent missing frontmatter: ${agentFullName}`,
                component: 'agents',
                details: { agentName: agentFullName },
                remediation: 'Add YAML frontmatter',
                autoFixable: false
              });
            }

            // Check if empty
            if (content.trim().length === 0) {
              issues.push({
                severity: Severity.WARNING,
                code: 'AGENT_EMPTY',
                message: `Agent file is empty: ${agentFullName}`,
                component: 'agents',
                details: { agentName: agentFullName },
                remediation: 'Implement agent or remove from registry',
                autoFixable: false
              });
              agentDetails.empty = true;
            }

          } catch (error) {
            details.invalidAgents.push(agentFullName);
            issues.push({
              severity: Severity.WARNING,
              code: 'AGENT_READ_ERROR',
              message: `Cannot read agent file: ${agentFullName}`,
              component: 'agents',
              details: {
                agentName: agentFullName,
                error: (error as Error).message
              }
            });
          }
        }

        details.agents[agentFullName] = agentDetails;
      }

      // Determine status
      let status = HealthStatus.HEALTHY;
      let message = `All ${details.totalAgents} agent(s) are valid`;

      if (details.missingAgents.length > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.missingAgents.length} agent file(s) missing`;
      } else if (details.invalidAgents.length > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.invalidAgents.length} agent(s) invalid`;
      } else if (details.validAgents < details.totalAgents) {
        status = HealthStatus.DEGRADED;
        message = `Only ${details.validAgents}/${details.totalAgents} agents fully valid`;
      }

      return {
        name: 'agents',
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
        code: 'AGENT_CHECK_FAILED',
        message: `Agent check failed: ${(error as Error).message}`,
        component: 'agents',
        details: { error: (error as Error).stack }
      });

      return {
        name: 'agents',
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
