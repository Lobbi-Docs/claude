/**
 * @claude-sdk/tools - Core Tools
 * Essential utility tools for string manipulation, data transformation,
 * date/time operations, mathematics, UUID generation, and hashing
 */

// Export tool classes
export { StringManipulatorTool } from './string-manipulator.js';
export { DataTransformerTool } from './data-transformer.js';
export { DateTimeUtilsTool } from './datetime-utils.js';
export { MathCalculatorTool } from './math-calculator.js';
export { UuidGeneratorTool } from './uuid-generator.js';
export { HashGeneratorTool } from './hash-generator.js';

// Export schemas
export {
  StringManipulatorSchema,
  type StringManipulatorInput,
  type StringManipulatorOutput,
} from './string-manipulator.js';

export {
  DataTransformerSchema,
  type DataTransformerInput,
  type DataTransformerOutput,
} from './data-transformer.js';

export {
  DateTimeUtilsSchema,
  type DateTimeUtilsInput,
  type DateTimeUtilsOutput,
} from './datetime-utils.js';

export {
  MathCalculatorSchema,
  type MathCalculatorInput,
  type MathCalculatorOutput,
} from './math-calculator.js';

export {
  UuidGeneratorSchema,
  type UuidGeneratorInput,
  type UuidGeneratorOutput,
  type UuidComponents,
} from './uuid-generator.js';

export {
  HashGeneratorSchema,
  type HashGeneratorInput,
  type HashGeneratorOutput,
} from './hash-generator.js';

// ============================================================================
// Core Tools Registry
// ============================================================================

import type { ToolDefinition } from '../../types/index.js';
import { StringManipulatorTool } from './string-manipulator.js';
import { DataTransformerTool } from './data-transformer.js';
import { DateTimeUtilsTool } from './datetime-utils.js';
import { MathCalculatorTool } from './math-calculator.js';
import { UuidGeneratorTool } from './uuid-generator.js';
import { HashGeneratorTool } from './hash-generator.js';

/**
 * Registry of all core tools with metadata
 */
export const CORE_TOOLS: ToolDefinition[] = [
  {
    name: StringManipulatorTool.name,
    description: StringManipulatorTool.description,
    version: '1.0.0',
    category: 'core',
    schema: StringManipulatorTool.schema,
    tags: ['string', 'text', 'manipulation', 'formatting'],
  },
  {
    name: DataTransformerTool.name,
    description: DataTransformerTool.description,
    version: '1.0.0',
    category: 'core',
    schema: DataTransformerTool.schema,
    tags: ['data', 'transform', 'array', 'object', 'manipulation'],
  },
  {
    name: DateTimeUtilsTool.name,
    description: DateTimeUtilsTool.description,
    version: '1.0.0',
    category: 'core',
    schema: DateTimeUtilsTool.schema,
    tags: ['date', 'time', 'datetime', 'timezone', 'formatting'],
  },
  {
    name: MathCalculatorTool.name,
    description: MathCalculatorTool.description,
    version: '1.0.0',
    category: 'core',
    schema: MathCalculatorTool.schema,
    tags: ['math', 'calculation', 'statistics', 'arithmetic'],
  },
  {
    name: UuidGeneratorTool.name,
    description: UuidGeneratorTool.description,
    version: '1.0.0',
    category: 'core',
    schema: UuidGeneratorTool.schema,
    tags: ['uuid', 'identifier', 'generation', 'validation'],
  },
  {
    name: HashGeneratorTool.name,
    description: HashGeneratorTool.description,
    version: '1.0.0',
    category: 'core',
    schema: HashGeneratorTool.schema,
    tags: ['hash', 'crypto', 'security', 'hmac'],
  },
];

/**
 * Get tool by name
 */
export function getCoreToolByName(name: string): ToolDefinition | undefined {
  return CORE_TOOLS.find((tool) => tool.name === name);
}

/**
 * Get all core tool names
 */
export function getCoreToolNames(): string[] {
  return CORE_TOOLS.map((tool) => tool.name);
}

/**
 * Search core tools by tag
 */
export function getCoreToolsByTag(tag: string): ToolDefinition[] {
  return CORE_TOOLS.filter((tool) => tool.tags?.includes(tag));
}
