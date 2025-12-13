#!/usr/bin/env node
/**
 * Claude Code Validator CLI
 *
 * Command-line interface for validating plugin manifests and resources
 */

import { PluginValidator } from './validator';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface CliOptions {
  file?: string;
  directory?: string;
  type?: string;
  recursive?: boolean;
  verbose?: boolean;
  json?: boolean;
  exitOnError?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    recursive: true,
    verbose: false,
    json: false,
    exitOnError: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-f':
      case '--file':
        options.file = args[++i];
        break;
      case '-d':
      case '--directory':
        options.directory = args[++i];
        break;
      case '-t':
      case '--type':
        options.type = args[++i];
        break;
      case '--no-recursive':
        options.recursive = false;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--no-exit-on-error':
        options.exitOnError = false;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Claude Code Validator CLI

Usage:
  validate [options]

Options:
  -f, --file <path>          Validate a single file
  -d, --directory <path>     Validate all files in directory
  -t, --type <type>          Specify validation type (plugin, agent, skill, command, workflow, registry)
  --no-recursive             Don't recurse into subdirectories
  -v, --verbose              Show detailed validation information
  --json                     Output results as JSON
  --no-exit-on-error         Don't exit with error code on validation failure
  -h, --help                 Show this help message

Examples:
  # Validate a plugin manifest
  validate --file plugin.json --type plugin

  # Validate all files in a directory
  validate --directory .claude/agents

  # Validate with verbose output
  validate --file agent.md --verbose

  # Output results as JSON
  validate --directory .claude --json
  `);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.file && !options.directory) {
    console.error('Error: Must specify either --file or --directory');
    printHelp();
    process.exit(1);
  }

  const validator = new PluginValidator({
    verbose: options.verbose,
  });

  try {
    if (options.file) {
      // Validate single file
      const filePath = resolve(options.file);
      const result = validator.validateFile(filePath);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(validator.formatResult(result));
      }

      if (!result.valid && options.exitOnError) {
        process.exit(1);
      }
    } else if (options.directory) {
      // Validate directory
      const dirPath = resolve(options.directory);
      const result = validator.validateDirectory(dirPath, {
        recursive: options.recursive,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(validator.formatBatchResult(result));
      }

      if (result.invalidFiles > 0 && options.exitOnError) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Validation error:', (error as Error).message);
    if (options.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

// Run CLI
main();
