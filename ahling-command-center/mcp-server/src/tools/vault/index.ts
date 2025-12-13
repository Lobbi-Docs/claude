/**
 * HashiCorp Vault MCP Tools
 *
 * Provides MCP tools for interacting with HashiCorp Vault:
 * - vault_read: Read secrets from Vault
 * - vault_write: Write secrets to Vault
 * - vault_list: List secrets at a path
 * - vault_delete: Delete secrets from Vault
 */

import { z } from 'zod';
import { VaultClient, VaultKVVersion, VaultError } from '../../clients/vault.client.js';

// Zod schemas for tool input validation
const VaultReadSchema = z.object({
  path: z.string().describe('Secret path (without mount point, e.g., "myapp/database")'),
  version: z.number().optional().describe('Version number to read (KV v2 only)'),
  mountPath: z.string().optional().default('secret').describe('Mount path (default: "secret")'),
  kvVersion: z.number().optional().default(2).describe('KV version: 1 or 2 (default: 2)'),
});

const VaultWriteSchema = z.object({
  path: z.string().describe('Secret path (without mount point, e.g., "myapp/database")'),
  data: z.record(z.any()).describe('Secret data as key-value pairs'),
  cas: z.number().optional().describe('Check-And-Set version for optimistic locking (KV v2 only)'),
  mountPath: z.string().optional().default('secret').describe('Mount path (default: "secret")'),
  kvVersion: z.number().optional().default(2).describe('KV version: 1 or 2 (default: 2)'),
});

const VaultListSchema = z.object({
  path: z.string().describe('Path to list (without mount point, e.g., "myapp/" or "" for root)'),
  mountPath: z.string().optional().default('secret').describe('Mount path (default: "secret")'),
  kvVersion: z.number().optional().default(2).describe('KV version: 1 or 2 (default: 2)'),
});

const VaultDeleteSchema = z.object({
  path: z.string().describe('Secret path (without mount point, e.g., "myapp/database")'),
  versions: z.array(z.number()).optional().describe('Specific versions to delete (KV v2 only)'),
  mountPath: z.string().optional().default('secret').describe('Mount path (default: "secret")'),
  kvVersion: z.number().optional().default(2).describe('KV version: 1 or 2 (default: 2)'),
});

// Infer types from schemas for internal use
export type VaultReadInput = z.infer<typeof VaultReadSchema>;
export type VaultWriteInput = z.infer<typeof VaultWriteSchema>;
export type VaultListInput = z.infer<typeof VaultListSchema>;
export type VaultDeleteInput = z.infer<typeof VaultDeleteSchema>;

/**
 * Create Vault client from environment variables
 */
function createVaultClient(mountPath: string, kvVersion: number): VaultClient {
  const vaultAddress = process.env.VAULT_ADDR || process.env.VAULT_ADDRESS;
  const vaultToken = process.env.VAULT_TOKEN;
  const vaultNamespace = process.env.VAULT_NAMESPACE;

  if (!vaultAddress) {
    throw new Error('VAULT_ADDR or VAULT_ADDRESS environment variable is required');
  }

  if (!vaultToken) {
    throw new Error('VAULT_TOKEN environment variable is required');
  }

  const client = new VaultClient(
    {
      address: vaultAddress,
      token: vaultToken,
      namespace: vaultNamespace,
    },
    kvVersion === 1 ? VaultKVVersion.V1 : VaultKVVersion.V2,
    mountPath
  );

  return client;
}

/**
 * Format Vault error for user-friendly output
 */
