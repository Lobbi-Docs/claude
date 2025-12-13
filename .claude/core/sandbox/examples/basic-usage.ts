/**
 * Basic Usage Examples
 * Demonstrates common security sandbox operations
 */

import {
  SandboxRuntime,
  PermissionValidator,
  CodeScanner,
  PermissionSet,
  DEFAULT_POLICY,
} from '../index.js';

// Example 1: Scan plugin code for security issues
async function example1_scanCode() {
  console.log('\n=== Example 1: Code Scanner ===\n');

  const scanner = new CodeScanner();

  const safeCode = `
    import { readFile } from 'fs/promises';
    const config = await readFile('.claude/config.json', 'utf-8');
    return JSON.parse(config);
  `;

  const unsafeCode = `
    const apiKey = process.env.ANTHROPIC_API_KEY;
    eval('console.log("Danger!")');
    require('child_process').exec('rm -rf /');
  `;

  // Scan safe code
  console.log('Scanning safe code...');
  const safeResult = scanner.scanCode(safeCode);
  console.log('Security Score:', safeResult.securityScore);
  console.log('Issues:', safeResult.dangerousPatterns.length);
  console.log('Passed:', safeResult.passed);

  // Scan unsafe code
  console.log('\nScanning unsafe code...');
  const unsafeResult = scanner.scanCode(unsafeCode);
  console.log('Security Score:', unsafeResult.securityScore);
  console.log('Dangerous Patterns:', unsafeResult.dangerousPatterns.length);
  console.log('Recommendations:', unsafeResult.recommendations);
}

// Example 2: Validate plugin permissions
async function example2_validatePermissions() {
  console.log('\n=== Example 2: Permission Validation ===\n');

  const validator = new PermissionValidator(DEFAULT_POLICY);

  const manifest = {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'Example plugin',
    author: { name: 'Test' },
    permissions: {
      filesystem: [
        { path: '.claude/plugins/example/**', access: 'readwrite' },
        { path: 'output/*.json', access: 'write' },
      ],
      network: [
        { host: 'api.anthropic.com', protocols: ['https'] },
      ],
      tools: ['Read', 'Write', 'Grep'],
    },
  };

  const permissions = validator.parsePermissions(manifest);
  const validation = validator.validateAgainstPolicy(permissions);

  console.log('Valid:', validation.valid);
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
  console.log('Approved Filesystem:', validation.approved.filesystem);
  console.log('Approved Network:', validation.approved.network);
  console.log('Approved Tools:', validation.approved.tools);
}

// Example 3: Execute code in sandbox
async function example3_executeInSandbox() {
  console.log('\n=== Example 3: Sandbox Execution ===\n');

  const permissions: PermissionSet = {
    filesystem: [],
    network: [
      { host: 'api.github.com', protocols: ['https'] },
    ],
    tools: [],
  };

  const runtime = new SandboxRuntime({
    strictMode: false,
    onViolation: (violation) => {
      console.warn('Violation:', violation.message);
    },
  });

  const context = runtime.createContext('example-plugin', permissions, {
    memoryLimit: '128MB',
    cpuTimeMs: 10000,
    networkCalls: 10,
  });

  const code = `
    console.log('Starting execution...');

    // This should work
    const data = { message: 'Hello from sandbox!' };
    console.log('Data:', data);

    // Return a result
    return {
      success: true,
      timestamp: Date.now(),
      data
    };
  `;

  console.log('Executing code...');
  const result = await runtime.execute(code, context);

  if (result.success) {
    console.log('Result:', result.value);
    console.log('Execution time:', result.executionTimeMs, 'ms');
    console.log('CPU time:', result.usage.cpuTimeMs, 'ms');
  } else {
    console.error('Error:', result.error?.message);
    console.error('Violations:', result.violations);
  }

  runtime.destroyContext(context.id);
}

// Example 4: Permission checks at runtime
async function example4_runtimePermissionChecks() {
  console.log('\n=== Example 4: Runtime Permission Checks ===\n');

  const validator = new PermissionValidator();

  const permissions: PermissionSet = {
    filesystem: [
      { path: '.claude/**', access: 'read' },
      { path: 'output/**', access: 'write' },
    ],
    network: [
      { host: 'api.anthropic.com', protocols: ['https'] },
    ],
    tools: ['Read', 'Write'],
  };

  // Check filesystem permissions
  console.log('Checking filesystem permissions...');
  console.log(
    'Read .claude/config.json:',
    validator.checkPermission('fs:read', '.claude/config.json', permissions)
  );
  console.log(
    'Write .claude/config.json:',
    validator.checkPermission('fs:write', '.claude/config.json', permissions)
  );
  console.log(
    'Write output/data.json:',
    validator.checkPermission('fs:write', 'output/data.json', permissions)
  );

  // Check network permissions
  console.log('\nChecking network permissions...');
  console.log(
    'Access api.anthropic.com:',
    validator.checkPermission('network:fetch', 'api.anthropic.com', permissions)
  );
  console.log(
    'Access api.openai.com:',
    validator.checkPermission('network:fetch', 'api.openai.com', permissions)
  );

  // Check tool permissions
  console.log('\nChecking tool permissions...');
  console.log(
    'Use Read tool:',
    validator.checkPermission('tool:Read', 'Read', permissions)
  );
  console.log(
    'Use Bash tool:',
    validator.checkPermission('tool:Bash', 'Bash', permissions)
  );

  // View audit log
  console.log('\nAudit log:');
  const log = validator.getAuditLog();
  console.log(JSON.stringify(log.slice(-5), null, 2));
}

