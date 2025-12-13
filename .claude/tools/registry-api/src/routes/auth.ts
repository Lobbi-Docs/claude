/**
 * Authentication Routes
 *
 * This module establishes user registration, login, and token management
 * endpoints with bcrypt password hashing and JWT issuance.
 */

import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../services/database.js';
import { authenticateToken, generateToken, generateRefreshToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { RegisterSchema, LoginSchema, AuthenticatedRequest, ErrorCode } from '../types/index.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register new publisher account
 */
router.post(
  '/register',
  validateBody(RegisterSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { username, email, password, display_name } = req.body;

      // Check for existing user
      if (db.getPublisherByUsername(username)) {
        res.status(409).json(
          createErrorResponse(
            ErrorCode.DUPLICATE_USER,
            'Username already exists',
            req.requestId
          )
        );
        return;
      }

      if (db.getPublisherByEmail(email)) {
        res.status(409).json(
          createErrorResponse(
            ErrorCode.DUPLICATE_USER,
            'Email already registered',
            req.requestId
          )
        );
        return;
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create publisher
      const publisher = db.createPublisher({
        username,
        email,
        password_hash,
        display_name: display_name || null,
        bio: null,
        avatar_url: null,
        website: null,
        github_username: null,
        verified: false,
        role: 'publisher',
        last_login_at: null,
      });

      // Generate tokens
      const accessToken = generateToken({
        userId: publisher.id,
        username: publisher.username,
        role: publisher.role,
      });

      logger.info('User registered', {
        userId: publisher.id,
        username: publisher.username,
        requestId: req.requestId,
      });

      res.status(201).json(
        createSuccessResponse({
          user: {
            id: publisher.id,
            username: publisher.username,
            email: publisher.email,
            display_name: publisher.display_name,
            role: publisher.role,
          },
          accessToken,
        })
      );
    } catch (error) {
      logger.error('Registration error', error as Error, { requestId: req.requestId });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Registration failed',
          req.requestId
        )
      );
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate user and issue JWT
 */
router.post(
  '/login',
  validateBody(LoginSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { username, password } = req.body;

      const publisher = db.getPublisherByUsername(username);

      if (!publisher) {
        res.status(401).json(
          createErrorResponse(
            ErrorCode.INVALID_CREDENTIALS,
            'Invalid username or password',
            req.requestId
          )
        );
        return;
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, publisher.password_hash);

      if (!validPassword) {
        res.status(401).json(
          createErrorResponse(
            ErrorCode.INVALID_CREDENTIALS,
            'Invalid username or password',
            req.requestId
          )
        );
        return;
      }

      // Update last login
      db.updateLastLogin(publisher.id);

      // Generate tokens
      const accessToken = generateToken({
        userId: publisher.id,
        username: publisher.username,
        role: publisher.role,
      });

      logger.info('User logged in', {
        userId: publisher.id,
        username: publisher.username,
        requestId: req.requestId,
      });

      res.json(
        createSuccessResponse({
          user: {
            id: publisher.id,
            username: publisher.username,
            email: publisher.email,
            display_name: publisher.display_name,
            role: publisher.role,
          },
          accessToken,
        })
      );
    } catch (error) {
      logger.error('Login error', error as Error, { requestId: req.requestId });
      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Login failed',
          req.requestId
        )
      );
    }
  }
);

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const publisher = db.getPublisherById(req.user!.userId);

    if (!publisher) {
      res.status(404).json(
        createErrorResponse(
          ErrorCode.USER_NOT_FOUND,
          'User not found',
          req.requestId
        )
      );
      return;
    }

    res.json(
      createSuccessResponse({
        id: publisher.id,
        username: publisher.username,
        email: publisher.email,
        display_name: publisher.display_name,
        bio: publisher.bio,
        avatar_url: publisher.avatar_url,
        website: publisher.website,
        github_username: publisher.github_username,
        verified: publisher.verified,
        role: publisher.role,
        created_at: publisher.created_at,
      })
    );
  } catch (error) {
    logger.error('Error fetching user profile', error as Error, { requestId: req.requestId });
    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch user profile',
        req.requestId
      )
    );
  }
});

export default router;
