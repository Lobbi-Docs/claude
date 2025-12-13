/**
 * Registry API Server
 *
 * This module establishes the main Express application with middleware stack,
 * route configuration, and graceful shutdown handling.
 *
 * Business Value:
 * - Centralized HTTP server for plugin registry operations
 * - Production-ready middleware stack for security and performance
 * - Graceful shutdown ensures zero data loss during deployments
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

import { config } from './config.js';
import { logger, logRequest, logError } from './utils/logger.js';
import { createErrorResponse } from './utils/response.js';
import { ErrorCode, AuthenticatedRequest } from './types/index.js';

// Import rate limiters
import { generalLimiter, authLimiter, searchLimiter, downloadLimiter } from './middleware/rate-limit.js';

// Import routes
import pluginRoutes from './routes/plugins.js';
import searchRoutes from './routes/search.js';
import authRoutes from './routes/auth.js';
import downloadRoutes from './routes/downloads.js';

// Import database service
import { db } from './services/database.js';

/**
 * Create and configure Express application
 *
 * WHY: Separating app creation from server startup enables testing
 * with supertest without starting actual HTTP server.
 */
export function createApp(): express.Application {
  const app = express();

  // ========================================================================
  // SECURITY MIDDLEWARE
  // ========================================================================

  // Helmet: Sets security-related HTTP headers
  app.use(helmet());

  // CORS: Configure cross-origin resource sharing
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ========================================================================
  // PARSING MIDDLEWARE
  // ========================================================================

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Compression middleware
  app.use(compression());

  // ========================================================================
  // LOGGING & REQUEST TRACKING MIDDLEWARE
  // ========================================================================

  // Attach request ID to all requests
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    authReq.requestId = uuidv4();
    next();
  });

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logRequest(req.method, req.path, res.statusCode, duration, authReq.requestId || 'unknown');
    });

    next();
  });

  // ========================================================================
  // HEALTH CHECK ENDPOINT
  // ========================================================================

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  });

  // ========================================================================
  // API ROUTES WITH RATE LIMITING
  // ========================================================================

  // General rate limiter for all API routes
  app.use('/api/v1', generalLimiter);

  // Plugin routes
  app.use('/api/v1/plugins', pluginRoutes);

  // Search routes with specific limiter
  app.use('/api/v1/search', searchLimiter, searchRoutes);
  app.use('/api/v1/trending', searchRoutes);
  app.use('/api/v1/categories', searchRoutes);

  // Auth routes with stricter limiter
  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/users', authRoutes);

  // Download routes with lenient limiter
  app.use('/api/v1/plugins/:id/download', downloadLimiter);
  app.use('/api/v1/plugins', downloadRoutes);

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  // 404 Handler
  app.use((req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    res.status(404).json(
      createErrorResponse(
        ErrorCode.PLUGIN_NOT_FOUND,
        `Endpoint not found: ${req.method} ${req.path}`,
        authReq.requestId
      )
    );
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    logError('Unhandled error', err, {
      method: req.method,
      path: req.path,
      requestId: authReq.requestId,
    });

    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        config.nodeEnv === 'production'
          ? 'An unexpected error occurred'
          : err.message,
        authReq.requestId,
        config.nodeEnv === 'development' ? { stack: err.stack } : undefined
      )
    );
  });

  return app;
}

/**
 * Start HTTP server
 *
 * WHY: Separating server startup enables independent testing and
 * graceful shutdown orchestration.
 */
export function startServer(): void {
  const app = createApp();

  const server = app.listen(config.port, config.host, () => {
    logger.info('Registry API Server started', {
      port: config.port,
      host: config.host,
      environment: config.nodeEnv,
    });
  });

  // ========================================================================
  // GRACEFUL SHUTDOWN
  // ========================================================================

  /**
   * Graceful shutdown handler
   *
   * WHY: Proper shutdown sequence ensures:
   * - No requests are dropped during deployment
   * - Database connections are properly closed
   * - Resources are cleaned up to prevent leaks
   */
  function gracefulShutdown(signal: string): void {
    logger.info(`${signal} received, starting graceful shutdown`);

    server.close(() => {
      logger.info('HTTP server closed');

      // Close database connection
      db.close();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logError('Uncaught exception', err);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason,
      promise,
    });
    gracefulShutdown('unhandledRejection');
  });
}

// Start server if running directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
