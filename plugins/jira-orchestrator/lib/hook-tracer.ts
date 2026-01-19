/**
 * Hook Execution Tracer
 *
 * OpenTelemetry-style tracing for hook execution with support for
 * nested traces and detailed timing information.
 *
 * @module hook-tracer
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Type Definitions
// ============================================================================

export type TraceStatus = 'running' | 'success' | 'error' | 'timeout';
export type HookType = 'prompt' | 'command';

export interface HookTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  hookName: string;
  eventType: string;
  hookType: HookType;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceExportOptions {
  format?: 'json' | 'ndjson';
  pretty?: boolean;
}

// ============================================================================
// Hook Tracer Class
// ============================================================================

export class HookTracer {
  private traces: Map<string, HookTrace> = new Map();
  private completedTraces: HookTrace[] = [];
  private tracesDir: string;

  constructor(tracesDir?: string) {
    // Default to sessions/traces/hooks relative to plugin root
    this.tracesDir = tracesDir || path.join(
      process.env.CLAUDE_PLUGIN_ROOT || process.cwd(),
      'sessions',
      'traces',
      'hooks'
    );

    this.ensureTracesDirectory();
  }

  /**
   * Ensure traces directory exists
   */
  private ensureTracesDirectory(): void {
    if (!fs.existsSync(this.tracesDir)) {
      fs.mkdirSync(this.tracesDir, { recursive: true });
    }
  }

  /**
   * Start a new trace for a hook execution
   *
   * @param hookName - Name of the hook being executed
   * @param eventType - Event type that triggered the hook
   * @param hookType - Type of hook (prompt or command)
   * @param parentSpanId - Optional parent span ID for nested traces
   * @param metadata - Optional metadata to attach to trace
   * @returns Started trace object
   */
  public startTrace(
    hookName: string,
    eventType: string,
    hookType: HookType,
    parentSpanId?: string,
    metadata?: Record<string, unknown>
  ): HookTrace {
    const trace: HookTrace = {
      traceId: uuidv4(),
      spanId: uuidv4(),
      parentSpanId,
      hookName,
      eventType,
      hookType,
      startTime: Date.now(),
      status: 'running',
      metadata,
    };

    this.traces.set(trace.spanId, trace);
    return trace;
  }

  /**
   * End a trace with status and optional error
   *
   * @param trace - Trace object to end (or spanId string)
   * @param status - Final status of the trace
   * @param error - Optional error message if status is 'error' or 'timeout'
   */
  public endTrace(
    trace: HookTrace | string,
    status: TraceStatus,
    error?: string
  ): void {
    const spanId = typeof trace === 'string' ? trace : trace.spanId;
    const traceObj = this.traces.get(spanId);

    if (!traceObj) {
      console.warn(`[HookTracer] Attempted to end non-existent trace: ${spanId}`);
      return;
    }

    traceObj.endTime = Date.now();
    traceObj.duration = traceObj.endTime - traceObj.startTime;
    traceObj.status = status;

    if (error) {
      traceObj.error = error;
    }

    // Move to completed traces
    this.completedTraces.push(traceObj);
    this.traces.delete(spanId);
  }

  /**
   * Get a trace by span ID
   *
   * @param spanId - Span ID to retrieve
   * @returns Trace object or undefined
   */
  public getTrace(spanId: string): HookTrace | undefined {
    return this.traces.get(spanId) || this.completedTraces.find(t => t.spanId === spanId);
  }

  /**
   * Get all active (running) traces
   */
  public getActiveTraces(): HookTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get all completed traces
   */
  public getCompletedTraces(): HookTrace[] {
    return [...this.completedTraces];
  }

  /**
   * Get all traces (active and completed)
   */
  public getAllTraces(): HookTrace[] {
    return [...this.getActiveTraces(), ...this.getCompletedTraces()];
  }

  /**
   * Get traces by hook name
   *
   * @param hookName - Name of hook to filter by
   * @returns All traces for the specified hook
   */
  public getTracesByHook(hookName: string): HookTrace[] {
    return this.getAllTraces().filter(t => t.hookName === hookName);
  }

  /**
   * Get traces by event type
   *
   * @param eventType - Event type to filter by
   * @returns All traces for the specified event type
   */
  public getTracesByEvent(eventType: string): HookTrace[] {
    return this.getAllTraces().filter(t => t.eventType === eventType);
  }

  /**
   * Export traces to a JSON file
   *
   * @param outputPath - Full path to output file (optional)
   * @param options - Export formatting options
   * @returns Path to exported file
   */
  public exportTraces(outputPath?: string, options: TraceExportOptions = {}): string {
    const {
      format = 'json',
      pretty = true,
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(this.tracesDir, `traces-${timestamp}.json`);
    const filePath = outputPath || defaultPath;

    const traces = this.getAllTraces();

    if (format === 'ndjson') {
      // Newline-delimited JSON (one trace per line)
      const content = traces.map(t => JSON.stringify(t)).join('\n');
      fs.writeFileSync(filePath, content, 'utf-8');
    } else {
      // Standard JSON array
      const content = JSON.stringify(traces, null, pretty ? 2 : 0);
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    return filePath;
  }

  /**
   * Clear all completed traces from memory
   * (Active traces are preserved)
   */
  public clearCompleted(): void {
    this.completedTraces = [];
  }

  /**
   * Clear all traces (active and completed)
   */
  public clearAll(): void {
    this.traces.clear();
    this.completedTraces = [];
  }

  /**
   * Get trace statistics
   */
  public getStatistics(): {
    total: number;
    active: number;
    completed: number;
    byStatus: Record<TraceStatus, number>;
    byEventType: Record<string, number>;
    byHookName: Record<string, number>;
  } {
    const allTraces = this.getAllTraces();

    const byStatus: Record<TraceStatus, number> = {
      running: 0,
      success: 0,
      error: 0,
      timeout: 0,
    };

    const byEventType: Record<string, number> = {};
    const byHookName: Record<string, number> = {};

    allTraces.forEach(trace => {
      byStatus[trace.status] = (byStatus[trace.status] || 0) + 1;
      byEventType[trace.eventType] = (byEventType[trace.eventType] || 0) + 1;
      byHookName[trace.hookName] = (byHookName[trace.hookName] || 0) + 1;
    });

    return {
      total: allTraces.length,
      active: this.getActiveTraces().length,
      completed: this.completedTraces.length,
      byStatus,
      byEventType,
      byHookName,
    };
  }

  /**
   * Create a trace context for logging
   *
   * @param trace - Trace object
   * @returns Formatted context string
   */
  public formatTraceContext(trace: HookTrace): string {
    const duration = trace.duration ? `${trace.duration}ms` : 'running';
    return `[${trace.eventType}/${trace.hookName}] ${trace.status} (${duration})`;
  }

  /**
   * Load traces from a previously exported file
   *
   * @param filePath - Path to traces JSON file
   * @returns Loaded traces
   */
  public static loadTraces(filePath: string): HookTrace[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Trace file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Try parsing as JSON array first
    try {
      return JSON.parse(content);
    } catch (error) {
      // Try parsing as NDJSON
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    }
  }

  /**
   * Auto-export traces on process exit
   */
  public enableAutoExport(): void {
    process.on('exit', () => {
      if (this.getAllTraces().length > 0) {
        try {
          this.exportTraces();
        } catch (error) {
          console.error('[HookTracer] Failed to auto-export traces on exit:', error);
        }
      }
    });
  }
}

/**
 * Global singleton tracer instance
 */
let globalTracer: HookTracer | null = null;

/**
 * Get or create the global tracer instance
 */
export function getGlobalTracer(tracesDir?: string): HookTracer {
  if (!globalTracer) {
    globalTracer = new HookTracer(tracesDir);
    globalTracer.enableAutoExport();
  }
  return globalTracer;
}

/**
 * Reset the global tracer (useful for testing)
 */
export function resetGlobalTracer(): void {
  globalTracer = null;
}
