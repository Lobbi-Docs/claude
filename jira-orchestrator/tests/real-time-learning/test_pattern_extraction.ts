/**
 * Unit tests for pattern extraction in the Real-Time Learning System
 *
 * Tests the pattern analyzer's ability to:
 * - Extract domain expertise patterns
 * - Identify complexity sweet spots
 * - Detect task type mastery
 * - Recognize performance trends
 * - Calculate statistical confidence
 * - Assess pattern transferability
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  RealTimeLearningSystem,
  LearningEvent,
  Task,
  Outcome,
  Pattern
} from '../../lib/learning-system';
import * as fs from 'fs';
import * as path from 'path';

describe('Pattern Extraction', () => {
  let learningSystem: RealTimeLearningSystem;
  let testDataDir: string;

  beforeEach(() => {
    // Create temporary test data directory
    testDataDir = path.join(__dirname, 'test-data-' + Date.now());
    fs.mkdirSync(testDataDir, { recursive: true });

    // Initialize learning system with test directory
    learningSystem = new RealTimeLearningSystem(testDataDir);
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Domain Expertise Pattern Extraction', () => {
    it('should extract strength pattern for high success in domain', async () => {
      // Create 10 successful backend tasks
      for (let i = 0; i < 10; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      // Get profile
      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      // Should have backend strength pattern
      const backendPattern = profile!.strengthPatterns.find(p =>
        p.conditions.domain === 'backend'
      );

      expect(backendPattern).toBeDefined();
      expect(backendPattern!.type).toBe('strength');
      expect(backendPattern!.successRate).toBeGreaterThanOrEqual(0.8);
      expect(backendPattern!.confidence).toBeGreaterThan(0.7);
    });

    it('should extract weakness pattern for low success in domain', async () => {
      // Create 5 tasks in frontend: 2 success, 3 failure
      const results = [true, false, false, true, false];

      for (let i = 0; i < 5; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['frontend'],
            description: 'Test task'
          },
          outcome: {
            success: results[i],
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      // Should have frontend weakness pattern
      const frontendPattern = profile!.weaknessPatterns.find(p =>
        p.conditions.domain === 'frontend'
      );

      expect(frontendPattern).toBeDefined();
      expect(frontendPattern!.type).toBe('weakness');
      expect(frontendPattern!.successRate).toBeLessThan(0.5);
    });

    it('should require minimum sample size for pattern extraction', async () => {
      // Only 2 tasks (below minimum of 3)
      for (let i = 0; i < 2; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['testing'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');

      // Should not have testing pattern yet (insufficient data)
      const testingPattern = profile!.strengthPatterns.find(p =>
        p.conditions.domain === 'testing'
      );

      expect(testingPattern).toBeUndefined();
    });
  });

  describe('Complexity Sweet Spot Detection', () => {
    it('should identify optimal complexity range', async () => {
      // Create tasks with varying complexity
      // High success in 40-60 range
      const complexities = [35, 42, 48, 55, 58, 45, 52, 38, 61, 44];

      for (let i = 0; i < complexities.length; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'implementation',
            complexity: complexities[i],
            domains: ['backend'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      // Should have complexity sweet spot pattern
      const complexityPattern = profile!.strengthPatterns.find(p =>
        p.conditions.minComplexity !== undefined &&
        p.conditions.minComplexity === 40
      );

      expect(complexityPattern).toBeDefined();
      expect(complexityPattern!.description).toContain('complexity');
      expect(complexityPattern!.successRate).toBeGreaterThan(0.8);
    });

    it('should update optimal complexity range in profile', async () => {
      // Add successful tasks in 30-70 range
      for (let i = 0; i < 10; i++) {
        const complexity = 30 + Math.floor(Math.random() * 40);
        const event: LearningEvent = {
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity,
            domains: ['backend'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      const [min, max] = profile!.optimalComplexityRange;
      expect(min).toBeGreaterThanOrEqual(25);
      expect(min).toBeLessThanOrEqual(35);
      expect(max).toBeGreaterThanOrEqual(65);
      expect(max).toBeLessThanOrEqual(75);
    });
  });

  describe('Task Type Mastery Detection', () => {
    it('should detect mastery of specific task types', async () => {
      // 8 code-review tasks, all successful and fast
      for (let i = 0; i < 8; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'code-review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test code review',
            estimatedDuration: 600000
          },
          outcome: {
            success: true,
            duration: 450000, // Faster than estimate
            qualityScore: 0.92
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      // Should have code-review mastery pattern
      const masteryPattern = profile!.strengthPatterns.find(p =>
        p.conditions.type === 'code-review'
      );

      expect(masteryPattern).toBeDefined();
      expect(masteryPattern!.description).toContain('mastery');
      expect(masteryPattern!.successRate).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Trend Detection', () => {
    it('should detect hot streak (improving performance)', async () => {
      // First 5 tasks: 60% success
      const earlyResults = [true, false, true, false, true];

      for (let i = 0; i < 5; i++) {
        const event: LearningEvent = {
          timestamp: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000), // 10-5 days ago
          agent: 'test-agent',
          task: {
            id: `EARLY-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Early task'
          },
          outcome: {
            success: earlyResults[i],
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      // Next 5 tasks: 100% success (hot streak)
      for (let i = 0; i < 5; i++) {
        const event: LearningEvent = {
          timestamp: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000), // 5-0 days ago
          agent: 'test-agent',
          task: {
            id: `RECENT-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Recent task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      // Should have hot streak pattern
      const hotStreakPattern = profile!.strengthPatterns.find(p =>
        p.id.includes('hot-streak')
      );

      expect(hotStreakPattern).toBeDefined();
      expect(hotStreakPattern!.successRate).toBeGreaterThan(0.8);

      // Profile should show positive trend
      expect(profile!.recentPerformance.trend).toBeGreaterThan(0);
    });

    it('should detect cold streak (declining performance)', async () => {
      // First 5 tasks: 100% success
      for (let i = 0; i < 5; i++) {
        const event: LearningEvent = {
          timestamp: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          agent: 'test-agent',
          task: {
            id: `EARLY-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Early task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      // Next 5 tasks: 40% success (cold streak)
      const recentResults = [false, true, false, false, true];
      for (let i = 0; i < 5; i++) {
        const event: LearningEvent = {
          timestamp: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
          agent: 'test-agent',
          task: {
            id: `RECENT-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Recent task'
          },
          outcome: {
            success: recentResults[i],
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile('test-agent');
      expect(profile).toBeDefined();

      // Should have cold streak pattern
      const coldStreakPattern = profile!.weaknessPatterns.find(p =>
        p.id.includes('cold-streak')
      );

      expect(coldStreakPattern).toBeDefined();
      expect(coldStreakPattern!.successRate).toBeLessThan(0.6);

      // Profile should show negative trend
      expect(profile!.recentPerformance.trend).toBeLessThan(0);
    });
  });

  describe('Pattern Quality Metrics', () => {
    it('should calculate appropriate confidence based on sample size', async () => {
      const agent = 'test-agent';

      // Add 20 successful backend tasks
      for (let i = 0; i < 20; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent,
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile(agent);
      const pattern = profile!.strengthPatterns.find(p =>
        p.conditions.domain === 'backend'
      );

      expect(pattern).toBeDefined();

      // With 20 samples and 100% success, confidence should be high
      expect(pattern!.confidence).toBeGreaterThan(0.85);
      expect(pattern!.frequency).toBe(20);
    });

    it('should assess transferability appropriately', async () => {
      const agent = 'test-agent';

      // Add domain pattern (should have higher transferability)
      for (let i = 0; i < 10; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent,
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      const profile = learningSystem.getProfile(agent);
      const domainPattern = profile!.strengthPatterns.find(p =>
        p.conditions.domain === 'backend'
      );

      // Domain patterns should be fairly transferable (0.6-0.8)
      expect(domainPattern!.transferability).toBeGreaterThanOrEqual(0.6);
      expect(domainPattern!.transferability).toBeLessThanOrEqual(0.85);
    });
  });

  describe('Pattern Storage and Retrieval', () => {
    it('should persist patterns to pattern library', async () => {
      const agent = 'test-agent';

      // Add successful tasks
      for (let i = 0; i < 10; i++) {
        const event: LearningEvent = {
          timestamp: new Date(),
          agent,
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        };

        await learningSystem.recordTaskOutcome(event);
      }

      // Check that patterns are in library
      const allPatterns = learningSystem.getAllPatterns();
      expect(allPatterns.length).toBeGreaterThan(0);

      // Check that pattern library file exists
      const patternLibraryPath = path.join(testDataDir, 'pattern-library.json');
      expect(fs.existsSync(patternLibraryPath)).toBe(true);

      // Reload learning system from disk
      const reloadedSystem = new RealTimeLearningSystem(testDataDir);
      const reloadedPatterns = reloadedSystem.getAllPatterns();

      expect(reloadedPatterns.length).toBe(allPatterns.length);
    });

    it('should limit number of patterns per agent', async () => {
      const agent = 'test-agent';

      // Create patterns in many domains
      const domains = ['backend', 'frontend', 'database', 'testing', 'devops',
                      'infrastructure', 'api', 'ui', 'mobile', 'desktop'];

      for (const domain of domains) {
        // 10 tasks per domain
        for (let i = 0; i < 10; i++) {
          const event: LearningEvent = {
            timestamp: new Date(),
            agent,
            task: {
              id: `${domain}-${i}`,
              type: 'review',
              complexity: 50,
              domains: [domain],
              description: 'Test task'
            },
            outcome: {
              success: true,
              duration: 300000
            },
            context: {}
          };

          await learningSystem.recordTaskOutcome(event);
        }
      }

      const profile = learningSystem.getProfile(agent);

      // Should limit strength patterns to top 20
      expect(profile!.strengthPatterns.length).toBeLessThanOrEqual(20);

      // Patterns should be sorted by utility (success rate * confidence)
      for (let i = 0; i < profile!.strengthPatterns.length - 1; i++) {
        const utility1 = profile!.strengthPatterns[i].successRate *
                        profile!.strengthPatterns[i].confidence;
        const utility2 = profile!.strengthPatterns[i + 1].successRate *
                        profile!.strengthPatterns[i + 1].confidence;

        expect(utility1).toBeGreaterThanOrEqual(utility2);
      }
    });
  });
});
