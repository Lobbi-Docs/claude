# Security Tools - @claude-sdk/tools

Comprehensive security tools for the Claude Agent SDK providing encryption, hashing, token generation, input sanitization, and secrets management.

## 📦 Installation

```bash
npm install @claude-sdk/tools
```

## 🔐 Available Tools

### 1. EncryptorTool

Provides encryption and decryption capabilities using modern algorithms.

**Supported Algorithms:**
- `aes-256-gcm` - AES-256 in Galois/Counter Mode (authenticated encryption)
- `aes-256-cbc` - AES-256 in Cipher Block Chaining mode
- `chacha20-poly1305` - ChaCha20-Poly1305 (authenticated encryption)

**Operations:**
- `encrypt` - Encrypt data
- `decrypt` - Decrypt data
- `deriveKey` - Derive encryption key from passphrase using PBKDF2

**Example:**

```typescript
import { EncryptorTool } from '@claude-sdk/tools/security';
import { createContext } from '@claude-sdk/tools';

// Encrypt data
const encryptResult = await EncryptorTool.execute(
  {
    operation: 'encrypt',
    algorithm: 'aes-256-gcm',
    data: 'Sensitive information',
    key: undefined, // Will generate random key
  },
  createContext('EncryptorTool')
);

// Decrypt data
const decryptResult = await EncryptorTool.execute(
  {
    operation: 'decrypt',
    algorithm: 'aes-256-gcm',
    data: encryptResult.data.ciphertext,
    key: encryptResult.data.key,
    iv: encryptResult.data.iv,
    authTag: encryptResult.data.authTag,
  },
  createContext('EncryptorTool')
);

// Derive key from passphrase
const keyResult = await EncryptorTool.execute(
  {
    operation: 'deriveKey',
    algorithm: 'aes-256-gcm',
    key: 'my-secure-passphrase',
    keyDerivation: {
      iterations: 100000,
      keyLength: 32,
    },
  },
  createContext('EncryptorTool')
);
```

---

### 2. TokenGeneratorTool

Generates secure random tokens, API keys, and JWT tokens.

**Operations:**
- `random` - Generate random token
- `apiKey` - Generate API key with prefix
- `jwt` - Generate or verify JWT tokens

**Example:**

```typescript
import { TokenGeneratorTool } from '@claude-sdk/tools/security';

// Generate random token
const tokenResult = await TokenGeneratorTool.execute(
  {
    operation: 'random',
    length: 32,
    encoding: 'base64url',
    prefix: 'sk', // Optional prefix
  },
  createContext('TokenGeneratorTool')
);

// Generate API key
const apiKeyResult = await TokenGeneratorTool.execute(
  {
    operation: 'apiKey',
    length: 32,
    prefix: 'sk', // Default prefix
  },
  createContext('TokenGeneratorTool')
);

// Generate JWT
const jwtResult = await TokenGeneratorTool.execute(
  {
    operation: 'jwt',
    jwt: {
      payload: { userId: '123', role: 'admin' },
      secret: 'your-secret-key',
      algorithm: 'HS256',
      expiresIn: 3600, // 1 hour
      issuer: 'your-app',
    },
  },
  createContext('TokenGeneratorTool')
);

// Verify JWT
const verifyResult = await TokenGeneratorTool.execute(
  {
    operation: 'jwt',
    verify: {
      token: jwtResult.data.jwt.token,
      secret: 'your-secret-key',
    },
  },
  createContext('TokenGeneratorTool')
);
```

---

### 3. PasswordHasherTool

Secure password hashing using scrypt with bcrypt-like and argon2-like configurations.

**Algorithms:**
- `bcrypt-like` - Bcrypt-style configuration (cost factor)
- `argon2-like` - Argon2-style configuration (memory + parallelism)

**Operations:**
- `hash` - Hash a password
- `verify` - Verify password against hash

**Example:**

```typescript
import { PasswordHasherTool } from '@claude-sdk/tools/security';

// Hash password (bcrypt-like)
const hashResult = await PasswordHasherTool.execute(
  {
    operation: 'hash',
    password: 'MySecurePassword123!',
    algorithm: 'bcrypt-like',
    options: {
      cost: 12, // 2^12 iterations
    },
  },
  createContext('PasswordHasherTool')
);

// Hash password (argon2-like)
const argon2HashResult = await PasswordHasherTool.execute(
  {
    operation: 'hash',
    password: 'MySecurePassword123!',
    algorithm: 'argon2-like',
    options: {
      memorySize: 64, // 64 MB
      parallelism: 2,
    },
  },
  createContext('PasswordHasherTool')
);

// Verify password
const verifyResult = await PasswordHasherTool.execute(
  {
    operation: 'verify',
    password: 'MySecurePassword123!',
    hash: hashResult.data.hash,
    algorithm: 'bcrypt-like',
  },
  createContext('PasswordHasherTool')
);
```

---

### 4. InputSanitizerTool

Sanitizes user input to prevent common security vulnerabilities.

**Operations:**
- `html` - Sanitize HTML (XSS prevention)
- `sql` - Detect and escape SQL injection attempts
- `xss` - Remove XSS patterns
- `path` - Prevent path traversal attacks
- `regex` - Prevent ReDoS (Regular Expression Denial of Service)
- `all` - Apply all sanitization methods

**Example:**

