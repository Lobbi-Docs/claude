#!/usr/bin/env node

/**
 * Archetype CLI - Command-line interface for archetype management
 *
 * Commands:
 * - list: List available archetypes
 * - info <name>: Show archetype details
 * - create <name>: Create plugin from archetype
 * - validate <path>: Validate an archetype
 * - publish <path>: Publish new archetype
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { createDefaultRegistry } from './archetype-registry.js';
import { createScaffolder } from './scaffolder.js';
import { createValidator } from './validator.js';
import type { ScaffoldOptions } from './types.js';

const program = new Command();

// Read package.json for version
const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

program
  .name('archetype')
  .description('Plugin archetype system for creating standardized plugin templates')
  .version(packageJson.version);

/**
 * List command - Show all available archetypes
 */
program
  .command('list')
  .description('List all available archetypes')
  .option('-c, --category <category>', 'Filter by category')
  .option('-k, --keyword <keyword>', 'Filter by keyword')
  .option('-s, --sort <field>', 'Sort by field (name, category, version)', 'name')
  .action(async (options) => {
    try {
      const registry = createDefaultRegistry();
      await registry.load();

      const archetypes = await registry.search({
        category: options.category,
        keyword: options.keyword,
        sort: options.sort
      });

      if (archetypes.length === 0) {
        console.log(pc.yellow('No archetypes found'));
        return;
      }

      console.log(pc.bold(`\nAvailable Archetypes (${archetypes.length})\n`));

      // Group by category
      const byCategory = archetypes.reduce((acc, arch) => {
        const cat = arch.metadata.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(arch);
        return acc;
      }, {} as Record<string, typeof archetypes>);

      for (const [category, archs] of Object.entries(byCategory)) {
        console.log(pc.bold(pc.cyan(`${category}:`)));
        for (const arch of archs) {
          console.log(`  ${pc.green('•')} ${pc.bold(arch.metadata.name)} ${pc.dim(`v${arch.metadata.version}`)}`);
          console.log(`    ${pc.dim(arch.metadata.description)}`);
        }
        console.log('');
      }

      // Show stats
      const stats = await registry.getStats();
      console.log(pc.dim(`Total: ${stats.total} | With dependencies: ${stats.withDependencies} | With hooks: ${stats.withHooks}`));
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Info command - Show detailed archetype information
 */
program
  .command('info <name>')
  .description('Show detailed information about an archetype')
  .action(async (name) => {
    try {
      const registry = createDefaultRegistry();
      await registry.load();

      const archetype = await registry.get(name);
      if (!archetype) {
        console.error(pc.red(`Archetype not found: ${name}`));
        process.exit(1);
      }

      const meta = archetype.metadata;

      console.log(pc.bold(`\n${meta.name}`));
      console.log(pc.dim('─'.repeat(50)));
      console.log(`${pc.bold('Version:')} ${meta.version}`);
      console.log(`${pc.bold('Category:')} ${meta.category}`);
      console.log(`${pc.bold('Description:')} ${meta.description}`);

      if (meta.author) {
        console.log(`${pc.bold('Author:')} ${meta.author}`);
      }

      if (meta.license) {
        console.log(`${pc.bold('License:')} ${meta.license}`);
      }

      if (meta.keywords && meta.keywords.length > 0) {
        console.log(`${pc.bold('Keywords:')} ${meta.keywords.join(', ')}`);
      }

      if (meta.dependencies && meta.dependencies.length > 0) {
        console.log(`\n${pc.bold('Dependencies:')}`);
        for (const dep of meta.dependencies) {
          console.log(`  ${pc.green('•')} ${dep}`);
        }
      }

      console.log(`\n${pc.bold('Variables:')} (${meta.variables.length})`);
      for (const variable of meta.variables) {
        const required = variable.required ? pc.red('*') : ' ';
        console.log(`  ${required} ${pc.cyan(variable.name)} ${pc.dim(`(${variable.type})`)}`);
        console.log(`    ${variable.description || variable.prompt}`);
        if (variable.default !== undefined) {
          console.log(`    ${pc.dim(`Default: ${variable.default}`)}`);
        }
      }

      console.log(`\n${pc.bold('Templates:')} (${archetype.templates.length})`);
      archetype.templates.slice(0, 10).forEach(t => {
        console.log(`  ${pc.dim('•')} ${t}`);
      });
      if (archetype.templates.length > 10) {
        console.log(`  ${pc.dim(`... and ${archetype.templates.length - 10} more`)}`);
      }

      if (archetype.hooks) {
        console.log(`\n${pc.bold('Hooks:')}`);
        if (archetype.hooks.preGenerate) {
          console.log(`  ${pc.green('✓')} Pre-generate hook`);
        }
        if (archetype.hooks.postGenerate) {
          console.log(`  ${pc.green('✓')} Post-generate hook`);
        }
      }

      if (meta.homepage) {
        console.log(`\n${pc.bold('Homepage:')} ${pc.cyan(meta.homepage)}`);
      }

      if (meta.repository) {
        console.log(`${pc.bold('Repository:')} ${pc.cyan(meta.repository)}`);
      }

      if (archetype.readme) {
        console.log(`\n${pc.bold('README:')}`);
        console.log(pc.dim('─'.repeat(50)));
        const preview = archetype.readme.split('\n').slice(0, 10).join('\n');
        console.log(preview);
        if (archetype.readme.split('\n').length > 10) {
          console.log(pc.dim('... (truncated)'));
        }
      }

      console.log('');
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Create command - Create a plugin from archetype
 */
program
  .command('create <name>')
  .description('Create a new plugin from an archetype')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-v, --variable <key=value>', 'Set variable value (can be used multiple times)', collect, {})
  .option('--non-interactive', 'Skip interactive prompts')
  .option('--force', 'Overwrite existing files')
  .option('--dry-run', 'Preview without writing files')
  .option('--verbose', 'Verbose output')
  .action(async (name, options) => {
    try {
      const registry = createDefaultRegistry();
      await registry.load();

      const archetype = await registry.get(name);
      if (!archetype) {
        console.error(pc.red(`Archetype not found: ${name}`));
        console.log(pc.dim('\nAvailable archetypes:'));
        const all = await registry.getAll();
        all.forEach(a => console.log(`  ${pc.cyan(a.metadata.name)}`));
        process.exit(1);
      }

      const scaffolder = createScaffolder(registry);

      const scaffoldOptions: ScaffoldOptions = {
        archetype: name,
        outputDir: resolve(options.output),
        variables: options.variable,
        nonInteractive: options.nonInteractive,
        force: options.force,
        dryRun: options.dryRun,
        verbose: options.verbose
      };

      await scaffolder.scaffold(scaffoldOptions);
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Validate command - Validate an archetype
 */
program
  .command('validate <path>')
  .description('Validate an archetype structure')
  .option('--warnings', 'Show warnings as errors')
  .action(async (path, options) => {
    try {
      const archetypePath = resolve(path);
      const validator = createValidator();

      console.log(pc.bold(`Validating archetype at: ${pc.cyan(archetypePath)}\n`));

      const result = await validator.validate(archetypePath);

      // Display errors
      if (result.errors.length > 0) {
        console.log(pc.bold(pc.red(`\n✖ Errors (${result.errors.length}):\n`)));
        for (const error of result.errors) {
          console.log(`  ${pc.red('✖')} ${error.message}`);
          if (error.file) {
            console.log(`    ${pc.dim('File:')} ${error.file}`);
          }
          if (error.fix) {
            console.log(`    ${pc.dim('Fix:')} ${error.fix}`);
          }
          console.log('');
        }
      }

      // Display warnings
      if (result.warnings.length > 0) {
        console.log(pc.bold(pc.yellow(`\n⚠ Warnings (${result.warnings.length}):\n`)));
        for (const warning of result.warnings) {
          console.log(`  ${pc.yellow('⚠')} ${warning.message}`);
          if (warning.file) {
            console.log(`    ${pc.dim('File:')} ${warning.file}`);
          }
          if (warning.fix) {
            console.log(`    ${pc.dim('Fix:')} ${warning.fix}`);
          }
          console.log('');
        }
      }

      // Summary
      if (result.valid) {
        console.log(pc.bold(pc.green('✓ Validation passed!')));
      } else {
        console.log(pc.bold(pc.red('✖ Validation failed')));
      }

      const warningsAreErrors = options.warnings && result.warnings.length > 0;
      if (!result.valid || warningsAreErrors) {
        process.exit(1);
      }
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Publish command - Publish an archetype
 */
program
  .command('publish <path>')
  .description('Publish an archetype to the registry')
  .option('--registry <url>', 'Registry URL')
  .option('--dry-run', 'Preview without publishing')
  .action(async (path) => {
    try {
      const archetypePath = resolve(path);

      // First validate
      const validator = createValidator();
      const result = await validator.validate(archetypePath);

      if (!result.valid) {
        console.error(pc.red('Cannot publish invalid archetype. Run validate first.'));
        process.exit(1);
      }

      console.log(pc.yellow('Publishing functionality coming soon...'));
      console.log(pc.dim('For now, manually copy your archetype to .claude/tools/archetypes/archetypes/'));
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Helper function to collect multiple option values
function collect(value: string, previous: Record<string, unknown>): Record<string, unknown> {
  const [key, val] = value.split('=');
  if (!key || !val) {
    throw new Error(`Invalid variable format: ${value}. Use key=value`);
  }
  previous[key] = val;
  return previous;
}

// Parse arguments
program.parse();
