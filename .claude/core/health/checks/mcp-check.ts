/**
 * MCP Server Health Check
 *
 * Validates MCP server availability and tool accessibility
 */

import * as fs from 'fs';
import * as path from 'path';
import { HealthCheck, HealthCheckResult, HealthStatus, HealthIssue, Severity } from '../types.js';

const MCP_INDEX_PATH = path.join(process.cwd(), '.claude', 'registry', 'mcps.index.json');

export const mcpCheck: HealthCheck = {
  name: 'mcp-servers',
  description: 'Validates MCP server availability and configuration',
  priority: 'high',
  timeout: 10000,
  retryable: true,

  check: async (): Promise<HealthCheckResult> => {
    const issues: HealthIssue[] = [];
    const details: Record<string, any> = {
      indexPath: MCP_INDEX_PATH,
      servers: {},
      totalServers: 0,
      activeServers: 0,
      inactiveServers: 0,
      misconfiguredServers: []
    };

    try {
      // Check if MCP index exists
      if (!fs.existsSync(MCP_INDEX_PATH)) {
        issues.push({
          severity: Severity.WARNING,
          code: 'MCP_INDEX_MISSING',
          message: 'MCP index file not found',
          component: 'mcp',
          details: { path: MCP_INDEX_PATH },
          remediation: 'Create mcps.index.json or disable MCP checks',
          autoFixable: true
        });

        return {
          name: 'mcp-servers',
          status: HealthStatus.DEGRADED,
          message: 'MCP index missing',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Load and parse MCP index
      const mcpIndex = JSON.parse(fs.readFileSync(MCP_INDEX_PATH, 'utf-8'));
      const mcpServers = mcpIndex.mcpServers || {};

      // Flatten all MCP servers
      const allServers = [
        ...Object.entries(mcpServers.core || {}),
        ...Object.entries(mcpServers.project || {}),
        ...Object.entries(mcpServers.extension || {})
      ];

      details.totalServers = allServers.length;

      // Check each MCP server
      for (const [serverName, serverConfig] of allServers) {
        const config = serverConfig as any;
        const serverDetails: Record<string, any> = {
          provider: config.provider,
          autoActivate: config.autoActivate,
          priority: config.priority,
          status: 'unchecked'
        };

        // Check configuration validity
        if (!config.provider) {
          details.misconfiguredServers.push(serverName);
          issues.push({
            severity: Severity.WARNING,
            code: 'MCP_MISSING_PROVIDER',
            message: `MCP server "${serverName}" missing provider`,
            component: 'mcp',
            details: { serverName },
            remediation: 'Add provider field to MCP configuration',
            autoFixable: false
          });
          serverDetails.status = 'misconfigured';
        }

        // Check custom MCP config paths
        if (config.provider === 'custom' && config.configPath) {
          const configPath = path.join(process.cwd(), '.claude', config.configPath);
          if (!fs.existsSync(configPath)) {
            details.misconfiguredServers.push(serverName);
            issues.push({
              severity: Severity.WARNING,
              code: 'MCP_CONFIG_MISSING',
              message: `MCP server "${serverName}" config file not found`,
              component: 'mcp',
              details: { serverName, configPath },
              remediation: 'Create MCP config file or update configPath',
              autoFixable: false
            });
            serverDetails.status = 'config_missing';
          } else {
            serverDetails.status = 'configured';
          }
        }

        // Check required environment variables
        if (config.requiredEnvVars && Array.isArray(config.requiredEnvVars)) {
          const missingEnvVars = config.requiredEnvVars.filter(
            (varName: string) => !process.env[varName]
          );

          if (missingEnvVars.length > 0) {
            issues.push({
              severity: Severity.INFO,
              code: 'MCP_MISSING_ENV_VARS',
              message: `MCP server "${serverName}" missing environment variables`,
              component: 'mcp',
              details: { serverName, missingEnvVars },
              remediation: `Set environment variables: ${missingEnvVars.join(', ')}`,
              autoFixable: false
            });
            serverDetails.status = 'env_missing';
            serverDetails.missingEnvVars = missingEnvVars;
          }
        }

        // Check required config
        if (config.requiredConfig) {
          const missingConfig = Object.entries(config.requiredConfig)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

          if (missingConfig.length > 0) {
            issues.push({
              severity: Severity.INFO,
              code: 'MCP_INCOMPLETE_CONFIG',
              message: `MCP server "${serverName}" has incomplete configuration`,
              component: 'mcp',
              details: { serverName, missingConfig },
              remediation: `Complete configuration: ${missingConfig.join(', ')}`,
              autoFixable: false
            });
            serverDetails.status = 'incomplete_config';
            serverDetails.missingConfig = missingConfig;
          }
        }

        // Mark as active if no issues
        if (serverDetails.status === 'unchecked' || serverDetails.status === 'configured') {
          serverDetails.status = 'active';
          details.activeServers++;
        } else {
          details.inactiveServers++;
        }

        details.servers[serverName] = serverDetails;
      }

      // Determine overall status
      let status = HealthStatus.HEALTHY;
      let message = `All ${details.totalServers} MCP server(s) configured`;

      if (details.misconfiguredServers.length > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.misconfiguredServers.length} MCP server(s) misconfigured`;
      } else if (details.inactiveServers > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.inactiveServers} MCP server(s) inactive`;
      }

      return {
        name: 'mcp-servers',
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
        code: 'MCP_CHECK_FAILED',
        message: `MCP check failed: ${(error as Error).message}`,
        component: 'mcp',
        details: { error: (error as Error).stack }
      });

      return {
        name: 'mcp-servers',
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
