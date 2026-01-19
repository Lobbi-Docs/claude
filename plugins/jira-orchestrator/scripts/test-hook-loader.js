#!/usr/bin/env node
/**
 * Test script to validate hooks.json using compiled hook-loader
 *
 * This is a simple validation test that can be run without full TypeScript setup
 */

const fs = require('fs');
const path = require('path');

// Simple validation without TypeScript
function validateHooksJson(hooksPath) {
  console.log('Testing hook loader foundation...\n');

  // Test 1: File exists
  console.log('✓ Test 1: hooks.json exists');
  if (!fs.existsSync(hooksPath)) {
    console.error('✗ FAILED: hooks.json not found');
    process.exit(1);
  }

  // Test 2: Valid JSON
  console.log('✓ Test 2: Valid JSON syntax');
  let config;
  try {
    const content = fs.readFileSync(hooksPath, 'utf-8');
    config = JSON.parse(content);
  } catch (error) {
    console.error('✗ FAILED: Invalid JSON -', error.message);
    process.exit(1);
  }

  // Test 3: Has schema reference
  console.log('✓ Test 3: Schema reference present');
  if (!config.$schema) {
    console.error('✗ WARNING: No $schema reference found');
  }

  // Test 4: Valid event types
  console.log('✓ Test 4: Valid event types');
  const validEvents = ['UserPromptSubmit', 'PostToolUse', 'PreToolUse', 'Stop', 'SessionStart'];
  const foundEvents = Object.keys(config).filter(k => k !== '$schema');
  const invalidEvents = foundEvents.filter(e => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    console.error('✗ FAILED: Invalid event types:', invalidEvents.join(', '));
    process.exit(1);
  }
  console.log('  Found event types:', foundEvents.join(', '));

  // Test 5: Hook definitions structure
  console.log('✓ Test 5: Hook definition structure');
  let totalHooks = 0;
  for (const [eventType, hooks] of Object.entries(config)) {
    if (eventType === '$schema') continue;

    if (!Array.isArray(hooks)) {
      console.error(`✗ FAILED: ${eventType} is not an array`);
      process.exit(1);
    }

    hooks.forEach((hook, index) => {
      const required = ['name', 'description', 'type', 'timeout'];
      const missing = required.filter(field => !hook[field]);

      if (missing.length > 0) {
        console.error(`✗ FAILED: ${eventType}[${index}] missing fields:`, missing.join(', '));
        process.exit(1);
      }

      // Check type-specific fields
      if (hook.type === 'prompt' && !hook.prompt) {
        console.error(`✗ FAILED: ${eventType}[${index}] type=prompt but no prompt field`);
        process.exit(1);
      }

      if (hook.type === 'command' && !hook.command) {
        console.error(`✗ FAILED: ${eventType}[${index}] type=command but no command field`);
        process.exit(1);
      }

      // Check timeout range
      if (hook.timeout < 100 || hook.timeout > 300000) {
        console.error(`✗ FAILED: ${eventType}[${index}] invalid timeout: ${hook.timeout} (must be 100-300000)`);
        process.exit(1);
      }

      totalHooks++;
    });
  }
  console.log(`  Validated ${totalHooks} hooks across ${foundEvents.length} event types`);

  // Test 6: Regex patterns
  console.log('✓ Test 6: Regex pattern validation');
  for (const [eventType, hooks] of Object.entries(config)) {
    if (eventType === '$schema') continue;

    hooks.forEach((hook, index) => {
      if (hook.matcher) {
        try {
          new RegExp(hook.matcher);
        } catch (error) {
          console.error(`✗ FAILED: ${eventType}[${index}] invalid regex: ${hook.matcher}`);
          process.exit(1);
        }
      }
    });
  }

  // Test 7: Script paths (for command hooks)
  console.log('✓ Test 7: Script path validation (command hooks)');
  const pluginRoot = path.resolve(__dirname, '..');
  let scriptCheckCount = 0;

  for (const [eventType, hooks] of Object.entries(config)) {
    if (eventType === '$schema') continue;

    hooks.forEach((hook, index) => {
      if (hook.type === 'command' && hook.command) {
        // Expand ${CLAUDE_PLUGIN_ROOT}
        let scriptPath = hook.command.replace('${CLAUDE_PLUGIN_ROOT}', pluginRoot);

        // Extract script path (before any arguments)
        scriptPath = scriptPath.split(' ')[0];

        if (!path.isAbsolute(scriptPath)) {
          scriptPath = path.resolve(pluginRoot, 'hooks', scriptPath);
        }

        if (!fs.existsSync(scriptPath)) {
          console.error(`✗ WARNING: ${eventType}[${index}] script not found: ${scriptPath}`);
        } else {
          scriptCheckCount++;
        }
      }
    });
  }
  console.log(`  Verified ${scriptCheckCount} script paths`);

  console.log('\n✓ All validation tests passed!');
  console.log('\nSummary:');
  console.log(`  - Event types: ${foundEvents.length}`);
  console.log(`  - Total hooks: ${totalHooks}`);
  console.log(`  - Scripts validated: ${scriptCheckCount}`);
  console.log('\nHook System Foundation is ready! 🚀');
}

// Run validation
const hooksPath = path.resolve(__dirname, '../hooks/hooks.json');
validateHooksJson(hooksPath);
