/**
 * MCP Server Template
 * This template generates the main MCP server file
 */

import type { ParsedAPI } from '../types.js';

export function generateMCPServerTemplate(api: ParsedAPI): string {
  const { metadata, authentication } = api;

  const imports = `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
${api.baseUrl ? `import fetch from 'node-fetch';\n` : ''}`;

  const authConfig = generateAuthConfig(authentication);

  const serverClass = `
/**
 * ${metadata.title}
 * Version: ${metadata.version}
 * ${metadata.description || ''}
 * Generated from ${metadata.source} specification
 */
class ${toPascalCase(metadata.title)}MCPServer {
  private server: Server;
  ${api.baseUrl ? `private baseUrl: string = '${api.baseUrl}';` : ''}
  ${authConfig.fields}

  constructor() {
    this.server = new Server(
      {
        name: '${toKebabCase(metadata.title)}-mcp-server',
        version: '${metadata.version}',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    ${authConfig.initialization}
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
${api.tools.map((tool) => `        ${generateToolDefinition(tool)}`).join(',\n')}
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
${api.tools.map((tool) => generateToolHandler(tool, api)).join('\n\n')}

        default:
          throw new Error(\`Unknown tool: \${name}\`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('${metadata.title} MCP Server running on stdio');
  }
}

// Start the server
const server = new ${toPascalCase(metadata.title)}MCPServer();
server.start().catch(console.error);
`;

  return `${imports}\n${serverClass}`;
}

function generateAuthConfig(auth: ParsedAPI['authentication']): {
  fields: string;
  initialization: string;
} {
  if (!auth || auth.type === 'none') {
    return { fields: '', initialization: '' };
  }

  switch (auth.type) {
    case 'apiKey':
      return {
        fields: `private apiKey: string;`,
        initialization: `this.apiKey = process.env.${auth.envVar} || '';
    if (!this.apiKey) {
      console.error('Warning: ${auth.envVar} not set');
    }`,
      };
    case 'bearer':
      return {
        fields: `private bearerToken: string;`,
        initialization: `this.bearerToken = process.env.${auth.envVar} || '';
    if (!this.bearerToken) {
      console.error('Warning: ${auth.envVar} not set');
    }`,
      };
    case 'basic':
      return {
        fields: `private basicAuth: string;`,
        initialization: `this.basicAuth = process.env.${auth.envVar} || '';
    if (!this.basicAuth) {
      console.error('Warning: ${auth.envVar} not set');
    }`,
      };
    default:
      return { fields: '', initialization: '' };
  }
}

function generateToolDefinition(tool: ParsedAPI['tools'][0]): string {
  return `{
          name: '${tool.name}',
          description: '${escapeString(tool.description)}',
          inputSchema: ${JSON.stringify(tool.inputSchema, null, 10).replace(/\n/g, '\n          ')}
        }`;
}

function generateToolHandler(
  tool: ParsedAPI['tools'][0],
  api: ParsedAPI
): string {
  const schemaValidation = generateSchemaValidation(tool);

  let handlerBody = '';

  if (api.metadata.source === 'openapi' && tool.handler) {
    // OpenAPI handler - HTTP request
    const [method, path] = tool.handler.split(' ');
    handlerBody = generateHTTPHandler(method, path, tool, api);
  } else if (api.metadata.source === 'graphql' && tool.handler) {
    // GraphQL handler
    const [operationType, fieldName] = tool.handler.split(':');
    handlerBody = generateGraphQLHandler(operationType, fieldName, tool);
  } else {
    // Stub handler
    handlerBody = `return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Tool ${tool.name} executed',
                  input: validatedArgs,
                }),
              },
            ],
          };`;
  }

  return `        case '${tool.name}': {
${schemaValidation}
          ${handlerBody}
        }`;
}

function generateSchemaValidation(tool: ParsedAPI['tools'][0]): string {
  const schemaName = `${toPascalCase(tool.name)}Schema`;

  const properties = tool.inputSchema.properties || {};
  const zodFields: string[] = [];

  for (const [key, prop] of Object.entries(properties)) {
    let zodType = 'z.any()';

    switch (prop.type) {
      case 'string':
        zodType = 'z.string()';
        if (prop.enum) {
          zodType = `z.enum([${prop.enum.map((e) => `'${e}'`).join(', ')}])`;
        }
        break;
      case 'number':
        zodType = 'z.number()';
        break;
      case 'integer':
        zodType = 'z.number().int()';
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'array':
        zodType = 'z.array(z.any())';
        break;
      case 'object':
        zodType = 'z.record(z.any())';
        break;
    }

    const isRequired = tool.inputSchema.required?.includes(key);
    if (!isRequired) {
      zodType += '.optional()';
    }

    if (prop.description) {
      zodType += `.describe('${escapeString(prop.description)}')`;
    }

    zodFields.push(`    ${key}: ${zodType}`);
  }

  return `          const ${schemaName} = z.object({
${zodFields.join(',\n')}
          });
          const validatedArgs = ${schemaName}.parse(args);`;
}

function generateHTTPHandler(
  method: string,
  path: string,
  tool: ParsedAPI['tools'][0],
  api: ParsedAPI
): string {
  const auth = api.authentication;
  let headers = `{
              'Content-Type': 'application/json',`;

  if (auth?.type === 'bearer') {
    headers += `\n              'Authorization': \`Bearer \${this.bearerToken}\`,`;
  } else if (auth?.type === 'apiKey' && auth.in === 'header') {
    headers += `\n              '${auth.name}': this.apiKey,`;
  }

  headers += `\n            }`;

  // Replace path parameters
  let urlPath = path;
  const pathParams = path.match(/\{([^}]+)\}/g) || [];
  for (const param of pathParams) {
    const paramName = param.slice(1, -1);
    urlPath = urlPath.replace(param, `\${validatedArgs.${paramName}}`);
  }

  const requestOptions = `{
              method: '${method}',
              headers: ${headers},${method !== 'GET' && method !== 'DELETE' ? `\n              body: JSON.stringify(validatedArgs),` : ''}
            }`;

  return `try {
            const response = await fetch(\`\${this.baseUrl}${urlPath}\`, ${requestOptions});
            const data = await response.json();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: error instanceof Error ? error.message : String(error),
                  }),
                },
              ],
              isError: true,
            };
          }`;
}

function generateGraphQLHandler(
  operationType: string,
  fieldName: string,
  tool: ParsedAPI['tools'][0]
): string {
  return `// GraphQL ${operationType}: ${fieldName}
          // TODO: Implement GraphQL client call
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  operation: '${operationType}',
                  field: '${fieldName}',
                  input: validatedArgs,
                  message: 'GraphQL handler not yet implemented. Add GraphQL client.',
                }),
              },
            ],
          };`;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function toKebabCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/-+/g, '-');
}

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}
