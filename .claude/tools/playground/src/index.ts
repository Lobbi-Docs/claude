/**
 * Agent Playground - Interactive debugging environment for Claude agents
 *
 * Public API exports
 */

// Core components
export { PlaygroundServer } from './server.js';
export { SessionManager } from './session-manager.js';
export { Debugger } from './debugger.js';
export { Executor } from './executor.js';
export { Recorder } from './recorder.js';

// Import for local use
import { PlaygroundServer } from './server.js';
import { SessionManager } from './session-manager.js';
import { Debugger } from './debugger.js';
import { Recorder } from './recorder.js';

// Protocol types and utilities
export {
  // Types
  type SessionState,
  type BreakpointType,
  type Breakpoint,
  type StackFrame,
  type ToolCall,
  type ToolResponse,
  type ClientMessage,
  type ServerMessage,

  // Schemas
  SessionState as SessionStateSchema,
  BreakpointType as BreakpointTypeSchema,
  Breakpoint as BreakpointSchema,
  StackFrame as StackFrameSchema,
  ToolCall as ToolCallSchema,
  ToolResponse as ToolResponseSchema,
  ClientMessage as ClientMessageSchema,
  ServerMessage as ServerMessageSchema,

  // Utilities
  parseClientMessage,
  parseServerMessage,
  MessageBuilder
} from './protocol.js';

// Session Manager types
export type {
  SessionHistoryEntry,
  SessionConfig,
  Session
} from './session-manager.js';

// Debugger types
export type {
  TimelineEvent,
  MemorySnapshot,
  VariableWatch,
  DebuggerConfig
} from './debugger.js';

// Executor types
export type {
  AgentDefinition,
  ToolDefinition,
  ExecutionContext,
  ExecutionOptions,
  ExecutionResult
} from './executor.js';

// Recorder types
export type {
  RecordingMetadata,
  RecordingEvent,
  Annotation,
  RecorderConfig
} from './recorder.js';

// Server types
export type {
  ServerConfig
} from './server.js';

/**
 * Create a playground server instance
 */
export function createPlaygroundServer(config?: {
  port?: number;
  host?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  enableCors?: boolean;
}) {
  return new PlaygroundServer(config);
}

/**
 * Create a standalone session manager
 */
export function createSessionManager(options?: {
  maxSessions?: number;
  defaultTimeout?: number;
}) {
  return new SessionManager(options);
}

/**
 * Create a standalone debugger
 */
export function createDebugger(config?: {
  enableTimeline?: boolean;
  enableMemorySnapshots?: boolean;
  snapshotInterval?: number;
  maxTimelineEvents?: number;
  maxSnapshots?: number;
}) {
  return new Debugger(config);
}

/**
 * Create a standalone recorder
 */
export function createRecorder(config?: {
  dbPath?: string;
  maxRecordings?: number;
  autoCleanup?: boolean;
}) {
  return new Recorder(config);
}

/**
 * Create a complete playground instance with all components
 */
export function createPlayground(config?: {
  server?: {
    port?: number;
    host?: string;
    maxConnections?: number;
    heartbeatInterval?: number;
    enableCors?: boolean;
  };
  session?: {
    maxSessions?: number;
    defaultTimeout?: number;
  };
  debugger?: {
    enableTimeline?: boolean;
    enableMemorySnapshots?: boolean;
    snapshotInterval?: number;
    maxTimelineEvents?: number;
    maxSnapshots?: number;
  };
  recorder?: {
    dbPath?: string;
    maxRecordings?: number;
    autoCleanup?: boolean;
  };
}) {
  const server = new PlaygroundServer(config?.server);

  return {
    server,
    sessionManager: server.getSessionManager(),
    debugger: server.getDebugger(),
    executor: server.getExecutor(),
    recorder: server.getRecorder(),

    async start() {
      await server.start();
    },

    async stop() {
      await server.stop();
    },

    getStatus() {
      return server.getStatus();
    }
  };
}

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Default export
 */
export default {
  createPlaygroundServer,
  createSessionManager,
  createDebugger,
  createRecorder,
  createPlayground,
  VERSION
};
