/**
 * @claude-sdk/tools - MathCalculatorTool
 * Mathematical operations including basic arithmetic, advanced functions, and statistics
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const MathOperationEnum = z.enum([
  // Basic operations
  'add',
  'subtract',
  'multiply',
  'divide',
  'modulo',

  // Advanced operations
  'power',
  'sqrt',
  'log',
  'log10',
  'exp',
  'abs',
  'ceil',
  'floor',
  'round',

  // Trigonometric
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',

  // Statistics
  'mean',
  'median',
  'mode',
  'std_dev',
  'variance',
  'sum',
  'min',
  'max',
  'range',
]);

export const MathCalculatorSchema = z.object({
  operation: MathOperationEnum,

  // Input values
  value: z.number().optional(),
  values: z.array(z.number()).optional(),

  // Binary operations
  operand: z.number().optional(),

  // Precision control
  precision: z.number().int().min(0).max(20).optional(),

  // Rounding mode
  roundingMode: z.enum(['round', 'floor', 'ceil', 'trunc']).optional(),
});

export type MathCalculatorInput = z.infer<typeof MathCalculatorSchema>;

export interface MathCalculatorOutput {
  result: number | number[];
  operation: string;
  metadata?: {
    precision?: number;
    unit?: string;
    count?: number;
  };
}

// ============================================================================
// MathCalculatorTool Implementation
// ============================================================================

export class MathCalculatorTool {
  static readonly name = 'math_calculator';
  static readonly description = 'Perform mathematical operations including basic arithmetic, advanced functions (power, sqrt, log), trigonometry, and statistical calculations';
  static readonly schema = MathCalculatorSchema;

  static async execute(
    input: MathCalculatorInput,
    context?: ToolContext
  ): Promise<ToolResult<MathCalculatorOutput>> {
    return wrapExecution(this.name, async (input, _ctx) => {
      const { operation } = input;

      // Route to appropriate handler
      if (this.isBasicOperation(operation)) {
        return this.handleBasicOperation(input);
      } else if (this.isAdvancedOperation(operation)) {
        return this.handleAdvancedOperation(input);
      } else if (this.isTrigOperation(operation)) {
        return this.handleTrigOperation(input);
      } else if (this.isStatOperation(operation)) {
        return this.handleStatOperation(input);
      }

      throw new Error(`Unknown operation: ${operation}`);
    }, input, context);
  }

  // ============================================================================
  // Operation Type Checkers
  // ============================================================================

  private static isBasicOperation(op: string): boolean {
    return ['add', 'subtract', 'multiply', 'divide', 'modulo'].includes(op);
  }

  private static isAdvancedOperation(op: string): boolean {
    return ['power', 'sqrt', 'log', 'log10', 'exp', 'abs', 'ceil', 'floor', 'round'].includes(op);
  }

  private static isTrigOperation(op: string): boolean {
    return ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].includes(op);
  }

  private static isStatOperation(op: string): boolean {
    return ['mean', 'median', 'mode', 'std_dev', 'variance', 'sum', 'min', 'max', 'range'].includes(op);
  }

  // ============================================================================
  // Basic Operations Handler
  // ============================================================================

  private static handleBasicOperation(input: MathCalculatorInput): MathCalculatorOutput {
    if (input.value === undefined || input.operand === undefined) {
      throw new Error('Basic operations require value and operand parameters');
    }

    const { value, operand, operation, precision } = input;
    let result: number;

    switch (operation) {
      case 'add':
        result = value + operand;
        break;
      case 'subtract':
        result = value - operand;
        break;
      case 'multiply':
        result = value * operand;
        break;
      case 'divide':
        if (operand === 0) {
          throw new Error('Division by zero');
        }
        result = value / operand;
        break;
      case 'modulo':
        if (operand === 0) {
          throw new Error('Modulo by zero');
        }
        result = value % operand;
        break;
      default:
        throw new Error(`Unknown basic operation: ${operation}`);
    }

    if (precision !== undefined) {
      result = this.applyPrecision(result, precision);
    }

    return {
      result,
      operation,
      metadata: precision !== undefined ? { precision } : undefined,
    };
  }

  // ============================================================================
  // Advanced Operations Handler
  // ============================================================================

  private static handleAdvancedOperation(input: MathCalculatorInput): MathCalculatorOutput {
    if (input.value === undefined) {
      throw new Error('Advanced operations require value parameter');
    }

    const { value, operation, precision, operand } = input;
    let result: number;

    switch (operation) {
      case 'power':
        if (operand === undefined) {
          throw new Error('Power operation requires operand parameter');
        }
        result = Math.pow(value, operand);
        break;
      case 'sqrt':
        if (value < 0) {
          throw new Error('Cannot calculate square root of negative number');
        }
        result = Math.sqrt(value);
        break;
      case 'log':
        if (value <= 0) {
          throw new Error('Logarithm requires positive value');
        }
        result = Math.log(value);
        break;
      case 'log10':
        if (value <= 0) {
          throw new Error('Logarithm requires positive value');
        }
        result = Math.log10(value);
        break;
      case 'exp':
        result = Math.exp(value);
        break;
      case 'abs':
        result = Math.abs(value);
        break;
      case 'ceil':
        result = Math.ceil(value);
        break;
      case 'floor':
        result = Math.floor(value);
        break;
      case 'round':
        result = Math.round(value);
        break;
      default:
        throw new Error(`Unknown advanced operation: ${operation}`);
    }

    if (precision !== undefined && !['ceil', 'floor', 'round'].includes(operation)) {
      result = this.applyPrecision(result, precision);
    }

    return {
      result,
      operation,
      metadata: precision !== undefined ? { precision } : undefined,
    };
  }

  // ============================================================================
  // Trigonometric Operations Handler
  // ============================================================================

  private static handleTrigOperation(input: MathCalculatorInput): MathCalculatorOutput {
    if (input.value === undefined) {
      throw new Error('Trigonometric operations require value parameter');
    }

    const { value, operation, precision } = input;
    let result: number;

    switch (operation) {
      case 'sin':
        result = Math.sin(value);
        break;
      case 'cos':
        result = Math.cos(value);
        break;
      case 'tan':
        result = Math.tan(value);
        break;
      case 'asin':
        if (value < -1 || value > 1) {
          throw new Error('asin requires value between -1 and 1');
        }
        result = Math.asin(value);
        break;
      case 'acos':
        if (value < -1 || value > 1) {
          throw new Error('acos requires value between -1 and 1');
        }
        result = Math.acos(value);
        break;
      case 'atan':
        result = Math.atan(value);
        break;
      default:
        throw new Error(`Unknown trigonometric operation: ${operation}`);
    }

    if (precision !== undefined) {
      result = this.applyPrecision(result, precision);
    }

    return {
      result,
      operation,
      metadata: {
        precision,
        unit: 'radians',
      },
    };
  }

  // ============================================================================
  // Statistical Operations Handler
  // ============================================================================

  private static handleStatOperation(input: MathCalculatorInput): MathCalculatorOutput {
    if (!input.values || input.values.length === 0) {
      throw new Error('Statistical operations require values array');
    }

    const { values, operation, precision } = input;
    let result: number;

    switch (operation) {
      case 'sum':
        result = this.sum(values);
        break;
      case 'mean':
        result = this.mean(values);
        break;
      case 'median':
        result = this.median(values);
        break;
      case 'mode':
        result = this.mode(values);
        break;
      case 'std_dev':
        result = this.standardDeviation(values);
        break;
      case 'variance':
        result = this.variance(values);
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      case 'range':
        result = Math.max(...values) - Math.min(...values);
        break;
      default:
        throw new Error(`Unknown statistical operation: ${operation}`);
    }

    if (precision !== undefined) {
      result = this.applyPrecision(result, precision);
    }

    return {
      result,
      operation,
      metadata: {
        precision,
        count: values.length,
      },
    };
  }

  // ============================================================================
  // Statistical Helper Methods
  // ============================================================================

  private static sum(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0);
  }

  private static mean(values: number[]): number {
    return this.sum(values) / values.length;
  }

  private static median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  private static mode(values: number[]): number {
    const frequency: Map<number, number> = new Map();
    let maxFreq = 0;
    let mode = values[0];

    for (const value of values) {
      const freq = (frequency.get(value) || 0) + 1;
      frequency.set(value, freq);

      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    }

    return mode;
  }

  private static variance(values: number[]): number {
    const avg = this.mean(values);
    const squaredDiffs = values.map((value) => Math.pow(value - avg, 2));
    return this.mean(squaredDiffs);
  }

  private static standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private static applyPrecision(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }
}
