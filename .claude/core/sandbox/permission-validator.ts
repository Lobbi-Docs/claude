/**
 * Permission Validator
 * Validates and enforces plugin permissions
 */

import {
  PermissionSet,
  SecurityPolicy,
  ValidationResult,
  PluginManifest,
  AuditLogEntry,
} from './types.js';
import { DEFAULT_POLICY } from './security-policy.js';

/**
 * Validates plugin permissions against security policies
 */
export class PermissionValidator {
  private auditLog: AuditLogEntry[] = [];
  private policy: SecurityPolicy;

  constructor(policy: SecurityPolicy = DEFAULT_POLICY) {
    this.policy = policy;
  }

  /**
   * Parse permissions from plugin manifest
   */
  parsePermissions(manifest: PluginManifest): PermissionSet {
    const permissions: PermissionSet = {
      filesystem: [],
      network: [],
      tools: [],
      mcpServers: [],
    };

    if (!manifest.permissions) {
      return permissions;
    }

    // Parse filesystem permissions
    if (manifest.permissions.filesystem) {
      permissions.filesystem = manifest.permissions.filesystem.map((perm) => ({
        path: perm.path,
        access: perm.access as 'read' | 'write' | 'readwrite',
      }));
    }

    // Parse network permissions
    if (manifest.permissions.network) {
      permissions.network = manifest.permissions.network.map((perm) => ({
        host: perm.host,
        ports: perm.ports,
        protocols: perm.protocols as ('http' | 'https' | 'ws' | 'wss')[],
      }));
    }

    // Parse tool permissions
    if (manifest.permissions.tools) {
      permissions.tools = manifest.permissions.tools;
    }

    // Parse MCP server permissions
    if (manifest.permissions.mcpServers) {
      permissions.mcpServers = manifest.permissions.mcpServers;
    }

    return permissions;
  }

  /**
   * Validate permissions against security policy
   */
  validateAgainstPolicy(
    requested: PermissionSet,
    policy: SecurityPolicy = this.policy
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const approved: PermissionSet = {
      filesystem: [],
      network: [],
      tools: [],
      mcpServers: [],
    };
    const denied: Partial<PermissionSet> = {
      filesystem: [],
      network: [],
      tools: [],
      mcpServers: [],
    };

    // Validate filesystem permissions
    if (requested.filesystem.length > policy.maxPermissions.filesystem) {
      errors.push(
        `Too many filesystem permissions: ${requested.filesystem.length} requested, max ${policy.maxPermissions.filesystem} allowed`
      );
    }

    for (const perm of requested.filesystem) {
      if (this.isPathSafe(perm.path)) {
        approved.filesystem.push(perm);
      } else {
        denied.filesystem!.push(perm);
        errors.push(`Unsafe filesystem path: ${perm.path}`);
      }
    }

    // Validate network permissions
    if (requested.network.length > policy.maxPermissions.network) {
      errors.push(
        `Too many network permissions: ${requested.network.length} requested, max ${policy.maxPermissions.network} allowed`
      );
    }

    for (const perm of requested.network) {
      if (this.isHostSafe(perm.host, policy)) {
        approved.network.push(perm);
      } else {
        denied.network!.push(perm);
        if (this.isTrustedDomain(perm.host, policy)) {
          warnings.push(`Network access to ${perm.host} requires user approval`);
        } else {
          errors.push(`Unsafe network host: ${perm.host}`);
        }
      }
    }

    // Validate tool permissions
    if (requested.tools.length > policy.maxPermissions.tools) {
      errors.push(
        `Too many tool permissions: ${requested.tools.length} requested, max ${policy.maxPermissions.tools} allowed`
      );
    }

    const validTools = new Set([
      'Bash',
      'Read',
      'Write',
      'Edit',
      'Grep',
      'Glob',
      'WebFetch',
      'WebSearch',
      'Task',
      'TodoWrite',
    ]);

    for (const tool of requested.tools) {
      if (validTools.has(tool)) {
        approved.tools.push(tool);
      } else {
        denied.tools!.push(tool);
        errors.push(`Invalid tool: ${tool}`);
      }
    }

    // Validate MCP server permissions
    if (requested.mcpServers) {
      approved.mcpServers = [...requested.mcpServers];
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      approved,
      denied,
    };
  }

