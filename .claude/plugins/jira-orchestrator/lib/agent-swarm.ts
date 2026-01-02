/**
 * Agent Swarm Pattern Implementation
 *
 * Enables emergent intelligence through large-scale multi-agent collaboration.
 * When a problem is too complex for traditional orchestration (story points > 13,
 * complexity > 75), spawn a diverse swarm of agents that explore the solution
 * space in parallel and converge on a consensus through voting and synthesis.
 *
 * @module agent-swarm
 * @version 5.0.0
 */

import { randomUUID } from 'crypto';

/**
 * Configuration for swarm behavior
 */
export interface SwarmConfig {
  /** Number of agents in the swarm (recommended: 8-12 for complex tasks) */
  populationSize: number;

  /** How different agent personalities should be (0-1, higher = more diverse) */
  diversity: number;

  /** Number of exploration rounds before consensus (2-4 recommended) */
  iterations: number;

  /** Required agreement level to reach consensus (0-1, 0.7 = 70% agreement) */
  consensusThreshold: number;

  /** Enable cross-pollination of ideas between agents */
  enableCrossPollination: boolean;

  /** Enable evolution of successful agents for future swarms */
  enableEvolution: boolean;

  /** Extended thinking budget per agent (tokens) */
  thinkingBudget: number;
}

/**
 * Default swarm configuration optimized for complex problem-solving
 */
export const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  populationSize: 10,
  diversity: 0.8,
  iterations: 3,
  consensusThreshold: 0.7,
  enableCrossPollination: true,
  enableEvolution: true,
  thinkingBudget: 8000
};

/**
 * Agent personality archetypes for diverse problem-solving approaches
 */
export interface AgentPersonality {
  /** Unique name for this personality */
  name: string;

  /** Problem-solving approach bias */
  bias: string;

  /** Risk tolerance (low, medium, high) */
  risk: 'low' | 'medium' | 'high';

  /** Decision-making style (analytical, intuitive, creative, pragmatic) */
  decisionStyle: 'analytical' | 'intuitive' | 'creative' | 'pragmatic';

  /** Focus areas (security, performance, maintainability, innovation) */
  focus: string[];

  /** Thinking pattern (systematic, exploratory, critical, synthetic) */
  thinkingPattern: 'systematic' | 'exploratory' | 'critical' | 'synthetic';
}

/**
 * Pre-defined personality archetypes for swarm diversity
 */
export const PERSONALITY_ARCHETYPES: AgentPersonality[] = [
  {
    name: 'optimist',
    bias: 'best-case scenarios, opportunity focus',
    risk: 'low',
    decisionStyle: 'intuitive',
    focus: ['innovation', 'user-experience'],
    thinkingPattern: 'exploratory'
  },
  {
    name: 'pessimist',
    bias: 'worst-case scenarios, risk mitigation',
    risk: 'high',
    decisionStyle: 'analytical',
    focus: ['security', 'reliability'],
    thinkingPattern: 'critical'
  },
  {
    name: 'pragmatist',
    bias: 'practical solutions, time-to-market',
    risk: 'medium',
    decisionStyle: 'pragmatic',
    focus: ['maintainability', 'simplicity'],
    thinkingPattern: 'systematic'
  },
  {
    name: 'innovator',
    bias: 'novel approaches, cutting-edge tech',
    risk: 'high',
    decisionStyle: 'creative',
    focus: ['innovation', 'scalability'],
    thinkingPattern: 'exploratory'
  },
  {
    name: 'conservative',
    bias: 'proven patterns, battle-tested solutions',
    risk: 'low',
    decisionStyle: 'analytical',
    focus: ['reliability', 'maintainability'],
    thinkingPattern: 'systematic'
  },
  {
    name: 'analyst',
    bias: 'data-driven decisions, metrics focus',
    risk: 'medium',
    decisionStyle: 'analytical',
    focus: ['performance', 'monitoring'],
    thinkingPattern: 'systematic'
  },
  {
    name: 'synthesizer',
    bias: 'combining ideas, hybrid approaches',
    risk: 'medium',
    decisionStyle: 'creative',
    focus: ['architecture', 'integration'],
    thinkingPattern: 'synthetic'
  },
  {
    name: 'critic',
    bias: 'finding flaws, quality assurance',
    risk: 'medium',
    decisionStyle: 'critical',
    focus: ['quality', 'testing'],
    thinkingPattern: 'critical'
  },
  {
    name: 'architect',
    bias: 'long-term vision, system design',
    risk: 'medium',
    decisionStyle: 'analytical',
    focus: ['architecture', 'scalability'],
    thinkingPattern: 'systematic'
  },
  {
    name: 'user-advocate',
    bias: 'user needs, accessibility',
    risk: 'low',
    decisionStyle: 'intuitive',
    focus: ['user-experience', 'accessibility'],
    thinkingPattern: 'exploratory'
  },
  {
    name: 'security-specialist',
    bias: 'threat modeling, defense-in-depth',
    risk: 'high',
    decisionStyle: 'analytical',
    focus: ['security', 'compliance'],
    thinkingPattern: 'critical'
  },
  {
    name: 'performance-optimizer',
    bias: 'speed, efficiency, resource usage',
    risk: 'medium',
    decisionStyle: 'analytical',
    focus: ['performance', 'optimization'],
    thinkingPattern: 'systematic'
  }
];

