/**
 * @claude-sdk/tools
 * Comprehensive custom tools library for Claude Agent SDK
 *
 * 35+ production-ready MCP tools across 6 categories:
 * - Core: String manipulation, data transformation, datetime, math, UUID, hashing
 * - API: HTTP client, GraphQL, WebSocket, REST builder, OAuth
 * - Data: JSON, CSV, XML, YAML processing, schema validation, data merging
 * - System: Environment, process execution, logging, metrics, caching
 * - Security: Encryption, tokens, password hashing, sanitization, secrets
 * - Testing: Mock server, data faker, assertions, benchmarks, snapshots
 *
 * @example
 * ```typescript
 * // Import specific tools
 * import { StringManipulatorTool, JsonProcessorTool } from '@claude-sdk/tools';
 *
 * // Use a tool
 * const result = await StringManipulatorTool.execute({
 *   operation: 'case_convert',
 *   input: 'hello world',
 *   options: { caseType: 'title' }
 * });
 *
 * // Import all tools for MCP server
 * import { getAllTools, createMCPServer } from '@claude-sdk/tools';
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  ToolResult,
  ToolErrorInfo,
  ToolMetadata,
  ToolContext,
  ToolLogger,
  ToolCache,
  ToolConfig,
  ToolDefinition,
  ToolCategory,
  ToolExecutor,
  MCPToolOptions,
  MCPServerConfig,
  ValidationResult,
  ValidationError as ValidationErrorType,
  DeepPartial,
  RequiredFields,
  AsyncFunction,
} from './types/index.js';

export { ToolResultSchema } from './types/index.js';

// ============================================================================
// Error Exports
// ============================================================================

export {
  ToolError,
  ValidationError,
  NetworkError,
  TimeoutError,
  SecurityError,
  ConfigurationError,
  ResourceError,
  RateLimitError,
  isToolError,
  isValidationError,
  isNetworkError,
  isTimeoutError,
  isSecurityError,
  isRateLimitError,
} from './types/errors.js';

export type {
  SecurityErrorCode,
  ResourceType,
} from './types/errors.js';

// ============================================================================
// Utility Exports
// ============================================================================

export {
  success,
  failure,
  createContext,
  generateRequestId,
  withTimeout,
  withRetry,
  wrapExecution,
  deepClone,
  deepMerge,
  isPlainObject,
  pick,
  omit,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  sleep,
  formatDuration,
  createLogger,
  generateUUID,
} from './utils/index.js';

// ============================================================================
// Core Tools
// ============================================================================

export {
  StringManipulatorTool,
  StringManipulatorSchema,
  DataTransformerTool,
  DataTransformerSchema,
  DateTimeUtilsTool,
  DateTimeUtilsSchema,
  MathCalculatorTool,
  MathCalculatorSchema,
  UuidGeneratorTool,
  UuidGeneratorSchema,
  HashGeneratorTool,
  HashGeneratorSchema,
} from './tools/core/index.js';

// ============================================================================
// API Tools
// ============================================================================

export {
  HttpClientTool,
  HttpClientSchema,
  GraphqlClientTool,
  GraphqlClientSchema,
  WebSocketClientTool,
  WebSocketClientSchema,
  RestApiBuilderTool,
  RestApiBuilderSchema,
  OAuthHandlerTool,
  OAuthHandlerSchema,
} from './tools/api/index.js';

// ============================================================================
// Data Tools
// ============================================================================

export {
  jsonProcessorTool,
  JsonProcessorSchema,
  csvProcessorTool,
  CsvProcessorSchema,
  xmlProcessorTool,
  XmlProcessorSchema,
  yamlProcessorTool,
  YamlProcessorSchema,
  schemaValidatorTool,
  SchemaValidatorSchema,
  dataMergerTool,
  DataMergerSchema,
  executeJsonProcessor,
  executeCsvProcessor,
  executeXmlProcessor,
  executeYamlProcessor,
  executeSchemaValidator,
  executeDataMerger,
  dataTools,
} from './tools/data/index.js';

// ============================================================================
// System Tools
// ============================================================================

export {
  EnvManagerTool,
  EnvManagerSchema,
  ProcessExecutorTool,
  ProcessExecutorSchema,
  LoggerTool,
  LoggerSchema,
  MetricsCollectorTool,
  MetricsCollectorSchema,
  CacheManagerTool,
  CacheManagerSchema,
} from './tools/system/index.js';

// ============================================================================
// Security Tools
// ============================================================================

export {
  EncryptorTool,
  EncryptorSchema,
  TokenGeneratorTool,
  TokenGeneratorSchema,
  PasswordHasherTool,
  PasswordHasherSchema,
  InputSanitizerTool,
  InputSanitizerSchema,
  SecretsManagerTool,
  SecretsManagerSchema,
} from './tools/security/index.js';

// ============================================================================
// Testing Tools
// ============================================================================

export {
  MockServerTool,
  MockServerSchema,
  DataFakerTool,
  DataFakerSchema,
  AssertionHelperTool,
  AssertionHelperSchema,
  BenchmarkRunnerTool,
  BenchmarkRunnerSchema,
  SnapshotTesterTool,
  SnapshotTesterSchema,
} from './tools/testing/index.js';

// ============================================================================
// MCP Server Integration
// ============================================================================

export { createMCPServer, startMCPServer } from './mcp-server.js';

// ============================================================================
// Claude Agent SDK Integration
// ============================================================================

export {
  getAllTools,
  getCategoryTools,
  getToolsByName,
  getToolManifest,
} from './agent-sdk-integration.js';

export type { AgentSdkTool } from './agent-sdk-integration.js';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '1.0.0';

// ============================================================================
// Tool Categories for Reference
// ============================================================================

export const TOOL_CATEGORIES = {
  core: [
    'string_manipulator',
    'data_transformer',
    'datetime_utils',
    'math_calculator',
    'uuid_generator',
    'hash_generator',
  ],
  api: [
    'http_client',
    'graphql_client',
    'websocket_client',
    'rest_api_builder',
    'oauth_handler',
  ],
  data: [
    'json_processor',
    'csv_processor',
    'xml_processor',
    'yaml_processor',
    'schema_validator',
    'data_merger',
  ],
  system: [
    'env_manager',
    'process_executor',
    'logger',
    'metrics_collector',
    'cache_manager',
  ],
  security: [
    'encryptor',
    'token_generator',
    'password_hasher',
    'input_sanitizer',
    'secrets_manager',
  ],
  testing: [
    'mock_server',
    'data_faker',
    'assertion_helper',
    'benchmark_runner',
    'snapshot_tester',
  ],
} as const;

export const TOTAL_TOOLS = Object.values(TOOL_CATEGORIES).flat().length;
