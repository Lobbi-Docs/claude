/**
 * @claude-sdk/tools - WebSocket Client Tool
 * Manage WebSocket connections with message queue and reconnection logic
 */

import { z } from 'zod';
import { wrapExecution, withTimeout } from '../../utils/index.js';
import { NetworkError, TimeoutError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';
import { WebSocket } from 'ws';

// ============================================================================
// Schema Definitions
// ============================================================================

export const WebSocketConnectSchema = z.object({
  url: z.string().url('Must be a valid WebSocket URL'),
  protocols: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().int().positive().default(10000),
  reconnect: z.boolean().default(true),
  reconnectDelay: z.number().int().positive().default(1000),
  reconnectAttempts: z.number().int().min(0).default(5),
  heartbeatInterval: z.number().int().positive().optional(),
  heartbeatMessage: z.string().default('ping'),
});

export const WebSocketSendSchema = z.object({
  connectionId: z.string(),
  message: z.union([z.string(), z.record(z.unknown())]),
  timeout: z.number().int().positive().default(5000),
});

export const WebSocketCloseSchema = z.object({
  connectionId: z.string(),
  code: z.number().int().min(1000).max(4999).default(1000),
  reason: z.string().optional(),
});

export type WebSocketConnectInput = z.infer<typeof WebSocketConnectSchema>;
export type WebSocketSendInput = z.infer<typeof WebSocketSendSchema>;
export type WebSocketCloseInput = z.infer<typeof WebSocketCloseSchema>;

export interface WebSocketConnection {
  id: string;
  url: string;
  state: 'connecting' | 'open' | 'closing' | 'closed';
  socket: WebSocket;
  messageQueue: Array<{ message: string; timestamp: number }>;
  reconnectAttempt: number;
  heartbeatTimer?: NodeJS.Timeout;
}

export interface WebSocketConnectResponse {
  connectionId: string;
  url: string;
  state: string;
  protocols?: string;
}

export interface WebSocketSendResponse {
  connectionId: string;
  sent: boolean;
  queuedMessages: number;
}

export interface WebSocketCloseResponse {
  connectionId: string;
  code: number;
  reason?: string;
  wasClean: boolean;
}

// ============================================================================
// WebSocket Connection Manager
// ============================================================================

class WebSocketManager {
  private static connections = new Map<string, WebSocketConnection>();

  static getConnection(id: string): WebSocketConnection | undefined {
    return this.connections.get(id);
  }

  static addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.id, connection);
  }

  static removeConnection(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      if (connection.heartbeatTimer) {
        clearInterval(connection.heartbeatTimer);
      }
      this.connections.delete(id);
    }
  }

  static getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  static generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================================================
// WebSocket Client Tool - Connect
// ============================================================================

export class WebSocketClientTool {
  static readonly toolName = 'websocket_connect';
  static readonly description = 'Connect to a WebSocket server with support for protocols, headers, reconnection logic, and heartbeat/ping-pong';
  static readonly schema = WebSocketConnectSchema;

  /**
   * Connect to WebSocket server
   */
  static async execute(
    input: WebSocketConnectInput,
    context?: ToolContext
  ): Promise<ToolResult<WebSocketConnectResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const connectionId = WebSocketManager.generateId();

      // Create WebSocket connection
      const socket = new WebSocket(input.url, input.protocols, {
        headers: input.headers,
      });

      const connection: WebSocketConnection = {
        id: connectionId,
        url: input.url,
        state: 'connecting',
        socket,
        messageQueue: [],
        reconnectAttempt: 0,
      };

      WebSocketManager.addConnection(connection);

      // Wait for connection to open
      await withTimeout(
        'WebSocket connection',
        () => new Promise<void>((resolve, reject) => {
          socket.on('open', () => {
            connection.state = 'open';
            ctx.logger?.info(`WebSocket connected: ${connectionId}`, { url: input.url });

            // Setup heartbeat if configured
            if (input.heartbeatInterval) {
              connection.heartbeatTimer = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(input.heartbeatMessage);
                  ctx.logger?.debug(`Heartbeat sent: ${connectionId}`);
                }
              }, input.heartbeatInterval);
            }

            resolve();
          });

          socket.on('error', (error) => {
            connection.state = 'closed';
            ctx.logger?.error(`WebSocket error: ${connectionId}`, error);
            reject(new NetworkError(
              `WebSocket connection failed: ${error.message}`,
              undefined,
              input.url,
              'WEBSOCKET'
            ));
          });

          socket.on('close', (code, reason) => {
            connection.state = 'closed';
            ctx.logger?.info(`WebSocket closed: ${connectionId}`, { code, reason: reason.toString() });

            // Handle reconnection
            if (
              input.reconnect &&
              connection.reconnectAttempt < input.reconnectAttempts &&
              code !== 1000 // Normal closure
            ) {
              connection.reconnectAttempt++;
              const delay = input.reconnectDelay * connection.reconnectAttempt;
              ctx.logger?.info(`Reconnecting in ${delay}ms (attempt ${connection.reconnectAttempt})`);

              setTimeout(() => {
                this.execute(input, context);
              }, delay);
            } else {
              WebSocketManager.removeConnection(connectionId);
            }
          });

