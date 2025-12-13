/**
 * Plugin CRUD Routes
 *
 * This module establishes RESTful endpoints for plugin lifecycle management,
 * enabling publishers to distribute and maintain their plugins.
 *
 * Business Value:
 * - Streamlines plugin publishing workflow for ecosystem growth
 * - Version management supports backward compatibility
 * - Quality metrics drive discovery and adoption
 */

import { Router, Response } from 'express';
import { db } from '../services/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { PluginSchema } from '../types/index.js';
import { AuthenticatedRequest, ErrorCode } from '../types/index.js';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/plugins
 * Create new plugin
 *
 * WHY: API-first publishing enables automated plugin deployment from CI/CD
 * pipelines, streamlining the release process.
 */
router.post(
  '/',
  authenticateToken,
  validateBody(PluginSchema),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = db.getPluginByName(req.body.name);
      if (existing) {
        res.status(409).json(
          createErrorResponse(
            ErrorCode.DUPLICATE_PLUGIN,
            `Plugin '${req.body.name}' already exists`,
            req.requestId
          )
        );
        return;
      }

      const plugin = db.createPlugin(req.body);

      logger.info('Plugin created', {
        pluginId: plugin.id,
        name: plugin.name,
        userId: req.user?.userId,
        requestId: req.requestId,
      });

      res.status(201).json(createSuccessResponse(plugin));
    } catch (error) {
      logger.error('Error creating plugin', error as Error, { requestId: req.requestId });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Failed to create plugin',
          req.requestId
        )
      );
    }
  }
);

/**
 * GET /api/v1/plugins
 * List plugins with pagination and filtering
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string | undefined;

    const { plugins, total } = db.listPlugins({
      limit,
      offset,
      category,
      searchable: true,
    });

    res.json(createPaginatedResponse(plugins, total, limit, offset));
  } catch (error) {
    logger.error('Error listing plugins', error as Error, { requestId: req.requestId });
    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list plugins',
        req.requestId
      )
    );
  }
});

/**
 * GET /api/v1/plugins/:id
 * Get plugin details
 */
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
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

    res.json(createSuccessResponse(plugin));
  } catch (error) {
    logger.error('Error fetching plugin', error as Error, {
      pluginId: req.params.id,
      requestId: req.requestId,
    });
    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch plugin',
        req.requestId
      )
    );
  }
});

/**
 * PUT /api/v1/plugins/:id
 * Update plugin metadata
 */
router.put(
  '/:id',
  authenticateToken,
  validateBody(PluginSchema.partial()),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = db.getPluginById(req.params.id);

      if (!existing) {
        res.status(404).json(
          createErrorResponse(
            ErrorCode.PLUGIN_NOT_FOUND,
            'Plugin not found',
            req.requestId
          )
        );
        return;
      }

      const updated = db.updatePlugin(req.params.id, req.body);

      logger.info('Plugin updated', {
        pluginId: req.params.id,
        userId: req.user?.userId,
        requestId: req.requestId,
      });

      res.json(createSuccessResponse(updated));
    } catch (error) {
      logger.error('Error updating plugin', error as Error, {
        pluginId: req.params.id,
        requestId: req.requestId,
      });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Failed to update plugin',
          req.requestId
        )
      );
    }
  }
);

/**
 * DELETE /api/v1/plugins/:id
 * Delete/unpublish plugin
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = db.deletePlugin(req.params.id);

      if (!success) {
        res.status(404).json(
          createErrorResponse(
            ErrorCode.PLUGIN_NOT_FOUND,
            'Plugin not found',
            req.requestId
          )
        );
        return;
      }

      logger.info('Plugin deleted', {
        pluginId: req.params.id,
        userId: req.user?.userId,
        requestId: req.requestId,
      });

      res.json(createSuccessResponse({ deleted: true }));
    } catch (error) {
      logger.error('Error deleting plugin', error as Error, {
        pluginId: req.params.id,
        requestId: req.requestId,
      });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Failed to delete plugin',
          req.requestId
        )
      );
    }
  }
);

export default router;
