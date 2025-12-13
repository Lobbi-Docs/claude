/**
 * Health Check System - Type Definitions
 *
 * Comprehensive health monitoring for Claude orchestration system
 */

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export enum Severity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info'
}

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  timestamp: Date;
  duration: number; // milliseconds
  details?: Record<string, any>;
  issues?: HealthIssue[];
  metadata?: Record<string, any>;
}

export interface HealthIssue {
  severity: Severity;
  code: string;
  message: string;
  component: string;
  details?: Record<string, any>;
  remediation?: string;
  autoFixable?: boolean;
}

export interface HealthCheck {
  name: string;
  description: string;
  check: () => Promise<HealthCheckResult>;
  dependencies?: string[];
  timeout?: number; // milliseconds, default 5000
  retryable?: boolean;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface OverallHealth {
  status: HealthStatus;
  timestamp: Date;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
  issues: HealthIssue[];
  duration: number;
}

export interface FixResult {
  success: boolean;
  issue: HealthIssue;
  message: string;
  details?: Record<string, any>;
}

export interface HealthConfiguration {
  enabled: boolean;
  checksEnabled: string[];
  checksDisabled: string[];
  timeout: number;
  retryAttempts: number;
  autoFix: boolean;
  reportingLevel: 'verbose' | 'standard' | 'minimal';
}

export interface ComponentStatus {
  name: string;
  type: 'database' | 'mcp' | 'registry' | 'hook' | 'agent' | 'file' | 'system';
  status: HealthStatus;
  message: string;
  lastChecked?: Date;
  metadata?: Record<string, any>;
}

export interface HealthMetrics {
  uptime: number;
  lastHealthCheck: Date;
  totalChecks: number;
  failedChecks: number;
  averageCheckDuration: number;
  componentStatuses: ComponentStatus[];
}

export const STATUS_EMOJI = {
  [HealthStatus.HEALTHY]: '✅',
  [HealthStatus.DEGRADED]: '⚠️',
  [HealthStatus.UNHEALTHY]: '❌',
  [HealthStatus.UNKNOWN]: '❓'
};

export const SEVERITY_EMOJI = {
  [Severity.CRITICAL]: '🔴',
  [Severity.WARNING]: '🟡',
  [Severity.INFO]: '🔵'
};
