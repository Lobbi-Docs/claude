/**
 * Security Sandbox - Public API
 * Exports all public interfaces and classes
 */

export { SandboxRuntime } from './sandbox-runtime.js';
export { PermissionValidator } from './permission-validator.js';
export { CodeScanner } from './code-scanner.js';

export {
  DEFAULT_POLICY,
  STRICT_POLICY,
  PERMISSIVE_POLICY,
  DEVELOPMENT_POLICY,
  SECRET_PATTERNS,
  ALLOWED_BUILTINS,
  BLOCKED_BUILTINS,
  ALLOWED_PACKAGES,
  BLOCKED_PACKAGES,
  getPolicy,
  mergePolicy,
} from './security-policy.js';

export type {
  PermissionSet,
  FileSystemPermission,
  NetworkPermission,
  ResourceLimits,
  SecurityPolicy,
  SandboxContext,
  ExecutionResult,
  SecurityViolation,
  ValidationResult,
  SecurityScanResult,
  PatternMatch,
  SecretMatch,
  ImportValidationResult,
  PluginManifest,
  AuditLogEntry,
  SandboxOptions,
} from './types.js';
