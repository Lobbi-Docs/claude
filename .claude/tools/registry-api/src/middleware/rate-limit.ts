/**
 * Rate Limiting Middleware
 *
 * This module establishes request throttling to prevent abuse and ensure fair
 * resource allocation across all API consumers.
 *
 * Business Value:
 * - Protects infrastructure from DDoS attacks and abuse
 * - Ensures fair resource allocation for all users
 * - Prevents cost overruns from excessive API usage
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { ErrorCode } from '../types/index.js';

/**
 * General API rate limiter - applies to most endpoints
 *
 * WHY: Default rate limiting prevents abuse while allowing legitimate
 * high-volume use cases. 100 requests/minute handles typical application needs.
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests from this IP, please try again later',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 *
 * WHY: Authentication endpoints are common brute-force targets. Lower limits
 * (10 req/min) prevent credential stuffing while allowing legitimate retries.
 */
export const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 10, // Stricter limit for auth endpoints
  message: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many authentication attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count even successful requests
});

/**
 * Lenient rate limiter for download endpoints
 *
 * WHY: Downloads may be automated in CI/CD pipelines. Higher limits (200 req/min)
 * accommodate build systems while still preventing abuse.
 */
export const downloadLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 200, // More lenient for downloads
  message: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many download requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search rate limiter with moderate restrictions
 *
 * WHY: Search can be resource-intensive. Moderate limits (50 req/min) prevent
 * search API abuse while supporting interactive user experiences.
 */
export const searchLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 50,
  message: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many search requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
