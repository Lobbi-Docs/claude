/**
 * Claude Code Plugin Validation Engine
 *
 * Comprehensive JSON Schema validation for plugin manifests, agents, skills,
 * commands, workflows, and registry indexes using Ajv.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, extname } from 'path';
import { parse as parseYaml } from 'yaml';

// Schema imports
import pluginSchema from '../schemas/plugin.schema.json';
import agentSchema from '../schemas/agent.schema.json';
import skillSchema from '../schemas/skill.schema.json';
import commandSchema from '../schemas/command.schema.json';
import workflowSchema from '../schemas/workflow.schema.json';
import registrySchema from '../schemas/registry.schema.json';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  file?: string;
  type?: string;
}

/**
 * Validation error type
 */
export interface ValidationError {
  message: string;
  path?: string;
  keyword?: string;
  params?: Record<string, any>;
  instancePath?: string;
  schemaPath?: string;
}

/**
 * Validation warning type
 */
export interface ValidationWarning {
  message: string;
  path?: string;
  severity: 'info' | 'warning';
}

/**
 * Validation options
 */
export interface ValidationOptions {
  verbose?: boolean;
  strict?: boolean;
  allowUnknownFormats?: boolean;
  customKeywords?: CustomKeyword[];
}

/**
 * Custom keyword definition
 */
export interface CustomKeyword {
  name: string;
  type?: 'string' | 'number' | 'object' | 'array' | 'boolean';
  validate: (data: any, schema: any) => boolean | Promise<boolean>;
  error?: {
    message: string;
  };
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  results: ValidationResult[];
  summary: {
    errors: number;
    warnings: number;
  };
}

/**
 * Claude Code Plugin Validator
 */
