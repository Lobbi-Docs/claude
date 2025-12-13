/**
 * HashiCorp Vault Client
 *
 * Supports both KV v1 and KV v2 secret engines with proper error handling.
 * Uses axios for HTTP communication with Vault API.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface VaultConfig {
  address: string;
  token: string;
  namespace?: string;
  apiVersion?: string;
}

export interface VaultReadOptions {
  version?: number;
}

export interface VaultWriteOptions {
  cas?: number; // Check-And-Set for KV v2
}

export interface VaultDeleteOptions {
  versions?: number[]; // For KV v2 soft delete
}

export interface VaultSecretData {
  [key: string]: any;
}

export interface VaultReadResponse {
  data: VaultSecretData;
  metadata?: {
    created_time: string;
    custom_metadata?: Record<string, string>;
    deletion_time: string;
    destroyed: boolean;
    version: number;
  };
}

export interface VaultListResponse {
  keys: string[];
}

export interface VaultHealthResponse {
  initialized: boolean;
  sealed: boolean;
  standby: boolean;
  performance_standby: boolean;
  replication_performance_mode: string;
  replication_dr_mode: string;
  server_time_utc: number;
  version: string;
  cluster_name?: string;
  cluster_id?: string;
}

export enum VaultKVVersion {
  V1 = 1,
  V2 = 2,
}

export class VaultError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

export class VaultClient {
  private client: AxiosInstance;
  private kvVersion: VaultKVVersion;
  private mountPath: string;

  constructor(config: VaultConfig, kvVersion: VaultKVVersion = VaultKVVersion.V2, mountPath: string = 'secret') {
    this.kvVersion = kvVersion;
    this.mountPath = mountPath;

    this.client = axios.create({
      baseURL: config.address,
      headers: {
        'X-Vault-Token': config.token,
        'Content-Type': 'application/json',
        ...(config.namespace && { 'X-Vault-Namespace': config.namespace }),
      },
      timeout: 10000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleError(error);
      }
    );
  }

  /**
   * Read a secret from Vault
   * @param path - Secret path (without mount point)
   * @param options - Read options (version for KV v2)
   * @returns Secret data and metadata
   */
  async read(path: string, options: VaultReadOptions = {}): Promise<VaultReadResponse> {
    try {
      const apiPath = this.buildReadPath(path, options.version);
      const response = await this.client.get(apiPath);

      if (this.kvVersion === VaultKVVersion.V2) {
        // KV v2 response format
        return {
          data: response.data.data.data,
          metadata: response.data.data.metadata,
        };
      } else {
        // KV v1 response format
        return {
          data: response.data.data,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Write a secret to Vault
   * @param path - Secret path (without mount point)
   * @param data - Secret data to write
   * @param options - Write options (cas for KV v2)
   * @returns Metadata for KV v2, void for KV v1
   */
  async write(path: string, data: VaultSecretData, options: VaultWriteOptions = {}): Promise<any> {
    try {
      const apiPath = this.buildWritePath(path);

      let payload: any;
      if (this.kvVersion === VaultKVVersion.V2) {
        payload = {
          data,
          options: options.cas !== undefined ? { cas: options.cas } : undefined,
        };
      } else {
        payload = data;
      }

      const response = await this.client.post(apiPath, payload);

      if (this.kvVersion === VaultKVVersion.V2) {
        return response.data.data;
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * List secrets at a path
   * @param path - Path to list (without mount point)
   * @returns Array of secret keys
   */
  async list(path: string): Promise<VaultListResponse> {
    try {
      const apiPath = this.buildListPath(path);
      const response = await this.client.request({
        method: 'LIST',
        url: apiPath,
      });

      return {
        keys: response.data.data.keys || [],
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a secret from Vault
   * @param path - Secret path (without mount point)
   * @param options - Delete options (versions for KV v2)
   */
  async delete(path: string, options: VaultDeleteOptions = {}): Promise<void> {
    try {
      if (this.kvVersion === VaultKVVersion.V2) {
        if (options.versions && options.versions.length > 0) {
          // Soft delete specific versions
          const apiPath = `/v1/${this.mountPath}/delete/${path}`;
          await this.client.post(apiPath, { versions: options.versions });
        } else {
          // Delete latest version (soft delete)
          const apiPath = `/v1/${this.mountPath}/data/${path}`;
          await this.client.delete(apiPath);
        }
      } else {
        // KV v1 delete
        const apiPath = `/v1/${this.mountPath}/${path}`;
        await this.client.delete(apiPath);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Permanently delete secret versions (KV v2 only)
   * @param path - Secret path (without mount point)
   * @param versions - Version numbers to destroy
   */
  async destroy(path: string, versions: number[]): Promise<void> {
    if (this.kvVersion !== VaultKVVersion.V2) {
      throw new VaultError('Destroy operation is only available for KV v2');
    }

    try {
      const apiPath = `/v1/${this.mountPath}/destroy/${path}`;
      await this.client.post(apiPath, { versions });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Undelete secret versions (KV v2 only)
   * @param path - Secret path (without mount point)
   * @param versions - Version numbers to undelete
   */
  async undelete(path: string, versions: number[]): Promise<void> {
    if (this.kvVersion !== VaultKVVersion.V2) {
      throw new VaultError('Undelete operation is only available for KV v2');
    }

    try {
      const apiPath = `/v1/${this.mountPath}/undelete/${path}`;
      await this.client.post(apiPath, { versions });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check Vault health status
   * @returns Health status information
   */
  async healthCheck(): Promise<VaultHealthResponse> {
    try {
      const response = await this.client.get('/v1/sys/health', {
        validateStatus: (status) => status < 600, // Accept any status code
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get mount info to determine KV version
   * @param mountPath - Mount path to check
   * @returns Mount information
   */
  async getMountInfo(mountPath: string): Promise<any> {
    try {
      const response = await this.client.get(`/v1/sys/mounts/${mountPath}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Private helper methods

  private buildReadPath(path: string, version?: number): string {
    if (this.kvVersion === VaultKVVersion.V2) {
      const versionParam = version !== undefined ? `?version=${version}` : '';
      return `/v1/${this.mountPath}/data/${path}${versionParam}`;
    } else {
      return `/v1/${this.mountPath}/${path}`;
    }
  }

  private buildWritePath(path: string): string {
    if (this.kvVersion === VaultKVVersion.V2) {
      return `/v1/${this.mountPath}/data/${path}`;
    } else {
      return `/v1/${this.mountPath}/${path}`;
    }
  }

  private buildListPath(path: string): string {
    if (this.kvVersion === VaultKVVersion.V2) {
      return `/v1/${this.mountPath}/metadata/${path}`;
    } else {
      return `/v1/${this.mountPath}/${path}`;
    }
  }

  private handleError(error: AxiosError): VaultError {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      // Common Vault errors
      switch (status) {
        case 400:
          return new VaultError(
            'Invalid request to Vault',
            'INVALID_REQUEST',
            status,
            data.errors
          );
        case 403:
          return new VaultError(
            'Permission denied - insufficient policy or invalid token',
            'PERMISSION_DENIED',
            status,
            data.errors
          );
        case 404:
          return new VaultError(
            'Secret not found at the specified path',
            'NOT_FOUND',
            status,
            data.errors
          );
        case 429:
          return new VaultError(
            'Rate limit exceeded',
            'RATE_LIMIT',
            status,
            data.errors
          );
        case 500:
          return new VaultError(
            'Vault internal server error',
            'INTERNAL_ERROR',
            status,
            data.errors
          );
        case 503:
          // Check if Vault is sealed
          if (data.errors && data.errors.some((e: string) => e.includes('sealed'))) {
            return new VaultError(
              'Vault is sealed',
              'VAULT_SEALED',
              status,
              data.errors
            );
          }
          return new VaultError(
            'Vault is unavailable',
            'UNAVAILABLE',
            status,
            data.errors
          );
        default:
          return new VaultError(
            data.errors?.join(', ') || `Vault request failed with status ${status}`,
            'UNKNOWN_ERROR',
            status,
            data.errors
          );
      }
    } else if (error.request) {
      return new VaultError(
        'No response from Vault - check connection and address',
        'NO_RESPONSE',
        undefined,
        ['Network error or Vault is unreachable']
      );
    } else {
      return new VaultError(
        `Failed to make request: ${error.message}`,
        'REQUEST_ERROR',
        undefined,
        [error.message]
      );
    }
  }

  /**
   * Set KV version for the client
   * @param version - KV version (1 or 2)
   */
  setKVVersion(version: VaultKVVersion): void {
    this.kvVersion = version;
  }

  /**
   * Set mount path for the client
   * @param mountPath - Mount path (e.g., 'secret', 'kv')
   */
  setMountPath(mountPath: string): void {
    this.mountPath = mountPath;
  }

  /**
   * Get current KV version
   * @returns Current KV version
   */
  getKVVersion(): VaultKVVersion {
    return this.kvVersion;
  }

  /**
   * Get current mount path
   * @returns Current mount path
   */
  getMountPath(): string {
    return this.mountPath;
  }
}

export default VaultClient;
