# Security Sandbox for Third-Party Plugins

A comprehensive security sandbox system for safely executing third-party plugin code in Claude Code CLI.

## Overview

The security sandbox provides multiple layers of protection:

1. **Static Code Analysis** - Scans code for dangerous patterns, secrets, and unsafe imports
2. **Permission System** - Fine-grained control over filesystem, network, and tool access
3. **Runtime Isolation** - Executes code in restricted JavaScript contexts
4. **Resource Limits** - Prevents resource exhaustion (memory, CPU, network)
5. **Audit Logging** - Tracks all permission usage and security events

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Plugin Code                        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              Code Scanner                            │
│  • Pattern Detection                                 │
│  • Secret Scanning                                   │
│  • Import Validation                                 │
│  • Security Scoring                                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│         Permission Validator                         │
│  • Parse Manifest Permissions                        │
│  • Validate Against Policy                           │
│  • Runtime Permission Checks                         │
│  • Audit Logging                                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           Sandbox Runtime                            │
│  • Create Isolated Context                           │
│  • Restrict Global Access                            │
│  • Enforce Resource Limits                           │
│  • Execute with Timeout                              │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Scan Plugin Code

```typescript
import { CodeScanner } from './.claude/core/sandbox';

const scanner = new CodeScanner();
const code = `
  const apiKey = process.env.ANTHROPIC_API_KEY;
  fetch('https://api.anthropic.com/v1/messages', {
    headers: { 'x-api-key': apiKey }
  });
`;

const result = scanner.scanCode(code);

console.log('Security Score:', result.securityScore);
console.log('Dangerous Patterns:', result.dangerousPatterns);
console.log('Secrets Found:', result.secrets);
console.log('Recommendations:', result.recommendations);
```

### 2. Validate Permissions

```typescript
import { PermissionValidator } from './.claude/core/sandbox';

const validator = new PermissionValidator();

const manifest = {
  name: 'my-plugin',
  version: '1.0.0',
  permissions: {
    filesystem: [
      { path: '.claude/**', access: 'read' },
      { path: 'output/*.json', access: 'write' }
    ],
    network: [
      { host: 'api.anthropic.com', protocols: ['https'] }
    ],
    tools: ['Read', 'Write', 'Bash']
  }
};

const permissions = validator.parsePermissions(manifest);
const validation = validator.validateAgainstPolicy(permissions);

if (validation.valid) {
  console.log('Permissions approved:', validation.approved);
} else {
  console.error('Validation errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}
```

### 3. Execute in Sandbox

```typescript
import { SandboxRuntime } from './.claude/core/sandbox';

const runtime = new SandboxRuntime({
  strictMode: true,
  onViolation: (violation) => {
    console.error('Security violation:', violation);
  }
});

const context = runtime.createContext(
  'my-plugin',
  permissions,
  {
    memoryLimit: '128MB',
    cpuTimeMs: 10000,
    networkCalls: 50
  }
);

const code = `
  console.log('Hello from sandbox!');
  const data = await fetch('https://api.anthropic.com/v1/models');
  return data.json();
`;

const result = await runtime.execute(code, context);

if (result.success) {
  console.log('Result:', result.value);
  console.log('Usage:', result.usage);
} else {
  console.error('Error:', result.error);
  console.error('Violations:', result.violations);
}

// Cleanup
runtime.destroyContext(context.id);
```

## Plugin Manifest

Add security configuration to your `plugin.json`:

