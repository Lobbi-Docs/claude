/**
 * WebSocket Server - Agent Playground server
 *
 * Features:
 * - HTTP server with WebSocket upgrade
 * - Session management (multiple concurrent users)
 * - Message routing and queuing
 * - Heartbeat/keepalive handling
 * - Graceful shutdown
 */

import { createServer, IncomingMessage, Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './session-manager.js';
import { Debugger } from './debugger.js';
import { Executor } from './executor.js';
import { Recorder } from './recorder.js';
import {
  parseClientMessage,
  MessageBuilder,
  type ClientMessage,
  type ServerMessage
} from './protocol.js';

/**
 * Server configuration
 */
export interface ServerConfig {
  port?: number;
  host?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  enableCors?: boolean;
}

/**
 * Connected client
 */
interface Client {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  sessionIds: Set<string>;
  messageQueue: ServerMessage[];
}

/**
 * Playground Server
 */
export class PlaygroundServer {
  private httpServer: HTTPServer;
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  private sessionManager: SessionManager;
  private debugger: Debugger;
  private executor: Executor;
  private recorder: Recorder;

  private readonly config: Required<ServerConfig>;

  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port ?? 8765,
      host: config.host ?? '0.0.0.0',
      maxConnections: config.maxConnections ?? 100,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageQueueSize: config.messageQueueSize ?? 1000,
      enableCors: config.enableCors ?? true
    };

    // Initialize components
    this.sessionManager = new SessionManager();
    this.debugger = new Debugger();
    this.executor = new Executor(this.sessionManager, this.debugger);
    this.recorder = new Recorder();

    // Create HTTP server
    this.httpServer = createServer(this.handleHttpRequest.bind(this));

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: '/ws',
      maxPayload: 10 * 1024 * 1024 // 10MB
    });

    this.setupWebSocketHandlers();
  }

  // ===== Server Lifecycle =====

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.listen(this.config.port, this.config.host, () => {
          console.log(`Playground server listening on ${this.config.host}:${this.config.port}`);
          console.log(`WebSocket endpoint: ws://${this.config.host}:${this.config.port}/ws`);

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        });

        this.httpServer.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    console.log('Shutting down playground server...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all WebSocket connections
    this.clients.forEach(client => {
      client.ws.close(1000, 'Server shutting down');
    });

    // Close WebSocket server
    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve());
    });

    // Close recorder database
    this.recorder.close();

    console.log('Server shut down gracefully');
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean;
    connections: number;
    sessions: any;
    executions: any;
    recordings: any;
  } {
    return {
      running: this.httpServer.listening,
      connections: this.clients.size,
      sessions: this.sessionManager.getStatistics(),
      executions: this.executor.getStatistics(),
      recordings: this.recorder.getStatistics()
    };
  }

  // ===== HTTP Handling =====

  /**
   * Handle HTTP requests
   */
  private handleHttpRequest(req: IncomingMessage, res: any): void {
    // CORS headers
    if (this.config.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStatus()));
      return;
    }

    // Status endpoint
    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStatus()));
      return;
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Agent Playground Server\n\nConnect via WebSocket: ws://' + req.headers.host + '/ws');
  }

  // ===== WebSocket Handling =====

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    // Check max connections
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1008, 'Server at capacity');
      return;
    }

    // Create client
    const clientId = this.generateClientId();
    const client: Client = {
      id: clientId,
      ws,
      isAlive: true,
      sessionIds: new Set(),
      messageQueue: []
    };

    this.clients.set(clientId, client);
    console.log(`Client connected: ${clientId} (${this.clients.size} total)`);

    // Setup event handlers
    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error: Error) => {
      console.error(`Client ${clientId} error:`, error);
      this.handleDisconnection(clientId);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());
      const parsed = parseClientMessage(message);

      if (!parsed) {
        this.sendMessage(client, MessageBuilder.error('Invalid message format'));
        return;
      }

      this.routeMessage(client, parsed);
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendMessage(client, MessageBuilder.error(
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }

  /**
   * Route message to appropriate handler
   */
  private async routeMessage(client: Client, message: ClientMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'execute':
          await this.handleExecute(client, message.payload);
          break;

        case 'step':
          await this.handleStep(client, message.payload.sessionId);
          break;

        case 'continue':
          await this.handleContinue(client, message.payload.sessionId);
          break;

        case 'pause':
          await this.handlePause(client, message.payload.sessionId);
          break;

        case 'stop':
          await this.handleStop(client, message.payload.sessionId);
          break;

        case 'inspect':
          await this.handleInspect(client, message.payload.sessionId, message.payload.variablePath);
          break;

        case 'mock_response':
          await this.handleMockResponse(client, message.payload);
          break;

        case 'add_breakpoint':
          await this.handleAddBreakpoint(client, message.payload);
          break;

        case 'remove_breakpoint':
          await this.handleRemoveBreakpoint(client, message.payload);
          break;

        case 'get_sessions':
          await this.handleGetSessions(client);
          break;

        case 'get_recordings':
          await this.handleGetRecordings(client);
          break;

        case 'replay_recording':
          await this.handleReplayRecording(client, message.payload);
          break;

        default:
          this.sendMessage(client, MessageBuilder.error('Unknown message type'));
      }
    } catch (error) {
      console.error('Error routing message:', error);
      this.sendMessage(client, MessageBuilder.error(
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }

  // ===== Message Handlers =====

  private async handleExecute(client: Client, payload: any): Promise<void> {
    const session = this.sessionManager.createSession({
      agentId: payload.agentId,
      input: payload.input,
      breakpoints: payload.breakpoints,
      mockResponses: payload.mockResponses
    });

    client.sessionIds.add(session.id);

    this.sendMessage(client, MessageBuilder.sessionCreated(session.id, payload.agentId));

    // Start recording
    this.recorder.startRecording(session.id, payload.agentId, payload.input);

    // Execute agent asynchronously
    this.executor.executeAgent(session.id, payload.agentId, payload.input).then(result => {
      this.recorder.finishRecording(session.id, result.duration, result.success, result.result, result.error);

      if (result.success) {
        this.sendMessage(client, MessageBuilder.executionComplete(session.id, result.result, result.duration));
      } else {
        this.sendMessage(client, MessageBuilder.error(
          result.error?.message || 'Execution failed',
          session.id,
          result.error?.stack
        ));
      }
    }).catch(error => {
      this.recorder.finishRecording(session.id, 0, false, undefined, error);
      this.sendMessage(client, MessageBuilder.error(error.message, session.id, error.stack));
    });
  }

  private async handleStep(_client: Client, sessionId: string): Promise<void> {
    const success = this.sessionManager.step(sessionId);
    if (!success) {
      this.sendMessage(_client, MessageBuilder.error('Cannot step: session not paused', sessionId));
    }
  }

  private async handleContinue(_client: Client, sessionId: string): Promise<void> {
    const success = this.sessionManager.continue(sessionId);
    if (!success) {
      this.sendMessage(_client, MessageBuilder.error('Cannot continue: session not paused', sessionId));
    }
  }

  private async handlePause(_client: Client, sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (session && session.state === 'running') {
      this.sessionManager.updateState(sessionId, 'paused');
    }
  }

  private async handleStop(_client: Client, sessionId: string): Promise<void> {
    this.executor.stopExecution(sessionId);
  }

  private async handleInspect(_client: Client, sessionId: string, variablePath: string): Promise<void> {
    const value = this.sessionManager.getVariable(sessionId, variablePath);
    this.sendMessage(_client, {
      type: 'variable_value',
      payload: { sessionId, path: variablePath, value }
    });
  }

  private async handleMockResponse(_client: Client, payload: any): Promise<void> {
    this.sessionManager.setMockResponse(payload.sessionId, payload.toolName, payload.response);
  }

  private async handleAddBreakpoint(_client: Client, payload: any): Promise<void> {
    this.sessionManager.addBreakpoint(payload.sessionId, payload.breakpoint);
  }

  private async handleRemoveBreakpoint(_client: Client, payload: any): Promise<void> {
    this.sessionManager.removeBreakpoint(payload.sessionId, payload.breakpointId);
  }

  private async handleGetSessions(_client: Client): Promise<void> {
    const sessions = this.sessionManager.getAllSessions().map(s => ({
      sessionId: s.id,
      agentId: s.agentId,
      state: s.state,
      startTime: s.startTime.toISOString(),
      duration: s.duration
    }));

    this.sendMessage(_client, {
      type: 'session_list',
      payload: { sessions }
    });
  }

  private async handleGetRecordings(_client: Client): Promise<void> {
    const recordings = this.recorder.getAllRecordings().map(r => ({
      recordingId: r.id,
      agentId: r.agentId,
      timestamp: r.timestamp,
      duration: r.duration,
      toolCalls: r.toolCalls
    }));

    this.sendMessage(_client, {
      type: 'recording_list',
      payload: { recordings }
    });
  }

  private async handleReplayRecording(_client: Client, _payload: any): Promise<void> {
    // TODO: Implement replay functionality
    this.sendMessage(_client, MessageBuilder.error('Replay not yet implemented'));
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`Client disconnected: ${clientId}`);

    // Clean up client sessions if needed
    client.sessionIds.forEach(sessionId => {
      const session = this.sessionManager.getSession(sessionId);
      if (session && (session.state === 'running' || session.state === 'paused')) {
        this.executor.stopExecution(sessionId);
      }
    });

    this.clients.delete(clientId);
  }

  // ===== Message Sending =====

  /**
   * Send message to client
   */
  private sendMessage(client: Client, message: ServerMessage): void {
    if (client.ws.readyState !== WebSocket.OPEN) {
      // Queue message if connection not ready
      if (client.messageQueue.length < this.config.messageQueueSize) {
        client.messageQueue.push(message);
      }
      return;
    }

    // Send queued messages first
    while (client.messageQueue.length > 0) {
      const queued = client.messageQueue.shift()!;
      client.ws.send(JSON.stringify(queued));
    }

    // Send new message
    client.ws.send(JSON.stringify(message));
  }

  /**
   * Broadcast message to all clients
   */
  // private broadcast(message: ServerMessage): void {
  //   this.clients.forEach(client => {
  //     this.sendMessage(client, message);
  //   });
  // }

  // ===== Heartbeat =====

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.handleDisconnection(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, this.config.heartbeatInterval);
  }

  // ===== Utility Methods =====

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get executor for external access
   */
  getExecutor(): Executor {
    return this.executor;
  }

  /**
   * Get session manager for external access
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Get debugger for external access
   */
  getDebugger(): Debugger {
    return this.debugger;
  }

  /**
   * Get recorder for external access
   */
  getRecorder(): Recorder {
    return this.recorder;
  }
}
