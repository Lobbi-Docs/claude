/**
 * @claude-sdk/tools - Security Tools
 * Comprehensive security tools for encryption, hashing, token generation, and input sanitization
 */

// Export all security tools
export * from './encryptor.js';
export * from './token-generator.js';
export * from './password-hasher.js';
export * from './input-sanitizer.js';
export * from './secrets-manager.js';

// Re-export schemas for convenience
export {
  EncryptorSchema,
  EncryptorTool,
  type EncryptorInput,
  type EncryptorOutput,
} from './encryptor.js';

export {
  TokenGeneratorSchema,
  TokenGeneratorTool,
  type TokenGeneratorInput,
  type TokenGeneratorOutput,
} from './token-generator.js';

export {
  PasswordHasherSchema,
  PasswordHasherTool,
  type PasswordHasherInput,
  type PasswordHasherOutput,
} from './password-hasher.js';

export {
  InputSanitizerSchema,
  InputSanitizerTool,
  type InputSanitizerInput,
  type InputSanitizerOutput,
} from './input-sanitizer.js';

export {
  SecretsManagerSchema,
  SecretsManagerTool,
  type SecretsManagerInput,
  type SecretsManagerOutput,
} from './secrets-manager.js';
