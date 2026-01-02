/**
 * Tests for Task Characteristics Extraction
 *
 * Validates the extraction of task characteristics including complexity, novelty,
 * uncertainty, criticality, and domain classification.
 */

import { expect } from 'chai';
import { TokenBudgetPredictor } from '../../lib/token-budget-predictor';

describe('Task Characteristics Extraction', () => {
  let predictor: TokenBudgetPredictor;

  beforeEach(() => {
    predictor = new TokenBudgetPredictor();
  });

  describe('Complexity Estimation', () => {
    it('should estimate low complexity for simple tasks', () => {
      const task = {
        description: 'Fix typo in README',
        title: 'Documentation fix',
        storyPoints: 1,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.complexity).to.be.lessThan(40);
    });

    it('should estimate high complexity for complex tasks', () => {
      const task = {
        description: 'Implement a new distributed caching layer with Redis clustering, '
          + 'support for multi-region replication, automatic failover, '
          + 'and comprehensive monitoring. This requires architectural changes '
          + 'across multiple services and careful data migration planning.',
        title: 'Distributed Caching Architecture',
        storyPoints: 13,
        subtasks: ['Design architecture', 'Implement Redis cluster', 'Setup replication', 'Implement failover', 'Add monitoring'],
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.complexity).to.be.greaterThan(70);
    });

    it('should factor in description length', () => {
      const shortTask = {
        description: 'Fix bug',
      };

      const longTask = {
        description: 'Fix a critical bug in the authentication service that causes users to be logged out '
          + 'unexpectedly when switching between tabs. The issue appears to be related to session '
          + 'management and token refresh logic. Need to investigate session storage, cookie handling, '
          + 'and JWT token lifecycle. Also need to ensure fix doesn\'t break existing authentication flows.',
      };

      const shortChars = (predictor as any).extractCharacteristics(shortTask);
      const longChars = (predictor as any).extractCharacteristics(longTask);

      expect(longChars.complexity).to.be.greaterThan(shortChars.complexity);
    });

    it('should factor in story points', () => {
      const lowPointTask = {
        description: 'Small task',
        storyPoints: 1,
      };

      const highPointTask = {
        description: 'Large task',
        storyPoints: 13,
      };

      const lowChars = (predictor as any).extractCharacteristics(lowPointTask);
      const highChars = (predictor as any).extractCharacteristics(highPointTask);

      expect(highChars.complexity).to.be.greaterThan(lowChars.complexity);
    });

    it('should factor in subtask count', () => {
      const noSubtasks = {
        description: 'Simple task',
      };

      const manySubtasks = {
        description: 'Complex task',
        subtasks: ['Subtask 1', 'Subtask 2', 'Subtask 3', 'Subtask 4', 'Subtask 5'],
      };

      const noSubChars = (predictor as any).extractCharacteristics(noSubtasks);
      const manySubChars = (predictor as any).extractCharacteristics(manySubtasks);

      expect(manySubChars.complexity).to.be.greaterThan(noSubChars.complexity);
    });

    it('should cap complexity at 100', () => {
      const extremeTask = {
        description: 'X'.repeat(10000),
        storyPoints: 100,
        subtasks: Array(100).fill('subtask'),
      };

      const characteristics = (predictor as any).extractCharacteristics(extremeTask);

      expect(characteristics.complexity).to.be.lessThanOrEqual(100);
    });
  });

  describe('Domain Extraction', () => {
    it('should extract backend domain', () => {
      const task = {
        description: 'Create a new API endpoint for user authentication',
        title: 'Backend API development',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('backend');
    });

    it('should extract frontend domain', () => {
      const task = {
        description: 'Build a new React component for the user dashboard',
        title: 'UI component',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('frontend');
    });

    it('should extract database domain', () => {
      const task = {
        description: 'Create database migration for new user schema',
        title: 'Database schema update',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('database');
    });

    it('should extract authentication domain', () => {
      const task = {
        description: 'Implement JWT token refresh logic',
        title: 'Authentication enhancement',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('authentication');
    });

    it('should extract testing domain', () => {
      const task = {
        description: 'Write unit tests for user service',
        title: 'Testing task',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('testing');
    });

    it('should extract devops domain', () => {
      const task = {
        description: 'Setup CI/CD pipeline with kubernetes deployment',
        title: 'DevOps infrastructure',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('devops');
    });

    it('should extract architecture domain', () => {
      const task = {
        description: 'Design microservices architecture for order processing',
        title: 'Architecture design',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('architecture');
    });

    it('should extract multiple domains', () => {
      const task = {
        description: 'Build a React frontend with API backend and database integration',
        title: 'Full-stack feature',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain.length).to.be.greaterThan(1);
      expect(characteristics.domain).to.include('frontend');
      expect(characteristics.domain).to.include('backend');
    });

    it('should default to general if no domains match', () => {
      const task = {
        description: 'Some unclassified task',
        title: 'Generic work',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('general');
    });

    it('should extract from labels', () => {
      const task = {
        description: 'Task',
        title: 'Task',
        labels: ['api', 'backend'],
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('backend');
    });
  });

  describe('Novelty Calculation', () => {
    it('should return medium novelty for first tasks', () => {
      const task = {
        description: 'New task',
        complexity: 50,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.novelty).to.be.approximately(0.5, 0.1);
    });

    it('should calculate lower novelty for similar tasks', async () => {
      // Add historical tasks
      for (let i = 0; i < 5; i++) {
        await predictor.recordBudgetUsage(
          `task-${i}`,
          {
            description: 'Create API endpoint',
            type: 'code-generation',
            complexity: 50,
            domain: ['backend'],
          },
          5000,
          4000,
          3500,
          {
            success: true,
            quality: 85,
            completedInTime: true,
            requiredReflection: false,
          }
        );
      }

      const similarTask = {
        description: 'Create another API endpoint',
        type: 'code-generation',
        complexity: 52,
        domain: ['backend'],
      };

      const characteristics = (predictor as any).extractCharacteristics(similarTask);

      // Should have lower novelty than first task
      expect(characteristics.novelty).to.be.lessThan(0.5);
    });

    it('should calculate higher novelty for different tasks', async () => {
      // Add historical tasks in one domain
      for (let i = 0; i < 5; i++) {
        await predictor.recordBudgetUsage(
          `task-${i}`,
          {
            description: 'Backend API work',
            type: 'code-generation',
            complexity: 50,
            domain: ['backend'],
          },
          5000,
          4000,
          3500,
          {
            success: true,
            quality: 85,
            completedInTime: true,
            requiredReflection: false,
          }
        );
      }

      const differentTask = {
        description: 'Build React component',
        type: 'code-generation',
        complexity: 50,
        domain: ['frontend'],
      };

      const characteristics = (predictor as any).extractCharacteristics(differentTask);

      // Should have higher novelty
      expect(characteristics.novelty).to.be.greaterThan(0.5);
    });
  });

  describe('Uncertainty Calculation', () => {
    it('should calculate low uncertainty for well-defined tasks', () => {
      const task = {
        description: 'Create a REST API endpoint that accepts POST requests with JSON payload '
          + 'containing user email and password, validates the input, checks against database, '
          + 'and returns JWT token on success.',
        acceptanceCriteria: [
          'Endpoint accepts POST /api/login',
          'Validates email format',
          'Checks password against database',
          'Returns JWT token',
          'Returns 401 on invalid credentials',
        ],
        storyPoints: 5,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.uncertainty).to.be.lessThan(0.5);
    });

    it('should calculate high uncertainty for vague tasks', () => {
      const task = {
        description: 'Improve performance',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.uncertainty).to.be.greaterThan(0.5);
    });

    it('should increase uncertainty for spike tasks', () => {
      const normalTask = {
        description: 'Implement feature',
        labels: [],
      };

      const spikeTask = {
        description: 'Investigate options',
        labels: ['spike'],
      };

      const normalChars = (predictor as any).extractCharacteristics(normalTask);
      const spikeChars = (predictor as any).extractCharacteristics(spikeTask);

      expect(spikeChars.uncertainty).to.be.greaterThan(normalChars.uncertainty);
    });

    it('should increase uncertainty for research tasks', () => {
      const task = {
        description: 'Research different caching solutions',
        labels: ['research'],
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.uncertainty).to.be.greaterThan(0.6);
    });

    it('should decrease uncertainty with acceptance criteria', () => {
      const noAC = {
        description: 'Build feature',
      };

      const withAC = {
        description: 'Build feature',
        acceptanceCriteria: ['Criteria 1', 'Criteria 2', 'Criteria 3'],
      };

      const noACChars = (predictor as any).extractCharacteristics(noAC);
      const withACChars = (predictor as any).extractCharacteristics(withAC);

      expect(withACChars.uncertainty).to.be.lessThan(noACChars.uncertainty);
    });

    it('should decrease uncertainty with detailed description', () => {
      const shortDesc = {
        description: 'Fix bug',
      };

      const longDesc = {
        description: 'Fix the authentication bug where users are logged out after 5 minutes '
          + 'due to token expiration. The issue is in the token refresh logic in auth.service.ts. '
          + 'Update the refresh interval from 5 minutes to 50 minutes and add proper error handling.',
      };

      const shortChars = (predictor as any).extractCharacteristics(shortDesc);
      const longChars = (predictor as any).extractCharacteristics(longDesc);

      expect(longChars.uncertainty).to.be.lessThan(shortChars.uncertainty);
    });
  });

  describe('Criticality Calculation', () => {
    it('should calculate high criticality for critical priority', () => {
      const task = {
        description: 'Task',
        priority: 'Critical',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.criticality).to.be.greaterThan(0.8);
    });

    it('should calculate high criticality for highest priority', () => {
      const task = {
        description: 'Task',
        priority: 'Highest',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.criticality).to.be.greaterThan(0.8);
    });

    it('should calculate medium criticality for high priority', () => {
      const task = {
        description: 'Task',
        priority: 'High',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.criticality).to.be.approximately(0.7, 0.1);
    });

    it('should calculate low criticality for low priority', () => {
      const task = {
        description: 'Task',
        priority: 'Low',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.criticality).to.be.lessThan(0.5);
    });

    it('should increase criticality for security issues', () => {
      const normalTask = {
        description: 'Add new feature',
        priority: 'Medium',
      };

      const securityTask = {
        description: 'Fix security vulnerability in authentication',
        priority: 'Medium',
      };

      const normalChars = (predictor as any).extractCharacteristics(normalTask);
      const securityChars = (predictor as any).extractCharacteristics(securityTask);

      expect(securityChars.criticality).to.be.greaterThan(normalChars.criticality);
    });

    it('should increase criticality for data loss issues', () => {
      const task = {
        description: 'Fix potential data loss in user deletion flow',
        priority: 'Medium',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.criticality).to.be.greaterThan(0.6);
    });

    it('should cap criticality at 1.0', () => {
      const task = {
        description: 'Critical security issue causing data loss',
        title: 'CRITICAL: Security breach',
        priority: 'Critical',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.criticality).to.be.lessThanOrEqual(1.0);
    });
  });

  describe('Task Type Extraction', () => {
    it('should use provided task type', () => {
      const task = {
        description: 'Task',
        type: 'code-generation',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.taskType).to.equal('code-generation');
    });

    it('should default to unknown if not provided', () => {
      const task = {
        description: 'Task',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.taskType).to.equal('unknown');
    });
  });

  describe('Special Characteristics', () => {
    it('should detect creativity requirement', () => {
      const task = {
        description: 'Task',
        requiresCreativity: true,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.requiresCreativity).to.be.true;
    });

    it('should detect architecture involvement', () => {
      const task = {
        description: 'Task',
        involvesArchitecture: true,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.involvesArchitecture).to.be.true;
    });

    it('should capture story points', () => {
      const task = {
        description: 'Task',
        storyPoints: 8,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.storyPoints).to.equal(8);
    });

    it('should capture subtask count', () => {
      const task = {
        description: 'Task',
        subtaskCount: 5,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.subtaskCount).to.equal(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing description', () => {
      const task = {
        title: 'Task',
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics).to.exist;
      expect(characteristics.complexity).to.be.greaterThan(0);
    });

    it('should handle empty task', () => {
      const task = {};

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics).to.exist;
      expect(characteristics.complexity).to.be.greaterThan(0);
      expect(characteristics.domain).to.include('general');
    });

    it('should handle undefined values', () => {
      const task = {
        description: undefined,
        title: undefined,
        complexity: undefined,
        storyPoints: undefined,
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics).to.exist;
      expect(characteristics.complexity).to.be.a('number');
      expect(characteristics.uncertainty).to.be.a('number');
    });

    it('should handle numeric string labels', () => {
      const task = {
        description: 'Task',
        labels: ['123', 'backend', '456'],
      };

      const characteristics = (predictor as any).extractCharacteristics(task);

      expect(characteristics.domain).to.include('backend');
    });
  });
});
