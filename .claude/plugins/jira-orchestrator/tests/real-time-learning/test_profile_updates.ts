/**
 * Unit tests for agent profile updates in the Real-Time Learning System
 *
 * Tests the learning system's ability to:
 * - Create and update agent profiles
 * - Track success rates and performance metrics
 * - Identify domain expertise and specialization
 * - Update optimal complexity ranges
 * - Manage recent performance windows
 * - Persist and reload profiles
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  RealTimeLearningSystem,
  LearningEvent,
  AgentProfile
} from '../../lib/learning-system';
import * as fs from 'fs';
import * as path from 'path';

describe('Agent Profile Updates', () => {
  let learningSystem: RealTimeLearningSystem;
  let testDataDir: string;

  beforeEach(() => {
    testDataDir = path.join(__dirname, 'test-data-' + Date.now());
    fs.mkdirSync(testDataDir, { recursive: true });
    learningSystem = new RealTimeLearningSystem(testDataDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Profile Creation', () => {
    it('should create new profile on first task', async () => {
      await learningSystem.recordTaskOutcome({
        timestamp: new Date(),
        agent: 'new-agent',
        task: {
          id: 'FIRST',
          type: 'review',
          complexity: 50,
          domains: ['backend'],
          description: 'First task'
        },
        outcome: {
          success: true,
          duration: 300000
        },
        context: {}
      });

      const profile = learningSystem.getProfile('new-agent');

      expect(profile).toBeDefined();
      expect(profile!.agentName).toBe('new-agent');
      expect(profile!.totalTasks).toBe(1);
      expect(profile!.successfulTasks).toBe(1);
      expect(profile!.createdAt).toBeDefined();
      expect(profile!.lastUpdated).toBeDefined();
    });

    it('should initialize profile with default values', async () => {
      await learningSystem.recordTaskOutcome({
        timestamp: new Date(),
        agent: 'test-agent',
        task: {
          id: 'TEST',
          type: 'review',
          complexity: 50,
          domains: [],
          description: 'Test'
        },
        outcome: {
          success: true,
          duration: 300000
        },
        context: {}
      });

      const profile = learningSystem.getProfile('test-agent');

      expect(profile!.specialization).toEqual([]);
      expect(profile!.strengthPatterns).toEqual([]);
      expect(profile!.weaknessPatterns).toEqual([]);
      expect(profile!.bestDomains).toEqual([]);
      expect(profile!.worstDomains).toEqual([]);
      expect(profile!.optimalComplexityRange).toEqual([0, 100]);
    });
  });

  describe('Success Rate Tracking', () => {
    it('should update success rate correctly', async () => {
      // Add 10 tasks: 8 success, 2 failure
      const results = [true, true, true, true, false, true, true, false, true, true];

      for (let i = 0; i < results.length; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: results[i],
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');

      expect(profile!.totalTasks).toBe(10);
      expect(profile!.successfulTasks).toBe(8);
      expect(profile!.failedTasks).toBe(2);

      // Success rate should be approximately 0.8 (with exponential moving average)
      expect(profile!.successRate).toBeGreaterThan(0.7);
      expect(profile!.successRate).toBeLessThan(0.9);
    });

    it('should use exponential moving average for success rate', async () => {
      // First 5 tasks: all successful
      for (let i = 0; i < 5; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `EARLY-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      const profileAfterSuccess = learningSystem.getProfile('test-agent');
      const successRateHigh = profileAfterSuccess!.successRate;

      // Next 5 tasks: all fail
      for (let i = 0; i < 5; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `LATE-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: false,
            duration: 300000
          },
          context: {}
        });
      }

      const profileAfterFailure = learningSystem.getProfile('test-agent');
      const successRateLow = profileAfterFailure!.successRate;

      // Should have decreased
      expect(successRateLow).toBeLessThan(successRateHigh);

      // But not exactly 0.5 (due to exponential moving average)
      expect(successRateLow).not.toBe(0.5);
    });
  });

  describe('Domain Expertise Tracking', () => {
    it('should identify best domains', async () => {
      // 15 successful backend tasks
      for (let i = 0; i < 15; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `BACK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Backend task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      // 5 mixed frontend tasks (3 success, 2 fail)
      for (let i = 0; i < 5; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `FRONT-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['frontend'],
            description: 'Frontend task'
          },
          outcome: {
            success: i < 3,
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');

      expect(profile!.bestDomains).toContain('backend');
      expect(profile!.bestDomains.indexOf('backend')).toBe(0); // Should be first
    });

    it('should identify worst domains', async () => {
      // 10 successful backend tasks
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `BACK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Backend task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      // 5 frontend tasks (all fail)
      for (let i = 0; i < 5; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `FRONT-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['frontend'],
            description: 'Frontend task'
          },
          outcome: {
            success: false,
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');

      expect(profile!.worstDomains).toContain('frontend');
    });

    it('should update specialization for high-performance domains', async () => {
      // 20 successful backend tasks (>70% success, >5 tasks)
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'specialist',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Backend task'
          },
          outcome: {
            success: i < 18, // 90% success
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('specialist');

      expect(profile!.specialization).toContain('backend');
    });

    it('should not specialize in domains with insufficient data', async () => {
      // Only 3 tasks (need >5 for specialization)
      for (let i = 0; i < 3; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['database'],
            description: 'Database task'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');

      expect(profile!.specialization).not.toContain('database');
    });
  });

  describe('Complexity Range Tracking', () => {
    it('should update optimal complexity range', async () => {
      // Add successful tasks in 40-70 range
      const complexities = [42, 48, 55, 61, 45, 52, 67, 44, 58, 63];

      for (let i = 0; i < complexities.length; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: complexities[i],
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');
      const [min, max] = profile!.optimalComplexityRange;

      // Should capture 10th-90th percentile
      expect(min).toBeGreaterThanOrEqual(40);
      expect(min).toBeLessThanOrEqual(50);
      expect(max).toBeGreaterThanOrEqual(60);
      expect(max).toBeLessThanOrEqual(70);
    });

    it('should require minimum tasks to set complexity range', async () => {
      // Only 3 tasks (need >=5)
      for (let i = 0; i < 3; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');

      // Should still have default range
      expect(profile!.optimalComplexityRange).toEqual([0, 100]);
    });
  });

  describe('Recent Performance Window', () => {
    it('should track recent performance separately', async () => {
      const now = Date.now();

      // Old tasks (20+ days ago): 50% success
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (30 - i) * 24 * 60 * 60 * 1000),
          agent: 'test-agent',
          task: {
            id: `OLD-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Old task'
          },
          outcome: {
            success: i < 5,
            duration: 300000
          },
          context: {}
        });
      }

      // Recent tasks (last 7 days): 90% success
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (7 - Math.floor(i / 2)) * 24 * 60 * 60 * 1000),
          agent: 'test-agent',
          task: {
            id: `RECENT-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Recent task'
          },
          outcome: {
            success: i < 9,
            duration: 300000
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');

      expect(profile!.recentPerformance.recentTasks).toBeLessThanOrEqual(20);
      expect(profile!.recentPerformance.recentSuccesses).toBeGreaterThan(
        profile!.recentPerformance.recentFailures
      );
    });

    it('should calculate performance trend', async () => {
      const now = Date.now();

      // Improving performance: bad → good
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (10 - i) * 24 * 60 * 60 * 1000),
          agent: 'improving',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i >= 5, // First half fail, second half succeed
            duration: 300000
          },
          context: {}
        });
      }

      const improvingProfile = learningSystem.getProfile('improving');
      expect(improvingProfile!.recentPerformance.trend).toBeGreaterThan(0);

      // Declining performance: good → bad
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (10 - i) * 24 * 60 * 60 * 1000),
          agent: 'declining',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 5, // First half succeed, second half fail
            duration: 300000
          },
          context: {}
        });
      }

      const decliningProfile = learningSystem.getProfile('declining');
      expect(decliningProfile!.recentPerformance.trend).toBeLessThan(0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track average duration', async () => {
      const durations = [300000, 400000, 350000, 320000, 380000];

      for (let i = 0; i < durations.length; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: true,
            duration: durations[i]
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;

      expect(profile!.averageDuration).toBeCloseTo(avgDuration, -2); // Within 100ms
    });

    it('should track average quality score', async () => {
      const qualityScores = [0.9, 0.85, 0.92, 0.88, 0.91];

      for (let i = 0; i < qualityScores.length; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'test-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: true,
            duration: 300000,
            qualityScore: qualityScores[i]
          },
          context: {}
        });
      }

      const profile = learningSystem.getProfile('test-agent');
      const avgQuality = qualityScores.reduce((a, b) => a + b) / qualityScores.length;

      expect(profile!.averageQuality).toBeCloseTo(avgQuality, 2);
    });
  });

  describe('Profile Persistence', () => {
    it('should persist profile to disk', async () => {
      await learningSystem.recordTaskOutcome({
        timestamp: new Date(),
        agent: 'test-agent',
        task: {
          id: 'TASK-1',
          type: 'review',
          complexity: 50,
          domains: ['backend'],
          description: 'Test'
        },
        outcome: {
          success: true,
          duration: 300000
        },
        context: {}
      });

      const profilesPath = path.join(testDataDir, 'agent-profiles.json');
      expect(fs.existsSync(profilesPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
      expect(data['test-agent']).toBeDefined();
      expect(data['test-agent'].totalTasks).toBe(1);
    });

    it('should reload profiles from disk', async () => {
      // Create some profiles
      for (let i = 0; i < 5; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'persistent-agent',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: true,
            duration: 300000
          },
          context: {}
        });
      }

      const originalProfile = learningSystem.getProfile('persistent-agent');

      // Create new learning system instance (reload from disk)
      const reloadedSystem = new RealTimeLearningSystem(testDataDir);
      const reloadedProfile = reloadedSystem.getProfile('persistent-agent');

      expect(reloadedProfile).toBeDefined();
      expect(reloadedProfile!.totalTasks).toBe(originalProfile!.totalTasks);
      expect(reloadedProfile!.successRate).toBeCloseTo(originalProfile!.successRate, 2);
    });
  });

  describe('Learning Metrics', () => {
    it('should calculate system-wide metrics', async () => {
      // Add events for multiple agents
      for (const agent of ['agent-a', 'agent-b', 'agent-c']) {
        for (let i = 0; i < 10; i++) {
          await learningSystem.recordTaskOutcome({
            timestamp: new Date(),
            agent,
            task: {
              id: `${agent}-${i}`,
              type: 'review',
              complexity: 50,
              domains: ['backend'],
              description: 'Test'
            },
            outcome: {
              success: i < 8, // 80% success
              duration: 300000
            },
            context: {}
          });
        }
      }

      const metrics = learningSystem.getMetrics();

      expect(metrics.totalEvents).toBe(30);
      expect(metrics.profilesUpdated).toBe(3);
      expect(metrics.averageSuccessRate).toBeCloseTo(0.8, 1);
    });

    it('should calculate improvement rate', async () => {
      const now = Date.now();

      // 60-30 days ago: 70% success
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (60 - i * 3) * 24 * 60 * 60 * 1000),
          agent: 'test-agent',
          task: {
            id: `OLD-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 7,
            duration: 300000
          },
          context: {}
        });
      }

      // Last 30 days: 90% success
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (30 - i * 3) * 24 * 60 * 60 * 1000),
          agent: 'test-agent',
          task: {
            id: `RECENT-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 9,
            duration: 300000
          },
          context: {}
        });
      }

      const metrics = learningSystem.getMetrics();

      // Should show positive improvement
      expect(metrics.improvementRate).toBeGreaterThan(0);
    });
  });
});
