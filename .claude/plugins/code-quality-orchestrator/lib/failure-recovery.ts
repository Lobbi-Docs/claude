/**
 * Failure Recovery Module for Jira Work Orchestrator v5.0
 *
 * Implements circuit breakers, negative caching, checkpointing,
 * and escalation patterns to prevent context waste.
 */

// Search timeout limits
export const SEARCH_LIMITS = {
  maxSearchAttempts: 3,
  timeouts: {
    glob: 5000,
    grep: 10000,
    explore: 30000,
    jiraFetch: 10000,
    confluence: 15000
  },
  contextBudget: {
    EXPLORE: 5000,
    PLAN: 3000,
    CODE: 15000,
    TEST: 5000,
    QUALITY: 3000,
    FIX: 8000,
    COMMIT: 2000
  }
} as const;

// Negative cache for failed searches
interface NegativeCacheEntry {
  query: string;
  timestamp: number;
  reason: string;
  ttl: number;
}

class NegativeCache {
  private cache: Map<string, NegativeCacheEntry> = new Map();

  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private isExpired(entry: NegativeCacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  get(query: string): NegativeCacheEntry | null {
    const key = this.hashQuery(query);
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  set(query: string, reason: string, ttlMs = 5 * 60 * 1000): void {
    const key = this.hashQuery(query);
    this.cache.set(key, {
      query,
      timestamp: Date.now(),
      reason,
      ttl: ttlMs
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const negativeCache = new NegativeCache();

// Circuit breaker implementation
interface RetryBudget {
  maxRetries: number;
  currentRetries: number;
  backoffMs: number[];
  circuitOpen: boolean;
  lastFailure?: number;
}

class CircuitBreaker {
  private budgets: Map<string, RetryBudget> = new Map();
  private cooldownMs = 60000;

  constructor() {
    this.budgets.set('jiraApi', {
      maxRetries: 3,
      currentRetries: 0,
      backoffMs: [1000, 2000, 4000],
      circuitOpen: false
    });
    this.budgets.set('confluence', {
      maxRetries: 2,
      currentRetries: 0,
      backoffMs: [2000, 5000],
      circuitOpen: false
    });
    this.budgets.set('githubApi', {
      maxRetries: 3,
      currentRetries: 0,
      backoffMs: [1000, 2000, 4000],
      circuitOpen: false
    });
    this.budgets.set('codeSearch', {
      maxRetries: 3,
      currentRetries: 0,
      backoffMs: [500, 1000, 2000],
      circuitOpen: false
    });
  }

  async execute<T>(
    service: string,
    operation: () => Promise<T>
  ): Promise<T | null> {
    const budget = this.budgets.get(service);
    if (!budget) {
      return operation();
    }

    if (budget.circuitOpen) {
      const timeSinceFailure = Date.now() - (budget.lastFailure || 0);
      if (timeSinceFailure < this.cooldownMs) {
        return null;
      }
      budget.circuitOpen = false;
    }

    for (let attempt = 0; attempt < budget.maxRetries; attempt++) {
      try {
        const result = await operation();
        budget.currentRetries = 0;
        return result;
      } catch (error) {
        budget.currentRetries++;
        budget.lastFailure = Date.now();

        if (attempt < budget.maxRetries - 1) {
          await this.sleep(budget.backoffMs[attempt]);
        }
      }
    }

    budget.circuitOpen = true;
    return null;
  }

  isOpen(service: string): boolean {
    return this.budgets.get(service)?.circuitOpen || false;
  }

  reset(service: string): void {
    const budget = this.budgets.get(service);
    if (budget) {
      budget.currentRetries = 0;
      budget.circuitOpen = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const circuitBreaker = new CircuitBreaker();

// Phase checkpointing
export interface PhaseCheckpoint {
  phase: string;
  issueKey: string;
  timestamp: string;
  artifacts: {
    filesIdentified: string[];
    planSummary?: string;
    codeChanges?: string[];
    testResults?: any;
    qualityScore?: number;
  };
  contextUsed: number;
  canResume: boolean;
}

class CheckpointManager {
  private checkpoints: Map<string, PhaseCheckpoint> = new Map();

  save(issueKey: string, phase: string, checkpoint: PhaseCheckpoint): void {
    const key = `${issueKey}:${phase}`;
    this.checkpoints.set(key, checkpoint);
  }

  get(issueKey: string, phase: string): PhaseCheckpoint | null {
    const key = `${issueKey}:${phase}`;
    return this.checkpoints.get(key) || null;
  }

  getLatestResumable(issueKey: string): PhaseCheckpoint | null {
    const phases = ['COMMIT', 'FIX', 'QUALITY', 'TEST', 'CODE', 'PLAN', 'EXPLORE'];

    for (const phase of phases) {
      const checkpoint = this.get(issueKey, phase);
      if (checkpoint?.canResume) {
        return checkpoint;
      }
    }
    return null;
  }

  clear(issueKey: string): void {
    const phases = ['COMMIT', 'FIX', 'QUALITY', 'TEST', 'CODE', 'PLAN', 'EXPLORE'];
    for (const phase of phases) {
      this.checkpoints.delete(`${issueKey}:${phase}`);
    }
  }
}

export const checkpointManager = new CheckpointManager();

// Context budget tracker
export class ContextBudgetTracker {
  private usage: Map<string, number> = new Map();
  private readonly totalBudget: number;

  constructor(totalBudget = 100000) {
    this.totalBudget = totalBudget;
  }

  consume(phase: string, tokens: number): boolean {
    const current = this.usage.get(phase) || 0;
    const phaseBudget = SEARCH_LIMITS.contextBudget[phase as keyof typeof SEARCH_LIMITS.contextBudget];

    if (phaseBudget && current + tokens > phaseBudget) {
      return false;
    }

    this.usage.set(phase, current + tokens);
    return true;
  }

  getUsed(): number {
    return Array.from(this.usage.values()).reduce((a, b) => a + b, 0);
  }

  getRemaining(): number {
    return this.totalBudget - this.getUsed();
  }

  getPhaseUsage(phase: string): number {
    return this.usage.get(phase) || 0;
  }

  shouldCheckpoint(): boolean {
    return this.getRemaining() < this.totalBudget * 0.25;
  }

  shouldCompress(): boolean {
    return this.getRemaining() < this.totalBudget * 0.10;
  }

  reset(): void {
    this.usage.clear();
  }
}

// Fallback strategies
export type FallbackStrategy =
  | 'jiraUnavailable'
  | 'confluenceUnavailable'
  | 'searchFailed'
  | 'gateTimeout';

export const FALLBACK_STRATEGIES: Record<FallbackStrategy, {
  action: string;
  steps: string[];
}> = {
  jiraUnavailable: {
    action: 'useLocalContext',
    steps: [
      'Parse issue key from branch name',
      'Extract context from commit messages',
      'Use cached issue data if available',
      'Proceed with minimal context, mark as draft'
    ]
  },
  confluenceUnavailable: {
    action: 'skipDocumentation',
    steps: [
      'Skip Confluence search in EXPLORE',
      'Skip doc generation in COMMIT',
      'Add TODO for manual documentation',
      'Continue with code-only workflow'
    ]
  },
  searchFailed: {
    action: 'broaden',
    steps: [
      'Try parent directory',
      'Use simpler glob pattern',
      'Search by keyword instead of path',
      'Fall back to git log for file history'
    ]
  },
  gateTimeout: {
    action: 'partialCheck',
    steps: [
      'Run only fast gates (lint, format)',
      'Skip slow gates (coverage, complexity)',
      'Mark PR as "needs-full-review"',
      'Schedule async quality check'
    ]
  }
};

// Escalation levels
export enum EscalationLevel {
  SELF_RECOVERY = 1,
  STRATEGY_PIVOT = 2,
  GRACEFUL_DEGRADATION = 3,
  HUMAN_ESCALATION = 4
}

export interface EscalationResult {
  level: EscalationLevel;
  resolved: boolean;
  action: string;
  message: string;
  requiresHuman: boolean;
}

export function determineEscalation(
  retryCount: number,
  hasAlternatives: boolean,
  isCritical: boolean
): EscalationResult {
  if (retryCount <= 3 && hasAlternatives) {
    return {
      level: EscalationLevel.SELF_RECOVERY,
      resolved: false,
      action: 'retry',
      message: 'Retrying with refined query',
      requiresHuman: false
    };
  }

  if (retryCount <= 5 && hasAlternatives) {
    return {
      level: EscalationLevel.STRATEGY_PIVOT,
      resolved: false,
      action: 'pivot',
      message: 'Switching search strategy',
      requiresHuman: false
    };
  }

  if (!isCritical) {
    return {
      level: EscalationLevel.GRACEFUL_DEGRADATION,
      resolved: true,
      action: 'proceed',
      message: 'Proceeding with partial context',
      requiresHuman: false
    };
  }

  return {
    level: EscalationLevel.HUMAN_ESCALATION,
    resolved: false,
    action: 'pause',
    message: 'Critical information missing - requires human input',
    requiresHuman: true
  };
}

// Utility: timeout wrapper
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}

// Utility: fallback wrapper
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  timeoutMs = 30000
): Promise<{ result: T; usedFallback: boolean }> {
  try {
    const result = await withTimeout(primary(), timeoutMs);
    return { result, usedFallback: false };
  } catch {
    const result = await fallbackFn();
    return { result, usedFallback: true };
  }
}
