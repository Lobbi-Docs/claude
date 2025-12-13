/**
 * Dependency resolution system for Claude Code plugins
 *
 * Implements npm/pnpm-style dependency resolution with:
 * - Topological sorting for install order
 * - Cycle detection
 * - Semantic versioning
 * - Conflict resolution
 */

import {
  DependencyNode,
  DependencyEdge,
  VersionConflict,
  ParsedRange,
  SemverRange,
  Resolution,
  ConflictStrategy,
  DependencyCycle,
} from './types.js';

/**
 * Dependency graph for resolving plugin dependencies
 */
export class DependencyGraph {
  private nodes: Map<string, DependencyNode>;
  private edges: DependencyEdge[];

  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  /**
   * Add a node to the dependency graph
   */
  addNode(pluginName: string, version: string): void {
    if (this.nodes.has(pluginName)) {
      const existing = this.nodes.get(pluginName)!;
      if (existing.version !== version) {
        throw new Error(
          `Plugin ${pluginName} already added with version ${existing.version}, cannot add version ${version}`
        );
      }
      return;
    }

    this.nodes.set(pluginName, {
      name: pluginName,
      version,
      dependencies: new Map(),
      dependents: new Set(),
      resolved: false,
    });
  }

  /**
   * Add a dependency edge between two plugins
   */
  addEdge(
    from: string,
    to: string,
    versionRange: SemverRange,
    type: 'required' | 'dev' | 'peer' | 'optional' = 'required'
  ): void {
    const fromNode = this.nodes.get(from);
    if (!fromNode) {
      throw new Error(`Plugin ${from} not found in graph`);
    }

    fromNode.dependencies.set(to, versionRange);

    // Add to dependents if target node exists
    const toNode = this.nodes.get(to);
    if (toNode) {
      toNode.dependents.add(from);
    }

    this.edges.push({ from, to, versionRange, type });
  }

  /**
   * Resolve dependencies and return topologically sorted install order
   */
  resolve(): string[] {
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      const cycleStr = cycles.map(c => c.path.join(' -> ')).join(', ');
      throw new Error(`Circular dependencies detected: ${cycleStr}`);
    }

