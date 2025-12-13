/**
 * Plugin installer orchestration
 *
 * Handles installation, uninstallation, and upgrade of Claude Code plugins
 * with dependency resolution and lockfile management
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  InstallOptions,
  InstallResult,
  PluginManifest,
  ResolvedDependencies,
  InstallProgress,
  InstallationState,
} from './types.js';
import { DependencyGraph, SemverResolver, ConflictResolver } from './dependency-resolver.js';
import { LockfileManager } from './lockfile-manager.js';

/**
 * Plugin installer with dependency resolution
 */
export class PluginInstaller {
  private lockfileManager: LockfileManager;
  private semverResolver: SemverResolver;
  private conflictResolver: ConflictResolver;
  private installDir: string;
  private lockfilePath: string;

  constructor(installDir: string, lockfilePath?: string) {
    this.installDir = installDir;
    this.lockfileManager = new LockfileManager();
    this.semverResolver = new SemverResolver();
    this.conflictResolver = new ConflictResolver();
    this.lockfilePath = lockfilePath || this.lockfileManager.getDefaultLockfilePath(installDir);
  }

  /**
   * Install a plugin and its dependencies
   */
  async install(pluginName: string, options: InstallOptions = {}): Promise<InstallResult> {
    const startTime = Date.now();
    const result: InstallResult = {
      installed: [],
      skipped: [],
      errors: [],
      duration: 0,
    };

    try {
      // Load or create lockfile
      let lockfile = this.lockfileManager.lockfileExists(this.lockfilePath)
        ? this.lockfileManager.readLockfile(this.lockfilePath)
        : this.lockfileManager.createEmptyLockfile();

      // Resolve dependencies
      const manifest = await this.loadManifest(pluginName);
      const resolved = await this.resolveDependencies(manifest, options);

      // Install plugins in topological order
      for (const name of resolved.installOrder) {
        const pluginInfo = resolved.plugins.get(name);
        if (!pluginInfo) continue;

        try {
          // Check if already installed and skip if force not set
          if (!options.force && this.isInstalled(name, pluginInfo.version)) {
            result.skipped.push(name);
            continue;
          }

          // Install the plugin
          await this.installPlugin(name, pluginInfo.version, pluginInfo.resolved, options);
          result.installed.push(name);

          // Update lockfile
          lockfile = this.lockfileManager.updatePlugin(lockfile, name, {
            version: pluginInfo.version,
            resolved: pluginInfo.resolved,
            integrity: '', // Will be calculated when writing
            dependencies: pluginInfo.dependencies,
          });
        } catch (error) {
          result.errors.push({
            plugin: name,
            error: error as Error,
          });
        }
      }

      // Generate and write lockfile
      if (!options.lockfileOnly) {
        result.lockfile = this.lockfileManager.generateLockfile(resolved);
        this.lockfileManager.writeLockfile(result.lockfile, this.lockfilePath);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.errors.push({
        plugin: pluginName,
        error: error as Error,
      });
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Install from lockfile
   */
  async installFromLockfile(lockfilePath: string): Promise<InstallResult> {
    const startTime = Date.now();
    const result: InstallResult = {
      installed: [],
      skipped: [],
      errors: [],
      duration: 0,
    };

    try {
      // Read and validate lockfile
      const lockfile = this.lockfileManager.readLockfile(lockfilePath);
      const validation = this.lockfileManager.validateIntegrity(lockfile);

      if (!validation.valid) {
        throw new Error(`Lockfile validation failed: ${validation.errors.join(', ')}`);
      }

      // Install each plugin from lockfile
      for (const [pluginName, lock] of Object.entries(lockfile.plugins)) {
        try {
          if (this.isInstalled(pluginName, lock.version)) {
            result.skipped.push(pluginName);
            continue;
          }

          await this.installPlugin(pluginName, lock.version, lock.resolved, {});
          result.installed.push(pluginName);
        } catch (error) {
          result.errors.push({
            plugin: pluginName,
            error: error as Error,
          });
        }
      }

      result.lockfile = lockfile;
      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.errors.push({
        plugin: 'lockfile',
        error: error as Error,
      });
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginName: string): Promise<void> {
    const pluginPath = path.join(this.installDir, pluginName);

    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin ${pluginName} is not installed`);
    }

    // Remove plugin directory
    fs.rmSync(pluginPath, { recursive: true, force: true });

    // Update lockfile
    if (this.lockfileManager.lockfileExists(this.lockfilePath)) {
      const lockfile = this.lockfileManager.readLockfile(this.lockfilePath);
      const updated = this.lockfileManager.removePlugin(lockfile, pluginName);
      this.lockfileManager.writeLockfile(updated, this.lockfilePath);
    }
  }

  /**
   * Upgrade a plugin to a specific version or latest
   */
  async upgrade(pluginName: string, targetVersion?: string): Promise<InstallResult> {
    // Uninstall current version
    try {
      await this.uninstall(pluginName);
    } catch (error) {
      // Plugin might not be installed, continue
    }

    // Install new version
    return this.install(pluginName, { force: true });
  }

  /**
   * Resolve all dependencies for a plugin
   */
  private async resolveDependencies(
    manifest: PluginManifest,
    options: InstallOptions
  ): Promise<ResolvedDependencies> {
    const graph = new DependencyGraph();

    // Add root plugin
    graph.addNode(manifest.name, manifest.version);

    // Build dependency graph
    await this.buildDependencyGraph(graph, manifest, options);

    // Check for conflicts
    const conflicts = graph.getConflicts();
    if (conflicts.length > 0) {
      const resolutions = this.conflictResolver.suggestResolution(conflicts);
      // In production, this might prompt the user or auto-resolve
      console.warn('Dependency conflicts detected:', resolutions);
    }

    // Get install order
    const installOrder = graph.resolve();

    // Build resolved dependencies map
    const plugins = new Map<string, {
      version: string;
      resolved: string;
      dependencies: Record<string, string>;
    }>();

    for (const [name, node] of graph.getNodes()) {
      const deps: Record<string, string> = {};
      for (const [depName, depRange] of node.dependencies) {
        const depNode = graph.getNodes().get(depName);
        if (depNode) {
          deps[depName] = depNode.version;
        }
      }

      plugins.set(name, {
        version: node.version,
        resolved: this.getResolvedPath(name, node.version),
        dependencies: deps,
      });
    }

    return { plugins, installOrder };
  }

  /**
   * Build dependency graph recursively
   */
  private async buildDependencyGraph(
    graph: DependencyGraph,
    manifest: PluginManifest,
    options: InstallOptions,
    visited: Set<string> = new Set()
  ): Promise<void> {
    const key = `${manifest.name}@${manifest.version}`;
    if (visited.has(key)) return;
    visited.add(key);

    // Process dependencies
    const deps = options.production
      ? manifest.dependencies || {}
      : { ...manifest.dependencies, ...manifest.devDependencies };

    for (const [depName, versionRange] of Object.entries(deps || {})) {
      // Find best version
      const availableVersions = await this.getAvailableVersions(depName);
      const bestVersion = this.semverResolver.maxSatisfying(availableVersions, versionRange);

      if (!bestVersion) {
        throw new Error(
          `No version of ${depName} satisfies ${versionRange} required by ${manifest.name}`
        );
      }

      // Add to graph
      try {
        graph.addNode(depName, bestVersion);
      } catch (error) {
        // Node might already exist, that's ok
      }
      graph.addEdge(manifest.name, depName, versionRange);

      // Recursively process dependencies
      if (!options.noDeps) {
        const depManifest = await this.loadManifest(depName, bestVersion);
        await this.buildDependencyGraph(graph, depManifest, options, visited);
      }
    }
  }

  /**
   * Install a single plugin
   */
  private async installPlugin(
    name: string,
    version: string,
    resolved: string,
    options: InstallOptions
  ): Promise<void> {
    const targetPath = path.join(this.installDir, name);

    // Create install directory
    if (!fs.existsSync(this.installDir)) {
      fs.mkdirSync(this.installDir, { recursive: true });
    }

    // Remove existing installation
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    // Copy plugin files
    if (fs.existsSync(resolved)) {
      this.copyDirectory(resolved, targetPath);
    } else {
      throw new Error(`Plugin source not found: ${resolved}`);
    }

    console.log(`Installed ${name}@${version} to ${targetPath}`);
  }

  /**
   * Check if a plugin is installed
   */
  private isInstalled(name: string, version: string): boolean {
    const pluginPath = path.join(this.installDir, name);
    if (!fs.existsSync(pluginPath)) return false;

    // Check version in manifest
    const manifestPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) return false;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return manifest.version === version;
    } catch {
      return false;
    }
  }

  /**
   * Load plugin manifest
   */
  private async loadManifest(name: string, version?: string): Promise<PluginManifest> {
    // In production, this would fetch from a registry or local cache
    // For now, simulate with a mock manifest
    const mockManifest: PluginManifest = {
      name,
      version: version || '1.0.0',
      description: `Mock plugin ${name}`,
      dependencies: {},
    };

    return mockManifest;
  }

  /**
   * Get available versions for a plugin
   */
  private async getAvailableVersions(name: string): Promise<string[]> {
    // In production, this would query a registry
    // For now, return mock versions
    return ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
  }

  /**
   * Get resolved path for a plugin
   */
  private getResolvedPath(name: string, version: string): string {
    // In production, this would return a registry URL or local cache path
    return path.join(this.installDir, name);
  }

  /**
   * Copy directory recursively
   */
  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
