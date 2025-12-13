/**
 * Authentication Middleware
 *
 * This module establishes JWT-based authentication with role-based access control,
 * enabling secure API access while maintaining stateless scalability.
 *
 * Business Value:
 * - Protects sensitive endpoints from unauthorized access
 * - Enables fine-grained permission control for plugin publishing
 * - Stateless design supports horizontal scaling
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthenticatedRequest, JwtPayload, ErrorCode } from '../types/index.js';
import { createErrorResponse } from '../utils/response.js';

/**
 * Verify JWT token and attach user context to request
 *
 * WHY: Middleware pattern enables consistent authentication across all protected
 * endpoints without code duplication, improving maintainability.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json(
      createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'No authorization token provided',
        authReq.requestId
      )
    );
    return;
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json(
      createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Invalid authorization header format. Expected: Bearer <token>',
        authReq.requestId
      )
    );
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    authReq.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json(
        createErrorResponse(
          ErrorCode.TOKEN_EXPIRED,
          'Authentication token has expired',
          authReq.requestId,
          { expiredAt: error.expiredAt }
        )
      );
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json(
        createErrorResponse(
          ErrorCode.TOKEN_INVALID,
          'Invalid authentication token',
          authReq.requestId
        )
      );
      return;
    }

    res.status(500).json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Error verifying authentication token',
        authReq.requestId
      )
    );
  }
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 *
 * WHY: Enables personalized responses for authenticated users while keeping
 * endpoints public for broader access.
 */
export function optionalAuthentication(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    authReq.user = decoded;
  } catch {
    // Silently fail for optional auth - user remains undefined
  }

  next();
}

/**
 * Require specific role for access
 *
 * WHY: Role-based access control enables fine-grained permissions without
 * hardcoding authorization logic in route handlers.
 *
 * @param roles - Array of allowed roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json(
        createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          authReq.requestId
        )
      );
      return;
    }

    if (!roles.includes(authReq.user.role)) {
      res.status(403).json(
        createErrorResponse(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          `Access denied. Required role: ${roles.join(' or ')}`,
          authReq.requestId,
          { userRole: authReq.user.role, requiredRoles: roles }
        )
      );
      return;
    }

    next();
  };
}

/**
 * Generate JWT token for user
 *
 * WHY: Centralizing token generation ensures consistent token structure and
 * expiration policies across all authentication flows.
 *
 * @param payload - User data to encode in token
 * @returns Signed JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Generate refresh token with extended expiration
 *
 * WHY: Refresh tokens enable seamless token rotation without requiring users
 * to re-authenticate, improving user experience while maintaining security.
 *
 * @param payload - User data to encode in token
 * @returns Signed refresh token
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.refreshTokenExpiresIn,
  });
}
