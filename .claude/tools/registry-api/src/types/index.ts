/**
 * Plugin Registry API Type Definitions
 *
 * This module establishes type-safe contracts for all API operations, ensuring
 * consistent data structures across the plugin discovery and distribution ecosystem.
 *
 * Business Value:
 * - Type safety reduces runtime errors and improves API reliability
 * - Self-documenting interfaces accelerate client integration
 * - Zod schemas enable runtime validation with TypeScript type inference
 */

import { z } from 'zod';
import { Request } from 'express';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Plugin metadata schema for publishing and updates
 * Validates all required fields for plugin registry entries
 */
export const PluginSchema = z.object({
  name: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Plugin name must be lowercase alphanumeric with hyphens'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver (e.g., 1.0.0)'),
  description: z.string().min(10).max(500),
  author: z.string().min(2).max(100),
  author_email: z.string().email(),
  license: z.string().default('MIT'),
  homepage: z.string().url().optional(),
  repository_url: z.string().url(),
  repository_type: z.enum(['git', 'github', 'gitlab', 'bitbucket']).default('github'),
  category: z.enum([
    'development',
    'testing',
    'devops',
    'frontend',
    'backend',
    'cloud',
    'collaboration',
    'documentation',
    'security',
    'data',
    'utilities'
  ]),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).min(1).max(20),
  keywords: z.array(z.string()).max(50),
  readme_content: z.string().min(100),
  documentation_url: z.string().url().optional(),
  dependencies: z.record(z.string()).optional(),
  peer_dependencies: z.record(z.string()).optional(),
  minimum_claude_version: z.string().optional(),
  compatible_platforms: z.array(z.string()).optional(),
});

/**
 * User registration schema with validation
 */
export const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric with underscores or hyphens'),
  email: z.string().email(),
  password: z.string().min(8).max(100).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  ),
  display_name: z.string().min(2).max(100).optional(),
});

/**
 * User login schema
 */
export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Plugin rating and review schema
 */
export const RatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  review_title: z.string().max(100).optional(),
  review_text: z.string().max(5000).optional(),
});

/**
 * Search query schema with filters
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['keyword', 'semantic', 'hybrid']).default('hybrid'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// TYPESCRIPT TYPE INFERENCE
// ============================================================================

export type Plugin = z.infer<typeof PluginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RatingInput = z.infer<typeof RatingSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

/**
 * Full plugin entity from database including computed fields
 */
export interface PluginEntity extends Plugin {
  id: string;
  download_count: number;
  install_count: number;
  star_count: number;
  average_rating: number;
  review_count: number;
  quality_score: number;
  published_at: string;
  updated_at: string;
  last_indexed_at: string;
  is_deprecated: boolean;
  deprecation_message: string | null;
  content_hash: string;
  metadata: string | null;
  is_searchable: boolean;
  is_featured: boolean;
}

/**
 * Publisher/User entity
 */
export interface Publisher {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  github_username: string | null;
  verified: boolean;
  role: 'publisher' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * Public publisher profile (no sensitive data)
 */
export interface PublisherProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  github_username: string | null;
  verified: boolean;
  created_at: string;
}

/**
 * Rating/Review entity
 */
export interface Rating {
  id: number;
  plugin_id: string;
  user_id: string;
  stars: number;
  review_title: string | null;
  review_text: string | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  version_reviewed: string | null;
  verified_install: boolean;
  helpful_count: number;
  not_helpful_count: number;
  helpful_ratio: number;
  is_flagged: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  author_response: string | null;
  author_response_at: string | null;
}

/**
 * Download statistics
 */
export interface DownloadStats {
  total_downloads: number;
  downloads_last_7_days: number;
  downloads_last_30_days: number;
  unique_users: number;
  version_breakdown: Record<string, number>;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Standard API success response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * Standard API error response
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated request with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  requestId?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
  plugin: PluginEntity;
  relevance_score: number;
  match_type: 'name' | 'description' | 'tags' | 'readme' | 'semantic';
}

/**
 * Trending plugin with score
 */
export interface TrendingPlugin {
  plugin: PluginEntity;
  trending_score: number;
  recent_installs: number;
  recent_rating: number;
}

/**
 * Recommendation with explanation
 */
export interface Recommendation {
  plugin: PluginEntity;
  score: number;
  reason: string;
  type: 'collaborative' | 'content' | 'trending' | 'contextual';
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS = 'ERROR_INVALID_CREDENTIALS',
  UNAUTHORIZED = 'ERROR_UNAUTHORIZED',
  TOKEN_EXPIRED = 'ERROR_TOKEN_EXPIRED',
  TOKEN_INVALID = 'ERROR_TOKEN_INVALID',

  // Resource errors (2xxx)
  PLUGIN_NOT_FOUND = 'ERROR_PLUGIN_NOT_FOUND',
  USER_NOT_FOUND = 'ERROR_USER_NOT_FOUND',
  REVIEW_NOT_FOUND = 'ERROR_REVIEW_NOT_FOUND',

  // Validation errors (3xxx)
  VALIDATION_ERROR = 'ERROR_VALIDATION_ERROR',
  DUPLICATE_PLUGIN = 'ERROR_DUPLICATE_PLUGIN',
  DUPLICATE_USER = 'ERROR_DUPLICATE_USER',

  // Permission errors (4xxx)
  FORBIDDEN = 'ERROR_FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'ERROR_INSUFFICIENT_PERMISSIONS',

  // Rate limiting (5xxx)
  RATE_LIMIT_EXCEEDED = 'ERROR_RATE_LIMIT_EXCEEDED',

  // Server errors (9xxx)
  INTERNAL_ERROR = 'ERROR_INTERNAL_ERROR',
  DATABASE_ERROR = 'ERROR_DATABASE_ERROR',
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  dbPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}
