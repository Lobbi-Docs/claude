/**
 * Hook Loader for Claude Code Plugin Hook System
 *
 * Loads, validates, and verifies hook configurations from hooks.json.
 * Ensures fail-fast behavior on invalid configurations.
 *
 * @module hook-loader
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { validateRegexPattern, safeRegexTest, RegexValidationError as SafeRegexValidationError } from './safe-regex';

// ============================================================================
// Zod Schema Definitions
// ============================================================================

/**
 * Hook definition schema with type-specific validation
 */
const HookDefinitionSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9-]*$/, 'Hook name must be kebab-case'),
  description: z.string()
    .min(10)
    .max(500),
  type: z.enum(['prompt', 'command']),
  matcher: z.string().optional(),
  timeout: z.number()
    .min(100)
    .max(300000),
  prompt: z.string().min(10).optional(),
  command: z.string().min(1).optional(),
}).refine(
  (data) => {
    // Validate prompt type hooks have prompt field
    if (data.type === 'prompt') {
      return data.prompt !== undefined && data.command === undefined;
    }
    // Validate command type hooks have command field
    if (data.type === 'command') {
      return data.command !== undefined && data.prompt === undefined;
    }
    return true;
  },
  {
    message: 'Hook must have either "prompt" (for type=prompt) or "command" (for type=command), not both',
  }
);

/**
 * Full hooks configuration schema
 */
const HooksConfigSchema = z.object({
  UserPromptSubmit: z.array(HookDefinitionSchema).optional(),
  PostToolUse: z.array(HookDefinitionSchema).optional(),
  PreToolUse: z.array(HookDefinitionSchema).optional(),
  Stop: z.array(HookDefinitionSchema).optional(),
  SessionStart: z.array(HookDefinitionSchema).optional(),
}).strict();

// ============================================================================
// TypeScript Types (exported from Zod schemas)
// ============================================================================

export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;

export type HookEventType = 'UserPromptSubmit' | 'PostToolUse' | 'PreToolUse' | 'Stop' | 'SessionStart';

// ============================================================================
// Error Types
// ============================================================================

export class HookValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'HookValidationError';
  }
}

export class HookScriptError extends Error {
  constructor(message: string, public scriptPath?: string, public details?: any) {
    super(message);
    this.name = 'HookScriptError';
  }
}

// ============================================================================
// Hook Loader Functions
// ============================================================================

/**
 * Load and parse hooks.json file
 *
 * @param hooksPath - Absolute path to hooks.json file
 * @returns Parsed hooks configuration (not yet validated)
 * @throws Error if file doesn't exist or JSON is malformed
 */