/**
 * Solution proposed by a swarm agent
 */
export interface Solution {
  /** Agent who proposed this solution */
  agentId: string;

  /** The proposed solution */
  proposal: string;

  /** Detailed rationale for this approach */
  rationale: string;

  /** Confidence in this solution (0-1) */
  confidence: number;

  /** Key strengths of this approach */
  strengths: string[];

  /** Known limitations or risks */
  limitations: string[];

  /** Dependencies or prerequisites */
  dependencies: string[];

  /** Estimated effort (story points or hours) */
  estimatedEffort: number;

  /** Risk assessment (low, medium, high, critical) */
  risk: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Individual agent in the swarm
 */
export interface SwarmAgent {
  /** Unique agent identifier */
  id: string;

  /** Personality guiding this agent's approach */
  personality: AgentPersonality;

  /** Current solution proposal */
  solution: Solution | null;

  /** Confidence in current solution */
  confidence: number;

  /** Ideas absorbed from other agents */
  influencedBy: string[];

  /** Historical performance (used for evolution) */
  performance: {
    solutionsProposed: number;
    consensusContributions: number;
    successRate: number;
  };
}

/**
 * Complex problem to be solved by the swarm
 */
export interface ComplexProblem {
  /** Problem identifier (Jira key) */
  key: string;

  /** Problem description */
  description: string;

  /** Complexity score (0-100) */
  complexity: number;

  /** Story points estimate */
  storyPoints?: number;

  /** Known constraints */
  constraints: string[];

  /** Acceptance criteria */
  acceptanceCriteria: string[];

  /** Context and background */
  context: Record<string, any>;
}

/**
 * Consensus result from swarm
 */
export interface SwarmConsensus {
  /** Final synthesized solution */
  solution: Solution;

  /** How the consensus was reached */
  consensusMethod: 'majority-vote' | 'weighted-synthesis' | 'hybrid';

  /** Agreement level (0-1) */
  agreementLevel: number;

  /** All proposed solutions that contributed */
  contributingSolutions: Solution[];

  /** Iteration at which consensus was reached */
  iterationReached: number;

  /** Diversity score of final solution (0-1) */
  diversityScore: number;

  /** Agents who contributed to consensus */
  contributingAgents: string[];
}

/**
 * Metrics from swarm execution
 */
export interface SwarmMetrics {
  /** Total agents spawned */
  totalAgents: number;

  /** Iterations completed */
  iterationsCompleted: number;

