/**
 * WebSocket message protocol for Agent Playground
 *
 * Defines the bidirectional communication protocol between clients and the playground server.
 * All messages follow a type-safe schema with validation via Zod.
 */

import { z } from 'zod';

/**
 * Session execution states
 */
export const SessionState = z.enum([
  'idle',       // Waiting for execution
  'running',    // Agent executing
  'paused',     // Hit breakpoint
  'stepping',   // Single-step mode
  'completed',  // Execution finished
  'error'       // Error occurred
]);

export type SessionState = z.infer<typeof SessionState>;

/**
 * Breakpoint types
 */
export const BreakpointType = z.enum([
  'line',        // Line number breakpoint
  'conditional', // Conditional expression breakpoint
  'tool',        // Break on specific tool call
  'phase'        // Break on agent phase transition
]);

export type BreakpointType = z.infer<typeof BreakpointType>;

/**
 * Breakpoint definition
 */
export const Breakpoint = z.object({
  id: z.string(),
  type: BreakpointType,
  enabled: z.boolean(),
  location: z.string().optional(),    // File path for line breakpoints
  line: z.number().optional(),        // Line number for line breakpoints
  condition: z.string().optional(),   // Expression for conditional breakpoints
  toolName: z.string().optional(),    // Tool name for tool breakpoints
  phase: z.string().optional()        // Phase name for phase breakpoints
});

export type Breakpoint = z.infer<typeof Breakpoint>;

/**
 * Stack frame for debugging
 */
export const StackFrame = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().optional(),
  line: z.number().optional(),
  variables: z.record(z.any())
});

export type StackFrame = z.infer<typeof StackFrame>;

/**
 * Tool call information
 */
export const ToolCall = z.object({
  id: z.string(),
  tool: z.string(),
  params: z.record(z.any()),
  timestamp: z.string()
});

export type ToolCall = z.infer<typeof ToolCall>;

/**
 * Tool response
 */
export const ToolResponse = z.object({
  callId: z.string(),
  result: z.any(),
  error: z.string().optional(),
  duration: z.number() // milliseconds
});

export type ToolResponse = z.infer<typeof ToolResponse>;

/**
 * Client -> Server Messages
 */

export const ExecuteMessage = z.object({
  type: z.literal('execute'),
  payload: z.object({
    agentId: z.string(),
    input: z.any(),
    breakpoints: z.array(Breakpoint).optional(),
    mockResponses: z.record(z.any()).optional()
  })
});

export const StepMessage = z.object({
  type: z.literal('step'),
  payload: z.object({
    sessionId: z.string()
  })
});

export const ContinueMessage = z.object({
  type: z.literal('continue'),
  payload: z.object({
    sessionId: z.string()
  })
});

export const InspectMessage = z.object({
  type: z.literal('inspect'),
  payload: z.object({
    sessionId: z.string(),
    variablePath: z.string()
  })
});

export const MockResponseMessage = z.object({
  type: z.literal('mock_response'),
  payload: z.object({
    sessionId: z.string(),
    toolName: z.string(),
    response: z.any()
  })
});

export const PauseMessage = z.object({
  type: z.literal('pause'),
  payload: z.object({
    sessionId: z.string()
  })
});

export const StopMessage = z.object({
  type: z.literal('stop'),
  payload: z.object({
    sessionId: z.string()
  })
});

export const AddBreakpointMessage = z.object({
  type: z.literal('add_breakpoint'),
  payload: z.object({
    sessionId: z.string(),
    breakpoint: Breakpoint
  })
});

export const RemoveBreakpointMessage = z.object({
  type: z.literal('remove_breakpoint'),
  payload: z.object({
    sessionId: z.string(),
    breakpointId: z.string()
  })
});

export const GetSessionsMessage = z.object({
  type: z.literal('get_sessions'),
  payload: z.object({})
});

export const GetRecordingsMessage = z.object({
  type: z.literal('get_recordings'),
  payload: z.object({})
});

export const ReplayRecordingMessage = z.object({
  type: z.literal('replay_recording'),
  payload: z.object({
    recordingId: z.string(),
    breakpoints: z.array(Breakpoint).optional()
  })
});

export const ClientMessage = z.discriminatedUnion('type', [
  ExecuteMessage,
  StepMessage,
  ContinueMessage,
  InspectMessage,
  MockResponseMessage,
  PauseMessage,
  StopMessage,
  AddBreakpointMessage,
  RemoveBreakpointMessage,
  GetSessionsMessage,
  GetRecordingsMessage,
  ReplayRecordingMessage
]);

export type ClientMessage = z.infer<typeof ClientMessage>;

/**
 * Server -> Client Messages
 */

export const SessionCreatedMessage = z.object({
  type: z.literal('session_created'),
  payload: z.object({
    sessionId: z.string(),
    agentId: z.string()
  })
});

export const StateChangedMessage = z.object({
  type: z.literal('state_changed'),
  payload: z.object({
    sessionId: z.string(),
    state: SessionState,
    previousState: SessionState
  })
});

