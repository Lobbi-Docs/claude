/**
 * Plugin Validator
 * Comprehensive validation of plugin structure, manifests, and resources
 */

import Ajv from 'ajv';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import { ValidationResult, ValidationError, ValidationWarning, Plugin, PluginManifest } from './types';

export class PluginValidator {
  private ajv: Ajv;
  private manifestSchema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.manifestSchema = this.createManifestSchema();
  }

  /**
   * Main validation method
   */
  async validate(pluginPath: string, options: { strict?: boolean } = {}): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Load plugin
      const plugin = await this.loadPlugin(pluginPath);

      // Validate manifest structure
      const manifestValidation = this.validateManifest(plugin.manifest);
      errors.push(...manifestValidation.errors);
      warnings.push(...manifestValidation.warnings);

      // Validate agents
      for (const [name, agent] of plugin.agents) {
        const agentValidation = await this.validateAgentMarkdown(agent.path);
        errors.push(...agentValidation.errors.map(e => ({ ...e, path: `agents/${name}` })));
        warnings.push(...agentValidation.warnings.map(w => ({ ...w, path: `agents/${name}` })));
      }

      // Validate skills
      for (const [name, skill] of plugin.skills) {
        const skillValidation = await this.validateSkillMarkdown(skill.path);
        errors.push(...skillValidation.errors.map(e => ({ ...e, path: `skills/${name}` })));
        warnings.push(...skillValidation.warnings.map(w => ({ ...w, path: `skills/${name}` })));
      }

      // Validate hooks
      for (const [name, hook] of plugin.hooks) {
        const hookValidation = await this.validateHookScript(hook.path);
        errors.push(...hookValidation.errors.map(e => ({ ...e, path: `hooks/${name}` })));
        warnings.push(...hookValidation.warnings.map(w => ({ ...w, path: `hooks/${name}` })));
      }

      // Validate cross-references
      const refValidation = this.validateReferences(plugin);
      errors.push(...refValidation.errors);
      warnings.push(...refValidation.warnings);

      // Strict mode additional checks
      if (options.strict) {
        const strictChecks = this.performStrictChecks(plugin);
        warnings.push(...strictChecks.warnings);
      }

    } catch (error: any) {
      errors.push({
        path: pluginPath,
        message: error.message || 'Unknown validation error',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load plugin from disk
   */
  private async loadPlugin(pluginPath: string): Promise<Plugin> {
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!await fs.pathExists(manifestPath)) {
      throw new Error('plugin.json not found in .claude-plugin directory');
    }

    const manifest: PluginManifest = await fs.readJSON(manifestPath);

    const plugin: Plugin = {
      path: pluginPath,
      manifest,
      agents: new Map(),
      skills: new Map(),
      commands: new Map(),
      hooks: new Map()
    };

    // Load agents
    if (manifest.agents) {
      for (const [name, def] of Object.entries(manifest.agents)) {
        const agentPath = path.join(pluginPath, def.handler);
        if (await fs.pathExists(agentPath)) {
          const content = await fs.readFile(agentPath, 'utf-8');
          const parsed = matter(content);
          plugin.agents.set(name, {
            name,
            path: agentPath,
            content,
            frontmatter: parsed.data
          });
        }
      }
    }

    // Load skills
    if (manifest.skills) {
      for (const [name, def] of Object.entries(manifest.skills)) {
        const skillPath = path.join(pluginPath, def.handler);
        if (await fs.pathExists(skillPath)) {
          const content = await fs.readFile(skillPath, 'utf-8');
          const parsed = matter(content);
          plugin.skills.set(name, {
            name,
            path: skillPath,
            content,
            frontmatter: parsed.data
          });
        }
      }
    }

    // Load commands
    if (manifest.commands) {
      for (const [name, def] of Object.entries(manifest.commands)) {
        const commandPath = path.join(pluginPath, def.handler);
        if (await fs.pathExists(commandPath)) {
          const content = await fs.readFile(commandPath, 'utf-8');
          plugin.commands.set(name, {
            name,
            path: commandPath,
            content
          });
        }
      }
    }

    // Load hooks
    if (manifest.hooks) {
      for (const [name, def] of Object.entries(manifest.hooks)) {
        const hookPath = path.join(pluginPath, def.handler);
        if (await fs.pathExists(hookPath)) {
          const content = await fs.readFile(hookPath, 'utf-8');
          const stats = await fs.stat(hookPath);
          plugin.hooks.set(name, {
            name,
            path: hookPath,
            content,
            executable: !!(stats.mode & 0o111)
          });
        }
      }
    }

    return plugin;
  }

  /**
   * Validate manifest against JSON schema
   */
  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // JSON Schema validation
    const valid = this.ajv.validate(this.manifestSchema, manifest);

    if (!valid && this.ajv.errors) {
      for (const error of this.ajv.errors) {
        errors.push({
          path: `plugin.json${error.instancePath}`,
          message: error.message || 'Schema validation error',
          severity: 'error',
          code: error.keyword
        });
      }
    }

    // Required fields
    if (!manifest.name) {
      errors.push({ path: 'plugin.json', message: 'Missing required field: name', severity: 'error' });
    }
    if (!manifest.version) {
      errors.push({ path: 'plugin.json', message: 'Missing required field: version', severity: 'error' });
    }
    if (!manifest.description) {
      errors.push({ path: 'plugin.json', message: 'Missing required field: description', severity: 'error' });
    }

    // Version format
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push({
        path: 'plugin.json',
        message: 'Version should follow semantic versioning (X.Y.Z)',
        severity: 'warning'
      });
    }

    // Name format
    if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name)) {
      errors.push({
        path: 'plugin.json',
        message: 'Plugin name must contain only lowercase letters, numbers, and hyphens',
        severity: 'error'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate agent markdown file
   */
  async validateAgentMarkdown(agentPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!await fs.pathExists(agentPath)) {
      errors.push({
        path: agentPath,
        message: 'Agent file does not exist',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    const content = await fs.readFile(agentPath, 'utf-8');

    // Check for frontmatter
    if (!content.startsWith('---')) {
      warnings.push({
        path: agentPath,
        message: 'Agent file should have frontmatter with metadata',
        severity: 'warning'
      });
    } else {
      const parsed = matter(content);

      // Validate frontmatter fields
      if (!parsed.data.name) {
        warnings.push({
          path: agentPath,
          message: 'Agent frontmatter should include name',
          severity: 'warning'
        });
      }

      if (!parsed.data.description) {
        warnings.push({
          path: agentPath,
          message: 'Agent frontmatter should include description',
          severity: 'warning'
        });
      }

      if (!parsed.data.model) {
        warnings.push({
          path: agentPath,
          message: 'Agent frontmatter should specify model (opus/sonnet/haiku)',
          severity: 'warning'
        });
      } else if (!['opus', 'sonnet', 'haiku'].includes(parsed.data.model)) {
        errors.push({
          path: agentPath,
          message: 'Agent model must be one of: opus, sonnet, haiku',
          severity: 'error'
        });
      }
    }

    // Check for required sections
    const requiredSections = ['Role', 'Capabilities', 'Instructions'];
    for (const section of requiredSections) {
      if (!content.includes(`## ${section}`) && !content.includes(`# ${section}`)) {
        warnings.push({
          path: agentPath,
          message: `Agent should have a ${section} section`,
          severity: 'warning'
        });
      }
    }

    // Check for examples
    if (!content.includes('## Examples') && !content.includes('# Examples')) {
      warnings.push({
        path: agentPath,
        message: 'Agent should include examples of usage',
        severity: 'warning'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate skill markdown file
   */
  async validateSkillMarkdown(skillPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!await fs.pathExists(skillPath)) {
      errors.push({
        path: skillPath,
        message: 'Skill file does not exist',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    const content = await fs.readFile(skillPath, 'utf-8');

    // Check for required sections
    const recommendedSections = [
      'Activation Triggers',
      'Domain Knowledge',
      'Examples',
      'Best Practices'
    ];

    for (const section of recommendedSections) {
      if (!content.includes(`## ${section}`) && !content.includes(`# ${section}`)) {
        warnings.push({
          path: skillPath,
          message: `Skill should have a ${section} section`,
          severity: 'warning'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate hook script
   */
  async validateHookScript(hookPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!await fs.pathExists(hookPath)) {
      errors.push({
        path: hookPath,
        message: 'Hook script does not exist',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    const content = await fs.readFile(hookPath, 'utf-8');
    const stats = await fs.stat(hookPath);

    // Check executable permission
    if (!(stats.mode & 0o111)) {
      errors.push({
        path: hookPath,
        message: 'Hook script is not executable (chmod +x required)',
        severity: 'error'
      });
    }

    // Check shebang
    if (!content.startsWith('#!')) {
      warnings.push({
        path: hookPath,
        message: 'Hook script should start with shebang (#!/bin/bash or #!/usr/bin/env node)',
        severity: 'warning'
      });
    }

    // Check for error handling (bash)
    if (content.includes('#!/bin/bash') || content.includes('#!/bin/sh')) {
      if (!content.includes('set -e')) {
        warnings.push({
          path: hookPath,
          message: 'Bash hook should include "set -e" for error handling',
          severity: 'warning'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate cross-references
   */
  validateReferences(plugin: Plugin): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check that all handler paths in manifest exist
    if (plugin.manifest.agents) {
      for (const [name, def] of Object.entries(plugin.manifest.agents)) {
        if (!plugin.agents.has(name)) {
          errors.push({
            path: `plugin.json/agents/${name}`,
            message: `Agent handler file not found: ${def.handler}`,
            severity: 'error'
          });
        }
      }
    }

    if (plugin.manifest.skills) {
      for (const [name, def] of Object.entries(plugin.manifest.skills)) {
        if (!plugin.skills.has(name)) {
          errors.push({
            path: `plugin.json/skills/${name}`,
            message: `Skill handler file not found: ${def.handler}`,
            severity: 'error'
          });
        }
      }
    }

    if (plugin.manifest.commands) {
      for (const [name, def] of Object.entries(plugin.manifest.commands)) {
        if (!plugin.commands.has(name)) {
          errors.push({
            path: `plugin.json/commands/${name}`,
            message: `Command handler file not found: ${def.handler}`,
            severity: 'error'
          });
        }
      }
    }

    if (plugin.manifest.hooks) {
      for (const [name, def] of Object.entries(plugin.manifest.hooks)) {
        if (!plugin.hooks.has(name)) {
          errors.push({
            path: `plugin.json/hooks/${name}`,
            message: `Hook handler file not found: ${def.handler}`,
            severity: 'error'
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Perform strict mode checks
   */
  private performStrictChecks(plugin: Plugin): ValidationResult {
    const warnings: ValidationWarning[] = [];

    // Check for README
    const readmePath = path.join(plugin.path, 'README.md');
    if (!fs.existsSync(readmePath)) {
      warnings.push({
        path: 'README.md',
        message: 'Plugin should include a README.md file',
        severity: 'warning'
      });
    }

    // Check for LICENSE
    const licensePath = path.join(plugin.path, 'LICENSE');
    if (!fs.existsSync(licensePath)) {
      warnings.push({
        path: 'LICENSE',
        message: 'Plugin should include a LICENSE file',
        severity: 'warning'
      });
    }

    // Check for repository info
    if (!plugin.manifest.repository) {
      warnings.push({
        path: 'plugin.json',
        message: 'Plugin should include repository information',
        severity: 'warning'
      });
    }

    return { valid: true, errors: [], warnings };
  }

  /**
   * Create JSON schema for manifest validation
   */
  private createManifestSchema(): any {
    return {
      type: 'object',
      required: ['name', 'version', 'description', 'author', 'license'],
      properties: {
        name: { type: 'string', pattern: '^[a-z0-9-]+$' },
        version: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' },
        license: { type: 'string' },
        keywords: {
          type: 'array',
          items: { type: 'string' }
        },
        categories: {
          type: 'array',
          items: { type: 'string' }
        },
        repository: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            url: { type: 'string' }
          }
        },
        agents: { type: 'object' },
        skills: { type: 'object' },
        commands: { type: 'object' },
        hooks: { type: 'object' },
        configuration: { type: 'object' }
      }
    };
  }

  /**
   * Print validation results to console
   */
  printResults(result: ValidationResult): void {
    console.log('');

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(chalk.green('✓ Validation passed with no issues!'));
      return;
    }

    // Print errors
    if (result.errors.length > 0) {
      console.log(chalk.red.bold(`✗ ${result.errors.length} Error(s):`));
      const errorTable = new Table({
        head: [chalk.red('Path'), chalk.red('Message')],
        style: { head: [], border: [] }
      });

      for (const error of result.errors) {
        errorTable.push([error.path, error.message]);
      }

      console.log(errorTable.toString());
      console.log('');
    }

    // Print warnings
    if (result.warnings.length > 0) {
      console.log(chalk.yellow.bold(`⚠ ${result.warnings.length} Warning(s):`));
      const warningTable = new Table({
        head: [chalk.yellow('Path'), chalk.yellow('Message')],
        style: { head: [], border: [] }
      });

      for (const warning of result.warnings) {
        warningTable.push([warning.path, warning.message]);
      }

      console.log(warningTable.toString());
      console.log('');
    }

    // Summary
    if (result.valid) {
      console.log(chalk.green('✓ Validation passed (with warnings)'));
    } else {
      console.log(chalk.red('✗ Validation failed'));
    }
  }
}
