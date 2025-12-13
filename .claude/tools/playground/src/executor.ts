/**
 * Executor - Agent execution engine with sandbox support
 *
 * Features:
 * - Safe agent loading and execution
 * - Sandbox environment integration
 * - Tool call interception
 * - Mock tool responses
 * - Timeout handling
 */

import { nanoid } from 'nanoid';
import type { ToolCall, ToolResponse } from './protocol.js';
import type { SessionManager } from './session-manager.js';
import type { Debugger as DebuggerType } from './debugger.js';

/**
 * Agent definition
 */
export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  version?: string;
  execute: (input: any, context: ExecutionContext) => Promise<any>;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  execute: (params: any, context: ExecutionContext) => Promise<any>;
}

/**
 * Execution context provided to agents
 */
export interface ExecutionContext {
  sessionId: string;
  callTool: (toolName: string, params: any) => Promise<any>;
  getVariable: (path: string) => any;
  setVariable: (path: string, value: any) => void;
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;
  checkpoint: (data?: any) => void;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  timeout?: number; // milliseconds
  sandbox?: boolean;
  mockResponses?: Record<string, any>;
  breakOnToolCall?: boolean;
  breakOnPhase?: boolean;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  duration: number; // milliseconds
  toolCalls: ToolCall[];
  checkpoints: any[];
}

/**
 * Executor class
 */
export class Executor {
  private agents: Map<string, AgentDefinition> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private activeExecutions: Map<string, AbortController> = new Map();

  constructor(
    private sessionManager: SessionManager,
    private agentDebugger: DebuggerType
  ) {}

  // ===== Agent Management =====

  /**
   * Register an agent
   */
  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  // ===== Tool Management =====

  /**
   * Register a tool
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  /**
   * Get tool by name
   */
  getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  // ===== Execution =====