```json
{
  "name": "my-secure-plugin",
  "version": "1.0.0",
  "description": "A secure plugin with proper permissions",
  "author": {
    "name": "Your Name"
  },

  "permissions": {
    "filesystem": [
      {
        "path": ".claude/plugins/my-plugin/**",
        "access": "readwrite"
      },
      {
        "path": "output/**",
        "access": "write"
      }
    ],
    "network": [
      {
        "host": "api.anthropic.com",
        "protocols": ["https"]
      },
      {
        "host": "*.github.com",
        "protocols": ["https"]
      }
    ],
    "tools": [
      "Read",
      "Write",
      "Grep",
      "Glob"
    ],
    "mcpServers": [
      "github",
      "obsidian"
    ]
  },

  "sandbox": {
    "enabled": true,
    "memoryLimit": "256MB",
    "timeoutMs": 30000,
    "allowedCommands": [
      "git",
      "npm",
      "node"
    ]
  }
}
```

## Permission Types

### Filesystem Permissions

```typescript
interface FileSystemPermission {
  path: string;      // Glob pattern: '.claude/**', 'output/*.json'
  access: 'read' | 'write' | 'readwrite';
}
```

**Examples:**
- `{ path: '.claude/**', access: 'read' }` - Read all files in .claude/
- `{ path: 'output/*.json', access: 'write' }` - Write JSON files to output/
- `{ path: 'temp/**', access: 'readwrite' }` - Full access to temp/

**Blocked Paths:**
- `/etc`, `/sys`, `/proc`, `/dev` (Unix system dirs)
- `C:\Windows`, `C:\Program Files` (Windows system dirs)
- Paths with `../` (path traversal)

### Network Permissions

```typescript
interface NetworkPermission {
  host: string;        // 'api.anthropic.com' or '*.github.com'
  ports?: number[];    // [443, 8080]
  protocols?: string[]; // ['https', 'wss']
}
```

**Examples:**
- `{ host: 'api.anthropic.com', protocols: ['https'] }` - HTTPS to Anthropic API
- `{ host: '*.github.com' }` - Any GitHub subdomain
- `{ host: 'localhost', ports: [3000] }` - ❌ Blocked (localhost not allowed)

**Blocked Hosts:**
- `localhost`, `127.0.0.1`, `0.0.0.0`
- Private IPs: `192.168.*`, `10.*`, `172.16-31.*`

### Tool Permissions

```typescript
tools: string[]  // Array of allowed Claude Code tools
```

**Available Tools:**
- `Bash` - Execute shell commands
- `Read` - Read files
- `Write` - Write files
- `Edit` - Edit files
- `Grep` - Search in files
- `Glob` - Find files by pattern
- `WebFetch` - Fetch web content
- `WebSearch` - Search the web
- `Task` - Spawn sub-agents
- `TodoWrite` - Manage todos

## Security Policies

### Default Policy (Balanced)

```typescript
import { DEFAULT_POLICY } from './.claude/core/sandbox';

// Limits
maxPermissions: {
  filesystem: 10,
  network: 5,
  tools: 15
}

// Blocks: eval, Function(), child_process, vm, exec, spawn
// Allows: Most standard operations
// Prompts: For elevated permissions
```

### Strict Policy (Maximum Security)

```typescript
import { STRICT_POLICY } from './.claude/core/sandbox';

// Limits
maxPermissions: {
  filesystem: 5,
  network: 3,
  tools: 10
}

// Additional blocks: setTimeout, setInterval, fetch, WebSocket
// Minimal trust
// Always prompts
```

### Permissive Policy (Trusted Plugins)

```typescript
import { PERMISSIVE_POLICY } from './.claude/core/sandbox';

// Limits
maxPermissions: {
  filesystem: 50,
  network: 20,
  tools: 30
}

// Minimal blocks: Only most dangerous patterns
// Allows dynamic execution
// No prompts
```

### Development Policy

```typescript
import { DEVELOPMENT_POLICY } from './.claude/core/sandbox';

// For plugin development only
// Minimal restrictions
// No prompts
// ⚠️ DO NOT use in production
```

### Custom Policy

```typescript
import { mergePolicy, DEFAULT_POLICY } from './.claude/core/sandbox';

const customPolicy = mergePolicy(DEFAULT_POLICY, {
  maxPermissions: {
    network: 10  // Allow more network calls
  },
  trustedDomains: [
    'myapi.example.com'
  ],
  elevatedPermissionPrompt: false
});

const runtime = new SandboxRuntime({
  policy: customPolicy
});
```

