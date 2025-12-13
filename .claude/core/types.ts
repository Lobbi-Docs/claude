/**
 * Type definitions for the plugin dependency resolution system
 */

/**
 * Semantic version string (e.g., "1.2.3", "^2.0.0", ">=1.0.0")
 */
export type SemverRange = string;

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;
  homepage?: string;
  repository?: {
    type: string;
    url: string;
  };
  dependencies?: Record<string, SemverRange>;
  devDependencies?: Record<string, SemverRange>;
  peerDependencies?: Record<string, SemverRange>;
  optionalDependencies?: Record<string, SemverRange>;
  provides?: {
    agents?: string;
    skills?: string;
    commands?: string;
    workflows?: string;
    hooks?: string;
    templates?: string;
    tools?: string;
  };
  minimumClaudeCodeVersion?: string;
}

/**
 * A node in the dependency graph
 */
export interface DependencyNode {
  name: string;
  version: string;
  dependencies: Map<string, SemverRange>;
  dependents: Set<string>;
  resolved: boolean;
  installedVersion?: string;
}

/**
 * Version conflict information
 */
export interface VersionConflict {
  pluginName: string;
  requestedBy: Array<{
    requester: string;
    versionRange: SemverRange;
  }>;
  availableVersions: string[];
}

/**
 * Parsed version range
 */
export interface ParsedRange {
  operator: 'exact' | '^' | '~' | '>=' | '<=' | '>' | '<' | '||' | '*';
  version?: string;
  ranges?: ParsedRange[];
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'highest' | 'lowest' | 'prompt';

/**
 * Suggested resolution for a conflict
 */
export interface Resolution {
  pluginName: string;
  recommendedVersion: string;
  reason: string;
  alternatives: string[];
}

/**
 * Plugin lock entry
 */
export interface PluginLock {
  version: string;
  resolved: string; // URL or path
  integrity: string; // SHA-256 hash
  dependencies: Record<string, string>;
}

/**
 * Complete lockfile structure
 */
export interface Lockfile {
  version: string; // lockfile format version
  plugins: Record<string, PluginLock>;
  generated: string; // ISO timestamp
}

/**
 * Resolved dependencies result
 */
export interface ResolvedDependencies {
  plugins: Map<string, {
    version: string;
    resolved: string;
    dependencies: Record<string, string>;
  }>;
  installOrder: string[];
}

/**
 * Installation options
 */
export interface InstallOptions {
  dev?: boolean;
  force?: boolean;
  noDeps?: boolean;
  lockfileOnly?: boolean;
  production?: boolean;
  registry?: string;
  cacheDir?: string;
}

/**
 * Installation result
 */
export interface InstallResult {
  installed: string[];
  skipped: string[];
  errors: Array<{
    plugin: string;
    error: Error;
  }>;
  lockfile?: Lockfile;
  duration: number; // milliseconds
}

/**
 * Validation result for lockfile integrity
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  mismatches: Array<{
    plugin: string;
    expected: string;
    actual: string;
  }>;
}

/**
 * Plugin registry entry
 */
export interface RegistryEntry {
  name: string;
  versions: string[];
  latest: string;
  metadata: PluginManifest;
  tarball?: string;
  integrity?: string;
}

/**
 * Dependency graph cycle
 */
export interface DependencyCycle {
  path: string[];
  severity: 'error' | 'warning';
}

/**
 * Installation progress event
 */
export interface InstallProgress {
  phase: 'resolving' | 'downloading' | 'installing' | 'linking' | 'complete';
  plugin?: string;
  current: number;
  total: number;
  message: string;
}

/**
 * Plugin source configuration
 */
export interface PluginSource {
  type: 'registry' | 'git' | 'file' | 'url';
  location: string;
  ref?: string; // for git sources
  subdir?: string; // for monorepos
}

/**
 * Dependency edge in the graph
 */
export interface DependencyEdge {
  from: string;
  to: string;
  versionRange: SemverRange;
  type: 'required' | 'dev' | 'peer' | 'optional';
}

/**
 * Version metadata
 */
export interface VersionMetadata {
  version: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  publishedAt?: string;
  security?: {
    vulnerabilities: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Plugin installation state
 */
export interface InstallationState {
  name: string;
  version: string;
  status: 'pending' | 'downloading' | 'installing' | 'complete' | 'failed';
  error?: Error;
  startTime: number;
  endTime?: number;
}
