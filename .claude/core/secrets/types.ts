/**
 * Secrets Management Types
 *
 * Business Value: Defines contracts for secure secret storage and retrieval,
 * enabling type-safe secret management across multiple backend providers.
 *
 * Security: All secret values are typed as strings to prevent accidental
 * serialization or logging of sensitive data.
 */

export interface SecretMetadata {
  /** Unique identifier for the secret */
  id: string;

  /** Human-readable secret name (e.g., "database-password", "api-key-stripe") */
  name: string;

  /** Provider that stores this secret (local, env, azure-keyvault) */
  provider: string;

  /** Current version number (increments on rotation) */
  version: number;

  /** ISO timestamp when secret was created */
  createdAt: string;

  /** ISO timestamp when secret was last updated */
  updatedAt: string;

  /** Optional ISO timestamp when secret expires */
  expiresAt?: string;

  /** Optional tags for categorization (e.g., ["production", "database"]) */
  tags?: string[];

  /** Scope of the secret (plugin, agent, global) */
  scope: SecretScope;
}

export type SecretScope = 'global' | 'plugin' | 'agent' | 'user';

export interface SecretValue {
  /** The metadata for this secret */
  metadata: SecretMetadata;

  /** The decrypted secret value (NEVER log this) */
  value: string;
}

export interface GetSecretOptions {
  /** Specific version to retrieve (default: latest) */
  version?: number;

  /** Throw error if secret not found (default: false) */
  required?: boolean;

  /** Accessor identity for audit logging */
  accessor?: string;
}

export interface SetSecretOptions {
  /** Scope for the secret */
  scope?: SecretScope;

  /** Optional expiration time (ISO timestamp or duration in seconds) */
  expiresAt?: string | number;

  /** Tags for categorization and filtering */
  tags?: string[];

  /** Whether to create a new version or overwrite (default: true = new version) */
  createVersion?: boolean;

  /** Actor performing the set operation (for audit) */
  actor?: string;
}

export interface ListSecretsOptions {
  /** Glob pattern to filter secret names (e.g., "api-key-*") */
  pattern?: string;

  /** Filter by scope */
  scope?: SecretScope;

  /** Filter by provider */
  provider?: string;

  /** Filter by tags (secrets must have ALL specified tags) */
  tags?: string[];

  /** Include expired secrets (default: false) */
  includeExpired?: boolean;
}

export interface RotateSecretOptions {
  /** New secret value */
  newValue: string;

  /** Actor performing the rotation (for audit) */
  actor?: string;

  /** Whether to immediately expire the old version (default: false) */
  expireOldVersion?: boolean;
}

export interface SecretAccessLogEntry {
  /** Unique log entry ID */
  id: string;

  /** ID of the accessed secret */
  secretId: string;

  /** Name of the accessed secret */
  secretName: string;

  /** Who accessed the secret */
  accessor: string;

  /** Action performed (get, set, delete, rotate, list) */
  action: 'get' | 'set' | 'delete' | 'rotate' | 'list';

  /** ISO timestamp of the access */
  timestamp: string;

  /** Whether the access was successful */
  success: boolean;

  /** Optional error message if access failed */
  error?: string;

  /** Version accessed (for get operations) */
  version?: number;
}

export interface EncryptionKeyMetadata {
  /** Unique key identifier */
  id: string;

  /** Hash of the key (for verification, not the key itself) */
  keyHash: string;

  /** Encryption algorithm used */
  algorithm: 'aes-256-gcm';

  /** ISO timestamp when key was created */
  createdAt: string;

  /** Key status (active, rotated, revoked) */
  status: 'active' | 'rotated' | 'revoked';
}

export interface SecretVersion {
  /** Secret ID this version belongs to */
  secretId: string;

  /** Version number */
  version: number;

  /** Encrypted value */
  encryptedValue: string;

  /** ISO timestamp when version was created */
  createdAt: string;

  /** ISO timestamp when version expires (optional) */
  expiresAt?: string;

  /** Whether this version is still valid */
  isValid: boolean;
}

export interface SecretPermission {
  /** Secret ID or pattern */
  secretId: string;

  /** Scope of permission (plugin, agent, user, global) */
  scope: SecretScope;

  /** Permission level (read, write, delete, rotate) */
  permission: 'read' | 'write' | 'delete' | 'rotate' | 'admin';

  /** Who is granted this permission */
  grantedTo: string;

  /** ISO timestamp when permission was granted */
  grantedAt: string;

  /** Optional expiration for the permission */
  expiresAt?: string;
}

export interface EncryptionResult {
  /** Encrypted ciphertext (base64 encoded) */
  ciphertext: string;

  /** Initialization vector used (base64 encoded) */
  iv: string;

  /** Authentication tag for GCM mode (base64 encoded) */
  authTag: string;

  /** Algorithm used for encryption */
  algorithm: 'aes-256-gcm';

  /** Key version/ID used */
  keyId: string;
}

export interface DecryptionInput {
  /** Encrypted ciphertext (base64 encoded) */
  ciphertext: string;

  /** Initialization vector (base64 encoded) */
  iv: string;

  /** Authentication tag (base64 encoded) */
  authTag: string;

  /** Algorithm to use for decryption */
  algorithm: 'aes-256-gcm';

  /** Key version/ID to use */
  keyId: string;
}
