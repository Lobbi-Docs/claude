/**
 * Security Sandbox Type Definitions
 * Defines all types for the plugin security sandbox system
 */

/**
 * Permission set for filesystem, network, and tool access
 */
export interface PermissionSet {
  /** Filesystem access patterns with read/write permissions */
  filesystem: FileSystemPermission[];
  /** Network access patterns with host/port restrictions */
  network: NetworkPermission[];
  /** Allowed Claude Code tools */
  tools: string[];
  /** Required MCP servers */
  mcpServers?: string[];
}

/**
 * Filesystem permission entry
 */
export interface FileSystemPermission {
  /** Path or glob pattern (e.g., '.claude/**', 'output/*.json') */
  path: string;
  /** Access level: read, write, or readwrite */
  access: 'read' | 'write' | 'readwrite';
}

/**
 * Network permission entry
 */
export interface NetworkPermission {
  /** Hostname or pattern (e.g., 'api.anthropic.com', '*.github.com') */
  host: string;
  /** Allowed ports (optional, defaults to standard HTTP/HTTPS) */
  ports?: number[];
  /** Allowed protocols */
  protocols?: ('http' | 'https' | 'ws' | 'wss')[];
}

/**
 * Resource limits for sandbox execution
 */
export interface ResourceLimits {
  /** Memory limit (e.g., '256MB', '1GB') */
  memoryLimit: string;
  /** CPU time limit in milliseconds */
  cpuTimeMs: number;
  /** Maximum network calls allowed */
  networkCalls: number;
  /** Maximum filesystem operations */
  filesystemOps?: number;
}

/**
 * Security policy defining allowed operations
 */
export interface SecurityPolicy {
  /** Maximum number of permissions per category */
  maxPermissions: {
    filesystem: number;
    network: number;
    tools: number;
  };
  /** Patterns that are always banned */
  bannedPatterns: RegExp[];
  /** Permissions that must always be granted */
  requiredPermissions: string[];
  /** Whether to prompt user for elevated permissions */
  elevatedPermissionPrompt: boolean;
  /** Whether to allow dynamic code execution */
  allowDynamicExecution: boolean;
  /** Trusted domains that bypass some restrictions */
  trustedDomains?: string[];
}

/**
 * Sandbox execution context
 */
export interface SandboxContext {
  /** Unique context ID */
  id: string;
  /** Plugin name */
  plugin: string;
  /** Granted permissions */
  permissions: PermissionSet;
  /** Resource limits */
  limits: ResourceLimits;
  /** Allowed global variables */
  allowedGlobals: Set<string>;
  /** Execution start time */
  startTime: number;
  /** Resource usage counters */
  usage: {
    memoryBytes: number;
    cpuTimeMs: number;
    networkCalls: number;
    filesystemOps: number;
  };
}

/**
 * Result of code execution in sandbox
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Return value from execution */
  value?: unknown;
  /** Error if execution failed */
  error?: Error;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Resource usage */
  usage: SandboxContext['usage'];
  /** Security violations detected */
  violations?: SecurityViolation[];
}

/**
 * Security violation detected during execution
 */
export interface SecurityViolation {
  /** Type of violation */
  type: 'permission' | 'resource' | 'pattern' | 'timeout';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Description of violation */
  message: string;
  /** Location in code if applicable */
  location?: {
    line: number;
    column: number;
  };
  /** Timestamp */
  timestamp: number;
}

/**
 * Result of permission validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of warnings */
  warnings: string[];
  /** Approved permissions */
  approved: PermissionSet;
  /** Denied permissions */
  denied: Partial<PermissionSet>;
}

/**
 * Result of security code scan
 */
export interface SecurityScanResult {
  /** Whether code passed security scan */
  passed: boolean;
  /** Dangerous patterns detected */
  dangerousPatterns: PatternMatch[];
  /** Import violations */
  importViolations: string[];
  /** Hardcoded secrets detected */
  secrets: SecretMatch[];
  /** Overall security score (0-100) */
  securityScore: number;
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * Pattern match in code
 */
export interface PatternMatch {
  /** Pattern that matched */
  pattern: RegExp;
  /** Matched text */
  match: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Description */
  description: string;
}

/**
 * Secret detected in code
 */
export interface SecretMatch {
  /** Type of secret */
  type: 'api_key' | 'password' | 'token' | 'private_key' | 'certificate';
  /** Matched pattern (redacted) */
  pattern: string;
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Confidence level */
  confidence: number;
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  /** Whether all imports are valid */
  valid: boolean;
  /** Allowed imports */
  allowed: string[];
  /** Blocked imports */
  blocked: string[];
  /** Unknown imports that need review */
  unknown: string[];
}

/**
 * Plugin manifest (relevant fields for security)
 */
export interface PluginManifest {
  name: string;
  version: string;
  permissions?: {
    filesystem?: Array<{ path: string; access: string }>;
    network?: Array<{ host: string; ports?: number[]; protocols?: string[] }>;
    tools?: string[];
    mcpServers?: string[];
  };
  sandbox?: {
    enabled?: boolean;
    memoryLimit?: string;
    timeoutMs?: number;
    allowedCommands?: string[];
  };
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Timestamp */
  timestamp: number;
  /** Plugin name */
  plugin: string;
  /** Action performed */
  action: string;
  /** Resource accessed */
  resource: string;
  /** Whether action was allowed */
  allowed: boolean;
  /** Permission that authorized/denied action */
  permission?: string;
  /** User who triggered action */
  user?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Sandbox configuration options
 */
export interface SandboxOptions {
  /** Whether to enable strict mode */
  strictMode?: boolean;
  /** Custom security policy */
  policy?: Partial<SecurityPolicy>;
  /** Custom resource limits */
  limits?: Partial<ResourceLimits>;
  /** Audit log callback */
  onAuditLog?: (entry: AuditLogEntry) => void;
  /** Security violation callback */
  onViolation?: (violation: SecurityViolation) => void;
}
