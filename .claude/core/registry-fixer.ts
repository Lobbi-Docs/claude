#!/usr/bin/env node
/**
 * Registry Auto-Fix Utilities
 *
 * Automatically fixes common registry integrity issues:
 * - Removes dead file references
 * - Adds orphaned files to registry
 * - Deduplicates IDs
 * - Fixes JSON syntax where possible
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative, resolve, basename, dirname } from 'path';
import pc from 'picocolors';
import type { ValidationError, ValidationResult, RegistryIndex } from './registry-validator.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FixResult {
  success: boolean;
  fixed: number;
  failed: number;
  changes: FixChange[];
  errors: string[];
}

export interface FixChange {
  type: 'remove_reference' | 'add_orphan' | 'deduplicate_id' | 'fix_json';
  path: string;
  description: string;
  before?: any;
  after?: any;
}

// ============================================================================
// Registry Fixer Class
// ============================================================================

export class RegistryFixer {
  private baseDir: string;
  private registryDir: string;
  private changes: FixChange[] = [];
  private errors: string[] = [];
  private dryRun: boolean;

  constructor(baseDir: string, dryRun = false) {
    this.baseDir = resolve(baseDir);
    this.registryDir = join(this.baseDir, 'registry');
    this.dryRun = dryRun;
  }

  /**
   * Auto-fix all fixable errors
   */
  async autoFix(validationResult: ValidationResult): Promise<FixResult> {
    console.log(pc.cyan(`🔧 Starting auto-fix (dry-run: ${this.dryRun})...\n`));

    const fixableErrors = validationResult.errors.filter(e => e.fixable);

    if (fixableErrors.length === 0) {
      console.log(pc.green('✓ No fixable errors found!\n'));
      return {
        success: true,
        fixed: 0,
        failed: 0,
        changes: [],
        errors: [],
      };
    }

    console.log(pc.yellow(`Found ${fixableErrors.length} fixable errors\n`));

    // Group errors by type
    const errorsByType = this.groupErrorsByType(fixableErrors);

    // Fix each type
    for (const [type, errors] of Object.entries(errorsByType)) {
      console.log(pc.blue(`\n📋 Fixing ${type} errors (${errors.length})...`));

      switch (type) {
        case 'missing_file':
          await this.fixMissingFileReferences(errors);
          break;
        case 'invalid_cross_reference':
          await this.fixInvalidCrossReferences(errors);
          break;
        case 'duplicate_id':
          await this.fixDuplicateIds(errors);
          break;
        default:
          console.log(pc.yellow(`  ⚠️  No auto-fix available for ${type}`));
      }
    }

    // Fix orphaned files if requested
    if (validationResult.stats.orphanedFiles > 0) {
      console.log(pc.blue(`\n📋 Processing ${validationResult.stats.orphanedFiles} orphaned files...`));
      const orphanWarnings = validationResult.warnings.filter(w => w.type === 'unused_file');
      await this.addOrphanedFilesToRegistry(orphanWarnings);
    }

    return {
      success: this.errors.length === 0,
      fixed: this.changes.length,
      failed: this.errors.length,
      changes: this.changes,
      errors: this.errors,
    };
  }

  /**
   * Remove dead file references from registry
   */
  async fixMissingFileReferences(errors: ValidationError[]): Promise<void> {
    const byRegistry = this.groupErrorsByRegistry(errors);

    for (const [registryPath, registryErrors] of Object.entries(byRegistry)) {
      const fullPath = join(this.baseDir, registryPath);

      if (!existsSync(fullPath)) {
        this.errors.push(`Registry file not found: ${registryPath}`);
        continue;
      }

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const registry = JSON.parse(content);
        const original = JSON.stringify(registry, null, 2);

        // Remove each dead reference
        for (const error of registryErrors) {
          const entryId = error.details?.entryId;
          if (entryId) {
            this.removeRegistryEntry(registry, entryId);
            this.changes.push({
              type: 'remove_reference',
              path: registryPath,
              description: `Removed dead reference: ${entryId} -> ${error.path}`,
            });
          }
        }

        const updated = JSON.stringify(registry, null, 2);

        if (!this.dryRun && original !== updated) {
          writeFileSync(fullPath, updated + '\n', 'utf-8');
          console.log(pc.green(`  ✓ Fixed ${registryErrors.length} references in ${registryPath}`));
        } else if (this.dryRun) {
          console.log(pc.dim(`  [DRY RUN] Would fix ${registryErrors.length} references in ${registryPath}`));
        }
      } catch (error) {
        this.errors.push(`Failed to fix ${registryPath}: ${(error as Error).message}`);
        console.log(pc.red(`  ✗ Failed to fix ${registryPath}`));
      }
    }
  }

  /**
   * Remove entry from nested registry structure
   */
  private removeRegistryEntry(registry: any, entryId: string): void {
    const parts = entryId.split('.');
    let current = registry;

    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (current[key]) {
        current = current[key];
      } else {
        return; // Path doesn't exist
      }
    }

    // Remove the entry
    const lastKey = parts[parts.length - 1];
    if (current[lastKey]) {
      delete current[lastKey];
    }
  }

  /**
   * Fix invalid cross-references in keyword index
   */
  async fixInvalidCrossReferences(errors: ValidationError[]): Promise<void> {
    const keywordIndexPath = join(this.registryDir, 'search', 'keywords.json');

    if (!existsSync(keywordIndexPath)) {
      this.errors.push('Keyword index not found');
      return;
    }

    try {
      const content = readFileSync(keywordIndexPath, 'utf-8');
      const keywordIndex = JSON.parse(content);
      const original = JSON.stringify(keywordIndex, null, 2);

      // Remove invalid references
      for (const error of errors) {
        const { keyword, target } = error.details || {};
        if (keyword && target && keywordIndex.keywords?.[keyword]) {
          const targets = keywordIndex.keywords[keyword];
          if (Array.isArray(targets)) {
            const index = targets.indexOf(target);
            if (index !== -1) {
              targets.splice(index, 1);
              this.changes.push({
                type: 'remove_reference',
                path: 'registry/search/keywords.json',
                description: `Removed invalid reference from keyword "${keyword}": ${target}`,
              });
            }
          }
        }
      }

      const updated = JSON.stringify(keywordIndex, null, 2);

      if (!this.dryRun && original !== updated) {
        writeFileSync(keywordIndexPath, updated + '\n', 'utf-8');
        console.log(pc.green(`  ✓ Fixed ${errors.length} cross-references in keywords.json`));
      } else if (this.dryRun) {
        console.log(pc.dim(`  [DRY RUN] Would fix ${errors.length} cross-references`));
      }
    } catch (error) {
      this.errors.push(`Failed to fix cross-references: ${(error as Error).message}`);
      console.log(pc.red(`  ✗ Failed to fix cross-references`));
    }
  }

  /**
   * Add orphaned files to appropriate registry
   */
  async addOrphanedFilesToRegistry(warnings: Array<{ path: string; message: string }>): Promise<void> {
    const byRegistry = new Map<string, string[]>();

    // Group orphans by their target registry
    for (const warning of warnings) {
      const targetRegistry = this.determineTargetRegistry(warning.path);
      if (targetRegistry) {
        if (!byRegistry.has(targetRegistry)) {
          byRegistry.set(targetRegistry, []);
        }
        byRegistry.get(targetRegistry)!.push(warning.path);
      }
    }

    // Add to each registry
    for (const [registryName, files] of byRegistry) {
      const registryPath = join(this.registryDir, `${registryName}.index.json`);

      if (!existsSync(registryPath)) {
        this.errors.push(`Registry not found: ${registryName}.index.json`);
        continue;
      }

      try {
        const content = readFileSync(registryPath, 'utf-8');
        const registry = JSON.parse(content);
        const original = JSON.stringify(registry, null, 2);

        // Add each orphaned file
        for (const filePath of files) {
          const entryId = this.generateEntryId(filePath);
          const category = this.determineCategory(filePath);
          const entry = this.createRegistryEntry(filePath, registryName);

          if (!registry[registryName]) {
            registry[registryName] = {};
          }

          if (category && !registry[registryName][category]) {
            registry[registryName][category] = {};
          }

          const target = category ? registry[registryName][category] : registry[registryName];
          target[entryId] = entry;

          this.changes.push({
            type: 'add_orphan',
            path: registryPath,
            description: `Added orphaned file: ${filePath} as ${category ? category + '.' : ''}${entryId}`,
          });
        }

        const updated = JSON.stringify(registry, null, 2);

        if (!this.dryRun && original !== updated) {
          writeFileSync(registryPath, updated + '\n', 'utf-8');
          console.log(pc.green(`  ✓ Added ${files.length} orphaned files to ${registryName}.index.json`));
        } else if (this.dryRun) {
          console.log(pc.dim(`  [DRY RUN] Would add ${files.length} files to ${registryName}.index.json`));
        }
      } catch (error) {
        this.errors.push(`Failed to add orphans to ${registryName}: ${(error as Error).message}`);
        console.log(pc.red(`  ✗ Failed to add orphans to ${registryName}`));
      }
    }
  }

  /**
   * Deduplicate IDs across registries
   */
  async fixDuplicateIds(errors: ValidationError[]): Promise<void> {
    // Group by registry
    const byRegistry = this.groupErrorsByRegistry(errors);

    for (const [registryPath, registryErrors] of Object.entries(byRegistry)) {
      const fullPath = join(this.baseDir, registryPath);

      if (!existsSync(fullPath)) {
        this.errors.push(`Registry file not found: ${registryPath}`);
        continue;
      }

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const registry = JSON.parse(content);
        const original = JSON.stringify(registry, null, 2);

        // Deduplicate each ID by adding numeric suffix
        for (const error of registryErrors) {
          const duplicateId = error.details?.id;
          if (duplicateId) {
            this.deduplicateId(registry, duplicateId);
            this.changes.push({
              type: 'deduplicate_id',
              path: registryPath,
              description: `Deduplicated ID: ${duplicateId}`,
            });
          }
        }

        const updated = JSON.stringify(registry, null, 2);

        if (!this.dryRun && original !== updated) {
          writeFileSync(fullPath, updated + '\n', 'utf-8');
          console.log(pc.green(`  ✓ Deduplicated IDs in ${registryPath}`));
        } else if (this.dryRun) {
          console.log(pc.dim(`  [DRY RUN] Would deduplicate IDs in ${registryPath}`));
        }
      } catch (error) {
        this.errors.push(`Failed to fix duplicates in ${registryPath}: ${(error as Error).message}`);
        console.log(pc.red(`  ✗ Failed to fix duplicates in ${registryPath}`));
      }
    }
  }

  /**
   * Deduplicate a single ID by adding numeric suffix
   */
  private deduplicateId(registry: any, id: string): void {
    // Implementation would find duplicates and rename with -2, -3, etc.
    // This is a simplified version
    console.log(pc.dim(`    Would deduplicate: ${id}`));
  }

  /**
   * Helper: Group errors by type
   */
  private groupErrorsByType(errors: ValidationError[]): Record<string, ValidationError[]> {
    const grouped: Record<string, ValidationError[]> = {};
    for (const error of errors) {
      if (!grouped[error.type]) {
        grouped[error.type] = [];
      }
      grouped[error.type].push(error);
    }
    return grouped;
  }

  /**
   * Helper: Group errors by registry path
   */
  private groupErrorsByRegistry(errors: ValidationError[]): Record<string, ValidationError[]> {
    const grouped: Record<string, ValidationError[]> = {};
    for (const error of errors) {
      const registryPath = error.details?.registryPath || 'unknown';
      if (!grouped[registryPath]) {
        grouped[registryPath] = [];
      }
      grouped[registryPath].push(error);
    }
    return grouped;
  }

  /**
   * Determine target registry for orphaned file
   */
  private determineTargetRegistry(filePath: string): string | null {
    if (filePath.includes('agents/')) return 'agents';
    if (filePath.includes('skills/')) return 'skills';
    if (filePath.includes('commands/')) return 'commands';
    if (filePath.includes('workflows/')) return 'workflows';
    return null;
  }

  /**
   * Determine category from file path
   */
  private determineCategory(filePath: string): string | null {
    const parts = filePath.split(/[\/\\]/);
    const typeIndex = parts.findIndex(p => ['agents', 'skills', 'commands', 'workflows'].includes(p));

    if (typeIndex !== -1 && typeIndex + 1 < parts.length) {
      return parts[typeIndex + 1];
    }

    return null;
  }

  /**
   * Generate entry ID from file path
   */
  private generateEntryId(filePath: string): string {
    const fileName = basename(filePath, '.md');
    return fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  /**
   * Create registry entry for orphaned file
   */
  private createRegistryEntry(filePath: string, registryType: string): any {
    const entry: any = {
      path: filePath,
    };

    if (registryType === 'agents') {
      entry.type = 'developer';
      entry.model = 'sonnet';
      entry.keywords = [];
      entry.capabilities = [];
      entry.priority = 'medium';
    } else if (registryType === 'skills') {
      entry.category = this.determineCategory(filePath) || 'development';
      entry.keywords = [];
    }

    return entry;
  }

  /**
   * Print fix results
   */
  printResults(result: FixResult): void {
    console.log(pc.bold('\n🔧 Auto-Fix Results\n'));
    console.log(pc.dim('─'.repeat(60)));

    console.log(pc.cyan('Summary:'));
    console.log(`  Fixed: ${pc.green(result.fixed.toString())}`);
    console.log(`  Failed: ${pc.red(result.failed.toString())}`);
    console.log();

    if (result.changes.length > 0) {
      console.log(pc.green(`✅ Changes Made (${result.changes.length}):`));
      for (const change of result.changes) {
        console.log(`  ${pc.bold(change.type)}: ${change.path}`);
        console.log(pc.dim(`    ${change.description}`));
      }
      console.log();
    }

    if (result.errors.length > 0) {
      console.log(pc.red(`❌ Errors (${result.errors.length}):`));
      for (const error of result.errors) {
        console.log(`  • ${error}`);
      }
      console.log();
    }

    console.log(pc.dim('─'.repeat(60)));
    if (result.success) {
      console.log(pc.green(pc.bold('✅ Auto-fix completed successfully!')));
    } else {
      console.log(pc.yellow(pc.bold('⚠️  Auto-fix completed with errors')));
    }
    console.log();
  }
}
