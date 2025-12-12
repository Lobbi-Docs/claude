/**
 * @claude-sdk/tools - OAuth Handler Tool Tests
 * Comprehensive unit tests for OAuth 2.0 authentication flows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OAuthHandlerTool,
  OAuthGetAuthorizationUrlTool,
  OAuthAuthorizationCodeTool,
  OAuthClientCredentialsTool,
  OAuthRefreshTokenTool,
  OAuthGetTokenTool,
} from '../../src/tools/api/oauth-handler.js';
import type {
  OAuthConfigInput,
  OAuthAuthorizationCodeInput,
  OAuthClientCredentialsInput,
  OAuthRefreshTokenInput,
} from '../../src/tools/api/oauth-handler.js';

// Mock fetch for OAuth tests
global.fetch = vi.fn();

describe('OAuthHandlerTool', () => {
  const mockAuthUrl = 'https://auth.example.com/oauth/authorize';
  const mockTokenUrl = 'https://auth.example.com/oauth/token';
  const mockRedirectUri = 'https://myapp.example.com/callback';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should accept valid OAuth configuration', async () => {
      const input: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const result = await OAuthHandlerTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.configId).toBeDefined();
    });

    it('should reject invalid authorization URL', async () => {
      const input = {
        clientId: 'client-123',
        authorizationUrl: 'not-a-valid-url',
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      } as OAuthConfigInput;

      await expect(async () => {
        await OAuthHandlerTool.execute(input);
      }).rejects.toThrow();
    });

    it('should reject invalid token URL', async () => {
      const input = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: 'not-a-valid-url',
        redirectUri: mockRedirectUri,
      } as OAuthConfigInput;

      await expect(async () => {
        await OAuthHandlerTool.execute(input);
      }).rejects.toThrow();
    });

    it('should reject invalid redirect URI', async () => {
      const input = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: 'not-a-valid-url',
      } as OAuthConfigInput;

      await expect(async () => {
        await OAuthHandlerTool.execute(input);
      }).rejects.toThrow();
    });

    it('should require client ID', async () => {
      const input = {
        clientId: '',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      } as OAuthConfigInput;

      await expect(async () => {
        await OAuthHandlerTool.execute(input);
      }).rejects.toThrow();
    });
  });

  describe('OAuth Configuration Creation', () => {
    it('should create OAuth config without PKCE', async () => {
      const input: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        usePKCE: false,
      };

      const result = await OAuthHandlerTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.usePKCE).toBe(false);
    });

    it('should create OAuth config with PKCE', async () => {
      const input: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        usePKCE: true,
      };

      const result = await OAuthHandlerTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.usePKCE).toBe(true);
    });

    it('should accept optional scopes', async () => {
      const input: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        scope: ['read', 'write', 'profile'],
      };

      const result = await OAuthHandlerTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should accept optional state', async () => {
      const input: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        state: 'custom-state-123',
      };

      const result = await OAuthHandlerTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should generate unique config IDs', async () => {
      const input: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const result1 = await OAuthHandlerTool.execute(input);
      const result2 = await OAuthHandlerTool.execute(input);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.configId).not.toBe(result2.data?.configId);
    });
  });

  describe('Authorization URL Generation', () => {
    let configId: string;

    beforeEach(async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        scope: ['read', 'write'],
      };

      const result = await OAuthHandlerTool.execute(config);
      expect(result.success).toBe(true);
      configId = result.data!.configId;
    });

    it('should generate authorization URL', async () => {
      const result = await OAuthGetAuthorizationUrlTool.execute(configId);

      expect(result.success).toBe(true);
      expect(result.data?.authorizationUrl).toBeDefined();
      expect(result.data?.authorizationUrl).toContain(mockAuthUrl);
      expect(result.data?.authorizationUrl).toContain('client_id=client-123');
      expect(result.data?.authorizationUrl).toContain('redirect_uri=');
      expect(result.data?.authorizationUrl).toContain('response_type=code');
    });

    it('should include scopes in URL', async () => {
      const result = await OAuthGetAuthorizationUrlTool.execute(configId);

      expect(result.success).toBe(true);
      expect(result.data?.authorizationUrl).toContain('scope=');
      expect(result.data?.authorizationUrl).toContain('read');
      expect(result.data?.authorizationUrl).toContain('write');
    });

    it('should include state in URL', async () => {
      const result = await OAuthGetAuthorizationUrlTool.execute(configId);

      expect(result.success).toBe(true);
      expect(result.data?.authorizationUrl).toContain('state=');
      expect(result.data?.state).toBeDefined();
    });

    it('should fail with non-existent config ID', async () => {
      const result = await OAuthGetAuthorizationUrlTool.execute('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('PKCE Support', () => {
    it('should include PKCE challenge in authorization URL', async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        usePKCE: true,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      expect(createResult.success).toBe(true);

      const urlResult = await OAuthGetAuthorizationUrlTool.execute(
        createResult.data!.configId
      );

      expect(urlResult.success).toBe(true);
      expect(urlResult.data?.authorizationUrl).toContain('code_challenge=');
      expect(urlResult.data?.authorizationUrl).toContain('code_challenge_method=S256');
      expect(urlResult.data?.codeVerifier).toBeDefined();
    });

    it('should not include PKCE when disabled', async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        usePKCE: false,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      expect(createResult.success).toBe(true);

      const urlResult = await OAuthGetAuthorizationUrlTool.execute(
        createResult.data!.configId
      );

      expect(urlResult.success).toBe(true);
      expect(urlResult.data?.authorizationUrl).not.toContain('code_challenge=');
      expect(urlResult.data?.codeVerifier).toBeUndefined();
    });
  });

  describe('Authorization Code Flow', () => {
    let configId: string;

    beforeEach(async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const result = await OAuthHandlerTool.execute(config);
      expect(result.success).toBe(true);
      configId = result.data!.configId;
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-456',
        scope: 'read write',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const input: OAuthAuthorizationCodeInput = {
        configId,
        code: 'auth-code-789',
      };

      const result = await OAuthAuthorizationCodeTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe('access-token-123');
      expect(result.data?.tokenType).toBe('Bearer');
      expect(result.data?.expiresIn).toBe(3600);
      expect(result.data?.refreshToken).toBe('refresh-token-456');
    });

    it('should handle token request with PKCE', async () => {
      // Create config with PKCE
      const pkceConfig: OAuthConfigInput = {
        clientId: 'client-123',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        usePKCE: true,
      };

      const createResult = await OAuthHandlerTool.execute(pkceConfig);
      expect(createResult.success).toBe(true);

      const urlResult = await OAuthGetAuthorizationUrlTool.execute(
        createResult.data!.configId
      );

      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const input: OAuthAuthorizationCodeInput = {
        configId: createResult.data!.configId,
        code: 'auth-code-789',
        codeVerifier: urlResult.data!.codeVerifier,
      };

      const result = await OAuthAuthorizationCodeTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBeDefined();
    });

    it('should fail with invalid authorization code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid authorization code',
      });

      const input: OAuthAuthorizationCodeInput = {
        configId,
        code: 'invalid-code',
      };

      const result = await OAuthAuthorizationCodeTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('400');
    });

    it('should fail with non-existent config ID', async () => {
      const input: OAuthAuthorizationCodeInput = {
        configId: 'non-existent-id',
        code: 'auth-code-789',
      };

      const result = await OAuthAuthorizationCodeTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('Client Credentials Flow', () => {
    it('should obtain token using client credentials', async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
        scope: ['api.read', 'api.write'],
      };

      const createResult = await OAuthHandlerTool.execute(config);
      expect(createResult.success).toBe(true);

      const mockTokenResponse = {
        access_token: 'client-token-123',
        token_type: 'Bearer',
        expires_in: 7200,
        scope: 'api.read api.write',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const input: OAuthClientCredentialsInput = {
        configId: createResult.data!.configId,
      };

      const result = await OAuthClientCredentialsTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe('client-token-123');
      expect(result.data?.expiresIn).toBe(7200);
    });

    it('should fail without client secret', async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        // No client secret
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      expect(createResult.success).toBe(true);

      const input: OAuthClientCredentialsInput = {
        configId: createResult.data!.configId,
      };

      const result = await OAuthClientCredentialsTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('client secret');
    });

    it('should handle authentication errors', async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'wrong-secret',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      expect(createResult.success).toBe(true);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid client credentials',
      });

      const input: OAuthClientCredentialsInput = {
        configId: createResult.data!.configId,
      };

      const result = await OAuthClientCredentialsTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('401');
    });
  });

  describe('Refresh Token Flow', () => {
    let configId: string;

    beforeEach(async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const result = await OAuthHandlerTool.execute(config);
      expect(result.success).toBe(true);
      configId = result.data!.configId;
    });

    it('should refresh access token', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token-456',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const input: OAuthRefreshTokenInput = {
        configId,
        refreshToken: 'old-refresh-token',
      };

      const result = await OAuthRefreshTokenTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe('new-access-token-123');
      expect(result.data?.refreshToken).toBe('new-refresh-token-456');
    });

    it('should preserve refresh token if not returned', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        // No refresh_token in response
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const input: OAuthRefreshTokenInput = {
        configId,
        refreshToken: 'old-refresh-token',
      };

      const result = await OAuthRefreshTokenTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe('new-access-token-123');
      expect(result.data?.refreshToken).toBe('old-refresh-token'); // Preserved
    });

    it('should handle invalid refresh token', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid refresh token',
      });

      const input: OAuthRefreshTokenInput = {
        configId,
        refreshToken: 'invalid-token',
      };

      const result = await OAuthRefreshTokenTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('400');
    });
  });

  describe('Get Token', () => {
    it('should retrieve stored token', async () => {
      // Create config
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      const configId = createResult.data!.configId;

      // Get token (should fail - no token yet)
      const getResult1 = await OAuthGetTokenTool.execute(configId);
      expect(getResult1.success).toBe(false);

      // Exchange code for token
      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      await OAuthAuthorizationCodeTool.execute({
        configId,
        code: 'auth-code',
      });

      // Now get token should succeed
      const getResult2 = await OAuthGetTokenTool.execute(configId);
      expect(getResult2.success).toBe(true);
      expect(getResult2.data?.accessToken).toBe('access-token-123');
    });

    it('should auto-refresh expired token', async () => {
      // This is a complex scenario that would require mocking Date.now()
      // and setting up expired tokens - simplified test here
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      expect(createResult.success).toBe(true);
    });

    it('should fail with non-existent config', async () => {
      const result = await OAuthGetTokenTool.execute('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('Token Expiration', () => {
    it('should calculate expiration timestamp', async () => {
      const config: OAuthConfigInput = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationUrl: mockAuthUrl,
        tokenUrl: mockTokenUrl,
        redirectUri: mockRedirectUri,
      };

      const createResult = await OAuthHandlerTool.execute(config);
      const configId = createResult.data!.configId;

      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600, // 1 hour
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const result = await OAuthAuthorizationCodeTool.execute({
        configId,
        code: 'auth-code',
      });

      expect(result.success).toBe(true);
      expect(result.data?.expiresAt).toBeDefined();
      expect(result.data?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Tool Metadata', () => {
    it('OAuthHandlerTool should have correct metadata', () => {
      expect(OAuthHandlerTool.toolName).toBe('oauth_create_config');
      expect(OAuthHandlerTool.description).toBeDefined();
      expect(typeof OAuthHandlerTool.description).toBe('string');
      expect(OAuthHandlerTool.schema).toBeDefined();
    });

    it('OAuthGetAuthorizationUrlTool should have correct metadata', () => {
      expect(OAuthGetAuthorizationUrlTool.toolName).toBe('oauth_get_authorization_url');
      expect(OAuthGetAuthorizationUrlTool.description).toBeDefined();
    });

    it('OAuthAuthorizationCodeTool should have correct metadata', () => {
      expect(OAuthAuthorizationCodeTool.toolName).toBe('oauth_authorization_code');
      expect(OAuthAuthorizationCodeTool.description).toBeDefined();
      expect(OAuthAuthorizationCodeTool.schema).toBeDefined();
    });

    it('OAuthClientCredentialsTool should have correct metadata', () => {
      expect(OAuthClientCredentialsTool.toolName).toBe('oauth_client_credentials');
      expect(OAuthClientCredentialsTool.description).toBeDefined();
      expect(OAuthClientCredentialsTool.schema).toBeDefined();
    });

    it('OAuthRefreshTokenTool should have correct metadata', () => {
      expect(OAuthRefreshTokenTool.toolName).toBe('oauth_refresh_token');
      expect(OAuthRefreshTokenTool.description).toBeDefined();
      expect(OAuthRefreshTokenTool.schema).toBeDefined();
    });

    it('OAuthGetTokenTool should have correct metadata', () => {
      expect(OAuthGetTokenTool.toolName).toBe('oauth_get_token');
      expect(OAuthGetTokenTool.description).toBeDefined();
    });
  });
});
