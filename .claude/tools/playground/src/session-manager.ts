/**
 * Session Manager - Handles isolated execution contexts for agent debugging
 *
 * Features:
 * - Create isolated execution contexts
 * - Track session state and history
 * - Support for breakpoints
 * - Step-through execution mode
 * - Variable inspection
 */

import { nanoid } from 'nanoid';
import type {
  SessionState,
  Breakpoint,
  StackFrame,
  ToolCall,
  ToolResponse
} from './protocol.js';

/**
 * Session history entry
 */
export interface SessionHistoryEntry {
  timestamp: string;
  type: 'state_change' | 'tool_call' | 'tool_response' | 'breakpoint' | 'log';
  data: any;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  agentId: string;
  input: any;
  breakpoints?: Breakpoint[];
  mockResponses?: Record<string, any>;
  timeout?: number; // milliseconds
}

/**
 * Session data structure
 */
export interface Session {
  id: string;
  agentId: string;
  state: SessionState;
  input: any;
  result?: any;
  error?: Error;

  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds

  // Debugging
  breakpoints: Map<string, Breakpoint>;
  currentBreakpoint?: Breakpoint;
  stack: StackFrame[];
  variables: Map<string, any>;
  watchList: Set<string>;

  // Execution control
  mockResponses: Map<string, any>;
  stepMode: boolean;

  // History
  history: SessionHistoryEntry[];
  toolCalls: ToolCall[];
  toolResponses: Map<string, ToolResponse>;

  // Metadata
  metadata: Record<string, any>;
}

