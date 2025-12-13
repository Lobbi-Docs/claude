#!/usr/bin/env node

/**
 * Claude Code Plugin CLI
 * Main entry point for plugin development commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { PluginScaffolder } from './scaffolder';
import { PluginValidator } from './validator';
import { PluginBundler } from './bundler';
import { PluginLinter } from './linter';
import { PluginDoctor } from './doctor';
import { ScaffoldOptions, BundleOptions, PublishOptions } from './types';
import * as path from 'path';
import * as fs from 'fs-extra';

const program = new Command();

// CLI Header
function showHeader() {
  console.log(
    boxen(
      chalk.bold.cyan('Claude Code Plugin CLI') +
      '\n' +
      chalk.gray('Streamline plugin development with scaffolding, validation, and bundling'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    )
  );
}

// CLI Configuration
program
  .name('claude-plugin')
  .description('CLI tool for Claude Code plugin development')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .hook('preAction', () => {
    if (process.env.PLUGIN_CLI_QUIET !== 'true') {
      showHeader();
    }
  });

// Init Command
program
  .command('init [name]')
  .description('Scaffold a new plugin from template')
  .option('-t, --type <type>', 'Plugin type: agent-pack, skill-pack, workflow-pack, full', 'full')
  .option('-a, --author <author>', 'Plugin author name')
  .option('-d, --description <description>', 'Plugin description')
  .option('-l, --license <license>', 'License type', 'MIT')
  .option('--no-git', 'Skip git initialization')
  .option('--no-samples', 'Skip creating sample resources')
  .action(async (name: string | undefined, options: any) => {
    const scaffolder = new PluginScaffolder();

    try {
      const scaffoldOptions: ScaffoldOptions = {
        name: name || await scaffolder.promptForName(),
        type: options.type,
        author: options.author,
        description: options.description,
        license: options.license,
        initGit: options.git,
        samples: options.samples
      };

      await scaffolder.scaffold(scaffoldOptions);

      console.log(chalk.green('\n✓ Plugin scaffolded successfully!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.white(`  cd ${scaffoldOptions.name}`));
      console.log(chalk.white(`  claude-plugin validate .`));
      console.log(chalk.white(`  claude-plugin lint .`));
    } catch (error) {
      console.error(chalk.red('\n✗ Scaffolding failed:'), error);
      process.exit(1);
    }
  });

// Validate Command
program
  .command('validate [path]')
  .description('Validate plugin structure and manifests')
  .option('--strict', 'Enable strict validation mode')
  .option('--json', 'Output results as JSON')
  .action(async (pluginPath: string = '.', options: any) => {
    const validator = new PluginValidator();

    try {
      const absolutePath = path.resolve(pluginPath);

      if (!await fs.pathExists(absolutePath)) {
        throw new Error(`Plugin path does not exist: ${absolutePath}`);
      }

      const result = await validator.validate(absolutePath, { strict: options.strict });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        validator.printResults(result);
      }

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('\n✗ Validation failed:'), error);
      process.exit(1);
    }
  });

// Test Command
program
  .command('test [path]')
  .description('Run plugin test suite')
  .option('--coverage', 'Generate coverage report')
  .option('--watch', 'Watch mode for continuous testing')
  .action(async (pluginPath: string = '.', options: any) => {
    console.log(chalk.yellow('Test command not yet implemented'));
    console.log(chalk.gray('This will integrate with plugin-specific test frameworks'));
  });

// Build Command
program
  .command('build [path]')
  .description('Bundle plugin for distribution')
  .option('-o, --output <path>', 'Output directory for bundle')
  .option('--minify', 'Minify JSON manifests')
  .option('--source-maps', 'Generate source maps')
  .option('--tree-shake', 'Remove unused resources')
  .action(async (pluginPath: string = '.', options: any) => {
    const bundler = new PluginBundler();

    try {
      const absolutePath = path.resolve(pluginPath);

      const bundleOptions: BundleOptions = {
        output: options.output,
        minify: options.minify,
        sourceMaps: options.sourceMaps,
        treeShake: options.treeShake
      };

      const outputPath = await bundler.bundle(absolutePath, bundleOptions);

      console.log(chalk.green('\n✓ Plugin bundled successfully!'));
      console.log(chalk.gray('Output:'), chalk.white(outputPath));
    } catch (error) {
      console.error(chalk.red('\n✗ Bundling failed:'), error);
      process.exit(1);
    }
  });

// Publish Command
program
  .command('publish [path]')
  .description('Publish plugin to registry')
  .option('-r, --registry <url>', 'Registry URL')
  .option('-t, --tag <tag>', 'Version tag', 'latest')
  .option('--access <level>', 'Access level: public or private', 'public')
  .option('--dry-run', 'Simulate publish without uploading')
  .action(async (pluginPath: string = '.', options: any) => {
    console.log(chalk.yellow('Publish command not yet implemented'));
    console.log(chalk.gray('This will integrate with Claude Code plugin registry'));
  });

// Lint Command
program
  .command('lint [path]')
  .description('Lint plugin for best practices')
  .option('--fix', 'Automatically fix issues where possible')
  .option('--json', 'Output results as JSON')
  .option('--rules <rules>', 'Comma-separated list of rules to enable')
  .action(async (pluginPath: string = '.', options: any) => {
    const linter = new PluginLinter();

    try {
      const absolutePath = path.resolve(pluginPath);

      const results = await linter.lint(absolutePath, {
        fix: options.fix,
        rules: options.rules ? options.rules.split(',') : undefined
      });

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        linter.printResults(results);
      }

      const hasErrors = results.some(r => r.severity === 'error');
      if (hasErrors) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('\n✗ Linting failed:'), error);
      process.exit(1);
    }
  });

// Doctor Command
program
  .command('doctor [path]')
  .description('Diagnose common plugin issues')
  .option('--json', 'Output results as JSON')
  .action(async (pluginPath: string = '.', options: any) => {
    const doctor = new PluginDoctor();

    try {
      const absolutePath = path.resolve(pluginPath);

      const diagnosis = await doctor.diagnose(absolutePath);

      if (options.json) {
        console.log(JSON.stringify(diagnosis, null, 2));
      } else {
        doctor.printDiagnosis(diagnosis);
      }

      if (!diagnosis.healthy) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('\n✗ Diagnosis failed:'), error);
      process.exit(1);
    }
  });

// Info Command
program
  .command('info [path]')
  .description('Display plugin information')
  .action(async (pluginPath: string = '.') => {
    try {
      const absolutePath = path.resolve(pluginPath);
      const manifestPath = path.join(absolutePath, '.claude-plugin', 'plugin.json');

      if (!await fs.pathExists(manifestPath)) {
        throw new Error('No plugin.json found. Is this a Claude Code plugin?');
      }

      const manifest = await fs.readJSON(manifestPath);

      console.log(chalk.bold.cyan('\nPlugin Information:'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white('Name:        '), chalk.cyan(manifest.name));
      console.log(chalk.white('Version:     '), chalk.yellow(manifest.version));
      console.log(chalk.white('Description: '), manifest.description);
      console.log(chalk.white('Author:      '), manifest.author);
      console.log(chalk.white('License:     '), manifest.license);

      if (manifest.commands) {
        console.log(chalk.white('\nCommands:    '), chalk.cyan(Object.keys(manifest.commands).length));
      }
      if (manifest.agents) {
        console.log(chalk.white('Agents:      '), chalk.cyan(Object.keys(manifest.agents).length));
      }
      if (manifest.skills) {
        console.log(chalk.white('Skills:      '), chalk.cyan(Object.keys(manifest.skills).length));
      }
      if (manifest.hooks) {
        console.log(chalk.white('Hooks:       '), chalk.cyan(Object.keys(manifest.hooks).length));
      }

      console.log(chalk.gray('─'.repeat(60)));
    } catch (error) {
      console.error(chalk.red('\n✗ Failed to read plugin info:'), error);
      process.exit(1);
    }
  });

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('\n✗ Invalid command'));
  console.log(chalk.gray('Run'), chalk.white('claude-plugin --help'), chalk.gray('for available commands'));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
