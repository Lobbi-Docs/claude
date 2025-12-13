/**
 * Search and Discovery Routes
 *
 * This module establishes plugin discovery endpoints with full-text search,
 * trending algorithms, and personalized recommendations.
 */

import { Router, Response } from 'express';
import { db } from '../services/database.js';
import { optionalAuthentication } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validation.js';
import { SearchQuerySchema, AuthenticatedRequest, ErrorCode } from '../types/index.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/search
 * Full-text and semantic plugin search
 */
router.get(
  '/',
  optionalAuthentication,
  validateQuery(SearchQuerySchema),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, limit, offset } = req.query as any;

      const results = db.searchPlugins(q, limit, offset);

      logger.info('Search executed', {
        query: q,
        resultCount: results.length,
        userId: req.user?.userId,
        requestId: req.requestId,
      });

      res.json(createSuccessResponse(results));
    } catch (error) {
      logger.error('Search error', error as Error, { requestId: req.requestId });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Search failed',
          req.requestId
        )
      );
    }
  }
);

/**
 * GET /api/v1/trending
 * Get trending plugins based on recent activity
 */
router.get('/trending', (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const trending = db.getTrendingPlugins(limit);

    res.json(createSuccessResponse(trending));
  } catch (error) {
    logger.error('Error fetching trending plugins', error as Error, { requestId: req.requestId });
    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch trending plugins',
        req.requestId
      )
    );
  }
});

/**
 * GET /api/v1/categories
 * List all plugin categories
 */
router.get('/categories', (_req: AuthenticatedRequest, res: Response) => {
  const categories = [
    { id: 'development', name: 'Development', description: 'Core development tools' },
    { id: 'testing', name: 'Testing', description: 'Testing and QA tools' },
    { id: 'devops', name: 'DevOps', description: 'CI/CD and deployment' },
    { id: 'frontend', name: 'Frontend', description: 'Frontend development' },
    { id: 'backend', name: 'Backend', description: 'Backend development' },
    { id: 'cloud', name: 'Cloud', description: 'Cloud infrastructure' },
    { id: 'collaboration', name: 'Collaboration', description: 'Team collaboration' },
    { id: 'documentation', name: 'Documentation', description: 'Documentation tools' },
    { id: 'security', name: 'Security', description: 'Security and compliance' },
    { id: 'data', name: 'Data', description: 'Data management and analytics' },
    { id: 'utilities', name: 'Utilities', description: 'General utilities' },
  ];

  res.json(createSuccessResponse(categories));
});

export default router;
