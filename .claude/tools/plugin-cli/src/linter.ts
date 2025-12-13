/**
 * Plugin Linter
 * Checks plugin best practices and coding standards
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as matter from 'gray-matter';
import { LintRule, LintResult, Plugin, PluginManifest } from './types';

export class PluginLinter {
  rules: LintRule[];

  constructor() {
    this.rules = this.createRules();
  }

  /**
   * Main linting method
   */
  async lint(
    pluginPath: string,
    options: { fix?: boolean; rules?: string[] } = {}
  ): Promise<LintResult[]> {
    const results: LintResult[] = [];

    try {
      // Load plugin
      const plugin = await this.loadPlugin(pluginPath);

      // Filter rules if specified
      const activeRules = options.rules
        ? this.rules.filter(r => options.rules!.includes(r.id))
        : this.rules;

      // Run all active rules
      for (const rule of activeRules) {
        const ruleResults = rule.check(plugin);
        results.push(...ruleResults);
      }

      // Sort by severity
      results.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

    } catch (error: any) {
      results.push({
        ruleId: 'lint-error',
        severity: 'error',
        message: error.message || 'Linting failed',
        path: pluginPath
      });
    }

    return results;
  }

  /**
   * Load plugin from disk
   */
  private async loadPlugin(pluginPath: string): Promise<Plugin> {
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      throw new Error('plugin.json not found');
    }

    const manifest: PluginManifest = await fs.readJSON(manifestPath);

    return {
      path: pluginPath,
      manifest,
      agents: new Map(),
      skills: new Map(),
      commands: new Map(),
      hooks: new Map()
    };
  }

  /**
   * Create linting rules
   */
  private createRules(): LintRule[] {
    return [
      // Manifest rules
      {
        id: 'manifest-has-keywords',
        name: 'Manifest has keywords',
        description: 'Plugin manifest should include relevant keywords',
        severity: 'warning',
        category: 'manifest',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (!plugin.manifest.keywords || plugin.manifest.keywords.length === 0) {
            results.push({
              ruleId: 'manifest-has-keywords',
              severity: 'warning',
              message: 'Manifest should include keywords for discoverability',
              path: 'plugin.json',
              suggestion: 'Add keywords array with relevant tags'
            });
          }
          return results;
        }
      },
      {
        id: 'manifest-has-categories',
        name: 'Manifest has categories',
        description: 'Plugin manifest should include categories',
        severity: 'warning',
        category: 'manifest',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (!plugin.manifest.categories || plugin.manifest.categories.length === 0) {
            results.push({
              ruleId: 'manifest-has-categories',
              severity: 'warning',
              message: 'Manifest should include categories',
              path: 'plugin.json',
              suggestion: 'Add categories array (e.g., ["devops", "testing"])'
            });
          }
          return results;
        }
      },
      {
        id: 'manifest-has-repository',
        name: 'Manifest has repository',
        description: 'Plugin manifest should include repository information',
        severity: 'info',
        category: 'manifest',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (!plugin.manifest.repository) {
            results.push({
              ruleId: 'manifest-has-repository',
              severity: 'info',
              message: 'Consider adding repository information',
              path: 'plugin.json',
              suggestion: 'Add repository object with type and url'
            });
          }
          return results;
        }
      },
      {
        id: 'description-length',
        name: 'Description length appropriate',
        description: 'Plugin description should be concise but informative',
        severity: 'info',
        category: 'manifest',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.description) {
            const length = plugin.manifest.description.length;
            if (length < 20) {
              results.push({
                ruleId: 'description-length',
                severity: 'info',
                message: 'Description is very short, consider adding more detail',
                path: 'plugin.json',
                suggestion: 'Expand description to at least 20 characters'
              });
            } else if (length > 200) {
              results.push({
                ruleId: 'description-length',
                severity: 'info',
                message: 'Description is very long, consider being more concise',
                path: 'plugin.json',
                suggestion: 'Keep description under 200 characters'
              });
            }
          }
          return results;
        }
      },

      // Agent rules
      {
        id: 'agent-model-specified',
        name: 'Agent model specified',
        description: 'All agents must specify a model',
        severity: 'error',
        category: 'agent',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.agents) {
            for (const [name, def] of Object.entries(plugin.manifest.agents)) {
              if (!def.model) {
                results.push({
                  ruleId: 'agent-model-specified',
                  severity: 'error',
                  message: `Agent '${name}' must specify a model (opus/sonnet/haiku)`,
                  path: `plugin.json/agents/${name}`,
                  suggestion: 'Add "model": "sonnet" to agent definition'
                });
              }
            }
          }
          return results;
        }
      },
      {
        id: 'agent-has-description',
        name: 'Agent has description',
        description: 'All agents should have descriptions',
        severity: 'warning',
        category: 'agent',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.agents) {
            for (const [name, def] of Object.entries(plugin.manifest.agents)) {
              if (!def.description || def.description.trim().length === 0) {
                results.push({
                  ruleId: 'agent-has-description',
                  severity: 'warning',
                  message: `Agent '${name}' should have a description`,
                  path: `plugin.json/agents/${name}`,
                  suggestion: 'Add meaningful description of what this agent does'
                });
              }
            }
          }
          return results;
        }
      },
      {
        id: 'agent-has-triggers',
        name: 'Agent has activation triggers',
        description: 'Agents should specify activation triggers',
        severity: 'info',
        category: 'agent',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.agents) {
            for (const [name, def] of Object.entries(plugin.manifest.agents)) {
              if (!def.triggers || def.triggers.length === 0) {
                results.push({
                  ruleId: 'agent-has-triggers',
                  severity: 'info',
                  message: `Agent '${name}' could specify activation triggers`,
                  path: `plugin.json/agents/${name}`,
                  suggestion: 'Add triggers array with keywords that activate this agent'
                });
              }
            }
          }
          return results;
        }
      },

      // Skill rules
      {
        id: 'skill-has-triggers',
        name: 'Skill has activation triggers',
        description: 'Skills should specify when they activate',
        severity: 'warning',
        category: 'skill',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.skills) {
            for (const [name, def] of Object.entries(plugin.manifest.skills)) {
              if ((!def.triggers || def.triggers.length === 0) &&
                  (!def.filePatterns || def.filePatterns.length === 0)) {
                results.push({
                  ruleId: 'skill-has-triggers',
                  severity: 'warning',
                  message: `Skill '${name}' should specify triggers or filePatterns`,
                  path: `plugin.json/skills/${name}`,
                  suggestion: 'Add triggers or filePatterns for skill activation'
                });
              }
            }
          }
          return results;
        }
      },

      // Command rules
      {
        id: 'command-has-description',
        name: 'Command has description',
        description: 'All commands must have descriptions',
        severity: 'error',
        category: 'command',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.commands) {
            for (const [name, def] of Object.entries(plugin.manifest.commands)) {
              if (!def.description || def.description.trim().length === 0) {
                results.push({
                  ruleId: 'command-has-description',
                  severity: 'error',
                  message: `Command '${name}' must have a description`,
                  path: `plugin.json/commands/${name}`,
                  suggestion: 'Add description explaining what this command does'
                });
              }
            }
          }
          return results;
        }
      },
      {
        id: 'command-has-examples',
        name: 'Command has usage examples',
        description: 'Commands should include usage examples',
        severity: 'info',
        category: 'command',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.commands) {
            for (const [name, def] of Object.entries(plugin.manifest.commands)) {
              if (!def.examples || def.examples.length === 0) {
                results.push({
                  ruleId: 'command-has-examples',
                  severity: 'info',
                  message: `Command '${name}' should include usage examples`,
                  path: `plugin.json/commands/${name}`,
                  suggestion: 'Add examples array with common usage patterns'
                });
              }
            }
          }
          return results;
        }
      },

      // Hook rules
      {
        id: 'hook-has-event',
        name: 'Hook has event type',
        description: 'All hooks must specify event type',
        severity: 'error',
        category: 'hook',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.hooks) {
            for (const [name, def] of Object.entries(plugin.manifest.hooks)) {
              if (!def.event) {
                results.push({
                  ruleId: 'hook-has-event',
                  severity: 'error',
                  message: `Hook '${name}' must specify event type`,
                  path: `plugin.json/hooks/${name}`,
                  suggestion: 'Add event: "PreToolUse" or "PostToolUse"'
                });
              }
            }
          }
          return results;
        }
      },
      {
        id: 'hook-has-pattern',
        name: 'Hook has matching pattern',
        description: 'Hooks should specify tool or file patterns',
        severity: 'warning',
        category: 'hook',
        check: (plugin) => {
          const results: LintResult[] = [];
          if (plugin.manifest.hooks) {
            for (const [name, def] of Object.entries(plugin.manifest.hooks)) {
              if (!def.toolPattern && !def.filePattern) {
                results.push({
                  ruleId: 'hook-has-pattern',
                  severity: 'warning',
                  message: `Hook '${name}' should specify toolPattern or filePattern`,
                  path: `plugin.json/hooks/${name}`,
                  suggestion: 'Add toolPattern or filePattern to filter hook execution'
                });
              }
            }
          }
          return results;
        }
      },

      // General rules
      {
        id: 'has-readme',
        name: 'Plugin has README',
        description: 'Plugin should include README.md',
        severity: 'warning',
        category: 'manifest',
        check: (plugin) => {
          const results: LintResult[] = [];
          const readmePath = path.join(plugin.path, 'README.md');
          if (!fs.existsSync(readmePath)) {
            results.push({
              ruleId: 'has-readme',
              severity: 'warning',
              message: 'Plugin should include README.md',
              path: plugin.path,
              suggestion: 'Create README.md with plugin documentation'
            });
          }
          return results;
        }
      },
      {
        id: 'has-license',
        name: 'Plugin has LICENSE',
        description: 'Plugin should include LICENSE file',
        severity: 'info',
        category: 'manifest',
        check: (plugin) => {
          const results: LintResult[] = [];
          const licensePath = path.join(plugin.path, 'LICENSE');
          if (!fs.existsSync(licensePath)) {
            results.push({
              ruleId: 'has-license',
              severity: 'info',
              message: 'Plugin should include LICENSE file',
              path: plugin.path,
              suggestion: 'Create LICENSE file with your chosen license'
            });
          }
          return results;
        }
      }
    ];
  }

  /**
   * Print lint results to console
   */
  printResults(results: LintResult[]): void {
    console.log('');

    if (results.length === 0) {
      console.log(chalk.green('✓ No linting issues found!'));
      return;
    }

    // Group by severity
    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');
    const info = results.filter(r => r.severity === 'info');

    // Print errors
    if (errors.length > 0) {
      console.log(chalk.red.bold(`✗ ${errors.length} Error(s):`));
      this.printResultTable(errors, 'red');
      console.log('');
    }

    // Print warnings
    if (warnings.length > 0) {
      console.log(chalk.yellow.bold(`⚠ ${warnings.length} Warning(s):`));
      this.printResultTable(warnings, 'yellow');
      console.log('');
    }

    // Print info
    if (info.length > 0) {
      console.log(chalk.blue.bold(`ℹ ${info.length} Suggestion(s):`));
      this.printResultTable(info, 'blue');
      console.log('');
    }

    // Summary
    console.log(chalk.gray('─'.repeat(60)));
    console.log(
      chalk.white('Total: '),
      errors.length > 0 ? chalk.red(`${errors.length} errors`) : '',
      warnings.length > 0 ? chalk.yellow(`${warnings.length} warnings`) : '',
      info.length > 0 ? chalk.blue(`${info.length} suggestions`) : ''
    );
  }

  /**
   * Print result table
   */
  private printResultTable(results: LintResult[], color: string): void {
    const table = new Table({
      head: ['Rule', 'Path', 'Message', 'Suggestion'],
      style: { head: [], border: [] },
      colWidths: [25, 30, 40, 40]
    });

    for (const result of results) {
      table.push([
        result.ruleId,
        result.path,
        result.message,
        result.suggestion || '-'
      ]);
    }

    console.log(table.toString());
  }
}