/**
 * Session Manager class
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly maxSessions: number;

  constructor(options: { maxSessions?: number; defaultTimeout?: number } = {}) {
    this.maxSessions = options.maxSessions ?? 100;
  }

  /**
   * Create a new session
   */
  createSession(config: SessionConfig): Session {
    // Clean up old sessions if at capacity
    if (this.sessions.size >= this.maxSessions) {
      this.cleanupOldSessions();
    }

    const session: Session = {
      id: nanoid(),
      agentId: config.agentId,
      state: 'idle',
      input: config.input,
      startTime: new Date(),
      breakpoints: new Map(),
      stack: [],
      variables: new Map(),
      watchList: new Set(),
      mockResponses: new Map(),
      stepMode: false,
      history: [],
      toolCalls: [],
      toolResponses: new Map(),
      metadata: {}
    };

    // Add breakpoints
    if (config.breakpoints) {
      config.breakpoints.forEach(bp => {
        session.breakpoints.set(bp.id, bp);
      });
    }

    // Add mock responses
    if (config.mockResponses) {
      Object.entries(config.mockResponses).forEach(([tool, response]) => {
        session.mockResponses.set(tool, response);
      });
    }

    this.sessions.set(session.id, session);
    this.addHistoryEntry(session.id, 'state_change', { state: 'idle' });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter(
      s => s.state === 'running' || s.state === 'paused' || s.state === 'stepping'
    );
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update session state
   */
  updateState(sessionId: string, newState: SessionState): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const previousState = session.state;
    session.state = newState;

    this.addHistoryEntry(sessionId, 'state_change', {
      from: previousState,
      to: newState
    });

    // Handle completion states
    if (newState === 'completed' || newState === 'error') {
      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
    }

    return true;
  }

  /**
   * Add breakpoint to session
   */
  addBreakpoint(sessionId: string, breakpoint: Breakpoint): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.breakpoints.set(breakpoint.id, breakpoint);
    return true;
  }

  /**
   * Remove breakpoint from session
   */
  removeBreakpoint(sessionId: string, breakpointId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    return session.breakpoints.delete(breakpointId);
  }

  /**
   * Toggle breakpoint enabled state
   */
  toggleBreakpoint(sessionId: string, breakpointId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const breakpoint = session.breakpoints.get(breakpointId);
    if (!breakpoint) return false;

    breakpoint.enabled = !breakpoint.enabled;
    return true;
  }

  /**
   * Check if breakpoint should trigger
   */
  shouldBreak(sessionId: string, context: {
    location?: string;
    line?: number;
    toolName?: string;
    phase?: string;
    variables?: Record<string, any>;
  }): Breakpoint | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check each enabled breakpoint
    for (const breakpoint of session.breakpoints.values()) {
      if (!breakpoint.enabled) continue;

      switch (breakpoint.type) {
        case 'line':
          if (breakpoint.location === context.location && breakpoint.line === context.line) {
            return breakpoint;
          }
          break;

        case 'tool':
          if (breakpoint.toolName === context.toolName) {
            return breakpoint;
          }
          break;

        case 'phase':
          if (breakpoint.phase === context.phase) {
            return breakpoint;
          }
          break;

        case 'conditional':
          if (breakpoint.condition && context.variables) {
            try {
              // Simple condition evaluation (can be enhanced)
              const result = this.evaluateCondition(breakpoint.condition, context.variables);
              if (result) return breakpoint;
            } catch (error) {
              console.error('Error evaluating breakpoint condition:', error);
            }
          }
          break;
      }
    }

    return null;
  }

  /**
   * Hit a breakpoint
   */
  hitBreakpoint(sessionId: string, breakpoint: Breakpoint, stack: StackFrame[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.currentBreakpoint = breakpoint;
    session.stack = stack;
    this.updateState(sessionId, 'paused');

    this.addHistoryEntry(sessionId, 'breakpoint', {
      breakpoint,
      stack
    });

    return true;
  }

  /**
   * Continue execution from breakpoint
   */
  continue(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'paused') return false;

    session.currentBreakpoint = undefined;
    session.stepMode = false;
    this.updateState(sessionId, 'running');

    return true;
  }

  /**
   * Step to next instruction
   */
  step(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'paused') return false;

    session.stepMode = true;
    this.updateState(sessionId, 'stepping');

    return true;
  }

  /**
   * Update call stack
   */
  updateStack(sessionId: string, stack: StackFrame[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.stack = stack;
    return true;
  }

  /**
   * Set variable value
   */
  setVariable(sessionId: string, path: string, value: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.variables.set(path, value);
    return true;
  }

  /**
   * Get variable value
   */
  getVariable(sessionId: string, path: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    return session.variables.get(path);
  }

  /**
   * Add variable to watch list
   */
  addWatch(sessionId: string, variablePath: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.watchList.add(variablePath);
    return true;
  }

  /**
   * Remove variable from watch list
   */
  removeWatch(sessionId: string, variablePath: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    return session.watchList.delete(variablePath);
  }

  /**
   * Record tool call
   */
  recordToolCall(sessionId: string, toolCall: ToolCall): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.toolCalls.push(toolCall);
    this.addHistoryEntry(sessionId, 'tool_call', toolCall);

    return true;
  }

  /**
   * Record tool response
   */
  recordToolResponse(sessionId: string, response: ToolResponse): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.toolResponses.set(response.callId, response);
    this.addHistoryEntry(sessionId, 'tool_response', response);

    return true;
  }

  /**
   * Get mock response for tool
   */
  getMockResponse(sessionId: string, toolName: string): any | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    return session.mockResponses.get(toolName);
  }

  /**
   * Set mock response for tool
   */
  setMockResponse(sessionId: string, toolName: string, response: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.mockResponses.set(toolName, response);
    return true;
  }

  /**
   * Complete session
   */
  completeSession(sessionId: string, result: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.result = result;
    this.updateState(sessionId, 'completed');

    return true;
  }

  /**
   * Fail session
   */
  failSession(sessionId: string, error: Error): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.error = error;
    this.updateState(sessionId, 'error');

    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clean up old completed sessions
   */
  private cleanupOldSessions(): void {
    const completedSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.state === 'completed' || session.state === 'error')
      .sort((a, b) => a[1].startTime.getTime() - b[1].startTime.getTime());

    // Remove oldest 20% of completed sessions
    const toRemove = Math.ceil(completedSessions.length * 0.2);
    completedSessions.slice(0, toRemove).forEach(([id]) => {
      this.sessions.delete(id);
    });
  }

  /**
   * Add history entry
   */
  private addHistoryEntry(sessionId: string, type: SessionHistoryEntry['type'], data: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.history.push({
      timestamp: new Date().toISOString(),
      type,
      data
    });
  }

  /**
   * Simple condition evaluator
   * In production, use a safe eval library like vm2 or isolated-vm
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Very basic evaluation - should be replaced with proper sandbox
      const func = new Function(...Object.keys(variables), `return ${condition}`);
      return func(...Object.values(variables));
    } catch {
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    idle: number;
    paused: number;
    completed: number;
    error: number;
  } {
    const sessions = Array.from(this.sessions.values());

    return {
      total: sessions.length,
      active: sessions.filter(s => s.state === 'running').length,
      idle: sessions.filter(s => s.state === 'idle').length,
      paused: sessions.filter(s => s.state === 'paused' || s.state === 'stepping').length,
      completed: sessions.filter(s => s.state === 'completed').length,
      error: sessions.filter(s => s.state === 'error').length
    };
  }
}
