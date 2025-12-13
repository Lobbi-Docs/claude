/**
 * Archetype Validator - Validates archetype structure and templates
 *
 * Performs comprehensive validation:
 * - Metadata schema validation
 * - Template syntax checking
 * - Required file verification
 * - Variable reference validation
 * - Hook script validation
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidationResult, ValidationError, ArchetypeMetadata } from './types.js';
import { TemplateEngine } from './template-engine.js';

export class ArchetypeValidator {
  private ajv: Ajv;
  private templateEngine: TemplateEngine;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Validate an archetype directory
   */
  async validate(archetypePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // 1. Check required files exist
      await this.validateRequiredFiles(archetypePath, errors);

      // 2. Validate metadata (archetype.json)
      await this.validateMetadata(archetypePath, errors);

      // 3. Validate templates
      await this.validateTemplates(archetypePath, errors, warnings);

      // 4. Validate hooks
      await this.validateHooks(archetypePath, errors, warnings);

      // 5. Validate examples
      await this.validateExamples(archetypePath, warnings);

      // 6. Cross-check variable usage
      await this.validateVariableUsage(archetypePath, warnings);

    } catch (error) {
      errors.push({
        type: 'error',
        message: `Validation failed: ${error}`,
        file: archetypePath
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate required files exist
   */
  private async validateRequiredFiles(
    archetypePath: string,
    errors: ValidationError[]
  ): Promise<void> {
    const requiredFiles = ['archetype.json', 'README.md', 'templates'];

    for (const file of requiredFiles) {
      const filePath = join(archetypePath, file);
      try {
        await stat(filePath);
      } catch {
        errors.push({
          type: 'error',
          message: `Required file/directory missing: ${file}`,
          file: archetypePath,
          fix: file === 'templates'
            ? 'Create a templates/ directory with your template files'
            : `Create ${file} in the archetype root`
        });
      }
    }
  }

  /**
   * Validate archetype.json metadata
   */
  private async validateMetadata(
    archetypePath: string,
    errors: ValidationError[]
  ): Promise<ArchetypeMetadata | undefined> {
    const metadataPath = join(archetypePath, 'archetype.json');

    try {
      const content = await readFile(metadataPath, 'utf-8');
      const metadata: ArchetypeMetadata = JSON.parse(content);

      // Validate against JSON schema
      const schema = this.getMetadataSchema();
      const valid = this.ajv.validate(schema, metadata);

      if (!valid && this.ajv.errors) {
        for (const error of this.ajv.errors) {
          errors.push({
            type: 'error',
            message: `Metadata ${error.instancePath}: ${error.message}`,
            file: metadataPath
          });
        }
      }

      // Additional validation rules
      if (metadata.name && !/^[a-z][a-z0-9-]*$/.test(metadata.name)) {
        errors.push({
          type: 'error',
          message: 'Archetype name must be kebab-case (lowercase with hyphens)',
          file: metadataPath,
          fix: 'Use lowercase letters, numbers, and hyphens only. Start with a letter.'
        });
      }

      if (metadata.version && !/^\d+\.\d+\.\d+/.test(metadata.version)) {
        errors.push({
          type: 'error',
          message: 'Version must follow semantic versioning (e.g., 1.0.0)',
          file: metadataPath,
          fix: 'Use format: MAJOR.MINOR.PATCH'
        });
      }

      // Validate variable definitions
      if (metadata.variables) {
        for (const variable of metadata.variables) {
          if (variable.type === 'choice' || variable.type === 'multi-choice') {
            if (!variable.choices || variable.choices.length === 0) {
              errors.push({
                type: 'error',
                message: `Variable "${variable.name}" of type ${variable.type} must have choices`,
                file: metadataPath
              });
            }
          }

          if (variable.validation) {
            try {
              new RegExp(variable.validation);
            } catch {
              errors.push({
                type: 'error',
                message: `Variable "${variable.name}" has invalid regex pattern: ${variable.validation}`,
                file: metadataPath
              });
            }
          }
        }
      }

      return metadata;
    } catch (error) {
      errors.push({
        type: 'error',
        message: `Failed to parse archetype.json: ${error}`,
        file: metadataPath
      });
      return undefined;
    }
  }

  /**
   * Validate template files
   */
  private async validateTemplates(
    archetypePath: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): Promise<void> {
    const templatesDir = join(archetypePath, 'templates');

    try {
      const templateFiles = await this.getAllFiles(templatesDir);

      if (templateFiles.length === 0) {
        warnings.push({
          type: 'warning',
          message: 'No template files found in templates directory',
          file: templatesDir
        });
        return;
      }

      for (const templateFile of templateFiles) {
        const fullPath = join(templatesDir, templateFile);

        // Check if it's a Handlebars template
        if (fullPath.endsWith('.hbs')) {
          try {
            const content = await readFile(fullPath, 'utf-8');
            const validation = this.templateEngine.validateTemplate(content);

            if (!validation.valid) {
              errors.push({
                type: 'error',
                message: `Invalid template syntax: ${validation.error}`,
                file: fullPath
              });
            }
          } catch (error) {
            errors.push({
              type: 'error',
              message: `Failed to read template: ${error}`,
              file: fullPath
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        type: 'error',
        message: `Failed to validate templates: ${error}`,
        file: templatesDir
      });
    }
  }

  /**
   * Validate hook scripts
   */
  private async validateHooks(
    archetypePath: string,
    _errors: ValidationError[],
    warnings: ValidationError[]
  ): Promise<void> {
    const hooksDir = join(archetypePath, 'hooks');

    try {
      await stat(hooksDir);
    } catch {
      // Hooks directory is optional
      return;
    }

    const hookFiles = ['pre-generate.ts', 'post-generate.ts'];

    for (const hookFile of hookFiles) {
      const hookPath = join(hooksDir, hookFile);

      try {
        const stats = await stat(hookPath);
        if (!stats.isFile()) {
          continue;
        }

        // Basic syntax check - just ensure it's valid TypeScript
        const content = await readFile(hookPath, 'utf-8');

        if (!content.includes('export') || !content.includes('function')) {
          warnings.push({
            type: 'warning',
            message: 'Hook should export a function',
            file: hookPath,
            fix: 'Export a default function or named "hook" function'
          });
        }

        // Check for required imports
        if (!content.includes('HookContext')) {
          warnings.push({
            type: 'warning',
            message: 'Hook should use HookContext type',
            file: hookPath,
            fix: 'Import HookContext from types'
          });
        }
      } catch {
        // Hook file doesn't exist, which is fine
      }
    }
  }

  /**
   * Validate example outputs
   */
  private async validateExamples(
    archetypePath: string,
    warnings: ValidationError[]
  ): Promise<void> {
    const examplesDir = join(archetypePath, 'examples');

    try {
      await stat(examplesDir);
      const examples = await readdir(examplesDir);

      if (examples.length === 0) {
        warnings.push({
          type: 'warning',
          message: 'No example outputs found',
          file: examplesDir,
          fix: 'Add example outputs to help users understand the archetype'
        });
      }
    } catch {
      warnings.push({
        type: 'warning',
        message: 'No examples directory found',
        file: archetypePath,
        fix: 'Create an examples/ directory with sample outputs'
      });
    }
  }

  /**
   * Validate variable usage across templates
   */
  private async validateVariableUsage(
    archetypePath: string,
    warnings: ValidationError[]
  ): Promise<void> {
    try {
      const metadataPath = join(archetypePath, 'archetype.json');
      const metadataContent = await readFile(metadataPath, 'utf-8');
      const metadata: ArchetypeMetadata = JSON.parse(metadataContent);

      const declaredVariables = new Set(metadata.variables.map(v => v.name));
      const usedVariables = new Set<string>();

      // Scan all templates for variable usage
      const templatesDir = join(archetypePath, 'templates');
      const templateFiles = await this.getAllFiles(templatesDir);

      for (const templateFile of templateFiles) {
        const fullPath = join(templatesDir, templateFile);
        const content = await readFile(fullPath, 'utf-8');
        const variables = this.templateEngine.extractVariables(content);

        variables.forEach(v => usedVariables.add(v));
      }

      // Check for declared but unused variables
      for (const declared of declaredVariables) {
        if (!usedVariables.has(declared)) {
          warnings.push({
            type: 'warning',
            message: `Variable "${declared}" is declared but never used in templates`,
            file: metadataPath
          });
        }
      }

      // Check for used but undeclared variables
      const systemVariables = new Set(['env', 'year', 'date', 'timestamp']);
      for (const used of usedVariables) {
        if (!declaredVariables.has(used) && !systemVariables.has(used)) {
          warnings.push({
            type: 'warning',
            message: `Variable "${used}" is used but not declared in archetype.json`,
            file: metadataPath,
            fix: `Add variable definition for "${used}" to archetype.json`
          });
        }
      }
    } catch {
      // If we can't validate, just skip
    }
  }

  /**
   * Get all files recursively
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (currentDir: string, basePath: string = ''): Promise<void> => {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = join(basePath, entry.name);
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };

    await walk(dir);
    return files;
  }

  /**
   * Get JSON schema for archetype metadata
   */
  private getMetadataSchema() {
    return {
      type: 'object',
      required: ['name', 'version', 'description', 'category', 'variables', 'files'],
      properties: {
        name: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
        description: { type: 'string', minLength: 10 },
        category: { type: 'string' },
        author: { type: 'string' },
        license: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        variables: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'type', 'prompt'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['string', 'number', 'boolean', 'choice', 'multi-choice', 'path', 'email', 'url']
              },
              prompt: { type: 'string' },
              default: {},
              validation: { type: 'string' },
              choices: { type: 'array', items: { type: 'string' } },
              description: { type: 'string' },
              required: { type: 'boolean' }
            }
          }
        },
        dependencies: { type: 'array', items: { type: 'string' } },
        files: { type: 'array', items: { type: 'string' } },
        ignore: { type: 'array', items: { type: 'string' } },
        homepage: { type: 'string', format: 'uri' },
        repository: { type: 'string', format: 'uri' }
      }
    };
  }
}

/**
 * Create a validator instance
 */
export function createValidator(): ArchetypeValidator {
  return new ArchetypeValidator();
}
