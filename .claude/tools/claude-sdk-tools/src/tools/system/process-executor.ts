/**
 * @claude-sdk/tools - ProcessExecutorTool
 * Safe shell command execution with security controls
 */

import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { success, failure, withTimeout } from '../../utils/index.js';
import { SecurityError, TimeoutError, ConfigurationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

const execAsync = promisify(exec);

// ============================================================================
// Schema Definitions
// ============================================================================

export const ProcessExecutorSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeout: z.number().min(0).max(300000).optional(), // Max 5 minutes
  env: z.record(z.string()).optional(),
  stdin: z.string().optional(),
  allowDangerous: z.boolean().optional().default(false),
});

export type ProcessExecutorInput = z.infer<typeof ProcessExecutorSchema>;

export interface ProcessExecutorOutput {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  timedOut: boolean;
}

// ============================================================================
// Security Configuration
// ============================================================================

/**
 * Command allowlist for security
 * Only these commands are allowed unless allowDangerous is true
 */
const ALLOWED_COMMANDS = new Set([
  // File operations (read-only)
  'ls', 'dir', 'cat', 'type', 'head', 'tail', 'find', 'grep',
  // Git operations
  'git',
  // Node/npm operations
  'node', 'npm', 'npx', 'yarn', 'pnpm',
  // Docker operations (read-only)
  'docker', 'docker-compose',
  // Kubernetes operations (read-only)
  'kubectl', 'helm',
  // System info
  'echo', 'pwd', 'whoami', 'hostname', 'date', 'env',
  // Testing
  'jest', 'mocha', 'vitest', 'playwright',
]);

/**
 * Dangerous commands that are never allowed
 */
const DANGEROUS_COMMANDS = new Set([
  'rm', 'del', 'rmdir', 'rd', 'deltree',
  'format', 'mkfs',
  'dd',
  'kill', 'killall', 'pkill',
  'shutdown', 'reboot', 'halt', 'poweroff',
  'sudo', 'su',
  'chmod', 'chown',
  '>', '>>', '|', '&', '&&', '||', ';',
]);

// ============================================================================
// ProcessExecutorTool Implementation
// ============================================================================

export class ProcessExecutorTool {
  /**
   * Execute shell command with security controls
   */
  static async execute(
    input: ProcessExecutorInput,
    context: ToolContext
  ): Promise<ToolResult<ProcessExecutorOutput>> {
    const startTime = Date.now();

    try {
      context.logger?.debug('ProcessExecutor: Starting command', { command: input.command });

      // Security validation
      this.validateCommand(input.command, input.allowDangerous);

      // Build full command
      const fullCommand = input.args
        ? `${input.command} ${input.args.join(' ')}`
        : input.command;

      // Execute with timeout
      const timeout = input.timeout ?? 30000; // Default 30s
      const result = await withTimeout(
        'process-execution',
        () => this.executeCommand(fullCommand, input),
        timeout
      );

      const executionTime = Date.now() - startTime;

      context.logger?.debug('ProcessExecutor: Command completed', {
        exitCode: result.exitCode,
        executionTime,
      });

      return success({
        command: fullCommand,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime,
        timedOut: false,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof TimeoutError) {
        context.logger?.warn('ProcessExecutor: Command timed out', { executionTime });
        return success({
          command: input.command,
          exitCode: -1,
          stdout: '',
          stderr: 'Command execution timed out',
          executionTime,
          timedOut: true,
        });
      }

      context.logger?.error('ProcessExecutor: Command failed', error);
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate command against security policies
   */
  private static validateCommand(command: string, allowDangerous: boolean = false): void {
    const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();

    // Check for dangerous commands
    for (const dangerous of Array.from(DANGEROUS_COMMANDS)) {
      if (command.includes(dangerous)) {
        throw new SecurityError(
          `Dangerous command detected: ${dangerous}`,
          'FORBIDDEN',
          { command, dangerous }
        );
      }
    }

    // Check allowlist unless dangerous commands are explicitly allowed
    if (!allowDangerous && !ALLOWED_COMMANDS.has(baseCommand)) {
      throw new SecurityError(
        `Command not in allowlist: ${baseCommand}. Set allowDangerous=true to bypass.`,
        'FORBIDDEN',
        { command, baseCommand, allowlist: Array.from(ALLOWED_COMMANDS) }
      );
    }

    // Additional validation
    if (command.length > 10000) {
      throw new ConfigurationError(
        'Command exceeds maximum length of 10000 characters',
        'command',
        command.length
      );
    }
  }

  /**
   * Execute command using child_process
   */
  private static async executeCommand(
    command: string,
    input: ProcessExecutorInput
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const options: { cwd?: string; env?: Record<string, string>; maxBuffer?: number } = {
        maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
      };

      if (input.cwd) {
        options.cwd = input.cwd;
      }

      if (input.env) {
        options.env = { ...process.env, ...input.env } as Record<string, string>;
      }

      const { stdout, stderr } = await execAsync(command, options);

      return {
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      };
    } catch (error: any) {
      // exec throws on non-zero exit codes
      return {
        exitCode: error.code ?? 1,
        stdout: error.stdout?.toString() ?? '',
        stderr: error.stderr?.toString() ?? error.message,
      };
    }
  }

  /**
   * Get list of allowed commands
   */
  static getAllowedCommands(): string[] {
    return Array.from(ALLOWED_COMMANDS).sort();
  }

  /**
   * Check if command is allowed
   */
  static isCommandAllowed(command: string): boolean {
    const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();
    return ALLOWED_COMMANDS.has(baseCommand);
  }

  /**
   * Add command to allowlist (use with caution)
   */
  static addAllowedCommand(command: string): void {
    ALLOWED_COMMANDS.add(command.toLowerCase());
  }
}