export class PluginValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction>;
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      verbose: false,
      strict: true,
      allowUnknownFormats: false,
      ...options,
    };

    // Initialize Ajv with configuration
    this.ajv = new Ajv({
      allErrors: true,
      verbose: this.options.verbose,
      strict: this.options.strict,
      allowUnionTypes: true,
      allowMatchingProperties: true,
    });

    // Add format validators (email, uri, date, etc.)
    addFormats(this.ajv);

    // Add custom formats
    this.addCustomFormats();

    // Add custom keywords
    this.addCustomKeywords(this.options.customKeywords || []);

    // Compile validators
    this.validators = new Map();
    this.compileValidators();
  }

  /**
   * Add custom formats
   */
  private addCustomFormats(): void {
    // Semver format
    this.ajv.addFormat('semver', {
      validate: (data: string) => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(data),
    });

    // Kebab-case format
    this.ajv.addFormat('kebab-case', {
      validate: (data: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(data),
    });

    // Memory size format (e.g., "512M", "2G")
    this.ajv.addFormat('memory-size', {
      validate: (data: string) => /^\d+[KMG]B?$/.test(data),
    });
  }

  /**
   * Add custom keywords
   */
  private addCustomKeywords(keywords: CustomKeyword[]): void {
    keywords.forEach((keyword) => {
      this.ajv.addKeyword({
        keyword: keyword.name,
        type: keyword.type,
        validate: keyword.validate,
        error: keyword.error,
      });
    });
  }

  /**
   * Compile schema validators
   */
  private compileValidators(): void {
    // Add schemas to Ajv
    this.ajv.addSchema(pluginSchema, 'plugin');
    this.ajv.addSchema(agentSchema, 'agent');
    this.ajv.addSchema(skillSchema, 'skill');
    this.ajv.addSchema(commandSchema, 'command');
    this.ajv.addSchema(workflowSchema, 'workflow');
    this.ajv.addSchema(registrySchema, 'registry');

    // Compile validators
    this.validators.set('plugin', this.ajv.compile(pluginSchema));
    this.validators.set('agent', this.ajv.compile(agentSchema));
    this.validators.set('skill', this.ajv.compile(skillSchema));
    this.validators.set('command', this.ajv.compile(commandSchema));
    this.validators.set('workflow', this.ajv.compile(workflowSchema));
    this.validators.set('registry', this.ajv.compile(registrySchema));
  }

  /**
   * Validate plugin manifest
   */
  public validatePlugin(data: any, file?: string): ValidationResult {
    return this.validate('plugin', data, file);
  }

  /**
   * Validate agent definition
   */
  public validateAgent(data: any, file?: string): ValidationResult {
    return this.validate('agent', data, file);
  }

  /**
   * Validate skill definition
   */
  public validateSkill(data: any, file?: string): ValidationResult {
    return this.validate('skill', data, file);
  }

  /**
   * Validate command definition
   */
  public validateCommand(data: any, file?: string): ValidationResult {
    return this.validate('command', data, file);
  }

  /**
   * Validate workflow definition
   */
  public validateWorkflow(data: any, file?: string): ValidationResult {
    return this.validate('workflow', data, file);
  }

  /**
   * Validate registry index
   */
  public validateRegistry(data: any, file?: string): ValidationResult {
    return this.validate('registry', data, file);
  }

  /**
   * Generic validation method
   */
  private validate(type: string, data: any, file?: string): ValidationResult {
    const validator = this.validators.get(type);
    if (!validator) {
      throw new Error(`Unknown validation type: ${type}`);
    }

    const valid = validator(data);
    const errors = this.formatErrors(validator.errors || []);
    const warnings = this.generateWarnings(type, data);

    return {
      valid: valid as boolean,
      errors,
      warnings,
      file,
      type,
    };
  }

  /**
   * Format Ajv errors into readable format
   */
  private formatErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map((error) => ({
      message: this.getErrorMessage(error),
      path: error.instancePath,
      keyword: error.keyword,
      params: error.params,
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
    }));
  }

  /**
   * Get human-readable error message
   */
  private getErrorMessage(error: ErrorObject): string {
    const path = error.instancePath || 'root';
    const keyword = error.keyword;

    switch (keyword) {
      case 'required':
        return `${path}: Missing required property '${error.params.missingProperty}'`;
      case 'type':
        return `${path}: Expected type '${error.params.type}'`;
      case 'pattern':
        return `${path}: Value does not match pattern '${error.params.pattern}'`;
      case 'enum':
        return `${path}: Value must be one of: ${error.params.allowedValues.join(', ')}`;
      case 'minLength':
        return `${path}: String is too short (minimum: ${error.params.limit})`;
      case 'maxLength':
        return `${path}: String is too long (maximum: ${error.params.limit})`;
      case 'minimum':
        return `${path}: Value is too small (minimum: ${error.params.limit})`;
      case 'maximum':
        return `${path}: Value is too large (maximum: ${error.params.limit})`;
      case 'additionalProperties':
        return `${path}: Unexpected property '${error.params.additionalProperty}'`;
      default:
        return `${path}: ${error.message || 'Validation failed'}`;
    }
  }

  /**
   * Generate warnings based on best practices
   */
  private generateWarnings(type: string, data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Plugin-specific warnings
    if (type === 'plugin') {
      if (!data.displayName) {
        warnings.push({
          message: 'Consider adding a displayName for better user experience',
          severity: 'info',
        });
      }
      if (!data.keywords || data.keywords.length < 3) {
        warnings.push({
          message: 'Add more keywords (at least 3) for better discoverability',
          severity: 'warning',
        });
      }
      if (!data.license) {
        warnings.push({
          message: 'Consider specifying a license',
          severity: 'info',
        });
      }
    }

    // Agent-specific warnings
    if (type === 'agent') {
      if (!data.examples || data.examples.length === 0) {
        warnings.push({
          message: 'Add usage examples to help users understand when to use this agent',
          severity: 'warning',
        });
      }
      if (!data.systemPrompt || data.systemPrompt.length < 100) {
        warnings.push({
          message: 'System prompt should be more detailed (at least 100 characters)',
          severity: 'warning',
        });
      }
    }

    // Skill-specific warnings
    if (type === 'skill') {
      if (!data.triggers || data.triggers.length === 0) {
        warnings.push({
          message: 'Add triggers to enable automatic skill activation',
          severity: 'warning',
        });
      }
    }

    return warnings;
  }

  /**
   * Validate file by reading and parsing it
   */
  public validateFile(filePath: string): ValidationResult {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = extname(filePath).toLowerCase();

      let data: any;
      let type: string | undefined;

      // Parse based on file extension
      if (ext === '.json') {
        data = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        data = parseYaml(content);
      } else if (ext === '.md') {
        // Parse markdown frontmatter
        data = this.parseMarkdownFrontmatter(content);
      } else {
        return {
          valid: false,
          errors: [{ message: `Unsupported file type: ${ext}` }],
          warnings: [],
          file: filePath,
        };
      }

      // Detect type from filename or data
      type = this.detectType(filePath, data);

      if (!type) {
        return {
          valid: false,
          errors: [{ message: 'Could not determine validation type' }],
          warnings: [],
          file: filePath,
        };
      }

      const result = this.validate(type, data, filePath);
      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: `Failed to parse file: ${(error as Error).message}` }],
        warnings: [],
        file: filePath,
      };
    }
  }

  /**
   * Parse markdown frontmatter (YAML between --- markers)
   */
  private parseMarkdownFrontmatter(content: string): any {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      return parseYaml(frontmatterMatch[1]);
    }
    return {};
  }

  /**
   * Detect validation type from filename or data
   */
  private detectType(filePath: string, data: any): string | undefined {
    const filename = basename(filePath).toLowerCase();

    // Check filename patterns
    if (filename === 'plugin.json') return 'plugin';
    if (filename === 'manifest.json') return 'plugin';
    if (filename.includes('.agent.')) return 'agent';
    if (filename.includes('.skill.')) return 'skill';
    if (filename.includes('.command.')) return 'command';
    if (filename.includes('.workflow.')) return 'workflow';
    if (filename.includes('.index.json')) return 'registry';
    if (filename === 'skill.md') return 'skill';

    // Check data for type hints
    if (data.$schema) {
      if (data.$schema.includes('plugin')) return 'plugin';
      if (data.$schema.includes('agent')) return 'agent';
      if (data.$schema.includes('skill')) return 'skill';
      if (data.$schema.includes('command')) return 'command';
      if (data.$schema.includes('workflow')) return 'workflow';
      if (data.$schema.includes('registry')) return 'registry';
    }

    // Check data structure
    if (data.type && data.items && data.categories) return 'registry';
    if (data.steps && data.type) return 'workflow';
    if (data.model && data.when_to_use) return 'agent';
    if (data.triggers && data.capabilities) return 'skill';
    if (data.argumentHint || data.allowedTools) return 'command';

    return undefined;
  }

  /**
   * Validate all files in a directory
   */
  public validateDirectory(
    dirPath: string,
    options: { recursive?: boolean; pattern?: RegExp } = {}
  ): BatchValidationResult {
    const { recursive = true, pattern = /\.(json|yaml|yml|md)$/ } = options;
    const results: ValidationResult[] = [];

    const processDirectory = (dir: string) => {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && recursive) {
          processDirectory(fullPath);
        } else if (stat.isFile() && pattern.test(entry)) {
          const result = this.validateFile(fullPath);
          results.push(result);
        }
      }
    };

    processDirectory(dirPath);

    // Calculate summary
    const validFiles = results.filter((r) => r.valid).length;
    const invalidFiles = results.length - validFiles;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
      totalFiles: results.length,
      validFiles,
      invalidFiles,
      results,
      summary: {
        errors: totalErrors,
        warnings: totalWarnings,
      },
    };
  }

  /**
   * Format validation result for console output
   */
  public formatResult(result: ValidationResult): string {
    const lines: string[] = [];

    if (result.file) {
      lines.push(`File: ${result.file}`);
      lines.push(`Type: ${result.type || 'unknown'}`);
    }

    lines.push(`Status: ${result.valid ? '✓ VALID' : '✗ INVALID'}`);

    if (result.errors.length > 0) {
      lines.push('\nErrors:');
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. ${error.message}`);
        if (error.path) {
          lines.push(`     Path: ${error.path}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      result.warnings.forEach((warning, index) => {
        const icon = warning.severity === 'warning' ? '⚠' : 'ℹ';
        lines.push(`  ${icon} ${index + 1}. ${warning.message}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format batch validation result for console output
   */
  public formatBatchResult(result: BatchValidationResult): string {
    const lines: string[] = [];

    lines.push('Validation Summary');
    lines.push('='.repeat(50));
    lines.push(`Total Files: ${result.totalFiles}`);
    lines.push(`Valid: ${result.validFiles}`);
    lines.push(`Invalid: ${result.invalidFiles}`);
    lines.push(`Total Errors: ${result.summary.errors}`);
    lines.push(`Total Warnings: ${result.summary.warnings}`);
    lines.push('');

    if (result.invalidFiles > 0) {
      lines.push('Failed Files:');
      result.results
        .filter((r) => !r.valid)
        .forEach((r) => {
          lines.push(`\n${r.file}:`);
          r.errors.forEach((error) => {
            lines.push(`  ✗ ${error.message}`);
          });
        });
    }

    return lines.join('\n');
  }
}

/**
 * Convenience functions for direct usage
 */

export function validatePlugin(data: any, file?: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validatePlugin(data, file);
}

export function validateAgent(data: any, file?: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validateAgent(data, file);
}

export function validateSkill(data: any, file?: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validateSkill(data, file);
}

export function validateCommand(data: any, file?: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validateCommand(data, file);
}

export function validateWorkflow(data: any, file?: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validateWorkflow(data, file);
}

export function validateRegistry(data: any, file?: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validateRegistry(data, file);
}

export function validateFile(filePath: string): ValidationResult {
  const validator = new PluginValidator();
  return validator.validateFile(filePath);
}

export function validateDirectory(
  dirPath: string,
  options?: { recursive?: boolean; pattern?: RegExp }
): BatchValidationResult {
  const validator = new PluginValidator();
  return validator.validateDirectory(dirPath, options);
}

// Export validator class as default
export default PluginValidator;
