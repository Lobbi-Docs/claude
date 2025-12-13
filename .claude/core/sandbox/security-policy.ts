/**
 * Default Security Policies
 * Defines default security policies and presets for plugin sandboxing
 */

import { SecurityPolicy } from './types.js';

/**
 * Default security policy - balanced security and functionality
 */
export const DEFAULT_POLICY: SecurityPolicy = {
  maxPermissions: {
    filesystem: 10,
    network: 5,
    tools: 15,
  },
  bannedPatterns: [
    // Code execution
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /Function\s*\(/gi,

    // Process and system access
    /process\.env/gi,
    /process\.exit/gi,
    /child_process/gi,

    // Dangerous requires
    /require\s*\(\s*['"]child_process['"]\s*\)/gi,
    /require\s*\(\s*['"]fs['"]\s*\)/gi,
    /require\s*\(\s*['"]net['"]\s*\)/gi,

    // Dynamic imports of dangerous modules
    /import\s*\(\s*['"]child_process['"]\s*\)/gi,
    /import\s*\(\s*['"]fs['"]\s*\)/gi,

    // Shell execution
    /exec\s*\(/gi,
    /spawn\s*\(/gi,
    /execSync\s*\(/gi,

    // VM and context manipulation
    /vm\.createContext/gi,
    /vm\.runInNewContext/gi,
    /vm\.runInThisContext/gi,
  ],
  requiredPermissions: [],
  elevatedPermissionPrompt: true,
  allowDynamicExecution: false,
  trustedDomains: [
    'anthropic.com',
    'claude.ai',
  ],
};

/**
 * Strict security policy - maximum security, minimal permissions
 */
export const STRICT_POLICY: SecurityPolicy = {
  maxPermissions: {
    filesystem: 5,
    network: 3,
    tools: 10,
  },
  bannedPatterns: [
    ...DEFAULT_POLICY.bannedPatterns,
    // Additional restrictions
    /setTimeout/gi,
    /setInterval/gi,
    /setImmediate/gi,
    /Promise\.race/gi,
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /WebSocket/gi,
  ],
  requiredPermissions: [],
  elevatedPermissionPrompt: true,
  allowDynamicExecution: false,
  trustedDomains: ['anthropic.com'],
};

/**
 * Permissive security policy - for trusted plugins
 */
export const PERMISSIVE_POLICY: SecurityPolicy = {
  maxPermissions: {
    filesystem: 50,
    network: 20,
    tools: 30,
  },
  bannedPatterns: [
    // Only ban the most dangerous patterns
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /child_process/gi,
    /vm\.createContext/gi,
  ],
  requiredPermissions: [],
  elevatedPermissionPrompt: false,
  allowDynamicExecution: true,
  trustedDomains: [
    'anthropic.com',
    'claude.ai',
    'github.com',
    'npmjs.org',
  ],
};

/**
 * Development security policy - for plugin development
 */
export const DEVELOPMENT_POLICY: SecurityPolicy = {
  maxPermissions: {
    filesystem: 100,
    network: 50,
    tools: 50,
  },
  bannedPatterns: [
    // Minimal restrictions for development
    /rm\s+-rf\s+\//gi,
    /del\s+\/s\s+\/q/gi,
  ],
  requiredPermissions: [],
  elevatedPermissionPrompt: false,
  allowDynamicExecution: true,
  trustedDomains: ['*'],
};

/**
 * Patterns to detect hardcoded secrets
 */
export const SECRET_PATTERNS = [
  {
    type: 'api_key' as const,
    pattern: /(?:api[_-]?key|apikey)[\s:=]+['"]([a-zA-Z0-9_\-]{32,})['"]$/gim,
    description: 'API key detected',
  },
  {
    type: 'token' as const,
    pattern: /(?:token|auth[_-]?token)[\s:=]+['"]([a-zA-Z0-9_\-]{20,})['"]$/gim,
    description: 'Auth token detected',
  },
  {
    type: 'password' as const,
    pattern: /(?:password|passwd|pwd)[\s:=]+['"]([^'"]{8,})['"]$/gim,
    description: 'Password detected',
  },
  {
    type: 'private_key' as const,
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/gi,
    description: 'Private key detected',
  },
  {
    type: 'api_key' as const,
    pattern: /sk-[a-zA-Z0-9]{48}/gi,
    description: 'OpenAI API key detected',
  },
  {
    type: 'api_key' as const,
    pattern: /sk-ant-[a-zA-Z0-9_-]{95,}/gi,
    description: 'Anthropic API key detected',
  },
  {
    type: 'token' as const,
    pattern: /ghp_[a-zA-Z0-9]{36}/gi,
    description: 'GitHub personal access token detected',
  },
  {
    type: 'token' as const,
    pattern: /gho_[a-zA-Z0-9]{36}/gi,
    description: 'GitHub OAuth token detected',
  },
];

/**
 * Allowed Node.js built-in modules (whitelist approach)
 */
export const ALLOWED_BUILTINS = new Set([
  'util',
  'events',
  'stream',
  'buffer',
  'string_decoder',
  'path',
  'url',
  'querystring',
  'punycode',
  'assert',
  'crypto', // Allow crypto but monitor usage
  'zlib',
]);

/**
 * Blocked Node.js built-in modules (blacklist approach)
 */
export const BLOCKED_BUILTINS = new Set([
  'fs',
  'fs/promises',
  'child_process',
  'net',
  'dgram',
  'dns',
  'http',
  'https',
  'http2',
  'tls',
  'cluster',
  'worker_threads',
  'vm',
  'repl',
  'inspector',
]);

/**
 * Allowed npm packages (whitelist - commonly used safe packages)
 */
export const ALLOWED_PACKAGES = new Set([
  'lodash',
  'lodash-es',
  'uuid',
  'nanoid',
  'date-fns',
  'dayjs',
  'zod',
  'yup',
  'joi',
  'ajv',
  'chalk',
  'debug',
]);

/**
 * Blocked npm packages (known dangerous packages)
 */
export const BLOCKED_PACKAGES = new Set([
  'shelljs',
  'exec',
  'eval',
  'node-pty',
  'serialport',
]);

/**
 * Get security policy by name
 */
export function getPolicy(name: string): SecurityPolicy {
  switch (name.toLowerCase()) {
    case 'strict':
      return STRICT_POLICY;
    case 'permissive':
      return PERMISSIVE_POLICY;
    case 'development':
    case 'dev':
      return DEVELOPMENT_POLICY;
    case 'default':
    default:
      return DEFAULT_POLICY;
  }
}

/**
 * Merge custom policy with default
 */
export function mergePolicy(
  base: SecurityPolicy,
  custom: Partial<SecurityPolicy>
): SecurityPolicy {
  return {
    maxPermissions: {
      ...base.maxPermissions,
      ...custom.maxPermissions,
    },
    bannedPatterns: [
      ...base.bannedPatterns,
      ...(custom.bannedPatterns || []),
    ],
    requiredPermissions: [
      ...base.requiredPermissions,
      ...(custom.requiredPermissions || []),
    ],
    elevatedPermissionPrompt:
      custom.elevatedPermissionPrompt ?? base.elevatedPermissionPrompt,
    allowDynamicExecution:
      custom.allowDynamicExecution ?? base.allowDynamicExecution,
    trustedDomains: [
      ...(base.trustedDomains || []),
      ...(custom.trustedDomains || []),
    ],
  };
}
