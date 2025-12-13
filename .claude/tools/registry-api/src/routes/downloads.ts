/**
 * Download and Analytics Routes
 *
 * This module establishes plugin download tracking, statistics,
 * and review management endpoints.
 */

import { Router, Response } from 'express';
import { db } from '../services/database.js';
import { authenticateToken, optionalAuthentication } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { RatingSchema, AuthenticatedRequest, ErrorCode } from '../types/index.js';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/plugins/:id/download
 * Download plugin package (tracks analytics)
 */
router.get(
  '/:id/download',
  optionalAuthentication,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const plugin = db.getPluginById(req.params.id);

      if (!plugin) {
        res.status(404).json(
          createErrorResponse(
            ErrorCode.PLUGIN_NOT_FOUND,
            'Plugin not found',
            req.requestId
          )
        );
        return;
      }

      // Increment download count
      db.incrementDownloadCount(plugin.id);

      logger.info('Plugin downloaded', {
        pluginId: plugin.id,
        userId: req.user?.userId,
        requestId: req.requestId,
      });

      // Redirect to actual download URL (GitHub release, etc.)
      res.redirect(plugin.repository_url);
    } catch (error) {
      logger.error('Download error', error as Error, { requestId: req.requestId });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Download failed',
          req.requestId
        )
      );
    }
  }
);

/**
 * GET /api/v1/plugins/:id/stats
 * Get plugin download and usage statistics
 */
router.get('/:id/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const plugin = db.getPluginById(req.params.id);

    if (!plugin) {
      res.status(404).json(
        createErrorResponse(
          ErrorCode.PLUGIN_NOT_FOUND,
          'Plugin not found',
          req.requestId
        )
      );
      return;
    }

    const stats = {
      total_downloads: plugin.download_count,
      install_count: plugin.install_count,
      star_count: plugin.star_count,
      average_rating: plugin.average_rating,
      review_count: plugin.review_count,
      quality_score: plugin.quality_score,
    };

    res.json(createSuccessResponse(stats));
  } catch (error) {
    logger.error('Error fetching stats', error as Error, { requestId: req.requestId });
    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch statistics',
        req.requestId
      )
    );
  }
});

/**
 * POST /api/v1/plugins/:id/rate
 * Rate and review plugin
 */
router.post(
  '/:id/rate',
  authenticateToken,
  validateBody(RatingSchema),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const plugin = db.getPluginById(req.params.id);

      if (!plugin) {
        res.status(404).json(
          createErrorResponse(
            ErrorCode.PLUGIN_NOT_FOUND,
            'Plugin not found',
            req.requestId
          )
        );
        return;
      }

      const rating = db.upsertRating({
        plugin_id: plugin.id,
        user_id: req.user!.userId,
        stars: req.body.stars,
        review_title: req.body.review_title,
        review_text: req.body.review_text,
        version_reviewed: plugin.version,
      });

      logger.info('Plugin rated', {
        pluginId: plugin.id,
        userId: req.user!.userId,
        stars: req.body.stars,
        requestId: req.requestId,
      });

      res.status(201).json(createSuccessResponse(rating));
    } catch (error) {
      logger.error('Error creating rating', error as Error, { requestId: req.requestId });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Failed to create rating',
          req.requestId
        )
      );
    }
  }
);

/**
 * GET /api/v1/plugins/:id/reviews
 * Get plugin reviews with pagination
 */
router.get('/:id/reviews', (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const reviews = db.getPluginRatings(req.params.id, limit, offset);

    res.json(createPaginatedResponse(reviews, reviews.length, limit, offset));
  } catch (error) {
    logger.error('Error fetching reviews', error as Error, { requestId: req.requestId });
    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch reviews',
        req.requestId
      )
    );
  }
});

export default router;
