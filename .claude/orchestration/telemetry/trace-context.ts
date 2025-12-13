/**
 * Trace Context
 *
 * Distributed tracing implementation for agent orchestration
 * OpenTelemetry compatible trace propagation
 */

import {
  Span,
  SpanEvent,
  SpanStatus,
  SpanStatusCode,
  SpanKind,
  TraceContext as TraceContextType,
} from './types';

/**
 * Generate a random ID for trace/span
 */
function generateId(length: number = 16): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * TraceContext class
 *
 * Manages distributed tracing context across agent hierarchy
 */
export class TraceContext {
  private spans: Map<string, Span> = new Map();
  private activeSpans: Map<string, string> = new Map(); // agentId -> spanId

  /**
   * Start a new root trace
   */
  startTrace(name: string, kind: SpanKind = SpanKind.INTERNAL): Span {
    const traceId = generateId(32);
    const spanId = generateId(16);

    const span: Span = {
      traceId,
      spanId,
      name,
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: { code: SpanStatusCode.UNSET },
      kind,
    };

    this.spans.set(spanId, span);
    return span;
  }

  /**
   * Start a child span
   */
  startSpan(parent: Span, name: string, kind: SpanKind = SpanKind.INTERNAL): Span {
    const spanId = generateId(16);

    const span: Span = {
      traceId: parent.traceId,
      spanId,
      parentSpanId: parent.spanId,
      name,
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: { code: SpanStatusCode.UNSET },
      kind,
    };

    this.spans.set(spanId, span);
    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, status?: SpanStatus): void {
    span.endTime = Date.now();
    if (status) {
      span.status = status;
    } else if (span.status.code === SpanStatusCode.UNSET) {
      span.status = { code: SpanStatusCode.OK };
    }

    this.spans.set(span.spanId, span);
  }

  /**
   * Add an event to a span
   */
  addEvent(span: Span, name: string, attributes?: Record<string, any>): void {
    const event: SpanEvent = {
      name,
      timestamp: Date.now(),
      attributes,
    };
    span.events.push(event);
    this.spans.set(span.spanId, span);
  }

  /**
   * Set span attributes
   */
  setAttributes(span: Span, attributes: Record<string, any>): void {
    span.attributes = { ...span.attributes, ...attributes };
    this.spans.set(span.spanId, span);
  }

  /**
   * Set span status
   */
  setStatus(span: Span, status: SpanStatus): void {
    span.status = status;
    this.spans.set(span.spanId, span);
  }

  /**
   * Mark span as error
   */
  recordError(span: Span, error: Error | string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    this.addEvent(span, 'exception', {
      'exception.type': typeof error === 'string' ? 'Error' : error.constructor.name,
      'exception.message': errorMessage,
      'exception.stacktrace': errorStack,
    });

    this.setStatus(span, {
      code: SpanStatusCode.ERROR,
      message: errorMessage,
    });
  }

  /**
   * Propagate trace context as header string (W3C Trace Context format)
   */
  propagate(span: Span): string {
    const { traceId, spanId } = span;
    const traceFlags = '01'; // Sampled
    return `00-${traceId}-${spanId}-${traceFlags}`;
  }

  /**
   * Extract trace context from header string (W3C Trace Context format)
   */
  extract(header: string): TraceContextType | null {
    const parts = header.split('-');
    if (parts.length !== 4 || parts[0] !== '00') {
      return null;
    }

    return {
      traceId: parts[1],
      spanId: parts[2],
      traceFlags: parseInt(parts[3], 16),
    };
  }

  /**
   * Create a span from extracted trace context
   */
  continueTrace(traceContext: TraceContextType, name: string, kind: SpanKind = SpanKind.INTERNAL): Span {
    const spanId = generateId(16);

    const span: Span = {
      traceId: traceContext.traceId,
      spanId,
      parentSpanId: traceContext.spanId,
      name,
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: { code: SpanStatusCode.UNSET },
      kind,
    };

    this.spans.set(spanId, span);
    return span;
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): Span[] {
    const spans: Span[] = [];
    for (const span of this.spans.values()) {
      if (span.traceId === traceId) {
        spans.push(span);
      }
    }
    return spans.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get all active spans
   */
  getActiveSpans(): Span[] {
    const active: Span[] = [];
    for (const span of this.spans.values()) {
      if (!span.endTime) {
        active.push(span);
      }
    }
    return active;
  }

  /**
   * Set active span for an agent
   */
  setActiveSpan(agentId: string, span: Span): void {
    this.activeSpans.set(agentId, span.spanId);
  }

  /**
   * Get active span for an agent
   */
  getActiveSpan(agentId: string): Span | undefined {
    const spanId = this.activeSpans.get(agentId);
    return spanId ? this.spans.get(spanId) : undefined;
  }

  /**
   * Clear active span for an agent
   */
  clearActiveSpan(agentId: string): void {
    this.activeSpans.delete(agentId);
  }

  /**
   * Calculate span duration in milliseconds
   */
  getSpanDuration(span: Span): number | null {
    if (!span.endTime) {
      return null;
    }
    return span.endTime - span.startTime;
  }

  /**
   * Export spans in OpenTelemetry JSON format
   */
  exportSpans(traceId?: string): any[] {
    const spansToExport = traceId
      ? this.getTraceSpans(traceId)
      : Array.from(this.spans.values());

    return spansToExport.map((span) => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: span.kind,
      startTimeUnixNano: span.startTime * 1000000,
      endTimeUnixNano: span.endTime ? span.endTime * 1000000 : undefined,
      attributes: Object.entries(span.attributes).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) },
      })),
      events: span.events.map((event) => ({
        timeUnixNano: event.timestamp * 1000000,
        name: event.name,
        attributes: event.attributes
          ? Object.entries(event.attributes).map(([key, value]) => ({
              key,
              value: { stringValue: String(value) },
            }))
          : [],
      })),
      status: {
        code: span.status.code,
        message: span.status.message,
      },
    }));
  }

  /**
   * Clear all spans (useful for testing)
   */
  clear(): void {
    this.spans.clear();
    this.activeSpans.clear();
  }

  /**
   * Clear spans older than the specified age in milliseconds
   */
  clearOldSpans(maxAge: number): void {
    const now = Date.now();
    for (const [spanId, span] of this.spans.entries()) {
      if (span.endTime && now - span.endTime > maxAge) {
        this.spans.delete(spanId);
      }
    }
  }

  /**
   * Get trace statistics
   */
  getTraceStats(traceId: string): {
    totalSpans: number;
    activeSpans: number;
    completedSpans: number;
    errorSpans: number;
    totalDuration: number;
  } {
    const spans = this.getTraceSpans(traceId);
    let activeCount = 0;
    let completedCount = 0;
    let errorCount = 0;
    let totalDuration = 0;

    for (const span of spans) {
      if (!span.endTime) {
        activeCount++;
      } else {
        completedCount++;
        totalDuration += span.endTime - span.startTime;
      }
      if (span.status.code === SpanStatusCode.ERROR) {
        errorCount++;
      }
    }

    return {
      totalSpans: spans.length,
      activeSpans: activeCount,
      completedSpans: completedCount,
      errorSpans: errorCount,
      totalDuration,
    };
  }
}

// Singleton instance
export const traceContext = new TraceContext();
