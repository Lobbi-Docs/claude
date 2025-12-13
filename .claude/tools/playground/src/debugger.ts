/**
 * Debugger - Agent debugging tools
 *
 * Features:
 * - Breakpoint management (line, conditional)
 * - Call stack inspection
 * - Variable watch list
 * - Execution timeline
 * - Memory snapshots
 */

import { nanoid } from 'nanoid';
import type { Breakpoint, BreakpointType, StackFrame } from './protocol.js';

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'execution_start' | 'execution_end' | 'tool_call' | 'tool_response' | 'breakpoint' | 'state_change' | 'error';
  sessionId: string;
  data: any;
  duration?: number; // milliseconds
}

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  variables: Map<string, any>;
  stack: StackFrame[];
  heapSize?: number;
  externalMemory?: number;
}

/**
 * Variable watch
 */
export interface VariableWatch {
  id: string;
  path: string;
  condition?: string; // Alert when condition is true
  history: Array<{
    timestamp: Date;
    value: any;
  }>;
}

/**
 * Debugger configuration
 */
export interface DebuggerConfig {
  enableTimeline?: boolean;
  enableMemorySnapshots?: boolean;
  snapshotInterval?: number; // milliseconds
  maxTimelineEvents?: number;
  maxSnapshots?: number;
}

/**
 * Debugger class
 */
export class Debugger {
  private breakpoints: Map<string, Breakpoint> = new Map();
  private watches: Map<string, VariableWatch> = new Map();
  private timeline: TimelineEvent[] = [];
  private snapshots: Map<string, MemorySnapshot> = new Map();

  private readonly config: Required<DebuggerConfig>;

  constructor(config: DebuggerConfig = {}) {
    this.config = {
      enableTimeline: config.enableTimeline ?? true,
      enableMemorySnapshots: config.enableMemorySnapshots ?? true,
      snapshotInterval: config.snapshotInterval ?? 1000,
      maxTimelineEvents: config.maxTimelineEvents ?? 1000,
      maxSnapshots: config.maxSnapshots ?? 100
    };
  }

  // ===== Breakpoint Management =====

  /**
   * Create a new breakpoint
   */
  createBreakpoint(type: BreakpointType, options: {
    location?: string;
    line?: number;
    condition?: string;
    toolName?: string;
    phase?: string;
    enabled?: boolean;
  }): Breakpoint {
    const breakpoint: Breakpoint = {
      id: nanoid(),
      type,
      enabled: options.enabled ?? true,
      location: options.location,
      line: options.line,
      condition: options.condition,
      toolName: options.toolName,
      phase: options.phase
    };

    this.breakpoints.set(breakpoint.id, breakpoint);
    return breakpoint;
  }

  /**
   * Get breakpoint by ID
   */
  getBreakpoint(id: string): Breakpoint | undefined {
    return this.breakpoints.get(id);
  }

  /**
   * Get all breakpoints
   */
  getAllBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Get breakpoints by type
   */
  getBreakpointsByType(type: BreakpointType): Breakpoint[] {
    return Array.from(this.breakpoints.values()).filter(bp => bp.type === type);
  }

  /**
   * Get breakpoints by location
   */
  getBreakpointsByLocation(location: string): Breakpoint[] {
    return Array.from(this.breakpoints.values()).filter(bp => bp.location === location);
  }

  /**
   * Update breakpoint
   */
  updateBreakpoint(id: string, updates: Partial<Omit<Breakpoint, 'id' | 'type'>>): boolean {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) return false;