function formatVaultError(error: unknown): string {
  if (error instanceof VaultError) {
    let message = `Vault Error (${error.code}): ${error.message}`;
    if (error.errors && error.errors.length > 0) {
      message += `\nDetails: ${error.errors.join(', ')}`;
    }
    return message;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Unknown error: ${String(error)}`;
}

/**
 * Register Vault tools with MCP server
 */
export function registerVaultTools(server: any) {
  // vault_read tool
  server.setRequestHandler('tools/call', async (request: any) => {
    if (request.params.name === 'vault_read') {
      try {
        const input = VaultReadSchema.parse(request.params.arguments);
        const client = createVaultClient(input.mountPath, input.kvVersion);

        const result = await client.read(input.path, {
          version: input.version,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  path: input.path,
                  data: result.data,
                  metadata: result.metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: formatVaultError(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    // vault_write tool
    if (request.params.name === 'vault_write') {
      try {
        const input = VaultWriteSchema.parse(request.params.arguments);
        const client = createVaultClient(input.mountPath, input.kvVersion);

        const result = await client.write(input.path, input.data, {
          cas: input.cas,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  path: input.path,
                  message: 'Secret written successfully',
                  metadata: result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: formatVaultError(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    // vault_list tool
    if (request.params.name === 'vault_list') {
      try {
        const input = VaultListSchema.parse(request.params.arguments);
        const client = createVaultClient(input.mountPath, input.kvVersion);

        const result = await client.list(input.path);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  path: input.path,
                  keys: result.keys,
                  count: result.keys.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: formatVaultError(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    // vault_delete tool
    if (request.params.name === 'vault_delete') {
      try {
        const input = VaultDeleteSchema.parse(request.params.arguments);
        const client = createVaultClient(input.mountPath, input.kvVersion);

        await client.delete(input.path, {
          versions: input.versions,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  path: input.path,
                  message: input.versions
                    ? `Deleted versions ${input.versions.join(', ')}`
                    : 'Secret deleted successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: formatVaultError(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    // Not a vault tool
    return undefined;
  });
}

/**
 * Get Vault tool definitions for MCP server
 */
export function getVaultToolDefinitions() {
  return [
    {
      name: 'vault_read',
      description:
        'Read a secret from HashiCorp Vault. Supports both KV v1 and KV v2 secret engines. For KV v2, you can optionally specify a version number to read historical versions.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Secret path without mount point (e.g., "myapp/database")',
          },
          version: {
            type: 'number',
            description: 'Version number to read (KV v2 only)',
          },
          mountPath: {
            type: 'string',
            description: 'Mount path (default: "secret")',
            default: 'secret',
          },
          kvVersion: {
            type: 'number',
            description: 'KV version: 1 or 2 (default: 2)',
            enum: [1, 2],
            default: 2,
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'vault_write',
      description:
        'Write a secret to HashiCorp Vault. Supports both KV v1 and KV v2 secret engines. For KV v2, you can use Check-And-Set (CAS) for optimistic locking.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Secret path without mount point (e.g., "myapp/database")',
          },
          data: {
            type: 'object',
            description: 'Secret data as key-value pairs',
            additionalProperties: true,
          },
          cas: {
            type: 'number',
            description: 'Check-And-Set version for optimistic locking (KV v2 only)',
          },
          mountPath: {
            type: 'string',
            description: 'Mount path (default: "secret")',
            default: 'secret',
          },
          kvVersion: {
            type: 'number',
            description: 'KV version: 1 or 2 (default: 2)',
            enum: [1, 2],
            default: 2,
          },
        },
        required: ['path', 'data'],
      },
    },
    {
      name: 'vault_list',
      description:
        'List secrets at a given path in HashiCorp Vault. Returns an array of key names. Supports both KV v1 and KV v2 secret engines.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to list without mount point (e.g., "myapp/" or "" for root)',
          },
          mountPath: {
            type: 'string',
            description: 'Mount path (default: "secret")',
            default: 'secret',
          },
          kvVersion: {
            type: 'number',
            description: 'KV version: 1 or 2 (default: 2)',
            enum: [1, 2],
            default: 2,
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'vault_delete',
      description:
        'Delete a secret from HashiCorp Vault. For KV v2, this performs a soft delete by default. You can specify version numbers to delete specific versions, or use the destroy operation for permanent deletion.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Secret path without mount point (e.g., "myapp/database")',
          },
          versions: {
            type: 'array',
            items: {
              type: 'number',
            },
            description: 'Specific versions to delete (KV v2 only)',
          },
          mountPath: {
            type: 'string',
            description: 'Mount path (default: "secret")',
            default: 'secret',
          },
          kvVersion: {
            type: 'number',
            description: 'KV version: 1 or 2 (default: 2)',
            enum: [1, 2],
            default: 2,
          },
        },
        required: ['path'],
      },
    },
  ];
}

export default {
  registerVaultTools,
  getVaultToolDefinitions,
};
