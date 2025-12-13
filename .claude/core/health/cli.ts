#!/usr/bin/env node
/**
 * Health Check CLI
 *
 * Command-line interface for health check system
 */

import { HealthAPI } from './health-api.js';
import { HealthStatus } from './types.js';

interface CLIOptions {
  verbose: boolean;
  fix: boolean;
  json: boolean;
  list: boolean;
  metrics: boolean;
  component: string | null;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    verbose: false,
    fix: false,
    json: false,
    list: false,
    metrics: false,
    component: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--fix':
      case '-f':
        options.fix = true;
        break;

      case '--json':
      case '-j':
        options.json = true;
        break;

      case '--list':
      case '-l':
        options.list = true;
        break;

      case '--metrics':
      case '-m':
        options.metrics = true;
        break;

      case '--component':
      case '-c':
        if (i + 1 < args.length) {
          options.component = args[i + 1];
          i++;
        }
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Health Check CLI - Claude Orchestration System

Usage:
  health [options]

Options:
  -v, --verbose           Show detailed health information
  -f, --fix               Automatically fix auto-fixable issues
  -j, --json              Output in JSON format
  -l, --list              List all available health checks
  -m, --metrics           Show health metrics
  -c, --component <name>  Check specific component
  -h, --help              Show this help message

Components:
  registry                Registry index files
  mcp-servers             MCP server configuration
  hooks                   Hook scripts
  agents                  Agent files
  database                Database connectivity

Examples:
  health                  Quick health check
  health --verbose        Detailed health report
  health --fix            Run checks and auto-fix issues
  health --component registry
  health --json
  health --list
  health --metrics
`);
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    const api = new HealthAPI({ enableAutoFix: options.fix });

    // List checks
    if (options.list) {
      const checks = api.listChecks();
      console.log('\nAvailable Health Checks:\n');
      for (const check of checks.checks) {
        console.log(`  ${check.name}`);
        console.log(`    Description: ${check.description}`);
        console.log(`    Priority: ${check.priority}`);
        if (check.dependencies && check.dependencies.length > 0) {
          console.log(`    Dependencies: ${check.dependencies.join(', ')}`);
        }
        console.log();
      }
      process.exit(0);
    }

    // Show metrics
    if (options.metrics) {
      const metrics = api.getMetrics();
      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log('\nHealth Metrics:\n');
        console.log(`  Uptime: ${Math.floor(metrics.uptime / 1000)}s`);
        console.log(`  Last Check: ${metrics.lastHealthCheck.toISOString()}`);
        console.log(`  Total Checks: ${metrics.totalChecks}`);
        console.log(`  Failed Checks: ${metrics.failedChecks}`);
        console.log(`  Avg Duration: ${metrics.averageCheckDuration.toFixed(2)}ms`);
        console.log();

        if (metrics.componentStatuses.length > 0) {
          console.log('  Component Statuses:');
          for (const component of metrics.componentStatuses) {
            console.log(`    ${component.name}: ${component.status} - ${component.message}`);
          }
        }
      }
      process.exit(0);
    }

    // Check specific component
    if (options.component) {
      const result = await api.getComponentHealth(options.component);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\nComponent: ${result.component}`);
        console.log(`Status: ${result.status}`);
        console.log(`Message: ${result.message}`);
        console.log(`Duration: ${result.duration}ms\n`);

        if (result.issues && result.issues.length > 0) {
          console.log(`Issues (${result.issues.length}):`);
          for (const issue of result.issues) {
            console.log(`  [${issue.severity}] ${issue.message}`);
            if (issue.remediation) {
              console.log(`    Remediation: ${issue.remediation}`);
            }
          }
          console.log();
        }

        if (options.verbose && result.details) {
          console.log('Details:');
          console.log(JSON.stringify(result.details, null, 2));
        }
      }

      const exitCode = result.status === HealthStatus.HEALTHY ? 0 :
                       result.status === HealthStatus.DEGRADED ? 1 : 2;
      process.exit(exitCode);
    }

    // Run all health checks
    const health = await api.getHealth(options.verbose);

    if (options.json) {
      console.log(JSON.stringify(health, null, 2));
    } else {
      const text = await api.formatHealthText(options.verbose);
      console.log(text);
    }

    // Auto-fix if requested
    const fullHealth = options.verbose ? health : await api.getHealth(true);
    if (options.fix && 'issues' in fullHealth && fullHealth.issues && fullHealth.issues.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('Attempting to fix auto-fixable issues...');
      console.log('='.repeat(60) + '\n');

      const fixes = await api.fixIssues(true);

      console.log(`\nFix Results:`);
      console.log(`  Total Attempts: ${fixes.total}`);
      console.log(`  Successful: ${fixes.successful}`);
      console.log(`  Failed: ${fixes.failed}\n`);

      if (options.verbose) {
        for (const fix of fixes.results) {
          console.log(`  ${fix.success ? '✅' : '❌'} ${fix.message}`);
          if (fix.details) {
            console.log(`     ${JSON.stringify(fix.details)}`);
          }
        }
      }

      // Re-run health check to show improvements
      if (fixes.successful > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('Re-running health checks...');
        console.log('='.repeat(60) + '\n');

        const updatedHealth = await api.getHealth(false);
        const updatedText = await api.formatHealthText(false);
        console.log(updatedText);
      }
    }

    // Determine exit code
    const exitCode = health.status === HealthStatus.HEALTHY ? 0 :
                     health.status === HealthStatus.DEGRADED ? 1 :
                     health.status === HealthStatus.UNHEALTHY ? 2 : 3;

    process.exit(exitCode);

  } catch (error) {
    console.error('\nHealth check failed:');
    console.error((error as Error).message);

    if (options.verbose) {
      console.error('\nStack trace:');
      console.error((error as Error).stack);
    }

    process.exit(3);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, parseArgs, showHelp };
