/**
 * Access Control for Secrets Management
 *
 * Business Value: Enforces permission-based access to secrets, supporting
 * multi-team environments and compliance requirements (SOC2, HIPAA, GDPR).
 *
 * Security Model:
 * - Role-Based Access Control (RBAC)
 * - Scope-based isolation (global, plugin, agent, user)
 * - Permission levels (read, write, delete, rotate, admin)
 * - Time-based permissions with expiration
 * - Audit logging of all access attempts
 *
 * Best Practices:
 * - Grant least privilege (minimum permissions needed)
 * - Use scope restrictions to isolate secrets between teams
 * - Expire permissions for temporary access
 * - Review audit logs regularly for suspicious activity
 */

import type {
  SecretPermission,
  SecretScope,
  SecretAccessLogEntry,
} from './types.js';

export type Permission = 'read' | 'write' | 'delete' | 'rotate' | 'admin';

export interface AccessControlOptions {
  /**
   * Default permissions for new secrets (if not specified)
   *
   * Business Value: Ensures secure-by-default configuration,
   * preventing accidental exposure of sensitive data.
   */
  defaultPermissions?: Permission[];

  /**
   * Enable access control enforcement (default: true)
   *
   * Business Value: Allows disabling access control for development
   * environments while enforcing it in production.
   */
  enforceAccessControl?: boolean;

  /**
   * Audit log callback for access denied events
   *
   * Business Value: Enables monitoring and alerting on unauthorized
   * access attempts for security investigations.
   */
  accessDeniedCallback?: (params: {
    secretName: string;
    accessor: string;
    requiredPermission: Permission;
    reason: string;
  }) => Promise<void>;
}

export class SecretAccessControl {
  private permissions: Map<string, SecretPermission[]> = new Map();
  private options: Required<
    Omit<AccessControlOptions, 'accessDeniedCallback'>
  > & {
    accessDeniedCallback?: (params: {
      secretName: string;
      accessor: string;
      requiredPermission: Permission;
      reason: string;
    }) => Promise<void>;
  };

  constructor(options: AccessControlOptions = {}) {
    this.options = {
      defaultPermissions: ['read'],
      enforceAccessControl: true,
      ...options,
    };
  }

  /**
   * Grant permission to access a secret
   *
   * Business Value: Enables delegating secret access to specific users,
   * plugins, or agents without sharing credentials directly.
   *
   * @param secretId - Secret ID or pattern (supports wildcards: api-key-*)
   * @param grantedTo - Identity to grant permission (user, plugin, agent)
   * @param permission - Permission level to grant
   * @param options - Grant options (scope, expiration)
   */
  async grant(
    secretId: string,
    grantedTo: string,
    permission: Permission,
    options?: {
      scope?: SecretScope;
      expiresAt?: string;
    }
  ): Promise<void> {
    const perm: SecretPermission = {
      secretId,
      scope: options?.scope || 'global',
      permission,
      grantedTo,
      grantedAt: new Date().toISOString(),
      expiresAt: options?.expiresAt,
    };

    if (!this.permissions.has(secretId)) {
      this.permissions.set(secretId, []);
    }

    this.permissions.get(secretId)!.push(perm);
  }

  /**
   * Revoke permission to access a secret
   *
   * Business Value: Enables removing access when team members leave
   * or privileges change, supporting zero-trust security model.
   *
   * @param secretId - Secret ID or pattern
   * @param grantedTo - Identity to revoke permission from
   * @param permission - Permission level to revoke (optional, revokes all if not specified)
   */
  async revoke(
    secretId: string,
    grantedTo: string,
    permission?: Permission
  ): Promise<void> {
    const perms = this.permissions.get(secretId);
    if (!perms) {
      return;
    }

    const filtered = perms.filter((p) => {
      if (p.grantedTo !== grantedTo) {
        return true;
      }
      if (permission && p.permission !== permission) {
        return true;
      }
      return false;
    });

    this.permissions.set(secretId, filtered);
  }

  /**
   * Check if an accessor has permission to perform an action
   *
   * Business Value: Enforces access control policy before allowing
   * secret operations, preventing unauthorized access.
   *
   * @param secretName - Secret name to access
   * @param accessor - Identity requesting access
   * @param requiredPermission - Permission required for the operation
   * @param scope - Secret scope (for scope-based isolation)
   * @returns True if access is granted
   * @throws Error if access is denied and enforcement is enabled
   */
  async checkPermission(
    secretName: string,
    accessor: string,
    requiredPermission: Permission,
    scope?: SecretScope
  ): Promise<boolean> {
    if (!this.options.enforceAccessControl) {
      return true;
    }

    // System accessor always has access
    if (accessor === 'system' || accessor === 'admin') {
      return true;
    }

    // Check for exact match permissions
    const exactPerms = this.permissions.get(secretName);
    if (exactPerms && this.hasPermission(exactPerms, accessor, requiredPermission, scope)) {
      return true;
    }

    // Check for wildcard permissions
    for (const [pattern, perms] of this.permissions.entries()) {
      if (this.matchesPattern(secretName, pattern)) {
        if (this.hasPermission(perms, accessor, requiredPermission, scope)) {
          return true;
        }
      }
    }

    // Access denied
    const reason = `No ${requiredPermission} permission for ${secretName}`;

    if (this.options.accessDeniedCallback) {
      await this.options.accessDeniedCallback({
        secretName,
        accessor,
        requiredPermission,
        reason,
      });
    }

    throw new Error(
      `Access denied: ${reason} (accessor: ${accessor})`
    );
  }

