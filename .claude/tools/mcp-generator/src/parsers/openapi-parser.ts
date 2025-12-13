/**
 * OpenAPI 3.0/3.1 Specification Parser
 * Parses OpenAPI specs and converts them to MCP tool definitions
 */

import { readFileSync } from 'fs';
import { parse as parseYAML } from 'yaml';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type {
  ParsedAPI,
  MCPTool,
  JSONSchema,
  AuthenticationConfig,
  ParseResult,
  ValidationError,
} from '../types.js';

type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type RequestBodyObject =
  | OpenAPIV3.RequestBodyObject
  | OpenAPIV3_1.RequestBodyObject;
type SecuritySchemeObject =
  | OpenAPIV3.SecuritySchemeObject
  | OpenAPIV3_1.SecuritySchemeObject;

export class OpenAPIParser {
  private spec: OpenAPIDocument | null = null;
  private errors: ValidationError[] = [];

  /**
   * Load and parse an OpenAPI specification file
   */
  async loadSpec(filePath: string): Promise<ParseResult<OpenAPIDocument>> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const isYAML = filePath.endsWith('.yaml') || filePath.endsWith('.yml');

      this.spec = isYAML ? parseYAML(content) : JSON.parse(content);

      if (!this.spec || !this.spec.openapi) {
        this.errors.push({
          path: 'root',
          message: 'Invalid OpenAPI document: missing openapi version',
          severity: 'error',
        });
        return { success: false, errors: this.errors };
      }

      const version = this.spec.openapi;
      if (!version.startsWith('3.0') && !version.startsWith('3.1')) {
        this.errors.push({
          path: 'openapi',
          message: `Unsupported OpenAPI version: ${version}. Only 3.0 and 3.1 are supported.`,
          severity: 'error',
        });
        return { success: false, errors: this.errors };
      }

