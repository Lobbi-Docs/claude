/**
 * GraphQL Schema Parser
 * Parses GraphQL SDL and converts to MCP tool definitions
 */

import { readFileSync } from 'fs';
import {
  buildSchema,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  isInputObjectType,
  isScalarType,
  isEnumType,
  isListType,
  isNonNullType,
  GraphQLField,
  GraphQLInputField,
  GraphQLType,
  GraphQLInputType,
} from 'graphql';
import type {
  ParsedAPI,
  MCPTool,
  JSONSchema,
  ParseResult,
  ValidationError,
} from '../types.js';

export class GraphQLParser {
  private schema: GraphQLSchema | null = null;
  private errors: ValidationError[] = [];

  /**
   * Load and parse a GraphQL SDL file
   */
  async loadSchema(filePath: string): Promise<ParseResult<GraphQLSchema>> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      this.schema = buildSchema(content);

      return { success: true, data: this.schema };
    } catch (error) {
      this.errors.push({
        path: 'file',
        message: `Failed to parse GraphQL schema: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
      return { success: false, errors: this.errors };
    }
  }

  /**
   * Parse the loaded GraphQL schema into MCP tools
   */
  parse(): ParseResult<ParsedAPI> {
    if (!this.schema) {
      return {
        success: false,
        errors: [
          {
            path: 'root',
            message: 'No schema loaded. Call loadSchema() first.',
            severity: 'error',
          },
        ],
      };
    }

    const tools: MCPTool[] = [];

    // Parse queries
    const queryType = this.schema.getQueryType();
    if (queryType) {
      const queryFields = queryType.getFields();
      for (const [fieldName, field] of Object.entries(queryFields)) {
        tools.push(this.convertFieldToTool('query', fieldName, field));
      }
    }

    // Parse mutations
    const mutationType = this.schema.getMutationType();
    if (mutationType) {
      const mutationFields = mutationType.getFields();
      for (const [fieldName, field] of Object.entries(mutationFields)) {
        tools.push(this.convertFieldToTool('mutation', fieldName, field));
      }
    }

    // Parse subscriptions (optional, as streaming support may vary)
    const subscriptionType = this.schema.getSubscriptionType();
    if (subscriptionType) {
      const subscriptionFields = subscriptionType.getFields();
      for (const [fieldName, field] of Object.entries(subscriptionFields)) {
        tools.push(this.convertFieldToTool('subscription', fieldName, field));
      }
    }

    const result: ParsedAPI = {
      tools,
      metadata: {
        title: 'GraphQL API',
        version: '1.0.0',
        description: 'Generated from GraphQL Schema',
        source: 'graphql',
      },
    };

    return {
      success: true,
      data: result,
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  /**
   * Convert a GraphQL field to an MCP tool
   */
  private convertFieldToTool(
    operationType: 'query' | 'mutation' | 'subscription',
    fieldName: string,
    field: GraphQLField<unknown, unknown>
  ): MCPTool {
    const toolName = `${operationType}_${this.toSnakeCase(fieldName)}`;
    const description =
      field.description ||
      `Execute ${operationType} ${fieldName} from GraphQL API`;

    const inputSchema = this.buildInputSchema(field);

    return {
      name: toolName,
      description,
      inputSchema,
      handler: `${operationType}:${fieldName}`,
    };
  }

  /**
   * Build JSON Schema for tool input from GraphQL field arguments
   */
  private buildInputSchema(
    field: GraphQLField<unknown, unknown>
  ): JSONSchema {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    for (const arg of field.args) {
      const argSchema = this.convertGraphQLType(arg.type);

      properties[arg.name] = {
        ...argSchema,
        description: arg.description || `Argument: ${arg.name}`,
      };

      // Check if argument is required (non-null)
      if (isNonNullType(arg.type)) {
        required.push(arg.name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Convert GraphQL type to JSON Schema
   */
  private convertGraphQLType(type: GraphQLType | GraphQLInputType): JSONSchema {
    // Handle NonNull wrapper
    if (isNonNullType(type)) {
      return this.convertGraphQLType(type.ofType);
    }

    // Handle List wrapper
    if (isListType(type)) {
      return {
        type: 'array',
        items: this.convertGraphQLType(type.ofType),
      };
    }

    // Handle Scalar types
    if (isScalarType(type)) {
      return this.convertScalarType(type);
    }

    // Handle Enum types
    if (isEnumType(type)) {
      return {
        type: 'string',
        enum: type.getValues().map((v) => v.value),
        description: type.description || undefined,
      };
    }

    // Handle Input Object types
    if (isInputObjectType(type)) {
      return this.convertInputObjectType(type);
    }

    // Default fallback
    return {
      type: 'object',
      description: type.toString(),
    };
  }

  /**
   * Convert GraphQL scalar to JSON Schema type
   */
  private convertScalarType(scalar: GraphQLScalarType): JSONSchema {
    const scalarName = scalar.name;

    switch (scalarName) {
      case 'String':
      case 'ID':
        return { type: 'string' };
      case 'Int':
        return { type: 'integer' };
      case 'Float':
        return { type: 'number' };
      case 'Boolean':
        return { type: 'boolean' };
      default:
        // Custom scalars - treat as string with description
        return {
          type: 'string',
          description: `Custom scalar: ${scalarName}`,
        };
    }
  }

  /**
   * Convert GraphQL Input Object to JSON Schema
   */
  private convertInputObjectType(inputType: GraphQLInputObjectType): JSONSchema {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    const fields = inputType.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      properties[fieldName] = {
        ...this.convertGraphQLType(field.type),
        description: field.description || undefined,
      };

      if (isNonNullType(field.type)) {
        required.push(fieldName);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      description: inputType.description || undefined,
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

/**
 * Convenience function to parse a GraphQL schema file
 */
export async function parseGraphQL(
  filePath: string
): Promise<ParseResult<ParsedAPI>> {
  const parser = new GraphQLParser();
  const loadResult = await parser.loadSchema(filePath);

  if (!loadResult.success) {
    return {
      success: false,
      errors: loadResult.errors,
    };
  }

  return parser.parse();
}
