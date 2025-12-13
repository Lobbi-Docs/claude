#!/usr/bin/env node
/**
 * Simple validation test
 */

import { validateFile } from './validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test files
const testFiles = [
  '../.claude-plugin/plugin.json',
  '../agents/cloud/pulumi-specialist.md',
  '../skills/kubernetes/SKILL.md'
];

console.log('Claude Code Validation Test\n');
console.log('='.repeat(50));

let totalTests = 0;
let passedTests = 0;

testFiles.forEach(file => {
  const filePath = path.resolve(__dirname, file);
  console.log(`\nTesting: ${file}`);
  console.log('-'.repeat(50));

  totalTests++;

  try {
    const result = validateFile(filePath);

    if (result.valid) {
      console.log('✓ VALID');
      passedTests++;

      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.length}`);
        result.warnings.forEach(w => {
          console.log(`  ⚠ ${w.message}`);
        });
      }
    } else {
      console.log('✗ INVALID');
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.forEach(e => {
        console.log(`  ✗ ${e.message}`);
      });
    }

    if (result.type) {
      console.log(`  Type: ${result.type}`);
    }
  } catch (error) {
    console.log(`✗ ERROR: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('='.repeat(50));

process.exit(passedTests === totalTests ? 0 : 1);
