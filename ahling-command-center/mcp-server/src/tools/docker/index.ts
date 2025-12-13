/**
 * Docker Tools
 *
 * MCP tool registration for Docker and Docker Compose operations.
 * Includes Zod validation for type-safe input handling.
 */

import { z } from 'zod';
import { dockerClient, ContainerFilters, ComposeOptions, ComposeDownOptions } from '../../clients/docker.client.js';

/**
 * Zod Schemas for Input Validation
 */

const ContainerFiltersSchema = z.object({
  name: z.array(z.string()).optional().describe('Filter by container name'),
  status: z.array(z.enum(['created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead']))
    .optional().describe('Filter by status'),
  label: z.array(z.string()).optional().describe('Filter by label (e.g., ["app=web", "env=prod"])'),
}).optional();

const DockerPsSchema = z.object({
  all: z.boolean().optional().default(false).describe('Show all containers (default shows just running)'),
  filters: ContainerFiltersSchema.describe('Optional filters for containers'),
});

const DockerLogsSchema = z.object({
  containerId: z.string().min(1, 'Container ID is required').describe('Container ID or name'),
  tail: z.number().int().positive().optional().default(100).describe('Number of lines to show from the end'),
  since: z.string().optional().describe('Show logs since timestamp or relative time (e.g., "10m")'),
});

const DockerStatsSchema = z.object({
  containerId: z.string().min(1, 'Container ID is required').describe('Container ID or name'),
});

const DockerComposeUpSchema = z.object({
  composeFile: z.string().optional().default('docker-compose.yml').describe('Path to docker-compose.yml file'),
  projectDirectory: z.string().optional().describe('Project directory path'),
  services: z.array(z.string()).optional().default([]).describe('Specific services to start'),
  build: z.boolean().optional().default(false).describe('Build images before starting'),
  detach: z.boolean().optional().default(true).describe('Run containers in the background'),
  timeout: z.number().int().positive().optional().describe('Timeout in milliseconds'),
});

const DockerComposeDownSchema = z.object({
  composeFile: z.string().optional().default('docker-compose.yml').describe('Path to docker-compose.yml file'),
  projectDirectory: z.string().optional().describe('Project directory path'),
  volumes: z.boolean().optional().default(false).describe('Remove named volumes'),
  removeOrphans: z.boolean().optional().default(true).describe('Remove orphan containers'),
  timeout: z.number().int().positive().optional().describe('Timeout in milliseconds'),
});

const DockerHealthSchema = z.object({});

/**
 * Exported schemas for external use
 */
export const dockerSchemas = {
  ps: DockerPsSchema,
  logs: DockerLogsSchema,
  stats: DockerStatsSchema,
  composeUp: DockerComposeUpSchema,
  composeDown: DockerComposeDownSchema,
  health: DockerHealthSchema,
};

export type DockerPsInput = z.infer<typeof DockerPsSchema>;
export type DockerLogsInput = z.infer<typeof DockerLogsSchema>;
export type DockerStatsInput = z.infer<typeof DockerStatsSchema>;
export type DockerComposeUpInput = z.infer<typeof DockerComposeUpSchema>;
export type DockerComposeDownInput = z.infer<typeof DockerComposeDownSchema>;
export type DockerHealthInput = z.infer<typeof DockerHealthSchema>;

/**
 * Tool definitions with JSON schemas
 */
