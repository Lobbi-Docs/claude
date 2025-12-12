/**
 * @claude-sdk/tools - OAuth Handler Tool
 * Manage OAuth 2.0 authentication flows with token management and refresh
 */

import { z } from 'zod';
import { wrapExecution, withTimeout } from '../../utils/index.js';
import { SecurityError, ConfigurationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';
import * as crypto from 'crypto';

// ============================================================================
// Schema Definitions
// ============================================================================

export const OAuthConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().optional(),
  authorizationUrl: z.string().url('Must be a valid authorization URL'),
  tokenUrl: z.string().url('Must be a valid token URL'),
  redirectUri: z.string().url('Must be a valid redirect URI'),
  scope: z.array(z.string()).optional(),
  state: z.string().optional(),
  usePKCE: z.boolean().default(false),
});

export const OAuthAuthorizationCodeSchema = z.object({
  configId: z.string(),
  code: z.string().min(1, 'Authorization code is required'),
  codeVerifier: z.string().optional(), // Required if PKCE is used
});

export const OAuthClientCredentialsSchema = z.object({
  configId: z.string(),
});

export const OAuthRefreshTokenSchema = z.object({
  configId: z.string(),
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type OAuthConfigInput = z.infer<typeof OAuthConfigSchema>;
export type OAuthAuthorizationCodeInput = z.infer<typeof OAuthAuthorizationCodeSchema>;
export type OAuthClientCredentialsInput = z.infer<typeof OAuthClientCredentialsSchema>;
export type OAuthRefreshTokenInput = z.infer<typeof OAuthRefreshTokenSchema>;

export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
}

export interface OAuthConfig {
  id: string;
  config: OAuthConfigInput;
  tokens?: OAuthTokenResponse;
  createdAt: number;
  pkceChallenge?: {
    codeVerifier: string;
    codeChallenge: string;
  };
}

export interface OAuthAuthorizationUrlResponse {
  configId: string;
  authorizationUrl: string;
  state?: string;
  codeVerifier?: string; // Only if PKCE is enabled
}

// ============================================================================
// OAuth Configuration Manager
// ============================================================================

class OAuthManager {
  private static configs = new Map<string, OAuthConfig>();

  static getConfig(id: string): OAuthConfig | undefined {
    return this.configs.get(id);
  }

  static addConfig(config: OAuthConfig): void {
    this.configs.set(config.id, config);
  }

  static updateConfig(id: string, updates: Partial<OAuthConfig>): void {
    const existing = this.configs.get(id);
    if (existing) {
      this.configs.set(id, { ...existing, ...updates });
    }
  }

  static removeConfig(id: string): void {
    this.configs.delete(id);
  }

  static getAllConfigs(): OAuthConfig[] {
    return Array.from(this.configs.values());
  }

  static generateId(): string {
    return `oauth_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================================================
// PKCE Helpers
// ============================================================================

class PKCEHelper {
  /**
   * Generate code verifier (43-128 characters)
   */
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate code challenge from verifier using S256
   */
  static generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  /**
   * Generate PKCE pair
   */
  static generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }
}

// ============================================================================
// OAuth Handler Tool - Create Configuration
// ============================================================================

export class OAuthHandlerTool {
  static readonly toolName = 'oauth_create_config';
  static readonly description = 'Create OAuth 2.0 configuration for authorization_code, client_credentials, or refresh_token flows with PKCE support and scope handling';
  static readonly schema = OAuthConfigSchema;

  /**
   * Create OAuth configuration
   */
  static async execute(
    input: OAuthConfigInput,
    context?: ToolContext
  ): Promise<ToolResult<{ configId: string; usePKCE: boolean }>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      // Generate config ID
      const configId = OAuthManager.generateId();

      // Generate PKCE if enabled
      const pkceChallenge = input.usePKCE ? PKCEHelper.generatePKCE() : undefined;

      // Store configuration
      const oauthConfig: OAuthConfig = {
        id: configId,
        config: input,
        createdAt: Date.now(),
        pkceChallenge,
      };

      OAuthManager.addConfig(oauthConfig);

      ctx.logger?.info(`OAuth config created: ${configId}`, {
        clientId: input.clientId,
        usePKCE: input.usePKCE,
        scopes: input.scope?.length || 0,
      });

      return {
        configId,
        usePKCE: input.usePKCE,
      };
    }, input, context);
  }
}

// ============================================================================
// OAuth Get Authorization URL Tool
// ============================================================================

export class OAuthGetAuthorizationUrlTool {
  static readonly toolName = 'oauth_get_authorization_url';
  static readonly description = 'Get the OAuth 2.0 authorization URL to redirect users for authentication';

  static async execute(
    configId: string,
    context?: ToolContext
  ): Promise<ToolResult<OAuthAuthorizationUrlResponse>> {
    return wrapExecution(this.toolName, async (configId, _ctx) => {
      const config = OAuthManager.getConfig(configId);

      if (!config) {
        throw new ConfigurationError(
          `OAuth configuration not found: ${configId}`,
          'configId',
          configId
        );
      }

      // Build authorization URL
      const url = new URL(config.config.authorizationUrl);
      url.searchParams.set('client_id', config.config.clientId);
      url.searchParams.set('redirect_uri', config.config.redirectUri);
      url.searchParams.set('response_type', 'code');

      // Add scope if provided
      if (config.config.scope && config.config.scope.length > 0) {
        url.searchParams.set('scope', config.config.scope.join(' '));
      }

      // Add state if provided (or generate one)
      const state = config.config.state || crypto.randomBytes(16).toString('hex');
      url.searchParams.set('state', state);

      // Add PKCE challenge if enabled
      if (config.config.usePKCE && config.pkceChallenge) {
        url.searchParams.set('code_challenge', config.pkceChallenge.codeChallenge);
        url.searchParams.set('code_challenge_method', 'S256');
      }

      _ctx.logger?.info(`Authorization URL generated: ${configId}`);

      return {
        configId,
        authorizationUrl: url.toString(),
        state,
        codeVerifier: config.pkceChallenge?.codeVerifier,
      };
    }, configId, context);
  }
}

// ============================================================================
// OAuth Authorization Code Flow Tool
// ============================================================================

export class OAuthAuthorizationCodeTool {
  static readonly toolName = 'oauth_authorization_code';
  static readonly description = 'Exchange authorization code for access token (OAuth 2.0 Authorization Code flow)';
  static readonly schema = OAuthAuthorizationCodeSchema;

  static async execute(
    input: OAuthAuthorizationCodeInput,
    context?: ToolContext
  ): Promise<ToolResult<OAuthTokenResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const config = OAuthManager.getConfig(input.configId);

      if (!config) {
        throw new ConfigurationError(
          `OAuth configuration not found: ${input.configId}`,
          'configId',
          input.configId
        );
      }

      // Prepare token request
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: config.config.redirectUri,
        client_id: config.config.clientId,
      });

      // Add client secret if provided
      if (config.config.clientSecret) {
        body.set('client_secret', config.config.clientSecret);
      }

      // Add code verifier if PKCE is used
      if (config.config.usePKCE) {
        const codeVerifier = input.codeVerifier || config.pkceChallenge?.codeVerifier;
        if (!codeVerifier) {
          throw new SecurityError(
            'PKCE is enabled but code verifier is missing',
            'INVALID_TOKEN'
          );
        }
        body.set('code_verifier', codeVerifier);
      }

      // Execute token request
      const tokenResponse = await this.executeTokenRequest(
        config.config.tokenUrl,
        body,
        ctx
      );

      // Store tokens
      OAuthManager.updateConfig(input.configId, { tokens: tokenResponse });

      ctx.logger?.info(`Access token obtained: ${input.configId}`, {
        expiresIn: tokenResponse.expiresIn,
        hasRefreshToken: !!tokenResponse.refreshToken,
      });

      return tokenResponse;
    }, input, context);
  }

  /**
   * Execute token request
   */
  private static async executeTokenRequest(
    tokenUrl: string,
    body: URLSearchParams,
    _ctx: ToolContext
  ): Promise<OAuthTokenResponse> {
    const response = await withTimeout(
      'OAuth token request',
      async () => {
        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': '@claude-sdk/tools/oauth-handler',
          },
          body: body.toString(),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new SecurityError(
            `OAuth token request failed: ${res.status} ${res.statusText}`,
            'UNAUTHORIZED',
            { status: res.status, response: errorText }
          );
        }

        return res;
      },
      30000
    );

    const data = await response.json() as {
      access_token: string;
      token_type?: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
    };

    // Calculate expiration timestamp
    const expiresAt = data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      scope: data.scope,
      expiresAt,
    };
  }
}

// ============================================================================
// OAuth Client Credentials Flow Tool
// ============================================================================

export class OAuthClientCredentialsTool {
  static readonly toolName = 'oauth_client_credentials';
  static readonly description = 'Obtain access token using client credentials (OAuth 2.0 Client Credentials flow)';
  static readonly schema = OAuthClientCredentialsSchema;

  static async execute(
    input: OAuthClientCredentialsInput,
    context?: ToolContext
  ): Promise<ToolResult<OAuthTokenResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const config = OAuthManager.getConfig(input.configId);

      if (!config) {
        throw new ConfigurationError(
          `OAuth configuration not found: ${input.configId}`,
          'configId',
          input.configId
        );
      }

      if (!config.config.clientSecret) {
        throw new SecurityError(
          'Client credentials flow requires client secret',
          'INVALID_TOKEN'
        );
      }

      // Prepare token request
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.config.clientId,
        client_secret: config.config.clientSecret,
      });

      // Add scope if provided
      if (config.config.scope && config.config.scope.length > 0) {
        body.set('scope', config.config.scope.join(' '));
      }

      // Execute token request
      const tokenResponse = await OAuthAuthorizationCodeTool['executeTokenRequest'](
        config.config.tokenUrl,
        body,
        ctx
      );

      // Store tokens
      OAuthManager.updateConfig(input.configId, { tokens: tokenResponse });

      ctx.logger?.info(`Client credentials token obtained: ${input.configId}`, {
        expiresIn: tokenResponse.expiresIn,
      });

      return tokenResponse;
    }, input, context);
  }
}

// ============================================================================
// OAuth Refresh Token Flow Tool
// ============================================================================

export class OAuthRefreshTokenTool {
  static readonly toolName = 'oauth_refresh_token';
  static readonly description = 'Refresh access token using refresh token (OAuth 2.0 Refresh Token flow)';
  static readonly schema = OAuthRefreshTokenSchema;

  static async execute(
    input: OAuthRefreshTokenInput,
    context?: ToolContext
  ): Promise<ToolResult<OAuthTokenResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const config = OAuthManager.getConfig(input.configId);

      if (!config) {
        throw new ConfigurationError(
          `OAuth configuration not found: ${input.configId}`,
          'configId',
          input.configId
        );
      }

      // Prepare token request
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: input.refreshToken,
        client_id: config.config.clientId,
      });

      // Add client secret if provided
      if (config.config.clientSecret) {
        body.set('client_secret', config.config.clientSecret);
      }

      // Execute token request
      const tokenResponse = await OAuthAuthorizationCodeTool['executeTokenRequest'](
        config.config.tokenUrl,
        body,
        ctx
      );

      // Store new tokens (preserve refresh token if not returned)
      const updatedTokens: OAuthTokenResponse = {
        ...tokenResponse,
        refreshToken: tokenResponse.refreshToken || input.refreshToken,
      };

      OAuthManager.updateConfig(input.configId, { tokens: updatedTokens });

      ctx.logger?.info(`Token refreshed: ${input.configId}`, {
        expiresIn: tokenResponse.expiresIn,
      });

      return updatedTokens;
    }, input, context);
  }
}

// ============================================================================
// OAuth Get Token Tool
// ============================================================================

export class OAuthGetTokenTool {
  static readonly toolName = 'oauth_get_token';
  static readonly description = 'Get the current access token from stored OAuth configuration';

  static async execute(
    configId: string,
    context?: ToolContext
  ): Promise<ToolResult<OAuthTokenResponse>> {
    return wrapExecution(this.toolName, async (configId, ctx) => {
      const config = OAuthManager.getConfig(configId);

      if (!config) {
        throw new ConfigurationError(
          `OAuth configuration not found: ${configId}`,
          'configId',
          configId
        );
      }

      if (!config.tokens) {
        throw new SecurityError(
          'No tokens available. Please authenticate first.',
          'INVALID_TOKEN'
        );
      }

      // Check if token is expired
      if (config.tokens.expiresAt && config.tokens.expiresAt < Date.now()) {
        ctx.logger?.warn(`Token expired: ${configId}`, {
          expiresAt: new Date(config.tokens.expiresAt).toISOString(),
        });

        // Auto-refresh if refresh token is available
        if (config.tokens.refreshToken) {
          ctx.logger?.info(`Auto-refreshing token: ${configId}`);
          const refreshResult = await OAuthRefreshTokenTool.execute(
            { configId, refreshToken: config.tokens.refreshToken },
            context
          );

          if (refreshResult.success && refreshResult.data) {
            return refreshResult.data;
          }
        }

        throw new SecurityError(
          'Access token expired and could not be refreshed',
          'EXPIRED_TOKEN'
        );
      }

      return config.tokens;
    }, configId, context);
  }
}
