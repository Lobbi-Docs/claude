/**
 * Hook Health Check
 *
 * Validates hook script executability and configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { HealthCheck, HealthCheckResult, HealthStatus, HealthIssue, Severity } from '../types.js';

const execAsync = promisify(exec);
const HOOKS_DIR = path.join(process.cwd(), '.claude', 'hooks');

const EXPECTED_HOOKS = [
  'context-management-hook.sh',
  'orchestration-protocol-enforcer.sh',
  'enforce-subagent-usage.sh',
  'pre-commit-validate.sh',
  'pre-commit-registry.sh'
];

export const hookCheck: HealthCheck = {
  name: 'hooks',
  description: 'Validates hook script executability and configuration',
  priority: 'medium',
  timeout: 8000,
  retryable: false,

  check: async (): Promise<HealthCheckResult> => {
    const issues: HealthIssue[] = [];
    const details: Record<string, any> = {
      hooksPath: HOOKS_DIR,
      hooks: {},
      missingHooks: [],
      nonExecutableHooks: [],
      totalHooks: 0,
      executableHooks: 0
    };

    try {
      // Check if hooks directory exists
      if (!fs.existsSync(HOOKS_DIR)) {
        issues.push({
          severity: Severity.WARNING,
          code: 'HOOKS_DIR_MISSING',
          message: 'Hooks directory does not exist',
          component: 'hooks',
          details: { path: HOOKS_DIR },
          remediation: 'Create hooks directory or initialize .claude setup',
          autoFixable: true
        });

        return {
          name: 'hooks',
          status: HealthStatus.DEGRADED,
          message: 'Hooks directory missing',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Get all hook files
      const allFiles = fs.readdirSync(HOOKS_DIR);
      const hookFiles = allFiles.filter(f => f.endsWith('.sh'));

      details.totalHooks = hookFiles.length;

      // Check each expected hook
      for (const hookName of EXPECTED_HOOKS) {
        const hookPath = path.join(HOOKS_DIR, hookName);
        const hookDetails: Record<string, any> = {
          path: hookPath,
          exists: false,
          executable: false,
          size: 0
        };

        if (!fs.existsSync(hookPath)) {
          details.missingHooks.push(hookName);
          issues.push({
            severity: Severity.WARNING,
            code: 'HOOK_MISSING',
            message: `Expected hook not found: ${hookName}`,
            component: 'hooks',
            details: { hookName, path: hookPath },
            remediation: `Create or restore ${hookName}`,
            autoFixable: false
          });
        } else {
          hookDetails.exists = true;
          const stats = fs.statSync(hookPath);
          hookDetails.size = stats.size;

          // Check if executable (on Unix-like systems)
          if (process.platform !== 'win32') {
            try {
              fs.accessSync(hookPath, fs.constants.X_OK);
              hookDetails.executable = true;
              details.executableHooks++;
            } catch {
              hookDetails.executable = false;
              details.nonExecutableHooks.push(hookName);
              issues.push({
                severity: Severity.WARNING,
                code: 'HOOK_NOT_EXECUTABLE',
                message: `Hook is not executable: ${hookName}`,
                component: 'hooks',
                details: { hookName, path: hookPath },
                remediation: `Run: chmod +x ${hookPath}`,
                autoFixable: true
              });
            }
          } else {
            // On Windows, check if it's a valid shell script
            const content = fs.readFileSync(hookPath, 'utf-8');
            hookDetails.executable = content.startsWith('#!/') || content.includes('bash');
            if (hookDetails.executable) {
              details.executableHooks++;
            }
          }

          // Check for syntax errors (basic check)
          try {
            const content = fs.readFileSync(hookPath, 'utf-8');
            if (content.trim().length === 0) {
              issues.push({
                severity: Severity.INFO,
                code: 'HOOK_EMPTY',
                message: `Hook file is empty: ${hookName}`,
                component: 'hooks',
                details: { hookName },
                remediation: 'Implement hook or remove if not needed',
                autoFixable: false
              });
              hookDetails.empty = true;
            }

            // Check shebang
            if (!content.startsWith('#!/')) {
              issues.push({
                severity: Severity.INFO,
                code: 'HOOK_MISSING_SHEBANG',
                message: `Hook missing shebang: ${hookName}`,
                component: 'hooks',
                details: { hookName },
                remediation: 'Add shebang line (#!/bin/bash or similar)',
                autoFixable: true
              });
            }
          } catch (error) {
            issues.push({
              severity: Severity.WARNING,
              code: 'HOOK_READ_ERROR',
              message: `Cannot read hook: ${hookName}`,
              component: 'hooks',
              details: {
                hookName,
                error: (error as Error).message
              }
            });
          }
        }

        details.hooks[hookName] = hookDetails;
      }

      // Check for unexpected hooks
      const unexpectedHooks = hookFiles.filter(f => !EXPECTED_HOOKS.includes(f));
      if (unexpectedHooks.length > 0) {
        details.unexpectedHooks = unexpectedHooks;
        issues.push({
          severity: Severity.INFO,
          code: 'UNEXPECTED_HOOKS',
          message: `Found ${unexpectedHooks.length} unexpected hook(s)`,
          component: 'hooks',
          details: { unexpectedHooks },
          remediation: 'Review and document custom hooks',
          autoFixable: false
        });
      }

      // Determine status
      let status = HealthStatus.HEALTHY;
      let message = `All ${details.totalHooks} hook(s) are valid`;

      if (details.missingHooks.length > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.missingHooks.length} expected hook(s) missing`;
      } else if (details.nonExecutableHooks.length > 0) {
        status = HealthStatus.DEGRADED;
        message = `${details.nonExecutableHooks.length} hook(s) not executable`;
      }

      return {
        name: 'hooks',
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
        code: 'HOOK_CHECK_FAILED',
        message: `Hook check failed: ${(error as Error).message}`,
        component: 'hooks',
        details: { error: (error as Error).stack }
      });

      return {
        name: 'hooks',
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
