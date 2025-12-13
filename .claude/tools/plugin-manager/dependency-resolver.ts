/**
 * Claude Code Plugin Dependency Resolver
 *
 * Resolves plugin dependencies, checks version compatibility,
 * and builds dependency graphs to prevent conflicts.
 *
 * @module dependency-resolver
 */

import { PluginManifest } from './index';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DependencyNode {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  resolved?: string;
  source?: 'installed' | 'registry';
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>;
}

export interface ResolutionResult {
  success: boolean;
  resolved: Map<string, string>;
  errors: ResolutionError[];
  warnings: ResolutionWarning[];
  installOrder: string[];
}

export interface ResolutionError {
  code: string;
  message: string;
  plugin?: string;
  dependency?: string;
}

export interface ResolutionWarning {
  code: string;
  message: string;
  plugin?: string;
  dependency?: string;
}

export interface VersionConstraint {
  type: 'exact' | 'caret' | 'tilde' | 'range' | 'any';
  major?: number;
  minor?: number;
  patch?: number;
  raw: string;
}

// ============================================================================
// Dependency Resolver Class
// ============================================================================

export class DependencyResolver {
  private installedPlugins: Map<string, DependencyNode>;
  private registryPlugins: Map<string, DependencyNode>;

  constructor(
    installedPlugins: Map<string, DependencyNode> = new Map(),
    registryPlugins: Map<string, DependencyNode> = new Map()
  ) {
    this.installedPlugins = installedPlugins;
    this.registryPlugins = registryPlugins;
  }

  // ==========================================================================
  // Dependency Resolution
  // ==========================================================================