export function loadHooksFile(hooksPath: string): unknown {
  if (!fs.existsSync(hooksPath)) {
    throw new Error(`Hooks file not found: ${hooksPath}`);
  }

  try {
    const content = fs.readFileSync(hooksPath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    throw new Error(`Failed to parse hooks.json: ${error.message}`);
  }
}

/**
 * Validate hook configuration against Zod schema
 *
 * @param config - Parsed JSON configuration object
 * @returns Validated and typed hooks configuration
 * @throws HookValidationError if validation fails
 */
export function validateHookConfig(config: unknown): HooksConfig {
  try {
    return HooksConfigSchema.parse(config);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');

      throw new HookValidationError(
        `Hook configuration validation failed:\n${formattedErrors}`,
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Validate regex matcher patterns in hooks
 *
 * Enhanced with ReDoS (Regular Expression Denial of Service) protection:
 * - Validates pattern complexity and safety
 * - Rejects dangerous constructs (nested quantifiers, lookaheads)
 * - Enforces pattern length limits
 * - Prevents catastrophic backtracking
 *
 * @param config - Validated hooks configuration
 * @throws HookValidationError if any matcher pattern is invalid or unsafe
 */
export function validateMatcherPatterns(config: HooksConfig): void {
  const errors: string[] = [];

  for (const [eventType, hooks] of Object.entries(config)) {
    if (!hooks) continue;

    hooks.forEach((hook: HookDefinition, index: number) => {
      if (hook.matcher) {
        try {
          // Use safe regex validator to check for ReDoS vulnerabilities
          validateRegexPattern(hook.matcher);
        } catch (error: any) {
          if (error instanceof SafeRegexValidationError) {
            errors.push(
              `${eventType}[${index}] "${hook.name}": Unsafe regex pattern "${hook.matcher}" - ${error.reason || error.message}`
            );
          } else {
            errors.push(
              `${eventType}[${index}] "${hook.name}": Invalid regex pattern "${hook.matcher}" - ${error.message}`
            );
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    throw new HookValidationError(
      `Invalid matcher patterns found:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Validate that hook scripts exist and are accessible
 *
 * Windows-aware: checks file existence and basic accessibility
 * Does not check Unix execute permissions on Windows
 *
 * @param config - Validated hooks configuration
 * @param basePath - Base path for resolving relative script paths
 * @throws HookScriptError if any script is invalid
 */
export function validateScripts(config: HooksConfig, basePath: string): void {
  const errors: string[] = [];

  for (const [eventType, hooks] of Object.entries(config)) {
    if (!hooks) continue;

    hooks.forEach((hook: HookDefinition, index: number) => {
      if (hook.type === 'command' && hook.command) {
        const scriptPath = resolveScriptPath(hook.command, basePath);

        // Check file existence
        if (!fs.existsSync(scriptPath)) {
          errors.push(
            `${eventType}[${index}] "${hook.name}": Script not found at ${scriptPath}`
          );
          return;
        }

        // Check if it's a file (not directory)
        const stats = fs.statSync(scriptPath);
        if (!stats.isFile()) {
          errors.push(
            `${eventType}[${index}] "${hook.name}": Path is not a file: ${scriptPath}`
          );
          return;
        }

        // On Unix systems, check execute permissions
        if (process.platform !== 'win32') {
          try {
            fs.accessSync(scriptPath, fs.constants.X_OK);
          } catch (error) {
            errors.push(
              `${eventType}[${index}] "${hook.name}": Script not executable: ${scriptPath} (run: chmod +x)`
            );
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    throw new HookScriptError(
      `Hook script validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Validate that a resolved script path stays within the plugin directory
 *
 * Prevents path traversal attacks by ensuring resolved paths don't escape
 * the plugin root directory.
 *
 * @param scriptPath - Original script path from hook definition
 * @param resolvedPath - Resolved absolute path
 * @param pluginRoot - Plugin root directory
 * @throws HookValidationError if path escapes plugin root
 */
function validateScriptPath(scriptPath: string, resolvedPath: string, pluginRoot: string): void {
  // Reject paths containing traversal sequences before resolution
  if (scriptPath.includes('..') ||
      (process.platform === 'win32' && /^[a-zA-Z]:/.test(scriptPath)) ||
      (process.platform !== 'win32' && scriptPath.startsWith('/'))) {
    throw new HookValidationError(
      `Script path contains invalid characters or absolute path: ${scriptPath}`
    );
  }

  // Normalize both paths for comparison
  const normalizedRoot = path.resolve(pluginRoot);
  const normalizedPath = path.resolve(resolvedPath);

  // Ensure resolved path is within plugin root
  if (!normalizedPath.startsWith(normalizedRoot + path.sep) &&
      normalizedPath !== normalizedRoot) {
    throw new HookValidationError(
      `Script path escapes plugin root: ${scriptPath} (resolved to ${resolvedPath})`
    );
  }
}

/**
 * Resolve script path relative to base path
 *
 * Handles environment variable expansion (e.g., ${CLAUDE_PLUGIN_ROOT})
 * and validates path stays within plugin root to prevent traversal attacks.
 *
 * @param scriptPath - Script path from hook definition
 * @param basePath - Base path for relative resolution
 * @returns Absolute script path
 * @throws HookValidationError if path escapes plugin root
 */
export function resolveScriptPath(scriptPath: string, basePath: string): string {
  // Replace environment variables
  let resolved = scriptPath.replace(/\$\{(\w+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });

  // Resolve to absolute path
  const absolutePath = path.isAbsolute(resolved)
    ? resolved
    : path.resolve(basePath, resolved);

  // Validate path doesn't escape plugin root
  validateScriptPath(scriptPath, absolutePath, basePath);

  return absolutePath;
}

/**
 * Main entry point: Load and fully validate hooks configuration
 *
 * Performs all validation steps:
 * 1. Load and parse JSON
 * 2. Validate against schema
 * 3. Validate regex patterns
 * 4. Validate script existence and permissions
 *
 * @param hooksPath - Absolute path to hooks.json
 * @param basePath - Base path for resolving script paths (defaults to hooks.json directory)
 * @returns Fully validated hooks configuration
 * @throws HookValidationError or HookScriptError on validation failure
 */
export function loadHooks(hooksPath: string, basePath?: string): HooksConfig {
  // Default basePath to the directory containing hooks.json
  const resolvedBasePath = basePath || path.dirname(hooksPath);

  // Step 1: Load file
  const rawConfig = loadHooksFile(hooksPath);

  // Step 2: Validate schema
  const validatedConfig = validateHookConfig(rawConfig);

  // Step 3: Validate regex patterns
  validateMatcherPatterns(validatedConfig);

  // Step 4: Validate scripts
  validateScripts(validatedConfig, resolvedBasePath);

  return validatedConfig;
}

/**
 * Get all hooks for a specific event type
 *
 * @param config - Validated hooks configuration
 * @param eventType - Event type to retrieve hooks for
 * @returns Array of hooks for the event type, or empty array if none
 */
export function getHooksForEvent(config: HooksConfig, eventType: HookEventType): HookDefinition[] {
  return config[eventType] || [];
}

/**
 * Check if a hook should be triggered based on its matcher
 *
 * Enhanced with timeout protection against ReDoS attacks:
 * - Uses safe regex execution with 100ms timeout
 * - Truncates long input strings (>10,000 chars)
 * - Returns false on timeout or error (fail-safe)
 *
 * @param hook - Hook definition (with validated matcher pattern)
 * @param matchString - String to match against hook's matcher pattern
 * @returns True if hook should be triggered
 */
export function shouldTriggerHook(hook: HookDefinition, matchString: string): boolean {
  if (!hook.matcher) {
    // No matcher means always trigger
    return true;
  }

  try {
    // Use safe regex test with timeout protection (100ms default)
    const regex = new RegExp(hook.matcher);
    return safeRegexTest(regex, matchString, 100);
  } catch (error) {
    // Should not happen if validation passed, but fail safe
    console.error(`Regex execution error in hook "${hook.name}": ${error}`);
    return false;
  }
}
