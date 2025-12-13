# Security Sandbox - Quick Reference

## Common Operations

### Scan Plugin Code

```typescript
import { CodeScanner } from './.claude/core/sandbox';

const scanner = new CodeScanner();
const result = scanner.scanCode(code);

console.log('Score:', result.securityScore);  // 0-100
console.log('Passed:', result.passed);        // boolean
console.log('Issues:', result.dangerousPatterns);
console.log('Secrets:', result.secrets);
```

### Validate Permissions

```typescript
import { PermissionValidator } from './.claude/core/sandbox';

const validator = new PermissionValidator();
const permissions = validator.parsePermissions(manifest);
const validation = validator.validateAgainstPolicy(permissions);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

### Execute in Sandbox

```typescript
import { SandboxRuntime } from './.claude/core/sandbox';

const runtime = new SandboxRuntime();
const context = runtime.createContext('plugin-name', permissions);

const result = await runtime.execute(code, context);

if (result.success) {
  console.log('Result:', result.value);
} else {
  console.error('Error:', result.error);
}

runtime.destroyContext(context.id);
```

### Check Permission

```typescript
import { PermissionValidator } from './.claude/core/sandbox';

const validator = new PermissionValidator();

// Check if action is allowed
const allowed = validator.checkPermission(
  'fs:read',              // action
  '.claude/config.json',  // resource
  permissions             // permission set
);
```

### Get Audit Log

```typescript
const log = validator.getAuditLog({
  plugin: 'my-plugin',
  allowed: false,  // only denied
  since: Date.now() - 3600000  // last hour
});
```

## CLI Commands

```bash
# Scan plugin for security issues
npm run security:scan <plugin-name>

# Show plugin permissions
npm run security:permissions <plugin-name>

# View audit log
npm run security:audit [plugin-name]

# Revoke all permissions
npm run security:revoke <plugin-name> --all
```

## Plugin Manifest

```json
{
  "permissions": {
    "filesystem": [
      { "path": ".claude/**", "access": "read" },
      { "path": "output/**", "access": "write" }
    ],
    "network": [
      { "host": "api.anthropic.com", "protocols": ["https"] }
    ],
    "tools": ["Read", "Write", "Grep"]
  },
  "sandbox": {
    "enabled": true,
    "memoryLimit": "256MB",
    "timeoutMs": 30000
  }
}
```

## Security Policies

```typescript
import {
  DEFAULT_POLICY,      // Balanced
  STRICT_POLICY,       // Maximum security
  PERMISSIVE_POLICY,   // Trusted plugins
  DEVELOPMENT_POLICY,  // Development only
} from './.claude/core/sandbox';

const runtime = new SandboxRuntime({ policy: STRICT_POLICY });
```

## Common Patterns

### Scan Before Install

```typescript
const scanner = new CodeScanner();
const files = await loadPluginFiles(pluginPath);

for (const file of files) {
  const result = scanner.scanCode(file.content);
  if (result.securityScore < 70) {
    throw new Error('Security score too low');
  }
}
```

### Execute with Timeout

```typescript
const context = runtime.createContext('plugin', permissions, {
  cpuTimeMs: 10000,  // 10 seconds
  networkCalls: 50,
});

const result = await runtime.execute(code, context);
```

### Handle Violations

```typescript
const runtime = new SandboxRuntime({
  onViolation: (violation) => {
    console.error(`[${violation.severity}] ${violation.message}`);
    // Alert, log, etc.
  }
});
```

## Dangerous Patterns

### Critical (Auto-Reject)
- `eval()`
- `new Function()`
- `child_process`
- `exec()`, `spawn()`

### High (Warn)
- `process.env`
- `vm.createContext`
- `fs` module access

### Medium (Review)
- Dynamic `require()`
- `innerHTML`
- Path traversal (`../`)

## Blocked Resources

### Filesystem
- `/etc`, `/sys`, `/proc` (system dirs)
- `../` (path traversal)
- Absolute system paths

### Network
- `localhost`, `127.0.0.1`
- Private IPs (`192.168.*`, `10.*`)
- Non-trusted domains

## Resource Limits

```typescript
interface ResourceLimits {
  memoryLimit: string;    // '256MB', '1GB'
  cpuTimeMs: number;      // 30000 (30s)
  networkCalls: number;   // 100
  filesystemOps: number;  // 500
}
```

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| Permission denied: network access | No network permission | Add to `permissions.network` |
| Execution timeout | Code too slow | Optimize or increase `timeoutMs` |
| Network call limit exceeded | Too many requests | Increase limit or optimize |
| Security violation: eval() | Forbidden pattern | Remove dangerous code |

## Secret Patterns

Detected automatically:
- API keys: `sk-*`, `sk-ant-*`
- Tokens: `ghp_*`, `gho_*`
- Passwords: `password = "..."`
- Private keys: `-----BEGIN PRIVATE KEY-----`

## Import Validation

### Allowed Built-ins
`util`, `events`, `stream`, `buffer`, `path`, `url`, `crypto`

### Blocked Built-ins
`fs`, `child_process`, `net`, `http`, `vm`, `cluster`

### Allowed Packages
`lodash`, `uuid`, `date-fns`, `zod`, `chalk`

### Blocked Packages
`shelljs`, `exec`, `eval`, `node-pty`

## Quick Troubleshooting

### Low Security Score
1. Run scanner to identify issues
2. Remove dangerous patterns
3. Move secrets to env vars
4. Replace blocked imports

### Permission Denied
1. Check `permissions` in manifest
2. Verify path/host matches
3. Add missing permission
4. Reinstall plugin

### Timeout Errors
1. Profile code performance
2. Increase `timeoutMs`
3. Optimize algorithms
4. Use async operations

### Resource Limit Exceeded
1. Check resource usage
2. Increase limits in manifest
3. Optimize resource usage
4. Add caching

## TypeScript Types

```typescript
import type {
  PermissionSet,
  SecurityPolicy,
  SandboxContext,
  ExecutionResult,
  ValidationResult,
  SecurityScanResult,
} from './.claude/core/sandbox';
```

## Examples Directory

```
examples/
├── basic-usage.ts         # Common operations
├── custom-policy.ts       # Custom security policy
├── permission-checks.ts   # Runtime permission checks
└── resource-limits.ts     # Resource limit handling
```

## Documentation

- `README.md` - Full documentation
- `INTEGRATION.md` - Integration guide
- `QUICK-REFERENCE.md` - This file
- `types.ts` - TypeScript definitions

## Support

For help:
1. Check `README.md` for detailed docs
2. Review examples in `examples/`
3. Read integration guide
4. Check TypeScript definitions

## Version

Security Sandbox v1.0.0
Compatible with Claude Code Plugin API v1
