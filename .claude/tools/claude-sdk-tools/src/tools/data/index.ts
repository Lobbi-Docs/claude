/**
 * @claude-sdk/tools - Data Processing Tools
 * Export all data processing tools for the Claude Agent SDK
 */

// JSON Processor
export {
  JsonProcessorSchema,
  jsonProcessorTool,
  executeJsonProcessor,
  type JsonProcessorInput,
} from './json-processor.js';

// CSV Processor
export {
  CsvProcessorSchema,
  csvProcessorTool,
  executeCsvProcessor,
  type CsvProcessorInput,
} from './csv-processor.js';

// XML Processor
export {
  XmlProcessorSchema,
  xmlProcessorTool,
  executeXmlProcessor,
  type XmlProcessorInput,
} from './xml-processor.js';

// YAML Processor
export {
  YamlProcessorSchema,
  yamlProcessorTool,
  executeYamlProcessor,
  type YamlProcessorInput,
} from './yaml-processor.js';

// Schema Validator
export {
  SchemaValidatorSchema,
  schemaValidatorTool,
  executeSchemaValidator,
  type SchemaValidatorInput,
  type ValidationResult,
} from './schema-validator.js';

// Data Merger
export {
  DataMergerSchema,
  dataMergerTool,
  executeDataMerger,
  type DataMergerInput,
} from './data-merger.js';

// Re-export all tools as an array for convenience
import { jsonProcessorTool } from './json-processor.js';
import { csvProcessorTool } from './csv-processor.js';
import { xmlProcessorTool } from './xml-processor.js';
import { yamlProcessorTool } from './yaml-processor.js';
import { schemaValidatorTool } from './schema-validator.js';
import { dataMergerTool } from './data-merger.js';

export const dataTools = [
  jsonProcessorTool,
  csvProcessorTool,
  xmlProcessorTool,
  yamlProcessorTool,
  schemaValidatorTool,
  dataMergerTool,
];
