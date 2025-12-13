/**
 * Docker Client
 *
 * Provides Docker and Docker Compose operations using dockerode and child_process.
 * Includes timeout handling for compose operations and thread-safe initialization.
 */

import Docker from 'dockerode';
import { exec, ChildProcess } from 'child_process';

/** Default timeout for compose operations (5 minutes) */
const DEFAULT_COMPOSE_TIMEOUT = 5 * 60 * 1000;

/**
 * Execute a command with timeout support
 */
async function execWithTimeout(
  command: string,
  options: {
    cwd?: string;
    maxBuffer?: number;
    timeout?: number;
  } = {}
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = DEFAULT_COMPOSE_TIMEOUT, ...execOptions } = options;

  return new Promise((resolve, reject) => {
    let childProcess: ChildProcess;
    let timedOut = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (childProcess && !childProcess.killed) {
        childProcess.kill('SIGTERM');
        // Force kill after 10 seconds if still running
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 10000);
      }
    }, timeout);

    childProcess = exec(command, {
      ...execOptions,
      maxBuffer: execOptions.maxBuffer || 1024 * 1024 * 10,
    }, (error, stdout, stderr) => {
      clearTimeout(timeoutId);

      if (timedOut) {
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        return;
      }

      if (error) {
        reject(new Error(`${error.message}\n${stderr || ''}`));
        return;
      }

      resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

export interface ContainerFilters {
  name?: string[];
  status?: string[];
  label?: string[];
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: number;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
  }>;
  labels?: Record<string, string>;
}

export interface ContainerStats {
  container_id: string;
  name: string;
  cpu_percent: number;
  memory_usage: string;
  memory_limit: string;
  memory_percent: number;
  network_rx: string;
  network_tx: string;
  block_read: string;
  block_write: string;
  pids: number;
}

export interface ComposeOptions {
  composeFile?: string;
  projectDirectory?: string;
  services?: string[];
  build?: boolean;
  detach?: boolean;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
}

export interface ComposeDownOptions {
  composeFile?: string;
  projectDirectory?: string;
  volumes?: boolean;
  removeOrphans?: boolean;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
}

export class DockerClient {
  private docker: Docker;

  constructor() {
    // Initialize dockerode with default socket
    this.docker = new Docker({
      socketPath: process.platform === 'win32'
        ? '//./pipe/docker_engine'
        : '/var/run/docker.sock'
    });
  }

  /**
   * List containers
   */
  async listContainers(
    all: boolean = false,
    filters?: ContainerFilters
  ): Promise<ContainerInfo[]> {
    const dockerFilters: Record<string, string[]> = {};

    if (filters?.['name']) dockerFilters['name'] = filters['name'];
    if (filters?.['status']) dockerFilters['status'] = filters['status'];
    if (filters?.['label']) dockerFilters['label'] = filters['label'];

    const containers = await this.docker.listContainers({
      all,
      filters: Object.keys(dockerFilters).length > 0 ? dockerFilters as any : undefined,
    });

    return containers.map((container: any) => ({
      id: container.Id.substring(0, 12),
      name: container.Names[0]?.replace(/^\//, '') || '',
      image: container.Image,
      state: container.State,
      status: container.Status,
      created: container.Created,
      ports: container.Ports.map((port: any) => ({
        privatePort: port.PrivatePort,
        publicPort: port.PublicPort,
        type: port.Type,
      })),
      labels: container.Labels,
    }));
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerId: string,
    tail: number = 100,
    since?: string
  ): Promise<string> {
    const container = this.docker.getContainer(containerId);

    const stream = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      since: since || undefined,
      timestamps: true,
    });

    // Convert buffer to string and clean up Docker log formatting
    return this.cleanDockerLogs(stream.toString('utf-8'));
  }

  /**
   * Get container statistics
   */
  async getContainerStats(containerId: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    // Get one-shot stats (stream: false)
    const stats = await container.stats({ stream: false });

    // Calculate CPU percentage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                     (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage -
                        (stats.precpu_stats.system_cpu_usage || 0);
    const cpuPercent = systemDelta > 0
      ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100
      : 0;

    // Calculate memory
    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimit = stats.memory_stats.limit || 0;
    const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

    // Network I/O
    let networkRx = 0;
    let networkTx = 0;
    if (stats.networks) {
      for (const network of Object.values(stats.networks)) {
        const netStats = network as any;
        networkRx += netStats.rx_bytes || 0;
        networkTx += netStats.tx_bytes || 0;
      }
    }

    // Block I/O
    let blockRead = 0;
    let blockWrite = 0;
    if (stats.blkio_stats?.io_service_bytes_recursive) {
      for (const io of stats.blkio_stats.io_service_bytes_recursive) {
        if (io.op === 'Read') blockRead += io.value;
        if (io.op === 'Write') blockWrite += io.value;
      }
    }

    return {
      container_id: containerId,
      name: info.Name.replace(/^\//, ''),
      cpu_percent: Math.round(cpuPercent * 100) / 100,
      memory_usage: this.formatBytes(memoryUsage),
      memory_limit: this.formatBytes(memoryLimit),
      memory_percent: Math.round(memoryPercent * 100) / 100,
      network_rx: this.formatBytes(networkRx),
      network_tx: this.formatBytes(networkTx),
      block_read: this.formatBytes(blockRead),
      block_write: this.formatBytes(blockWrite),
      pids: stats.pids_stats?.current || 0,
    };
  }

  /**
   * Docker Compose Up
   * Includes timeout handling to prevent hanging operations
   */
  async composeUp(options: ComposeOptions = {}): Promise<string> {
    const {
      composeFile = 'docker-compose.yml',
      projectDirectory = process.cwd(),
      services = [],
      build = false,
      detach = true,
      timeout = DEFAULT_COMPOSE_TIMEOUT,
    } = options;

    let command = `docker compose -f "${composeFile}"`;

    command += ' up';

    if (detach) command += ' -d';
    if (build) command += ' --build';

    if (services.length > 0) {
      command += ` ${services.join(' ')}`;
    }

    try {
      const { stdout, stderr } = await execWithTimeout(command, {
        cwd: projectDirectory,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout,
      });

      return stdout + (stderr || '');
    } catch (error: any) {
      throw new Error(`Docker Compose Up failed: ${error.message}`);
    }
  }

  /**
   * Docker Compose Down
   * Includes timeout handling to prevent hanging operations
   */
  async composeDown(options: ComposeDownOptions = {}): Promise<string> {
    const {
      composeFile = 'docker-compose.yml',
      projectDirectory = process.cwd(),
      volumes = false,
      removeOrphans = true,
      timeout = DEFAULT_COMPOSE_TIMEOUT,
    } = options;

    let command = `docker compose -f "${composeFile}" down`;

    if (volumes) command += ' -v';
    if (removeOrphans) command += ' --remove-orphans';

    try {
      const { stdout, stderr } = await execWithTimeout(command, {
        cwd: projectDirectory,
        maxBuffer: 1024 * 1024 * 10,
        timeout,
      });

      return stdout + (stderr || '');
    } catch (error: any) {
      throw new Error(`Docker Compose Down failed: ${error.message}`);
    }
  }

  /**
   * Health check - verify Docker is accessible
   */
  async healthCheck(): Promise<{ status: string; version?: string; info?: any }> {
    try {
      const info = await this.docker.info();
      const version = await this.docker.version();

      return {
        status: 'healthy',
        version: version.Version,
        info: {
          containers: info.Containers,
          containersRunning: info.ContainersRunning,
          containersPaused: info.ContainersPaused,
          containersStopped: info.ContainersStopped,
          images: info.Images,
          serverVersion: info.ServerVersion,
          operatingSystem: info.OperatingSystem,
          architecture: info.Architecture,
          memTotal: this.formatBytes(info.MemTotal || 0),
          cpus: info.NCPU,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        info: { error: error.message },
      };
    }
  }

  /**
   * Helper: Clean Docker log formatting
   */
  private cleanDockerLogs(logs: string): string {
    // Remove Docker's 8-byte header from each log line
    return logs
      .split('\n')
      .map(line => {
        // Docker adds 8 bytes at start: [STREAM_TYPE][0][0][0][SIZE_BYTES]
        // We'll just remove non-printable characters at the start
        return line.replace(/^[\x00-\x08]+/, '');
      })
      .join('\n')
      .trim();
  }

  /**
   * Helper: Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }
}

/**
 * Thread-safe singleton instance management
 * Prevents race conditions during initialization
 */
let dockerClientInstance: DockerClient | null = null;
let initializationPromise: Promise<DockerClient> | null = null;

/**
 * Get or create Docker client instance (thread-safe)
 */
export function getDockerClient(): DockerClient {
  if (!dockerClientInstance) {
    dockerClientInstance = new DockerClient();
  }
  return dockerClientInstance;
}

/**
 * Get Docker client with async initialization verification
 * Use this when you need to ensure the client is ready
 */
export async function getDockerClientAsync(): Promise<DockerClient> {
  if (dockerClientInstance) {
    return dockerClientInstance;
  }

  // Prevent race conditions during initialization
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const client = new DockerClient();
    // Verify connectivity
    await client.healthCheck();
    dockerClientInstance = client;
    return client;
  })();

  try {
    return await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetDockerClient(): void {
  dockerClientInstance = null;
  initializationPromise = null;
}

// Export singleton instance (backward compatible)
export const dockerClient = getDockerClient();
