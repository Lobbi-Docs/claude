/**
 * Core TypeScript interfaces for API Integration Helper Plugin
 *
 * These interfaces define the data structures used throughout the plugin
 * for schema parsing, client generation, and API integration.
 */

// ============================================================================
// API Schema Definitions
// ============================================================================

export interface APISchema {
  type: 'openapi' | 'graphql' | 'asyncapi' | 'grpc';
  version: string;
  raw: unknown;
  parsed: ParsedSchema;
  metadata: SchemaMetadata;
}

export interface SchemaMetadata {
  title: string;
  description?: string;
  version: string;
  baseUrl?: string;
  servers?: ServerConfig[];
  authentication?: AuthenticationConfig;
  contact?: ContactInfo;
  license?: LicenseInfo;
}

export interface ServerConfig {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
  environment?: 'production' | 'staging' | 'development' | 'test';
}

export interface ServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

export interface ParsedSchema {
  endpoints: APIEndpoint[];
  types: TypeDefinition[];
  enums: EnumDefinition[];
  tags?: string[];
  securitySchemes?: Record<string, SecurityScheme>;
}

// ============================================================================
// API Endpoint Definitions
// ============================================================================

export interface APIEndpoint {
  id: string;
  path: string;
  method: HTTPMethod;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
  rateLimit?: RateLimitInfo;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required: boolean;
  schema: TypeSchema;
  example?: unknown;
  deprecated?: boolean;
}

export interface RequestBody {
  description?: string;
  required: boolean;
  content: Record<string, MediaType>;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, Header>;
}

export interface MediaType {
  schema: TypeSchema;
  examples?: Record<string, Example>;
  encoding?: Record<string, Encoding>;
}

export interface Header {
  description?: string;
  schema: TypeSchema;
  required?: boolean;
}

export interface Example {
  summary?: string;
  description?: string;
  value: unknown;
  externalValue?: string;
}

export interface Encoding {
  contentType?: string;
  headers?: Record<string, Header>;
  style?: string;
  explode?: boolean;
}

// ============================================================================
// Type System
// ============================================================================

export interface TypeDefinition {
  name: string;
  kind: 'object' | 'interface' | 'type' | 'class';
  properties: Record<string, Property>;
  required?: string[];
  additionalProperties?: boolean | TypeSchema;
  description?: string;
  example?: unknown;
  discriminator?: Discriminator;
}

export interface Property {
  type: TypeSchema;
  description?: string;
  required: boolean;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  example?: unknown;
  default?: unknown;
}

export interface TypeSchema {
  type: PrimitiveType | 'array' | 'object' | 'ref' | 'union' | 'intersection' | 'any';
  format?: string;
  items?: TypeSchema;
  properties?: Record<string, TypeSchema>;
  required?: string[];
  ref?: string; // Reference to another type
  oneOf?: TypeSchema[];
  anyOf?: TypeSchema[];
  allOf?: TypeSchema[];
  nullable?: boolean;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
  default?: unknown;
  description?: string;
}

export type PrimitiveType = 'string' | 'number' | 'integer' | 'boolean' | 'null';

export interface EnumDefinition {
  name: string;
  values: EnumValue[];
  description?: string;
}

export interface EnumValue {
  key: string;
  value: string | number;
  description?: string;
  deprecated?: boolean;
}

export interface Discriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

// ============================================================================
// Authentication & Security
// ============================================================================

export interface AuthenticationConfig {
  type: AuthType;
  scheme?: SecurityScheme;
  config: AuthConfig;
}

export type AuthType =
  | 'oauth2'
  | 'api-key'
  | 'jwt'
  | 'bearer'
  | 'basic'
  | 'digest'
  | 'mutual-tls'
  | 'custom';

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  description?: string;
  name?: string; // For apiKey
  in?: 'query' | 'header' | 'cookie'; // For apiKey
  scheme?: string; // For http (bearer, basic, etc.)
  bearerFormat?: string; // For http bearer
  flows?: OAuth2Flows; // For oauth2
  openIdConnectUrl?: string; // For openIdConnect
}

export interface OAuth2Flows {
  implicit?: OAuth2Flow;
  password?: OAuth2Flow;
  clientCredentials?: OAuth2Flow;
  authorizationCode?: OAuth2Flow;
}

export interface OAuth2Flow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface SecurityRequirement {
  scheme: string;
  scopes?: string[];
}

