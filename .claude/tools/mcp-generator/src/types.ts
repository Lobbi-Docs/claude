/**
 * Common types for MCP Generator
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler?: string;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchema;
  enum?: string[];
  description?: string;
}

export interface JSONSchemaProperty extends JSONSchema {
  description?: string;
  default?: unknown;
  format?: string;
}

export interface ParsedAPI {
  tools: MCPTool[];
  types?: Record<string, JSONSchema>;
  authentication?: AuthenticationConfig;
  baseUrl?: string;
  metadata: APIMetadata;
}

export interface APIMetadata {
  title: string;
  version: string;
  description?: string;
  source: 'openapi' | 'graphql';
}

export interface AuthenticationConfig {
  type: 'none' | 'apiKey' | 'bearer' | 'oauth2' | 'basic';
  scheme?: string;
  in?: 'header' | 'query' | 'cookie';
  name?: string;
  envVar?: string;
}

export interface GenerationOptions {
  serverName: string;
  outputDir: string;
  includeTypes?: boolean;
  includeValidation?: boolean;
  streaming?: boolean;
  typescript?: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}
