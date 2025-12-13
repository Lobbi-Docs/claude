/**
 * Health Remediation System
 *
 * Auto-fix utilities for common health issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { HealthIssue, FixResult, Severity } from './types.js';

const execAsync = promisify(exec);

export class HealthRemediation {
  private fixAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  /**
   * Attempt to fix a health issue
   */
  async fix(issue: HealthIssue): Promise<FixResult> {
    if (!issue.autoFixable) {
      return {
        success: false,
        issue,
        message: 'Issue is not auto-fixable',
        details: { reason: 'Manual intervention required' }
      };
    }

    // Check retry limit
    const attempts = this.fixAttempts.get(issue.code) || 0;
    if (attempts >= this.maxRetries) {
      return {
        success: false,
        issue,
        message: 'Maximum retry attempts exceeded',
        details: { attempts }
      };
    }

    this.fixAttempts.set(issue.code, attempts + 1);

    // Route to appropriate fix handler
    try {
      let result: FixResult;

      switch (issue.code) {
        case 'REGISTRY_DIR_MISSING':
          result = await this.fixRegistryDirectory(issue);
          break;

        case 'INDEX_MISSING':
          result = await this.fixMissingIndex(issue);
          break;

        case 'BROKEN_AGENT_REFERENCES':
          result = await this.fixBrokenReferences(issue);
          break;

        case 'HOOKS_DIR_MISSING':
          result = await this.fixHooksDirectory(issue);
          break;

        case 'HOOK_NOT_EXECUTABLE':
          result = await this.fixHookPermissions(issue);
          break;

        case 'HOOK_MISSING_SHEBANG':
          result = await this.fixHookShebang(issue);
          break;

        case 'AGENTS_DIR_MISSING':
          result = await this.fixAgentsDirectory(issue);
          break;

        case 'DATABASE_NOT_FOUND':
          result = await this.fixDatabaseInit(issue);
          break;

        case 'DATABASE_NOT_READABLE':
        case 'DATABASE_NOT_WRITABLE':
        case 'DATABASE_DIR_NOT_WRITABLE':
          result = await this.fixFilePermissions(issue);
          break;

        case 'DATABASE_EMPTY':
          result = await this.fixDatabaseSchema(issue);
          break;

        default:
          result = {
            success: false,
            issue,
            message: 'No automated fix available for this issue',
            details: { code: issue.code }
          };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        issue,
        message: `Fix failed: ${(error as Error).message}`,
        details: { error: (error as Error).stack }
      };
    }
  }

  /**
   * Fix missing registry directory
   */
  private async fixRegistryDirectory(issue: HealthIssue): Promise<FixResult> {
    const registryPath = path.join(process.cwd(), '.claude', 'registry');

    try {
      fs.mkdirSync(registryPath, { recursive: true });

      // Create subdirectories
      const subdirs = ['schema', 'search'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(registryPath, subdir);
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true });
        }
      }

      return {
        success: true,
        issue,
        message: 'Registry directory created',
        details: { path: registryPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to create registry directory: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix missing index files
   */
  private async fixMissingIndex(issue: HealthIssue): Promise<FixResult> {
    const indexName = issue.details?.indexName as string;
    if (!indexName) {
      return {
        success: false,
        issue,
        message: 'Index name not specified',
        details: {}
      };
    }

    const registryPath = path.join(process.cwd(), '.claude', 'registry');
    const indexPath = path.join(registryPath, indexName);

    try {
      // Create empty index with basic structure
      const template = this.getIndexTemplate(indexName);
      fs.writeFileSync(indexPath, JSON.stringify(template, null, 2));

      return {
        success: true,
        issue,
        message: `Created ${indexName} with template`,
        details: { path: indexPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to create index: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix broken agent references
   */
  private async fixBrokenReferences(issue: HealthIssue): Promise<FixResult> {
    const brokenRefs = issue.details?.brokenRefs as string[];
    if (!brokenRefs || brokenRefs.length === 0) {
      return {
        success: false,
        issue,
        message: 'No broken references specified',
        details: {}
      };
    }

    // This would require regenerating the registry index
    // For now, just report that manual fix is needed
    return {
      success: false,
      issue,
      message: 'Automatic fix not implemented - run registry regeneration',
      details: {
        brokenRefs,
        remediation: 'Run: node .claude/core/registry-fixer.ts'
      }
    };
  }

  /**
   * Fix hooks directory
   */
  private async fixHooksDirectory(issue: HealthIssue): Promise<FixResult> {
    const hooksPath = path.join(process.cwd(), '.claude', 'hooks');

    try {
      fs.mkdirSync(hooksPath, { recursive: true });

      return {
        success: true,
        issue,
        message: 'Hooks directory created',
        details: { path: hooksPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to create hooks directory: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix hook permissions
   */
  private async fixHookPermissions(issue: HealthIssue): Promise<FixResult> {
    const hookName = issue.details?.hookName as string;
    if (!hookName) {
      return {
        success: false,
        issue,
        message: 'Hook name not specified',
        details: {}
      };
    }

    const hookPath = path.join(process.cwd(), '.claude', 'hooks', hookName);

    if (process.platform === 'win32') {
      return {
        success: false,
        issue,
        message: 'Cannot fix permissions on Windows automatically',
        details: { platform: 'win32' }
      };
    }

    try {
      await execAsync(`chmod +x "${hookPath}"`);

      return {
        success: true,
        issue,
        message: `Made ${hookName} executable`,
        details: { path: hookPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to fix permissions: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix missing shebang
   */
  private async fixHookShebang(issue: HealthIssue): Promise<FixResult> {
    const hookName = issue.details?.hookName as string;
    if (!hookName) {
      return {
        success: false,
        issue,
        message: 'Hook name not specified',
        details: {}
      };
    }

    const hookPath = path.join(process.cwd(), '.claude', 'hooks', hookName);

    try {
      const content = fs.readFileSync(hookPath, 'utf-8');
      const updatedContent = `#!/bin/bash\n${content}`;
      fs.writeFileSync(hookPath, updatedContent);

      return {
        success: true,
        issue,
        message: `Added shebang to ${hookName}`,
        details: { path: hookPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to add shebang: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix agents directory
   */
  private async fixAgentsDirectory(issue: HealthIssue): Promise<FixResult> {
    const agentsPath = path.join(process.cwd(), '.claude', 'agents');

    try {
      fs.mkdirSync(agentsPath, { recursive: true });

      // Create category subdirectories
      const categories = ['core', 'devops', 'development', 'frontend', 'utility'];
      for (const category of categories) {
        const categoryPath = path.join(agentsPath, category);
        if (!fs.existsSync(categoryPath)) {
          fs.mkdirSync(categoryPath, { recursive: true });
        }
      }

      return {
        success: true,
        issue,
        message: 'Agents directory created',
        details: { path: agentsPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to create agents directory: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix database initialization
   */
  private async fixDatabaseInit(issue: HealthIssue): Promise<FixResult> {
    const dbDir = path.join(process.cwd(), '.claude', 'data');
    const dbPath = path.join(dbDir, 'orchestration.db');

    try {
      // Create data directory
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create empty database file
      fs.writeFileSync(dbPath, '');

      return {
        success: true,
        issue,
        message: 'Database file created (schema initialization required)',
        details: { path: dbPath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to create database: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix file permissions
   */
  private async fixFilePermissions(issue: HealthIssue): Promise<FixResult> {
    const filePath = issue.details?.path as string;
    if (!filePath) {
      return {
        success: false,
        issue,
        message: 'File path not specified',
        details: {}
      };
    }

    if (process.platform === 'win32') {
      return {
        success: false,
        issue,
        message: 'Cannot fix permissions on Windows automatically',
        details: { platform: 'win32' }
      };
    }

    try {
      await execAsync(`chmod 644 "${filePath}"`);

      return {
        success: true,
        issue,
        message: 'File permissions fixed',
        details: { path: filePath }
      };
    } catch (error) {
      return {
        success: false,
        issue,
        message: `Failed to fix permissions: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Fix database schema
   */
  private async fixDatabaseSchema(issue: HealthIssue): Promise<FixResult> {
    // This would require SQLite library
    return {
      success: false,
      issue,
      message: 'Database schema initialization not implemented',
      details: {
        remediation: 'Manually initialize database schema'
      }
    };
  }

  /**
   * Rebuild corrupted indexes
   */
  async rebuildIndexes(): Promise<{ success: boolean; message: string; details: any }> {
    try {
      // This would call the registry-fixer
      const registryFixerPath = path.join(process.cwd(), '.claude', 'core', 'registry-fixer.ts');

      if (!fs.existsSync(registryFixerPath)) {
        return {
          success: false,
          message: 'Registry fixer not found',
          details: { path: registryFixerPath }
        };
      }

      // Execute registry fixer
      const { stdout, stderr } = await execAsync(`node "${registryFixerPath}"`);

      return {
        success: true,
        message: 'Registry indexes rebuilt',
        details: { stdout, stderr }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to rebuild indexes: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Restart a failed component
   */
  async restartComponent(name: string): Promise<{ success: boolean; message: string }> {
    // Placeholder for component restart logic
    return {
      success: false,
      message: `Component restart not implemented for: ${name}`
    };
  }

  /**
   * Get index template
   */
  private getIndexTemplate(indexName: string): any {
    const baseTemplate = {
      "$schema": `./schema/${indexName.replace('.json', '.schema.json')}`,
      "version": "1.0.0",
      "description": `${indexName} - auto-generated template`,
      "lastUpdated": new Date().toISOString()
    };

    switch (indexName) {
      case 'agents.index.json':
        return {
          ...baseTemplate,
          agents: {},
          stats: { totalAgents: 0 }
        };

      case 'skills.index.json':
        return {
          ...baseTemplate,
          skills: {},
          stats: { totalSkills: 0 }
        };

      case 'workflows.index.json':
        return {
          ...baseTemplate,
          workflows: {},
          stats: { totalWorkflows: 0 }
        };

      case 'mcps.index.json':
        return {
          ...baseTemplate,
          mcpServers: { core: {}, project: {}, extension: {} },
          stats: { totalMcpServers: 0 }
        };

      case 'tools.index.json':
        return {
          ...baseTemplate,
          tools: {},
          stats: { totalTools: 0 }
        };

      case 'commands.index.json':
        return {
          ...baseTemplate,
          commands: {},
          stats: { totalCommands: 0 }
        };

      default:
        return baseTemplate;
    }
  }

  /**
   * Reset fix attempt counters
   */
  resetAttempts(): void {
    this.fixAttempts.clear();
  }
}