  /**
   * Resolve dependencies for a plugin
   */
  resolveDependencies(
    pluginName: string,
    dependencies: Record<string, string>
  ): ResolutionResult {
    const errors: ResolutionError[] = [];
    const warnings: ResolutionWarning[] = [];
    const resolved = new Map<string, string>();

    // Build dependency graph
    const graph = this.buildDependencyGraph(pluginName, dependencies);

    // Check for circular dependencies
    const circularResult = this.detectCircularDependencies(graph);
    if (circularResult.length > 0) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected: ${circularResult.join(' -> ')}`,
        plugin: pluginName,
      });
      return { success: false, resolved, errors, warnings, installOrder: [] };
    }

    // Resolve each dependency
    for (const [depName, versionConstraint] of Object.entries(dependencies)) {
      const result = this.resolveSingleDependency(depName, versionConstraint);

      if (!result.success) {
        errors.push({
          code: 'DEPENDENCY_NOT_FOUND',
          message: `Cannot resolve dependency '${depName}' with constraint '${versionConstraint}'`,
          plugin: pluginName,
          dependency: depName,
        });
        continue;
      }

      if (result.version) {
        resolved.set(depName, result.version);

        // Check for version conflicts
        const conflicts = this.checkVersionConflicts(depName, result.version);
        if (conflicts.length > 0) {
          warnings.push({
            code: 'VERSION_CONFLICT',
            message: `Version conflict for '${depName}': ${conflicts.join(', ')}`,
            plugin: pluginName,
            dependency: depName,
          });
        }
      }
    }

    // Get installation order (topological sort)
    const installOrder = this.getInstallOrder(graph);

    return {
      success: errors.length === 0,
      resolved,
      errors,
      warnings,
      installOrder,
    };
  }

  /**
   * Resolve a single dependency
   */
  private resolveSingleDependency(
    name: string,
    constraint: string
  ): { success: boolean; version?: string; source?: 'installed' | 'registry' } {
    // Check if already installed
    const installed = this.installedPlugins.get(name);
    if (installed && this.satisfiesConstraint(installed.version, constraint)) {
      return { success: true, version: installed.version, source: 'installed' };
    }

    // Check registry
    const registry = this.registryPlugins.get(name);
    if (registry && this.satisfiesConstraint(registry.version, constraint)) {
      return { success: true, version: registry.version, source: 'registry' };
    }

    return { success: false };
  }

  // ==========================================================================
  // Dependency Graph
  // ==========================================================================

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(
    rootName: string,
    rootDependencies: Record<string, string>
  ): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const edges = new Map<string, Set<string>>();

    const visited = new Set<string>();

    const visit = (name: string, deps: Record<string, string>) => {
      if (visited.has(name)) return;
      visited.add(name);

      // Get plugin info
      const installed = this.installedPlugins.get(name);
      const registry = this.registryPlugins.get(name);
      const plugin = installed || registry;

      if (plugin) {
        nodes.set(name, plugin);

        // Add edges for dependencies
        const depNames = Object.keys(deps);
        edges.set(name, new Set(depNames));

        // Recursively visit dependencies
        for (const [depName, constraint] of Object.entries(deps)) {
          const depPlugin = this.installedPlugins.get(depName) || this.registryPlugins.get(depName);
          if (depPlugin) {
            visit(depName, depPlugin.dependencies);
          }
        }
      }
    };

    visit(rootName, rootDependencies);

    return { nodes, edges };
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const edges = graph.edges.get(node) || new Set();
      for (const neighbor of edges) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          // Circular dependency found
          path.push(neighbor);
          return true;
        }
      }

      path.pop();
      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.nodes.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return path;
        }
      }
    }

    return [];
  }

  /**
   * Get installation order using topological sort
   */
  private getInstallOrder(graph: DependencyGraph): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const order: string[] = [];

    // Calculate in-degrees
    for (const node of graph.nodes.keys()) {
      inDegree.set(node, 0);
    }

    for (const [node, edges] of graph.edges.entries()) {
      for (const neighbor of edges) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // Find nodes with in-degree 0
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      const edges = graph.edges.get(node) || new Set();
      for (const neighbor of edges) {
        const degree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, degree);

        if (degree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return order;
  }

  // ==========================================================================
  // Version Checking
  // ==========================================================================

  /**
   * Check if a version satisfies a constraint
   */
  satisfiesConstraint(version: string, constraint: string): boolean {
    const parsedConstraint = this.parseVersionConstraint(constraint);
    const parsedVersion = this.parseVersion(version);

    if (!parsedConstraint || !parsedVersion) {
      return false;
    }

    switch (parsedConstraint.type) {
      case 'exact':
        return version === constraint;

      case 'caret': // ^1.2.3 allows 1.x.x
        return (
          parsedVersion.major === parsedConstraint.major &&
          (parsedVersion.minor > parsedConstraint.minor! ||
            (parsedVersion.minor === parsedConstraint.minor! &&
              parsedVersion.patch >= parsedConstraint.patch!))
        );

      case 'tilde': // ~1.2.3 allows 1.2.x
        return (
          parsedVersion.major === parsedConstraint.major &&
          parsedVersion.minor === parsedConstraint.minor &&
          parsedVersion.patch >= parsedConstraint.patch!
        );

      case 'any':
        return true;

      default:
        return false;
    }
  }

  /**
   * Parse version constraint
   */
  private parseVersionConstraint(constraint: string): VersionConstraint | null {
    constraint = constraint.trim();

    // Any version
    if (constraint === '*' || constraint === 'latest') {
      return { type: 'any', raw: constraint };
    }

    // Caret (^1.2.3)
    if (constraint.startsWith('^')) {
      const version = this.parseVersion(constraint.slice(1));
      return version
        ? { type: 'caret', ...version, raw: constraint }
        : null;
    }

    // Tilde (~1.2.3)
    if (constraint.startsWith('~')) {
      const version = this.parseVersion(constraint.slice(1));
      return version
        ? { type: 'tilde', ...version, raw: constraint }
        : null;
    }

    // Exact version
    const version = this.parseVersion(constraint);
    return version
      ? { type: 'exact', ...version, raw: constraint }
      : null;
  }

  /**
   * Parse semantic version
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  /**
   * Check for version conflicts
   */
  private checkVersionConflicts(name: string, version: string): string[] {
    const conflicts: string[] = [];

    // Check if another plugin requires a different version
    for (const [pluginName, plugin] of this.installedPlugins.entries()) {
      const requiredVersion = plugin.dependencies[name];
      if (requiredVersion && !this.satisfiesConstraint(version, requiredVersion)) {
        conflicts.push(`${pluginName} requires ${name}@${requiredVersion}`);
      }
    }

    return conflicts;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get all dependencies (including transitive)
   */
  getAllDependencies(pluginName: string, dependencies: Record<string, string>): Set<string> {
    const allDeps = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string, deps: Record<string, string>) => {
      if (visited.has(name)) return;
      visited.add(name);

      for (const depName of Object.keys(deps)) {
        allDeps.add(depName);

        const depPlugin = this.installedPlugins.get(depName) || this.registryPlugins.get(depName);
        if (depPlugin) {
          visit(depName, depPlugin.dependencies);
        }
      }
    };

    visit(pluginName, dependencies);
    return allDeps;
  }

  /**
   * Find plugins that depend on a given plugin
   */
  findDependents(pluginName: string): string[] {
    const dependents: string[] = [];

    for (const [name, plugin] of this.installedPlugins.entries()) {
      if (pluginName in plugin.dependencies) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * Compare two versions
   */
  compareVersions(a: string, b: string): -1 | 0 | 1 {
    const versionA = this.parseVersion(a);
    const versionB = this.parseVersion(b);

    if (!versionA || !versionB) return 0;

    if (versionA.major !== versionB.major) {
      return versionA.major > versionB.major ? 1 : -1;
    }

    if (versionA.minor !== versionB.minor) {
      return versionA.minor > versionB.minor ? 1 : -1;
    }

    if (versionA.patch !== versionB.patch) {
      return versionA.patch > versionB.patch ? 1 : -1;
    }

    return 0;
  }

  /**
   * Get latest version that satisfies constraint
   */
  getLatestVersion(versions: string[], constraint: string): string | null {
    const satisfying = versions.filter(v => this.satisfiesConstraint(v, constraint));

    if (satisfying.length === 0) return null;

    return satisfying.reduce((latest, current) => {
      return this.compareVersions(current, latest) > 0 ? current : latest;
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export default DependencyResolver;
