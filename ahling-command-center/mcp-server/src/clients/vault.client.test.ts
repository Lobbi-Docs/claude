/**
 * HashiCorp Vault Client Tests
 *
 * Tests for VaultClient with both KV v1 and KV v2 engines
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { VaultClient, VaultKVVersion, VaultError } from './vault.client.js';

// Mock axios
vi.mock('axios');

describe('VaultClient', () => {
  const mockConfig = {
    address: 'http://localhost:8200',
    token: 'test-token',
  };

  let client: VaultClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn((successHandler, errorHandler) => {
            mockAxiosInstance._errorHandler = errorHandler;
          }),
        },
      },
    };

    // Mock axios.create
    (axios.create as any).mockReturnValue(mockAxiosInstance);
  });

  describe('KV v2 Operations', () => {
    beforeEach(() => {
      client = new VaultClient(mockConfig, VaultKVVersion.V2, 'secret');
    });

    it('should read a secret successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            data: { username: 'test', password: 'secret' },
            metadata: {
              created_time: '2024-01-15T10:00:00Z',
              version: 1,
              destroyed: false,
            },
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.read('myapp/database');

      expect(result.data).toEqual({ username: 'test', password: 'secret' });
      expect(result.metadata?.version).toBe(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/secret/data/myapp/database');
    });

    it('should read a specific version', async () => {
      const mockResponse = {
        data: {
          data: {
            data: { username: 'test', password: 'old-secret' },
            metadata: {
              created_time: '2024-01-10T10:00:00Z',
              version: 2,
              destroyed: false,
            },
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.read('myapp/database', { version: 2 });

      expect(result.data).toEqual({ username: 'test', password: 'old-secret' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/secret/data/myapp/database?version=2');
    });

    it('should write a secret successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            created_time: '2024-01-15T10:00:00Z',
            version: 1,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const data = { username: 'test', password: 'secret' };
      const result = await client.write('myapp/database', data);

      expect(result.version).toBe(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/secret/data/myapp/database',
        { data, options: undefined }
      );
    });

    it('should write with Check-And-Set', async () => {
      const mockResponse = {
        data: {
          data: {
            created_time: '2024-01-15T10:00:00Z',
            version: 2,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const data = { username: 'test', password: 'new-secret' };
      await client.write('myapp/database', data, { cas: 1 });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/secret/data/myapp/database',
        { data, options: { cas: 1 } }
      );
    });

    it('should list secrets successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            keys: ['database', 'api-keys', 'certificates/'],
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.list('myapp/');

      expect(result.keys).toHaveLength(3);
      expect(result.keys).toContain('database');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'LIST',
        url: '/v1/secret/metadata/myapp/',
      });
    });

    it('should delete a secret (soft delete)', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.delete('myapp/database');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/v1/secret/data/myapp/database');
    });

    it('should delete specific versions', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.delete('myapp/database', { versions: [1, 2] });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/secret/delete/myapp/database',
        { versions: [1, 2] }
      );
    });

    it('should destroy versions permanently', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.destroy('myapp/database', [1, 2]);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/secret/destroy/myapp/database',
        { versions: [1, 2] }
      );
    });

    it('should undelete versions', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.undelete('myapp/database', [1, 2]);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/secret/undelete/myapp/database',
        { versions: [1, 2] }
      );
    });
  });

  describe('KV v1 Operations', () => {
    beforeEach(() => {
      client = new VaultClient(mockConfig, VaultKVVersion.V1, 'kv');
    });

    it('should read a secret successfully', async () => {
      const mockResponse = {
        data: {
          data: { username: 'test', password: 'secret' },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.read('legacy/secret');

      expect(result.data).toEqual({ username: 'test', password: 'secret' });
      expect(result.metadata).toBeUndefined();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/kv/legacy/secret');
    });

    it('should write a secret successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      const data = { username: 'test', password: 'secret' };
      await client.write('legacy/secret', data);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/kv/legacy/secret', data);
    });

    it('should list secrets successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            keys: ['secret1', 'secret2'],
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.list('legacy/');

      expect(result.keys).toEqual(['secret1', 'secret2']);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'LIST',
        url: '/v1/kv/legacy/',
      });
    });

    it('should delete a secret permanently', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.delete('legacy/secret');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/v1/kv/legacy/secret');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new VaultClient(mockConfig, VaultKVVersion.V2, 'secret');
    });

    it('should handle 404 Not Found error', async () => {
      const axiosError: any = {
        response: {
          status: 404,
          data: {
            errors: ['Secret not found'],
          },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(axiosError);

      // Manually call error handler to simulate interceptor
      const vaultError = mockAxiosInstance._errorHandler(axiosError);

      expect(vaultError).toBeInstanceOf(VaultError);
      expect(vaultError.code).toBe('NOT_FOUND');
      expect(vaultError.statusCode).toBe(404);
    });

    it('should handle 403 Permission Denied error', async () => {
      const axiosError: any = {
        response: {
          status: 403,
          data: {
            errors: ['Permission denied'],
          },
        },
      };

      const vaultError = mockAxiosInstance._errorHandler(axiosError);

      expect(vaultError).toBeInstanceOf(VaultError);
      expect(vaultError.code).toBe('PERMISSION_DENIED');
      expect(vaultError.statusCode).toBe(403);
    });

    it('should handle 503 Vault Sealed error', async () => {
      const axiosError: any = {
        response: {
          status: 503,
          data: {
            errors: ['Vault is sealed'],
          },
        },
      };

      const vaultError = mockAxiosInstance._errorHandler(axiosError);

      expect(vaultError).toBeInstanceOf(VaultError);
      expect(vaultError.code).toBe('VAULT_SEALED');
      expect(vaultError.statusCode).toBe(503);
    });

    it('should handle network errors', async () => {
      const axiosError: any = {
        request: {},
        message: 'Network error',
      };

      const vaultError = mockAxiosInstance._errorHandler(axiosError);

      expect(vaultError).toBeInstanceOf(VaultError);
      expect(vaultError.code).toBe('NO_RESPONSE');
      expect(vaultError.message).toContain('No response from Vault');
    });

    it('should handle request setup errors', async () => {
      const axiosError: any = {
        message: 'Request setup failed',
      };

      const vaultError = mockAxiosInstance._errorHandler(axiosError);

      expect(vaultError).toBeInstanceOf(VaultError);
      expect(vaultError.code).toBe('REQUEST_ERROR');
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      client = new VaultClient(mockConfig, VaultKVVersion.V2, 'secret');
    });

    it('should check health successfully', async () => {
      const mockResponse = {
        data: {
          initialized: true,
          sealed: false,
          standby: false,
          performance_standby: false,
          replication_performance_mode: 'disabled',
          replication_dr_mode: 'disabled',
          server_time_utc: 1705320000,
          version: '1.15.0',
          cluster_name: 'vault-cluster',
          cluster_id: 'abc123',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.healthCheck();

      expect(result.initialized).toBe(true);
      expect(result.sealed).toBe(false);
      expect(result.version).toBe('1.15.0');
    });
  });

  describe('Configuration', () => {
    it('should create client with namespace', () => {
      const configWithNamespace = {
        ...mockConfig,
        namespace: 'my-namespace',
      };

      new VaultClient(configWithNamespace, VaultKVVersion.V2, 'secret');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Vault-Namespace': 'my-namespace',
          }),
        })
      );
    });

    it('should allow changing KV version', () => {
      client = new VaultClient(mockConfig, VaultKVVersion.V2, 'secret');

      expect(client.getKVVersion()).toBe(VaultKVVersion.V2);

      client.setKVVersion(VaultKVVersion.V1);

      expect(client.getKVVersion()).toBe(VaultKVVersion.V1);
    });

    it('should allow changing mount path', () => {
      client = new VaultClient(mockConfig, VaultKVVersion.V2, 'secret');

      expect(client.getMountPath()).toBe('secret');

      client.setMountPath('kv');

      expect(client.getMountPath()).toBe('kv');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      client = new VaultClient(mockConfig, VaultKVVersion.V2, 'secret');
    });

    it('should reject destroy operation for KV v1', async () => {
      const v1Client = new VaultClient(mockConfig, VaultKVVersion.V1, 'kv');

      await expect(v1Client.destroy('path', [1])).rejects.toThrow(
        'Destroy operation is only available for KV v2'
      );
    });

    it('should reject undelete operation for KV v1', async () => {
      const v1Client = new VaultClient(mockConfig, VaultKVVersion.V1, 'kv');

      await expect(v1Client.undelete('path', [1])).rejects.toThrow(
        'Undelete operation is only available for KV v2'
      );
    });

    it('should handle empty keys list', async () => {
      const mockResponse = {
        data: {
          data: {
            keys: [],
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.list('empty/');

      expect(result.keys).toEqual([]);
    });

    it('should handle missing keys in list response', async () => {
      const mockResponse = {
        data: {
          data: {},
        },
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.list('path/');

      expect(result.keys).toEqual([]);
    });
  });
});
