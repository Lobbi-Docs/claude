# Security Sandbox Integration Guide

This guide shows how to integrate the security sandbox into the Claude Code plugin system.

## Integration Points

### 1. Plugin Installer

Integrate security scanning during plugin installation:

```typescript
// plugin-installer.ts

import {
  CodeScanner,
  PermissionValidator,
  DEFAULT_POLICY,
  SecurityScanResult,
} from './core/sandbox/index.js';

export class PluginInstaller {
  private scanner = new CodeScanner();
  private validator = new PermissionValidator(DEFAULT_POLICY);

  async install(pluginPath: string): Promise<void> {
    // 1. Load plugin manifest
    const manifest = await this.loadManifest(pluginPath);

    // 2. Security scan all plugin files
    const scanResult = await this.scanPlugin(pluginPath);

    if (!this.isSecurityScoreAcceptable(scanResult)) {
      throw new Error(
        `Plugin failed security scan (score: ${scanResult.securityScore}/100)`
      );
    }

    // 3. Validate permissions
    const permissions = this.validator.parsePermissions(manifest);
    const validation = this.validator.validateAgainstPolicy(permissions);

    if (!validation.valid) {
      throw new Error(
        `Invalid permissions: ${validation.errors.join(', ')}`
      );
    }

    // 4. Prompt user for permission approval
    if (validation.warnings.length > 0) {
      const approved = await this.promptUserApproval(
        manifest.name,
        validation.approved,
        validation.warnings
      );

      if (!approved) {
        throw new Error('User denied plugin permissions');
      }
    }

    // 5. Install plugin files
    await this.installFiles(pluginPath);

    // 6. Store approved permissions
    await this.savePermissions(manifest.name, validation.approved);

    console.log(`Plugin ${manifest.name} installed successfully`);
  }

  private async scanPlugin(pluginPath: string): Promise<SecurityScanResult> {
    const files = await this.loadAllPluginFiles(pluginPath);
    let totalScore = 0;
    const allPatterns = [];
    const allSecrets = [];
    const allImportViolations = [];

    for (const file of files) {
      // Skip non-code files
      if (!this.isCodeFile(file.path)) continue;

      const result = this.scanner.scanCode(file.content);
      totalScore += result.securityScore;
      allPatterns.push(...result.dangerousPatterns);
      allSecrets.push(...result.secrets);
      allImportViolations.push(...result.importViolations);
    }

    const avgScore = totalScore / files.length;

    return {
      passed: avgScore >= 70 && allSecrets.length === 0,
      securityScore: avgScore,
      dangerousPatterns: allPatterns,
      secrets: allSecrets,
      importViolations: allImportViolations,
      recommendations: this.generateRecommendations(allPatterns, allSecrets),
    };
  }

  private isSecurityScoreAcceptable(result: SecurityScanResult): boolean {
    // Minimum score: 70
    if (result.securityScore < 70) return false;

    // No hardcoded secrets
    if (result.secrets.length > 0) return false;

    // No critical security issues
    const critical = result.dangerousPatterns.filter(
      (p) => p.severity === 'critical'
    );
    if (critical.length > 0) return false;

    return true;
  }

  private isCodeFile(path: string): boolean {
    return /\.(ts|js|mjs|cjs)$/.test(path);
  }
}
```

### 2. Plugin Executor

Execute plugin code in sandbox:

```typescript
// plugin-executor.ts

import {
  SandboxRuntime,
  PermissionSet,
  SandboxOptions,
} from './core/sandbox/index.js';

export class PluginExecutor {
  private runtime: SandboxRuntime;
  private permissions = new Map<string, PermissionSet>();

  constructor(options?: SandboxOptions) {
    this.runtime = new SandboxRuntime({
      strictMode: true,
      onViolation: (violation) => {
        console.error('Security violation:', violation);
        this.logViolation(violation);
      },
      ...options,
    });
  }

  async execute(pluginName: string, code: string): Promise<unknown> {
    // Load saved permissions
    const permissions = await this.loadPermissions(pluginName);

    if (!permissions) {
      throw new Error(`No permissions found for plugin: ${pluginName}`);
    }

    // Create sandbox context
    const context = this.runtime.createContext(
      pluginName,
      permissions,
      {
        memoryLimit: '256MB',
        cpuTimeMs: 30000,
        networkCalls: 100,
        filesystemOps: 500,
      }
    );

    try {
      // Execute code
      const result = await this.runtime.execute(code, context);

      if (!result.success) {
        throw result.error || new Error('Execution failed');
      }

      // Log resource usage
      this.logResourceUsage(pluginName, result.usage);

      return result.value;
    } finally {
      // Always cleanup
      this.runtime.destroyContext(context.id);
    }
  }

  private async loadPermissions(pluginName: string): Promise<PermissionSet | null> {
    // Load from cache or storage
    if (this.permissions.has(pluginName)) {
      return this.permissions.get(pluginName)!;
    }

    // Load from file
    const permissionsFile = `.claude/plugins/${pluginName}/permissions.json`;
    try {
      const content = await fs.readFile(permissionsFile, 'utf-8');
      const permissions = JSON.parse(content);
      this.permissions.set(pluginName, permissions);
      return permissions;
    } catch {
      return null;
    }
  }

  private logResourceUsage(plugin: string, usage: any): void {
    console.log(`[${plugin}] Resource usage:`, {
      cpuTimeMs: usage.cpuTimeMs,
      networkCalls: usage.networkCalls,
      filesystemOps: usage.filesystemOps,
    });
  }

  private logViolation(violation: any): void {
    // Log to audit log, alert system, etc.
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: violation.type,
      severity: violation.severity,
      message: violation.message,
    };

    // Append to audit log file
    const logFile = '.claude/security/violations.log';
    fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }
}
```

