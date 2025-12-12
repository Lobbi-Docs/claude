/**
 * @claude-sdk/tools - InputSanitizerTool
 * Sanitizes user input to prevent common security vulnerabilities
 */

import { z } from 'zod';
import { success, failure } from '../../utils/index.js';
import { SecurityError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';
import * as path from 'node:path';

// ============================================================================
// Schema Definitions
// ============================================================================

export const InputSanitizerSchema = z.object({
  operation: z.enum(['html', 'sql', 'xss', 'path', 'regex', 'all']),
  input: z.string().describe('Input string to sanitize'),
  options: z.object({
    // HTML sanitization options
    allowedTags: z.array(z.string()).optional().describe('Allowed HTML tags (empty = escape all)'),
    allowedAttributes: z.array(z.string()).optional().describe('Allowed HTML attributes'),

    // Path sanitization options
    basePath: z.string().optional().describe('Base path for path traversal prevention'),
    allowAbsolute: z.boolean().default(false).describe('Allow absolute paths'),

    // Regex options
    maxLength: z.number().min(1).max(10000).default(1000).describe('Max regex pattern length'),

    // General options
    strict: z.boolean().default(true).describe('Use strict sanitization'),
  }).optional(),
});

export type InputSanitizerInput = z.infer<typeof InputSanitizerSchema>;

export interface InputSanitizerOutput {
  operation: string;
  original: string;
  sanitized: string;
  changed: boolean;
  warnings?: string[];
  blocked?: string[];
}

// ============================================================================
// InputSanitizerTool Implementation
// ============================================================================

export class InputSanitizerTool {
  // Dangerous patterns
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
    /(\bxp_|\bsp_)/gi,
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<applet\b/gi,
  ];

  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\./g,
    /\.\.[\\/]/g,
    /[\\/]\.\.[\\/]/g,
    /^[\\/]/,
  ];

  /**
   * Execute sanitization operations
   */
  static async execute(
    input: InputSanitizerInput,
    context: ToolContext
  ): Promise<ToolResult<InputSanitizerOutput>> {
    try {
      context.logger?.info(`Executing ${input.operation} sanitization`);

      switch (input.operation) {
        case 'html':
          return this.sanitizeHtml(input, context);
        case 'sql':
          return this.sanitizeSql(input, context);
        case 'xss':
          return this.sanitizeXss(input, context);
        case 'path':
          return this.sanitizePath(input, context);
        case 'regex':
          return this.sanitizeRegex(input, context);
        case 'all':
          return this.sanitizeAll(input, context);
        default:
          throw new SecurityError(
            `Unsupported operation: ${input.operation}`,
            'FORBIDDEN'
          );
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        return failure(error);
      }
      return failure(
        new SecurityError(
          `Sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
          'FORBIDDEN',
          { operation: input.operation }
        )
      );
    }
  }

  /**
   * Sanitize HTML
   */
  private static sanitizeHtml(
    input: InputSanitizerInput,
    _context: ToolContext
  ): ToolResult<InputSanitizerOutput> {
    try {
      const options = input.options;
      const allowedTags = options?.allowedTags || [];
      const allowedAttributes = options?.allowedAttributes || [];

      let sanitized = input.input;
      const warnings: string[] = [];
      const blocked: string[] = [];

      if (allowedTags.length === 0) {
        // Escape all HTML
        sanitized = this.escapeHtml(sanitized);
      } else {
        // Remove disallowed tags
        const tagPattern = /<(\/?)([\w-]+)([^>]*)>/g;
        sanitized = sanitized.replace(tagPattern, (match, closing, tag, attrs) => {
          if (!allowedTags.includes(tag.toLowerCase())) {
            blocked.push(tag);
            return this.escapeHtml(match);
          }

          // Sanitize attributes
          if (attrs && allowedAttributes.length > 0) {
            const attrPattern = /([\w-]+)\s*=\s*["']([^"']*)["']/g;
            attrs = attrs.replace(attrPattern, (_attrMatch: string, attrName: string, attrValue: string) => {
              if (!allowedAttributes.includes(attrName.toLowerCase())) {
                warnings.push(`Removed attribute: ${attrName}`);
                return '';
              }
              // Escape attribute value
              return `${attrName}="${this.escapeHtml(attrValue)}"`;
            });
          }

          return `<${closing}${tag}${attrs}>`;
        });
      }

      return success({
        operation: 'html',
        original: input.input,
        sanitized,
        changed: sanitized !== input.input,
        warnings: warnings.length > 0 ? warnings : undefined,
        blocked: blocked.length > 0 ? blocked : undefined,
      });
    } catch (error) {
      throw new SecurityError(
        `HTML sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Sanitize SQL injection attempts
   */
  private static sanitizeSql(
    input: InputSanitizerInput,
    _context: ToolContext
  ): ToolResult<InputSanitizerOutput> {
    try {
      const options = input.options;
      const strict = options?.strict !== false;

      let sanitized = input.input;
      const warnings: string[] = [];
      const blocked: string[] = [];

      // Check for SQL injection patterns
      for (const pattern of this.SQL_INJECTION_PATTERNS) {
        const matches = sanitized.match(pattern);
        if (matches) {
          blocked.push(...matches);
          if (strict) {
            // In strict mode, escape dangerous characters
            sanitized = sanitized.replace(pattern, (match) => {
              warnings.push(`Escaped SQL pattern: ${match}`);
              return this.escapeSql(match);
            });
          }
        }
      }

      // Escape single quotes (common SQL injection vector)
      sanitized = sanitized.replace(/'/g, "''");

      // Add warning about parameterized queries
      if (blocked.length > 0) {
        warnings.push(
          'WARNING: SQL-like patterns detected. Use parameterized queries instead of string concatenation.'
        );
      }

      return success({
        operation: 'sql',
        original: input.input,
        sanitized,
        changed: sanitized !== input.input,
        warnings: warnings.length > 0 ? warnings : undefined,
        blocked: blocked.length > 0 ? blocked : undefined,
      });
    } catch (error) {
      throw new SecurityError(
        `SQL sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Sanitize XSS attempts
   */
  private static sanitizeXss(
    input: InputSanitizerInput,
    _context: ToolContext
  ): ToolResult<InputSanitizerOutput> {
    try {
      let sanitized = input.input;
      const blocked: string[] = [];
      const warnings: string[] = [];

      // Remove dangerous patterns
      for (const pattern of this.XSS_PATTERNS) {
        const matches = sanitized.match(pattern);
        if (matches) {
          blocked.push(...matches);
          sanitized = sanitized.replace(pattern, (match) => {
            warnings.push(`Removed XSS pattern: ${match.substring(0, 50)}...`);
            return this.escapeHtml(match);
          });
        }
      }

      // Escape HTML entities
      sanitized = this.escapeHtml(sanitized);

      return success({
        operation: 'xss',
        original: input.input,
        sanitized,
        changed: sanitized !== input.input,
        warnings: warnings.length > 0 ? warnings : undefined,
        blocked: blocked.length > 0 ? blocked : undefined,
      });
    } catch (error) {
      throw new SecurityError(
        `XSS sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Sanitize file paths to prevent path traversal
   */
  private static sanitizePath(
    input: InputSanitizerInput,
    _context: ToolContext
  ): ToolResult<InputSanitizerOutput> {
    try {
      const options = input.options;
      const basePath = options?.basePath;
      const allowAbsolute = options?.allowAbsolute || false;

      let sanitized = input.input;
      const warnings: string[] = [];
      const blocked: string[] = [];

      // Normalize path separators
      sanitized = sanitized.replace(/\\/g, '/');

      // Check for path traversal attempts
      for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
        if (pattern.test(sanitized)) {
          blocked.push('Path traversal pattern detected');
          // Remove path traversal sequences
          sanitized = sanitized.replace(pattern, '');
          warnings.push('Removed path traversal sequences');
        }
      }

      // Check for absolute paths
      if (!allowAbsolute && path.isAbsolute(sanitized)) {
        warnings.push('Absolute path not allowed');
        sanitized = path.basename(sanitized);
      }

      // If base path is provided, ensure the path stays within it
      if (basePath) {
        const normalizedBase = path.normalize(basePath);
        const normalizedPath = path.normalize(path.join(normalizedBase, sanitized));

        if (!normalizedPath.startsWith(normalizedBase)) {
          throw new SecurityError(
            'Path traversal attempt detected',
            'FORBIDDEN',
            { input: input.input, sanitized }
          );
        }

        // Return relative path from base
        sanitized = path.relative(normalizedBase, normalizedPath);
      }

      // Remove null bytes
      if (sanitized.includes('\0')) {
        blocked.push('Null byte detected');
        sanitized = sanitized.replace(/\0/g, '');
        warnings.push('Removed null bytes');
      }

      return success({
        operation: 'path',
        original: input.input,
        sanitized,
        changed: sanitized !== input.input,
        warnings: warnings.length > 0 ? warnings : undefined,
        blocked: blocked.length > 0 ? blocked : undefined,
      });
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        `Path sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Sanitize regex patterns to prevent ReDoS
   */
  private static sanitizeRegex(
    input: InputSanitizerInput,
    _context: ToolContext
  ): ToolResult<InputSanitizerOutput> {
    try {
      const options = input.options;
      const maxLength = options?.maxLength || 1000;

      let sanitized = input.input;
      const warnings: string[] = [];
      const blocked: string[] = [];

      // Check length
      if (sanitized.length > maxLength) {
        warnings.push(`Pattern too long (max ${maxLength} characters)`);
        sanitized = sanitized.substring(0, maxLength);
      }

      // Check for dangerous regex patterns (ReDoS)
      const dangerousPatterns = [
        /(\([^)]*\+[^)]*\))\1*/g, // Nested quantifiers
        /(\w+\*)+\*/g, // Multiple consecutive quantifiers
        /(.+)+/g, // Catastrophic backtracking
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          blocked.push('Potentially dangerous regex pattern detected');
          warnings.push('WARNING: Pattern may cause ReDoS (Regular Expression Denial of Service)');
        }
      }

      // Test if regex is valid
      try {
        new RegExp(sanitized);
      } catch (e) {
        throw new SecurityError(
          `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`,
          'FORBIDDEN'
        );
      }

      return success({
        operation: 'regex',
        original: input.input,
        sanitized,
        changed: sanitized !== input.input,
        warnings: warnings.length > 0 ? warnings : undefined,
        blocked: blocked.length > 0 ? blocked : undefined,
      });
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        `Regex sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Apply all sanitization methods
   */
  private static async sanitizeAll(
    input: InputSanitizerInput,
    context: ToolContext
  ): Promise<ToolResult<InputSanitizerOutput>> {
    try {
      let sanitized = input.input;
      const warnings: string[] = [];
      const blocked: string[] = [];

      // Apply each sanitization in sequence
      const operations = ['xss', 'sql', 'path'] as const;

      for (const op of operations) {
        const result = await this.execute(
          { ...input, operation: op, input: sanitized },
          context
        );

        if (result.success && result.data) {
          sanitized = result.data.sanitized;
          if (result.data.warnings) {
            warnings.push(...result.data.warnings);
          }
          if (result.data.blocked) {
            blocked.push(...result.data.blocked);
          }
        }
      }

      return success({
        operation: 'all',
        original: input.input,
        sanitized,
        changed: sanitized !== input.input,
        warnings: warnings.length > 0 ? warnings : undefined,
        blocked: blocked.length > 0 ? blocked : undefined,
      });
    } catch (error) {
      throw new SecurityError(
        `Complete sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
        'FORBIDDEN'
      );
    }
  }

  /**
   * Escape HTML entities
   */
  private static escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);
  }

  /**
   * Escape SQL special characters
   */
  private static escapeSql(text: string): string {
    return text
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