export type AuthConfig =
  | OAuth2Config
  | APIKeyConfig
  | JWTConfig
  | BasicAuthConfig
  | BearerAuthConfig
  | CustomAuthConfig;

export interface OAuth2Config {
  type: 'oauth2';
  flow: 'authorization-code' | 'client-credentials' | 'implicit' | 'password' | 'pkce';
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: string[];
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  usePKCE?: boolean;
  codeVerifier?: string;
  tokenStorage: 'memory' | 'localstorage' | 'sessionstorage' | 'secure-cookie' | 'keychain';
}

export interface APIKeyConfig {
  type: 'api-key';
  location: 'header' | 'query' | 'cookie';
  name: string;
  prefix?: string; // e.g., "Bearer ", "Token "
}

export interface JWTConfig {
  type: 'jwt';
  location: 'header' | 'cookie';
  headerName?: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  secret?: string;
  publicKey?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: number;
}

export interface BasicAuthConfig {
  type: 'basic';
  username: string;
  password: string;
  encoding?: 'base64' | 'utf8';
}

export interface BearerAuthConfig {
  type: 'bearer';
  token: string;
  format?: string; // e.g., "JWT"
}

export interface CustomAuthConfig {
  type: 'custom';
  handler: string; // Reference to custom auth handler function
  config: Record<string, unknown>;
}

// ============================================================================
// Client Generation
// ============================================================================

export interface ClientConfig {
  name: string;
  language: 'typescript' | 'javascript' | 'python' | 'go';
  outputPath: string;
  baseUrl: string;
  authentication?: AuthenticationConfig;
  options: ClientOptions;
}

export interface ClientOptions {
  strictTypes?: boolean;
  useZod?: boolean;
  useBrandedTypes?: boolean;
  generateMocks?: boolean;
  generateTests?: boolean;
  errorHandling?: ErrorHandlingOptions;
  rateLimiting?: RateLimitingOptions;
  retryPolicy?: RetryPolicyOptions;
  timeout?: number;
  headers?: Record<string, string>;
  interceptors?: InterceptorConfig[];
}