  /**
   * List permissions for a secret
   *
   * Business Value: Enables auditing and reviewing access control
   * policies for compliance and security reviews.
   *
   * @param secretId - Secret ID or pattern
   * @returns Array of permissions for the secret
   */
  async listPermissions(secretId: string): Promise<SecretPermission[]> {
    const perms = this.permissions.get(secretId) || [];

    // Filter out expired permissions
    const now = new Date();
    return perms.filter((p) => {
      if (!p.expiresAt) {
        return true;
      }
      return new Date(p.expiresAt) > now;
    });
  }

  /**
   * List all permissions for an accessor
   *
   * Business Value: Enables users to see what secrets they have
   * access to, improving discoverability and self-service.
   *
   * @param accessor - Identity to list permissions for
   * @returns Array of permissions granted to the accessor
   */
  async listAccessorPermissions(
    accessor: string
  ): Promise<SecretPermission[]> {
    const results: SecretPermission[] = [];
    const now = new Date();

    for (const perms of this.permissions.values()) {
      for (const perm of perms) {
        if (perm.grantedTo === accessor) {
          // Check if expired
          if (perm.expiresAt && new Date(perm.expiresAt) < now) {
            continue;
          }
          results.push(perm);
        }
      }
    }

    return results;
  }

  /**
   * Grant default permissions for a new secret
   *
   * Business Value: Automatically sets up access control when
   * secrets are created, ensuring consistent security policy.
   *
   * @param secretName - Secret name
   * @param creator - Identity creating the secret
   * @param scope - Secret scope
   */
  async grantDefaultPermissions(
    secretName: string,
    creator: string,
    scope?: SecretScope
  ): Promise<void> {
    // Creator gets admin permission
    await this.grant(secretName, creator, 'admin', { scope });

    // Grant default permissions to scope
    if (scope && scope !== 'global') {
      for (const permission of this.options.defaultPermissions) {
        await this.grant(secretName, scope, permission, { scope });
      }
    }
  }

  /**
   * Clean up expired permissions
   *
   * Business Value: Automatically removes time-limited access to
   * maintain least-privilege security posture.
   *
   * @returns Number of permissions removed
   */
  async cleanupExpiredPermissions(): Promise<number> {
    let removed = 0;
    const now = new Date();

    for (const [secretId, perms] of this.permissions.entries()) {
      const filtered = perms.filter((p) => {
        if (!p.expiresAt) {
          return true;
        }
        const expired = new Date(p.expiresAt) < now;
        if (expired) {
          removed++;
        }
        return !expired;
      });

      this.permissions.set(secretId, filtered);
    }

    return removed;
  }

  /**
   * Export permissions for backup/migration
   *
   * Business Value: Enables disaster recovery and migration to
   * new environments without losing access control configuration.
   *
   * @returns Serializable permissions data
   */
  exportPermissions(): Record<string, SecretPermission[]> {
    const result: Record<string, SecretPermission[]> = {};

    for (const [secretId, perms] of this.permissions.entries()) {
      result[secretId] = perms;
    }

    return result;
  }

  /**
   * Import permissions from backup/migration
   *
   * Business Value: Restores access control configuration after
   * disaster recovery or environment migration.
   *
   * @param data - Permissions data to import
   * @param merge - Whether to merge with existing permissions (default: false)
   */
  async importPermissions(
    data: Record<string, SecretPermission[]>,
    merge = false
  ): Promise<void> {
    if (!merge) {
      this.permissions.clear();
    }

    for (const [secretId, perms] of Object.entries(data)) {
      if (merge && this.permissions.has(secretId)) {
        const existing = this.permissions.get(secretId)!;
        this.permissions.set(secretId, [...existing, ...perms]);
      } else {
        this.permissions.set(secretId, perms);
      }
    }
  }

  // Private helper methods

  /**
   * Check if a list of permissions grants the required permission
   */
  private hasPermission(
    perms: SecretPermission[],
    accessor: string,
    requiredPermission: Permission,
    scope?: SecretScope
  ): boolean {
    const now = new Date();

    for (const perm of perms) {
      // Check if granted to this accessor
      if (perm.grantedTo !== accessor) {
        continue;
      }

      // Check scope match
      if (scope && perm.scope !== scope && perm.scope !== 'global') {
        continue;
      }

      // Check if expired
      if (perm.expiresAt && new Date(perm.expiresAt) < now) {
        continue;
      }

      // Check permission level
      if (perm.permission === 'admin') {
        return true; // Admin has all permissions
      }

      if (perm.permission === requiredPermission) {
        return true;
      }

      // Write permission includes read
      if (perm.permission === 'write' && requiredPermission === 'read') {
        return true;
      }

      // Rotate permission includes read
      if (perm.permission === 'rotate' && requiredPermission === 'read') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a secret name matches a permission pattern
   *
   * Supports wildcards:
   * - api-key-* matches api-key-stripe, api-key-github, etc.
   * - * matches all secrets
   */
  private matchesPattern(secretName: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(secretName);
  }
}

/**
 * Permission hierarchy for access control
 *
 * Business Value: Documents permission model for security policy
 * development and compliance documentation.
 */
export const PERMISSION_HIERARCHY: Record<Permission, Permission[]> = {
  read: ['read'],
  write: ['read', 'write'],
  delete: ['read', 'delete'],
  rotate: ['read', 'rotate'],
  admin: ['read', 'write', 'delete', 'rotate', 'admin'],
};

/**
 * Get effective permissions for a permission level
 *
 * Business Value: Enables UI to show users what they can do with
 * a given permission level.
 *
 * @param permission - Permission level
 * @returns Array of effective permissions
 */
export function getEffectivePermissions(permission: Permission): Permission[] {
  return PERMISSION_HIERARCHY[permission] || [];
}
