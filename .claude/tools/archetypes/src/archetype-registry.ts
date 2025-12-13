/**
 * Archetype Registry - Manages archetype discovery, loading, and metadata
 *
 * Provides centralized registry for all available archetypes with:
 * - Auto-discovery from archetype directories
 * - Metadata caching and validation
 * - Dependency resolution
 * - Search and filtering capabilities
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import type {
  Archetype,
  ArchetypeMetadata,
  ArchetypeSearchOptions
} from './types.js';

export class ArchetypeRegistry {
  private archetypes: Map<string, Archetype> = new Map();
  private archetypePaths: string[] = [];
  private loaded: boolean = false;

  /**
   * Create a new archetype registry
   * @param searchPaths - Directories to search for archetypes
   */
  constructor(searchPaths: string[] = []) {
    this.archetypePaths = searchPaths.map(p => resolve(p));
  }

  /**
   * Add a search path for archetypes
   */
  addSearchPath(path: string): void {
    const resolvedPath = resolve(path);
    if (!this.archetypePaths.includes(resolvedPath)) {
      this.archetypePaths.push(resolvedPath);
      this.loaded = false; // Force reload
    }
  }

  /**
   * Load all archetypes from search paths
   */
  async load(): Promise<void> {
    this.archetypes.clear();

    for (const searchPath of this.archetypePaths) {
      try {
        const entries = await readdir(searchPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const archetypePath = join(searchPath, entry.name);
            try {
              const archetype = await this.loadArchetype(archetypePath);
              this.archetypes.set(archetype.metadata.name, archetype);
            } catch (error) {
              console.warn(`Failed to load archetype from ${archetypePath}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read search path ${searchPath}:`, error);
      }
    }

    this.loaded = true;
  }

  /**
   * Load a single archetype from a directory
   */
  private async loadArchetype(archetypePath: string): Promise<Archetype> {
    // Read archetype.json metadata
    const metadataPath = join(archetypePath, 'archetype.json');
    const metadataContent = await readFile(metadataPath, 'utf-8');
    const metadata: ArchetypeMetadata = JSON.parse(metadataContent);

    // Validate metadata structure
    this.validateMetadata(metadata);

    // Read README if exists
    let readme: string | undefined;
    try {
      readme = await readFile(join(archetypePath, 'README.md'), 'utf-8');
    } catch {
      // README is optional
    }

    // Discover template files
    const templates = await this.discoverTemplates(archetypePath);

    // Check for hooks
    const hooks: Archetype['hooks'] = {};
    try {
      await stat(join(archetypePath, 'hooks', 'pre-generate.ts'));
      hooks.preGenerate = join(archetypePath, 'hooks', 'pre-generate.ts');
    } catch {
      // Hook is optional
    }

    try {
      await stat(join(archetypePath, 'hooks', 'post-generate.ts'));
      hooks.postGenerate = join(archetypePath, 'hooks', 'post-generate.ts');
    } catch {
      // Hook is optional
    }

    return {
      metadata,
      path: archetypePath,
      readme,
      templates,
      hooks: Object.keys(hooks).length > 0 ? hooks : undefined
    };
  }

  /**
   * Discover template files in archetype directory
   */
  private async discoverTemplates(archetypePath: string): Promise<string[]> {
    const templates: string[] = [];
    const templatesDir = join(archetypePath, 'templates');

    try {
      await this.walkDirectory(templatesDir, (filePath) => {
        templates.push(filePath.replace(templatesDir + '/', ''));
      });
    } catch (error) {
      throw new Error(`Failed to discover templates in ${templatesDir}: ${error}`);
    }

    return templates;
  }

  /**
   * Recursively walk a directory
   */
  private async walkDirectory(dir: string, callback: (path: string) => void): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  }

  /**
   * Validate archetype metadata
   */
  private validateMetadata(metadata: ArchetypeMetadata): void {
    const errors: string[] = [];

    if (!metadata.name || !/^[a-z][a-z0-9-]*$/.test(metadata.name)) {
      errors.push('Invalid name: must be kebab-case starting with lowercase letter');
    }

    if (!metadata.version || !/^\d+\.\d+\.\d+/.test(metadata.version)) {
      errors.push('Invalid version: must be semver format (e.g., 1.0.0)');
    }

    if (!metadata.description) {
      errors.push('Description is required');
    }

    if (!metadata.category) {
      errors.push('Category is required');
    }

    if (!metadata.variables || !Array.isArray(metadata.variables)) {
      errors.push('Variables array is required');
    }

    if (!metadata.files || !Array.isArray(metadata.files)) {
      errors.push('Files array is required');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid archetype metadata:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get archetype by name
   */
  async get(name: string): Promise<Archetype | undefined> {
    if (!this.loaded) {
      await this.load();
    }
    return this.archetypes.get(name);
  }

  /**
   * Get all archetypes
   */
  async getAll(): Promise<Archetype[]> {
    if (!this.loaded) {
      await this.load();
    }
    return Array.from(this.archetypes.values());
  }

  /**
   * Search for archetypes
   */
  async search(options: ArchetypeSearchOptions = {}): Promise<Archetype[]> {
    if (!this.loaded) {
      await this.load();
    }

    let results = Array.from(this.archetypes.values());

    // Filter by category
    if (options.category) {
      results = results.filter(a => a.metadata.category === options.category);
    }

    // Filter by keyword
    if (options.keyword) {
      const keyword = options.keyword.toLowerCase();
      results = results.filter(a =>
        a.metadata.name.toLowerCase().includes(keyword) ||
        a.metadata.description.toLowerCase().includes(keyword) ||
        a.metadata.keywords?.some(k => k.toLowerCase().includes(keyword))
      );
    }

    // Filter by name pattern
    if (options.pattern) {
      const regex = new RegExp(options.pattern);
      results = results.filter(a => regex.test(a.metadata.name));
    }

    // Sort results
    if (options.sort) {
      results.sort((a, b) => {
        switch (options.sort) {
          case 'name':
            return a.metadata.name.localeCompare(b.metadata.name);
          case 'category':
            return a.metadata.category.localeCompare(b.metadata.category);
          case 'version':
            return this.compareVersions(a.metadata.version, b.metadata.version);
          default:
            return 0;
        }
      });
    }

    return results;
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (aParts[i] > bParts[i]) return -1;
      if (aParts[i] < bParts[i]) return 1;
    }

    return 0;
  }

  /**
   * Get archetype categories
   */
  async getCategories(): Promise<string[]> {
    if (!this.loaded) {
      await this.load();
    }

    const categories = new Set<string>();
    for (const archetype of this.archetypes.values()) {
      categories.add(archetype.metadata.category);
    }

    return Array.from(categories).sort();
  }

  /**
   * Resolve archetype dependencies
   * Returns archetypes in dependency order (dependencies first)
   */
  async resolveDependencies(archetypeName: string): Promise<Archetype[]> {
    if (!this.loaded) {
      await this.load();
    }

    const archetype = this.archetypes.get(archetypeName);
    if (!archetype) {
      throw new Error(`Archetype not found: ${archetypeName}`);
    }

    const resolved: Archetype[] = [];
    const visited = new Set<string>();

    const resolve = async (name: string): Promise<void> => {
      if (visited.has(name)) {
        return;
      }

      visited.add(name);

      const arch = this.archetypes.get(name);
      if (!arch) {
        throw new Error(`Dependency not found: ${name}`);
      }

      // Resolve dependencies first
      if (arch.metadata.dependencies) {
        for (const dep of arch.metadata.dependencies) {
          await resolve(dep);
        }
      }

      resolved.push(arch);
    };

    await resolve(archetypeName);

    return resolved;
  }

  /**
   * Check for circular dependencies
   */
  async checkCircularDependencies(archetypeName: string): Promise<string[]> {
    const cycles: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string, path: string[] = []): void => {
      if (visiting.has(name)) {
        cycles.push([...path, name].join(' -> '));
        return;
      }

      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      path.push(name);

      const archetype = this.archetypes.get(name);
      if (archetype?.metadata.dependencies) {
        for (const dep of archetype.metadata.dependencies) {
          visit(dep, [...path]);
        }
      }

      visiting.delete(name);
      visited.add(name);
    };

    visit(archetypeName);

    return cycles;
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    withDependencies: number;
    withHooks: number;
  }> {
    if (!this.loaded) {
      await this.load();
    }

    const byCategory: Record<string, number> = {};
    let withDependencies = 0;
    let withHooks = 0;

    for (const archetype of this.archetypes.values()) {
      // Count by category
      byCategory[archetype.metadata.category] = (byCategory[archetype.metadata.category] || 0) + 1;

      // Count with dependencies
      if (archetype.metadata.dependencies && archetype.metadata.dependencies.length > 0) {
        withDependencies++;
      }

      // Count with hooks
      if (archetype.hooks) {
        withHooks++;
      }
    }

    return {
      total: this.archetypes.size,
      byCategory,
      withDependencies,
      withHooks
    };
  }
}

/**
 * Create a default registry with standard search paths
 */
export function createDefaultRegistry(): ArchetypeRegistry {
  const registry = new ArchetypeRegistry();

  // Determine the archetypes directory based on the tool location
  const toolDir = resolve(join(import.meta.dirname || __dirname, '..'));
  const archetypesDir = join(toolDir, 'archetypes');

  // Add default search paths
  const defaultPaths = [
    archetypesDir,
    join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'archetypes')
  ];

  for (const path of defaultPaths) {
    registry.addSearchPath(path);
  }

  return registry;
}
