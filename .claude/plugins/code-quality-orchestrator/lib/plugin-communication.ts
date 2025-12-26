/**
 * Inter-Plugin Communication Module
 *
 * Enables communication between Code Quality Orchestrator (Curator)
 * and Jira Orchestrator (Arbiter) plugins.
 *
 * Implements a message-passing protocol for subagent coordination.
 */

// Message Types
export type MessageType = 'request' | 'response' | 'event' | 'error' | 'handoff';

export interface PluginMessage {
  id: string;
  timestamp: string;
  from: PluginIdentifier;
  to: PluginIdentifier;
  type: MessageType;
  phase?: string;
  payload: any;
  correlationId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface PluginIdentifier {
  name: string;
  callsign: string;
  version: string;
}

// Plugin Registry
export const PLUGINS = {
  CURATOR: {
    name: 'code-quality-orchestrator',
    callsign: 'Curator',
    version: '1.0.0'
  },
  ARBITER: {
    name: 'jira-orchestrator',
    callsign: 'Arbiter',
    version: '4.2.0'
  }
} as const;

// Quality Gate Results Interface
export interface QualityGateResult {
  gate: string;
  passed: boolean;
  score: number;
  issues: Issue[];
  autoFixable: boolean;
}

export interface Issue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  rule?: string;
  autoFixable: boolean;
}

// Jira Integration Interface
export interface JiraWorkflowContext {
  issueKey: string;
  phase: string;
  artifacts: Record<string, any>;
  previousPhaseResult?: any;
}

/**
 * Message Bus for Plugin Communication
 */
export class PluginMessageBus {
  private messages: PluginMessage[] = [];
  private handlers: Map<string, (msg: PluginMessage) => Promise<any>> = new Map();

  /**
   * Send a message to another plugin
   */
  async send(message: Omit<PluginMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: PluginMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };

    this.messages.push(fullMessage);

    // If there's a handler registered, invoke it
    const handlerKey = `${message.to.name}:${message.type}`;
    const handler = this.handlers.get(handlerKey);

    if (handler) {
      await handler(fullMessage);
    }

    return fullMessage.id;
  }

  /**
   * Register a message handler
   */
  onMessage(
    plugin: PluginIdentifier,
    type: MessageType,
    handler: (msg: PluginMessage) => Promise<any>
  ): void {
    const key = `${plugin.name}:${type}`;
    this.handlers.set(key, handler);
  }

  /**
   * Request-response pattern
   */
  async request(
    from: PluginIdentifier,
    to: PluginIdentifier,
    payload: any,
    timeout = 30000
  ): Promise<any> {
    const correlationId = this.generateId();

    await this.send({
      from,
      to,
      type: 'request',
      payload,
      correlationId,
      priority: 'normal'
    });

    // In a real implementation, this would wait for a response
    // For now, return the correlation ID
    return { correlationId, status: 'pending' };
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Quality Gate Request from Jira Orchestrator
 */
export interface QualityGateRequest {
  issueKey: string;
  phase: 'pre-commit' | 'post-edit' | 'on-demand';
  changedFiles: string[];
  options: {
    autoFix: boolean;
    failOnWarning: boolean;
    gates: string[];
  };
}

/**
 * Quality Gate Response to Jira Orchestrator
 */
export interface QualityGateResponse {
  requestId: string;
  issueKey: string;
  timestamp: string;
  allPassed: boolean;
  qualityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gates: QualityGateResult[];
  blockers: Issue[];
  warnings: Issue[];
  recommendations: string[];
  canProceed: boolean;
}

/**
 * Curator API - Called by Jira Orchestrator
 */
export class CuratorAPI {
  private messageBus: PluginMessageBus;

  constructor(messageBus: PluginMessageBus) {
    this.messageBus = messageBus;
  }

  /**
   * Run all quality gates for a Jira issue
   */
  async runQualityGates(request: QualityGateRequest): Promise<QualityGateResponse> {
    // Send request to Curator
    await this.messageBus.send({
      from: PLUGINS.ARBITER,
      to: PLUGINS.CURATOR,
      type: 'request',
      phase: request.phase,
      payload: request,
      priority: 'high'
    });

    // This would be implemented with actual gate execution
    // For now, return a mock response structure
    return {
      requestId: `qg-${Date.now()}`,
      issueKey: request.issueKey,
      timestamp: new Date().toISOString(),
      allPassed: true,
      qualityScore: 85,
      grade: 'B',
      gates: [],
      blockers: [],
      warnings: [],
      recommendations: [],
      canProceed: true
    };
  }

  /**
   * Run auto-fix for failed gates
   */
  async autoFix(failedGates: QualityGateResult[]): Promise<{
    fixed: number;
    remaining: number;
    details: any[];
  }> {
    await this.messageBus.send({
      from: PLUGINS.ARBITER,
      to: PLUGINS.CURATOR,
      type: 'request',
      payload: { action: 'autoFix', gates: failedGates },
      priority: 'normal'
    });

    return { fixed: 0, remaining: 0, details: [] };
  }

  /**
   * Generate quality report
   */
  async generateReport(format: 'json' | 'markdown' | 'html'): Promise<string> {
    await this.messageBus.send({
      from: PLUGINS.ARBITER,
      to: PLUGINS.CURATOR,
      type: 'request',
      payload: { action: 'generateReport', format },
      priority: 'low'
    });

    return '';
  }
}

/**
 * Handoff Protocol for Phase Transitions
 */
export interface PhaseHandoff {
  fromPhase: string;
  toPhase: string;
  issueKey: string;
  artifacts: {
    files: string[];
    testResults?: any;
    coverageReport?: any;
    qualityScore?: number;
  };
  metadata: {
    duration: number;
    agentsUsed: number;
    timestamp: string;
  };
}

/**
 * Create a phase handoff message
 */
export function createHandoff(
  fromPhase: string,
  toPhase: string,
  issueKey: string,
  artifacts: any
): PhaseHandoff {
  return {
    fromPhase,
    toPhase,
    issueKey,
    artifacts,
    metadata: {
      duration: 0,
      agentsUsed: 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Subagent Spawn Configuration
 */
export interface SubagentSpawnConfig {
  type: string;
  model: 'opus' | 'sonnet' | 'haiku';
  prompt: string;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
}

/**
 * Create Task tool invocation for spawning subagents
 */
export function createTaskInvocation(config: SubagentSpawnConfig): string {
  return `Task({
  subagent_type: "${config.type}",
  model: "${config.model}",
  prompt: \`${config.prompt}\`
})`;
}

// Export singleton message bus
export const messageBus = new PluginMessageBus();
export const curatorAPI = new CuratorAPI(messageBus);
