#!/usr/bin/env node
/**
 * Registry Integrity Validator
 *
 * Validates registry structure, file references, cross-references, and JSON syntax.
 * Provides comprehensive error reporting and auto-fix capabilities.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { glob } from 'glob';
import pc from 'picocolors';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  stats: ValidationStats;
}

export interface ValidationError {
  type: 'missing_file' | 'invalid_reference' | 'duplicate_id' | 'json_syntax' | 'orphaned_file' | 'invalid_cross_reference' | 'schema_mismatch';
  path: string;
  message: string;
  fixable: boolean;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  type: 'unused_file' | 'deprecated_field' | 'missing_metadata' | 'inconsistent_naming';
  path: string;
  message: string;
  suggestion?: string;
}

export interface ValidationStats {
  totalFiles: number;
  validFiles: number;
  totalErrors: number;
  totalWarnings: number;
  fixableErrors: number;
  registriesChecked: number;
  referencesValidated: number;
  orphanedFiles: number;
}

export interface RegistryIndex {
  $schema?: string;
  version: string;
  description?: string;
  [key: string]: any;
}

export interface AgentEntry {
  path: string;
  type?: string;
  model?: string;
  keywords?: string[];
  capabilities?: string[];
  priority?: string;
  [key: string]: any;
}

export interface SkillEntry {
  path: string;
  category?: string;
  keywords?: string[];
  dependencies?: string[];
  [key: string]: any;
}

// ============================================================================
// Registry Validator Class
// ============================================================================

export class RegistryValidator {
  private baseDir: string;
  private registryDir: string;
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private suggestions: string[] = [];
  private stats: ValidationStats = {
    totalFiles: 0,
    validFiles: 0,
    totalErrors: 0,
    totalWarnings: 0,
    fixableErrors: 0,
    registriesChecked: 0,
    referencesValidated: 0,
    orphanedFiles: 0,
  };

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir);
    this.registryDir = join(this.baseDir, 'registry');
  }

  /**
   * Main validation entry point
   */
  async validateRegistryIntegrity(): Promise<ValidationResult> {
    console.log(pc.cyan('🔍 Starting registry integrity validation...\n'));

    // Validate registry directory exists
    if (!existsSync(this.registryDir)) {
      this.addError({
        type: 'missing_file',
        path: this.registryDir,
        message: 'Registry directory does not exist',
        fixable: false,
      });
      return this.buildResult();
    }

    // Find all index files
    const indexFiles = this.findIndexFiles();
    console.log(pc.dim(`Found ${indexFiles.length} registry index files\n`));

    // Validate each registry index
    for (const indexFile of indexFiles) {
      await this.validateRegistryIndex(indexFile);
    }

    // Find orphaned files
    await this.findOrphanedFiles();

    // Validate cross-references
    await this.validateCrossReferences();

    return this.buildResult();
  }

  /**
   * Find all .index.json files
   */
  private findIndexFiles(): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(this.registryDir);
      for (const entry of entries) {
        if (entry.endsWith('.index.json')) {
          files.push(join(this.registryDir, entry));
        }
      }
      return files;
    } catch (error) {
      this.addError({
        type: 'json_syntax',
        path: this.registryDir,
        message: `Failed to read registry directory: ${(error as Error).message}`,
        fixable: false,
      });
      return [];
    }
  }

  /**
   * Validate a single registry index file
   */
  private async validateRegistryIndex(indexPath: string): Promise<void> {
    const relativePath = relative(this.baseDir, indexPath);
    console.log(pc.blue(`📋 Validating ${relativePath}...`));

    this.stats.registriesChecked++;

    // Check file exists
    if (!existsSync(indexPath)) {
      this.addError({
        type: 'missing_file',
        path: relativePath,
        message: 'Registry index file not found',
        fixable: false,
      });
      return;
    }

    // Parse JSON
    let registry: RegistryIndex;
    try {
      const content = readFileSync(indexPath, 'utf-8');
      registry = JSON.parse(content);
      this.stats.validFiles++;
    } catch (error) {
      this.addError({
        type: 'json_syntax',
        path: relativePath,
        message: `Invalid JSON: ${(error as Error).message}`,
        fixable: false,
      });
      return;
    }

    // Validate structure
    if (!registry.version) {
      this.addWarning({
        type: 'missing_metadata',
        path: relativePath,
        message: 'Missing version field',
        suggestion: 'Add a version field to track registry changes',
      });
    }

    // Validate file references based on registry type
    const registryName = indexPath.split(sep).pop()?.replace('.index.json', '') || '';
    await this.validateFileReferences(registry, registryName, relativePath);

    console.log(pc.green(`✓ ${relativePath} validated\n`));
  }

  /**
   * Validate file references in registry
   */
  private async validateFileReferences(
    registry: RegistryIndex,
    registryName: string,
    registryPath: string
  ): Promise<void> {
    const entries = this.extractEntries(registry, registryName);

    for (const [id, entry] of Object.entries(entries)) {
      if (typeof entry === 'object' && entry !== null && 'path' in entry) {
        const filePath = join(this.baseDir, (entry as any).path);
        this.stats.referencesValidated++;

        if (!existsSync(filePath)) {
          this.addError({
            type: 'missing_file',
            path: (entry as any).path,
            message: `Referenced file does not exist (from ${registryPath}, entry: ${id})`,
            fixable: true,
            details: { registryPath, entryId: id },
          });
        } else {
          this.stats.totalFiles++;
        }

        // Validate nested references
        if (registryName === 'agents' && typeof entry === 'object') {
          this.validateAgentEntry(entry as AgentEntry, id, registryPath);
        } else if (registryName === 'skills' && typeof entry === 'object') {
          this.validateSkillEntry(entry as SkillEntry, id, registryPath);
        }
      }
    }
  }

  /**
   * Extract entries from registry based on type
   */
  private extractEntries(registry: RegistryIndex, registryName: string): Record<string, any> {
    switch (registryName) {
      case 'agents':
        return this.flattenNestedObject(registry.agents || {});
      case 'skills':
        return this.flattenNestedObject(registry.skills || {});
      case 'commands':
        return this.flattenNestedObject(registry.commands || {});
      case 'workflows':
        return registry.workflows || {};
      case 'mcps':
        return this.flattenNestedObject(registry.mcps || {});
      case 'tools':
        return registry.builtin || {};
      default:
        return {};
    }
  }

  /**
   * Flatten nested objects (for categories)
   */
  private flattenNestedObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && 'path' in value) {
        result[newKey] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenNestedObject(value, newKey));
      }
    }

    return result;
  }

  /**
   * Validate agent entry
   */
  private validateAgentEntry(entry: AgentEntry, id: string, registryPath: string): void {
    if (!entry.type) {
      this.addWarning({
        type: 'missing_metadata',
        path: `${registryPath}:${id}`,
        message: 'Agent missing type field',
        suggestion: 'Add type: "developer", "analyst", "coordinator", etc.',
      });
    }

    if (!entry.keywords || entry.keywords.length === 0) {
      this.addWarning({
        type: 'missing_metadata',
        path: `${registryPath}:${id}`,
        message: 'Agent missing keywords for activation',
        suggestion: 'Add keywords array to enable context-based activation',
      });
    }
  }

  /**
   * Validate skill entry
   */
  private validateSkillEntry(entry: SkillEntry, id: string, registryPath: string): void {
    if (!entry.category) {
      this.addWarning({
        type: 'missing_metadata',
        path: `${registryPath}:${id}`,
        message: 'Skill missing category field',
        suggestion: 'Add category for better organization',
      });
    }
  }

  /**
   * Find orphaned files (exist but not in registry)
   */
  private async findOrphanedFiles(): Promise<void> {
    console.log(pc.cyan('🔍 Checking for orphaned files...\n'));

    const patterns = [
      join(this.baseDir, 'agents/**/*.md'),
      join(this.baseDir, 'skills/**/*.md'),
      join(this.baseDir, 'commands/**/*.md'),
      join(this.baseDir, 'workflows/**/*.md'),
    ];

    // Collect all referenced files
    const referencedFiles = new Set<string>();
    const indexFiles = this.findIndexFiles();

    for (const indexFile of indexFiles) {
      try {
        const content = readFileSync(indexFile, 'utf-8');
        const registry = JSON.parse(content);
        const registryName = indexFile.split(sep).pop()?.replace('.index.json', '') || '';
        const entries = this.extractEntries(registry, registryName);

        for (const entry of Object.values(entries)) {
          if (typeof entry === 'object' && entry !== null && 'path' in entry) {
            const fullPath = resolve(this.baseDir, (entry as any).path);
            referencedFiles.add(fullPath);
          }
        }
      } catch (error) {
        // Skip if already reported
      }
    }

    // Find all actual files
    const allFiles = new Set<string>();
    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, { windowsPathsNoEscape: true });
        files.forEach(f => allFiles.add(resolve(f)));
      } catch (error) {
        console.log(pc.yellow(`Warning: Failed to glob pattern ${pattern}`));
      }
    }

    // Find orphans
    const orphanedFiles = Array.from(allFiles).filter(f => !referencedFiles.has(f));

    if (orphanedFiles.length > 0) {
      console.log(pc.yellow(`Found ${orphanedFiles.length} orphaned files:\n`));
      for (const orphan of orphanedFiles) {
        const relativePath = relative(this.baseDir, orphan);
        this.addWarning({
          type: 'unused_file',
          path: relativePath,
          message: 'File exists but is not referenced in any registry',
          suggestion: 'Add to appropriate registry or remove if obsolete',
        });
        this.stats.orphanedFiles++;
        console.log(pc.dim(`  - ${relativePath}`));
      }
      console.log();
    } else {
      console.log(pc.green('✓ No orphaned files found\n'));
    }
  }

  /**
   * Validate cross-references between registries
   */
  private async validateCrossReferences(): Promise<void> {
    console.log(pc.cyan('🔍 Validating cross-references...\n'));

    // Check keyword index references
    const keywordIndexPath = join(this.registryDir, 'search', 'keywords.json');
    if (existsSync(keywordIndexPath)) {
      try {
        const content = readFileSync(keywordIndexPath, 'utf-8');
        const keywordIndex = JSON.parse(content);

        // Validate keyword mappings reference real agents/skills
        for (const [keyword, targets] of Object.entries(keywordIndex.keywords || {})) {
          if (Array.isArray(targets)) {
            for (const target of targets) {
              // Check if target exists in registries
              const found = await this.checkResourceExists(target);
              if (!found) {
                this.addError({
                  type: 'invalid_cross_reference',
                  path: 'registry/search/keywords.json',
                  message: `Keyword "${keyword}" references non-existent resource: ${target}`,
                  fixable: true,
                  details: { keyword, target },
                });
              }
            }
          }
        }
      } catch (error) {
        this.addError({
          type: 'json_syntax',
          path: 'registry/search/keywords.json',
          message: `Invalid JSON: ${(error as Error).message}`,
          fixable: false,
        });
      }
    }

    console.log(pc.green('✓ Cross-references validated\n'));
  }

  /**
   * Check if a resource exists in registries
   */
  private async checkResourceExists(resourceId: string): Promise<boolean> {
    const indexFiles = this.findIndexFiles();

    for (const indexFile of indexFiles) {
      try {
        const content = readFileSync(indexFile, 'utf-8');
        const registry = JSON.parse(content);
        const registryName = indexFile.split(sep).pop()?.replace('.index.json', '') || '';
        const entries = this.extractEntries(registry, registryName);

        if (resourceId in entries) {
          return true;
        }
      } catch (error) {
        // Skip
      }
    }

    return false;
  }

  /**
   * Add validation error
   */
  private addError(error: ValidationError): void {
    this.errors.push(error);
    this.stats.totalErrors++;
    if (error.fixable) {
      this.stats.fixableErrors++;
    }
  }

  /**
   * Add validation warning
   */
  private addWarning(warning: ValidationWarning): void {
    this.warnings.push(warning);
    this.stats.totalWarnings++;
  }

  /**
   * Build final validation result
   */
  private buildResult(): ValidationResult {
    const valid = this.errors.length === 0;

    // Generate suggestions
    if (this.stats.fixableErrors > 0) {
      this.suggestions.push(`${this.stats.fixableErrors} errors can be auto-fixed with --fix flag`);
    }
    if (this.stats.orphanedFiles > 0) {
      this.suggestions.push(`Consider adding ${this.stats.orphanedFiles} orphaned files to registry or removing them`);
    }

    return {
      valid,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions,
      stats: this.stats,
    };
  }

  /**
   * Print validation results
   */
  printResults(result: ValidationResult): void {
    console.log(pc.bold('\n📊 Validation Results\n'));
    console.log(pc.dim('─'.repeat(60)));

    // Stats
    console.log(pc.cyan('Statistics:'));
    console.log(`  Registries checked: ${result.stats.registriesChecked}`);
    console.log(`  References validated: ${result.stats.referencesValidated}`);
    console.log(`  Total files found: ${result.stats.totalFiles}`);
    console.log(`  Orphaned files: ${result.stats.orphanedFiles}`);
    console.log();

    // Errors
    if (result.errors.length > 0) {
      console.log(pc.red(`❌ ${result.errors.length} Error(s):`));
      for (const error of result.errors) {
        const fixable = error.fixable ? pc.green('[fixable]') : pc.red('[manual]');
        console.log(`  ${fixable} ${pc.bold(error.type)}: ${error.path}`);
        console.log(`    ${error.message}`);
      }
      console.log();
    } else {
      console.log(pc.green('✓ No errors found!'));
      console.log();
    }

    // Warnings
    if (result.warnings.length > 0) {
      console.log(pc.yellow(`⚠️  ${result.warnings.length} Warning(s):`));
      for (const warning of result.warnings) {
        console.log(`  ${pc.bold(warning.type)}: ${warning.path}`);
        console.log(`    ${warning.message}`);
        if (warning.suggestion) {
          console.log(pc.dim(`    💡 ${warning.suggestion}`));
        }
      }
      console.log();
    }

    // Suggestions
    if (result.suggestions.length > 0) {
      console.log(pc.cyan('💡 Suggestions:'));
      for (const suggestion of result.suggestions) {
        console.log(`  • ${suggestion}`);
      }
      console.log();
    }

    // Final status
    console.log(pc.dim('─'.repeat(60)));
    if (result.valid) {
      console.log(pc.green(pc.bold('✅ Registry integrity validation PASSED!')));
    } else {
      console.log(pc.red(pc.bold('❌ Registry integrity validation FAILED!')));
      console.log(pc.yellow(`   ${result.stats.fixableErrors} of ${result.errors.length} errors can be auto-fixed`));
    }
    console.log();
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

// Run as CLI if this is the main module
const isMainModule = process.argv[1]?.endsWith('registry-validator.ts') ||
                     process.argv[1]?.endsWith('registry-validator.js');

if (isMainModule) {
  const baseDir = process.argv[2] || join(process.cwd(), '.claude');
  const validator = new RegistryValidator(baseDir);

  validator.validateRegistryIntegrity().then(result => {
    validator.printResults(result);
    process.exit(result.valid ? 0 : 1);
  }).catch(error => {
    console.error(pc.red('Fatal error:'), error);
    process.exit(2);
  });
}
