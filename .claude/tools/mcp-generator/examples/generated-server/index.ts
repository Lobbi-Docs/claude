import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fetch from 'node-fetch';


/**
 * Simple User API
 * Version: 1.0.0
 * A simple API for managing users
 * Generated from openapi specification
 */
class SimpleUserAPIMCPServer {
  private server: Server;
  private baseUrl: string = 'https://api.example.com/v1';
  private apiKey: string;

  constructor() {
    this.server = new Server(
      {
        name: 'simple-user-a-p-i-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiKey = process.env.API_KEY || '';
    if (!this.apiKey) {
      console.error('Warning: API_KEY not set');
    }
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'list_users',
          description: 'List all users',
          inputSchema: {
                    "type": "object",
                    "properties": {
                              "limit": {
                                        "type": "integer",
                                        "description": "Maximum number of users to return"
                              },
                              "offset": {
                                        "type": "integer",
                                        "description": "Number of users to skip"
                              }
                    }
          }
        },
        {
          name: 'create_user',
          description: 'Create a new user',
          inputSchema: {
                    "type": "object",
                    "properties": {
                              "name": {
                                        "type": "string",
                                        "description": "User's full name"
                              },
                              "email": {
                                        "type": "string",
                                        "description": "User's email address"
                              }
                    },
                    "required": [
                              "name",
                              "email"
                    ]
          }
        },
        {
          name: 'get_user_by_id',
          description: 'Get user by ID',
          inputSchema: {
                    "type": "object",
                    "properties": {
                              "id": {
                                        "type": "string",
                                        "description": "Path parameter: id"
                              }
                    },
                    "required": [
                              "id"
                    ]
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'list_users': {
          const ListUsersSchema = z.object({
    limit: z.number().int().optional().describe('Maximum number of users to return'),
    offset: z.number().int().optional().describe('Number of users to skip')
          });
          const validatedArgs = ListUsersSchema.parse(args);
          try {
            const response = await fetch(`${this.baseUrl}/users`, {
              method: 'GET',
              headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey,
            },
            });
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
          }
        }

        case 'create_user': {
          const CreateUserSchema = z.object({
    name: z.string().describe('User\'s full name'),
    email: z.string().describe('User\'s email address')
          });
          const validatedArgs = CreateUserSchema.parse(args);
          try {
            const response = await fetch(`${this.baseUrl}/users`, {
              method: 'POST',
              headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey,
            },
              body: JSON.stringify(validatedArgs),
            });
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
          }
        }

        case 'get_user_by_id': {
          const GetUserByIdSchema = z.object({
    id: z.string().describe('Path parameter: id')
          });
          const validatedArgs = GetUserByIdSchema.parse(args);
          try {
            const response = await fetch(`${this.baseUrl}/users/${validatedArgs.id}`, {
              method: 'GET',
              headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey,
            },
            });
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
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple User API MCP Server running on stdio');
  }
}

// Start the server
const server = new SimpleUserAPIMCPServer();
server.start().catch(console.error);