  /**
   * Execute an agent
   */
  async executeAgent(
    sessionId: string,
    agentId: string,
    input: any,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Set up abort controller for timeout
    const abortController = new AbortController();
    this.activeExecutions.set(sessionId, abortController);

    const timeout = options.timeout || 300000; // 5 minutes default
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    const startTime = Date.now();
    const toolCalls: ToolCall[] = [];
    const checkpoints: any[] = [];

    try {
      // Update session state
      this.sessionManager.updateState(sessionId, 'running');

      // Add timeline event
      this.agentDebugger.addTimelineEvent({
        timestamp: new Date(),
        type: 'execution_start',
        sessionId,
        data: { agentId, input }
      });

      // Create execution context
      const context = this.createExecutionContext(
        sessionId,
        toolCalls,
        checkpoints,
        options
      );

      // Execute agent with sandbox if enabled
      let result;
      if (options.sandbox) {
        result = await this.executeSandboxed(agent, input, context, abortController.signal);
      } else {
        result = await this.executeUnsandboxed(agent, input, context, abortController.signal);
      }

      const duration = Date.now() - startTime;

      // Add completion event
      this.agentDebugger.addTimelineEvent({
        timestamp: new Date(),
        type: 'execution_end',
        sessionId,
        data: { result },
        duration
      });

      // Update session
      this.sessionManager.completeSession(sessionId, result);

      return {
        success: true,
        result,
        duration,
        toolCalls,
        checkpoints
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Add error event
      this.agentDebugger.addTimelineEvent({
        timestamp: new Date(),
        type: 'error',
        sessionId,
        data: { error: error instanceof Error ? error.message : String(error) },
        duration
      });

      // Update session
      this.sessionManager.failSession(sessionId, error as Error);

      return {
        success: false,
        error: error as Error,
        duration,
        toolCalls,
        checkpoints
      };

    } finally {
      clearTimeout(timeoutId);
      this.activeExecutions.delete(sessionId);
    }
  }

  /**
   * Stop execution
   */
  stopExecution(sessionId: string): boolean {
    const abortController = this.activeExecutions.get(sessionId);
    if (!abortController) return false;

    abortController.abort();
    return true;
  }

  /**
   * Check if execution is active
   */
  isExecuting(sessionId: string): boolean {
    return this.activeExecutions.has(sessionId);
  }

  // ===== Private Execution Methods =====

  /**
   * Execute agent without sandbox
   */
  private async executeUnsandboxed(
    agent: AgentDefinition,
    input: any,
    context: ExecutionContext,
    signal: AbortSignal
  ): Promise<any> {
    // Check for abort
    if (signal.aborted) {
      throw new Error('Execution aborted');
    }

    return await agent.execute(input, context);
  }

  /**
   * Execute agent with sandbox
   * In production, use vm2 or isolated-vm for proper sandboxing
   */
  private async executeSandboxed(
    agent: AgentDefinition,
    input: any,
    context: ExecutionContext,
    signal: AbortSignal
  ): Promise<any> {
    // Check for abort
    if (signal.aborted) {
      throw new Error('Execution aborted');
    }

    // TODO: Implement proper sandboxing
    // For now, just execute normally
    // In production, use vm2 or isolated-vm:
    // const { VM } = require('vm2');
    // const vm = new VM({ timeout, sandbox: { input, context } });
    // return vm.run(agent.execute.toString());

    return await agent.execute(input, context);
  }

  /**
   * Create execution context
   */
  private createExecutionContext(
    sessionId: string,
    toolCalls: ToolCall[],
    checkpoints: any[],
    options: ExecutionOptions
  ): ExecutionContext {
    return {
      sessionId,

      callTool: async (toolName: string, params: any): Promise<any> => {
        // Create tool call record
        const toolCall: ToolCall = {
          id: nanoid(),
          tool: toolName,
          params,
          timestamp: new Date().toISOString()
        };

        toolCalls.push(toolCall);
        this.sessionManager.recordToolCall(sessionId, toolCall);

        // Add timeline event
        this.agentDebugger.addTimelineEvent({
          timestamp: new Date(),
          type: 'tool_call',
          sessionId,
          data: toolCall
        });

        // Check for breakpoint
        if (options.breakOnToolCall) {
          const breakpoint = this.sessionManager.shouldBreak(sessionId, { toolName });
          if (breakpoint) {
            this.sessionManager.hitBreakpoint(sessionId, breakpoint, []);
            // Wait for continue
            await this.waitForContinue(sessionId);
          }
        }

        const startTime = Date.now();

        try {
          // Check for mock response
          const mockResponse = this.sessionManager.getMockResponse(sessionId, toolName);
          if (mockResponse !== undefined) {
            const response: ToolResponse = {
              callId: toolCall.id,
              result: mockResponse,
              duration: Date.now() - startTime
            };

            this.sessionManager.recordToolResponse(sessionId, response);
            return mockResponse;
          }

          // Execute actual tool
          const tool = this.tools.get(toolName);
          if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
          }

          const result = await tool.execute(params, this.createExecutionContext(sessionId, toolCalls, checkpoints, options));

          const response: ToolResponse = {
            callId: toolCall.id,
            result,
            duration: Date.now() - startTime
          };

          this.sessionManager.recordToolResponse(sessionId, response);

          // Add timeline event
          this.agentDebugger.addTimelineEvent({
            timestamp: new Date(),
            type: 'tool_response',
            sessionId,
            data: response,
            duration: response.duration
          });

          return result;

        } catch (error) {
          const response: ToolResponse = {
            callId: toolCall.id,
            result: null,
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime
          };

          this.sessionManager.recordToolResponse(sessionId, response);
          throw error;
        }
      },

      getVariable: (path: string): any => {
        return this.sessionManager.getVariable(sessionId, path);
      },

      setVariable: (path: string, value: any): void => {
        this.sessionManager.setVariable(sessionId, path, value);
      },

      log: (level: 'debug' | 'info' | 'warn' | 'error', message: string): void => {
        this.agentDebugger.addTimelineEvent({
          timestamp: new Date(),
          type: 'execution_start',
          sessionId,
          data: { level, message }
        });
      },

      checkpoint: (data?: any): void => {
        checkpoints.push({
          timestamp: new Date().toISOString(),
          data
        });
      }
    };
  }

  /**
   * Wait for execution to continue from breakpoint
   */
  private async waitForContinue(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const session = this.sessionManager.getSession(sessionId);
        if (!session || session.state !== 'paused') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // ===== Utility Methods =====

  /**
   * Get execution statistics
   */
  getStatistics(): {
    registeredAgents: number;
    registeredTools: number;
    activeExecutions: number;
  } {
    return {
      registeredAgents: this.agents.size,
      registeredTools: this.tools.size,
      activeExecutions: this.activeExecutions.size
    };
  }
}
