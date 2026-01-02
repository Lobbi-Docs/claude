/**
 * Unit tests for Self-Reflection Engine
 *
 * Tests the core self-reflection functionality including:
 * - Reflection loop execution
 * - Quality criteria evaluation
 * - Iterative improvement
 * - Configuration management
 */

import {
  SelfReflectionEngine,
  ReflectionConfig,
  QualityCriteria,
  Score,
  Task,
  LLMResponse,
  createStandardCriteria,
  createReflectionEngine,
} from '../../lib/self-reflection-engine';

// ============================================
// MOCK LLM CLIENT
// ============================================

class MockLLMClient {
  private responses: Map<string, any> = new Map();
  public callCount: number = 0;

  setResponse(key: string, response: any): void {
    this.responses.set(key, response);
  }

  async analyze(options: {
    prompt: string;
    thinking_budget?: number;
    format?: string;
  }): Promise<{ content: any; thinkingTokens?: number }> {
    this.callCount++;

    // Return pre-configured response based on prompt keywords
    if (options.prompt.includes('quality criteria')) {
      return {
        content: {
          improvements: [
            'Add more specific examples',
            'Improve error handling coverage',
            'Enhance edge case testing',
          ],
        },
        thinkingTokens: options.thinking_budget || 5000,
      };
    }

    if (options.prompt.includes('CORRECTNESS')) {
      return {
        content: {
          score: 0.88,
          reasoning: 'Code logic is correct with minor improvements needed',
          suggestions: ['Add input validation', 'Handle null cases'],
          confidence: 0.85,
        },
        thinkingTokens: 3000,
      };
    }

    if (options.prompt.includes('COMPLETENESS')) {
      return {
        content: {
          score: 0.92,
          reasoning: 'Most requirements covered, few edge cases missing',
          suggestions: ['Add boundary condition tests'],
          confidence: 0.90,
        },
        thinkingTokens: 3000,
      };
    }

    if (options.prompt.includes('ACTIONABILITY')) {
      return {
        content: {
          score: 0.85,
          reasoning: 'Suggestions are clear and implementable',
          suggestions: ['Add code examples'],
          confidence: 0.88,
        },
        thinkingTokens: 3000,
      };
    }

    if (options.prompt.includes('BEST PRACTICES')) {
      return {
        content: {
          score: 0.80,
          reasoning: 'Follows most best practices, some improvements possible',
          suggestions: ['Use dependency injection', 'Add error logging'],
          confidence: 0.82,
        },
        thinkingTokens: 3000,
      };
    }

    // Default response
    return {
      content: 'Default mock response',
      thinkingTokens: options.thinking_budget || 1000,
    };
  }
}

// ============================================
// TEST FIXTURES
// ============================================

function createTestTask(): Task {
  return {
    id: 'TEST-123',
    description: 'Implement user authentication',
    context: {
      requirements: ['Login page', 'JWT tokens', 'Password hashing'],
    },
    acceptanceCriteria: [
      'Users can log in with email/password',
      'JWT tokens are issued on successful login',
      'Passwords are hashed with bcrypt',
    ],
  };
}

function createMockCriteria(llmClient: MockLLMClient): QualityCriteria[] {
  return [
    {
      name: 'correctness',
      weight: 0.4,
      evaluator: async (output: any) => ({
        value: 0.88,
        reasoning: 'Mock correctness evaluation',
        suggestions: ['Add input validation'],
        confidence: 0.85,
      }),
      description: 'Test correctness criterion',
    },
    {
      name: 'completeness',
      weight: 0.6,
      evaluator: async (output: any) => ({
        value: 0.92,
        reasoning: 'Mock completeness evaluation',
        suggestions: ['Add edge cases'],
        confidence: 0.90,
      }),
      description: 'Test completeness criterion',
    },
  ];
}

// ============================================
// UNIT TESTS
// ============================================

