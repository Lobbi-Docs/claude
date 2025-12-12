/**
 * @claude-sdk/tools - DateTimeUtilsTool
 * Comprehensive date and time manipulation utilities
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const DateTimeOperationEnum = z.enum([
  'parse',
  'format',
  'diff',
  'add',
  'subtract',
  'compare',
  'timezone_convert',
  'relative',
]);

const DateUnitEnum = z.enum([
  'milliseconds',
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
]);

export const DateTimeUtilsSchema = z.object({
  operation: DateTimeOperationEnum,

  // Input date (can be ISO string, timestamp, or Date object)
  date: z.union([z.string(), z.number(), z.date()]).optional(),
  date2: z.union([z.string(), z.number(), z.date()]).optional(),

  // Parse options
  inputFormat: z.string().optional(),

  // Format options
  outputFormat: z.string().optional(),

  // Add/Subtract options
  amount: z.number().optional(),
  unit: DateUnitEnum.optional(),

  // Diff options
  diffUnit: DateUnitEnum.optional(),

  // Timezone options
  fromTimezone: z.string().optional(),
  toTimezone: z.string().optional(),

  // Relative time options
  maxUnit: DateUnitEnum.optional(),
});

export type DateTimeUtilsInput = z.infer<typeof DateTimeUtilsSchema>;

export interface DateTimeUtilsOutput {
  result: string | number | boolean | null;
  operation: string;
  metadata?: {
    timestamp?: number;
    timezone?: string;
    unit?: string;
  };
}

// ============================================================================
// DateTimeUtilsTool Implementation
// ============================================================================

export class DateTimeUtilsTool {
  static readonly name = 'datetime_utils';
  static readonly description = 'Parse, format, and manipulate dates and times with timezone support and relative time formatting';
  static readonly schema = DateTimeUtilsSchema;

  static async execute(
    input: DateTimeUtilsInput,
    context?: ToolContext
  ): Promise<ToolResult<DateTimeUtilsOutput>> {
    return wrapExecution(this.name, async (input, _ctx) => {
      const { operation } = input;

      switch (operation) {
        case 'parse':
          return this.handleParse(input);
        case 'format':
          return this.handleFormat(input);
        case 'diff':
          return this.handleDiff(input);
        case 'add':
          return this.handleAdd(input);
        case 'subtract':
          return this.handleSubtract(input);
        case 'compare':
          return this.handleCompare(input);
        case 'timezone_convert':
          return this.handleTimezoneConvert(input);
        case 'relative':
          return this.handleRelative(input);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }, input, context);
  }

  // ============================================================================
  // Operation Handlers
  // ============================================================================

  private static handleParse(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date) {
      throw new Error('Parse operation requires date parameter');
    }

    const date = this.parseDate(input.date);
    const isoString = date.toISOString();

    return {
      result: isoString,
      operation: 'parse',
      metadata: {
        timestamp: date.getTime(),
        timezone: this.getTimezone(date),
      },
    };
  }

  private static handleFormat(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date) {
      throw new Error('Format operation requires date parameter');
    }

    const date = this.parseDate(input.date);
    const format = input.outputFormat ?? 'iso';
    let result: string;

    switch (format.toLowerCase()) {
      case 'iso':
        result = date.toISOString();
        break;
      case 'date':
        result = date.toDateString();
        break;
      case 'time':
        result = date.toTimeString();
        break;
      case 'locale':
        result = date.toLocaleString();
        break;
      case 'utc':
        result = date.toUTCString();
        break;
      case 'json':
        result = date.toJSON();
        break;
      case 'unix':
        result = String(Math.floor(date.getTime() / 1000));
        break;
      case 'timestamp':
        result = String(date.getTime());
        break;
      default:
        // Custom format
        result = this.formatCustom(date, format);
        break;
    }

    return {
      result,
      operation: 'format',
      metadata: {
        timestamp: date.getTime(),
      },
    };
  }

  private static handleDiff(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date || !input.date2) {
      throw new Error('Diff operation requires date and date2 parameters');
    }

    const date1 = this.parseDate(input.date);
    const date2 = this.parseDate(input.date2);
    const unit = input.diffUnit ?? 'milliseconds';

    const diffMs = date2.getTime() - date1.getTime();
    const result = this.convertMilliseconds(diffMs, unit);

    return {
      result,
      operation: 'diff',
      metadata: {
        unit,
      },
    };
  }

  private static handleAdd(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date) {
      throw new Error('Add operation requires date parameter');
    }
    if (input.amount === undefined || !input.unit) {
      throw new Error('Add operation requires amount and unit parameters');
    }

    const date = this.parseDate(input.date);
    const result = this.addTime(date, input.amount, input.unit);

    return {
      result: result.toISOString(),
      operation: 'add',
      metadata: {
        timestamp: result.getTime(),
        unit: input.unit,
      },
    };
  }

  private static handleSubtract(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date) {
      throw new Error('Subtract operation requires date parameter');
    }
    if (input.amount === undefined || !input.unit) {
      throw new Error('Subtract operation requires amount and unit parameters');
    }

    const date = this.parseDate(input.date);
    const result = this.addTime(date, -input.amount, input.unit);

    return {
      result: result.toISOString(),
      operation: 'subtract',
      metadata: {
        timestamp: result.getTime(),
        unit: input.unit,
      },
    };
  }

  private static handleCompare(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date || !input.date2) {
      throw new Error('Compare operation requires date and date2 parameters');
    }

    const date1 = this.parseDate(input.date);
    const date2 = this.parseDate(input.date2);

    const diff = date1.getTime() - date2.getTime();
    let result: number;

    if (diff < 0) {
      result = -1; // date1 is before date2
    } else if (diff > 0) {
      result = 1; // date1 is after date2
    } else {
      result = 0; // dates are equal
    }

    return {
      result,
      operation: 'compare',
    };
  }

  private static handleTimezoneConvert(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date) {
      throw new Error('Timezone convert operation requires date parameter');
    }
    if (!input.toTimezone) {
      throw new Error('Timezone convert operation requires toTimezone parameter');
    }

    const date = this.parseDate(input.date);

    try {
      // Use Intl.DateTimeFormat for timezone conversion
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: input.toTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const dateParts: any = {};

      parts.forEach((part) => {
        if (part.type !== 'literal') {
          dateParts[part.type] = part.value;
        }
      });

      const result = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;

      return {
        result,
        operation: 'timezone_convert',
        metadata: {
          timezone: input.toTimezone,
        },
      };
    } catch (error) {
      throw new Error(`Invalid timezone: ${input.toTimezone}`);
    }
  }

  private static handleRelative(input: DateTimeUtilsInput): DateTimeUtilsOutput {
    if (!input.date) {
      throw new Error('Relative operation requires date parameter');
    }

    const date = this.parseDate(input.date);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const maxUnit = input.maxUnit;

    const result = this.formatRelative(diffMs, maxUnit);

    return {
      result,
      operation: 'relative',
      metadata: {
        timestamp: date.getTime(),
      },
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static parseDate(input: string | number | Date): Date {
    if (input instanceof Date) {
      return input;
    }

    if (typeof input === 'number') {
      // Assume timestamp in milliseconds
      return new Date(input);
    }

    if (typeof input === 'string') {
      // Try to parse ISO string or other formats
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${input}`);
      }
      return date;
    }

    throw new Error('Invalid date input');
  }

  private static getTimezone(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private static formatCustom(date: Date, format: string): string {
    const tokens: Record<string, string> = {
      YYYY: String(date.getFullYear()),
      YY: String(date.getFullYear()).slice(-2),
      MM: String(date.getMonth() + 1).padStart(2, '0'),
      M: String(date.getMonth() + 1),
      DD: String(date.getDate()).padStart(2, '0'),
      D: String(date.getDate()),
      HH: String(date.getHours()).padStart(2, '0'),
      H: String(date.getHours()),
      hh: String(date.getHours() % 12 || 12).padStart(2, '0'),
      h: String(date.getHours() % 12 || 12),
      mm: String(date.getMinutes()).padStart(2, '0'),
      m: String(date.getMinutes()),
      ss: String(date.getSeconds()).padStart(2, '0'),
      s: String(date.getSeconds()),
      SSS: String(date.getMilliseconds()).padStart(3, '0'),
      A: date.getHours() >= 12 ? 'PM' : 'AM',
      a: date.getHours() >= 12 ? 'pm' : 'am',
    };

    let result = format;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    return result;
  }

  private static convertMilliseconds(ms: number, unit: z.infer<typeof DateUnitEnum>): number {
    const conversions: Record<string, number> = {
      milliseconds: 1,
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000, // Approximate
      years: 365 * 24 * 60 * 60 * 1000, // Approximate
    };

    return ms / conversions[unit];
  }

  private static addTime(date: Date, amount: number, unit: z.infer<typeof DateUnitEnum>): Date {
    const result = new Date(date);

    switch (unit) {
      case 'milliseconds':
        result.setMilliseconds(result.getMilliseconds() + amount);
        break;
      case 'seconds':
        result.setSeconds(result.getSeconds() + amount);
        break;
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
      case 'weeks':
        result.setDate(result.getDate() + amount * 7);
        break;
      case 'months':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + amount);
        break;
    }

    return result;
  }

  private static formatRelative(diffMs: number, maxUnit?: z.infer<typeof DateUnitEnum>): string {
    const absDiff = Math.abs(diffMs);
    const isFuture = diffMs < 0;

    const units: Array<[z.infer<typeof DateUnitEnum>, number, string, string]> = [
      ['years', 365 * 24 * 60 * 60 * 1000, 'year', 'years'],
      ['months', 30 * 24 * 60 * 60 * 1000, 'month', 'months'],
      ['weeks', 7 * 24 * 60 * 60 * 1000, 'week', 'weeks'],
      ['days', 24 * 60 * 60 * 1000, 'day', 'days'],
      ['hours', 60 * 60 * 1000, 'hour', 'hours'],
      ['minutes', 60 * 1000, 'minute', 'minutes'],
      ['seconds', 1000, 'second', 'seconds'],
    ];

    for (const [unit, ms, singular, plural] of units) {
      if (maxUnit && this.unitOrder(unit) > this.unitOrder(maxUnit)) {
        continue;
      }

      if (absDiff >= ms) {
        const value = Math.floor(absDiff / ms);
        const unitStr = value === 1 ? singular : plural;
        return isFuture ? `in ${value} ${unitStr}` : `${value} ${unitStr} ago`;
      }
    }

    return 'just now';
  }

  private static unitOrder(unit: z.infer<typeof DateUnitEnum>): number {
    const order: Record<string, number> = {
      milliseconds: 0,
      seconds: 1,
      minutes: 2,
      hours: 3,
      days: 4,
      weeks: 5,
      months: 6,
      years: 7,
    };
    return order[unit] ?? 0;
  }
}
