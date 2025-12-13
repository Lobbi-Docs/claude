/**
 * Secrets Management Examples
 *
 * Business Value: Demonstrates practical usage patterns for integrating
 * secure secret management into Claude orchestration workflows.
 *
 * Run examples:
 *   cd .claude/core
 *   npx tsx secrets/example.ts
 */

import { randomBytes } from 'crypto';
import { join } from 'path';
import { tmpdir } from 'os';
import { SecretEncryption } from './encryption.js';
import { LocalSecretProvider } from './providers/local.js';
import { EnvSecretProvider } from './providers/env.js';
import { SecretManager } from './secret-manager.js';
import { SecretAccessControl } from './access-control.js';

async function example1_BasicEncryption() {
  console.log('\n=== Example 1: Basic Encryption ===\n');

  // Generate a master key
  const masterKey = SecretEncryption.generateMasterKey();
  console.log('Generated master key:', masterKey.toString('base64').substring(0, 20) + '...');

  // Create encryption instance
  const encryption = new SecretEncryption(masterKey, 'key-1');

  // Encrypt a secret
  const plaintext = 'my-super-secret-api-key-abc123';
  const encrypted = encryption.encrypt(plaintext);

  console.log('Encrypted:', {
    ciphertext: encrypted.ciphertext.substring(0, 20) + '...',
    iv: encrypted.iv,
    algorithm: encrypted.algorithm,
  });

  // Decrypt the secret
  const decrypted = encryption.decrypt(encrypted);
  console.log('Decrypted:', decrypted);
  console.log('Match:', plaintext === decrypted);

  // Clean up
  encryption.destroy();
}

async function example2_LocalProvider() {
  console.log('\n=== Example 2: Local Provider ===\n');

  const storePath = join(tmpdir(), `secrets-example-${Date.now()}.enc.json`);
  const masterKey = SecretEncryption.generateMasterKey();

  console.log('Store path:', storePath);

  // Initialize local provider
  const provider = new LocalSecretProvider({
    storePath,
    masterKey,
    createIfMissing: true,
  });

  await provider.initialize();
  console.log('Provider initialized');

  // Set a secret
  await provider.set('api-key-stripe', 'sk_live_abc123xyz789', {
    scope: 'global',
    tags: ['production', 'payment'],
  });
  console.log('Set secret: api-key-stripe');

  // Get the secret
  const secret = await provider.get('api-key-stripe');
  console.log('Retrieved secret:', {
    name: secret?.metadata.name,
    value: secret?.value.substring(0, 10) + '...',
    version: secret?.metadata.version,
    tags: secret?.metadata.tags,
  });

  // List secrets
  const secrets = await provider.list();
  console.log('All secrets:', secrets.map((s) => s.name));

  // Rotate the secret
  await provider.rotate('api-key-stripe', {
    newValue: 'sk_live_new_value_xyz',
    actor: 'admin',
  });
  console.log('Rotated secret to version 2');

  // Get new version
  const rotated = await provider.get('api-key-stripe');
  console.log('New version:', rotated?.metadata.version);

  // Clean up
  await provider.close();
}

async function example3_EnvironmentProvider() {
  console.log('\n=== Example 3: Environment Provider ===\n');

  // Set environment variables
  process.env.CLAUDE_SECRET_API_KEY_GITHUB = 'ghp_abc123xyz789';
  process.env.CLAUDE_SECRET_DATABASE_PASSWORD = 'secret_password_123';

  // Initialize environment provider
  const provider = new EnvSecretProvider({
    prefix: 'CLAUDE_SECRET_',
    uppercaseNames: true,
  });

  await provider.initialize();
  console.log('Provider initialized');

  // Get secrets
  const apiKey = await provider.get('api-key-github');
  console.log('GitHub API Key:', apiKey?.value.substring(0, 10) + '...');

  const dbPassword = await provider.get('database-password');
  console.log('Database Password:', dbPassword?.value.substring(0, 6) + '...');

  // List all secrets
  const secrets = await provider.list();
  console.log('Environment secrets:', secrets.map((s) => s.name));

  // Try to set (will fail - read-only)
  try {
    await provider.set('new-secret', 'value');
  } catch (error) {
    console.log('Expected error:', (error as Error).message);
  }

  await provider.close();
}

async function example4_SecretManager() {
  console.log('\n=== Example 4: Secret Manager (Multi-Provider) ===\n');

  // Set up environment variables
  process.env.CLAUDE_SECRET_ENV_TOKEN = 'env_token_xyz';

  // Create providers
  const localPath = join(tmpdir(), `secrets-manager-${Date.now()}.enc.json`);
  const localProvider = new LocalSecretProvider({
    storePath: localPath,
    masterKey: SecretEncryption.generateMasterKey(),
    createIfMissing: true,
  });

  const envProvider = new EnvSecretProvider({
    prefix: 'CLAUDE_SECRET_',
  });

  // Create secret manager
  const manager = new SecretManager({
    providers: [localProvider, envProvider],
    defaultWriteProvider: 'local',
    enableAuditLog: true,
    auditLogCallback: async (entry) => {
      console.log('Audit:', {
        action: entry.action,
        secret: entry.secretName,
        success: entry.success,
      });
    },
  });

  await manager.initialize();
  console.log('Secret manager initialized with 2 providers');

  // Set a secret (goes to local provider)
  await manager.set('api-key-stripe', 'sk_live_abc123', {
    scope: 'global',
    tags: ['production'],
  });

  // Get from local
  const stripeKey = await manager.get('api-key-stripe');
  console.log('From local:', stripeKey?.metadata.provider);

  // Get from environment (fallback)
  const envToken = await manager.get('env-token');
  console.log('From env:', envToken?.metadata.provider);

  // List all secrets (from both providers)
  const allSecrets = await manager.list();
  console.log('All secrets:', allSecrets.map((s) => `${s.name} (${s.provider})`));

  // Rotate a secret
  await manager.rotate('api-key-stripe', {
    newValue: 'sk_live_new_key',
    actor: 'admin',
  });

  // Health check
  const health = await manager.healthCheck();
  console.log('Provider health:', Object.fromEntries(health));

  await manager.close();
}