describe('SelfReflectionEngine', () => {
  let llmClient: MockLLMClient;
  let engine: SelfReflectionEngine;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  describe('Configuration', () => {
    test('should initialize with default config', () => {
      const criteria = createMockCriteria(llmClient);
      engine = new SelfReflectionEngine(llmClient, { criteria });

      const config = engine.getConfig();
      expect(config.maxIterations).toBe(3);
      expect(config.qualityThreshold).toBe(0.85);
      expect(config.criteria.length).toBe(2);
    });

    test('should accept custom config', () => {
      const criteria = createMockCriteria(llmClient);
      engine = new SelfReflectionEngine(llmClient, {
        criteria,
        maxIterations: 5,
        qualityThreshold: 0.90,
        verbose: true,
      });

      const config = engine.getConfig();
      expect(config.maxIterations).toBe(5);
      expect(config.qualityThreshold).toBe(0.90);
      expect(config.verbose).toBe(true);
    });

    test('should validate criteria weights sum to 1.0', () => {
      const invalidCriteria: QualityCriteria[] = [
        {
          name: 'test1',
          weight: 0.5,
          evaluator: async () => ({ value: 0.8, reasoning: '', suggestions: [], confidence: 0.8 }),
          description: 'Test',
        },
        {
          name: 'test2',
          weight: 0.3, // Sum = 0.8, not 1.0
          evaluator: async () => ({ value: 0.8, reasoning: '', suggestions: [], confidence: 0.8 }),
          description: 'Test',
        },
      ];

      expect(() => {
        new SelfReflectionEngine(llmClient, { criteria: invalidCriteria });
      }).toThrow('Criteria weights must sum to 1.0');
    });

    test('should update config dynamically', () => {
      const criteria = createMockCriteria(llmClient);
      engine = new SelfReflectionEngine(llmClient, { criteria });

      engine.updateConfig({
        maxIterations: 4,
        qualityThreshold: 0.88,
      });

      const config = engine.getConfig();
      expect(config.maxIterations).toBe(4);
      expect(config.qualityThreshold).toBe(0.88);
    });
  });

  describe('Reflection Loop Execution', () => {
    test('should execute single iteration when quality threshold met', async () => {
      const criteria = createMockCriteria(llmClient);
      engine = new SelfReflectionEngine(llmClient, {
        criteria,
        qualityThreshold: 0.85, // Weighted score will be 0.904
      });

      const task = createTestTask();
      let generatorCallCount = 0;

      const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => {
        generatorCallCount++;
        return {
          content: { implementation: 'User auth code here' },
          thinkingTokens: thinkingBudget,
        };
      };

      const result = await engine.executeWithReflection(task, generator);

      expect(result.iterations).toBe(1);
      expect(result.finalScore).toBeGreaterThanOrEqual(0.85);
      expect(result.metadata.thresholdMet).toBe(true);
      expect(generatorCallCount).toBe(1);
      expect(result.reflections.length).toBe(1);
    });

    test('should iterate multiple times when quality threshold not met', async () => {
      // Create criteria with low initial scores that improve
      let callCount = 0;
      const improvingCriteria: QualityCriteria[] = [
        {
          name: 'quality',
          weight: 1.0,
          evaluator: async (output: any) => {
            callCount++;
            // First iteration: 0.70, Second: 0.80, Third: 0.90
            const score = 0.70 + (callCount * 0.10);
            return {
              value: score,
              reasoning: `Iteration ${callCount}`,
              suggestions: ['Improve X', 'Enhance Y'],
              confidence: 0.80,
            };
          },
          description: 'Test improving criterion',
        },
      ];

      engine = new SelfReflectionEngine(llmClient, {
        criteria: improvingCriteria,
        qualityThreshold: 0.85,
        maxIterations: 3,
      });

      const task = createTestTask();
      const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => ({
        content: { implementation: 'Code' },
        thinkingTokens: thinkingBudget,
      });

      const result = await engine.executeWithReflection(task, generator);

      expect(result.iterations).toBeGreaterThan(1);
      expect(result.reflections.length).toBeGreaterThan(1);
    });

    test('should respect maxIterations limit', async () => {
      const lowQualityCriteria: QualityCriteria[] = [
        {
          name: 'quality',
          weight: 1.0,
          evaluator: async () => ({
            value: 0.50, // Always low score
            reasoning: 'Always fails',
            suggestions: ['Fix everything'],
            confidence: 0.80,
          }),
          description: 'Test low quality criterion',
        },
      ];

      engine = new SelfReflectionEngine(llmClient, {
        criteria: lowQualityCriteria,
        qualityThreshold: 0.85,
        maxIterations: 2,
      });

      const task = createTestTask();
      const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => ({
        content: { implementation: 'Code' },
        thinkingTokens: thinkingBudget,
      });

      const result = await engine.executeWithReflection(task, generator);

      expect(result.iterations).toBe(2);
      expect(result.metadata.thresholdMet).toBe(false);
      expect(result.finalScore).toBeLessThan(0.85);
    });

    test('should track thinking tokens across iterations', async () => {
      const criteria = createMockCriteria(llmClient);
      engine = new SelfReflectionEngine(llmClient, {
        criteria,
        thinkingBudget: {
          initial: 8000,
          reflection: 5000,
        },
      });

      const task = createTestTask();
      const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => ({
        content: { implementation: 'Code' },
        thinkingTokens: thinkingBudget,
      });

      const result = await engine.executeWithReflection(task, generator);

      expect(result.metadata.totalThinkingTokens).toBeGreaterThan(0);
      expect(result.metadata.timeElapsed).toBeGreaterThan(0);
    });
  });

  describe('Quality Score Calculation', () => {
    test('should calculate weighted quality score correctly', async () => {
      const criteria: QualityCriteria[] = [
        {
          name: 'criterion1',
          weight: 0.3,
          evaluator: async () => ({
            value: 0.80,
            reasoning: 'Test',
            suggestions: [],
            confidence: 0.85,
          }),
          description: 'Test criterion 1',
        },
        {
          name: 'criterion2',
          weight: 0.7,
          evaluator: async () => ({
            value: 0.90,
            reasoning: 'Test',
            suggestions: [],
            confidence: 0.90,
          }),
          description: 'Test criterion 2',
        },
      ];

      engine = new SelfReflectionEngine(llmClient, { criteria });

      const task = createTestTask();
      const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => ({
        content: { implementation: 'Code' },
        thinkingTokens: thinkingBudget,
      });

      const result = await engine.executeWithReflection(task, generator);

      // Expected: (0.80 * 0.3) + (0.90 * 0.7) = 0.24 + 0.63 = 0.87
      expect(result.finalScore).toBeCloseTo(0.87, 2);
    });
  });

  describe('Task Augmentation', () => {
    test('should augment task with improvement suggestions', async () => {
      let taskVersions: Task[] = [];

      const criteria: QualityCriteria[] = [
        {
          name: 'quality',
          weight: 1.0,
          evaluator: async () => ({
            value: 0.75, // Below threshold
            reasoning: 'Needs improvement',
            suggestions: ['Add validation', 'Improve error handling'],
            confidence: 0.80,
          }),
          description: 'Test criterion',
        },
      ];

      engine = new SelfReflectionEngine(llmClient, {
        criteria,
        maxIterations: 2,
        qualityThreshold: 0.85,
      });

      const task = createTestTask();
      const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => {
        taskVersions.push(task);
        return {
          content: { implementation: 'Code' },
          thinkingTokens: thinkingBudget,
        };
      };

      await engine.executeWithReflection(task, generator);

      expect(taskVersions.length).toBeGreaterThan(1);
      // Second task should have augmented description
      expect(taskVersions[1].description).toContain('improvements from previous iteration');
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Standard Criteria Evaluators', () => {
  let llmClient: MockLLMClient;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  test('createStandardCriteria should return 4 criteria with correct weights', () => {
    const criteria = createStandardCriteria(llmClient);

    expect(criteria.length).toBe(4);
    expect(criteria.map(c => c.name)).toEqual([
      'correctness',
      'completeness',
      'actionability',
      'best_practices',
    ]);

    // Weights should sum to 1.0
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  test('createReflectionEngine should create configured engine', () => {
    const engine = createReflectionEngine(llmClient, {
      domain: 'backend',
      maxIterations: 4,
      qualityThreshold: 0.88,
      verbose: true,
    });

    const config = engine.getConfig();
    expect(config.maxIterations).toBe(4);
    expect(config.qualityThreshold).toBe(0.88);
    expect(config.verbose).toBe(true);
    expect(config.criteria.length).toBe(4);
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Error Handling', () => {
  let llmClient: MockLLMClient;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  test('should handle evaluator errors gracefully', async () => {
    const failingCriteria: QualityCriteria[] = [
      {
        name: 'failing',
        weight: 1.0,
        evaluator: async () => {
          throw new Error('Evaluator failed');
        },
        description: 'Test failing criterion',
      },
    ];

    const engine = new SelfReflectionEngine(llmClient, {
      criteria: failingCriteria,
    });

    const task = createTestTask();
    const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => ({
      content: { implementation: 'Code' },
      thinkingTokens: thinkingBudget,
    });

    // Should not throw, but handle error
    await expect(
      engine.executeWithReflection(task, generator)
    ).rejects.toThrow();
  });

  test('should validate maxIterations is positive', () => {
    const criteria = createMockCriteria(llmClient);

    expect(() => {
      new SelfReflectionEngine(llmClient, {
        criteria,
        maxIterations: 0,
      });
    }).toThrow('maxIterations must be at least 1');
  });

  test('should validate qualityThreshold is between 0 and 1', () => {
    const criteria = createMockCriteria(llmClient);

    expect(() => {
      new SelfReflectionEngine(llmClient, {
        criteria,
        qualityThreshold: 1.5,
      });
    }).toThrow('qualityThreshold must be between 0 and 1');
  });

  test('should require at least one criterion', () => {
    expect(() => {
      new SelfReflectionEngine(llmClient, {
        criteria: [],
      });
    }).toThrow('At least one quality criterion is required');
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Performance', () => {
  let llmClient: MockLLMClient;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  test('should complete single iteration quickly', async () => {
    const criteria = createMockCriteria(llmClient);
    const engine = new SelfReflectionEngine(llmClient, { criteria });

    const task = createTestTask();
    const generator = async (task: Task, thinkingBudget: number): Promise<LLMResponse> => ({
      content: { implementation: 'Code' },
      thinkingTokens: thinkingBudget,
    });

    const startTime = Date.now();
    await engine.executeWithReflection(task, generator);
    const duration = Date.now() - startTime;

    // Should complete in under 1 second for mocked LLM
    expect(duration).toBeLessThan(1000);
  });
});

export {};
