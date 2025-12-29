/**
 * Adaptive Task Decomposition Engine
 *
 * Learns from past decompositions to optimize future task breakdown strategies.
 * Uses pattern matching, effectiveness tracking, and ML-based prediction.
 *
 * @module adaptive-decomposition
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Task {
  key: string;
  summary: string;
  description: string;
  complexity: number; // 1-100 scale
  storyPoints?: number;
  labels: string[];
  type: 'Epic' | 'Story' | 'Task' | 'Bug';
  metadata?: Record<string, any>;
}

export interface SubTask {
  key?: string;
  title: string;
  description: string;
  estimatedPoints: number;
  dependencies: string[];
  priority: 'Must' | 'Should' | 'Could' | 'Wont';
  type: 'Story' | 'Task' | 'TechDebt' | 'Bug';
}

export interface TaskTree {
  rootTask: Task;
  subtasks: SubTask[];
  depth: number;
  decompositionStrategy: string;
  complexity: number;
  totalEstimatedPoints: number;
  metadata: {
    createdAt: Date;
    createdBy: string;
    rationale: string;
  };
}

export interface Outcome {
  success: boolean;
  actualDuration: number; // hours
  estimatedDuration: number; // hours
  issuesEncountered: string[];
  velocityAchieved: number; // story points completed
  blockers: number;
  reworkRequired: boolean;
  completionRate: number; // 0-1 (percentage of subtasks completed)
  teamSatisfaction?: number; // 1-5 scale
}

export interface DecompositionHistory {
  taskId: string;
  timestamp: Date;
  complexity: number;
  decomposition: TaskTree;
  outcome: Outcome;
  effectiveness: number; // 0-1 score
  features: TaskFeatures;
}

export interface TaskFeatures {
  complexity: number;
  uncertainty: number; // 0-1
  novelty: number; // 0-1 (how similar to past tasks)
  domain: string[];
  hasExternalDeps: boolean;
  teamSize: number;
  estimatedHours: number;
}

export interface Critique {
  score: number; // 0-1
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  criteria: {
    completeness: number;
    parallelizability: number;
    granularity: number;
    dependencyHealth: number;
    testability: number;
  };
}

export interface DecompositionPattern {
  complexity_range: [number, number];
  optimal_depth: number;
  avg_effectiveness: number;
  sample_size: number;
  strategy: string;
  domains: string[];
  characteristics: string[];
}

export interface AntiPattern {
  description: string;
  impact: string;
  frequency: number;
  examples: string[];
  mitigation: string;
}

// ============================================================================
// Adaptive Decomposer Class
// ============================================================================

export class AdaptiveDecomposer {
  private history: DecompositionHistory[] = [];
  private patterns: DecompositionPattern[] = [];
  private antiPatterns: AntiPattern[] = [];
  private intelligencePath: string;

  constructor(intelligencePath: string = './sessions/intelligence') {
    this.intelligencePath = intelligencePath;
    this.loadHistory();
  }

  /**
   * Main decomposition method that learns from past experiences
   */
  async decompose(
    task: Task,
    options: {
      maxDepth?: number;
      minSubtaskPoints?: number;
      maxSubtaskPoints?: number;
      strategy?: 'auto' | 'user-journey' | 'technical-layer' | 'incremental-value';
    } = {}
  ): Promise<TaskTree> {
    const startTime = Date.now();

    // Extract features from the task
    const features = this.extractTaskFeatures(task);

    // Find similar past tasks
    const similarTasks = this.findSimilarTasks(task, features);

    // Predict optimal decomposition depth based on learning
    const optimalDepth = this.predictOptimalDepth(task, features, similarTasks);

    // Determine best strategy based on patterns
    const strategy = options.strategy === 'auto'
      ? this.selectOptimalStrategy(task, features, similarTasks)
      : options.strategy || 'user-journey';

    console.log(`[AdaptiveDecomposer] Task: ${task.key}, Complexity: ${task.complexity}`);
    console.log(`[AdaptiveDecomposer] Predicted depth: ${optimalDepth}, Strategy: ${strategy}`);
    console.log(`[AdaptiveDecomposer] Found ${similarTasks.length} similar past tasks`);

    // Generate initial decomposition
    let decomposition = await this.generateDecomposition(
      task,
      optimalDepth,
      strategy,
      options
    );

    // Self-critique the decomposition
    const critique = await this.critiqueDecomposition(decomposition);

    console.log(`[AdaptiveDecomposer] Initial decomposition score: ${(critique.score * 100).toFixed(1)}%`);

    // Iteratively improve if below threshold
    let iteration = 0;
    const maxIterations = 3;
    const qualityThreshold = 0.8;

    while (critique.score < qualityThreshold && iteration < maxIterations) {
      console.log(`[AdaptiveDecomposer] Iteration ${iteration + 1}: Improving decomposition based on critique`);

      decomposition = await this.improveDecomposition(
        decomposition,
        critique,
        options
      );

      const newCritique = await this.critiqueDecomposition(decomposition);

      if (newCritique.score <= critique.score) {
        // No improvement, stop iterating
        break;
      }

      Object.assign(critique, newCritique);
      iteration++;
    }

    const duration = Date.now() - startTime;
    console.log(`[AdaptiveDecomposer] Final decomposition score: ${(critique.score * 100).toFixed(1)}% (${duration}ms)`);

    return decomposition;
  }

  /**
   * Record outcome and update learning model
   */
  async recordOutcome(
    taskId: string,
    decomposition: TaskTree,
    outcome: Outcome
  ): Promise<void> {
    // Calculate effectiveness score
    const effectiveness = this.calculateEffectiveness(decomposition, outcome);

    // Extract features
    const features = this.extractTaskFeatures(decomposition.rootTask);

    // Create history record
    const record: DecompositionHistory = {
      taskId,
      timestamp: new Date(),
      complexity: decomposition.complexity,
      decomposition,
      outcome,
      effectiveness,
      features
    };

    // Add to history
    this.history.push(record);

    console.log(`[AdaptiveDecomposer] Recorded outcome for ${taskId}: effectiveness ${(effectiveness * 100).toFixed(1)}%`);

    // Update prediction model
    await this.updatePredictionModel(this.history);

    // Save to disk
    await this.saveHistory();
  }

  /**
   * Predict optimal decomposition depth using ML-like approach
   */
  private predictOptimalDepth(
    task: Task,
    features: TaskFeatures,
    similarTasks: DecompositionHistory[]
  ): number {
    if (similarTasks.length === 0) {
      // No history, use complexity-based heuristic
      return this.heuristicDepth(task.complexity);
    }

    // Weighted average based on similarity and effectiveness
    let weightedDepthSum = 0;
    let totalWeight = 0;

    for (const similar of similarTasks) {
      // Calculate similarity weight (already sorted by similarity)
      const similarity = this.calculateSimilarity(features, similar.features);
      const effectivenessWeight = similar.effectiveness;

      // Combined weight: similarity * effectiveness
      const weight = similarity * effectivenessWeight;

      weightedDepthSum += similar.decomposition.depth * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return this.heuristicDepth(task.complexity);
    }

    const predictedDepth = Math.round(weightedDepthSum / totalWeight);

    // Clamp between 1 and 5
    return Math.max(1, Math.min(5, predictedDepth));
  }

  /**
   * Find similar past tasks using feature-based similarity
   */
  private findSimilarTasks(
    task: Task,
    features: TaskFeatures,
    topN: number = 10
  ): DecompositionHistory[] {
    if (this.history.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const similarities = this.history.map(record => ({
      record,
      similarity: this.calculateSimilarity(features, record.features)
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top N
    return similarities.slice(0, topN).map(s => s.record);
  }

  /**
   * Calculate similarity between two task feature vectors
   * Uses weighted cosine similarity
   */
  private calculateSimilarity(
    features1: TaskFeatures,
    features2: TaskFeatures
  ): number {
    // Normalize complexity to 0-1 scale
    const complexitySim = 1 - Math.abs(features1.complexity - features2.complexity) / 100;
    const uncertaintySim = 1 - Math.abs(features1.uncertainty - features2.uncertainty);
    const noveltySim = 1 - Math.abs(features1.novelty - features2.novelty);

    // Domain overlap (Jaccard similarity)
    const domains1 = new Set(features1.domain);
    const domains2 = new Set(features2.domain);
    const intersection = new Set([...domains1].filter(d => domains2.has(d)));
    const union = new Set([...domains1, ...domains2]);
    const domainSim = union.size > 0 ? intersection.size / union.size : 0;

    // External deps match
    const externalDepsSim = features1.hasExternalDeps === features2.hasExternalDeps ? 1 : 0.5;

    // Team size similarity
    const teamSizeSim = 1 - Math.min(Math.abs(features1.teamSize - features2.teamSize) / 10, 1);

    // Weighted combination
    const weights = {
      complexity: 0.25,
      uncertainty: 0.15,
      novelty: 0.15,
      domain: 0.25,
      externalDeps: 0.10,
      teamSize: 0.10
    };

    const similarity =
      complexitySim * weights.complexity +
      uncertaintySim * weights.uncertainty +
      noveltySim * weights.novelty +
      domainSim * weights.domain +
      externalDepsSim * weights.externalDeps +
      teamSizeSim * weights.teamSize;

    return similarity;
  }

  /**
   * Extract features from task for similarity matching
   */
  private extractTaskFeatures(task: Task): TaskFeatures {
    // Estimate uncertainty based on description quality
    const hasDetailedDesc = task.description && task.description.length > 100;
    const hasStoryPoints = task.storyPoints !== undefined;
    const uncertainty = hasDetailedDesc && hasStoryPoints ? 0.2 : 0.6;

    // Calculate novelty (inverse of similar tasks count)
    const domainKeywords = this.extractDomainKeywords(task);
    const similarCount = this.history.filter(h =>
      h.features.domain.some(d => domainKeywords.includes(d))
    ).length;
    const novelty = Math.max(0, 1 - (similarCount / 20)); // Cap at 20 similar tasks

    // Check for external dependencies
    const hasExternalDeps = task.labels.some(l =>
      l.includes('external') || l.includes('integration') || l.includes('api')
    );

    // Estimate team size from complexity
    const teamSize = Math.ceil(task.complexity / 30);

    // Estimate hours from story points or complexity
    const estimatedHours = task.storyPoints
      ? task.storyPoints * 4
      : task.complexity * 0.5;

    return {
      complexity: task.complexity,
      uncertainty,
      novelty,
      domain: domainKeywords,
      hasExternalDeps,
      teamSize,
      estimatedHours
    };
  }

  /**
   * Extract domain keywords from task
   */
  private extractDomainKeywords(task: Task): string[] {
    const text = `${task.summary} ${task.description}`.toLowerCase();
    const keywords: string[] = [];

    // Technical domains
    const technicalDomains = [
      'authentication', 'authorization', 'database', 'api', 'frontend', 'backend',
      'ui', 'ux', 'performance', 'security', 'testing', 'deployment', 'infrastructure'
    ];

    // Business domains
    const businessDomains = [
      'payment', 'billing', 'user-management', 'reporting', 'analytics',
      'notification', 'search', 'admin', 'member', 'organization'
    ];

    // Check for domain keywords
    [...technicalDomains, ...businessDomains].forEach(domain => {
      if (text.includes(domain)) {
        keywords.push(domain);
      }
    });

    // Add labels as domains
    keywords.push(...task.labels.map(l => l.toLowerCase()));

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Generate decomposition based on strategy
   */
  private async generateDecomposition(
    task: Task,
    depth: number,
    strategy: string,
    options: any
  ): Promise<TaskTree> {
    const subtasks: SubTask[] = [];

    // Apply strategy-specific decomposition logic
    switch (strategy) {
      case 'user-journey':
        subtasks.push(...this.decomposeByUserJourney(task, depth));
        break;

      case 'technical-layer':
        subtasks.push(...this.decomposeByTechnicalLayer(task, depth));
        break;

      case 'incremental-value':
        subtasks.push(...this.decomposeByIncrementalValue(task, depth));
        break;

      default:
        subtasks.push(...this.decomposeGeneric(task, depth));
    }

    // Apply constraints
    const constrainedSubtasks = this.applyConstraints(
      subtasks,
      options.minSubtaskPoints || 1,
      options.maxSubtaskPoints || 8
    );

    const totalEstimatedPoints = constrainedSubtasks.reduce(
      (sum, st) => sum + st.estimatedPoints,
      0
    );

    return {
      rootTask: task,
      subtasks: constrainedSubtasks,
      depth,
      decompositionStrategy: strategy,
      complexity: task.complexity,
      totalEstimatedPoints,
      metadata: {
        createdAt: new Date(),
        createdBy: 'adaptive-decomposer',
        rationale: `Selected ${strategy} strategy based on task characteristics and learning from ${this.history.length} past decompositions`
      }
    };
  }

  /**
   * User journey decomposition strategy
   */
  private decomposeByUserJourney(task: Task, depth: number): SubTask[] {
    const subtasks: SubTask[] = [];
    const pointsPerSubtask = Math.max(2, Math.floor((task.storyPoints || task.complexity / 10) / depth));

    // Typical user journey phases
    const journeyPhases = [
      { title: 'User authentication and authorization', type: 'Story' as const },
      { title: 'Core feature implementation', type: 'Story' as const },
      { title: 'Data validation and error handling', type: 'Task' as const },
      { title: 'User interface and experience', type: 'Story' as const },
      { title: 'Testing and quality assurance', type: 'Task' as const }
    ];

    for (let i = 0; i < Math.min(depth, journeyPhases.length); i++) {
      const phase = journeyPhases[i];
      subtasks.push({
        title: `${task.summary} - ${phase.title}`,
        description: `Implement ${phase.title} for ${task.summary}`,
        estimatedPoints: pointsPerSubtask,
        dependencies: i > 0 ? [subtasks[i - 1].title] : [],
        priority: i < 2 ? 'Must' : 'Should',
        type: phase.type
      });
    }

    return subtasks;
  }

  /**
   * Technical layer decomposition strategy
   */
  private decomposeByTechnicalLayer(task: Task, depth: number): SubTask[] {
    const subtasks: SubTask[] = [];
    const pointsPerSubtask = Math.max(2, Math.floor((task.storyPoints || task.complexity / 10) / depth));

    const layers = [
      { title: 'Database schema and migrations', type: 'Task' as const, priority: 'Must' as const },
      { title: 'Backend API endpoints', type: 'Task' as const, priority: 'Must' as const },
      { title: 'Business logic and services', type: 'Task' as const, priority: 'Must' as const },
      { title: 'Frontend components and integration', type: 'Story' as const, priority: 'Should' as const },
      { title: 'End-to-end testing', type: 'Task' as const, priority: 'Should' as const }
    ];

    for (let i = 0; i < Math.min(depth, layers.length); i++) {
      const layer = layers[i];
      subtasks.push({
        title: `${task.summary} - ${layer.title}`,
        description: `Implement ${layer.title} for ${task.summary}`,
        estimatedPoints: pointsPerSubtask,
        dependencies: i > 0 && i < 3 ? [subtasks[i - 1].title] : [],
        priority: layer.priority,
        type: layer.type
      });
    }

    return subtasks;
  }

  /**
   * Incremental value decomposition strategy
   */
  private decomposeByIncrementalValue(task: Task, depth: number): SubTask[] {
    const subtasks: SubTask[] = [];
    const basePoints = Math.max(2, Math.floor((task.storyPoints || task.complexity / 10) / depth));

    const increments = [
      { title: 'Minimum viable implementation', points: basePoints * 1.5, priority: 'Must' as const },
      { title: 'Core functionality enhancement', points: basePoints, priority: 'Should' as const },
      { title: 'User experience improvements', points: basePoints * 0.8, priority: 'Should' as const },
      { title: 'Advanced features', points: basePoints * 0.7, priority: 'Could' as const },
      { title: 'Polish and optimization', points: basePoints * 0.5, priority: 'Could' as const }
    ];

    for (let i = 0; i < Math.min(depth, increments.length); i++) {
      const increment = increments[i];
      subtasks.push({
        title: `${task.summary} - ${increment.title}`,
        description: `Deliver ${increment.title} for ${task.summary}`,
        estimatedPoints: Math.round(increment.points),
        dependencies: i > 0 ? [subtasks[0].title] : [],
        priority: increment.priority,
        type: 'Story'
      });
    }

    return subtasks;
  }

  /**
   * Generic decomposition fallback
   */
  private decomposeGeneric(task: Task, depth: number): SubTask[] {
    const subtasks: SubTask[] = [];
    const pointsPerSubtask = Math.max(2, Math.floor((task.storyPoints || task.complexity / 10) / depth));

    for (let i = 0; i < depth; i++) {
      subtasks.push({
        title: `${task.summary} - Part ${i + 1}`,
        description: `Implementation subtask ${i + 1} of ${depth}`,
        estimatedPoints: pointsPerSubtask,
        dependencies: [],
        priority: i < Math.ceil(depth / 2) ? 'Must' : 'Should',
        type: 'Task'
      });
    }

    return subtasks;
  }

  /**
   * Apply constraints to subtasks
   */
  private applyConstraints(
    subtasks: SubTask[],
    minPoints: number,
    maxPoints: number
  ): SubTask[] {
    return subtasks.map(st => ({
      ...st,
      estimatedPoints: Math.max(minPoints, Math.min(maxPoints, st.estimatedPoints))
    }));
  }

  /**
   * Select optimal strategy based on task characteristics
   */
  private selectOptimalStrategy(
    task: Task,
    features: TaskFeatures,
    similarTasks: DecompositionHistory[]
  ): string {
    if (similarTasks.length > 0) {
      // Use strategy from most effective similar task
      const bestSimilar = similarTasks.sort((a, b) => b.effectiveness - a.effectiveness)[0];
      return bestSimilar.decomposition.decompositionStrategy;
    }

    // Heuristic-based selection
    const hasUserFocus = task.summary.toLowerCase().includes('user') ||
                         task.type === 'Story';
    const hasTechnicalFocus = features.domain.some(d =>
      ['database', 'api', 'backend', 'infrastructure'].includes(d)
    );

    if (hasUserFocus) return 'user-journey';
    if (hasTechnicalFocus) return 'technical-layer';
    return 'incremental-value';
  }

  /**
   * Critique decomposition quality
   */
  private async critiqueDecomposition(decomposition: TaskTree): Promise<Critique> {
    const criteria = {
      completeness: this.evaluateCompleteness(decomposition),
      parallelizability: this.evaluateParallelizability(decomposition),
      granularity: this.evaluateGranularity(decomposition),
      dependencyHealth: this.evaluateDependencyHealth(decomposition),
      testability: this.evaluateTestability(decomposition)
    };

    // Overall score is weighted average
    const score =
      criteria.completeness * 0.25 +
      criteria.parallelizability * 0.20 +
      criteria.granularity * 0.25 +
      criteria.dependencyHealth * 0.20 +
      criteria.testability * 0.10;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];

    // Analyze each criterion
    if (criteria.completeness >= 0.8) {
      strengths.push('Comprehensive coverage of task scope');
    } else {
      weaknesses.push('Missing important aspects of the task');
      improvements.push('Add subtasks to cover all requirements');
    }

    if (criteria.parallelizability >= 0.7) {
      strengths.push('Good parallelization potential');
    } else {
      weaknesses.push('Too many sequential dependencies');
      improvements.push('Reduce dependencies to enable parallel work');
    }

    if (criteria.granularity >= 0.7 && criteria.granularity <= 0.9) {
      strengths.push('Well-sized subtasks');
    } else if (criteria.granularity < 0.7) {
      weaknesses.push('Subtasks too large or too small');
      improvements.push('Adjust subtask sizing for optimal delivery');
    }

    if (criteria.dependencyHealth >= 0.8) {
      strengths.push('Clean dependency structure');
    } else {
      weaknesses.push('Complex or circular dependencies');
      improvements.push('Simplify dependency graph');
    }

    if (criteria.testability >= 0.7) {
      strengths.push('Subtasks are testable');
    } else {
      weaknesses.push('Difficult to verify completion');
      improvements.push('Add explicit testing subtasks');
    }

    return {
      score,
      strengths,
      weaknesses,
      improvements,
      criteria
    };
  }

  /**
   * Evaluate completeness (do subtasks cover all aspects?)
   */
  private evaluateCompleteness(decomposition: TaskTree): number {
    const { subtasks } = decomposition;

    // Check coverage of standard aspects
    const hasImplementation = subtasks.some(st =>
      st.type === 'Story' || st.type === 'Task'
    );
    const hasTesting = subtasks.some(st =>
      st.title.toLowerCase().includes('test') ||
      st.description.toLowerCase().includes('test')
    );
    const hasDatabase = decomposition.rootTask.complexity > 50
      ? subtasks.some(st => st.title.toLowerCase().includes('database'))
      : true; // Not required for simple tasks

    const coverageScore =
      (hasImplementation ? 0.5 : 0) +
      (hasTesting ? 0.3 : 0) +
      (hasDatabase ? 0.2 : 0);

    return Math.min(1, coverageScore);
  }

  /**
   * Evaluate parallelizability (can subtasks run independently?)
   */
  private evaluateParallelizability(decomposition: TaskTree): number {
    const { subtasks } = decomposition;

    if (subtasks.length === 0) return 0;

    // Count subtasks with no dependencies
    const independentCount = subtasks.filter(st => st.dependencies.length === 0).length;

    // Ideal is 60-80% independent
    const independentRatio = independentCount / subtasks.length;

    if (independentRatio >= 0.6 && independentRatio <= 0.8) {
      return 1;
    } else if (independentRatio >= 0.4) {
      return 0.7;
    } else {
      return 0.4;
    }
  }

  /**
   * Evaluate granularity (are subtasks appropriately sized?)
   */
  private evaluateGranularity(decomposition: TaskTree): number {
    const { subtasks } = decomposition;

    if (subtasks.length === 0) return 0;

    // Check if points are in optimal range (2-8 points per subtask)
    const wellSizedCount = subtasks.filter(st =>
      st.estimatedPoints >= 2 && st.estimatedPoints <= 8
    ).length;

    const wellSizedRatio = wellSizedCount / subtasks.length;

    // Also check total subtasks (not too many, not too few)
    const optimalSubtaskCount = subtasks.length >= 3 && subtasks.length <= 8;

    return (wellSizedRatio * 0.7) + (optimalSubtaskCount ? 0.3 : 0);
  }

  /**
   * Evaluate dependency health (are dependencies minimal and acyclic?)
   */
  private evaluateDependencyHealth(decomposition: TaskTree): number {
    const { subtasks } = decomposition;

    // Check for circular dependencies
    const hasCircular = this.detectCircularDependencies(subtasks);
    if (hasCircular) return 0.3;

    // Count total dependency links
    const totalDeps = subtasks.reduce((sum, st) => sum + st.dependencies.length, 0);

    // Ideal: minimal dependencies (< 1 per subtask on average)
    const avgDepsPerTask = totalDeps / subtasks.length;

    if (avgDepsPerTask <= 0.5) return 1.0;
    if (avgDepsPerTask <= 1.0) return 0.8;
    if (avgDepsPerTask <= 1.5) return 0.6;
    return 0.4;
  }

  /**
   * Evaluate testability
   */
  private evaluateTestability(decomposition: TaskTree): number {
    const { subtasks } = decomposition;

    // Check if testing is explicit
    const hasTestingSubtask = subtasks.some(st =>
      st.title.toLowerCase().includes('test') ||
      st.type === 'Task' && st.description.toLowerCase().includes('test')
    );

    // Check if subtasks have clear completion criteria
    const hasClearCriteria = subtasks.every(st =>
      st.description && st.description.length > 20
    );

    return (hasTestingSubtask ? 0.5 : 0) + (hasClearCriteria ? 0.5 : 0);
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(subtasks: SubTask[]): boolean {
    const graph = new Map<string, string[]>();

    subtasks.forEach(st => {
      graph.set(st.title, st.dependencies);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const deps = graph.get(node) || [];
      for (const dep of deps) {
        if (hasCycle(dep)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (hasCycle(node)) return true;
    }

    return false;
  }

  /**
   * Improve decomposition based on critique
   */
  private async improveDecomposition(
    decomposition: TaskTree,
    critique: Critique,
    options: any
  ): Promise<TaskTree> {
    let improved = { ...decomposition };

    // Apply improvements based on weaknesses
    if (critique.criteria.completeness < 0.8) {
      // Add missing subtasks
      improved = this.addMissingSubtasks(improved);
    }

    if (critique.criteria.parallelizability < 0.7) {
      // Reduce dependencies
      improved = this.reduceDependencies(improved);
    }

    if (critique.criteria.granularity < 0.7) {
      // Adjust subtask sizing
      improved = this.adjustSubtaskSizing(improved, options);
    }

    if (critique.criteria.dependencyHealth < 0.8) {
      // Simplify dependencies
      improved = this.simplifyDependencies(improved);
    }

    if (critique.criteria.testability < 0.7) {
      // Add testing subtask
      improved = this.addTestingSubtask(improved);
    }

    return improved;
  }

  /**
   * Add missing subtasks for completeness
   */
  private addMissingSubtasks(decomposition: TaskTree): TaskTree {
    const newSubtasks = [...decomposition.subtasks];

    // Check for testing
    const hasTesting = newSubtasks.some(st =>
      st.title.toLowerCase().includes('test')
    );

    if (!hasTesting) {
      newSubtasks.push({
        title: `${decomposition.rootTask.summary} - Testing and QA`,
        description: 'Comprehensive testing including unit, integration, and E2E tests',
        estimatedPoints: 3,
        dependencies: newSubtasks.filter(st => st.type !== 'Task').map(st => st.title),
        priority: 'Must',
        type: 'Task'
      });
    }

    return {
      ...decomposition,
      subtasks: newSubtasks,
      totalEstimatedPoints: newSubtasks.reduce((sum, st) => sum + st.estimatedPoints, 0)
    };
  }

  /**
   * Reduce dependencies for better parallelization
   */
  private reduceDependencies(decomposition: TaskTree): TaskTree {
    const newSubtasks = decomposition.subtasks.map(st => ({
      ...st,
      dependencies: st.dependencies.slice(0, 1) // Keep only first dependency
    }));

    return {
      ...decomposition,
      subtasks: newSubtasks
    };
  }

  /**
   * Adjust subtask sizing
   */
  private adjustSubtaskSizing(decomposition: TaskTree, options: any): TaskTree {
    const maxPoints = options.maxSubtaskPoints || 8;
    const minPoints = options.minSubtaskPoints || 2;

    const newSubtasks: SubTask[] = [];

    for (const st of decomposition.subtasks) {
      if (st.estimatedPoints > maxPoints) {
        // Split into smaller subtasks
        const numSplits = Math.ceil(st.estimatedPoints / maxPoints);
        const pointsPerSplit = Math.floor(st.estimatedPoints / numSplits);

        for (let i = 0; i < numSplits; i++) {
          newSubtasks.push({
            ...st,
            title: `${st.title} - Part ${i + 1}`,
            estimatedPoints: pointsPerSplit,
            dependencies: i > 0 ? [newSubtasks[newSubtasks.length - 1].title] : st.dependencies
          });
        }
      } else if (st.estimatedPoints < minPoints && newSubtasks.length > 0) {
        // Merge with previous subtask
        const prev = newSubtasks[newSubtasks.length - 1];
        prev.estimatedPoints += st.estimatedPoints;
        prev.description += `\n\nAlso includes: ${st.description}`;
      } else {
        newSubtasks.push(st);
      }
    }

    return {
      ...decomposition,
      subtasks: newSubtasks,
      totalEstimatedPoints: newSubtasks.reduce((sum, st) => sum + st.estimatedPoints, 0)
    };
  }

  /**
   * Simplify dependency structure
   */
  private simplifyDependencies(decomposition: TaskTree): TaskTree {
    // Remove transitive dependencies
    const subtaskMap = new Map(decomposition.subtasks.map(st => [st.title, st]));

    const newSubtasks = decomposition.subtasks.map(st => {
      const directDeps = new Set(st.dependencies);
      const transitiveRemoved = new Set(directDeps);

      // For each direct dependency, remove its dependencies from our list
      for (const dep of directDeps) {
        const depTask = subtaskMap.get(dep);
        if (depTask) {
          depTask.dependencies.forEach(transitive => {
            if (directDeps.has(transitive)) {
              transitiveRemoved.delete(transitive);
            }
          });
        }
      }

      return {
        ...st,
        dependencies: Array.from(transitiveRemoved)
      };
    });

    return {
      ...decomposition,
      subtasks: newSubtasks
    };
  }

  /**
   * Add explicit testing subtask
   */
  private addTestingSubtask(decomposition: TaskTree): TaskTree {
    const hasTesting = decomposition.subtasks.some(st =>
      st.title.toLowerCase().includes('test')
    );

    if (hasTesting) return decomposition;

    const implementationTasks = decomposition.subtasks.filter(st =>
      st.type === 'Story' || st.type === 'Task'
    );

    const testingSubtask: SubTask = {
      title: `${decomposition.rootTask.summary} - Automated Testing`,
      description: 'Write unit tests, integration tests, and E2E tests for all functionality',
      estimatedPoints: 3,
      dependencies: implementationTasks.map(st => st.title),
      priority: 'Must',
      type: 'Task'
    };

    return {
      ...decomposition,
      subtasks: [...decomposition.subtasks, testingSubtask],
      totalEstimatedPoints: decomposition.totalEstimatedPoints + 3
    };
  }

  /**
   * Calculate effectiveness score from outcome
   */
  private calculateEffectiveness(
    decomposition: TaskTree,
    outcome: Outcome
  ): number {
    let score = 0;

    // Success contributes 30%
    score += outcome.success ? 0.30 : 0;

    // Completion rate contributes 30%
    score += outcome.completionRate * 0.30;

    // Estimate accuracy contributes 20%
    const estimateAccuracy = Math.min(
      outcome.estimatedDuration / outcome.actualDuration,
      outcome.actualDuration / outcome.estimatedDuration
    );
    score += estimateAccuracy * 0.20;

    // Low blockers contributes 10%
    const blockerPenalty = Math.min(outcome.blockers / 5, 1);
    score += (1 - blockerPenalty) * 0.10;

    // No rework needed contributes 10%
    score += outcome.reworkRequired ? 0 : 0.10;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Update prediction model with new data
   */
  private async updatePredictionModel(history: DecompositionHistory[]): Promise<void> {
    // Group by complexity ranges
    const complexityRanges: Array<[number, number]> = [
      [0, 20], [20, 40], [40, 60], [60, 80], [80, 100]
    ];

    const newPatterns: DecompositionPattern[] = [];

    for (const range of complexityRanges) {
      const recordsInRange = history.filter(h =>
        h.complexity >= range[0] && h.complexity < range[1]
      );

      if (recordsInRange.length < 3) continue; // Need at least 3 samples

      // Calculate average effectiveness
      const avgEffectiveness = recordsInRange.reduce(
        (sum, r) => sum + r.effectiveness, 0
      ) / recordsInRange.length;

      // Find optimal depth (highest effectiveness)
      const depthGroups = new Map<number, DecompositionHistory[]>();
      recordsInRange.forEach(r => {
        const depth = r.decomposition.depth;
        if (!depthGroups.has(depth)) {
          depthGroups.set(depth, []);
        }
        depthGroups.get(depth)!.push(r);
      });

      let bestDepth = 3;
      let bestDepthEffectiveness = 0;

      depthGroups.forEach((records, depth) => {
        const avgEff = records.reduce((sum, r) => sum + r.effectiveness, 0) / records.length;
        if (avgEff > bestDepthEffectiveness) {
          bestDepth = depth;
          bestDepthEffectiveness = avgEff;
        }
      });

      // Extract common domains
      const domainCounts = new Map<string, number>();
      recordsInRange.forEach(r => {
        r.features.domain.forEach(d => {
          domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
        });
      });

      const commonDomains = Array.from(domainCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([domain]) => domain);

      // Find most common strategy
      const strategyCounts = new Map<string, number>();
      recordsInRange.forEach(r => {
        const strategy = r.decomposition.decompositionStrategy;
        strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
      });

      const mostCommonStrategy = Array.from(strategyCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'generic';

      newPatterns.push({
        complexity_range: range,
        optimal_depth: bestDepth,
        avg_effectiveness: avgEffectiveness,
        sample_size: recordsInRange.length,
        strategy: mostCommonStrategy,
        domains: commonDomains,
        characteristics: this.extractCharacteristics(recordsInRange)
      });
    }

    this.patterns = newPatterns;

    // Update anti-patterns
    await this.updateAntiPatterns(history);

    console.log(`[AdaptiveDecomposer] Updated model: ${newPatterns.length} patterns identified`);
  }

  /**
   * Extract common characteristics from records
   */
  private extractCharacteristics(records: DecompositionHistory[]): string[] {
    const characteristics: string[] = [];

    const avgUncertainty = records.reduce((sum, r) => sum + r.features.uncertainty, 0) / records.length;
    const avgNovelty = records.reduce((sum, r) => sum + r.features.novelty, 0) / records.length;

    if (avgUncertainty > 0.6) characteristics.push('high-uncertainty');
    if (avgNovelty > 0.6) characteristics.push('novel-domain');
    if (records.some(r => r.features.hasExternalDeps)) characteristics.push('external-dependencies');

    return characteristics;
  }

  /**
   * Update anti-patterns from failed decompositions
   */
  private async updateAntiPatterns(history: DecompositionHistory[]): Promise<void> {
    const failures = history.filter(h => h.effectiveness < 0.5);

    const antiPatternMap = new Map<string, AntiPattern>();

    for (const failure of failures) {
      // Identify anti-pattern type
      const critique = await this.critiqueDecomposition(failure.decomposition);

      if (critique.criteria.granularity < 0.5) {
        const key = 'poor-granularity';
        const existing = antiPatternMap.get(key) || {
          description: 'Over-decomposition or under-decomposition of tasks',
          impact: 'wasted-time',
          frequency: 0,
          examples: [],
          mitigation: 'Use adaptive depth prediction based on complexity'
        };

        existing.frequency++;
        if (existing.examples.length < 3) {
          existing.examples.push(failure.taskId);
        }

        antiPatternMap.set(key, existing);
      }

      if (critique.criteria.dependencyHealth < 0.5) {
        const key = 'complex-dependencies';
        const existing = antiPatternMap.get(key) || {
          description: 'Circular or excessive dependencies between subtasks',
          impact: 'blocked-progress',
          frequency: 0,
          examples: [],
          mitigation: 'Simplify dependency graph and ensure acyclic structure'
        };

        existing.frequency++;
        if (existing.examples.length < 3) {
          existing.examples.push(failure.taskId);
        }

        antiPatternMap.set(key, existing);
      }
    }

    this.antiPatterns = Array.from(antiPatternMap.values());
  }

  /**
   * Heuristic depth calculation for new tasks
   */
  private heuristicDepth(complexity: number): number {
    if (complexity <= 20) return 2;
    if (complexity <= 40) return 3;
    if (complexity <= 60) return 4;
    if (complexity <= 80) return 5;
    return 5; // Cap at 5
  }

  /**
   * Load history from disk
   */
  private loadHistory(): void {
    try {
      const historyPath = path.join(this.intelligencePath, 'decomposition-patterns.json');

      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

        this.history = (data.history || []).map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
          decomposition: {
            ...h.decomposition,
            metadata: {
              ...h.decomposition.metadata,
              createdAt: new Date(h.decomposition.metadata.createdAt)
            }
          }
        }));

        this.patterns = data.patterns || [];
        this.antiPatterns = data.anti_patterns || [];

        console.log(`[AdaptiveDecomposer] Loaded ${this.history.length} historical records`);
      } else {
        console.log('[AdaptiveDecomposer] No existing history found, starting fresh');
      }
    } catch (error) {
      console.error('[AdaptiveDecomposer] Error loading history:', error);
      this.history = [];
      this.patterns = [];
      this.antiPatterns = [];
    }
  }

  /**
   * Save history to disk
   */
  private async saveHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.intelligencePath, 'decomposition-patterns.json');

      // Ensure directory exists
      const dir = path.dirname(historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: '5.0.0',
        last_updated: new Date().toISOString(),
        history: this.history,
        patterns: this.patterns,
        anti_patterns: this.antiPatterns,
        statistics: {
          total_decompositions: this.history.length,
          avg_effectiveness: this.history.length > 0
            ? this.history.reduce((sum, h) => sum + h.effectiveness, 0) / this.history.length
            : 0,
          best_strategy: this.getMostEffectiveStrategy()
        }
      };

      fs.writeFileSync(historyPath, JSON.stringify(data, null, 2));
      console.log(`[AdaptiveDecomposer] Saved history: ${this.history.length} records`);
    } catch (error) {
      console.error('[AdaptiveDecomposer] Error saving history:', error);
    }
  }

  /**
   * Get most effective strategy from history
   */
  private getMostEffectiveStrategy(): string {
    if (this.history.length === 0) return 'unknown';

    const strategyScores = new Map<string, { total: number; count: number }>();

    this.history.forEach(h => {
      const strategy = h.decomposition.decompositionStrategy;
      const current = strategyScores.get(strategy) || { total: 0, count: 0 };
      current.total += h.effectiveness;
      current.count += 1;
      strategyScores.set(strategy, current);
    });

    let bestStrategy = 'unknown';
    let bestAvg = 0;

    strategyScores.forEach((value, strategy) => {
      const avg = value.total / value.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestStrategy = strategy;
      }
    });

    return bestStrategy;
  }

  /**
   * Get patterns for reporting
   */
  public getPatterns(): DecompositionPattern[] {
    return this.patterns;
  }

  /**
   * Get anti-patterns for reporting
   */
  public getAntiPatterns(): AntiPattern[] {
    return this.antiPatterns;
  }

  /**
   * Get statistics
   */
  public getStatistics() {
    return {
      totalDecompositions: this.history.length,
      avgEffectiveness: this.history.length > 0
        ? this.history.reduce((sum, h) => sum + h.effectiveness, 0) / this.history.length
        : 0,
      bestStrategy: this.getMostEffectiveStrategy(),
      patternsIdentified: this.patterns.length,
      antiPatternsDetected: this.antiPatterns.length
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default AdaptiveDecomposer;
