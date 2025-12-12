#!/usr/bin/env node

/**
 * Configuration Template Expander
 *
 * Replaces ${VARIABLE} placeholders in config.template.json with values from .env
 *
 * Usage:
 *   node scripts/expand-config.js
 *   node scripts/expand-config.js --dry-run  # Preview without writing
 *   node scripts/expand-config.js --validate # Validate env vars only
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Error: .env file not found at ${envPath}`);
    console.log('💡 Tip: Copy .env.template to .env and fill in your values');
    process.exit(1);
  }

  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envFile.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      return;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  });

  return env;
}

// Extract all ${VAR} placeholders from template
function extractPlaceholders(content) {
  const regex = /\$\{(\w+)\}/g;
  const placeholders = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders).sort();
}

// Validate that all required placeholders have values
function validateEnv(placeholders, env) {
  const missing = [];
  const empty = [];

  placeholders.forEach(placeholder => {
    if (!(placeholder in env)) {
      missing.push(placeholder);
    } else if (!env[placeholder] || env[placeholder].trim() === '') {
      empty.push(placeholder);
    }
  });

  return { missing, empty };
}

// Replace placeholders with environment variable values
function expandConfig(template, env) {
  return template.replace(/\$\{(\w+)\}/g, (match, varName) => {
    if (varName in env && env[varName]) {
      return env[varName];
    }
    return match; // Keep placeholder if no value found
  });
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isValidateOnly = args.includes('--validate');
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`
Configuration Template Expander

Usage:
  node scripts/expand-config.js [options]

Options:
  --dry-run     Preview output without writing to file
  --validate    Validate environment variables only
  --help, -h    Show this help message

Example:
  node scripts/expand-config.js
  node scripts/expand-config.js --dry-run
  node scripts/expand-config.js --validate
    `);
    process.exit(0);
  }

  const rootDir = path.join(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const templatePath = path.join(rootDir, '.claude', 'config.template.json');
  const outputPath = path.join(rootDir, '.claude', 'config.json');

  console.log('🔧 Configuration Expander');
  console.log('========================\n');

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Error: Template not found at ${templatePath}`);
    process.exit(1);
  }

  // Load environment variables
  console.log('📂 Loading environment variables from .env...');
  const env = loadEnv(envPath);
  console.log(`✅ Loaded ${Object.keys(env).length} environment variables\n`);

  // Load template
  console.log('📄 Reading template from config.template.json...');
  const template = fs.readFileSync(templatePath, 'utf8');
  const placeholders = extractPlaceholders(template);
  console.log(`✅ Found ${placeholders.length} placeholders\n`);

  // Validate environment variables
  console.log('🔍 Validating environment variables...');
  const { missing, empty } = validateEnv(placeholders, env);

  if (missing.length > 0) {
    console.log('\n⚠️  Missing environment variables:');
    missing.forEach(v => console.log(`   - ${v}`));
  }

  if (empty.length > 0) {
    console.log('\n⚠️  Empty environment variables:');
    empty.forEach(v => console.log(`   - ${v}`));
  }

  if (missing.length === 0 && empty.length === 0) {
    console.log('✅ All required variables are set\n');
  } else {
    console.log('\n💡 Tip: Update your .env file with the missing/empty variables\n');
    if (!isDryRun) {
      console.log('⚠️  Continuing with partial expansion (placeholders will be kept)...\n');
    }
  }

  if (isValidateOnly) {
    if (missing.length > 0 || empty.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  }

  // Expand configuration
  console.log('🔄 Expanding configuration...');
  const expanded = expandConfig(template, env);

  // Validate JSON
  try {
    JSON.parse(expanded);
    console.log('✅ Generated valid JSON\n');
  } catch (error) {
    console.error('❌ Error: Invalid JSON generated');
    console.error(error.message);
    process.exit(1);
  }

  // Dry run mode
  if (isDryRun) {
    console.log('👀 DRY RUN - Preview of expanded configuration:\n');
    console.log('─'.repeat(80));
    console.log(expanded.substring(0, 500) + '...');
    console.log('─'.repeat(80));
    console.log('\n💡 Run without --dry-run to write to config.json');
    process.exit(0);
  }

  // Write output
  console.log(`📝 Writing expanded configuration to config.json...`);
  fs.writeFileSync(outputPath, expanded, 'utf8');
  console.log('✅ Configuration file created successfully!\n');

  // Summary
  console.log('📊 Summary:');
  console.log(`   Template: ${path.basename(templatePath)}`);
  console.log(`   Output: ${path.basename(outputPath)}`);
  console.log(`   Variables expanded: ${placeholders.length - missing.length - empty.length}/${placeholders.length}`);
  console.log(`   Size: ${(expanded.length / 1024).toFixed(2)} KB\n`);

  console.log('🎉 Done! Your configuration is ready to use.');
  console.log('⚠️  Remember: Never commit config.json with secrets to version control!\n');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
