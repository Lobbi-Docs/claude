/**
 * Test suite for Agent Swarm pattern
 */

import {
  AgentSwarm,
  ComplexProblem,
  SwarmConfig,
  shouldActivateSwarm,
  createSwarmConfig,
  PERSONALITY_ARCHETYPES,
  DEFAULT_SWARM_CONFIG
} from '../../lib/agent-swarm';

describe('AgentSwarm', () => {
  describe('shouldActivateSwarm', () => {
    it('should activate for high complexity', () => {
      expect(shouldActivateSwarm({ complexity: 80 })).toBe(true);
      expect(shouldActivateSwarm({ complexity: 70 })).toBe(false);
    });

    it('should activate for high story points', () => {
      expect(shouldActivateSwarm({ storyPoints: 15 })).toBe(true);
      expect(shouldActivateSwarm({ storyPoints: 10 })).toBe(false);
    });

    it('should activate for high uncertainty', () => {
      expect(shouldActivateSwarm({ uncertainty: 0.75 })).toBe(true);
      expect(shouldActivateSwarm({ uncertainty: 0.5 })).toBe(false);
    });

    it('should activate for high novelty', () => {
      expect(shouldActivateSwarm({ novelty: 0.85 })).toBe(true);
      expect(shouldActivateSwarm({ novelty: 0.6 })).toBe(false);
    });
  });

  describe('createSwarmConfig', () => {
    it('should scale population for very high complexity', () => {
      const config = createSwarmConfig({ complexity: 95 });
      expect(config.populationSize).toBe(12);
      expect(config.iterations).toBe(4);
    });

    it('should use standard config for moderate complexity', () => {
      const config = createSwarmConfig({ complexity: 75 });
      expect(config.populationSize).toBe(8);
      expect(config.iterations).toBe(2);
    });

    it('should increase thinking budget for large stories', () => {
      const config = createSwarmConfig({ complexity: 80, storyPoints: 21 });
      expect(config.thinkingBudget).toBe(12000);
    });
  });

  describe('AgentSwarm.solve', () => {
    let swarm: AgentSwarm;
    let problem: ComplexProblem;

    beforeEach(() => {
      problem = {
        key: 'TEST-123',
        description: 'Implement complex microservices architecture',
        complexity: 85,
        storyPoints: 21,
        constraints: ['Must support 10K concurrent users', 'Sub-second response time'],
        acceptanceCriteria: ['All services deployed', 'Load test passing'],
        context: {
          currentArchitecture: 'monolith',
          targetArchitecture: 'microservices'
        }
      };
    });

    it('should spawn correct number of agents', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 8,
        iterations: 1
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      const metrics = swarm.getMetrics();
      expect(metrics.totalAgents).toBe(8);
    });

    it('should generate diverse solutions', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 10,
        diversity: 0.9,
        iterations: 1
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      expect(result.contributingSolutions.length).toBeGreaterThan(0);
      expect(result.diversityScore).toBeGreaterThan(0.7);
    });

    it('should reach consensus within iterations', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 8,
        iterations: 3,
        consensusThreshold: 0.6
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      expect(result.agreementLevel).toBeGreaterThanOrEqual(0.6);
      expect(result.iterationReached).toBeLessThanOrEqual(3);
    });

    it('should synthesize final solution', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 6,
        iterations: 2
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      expect(result.solution).toBeDefined();
      expect(result.solution.proposal).toContain('Synthesized solution');
      expect(result.solution.confidence).toBeGreaterThan(0);
    });

    it('should track cross-pollination events', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 8,
        iterations: 2,
        enableCrossPollination: true
      };

      swarm = new AgentSwarm(config);
      await swarm.solve(problem, config);

      const metrics = swarm.getMetrics();
      expect(metrics.crossPollinationEvents).toBeGreaterThan(0);
    });

    it('should calculate estimated cost', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 10,
        iterations: 3,
        thinkingBudget: 8000
      };

      swarm = new AgentSwarm(config);
      await swarm.solve(problem, config);

      const metrics = swarm.getMetrics();
      expect(metrics.estimatedCost).toBeGreaterThan(0);
      expect(metrics.estimatedCost).toBeLessThan(10); // Should be under $10
    });

    it('should maintain diversity throughout iterations', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 12,
        diversity: 0.8,
        iterations: 3
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      const metrics = swarm.getMetrics();
      expect(metrics.diversityMaintained).toBeGreaterThan(0.5);
    });

    it('should aggregate risk from solutions', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 8,
        iterations: 2
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      expect(['low', 'medium', 'high', 'critical']).toContain(result.solution.risk);
    });

    it('should track contributing agents', async () => {
      const config: SwarmConfig = {
        ...DEFAULT_SWARM_CONFIG,
        populationSize: 8,
        iterations: 2
      };

      swarm = new AgentSwarm(config);
      const result = await swarm.solve(problem, config);

      expect(result.contributingAgents.length).toBeGreaterThan(0);
      expect(result.contributingAgents.length).toBeLessThanOrEqual(8);
    });
  });

  describe('Personality Archetypes', () => {
    it('should have diverse personality archetypes', () => {
      expect(PERSONALITY_ARCHETYPES.length).toBeGreaterThanOrEqual(8);

      const names = PERSONALITY_ARCHETYPES.map(p => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should include critical archetypes', () => {
      const names = PERSONALITY_ARCHETYPES.map(p => p.name);
      expect(names).toContain('optimist');
      expect(names).toContain('pessimist');
      expect(names).toContain('pragmatist');
      expect(names).toContain('critic');
    });

    it('should have varied risk profiles', () => {
      const risks = PERSONALITY_ARCHETYPES.map(p => p.risk);
      expect(risks).toContain('low');
      expect(risks).toContain('medium');
      expect(risks).toContain('high');
    });

    it('should have varied decision styles', () => {
      const styles = PERSONALITY_ARCHETYPES.map(p => p.decisionStyle);
      const uniqueStyles = new Set(styles);
      expect(uniqueStyles.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Swarm Metrics', () => {
    it('should track all key metrics', async () => {
      const swarm = new AgentSwarm({
        populationSize: 6,
        iterations: 2
      });

      const problem: ComplexProblem = {
        key: 'TEST-456',
        description: 'Test problem',
        complexity: 75,
        constraints: [],
        acceptanceCriteria: [],
        context: {}
      };

      await swarm.solve(problem);

      const metrics = swarm.getMetrics();

      expect(metrics.totalAgents).toBe(6);
      expect(metrics.iterationsCompleted).toBeGreaterThan(0);
      expect(metrics.timeToConsensus).toBeGreaterThan(0);
      expect(metrics.solutionsProposed).toBeGreaterThan(0);
      expect(metrics.averageConfidence).toBeGreaterThan(0);
      expect(metrics.diversityMaintained).toBeGreaterThan(0);
      expect(metrics.estimatedCost).toBeGreaterThan(0);
    });
  });
});
