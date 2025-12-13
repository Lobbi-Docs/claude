-- Secrets Management Database Schema
--
-- Business Value: Provides persistent storage for secret metadata, audit logs,
-- access control, and encryption key management. Supports multi-provider deployments,
-- compliance requirements, and security investigations.
--
-- Security Considerations:
-- - Secret values are NEVER stored in this database (stored encrypted in providers)
-- - Audit logs are append-only for forensic analysis
-- - Access permissions support fine-grained control
-- - Encryption key metadata enables key rotation
--
-- Usage:
--   sqlite3 secrets.db < secrets.sql

-- Enable foreign keys for referential integrity
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Secrets Metadata Table
-- =============================================================================
--
-- Business Value: Tracks secret metadata across all providers, enabling
-- centralized discovery, lifecycle management, and compliance reporting.
--
-- Note: Actual secret values are stored encrypted in providers (local files,
-- Azure Key Vault, etc.). This table only stores metadata.

CREATE TABLE IF NOT EXISTS secrets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    scope TEXT NOT NULL DEFAULT 'global',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    tags TEXT, -- JSON array: ["production", "database"]

    -- Indexes for common queries
    CHECK (scope IN ('global', 'plugin', 'agent', 'user')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
CREATE INDEX IF NOT EXISTS idx_secrets_provider ON secrets(provider);
CREATE INDEX IF NOT EXISTS idx_secrets_scope ON secrets(scope);
CREATE INDEX IF NOT EXISTS idx_secrets_expires_at ON secrets(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- Secret Access Log Table
-- =============================================================================
--
-- Business Value: Provides comprehensive audit trail for compliance (SOC2, HIPAA)
-- and security investigations. Tracks all secret access attempts with outcome.
--
-- Retention: Configure retention policy based on compliance requirements
-- (e.g., 90 days for PCI-DSS, 7 years for HIPAA)

CREATE TABLE IF NOT EXISTS secret_access_log (
    id TEXT PRIMARY KEY,
    secret_id TEXT,
    secret_name TEXT NOT NULL,
    accessor TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    success INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    version INTEGER,
    provider TEXT,

    -- Foreign key to secrets (nullable for failed access to non-existent secrets)
    FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE SET NULL,

    -- Validate action types
    CHECK (action IN ('get', 'set', 'delete', 'rotate', 'list')),
    CHECK (success IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_access_log_secret_id ON secret_access_log(secret_id);
CREATE INDEX IF NOT EXISTS idx_access_log_secret_name ON secret_access_log(secret_name);
CREATE INDEX IF NOT EXISTS idx_access_log_accessor ON secret_access_log(accessor);
CREATE INDEX IF NOT EXISTS idx_access_log_action ON secret_access_log(action);
CREATE INDEX IF NOT EXISTS idx_access_log_timestamp ON secret_access_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_log_success ON secret_access_log(success);

-- =============================================================================
-- Secret Permissions Table
-- =============================================================================
--
-- Business Value: Implements role-based access control (RBAC) for secrets,
-- enabling multi-team environments and least-privilege security model.
--
-- Supports:
-- - Wildcard patterns (e.g., "api-key-*" grants access to all API keys)
-- - Scope-based isolation (plugin secrets isolated from agent secrets)
-- - Time-limited permissions (temporary access for contractors)

CREATE TABLE IF NOT EXISTS secret_permissions (
    id TEXT PRIMARY KEY,
    secret_id TEXT NOT NULL, -- Secret ID or pattern (e.g., "api-key-*")
    scope TEXT NOT NULL DEFAULT 'global',
    permission TEXT NOT NULL,
    granted_to TEXT NOT NULL,
    granted_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,

    -- Validate permission levels
    CHECK (permission IN ('read', 'write', 'delete', 'rotate', 'admin')),
    CHECK (scope IN ('global', 'plugin', 'agent', 'user'))
);

CREATE INDEX IF NOT EXISTS idx_permissions_secret_id ON secret_permissions(secret_id);
CREATE INDEX IF NOT EXISTS idx_permissions_granted_to ON secret_permissions(granted_to);
CREATE INDEX IF NOT EXISTS idx_permissions_permission ON secret_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_permissions_scope ON secret_permissions(scope);
CREATE INDEX IF NOT EXISTS idx_permissions_expires_at ON secret_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- Encryption Keys Table
-- =============================================================================
--
-- Business Value: Tracks encryption key lifecycle for key rotation and
-- compliance. Enables auditing which keys were used to encrypt which secrets.
--
-- Security: Stores key HASH (not the key itself) for verification.
-- Actual keys are stored securely in provider storage (encrypted files, HSM, etc.)

CREATE TABLE IF NOT EXISTS encryption_keys (
    id TEXT PRIMARY KEY,
    key_hash TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active',
    rotated_at TEXT,
    revoked_at TEXT,

    -- Validate status
    CHECK (status IN ('active', 'rotated', 'revoked')),
    CHECK (algorithm IN ('aes-256-gcm'))
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(status);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at);

-- =============================================================================
-- Secret Versions Table
-- =============================================================================
--
-- Business Value: Maintains history of secret rotations, enabling rollback
-- and forensic analysis. Supports compliance requirements for audit trails.
--
-- Note: Actual encrypted values stored in providers. This table tracks versions.

CREATE TABLE IF NOT EXISTS secret_versions (
    id TEXT PRIMARY KEY,
    secret_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    is_valid INTEGER NOT NULL DEFAULT 1,
    encryption_key_id TEXT,

    FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE CASCADE,
    FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(id) ON DELETE SET NULL,

    CHECK (version >= 1),
    CHECK (is_valid IN (0, 1)),

    -- Ensure unique version per secret
    UNIQUE (secret_id, version)
);

CREATE INDEX IF NOT EXISTS idx_secret_versions_secret_id ON secret_versions(secret_id);
CREATE INDEX IF NOT EXISTS idx_secret_versions_version ON secret_versions(secret_id, version);
CREATE INDEX IF NOT EXISTS idx_secret_versions_is_valid ON secret_versions(is_valid);

-- =============================================================================
-- Views for Reporting
-- =============================================================================

-- View: Active Secrets
-- Business Value: Quick access to non-expired secrets for inventory reporting
CREATE VIEW IF NOT EXISTS active_secrets AS
SELECT
    id,
    name,
    provider,
    version,
    scope,
    created_at,
    updated_at,
    expires_at,
    tags
FROM secrets
WHERE expires_at IS NULL OR datetime(expires_at) > datetime('now');

-- View: Recent Access Log
-- Business Value: Security monitoring dashboard showing recent secret access
CREATE VIEW IF NOT EXISTS recent_access_log AS
SELECT
    l.id,
    l.secret_name,
    l.accessor,
    l.action,
    l.timestamp,
    l.success,
    l.error,
    s.scope,
    s.provider
FROM secret_access_log l
LEFT JOIN secrets s ON l.secret_id = s.id
ORDER BY l.timestamp DESC
LIMIT 1000;

-- View: Failed Access Attempts
-- Business Value: Security alert dashboard for potential breach detection
CREATE VIEW IF NOT EXISTS failed_access_attempts AS
SELECT
    l.id,
    l.secret_name,
    l.accessor,
    l.action,
    l.timestamp,
    l.error,
    COUNT(*) OVER (PARTITION BY l.accessor, l.secret_name) as attempt_count
FROM secret_access_log l
WHERE l.success = 0
ORDER BY l.timestamp DESC;

-- View: Permission Grants
-- Business Value: Access control audit showing who has access to what
CREATE VIEW IF NOT EXISTS active_permissions AS
SELECT
    p.id,
    p.secret_id,
    s.name as secret_name,
    p.granted_to,
    p.permission,
    p.scope,
    p.granted_at,
    p.expires_at
FROM secret_permissions p
LEFT JOIN secrets s ON p.secret_id = s.id
WHERE p.expires_at IS NULL OR datetime(p.expires_at) > datetime('now')
ORDER BY p.granted_at DESC;

-- View: Secret Rotation History
-- Business Value: Compliance reporting for secret rotation frequency
CREATE VIEW IF NOT EXISTS rotation_history AS
SELECT
    s.id,
    s.name,
    s.provider,
    s.version as current_version,
    COUNT(v.version) as total_versions,
    MAX(v.created_at) as last_rotation,
    s.created_at as original_creation
FROM secrets s
LEFT JOIN secret_versions v ON s.id = v.secret_id
GROUP BY s.id, s.name, s.provider, s.version, s.created_at
ORDER BY last_rotation DESC;

-- =============================================================================
-- Triggers for Audit and Integrity
-- =============================================================================

-- Trigger: Update timestamp on secrets modification
CREATE TRIGGER IF NOT EXISTS secrets_update_timestamp
AFTER UPDATE ON secrets
FOR EACH ROW
BEGIN
    UPDATE secrets
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger: Invalidate old versions on rotation
CREATE TRIGGER IF NOT EXISTS invalidate_old_versions
AFTER UPDATE OF version ON secrets
FOR EACH ROW
WHEN NEW.version > OLD.version
BEGIN
    UPDATE secret_versions
    SET is_valid = 0
    WHERE secret_id = NEW.id
    AND version < NEW.version;
END;

-- Trigger: Auto-cleanup expired permissions
-- Note: This is informational; actual cleanup should be done by scheduled job
-- CREATE TRIGGER IF NOT EXISTS cleanup_expired_permissions
-- AFTER INSERT ON secret_access_log
-- BEGIN
--     DELETE FROM secret_permissions
--     WHERE expires_at IS NOT NULL
--     AND datetime(expires_at) < datetime('now');
-- END;

-- =============================================================================
-- Sample Queries for Common Operations
-- =============================================================================

-- Query: Find secrets expiring in next 30 days
-- SELECT name, expires_at, provider
-- FROM secrets
-- WHERE expires_at IS NOT NULL
-- AND datetime(expires_at) BETWEEN datetime('now') AND datetime('now', '+30 days')
-- ORDER BY expires_at ASC;

-- Query: Find most accessed secrets (last 7 days)
-- SELECT
--     secret_name,
--     COUNT(*) as access_count,
--     COUNT(DISTINCT accessor) as unique_accessors
-- FROM secret_access_log
-- WHERE timestamp >= datetime('now', '-7 days')
-- GROUP BY secret_name
-- ORDER BY access_count DESC
-- LIMIT 10;

-- Query: Audit access by user
-- SELECT
--     secret_name,
--     action,
--     timestamp,
--     success,
--     error
-- FROM secret_access_log
-- WHERE accessor = 'user@example.com'
-- ORDER BY timestamp DESC;

-- Query: Find secrets never accessed
-- SELECT s.name, s.created_at, s.provider
-- FROM secrets s
-- LEFT JOIN secret_access_log l ON s.id = l.secret_id
-- WHERE l.id IS NULL;

-- Query: Check permission grants for a user
-- SELECT
--     secret_id,
--     permission,
--     scope,
--     granted_at,
--     expires_at
-- FROM secret_permissions
-- WHERE granted_to = 'user@example.com'
-- AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'));

-- =============================================================================
-- Database Maintenance Queries
-- =============================================================================

-- Vacuum database (reclaim space after deletions)
-- VACUUM;

-- Analyze database (update query optimizer statistics)
-- ANALYZE;

-- Check integrity
-- PRAGMA integrity_check;

-- Check foreign keys
-- PRAGMA foreign_key_check;
