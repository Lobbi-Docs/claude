/**
 * Database Health Check
 *
 * Validates SQLite database connectivity and schema integrity
 */

import * as fs from 'fs';
import * as path from 'path';
import { HealthCheck, HealthCheckResult, HealthStatus, HealthIssue, Severity } from '../types.js';

const DB_PATH = path.join(process.cwd(), '.claude', 'data', 'orchestration.db');

export const databaseCheck: HealthCheck = {
  name: 'database',
  description: 'Validates database connectivity and schema integrity',
  priority: 'medium',
  timeout: 5000,
  retryable: true,

  check: async (): Promise<HealthCheckResult> => {
    const issues: HealthIssue[] = [];
    const details: Record<string, any> = {
      dbPath: DB_PATH,
      exists: false,
      readable: false,
      writable: false,
      size: 0
    };

    try {
      // Check if database file exists
      if (!fs.existsSync(DB_PATH)) {
        // Database may not be required for all setups
        issues.push({
          severity: Severity.INFO,
          code: 'DATABASE_NOT_FOUND',
          message: 'Database file not found',
          component: 'database',
          details: { path: DB_PATH },
          remediation: 'Create database if orchestration persistence is needed',
          autoFixable: true
        });

        return {
          name: 'database',
          status: HealthStatus.DEGRADED,
          message: 'Database not initialized (may not be required)',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      details.exists = true;

      // Check file stats
      const stats = fs.statSync(DB_PATH);
      details.size = stats.size;
      details.lastModified = stats.mtime;

      // Check if empty
      if (stats.size === 0) {
        issues.push({
          severity: Severity.WARNING,
          code: 'DATABASE_EMPTY',
          message: 'Database file is empty',
          component: 'database',
          details: { path: DB_PATH },
          remediation: 'Initialize database schema',
          autoFixable: true
        });

        return {
          name: 'database',
          status: HealthStatus.DEGRADED,
          message: 'Database is empty',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Check readable
      try {
        fs.accessSync(DB_PATH, fs.constants.R_OK);
        details.readable = true;
      } catch {
        issues.push({
          severity: Severity.CRITICAL,
          code: 'DATABASE_NOT_READABLE',
          message: 'Database file is not readable',
          component: 'database',
          details: { path: DB_PATH },
          remediation: 'Fix file permissions',
          autoFixable: true
        });

        return {
          name: 'database',
          status: HealthStatus.UNHEALTHY,
          message: 'Database not readable',
          timestamp: new Date(),
          duration: 0,
          issues,
          details
        };
      }

      // Check writable
      try {
        fs.accessSync(DB_PATH, fs.constants.W_OK);
        details.writable = true;
      } catch {
        issues.push({
          severity: Severity.WARNING,
          code: 'DATABASE_NOT_WRITABLE',
          message: 'Database file is not writable',
          component: 'database',
          details: { path: DB_PATH },
          remediation: 'Fix file permissions (read-only mode may be intentional)',
          autoFixable: true
        });
      }

      // Check disk space in parent directory
      const dbDir = path.dirname(DB_PATH);
      if (fs.existsSync(dbDir)) {
        // Note: Cross-platform disk space check would require additional libraries
        // For now, just check if directory is writable
        try {
          fs.accessSync(dbDir, fs.constants.W_OK);
          details.directoryWritable = true;
        } catch {
          issues.push({
            severity: Severity.WARNING,
            code: 'DATABASE_DIR_NOT_WRITABLE',
            message: 'Database directory is not writable',
            component: 'database',
            details: { dir: dbDir },
            remediation: 'Fix directory permissions',
            autoFixable: true
          });
        }
      }

      // Optional: Try to load database with better-sqlite3 if available
      try {
        // Dynamic import to avoid hard dependency
        const { default: Database } = await import('better-sqlite3') as any;
        const db = new Database(DB_PATH, { readonly: true });

        // Get table count
        const tables = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table'"
        ).all();
        details.tables = tables.length;
        details.tableNames = tables.map((t: any) => t.name);

        // Get database info
        const pragma = db.pragma('database_list');
        details.dbInfo = pragma;

        db.close();
        details.connectionTest = 'success';

      } catch (error) {
        // SQLite library not available or connection failed
        const errorMessage = (error as Error).message;

        if (errorMessage.includes('Cannot find module')) {
          issues.push({
            severity: Severity.INFO,
            code: 'SQLITE_LIBRARY_MISSING',
            message: 'SQLite library not available for detailed checks',
            component: 'database',
            details: {
              message: 'Install better-sqlite3 for detailed database validation'
            },
            remediation: 'Run: npm install better-sqlite3',
            autoFixable: false
          });
        } else {
          issues.push({
            severity: Severity.WARNING,
            code: 'DATABASE_CONNECTION_FAILED',
            message: 'Failed to connect to database',
            component: 'database',
            details: {
              error: errorMessage
            },
            remediation: 'Check database file integrity',
            autoFixable: false
          });
          details.connectionTest = 'failed';
        }
      }

      // Determine status
      let status = HealthStatus.HEALTHY;
      let message = 'Database is accessible';

      if (details.connectionTest === 'failed') {
        status = HealthStatus.DEGRADED;
        message = 'Database connection issues detected';
      } else if (!details.writable) {
        status = HealthStatus.DEGRADED;
        message = 'Database is read-only';
      }

      return {
        name: 'database',
        status,
        message,
        timestamp: new Date(),
        duration: 0,
        issues,
        details
      };

    } catch (error) {
      issues.push({
        severity: Severity.CRITICAL,
        code: 'DATABASE_CHECK_FAILED',
        message: `Database check failed: ${(error as Error).message}`,
        component: 'database',
        details: { error: (error as Error).stack }
      });

      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        message: `Check failed: ${(error as Error).message}`,
        timestamp: new Date(),
        duration: 0,
        issues,
        details
      };
    }
  }
};
