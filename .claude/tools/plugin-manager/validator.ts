/**
 * Claude Code Plugin Validator
 *
 * Validates plugin structure, manifest, and resources to ensure
 * plugins are correctly formatted and safe to install.
 *
 * @module plugin-validator
 */

import * as fs from 'fs';
import * as path from 'path';
import { PluginManifest } from './index';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  file?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  file?: string;
}

export interface ValidationOptions {
  strictMode?: boolean;
  checkSecurity?: boolean;
  checkFileExistence?: boolean;
  allowedCommands?: string[];
  forbiddenPatterns?: RegExp[];
}

// ============================================================================
// Validator Class
// ============================================================================

export class PluginValidator {
  private options: Required<ValidationOptions>;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strictMode: options.strictMode ?? true,
      checkSecurity: options.checkSecurity ?? true,
      checkFileExistence: options.checkFileExistence ?? true,
      allowedCommands: options.allowedCommands ?? [],
      forbiddenPatterns: options.forbiddenPatterns ?? [
        /password\s*=\s*["'][^"']+["']/gi,
        /api[_-]?key\s*=\s*["'][^"']+["']/gi,
        /secret\s*=\s*["'][^"']+["']/gi,
        /token\s*=\s*["'][^"']+["']/gi,
      ],
    };
  }

  // ==========================================================================
  // Main Validation
  // ==========================================================================

  /**
   * Validate a plugin at the given path
   */
  validatePlugin(pluginPath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check plugin directory exists
    if (!fs.existsSync(pluginPath)) {
      errors.push({
        code: 'PLUGIN_NOT_FOUND',
        message: `Plugin directory not found: ${pluginPath}`,
      });
      return { valid: false, errors, warnings };
    }

    // Validate manifest
    const manifestResult = this.validateManifest(pluginPath);
    errors.push(...manifestResult.errors);
    warnings.push(...manifestResult.warnings);

    if (manifestResult.errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Load manifest for further validation
    const manifest = this.loadManifest(pluginPath);
    if (!manifest) {
      errors.push({
        code: 'MANIFEST_LOAD_ERROR',
        message: 'Failed to load plugin manifest',
        file: '.claude-plugin/plugin.json',
      });
      return { valid: false, errors, warnings };
    }

    // Validate structure
    const structureResult = this.validateStructure(pluginPath, manifest);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);

    // Validate resources
    const resourcesResult = this.validateResources(pluginPath, manifest);
    errors.push(...resourcesResult.errors);
    warnings.push(...resourcesResult.warnings);

    // Security checks
    if (this.options.checkSecurity) {
      const securityResult = this.validateSecurity(pluginPath, manifest);
      errors.push(...securityResult.errors);
      warnings.push(...securityResult.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Manifest Validation
  // ==========================================================================

  /**
   * Validate plugin manifest (plugin.json)
   */
  private validateManifest(pluginPath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    // Check manifest exists
    if (!fs.existsSync(manifestPath)) {
      errors.push({
        code: 'MANIFEST_NOT_FOUND',
        message: 'Plugin manifest not found',
        file: '.claude-plugin/plugin.json',
      });
      return { valid: false, errors, warnings };
    }

    // Check manifest is valid JSON
    let manifest: PluginManifest;
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch (error) {
      errors.push({
        code: 'MANIFEST_INVALID_JSON',
        message: `Invalid JSON in manifest: ${error}`,
        file: '.claude-plugin/plugin.json',
      });
      return { valid: false, errors, warnings };
    }

    // Validate required fields
    const requiredFields = ['name', 'version', 'description'];
    for (const field of requiredFields) {
      if (!(field in manifest) || !manifest[field as keyof PluginManifest]) {
        errors.push({
          code: 'MANIFEST_MISSING_FIELD',
          message: `Required field '${field}' is missing or empty`,
          field,
          file: '.claude-plugin/plugin.json',
        });
      }
    }

    // Validate version format (semver)
    if (manifest.version && !this.isValidSemver(manifest.version)) {
      errors.push({
        code: 'MANIFEST_INVALID_VERSION',
        message: `Invalid semantic version: ${manifest.version}`,
        field: 'version',
        file: '.claude-plugin/plugin.json',
      });
    }

    // Validate name format
    if (manifest.name && !this.isValidPluginName(manifest.name)) {
      errors.push({
        code: 'MANIFEST_INVALID_NAME',
        message: `Invalid plugin name: ${manifest.name}. Must be lowercase, alphanumeric with hyphens`,
        field: 'name',
        file: '.claude-plugin/plugin.json',
      });
    }

    // Warn about optional fields
    const recommendedFields = ['author', 'license', 'repository'];
    for (const field of recommendedFields) {
      if (!(field in manifest) || !manifest[field as keyof PluginManifest]) {
        warnings.push({
          code: 'MANIFEST_MISSING_RECOMMENDED',
          message: `Recommended field '${field}' is missing`,
          field,
          file: '.claude-plugin/plugin.json',
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ==========================================================================
  // Structure Validation
  // ==========================================================================

  /**
   * Validate plugin directory structure
   */
  private validateStructure(pluginPath: string, manifest: PluginManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for expected directories
    const expectedDirs = [];
    if (manifest.commands && Object.keys(manifest.commands).length > 0) {
      expectedDirs.push('commands');
    }
    if (manifest.agents && Object.keys(manifest.agents).length > 0) {
      expectedDirs.push('agents');
    }
    if (manifest.skills && Object.keys(manifest.skills).length > 0) {
      expectedDirs.push('skills');
    }
    if (manifest.hooks && Object.keys(manifest.hooks).length > 0) {
      expectedDirs.push('hooks');
    }

    for (const dir of expectedDirs) {
      const dirPath = path.join(pluginPath, dir);
      if (!fs.existsSync(dirPath)) {
        warnings.push({
          code: 'STRUCTURE_MISSING_DIR',
          message: `Expected directory '${dir}' not found`,
          file: dir,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ==========================================================================
  // Resource Validation
  // ==========================================================================

  /**
   * Validate plugin resources (commands, agents, skills, hooks)
   */
  private validateResources(pluginPath: string, manifest: PluginManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate commands
    if (manifest.commands) {
      for (const [cmdName, cmdDef] of Object.entries(manifest.commands)) {
        const handlerPath = path.join(pluginPath, cmdDef.handler);
        if (this.options.checkFileExistence && !fs.existsSync(handlerPath)) {
          errors.push({
            code: 'RESOURCE_HANDLER_NOT_FOUND',
            message: `Command handler not found: ${cmdDef.handler}`,
            field: `commands.${cmdName}`,
            file: cmdDef.handler,
          });
        }

        // Validate command name format
        if (!cmdName.startsWith('/')) {
          errors.push({
            code: 'RESOURCE_INVALID_COMMAND_NAME',
            message: `Command name must start with '/': ${cmdName}`,
            field: `commands.${cmdName}`,
          });
        }
      }
    }

    // Validate agents
    if (manifest.agents) {
      for (const [agentName, agentDef] of Object.entries(manifest.agents)) {
        const handlerPath = path.join(pluginPath, agentDef.handler);
        if (this.options.checkFileExistence && !fs.existsSync(handlerPath)) {
          errors.push({
            code: 'RESOURCE_HANDLER_NOT_FOUND',
            message: `Agent handler not found: ${agentDef.handler}`,
            field: `agents.${agentName}`,
            file: agentDef.handler,
          });
        }

        // Validate model
        if (!['opus', 'sonnet', 'haiku'].includes(agentDef.model)) {
          errors.push({
            code: 'RESOURCE_INVALID_MODEL',
            message: `Invalid model '${agentDef.model}'. Must be: opus, sonnet, or haiku`,
            field: `agents.${agentName}.model`,
          });
        }
      }
    }

    // Validate skills
    if (manifest.skills) {
      for (const [skillName, skillDef] of Object.entries(manifest.skills)) {
        const handlerPath = path.join(pluginPath, skillDef.handler);
        if (this.options.checkFileExistence && !fs.existsSync(handlerPath)) {
          errors.push({
            code: 'RESOURCE_HANDLER_NOT_FOUND',
            message: `Skill handler not found: ${skillDef.handler}`,
            field: `skills.${skillName}`,
            file: skillDef.handler,
          });
        }
      }
    }

    // Validate hooks
    if (manifest.hooks) {
      for (const [hookName, hookDef] of Object.entries(manifest.hooks)) {
        const handlerPath = path.join(pluginPath, hookDef.handler);
        if (this.options.checkFileExistence && !fs.existsSync(handlerPath)) {
          errors.push({
            code: 'RESOURCE_HANDLER_NOT_FOUND',
            message: `Hook handler not found: ${hookDef.handler}`,
            field: `hooks.${hookName}`,
            file: hookDef.handler,
          });
        }

        // Check hook is executable (on Unix-like systems)
        if (process.platform !== 'win32' && fs.existsSync(handlerPath)) {
          try {
            const stats = fs.statSync(handlerPath);
            if (!(stats.mode & 0o111)) {
              warnings.push({
                code: 'RESOURCE_HOOK_NOT_EXECUTABLE',
                message: `Hook script is not executable: ${hookDef.handler}`,
                field: `hooks.${hookName}`,
                file: hookDef.handler,
              });
            }
          } catch (error) {
            // Ignore permission errors
          }
        }

        // Validate event type
        const validEvents = ['PreToolUse', 'PostToolUse', 'PreCommand', 'PostCommand'];
        if (!validEvents.includes(hookDef.event)) {
          errors.push({
            code: 'RESOURCE_INVALID_EVENT',
            message: `Invalid hook event '${hookDef.event}'. Must be one of: ${validEvents.join(', ')}`,
            field: `hooks.${hookName}.event`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ==========================================================================
  // Security Validation
  // ==========================================================================

  /**
   * Validate plugin for security issues
   */
  private validateSecurity(pluginPath: string, manifest: PluginManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for hardcoded secrets
    const secretsResult = this.scanForSecrets(pluginPath);
    warnings.push(...secretsResult.warnings);

    // Check for dangerous commands
    if (manifest.commands) {
      for (const [cmdName, cmdDef] of Object.entries(manifest.commands)) {
        if (cmdDef.allowedTools) {
          const dangerousTools = ['Bash', 'Write', 'Edit'];
          const hasDangerousTools = cmdDef.allowedTools.some(tool =>
            dangerousTools.includes(tool)
          );

          if (hasDangerousTools) {
            warnings.push({
              code: 'SECURITY_DANGEROUS_TOOLS',
              message: `Command '${cmdName}' uses potentially dangerous tools: ${dangerousTools.filter(t => cmdDef.allowedTools!.includes(t)).join(', ')}`,
              field: `commands.${cmdName}.allowedTools`,
            });
          }
        }
      }
    }

    // Check for suspicious hook scripts
    if (manifest.hooks) {
      for (const [hookName, hookDef] of Object.entries(manifest.hooks)) {
        const handlerPath = path.join(pluginPath, hookDef.handler);
        if (fs.existsSync(handlerPath)) {
          const content = fs.readFileSync(handlerPath, 'utf-8');

          // Check for suspicious patterns
          const suspiciousPatterns = [
            /rm\s+-rf\s+\//gi,
            /curl.*\|\s*bash/gi,
            /wget.*\|\s*sh/gi,
            /eval\s*\(/gi,
          ];

          for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
              warnings.push({
                code: 'SECURITY_SUSPICIOUS_PATTERN',
                message: `Hook script contains suspicious pattern: ${pattern.source}`,
                field: `hooks.${hookName}`,
                file: hookDef.handler,
              });
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Scan plugin files for hardcoded secrets
   */
  private scanForSecrets(pluginPath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const filesToScan = this.getFilesToScan(pluginPath);

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');

      for (const pattern of this.options.forbiddenPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          warnings.push({
            code: 'SECURITY_HARDCODED_SECRET',
            message: `Possible hardcoded secret found in ${path.relative(pluginPath, file)}`,
            file: path.relative(pluginPath, file),
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get list of files to scan for security issues
   */
  private getFilesToScan(pluginPath: string): string[] {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.sh', '.md', '.json', '.yml', '.yaml'];

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDir(pluginPath);
    return files;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if version is valid semver
   */
  private isValidSemver(version: string): boolean {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    return semverRegex.test(version);
  }

  /**
   * Check if plugin name is valid
   */
  private isValidPluginName(name: string): boolean {
    const nameRegex = /^[a-z0-9-]+$/;
    return nameRegex.test(name);
  }

  /**
   * Load manifest from plugin path
   */
  private loadManifest(pluginPath: string): PluginManifest | null {
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default PluginValidator;