  /**
   * Check if a path is safe (no path traversal, no system paths)
   */
  private isPathSafe(path: string): boolean {
    // Block path traversal
    if (path.includes('../') || path.includes('..\\')) {
      return false;
    }

    // Block absolute system paths
    const unsafePaths = [
      '/etc',
      '/sys',
      '/proc',
      '/dev',
      '/root',
      'C:\\Windows',
      'C:\\Program Files',
      '/System',
      '/Library',
    ];

    for (const unsafePath of unsafePaths) {
      if (path.startsWith(unsafePath)) {
        return false;
      }
    }

    // Allow relative paths and project-scoped paths
    return true;
  }

  /**
   * Check if a host is safe for network access
   */
  private isHostSafe(host: string, policy: SecurityPolicy): boolean {
    // Localhost is always blocked for plugins
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    ) {
      return false;
    }

    // Check if domain is trusted
    return this.isTrustedDomain(host, policy);
  }

  /**
   * Check if domain is in trusted list
   */
  private isTrustedDomain(host: string, policy: SecurityPolicy): boolean {
    if (!policy.trustedDomains) return false;

    for (const trusted of policy.trustedDomains) {
      // Wildcard support
      if (trusted === '*') return true;

      // Exact match
      if (host === trusted) return true;

      // Subdomain match (*.example.com)
      if (trusted.startsWith('*.')) {
        const domain = trusted.substring(2);
        if (host.endsWith(domain)) return true;
      }
    }

    return false;
  }

  /**
   * Check permission at runtime
   */
  checkPermission(
    action: string,
    resource: string,
    permissions: PermissionSet
  ): boolean {
    const allowed = this.checkPermissionInternal(action, resource, permissions);

    // Log to audit log
    this.logPermissionUse('unknown', action, resource, allowed);

    return allowed;
  }

  /**
   * Internal permission check logic
   */
  private checkPermissionInternal(
    action: string,
    resource: string,
    permissions: PermissionSet
  ): boolean {
    // Check filesystem permissions
    if (action.startsWith('fs:')) {
      const fsAction = action.substring(3) as 'read' | 'write';
      return this.checkFilesystemPermission(resource, fsAction, permissions);
    }

    // Check network permissions
    if (action.startsWith('network:')) {
      return this.checkNetworkPermission(resource, permissions);
    }

    // Check tool permissions
    if (action.startsWith('tool:')) {
      const tool = action.substring(5);
      return permissions.tools.includes(tool);
    }

    return false;
  }

  /**
   * Check filesystem permission
   */
  private checkFilesystemPermission(
    path: string,
    action: 'read' | 'write',
    permissions: PermissionSet
  ): boolean {
    for (const perm of permissions.filesystem) {
      if (this.matchPath(path, perm.path)) {
        if (perm.access === 'readwrite') return true;
        if (perm.access === action) return true;
      }
    }
    return false;
  }

  /**
   * Check network permission
   */
  private checkNetworkPermission(
    host: string,
    permissions: PermissionSet
  ): boolean {
    for (const perm of permissions.network) {
      if (this.matchHost(host, perm.host)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Match path against pattern (supports globs)
   */
  private matchPath(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Match host against pattern (supports wildcards)
   */
  private matchHost(host: string, pattern: string): boolean {
    // Exact match
    if (host === pattern) return true;

    // Wildcard subdomain (*.example.com)
    if (pattern.startsWith('*.')) {
      const domain = pattern.substring(2);
      return host.endsWith(domain);
    }

    return false;
  }

  /**
   * Log permission usage to audit log
   */
  logPermissionUse(
    plugin: string,
    action: string,
    resource: string,
    allowed: boolean = true,
    permission?: string
  ): void {
    const entry: AuditLogEntry = {
      timestamp: Date.now(),
      plugin,
      action,
      resource,
      allowed,
      permission,
    };

    this.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filter?: {
    plugin?: string;
    action?: string;
    allowed?: boolean;
    since?: number;
  }): AuditLogEntry[] {
    let entries = this.auditLog;

    if (filter) {
      entries = entries.filter((entry) => {
        if (filter.plugin && entry.plugin !== filter.plugin) return false;
        if (filter.action && entry.action !== filter.action) return false;
        if (filter.allowed !== undefined && entry.allowed !== filter.allowed)
          return false;
        if (filter.since && entry.timestamp < filter.since) return false;
        return true;
      });
    }

    return entries;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Export audit log to JSON
   */
  exportAuditLog(): string {
    return JSON.stringify(this.auditLog, null, 2);
  }
}