  /** Time to consensus (ms) */
  timeToConsensus: number;

  /** Solutions proposed */
  solutionsProposed: number;

  /** Cross-pollination events */
  crossPollinationEvents: number;

  /** Average confidence */
  averageConfidence: number;

  /** Diversity maintained (0-1) */
  diversityMaintained: number;

  /** Cost (estimated) */
  estimatedCost: number;
}

/**
 * Agent Swarm orchestrator for emergent problem-solving
 */
export class AgentSwarm {
  private swarm: SwarmAgent[] = [];
  private problem: ComplexProblem | null = null;
  private config: SwarmConfig;
  private metrics: SwarmMetrics = {
    totalAgents: 0,
    iterationsCompleted: 0,
    timeToConsensus: 0,
    solutionsProposed: 0,
    crossPollinationEvents: 0,
    averageConfidence: 0,
    diversityMaintained: 0,
    estimatedCost: 0
  };

  constructor(config: Partial<SwarmConfig> = {}) {
    this.config = { ...DEFAULT_SWARM_CONFIG, ...config };
  }

  /**
   * Solve a complex problem using swarm intelligence
   */
  async solve(
    problem: ComplexProblem,
    config?: Partial<SwarmConfig>
  ): Promise<SwarmConsensus> {
    // Override config if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.problem = problem;
    const startTime = Date.now();

    console.log(`\n🐝 SWARM ACTIVATION`);
    console.log(`Problem: ${problem.key} (Complexity: ${problem.complexity})`);
    console.log(`Spawning ${this.config.populationSize} diverse agents...\n`);

    // Phase 1: Spawn diverse agent population
    this.swarm = await this.spawnDiverseAgents(problem);
    this.metrics.totalAgents = this.swarm.length;

    // Phase 2: Iterative exploration with cross-pollination
    for (let iteration = 0; iteration < this.config.iterations; iteration++) {
      console.log(`\n--- Iteration ${iteration + 1}/${this.config.iterations} ---`);

      // All agents explore in parallel
      await this.parallelExploration(iteration);

      // Cross-pollinate ideas if enabled
      if (this.config.enableCrossPollination) {
        await this.crossPollinateIdeas();
      }

      // Check for convergence
      const consensus = this.calculateConsensus();
      if (consensus.agreementLevel >= this.config.consensusThreshold) {
        console.log(`\n✅ Consensus reached at iteration ${iteration + 1}`);
        this.metrics.iterationsCompleted = iteration + 1;
        break;
      }

      this.metrics.iterationsCompleted = iteration + 1;
    }

    // Phase 3: Build final consensus
    const finalConsensus = await this.buildConsensus();

    // Phase 4: Evolution (for future swarms)
    if (this.config.enableEvolution) {
      await this.evolvePopulation(finalConsensus);
    }

    this.metrics.timeToConsensus = Date.now() - startTime;
    this.metrics.estimatedCost = this.calculateCost();

    console.log(`\n🎯 Swarm Results:`);
    console.log(`   Consensus: ${(finalConsensus.agreementLevel * 100).toFixed(1)}%`);
    console.log(`   Iterations: ${this.metrics.iterationsCompleted}`);
    console.log(`   Time: ${(this.metrics.timeToConsensus / 1000).toFixed(1)}s`);
    console.log(`   Cost: $${this.metrics.estimatedCost.toFixed(2)}`);

    return finalConsensus;
  }

  /**
   * Spawn a diverse population of agents
   */
  private async spawnDiverseAgents(problem: ComplexProblem): Promise<SwarmAgent[]> {
    const agents: SwarmAgent[] = [];
    const personalities = this.selectDiversePersonalities(
      this.config.populationSize,
      this.config.diversity
    );

    for (const personality of personalities) {
      agents.push({
        id: `swarm-${randomUUID().slice(0, 8)}`,
        personality,
        solution: null,
        confidence: 0.5,
        influencedBy: [],
        performance: {
          solutionsProposed: 0,
          consensusContributions: 0,
          successRate: 0.5
        }
      });
    }

    return agents;
  }