// Example 5: Detect secrets in code
async function example5_detectSecrets() {
  console.log('\n=== Example 5: Secret Detection ===\n');

  const scanner = new CodeScanner();

  const filesWithSecrets = [
    {
      path: 'config.ts',
      content: `
        const ANTHROPIC_API_KEY = "sk-ant-api03-abc123...";
        const GITHUB_TOKEN = "ghp_1234567890abcdef...";
      `,
    },
    {
      path: 'auth.ts',
      content: `
        const password = "mySecretPassword123!";
        const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEA...
        -----END RSA PRIVATE KEY-----\`;
      `,
    },
  ];

  const secrets = scanner.scanForSecrets(filesWithSecrets);

  console.log(`Found ${secrets.length} potential secrets:`);
  for (const secret of secrets) {
    console.log(`\n- Type: ${secret.type}`);
    console.log(`  File: ${secret.file}:${secret.line}`);
    console.log(`  Confidence: ${(secret.confidence * 100).toFixed(0)}%`);
    console.log(`  Pattern: ${secret.pattern}`);
  }
}

// Example 6: Handle timeout and resource limits
async function example6_resourceLimits() {
  console.log('\n=== Example 6: Resource Limits ===\n');

  const permissions: PermissionSet = {
    filesystem: [],
    network: [],
    tools: [],
  };

  const runtime = new SandboxRuntime();

  // Example 6a: CPU timeout
  console.log('Testing CPU timeout...');
  const cpuContext = runtime.createContext('timeout-test', permissions, {
    cpuTimeMs: 2000, // 2 seconds
    memoryLimit: '128MB',
    networkCalls: 10,
  });

  const infiniteLoop = `
    let i = 0;
    while (true) {
      i++;
      if (i % 1000000 === 0) {
        console.log('Still running...', i);
      }
    }
  `;

  const cpuResult = await runtime.execute(infiniteLoop, cpuContext);
  console.log('Success:', cpuResult.success);
  console.log('Error:', cpuResult.error?.message);
  console.log('Violations:', cpuResult.violations?.map((v) => v.type));

  runtime.destroyContext(cpuContext.id);

  // Example 6b: Network call limit
  console.log('\nTesting network call limit...');
  const networkContext = runtime.createContext('network-test', permissions, {
    cpuTimeMs: 30000,
    memoryLimit: '128MB',
    networkCalls: 3, // Only 3 calls allowed
  });

  const manyNetworkCalls = `
    const results = [];
    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch('https://api.github.com');
        results.push({ success: true, status: response.status });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  `;

  const networkResult = await runtime.execute(manyNetworkCalls, networkContext);
  console.log('Success:', networkResult.success);
  console.log('Network calls made:', networkResult.usage.networkCalls);
  console.log('Violations:', networkResult.violations?.map((v) => v.message));

  runtime.destroyContext(networkContext.id);
}

// Example 7: Custom security policy
async function example7_customPolicy() {
  console.log('\n=== Example 7: Custom Security Policy ===\n');

  const customPolicy = {
    maxPermissions: {
      filesystem: 5,
      network: 2,
      tools: 8,
    },
    bannedPatterns: [
      /eval\s*\(/gi,
      /new\s+Function/gi,
      /dangerousOperation/gi, // Custom pattern
    ],
    requiredPermissions: [],
    elevatedPermissionPrompt: true,
    allowDynamicExecution: false,
    trustedDomains: ['api.mycompany.com', '*.internal.net'],
  };

  const runtime = new SandboxRuntime({
    policy: customPolicy,
    onViolation: (v) => console.warn('Violation:', v),
  });

  const permissions: PermissionSet = {
    filesystem: [],
    network: [{ host: 'api.mycompany.com', protocols: ['https'] }],
    tools: [],
  };

  const context = runtime.createContext('custom-policy-test', permissions);

  // This should be blocked by custom pattern
  const code = `
    dangerousOperation('test');
  `;

  const result = await runtime.execute(code, context);
  console.log('Execution blocked:', !result.success);
  console.log('Reason:', result.error?.message);

  runtime.destroyContext(context.id);
}

// Run all examples
async function runAllExamples() {
  try {
    await example1_scanCode();
    await example2_validatePermissions();
    await example3_executeInSandbox();
    await example4_runtimePermissionChecks();
    await example5_detectSecrets();
    await example6_resourceLimits();
    await example7_customPolicy();

    console.log('\n=== All examples completed ===\n');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
