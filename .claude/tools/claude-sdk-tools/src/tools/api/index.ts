/**
 * @claude-sdk/tools - API Integration Tools
 * Complete suite of tools for HTTP, GraphQL, WebSocket, REST API building, and OAuth
 */

// HTTP Client
export {
  HttpClientTool,
  HttpClientSchema,
  type HttpClientInput,
  type HttpClientResponse,
} from './http-client.js';

// GraphQL Client
export {
  GraphqlClientTool,
  GraphqlClientSchema,
  type GraphqlClientInput,
  type GraphqlClientResponse,
  type GraphqlError,
} from './graphql-client.js';

// WebSocket Client
export {
  WebSocketClientTool,
  WebSocketSendTool,
  WebSocketCloseTool,
  WebSocketReceiveTool,
  WebSocketConnectSchema,
  WebSocketConnectSchema as WebSocketClientSchema, // Alias for main index
  WebSocketSendSchema,
  WebSocketCloseSchema,
  type WebSocketConnectInput,
  type WebSocketSendInput,
  type WebSocketCloseInput,
  type WebSocketConnection,
  type WebSocketConnectResponse,
  type WebSocketSendResponse,
  type WebSocketCloseResponse,
} from './websocket-client.js';

// REST API Builder
export {
  RestApiBuilderTool,
  RestApiRequestTool,
  RestApiDeleteTool,
  RestApiConfigSchema,
  RestApiConfigSchema as RestApiBuilderSchema, // Alias for main index
  RestApiRequestSchema,
  type RestApiConfigInput,
  type RestApiRequestInput,
  type RestApiConfig,
  type RestApiCreateResponse,
} from './rest-api-builder.js';

// OAuth Handler
export {
  OAuthHandlerTool,
  OAuthGetAuthorizationUrlTool,
  OAuthAuthorizationCodeTool,
  OAuthClientCredentialsTool,
  OAuthRefreshTokenTool,
  OAuthGetTokenTool,
  OAuthConfigSchema,
  OAuthConfigSchema as OAuthHandlerSchema, // Alias for main index
  OAuthAuthorizationCodeSchema,
  OAuthClientCredentialsSchema,
  OAuthRefreshTokenSchema,
  type OAuthConfigInput,
  type OAuthAuthorizationCodeInput,
  type OAuthClientCredentialsInput,
  type OAuthRefreshTokenInput,
  type OAuthTokenResponse,
  type OAuthConfig,
  type OAuthAuthorizationUrlResponse,
} from './oauth-handler.js';

// Re-import for array
import { HttpClientTool } from './http-client.js';
import { GraphqlClientTool } from './graphql-client.js';
import {
  WebSocketClientTool,
  WebSocketSendTool,
  WebSocketCloseTool,
  WebSocketReceiveTool,
} from './websocket-client.js';
import {
  RestApiBuilderTool,
  RestApiRequestTool,
  RestApiDeleteTool,
} from './rest-api-builder.js';
import {
  OAuthHandlerTool,
  OAuthGetAuthorizationUrlTool,
  OAuthAuthorizationCodeTool,
  OAuthClientCredentialsTool,
  OAuthRefreshTokenTool,
  OAuthGetTokenTool,
} from './oauth-handler.js';

// Tool definitions for MCP registration
export const API_TOOLS = [
  HttpClientTool,
  GraphqlClientTool,
  WebSocketClientTool,
  WebSocketSendTool,
  WebSocketCloseTool,
  WebSocketReceiveTool,
  RestApiBuilderTool,
  RestApiRequestTool,
  RestApiDeleteTool,
  OAuthHandlerTool,
  OAuthGetAuthorizationUrlTool,
  OAuthAuthorizationCodeTool,
  OAuthClientCredentialsTool,
  OAuthRefreshTokenTool,
  OAuthGetTokenTool,
] as const;

export type ApiToolType = typeof API_TOOLS[number];
