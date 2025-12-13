/**
 * Lockfile manager for plugin dependencies
 *
 * Provides lockfile generation, reading, writing, and integrity validation
 * Similar to package-lock.json or pnpm-lock.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Lockfile, PluginLock, ResolvedDependencies, ValidationResult } from './types.js';

/**
 * Lockfile manager for deterministic dependency installation
 */
export class LockfileManager {
  private static readonly LOCKFILE_VERSION = '1.0.0';
  private static readonly DEFAULT_LOCKFILE_NAME = 'claude-plugins-lock.json';

  /**
   * Generate a lockfile from resolved dependencies
   */
  generateLockfile(resolved: ResolvedDependencies): Lockfile {
    const plugins: Record<string, PluginLock> = {};

    for (const [pluginName, info] of resolved.plugins) {
      plugins[pluginName] = {
        version: info.version,
        resolved: info.resolved,
        integrity: this.calculateIntegrity(info.resolved),
        dependencies: info.dependencies,
      };
    }

    return {
      version: LockfileManager.LOCKFILE_VERSION,
      plugins,
      generated: new Date().toISOString(),
    };
  }

  /**
   * Read lockfile from disk
   */
  readLockfile(lockfilePath: string): Lockfile {
    if (!fs.existsSync(lockfilePath)) {
      throw new Error(`Lockfile not found: ${lockfilePath}`);
    }

    try {
      const content = fs.readFileSync(lockfilePath, 'utf-8');
      const lockfile = JSON.parse(content) as Lockfile;

      // Validate lockfile structure
      this.validateLockfileStructure(lockfile);

      return lockfile;
    } catch (error) {
      throw new Error(`Failed to read lockfile: ${(error as Error).message}`);
    }
  }

  /**
   * Write lockfile to disk
   */
  writeLockfile(lockfile: Lockfile, outputPath: string): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Sort plugins alphabetically for consistency
      const sortedPlugins: Record<string, PluginLock> = {};
      Object.keys(lockfile.plugins)
        .sort()
        .forEach(key => {
          sortedPlugins[key] = lockfile.plugins[key];
        });

      const sortedLockfile: Lockfile = {
        ...lockfile,
        plugins: sortedPlugins,
      };

