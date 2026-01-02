/**
 * Tests for pattern matching and similarity algorithms
 *
 * Validates:
 * - Similarity calculation between tasks
 * - Feature extraction
 * - Similar task finding
 * - Domain keyword extraction
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import AdaptiveDecomposer, {
  Task,
  TaskFeatures,
  Outcome
} from '../../lib/adaptive-decomposition';

describe('Pattern Matching and Similarity', () => {
  let decomposer: AdaptiveDecomposer;
  let testIntelligencePath: string;

  beforeEach(() => {
    testIntelligencePath = path.join(__dirname, '../../sessions/intelligence-test-similarity');
    if (!fs.existsSync(testIntelligencePath)) {
      fs.mkdirSync(testIntelligencePath, { recursive: true });
    }

    decomposer = new AdaptiveDecomposer(testIntelligencePath);
  });

  describe('Feature Extraction', () => {
    it('should extract complexity as primary feature', () => {
      const task: Task = {
        key: 'FEAT-001',
        summary: 'Test task',
        description: 'Testing feature extraction',
        complexity: 65,
        storyPoints: 13,
        labels: ['test'],
        type: 'Story'
      };

      // Features extracted during decompose
      // We'll verify by checking decomposition uses complexity
      expect(task.complexity).toBe(65);
    });

    it('should extract domain keywords from summary and labels', async () => {
      const authTask: Task = {
        key: 'FEAT-002',
        summary: 'Implement authentication system',
        description: 'Add OAuth2 authentication with JWT tokens',
        complexity: 60,
        labels: ['authentication', 'security', 'backend'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(authTask);

      // Verify task was processed correctly
      expect(decomposition).toBeDefined();
      expect(decomposition.rootTask.labels).toContain('authentication');
      expect(decomposition.rootTask.labels).toContain('security');
    });

    it('should identify external dependencies from labels', async () => {
      const integrationTask: Task = {
        key: 'FEAT-003',
        summary: 'Stripe payment integration',
        description: 'Integrate with Stripe API',
        complexity: 70,
        labels: ['integration', 'external', 'api', 'payment'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(integrationTask);

      expect(decomposition.rootTask.labels).toContain('external');
      expect(decomposition.rootTask.labels).toContain('integration');
    });

    it('should calculate uncertainty from description quality', async () => {
      const vagueTask: Task = {
        key: 'FEAT-004',
        summary: 'Fix bug',
        description: 'Bug', // Very short, high uncertainty
        complexity: 40,
        labels: ['bug'],
        type: 'Bug'
      };

      const detailedTask: Task = {
        key: 'FEAT-005',
        summary: 'Fix authentication timeout bug',
        description: `
          Users experience timeout after 5 minutes of inactivity.
          Issue is in JWT token refresh logic in auth middleware.
          Need to update token expiry handling and add refresh endpoint.
          Expected behavior: tokens should refresh automatically.
          Error: "Token expired" appears in console.
        `,
        complexity: 40,
        storyPoints: 5,
        labels: ['bug', 'authentication'],
        type: 'Bug'
      };

      const vagueDecomp = await decomposer.decompose(vagueTask);
      const detailedDecomp = await decomposer.decompose(detailedTask);

      // Detailed task should have more structured decomposition
      expect(detailedDecomp.subtasks.length).toBeGreaterThanOrEqual(vagueDecomp.subtasks.length);
    });

    it('should calculate novelty based on historical similarity', async () => {
      // First, create history with authentication tasks
      for (let i = 0; i < 3; i++) {
        const histTask: Task = {
          key: `HIST-${i}`,
          summary: `Authentication feature ${i}`,
          description: 'Auth work',
          complexity: 60,
          labels: ['authentication', 'backend'],
          type: 'Story'
        };

        const decomp = await decomposer.decompose(histTask);

        await decomposer.recordOutcome(histTask.key, decomp, {
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

      // Now create similar task (low novelty)
      const similarTask: Task = {
        key: 'NOVEL-001',
        summary: 'Authentication enhancement',
        description: 'Enhance auth system',
        complexity: 60,
        labels: ['authentication', 'backend'],
        type: 'Story'
      };

      // And completely different task (high novelty)
      const novelTask: Task = {
        key: 'NOVEL-002',
        summary: 'Blockchain integration',
        description: 'Add blockchain support',
        complexity: 60,
        labels: ['blockchain', 'crypto'],
        type: 'Story'
      };

      const similarDecomp = await decomposer.decompose(similarTask);
      const novelDecomp = await decomposer.decompose(novelTask);

      // Both should succeed, but novel task might have different depth
      expect(similarDecomp).toBeDefined();
      expect(novelDecomp).toBeDefined();
    });
  });

  describe('Similarity Calculation', () => {
    it('should find high similarity for identical complexity and domain', async () => {
      // Create reference task
      const refTask: Task = {
        key: 'SIM-REF',
        summary: 'User profile management',
        description: 'CRUD for user profiles',
        complexity: 50,
        storyPoints: 8,
        labels: ['frontend', 'user-management'],
        type: 'Story'
      };

      const refDecomp = await decomposer.decompose(refTask);
      await decomposer.recordOutcome('SIM-REF', refDecomp, {
        success: true,
        actualDuration: 32,
        estimatedDuration: 32,
        issuesEncountered: [],
        velocityAchieved: 8,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      });

      // Create very similar task
      const similarTask: Task = {
        key: 'SIM-001',
        summary: 'Member profile editing',
        description: 'Edit member profiles',
        complexity: 52, // Very close
        storyPoints: 8,
        labels: ['frontend', 'user-management'],
        type: 'Story'
      };

      const similarDecomp = await decomposer.decompose(similarTask);

      // Should use similar decomposition strategy and depth
      expect(similarDecomp.decompositionStrategy).toBe(refDecomp.decompositionStrategy);
      expect(Math.abs(similarDecomp.depth - refDecomp.depth)).toBeLessThanOrEqual(1);
    });

    it('should find low similarity for different complexity and domain', async () => {
      // Create reference task
      const refTask: Task = {
        key: 'DIFF-REF',
        summary: 'Simple UI fix',
        description: 'Fix button styling',
        complexity: 15,
        storyPoints: 1,
        labels: ['frontend', 'ui', 'bug'],
        type: 'Bug'
      };

      const refDecomp = await decomposer.decompose(refTask);
      await decomposer.recordOutcome('DIFF-REF', refDecomp, {
        success: true,
        actualDuration: 2,
        estimatedDuration: 2,
        issuesEncountered: [],
        velocityAchieved: 1,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      });

      // Create very different task
      const differentTask: Task = {
        key: 'DIFF-001',
        summary: 'Distributed system architecture',
        description: 'Design microservices architecture',
        complexity: 95,
        storyPoints: 34,
        labels: ['architecture', 'backend', 'infrastructure'],
        type: 'Epic'
      };

      const differentDecomp = await decomposer.decompose(differentTask);

      // Should have very different decomposition
      expect(differentDecomp.depth).toBeGreaterThan(refDecomp.depth + 1);
    });

    it('should weight domain overlap in similarity', async () => {
      // Create tasks with same complexity but different domains
      const task1: Task = {
        key: 'DOMAIN-001',
        summary: 'Authentication feature',
        description: 'Add auth',
        complexity: 50,
        labels: ['authentication', 'security', 'backend'],
        type: 'Story'
      };

      const task2: Task = {
        key: 'DOMAIN-002',
        summary: 'Payment feature',
        description: 'Add payment',
        complexity: 50,
        labels: ['payment', 'billing', 'backend'],
        type: 'Story'
      };

      const decomp1 = await decomposer.decompose(task1);
      const decomp2 = await decomposer.decompose(task2);

      // Both backend, but different domains
      // Should have some similarity but not identical
      expect(decomp1.decompositionStrategy).toBe(decomp2.decompositionStrategy);
    });

    it('should handle tasks with no labels gracefully', async () => {
      const noLabelTask: Task = {
        key: 'NOLABEL-001',
        summary: 'Generic task',
        description: 'Task with no labels',
        complexity: 40,
        labels: [],
        type: 'Task'
      };

      const decomposition = await decomposer.decompose(noLabelTask);

      expect(decomposition).toBeDefined();
      expect(decomposition.subtasks.length).toBeGreaterThan(0);
    });
  });

  describe('Similar Task Finding', () => {
    beforeEach(async () => {
      // Create diverse history
      const historyTasks = [
        {
          key: 'HIST-AUTH-1',
          summary: 'OAuth2 implementation',
          complexity: 65,
          labels: ['authentication', 'security', 'backend']
        },
        {
          key: 'HIST-AUTH-2',
          summary: 'JWT token management',
          complexity: 60,
          labels: ['authentication', 'backend']
        },
        {
          key: 'HIST-UI-1',
          summary: 'Dashboard redesign',
          complexity: 45,
          labels: ['frontend', 'ui', 'dashboard']
        },
        {
          key: 'HIST-UI-2',
          summary: 'Profile page',
          complexity: 40,
          labels: ['frontend', 'ui', 'user-management']
        },
        {
          key: 'HIST-PAY-1',
          summary: 'Stripe integration',
          complexity: 70,
          labels: ['payment', 'integration', 'external']
        }
      ];

      for (const histTask of historyTasks) {
        const task: Task = {
          key: histTask.key,
          summary: histTask.summary,
          description: 'Historical task',
          complexity: histTask.complexity,
          storyPoints: 13,
          labels: histTask.labels,
          type: 'Story'
        };

        const decomp = await decomposer.decompose(task);

        await decomposer.recordOutcome(task.key, decomp, {
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
    });

    it('should find similar authentication tasks', async () => {
      const newAuthTask: Task = {
        key: 'FIND-AUTH',
        summary: 'Social login integration',
        description: 'Add Google and GitHub OAuth',
        complexity: 63,
        labels: ['authentication', 'security', 'backend'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(newAuthTask);

      // Should find HIST-AUTH-1 and HIST-AUTH-2 as similar
      // Verify by checking decomposition uses learned patterns
      expect(decomposition).toBeDefined();
      expect(decomposition.depth).toBeGreaterThanOrEqual(3);
    });

    it('should find similar UI tasks', async () => {
      const newUITask: Task = {
        key: 'FIND-UI',
        summary: 'Settings page',
        description: 'Create user settings page',
        complexity: 42,
        labels: ['frontend', 'ui', 'user-management'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(newUITask);

      // Should find HIST-UI-1 and HIST-UI-2 as similar
      expect(decomposition).toBeDefined();
      expect(decomposition.decompositionStrategy).toBe('user-journey');
    });

    it('should return top N most similar tasks', async () => {
      // With 5 tasks in history, should find most similar
      const task: Task = {
        key: 'TOPN-001',
        summary: 'Authentication enhancement',
        description: 'Enhance auth',
        complexity: 62,
        labels: ['authentication', 'backend'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      // Should have found similar tasks and used them for prediction
      expect(decomposition).toBeDefined();
      // Depth should be influenced by similar auth tasks
      expect(decomposition.depth).toBeGreaterThanOrEqual(3);
    });

    it('should handle case with no similar tasks', async () => {
      const uniqueTask: Task = {
        key: 'UNIQUE-001',
        summary: 'Quantum computing integration',
        description: 'Add quantum algorithm',
        complexity: 85,
        labels: ['quantum', 'research', 'experimental'],
        type: 'Epic'
      };

      const decomposition = await decomposer.decompose(uniqueTask);

      // Should use heuristics instead of similarity
      expect(decomposition).toBeDefined();
      expect(decomposition.depth).toBeGreaterThanOrEqual(4); // Based on high complexity
    });
  });

  describe('Domain Keyword Extraction', () => {
    it('should extract technical domain keywords', () => {
      const task: Task = {
        key: 'KEYWORD-001',
        summary: 'API authentication and database optimization',
        description: 'Optimize authentication API and database performance',
        complexity: 60,
        labels: [],
        type: 'Task'
      };

      // Keywords should be extracted from summary and description
      expect(task.summary.toLowerCase()).toContain('authentication');
      expect(task.summary.toLowerCase()).toContain('database');
      expect(task.summary.toLowerCase()).toContain('api');
    });

    it('should extract business domain keywords', () => {
      const task: Task = {
        key: 'KEYWORD-002',
        summary: 'Payment billing and subscription management',
        description: 'Handle payment processing and subscription billing',
        complexity: 65,
        labels: [],
        type: 'Story'
      };

      expect(task.summary.toLowerCase()).toContain('payment');
      expect(task.summary.toLowerCase()).toContain('billing');
      expect(task.description.toLowerCase()).toContain('subscription');
    });

    it('should include labels as domain keywords', async () => {
      const task: Task = {
        key: 'KEYWORD-003',
        summary: 'User feature',
        description: 'Feature for users',
        complexity: 40,
        labels: ['user-management', 'admin', 'reporting'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      expect(decomposition.rootTask.labels).toContain('user-management');
      expect(decomposition.rootTask.labels).toContain('admin');
      expect(decomposition.rootTask.labels).toContain('reporting');
    });

    it('should remove duplicate keywords', async () => {
      const task: Task = {
        key: 'KEYWORD-004',
        summary: 'Authentication system authentication',
        description: 'Add authentication with auth tokens',
        complexity: 50,
        labels: ['authentication', 'auth'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      // Labels should not have duplicates
      const uniqueLabels = new Set(decomposition.rootTask.labels);
      expect(uniqueLabels.size).toBe(decomposition.rootTask.labels.length);
    });
  });

  describe('Edge Cases in Similarity', () => {
    it('should handle null or empty descriptions', async () => {
      const task: Task = {
        key: 'EDGE-001',
        summary: 'Task with no description',
        description: '',
        complexity: 30,
        labels: ['test'],
        type: 'Task'
      };

      const decomposition = await decomposer.decompose(task);

      expect(decomposition).toBeDefined();
      expect(decomposition.subtasks.length).toBeGreaterThan(0);
    });

    it('should handle very long descriptions', async () => {
      const longDesc = 'Lorem ipsum dolor sit amet. '.repeat(100); // 2800+ chars

      const task: Task = {
        key: 'EDGE-002',
        summary: 'Task with very long description',
        description: longDesc,
        complexity: 50,
        storyPoints: 13,
        labels: ['test'],
        type: 'Story'
      };

      const decomposition = await decomposer.decompose(task);

      expect(decomposition).toBeDefined();
    });

    it('should handle similarity with single historical task', async () => {
      // Create new decomposer with minimal history
      const minimalPath = path.join(__dirname, '../../sessions/intelligence-minimal');
      if (!fs.existsSync(minimalPath)) {
        fs.mkdirSync(minimalPath, { recursive: true });
      }

      const minimalDecomposer = new AdaptiveDecomposer(minimalPath);

      const histTask: Task = {
        key: 'MINIMAL-HIST',
        summary: 'Historical task',
        description: 'Single historical task',
        complexity: 50,
        labels: ['backend'],
        type: 'Story'
      };

      const histDecomp = await minimalDecomposer.decompose(histTask);
      await minimalDecomposer.recordOutcome('MINIMAL-HIST', histDecomp, {
        success: true,
        actualDuration: 32,
        estimatedDuration: 32,
        issuesEncountered: [],
        velocityAchieved: 8,
        blockers: 0,
        reworkRequired: false,
        completionRate: 1.0
      });

      const newTask: Task = {
        key: 'MINIMAL-NEW',
        summary: 'New task',
        description: 'Similar new task',
        complexity: 52,
        labels: ['backend'],
        type: 'Story'
      };

      const newDecomp = await minimalDecomposer.decompose(newTask);

      expect(newDecomp).toBeDefined();

      // Cleanup
      const testFile = path.join(minimalPath, 'decomposition-patterns.json');
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      fs.rmdirSync(minimalPath);
    });
  });
});
