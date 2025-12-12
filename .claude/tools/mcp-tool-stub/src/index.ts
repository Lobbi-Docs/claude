import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/**
 * Agent Studio MCP Tool
 *
 * This is a Model Context Protocol (MCP) tool stub that provides
 * basic functionality for interacting with agents in Agent Studio.
 */

// Tool input schemas
const ExecuteAgentSchema = z.object({
  agentId: z.string().describe("The ID of the agent to execute"),
  parameters: z
    .record(z.any())
    .optional()
    .describe("Optional parameters for agent execution"),
});

const GetAgentStatusSchema = z.object({
  agentId: z.string().describe("The ID of the agent to check status"),
});

// MCP Server
class AgentStudioMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "agent-studio-mcp-tool",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "execute_agent",
          description:
            "Execute an AI agent with optional parameters. Returns the execution result.",
          inputSchema: {
            type: "object",
            properties: {
              agentId: {
                type: "string",
                description: "The ID of the agent to execute",
              },
              parameters: {
                type: "object",
                description: "Optional parameters for agent execution",
                additionalProperties: true,
              },
            },
            required: ["agentId"],
          },
        },
        {
          name: "get_agent_status",
          description:
            "Get the current status of an agent including health, last execution time, and metrics.",
          inputSchema: {
            type: "object",
            properties: {
              agentId: {
                type: "string",
                description: "The ID of the agent to check status",
              },
            },
            required: ["agentId"],
          },
        },
        {
          name: "list_agents",
          description: "List all available agents in the Agent Studio system.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "execute_agent": {
          const { agentId, parameters } = ExecuteAgentSchema.parse(args);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  agentId,
                  executionId: `exec-${Date.now()}`,
                  result: {
                    message: `Agent ${agentId} executed successfully`,
                    parameters,
                    timestamp: new Date().toISOString(),
                  },
                }),
              },
            ],
          };
        }

        case "get_agent_status": {
          const { agentId } = GetAgentStatusSchema.parse(args);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  agentId,
                  status: "active",
                  health: "healthy",
                  lastExecution: new Date(
                    Date.now() - 3600000
                  ).toISOString(),
                  metrics: {
                    totalExecutions: 142,
                    successRate: 0.98,
                    averageExecutionTime: 2.3,
                  },
                }),
              },
            ],
          };
        }

        case "list_agents": {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  agents: [
                    {
                      id: "code-review-agent",
                      name: "Code Review Agent",
                      status: "active",
                      type: "autonomous",
                    },
                    {
                      id: "documentation-agent",
                      name: "Documentation Agent",
                      status: "active",
                      type: "reactive",
                    },
                    {
                      id: "testing-agent",
                      name: "Testing Agent",
                      status: "inactive",
                      type: "autonomous",
                    },
                  ],
                }),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Agent Studio MCP Tool server running on stdio");
  }
}

// Start the server
const server = new AgentStudioMCPServer();
server.start().catch(console.error);
