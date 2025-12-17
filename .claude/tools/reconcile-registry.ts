#!/usr/bin/env node
/**
 * Registry Reconciliation Tool
 *
 * Scans actual agent files and reconciles with agents.index.json registry.
 * Identifies phantom entries, unregistered agents, and category mismatches.
 *
 * Usage:
 *   npm run reconcile-registry           # Dry-run mode (default)
 *   npm run reconcile-registry -- --fix  # Auto-fix issues
 *   npm run reconcile-registry -- --verbose --fix
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Types
interface AgentMetadata {
  name?: string;
  type?: string;
  model?: string;
  category?: string;
  priority?: string;
  keywords?: string[];
  capabilities?: string[];
  [key: string]: any;
}

interface RegistryAgent {
  callsign?: string;
  faction?: string;
  path: string;
  type?: string;
  model?: string;
  keywords?: string[];
  capabilities?: string[];
  priority?: string;
  [key: string]: any;
}

interface AgentRegistry {
  $schema?: string;
  version: string;
  description?: string;
  factionLegend?: any;
  agents: Record<string, Record<string, RegistryAgent>>;
}

interface ReconciliationReport {
  timestamp: string;
  totalFilesScanned: number;
  totalRegistryEntries: number;
  phantomEntries: PhantomEntry[];
  unregisteredAgents: UnregisteredAgent[];
  categoryMismatches: CategoryMismatch[];
  pathMismatches: PathMismatch[];
  issues: number;
}

interface PhantomEntry {
  category: string;
  agentName: string;
  registryPath: string;
  reason: string;
}

interface UnregisteredAgent {
  filePath: string;
  detectedCategory: string;
  agentName: string;
}

interface CategoryMismatch {
  agentName: string;
  registryCategory: string;
  fileCategory: string;
  filePath: string;
}

interface PathMismatch {
  agentName: string;
  category: string;
  registryPath: string;
  actualPath: string;
}

// Configuration
const AGENTS_DIR = '.claude/agents';
const REGISTRY_PATH = '.claude/registry/agents.index.json';
const BACKUP_SUFFIX = '.backup';

// CLI Arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--fix');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(colorize(message, color));
}

function verbose(message: string) {
  if (VERBOSE) {
    console.log(colorize(`  → ${message}`, 'cyan'));
  }
}

/**
 * Extract YAML frontmatter metadata from markdown file
 */
async function extractMetadata(filePath: string): Promise<AgentMetadata | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Match YAML frontmatter in code blocks
    const yamlMatch = content.match(/^```yaml\n([\s\S]*?)\n```/m);

    if (!yamlMatch) {
      verbose(`No YAML metadata found in ${filePath}`);
      return null;
    }

    // Simple YAML parser (handles basic key-value pairs and arrays)
    const yamlContent = yamlMatch[1];
    const metadata: AgentMetadata = {};

    let currentKey: string | null = null;
    let isArray = false;

    for (const line of yamlContent.split('\n')) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle key-value pairs
      if (line.match(/^[a-zA-Z_][a-zA-Z0-9_-]*:/)) {
        const [key, ...valueParts] = line.split(':');
        currentKey = key.trim();
        const value = valueParts.join(':').trim();

        if (value) {
          metadata[currentKey] = value;
          isArray = false;
        } else {
          // Array or nested object follows
          isArray = true;
          metadata[currentKey] = [];
        }
      }
      // Handle array items
      else if (isArray && trimmed.startsWith('- ')) {
        if (currentKey) {
          const arrayValue = trimmed.substring(2).trim();
          if (Array.isArray(metadata[currentKey])) {
            metadata[currentKey].push(arrayValue);
          }
        }
      }
    }

    return metadata;
  } catch (error) {
    verbose(`Error reading ${filePath}: ${error}`);
    return null;
  }
}

/**
 * Recursively scan directory for .md files
 */
async function scanAgentFiles(baseDir: string): Promise<Map<string, string>> {
  const agentFiles = new Map<string, string>(); // agentName -> filePath

  async function scan(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          const agentName = path.basename(entry.name, '.md');
          agentFiles.set(relativePath, fullPath);
        }
      }
    } catch (error) {
      verbose(`Error scanning directory ${dir}: ${error}`);
    }
  }

  await scan(baseDir);
  return agentFiles;
}

/**
 * Load and parse registry
 */
async function loadRegistry(registryPath: string): Promise<AgentRegistry> {
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load registry from ${registryPath}: ${error}`);
  }
}

/**
 * Create backup of registry
 */
async function backupRegistry(registryPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${registryPath}.${timestamp}${BACKUP_SUFFIX}`;

  await fs.copyFile(registryPath, backupPath);
  log(`✓ Created backup: ${backupPath}`, 'green');

  return backupPath;
}

/**
 * Save registry to file
 */