  /**
   * Select diverse personalities based on diversity parameter
   */
  private selectDiversePersonalities(
    count: number,
    diversity: number
  ): AgentPersonality[] {
    const selected: AgentPersonality[] = [];
    const available = [...PERSONALITY_ARCHETYPES];

    // Always include key archetypes for critical perspectives
    const criticalArchetypes = ['optimist', 'pessimist', 'pragmatist', 'critic'];
    for (const name of criticalArchetypes) {
      if (selected.length >= count) break;
      const idx = available.findIndex(p => p.name === name);
      if (idx !== -1) {
        selected.push(available.splice(idx, 1)[0]);
      }
    }

    // Fill remaining slots
    while (selected.length < count && available.length > 0) {
      // Higher diversity = more random selection
      // Lower diversity = favor certain archetypes
      const idx = diversity > 0.7
        ? Math.floor(Math.random() * available.length)
        : Math.min(Math.floor(Math.random() * 3), available.length - 1);

      selected.push(available.splice(idx, 1)[0]);
    }

    // If we run out of unique archetypes, create variants
    while (selected.length < count) {
      const base = PERSONALITY_ARCHETYPES[
        Math.floor(Math.random() * PERSONALITY_ARCHETYPES.length)
      ];
      selected.push({
        ...base,
        name: `${base.name}-variant-${selected.length}`
      });
    }

    return selected;
  }

  /**
   * Parallel exploration phase
   */
  private async parallelExploration(iteration: number): Promise<void> {
    // In a real implementation, this would spawn actual Task agents
    // For now, we simulate exploration with diverse solutions

    const explorations = this.swarm.map(async (agent) => {
      // Simulate agent exploration with personality-driven approach
      agent.solution = await this.generateSolution(agent, iteration);
      agent.confidence = 0.5 + Math.random() * 0.4; // 0.5-0.9
      agent.performance.solutionsProposed++;

      this.metrics.solutionsProposed++;

      console.log(`  ${agent.personality.name}: ${agent.solution.proposal.slice(0, 60)}...`);
    });

    await Promise.all(explorations);
  }

  /**
   * Generate a solution based on agent personality
   */
  private async generateSolution(
    agent: SwarmAgent,
    iteration: number
  ): Promise<Solution> {
    if (!this.problem) throw new Error('No problem set');

    // Personality influences solution approach
    const personality = agent.personality;

    // Build solution based on personality bias
    let proposal = `[${personality.name} approach] `;

    if (personality.risk === 'high') {
      proposal += 'Innovative solution with novel technology stack. ';
    } else if (personality.risk === 'low') {
      proposal += 'Conservative approach using proven patterns. ';
    } else {
      proposal += 'Balanced solution with moderate innovation. ';
    }

    // Add personality-specific focus
    proposal += `Focus on ${personality.focus.join(', ')}. `;

    // Incorporate learnings from iteration
    if (iteration > 0 && agent.influencedBy.length > 0) {
      proposal += `Refined based on insights from ${agent.influencedBy.length} other agents.`;
    }

    return {
      agentId: agent.id,
      proposal,
      rationale: `${personality.bias} - ${personality.thinkingPattern} thinking pattern`,
      confidence: 0.5 + Math.random() * 0.4,
      strengths: personality.focus,
      limitations: personality.risk === 'high' ? ['Higher risk', 'Unproven'] : ['Conservative', 'Less innovative'],
      dependencies: [],
      estimatedEffort: this.problem.storyPoints || Math.ceil(this.problem.complexity / 10),
      risk: personality.risk
    };
  }

