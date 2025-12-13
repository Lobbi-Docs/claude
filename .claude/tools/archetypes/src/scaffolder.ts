/**
 * Scaffolder - Creates new plugins from archetype templates
 *
 * Handles the complete scaffolding workflow:
 * - Interactive variable collection
 * - Template processing
 * - File generation
 * - Hook execution
 * - Post-generation validation
 */

import { mkdir, writeFile, stat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import pc from 'picocolors';
import type {
  Archetype,
  ScaffoldOptions,
  TemplateContext,
  ArchetypeVariable,
  HookContext,
  HookFunction
} from './types.js';
import { TemplateEngine } from './template-engine.js';
import { ArchetypeRegistry } from './archetype-registry.js';

export class Scaffolder {
  private templateEngine: TemplateEngine;
  private registry: ArchetypeRegistry;

  constructor(registry: ArchetypeRegistry, templateEngine?: TemplateEngine) {
    this.registry = registry;
    this.templateEngine = templateEngine || new TemplateEngine();
  }

  /**
   * Scaffold a new plugin from an archetype
   */
  async scaffold(options: ScaffoldOptions): Promise<string[]> {
    const spinner = ora();

    try {
      // Load archetype
      spinner.start('Loading archetype...');
      const archetype = await this.registry.get(options.archetype);
      if (!archetype) {
        throw new Error(`Archetype not found: ${options.archetype}`);
      }
      spinner.succeed(`Loaded archetype: ${pc.cyan(archetype.metadata.name)}`);

      // Collect variables
      let variables = options.variables || {};
      if (!options.nonInteractive) {
        variables = await this.collectVariables(archetype, variables);
      }

      // Create template context
      const context = this.templateEngine.createContext(variables, {
        archetypeName: archetype.metadata.name,
        archetypeVersion: archetype.metadata.version
      });

      // Check output directory
      await this.checkOutputDirectory(options.outputDir, options.force);

      // Execute pre-generate hook
      if (archetype.hooks?.preGenerate) {
        spinner.start('Running pre-generate hook...');
        await this.executeHook(archetype.hooks.preGenerate, {
          archetype,
          outputDir: options.outputDir,
          context
        });
        spinner.succeed('Pre-generate hook completed');
      }

      // Generate files
      spinner.start('Generating files...');
      const generatedFiles = await this.generateFiles(
        archetype,
        context,
        options.outputDir,
        options.dryRun
      );
      spinner.succeed(`Generated ${generatedFiles.length} files`);

      // Execute post-generate hook
      if (archetype.hooks?.postGenerate) {
        spinner.start('Running post-generate hook...');
        await this.executeHook(archetype.hooks.postGenerate, {
          archetype,
          outputDir: options.outputDir,
          context,
          files: generatedFiles
        });
        spinner.succeed('Post-generate hook completed');
      }

      // Display summary
      this.displaySummary(archetype, options.outputDir, generatedFiles, options.dryRun);

      return generatedFiles;
    } catch (error) {
      spinner.fail('Scaffolding failed');
      throw error;
    }
  }

  /**
   * Collect variable values interactively
   */
  private async collectVariables(
    archetype: Archetype,
    initialValues: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const questions = archetype.metadata.variables.map(variable => {
      return this.createPrompt(variable, initialValues[variable.name]);
    });

    const answers = await inquirer.prompt(questions);
    return { ...initialValues, ...answers };
  }

  /**
   * Create an inquirer prompt from a variable definition
   */
  private createPrompt(
    variable: ArchetypeVariable,
    initialValue?: unknown
  ): any {
    const basePrompt: any = {
      name: variable.name,
      message: variable.prompt,
      default: initialValue ?? variable.default,
      when: variable.when as any
    };

    switch (variable.type) {
      case 'string':
      case 'email':
      case 'url':
      case 'path':
        return {
          ...basePrompt,
          type: 'input',
          validate: (input: string) => {
            if (variable.required && !input) {
              return `${variable.name} is required`;
            }
            if (variable.validation) {
              const regex = new RegExp(variable.validation);
              if (!regex.test(input)) {
                return `Invalid ${variable.name} format`;
              }
            }
            return true;
          }
        };

      case 'number':
        return {
          ...basePrompt,
          type: 'number',
          validate: (input: number) => {
            if (variable.required && input === undefined) {
              return `${variable.name} is required`;
            }
            return true;
          }
        };

      case 'boolean':
        return {
          ...basePrompt,
          type: 'confirm'
        };

      case 'choice':
        return {
          ...basePrompt,
          type: 'list',
          choices: variable.choices || []
        };

      case 'multi-choice':
        return {
          ...basePrompt,
          type: 'checkbox',
          choices: variable.choices || []
        };

      default:
        return {
          ...basePrompt,
          type: 'input'
        };
    }
  }

  /**
   * Check if output directory exists and handle conflicts
   */
  private async checkOutputDirectory(outputDir: string, force?: boolean): Promise<void> {
    try {
      await stat(outputDir);
      if (!force) {
        throw new Error(
          `Output directory already exists: ${outputDir}\nUse --force to overwrite`
        );
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, which is fine
    }
  }

  /**
   * Generate all files from archetype templates
   */
  private async generateFiles(
    archetype: Archetype,
    context: TemplateContext,
    outputDir: string,
    dryRun?: boolean
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    for (const templatePath of archetype.templates) {
      const templateFullPath = join(archetype.path, 'templates', templatePath);

      // Process filename
      const outputFilename = this.templateEngine.processFilename(templatePath, context);
      const outputFullPath = join(outputDir, outputFilename);

      // Process template content
      const content = await this.templateEngine.processFile(templateFullPath, context);

      if (!dryRun) {
        // Ensure directory exists
        await mkdir(dirname(outputFullPath), { recursive: true });

        // Write file
        await writeFile(outputFullPath, content, 'utf-8');
      }

      generatedFiles.push(outputFullPath);
    }

    return generatedFiles;
  }

  /**
   * Execute a hook script
   */
  private async executeHook(hookPath: string, context: HookContext): Promise<void> {
    try {
      // Dynamically import the hook module
      const hookModule = await import(hookPath);
      const hookFunction: HookFunction = hookModule.default || hookModule.hook;

      if (typeof hookFunction !== 'function') {
        throw new Error('Hook must export a default function or a "hook" function');
      }

      await hookFunction(context);
    } catch (error) {
      throw new Error(`Hook execution failed: ${error}`);
    }
  }

  /**
   * Display scaffolding summary
   */
  private displaySummary(
    archetype: Archetype,
    outputDir: string,
    files: string[],
    dryRun?: boolean
  ): void {
    console.log('\n' + pc.bold(pc.green('✓ Scaffolding Complete!')));
    console.log('\n' + pc.bold('Summary:'));
    console.log(`  Archetype: ${pc.cyan(archetype.metadata.name)} v${archetype.metadata.version}`);
    console.log(`  Output: ${pc.cyan(outputDir)}`);
    console.log(`  Files: ${pc.cyan(files.length.toString())}`);

    if (dryRun) {
      console.log('\n' + pc.yellow('Dry run mode - no files were written'));
    }

    console.log('\n' + pc.bold('Files generated:'));
    files.slice(0, 10).forEach(file => {
      const relativePath = relative(outputDir, file);
      console.log(`  ${pc.dim('•')} ${relativePath}`);
    });

    if (files.length > 10) {
      console.log(`  ${pc.dim(`... and ${files.length - 10} more`)}`);
    }

    console.log('\n' + pc.bold('Next steps:'));
    console.log(`  1. cd ${outputDir}`);
    console.log('  2. npm install');
    console.log('  3. npm run build');
    console.log('');
  }

  /**
   * Validate variables against archetype requirements
   */
  validateVariables(
    archetype: Archetype,
    variables: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const varDef of archetype.metadata.variables) {
      const value = variables[varDef.name];

      // Check required
      if (varDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required variable missing: ${varDef.name}`);
        continue;
      }

      // Skip further validation if not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Validate type
      const actualType = typeof value;
      const expectedType = varDef.type === 'choice' || varDef.type === 'multi-choice'
        ? 'string'
        : varDef.type;

      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`Invalid type for ${varDef.name}: expected string, got ${actualType}`);
      } else if (expectedType === 'number' && actualType !== 'number') {
        errors.push(`Invalid type for ${varDef.name}: expected number, got ${actualType}`);
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push(`Invalid type for ${varDef.name}: expected boolean, got ${actualType}`);
      }

      // Validate pattern
      if (varDef.validation && typeof value === 'string') {
        const regex = new RegExp(varDef.validation);
        if (!regex.test(value)) {
          errors.push(`Invalid format for ${varDef.name}: must match ${varDef.validation}`);
        }
      }

      // Validate choices
      if (varDef.type === 'choice' && varDef.choices) {
        if (!varDef.choices.includes(value as string)) {
          errors.push(
            `Invalid choice for ${varDef.name}: must be one of ${varDef.choices.join(', ')}`
          );
        }
      }

      if (varDef.type === 'multi-choice' && varDef.choices && Array.isArray(value)) {
        const invalid = value.filter(v => !varDef.choices!.includes(v));
        if (invalid.length > 0) {
          errors.push(
            `Invalid choices for ${varDef.name}: ${invalid.join(', ')} not in ${varDef.choices.join(', ')}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Create a scaffolder with default configuration
 */
export function createScaffolder(registry: ArchetypeRegistry): Scaffolder {
  return new Scaffolder(registry);
}
