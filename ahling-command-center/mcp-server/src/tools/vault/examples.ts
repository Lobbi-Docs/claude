/**
 * HashiCorp Vault Client Usage Examples
 *
 * Demonstrates various use cases for the Vault client
 */

import { VaultClient, VaultKVVersion, VaultError } from '../../clients/vault.client.js';

/**
 * Example 1: Basic Secret Operations (KV v2)
 */
async function basicSecretOperations() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  try {
    // Write a secret
    console.log('Writing secret...');
    await client.write('myapp/database', {
      username: 'dbuser',
      password: 'secret123',
      host: 'localhost',
      port: 5432,
    });

    // Read the secret back
    console.log('Reading secret...');
    const secret = await client.read('myapp/database');
    console.log('Secret data:', secret.data);
    console.log('Metadata:', secret.metadata);

    // List secrets
    console.log('Listing secrets...');
    const list = await client.list('myapp/');
    console.log('Keys:', list.keys);

    // Delete the secret
    console.log('Deleting secret...');
    await client.delete('myapp/database');

    console.log('Basic operations completed successfully');
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Vault error:', error.message);
      console.error('Error code:', error.code);
      console.error('Status code:', error.statusCode);
      console.error('Details:', error.errors);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 2: Version Management (KV v2)
 */
async function versionManagement() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  try {
    const path = 'myapp/config';

    // Write version 1
    console.log('Writing version 1...');
    await client.write(path, { environment: 'dev', debug: true });

    // Write version 2
    console.log('Writing version 2...');
    await client.write(path, { environment: 'staging', debug: false });

    // Write version 3
    console.log('Writing version 3...');
    await client.write(path, { environment: 'prod', debug: false });

    // Read latest version
    console.log('Reading latest version...');
    const latest = await client.read(path);
    console.log('Latest data:', latest.data);
    console.log('Version:', latest.metadata?.version);

    // Read specific version
    console.log('Reading version 1...');
    const v1 = await client.read(path, { version: 1 });
    console.log('Version 1 data:', v1.data);

    // Soft delete version 2
    console.log('Soft deleting version 2...');
    await client.delete(path, { versions: [2] });

    // Undelete version 2
    console.log('Undeleting version 2...');
    await client.undelete(path, [2]);

    // Permanently destroy version 1
    console.log('Destroying version 1...');
    await client.destroy(path, [1]);

    console.log('Version management completed successfully');
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Vault error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 3: Check-And-Set (Optimistic Locking)
 */
async function checkAndSet() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  try {
    const path = 'myapp/counter';

    // Initial write
    console.log('Writing initial value...');
    await client.write(path, { count: 0 });

    // Read current version
    const current = await client.read(path);
    const currentVersion = current.metadata?.version;
    const currentCount = current.data.count;

    console.log(`Current count: ${currentCount}, version: ${currentVersion}`);

    // Update with CAS
    console.log('Updating with Check-And-Set...');
    await client.write(
      path,
      { count: currentCount + 1 },
      { cas: currentVersion }
    );

    // Try to update with old version (should fail)
    console.log('Attempting update with stale version...');
    try {
      await client.write(
        path,
        { count: 999 },
        { cas: currentVersion } // Using old version
      );
      console.log('Update succeeded (unexpected)');
    } catch (error) {
      console.log('Update failed as expected (version conflict)');
    }

    console.log('Check-And-Set example completed');
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Vault error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 4: KV v1 Operations
 */
async function kvV1Operations() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V1,
    'kv' // Assuming 'kv' mount is KV v1
  );

  try {
    // Write secret
    console.log('Writing to KV v1...');
    await client.write('legacy/secret', {
      api_key: 'abc123',
      api_secret: 'xyz789',
    });

    // Read secret
    console.log('Reading from KV v1...');
    const secret = await client.read('legacy/secret');
    console.log('Secret data:', secret.data);
    console.log('No metadata in KV v1:', secret.metadata === undefined);

    // List secrets
    console.log('Listing secrets...');
    const list = await client.list('legacy/');
    console.log('Keys:', list.keys);

    // Delete (permanent in KV v1)
    console.log('Deleting secret (permanent)...');
    await client.delete('legacy/secret');

    console.log('KV v1 operations completed');
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Vault error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 5: Error Handling
 */
async function errorHandling() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  // Read non-existent secret
  try {
    console.log('Attempting to read non-existent secret...');
    await client.read('nonexistent/path');
  } catch (error) {
    if (error instanceof VaultError) {
      console.log('Caught VaultError:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
      console.log('  Status:', error.statusCode);
      console.log('  Errors:', error.errors);
    }
  }

  // Invalid token (permission denied)
  try {
    console.log('Attempting operation with invalid token...');
    const invalidClient = new VaultClient(
      {
        address: process.env.VAULT_ADDR || 'http://localhost:8200',
        token: 'invalid-token-12345',
      },
      VaultKVVersion.V2,
      'secret'
    );
    await invalidClient.read('myapp/database');
  } catch (error) {
    if (error instanceof VaultError) {
      console.log('Caught VaultError:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
    }
  }

  // Connection error
  try {
    console.log('Attempting to connect to invalid address...');
    const unreachableClient = new VaultClient(
      {
        address: 'http://invalid-vault-address:8200',
        token: 'root',
      },
      VaultKVVersion.V2,
      'secret'
    );
    await unreachableClient.read('myapp/database');
  } catch (error) {
    if (error instanceof VaultError) {
      console.log('Caught VaultError:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
    }
  }
}

/**
 * Example 6: Health Check
 */
async function healthCheck() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  try {
    console.log('Checking Vault health...');
    const health = await client.healthCheck();

    console.log('Health status:');
    console.log('  Initialized:', health.initialized);
    console.log('  Sealed:', health.sealed);
    console.log('  Standby:', health.standby);
    console.log('  Version:', health.version);
    console.log('  Cluster:', health.cluster_name);

    if (health.sealed) {
      console.log('WARNING: Vault is sealed!');
    }
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Health check failed:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 7: Mount Detection
 */
async function mountDetection() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  try {
    console.log('Detecting mount configuration...');
    const mountInfo = await client.getMountInfo('secret');

    console.log('Mount info:');
    console.log('  Type:', mountInfo.type);
    console.log('  Description:', mountInfo.description);

    if (mountInfo.options?.version) {
      const version = mountInfo.options.version === '2'
        ? VaultKVVersion.V2
        : VaultKVVersion.V1;

      console.log('  KV Version:', version);
      client.setKVVersion(version);
    }
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Mount detection failed:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 8: Batch Operations
 */
async function batchOperations() {
  const client = new VaultClient(
    {
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'root',
    },
    VaultKVVersion.V2,
    'secret'
  );

  try {
    console.log('Writing multiple secrets...');

    // Write multiple secrets
    const secrets = [
      { path: 'app1/db', data: { user: 'app1_user', pass: 'pass1' } },
      { path: 'app2/db', data: { user: 'app2_user', pass: 'pass2' } },
      { path: 'app3/db', data: { user: 'app3_user', pass: 'pass3' } },
    ];

    await Promise.all(
      secrets.map(({ path, data }) => client.write(path, data))
    );

    console.log('Reading all secrets...');

    // Read all secrets
    const results = await Promise.all(
      secrets.map(({ path }) => client.read(path))
    );

    results.forEach((result, index) => {
      console.log(`Secret ${index + 1}:`, result.data);
    });

    console.log('Cleaning up...');

    // Delete all secrets
    await Promise.all(
      secrets.map(({ path }) => client.delete(path))
    );

    console.log('Batch operations completed');
  } catch (error) {
    if (error instanceof VaultError) {
      console.error('Batch operation failed:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Main function to run examples
async function main() {
  console.log('=== HashiCorp Vault Client Examples ===\n');

  console.log('Example 1: Basic Secret Operations');
  await basicSecretOperations();
  console.log();

  console.log('Example 2: Version Management');
  await versionManagement();
  console.log();

  console.log('Example 3: Check-And-Set (Optimistic Locking)');
  await checkAndSet();
  console.log();

  console.log('Example 4: KV v1 Operations');
  await kvV1Operations();
  console.log();

  console.log('Example 5: Error Handling');
  await errorHandling();
  console.log();

  console.log('Example 6: Health Check');
  await healthCheck();
  console.log();

  console.log('Example 7: Mount Detection');
  await mountDetection();
  console.log();

  console.log('Example 8: Batch Operations');
  await batchOperations();
  console.log();

  console.log('=== All examples completed ===');
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  basicSecretOperations,
  versionManagement,
  checkAndSet,
  kvV1Operations,
  errorHandling,
  healthCheck,
  mountDetection,
  batchOperations,
};
