/**
 * Claude Code Plugin Manager
 *
 * Utilities for managing Claude Code plugins including installation,
 * uninstallation, listing, and updates.
 *
 * @module plugin-manager
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  keywords?: string[];
  categories?: string[];
  repository?: {
    type: string;
    url: string;
  };
  commands?: Record<string, CommandDefinition>;
  agents?: Record<string, AgentDefinition>;
  skills?: Record<string, SkillDefinition>;
  hooks?: Record<string, HookDefinition>;
  dependencies?: Record<string, string>;
  configuration?: {
    localConfig?: string;
    requiredEnvVars?: string[];
    optionalEnvVars?: string[];
  };
  resources?: Record<string, any>;
  preInstall?: HookScript;
  postInstall?: HookScript;
  preUninstall?: HookScript;
  postUninstall?: HookScript;
  preUpdate?: HookScript;
  postUpdate?: HookScript;
}

export interface CommandDefinition {
  description: string;
  handler: string;
  argumentHint?: string;
  allowedTools?: string[];
}

export interface AgentDefinition {
  description: string;
  model: 'opus' | 'sonnet' | 'haiku';
  handler: string;
  keywords?: string[];
  capabilities?: string[];
}

export interface SkillDefinition {
  description: string;
  handler: string;
}

export interface HookDefinition {
  description: string;
  event: 'PreToolUse' | 'PostToolUse' | 'PreCommand' | 'PostCommand';
  toolPattern?: string;
  filePattern?: string;
  handler: string;
}

export interface HookScript {
  script: string;
  description?: string;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  path: string;
  source: 'registry' | 'git' | 'local';
  installedAt: string;
  dependencies: Record<string, string>;
  provides: {
    commands: number;
    agents: number;
    skills: number;
    hooks: number;
  };
  status: 'active' | 'broken' | 'outdated';
  updateAvailable?: string;
  isDev?: boolean;
}

export interface PluginRegistry {
  version: string;
  description: string;
  installed: Record<string, PluginInstallInfo>;
  registry: Record<string, PluginRegistryEntry>;
  stats: {
    totalInstalled: number;
    totalAvailable: number;
    lastUpdated: string;
  };
}

export interface PluginInstallInfo {
  version: string;
  path: string;
  source: 'registry' | 'git' | 'local';
  installedAt: string;
  dependencies: Record<string, string>;
}

export interface PluginRegistryEntry {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository: string;
  keywords: string[];
  categories: string[];
  dependencies: Record<string, string>;
  provides: {
    commands: number;
    agents: number;
    skills: number;
    hooks: number;
  };
}

// ============================================================================
// Plugin Manager Class
// ============================================================================

export class PluginManager {
  private claudeRoot: string;
  private pluginsDir: string;
  private registryPath: string;

  constructor(claudeRoot?: string) {
    this.claudeRoot = claudeRoot || path.join(process.cwd(), '.claude');
    this.pluginsDir = path.join(process.cwd(), '.claude-plugins');
    this.registryPath = path.join(this.claudeRoot, 'registry', 'plugins.index.json');
  }

  // ==========================================================================
  // Plugin Discovery
  // ==========================================================================

  /**
   * Get all installed plugins
   */
  getInstalledPlugins(): PluginInfo[] {
    const registry = this.loadRegistry();
    const plugins: PluginInfo[] = [];

    for (const [name, installInfo] of Object.entries(registry.installed)) {
      const pluginPath = path.resolve(installInfo.path);
      const manifest = this.loadPluginManifest(pluginPath);

      if (!manifest) {
        plugins.push({
          name,
          version: installInfo.version,
          description: 'Error: Cannot load plugin manifest',
          path: pluginPath,
          source: installInfo.source,
          installedAt: installInfo.installedAt,
          dependencies: installInfo.dependencies,
          provides: { commands: 0, agents: 0, skills: 0, hooks: 0 },
          status: 'broken',
        });
        continue;
      }

      const provides = this.countProvides(pluginPath, manifest);
      const updateAvailable = this.checkUpdateAvailable(name, installInfo.version, registry);
      const isDev = this.isSymlink(pluginPath);

      plugins.push({
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        license: manifest.license,
        path: pluginPath,
        source: installInfo.source,
        installedAt: installInfo.installedAt,
        dependencies: manifest.dependencies || {},
        provides,
        status: updateAvailable ? 'outdated' : 'active',
        updateAvailable,
        isDev,
      });
    }

    return plugins;
  }

  /**
   * Get information about a specific plugin
   */
  getPluginInfo(name: string): PluginInfo | null {
    const plugins = this.getInstalledPlugins();
    return plugins.find(p => p.name === name) || null;
  }

  /**
   * Check if a plugin is installed
   */
  isPluginInstalled(name: string): boolean {
    const registry = this.loadRegistry();
    return name in registry.installed;
  }

  /**
   * Get the path to an installed plugin
   */
  getPluginPath(name: string): string | null {
    const registry = this.loadRegistry();
    const installInfo = registry.installed[name];
    return installInfo ? path.resolve(installInfo.path) : null;
  }

  // ==========================================================================
  // Plugin Registration
  // ==========================================================================

  /**
   * Register a newly installed plugin
   */
  registerPlugin(pluginPath: string, source: 'registry' | 'git' | 'local'): void {
    const manifest = this.loadPluginManifest(pluginPath);
    if (!manifest) {
      throw new Error(`Cannot load plugin manifest from ${pluginPath}`);
    }

    const registry = this.loadRegistry();

    registry.installed[manifest.name] = {
      version: manifest.version,
      path: pluginPath,
      source,
      installedAt: new Date().toISOString(),
      dependencies: manifest.dependencies || {},
    };

    registry.stats.totalInstalled = Object.keys(registry.installed).length;
    registry.stats.lastUpdated = new Date().toISOString();

    this.saveRegistry(registry);
    this.updateSubRegistries(manifest, pluginPath);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(name: string): void {
    const registry = this.loadRegistry();

    if (!(name in registry.installed)) {
      throw new Error(`Plugin '${name}' is not installed`);
    }

    const pluginPath = path.resolve(registry.installed[name].path);
    const manifest = this.loadPluginManifest(pluginPath);

    delete registry.installed[name];
    registry.stats.totalInstalled = Object.keys(registry.installed).length;
    registry.stats.lastUpdated = new Date().toISOString();

    this.saveRegistry(registry);

    if (manifest) {
      this.removeFromSubRegistries(manifest, pluginPath);
    }
  }

  // ==========================================================================
  // Registry Management
  // ==========================================================================

  /**
   * Load the plugin registry
   */
  private loadRegistry(): PluginRegistry {
    if (!fs.existsSync(this.registryPath)) {
      return {
        version: '1.0.0',
        description: 'Claude Code Plugin Registry',
        installed: {},
        registry: {},
        stats: {
          totalInstalled: 0,
          totalAvailable: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    const content = fs.readFileSync(this.registryPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save the plugin registry
   */
  private saveRegistry(registry: PluginRegistry): void {
    const registryDir = path.dirname(this.registryPath);
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }

    fs.writeFileSync(
      this.registryPath,
      JSON.stringify(registry, null, 2),
      'utf-8'
    );
  }

  /**
   * Update sub-registries (commands, agents, skills) with plugin resources
   */
  private updateSubRegistries(manifest: PluginManifest, pluginPath: string): void {
    // Update commands registry
    if (manifest.commands) {
      const commandsRegistry = this.loadSubRegistry('commands.index.json');
      for (const [cmdName, cmdDef] of Object.entries(manifest.commands)) {
        commandsRegistry[cmdName] = {
          description: cmdDef.description,
          handler: path.join(pluginPath, cmdDef.handler),
          plugin: manifest.name,
        };
      }
      this.saveSubRegistry('commands.index.json', commandsRegistry);
    }

    // Update agents registry
    if (manifest.agents) {
      const agentsRegistry = this.loadSubRegistry('agents.index.json');
      for (const [agentName, agentDef] of Object.entries(manifest.agents)) {
        agentsRegistry[agentName] = {
          description: agentDef.description,
          model: agentDef.model,
          handler: path.join(pluginPath, agentDef.handler),
          plugin: manifest.name,
          keywords: agentDef.keywords || [],
          capabilities: agentDef.capabilities || [],
        };
      }
      this.saveSubRegistry('agents.index.json', agentsRegistry);
    }

    // Update skills registry
    if (manifest.skills) {
      const skillsRegistry = this.loadSubRegistry('skills.index.json');
      for (const [skillName, skillDef] of Object.entries(manifest.skills)) {
        skillsRegistry[skillName] = {
          description: skillDef.description,
          handler: path.join(pluginPath, skillDef.handler),
          plugin: manifest.name,
        };
      }
      this.saveSubRegistry('skills.index.json', skillsRegistry);
    }
  }

  /**
   * Remove plugin resources from sub-registries
   */
  private removeFromSubRegistries(manifest: PluginManifest, pluginPath: string): void {
    // Remove commands
    if (manifest.commands) {
      const commandsRegistry = this.loadSubRegistry('commands.index.json');
      for (const cmdName of Object.keys(manifest.commands)) {
        delete commandsRegistry[cmdName];
      }
      this.saveSubRegistry('commands.index.json', commandsRegistry);
    }

    // Remove agents
    if (manifest.agents) {
      const agentsRegistry = this.loadSubRegistry('agents.index.json');
      for (const agentName of Object.keys(manifest.agents)) {
        delete agentsRegistry[agentName];
      }
      this.saveSubRegistry('agents.index.json', agentsRegistry);
    }

    // Remove skills
    if (manifest.skills) {
      const skillsRegistry = this.loadSubRegistry('skills.index.json');
      for (const skillName of Object.keys(manifest.skills)) {
        delete skillsRegistry[skillName];
      }
      this.saveSubRegistry('skills.index.json', skillsRegistry);
    }
  }

  /**
   * Load a sub-registry file
   */
  private loadSubRegistry(filename: string): Record<string, any> {
    const filePath = path.join(this.claudeRoot, 'registry', filename);
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save a sub-registry file
   */
  private saveSubRegistry(filename: string, data: Record<string, any>): void {
    const filePath = path.join(this.claudeRoot, 'registry', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ==========================================================================
  // Plugin Validation
  // ==========================================================================

  /**
   * Load plugin manifest (plugin.json)
   */
  loadPluginManifest(pluginPath: string): PluginManifest | null {
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading manifest from ${manifestPath}:`, error);
      return null;
    }
  }

  /**
   * Count what a plugin provides
   */
  private countProvides(pluginPath: string, manifest: PluginManifest): PluginInfo['provides'] {
    return {
      commands: Object.keys(manifest.commands || {}).length,
      agents: Object.keys(manifest.agents || {}).length,
      skills: Object.keys(manifest.skills || {}).length,
      hooks: Object.keys(manifest.hooks || {}).length,
    };
  }

  /**
   * Check if an update is available
   */
  private checkUpdateAvailable(
    name: string,
    currentVersion: string,
    registry: PluginRegistry
  ): string | undefined {
    const registryEntry = registry.registry[name];
    if (!registryEntry) return undefined;

    if (registryEntry.version !== currentVersion) {
      return registryEntry.version;
    }

    return undefined;
  }

  /**
   * Check if a path is a symlink
   */
  private isSymlink(pluginPath: string): boolean {
    try {
      const stats = fs.lstatSync(pluginPath);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get all available plugins from registry
   */
  getAvailablePlugins(): PluginRegistryEntry[] {
    const registry = this.loadRegistry();
    return Object.values(registry.registry);
  }

  /**
   * Search plugins by keyword
   */
  searchPlugins(query: string): PluginRegistryEntry[] {
    const available = this.getAvailablePlugins();
    const lowerQuery = query.toLowerCase();

    return available.filter(plugin => {
      return (
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.description.toLowerCase().includes(lowerQuery) ||
        plugin.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
        plugin.categories.some(c => c.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    const registry = this.loadRegistry();
    const installed = this.getInstalledPlugins();

    return {
      totalInstalled: registry.stats.totalInstalled,
      totalAvailable: registry.stats.totalAvailable,
      active: installed.filter(p => p.status === 'active').length,
      outdated: installed.filter(p => p.status === 'outdated').length,
      broken: installed.filter(p => p.status === 'broken').length,
      totalCommands: installed.reduce((sum, p) => sum + p.provides.commands, 0),
      totalAgents: installed.reduce((sum, p) => sum + p.provides.agents, 0),
      totalSkills: installed.reduce((sum, p) => sum + p.provides.skills, 0),
      totalHooks: installed.reduce((sum, p) => sum + p.provides.hooks, 0),
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default PluginManager;