  /**
   * Cross-pollinate ideas between agents
   */
  private async crossPollinateIdeas(): Promise<void> {
    // Each agent can be influenced by up to 3 other agents
    for (const agent of this.swarm) {
      const influencers = this.selectInfluencers(agent, 3);

      for (const influencer of influencers) {
        if (influencer.solution) {
          // Agent absorbs ideas from influencer
          agent.influencedBy.push(influencer.id);

          // Adjust confidence based on influencer's confidence
          agent.confidence = (agent.confidence + influencer.confidence) / 2;

          this.metrics.crossPollinationEvents++;
        }
      }
    }
  }

  /**
   * Select agents that can influence this agent
   */
  private selectInfluencers(agent: SwarmAgent, maxCount: number): SwarmAgent[] {
    // Select agents with different personalities but high confidence
    return this.swarm
      .filter(a => a.id !== agent.id && a.solution !== null)
      .sort((a, b) => {
        // Prefer different personalities with high confidence
        const diversityA = a.personality.name === agent.personality.name ? 0 : 1;
        const diversityB = b.personality.name === agent.personality.name ? 0 : 1;
        return (diversityB * b.confidence) - (diversityA * a.confidence);
      })
      .slice(0, maxCount);
  }

  /**
   * Calculate current consensus level
   */
  private calculateConsensus(): { agreementLevel: number } {
    if (this.swarm.length === 0) return { agreementLevel: 0 };

    // Simple consensus: average confidence
    const avgConfidence = this.swarm.reduce((sum, a) => sum + a.confidence, 0) / this.swarm.length;

    // Check solution similarity (simplified)
    const solutions = this.swarm.map(a => a.solution?.proposal || '');
    const uniqueSolutions = new Set(solutions.map(s => s.slice(0, 50)));
    const convergence = 1 - (uniqueSolutions.size / solutions.length);

    return {
      agreementLevel: (avgConfidence * 0.6 + convergence * 0.4)
    };
  }

  /**
   * Build final consensus from swarm
   */
  private async buildConsensus(): Promise<SwarmConsensus> {
    const solutions = this.swarm
      .filter(a => a.solution !== null)
      .map(a => a.solution!);

    // Weighted voting based on confidence
    const votes = new Map<string, number>();
    for (const solution of solutions) {
      const key = solution.proposal.slice(0, 100);
      votes.set(key, (votes.get(key) || 0) + solution.confidence);
    }

    // Find top solutions
    const topSolutions = solutions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    // Synthesize final solution
    const finalSolution: Solution = {
      agentId: 'swarm-consensus',
      proposal: this.synthesizeSolutions(topSolutions),
      rationale: 'Emergent consensus from swarm intelligence',
      confidence: topSolutions.reduce((sum, s) => sum + s.confidence, 0) / topSolutions.length,
      strengths: Array.from(new Set(topSolutions.flatMap(s => s.strengths))),
      limitations: Array.from(new Set(topSolutions.flatMap(s => s.limitations))),
      dependencies: Array.from(new Set(topSolutions.flatMap(s => s.dependencies))),
      estimatedEffort: Math.round(
        topSolutions.reduce((sum, s) => sum + s.estimatedEffort, 0) / topSolutions.length
      ),
      risk: this.aggregateRisk(topSolutions)
    };

    const consensus = this.calculateConsensus();

    return {
      solution: finalSolution,
      consensusMethod: 'weighted-synthesis',
      agreementLevel: consensus.agreementLevel,
      contributingSolutions: topSolutions,
      iterationReached: this.metrics.iterationsCompleted,
      diversityScore: this.calculateDiversity(),
      contributingAgents: topSolutions.map(s => s.agentId)
    };
  }

  /**
   * Synthesize multiple solutions into one
   */
  private synthesizeSolutions(solutions: Solution[]): string {
    // Combine best aspects of each solution
    const parts = solutions.map((s, i) =>
      `(${i + 1}) ${s.proposal}`
    );

    return `Synthesized solution combining ${solutions.length} approaches:\n\n` +
      parts.join('\n\n') +
      `\n\nThis solution balances ${solutions.map(s => s.agentId).join(', ')}.`;
  }