```typescript
import { InputSanitizerTool } from '@claude-sdk/tools/security';

// Sanitize HTML
const htmlResult = await InputSanitizerTool.execute(
  {
    operation: 'html',
    input: '<script>alert("XSS")</script>Hello',
    options: {
      allowedTags: [], // Empty = escape all HTML
    },
  },
  createContext('InputSanitizerTool')
);

// Sanitize SQL injection attempts
const sqlResult = await InputSanitizerTool.execute(
  {
    operation: 'sql',
    input: "user' OR '1'='1",
    options: {
      strict: true,
    },
  },
  createContext('InputSanitizerTool')
);

// Prevent path traversal
const pathResult = await InputSanitizerTool.execute(
  {
    operation: 'path',
    input: '../../../etc/passwd',
    options: {
      basePath: '/app/uploads',
      allowAbsolute: false,
    },
  },
  createContext('InputSanitizerTool')
);

// Apply all sanitizations
const allResult = await InputSanitizerTool.execute(
  {
    operation: 'all',
    input: '<script>alert("XSS")</script>',
  },
  createContext('InputSanitizerTool')
);
```

---

### 5. SecretsManagerTool

In-memory encrypted secrets storage with expiration and access logging.

**Operations:**
- `store` - Store a secret
- `retrieve` - Retrieve a secret
- `delete` - Delete a secret
- `list` - List secret names (not values)
- `exists` - Check if secret exists
- `clear` - Clear all secrets

**Example:**

```typescript
import { SecretsManagerTool } from '@claude-sdk/tools/security';

// Store a secret
const storeResult = await SecretsManagerTool.execute(
  {
    operation: 'store',
    name: 'api-key',
    value: 'my-secret-api-key',
    options: {
      encrypted: true, // Encrypt at rest
      expiresIn: 3600, // Expire in 1 hour
      tags: ['api', 'production'],
    },
  },
  createContext('SecretsManagerTool')
);

// Retrieve secret
const retrieveResult = await SecretsManagerTool.execute(
  {
    operation: 'retrieve',
    name: 'api-key',
    options: {
      decrypt: true, // Auto-decrypt
    },
  },
  createContext('SecretsManagerTool')
);

// List secrets
const listResult = await SecretsManagerTool.execute(
  {
    operation: 'list',
    options: {
      includeExpired: false,
      filterTags: ['production'],
    },
  },
  createContext('SecretsManagerTool')
);

// Check if exists
const existsResult = await SecretsManagerTool.execute(
  {
    operation: 'exists',
    name: 'api-key',
  },
  createContext('SecretsManagerTool')
);

// Delete secret
const deleteResult = await SecretsManagerTool.execute(
  {
    operation: 'delete',
    name: 'api-key',
  },
  createContext('SecretsManagerTool')
);

// Clear all secrets
const clearResult = await SecretsManagerTool.execute(
  {
    operation: 'clear',
  },
  createContext('SecretsManagerTool')
);
```

---

## 🔒 Security Best Practices

### 1. **Encryption**
- Always use authenticated encryption (AES-GCM or ChaCha20-Poly1305)
- Generate keys using `crypto.randomBytes()` or derive from strong passphrases
- Store keys securely (environment variables, key management services)
- Use unique IVs/nonces for each encryption

### 2. **Password Hashing**
- Use bcrypt-like configuration with cost factor ≥ 12
- For high-security applications, use argon2-like with 64+ MB memory
- Never store plaintext passwords
- Use timing-safe comparison for verification

### 3. **Token Generation**
- Use `base64url` encoding for web-safe tokens
- Minimum length: 32 bytes for API keys
- For JWT: Use HS256 or better, set expiration times
- Rotate tokens regularly

### 4. **Input Sanitization**
- Always sanitize user input before use
- Use parameterized queries for SQL (don't rely on sanitization alone)
- Escape HTML entities before rendering
- Validate and normalize file paths
- Set maximum lengths for regex patterns

### 5. **Secrets Management**
- Enable encryption at rest
- Set expiration times for temporary secrets
- Use access logging for audit trails
- Clear secrets when no longer needed
- Never commit secrets to version control

---

## 🧪 Testing

All security tools have been tested and verified:

```bash
npx tsx test-security-tools.ts
```

**Test Coverage:**
- ✅ Encryption/Decryption (all algorithms)
- ✅ Token generation (random, API keys, JWT)
- ✅ JWT verification
- ✅ Password hashing and verification
- ✅ Input sanitization (HTML, SQL, XSS, path, regex)
- ✅ Secrets storage, retrieval, and management

---

## 📚 Type Definitions

All tools are fully typed with TypeScript:

```typescript
import type {
  EncryptorInput,
  EncryptorOutput,
  TokenGeneratorInput,
  TokenGeneratorOutput,
  PasswordHasherInput,
  PasswordHasherOutput,
  InputSanitizerInput,
  InputSanitizerOutput,
  SecretsManagerInput,
  SecretsManagerOutput,
} from '@claude-sdk/tools/security';
```

---

## 📋 API Reference

### Common Types

```typescript
interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: ToolErrorInfo;
  metadata?: ToolMetadata;
}

interface ToolContext {
  toolName: string;
  timestamp: Date;
  requestId: string;
  metadata?: Record<string, unknown>;
  logger?: ToolLogger;
  cache?: ToolCache;
}
```

---

## 🛡️ Security Considerations

1. **Never store sensitive data in logs**
2. **Use environment variables for secrets**
3. **Rotate keys and tokens regularly**
4. **Set appropriate expiration times**
5. **Use HTTPS for all API communications**
6. **Implement rate limiting**
7. **Monitor access logs for suspicious activity**
8. **Keep dependencies up to date**

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please ensure:
- All tests pass
- Code is properly typed
- Security best practices are followed
- Documentation is updated

---

## 📞 Support

For issues or questions:
- GitHub Issues: [claude-sdk-tools](https://github.com/your-org/claude-sdk-tools)
- Documentation: [docs.example.com](https://docs.example.com)

---

**Built with security in mind. Use responsibly.**
