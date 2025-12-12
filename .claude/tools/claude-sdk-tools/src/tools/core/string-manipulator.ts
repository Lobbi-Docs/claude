/**
 * @claude-sdk/tools - StringManipulatorTool
 * Advanced string manipulation operations
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const StringOperationEnum = z.enum([
  'split',
  'join',
  'replace',
  'regex_match',
  'regex_replace',
  'template',
  'case_convert',
  'trim',
  'pad',
  'truncate',
]);

const CaseTypeEnum = z.enum([
  'camel',
  'pascal',
  'snake',
  'kebab',
  'upper',
  'lower',
  'title',
  'sentence',
]);

export const StringManipulatorSchema = z.object({
  operation: StringOperationEnum,
  input: z.union([z.string(), z.array(z.string())]),

  // Split options
  separator: z.string().optional(),
  limit: z.number().int().positive().optional(),

  // Join options
  delimiter: z.string().optional(),

  // Replace options
  search: z.string().optional(),
  replacement: z.string().optional(),
  replaceAll: z.boolean().optional(),

  // Regex options
  pattern: z.string().optional(),
  flags: z.string().optional(),

  // Template options
  variables: z.record(z.string(), z.any()).optional(),

  // Case conversion
  caseType: CaseTypeEnum.optional(),

  // Trim options
  trimType: z.enum(['both', 'start', 'end']).optional(),
  chars: z.string().optional(),

  // Pad options
  length: z.number().int().positive().optional(),
  padChar: z.string().optional(),
  padSide: z.enum(['start', 'end', 'both']).optional(),

  // Truncate options
  maxLength: z.number().int().positive().optional(),
  ellipsis: z.string().optional(),
});

export type StringManipulatorInput = z.infer<typeof StringManipulatorSchema>;

export interface StringManipulatorOutput {
  result: string | string[] | RegExpMatchArray | null;
  operation: string;
  metadata?: {
    originalLength?: number;
    resultLength?: number;
    matchCount?: number;
  };
}

// ============================================================================
// StringManipulatorTool Implementation
// ============================================================================

export class StringManipulatorTool {
  static readonly name = 'string_manipulator';
  static readonly description = 'Perform advanced string manipulation operations including split, join, replace, regex operations, case conversion, and more';
  static readonly schema = StringManipulatorSchema;

  static async execute(
    input: StringManipulatorInput,
    context?: ToolContext
  ): Promise<ToolResult<StringManipulatorOutput>> {
    return wrapExecution(this.name, async (input, _ctx) => {
      const { operation } = input;

      switch (operation) {
        case 'split':
          return this.handleSplit(input);
        case 'join':
          return this.handleJoin(input);
        case 'replace':
          return this.handleReplace(input);
        case 'regex_match':
          return this.handleRegexMatch(input);
        case 'regex_replace':
          return this.handleRegexReplace(input);
        case 'template':
          return this.handleTemplate(input);
        case 'case_convert':
          return this.handleCaseConvert(input);
        case 'trim':
          return this.handleTrim(input);
        case 'pad':
          return this.handlePad(input);
        case 'truncate':
          return this.handleTruncate(input);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }, input, context);
  }

  // ============================================================================
  // Operation Handlers
  // ============================================================================

  private static handleSplit(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Split operation requires string input');
    }

    const separator = input.separator ?? '';
    const limit = input.limit;
    const parts = input.input.split(separator, limit);

    return {
      result: parts,
      operation: 'split',
      metadata: {
        originalLength: input.input.length,
        resultLength: parts.length,
      },
    };
  }

  private static handleJoin(input: StringManipulatorInput): StringManipulatorOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Join operation requires array input');
    }

    const delimiter = input.delimiter ?? '';
    const result = input.input.join(delimiter);

    return {
      result,
      operation: 'join',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
      },
    };
  }

  private static handleReplace(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Replace operation requires string input');
    }
    if (!input.search) {
      throw new Error('Replace operation requires search parameter');
    }

    const search = input.search;
    const replacement = input.replacement ?? '';
    const replaceAll = input.replaceAll ?? false;

    let result: string;
    let matchCount = 0;

    if (replaceAll) {
      // Count occurrences
      const matches = input.input.split(search);
      matchCount = matches.length - 1;
      result = input.input.split(search).join(replacement);
    } else {
      matchCount = input.input.includes(search) ? 1 : 0;
      result = input.input.replace(search, replacement);
    }

    return {
      result,
      operation: 'replace',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
        matchCount,
      },
    };
  }

  private static handleRegexMatch(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Regex match operation requires string input');
    }
    if (!input.pattern) {
      throw new Error('Regex match operation requires pattern parameter');
    }

    const flags = input.flags ?? '';
    const regex = new RegExp(input.pattern, flags);
    const matches: string[] | null = flags.includes('g')
      ? input.input.match(regex)
      : (() => {
          const singleMatch = input.input.match(regex);
          return singleMatch ? [singleMatch[0]] : null;
        })();

    return {
      result: matches || [],
      operation: 'regex_match',
      metadata: {
        matchCount: matches?.length ?? 0,
      },
    };
  }

  private static handleRegexReplace(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Regex replace operation requires string input');
    }
    if (!input.pattern) {
      throw new Error('Regex replace operation requires pattern parameter');
    }

    const flags = input.flags ?? '';
    const regex = new RegExp(input.pattern, flags);
    const replacement = input.replacement ?? '';

    // Count matches before replacement
    const matches = input.input.match(new RegExp(input.pattern, flags + (flags.includes('g') ? '' : 'g')));
    const matchCount = matches?.length ?? 0;

    const result = input.input.replace(regex, replacement);

    return {
      result,
      operation: 'regex_replace',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
        matchCount,
      },
    };
  }

  private static handleTemplate(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Template operation requires string input');
    }
    if (!input.variables) {
      throw new Error('Template operation requires variables parameter');
    }

    let result = input.input;
    const variables = input.variables;

    // Replace {{variable}} with values
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined
        ? String(variables[trimmedKey])
        : match;
    });

    return {
      result,
      operation: 'template',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
      },
    };
  }

  private static handleCaseConvert(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Case convert operation requires string input');
    }
    if (!input.caseType) {
      throw new Error('Case convert operation requires caseType parameter');
    }

    const str = input.input;
    let result: string;

    switch (input.caseType) {
      case 'camel':
        result = this.toCamelCase(str);
        break;
      case 'pascal':
        result = this.toPascalCase(str);
        break;
      case 'snake':
        result = this.toSnakeCase(str);
        break;
      case 'kebab':
        result = this.toKebabCase(str);
        break;
      case 'upper':
        result = str.toUpperCase();
        break;
      case 'lower':
        result = str.toLowerCase();
        break;
      case 'title':
        result = this.toTitleCase(str);
        break;
      case 'sentence':
        result = this.toSentenceCase(str);
        break;
      default:
        throw new Error(`Unknown case type: ${input.caseType}`);
    }

    return {
      result,
      operation: 'case_convert',
      metadata: {
        originalLength: str.length,
        resultLength: result.length,
      },
    };
  }

  private static handleTrim(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Trim operation requires string input');
    }

    const trimType = input.trimType ?? 'both';
    const chars = input.chars;
    let result = input.input;

    if (chars) {
      // Custom character trimming
      const pattern = `[${chars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`;
      switch (trimType) {
        case 'start':
          result = result.replace(new RegExp(`^${pattern}+`), '');
          break;
        case 'end':
          result = result.replace(new RegExp(`${pattern}+$`), '');
          break;
        case 'both':
          result = result.replace(new RegExp(`^${pattern}+|${pattern}+$`, 'g'), '');
          break;
      }
    } else {
      // Standard whitespace trimming
      switch (trimType) {
        case 'start':
          result = result.trimStart();
          break;
        case 'end':
          result = result.trimEnd();
          break;
        case 'both':
          result = result.trim();
          break;
      }
    }

    return {
      result,
      operation: 'trim',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
      },
    };
  }

  private static handlePad(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Pad operation requires string input');
    }
    if (!input.length) {
      throw new Error('Pad operation requires length parameter');
    }

    const targetLength = input.length;
    const padChar = input.padChar ?? ' ';
    const padSide = input.padSide ?? 'end';
    let result = input.input;

    if (result.length >= targetLength) {
      return {
        result,
        operation: 'pad',
        metadata: {
          originalLength: result.length,
          resultLength: result.length,
        },
      };
    }

    const padLength = targetLength - result.length;

    switch (padSide) {
      case 'start':
        result = padChar.repeat(Math.ceil(padLength / padChar.length)).slice(0, padLength) + result;
        break;
      case 'end':
        result = result + padChar.repeat(Math.ceil(padLength / padChar.length)).slice(0, padLength);
        break;
      case 'both':
        const leftPad = Math.floor(padLength / 2);
        const rightPad = padLength - leftPad;
        result =
          padChar.repeat(Math.ceil(leftPad / padChar.length)).slice(0, leftPad) +
          result +
          padChar.repeat(Math.ceil(rightPad / padChar.length)).slice(0, rightPad);
        break;
    }

    return {
      result,
      operation: 'pad',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
      },
    };
  }

  private static handleTruncate(input: StringManipulatorInput): StringManipulatorOutput {
    if (typeof input.input !== 'string') {
      throw new Error('Truncate operation requires string input');
    }
    if (!input.maxLength) {
      throw new Error('Truncate operation requires maxLength parameter');
    }

    const maxLength = input.maxLength;
    const ellipsis = input.ellipsis ?? '...';
    let result = input.input;

    if (result.length > maxLength) {
      const truncateLength = Math.max(0, maxLength - ellipsis.length);
      result = result.slice(0, truncateLength) + ellipsis;
    }

    return {
      result,
      operation: 'truncate',
      metadata: {
        originalLength: input.input.length,
        resultLength: result.length,
      },
    };
  }

  // ============================================================================
  // Case Conversion Helpers
  // ============================================================================

  private static toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  private static toPascalCase(str: string): string {
    const camel = this.toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  private static toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-\s]+/g, '_')
      .replace(/^_/, '')
      .toLowerCase();
  }

  private static toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/[_\s]+/g, '-')
      .replace(/^-/, '')
      .toLowerCase();
  }

  private static toTitleCase(str: string): string {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private static toSentenceCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