  /**
   * Aggregate risk from multiple solutions
   */
  private aggregateRisk(solutions: Solution[]): 'low' | 'medium' | 'high' | 'critical' {
    const riskScores = solutions.map(s => {
      switch (s.risk) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
      }
    });

    const avgRisk = riskScores.reduce((sum, r) => sum + r, 0) / riskScores.length;

    if (avgRisk < 1.5) return 'low';
    if (avgRisk < 2.5) return 'medium';
    if (avgRisk < 3.5) return 'high';
    return 'critical';
  }

  /**
   * Calculate diversity maintained in solutions
   */
  private calculateDiversity(): number {
    const personalities = this.swarm.map(a => a.personality.name);
    const uniquePersonalities = new Set(personalities);
    return uniquePersonalities.size / personalities.length;
  }

  /**
   * Evolve population for future swarms
   */
  private async evolvePopulation(consensus: SwarmConsensus): Promise<void> {
    // Mark contributing agents as successful
    for (const agentId of consensus.contributingAgents) {
      const agent = this.swarm.find(a => a.id === agentId);
      if (agent) {
        agent.performance.consensusContributions++;
        agent.performance.successRate =
          (agent.performance.successRate * 0.7 + 0.3); // Increase success rate
      }
    }

    // Store evolution data for future swarms
    // (In production, this would persist to intelligence module)
    console.log(`\n🧬 Evolution: ${consensus.contributingAgents.length} agents marked as successful`);
  }

  /**
   * Calculate estimated cost of swarm execution
   */
  private calculateCost(): number {
    // Rough cost estimation
    // Each agent uses thinking budget + solution generation
    const costPerAgent = (this.config.thinkingBudget / 1000) * 0.005; // ~$0.005 per 1K tokens
    const totalAgentCost = this.metrics.totalAgents * costPerAgent * this.metrics.iterationsCompleted;

    // Synthesis cost
    const synthesisCost = 0.05;

    return totalAgentCost + synthesisCost;
  }

  /**
   * Get swarm metrics
   */
  getMetrics(): SwarmMetrics {
    this.metrics.averageConfidence =
      this.swarm.reduce((sum, a) => sum + a.confidence, 0) / this.swarm.length;
    this.metrics.diversityMaintained = this.calculateDiversity();

    return { ...this.metrics };
  }
}

/**
 * Determine if swarm mode should be activated for a task
 */
export function shouldActivateSwarm(task: {
  complexity?: number;
  storyPoints?: number;
  uncertainty?: number;
  novelty?: number;
}): boolean {
  // Activate swarm for:
  // - High complexity (> 75)
  // - Large story points (> 13)
  // - High uncertainty (> 0.7)
  // - High novelty (> 0.8)

  return (
    (task.complexity && task.complexity > 75) ||
    (task.storyPoints && task.storyPoints > 13) ||
    (task.uncertainty && task.uncertainty > 0.7) ||
    (task.novelty && task.novelty > 0.8)
  );
}

/**
 * Create swarm configuration optimized for task characteristics
 */
export function createSwarmConfig(task: {
  complexity: number;
  storyPoints?: number;
}): SwarmConfig {
  const baseConfig = { ...DEFAULT_SWARM_CONFIG };

  // Adjust population size based on complexity
  if (task.complexity > 90) {
    baseConfig.populationSize = 12;
    baseConfig.iterations = 4;
  } else if (task.complexity > 80) {
    baseConfig.populationSize = 10;
    baseConfig.iterations = 3;
  } else {
    baseConfig.populationSize = 8;
    baseConfig.iterations = 2;
  }

  // Adjust thinking budget based on story points
  if (task.storyPoints && task.storyPoints > 20) {
    baseConfig.thinkingBudget = 12000;
  } else if (task.storyPoints && task.storyPoints > 15) {
    baseConfig.thinkingBudget = 10000;
  }

  return baseConfig;
}

export default AgentSwarm;