    Object.assign(breakpoint, updates);
    return true;
  }

  /**
   * Enable breakpoint
   */
  enableBreakpoint(id: string): boolean {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) return false;

    breakpoint.enabled = true;
    return true;
  }

  /**
   * Disable breakpoint
   */
  disableBreakpoint(id: string): boolean {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) return false;

    breakpoint.enabled = false;
    return true;
  }

  /**
   * Toggle breakpoint
   */
  toggleBreakpoint(id: string): boolean {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) return false;

    breakpoint.enabled = !breakpoint.enabled;
    return true;
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  /**
   * Clear all breakpoints
   */
  clearAllBreakpoints(): void {
    this.breakpoints.clear();
  }

  // ===== Variable Watch Management =====

  /**
   * Add variable watch
   */
  addWatch(path: string, condition?: string): VariableWatch {
    const watch: VariableWatch = {
      id: nanoid(),
      path,
      condition,
      history: []
    };

    this.watches.set(watch.id, watch);
    return watch;
  }

  /**
   * Get watch by ID
   */
  getWatch(id: string): VariableWatch | undefined {
    return this.watches.get(id);
  }

  /**
   * Get all watches
   */
  getAllWatches(): VariableWatch[] {
    return Array.from(this.watches.values());
  }

  /**
   * Update watch value
   */
  updateWatchValue(id: string, value: any): boolean {
    const watch = this.watches.get(id);
    if (!watch) return false;

    watch.history.push({
      timestamp: new Date(),
      value
    });

    // Keep only last 100 values
    if (watch.history.length > 100) {
      watch.history = watch.history.slice(-100);
    }

    return true;
  }

  /**
   * Remove watch
   */
  removeWatch(id: string): boolean {
    return this.watches.delete(id);
  }

  /**
   * Clear all watches
   */
  clearAllWatches(): void {
    this.watches.clear();
  }

  // ===== Timeline Management =====

  /**
   * Add timeline event
   */
  addTimelineEvent(event: Omit<TimelineEvent, 'id'>): TimelineEvent {
    if (!this.config.enableTimeline) {
      return { ...event, id: nanoid() };
    }

    const timelineEvent: TimelineEvent = {
      ...event,
      id: nanoid()
    };

    this.timeline.push(timelineEvent);

    // Trim timeline if too large
    if (this.timeline.length > this.config.maxTimelineEvents) {
      this.timeline = this.timeline.slice(-this.config.maxTimelineEvents);
    }

    return timelineEvent;
  }

  /**
   * Get timeline events for session
   */
  getTimelineForSession(sessionId: string): TimelineEvent[] {
    return this.timeline.filter(event => event.sessionId === sessionId);
  }

  /**
   * Get timeline events by type
   */
  getTimelineByType(type: TimelineEvent['type']): TimelineEvent[] {
    return this.timeline.filter(event => event.type === type);
  }

  /**
   * Get timeline events in time range
   */
  getTimelineInRange(start: Date, end: Date): TimelineEvent[] {
    return this.timeline.filter(
      event => event.timestamp >= start && event.timestamp <= end
    );
  }

  /**
   * Clear timeline
   */
  clearTimeline(): void {
    this.timeline = [];
  }

  /**
   * Get timeline statistics
   */
  getTimelineStatistics(): {
    total: number;
    byType: Record<string, number>;
    bySession: Record<string, number>;
    avgDuration: number;
  } {
    const byType: Record<string, number> = {};
    const bySession: Record<string, number> = {};
    let totalDuration = 0;
    let countWithDuration = 0;

    this.timeline.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
      bySession[event.sessionId] = (bySession[event.sessionId] || 0) + 1;

      if (event.duration !== undefined) {
        totalDuration += event.duration;
        countWithDuration++;
      }
    });

    return {
      total: this.timeline.length,
      byType,
      bySession,
      avgDuration: countWithDuration > 0 ? totalDuration / countWithDuration : 0
    };
  }

  // ===== Memory Snapshot Management =====

  /**
   * Create memory snapshot
   */
  createSnapshot(sessionId: string, variables: Map<string, any>, stack: StackFrame[]): MemorySnapshot {
    if (!this.config.enableMemorySnapshots) {
      return {
        id: nanoid(),
        sessionId,
        timestamp: new Date(),
        variables: new Map(),
        stack: []
      };
    }

    const snapshot: MemorySnapshot = {
      id: nanoid(),
      sessionId,
      timestamp: new Date(),
      variables: new Map(variables), // Clone the map
      stack: [...stack] // Clone the array
    };

    // Capture memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      snapshot.heapSize = mem.heapUsed;
      snapshot.externalMemory = mem.external;
    }

    this.snapshots.set(snapshot.id, snapshot);

    // Trim snapshots if too many
    if (this.snapshots.size > this.config.maxSnapshots) {
      const sorted = Array.from(this.snapshots.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      const toRemove = sorted.slice(0, this.snapshots.size - this.config.maxSnapshots);
      toRemove.forEach(([id]) => this.snapshots.delete(id));
    }

    return snapshot;
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): MemorySnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Get snapshots for session
   */
  getSnapshotsForSession(sessionId: string): MemorySnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshot1Id: string, snapshot2Id: string): {
    variablesAdded: string[];
    variablesRemoved: string[];
    variablesChanged: Array<{ path: string; oldValue: any; newValue: any }>;
    heapDelta?: number;
  } | null {
    const s1 = this.snapshots.get(snapshot1Id);
    const s2 = this.snapshots.get(snapshot2Id);

    if (!s1 || !s2) return null;

    const keys1 = new Set(s1.variables.keys());
    const keys2 = new Set(s2.variables.keys());

    const variablesAdded = Array.from(keys2).filter(k => !keys1.has(k));
    const variablesRemoved = Array.from(keys1).filter(k => !keys2.has(k));
    const variablesChanged: Array<{ path: string; oldValue: any; newValue: any }> = [];

    // Check for changed values
    for (const key of keys1) {
      if (keys2.has(key)) {
        const v1 = s1.variables.get(key);
        const v2 = s2.variables.get(key);

        if (JSON.stringify(v1) !== JSON.stringify(v2)) {
          variablesChanged.push({
            path: key,
            oldValue: v1,
            newValue: v2
          });
        }
      }
    }

    return {
      variablesAdded,
      variablesRemoved,
      variablesChanged,
      heapDelta: s1.heapSize && s2.heapSize ? s2.heapSize - s1.heapSize : undefined
    };
  }

  /**
   * Delete snapshot
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * Clear all snapshots
   */
  clearAllSnapshots(): void {
    this.snapshots.clear();
  }

  // ===== Stack Inspection =====

  /**
   * Format stack trace
   */
  formatStackTrace(stack: StackFrame[]): string {
    return stack
      .map((frame, index) => {
        const location = frame.location && frame.line
          ? `${frame.location}:${frame.line}`
          : frame.location || 'unknown';

        return `  ${index}. ${frame.name} (${location})`;
      })
      .join('\n');
  }

  /**
   * Get variable from stack frame
   */
  getStackVariable(stack: StackFrame[], frameIndex: number, variableName: string): any {
    if (frameIndex >= stack.length) return undefined;

    const frame = stack[frameIndex];
    return frame.variables[variableName];
  }

  /**
   * Get all variables in scope
   */
  getAllVariablesInScope(stack: StackFrame[]): Record<string, any> {
    const allVars: Record<string, any> = {};

    // Merge variables from all frames (innermost first)
    for (let i = stack.length - 1; i >= 0; i--) {
      Object.assign(allVars, stack[i].variables);
    }

    return allVars;
  }

  // ===== Utility Methods =====

  /**
   * Get statistics
   */
  getStatistics(): {
    breakpoints: number;
    watches: number;
    timelineEvents: number;
    snapshots: number;
  } {
    return {
      breakpoints: this.breakpoints.size,
      watches: this.watches.size,
      timelineEvents: this.timeline.length,
      snapshots: this.snapshots.size
    };
  }

  /**
   * Reset all debugging state
   */
  reset(): void {
    this.clearAllBreakpoints();
    this.clearAllWatches();
    this.clearTimeline();
    this.clearAllSnapshots();
  }

  /**
   * Export debugging session data
   */
  exportSession(sessionId: string): {
    timeline: TimelineEvent[];
    snapshots: MemorySnapshot[];
  } {
    return {
      timeline: this.getTimelineForSession(sessionId),
      snapshots: this.getSnapshotsForSession(sessionId)
    };
  }
}