export interface InterceptorConfig {
  type: 'request' | 'response' | 'error';
  handler: string;
  priority?: number;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface ErrorHandlingOptions {
  useTypedErrors: boolean;
  errorMapping?: Record<number, string>; // HTTP status -> Error class
  includeStackTrace?: boolean;
  logErrors?: boolean;
  retryOnError?: boolean;
  circuitBreaker?: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  threshold: number; // Number of failures before opening
  timeout: number; // Time to wait before half-open
  monitoringPeriod: number; // Time window for counting failures
}

export interface APIError {
  name: string;
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
  stack?: string;
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitingOptions {
  enabled: boolean;
  strategy: 'token-bucket' | 'leaky-bucket' | 'fixed-window' | 'sliding-window';
  maxRequests: number;
  windowMs: number;
  maxConcurrent?: number;
  queueRequests?: boolean;
  priorityLevels?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

export interface RetryPolicyOptions {
  maxRetries: number;
  retryDelay: number; // Initial delay in ms
  retryStrategy: 'exponential' | 'linear' | 'constant';
  backoffMultiplier?: number; // For exponential
  maxRetryDelay?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
}

// ============================================================================
// Mock Server
// ============================================================================

export interface MockServerConfig {
  framework: 'msw' | 'prism' | 'json-server' | 'wiremock';
  port?: number;
  basePath?: string;
  handlers: MockHandler[];
  options: MockServerOptions;
}

export interface MockServerOptions {
  generateRealisticData: boolean;
  validateRequests: boolean;
  validateResponses: boolean;
  logRequests: boolean;
  cors: boolean;
  delay?: DelayConfig;
  errorRate?: number; // Percentage of requests that should fail
}

export interface DelayConfig {
  type: 'fixed' | 'random' | 'realistic';
  min?: number;
  max?: number;
  value?: number;
}

export interface MockHandler {
  endpoint: APIEndpoint;
  responses: MockResponse[];
  scenarios?: Scenario[];
}

export interface MockResponse {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
  delay?: number;
}

export interface Scenario {
  name: string;
  description?: string;
  triggers: ScenarioTrigger[];
  response: MockResponse;
}

export interface ScenarioTrigger {
  type: 'header' | 'query' | 'body' | 'path';
  condition: string; // Expression to evaluate
}

// ============================================================================
// Testing
// ============================================================================

export interface TestConfig {
  framework: 'vitest' | 'jest' | 'playwright' | 'supertest';
  outputPath: string;
  generateIntegrationTests: boolean;
  generateE2ETests: boolean;
  generateContractTests: boolean;
  coverage: CoverageConfig;
}

export interface CoverageConfig {
  enabled: boolean;
  threshold: number;
  reporters: ('text' | 'html' | 'lcov' | 'json')[];
  include?: string[];
  exclude?: string[];
}

export interface TestSuite {
  name: string;
  tests: Test[];
  setup?: string; // Setup code
  teardown?: string; // Teardown code
}

export interface Test {
  name: string;
  description?: string;
  endpoint: APIEndpoint;
  request: TestRequest;
  expectedResponse: ExpectedResponse;
  assertions: Assertion[];
}

export interface TestRequest {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ExpectedResponse {
  statusCode: number;
  body?: unknown;
  headers?: Record<string, string>;
  schema?: TypeSchema;
}

export interface Assertion {
  type: 'status' | 'body' | 'header' | 'schema' | 'custom';
  path?: string; // JSON path for body assertions
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'type' | 'custom';
  expected?: unknown;
  message?: string;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationConfig {
  enabled: boolean;
  validateRequests: boolean;
  validateResponses: boolean;
  strictMode: boolean;
  customValidators?: Record<string, string>; // Type name -> validator function
}

export interface Validator {
  name: string;
  schema: TypeSchema;
  zodSchema?: string; // Generated Zod schema code
  validate: (data: unknown) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  data?: unknown; // Parsed/coerced data
}

export interface ValidationError {
  path: string; // JSON path to the invalid field
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

// ============================================================================
// Documentation
// ============================================================================

export interface DocumentationConfig {
  format: 'markdown' | 'html' | 'json';
  outputPath: string;
  includeExamples: boolean;
  includeSchemas: boolean;
  includeErrorCodes: boolean;
  template?: string;
}

export interface APIDocumentation {
  metadata: SchemaMetadata;
  authentication: AuthenticationDoc;
  endpoints: EndpointDoc[];
  types: TypeDoc[];
  errors: ErrorDoc[];
  examples: CodeExample[];
  rateLimits?: RateLimitDoc;
}

export interface AuthenticationDoc {
  type: AuthType;
  description: string;
  steps: string[];
  codeExample: CodeExample;
}

export interface EndpointDoc {
  endpoint: APIEndpoint;
  description: string;
  authentication?: string[];
  rateLimit?: RateLimitInfo;
  examples: CodeExample[];
  errors: ErrorDoc[];
}

export interface TypeDoc {
  type: TypeDefinition;
  description: string;
  example?: unknown;
  usedBy: string[]; // List of endpoints that use this type
}

export interface ErrorDoc {
  code: string;
  statusCode: number;
  message: string;
  description?: string;
  recovery?: string;
}

export interface CodeExample {
  language: string;
  title?: string;
  description?: string;
  code: string;
  highlight?: number[]; // Line numbers to highlight
}

export interface RateLimitDoc {
  global?: RateLimitInfo;
  perEndpoint?: Record<string, RateLimitInfo>;
  quotas?: QuotaInfo[];
}

export interface QuotaInfo {
  name: string;
  limit: number;
  period: 'second' | 'minute' | 'hour' | 'day' | 'month';
  scope: 'user' | 'organization' | 'ip' | 'api-key';
}

// ============================================================================
// Contact & License Info
// ============================================================================

export interface ContactInfo {
  name?: string;
  email?: string;
  url?: string;
}

export interface LicenseInfo {
  name: string;
  url?: string;
}

// ============================================================================
// Plugin Orchestration
// ============================================================================

export interface IntegrationPlan {
  schema: APISchema;
  clientConfig: ClientConfig;
  steps: IntegrationStep[];
  estimatedDuration: number; // in minutes
  dependencies: string[];
}

export interface IntegrationStep {
  id: string;
  phase: 'discovery' | 'planning' | 'generation' | 'testing' | 'documentation';
  agent: string;
  description: string;
  inputs: string[];
  outputs: string[];
  estimatedDuration: number;
  required: boolean;
}

export interface GeneratedArtifacts {
  client: GeneratedFile;
  types: GeneratedFile;
  validators?: GeneratedFile;
  mockServer?: GeneratedFile;
  tests?: GeneratedFile[];
  documentation?: GeneratedFile;
  examples?: GeneratedFile[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description: string;
  dependencies?: string[];
}