### 3. Permission Manager

Manage plugin permissions:

```typescript
// permission-manager.ts

import {
  PermissionValidator,
  PermissionSet,
  ValidationResult,
} from './core/sandbox/index.js';

export class PermissionManager {
  private validator = new PermissionValidator();

  async requestPermission(
    pluginName: string,
    action: string,
    resource: string
  ): Promise<boolean> {
    // Load plugin permissions
    const permissions = await this.loadPermissions(pluginName);

    // Check if permission is already granted
    const hasPermission = this.validator.checkPermission(
      action,
      resource,
      permissions
    );

    if (hasPermission) {
      return true;
    }

    // Permission not granted - prompt user
    const approved = await this.promptUserPermission(
      pluginName,
      action,
      resource
    );

    if (approved) {
      // Add to permissions
      await this.addPermission(pluginName, action, resource);
      return true;
    }

    return false;
  }

  async revokePermission(
    pluginName: string,
    action: string,
    resource?: string
  ): Promise<void> {
    const permissions = await this.loadPermissions(pluginName);

    // Remove matching permissions
    if (action.startsWith('fs:')) {
      permissions.filesystem = permissions.filesystem.filter(
        (p) => !resource || p.path !== resource
      );
    } else if (action.startsWith('network:')) {
      permissions.network = permissions.network.filter(
        (p) => !resource || p.host !== resource
      );
    } else if (action.startsWith('tool:')) {
      const tool = action.substring(5);
      permissions.tools = permissions.tools.filter((t) => t !== tool);
    }

    await this.savePermissions(pluginName, permissions);
  }

  async auditPluginPermissions(pluginName: string): Promise<string[]> {
    const log = this.validator.getAuditLog({
      plugin: pluginName,
    });

    // Find suspicious patterns
    const suspicious = [];

    // Check for denied permission attempts
    const denied = log.filter((entry) => !entry.allowed);
    if (denied.length > 5) {
      suspicious.push(
        `${denied.length} denied permission attempts detected`
      );
    }

    // Check for unusual resource access
    const resources = new Set(log.map((entry) => entry.resource));
    if (resources.size > 100) {
      suspicious.push(
        `Accessed ${resources.size} different resources (unusual)`
      );
    }

    return suspicious;
  }

  exportAuditLog(pluginName?: string): string {
    const log = this.validator.getAuditLog(
      pluginName ? { plugin: pluginName } : undefined
    );

    return JSON.stringify(log, null, 2);
  }
}
```

### 4. CLI Commands

Add CLI commands for security management:

