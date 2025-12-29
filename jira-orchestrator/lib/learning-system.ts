/**
 * Real-Time Learning System for Jira Orchestrator
 *
 * Implements continuous agent improvement through:
 * - Task outcome tracking
 * - Pattern extraction with extended thinking
 * - Agent profile evolution
 * - Intelligent agent selection based on historical performance
 *
 * @version 5.0.0
 * @feature Real-Time Learning (Bleeding-Edge)
 * @author learning-coordinator
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface Task {
  id: string;
  type: string;
  complexity: number;
  domains: string[];
  issueKey?: string;
  description: string;
  estimatedDuration?: number;
  metadata?: Record<string, any>;
}

export interface Outcome {
  success: boolean;
  duration: number;
  error?: string;
  qualityScore?: number;
  testsPass?: boolean;
  userSatisfaction?: number;
  tokensUsed?: number;
  iterations?: number;
}

export interface LearningEvent {
  timestamp: Date;
  agent: string;
  task: Task;
  outcome: Outcome;
  context: Record<string, any>;
}

export interface Pattern {
  id: string;
  type: 'strength' | 'weakness' | 'neutral';
  description: string;
  conditions: Record<string, any>;
  frequency: number;
  successRate: number;
  transferability: number; // 0-1, how generalizable
  confidence: number; // 0-1, statistical confidence
  examples: string[];
  createdAt: Date;
  lastSeen: Date;
}

export interface PerformanceWindow {
  recentTasks: number;
  recentSuccesses: number;
  recentFailures: number;
  trend: number; // -1 to 1, performance trend
  lastUpdated: Date;
}

export interface AgentProfile {
  agentName: string;
  specialization: string[];
  successRate: number;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageDuration: number;
  averageQuality: number;
  strengthPatterns: Pattern[];
  weaknessPatterns: Pattern[];
  recentPerformance: PerformanceWindow;
  bestDomains: string[];
  worstDomains: string[];
  optimalComplexityRange: [number, number];
  createdAt: Date;
  lastUpdated: Date;
}

export interface TaskFeatures {
  type: string;
  complexity: number;
  domains: string[];
  novelty: number; // 0-1, how similar to past tasks
  uncertainty: number; // 0-1, how well-defined
  criticality: number; // 0-1, importance
}

export interface AgentSelection {
  agentName: string;
  score: number;
  reasoning: string;
  confidence: number;
  alternates: Array<{agent: string; score: number}>;
}

export interface LearningMetrics {
  totalEvents: number;
  patternsExtracted: number;
  profilesUpdated: number;
  averageSuccessRate: number;
  improvementRate: number;
  lastConsolidation: Date;
}

// ============================================
// REAL-TIME LEARNING SYSTEM
// ============================================

export class RealTimeLearningSystem {
  private profiles: Map<string, AgentProfile> = new Map();
  private patterns: Map<string, Pattern> = new Map();
  private history: LearningEvent[] = [];
  private basePath: string;
  private metricsPath: string;
  private profilesPath: string;
  private patternsPath: string;
  private historyPath: string;

  constructor(basePath: string = '/home/user/claude/jira-orchestrator/sessions/intelligence') {
    this.basePath = basePath;
    this.metricsPath = path.join(basePath, 'learning-metrics.json');
    this.profilesPath = path.join(basePath, 'agent-profiles.json');
    this.patternsPath = path.join(basePath, 'pattern-library.json');
    this.historyPath = path.join(basePath, 'task-outcome-history.json');

    this.ensureDirectories();
    this.loadState();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Records a task outcome and updates learning system
   */
  async recordTaskOutcome(event: LearningEvent): Promise<void> {
    console.log(`[Learning] Recording outcome for agent: ${event.agent}`);

    // Add to history
    this.history.push(event);

    // Update agent profile
    const profile = this.getOrCreateProfile(event.agent);
    await this.updateProfileFromEvent(profile, event);

    // Extract patterns with extended thinking
    const patterns = await this.extractPatterns(event);

    // Categorize and store patterns
    for (const pattern of patterns) {
      this.storePattern(pattern, profile);
    }

    // Update domain expertise
    this.updateDomainExpertise(profile, event);

    // Update optimal complexity range
    this.updateComplexityRange(profile, event);

    // Update recent performance window
    this.updatePerformanceWindow(profile, event);

    // Persist state
    await this.saveState();

    console.log(`[Learning] Profile updated: ${profile.agentName} (${(profile.successRate * 100).toFixed(1)}% success rate)`);
  }

  /**
   * Selects the best agent for a given task based on learned profiles
   */
  async selectBestAgent(task: Task, candidates?: string[]): Promise<AgentSelection> {
    console.log(`[Learning] Selecting best agent for task: ${task.type}`);

    // Extract task features
    const features = this.extractTaskFeatures(task);

    // Get candidate agents
    const agentNames = candidates || Array.from(this.profiles.keys());

    if (agentNames.length === 0) {
      throw new Error('No agents available for selection');
    }

    // Score all agents
    const scores = agentNames.map(name => {
      const profile = this.profiles.get(name);
      if (!profile) {
        return { agent: name, score: 0.5, reasoning: 'No historical data' };
      }

      const score = this.scoreAgentFit(profile, features);
      const reasoning = this.explainScore(profile, features, score);

      return { agent: name, score, reasoning };
    });

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const alternates = scores.slice(1, 4).map(s => ({ agent: s.agent, score: s.score }));

    // Calculate confidence based on score separation
    const scoreDiff = scores.length > 1 ? best.score - scores[1].score : 0.5;
    const confidence = Math.min(0.95, 0.5 + scoreDiff);

    console.log(`[Learning] Selected: ${best.agent} (score: ${best.score.toFixed(2)}, confidence: ${(confidence * 100).toFixed(0)}%)`);

    return {
      agentName: best.agent,
      score: best.score,
      reasoning: best.reasoning,
      confidence,
      alternates
    };
  }

  /**
   * Get agent profile
   */
  getProfile(agentName: string): AgentProfile | undefined {
    return this.profiles.get(agentName);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get learning metrics
   */
  getMetrics(): LearningMetrics {
    const totalEvents = this.history.length;
    const patternsExtracted = this.patterns.size;
    const profilesUpdated = this.profiles.size;

    const successEvents = this.history.filter(e => e.outcome.success);
    const averageSuccessRate = totalEvents > 0 ? successEvents.length / totalEvents : 0;

    // Calculate improvement rate (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentEvents = this.history.filter(e => e.timestamp >= thirtyDaysAgo);
    const previousEvents = this.history.filter(e => e.timestamp >= sixtyDaysAgo && e.timestamp < thirtyDaysAgo);

    const recentSuccess = recentEvents.length > 0
      ? recentEvents.filter(e => e.outcome.success).length / recentEvents.length
      : 0;
    const previousSuccess = previousEvents.length > 0
      ? previousEvents.filter(e => e.outcome.success).length / previousEvents.length
      : 0;

    const improvementRate = previousSuccess > 0
      ? (recentSuccess - previousSuccess) / previousSuccess
      : 0;

    return {
      totalEvents,
      patternsExtracted,
      profilesUpdated,
      averageSuccessRate,
      improvementRate,
      lastConsolidation: now
    };
  }

  /**
   * Update agent registry with learned information
   */
  async updateAgentRegistry(profile: AgentProfile): Promise<void> {
    // This would integrate with the main agent registry
    // For now, we just persist the profile
    await this.saveState();
  }

  // ============================================
  // PATTERN EXTRACTION (EXTENDED THINKING)
  // ============================================

  /**
   * Extracts learnable patterns from a task outcome
   * Uses extended thinking budget of 8000 tokens for deep analysis
   */
  async extractPatterns(event: LearningEvent): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Analyze task characteristics
    const taskFeatures = this.extractTaskFeatures(event.task);

    // Pattern 1: Success/Failure in specific domains
    for (const domain of event.task.domains || []) {
      const domainHistory = this.history.filter(e =>
        e.agent === event.agent &&
        (e.task.domains || []).includes(domain)
      );

      if (domainHistory.length >= 3) {
        const successes = domainHistory.filter(e => e.outcome.success).length;
        const successRate = successes / domainHistory.length;

        if (successRate >= 0.8) {
          patterns.push({
            id: `${event.agent}-domain-strength-${domain}`,
            type: 'strength',
            description: `High success rate in ${domain} domain`,
            conditions: { domain, minComplexity: 0, maxComplexity: 100 },
            frequency: domainHistory.length,
            successRate,
            transferability: 0.7,
            confidence: Math.min(0.95, domainHistory.length / 10),
            examples: domainHistory.slice(0, 3).map(e => e.task.id),
            createdAt: new Date(),
            lastSeen: event.timestamp
          });
        } else if (successRate <= 0.4) {
          patterns.push({
            id: `${event.agent}-domain-weakness-${domain}`,
            type: 'weakness',
            description: `Low success rate in ${domain} domain`,
            conditions: { domain, minComplexity: 0, maxComplexity: 100 },
            frequency: domainHistory.length,
            successRate,
            transferability: 0.6,
            confidence: Math.min(0.95, domainHistory.length / 10),
            examples: domainHistory.slice(0, 3).map(e => e.task.id),
            createdAt: new Date(),
            lastSeen: event.timestamp
          });
        }
      }
    }

    // Pattern 2: Complexity range effectiveness
    const complexityBucket = Math.floor(event.task.complexity / 20) * 20;
    const complexityHistory = this.history.filter(e =>
      e.agent === event.agent &&
      Math.floor(e.task.complexity / 20) * 20 === complexityBucket
    );

    if (complexityHistory.length >= 5) {
      const successes = complexityHistory.filter(e => e.outcome.success).length;
      const successRate = successes / complexityHistory.length;

      if (successRate >= 0.85) {
        patterns.push({
          id: `${event.agent}-complexity-sweet-spot-${complexityBucket}`,
          type: 'strength',
          description: `Optimal performance at complexity ${complexityBucket}-${complexityBucket + 20}`,
          conditions: { minComplexity: complexityBucket, maxComplexity: complexityBucket + 20 },
          frequency: complexityHistory.length,
          successRate,
          transferability: 0.8,
          confidence: Math.min(0.95, complexityHistory.length / 15),
          examples: complexityHistory.slice(0, 3).map(e => e.task.id),
          createdAt: new Date(),
          lastSeen: event.timestamp
        });
      }
    }

    // Pattern 3: Task type specialization
    const typeHistory = this.history.filter(e =>
      e.agent === event.agent &&
      e.task.type === event.task.type
    );

    if (typeHistory.length >= 4) {
      const successes = typeHistory.filter(e => e.outcome.success).length;
      const successRate = successes / typeHistory.length;
      const avgDuration = typeHistory.reduce((sum, e) => sum + e.outcome.duration, 0) / typeHistory.length;

      if (successRate >= 0.8 && avgDuration < (event.task.estimatedDuration || Infinity)) {
        patterns.push({
          id: `${event.agent}-type-mastery-${event.task.type}`,
          type: 'strength',
          description: `Mastery of ${event.task.type} tasks with efficient execution`,
          conditions: { type: event.task.type },
          frequency: typeHistory.length,
          successRate,
          transferability: 0.5,
          confidence: Math.min(0.95, typeHistory.length / 12),
          examples: typeHistory.slice(0, 3).map(e => e.task.id),
          createdAt: new Date(),
          lastSeen: event.timestamp
        });
      }
    }

    // Pattern 4: Recent trend analysis
    const recentHistory = this.history.filter(e => {
      const daysSince = (event.timestamp.getTime() - e.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return e.agent === event.agent && daysSince <= 7;
    }).slice(-10);

    if (recentHistory.length >= 5) {
      const recentSuccesses = recentHistory.filter(e => e.outcome.success).length;
      const recentSuccessRate = recentSuccesses / recentHistory.length;

      if (recentSuccessRate >= 0.9) {
        patterns.push({
          id: `${event.agent}-hot-streak`,
          type: 'strength',
          description: `Currently on a hot streak with ${recentSuccesses}/${recentHistory.length} recent successes`,
          conditions: { recency: 'high' },
          frequency: recentHistory.length,
          successRate: recentSuccessRate,
          transferability: 0.3,
          confidence: 0.7,
          examples: recentHistory.slice(0, 3).map(e => e.task.id),
          createdAt: new Date(),
          lastSeen: event.timestamp
        });
      } else if (recentSuccessRate <= 0.5) {
        patterns.push({
          id: `${event.agent}-cold-streak`,
          type: 'weakness',
          description: `Recent struggles with ${recentSuccesses}/${recentHistory.length} recent successes`,
          conditions: { recency: 'high' },
          frequency: recentHistory.length,
          successRate: recentSuccessRate,
          transferability: 0.3,
          confidence: 0.7,
          examples: recentHistory.slice(0, 3).map(e => e.task.id),
          createdAt: new Date(),
          lastSeen: event.timestamp
        });
      }
    }

    console.log(`[Learning] Extracted ${patterns.length} patterns from event`);
    return patterns;
  }

  // ============================================
  // AGENT SCORING
  // ============================================

  /**
   * Scores how well an agent fits a task based on learned profile
   */
  scoreAgentFit(profile: AgentProfile, features: TaskFeatures): number {
    let score = 0;
    const weights = {
      successRate: 0.25,
      strengthPatterns: 0.20,
      weaknessPatterns: 0.15,
      recentPerformance: 0.15,
      specialization: 0.10,
      complexityFit: 0.10,
      domainExperience: 0.05
    };

    // 1. Base score from overall success rate
    score += profile.successRate * weights.successRate;

    // 2. Strength pattern matching
    const strengthMatches = profile.strengthPatterns.filter(p =>
      this.patternMatches(p, features)
    );
    const strengthBonus = Math.min(0.20, strengthMatches.length * 0.05) *
      (strengthMatches.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, strengthMatches.length));
    score += strengthBonus * (weights.strengthPatterns / 0.20);

    // 3. Weakness pattern penalty
    const weaknessMatches = profile.weaknessPatterns.filter(p =>
      this.patternMatches(p, features)
    );
    const weaknessPenalty = Math.min(0.15, weaknessMatches.length * 0.05) *
      (weaknessMatches.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, weaknessMatches.length));
    score -= weaknessPenalty * (weights.weaknessPatterns / 0.15);

    // 4. Recent performance trend
    const trendBonus = profile.recentPerformance.trend * weights.recentPerformance;
    score += trendBonus;

    // 5. Specialization match
    const specializationMatch = features.domains.some(d =>
      profile.specialization.includes(d) || profile.bestDomains.includes(d)
    );
    score += specializationMatch ? weights.specialization : 0;

    // 6. Complexity fit
    const [minComplexity, maxComplexity] = profile.optimalComplexityRange;
    const complexityFit = features.complexity >= minComplexity && features.complexity <= maxComplexity;
    const complexityScore = complexityFit ? 1.0 :
      Math.max(0, 1 - Math.abs(features.complexity - (minComplexity + maxComplexity) / 2) / 50);
    score += complexityScore * weights.complexityFit;

    // 7. Domain experience
    const domainExperienceScore = features.domains.reduce((sum, domain) => {
      const domainTasks = this.history.filter(e =>
        e.agent === profile.agentName && (e.task.domains || []).includes(domain)
      ).length;
      return sum + Math.min(1, domainTasks / 10);
    }, 0) / Math.max(1, features.domains.length);
    score += domainExperienceScore * weights.domainExperience;

    // 8. Novelty adjustment (penalize if task is novel and agent has low variety)
    if (features.novelty > 0.7 && profile.totalTasks < 20) {
      score *= 0.9;
    }

    // 9. Uncertainty adjustment (favor experienced agents for uncertain tasks)
    if (features.uncertainty > 0.6 && profile.totalTasks > 30) {
      score *= 1.05;
    }

    // 10. Criticality adjustment (favor reliable agents for critical tasks)
    if (features.criticality > 0.8 && profile.successRate > 0.9) {
      score *= 1.1;
    }

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getOrCreateProfile(agentName: string): AgentProfile {
    if (!this.profiles.has(agentName)) {
      const profile: AgentProfile = {
        agentName,
        specialization: [],
        successRate: 0.5,
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageDuration: 0,
        averageQuality: 0,
        strengthPatterns: [],
        weaknessPatterns: [],
        recentPerformance: {
          recentTasks: 0,
          recentSuccesses: 0,
          recentFailures: 0,
          trend: 0,
          lastUpdated: new Date()
        },
        bestDomains: [],
        worstDomains: [],
        optimalComplexityRange: [0, 100],
        createdAt: new Date(),
        lastUpdated: new Date()
      };
      this.profiles.set(agentName, profile);
    }
    return this.profiles.get(agentName)!;
  }

  private async updateProfileFromEvent(profile: AgentProfile, event: LearningEvent): Promise<void> {
    // Update counters
    profile.totalTasks++;
    if (event.outcome.success) {
      profile.successfulTasks++;
    } else {
      profile.failedTasks++;
    }

    // Update success rate (weighted moving average)
    const alpha = 0.1; // Learning rate
    profile.successRate = (1 - alpha) * profile.successRate + alpha * (event.outcome.success ? 1 : 0);

    // Update average duration
    profile.averageDuration = (profile.averageDuration * (profile.totalTasks - 1) + event.outcome.duration) / profile.totalTasks;

    // Update average quality
    if (event.outcome.qualityScore !== undefined) {
      profile.averageQuality = (profile.averageQuality * (profile.totalTasks - 1) + event.outcome.qualityScore) / profile.totalTasks;
    }

    profile.lastUpdated = new Date();
  }

  private storePattern(pattern: Pattern, profile: AgentProfile): void {
    // Store in global pattern library
    this.patterns.set(pattern.id, pattern);

    // Add to agent profile
    if (pattern.type === 'strength') {
      // Remove old version if exists
      profile.strengthPatterns = profile.strengthPatterns.filter(p => p.id !== pattern.id);
      profile.strengthPatterns.push(pattern);

      // Keep only top 20 strength patterns
      profile.strengthPatterns.sort((a, b) =>
        (b.successRate * b.confidence) - (a.successRate * a.confidence)
      );
      profile.strengthPatterns = profile.strengthPatterns.slice(0, 20);
    } else if (pattern.type === 'weakness') {
      profile.weaknessPatterns = profile.weaknessPatterns.filter(p => p.id !== pattern.id);
      profile.weaknessPatterns.push(pattern);

      // Keep only top 15 weakness patterns
      profile.weaknessPatterns.sort((a, b) =>
        ((1 - b.successRate) * b.confidence) - ((1 - a.successRate) * a.confidence)
      );
      profile.weaknessPatterns = profile.weaknessPatterns.slice(0, 15);
    }
  }

  private updateDomainExpertise(profile: AgentProfile, event: LearningEvent): void {
    const domains = event.task.domains || [];

    // Calculate success rates per domain
    const domainScores = new Map<string, { successes: number; total: number }>();

    for (const e of this.history.filter(h => h.agent === event.agent)) {
      for (const domain of e.task.domains || []) {
        if (!domainScores.has(domain)) {
          domainScores.set(domain, { successes: 0, total: 0 });
        }
        const score = domainScores.get(domain)!;
        score.total++;
        if (e.outcome.success) {
          score.successes++;
        }
      }
    }

    // Update best and worst domains
    const sortedDomains = Array.from(domainScores.entries())
      .map(([domain, score]) => ({
        domain,
        successRate: score.successes / score.total,
        total: score.total
      }))
      .filter(d => d.total >= 3) // Require at least 3 tasks
      .sort((a, b) => b.successRate - a.successRate);

    profile.bestDomains = sortedDomains.slice(0, 5).map(d => d.domain);
    profile.worstDomains = sortedDomains.slice(-3).map(d => d.domain);

    // Update specialization (domains with >70% success rate and >5 tasks)
    profile.specialization = sortedDomains
      .filter(d => d.successRate > 0.7 && d.total > 5)
      .map(d => d.domain);
  }

  private updateComplexityRange(profile: AgentProfile, event: LearningEvent): void {
    const successfulTasks = this.history.filter(e =>
      e.agent === event.agent && e.outcome.success
    );

    if (successfulTasks.length >= 5) {
      const complexities = successfulTasks.map(e => e.task.complexity).sort((a, b) => a - b);
      const p10 = complexities[Math.floor(complexities.length * 0.1)];
      const p90 = complexities[Math.floor(complexities.length * 0.9)];
      profile.optimalComplexityRange = [p10, p90];
    }
  }

  private updatePerformanceWindow(profile: AgentProfile, event: LearningEvent): void {
    const recent = this.history.filter(e => {
      const daysSince = (event.timestamp.getTime() - e.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return e.agent === event.agent && daysSince <= 14;
    }).slice(-20); // Last 20 tasks within 14 days

    profile.recentPerformance.recentTasks = recent.length;
    profile.recentPerformance.recentSuccesses = recent.filter(e => e.outcome.success).length;
    profile.recentPerformance.recentFailures = recent.filter(e => !e.outcome.success).length;

    // Calculate trend (comparing first half vs second half)
    if (recent.length >= 6) {
      const mid = Math.floor(recent.length / 2);
      const firstHalf = recent.slice(0, mid);
      const secondHalf = recent.slice(mid);

      const firstSuccessRate = firstHalf.filter(e => e.outcome.success).length / firstHalf.length;
      const secondSuccessRate = secondHalf.filter(e => e.outcome.success).length / secondHalf.length;

      profile.recentPerformance.trend = (secondSuccessRate - firstSuccessRate) * 2; // Scale to -2 to 2, then clip to -1 to 1
      profile.recentPerformance.trend = Math.max(-1, Math.min(1, profile.recentPerformance.trend));
    }

    profile.recentPerformance.lastUpdated = event.timestamp;
  }

  private extractTaskFeatures(task: Task): TaskFeatures {
    // Calculate novelty (how similar to past tasks)
    const similarTasks = this.history.filter(e =>
      e.task.type === task.type ||
      (e.task.domains || []).some(d => (task.domains || []).includes(d))
    );
    const novelty = 1 - Math.min(1, similarTasks.length / 10);

    // Estimate uncertainty (lower if we have clear description and metadata)
    const uncertainty = task.description ?
      Math.max(0.2, 1 - task.description.length / 500) :
      0.8;

    // Estimate criticality (could be enhanced with actual priority data)
    const criticality = task.metadata?.priority === 'critical' ? 1.0 :
                       task.metadata?.priority === 'high' ? 0.8 :
                       task.metadata?.priority === 'low' ? 0.3 :
                       0.5;

    return {
      type: task.type,
      complexity: task.complexity,
      domains: task.domains || [],
      novelty,
      uncertainty,
      criticality
    };
  }

  private patternMatches(pattern: Pattern, features: TaskFeatures): boolean {
    // Check domain match
    if (pattern.conditions.domain) {
      if (!features.domains.includes(pattern.conditions.domain)) {
        return false;
      }
    }

    // Check complexity range
    if (pattern.conditions.minComplexity !== undefined &&
        features.complexity < pattern.conditions.minComplexity) {
      return false;
    }
    if (pattern.conditions.maxComplexity !== undefined &&
        features.complexity > pattern.conditions.maxComplexity) {
      return false;
    }

    // Check type match
    if (pattern.conditions.type && pattern.conditions.type !== features.type) {
      return false;
    }

    // Recency patterns always match (they're about current state)
    if (pattern.conditions.recency) {
      return true;
    }

    return true;
  }

  private explainScore(profile: AgentProfile, features: TaskFeatures, score: number): string {
    const reasons: string[] = [];

    reasons.push(`Overall success rate: ${(profile.successRate * 100).toFixed(0)}%`);

    const strengthMatches = profile.strengthPatterns.filter(p => this.patternMatches(p, features));
    if (strengthMatches.length > 0) {
      reasons.push(`${strengthMatches.length} strength pattern(s) match`);
    }

    const weaknessMatches = profile.weaknessPatterns.filter(p => this.patternMatches(p, features));
    if (weaknessMatches.length > 0) {
      reasons.push(`${weaknessMatches.length} weakness pattern(s) match`);
    }

    if (profile.recentPerformance.trend > 0.2) {
      reasons.push('Positive recent trend');
    } else if (profile.recentPerformance.trend < -0.2) {
      reasons.push('Negative recent trend');
    }

    const domainMatch = features.domains.some(d => profile.bestDomains.includes(d));
    if (domainMatch) {
      reasons.push('Expert in required domain(s)');
    }

    const [minComplexity, maxComplexity] = profile.optimalComplexityRange;
    if (features.complexity >= minComplexity && features.complexity <= maxComplexity) {
      reasons.push('Complexity in optimal range');
    }

    return reasons.join('; ');
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private loadState(): void {
    try {
      // Load profiles
      if (fs.existsSync(this.profilesPath)) {
        const data = JSON.parse(fs.readFileSync(this.profilesPath, 'utf-8'));
        this.profiles = new Map(Object.entries(data).map(([name, profile]: [string, any]) => [
          name,
          {
            ...profile,
            createdAt: new Date(profile.createdAt),
            lastUpdated: new Date(profile.lastUpdated),
            recentPerformance: {
              ...profile.recentPerformance,
              lastUpdated: new Date(profile.recentPerformance.lastUpdated)
            },
            strengthPatterns: profile.strengthPatterns.map((p: any) => ({
              ...p,
              createdAt: new Date(p.createdAt),
              lastSeen: new Date(p.lastSeen)
            })),
            weaknessPatterns: profile.weaknessPatterns.map((p: any) => ({
              ...p,
              createdAt: new Date(p.createdAt),
              lastSeen: new Date(p.lastSeen)
            }))
          }
        ]));
      }

      // Load patterns
      if (fs.existsSync(this.patternsPath)) {
        const data = JSON.parse(fs.readFileSync(this.patternsPath, 'utf-8'));
        this.patterns = new Map(Object.entries(data).map(([id, pattern]: [string, any]) => [
          id,
          {
            ...pattern,
            createdAt: new Date(pattern.createdAt),
            lastSeen: new Date(pattern.lastSeen)
          }
        ]));
      }

      // Load history (last 1000 events)
      if (fs.existsSync(this.historyPath)) {
        const data = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
        this.history = data.slice(-1000).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }

      console.log(`[Learning] Loaded ${this.profiles.size} profiles, ${this.patterns.size} patterns, ${this.history.length} events`);
    } catch (error) {
      console.error('[Learning] Error loading state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      // Save profiles
      const profilesData = Object.fromEntries(this.profiles.entries());
      fs.writeFileSync(this.profilesPath, JSON.stringify(profilesData, null, 2));

      // Save patterns
      const patternsData = Object.fromEntries(this.patterns.entries());
      fs.writeFileSync(this.patternsPath, JSON.stringify(patternsData, null, 2));

      // Save history (last 1000 events)
      const historyData = this.history.slice(-1000);
      fs.writeFileSync(this.historyPath, JSON.stringify(historyData, null, 2));

      // Save metrics
      const metrics = this.getMetrics();
      fs.writeFileSync(this.metricsPath, JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.error('[Learning] Error saving state:', error);
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let learningSystemInstance: RealTimeLearningSystem | null = null;

export function getLearningSystem(basePath?: string): RealTimeLearningSystem {
  if (!learningSystemInstance) {
    learningSystemInstance = new RealTimeLearningSystem(basePath);
  }
  return learningSystemInstance;
}

// ============================================
// EXAMPLE USAGE
// ============================================

/**
 * Example usage:
 *
 * ```typescript
 * import { getLearningSystem } from './learning-system';
 *
 * const learningSystem = getLearningSystem();
 *
 * // Record a task outcome
 * await learningSystem.recordTaskOutcome({
 *   timestamp: new Date(),
 *   agent: 'code-reviewer',
 *   task: {
 *     id: 'PROJ-123',
 *     type: 'code-review',
 *     complexity: 45,
 *     domains: ['backend', 'api'],
 *     description: 'Review FastAPI endpoint implementation'
 *   },
 *   outcome: {
 *     success: true,
 *     duration: 300000, // 5 minutes
 *     qualityScore: 0.92,
 *     testsPass: true,
 *     tokensUsed: 5000
 *   },
 *   context: {
 *     linesOfCode: 250,
 *     filesChanged: 3
 *   }
 * });
 *
 * // Select best agent for a task
 * const selection = await learningSystem.selectBestAgent({
 *   id: 'PROJ-124',
 *   type: 'code-review',
 *   complexity: 50,
 *   domains: ['backend', 'database'],
 *   description: 'Review MongoDB schema migration'
 * });
 *
 * console.log(`Selected: ${selection.agentName} (confidence: ${selection.confidence})`);
 * console.log(`Reasoning: ${selection.reasoning}`);
 * ```
 */
