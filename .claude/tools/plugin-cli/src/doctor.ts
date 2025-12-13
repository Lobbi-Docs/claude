/**
 * Plugin Doctor
 * Diagnoses common plugin issues and provides fixes
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { DiagnosisResult, DiagnosisIssue, PluginManifest } from './types';

export class PluginDoctor {
  /**
   * Main diagnosis method
   */
  async diagnose(pluginPath: string): Promise<DiagnosisResult> {
    const issues: DiagnosisIssue[] = [];
    const suggestions: string[] = [];

    console.log(chalk.cyan('\nRunning plugin diagnostics...\n'));

    // Check 1: Plugin structure exists
    await this.checkPluginStructure(pluginPath, issues);

    // Check 2: Manifest validity
    await this.checkManifestValidity(pluginPath, issues);

    // Check 3: File references
    await this.checkFileReferences(pluginPath, issues);

    // Check 4: Circular dependencies
    await this.checkCircularDependencies(pluginPath, issues, suggestions);

    // Check 5: Environment variables
    await this.checkEnvironmentVariables(pluginPath, issues, suggestions);

    // Check 6: Hook executability
    await this.checkHookExecutability(pluginPath, issues);

    // Check 7: Broken references
    await this.checkBrokenReferences(pluginPath, issues);

    // Check 8: Git status
    await this.checkGitStatus(pluginPath, suggestions);

    // Generate general suggestions
    this.generateSuggestions(issues, suggestions);

    return {
      healthy: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Check basic plugin structure
   */
  private async checkPluginStructure(pluginPath: string, issues: DiagnosisIssue[]): Promise<void> {
    const spinner = chalk.gray('→ Checking plugin structure...');
    process.stdout.write(spinner);

    const requiredPaths = [
      '.claude-plugin',
      '.claude-plugin/plugin.json'
    ];

    for (const reqPath of requiredPaths) {
      const fullPath = path.join(pluginPath, reqPath);
      if (!await fs.pathExists(fullPath)) {
        issues.push({
          type: 'missing-file',
          severity: 'critical',
          message: `Required path missing: ${reqPath}`,
          path: fullPath,
          fix: `Create ${reqPath} directory/file`
        });
      }
    }

    process.stdout.write('\r' + chalk.green('✓ Plugin structure checked\n'));
  }

  /**
   * Check manifest JSON validity
   */
  private async checkManifestValidity(pluginPath: string, issues: DiagnosisIssue[]): Promise<void> {
    const spinner = chalk.gray('→ Checking manifest validity...');
    process.stdout.write(spinner);

    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      issues.push({
        type: 'missing-file',
        severity: 'critical',
        message: 'plugin.json not found',
        path: manifestPath,
        fix: 'Run: claude-plugin init to create a new plugin'
      });
      process.stdout.write('\r' + chalk.red('✗ Manifest not found\n'));
      return;
    }

    try {
      const manifest: PluginManifest = await fs.readJSON(manifestPath);

      // Check required fields
      const requiredFields = ['name', 'version', 'description', 'author', 'license'];
      for (const field of requiredFields) {
        if (!manifest[field as keyof PluginManifest]) {
          issues.push({
            type: 'invalid-json',
            severity: 'critical',
            message: `Missing required field: ${field}`,
            path: manifestPath,
            fix: `Add "${field}" to plugin.json`
          });
        }
      }

      process.stdout.write('\r' + chalk.green('✓ Manifest is valid\n'));
    } catch (error: any) {
      issues.push({
        type: 'invalid-json',
        severity: 'critical',
        message: `Invalid JSON in plugin.json: ${error.message}`,
        path: manifestPath,
        fix: 'Fix JSON syntax errors in plugin.json'
      });
      process.stdout.write('\r' + chalk.red('✗ Invalid manifest JSON\n'));
    }
  }

  /**
   * Check all file references exist
   */
  private async checkFileReferences(pluginPath: string, issues: DiagnosisIssue[]): Promise<void> {
    const spinner = chalk.gray('→ Checking file references...');
    process.stdout.write(spinner);

    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      process.stdout.write('\r' + chalk.yellow('⚠ Skipping file references (no manifest)\n'));
      return;
    }

    try {
      const manifest: PluginManifest = await fs.readJSON(manifestPath);
      let missingFiles = 0;

      // Check agent handlers
      if (manifest.agents) {
        for (const [name, def] of Object.entries(manifest.agents)) {
          const filePath = path.join(pluginPath, def.handler);
          if (!await fs.pathExists(filePath)) {
            issues.push({
              type: 'broken-reference',
              severity: 'critical',
              message: `Agent handler not found: ${name}`,
              path: def.handler,
              fix: `Create file: ${def.handler}`
            });
            missingFiles++;
          }
        }
      }

      // Check skill handlers
      if (manifest.skills) {
        for (const [name, def] of Object.entries(manifest.skills)) {
          const filePath = path.join(pluginPath, def.handler);
          if (!await fs.pathExists(filePath)) {
            issues.push({
              type: 'broken-reference',
              severity: 'critical',
              message: `Skill handler not found: ${name}`,
              path: def.handler,
              fix: `Create file: ${def.handler}`
            });
            missingFiles++;
          }
        }
      }

      // Check command handlers
      if (manifest.commands) {
        for (const [name, def] of Object.entries(manifest.commands)) {
          const filePath = path.join(pluginPath, def.handler);
          if (!await fs.pathExists(filePath)) {
            issues.push({
              type: 'broken-reference',
              severity: 'critical',
              message: `Command handler not found: ${name}`,
              path: def.handler,
              fix: `Create file: ${def.handler}`
            });
            missingFiles++;
          }
        }
      }

      // Check hook handlers
      if (manifest.hooks) {
        for (const [name, def] of Object.entries(manifest.hooks)) {
          const filePath = path.join(pluginPath, def.handler);
          if (!await fs.pathExists(filePath)) {
            issues.push({
              type: 'broken-reference',
              severity: 'critical',
              message: `Hook handler not found: ${name}`,
              path: def.handler,
              fix: `Create file: ${def.handler}`
            });
            missingFiles++;
          }
        }
      }

      if (missingFiles > 0) {
        process.stdout.write('\r' + chalk.red(`✗ ${missingFiles} missing file(s)\n`));
      } else {
        process.stdout.write('\r' + chalk.green('✓ All file references valid\n'));
      }
    } catch (error) {
      process.stdout.write('\r' + chalk.yellow('⚠ Could not check file references\n'));
    }
  }

  /**
   * Check for circular dependencies
   */
  private async checkCircularDependencies(
    pluginPath: string,
    issues: DiagnosisIssue[],
    suggestions: string[]
  ): Promise<void> {
    const spinner = chalk.gray('→ Checking circular dependencies...');
    process.stdout.write(spinner);

    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      process.stdout.write('\r' + chalk.yellow('⚠ Skipping circular dependencies (no manifest)\n'));
      return;
    }

    try {
      const manifest: PluginManifest = await fs.readJSON(manifestPath);

      // Build dependency graph
      const graph = new Map<string, string[]>();

      if (manifest.agents) {
        for (const [name, def] of Object.entries(manifest.agents)) {
          graph.set(name, def.dependencies || []);
        }
      }

      // Detect cycles using DFS
      const visited = new Set<string>();
      const recStack = new Set<string>();

      const hasCycle = (node: string): boolean => {
        visited.add(node);
        recStack.add(node);

        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }

        recStack.delete(node);
        return false;
      };

      for (const node of graph.keys()) {
        if (!visited.has(node)) {
          if (hasCycle(node)) {
            issues.push({
              type: 'circular-dependency',
              severity: 'warning',
              message: `Circular dependency detected in agent dependencies`,
              fix: 'Review agent dependencies and remove circular references'
            });
            break;
          }
        }
      }

      process.stdout.write('\r' + chalk.green('✓ No circular dependencies\n'));
    } catch (error) {
      process.stdout.write('\r' + chalk.yellow('⚠ Could not check dependencies\n'));
    }
  }

  /**
   * Check environment variables
   */
  private async checkEnvironmentVariables(
    pluginPath: string,
    issues: DiagnosisIssue[],
    suggestions: string[]
  ): Promise<void> {
    const spinner = chalk.gray('→ Checking environment variables...');
    process.stdout.write(spinner);

    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      process.stdout.write('\r' + chalk.yellow('⚠ Skipping env vars (no manifest)\n'));
      return;
    }

    try {
      const manifest: PluginManifest = await fs.readJSON(manifestPath);

      if (manifest.configuration?.requiredEnvVars) {
        const missing: string[] = [];

        for (const envVar of manifest.configuration.requiredEnvVars) {
          if (!process.env[envVar]) {
            missing.push(envVar);
          }
        }

        if (missing.length > 0) {
          issues.push({
            type: 'missing-env-var',
            severity: 'warning',
            message: `Missing required environment variables: ${missing.join(', ')}`,
            fix: `Set environment variables: ${missing.join(', ')}`
          });
        }
      }

      process.stdout.write('\r' + chalk.green('✓ Environment variables checked\n'));
    } catch (error) {
      process.stdout.write('\r' + chalk.yellow('⚠ Could not check env vars\n'));
    }
  }

  /**
   * Check hook executability
   */
  private async checkHookExecutability(pluginPath: string, issues: DiagnosisIssue[]): Promise<void> {
    const spinner = chalk.gray('→ Checking hook executability...');
    process.stdout.write(spinner);

    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      process.stdout.write('\r' + chalk.yellow('⚠ Skipping hooks (no manifest)\n'));
      return;
    }

    try {
      const manifest: PluginManifest = await fs.readJSON(manifestPath);

      if (manifest.hooks) {
        let nonExecutable = 0;

        for (const [name, def] of Object.entries(manifest.hooks)) {
          const hookPath = path.join(pluginPath, def.handler);

          if (await fs.pathExists(hookPath)) {
            const stats = await fs.stat(hookPath);

            if (!(stats.mode & 0o111)) {
              issues.push({
                type: 'hook-failure',
                severity: 'warning',
                message: `Hook '${name}' is not executable`,
                path: def.handler,
                fix: `Run: chmod +x ${def.handler}`
              });
              nonExecutable++;
            }
          }
        }

        if (nonExecutable > 0) {
          process.stdout.write('\r' + chalk.yellow(`⚠ ${nonExecutable} non-executable hook(s)\n`));
        } else {
          process.stdout.write('\r' + chalk.green('✓ All hooks executable\n'));
        }
      } else {
        process.stdout.write('\r' + chalk.gray('○ No hooks to check\n'));
      }
    } catch (error) {
      process.stdout.write('\r' + chalk.yellow('⚠ Could not check hooks\n'));
    }
  }

  /**
   * Check for broken references
   */
  private async checkBrokenReferences(pluginPath: string, issues: DiagnosisIssue[]): Promise<void> {
    // This is covered by checkFileReferences, just placeholder
    // Could extend to check internal markdown links, etc.
  }

  /**
   * Check git status
   */
  private async checkGitStatus(pluginPath: string, suggestions: string[]): Promise<void> {
    const spinner = chalk.gray('→ Checking git status...');
    process.stdout.write(spinner);

    try {
      const gitDir = path.join(pluginPath, '.git');

      if (!await fs.pathExists(gitDir)) {
        suggestions.push('Initialize git repository: git init');
        process.stdout.write('\r' + chalk.gray('○ No git repository\n'));
        return;
      }

      const status = execSync('git status --porcelain', {
        cwd: pluginPath,
        encoding: 'utf-8'
      });

      if (status.trim()) {
        suggestions.push('Commit uncommitted changes');
      }

      process.stdout.write('\r' + chalk.green('✓ Git repository found\n'));
    } catch (error) {
      process.stdout.write('\r' + chalk.gray('○ Git not available\n'));
    }
  }

  /**
   * Generate general suggestions
   */
  private generateSuggestions(issues: DiagnosisIssue[], suggestions: string[]): void {
    if (issues.filter(i => i.severity === 'critical').length > 0) {
      suggestions.push('Fix critical issues before distributing plugin');
    }

    if (issues.filter(i => i.type === 'broken-reference').length > 0) {
      suggestions.push('Run: claude-plugin validate . for detailed validation');
    }

    suggestions.push('Run: claude-plugin lint . to check best practices');
  }

  /**
   * Print diagnosis results
   */
  printDiagnosis(diagnosis: DiagnosisResult): void {
    console.log('');

    if (diagnosis.healthy && diagnosis.issues.length === 0) {
      console.log(chalk.green.bold('✓ Plugin is healthy!'));
      console.log(chalk.gray('No issues detected.'));
      return;
    }

    // Print issues
    if (diagnosis.issues.length > 0) {
      const critical = diagnosis.issues.filter(i => i.severity === 'critical');
      const warnings = diagnosis.issues.filter(i => i.severity === 'warning');
      const info = diagnosis.issues.filter(i => i.severity === 'info');

      if (critical.length > 0) {
        console.log(chalk.red.bold(`\n✗ ${critical.length} Critical Issue(s):`));
        this.printIssueTable(critical);
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow.bold(`\n⚠ ${warnings.length} Warning(s):`));
        this.printIssueTable(warnings);
      }

      if (info.length > 0) {
        console.log(chalk.blue.bold(`\nℹ ${info.length} Info:`));
        this.printIssueTable(info);
      }
    }

    // Print suggestions
    if (diagnosis.suggestions.length > 0) {
      console.log(chalk.cyan.bold('\nSuggestions:'));
      for (const suggestion of diagnosis.suggestions) {
        console.log(chalk.cyan('  •'), suggestion);
      }
    }

    console.log('');

    // Overall health
    if (diagnosis.healthy) {
      console.log(chalk.green('✓ Plugin is healthy (with warnings)'));
    } else {
      console.log(chalk.red('✗ Plugin has critical issues that need fixing'));
    }
  }

  /**
   * Print issue table
   */
  private printIssueTable(issues: DiagnosisIssue[]): void {
    const table = new Table({
      head: ['Type', 'Message', 'Fix'],
      style: { head: [], border: [] },
      colWidths: [20, 50, 40]
    });

    for (const issue of issues) {
      table.push([
        issue.type,
        issue.message,
        issue.fix || '-'
      ]);
    }

    console.log(table.toString());
  }
}
