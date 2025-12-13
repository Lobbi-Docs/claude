# Docker Tools Module - Ahling Command Center MCP

This module provides Docker and Docker Compose management capabilities for the Ahling Command Center MCP server.

## Overview

The Docker tools module enables Claude to interact with Docker containers, manage services, and orchestrate infrastructure through the Model Context Protocol.

## Architecture

```
src/
├── clients/
│   └── docker.client.ts       # Docker client using dockerode
└── tools/
    └── docker/
        └── index.ts           # MCP tool registration and handlers
```

## Components

### 1. Docker Client (`docker.client.ts`)

The Docker client uses `dockerode` for native Docker API interactions and `child_process` for Docker Compose commands.

**Key Methods:**

- `listContainers(all, filters)` - List containers with optional filtering
- `getContainerLogs(containerId, tail, since)` - Retrieve container logs
- `getContainerStats(containerId)` - Get real-time resource usage statistics
- `composeUp(options)` - Start services using Docker Compose
- `composeDown(options)` - Stop and remove Docker Compose services
- `healthCheck()` - Verify Docker daemon connectivity and get system info

**Example Usage:**

```typescript
import { dockerClient } from './clients/docker.client.js';

// List running containers
const containers = await dockerClient.listContainers(false);

// Get logs from a container
const logs = await dockerClient.getContainerLogs('my-container', 100);

// Start services with Docker Compose
await dockerClient.composeUp({
  composeFile: 'docker-compose.yml',
  services: ['web', 'db'],
  build: true
});
```

### 2. Docker Tools (`tools/docker/index.ts`)

MCP tool definitions and handlers that expose Docker functionality to Claude.

## Available Tools

### `docker_ps`

List Docker containers with optional filters.

**Parameters:**
- `all` (boolean, optional) - Show all containers (default: false, only running)
- `filters` (object, optional) - Filter containers
  - `name` (string[]) - Filter by container name
  - `status` (string[]) - Filter by status (running, exited, paused, etc.)
  - `label` (string[]) - Filter by labels (e.g., ["app=web"])

**Example:**
```json
{
  "all": true,
  "filters": {
    "status": ["running"],
    "label": ["app=web"]
  }
}
```

**Response:**
```json
{
  "count": 2,
  "containers": [
    {
      "id": "abc123def456",
      "name": "my-web-app",
      "image": "nginx:latest",
      "state": "running",
      "status": "Up 2 hours",
      "created": 1702512000,
      "ports": [
        {
          "privatePort": 80,
          "publicPort": 8080,
          "type": "tcp"
        }
      ]
    }
  ]
}
```

### `docker_logs`

Get logs from a Docker container.

**Parameters:**
- `containerId` (string, required) - Container ID or name
- `tail` (number, optional) - Number of lines from end (default: 100)
- `since` (string, optional) - Show logs since timestamp or relative time

**Example:**
```json
{
  "containerId": "my-web-app",
  "tail": 50,
  "since": "10m"
}
```

**Response:**
```json
{
  "containerId": "my-web-app",
  "tail": 50,
  "since": "10m",
  "logs": "[2024-01-01T10:00:00] Starting server...\n[2024-01-01T10:00:01] Server listening on port 80"
}
```

### `docker_stats`

Get resource usage statistics for a container.

**Parameters:**
- `containerId` (string, required) - Container ID or name

**Example:**
```json
{
  "containerId": "my-web-app"
}
```

**Response:**
```json
{
  "container_id": "my-web-app",
  "name": "my-web-app",
  "cpu_percent": 12.5,
  "memory_usage": "256 MB",
  "memory_limit": "512 MB",
  "memory_percent": 50.0,
  "network_rx": "1.2 GB",
  "network_tx": "500 MB",
  "block_read": "100 MB",
  "block_write": "50 MB",
  "pids": 15
}
```

### `docker_compose_up`

Start services using Docker Compose.

**Parameters:**
- `composeFile` (string, optional) - Path to compose file (default: "docker-compose.yml")
- `projectDirectory` (string, optional) - Project directory (default: current working directory)
- `services` (string[], optional) - Specific services to start (default: all)
- `build` (boolean, optional) - Build images before starting (default: false)
- `detach` (boolean, optional) - Run in background (default: true)

**Example:**
```json
{
  "composeFile": "docker-compose.yml",
  "services": ["web", "redis"],
  "build": true,
  "detach": true
}
```

