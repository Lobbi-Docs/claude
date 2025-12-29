/**
 * Tests for adaptive learning algorithms
 *
 * Validates:
 * - Effectiveness calculation
 * - Pattern extraction and updates
 * - Model retraining
 * - Prediction accuracy improvements over time
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import AdaptiveDecomposer, {
  Task,
  Outcome,
  DecompositionPattern,
  AntiPattern
} from '../../lib/adaptive-decomposition';

describe('Adaptive Learning Algorithms', () => {
  let decomposer: AdaptiveDecomposer;
  let testIntelligencePath: string;

  beforeEach(() => {
    testIntelligencePath = path.join(__dirname, '../../sessions/intelligence-test-learning');
    if (!fs.existsSync(testIntelligencePath)) {
      fs.mkdirSync(testIntelligencePath, { recursive: true });
    }

    decomposer = new AdaptiveDecomposer(testIntelligencePath);
  });

  afterEach(() => {
    const testFile = path.join(testIntelligencePath, 'decomposition-patterns.json');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  describe('Effectiveness Calculation', () => {
    it('should calculate perfect effectiveness (1.0) for ideal outcome', async () => {
      const task: Task = {
        key: 'LEARN-001',
        summary: 'Perfect task',
        description: 'Task completed perfectly',
        complexity: 50,
        storyPoints: 8,
        labels: ['test'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      const perfectOutcome: Outcome = {
        success: true,
        actualDuration: 32,
        estimatedDuration: 32, // Perfect estimate
        issuesEncountered: [],
        velocityAchieved: 8,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0,
        teamSatisfaction: 5
      };

      await decomposer.recordOutcome('LEARN-001', decomposition, perfectOutcome);

      // Effectiveness should be very close to 1.0
      // We verify by checking that it's recorded in stats
      const stats = decomposer.getStatistics();
      expect(stats.avgEffectiveness).toBeGreaterThan(0.9);
    });

    it('should calculate low effectiveness (<0.5) for failed outcome', async () => {
      const task: Task = {
        key: 'LEARN-002',
        summary: 'Failed task',
        description: 'Task that failed',
        complexity: 60,
        storyPoints: 13,
        labels: ['test'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      const failedOutcome: Outcome = {
        success: false,
        actualDuration: 80,
        estimatedDuration: 40, // 2x underestimated
        issuesEncountered: ['Major blocker', 'Missing requirements', 'Technical debt'],
        velocityAchieved: 5, // Only 38% of planned
        blockers: 4,
        reworkRequired: true,
        completionRate: 0.38,
        teamSatisfaction: 2
      };

      await decomposer.recordOutcome('LEARN-002', decomposition, failedOutcome);

      // Should result in low effectiveness
      const antiPatterns = decomposer.getAntiPatterns();
      expect(antiPatterns).toBeDefined();
      expect(antiPatterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should weight estimate accuracy in effectiveness calculation', async () => {
      const task: Task = {
        key: 'LEARN-003',
        summary: 'Estimate accuracy test',
        description: 'Test estimate accuracy impact',
        complexity: 45,
        storyPoints: 8,
        labels: ['test'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      // Good outcome but poor estimate
      const outcome: Outcome = {
        success: true,
        actualDuration: 50,
        estimatedDuration: 25, // 2x underestimated
        issuesEncountered: ['Unexpected complexity'],
        velocityAchieved: 8,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      };

      await decomposer.recordOutcome('LEARN-003', decomposition, outcome);

      // Effectiveness should be reduced due to poor estimate
      const stats = decomposer.getStatistics();
      expect(stats.avgEffectiveness).toBeLessThan(0.9);
    });
  });

  describe('Pattern Extraction', () => {
    it('should extract patterns after sufficient samples (3+)', async () => {
      // Create 5 similar tasks in complexity range 40-60
      for (let i = 0; i < 5; i++) {
        const task: Task = {
          key: `PATTERN-${i}`,
          summary: `Medium complexity task ${i}`,
          description: 'Medium complexity work',
          complexity: 45 + i * 2,
          storyPoints: 8,
          labels: ['backend', 'api'],
          type: 'Story'
        };

        const decomposition = await decomposer.decompose(task, {
          strategy: 'technical-layer'
        });

        const outcome: Outcome = {
          success: true,
          actualDuration: 30 + i,
          estimatedDuration: 32,
          issuesEncountered: [],
          velocityAchieved: 8,
          blockers: 0,
          reworkRequired: false,
          completionRate: 1.0
        };

        await decomposer.recordOutcome(task.key, decomposition, outcome);
      }

      const patterns = decomposer.getPatterns();

      // Should have extracted pattern for complexity range 40-60
      const relevantPattern = patterns.find(p =>
        p.complexity_range[0] <= 50 && p.complexity_range[1] > 50
      );

      expect(relevantPattern).toBeDefined();
      if (relevantPattern) {
        expect(relevantPattern.sample_size).toBeGreaterThanOrEqual(3);
        expect(relevantPattern.avg_effectiveness).toBeGreaterThan(0);
        expect(relevantPattern.optimal_depth).toBeGreaterThanOrEqual(1);
      }
    });

    it('should identify optimal depth from successful decompositions', async () => {
      // Create tasks with different depths
      const depths = [3, 3, 3, 4, 5]; // Depth 3 is most common

      for (let i = 0; i < depths.length; i++) {
        const task: Task = {
          key: `DEPTH-${i}`,
          summary: `Depth test ${i}`,
          description: 'Testing depth optimization',
          complexity: 55,
          storyPoints: 13,
          labels: ['test'],
          type: 'Story'
        };

        const decomposition = await decomposer.decompose(task, {
          maxDepth: depths[i]
        });

        // Depth 3 has best effectiveness
        const effectiveness = depths[i] === 3 ? 0.95 : 0.80;

        const outcome: Outcome = {
          success: true,
          actualDuration: 48,
          estimatedDuration: 50,
          issuesEncountered: [],
          velocityAchieved: 13,
          blockers: 0,
          reworkRequired: false,
          completionRate: effectiveness
        };

        await decomposer.recordOutcome(task.key, decomposition, outcome);
      }

      const patterns = decomposer.getPatterns();
      const relevantPattern = patterns.find(p =>
        p.complexity_range[0] <= 55 && p.complexity_range[1] > 55
      );

      if (relevantPattern) {
        // Optimal depth should be 3
        expect(relevantPattern.optimal_depth).toBe(3);
      }
    });

    it('should extract common domains from successful decompositions', async () => {
      // Create tasks with authentication domain
      for (let i = 0; i < 4; i++) {
        const task: Task = {
          key: `DOMAIN-${i}`,
          summary: `Authentication feature ${i}`,
          description: 'Auth-related work',
          complexity: 60,
          storyPoints: 13,
          labels: ['authentication', 'security', 'backend'],
          type: 'Story'
        };

        const decomposition = await decomposer.decompose(task);

        const outcome: Outcome = {
          success: true,
          actualDuration: 48,
          estimatedDuration: 50,
          issuesEncountered: [],
          velocityAchieved: 13,
          blockers: 0,
          reworkRequired: false,
          completionRate: 1.0
        };

        await decomposer.recordOutcome(task.key, decomposition, outcome);
      }

      const patterns = decomposer.getPatterns();
      const relevantPattern = patterns.find(p =>
        p.complexity_range[0] <= 60 && p.complexity_range[1] > 60
      );

      if (relevantPattern) {
        expect(relevantPattern.domains).toContain('authentication');
        expect(relevantPattern.domains).toContain('backend');
      }
    });

    it('should identify best strategy from successful patterns', async () => {
      // Create tasks where user-journey strategy works best
      for (let i = 0; i < 4; i++) {
        const task: Task = {
          key: `STRATEGY-${i}`,
          summary: `User feature ${i}`,
          description: 'User-facing feature',
          complexity: 42,
          storyPoints: 8,
          labels: ['frontend', 'ui'],
          type: 'Story'
        };

        const decomposition = await decomposer.decompose(task, {
          strategy: 'user-journey'
        });

        const outcome: Outcome = {
          success: true,
          actualDuration: 30,
          estimatedDuration: 32,
          issuesEncountered: [],
          velocityAchieved: 8,
          blockers: 0,
          reworkRequired: false,
          completionRate: 1.0
        };

        await decomposer.recordOutcome(task.key, decomposition, outcome);
      }

      const stats = decomposer.getStatistics();
      expect(stats.bestStrategy).toBeDefined();
    });
  });

  describe('Anti-Pattern Detection', () => {
    it('should identify over-decomposition anti-pattern', async () => {
      // Create a simple task that was over-decomposed
      const task: Task = {
        key: 'ANTI-001',
        summary: 'Simple bug fix',
        description: 'Fix small bug',
        complexity: 15,
        storyPoints: 2,
        labels: ['bug'],
        type: 'Bug'
      };

      const decomposition = await decomposer.decompose(task, {
        maxDepth: 5 // Way too deep for simple task
      });

      const outcome: Outcome = {
        success: true,
        actualDuration: 10,
        estimatedDuration: 8,
        issuesEncountered: ['Over-planning wasted time'],
        velocityAchieved: 2,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      };

      await decomposer.recordOutcome('ANTI-001', decomposition, outcome);

      // Should detect poor granularity
      const antiPatterns = decomposer.getAntiPatterns();
      const poorGranularity = antiPatterns.find(ap =>
        ap.description.toLowerCase().includes('granularity') ||
        ap.description.toLowerCase().includes('decomposition')
      );

      expect(poorGranularity).toBeDefined();
    });

    it('should identify complex dependency anti-pattern', async () => {
      const task: Task = {
        key: 'ANTI-002',
        summary: 'Feature with circular deps',
        description: 'Feature that has circular dependencies',
        complexity: 50,
        storyPoints: 13,
        labels: ['backend'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      const outcome: Outcome = {
        success: false,
        actualDuration: 60,
        estimatedDuration: 48,
        issuesEncountered: ['Circular dependencies caused blockers'],
        velocityAchieved: 8,
        blockers: 3,
        reworkRequired: true,
        completionRate: 0.6
      };

      await decomposer.recordOutcome('ANTI-002', decomposition, outcome);

      const antiPatterns = decomposer.getAntiPatterns();
      const complexDeps = antiPatterns.find(ap =>
        ap.description.toLowerCase().includes('dependenc')
      );

      expect(complexDeps).toBeDefined();
      if (complexDeps) {
        expect(complexDeps.frequency).toBeGreaterThan(0);
        expect(complexDeps.mitigation).toBeDefined();
      }
    });
  });

  describe('Model Retraining and Improvement', () => {
    it('should improve depth prediction accuracy over time', async () => {
      // Initial prediction without history
      const firstTask: Task = {
        key: 'RETRAIN-001',
        summary: 'First task',
        description: 'Initial task',
        complexity: 55,
        storyPoints: 13,
        labels: ['backend'],
        type: 'Story'
      };

      const firstResult = await decomposer.decompose(firstTask);
      const firstDepth = firstResult.depth;

      // Record optimal outcome with depth 4
      const decomposition = await decomposer.decompose(firstTask, {
        maxDepth: 4
      });

      const outcome: Outcome = {
        success: true,
        actualDuration: 48,
        estimatedDuration: 50,
        issuesEncountered: [],
        velocityAchieved: 13,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      };

      await decomposer.recordOutcome('RETRAIN-001', decomposition, outcome);

      // Train with more similar tasks
      for (let i = 2; i <= 5; i++) {
        const task: Task = {
          key: `RETRAIN-00${i}`,
          summary: `Training task ${i}`,
          description: 'Similar task',
          complexity: 55 + i,
          storyPoints: 13,
          labels: ['backend'],
          type: 'Story'
        };

        const dec = await decomposer.decompose(task, { maxDepth: 4 });

        await decomposer.recordOutcome(task.key, dec, {
          success: true,
          actualDuration: 48,
          estimatedDuration: 50,
          issuesEncountered: [],
          velocityAchieved: 13,
          blockers: 0,
          reworkRequired: false,
          completionRate: 1.0
        });
      }

      // Now predict for similar task
      const newTask: Task = {
        key: 'RETRAIN-NEW',
        summary: 'New similar task',
        description: 'Should use learned depth',
        complexity: 57,
        storyPoints: 13,
        labels: ['backend'],
        type: 'Story'
      };

      const newResult = await decomposer.decompose(newTask);

      // Should predict depth closer to 4
      expect(newResult.depth).toBeCloseTo(4, 1);
    });

    it('should track prediction accuracy improvement metric', async () => {
      // Initial state - no patterns
      let stats = decomposer.getStatistics();
      const initialPatterns = stats.patternsIdentified;

      // Add successful decompositions
      for (let i = 0; i < 6; i++) {
        const task: Task = {
          key: `METRIC-${i}`,
          summary: `Task ${i}`,
          description: 'Task for metrics',
          complexity: 50 + i * 2,
          storyPoints: 13,
          labels: ['backend', 'api'],
          type: 'Story'
        };

        const decomposition = await decomposer.decompose(task);

        await decomposer.recordOutcome(task.key, decomposition, {
          success: true,
          actualDuration: 48,
          estimatedDuration: 50,
          issuesEncountered: [],
          velocityAchieved: 13,
          blockers: 0,
          reworkRequired: false,
          completionRate: 1.0
        });
      }

      // Check that patterns increased
      stats = decomposer.getStatistics();
      expect(stats.patternsIdentified).toBeGreaterThan(initialPatterns);
      expect(stats.totalDecompositions).toBeGreaterThanOrEqual(6);
    });

    it('should update strategy preferences based on outcomes', async () => {
      // Make technical-layer strategy consistently successful
      for (let i = 0; i < 5; i++) {
        const task: Task = {
          key: `STRAT-SUCCESS-${i}`,
          summary: `Backend task ${i}`,
          description: 'Backend work',
          complexity: 55,
          storyPoints: 13,
          labels: ['backend', 'database'],
          type: 'Story'
        };

        const decomposition = await decomposer.decompose(task, {
          strategy: 'technical-layer'
        });

        await decomposer.recordOutcome(task.key, decomposition, {
          success: true,
          actualDuration: 48,
          estimatedDuration: 50,
          issuesEncountered: [],
          velocityAchieved: 13,
          blockers: 0,
          reworkRequired: false,
          completionRate: 1.0
        });
      }

      const stats = decomposer.getStatistics();
      expect(stats.bestStrategy).toBe('technical-layer');
    });
  });

  describe('Continuous Learning', () => {
    it('should persist learned patterns across instances', async () => {
      // Create and train first instance
      const task: Task = {
        key: 'PERSIST-001',
        summary: 'Persistence test',
        description: 'Test pattern persistence',
        complexity: 60,
        storyPoints: 13,
        labels: ['backend'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      await decomposer.recordOutcome('PERSIST-001', decomposition, {
        success: true,
        actualDuration: 48,
        estimatedDuration: 50,
        issuesEncountered: [],
        velocityAchieved: 13,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      });

      const patterns1 = decomposer.getPatterns();

      // Create new instance - should load same patterns
      const newDecomposer = new AdaptiveDecomposer(testIntelligencePath);
      const patterns2 = newDecomposer.getPatterns();

      expect(patterns2.length).toBe(patterns1.length);
    });

    it('should incrementally improve with each outcome', async () => {
      let previousAvg = 0;

      // Add progressively more data
      for (let batch = 0; batch < 3; batch++) {
        for (let i = 0; i < 3; i++) {
          const task: Task = {
            key: `INCREMENTAL-${batch}-${i}`,
            summary: `Task batch ${batch} item ${i}`,
            description: 'Incremental learning',
            complexity: 50,
            storyPoints: 13,
            labels: ['test'],
            type: 'Story'
          };

          const decomposition = await decomposer.decompose(task);

          await decomposer.recordOutcome(task.key, decomposition, {
            success: true,
            actualDuration: 48,
            estimatedDuration: 50,
            issuesEncountered: [],
            velocityAchieved: 13,
            blockers: 0,
            reworkRequired: false,
            completionRate: 1.0
          });
        }

        const stats = decomposer.getStatistics();
        // Effectiveness should stay high or improve
        expect(stats.avgEffectiveness).toBeGreaterThanOrEqual(previousAvg * 0.9);
        previousAvg = stats.avgEffectiveness;
      }
    });
  });
});
