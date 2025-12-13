#!/usr/bin/env node
/**
 * Validation Script
 * Verifies the security sandbox implementation is complete and working
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  passed: boolean;
  category: string;
  test: string;
  message?: string;
}

const results: ValidationResult[] = [];

function validate(category: string, test: string, condition: boolean, message?: string) {
  results.push({
    passed: condition,
    category,
    test,
    message: condition ? undefined : message,
  });
}

function fileExists(path: string): boolean {
  return existsSync(join(process.cwd(), path));
}

function fileContains(path: string, pattern: string | RegExp): boolean {
  try {
    const content = readFileSync(join(process.cwd(), path), 'utf-8');
    if (typeof pattern === 'string') {
      return content.includes(pattern);
    }
    return pattern.test(content);
  } catch {
    return false;
  }
}

console.log('🔍 Validating Security Sandbox Implementation...\n');

// Core Files
validate(
  'Core Files',
  'types.ts exists',
  fileExists('types.ts'),
  'Missing types.ts'
);

validate(
  'Core Files',
  'security-policy.ts exists',
  fileExists('security-policy.ts'),
  'Missing security-policy.ts'
);

validate(
  'Core Files',
  'code-scanner.ts exists',
  fileExists('code-scanner.ts'),
  'Missing code-scanner.ts'
);

validate(
  'Core Files',
  'permission-validator.ts exists',
  fileExists('permission-validator.ts'),
  'Missing permission-validator.ts'
);

validate(
  'Core Files',
  'sandbox-runtime.ts exists',
  fileExists('sandbox-runtime.ts'),
  'Missing sandbox-runtime.ts'
);

validate(
  'Core Files',
  'index.ts exists',
  fileExists('index.ts'),
  'Missing index.ts'
);

// Type Definitions
validate(
  'Types',
  'PermissionSet defined',
  fileContains('types.ts', 'export interface PermissionSet'),
  'PermissionSet not exported'
);

validate(
  'Types',
  'SecurityPolicy defined',
  fileContains('types.ts', 'export interface SecurityPolicy'),
  'SecurityPolicy not exported'
);

validate(
  'Types',
  'SandboxContext defined',
  fileContains('types.ts', 'export interface SandboxContext'),
  'SandboxContext not exported'
);

validate(
  'Types',
  'ExecutionResult defined',
  fileContains('types.ts', 'export interface ExecutionResult'),
  'ExecutionResult not exported'
);

// Security Policies
validate(
  'Security Policies',
  'DEFAULT_POLICY exported',
  fileContains('security-policy.ts', 'export const DEFAULT_POLICY'),
  'DEFAULT_POLICY not exported'
);

validate(
  'Security Policies',
  'STRICT_POLICY exported',
  fileContains('security-policy.ts', 'export const STRICT_POLICY'),
  'STRICT_POLICY not exported'
);

validate(
  'Security Policies',
  'SECRET_PATTERNS defined',
  fileContains('security-policy.ts', 'export const SECRET_PATTERNS'),
  'SECRET_PATTERNS not exported'
);

validate(
  'Security Policies',
  'Banned patterns include eval',
  fileContains('security-policy.ts', /eval.*\(/i),
  'eval not in banned patterns'
);

// Code Scanner
validate(
  'Code Scanner',
  'CodeScanner class exported',
  fileContains('code-scanner.ts', 'export class CodeScanner'),
  'CodeScanner not exported'
);

validate(
  'Code Scanner',
  'scanCode method exists',
  fileContains('code-scanner.ts', 'scanCode(code: string)'),
  'scanCode method missing'
);

validate(
  'Code Scanner',
  'scanForSecrets method exists',
  fileContains('code-scanner.ts', 'scanForSecrets'),
  'scanForSecrets method missing'
);

validate(
  'Code Scanner',
  'validateImports method exists',
  fileContains('code-scanner.ts', 'validateImports'),
  'validateImports method missing'
);

// Permission Validator
validate(
  'Permission Validator',
  'PermissionValidator class exported',
  fileContains('permission-validator.ts', 'export class PermissionValidator'),
  'PermissionValidator not exported'
);

validate(
  'Permission Validator',
  'parsePermissions method exists',
  fileContains('permission-validator.ts', 'parsePermissions'),
  'parsePermissions method missing'
);

validate(
  'Permission Validator',
  'validateAgainstPolicy method exists',
  fileContains('permission-validator.ts', 'validateAgainstPolicy'),
  'validateAgainstPolicy method missing'
);

validate(
  'Permission Validator',
  'checkPermission method exists',
  fileContains('permission-validator.ts', 'checkPermission'),
  'checkPermission method missing'
);

validate(
  'Permission Validator',
  'Audit logging implemented',
  fileContains('permission-validator.ts', 'getAuditLog'),
  'Audit logging missing'
);

// Sandbox Runtime
validate(
  'Sandbox Runtime',
  'SandboxRuntime class exported',
  fileContains('sandbox-runtime.ts', 'export class SandboxRuntime'),
  'SandboxRuntime not exported'
);

validate(
  'Sandbox Runtime',
  'createContext method exists',
  fileContains('sandbox-runtime.ts', 'createContext'),
  'createContext method missing'
);

validate(
  'Sandbox Runtime',
  'execute method exists',
  fileContains('sandbox-runtime.ts', 'execute(code: string'),
  'execute method missing'
);

validate(
  'Sandbox Runtime',
  'Timeout enforcement implemented',
  fileContains('sandbox-runtime.ts', 'timeout'),
  'Timeout enforcement missing'
);

validate(
  'Sandbox Runtime',
  'Resource tracking implemented',
  fileContains('sandbox-runtime.ts', /usage|cpuTimeMs|networkCalls/),
  'Resource tracking missing'
);

// Index/Exports
validate(
  'Exports',
  'SandboxRuntime exported from index',
  fileContains('index.ts', /export\s*{\s*SandboxRuntime\s*}/),
  'SandboxRuntime not exported from index'
);

validate(
  'Exports',
  'PermissionValidator exported from index',
  fileContains('index.ts', /export\s*{\s*PermissionValidator\s*}/),
  'PermissionValidator not exported from index'
);

validate(
  'Exports',
  'CodeScanner exported from index',
  fileContains('index.ts', /export\s*{\s*CodeScanner\s*}/),
  'CodeScanner not exported from index'
);

validate(
  'Exports',
  'Policies exported from index',
  fileContains('index.ts', 'DEFAULT_POLICY'),
  'Policies not exported from index'
);

// Documentation
validate(
  'Documentation',
  'README.md exists',
  fileExists('README.md'),
  'Missing README.md'
);

validate(
  'Documentation',
  'INTEGRATION.md exists',
  fileExists('INTEGRATION.md'),
  'Missing INTEGRATION.md'
);

validate(
  'Documentation',
  'QUICK-REFERENCE.md exists',
  fileExists('QUICK-REFERENCE.md'),
  'Missing QUICK-REFERENCE.md'
);

validate(
  'Documentation',
  'SUMMARY.md exists',
  fileExists('SUMMARY.md'),
  'Missing SUMMARY.md'
);

validate(
  'Documentation',
  'README has architecture section',
  fileContains('README.md', '## Architecture'),
  'README missing architecture section'
);

validate(
  'Documentation',
  'README has examples',
  fileContains('README.md', /example|Example/),
  'README missing examples'
);

// Examples
validate(
  'Examples',
  'basic-usage.ts exists',
  fileExists('examples/basic-usage.ts'),
  'Missing basic-usage.ts example'
);

validate(
  'Examples',
  'Examples include scanning',
  fileContains('examples/basic-usage.ts', 'scanCode'),
  'Examples missing code scanning'
);

validate(
  'Examples',
  'Examples include execution',
  fileContains('examples/basic-usage.ts', 'execute'),
  'Examples missing sandbox execution'
);

// Tests
validate(
  'Tests',
  'Test file exists',
  fileExists('__tests__/sandbox.test.ts'),
  'Missing test file'
);

validate(
  'Tests',
  'Code Scanner tests exist',
  fileContains('__tests__/sandbox.test.ts', "describe('CodeScanner'"),
  'Missing CodeScanner tests'
);

validate(
  'Tests',
  'Permission Validator tests exist',
  fileContains('__tests__/sandbox.test.ts', "describe('PermissionValidator'"),
  'Missing PermissionValidator tests'
);

validate(
  'Tests',
  'Sandbox Runtime tests exist',
  fileContains('__tests__/sandbox.test.ts', "describe('SandboxRuntime'"),
  'Missing SandboxRuntime tests'
);

// Print Results
console.log('📊 Validation Results:\n');

const categories = [...new Set(results.map((r) => r.category))];

for (const category of categories) {
  const categoryResults = results.filter((r) => r.category === category);
  const passed = categoryResults.filter((r) => r.passed).length;
  const total = categoryResults.length;

  console.log(`\n${category}: ${passed}/${total} passed`);

  for (const result of categoryResults) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} ${result.test}`);
    if (result.message) {
      console.log(`     ${result.message}`);
    }
  }
}

// Summary
const totalPassed = results.filter((r) => r.passed).length;
const totalTests = results.length;
const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

console.log('\n' + '='.repeat(60));
console.log(`\n📈 Overall: ${totalPassed}/${totalTests} tests passed (${passRate}%)\n`);

if (totalPassed === totalTests) {
  console.log('✅ All validation checks passed!');
  console.log('\n🎉 Security Sandbox is ready for use!\n');
  process.exit(0);
} else {
  console.log('❌ Some validation checks failed.');
  console.log('\n⚠️  Please fix the issues above before using the sandbox.\n');
  process.exit(1);
}