    return this.topologicalSort();
  }

  /**
   * Detect circular dependencies
   */
  detectCycles(): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const nodeData = this.nodes.get(node);
      if (nodeData) {
        for (const [dep] of nodeData.dependencies) {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (recursionStack.has(dep)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep);
            const cyclePath = [...path.slice(cycleStart), dep];
            cycles.push({
              path: cyclePath,
              severity: 'error',
            });
          }
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const [nodeName] of this.nodes) {
      if (!visited.has(nodeName)) {
        dfs(nodeName);
      }
    }

    return cycles;
  }

  /**
   * Get version conflicts
   */
  getConflicts(): VersionConflict[] {
    const conflicts: VersionConflict[] = [];
    const pluginRequests = new Map<string, Array<{ requester: string; versionRange: string }>>();

    // Collect all version requirements for each plugin
    for (const [nodeName, node] of this.nodes) {
      for (const [dep, versionRange] of node.dependencies) {
        if (!pluginRequests.has(dep)) {
          pluginRequests.set(dep, []);
        }
        pluginRequests.get(dep)!.push({
          requester: nodeName,
          versionRange,
        });
      }
    }

    // Check for conflicts
    for (const [pluginName, requests] of pluginRequests) {
      if (requests.length > 1) {
        // Multiple different version requirements
        const uniqueRanges = new Set(requests.map(r => r.versionRange));
        if (uniqueRanges.size > 1) {
          const node = this.nodes.get(pluginName);
          conflicts.push({
            pluginName,
            requestedBy: requests,
            availableVersions: node ? [node.version] : [],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Perform topological sort
   */
  private topologicalSort(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: string): void => {
      if (visited.has(node)) return;
      if (visiting.has(node)) {
        throw new Error(`Circular dependency involving ${node}`);
      }

      visiting.add(node);

      const nodeData = this.nodes.get(node);
      if (nodeData) {
        for (const [dep] of nodeData.dependencies) {
          if (this.nodes.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const [nodeName] of this.nodes) {
      visit(nodeName);
    }

    return result;
  }

  /**
   * Get all nodes
   */
  getNodes(): Map<string, DependencyNode> {
    return this.nodes;
  }

  /**
   * Get all edges
   */
  getEdges(): DependencyEdge[] {
    return this.edges;
  }
}

/**
 * Semantic versioning resolver
 */
export class SemverResolver {
  /**
   * Check if a version satisfies a range
   */
  satisfies(version: string, range: SemverRange): boolean {
    const parsedRange = this.parseRange(range);
    return this.evaluateRange(version, parsedRange);
  }

  /**
   * Find the maximum version that satisfies a range
   */
  maxSatisfying(versions: string[], range: SemverRange): string | null {
    const satisfying = versions.filter(v => this.satisfies(v, range));
    if (satisfying.length === 0) return null;

    return satisfying.sort((a, b) => this.compareVersions(b, a))[0];
  }

  /**
   * Parse a version range string
   */
  parseRange(range: SemverRange): ParsedRange {
    // Handle wildcard
    if (range === '*' || range === '') {
      return { operator: '*' };
    }

    // Handle OR operator (||)
    if (range.includes('||')) {
      const parts = range.split('||').map(r => this.parseRange(r.trim()));
      return { operator: '||', ranges: parts };
    }

    // Handle caret (^)
    if (range.startsWith('^')) {
      return { operator: '^', version: range.slice(1) };
    }

    // Handle tilde (~)
    if (range.startsWith('~')) {
      return { operator: '~', version: range.slice(1) };
    }

    // Handle comparison operators
    const comparisonMatch = range.match(/^(>=|<=|>|<)(.+)$/);
    if (comparisonMatch) {
      return {
        operator: comparisonMatch[1] as ParsedRange['operator'],
        version: comparisonMatch[2].trim(),
      };
    }

    // Exact version
    return { operator: 'exact', version: range };
  }

  /**
   * Evaluate if a version satisfies a parsed range
   */
  private evaluateRange(version: string, range: ParsedRange): boolean {
    switch (range.operator) {
      case '*':
        return true;

      case 'exact':
        return version === range.version;

      case '^':
        return this.satisfiesCaret(version, range.version!);

      case '~':
        return this.satisfiesTilde(version, range.version!);

      case '>=':
        return this.compareVersions(version, range.version!) >= 0;

      case '<=':
        return this.compareVersions(version, range.version!) <= 0;

      case '>':
        return this.compareVersions(version, range.version!) > 0;

      case '<':
        return this.compareVersions(version, range.version!) < 0;

      case '||':
        return range.ranges!.some(r => this.evaluateRange(version, r));

      default:
        return false;
    }
  }

  /**
   * Check if version satisfies caret range (^)
   * ^1.2.3 := >=1.2.3 <2.0.0
   * ^0.2.3 := >=0.2.3 <0.3.0
   * ^0.0.3 := >=0.0.3 <0.0.4
   */
  private satisfiesCaret(version: string, rangeVersion: string): boolean {
    const [vMajor, vMinor, vPatch] = this.parseVersion(version);
    const [rMajor, rMinor, rPatch] = this.parseVersion(rangeVersion);

    // Must be >= the range version
    if (this.compareVersions(version, rangeVersion) < 0) {
      return false;
    }

    // If major version is not 0, allow changes that don't modify left-most non-zero digit
    if (rMajor !== 0) {
      return vMajor === rMajor;
    }

    // If major is 0 but minor is not, allow patch changes
    if (rMinor !== 0) {
      return vMajor === rMajor && vMinor === rMinor;
    }

    // If both major and minor are 0, only allow exact match
    return vMajor === rMajor && vMinor === rMinor && vPatch === rPatch;
  }

  /**
   * Check if version satisfies tilde range (~)
   * ~1.2.3 := >=1.2.3 <1.3.0
   */
  private satisfiesTilde(version: string, rangeVersion: string): boolean {
    const [vMajor, vMinor, vPatch] = this.parseVersion(version);
    const [rMajor, rMinor] = this.parseVersion(rangeVersion);

    // Must be >= the range version
    if (this.compareVersions(version, rangeVersion) < 0) {
      return false;
    }

    // Major and minor must match
    return vMajor === rMajor && vMinor === rMinor;
  }

  /**
   * Compare two version strings
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const [aMajor, aMinor, aPatch] = this.parseVersion(a);
    const [bMajor, bMinor, bPatch] = this.parseVersion(b);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }

  /**
   * Parse version string into [major, minor, patch]
   */
  private parseVersion(version: string): [number, number, number] {
    const parts = version.split('.').map(p => parseInt(p, 10));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }
}

/**
 * Conflict resolution for version conflicts
 */
export class ConflictResolver {
  private semverResolver: SemverResolver;

  constructor() {
    this.semverResolver = new SemverResolver();
  }

  /**
   * Resolve a single version conflict
   */
  resolveConflict(conflict: VersionConflict, strategy: ConflictStrategy = 'highest'): string {
    const { availableVersions } = conflict;

    if (availableVersions.length === 0) {
      throw new Error(`No available versions for ${conflict.pluginName}`);
    }

    if (availableVersions.length === 1) {
      return availableVersions[0];
    }

    switch (strategy) {
      case 'highest':
        return this.selectHighestVersion(conflict);

      case 'lowest':
        return this.selectLowestVersion(conflict);

      case 'prompt':
        throw new Error('Prompt strategy requires user interaction');

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Suggest resolutions for multiple conflicts
   */
  suggestResolution(conflicts: VersionConflict[]): Resolution[] {
    return conflicts.map(conflict => {
      const recommended = this.resolveConflict(conflict, 'highest');
      const alternatives = conflict.availableVersions.filter(v => v !== recommended);

      const requestersStr = conflict.requestedBy
        .map(r => `${r.requester} (${r.versionRange})`)
        .join(', ');

      return {
        pluginName: conflict.pluginName,
        recommendedVersion: recommended,
        reason: `Highest version satisfying requirements from: ${requestersStr}`,
        alternatives,
      };
    });
  }

  /**
   * Select highest version that satisfies all requirements
   */
  private selectHighestVersion(conflict: VersionConflict): string {
    const { availableVersions, requestedBy } = conflict;

    // Find versions that satisfy all requirements
    const satisfying = availableVersions.filter(version =>
      requestedBy.every(req => this.semverResolver.satisfies(version, req.versionRange))
    );

    if (satisfying.length === 0) {
      throw new Error(
        `No version of ${conflict.pluginName} satisfies all requirements: ${
          requestedBy.map(r => `${r.requester}@${r.versionRange}`).join(', ')
        }`
      );
    }

    // Sort and return highest
    return satisfying.sort((a, b) => this.compareVersions(b, a))[0];
  }

  /**
   * Select lowest version that satisfies all requirements
   */
  private selectLowestVersion(conflict: VersionConflict): string {
    const { availableVersions, requestedBy } = conflict;

    // Find versions that satisfy all requirements
    const satisfying = availableVersions.filter(version =>
      requestedBy.every(req => this.semverResolver.satisfies(version, req.versionRange))
    );

    if (satisfying.length === 0) {
      throw new Error(
        `No version of ${conflict.pluginName} satisfies all requirements`
      );
    }

    // Sort and return lowest
    return satisfying.sort((a, b) => this.compareVersions(a, b))[0];
  }

  /**
   * Compare versions (helper)
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(n => parseInt(n, 10));
    const bParts = b.split('.').map(n => parseInt(n, 10));

    for (let i = 0; i < 3; i++) {
      const aNum = aParts[i] || 0;
      const bNum = bParts[i] || 0;
      if (aNum !== bNum) return aNum - bNum;
    }

    return 0;
  }
}
