/**
 * HashiCorp Vault Type Definitions
 *
 * Shared types and interfaces for Vault client and tools
 */

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
  cas?: number;
}

export interface VaultDeleteOptions {
  versions?: number[];
}

export interface VaultSecretData {
  [key: string]: any;
}

export interface VaultSecretMetadata {
  created_time: string;
  custom_metadata?: Record<string, string>;
  deletion_time: string;
  destroyed: boolean;
  version: number;
}

export interface VaultReadResponse {
  data: VaultSecretData;
  metadata?: VaultSecretMetadata;
}

export interface VaultWriteResponse {
  created_time: string;
  custom_metadata: Record<string, string> | null;
  deletion_time: string;
  destroyed: boolean;
  version: number;
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

export interface VaultMountInfo {
  type: string;
  description: string;
  accessor: string;
  config: {
    default_lease_ttl: number;
    max_lease_ttl: number;
    force_no_cache: boolean;
  };
  options: {
    version?: string;
  } | null;
  local: boolean;
  seal_wrap: boolean;
  external_entropy_access: boolean;
}

export enum VaultErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VAULT_SEALED = 'VAULT_SEALED',
  UNAVAILABLE = 'UNAVAILABLE',
  NO_RESPONSE = 'NO_RESPONSE',
  REQUEST_ERROR = 'REQUEST_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface VaultErrorResponse {
  errors: string[];
}

export class VaultError extends Error {
  constructor(
    message: string,
    public code?: VaultErrorCode | string,
    public statusCode?: number,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'VaultError';
    Object.setPrototypeOf(this, VaultError.prototype);
  }
}

/**
 * Vault API response formats
 */
export interface VaultAPIResponse<T = any> {
  request_id: string;
  lease_id: string;
  renewable: boolean;
  lease_duration: number;
  data: T;
  wrap_info: null | {
    token: string;
    ttl: number;
    creation_time: string;
    creation_path: string;
  };
  warnings: string[] | null;
  auth: null | {
    client_token: string;
    accessor: string;
    policies: string[];
    token_policies: string[];
    metadata: Record<string, string>;
    lease_duration: number;
    renewable: boolean;
  };
}

/**
 * KV v2 specific response formats
 */
export interface VaultKVv2DataResponse {
  data: VaultSecretData;
  metadata: VaultSecretMetadata;
}

export interface VaultKVv2MetadataResponse {
  created_time: string;
  current_version: number;
  max_versions: number;
  oldest_version: number;
  updated_time: string;
  versions: Record<
    string,
    {
      created_time: string;
      deletion_time: string;
      destroyed: boolean;
    }
  >;
  custom_metadata?: Record<string, string>;
  cas_required?: boolean;
  delete_version_after?: string;
}

/**
 * Tool input types
 */
export interface VaultReadInput {
  path: string;
  version?: number;
  mountPath?: string;
  kvVersion?: number;
}

export interface VaultWriteInput {
  path: string;
  data: VaultSecretData;
  cas?: number;
  mountPath?: string;
  kvVersion?: number;
}

export interface VaultListInput {
  path: string;
  mountPath?: string;
  kvVersion?: number;
}

export interface VaultDeleteInput {
  path: string;
  versions?: number[];
  mountPath?: string;
  kvVersion?: number;
}

/**
 * Tool response types
 */
export interface VaultToolSuccessResponse<T = any> {
  success: true;
  path?: string;
  data?: T;
  message?: string;
  metadata?: any;
  keys?: string[];
  count?: number;
}

export interface VaultToolErrorResponse {
  success: false;
  error: string;
}

export type VaultToolResponse<T = any> = VaultToolSuccessResponse<T> | VaultToolErrorResponse;