export const dockerTools = [
  {
    name: 'docker_ps',
    description: 'List Docker containers with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        all: {
          type: 'boolean',
          description: 'Show all containers (default shows just running)',
          default: false,
        },
        filters: {
          type: 'object',
          description: 'Optional filters for containers',
          properties: {
            name: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by container name',
            },
            status: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by status (created, restarting, running, removing, paused, exited, dead)',
            },
            label: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by label (e.g., ["app=web", "env=prod"])',
            },
          },
        },
      },
    },
  },
  {
    name: 'docker_logs',
    description: 'Get logs from a Docker container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Container ID or name',
        },
        tail: {
          type: 'number',
          description: 'Number of lines to show from the end (default: 100)',
          default: 100,
        },
        since: {
          type: 'string',
          description: 'Show logs since timestamp (e.g., "2024-01-01T00:00:00Z") or relative (e.g., "10m")',
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'docker_stats',
    description: 'Get resource usage statistics for a container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Container ID or name',
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'docker_compose_up',
    description: 'Start services using Docker Compose',
    inputSchema: {
      type: 'object',
      properties: {
        composeFile: {
          type: 'string',
          description: 'Path to docker-compose.yml file (default: docker-compose.yml)',
          default: 'docker-compose.yml',
        },
        projectDirectory: {
          type: 'string',
          description: 'Project directory path (default: current working directory)',
        },
        services: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific services to start (default: all services)',
        },
        build: {
          type: 'boolean',
          description: 'Build images before starting containers',
          default: false,
        },
        detach: {
          type: 'boolean',
          description: 'Run containers in the background',
          default: true,
        },
      },
    },
  },
  {
    name: 'docker_compose_down',
    description: 'Stop and remove containers, networks created by Docker Compose',
    inputSchema: {
      type: 'object',
      properties: {
        composeFile: {
          type: 'string',
          description: 'Path to docker-compose.yml file (default: docker-compose.yml)',
          default: 'docker-compose.yml',
        },
        projectDirectory: {
          type: 'string',
          description: 'Project directory path (default: current working directory)',
        },
        volumes: {
          type: 'boolean',
          description: 'Remove named volumes declared in the volumes section',
          default: false,
        },
        removeOrphans: {
          type: 'boolean',
          description: 'Remove containers for services not defined in the Compose file',
          default: true,
        },
      },
    },
  },
  {
    name: 'docker_health',
    description: 'Check Docker daemon health and get system information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Validate input and format validation errors
 */
function validateInput<T>(schema: z.ZodSchema<T>, args: unknown, toolName: string): T {
  const result = schema.safeParse(args);
  if (!result.success) {
    const errors = result.error.issues.map(issue =>
      `${issue.path.join('.')}: ${issue.message}`
    ).join('; ');
    throw new Error(`Invalid input for ${toolName}: ${errors}`);
  }
  return result.data;
}

/**
 * Handle Docker tool calls with Zod validation
 */
export async function handleDockerTool(name: string, args: unknown): Promise<unknown> {
  switch (name) {
    case 'docker_ps': {
      const validated = validateInput(DockerPsSchema, args, 'docker_ps');
      const containers = await dockerClient.listContainers(
        validated.all,
        validated.filters as ContainerFilters
      );
      return {
        count: containers.length,
        containers,
      };
    }

    case 'docker_logs': {
      const validated = validateInput(DockerLogsSchema, args, 'docker_logs');
      const logs = await dockerClient.getContainerLogs(
        validated.containerId,
        validated.tail,
        validated.since
      );
      return {
        containerId: validated.containerId,
        tail: validated.tail,
        since: validated.since || 'not specified',
        logs,
      };
    }

    case 'docker_stats': {
      const validated = validateInput(DockerStatsSchema, args, 'docker_stats');
      const stats = await dockerClient.getContainerStats(validated.containerId);
      return stats;
    }

    case 'docker_compose_up': {
      const validated = validateInput(DockerComposeUpSchema, args, 'docker_compose_up');
      const options: ComposeOptions = {
        composeFile: validated.composeFile,
        projectDirectory: validated.projectDirectory || process.cwd(),
        services: validated.services,
        build: validated.build,
        detach: validated.detach,
        timeout: validated.timeout,
      };

      const output = await dockerClient.composeUp(options);
      return {
        success: true,
        composeFile: options.composeFile,
        projectDirectory: options.projectDirectory,
        services: (options.services && options.services.length > 0) ? options.services : 'all',
        output,
      };
    }

    case 'docker_compose_down': {
      const validated = validateInput(DockerComposeDownSchema, args, 'docker_compose_down');
      const options: ComposeDownOptions = {
        composeFile: validated.composeFile,
        projectDirectory: validated.projectDirectory || process.cwd(),
        volumes: validated.volumes,
        removeOrphans: validated.removeOrphans,
        timeout: validated.timeout,
      };

      const output = await dockerClient.composeDown(options);
      return {
        success: true,
        composeFile: options.composeFile,
        projectDirectory: options.projectDirectory,
        volumes: options.volumes,
        removeOrphans: options.removeOrphans,
        output,
      };
    }

    case 'docker_health': {
      validateInput(DockerHealthSchema, args, 'docker_health');
      const health = await dockerClient.healthCheck();
      return health;
    }

    default:
      throw new Error(`Unknown Docker tool: ${name}`);
  }
}
