/**
 * Simple test file to verify security tools functionality
 */

import { EncryptorTool } from './src/tools/security/encryptor.js';
import { TokenGeneratorTool } from './src/tools/security/token-generator.js';
import { PasswordHasherTool } from './src/tools/security/password-hasher.js';
import { InputSanitizerTool } from './src/tools/security/input-sanitizer.js';
import { SecretsManagerTool } from './src/tools/security/secrets-manager.js';
import { createContext } from './src/utils/index.js';

async function testSecurityTools() {
  console.log('🔐 Testing Security Tools\n');

  // Test 1: EncryptorTool
  console.log('1️⃣  Testing EncryptorTool (AES-256-GCM)...');
  const encryptResult = await EncryptorTool.execute(
    {
      operation: 'encrypt',
      algorithm: 'aes-256-gcm',
      data: 'Hello, World!',
      key: undefined, // Will generate random key
    },
    createContext('EncryptorTool')
  );

  if (encryptResult.success && encryptResult.data) {
    console.log('✅ Encryption successful');
    console.log(`   - Ciphertext: ${encryptResult.data.ciphertext?.substring(0, 20)}...`);

    // Test decryption
    const decryptResult = await EncryptorTool.execute(
      {
        operation: 'decrypt',
        algorithm: 'aes-256-gcm',
        data: encryptResult.data.ciphertext!,
        key: encryptResult.data.key!,
        iv: encryptResult.data.iv!,
        authTag: encryptResult.data.authTag!,
      },
      createContext('EncryptorTool')
    );

    if (decryptResult.success && decryptResult.data?.plaintext === 'Hello, World!') {
      console.log('✅ Decryption successful: ' + decryptResult.data.plaintext);
    }
  }

  // Test 2: TokenGeneratorTool
  console.log('\n2️⃣  Testing TokenGeneratorTool...');
  const tokenResult = await TokenGeneratorTool.execute(
    {
      operation: 'random',
      length: 32,
      encoding: 'base64url',
      prefix: 'test',
    },
    createContext('TokenGeneratorTool')
  );

  if (tokenResult.success && tokenResult.data) {
    console.log('✅ Token generation successful');
    console.log(`   - Token: ${tokenResult.data.token?.substring(0, 30)}...`);
  }

  // Test JWT
  console.log('\n3️⃣  Testing JWT generation and verification...');
  const jwtResult = await TokenGeneratorTool.execute(
    {
      operation: 'jwt',
      length: 32,
      encoding: 'base64url',
      jwt: {
        payload: { userId: '123', role: 'admin' },
        secret: 'my-secret-key',
        algorithm: 'HS256',
        expiresIn: 3600,
      },
    },
    createContext('TokenGeneratorTool')
  );

  if (jwtResult.success && jwtResult.data?.jwt) {
    console.log('✅ JWT generation successful');
    console.log(`   - Token: ${jwtResult.data.jwt.token.substring(0, 30)}...`);

    // Verify JWT
    const verifyResult = await TokenGeneratorTool.execute(
      {
        operation: 'jwt',
        length: 32,
        encoding: 'base64url',
        verify: {
          token: jwtResult.data.jwt.token,
          secret: 'my-secret-key',
        },
      },
      createContext('TokenGeneratorTool')
    );

    if (verifyResult.success && verifyResult.data?.verified) {
      console.log('✅ JWT verification successful');
    }
  }

  // Test 3: PasswordHasherTool
  console.log('\n4️⃣  Testing PasswordHasherTool...');
  const hashResult = await PasswordHasherTool.execute(
    {
      operation: 'hash',
      password: 'MySecurePassword123!',
      algorithm: 'bcrypt-like',
    },
    createContext('PasswordHasherTool')
  );

  if (hashResult.success && hashResult.data) {
    console.log('✅ Password hashing successful');
    console.log(`   - Hash: ${hashResult.data.hash?.substring(0, 40)}...`);

    // Test verification
    const verifyResult = await PasswordHasherTool.execute(
      {
        operation: 'verify',
        password: 'MySecurePassword123!',
        hash: hashResult.data.hash!,
        algorithm: 'bcrypt-like',
      },
      createContext('PasswordHasherTool')
    );

    if (verifyResult.success && verifyResult.data?.verified) {
      console.log('✅ Password verification successful');
    }
  }

  // Test 4: InputSanitizerTool
  console.log('\n5️⃣  Testing InputSanitizerTool...');
  const sanitizeResult = await InputSanitizerTool.execute(
    {
      operation: 'xss',
      input: '<script>alert("XSS")</script>Hello World',
    },
    createContext('InputSanitizerTool')
  );

  if (sanitizeResult.success && sanitizeResult.data) {
    console.log('✅ Input sanitization successful');
    console.log(`   - Original: ${sanitizeResult.data.original.substring(0, 30)}...`);
    console.log(`   - Sanitized: ${sanitizeResult.data.sanitized.substring(0, 30)}...`);
    console.log(`   - Blocked: ${sanitizeResult.data.blocked?.join(', ')}`);
  }

  // Test 5: SecretsManagerTool
  console.log('\n6️⃣  Testing SecretsManagerTool...');

  // Store a secret
  const storeResult = await SecretsManagerTool.execute(
    {
      operation: 'store',
      name: 'api-key',
      value: 'my-secret-api-key-12345',
      options: {
        encrypted: true,
        expiresIn: 3600,
        tags: ['api', 'production'],
      },
    },
    createContext('SecretsManagerTool')
  );

  if (storeResult.success) {
    console.log('✅ Secret storage successful');

    // Retrieve the secret
    const retrieveResult = await SecretsManagerTool.execute(
      {
        operation: 'retrieve',
        name: 'api-key',
      },
      createContext('SecretsManagerTool')
    );

    if (retrieveResult.success && retrieveResult.data) {
      console.log('✅ Secret retrieval successful');
      console.log(`   - Value: ${retrieveResult.data.value}`);
      console.log(`   - Access count: ${retrieveResult.data.metadata?.accessCount}`);
    }

    // List secrets
    const listResult = await SecretsManagerTool.execute(
      {
        operation: 'list',
      },
      createContext('SecretsManagerTool')
    );

    if (listResult.success && listResult.data) {
      console.log('✅ Secret listing successful');
      console.log(`   - Secrets: ${listResult.data.secrets?.join(', ')}`);
    }

    // Clean up
    await SecretsManagerTool.execute(
      {
        operation: 'clear',
      },
      createContext('SecretsManagerTool')
    );
  }

  console.log('\n✨ All security tools tests completed!\n');
}

// Run tests
testSecurityTools().catch(console.error);