```typescript
// cli-security.ts

import { Command } from 'commander';
import { CodeScanner, PermissionValidator } from './core/sandbox/index.js';

export function registerSecurityCommands(program: Command): void {
  const security = program
    .command('security')
    .description('Security management commands');

  // Scan plugin
  security
    .command('scan <plugin-name>')
    .description('Scan plugin for security issues')
    .action(async (pluginName) => {
      const scanner = new CodeScanner();
      const pluginPath = `.claude/plugins/${pluginName}`;
      const files = await loadPluginFiles(pluginPath);

      console.log(`Scanning ${pluginName}...`);

      for (const file of files) {
        const result = scanner.scanCode(file.content);
        console.log(`\n${file.path}:`);
        console.log(`  Security Score: ${result.securityScore}/100`);
        console.log(`  Issues: ${result.dangerousPatterns.length}`);
        console.log(`  Secrets: ${result.secrets.length}`);

        if (result.dangerousPatterns.length > 0) {
          console.log(`  Patterns:`);
          result.dangerousPatterns.forEach((p) => {
            console.log(`    - Line ${p.line}: ${p.description}`);
          });
        }
      }
    });

  // List permissions
  security
    .command('permissions <plugin-name>')
    .description('Show plugin permissions')
    .action(async (pluginName) => {
      const permissions = await loadPermissions(pluginName);
      console.log(JSON.stringify(permissions, null, 2));
    });

  // Show audit log
  security
    .command('audit [plugin-name]')
    .description('Show security audit log')
    .option('-d, --denied', 'Show only denied actions')
    .option('-s, --since <hours>', 'Show entries from last N hours')
    .action(async (pluginName, options) => {
      const validator = new PermissionValidator();
      const since = options.since
        ? Date.now() - options.since * 3600000
        : undefined;

      const log = validator.getAuditLog({
        plugin: pluginName,
        allowed: options.denied ? false : undefined,
        since,
      });

      console.log(`Found ${log.length} audit entries`);
      console.log(JSON.stringify(log, null, 2));
    });

  // Revoke permissions
  security
    .command('revoke <plugin-name>')
    .description('Revoke plugin permissions')
    .option('-a, --all', 'Revoke all permissions')
    .action(async (pluginName, options) => {
      if (options.all) {
        await revokeAllPermissions(pluginName);
        console.log(`All permissions revoked for ${pluginName}`);
      } else {
        console.error('Use --all to revoke all permissions');
      }
    });
}
```

## Testing Integration

Test the sandbox integration:

```typescript
// test-integration.ts

import { describe, it, expect } from 'vitest';
import { PluginInstaller } from './plugin-installer.js';
import { PluginExecutor } from './plugin-executor.js';

describe('Security Sandbox Integration', () => {
  it('should reject plugin with low security score', async () => {
    const installer = new PluginInstaller();
    const maliciousPlugin = createMaliciousPlugin();

    await expect(installer.install(maliciousPlugin)).rejects.toThrow(
      'failed security scan'
    );
  });

  it('should approve safe plugin', async () => {
    const installer = new PluginInstaller();
    const safePlugin = createSafePlugin();

    await expect(installer.install(safePlugin)).resolves.not.toThrow();
  });

  it('should enforce permissions during execution', async () => {
    const executor = new PluginExecutor();

    // Try to access denied resource
    const code = `
      const fs = require('fs');
      fs.readFileSync('/etc/passwd');
    `;

    await expect(executor.execute('test-plugin', code)).rejects.toThrow(
      'Permission denied'
    );
  });

  it('should timeout long-running code', async () => {
    const executor = new PluginExecutor();

    const infiniteLoop = `
      while (true) { }
    `;

    await expect(executor.execute('test-plugin', infiniteLoop)).rejects.toThrow(
      'timeout'
    );
  });

  it('should track resource usage', async () => {
    const executor = new PluginExecutor();

    const code = `
      for (let i = 0; i < 10; i++) {
        await fetch('https://api.github.com');
      }
    `;

    const result = await executor.execute('test-plugin', code);
    expect(result.usage.networkCalls).toBe(10);
  });
});
```

## Migration Guide

If you have existing plugins without security sandbox:

1. **Add permissions to plugin.json:**
   ```json
   {
     "permissions": {
       "filesystem": [...],
       "network": [...],
       "tools": [...]
     },
     "sandbox": {
       "enabled": true
     }
   }
   ```

2. **Scan existing plugins:**
   ```bash
   npm run security:scan-all
   ```

3. **Fix security issues:**
   - Remove `eval()`, `Function()`, etc.
   - Move secrets to environment variables
   - Replace blocked imports

4. **Test with sandbox:**
   ```bash
   npm run test:security
   ```

5. **Update plugin documentation:**
   - Document required permissions
   - Explain security model
   - Provide security best practices

## Best Practices

1. **Default to Strict Mode** - Use strict security policy by default
2. **Scan Before Install** - Always scan plugins before installation
3. **Prompt for Permissions** - Get user approval for sensitive permissions
4. **Log Everything** - Maintain comprehensive audit logs
5. **Regular Audits** - Periodically review plugin permissions and usage
6. **Update Policies** - Keep security policies updated with new threats
7. **Educate Users** - Help users understand security implications

## Security Checklist

- [ ] Code scanner integrated in plugin installer
- [ ] Permission validator checks all manifests
- [ ] Sandbox runtime wraps all plugin executions
- [ ] Audit logging enabled for all operations
- [ ] User prompts for elevated permissions
- [ ] CLI commands for security management
- [ ] Tests cover security scenarios
- [ ] Documentation includes security guide
- [ ] Regular security audits scheduled
- [ ] Incident response plan in place

## Support

For security issues or questions:
- Review `/core/sandbox/README.md`
- Check examples in `/core/sandbox/examples/`
- Run `npm run security:help`
- Report vulnerabilities responsibly