export const BreakpointHitMessage = z.object({
  type: z.literal('breakpoint_hit'),
  payload: z.object({
    sessionId: z.string(),
    breakpoint: Breakpoint,
    location: z.string(),
    stack: z.array(StackFrame)
  })
});

export const ToolCallMessage = z.object({
  type: z.literal('tool_call'),
  payload: z.object({
    sessionId: z.string(),
    toolCall: ToolCall
  })
});

export const ToolResponseMessage = z.object({
  type: z.literal('tool_response'),
  payload: z.object({
    sessionId: z.string(),
    response: ToolResponse
  })
});

export const ExecutionCompleteMessage = z.object({
  type: z.literal('execution_complete'),
  payload: z.object({
    sessionId: z.string(),
    result: z.any(),
    duration: z.number()
  })
});

export const ErrorMessage = z.object({
  type: z.literal('error'),
  payload: z.object({
    sessionId: z.string().optional(),
    error: z.string(),
    stack: z.string().optional()
  })
});

export const VariableValueMessage = z.object({
  type: z.literal('variable_value'),
  payload: z.object({
    sessionId: z.string(),
    path: z.string(),
    value: z.any()
  })
});

export const LogMessage = z.object({
  type: z.literal('log'),
  payload: z.object({
    sessionId: z.string(),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string(),
    timestamp: z.string()
  })
});

export const SessionListMessage = z.object({
  type: z.literal('session_list'),
  payload: z.object({
    sessions: z.array(z.object({
      sessionId: z.string(),
      agentId: z.string(),
      state: SessionState,
      startTime: z.string(),
      duration: z.number().optional()
    }))
  })
});

export const RecordingListMessage = z.object({
  type: z.literal('recording_list'),
  payload: z.object({
    recordings: z.array(z.object({
      recordingId: z.string(),
      agentId: z.string(),
      timestamp: z.string(),
      duration: z.number(),
      toolCalls: z.number()
    }))
  })
});

export const ServerMessage = z.discriminatedUnion('type', [
  SessionCreatedMessage,
  StateChangedMessage,
  BreakpointHitMessage,
  ToolCallMessage,
  ToolResponseMessage,
  ExecutionCompleteMessage,
  ErrorMessage,
  VariableValueMessage,
  LogMessage,
  SessionListMessage,
  RecordingListMessage
]);

export type ServerMessage = z.infer<typeof ServerMessage>;

/**
 * Message validation helpers
 */

export function parseClientMessage(data: unknown): ClientMessage | null {
  try {
    return ClientMessage.parse(data);
  } catch (error) {
    console.error('Invalid client message:', error);
    return null;
  }
}

export function parseServerMessage(data: unknown): ServerMessage | null {
  try {
    return ServerMessage.parse(data);
  } catch (error) {
    console.error('Invalid server message:', error);
    return null;
  }
}

/**
 * Message builder utilities
 */

export const MessageBuilder = {
  // Client messages
  execute: (agentId: string, input: any, options?: { breakpoints?: Breakpoint[], mockResponses?: Record<string, any> }): ClientMessage => ({
    type: 'execute',
    payload: {
      agentId,
      input,
      breakpoints: options?.breakpoints,
      mockResponses: options?.mockResponses
    }
  }),

  step: (sessionId: string): ClientMessage => ({
    type: 'step',
    payload: { sessionId }
  }),

  continue: (sessionId: string): ClientMessage => ({
    type: 'continue',
    payload: { sessionId }
  }),

  inspect: (sessionId: string, variablePath: string): ClientMessage => ({
    type: 'inspect',
    payload: { sessionId, variablePath }
  }),

  mockResponse: (sessionId: string, toolName: string, response: any): ClientMessage => ({
    type: 'mock_response',
    payload: { sessionId, toolName, response }
  }),

  // Server messages
  sessionCreated: (sessionId: string, agentId: string): ServerMessage => ({
    type: 'session_created',
    payload: { sessionId, agentId }
  }),

  stateChanged: (sessionId: string, state: SessionState, previousState: SessionState): ServerMessage => ({
    type: 'state_changed',
    payload: { sessionId, state, previousState }
  }),

  breakpointHit: (sessionId: string, breakpoint: Breakpoint, location: string, stack: StackFrame[]): ServerMessage => ({
    type: 'breakpoint_hit',
    payload: { sessionId, breakpoint, location, stack }
  }),

  toolCall: (sessionId: string, toolCall: ToolCall): ServerMessage => ({
    type: 'tool_call',
    payload: { sessionId, toolCall }
  }),

  toolResponse: (sessionId: string, response: ToolResponse): ServerMessage => ({
    type: 'tool_response',
    payload: { sessionId, response }
  }),

  executionComplete: (sessionId: string, result: any, duration: number): ServerMessage => ({
    type: 'execution_complete',
    payload: { sessionId, result, duration }
  }),

  error: (error: string, sessionId?: string, stack?: string): ServerMessage => ({
    type: 'error',
    payload: { sessionId, error, stack }
  }),

  log: (sessionId: string, level: 'debug' | 'info' | 'warn' | 'error', message: string): ServerMessage => ({
    type: 'log',
    payload: {
      sessionId,
      level,
      message,
      timestamp: new Date().toISOString()
    }
  })
};
