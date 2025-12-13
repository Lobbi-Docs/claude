#!/usr/bin/env node

/**
 * CLI - Command-line interface for Agent Playground
 *
 * Commands:
 * - playground start --port 8765
 * - playground stop
 * - playground status
 */

import { cac } from 'cac';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PlaygroundServer } from './server.js';

const cli = cac('playground');

// PID file location
const PID_FILE = join(process.cwd(), '.playground', 'server.pid');

/**
 * Start command
 */
cli
  .command('start', 'Start the playground server')
  .option('--port <port>', 'Server port', { default: 8765 })
  .option('--host <host>', 'Server host', { default: '0.0.0.0' })
  .option('--max-connections <n>', 'Maximum concurrent connections', { default: 100 })
  .option('--heartbeat-interval <ms>', 'Heartbeat interval in ms', { default: 30000 })
  .option('--no-cors', 'Disable CORS')
  .option('-d, --daemon', 'Run as daemon')
  .action(async (options) => {
    try {
      // Check if server is already running
      if (isServerRunning()) {
        console.log(chalk.yellow('⚠ Server is already running'));
        console.log(chalk.gray('  Use "playground stop" to stop it first'));
        process.exit(1);
      }

      console.log(chalk.blue('🚀 Starting Agent Playground Server...'));
      console.log(chalk.gray(`   Port: ${options.port}`));
      console.log(chalk.gray(`   Host: ${options.host}`));
      console.log(chalk.gray(`   Max Connections: ${options.maxConnections}`));
      console.log();

      const server = new PlaygroundServer({
        port: options.port,
        host: options.host,
        maxConnections: options.maxConnections,
        heartbeatInterval: options.heartbeatInterval,
        enableCors: options.cors !== false
      });

      await server.start();

      // Save PID
      savePid(process.pid);

      console.log(chalk.green('✓ Server started successfully'));
      console.log();
      console.log(chalk.bold('  WebSocket endpoint:'));
      console.log(chalk.cyan(`  ws://${options.host}:${options.port}/ws`));
      console.log();
      console.log(chalk.bold('  HTTP endpoints:'));
      console.log(chalk.cyan(`  http://${options.host}:${options.port}/health`));
      console.log(chalk.cyan(`  http://${options.host}:${options.port}/status`));
      console.log();

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log();
        console.log(chalk.yellow('Shutting down...'));
        await server.stop();
        deletePid();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // If not daemon mode, keep process alive
      if (!options.daemon) {
        process.stdin.resume();
      }

    } catch (error) {
      console.error(chalk.red('✗ Failed to start server:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Stop command
 */
cli
  .command('stop', 'Stop the playground server')
  .action(async () => {
    try {
      if (!isServerRunning()) {
        console.log(chalk.yellow('⚠ Server is not running'));
        process.exit(0);
      }

      const pid = getPid();
      if (!pid) {
        console.log(chalk.yellow('⚠ Could not find server process'));
        deletePid();
        process.exit(1);
      }

      console.log(chalk.blue('Stopping server...'));

      try {
        process.kill(pid, 'SIGTERM');
        console.log(chalk.green('✓ Server stopped'));
      } catch (error) {
        console.log(chalk.yellow('⚠ Server process not found, cleaning up PID file'));
      }

      deletePid();

    } catch (error) {
      console.error(chalk.red('✗ Failed to stop server:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Status command
 */
cli
  .command('status', 'Check server status')
  .option('--port <port>', 'Server port', { default: 8765 })
  .option('--host <host>', 'Server host', { default: 'localhost' })
  .action(async (options) => {
    try {
      const isRunning = isServerRunning();
      const pid = getPid();

      console.log(chalk.bold('Agent Playground Server Status'));
      console.log();

      if (isRunning && pid) {
        console.log(chalk.green('✓ Running'));
        console.log(chalk.gray(`  PID: ${pid}`));
        console.log();

        // Try to fetch status from server
        try {
          const response = await fetch(`http://${options.host}:${options.port}/status`);
          if (response.ok) {
            const status: any = await response.json();
            console.log(chalk.bold('Server Statistics:'));
            console.log(chalk.gray(`  Connections: ${status.connections}`));
            console.log(chalk.gray(`  Active Sessions: ${status.sessions.active}`));
            console.log(chalk.gray(`  Total Sessions: ${status.sessions.total}`));
            console.log(chalk.gray(`  Registered Agents: ${status.executions.registeredAgents}`));
            console.log(chalk.gray(`  Total Recordings: ${status.recordings.totalRecordings}`));
            console.log();
          }
        } catch (error) {
          console.log(chalk.yellow('⚠ Could not fetch detailed status'));
        }

      } else {
        console.log(chalk.red('✗ Not running'));
        console.log();
      }

      console.log(chalk.bold('Endpoints:'));
      console.log(chalk.gray(`  WebSocket: ws://${options.host}:${options.port}/ws`));
      console.log(chalk.gray(`  Health: http://${options.host}:${options.port}/health`));
      console.log(chalk.gray(`  Status: http://${options.host}:${options.port}/status`));

    } catch (error) {
      console.error(chalk.red('✗ Failed to check status:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Logs command
 */
cli
  .command('logs', 'Show server logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <n>', 'Number of lines to show', { default: 50 })
  .action((options) => {
    const logFile = join(process.cwd(), '.playground', 'server.log');

    if (!existsSync(logFile)) {
      console.log(chalk.yellow('⚠ No log file found'));
      process.exit(0);
    }

    if (options.follow) {
      console.log(chalk.yellow('⚠ Follow mode not yet implemented'));
      console.log(chalk.gray('  Showing last ' + options.lines + ' lines instead'));
    }

    try {
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').slice(-options.lines);
      console.log(lines.join('\n'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to read logs:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Version command
 */
cli
  .command('version', 'Show version information')
  .action(() => {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf-8')
    );

    console.log(chalk.bold('Agent Playground'));
    console.log(chalk.gray(`Version: ${packageJson.version}`));
    console.log(chalk.gray(`Node: ${process.version}`));
  });

// Default help
cli.help();
cli.version('1.0.0');

// Parse CLI arguments
cli.parse();

// ===== Helper Functions =====

/**
 * Check if server is running
 */
function isServerRunning(): boolean {
  const pid = getPid();
  if (!pid) return false;

  try {
    // Check if process exists (signal 0 doesn't kill, just checks)
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get PID from file
 */
function getPid(): number | null {
  if (!existsSync(PID_FILE)) return null;

  try {
    const content = readFileSync(PID_FILE, 'utf-8');
    return parseInt(content.trim(), 10);
  } catch {
    return null;
  }
}

/**
 * Save PID to file
 */
function savePid(pid: number): void {
  const dir = join(process.cwd(), '.playground');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(PID_FILE, pid.toString(), 'utf-8');
}

/**
 * Delete PID file
 */
function deletePid(): void {
  if (existsSync(PID_FILE)) {
    const { unlinkSync } = require('fs');
    unlinkSync(PID_FILE);
  }
}