      return { success: true, data: this.spec };
    } catch (error) {
      this.errors.push({
        path: 'file',
        message: `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
      return { success: false, errors: this.errors };
    }
  }

  /**
   * Parse the loaded OpenAPI spec into MCP tools
   */
  parse(): ParseResult<ParsedAPI> {
    if (!this.spec) {
      return {
        success: false,
        errors: [
          {
            path: 'root',
            message: 'No specification loaded. Call loadSpec() first.',
            severity: 'error',
          },
        ],
      };
    }

    const tools: MCPTool[] = [];
    const paths = this.spec.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;

      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        const tool = this.convertOperationToTool(path, method, operation);
        if (tool) {
          tools.push(tool);
        }
      }
    }

    const authentication = this.extractAuthentication();
    const baseUrl = this.extractBaseUrl();

    const result: ParsedAPI = {
      tools,
      authentication,
      baseUrl,
      metadata: {
        title: this.spec.info.title,
        version: this.spec.info.version,
        description: this.spec.info.description,
        source: 'openapi',
      },
    };

    return {
      success: true,
      data: result,
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  /**
   * Convert an OpenAPI operation to an MCP tool
   */
  private convertOperationToTool(
    path: string,
    method: string,
    operation: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ): MCPTool | null {
    const toolName = this.generateToolName(path, method, operation);
    const description =
      operation.description ||
      operation.summary ||
      `${method.toUpperCase()} ${path}`;

    const inputSchema = this.buildInputSchema(path, operation);

    return {
      name: toolName,
      description,
      inputSchema,
      handler: `${method.toUpperCase()} ${path}`,
    };
  }

  /**
   * Generate a tool name from the operation
   */
  private generateToolName(
    path: string,
    method: string,
    operation: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ): string {
    if (operation.operationId) {
      return this.toSnakeCase(operation.operationId);
    }

    // Generate from path and method
    const segments = path
      .split('/')
      .filter((s) => s && !s.startsWith('{'))
      .map((s) => s.replace(/[^a-zA-Z0-9]/g, '_'));

    return [method, ...segments].join('_').toLowerCase();
  }

  /**
   * Build JSON Schema for tool input from OpenAPI operation
   */
  private buildInputSchema(
    path: string,
    operation: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ): JSONSchema {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    // Extract path parameters
    const pathParams = path.match(/\{([^}]+)\}/g) || [];
    for (const param of pathParams) {
      const paramName = param.slice(1, -1);
      properties[paramName] = {
        type: 'string',
        description: `Path parameter: ${paramName}`,
      };
      required.push(paramName);
    }

    // Extract query/header/cookie parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if ('$ref' in param) {
          this.errors.push({
            path: `${path}.parameters`,
            message: 'Parameter $ref not supported yet',
            severity: 'warning',
          });
          continue;
        }

        const p = param as ParameterObject;
        if (p.in === 'path') continue; // Already handled

        const schema = this.convertSchemaObject(p.schema as SchemaObject);
        properties[p.name] = {
          ...schema,
          description: p.description || `${p.in} parameter: ${p.name}`,
        };

        if (p.required) {
          required.push(p.name);
        }
      }
    }

    // Extract request body
    if (operation.requestBody) {
      const requestBody = operation.requestBody as RequestBodyObject;
      const content = requestBody.content?.['application/json'];

      if (content?.schema) {
        const bodySchema = this.convertSchemaObject(
          content.schema as SchemaObject
        );
        if (bodySchema.type === 'object' && bodySchema.properties) {
          // Merge body properties into top level
          Object.assign(properties, bodySchema.properties);
          if (bodySchema.required) {
            required.push(...bodySchema.required);
          }
        } else {
          properties.body = bodySchema;
          if (requestBody.required) {
            required.push('body');
          }
        }
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Convert OpenAPI schema object to JSON Schema
   */
  private convertSchemaObject(schema: SchemaObject | undefined): JSONSchema {
    if (!schema) {
      return { type: 'string' };
    }

    if ('$ref' in schema) {
      // TODO: Resolve $ref
      this.errors.push({
        path: 'schema',
        message: 'Schema $ref not fully supported yet',
        severity: 'warning',
      });
      return { type: 'object' };
    }

    const result: JSONSchema = {
      type: (schema.type as string) || 'object',
      description: schema.description,
    };

    if (schema.properties) {
      result.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        result.properties[key] = this.convertSchemaObject(
          value as SchemaObject
        );
      }
    }

    if (schema.required) {
      result.required = schema.required;
    }

    if ('items' in schema && schema.items) {
      result.items = this.convertSchemaObject(schema.items as SchemaObject);
    }

    if ('enum' in schema && schema.enum) {
      result.enum = schema.enum as string[];
    }

    if (schema.additionalProperties !== undefined) {
      result.additionalProperties =
        typeof schema.additionalProperties === 'boolean'
          ? schema.additionalProperties
          : undefined;
    }

    return result;
  }

  /**
   * Extract authentication configuration
   */
  private extractAuthentication(): AuthenticationConfig {
    if (!this.spec?.components?.securitySchemes) {
      return { type: 'none' };
    }

    // Get the first security scheme
    const schemes = Object.values(this.spec.components.securitySchemes);
    if (schemes.length === 0) {
      return { type: 'none' };
    }

    const scheme = schemes[0] as SecuritySchemeObject;

    if ('type' in scheme) {
      switch (scheme.type) {
        case 'apiKey':
          return {
            type: 'apiKey',
            name: scheme.name,
            in: scheme.in as 'header' | 'query' | 'cookie',
            envVar: `API_KEY`,
          };
        case 'http':
          if (scheme.scheme === 'bearer') {
            return {
              type: 'bearer',
              scheme: 'bearer',
              envVar: 'BEARER_TOKEN',
            };
          }
          return {
            type: 'basic',
            scheme: 'basic',
            envVar: 'BASIC_AUTH',
          };
        case 'oauth2':
          return {
            type: 'oauth2',
            envVar: 'OAUTH_TOKEN',
          };
        default:
          return { type: 'none' };
      }
    }

    return { type: 'none' };
  }

  /**
   * Extract base URL from servers
   */
  private extractBaseUrl(): string | undefined {
    if (this.spec?.servers && this.spec.servers.length > 0) {
      return this.spec.servers[0].url;
    }
    return undefined;
  }

  /**
   * Convert camelCase or PascalCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

/**
 * Convenience function to parse an OpenAPI spec file
 */
export async function parseOpenAPI(
  filePath: string
): Promise<ParseResult<ParsedAPI>> {
  const parser = new OpenAPIParser();
  const loadResult = await parser.loadSpec(filePath);

  if (!loadResult.success) {
    return {
      success: false,
      errors: loadResult.errors,
    };
  }

  return parser.parse();
}