async function example5_TemplateSubstitution() {
  console.log('\n=== Example 5: Template Substitution ===\n');

  // Set up secrets
  const localPath = join(tmpdir(), `secrets-template-${Date.now()}.enc.json`);
  const provider = new LocalSecretProvider({
    storePath: localPath,
    masterKey: SecretEncryption.generateMasterKey(),
    createIfMissing: true,
  });

  const manager = new SecretManager({
    providers: [provider],
  });

  await manager.initialize();

  // Store secrets
  await manager.set('api-key-stripe', 'sk_live_stripe123');
  await manager.set('database-url', 'postgresql://prod-db:5432/mydb');
  await manager.set('redis-url', 'redis://prod-redis:6379');

  // Configuration with secret references
  const config = {
    payment: {
      stripe: {
        apiKey: '${secret:api-key-stripe}',
        webhookSecret: '${secret:webhook-secret:default_secret}', // with default
      },
    },
    database: {
      url: '${secret:database-url}',
      maxConnections: 20,
    },
    cache: {
      redis: '${secret:redis-url}',
      ttl: 3600,
    },
  };

  console.log('Original config:', JSON.stringify(config, null, 2));

  // Substitute secrets
  const resolved = await manager.substituteSecrets(config);

  console.log('\nResolved config:', JSON.stringify(resolved, null, 2));

  await manager.close();
}

async function example6_AccessControl() {
  console.log('\n=== Example 6: Access Control ===\n');

  const accessControl = new SecretAccessControl({
    enforceAccessControl: true,
    defaultPermissions: ['read'],
    accessDeniedCallback: async (params) => {
      console.log('Access denied:', params);
    },
  });

  // Grant permissions
  await accessControl.grant('api-key-stripe', 'payment-plugin', 'read', {
    scope: 'plugin',
  });

  await accessControl.grant('database-password', 'db-plugin', 'write', {
    scope: 'plugin',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  console.log('Granted permissions');

  // Check permissions (allowed)
  try {
    await accessControl.checkPermission(
      'api-key-stripe',
      'payment-plugin',
      'read',
      'plugin'
    );
    console.log('✓ payment-plugin can read api-key-stripe');
  } catch (error) {
    console.log('✗', (error as Error).message);
  }

  // Check permissions (denied)
  try {
    await accessControl.checkPermission(
      'api-key-stripe',
      'payment-plugin',
      'write',
      'plugin'
    );
    console.log('✓ payment-plugin can write api-key-stripe');
  } catch (error) {
    console.log('✗', (error as Error).message);
  }

  // List permissions
  const permissions = await accessControl.listPermissions('api-key-stripe');
  console.log('Permissions for api-key-stripe:', permissions);

  // Wildcard permissions
  await accessControl.grant('api-key-*', 'api-consumer', 'read', {
    scope: 'global',
  });

  try {
    await accessControl.checkPermission(
      'api-key-github',
      'api-consumer',
      'read',
      'global'
    );
    console.log('✓ api-consumer can read api-key-github (wildcard)');
  } catch (error) {
    console.log('✗', (error as Error).message);
  }
}

async function example7_SecretVersioning() {
  console.log('\n=== Example 7: Secret Versioning ===\n');

  const storePath = join(tmpdir(), `secrets-versioning-${Date.now()}.enc.json`);
  const provider = new LocalSecretProvider({
    storePath,
    masterKey: SecretEncryption.generateMasterKey(),
    createIfMissing: true,
  });

  await provider.initialize();

  // Set initial version
  await provider.set('api-token', 'version-1-token');
  console.log('Set version 1');

  // Rotate to version 2
  await provider.rotate('api-token', {
    newValue: 'version-2-token',
    actor: 'admin',
  });
  console.log('Rotated to version 2');

  // Rotate to version 3
  await provider.rotate('api-token', {
    newValue: 'version-3-token',
    actor: 'admin',
  });
  console.log('Rotated to version 3');

  // Get latest version
  const latest = await provider.get('api-token');
  console.log('Latest version:', latest?.metadata.version, '=', latest?.value);

  // Get specific versions
  const v1 = await provider.get('api-token', { version: 1 });
  console.log('Version 1:', v1?.value);

  const v2 = await provider.get('api-token', { version: 2 });
  console.log('Version 2:', v2?.value);

  await provider.close();
}

// Run all examples
async function runAllExamples() {
  try {
    await example1_BasicEncryption();
    await example2_LocalProvider();
    await example3_EnvironmentProvider();
    await example4_SecretManager();
    await example5_TemplateSubstitution();
    await example6_AccessControl();
    await example7_SecretVersioning();

    console.log('\n=== All Examples Completed Successfully ===\n');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