      // Write with pretty formatting
      const content = JSON.stringify(sortedLockfile, null, 2);
      fs.writeFileSync(outputPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write lockfile: ${(error as Error).message}`);
    }
  }

  /**
   * Validate lockfile integrity
   */
  validateIntegrity(lockfile: Lockfile): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      mismatches: [],
    };

    // Check lockfile version
    if (!lockfile.version) {
      result.errors.push('Lockfile missing version field');
      result.valid = false;
    } else if (lockfile.version !== LockfileManager.LOCKFILE_VERSION) {
      result.warnings.push(
        `Lockfile version ${lockfile.version} differs from current version ${LockfileManager.LOCKFILE_VERSION}`
      );
    }

    // Validate each plugin entry
    for (const [pluginName, lock] of Object.entries(lockfile.plugins)) {
      // Check required fields
      if (!lock.version) {
        result.errors.push(`Plugin ${pluginName} missing version`);
        result.valid = false;
      }

      if (!lock.resolved) {
        result.errors.push(`Plugin ${pluginName} missing resolved field`);
        result.valid = false;
      }

      if (!lock.integrity) {
        result.errors.push(`Plugin ${pluginName} missing integrity hash`);
        result.valid = false;
      }

      // Validate integrity hash if file exists
      if (lock.resolved && lock.integrity) {
        try {
          if (this.isLocalPath(lock.resolved)) {
            const actualIntegrity = this.calculateIntegrity(lock.resolved);
            if (actualIntegrity !== lock.integrity) {
              result.mismatches.push({
                plugin: pluginName,
                expected: lock.integrity,
                actual: actualIntegrity,
              });
              result.valid = false;
            }
          }
        } catch (error) {
          result.warnings.push(
            `Could not validate integrity for ${pluginName}: ${(error as Error).message}`
          );
        }
      }

      // Validate dependencies structure
      if (lock.dependencies && typeof lock.dependencies !== 'object') {
        result.errors.push(`Plugin ${pluginName} has invalid dependencies structure`);
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * Merge two lockfiles (for conflict resolution)
   */
  mergeLockfiles(base: Lockfile, incoming: Lockfile): Lockfile {
    const merged: Lockfile = {
      version: LockfileManager.LOCKFILE_VERSION,
      plugins: { ...base.plugins },
      generated: new Date().toISOString(),
    };

    // Merge plugin entries (incoming takes precedence)
    for (const [pluginName, lock] of Object.entries(incoming.plugins)) {
      merged.plugins[pluginName] = lock;
    }

    return merged;
  }

  /**
   * Get default lockfile path for a project
   */
  getDefaultLockfilePath(projectRoot: string): string {
    return path.join(projectRoot, LockfileManager.DEFAULT_LOCKFILE_NAME);
  }

  /**
   * Check if lockfile exists
   */
  lockfileExists(lockfilePath: string): boolean {
    return fs.existsSync(lockfilePath);
  }

  /**
   * Calculate SHA-256 integrity hash for a file or directory
   */
  private calculateIntegrity(resolvedPath: string): string {
    if (!this.isLocalPath(resolvedPath)) {
      // For remote URLs, return a placeholder
      // In production, this would download and hash the content
      return this.hashString(resolvedPath);
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Path does not exist: ${resolvedPath}`);
    }

    const stats = fs.statSync(resolvedPath);

    if (stats.isFile()) {
      return this.hashFile(resolvedPath);
    } else if (stats.isDirectory()) {
      return this.hashDirectory(resolvedPath);
    } else {
      throw new Error(`Invalid path type: ${resolvedPath}`);
    }
  }

  /**
   * Hash a file
   */
  private hashFile(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return this.hashBuffer(content);
  }

  /**
   * Hash a directory (hash of all file hashes)
   */
  private hashDirectory(dirPath: string): string {
    const files = this.getAllFiles(dirPath);
    const hashes = files.map(file => {
      const relativePath = path.relative(dirPath, file);
      const fileHash = this.hashFile(file);
      return `${relativePath}:${fileHash}`;
    });

    // Sort for consistency
    hashes.sort();

    return this.hashString(hashes.join('\n'));
  }

  /**
   * Get all files in a directory recursively
   */
  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip common ignored directories
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.claude'].includes(entry.name)) {
            walk(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    };

    walk(dirPath);
    return files;
  }

  /**
   * Hash a buffer
   */
  private hashBuffer(buffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return `sha256-${hash.digest('base64')}`;
  }

  /**
   * Hash a string
   */
  private hashString(str: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return `sha256-${hash.digest('base64')}`;
  }

  /**
   * Check if a path is local (not a URL)
   */
  private isLocalPath(resolvedPath: string): boolean {
    return !resolvedPath.startsWith('http://') && !resolvedPath.startsWith('https://');
  }

  /**
   * Validate lockfile structure
   */
  private validateLockfileStructure(lockfile: Lockfile): void {
    if (!lockfile.version) {
      throw new Error('Invalid lockfile: missing version');
    }

    if (!lockfile.plugins || typeof lockfile.plugins !== 'object') {
      throw new Error('Invalid lockfile: missing or invalid plugins');
    }

    if (!lockfile.generated) {
      throw new Error('Invalid lockfile: missing generated timestamp');
    }
  }

  /**
   * Create an empty lockfile
   */
  createEmptyLockfile(): Lockfile {
    return {
      version: LockfileManager.LOCKFILE_VERSION,
      plugins: {},
      generated: new Date().toISOString(),
    };
  }

  /**
   * Update a single plugin entry in lockfile
   */
  updatePlugin(lockfile: Lockfile, pluginName: string, lock: PluginLock): Lockfile {
    return {
      ...lockfile,
      plugins: {
        ...lockfile.plugins,
        [pluginName]: lock,
      },
      generated: new Date().toISOString(),
    };
  }

  /**
   * Remove a plugin from lockfile
   */
  removePlugin(lockfile: Lockfile, pluginName: string): Lockfile {
    const { [pluginName]: removed, ...remainingPlugins } = lockfile.plugins;

    return {
      ...lockfile,
      plugins: remainingPlugins,
      generated: new Date().toISOString(),
    };
  }

  /**
   * Get diff between two lockfiles
   */
  diff(
    old: Lockfile,
    current: Lockfile
  ): {
    added: string[];
    removed: string[];
    updated: string[];
  } {
    const added: string[] = [];
    const removed: string[] = [];
    const updated: string[] = [];

    const oldPlugins = new Set(Object.keys(old.plugins));
    const currentPlugins = new Set(Object.keys(current.plugins));

    // Find added plugins
    for (const plugin of currentPlugins) {
      if (!oldPlugins.has(plugin)) {
        added.push(plugin);
      }
    }

    // Find removed plugins
    for (const plugin of oldPlugins) {
      if (!currentPlugins.has(plugin)) {
        removed.push(plugin);
      }
    }

    // Find updated plugins
    for (const plugin of currentPlugins) {
      if (oldPlugins.has(plugin)) {
        const oldVersion = old.plugins[plugin].version;
        const currentVersion = current.plugins[plugin].version;
        if (oldVersion !== currentVersion) {
          updated.push(plugin);
        }
      }
    }

    return { added, removed, updated };
  }
}