**Response:**
```json
{
  "success": true,
  "composeFile": "docker-compose.yml",
  "projectDirectory": "/app",
  "services": ["web", "redis"],
  "output": "Creating network \"app_default\" with the default driver\nCreating app_redis_1 ... done\nCreating app_web_1   ... done"
}
```

### `docker_compose_down`

Stop and remove containers, networks created by Docker Compose.

**Parameters:**
- `composeFile` (string, optional) - Path to compose file (default: "docker-compose.yml")
- `projectDirectory` (string, optional) - Project directory (default: current working directory)
- `volumes` (boolean, optional) - Remove named volumes (default: false)
- `removeOrphans` (boolean, optional) - Remove orphan containers (default: true)

**Example:**
```json
{
  "composeFile": "docker-compose.yml",
  "volumes": true,
  "removeOrphans": true
}
```

**Response:**
```json
{
  "success": true,
  "composeFile": "docker-compose.yml",
  "projectDirectory": "/app",
  "volumes": true,
  "removeOrphans": true,
  "output": "Stopping app_web_1   ... done\nStopping app_redis_1 ... done\nRemoving app_web_1   ... done\nRemoving app_redis_1 ... done\nRemoving network app_default"
}
```

### `docker_health`

Check Docker daemon health and get system information.

**Parameters:** None

**Response:**
```json
{
  "status": "healthy",
  "version": "24.0.7",
  "info": {
    "containers": 10,
    "containersRunning": 5,
    "containersPaused": 0,
    "containersStopped": 5,
    "images": 25,
    "serverVersion": "24.0.7",
    "operatingSystem": "Ubuntu 22.04",
    "architecture": "x86_64",
    "memTotal": "16 GB",
    "cpus": 8
  }
}
```

## Installation

The Docker tools are already integrated into the Ahling Command Center MCP server. Ensure Docker is installed and accessible:

### Windows
Docker Desktop must be running with the named pipe available at `//./pipe/docker_engine`.

### Linux/macOS
Docker socket must be accessible at `/var/run/docker.sock`.

## Dependencies

- `dockerode` ^4.0.2 - Docker API client
- `@types/dockerode` ^3.3.23 - TypeScript types

## Configuration

No additional configuration is required. The Docker client automatically detects the platform and uses the appropriate socket path.

## Error Handling

All Docker operations include comprehensive error handling:

- **Connection Errors**: Returned when Docker daemon is not accessible
- **Container Not Found**: Returned when specified container doesn't exist
- **Compose Errors**: Captures and returns stderr output from docker-compose commands
- **Permission Errors**: Returned when insufficient permissions to access Docker

## Security Considerations

1. **Socket Access**: Ensure the MCP server has appropriate permissions to access the Docker socket
2. **Compose Files**: Validate compose file paths to prevent directory traversal attacks
3. **Resource Limits**: Consider implementing rate limiting for resource-intensive operations
4. **Log Sanitization**: Container logs are cleaned but may contain sensitive information

## Testing

```bash
# Build the MCP server
npm run build

# Test in development mode
npm run dev

# Test with Claude Desktop
# Add to Claude Desktop config:
{
  "mcpServers": {
    "ahling-command-center": {
      "command": "node",
      "args": ["/path/to/ahling-command-center/mcp-server/dist/index.js"]
    }
  }
}
```

## Common Use Cases

### Monitor Running Containers
```typescript
// List all running containers
const result = await dockerClient.listContainers(false);

// Check specific service
const webContainers = await dockerClient.listContainers(false, {
  name: ['web']
});
```

### Debug Container Issues
```typescript
// Get recent logs
const logs = await dockerClient.getContainerLogs('my-service', 100);

// Check resource usage
const stats = await dockerClient.getContainerStats('my-service');
```

### Manage Docker Compose Services
```typescript
// Start development environment
await dockerClient.composeUp({
  composeFile: 'docker-compose.dev.yml',
  build: true
});

// Stop and cleanup
await dockerClient.composeDown({
  composeFile: 'docker-compose.dev.yml',
  volumes: true
});
```

## Future Enhancements

- [ ] Container exec support for running commands
- [ ] Image management (pull, build, push)
- [ ] Volume and network management
- [ ] Docker Swarm support
- [ ] Kubernetes integration
- [ ] Container health monitoring
- [ ] Multi-host Docker management

## Contributing

When adding new Docker tools:

1. Add methods to `DockerClient` class in `docker.client.ts`
2. Define tool schemas in `tools/docker/index.ts`
3. Add handler cases in `handleDockerTool` function
4. Update this README with usage examples
5. Add TypeScript types for parameters and responses

## License

MIT