async function saveRegistry(registryPath: string, registry: AgentRegistry): Promise<void> {
  const content = JSON.stringify(registry, null, 2);
  await fs.writeFile(registryPath, content, 'utf-8');
}

/**
 * Perform reconciliation
 */
async function reconcile(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    totalFilesScanned: 0,
    totalRegistryEntries: 0,
    phantomEntries: [],
    unregisteredAgents: [],
    categoryMismatches: [],
    pathMismatches: [],
    issues: 0,
  };

  // 1. Scan agent files
  log('\n📁 Scanning agent files...', 'bright');
  const agentFiles = await scanAgentFiles(AGENTS_DIR);
  report.totalFilesScanned = agentFiles.size;
  log(`   Found ${agentFiles.size} agent files`, 'cyan');

  // Create lookup maps
  const filesByCategory = new Map<string, Set<string>>();
  for (const [relativePath] of agentFiles) {
    const category = relativePath.split('/')[0];
    if (!filesByCategory.has(category)) {
      filesByCategory.set(category, new Set());
    }
    filesByCategory.get(category)!.add(relativePath);
  }

  // 2. Load registry
  log('\n📋 Loading registry...', 'bright');
  const registry = await loadRegistry(REGISTRY_PATH);

  // Count registry entries
  let registryCount = 0;
  for (const category in registry.agents) {
    registryCount += Object.keys(registry.agents[category]).length;
  }
  report.totalRegistryEntries = registryCount;
  log(`   Found ${registryCount} registry entries across ${Object.keys(registry.agents).length} categories`, 'cyan');

  // 3. Check for phantom entries (in registry, no file)
  log('\n👻 Checking for phantom entries...', 'bright');
  for (const [category, agents] of Object.entries(registry.agents)) {
    for (const [agentName, agentData] of Object.entries(agents)) {
      const expectedPath = agentData.path.replace(/^agents\//, '');

      if (!agentFiles.has(expectedPath)) {
        report.phantomEntries.push({
          category,
          agentName,
          registryPath: agentData.path,
          reason: 'File does not exist',
        });
      }
    }
  }

  if (report.phantomEntries.length > 0) {
    log(`   ⚠️  Found ${report.phantomEntries.length} phantom entries`, 'yellow');
    report.phantomEntries.forEach(phantom => {
      verbose(`      ${phantom.category}/${phantom.agentName} → ${phantom.registryPath}`);
    });
  } else {
    log('   ✓ No phantom entries found', 'green');
  }

  // 4. Check for unregistered agents (file exists, not in registry)
  log('\n🔍 Checking for unregistered agents...', 'bright');

  const registeredPaths = new Set<string>();
  for (const category in registry.agents) {
    for (const agentData of Object.values(registry.agents[category])) {
      const normalizedPath = agentData.path.replace(/^agents\//, '');
      registeredPaths.add(normalizedPath);
    }
  }

  for (const [relativePath, fullPath] of agentFiles) {
    if (!registeredPaths.has(relativePath)) {
      const category = relativePath.split('/')[0];
      const agentName = path.basename(relativePath, '.md');

      report.unregisteredAgents.push({
        filePath: relativePath,
        detectedCategory: category,
        agentName,
      });
    }
  }

  if (report.unregisteredAgents.length > 0) {
    log(`   ⚠️  Found ${report.unregisteredAgents.length} unregistered agents`, 'yellow');
    report.unregisteredAgents.forEach(agent => {
      verbose(`      ${agent.filePath} (category: ${agent.detectedCategory})`);
    });
  } else {
    log('   ✓ No unregistered agents found', 'green');
  }

  // 5. Check for category mismatches
  log('\n🔀 Checking for category mismatches...', 'bright');

  for (const [category, agents] of Object.entries(registry.agents)) {
    for (const [agentName, agentData] of Object.entries(agents)) {
      const registryPath = agentData.path.replace(/^agents\//, '');
      const pathCategory = registryPath.split('/')[0];

      if (category !== pathCategory && agentFiles.has(registryPath)) {
        report.categoryMismatches.push({
          agentName,
          registryCategory: category,
          fileCategory: pathCategory,
          filePath: registryPath,
        });
      }
    }
  }

  if (report.categoryMismatches.length > 0) {
    log(`   ⚠️  Found ${report.categoryMismatches.length} category mismatches`, 'yellow');
    report.categoryMismatches.forEach(mismatch => {
      verbose(`      ${mismatch.agentName}: registry="${mismatch.registryCategory}" vs file="${mismatch.fileCategory}"`);
    });
  } else {
    log('   ✓ No category mismatches found', 'green');
  }

  // 6. Check for path mismatches
  log('\n🔗 Checking for path inconsistencies...', 'bright');

  for (const [category, agents] of Object.entries(registry.agents)) {
    for (const [agentName, agentData] of Object.entries(agents)) {
      const registryPath = agentData.path.replace(/^agents\//, '');

      // Check if a file with same agent name exists in correct category
      const expectedPath = `${category}/${agentName}.md`;

      if (registryPath !== expectedPath && agentFiles.has(expectedPath) && !agentFiles.has(registryPath)) {
        report.pathMismatches.push({
          agentName,
          category,
          registryPath: agentData.path,
          actualPath: `agents/${expectedPath}`,
        });
      }
    }
  }

  if (report.pathMismatches.length > 0) {
    log(`   ⚠️  Found ${report.pathMismatches.length} path mismatches`, 'yellow');
    report.pathMismatches.forEach(mismatch => {
      verbose(`      ${mismatch.agentName}: "${mismatch.registryPath}" should be "${mismatch.actualPath}"`);
    });
  } else {
    log('   ✓ No path mismatches found', 'green');
  }

  // Calculate total issues
  report.issues =
    report.phantomEntries.length +
    report.unregisteredAgents.length +
    report.categoryMismatches.length +
    report.pathMismatches.length;

  return report;
}

/**
 * Auto-fix issues
 */
async function autoFix(report: ReconciliationReport): Promise<void> {
  log('\n🔧 Auto-fixing issues...', 'bright');

  // Create backup first
  const backupPath = await backupRegistry(REGISTRY_PATH);

  // Load registry
  const registry = await loadRegistry(REGISTRY_PATH);
  let modified = false;

  // Fix 1: Remove phantom entries
  if (report.phantomEntries.length > 0) {
    log(`\n   Removing ${report.phantomEntries.length} phantom entries...`, 'yellow');

    for (const phantom of report.phantomEntries) {
      if (registry.agents[phantom.category] && registry.agents[phantom.category][phantom.agentName]) {
        delete registry.agents[phantom.category][phantom.agentName];
        verbose(`      Removed: ${phantom.category}/${phantom.agentName}`);
        modified = true;
      }

      // Clean up empty categories
      if (registry.agents[phantom.category] && Object.keys(registry.agents[phantom.category]).length === 0) {
        delete registry.agents[phantom.category];
        verbose(`      Removed empty category: ${phantom.category}`);
      }
    }
  }

  // Fix 2: Add unregistered agents
  if (report.unregisteredAgents.length > 0) {
    log(`\n   Adding ${report.unregisteredAgents.length} unregistered agents...`, 'yellow');

    for (const unregistered of report.unregisteredAgents) {
      const fullPath = path.join(AGENTS_DIR, unregistered.filePath);
      const metadata = await extractMetadata(fullPath);

      if (metadata) {
        const category = unregistered.detectedCategory;

        // Ensure category exists
        if (!registry.agents[category]) {
          registry.agents[category] = {};
        }

        // Add agent entry
        registry.agents[category][unregistered.agentName] = {
          callsign: metadata.name || unregistered.agentName,
          faction: 'Promethean', // Default faction
          path: `agents/${unregistered.filePath}`,
          type: metadata.type || 'developer',
          model: metadata.model || 'sonnet',
          keywords: metadata.keywords || [],
          capabilities: metadata.capabilities || [],
          priority: metadata.priority || 'medium',
        };

        verbose(`      Added: ${category}/${unregistered.agentName}`);
        modified = true;
      } else {
        verbose(`      ⚠️  Could not extract metadata for: ${unregistered.filePath}`);
      }
    }
  }

  // Fix 3: Fix category mismatches
  if (report.categoryMismatches.length > 0) {
    log(`\n   Fixing ${report.categoryMismatches.length} category mismatches...`, 'yellow');

    for (const mismatch of report.categoryMismatches) {
      const oldCategory = mismatch.registryCategory;
      const newCategory = mismatch.fileCategory;

      if (registry.agents[oldCategory] && registry.agents[oldCategory][mismatch.agentName]) {
        // Move to correct category
        if (!registry.agents[newCategory]) {
          registry.agents[newCategory] = {};
        }

        registry.agents[newCategory][mismatch.agentName] = registry.agents[oldCategory][mismatch.agentName];
        delete registry.agents[oldCategory][mismatch.agentName];

        // Clean up empty category
        if (Object.keys(registry.agents[oldCategory]).length === 0) {
          delete registry.agents[oldCategory];
        }

        verbose(`      Moved: ${mismatch.agentName} from ${oldCategory} to ${newCategory}`);
        modified = true;
      }
    }
  }

  // Fix 4: Fix path mismatches
  if (report.pathMismatches.length > 0) {
    log(`\n   Fixing ${report.pathMismatches.length} path mismatches...`, 'yellow');

    for (const mismatch of report.pathMismatches) {
      if (registry.agents[mismatch.category] && registry.agents[mismatch.category][mismatch.agentName]) {
        registry.agents[mismatch.category][mismatch.agentName].path = mismatch.actualPath;
        verbose(`      Updated path: ${mismatch.agentName} → ${mismatch.actualPath}`);
        modified = true;
      }
    }
  }

  // Save if modified
  if (modified) {
    await saveRegistry(REGISTRY_PATH, registry);
    log(`\n✓ Registry updated successfully`, 'green');
    log(`  Backup saved to: ${backupPath}`, 'cyan');
  } else {
    log(`\n✓ No changes needed`, 'green');
    // Remove backup if nothing changed
    await fs.unlink(backupPath);
  }
}

/**
 * Print reconciliation report
 */
function printReport(report: ReconciliationReport) {
  log('\n' + '='.repeat(70), 'bright');
  log('  REGISTRY RECONCILIATION REPORT', 'bright');
  log('='.repeat(70), 'bright');

  log(`\n📊 Summary`, 'bright');
  log(`   Timestamp:         ${report.timestamp}`, 'cyan');
  log(`   Files Scanned:     ${report.totalFilesScanned}`, 'cyan');
  log(`   Registry Entries:  ${report.totalRegistryEntries}`, 'cyan');
  log(`   Issues Found:      ${report.issues}`, report.issues > 0 ? 'yellow' : 'green');

  if (report.phantomEntries.length > 0) {
    log(`\n👻 Phantom Entries (${report.phantomEntries.length})`, 'yellow');
    log('   Entries in registry but files do not exist:', 'yellow');
    report.phantomEntries.forEach(phantom => {
      log(`   • ${phantom.category}/${phantom.agentName}`, 'red');
      log(`     Path: ${phantom.registryPath}`, 'cyan');
    });
  }

  if (report.unregisteredAgents.length > 0) {
    log(`\n🔍 Unregistered Agents (${report.unregisteredAgents.length})`, 'yellow');
    log('   Files exist but not in registry:', 'yellow');
    report.unregisteredAgents.forEach(agent => {
      log(`   • ${agent.filePath}`, 'red');
      log(`     Category: ${agent.detectedCategory}`, 'cyan');
    });
  }

  if (report.categoryMismatches.length > 0) {
    log(`\n🔀 Category Mismatches (${report.categoryMismatches.length})`, 'yellow');
    log('   Registry category does not match file location:', 'yellow');
    report.categoryMismatches.forEach(mismatch => {
      log(`   • ${mismatch.agentName}`, 'red');
      log(`     Registry: ${mismatch.registryCategory} → File: ${mismatch.fileCategory}`, 'cyan');
    });
  }

  if (report.pathMismatches.length > 0) {
    log(`\n🔗 Path Mismatches (${report.pathMismatches.length})`, 'yellow');
    log('   Registry path does not match actual file location:', 'yellow');
    report.pathMismatches.forEach(mismatch => {
      log(`   • ${mismatch.agentName}`, 'red');
      log(`     Registry: ${mismatch.registryPath}`, 'cyan');
      log(`     Actual:   ${mismatch.actualPath}`, 'cyan');
    });
  }

  if (report.issues === 0) {
    log(`\n✓ Registry is in perfect sync!`, 'green');
  } else if (DRY_RUN) {
    log(`\n💡 To fix these issues automatically, run with --fix flag`, 'yellow');
  }

  log('\n' + '='.repeat(70) + '\n', 'bright');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Print header
    log('\n' + '='.repeat(70), 'bright');
    log('  AGENT REGISTRY RECONCILIATION TOOL', 'bright');
    log('='.repeat(70) + '\n', 'bright');

    log(`Mode: ${DRY_RUN ? colorize('DRY-RUN', 'yellow') : colorize('FIX', 'green')}`, 'bright');
    log(`Verbose: ${VERBOSE ? 'ON' : 'OFF'}`, 'cyan');

    // Validate paths
    try {
      await fs.access(AGENTS_DIR);
      await fs.access(REGISTRY_PATH);
    } catch (error) {
      throw new Error(`Required paths not found. Ensure you're in the project root.`);
    }

    // Run reconciliation
    const report = await reconcile();

    // Print report
    printReport(report);

    // Auto-fix if requested
    if (!DRY_RUN && report.issues > 0) {
      await autoFix(report);

      // Re-run reconciliation to verify
      log('\n🔄 Verifying fixes...', 'bright');
      const verifyReport = await reconcile();

      if (verifyReport.issues === 0) {
        log('✓ All issues resolved!', 'green');
      } else {
        log(`⚠️  ${verifyReport.issues} issues remaining`, 'yellow');
        printReport(verifyReport);
      }
    }

    // Exit code based on issues
    process.exit(report.issues > 0 && DRY_RUN ? 1 : 0);

  } catch (error) {
    log(`\n❌ Error: ${error}`, 'red');
    if (error instanceof Error && VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { reconcile, autoFix, type ReconciliationReport };
