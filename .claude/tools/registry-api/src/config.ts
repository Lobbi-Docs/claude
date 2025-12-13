/**
 * Server Configuration Module
 *
 * This module establishes centralized configuration management with environment
 * variable validation and sensible defaults for production deployment.
 *
 * Business Value:
 * - Environment-specific configuration without code changes
 * - Security: secrets managed externally via environment variables
 * - Fail-fast validation prevents runtime configuration errors
 */

import { ServerConfig } from './types/index.js';
import path from 'path';

/**
 * Load and validate server configuration from environment variables
 *
 * WHY: Centralizing configuration ensures consistent behavior across deployments
 * and provides a single source of truth for operational parameters.
 */
export function loadConfig(): ServerConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as ServerConfig['nodeEnv'];

  // Validate required environment variables in production
  if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  const config: ServerConfig = {
    // Server settings
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv,

    // CORS configuration
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173'],

    // JWT settings
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

    // Database settings
    dbPath: process.env.DB_PATH || path.resolve(process.cwd(), '../../orchestration/db/registry.db'),

    // Logging
    logLevel: (process.env.LOG_LEVEL as ServerConfig['logLevel']) || 'info',

    // Rate limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Validate configuration values
 *
 * WHY: Early validation prevents cryptic runtime errors and improves operational
 * reliability by catching configuration mistakes before server startup.
 */
function validateConfig(config: ServerConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.rateLimitWindowMs < 1000) {
    throw new Error('Rate limit window must be at least 1000ms');
  }

  if (config.rateLimitMaxRequests < 1) {
    throw new Error('Rate limit max requests must be at least 1');
  }

  if (config.nodeEnv === 'production' && config.jwtSecret === 'development-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set to a secure value in production');
  }
}

/**
 * Singleton configuration instance
 * Loaded once at application startup for consistent behavior
 */
export const config = loadConfig();