          socket.on('message', (data) => {
            // Store received messages in queue
            connection.messageQueue.push({
              message: data.toString(),
              timestamp: Date.now(),
            });

            ctx.logger?.debug(`Message received: ${connectionId}`, {
              size: data.toString().length,
              queueSize: connection.messageQueue.length,
            });
          });
        }),
        input.timeout
      );

      return {
        connectionId,
        url: input.url,
        state: connection.state,
        protocols: socket.protocol,
      };
    }, input, context);
  }
}

// ============================================================================
// WebSocket Send Tool
// ============================================================================

export class WebSocketSendTool {
  static readonly toolName = 'websocket_send';
  static readonly description = 'Send a message through an established WebSocket connection';
  static readonly schema = WebSocketSendSchema;

  /**
   * Send message through WebSocket
   */
  static async execute(
    input: WebSocketSendInput,
    context?: ToolContext
  ): Promise<ToolResult<WebSocketSendResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const connection = WebSocketManager.getConnection(input.connectionId);

      if (!connection) {
        throw new NetworkError(
          `WebSocket connection not found: ${input.connectionId}`,
          undefined,
          undefined,
          'WEBSOCKET'
        );
      }

      if (connection.state !== 'open') {
        throw new NetworkError(
          `WebSocket connection is not open: ${connection.state}`,
          undefined,
          connection.url,
          'WEBSOCKET'
        );
      }

      // Prepare message
      const message = typeof input.message === 'string'
        ? input.message
        : JSON.stringify(input.message);

      // Send message
      await withTimeout(
        'WebSocket send',
        () => new Promise<void>((resolve, reject) => {
          connection.socket.send(message, (error) => {
            if (error) {
              reject(new NetworkError(
                `Failed to send WebSocket message: ${error.message}`,
                undefined,
                connection.url,
                'WEBSOCKET'
              ));
            } else {
              ctx.logger?.debug(`Message sent: ${input.connectionId}`, { size: message.length });
              resolve();
            }
          });
        }),
        input.timeout
      );

      return {
        connectionId: input.connectionId,
        sent: true,
        queuedMessages: connection.messageQueue.length,
      };
    }, input, context);
  }
}

// ============================================================================
// WebSocket Close Tool
// ============================================================================

export class WebSocketCloseTool {
  static readonly toolName = 'websocket_close';
  static readonly description = 'Close an established WebSocket connection';
  static readonly schema = WebSocketCloseSchema;

  /**
   * Close WebSocket connection
   */
  static async execute(
    input: WebSocketCloseInput,
    context?: ToolContext
  ): Promise<ToolResult<WebSocketCloseResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const connection = WebSocketManager.getConnection(input.connectionId);

      if (!connection) {
        throw new NetworkError(
          `WebSocket connection not found: ${input.connectionId}`,
          undefined,
          undefined,
          'WEBSOCKET'
        );
      }

      connection.state = 'closing';

      // Close the connection
      await new Promise<WebSocketCloseResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new TimeoutError('WebSocket close', 5000));
        }, 5000);

        connection.socket.once('close', (code, reason) => {
          clearTimeout(timeout);
          WebSocketManager.removeConnection(input.connectionId);

          ctx.logger?.info(`WebSocket closed: ${input.connectionId}`, {
            code,
            reason: reason.toString(),
          });

          resolve({
            connectionId: input.connectionId,
            code,
            reason: reason.toString() || input.reason,
            wasClean: code === 1000,
          });
        });

        connection.socket.close(input.code, input.reason);
      });

      return {
        connectionId: input.connectionId,
        code: input.code,
        reason: input.reason,
        wasClean: input.code === 1000,
      };
    }, input, context);
  }
}

// ============================================================================
// WebSocket Receive Tool
// ============================================================================

export class WebSocketReceiveTool {
  static readonly toolName = 'websocket_receive';
  static readonly description = 'Receive messages from WebSocket connection queue';

  static async execute(
    connectionId: string,
    maxMessages: number = 10,
    context?: ToolContext
  ): Promise<ToolResult<Array<{ message: string; timestamp: number }>>> {
    return wrapExecution(this.toolName, async (_, ctx) => {
      const connection = WebSocketManager.getConnection(connectionId);

      if (!connection) {
        throw new NetworkError(
          `WebSocket connection not found: ${connectionId}`,
          undefined,
          undefined,
          'WEBSOCKET'
        );
      }

      // Get messages from queue
      const messages = connection.messageQueue.splice(0, maxMessages);

      ctx.logger?.debug(`Messages received: ${connectionId}`, {
        count: messages.length,
        remaining: connection.messageQueue.length,
      });

      return messages;
    }, connectionId, context);
  }
}
