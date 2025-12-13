#!/usr/bin/env node

/**
 * MCP Generator CLI
 * Command-line interface for generating MCP servers from API specifications
 */

import { Command } from 'commander';
import { parseOpenAPI } from './parsers/openapi-parser.js';
import { parseGraphQL } from './parsers/graphql-parser.js';
import { generateMCPServer } from './generators/mcp-generator.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

// Read package version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('mcp-generate')
  .description('Generate MCP servers from OpenAPI specs and GraphQL schemas')
  .version(packageJson.version);

/**
 * OpenAPI command
 */
program
  .command('openapi')
  .description('Generate MCP server from OpenAPI 3.0/3.1 specification')
  .argument('<spec-path>', 'Path to OpenAPI specification file (YAML or JSON)')
  .requiredOption('-o, --output <dir>', 'Output directory for generated server')
  .requiredOption('-n, --name <name>', 'Name for the generated server')
  .option('--no-types', 'Skip TypeScript type generation')
  .option('--no-validation', 'Skip input validation generation')
  .action(async (specPath: string, options) => {
    console.log('Parsing OpenAPI specification...');

    const parseResult = await parseOpenAPI(specPath);

    if (!parseResult.success || !parseResult.data) {
      console.error('Failed to parse OpenAPI specification:');
      parseResult.errors?.forEach((error) => {
        console.error(`  [${error.severity}] ${error.path}: ${error.message}`);
      });
      process.exit(1);
    }

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('Warnings during parsing:');
      parseResult.errors.forEach((error) => {
        if (error.severity === 'warning') {
          console.warn(`  [${error.severity}] ${error.path}: ${error.message}`);
        }
      });
    }

    const api = parseResult.data;
    console.log(`Found ${api.tools.length} tools to generate`);

    console.log('Generating MCP server...');

    const generateResult = await generateMCPServer(api, {
      serverName: options.name,
      outputDir: options.output,
      includeTypes: options.types,
      includeValidation: options.validation,
    });

    if (!generateResult.success) {
      console.error('Failed to generate MCP server:');
      console.error(`  ${generateResult.error}`);
      process.exit(1);
    }

    console.log(`\nSuccess! MCP server generated at: ${generateResult.outputPath}`);
    console.log('\nNext steps:');
    console.log(`  1. cd ${generateResult.outputPath}`);
    console.log('  2. npm install');
    console.log('  3. npm run build');
    console.log('  4. npm start');
  });

/**
 * GraphQL command
 */
program
  .command('graphql')
  .description('Generate MCP server from GraphQL SDL schema')
  .argument('<schema-path>', 'Path to GraphQL schema file')
  .requiredOption('-o, --output <dir>', 'Output directory for generated server')
  .requiredOption('-n, --name <name>', 'Name for the generated server')
  .option('--endpoint <url>', 'GraphQL endpoint URL')
  .option('--no-types', 'Skip TypeScript type generation')
  .option('--no-validation', 'Skip input validation generation')
  .action(async (schemaPath: string, options) => {
    console.log('Parsing GraphQL schema...');

    const parseResult = await parseGraphQL(schemaPath);

    if (!parseResult.success || !parseResult.data) {
      console.error('Failed to parse GraphQL schema:');
      parseResult.errors?.forEach((error) => {
        console.error(`  [${error.severity}] ${error.path}: ${error.message}`);
      });
      process.exit(1);
    }

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('Warnings during parsing:');
      parseResult.errors.forEach((error) => {
        if (error.severity === 'warning') {
          console.warn(`  [${error.severity}] ${error.path}: ${error.message}`);
        }
      });
    }

    const api = parseResult.data;

    // Add endpoint if provided
    if (options.endpoint) {
      api.baseUrl = options.endpoint;
    }

    console.log(`Found ${api.tools.length} tools to generate`);
    console.log(
      `  - Queries: ${api.tools.filter((t) => t.name.startsWith('query_')).length}`
    );
    console.log(
      `  - Mutations: ${api.tools.filter((t) => t.name.startsWith('mutation_')).length}`
    );
    console.log(
      `  - Subscriptions: ${api.tools.filter((t) => t.name.startsWith('subscription_')).length}`
    );

    console.log('Generating MCP server...');

    const generateResult = await generateMCPServer(api, {
      serverName: options.name,
      outputDir: options.output,
      includeTypes: options.types,
      includeValidation: options.validation,
    });

    if (!generateResult.success) {
      console.error('Failed to generate MCP server:');
      console.error(`  ${generateResult.error}`);
      process.exit(1);
    }

    console.log(`\nSuccess! MCP server generated at: ${generateResult.outputPath}`);
    console.log('\nNext steps:');
    console.log(`  1. cd ${generateResult.outputPath}`);
    console.log('  2. npm install');
    console.log('  3. npm run build');
    if (options.endpoint) {
      console.log(`  4. Set GRAPHQL_ENDPOINT=${options.endpoint}`);
      console.log('  5. npm start');
    } else {
      console.log('  4. Set GRAPHQL_ENDPOINT environment variable');
      console.log('  5. npm start');
    }
  });

/**
 * Validate command
 */
program
  .command('validate')
  .description('Validate an API specification without generating code')
  .argument('<spec-path>', 'Path to specification file')
  .option('-t, --type <type>', 'Specification type (openapi or graphql)', 'openapi')
  .action(async (specPath: string, options) => {
    console.log(`Validating ${options.type} specification...`);

    let parseResult;
    if (options.type === 'openapi') {
      parseResult = await parseOpenAPI(specPath);
    } else if (options.type === 'graphql') {
      parseResult = await parseGraphQL(specPath);
    } else {
      console.error(`Unknown specification type: ${options.type}`);
      process.exit(1);
    }

    if (!parseResult.success) {
      console.error('Validation failed:');
      parseResult.errors?.forEach((error) => {
        console.error(`  [${error.severity}] ${error.path}: ${error.message}`);
      });
      process.exit(1);
    }

    console.log('Validation successful!');

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('\nWarnings:');
      parseResult.errors.forEach((error) => {
        console.warn(`  [${error.severity}] ${error.path}: ${error.message}`);
      });
    }

    if (parseResult.data) {
      console.log('\nSummary:');
      console.log(`  Title: ${parseResult.data.metadata.title}`);
      console.log(`  Version: ${parseResult.data.metadata.version}`);
      console.log(`  Tools: ${parseResult.data.tools.length}`);
      if (parseResult.data.baseUrl) {
        console.log(`  Base URL: ${parseResult.data.baseUrl}`);
      }
      if (parseResult.data.authentication) {
        console.log(`  Authentication: ${parseResult.data.authentication.type}`);
      }
    }
  });

program.parse();
