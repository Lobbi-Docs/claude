/**
 * Security Sandbox Tests
 * Comprehensive tests for sandbox security features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SandboxRuntime,
  PermissionValidator,
  CodeScanner,
  PermissionSet,
  DEFAULT_POLICY,
  STRICT_POLICY,
} from '../index.js';

describe('CodeScanner', () => {
  let scanner: CodeScanner;

  beforeEach(() => {
    scanner = new CodeScanner();
  });

  describe('dangerous pattern detection', () => {
    it('should detect eval()', () => {
      const code = 'eval("console.log(1)")';
      const result = scanner.scanCode(code);

      expect(result.passed).toBe(false);
      expect(result.dangerousPatterns.length).toBeGreaterThan(0);
      expect(result.dangerousPatterns[0].severity).toBe('critical');
    });

    it('should detect Function constructor', () => {
      const code = 'new Function("return 1")';
      const result = scanner.scanCode(code);

      expect(result.passed).toBe(false);
      expect(result.dangerousPatterns.some((p) => /Function/.test(p.description))).toBe(true);
    });

    it('should detect child_process', () => {
      const code = 'const cp = require("child_process")';
      const result = scanner.scanCode(code);

      expect(result.passed).toBe(false);
      expect(result.dangerousPatterns.some((p) => /child_process/.test(p.description))).toBe(true);
    });

    it('should pass safe code', () => {
      const code = `
        const data = { name: "test" };
        console.log(data);
      `;
      const result = scanner.scanCode(code);

      expect(result.passed).toBe(true);
      expect(result.dangerousPatterns.length).toBe(0);
      expect(result.securityScore).toBeGreaterThan(90);
    });
  });

  describe('secret detection', () => {
    it('should detect API keys', () => {
      const files = [
        {
          path: 'config.ts',
          content: 'const key = "sk-ant-api03-abc123def456"',
        },
      ];

      const secrets = scanner.scanForSecrets(files);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0].type).toBe('api_key');
    });

    it('should detect GitHub tokens', () => {
      const files = [
        {
          path: 'auth.ts',
          content: 'const token = "ghp_1234567890abcdefghij"',
        },
      ];

      const secrets = scanner.scanForSecrets(files);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0].type).toBe('token');
    });

    it('should not flag example values', () => {
      const files = [
        {
          path: 'example.ts',
          content: 'const EXAMPLE_KEY = "your-api-key-here"',
        },
      ];

      const secrets = scanner.scanForSecrets(files);
      const highConfidence = secrets.filter((s) => s.confidence > 0.7);
      expect(highConfidence.length).toBe(0);
    });
  });

  describe('import validation', () => {
    it('should block fs module', () => {
      const code = 'import fs from "fs"';
      const result = scanner.validateImports(code, new Set());

      expect(result.blocked).toContain('fs');
    });

    it('should block child_process', () => {
      const code = 'const { exec } = require("child_process")';
      const result = scanner.validateImports(code, new Set());

      expect(result.blocked).toContain('child_process');
    });

    it('should allow safe modules', () => {
      const code = `
        import path from "path";
        import crypto from "crypto";
      `;
      const result = scanner.validateImports(code, new Set());

      expect(result.allowed).toContain('path');
      expect(result.allowed).toContain('crypto');
      expect(result.blocked.length).toBe(0);
    });
  });

  describe('security score calculation', () => {
    it('should give high score for safe code', () => {
      const code = 'const x = 1; console.log(x);';
      const result = scanner.scanCode(code);

      expect(result.securityScore).toBeGreaterThan(90);
    });

    it('should give low score for dangerous code', () => {
      const code = `
        eval("dangerous");
        process.env.SECRET;
        require("child_process").exec("rm -rf /");
      `;
      const result = scanner.scanCode(code);

      expect(result.securityScore).toBeLessThan(30);
    });
  });
});

describe('PermissionValidator', () => {
  let validator: PermissionValidator;

  beforeEach(() => {
    validator = new PermissionValidator(DEFAULT_POLICY);
  });

  describe('permission parsing', () => {
    it('should parse filesystem permissions', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'test',
        author: { name: 'test' },
        permissions: {
          filesystem: [
            { path: '.claude/**', access: 'read' },
          ],
        },
      };

      const permissions = validator.parsePermissions(manifest);
      expect(permissions.filesystem.length).toBe(1);
      expect(permissions.filesystem[0].path).toBe('.claude/**');
      expect(permissions.filesystem[0].access).toBe('read');
    });

    it('should parse network permissions', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'test',
        author: { name: 'test' },
        permissions: {
          network: [
            { host: 'api.anthropic.com', protocols: ['https'] },
          ],
        },
      };

      const permissions = validator.parsePermissions(manifest);
      expect(permissions.network.length).toBe(1);
      expect(permissions.network[0].host).toBe('api.anthropic.com');
    });
  });

  describe('permission validation', () => {
    it('should validate safe permissions', () => {
      const permissions: PermissionSet = {
        filesystem: [
          { path: '.claude/plugins/**', access: 'read' },
        ],
        network: [
          { host: 'api.anthropic.com', protocols: ['https'] },
        ],
        tools: ['Read', 'Write'],
      };

      const validation = validator.validateAgainstPolicy(permissions);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject too many permissions', () => {
      const permissions: PermissionSet = {
        filesystem: Array(20).fill({ path: 'test/**', access: 'read' }),
        network: [],
        tools: [],
      };

      const validation = validator.validateAgainstPolicy(permissions);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Too many'))).toBe(true);
    });

    it('should reject path traversal', () => {
      const permissions: PermissionSet = {
        filesystem: [
          { path: '../../../etc/passwd', access: 'read' },
        ],
        network: [],
        tools: [],
      };

      const validation = validator.validateAgainstPolicy(permissions);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Unsafe'))).toBe(true);
    });

    it('should reject localhost access', () => {
      const permissions: PermissionSet = {
        filesystem: [],
        network: [
          { host: 'localhost', protocols: ['http'] },
        ],
        tools: [],
      };

      const validation = validator.validateAgainstPolicy(permissions);
      expect(validation.valid).toBe(false);
    });
  });

  describe('runtime permission checks', () => {
    it('should allow permitted filesystem read', () => {
      const permissions: PermissionSet = {
        filesystem: [
          { path: '.claude/**', access: 'read' },
        ],
        network: [],
        tools: [],
      };

      const allowed = validator.checkPermission(
        'fs:read',
        '.claude/config.json',
        permissions
      );

      expect(allowed).toBe(true);
    });

    it('should deny unpermitted filesystem write', () => {
      const permissions: PermissionSet = {
        filesystem: [
          { path: '.claude/**', access: 'read' },
        ],
        network: [],
        tools: [],
      };

      const allowed = validator.checkPermission(
        'fs:write',
        '.claude/config.json',
        permissions
      );

      expect(allowed).toBe(false);
    });

    it('should allow permitted network access', () => {
      const permissions: PermissionSet = {
        filesystem: [],
        network: [
          { host: 'api.anthropic.com', protocols: ['https'] },
        ],
        tools: [],
      };

      const allowed = validator.checkPermission(
        'network:fetch',
        'api.anthropic.com',
        permissions
      );

      expect(allowed).toBe(true);
    });

    it('should support wildcard hosts', () => {
      const permissions: PermissionSet = {
        filesystem: [],
        network: [
          { host: '*.github.com', protocols: ['https'] },
        ],
        tools: [],
      };

      const allowed = validator.checkPermission(
        'network:fetch',
        'api.github.com',
        permissions
      );

      expect(allowed).toBe(true);
    });
  });
});

describe('SandboxRuntime', () => {
  let runtime: SandboxRuntime;
  let permissions: PermissionSet;

  beforeEach(() => {
    runtime = new SandboxRuntime();
    permissions = {
      filesystem: [],
      network: [],
      tools: [],
    };
  });

  afterEach(() => {
    // Cleanup all contexts
    runtime.cleanupExpiredContexts(0);
  });

  describe('context creation', () => {
    it('should create valid context', () => {
      const context = runtime.createContext('test-plugin', permissions);

      expect(context.id).toBeDefined();
      expect(context.plugin).toBe('test-plugin');
      expect(context.permissions).toBe(permissions);
    });

    it('should apply resource limits', () => {
      const context = runtime.createContext('test-plugin', permissions, {
        memoryLimit: '128MB',
        cpuTimeMs: 5000,
        networkCalls: 10,
      });

      expect(context.limits.memoryLimit).toBe('128MB');
      expect(context.limits.cpuTimeMs).toBe(5000);
      expect(context.limits.networkCalls).toBe(10);
    });
  });

  describe('code execution', () => {
    it('should execute safe code', async () => {
      const context = runtime.createContext('test', permissions);
      const code = 'return 1 + 2';

      const result = await runtime.execute(code, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it('should execute async code', async () => {
      const context = runtime.createContext('test', permissions);
      const code = `
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      `;

      const result = await runtime.execute(code, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('done');
    });

    it('should restrict global access', async () => {
      const context = runtime.createContext('test', permissions);
      const code = 'return typeof process';

      const result = await runtime.execute(code, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });

    it('should timeout long-running code', async () => {
      const context = runtime.createContext('test', permissions, {
        cpuTimeMs: 1000,
        memoryLimit: '128MB',
        networkCalls: 10,
      });

      const code = `
        while (true) { }
      `;

      const result = await runtime.execute(code, context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });

    it('should block forbidden patterns', async () => {
      const context = runtime.createContext('test', permissions);
      const code = 'eval("1 + 2")';

      const result = await runtime.execute(code, context);

      expect(result.success).toBe(false);
      expect(result.violations).toBeDefined();
      expect(result.violations![0].type).toBe('pattern');
    });
  });

  describe('resource tracking', () => {
    it('should track execution time', async () => {
      const context = runtime.createContext('test', permissions);
      const code = `
        await new Promise(resolve => setTimeout(resolve, 100));
      `;

      const result = await runtime.execute(code, context);

      expect(result.executionTimeMs).toBeGreaterThan(90);
      expect(result.usage.cpuTimeMs).toBeGreaterThan(90);
    });

    it('should track network calls', async () => {
      const networkPermissions: PermissionSet = {
        filesystem: [],
        network: [
          { host: 'api.github.com', protocols: ['https'] },
        ],
        tools: [],
      };

      const context = runtime.createContext('test', networkPermissions);
      const code = `
        await fetch('https://api.github.com');
        return 'done';
      `;

      const result = await runtime.execute(code, context);

      expect(result.usage.networkCalls).toBe(1);
    });
  });

  describe('security violations', () => {
    it('should report permission violations', async () => {
      const context = runtime.createContext('test', permissions);
      const code = `
        await fetch('https://api.github.com');
      `;

      const result = await runtime.execute(code, context);

      expect(result.success).toBe(false);
      expect(result.violations).toBeDefined();
      expect(result.violations![0].type).toBe('permission');
    });

    it('should report resource violations', async () => {
      const context = runtime.createContext('test', permissions, {
        cpuTimeMs: 30000,
        memoryLimit: '128MB',
        networkCalls: 1,
      });

      const code = `
        for (let i = 0; i < 10; i++) {
          try {
            await fetch('https://api.github.com');
          } catch (e) {
            // Expected to fail
          }
        }
      `;

      const result = await runtime.execute(code, context);

      expect(result.violations).toBeDefined();
      expect(result.violations!.some((v) => v.type === 'resource')).toBe(true);
    });
  });

  describe('context management', () => {
    it('should destroy context', () => {
      const context = runtime.createContext('test', permissions);
      expect(runtime.getContext(context.id)).toBeDefined();

      runtime.destroyContext(context.id);
      expect(runtime.getContext(context.id)).toBeUndefined();
    });

    it('should cleanup expired contexts', () => {
      const context = runtime.createContext('test', permissions);

      runtime.cleanupExpiredContexts(0); // 0ms = cleanup all
      expect(runtime.getContext(context.id)).toBeUndefined();
    });

    it('should list active contexts', () => {
      const ctx1 = runtime.createContext('test1', permissions);
      const ctx2 = runtime.createContext('test2', permissions);

      const active = runtime.getActiveContexts();
      expect(active.length).toBe(2);
      expect(active.map((c) => c.id)).toContain(ctx1.id);
      expect(active.map((c) => c.id)).toContain(ctx2.id);
    });
  });
});

describe('Integration', () => {
  it('should scan, validate, and execute plugin', async () => {
    const scanner = new CodeScanner();
    const validator = new PermissionValidator();
    const runtime = new SandboxRuntime();

    // Plugin manifest
    const manifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: { name: 'Test' },
      permissions: {
        filesystem: [
          { path: 'output/**', access: 'write' },
        ],
        network: [],
        tools: [],
      },
    };

    // Plugin code
    const code = `
      const data = { timestamp: Date.now() };
      console.log('Plugin executed', data);
      return data;
    `;

    // 1. Scan code
    const scanResult = scanner.scanCode(code);
    expect(scanResult.passed).toBe(true);
    expect(scanResult.securityScore).toBeGreaterThan(70);

    // 2. Validate permissions
    const permissions = validator.parsePermissions(manifest);
    const validation = validator.validateAgainstPolicy(permissions);
    expect(validation.valid).toBe(true);

    // 3. Execute in sandbox
    const context = runtime.createContext(
      manifest.name,
      validation.approved
    );

    const result = await runtime.execute(code, context);
    expect(result.success).toBe(true);
    expect(result.value).toHaveProperty('timestamp');

    runtime.destroyContext(context.id);
  });
});