## Code Scanner

### Dangerous Pattern Detection

The scanner detects:

- **Critical:** `eval()`, `Function()`, `child_process`, `exec()`, `spawn()`
- **High:** `process.env`, `vm.createContext`, `vm.runInNewContext`
- **Medium:** Dynamic `require()`, `innerHTML`, `dangerouslySetInnerHTML`
- **Low:** `__dirname`, `__filename`, path patterns

### Secret Detection

Detects common secret patterns:

- API keys (OpenAI: `sk-*`, Anthropic: `sk-ant-*`)
- GitHub tokens (`ghp_*`, `gho_*`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- Generic patterns (api_key, token, password)

**Example:**

```typescript
const scanner = new CodeScanner();
const files = [
  { path: 'config.ts', content: 'const API_KEY = "sk-ant-..."' },
  { path: 'auth.ts', content: 'const token = "ghp_..."' }
];

const secrets = scanner.scanForSecrets(files);
// Returns: [
//   { type: 'api_key', file: 'config.ts', line: 1, confidence: 0.9 },
//   { type: 'token', file: 'auth.ts', line: 1, confidence: 0.9 }
// ]
```

### Import Validation

Validates imported modules:

**Allowed Built-ins:**
- `util`, `events`, `stream`, `buffer`, `path`, `url`, `crypto`, `zlib`

**Blocked Built-ins:**
- `fs`, `child_process`, `net`, `http`, `https`, `vm`, `cluster`

**Allowed Packages:**
- `lodash`, `uuid`, `nanoid`, `date-fns`, `zod`, `yup`, `chalk`

**Blocked Packages:**
- `shelljs`, `exec`, `eval`, `node-pty`

**Example:**

```typescript
const code = `
  import fs from 'fs';           // ❌ Blocked
  import { exec } from 'child_process';  // ❌ Blocked
  import lodash from 'lodash';   // ✅ Allowed
  import crypto from 'crypto';   // ✅ Allowed
`;

const result = scanner.validateImports(code, ALLOWED_PACKAGES);
// result.blocked: ['fs', 'child_process']
// result.allowed: ['lodash', 'crypto']
```

## Runtime Isolation

### Restricted Globals

The sandbox only exposes safe globals:

**Available:**
- `console` (restricted, prefixed with plugin name)
- `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`
- `Promise`, `Array`, `Object`, `String`, `Number`, `Boolean`
- `Date`, `Math`, `JSON`, `Map`, `Set`, `Error`, `RegExp`
- `fetch` (with permission checks)
- `URL`, `URLSearchParams`, `TextEncoder`, `TextDecoder`

**Blocked:**
- `process`, `require`, `import`, `eval`, `Function`
- `global`, `globalThis` (restricted)
- `__dirname`, `__filename`

### Resource Limits

```typescript
interface ResourceLimits {
  memoryLimit: string;    // '256MB', '1GB'
  cpuTimeMs: number;      // 30000 (30 seconds)
  networkCalls: number;   // 100
  filesystemOps: number;  // 500
}
```

**Enforcement:**
- Memory: Monitored via V8 heap stats
- CPU: Timeout after cpuTimeMs
- Network: Counted and limited per context
- Filesystem: Counted and limited per context

### Execution Example

```typescript
const runtime = new SandboxRuntime();
const context = runtime.createContext('my-plugin', permissions, {
  memoryLimit: '128MB',
  cpuTimeMs: 5000,  // 5 seconds
  networkCalls: 10
});

// This will timeout
const infiniteLoop = `
  while (true) {
    console.log('Running...');
  }
`;

const result = await runtime.execute(infiniteLoop, context);
// result.success: false
// result.error: 'Execution timeout after 5000ms'
// result.violations: [{ type: 'timeout', severity: 'high', ... }]
```

## Audit Logging

Track all security-relevant operations:

```typescript
const validator = new PermissionValidator();

// Check permission (automatically logged)
const allowed = validator.checkPermission(
  'fs:read',
  '.claude/config.json',
  permissions
);

// Get audit log
const log = validator.getAuditLog({
  plugin: 'my-plugin',
  allowed: false,  // Only denied actions
  since: Date.now() - 3600000  // Last hour
});

// Export audit log
const json = validator.exportAuditLog();
fs.writeFileSync('audit.json', json);
```

**Audit Entry:**

```typescript
interface AuditLogEntry {
  timestamp: number;
  plugin: string;
  action: string;         // 'fs:read', 'network:fetch', 'tool:Bash'
  resource: string;       // File path, hostname, etc.
  allowed: boolean;
  permission?: string;    // Permission that authorized/denied
  user?: string;
  context?: Record<string, unknown>;
}
```

## Integration Guide

### 1. Plugin Installation

```typescript
import { CodeScanner, PermissionValidator } from './.claude/core/sandbox';

async function installPlugin(pluginPath: string) {
  // Load manifest
  const manifest = JSON.parse(
    await fs.readFile(`${pluginPath}/plugin.json`, 'utf-8')
  );

  // Scan all plugin code
  const scanner = new CodeScanner();
  const files = await loadPluginFiles(pluginPath);

  for (const file of files) {
    const result = scanner.scanCode(file.content);

    if (result.securityScore < 70) {
      throw new Error(
        `Security score too low (${result.securityScore}/100): ${file.path}`
      );
    }

    if (result.secrets.length > 0) {
      throw new Error(
        `Hardcoded secrets found in ${file.path}`
      );
    }
  }

  // Validate permissions
  const validator = new PermissionValidator();
  const permissions = validator.parsePermissions(manifest);
  const validation = validator.validateAgainstPolicy(permissions);

  if (!validation.valid) {
    throw new Error(`Permission validation failed: ${validation.errors.join(', ')}`);
  }

  // Prompt user for permission approval
  const approved = await promptUser(validation.approved);
  if (!approved) {
    throw new Error('User denied permissions');
  }

  // Install plugin
  await installPluginFiles(pluginPath);
  await savePermissions(manifest.name, validation.approved);
}
```

### 2. Plugin Execution

```typescript
import { SandboxRuntime } from './.claude/core/sandbox';

async function executePlugin(pluginName: string, code: string) {
  // Load saved permissions
  const permissions = await loadPermissions(pluginName);

  // Create sandbox
  const runtime = new SandboxRuntime({
    strictMode: true,
    onViolation: (violation) => {
      console.error(`[${pluginName}] Security violation:`, violation);
      reportViolation(pluginName, violation);
    }
  });

  // Create context
  const context = runtime.createContext(pluginName, permissions);

  try {
    // Execute
    const result = await runtime.execute(code, context);

    if (!result.success) {
      console.error(`[${pluginName}] Execution failed:`, result.error);
      return null;
    }

    return result.value;
  } finally {
    // Always cleanup
    runtime.destroyContext(context.id);
  }
}
```

### 3. Periodic Security Scans

```typescript
import { CodeScanner } from './.claude/core/sandbox';

async function scanInstalledPlugins() {
  const scanner = new CodeScanner();
  const plugins = await getInstalledPlugins();
  const report = [];

  for (const plugin of plugins) {
    const files = await loadPluginFiles(plugin.path);
    const results = files.map(file => ({
      file: file.path,
      scan: scanner.scanCode(file.content)
    }));

    const avgScore = results.reduce(
      (sum, r) => sum + r.scan.securityScore, 0
    ) / results.length;

    report.push({
      plugin: plugin.name,
      version: plugin.version,
      securityScore: avgScore,
      issues: results.flatMap(r => r.scan.dangerousPatterns),
      secrets: results.flatMap(r => r.scan.secrets)
    });
  }

  // Flag plugins with low scores
  const unsafe = report.filter(p => p.securityScore < 70);
  if (unsafe.length > 0) {
    console.warn('Unsafe plugins detected:', unsafe);
  }

  return report;
}
```

## Best Practices

### For Plugin Authors

1. **Request Minimal Permissions**
   - Only request permissions you actually need
   - Use most restrictive access levels (`read` vs `readwrite`)
   - Scope filesystem paths as narrowly as possible

2. **Avoid Dangerous Patterns**
   - Don't use `eval()`, `Function()`, or dynamic code execution
   - Don't hardcode secrets - use environment variables
   - Validate all user inputs

3. **Handle Errors Gracefully**
   - Catch and handle permission denied errors
   - Provide helpful error messages
   - Don't retry after permission denial

4. **Test Security**
   - Run code scanner during development
   - Test with different security policies
   - Document all required permissions

### For Users

1. **Review Permissions**
   - Check requested permissions before installing
   - Verify permissions match plugin functionality
   - Question overly broad permissions

2. **Monitor Audit Logs**
   - Regularly review permission usage
   - Look for unexpected access patterns
   - Investigate denied permission attempts

3. **Update Regularly**
   - Keep plugins updated for security fixes
   - Re-scan plugins after updates
   - Remove unused plugins

4. **Use Appropriate Policies**
   - Default policy for most plugins
   - Strict policy for untrusted sources
   - Development policy only for testing

## Troubleshooting

### Permission Denied Errors

```
Error: Permission denied: network access to api.example.com
```

**Solution:** Add network permission to `plugin.json`:

```json
{
  "permissions": {
    "network": [
      { "host": "api.example.com", "protocols": ["https"] }
    ]
  }
}
```

### Timeout Errors

```
Error: Execution timeout after 30000ms
```

**Solution:** Optimize code or increase timeout:

```json
{
  "sandbox": {
    "timeoutMs": 60000  // 60 seconds
  }
}
```

### Security Scan Failures

```
Error: Security score too low (45/100)
```

**Solution:** Fix detected issues:
- Remove `eval()` and dangerous patterns
- Move secrets to environment variables
- Replace blocked imports with safe alternatives

### Resource Limit Exceeded

```
Error: Network call limit exceeded
```

**Solution:** Request higher limits or optimize usage:

```json
{
  "sandbox": {
    "memoryLimit": "512MB"
  }
}
```

## API Reference

See TypeScript definitions in:
- `types.ts` - All type definitions
- `sandbox-runtime.ts` - SandboxRuntime class
- `permission-validator.ts` - PermissionValidator class
- `code-scanner.ts` - CodeScanner class
- `security-policy.ts` - Security policies

## Examples

See `/examples` directory for complete examples:
- `simple-plugin/` - Basic plugin with minimal permissions
- `network-plugin/` - Plugin with network access
- `filesystem-plugin/` - Plugin with filesystem access
- `untrusted-plugin/` - Example of blocked patterns

## Security Model

The security sandbox uses a **defense-in-depth** approach:

1. **Static Analysis** - Catch issues before execution
2. **Permission System** - Least-privilege access control
3. **Runtime Isolation** - Limited global scope
4. **Resource Limits** - Prevent resource exhaustion
5. **Audit Logging** - Detect and respond to misuse

**Not a Silver Bullet:** While this provides strong security, no sandbox is perfect. Always:
- Review plugin source code
- Install plugins from trusted sources
- Monitor audit logs
- Keep plugins updated

## Contributing

To improve the security sandbox:

1. Add new dangerous patterns to `security-policy.ts`
2. Enhance secret detection in `code-scanner.ts`
3. Implement additional resource limits
4. Add tests for bypass attempts

## License

See LICENSE file in repository root.
