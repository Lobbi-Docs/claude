/**
 * Unit tests for agent selection in the Real-Time Learning System
 *
 * Tests the learning coordinator's ability to:
 * - Select optimal agents based on learned patterns
 * - Score agent fitness for tasks
 * - Provide confidence scores and reasoning
 * - Handle edge cases (no data, tied scores, etc.)
 * - Balance exploration vs exploitation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  RealTimeLearningSystem,
  LearningEvent,
  Task,
  AgentSelection
} from '../../lib/learning-system';
import * as fs from 'fs';
import * as path from 'path';

describe('Agent Selection', () => {
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

  describe('Basic Agent Selection', () => {
    it('should select agent with highest success rate', async () => {
      // Agent A: 95% success in backend
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'agent-a',
          task: {
            id: `TASK-A-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 19, // 19/20 = 95%
            duration: 300000
          },
          context: {}
        });
      }

      // Agent B: 70% success in backend
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'agent-b',
          task: {
            id: `TASK-B-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 14, // 14/20 = 70%
            duration: 300000
          },
          context: {}
        });
      }

      // Select for backend task
      const selection = await learningSystem.selectBestAgent({
        id: 'NEW-TASK',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'New backend review'
      });

      expect(selection.agentName).toBe('agent-a');
      expect(selection.score).toBeGreaterThan(0.8);
      expect(selection.confidence).toBeGreaterThan(0.7);
    });

    it('should provide reasoning for selection', async () => {
      // Build profile for agent
      for (let i = 0; i < 15; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'specialist',
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

      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'New task'
      });

      expect(selection.reasoning).toBeTruthy();
      expect(selection.reasoning).toContain('success rate');
      expect(selection.reasoning.toLowerCase()).toContain('backend');
    });

    it('should include alternate agents in selection', async () => {
      // Create 3 agents with different success rates
      const agents = [
        { name: 'agent-a', successRate: 0.95 },
        { name: 'agent-b', successRate: 0.88 },
        { name: 'agent-c', successRate: 0.82 }
      ];

      for (const agent of agents) {
        const successes = Math.floor(20 * agent.successRate);
        for (let i = 0; i < 20; i++) {
          await learningSystem.recordTaskOutcome({
            timestamp: new Date(),
            agent: agent.name,
            task: {
              id: `${agent.name}-${i}`,
              type: 'review',
              complexity: 50,
              domains: ['backend'],
              description: 'Test'
            },
            outcome: {
              success: i < successes,
              duration: 300000
            },
            context: {}
          });
        }
      }

      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'Test'
      });

      expect(selection.alternates).toBeDefined();
      expect(selection.alternates.length).toBeGreaterThan(0);
      expect(selection.alternates.length).toBeLessThanOrEqual(3);

      // Alternates should be sorted by score
      for (let i = 0; i < selection.alternates.length - 1; i++) {
        expect(selection.alternates[i].score).toBeGreaterThanOrEqual(
          selection.alternates[i + 1].score
        );
      }
    });
  });

  describe('Pattern-Based Selection', () => {
    it('should favor agents with matching strength patterns', async () => {
      // Agent A: backend specialist
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'backend-specialist',
          task: {
            id: `TASK-${i}`,
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

      // Agent B: generalist with lower success
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'generalist',
          task: {
            id: `GEN-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend', 'frontend', 'database'][i % 3],
            description: 'Mixed task'
          },
          outcome: {
            success: i < 16, // 80% overall
            duration: 300000
          },
          context: {}
        });
      }

      // Select for backend task
      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'Backend review'
      });

      // Should select specialist due to pattern match
      expect(selection.agentName).toBe('backend-specialist');
      expect(selection.reasoning).toContain('pattern');
    });

    it('should penalize agents with matching weakness patterns', async () => {
      // Agent with weakness in frontend
      const tasks = [
        ...Array(15).fill('backend'),
        ...Array(5).fill('frontend')
      ];

      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'backend-only',
          task: {
            id: `TASK-${i}`,
            type: 'review',
            complexity: 50,
            domains: [tasks[i]],
            description: 'Test'
          },
          outcome: {
            success: tasks[i] === 'backend', // Fails on frontend
            duration: 300000
          },
          context: {}
        });
      }

      // Agent without weakness
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'fullstack',
          task: {
            id: `FULL-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['frontend'],
            description: 'Test'
          },
          outcome: {
            success: i < 17, // 85% in frontend
            duration: 300000
          },
          context: {}
        });
      }

      // Select for frontend task
      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['frontend'],
        description: 'Frontend review'
      });

      // Should avoid agent with frontend weakness
      expect(selection.agentName).toBe('fullstack');
    });

    it('should consider complexity fit in selection', async () => {
      // Agent A: good at moderate complexity (40-60)
      for (let i = 0; i < 15; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'moderate-specialist',
          task: {
            id: `MOD-${i}`,
            type: 'review',
            complexity: 45 + Math.floor(Math.random() * 15),
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

      // Agent B: good at high complexity (70-90)
      for (let i = 0; i < 15; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'complex-specialist',
          task: {
            id: `COMPLEX-${i}`,
            type: 'review',
            complexity: 70 + Math.floor(Math.random() * 20),
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

      // Select for moderate complexity task
      const moderateSelection = await learningSystem.selectBestAgent({
        id: 'MOD-NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'Moderate task'
      });

      expect(moderateSelection.agentName).toBe('moderate-specialist');

      // Select for high complexity task
      const complexSelection = await learningSystem.selectBestAgent({
        id: 'COMPLEX-NEW',
        type: 'review',
        complexity: 80,
        domains: ['backend'],
        description: 'Complex task'
      });

      expect(complexSelection.agentName).toBe('complex-specialist');
    });
  });

  describe('Trend-Based Selection', () => {
    it('should boost agents on hot streaks', async () => {
      const now = Date.now();

      // Agent A: declining (was good, now poor)
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (10 - i) * 24 * 60 * 60 * 1000),
          agent: 'declining',
          task: {
            id: `DEC-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 5, // First 5 succeed, last 5 fail
            duration: 300000
          },
          context: {}
        });
      }

      // Agent B: improving (was poor, now good)
      for (let i = 0; i < 10; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(now - (10 - i) * 24 * 60 * 60 * 1000),
          agent: 'improving',
          task: {
            id: `IMP-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i >= 5, // First 5 fail, last 5 succeed
            duration: 300000
          },
          context: {}
        });
      }

      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'Test'
      });

      // Should favor improving agent despite same overall success rate
      expect(selection.agentName).toBe('improving');

      const improvingProfile = learningSystem.getProfile('improving');
      expect(improvingProfile!.recentPerformance.trend).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle selection with no historical data', async () => {
      const selection = await learningSystem.selectBestAgent(
        {
          id: 'FIRST',
          type: 'review',
          complexity: 50,
          domains: ['backend'],
          description: 'First task ever'
        },
        ['new-agent']
      );

      expect(selection.agentName).toBe('new-agent');
      expect(selection.confidence).toBeLessThan(0.6); // Low confidence
      expect(selection.reasoning).toContain('No historical data');
    });

    it('should handle tied scores', async () => {
      // Create two identical agents
      for (const agent of ['agent-a', 'agent-b']) {
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
              success: i < 9, // 90% for both
              duration: 300000
            },
            context: {}
          });
        }
      }

      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'Test'
      });

      // Should select one (consistently)
      expect(['agent-a', 'agent-b']).toContain(selection.agentName);

      // Confidence might be slightly lower due to tie
      expect(selection.confidence).toBeGreaterThan(0.5);
    });

    it('should handle agent with limited but perfect record', async () => {
      // Agent with only 3 tasks but 100% success
      for (let i = 0; i < 3; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'perfect-newbie',
          task: {
            id: `NEWBIE-${i}`,
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

      // Agent with many tasks but 85% success
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'experienced',
          task: {
            id: `EXP-${i}`,
            type: 'review',
            complexity: 50,
            domains: ['backend'],
            description: 'Test'
          },
          outcome: {
            success: i < 17, // 85%
            duration: 300000
          },
          context: {}
        });
      }

      const selection = await learningSystem.selectBestAgent({
        id: 'NEW',
        type: 'review',
        complexity: 50,
        domains: ['backend'],
        description: 'Test'
      });

      // Should favor experienced agent (more data = higher confidence)
      expect(selection.agentName).toBe('experienced');
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide higher confidence with more data', async () => {
      // Small sample
      for (let i = 0; i < 5; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'small-sample',
          task: {
            id: `SMALL-${i}`,
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

      const smallSampleSelection = await learningSystem.selectBestAgent(
        {
          id: 'NEW',
          type: 'review',
          complexity: 50,
          domains: ['backend'],
          description: 'Test'
        },
        ['small-sample']
      );

      // Large sample
      for (let i = 0; i < 50; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'large-sample',
          task: {
            id: `LARGE-${i}`,
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

      const largeSampleSelection = await learningSystem.selectBestAgent(
        {
          id: 'NEW2',
          type: 'review',
          complexity: 50,
          domains: ['backend'],
          description: 'Test'
        },
        ['large-sample']
      );

      // Larger sample should have higher confidence
      expect(largeSampleSelection.confidence).toBeGreaterThan(
        smallSampleSelection.confidence
      );
    });

    it('should reduce confidence for novel tasks', async () => {
      // Agent with backend experience only
      for (let i = 0; i < 20; i++) {
        await learningSystem.recordTaskOutcome({
          timestamp: new Date(),
          agent: 'backend-only',
          task: {
            id: `BACK-${i}`,
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

      // Select for backend (familiar)
      const familiarSelection = await learningSystem.selectBestAgent(
        {
          id: 'FAMILIAR',
          type: 'review',
          complexity: 50,
          domains: ['backend'],
          description: 'Backend task'
        },
        ['backend-only']
      );

      // Select for mobile (novel)
      const novelSelection = await learningSystem.selectBestAgent(
        {
          id: 'NOVEL',
          type: 'review',
          complexity: 50,
          domains: ['mobile'],
          description: 'Mobile task (never done before)'
        },
        ['backend-only']
      );

      // Novel task should have lower confidence
      expect(familiarSelection.confidence).toBeGreaterThan(
        novelSelection.confidence
      );
    });
  });
});
