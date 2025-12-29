/**
 * Unit tests for Quality Scoring and Evaluators
 *
 * Tests the quality criteria evaluators:
 * - CorrectnessEvaluator
 * - CompletenessEvaluator
 * - ActionabilityEvaluator
 * - BestPracticesEvaluator
 */

import {
  CorrectnessEvaluator,
  CompletenessEvaluator,
  ActionabilityEvaluator,
  BestPracticesEvaluator,
  Score,
} from '../../lib/self-reflection-engine';

// ============================================
// MOCK LLM CLIENT
// ============================================

class MockLLMClient {
  private mockResponses: Map<string, any> = new Map();

  setMockResponse(key: string, response: any): void {
    this.mockResponses.set(key, response);
  }

  async analyze(options: {
    prompt: string;
    thinking_budget?: number;
    format?: string;
  }): Promise<{ content: any }> {
    // Return pre-configured responses based on prompt content
    if (options.prompt.includes('CORRECTNESS')) {
      return {
        content: {
          score: 0.88,
          reasoning: 'Code logic is sound with minor issues',
          suggestions: [
            'Add null pointer checks',
            'Validate input parameters',
          ],
          confidence: 0.85,
        },
      };
    }

    if (options.prompt.includes('COMPLETENESS')) {
      return {
        content: {
          score: 0.92,
          reasoning: 'Most requirements covered, few edge cases missing',
          suggestions: [
            'Add error handling for network failures',
            'Include timeout scenarios',
          ],
          confidence: 0.90,
        },
      };
    }

    if (options.prompt.includes('ACTIONABILITY')) {
      return {
        content: {
          score: 0.85,
          reasoning: 'Recommendations are specific and clear',
          suggestions: [
            'Add code examples for complex steps',
            'Include expected outcomes',
          ],
          confidence: 0.88,
        },
      };
    }

    if (options.prompt.includes('BEST PRACTICES')) {
      return {
        content: {
          score: 0.78,
          reasoning: 'Follows most best practices, some improvements needed',
          suggestions: [
            'Use dependency injection pattern',
            'Add comprehensive logging',
            'Implement circuit breaker for external calls',
          ],
          confidence: 0.82,
        },
      };
    }

    // Default response
    return {
      content: {
        score: 0.75,
        reasoning: 'Default evaluation',
        suggestions: ['General improvement needed'],
        confidence: 0.70,
      },
    };
  }
}

// ============================================
// TEST FIXTURES
// ============================================

const SAMPLE_CODE_OUTPUT = `
function processUserData(userData) {
  const userId = userData.id;
  const result = database.query(\`SELECT * FROM users WHERE id = \${userId}\`);
  return result;
}
`;

const SAMPLE_TEST_STRATEGY = {
  unitTests: [
    'Test valid user data processing',
    'Test database connection',
  ],
  integrationTests: [
    'Test end-to-end user flow',
  ],
  coverageTarget: '85%',
};

const SAMPLE_DOCUMENTATION = `
# User Authentication API

This API handles user authentication using JWT tokens.

## Endpoints

### POST /auth/login
Authenticate a user and return a JWT token.
`;

const SAMPLE_PR_DESCRIPTION = `
## Summary
Added user authentication feature with JWT tokens.

## Changes
- Implemented login endpoint
- Added JWT token generation
- Updated user model

## Testing
- Manual testing completed
- Unit tests added
`;

// ============================================
// CORRECTNESS EVALUATOR TESTS
// ============================================

describe('CorrectnessEvaluator', () => {
  let llmClient: MockLLMClient;
  let evaluator: CorrectnessEvaluator;

  beforeEach(() => {
    llmClient = new MockLLMClient();
    evaluator = new CorrectnessEvaluator(llmClient);
  });

  test('should evaluate code correctness', async () => {
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score.value).toBeGreaterThan(0);
    expect(score.value).toBeLessThanOrEqual(1);
    expect(score.reasoning).toBeDefined();
    expect(Array.isArray(score.suggestions)).toBe(true);
    expect(score.confidence).toBeGreaterThan(0);
    expect(score.confidence).toBeLessThanOrEqual(1);
  });

  test('should return score between 0 and 1', async () => {
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(1);
  });

  test('should provide reasoning for score', async () => {
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score.reasoning).toBeTruthy();
    expect(typeof score.reasoning).toBe('string');
    expect(score.reasoning.length).toBeGreaterThan(0);
  });

  test('should provide actionable suggestions', async () => {
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(Array.isArray(score.suggestions)).toBe(true);
    if (score.suggestions.length > 0) {
      score.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    }
  });

  test('should include confidence level', async () => {
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score.confidence).toBeGreaterThan(0);
    expect(score.confidence).toBeLessThanOrEqual(1);
  });

  test('should handle evaluation with context', async () => {
    const context = {
      requirements: ['Input validation', 'Error handling'],
      constraints: ['Must be SQL-injection safe'],
    };

    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT, context);

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThan(0);
  });

  test('should handle malformed LLM response gracefully', async () => {
    const badLLMClient = new MockLLMClient();
    badLLMClient.analyze = async () => ({
      content: 'Invalid response format',
    });

    const evaluator = new CorrectnessEvaluator(badLLMClient);
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    // Should return fallback score
    expect(score.value).toBe(0.7);
    expect(score.confidence).toBe(0.5);
  });
});

// ============================================
// COMPLETENESS EVALUATOR TESTS
// ============================================

describe('CompletenessEvaluator', () => {
  let llmClient: MockLLMClient;
  let evaluator: CompletenessEvaluator;

  beforeEach(() => {
    llmClient = new MockLLMClient();
    evaluator = new CompletenessEvaluator(llmClient);
  });

  test('should evaluate test strategy completeness', async () => {
    const score = await evaluator.evaluate(SAMPLE_TEST_STRATEGY);

    expect(score.value).toBeGreaterThan(0);
    expect(score.value).toBeLessThanOrEqual(1);
    expect(score.reasoning).toBeDefined();
  });

  test('should identify missing requirements', async () => {
    const score = await evaluator.evaluate(SAMPLE_TEST_STRATEGY);

    expect(score.suggestions).toBeDefined();
    expect(Array.isArray(score.suggestions)).toBe(true);
  });

  test('should handle complex nested objects', async () => {
    const complexOutput = {
      features: ['Feature A', 'Feature B'],
      implementation: {
        backend: 'Complete',
        frontend: 'Partial',
      },
      testing: {
        unit: 'Complete',
        integration: 'Missing',
      },
    };

    const score = await evaluator.evaluate(complexOutput);

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThan(0);
  });

  test('should provide specific improvement suggestions', async () => {
    const score = await evaluator.evaluate(SAMPLE_TEST_STRATEGY);

    if (score.suggestions.length > 0) {
      score.suggestions.forEach(suggestion => {
        expect(suggestion).toBeTruthy();
        expect(suggestion.length).toBeGreaterThan(5); // Not just generic words
      });
    }
  });
});

// ============================================
// ACTIONABILITY EVALUATOR TESTS
// ============================================

describe('ActionabilityEvaluator', () => {
  let llmClient: MockLLMClient;
  let evaluator: ActionabilityEvaluator;

  beforeEach(() => {
    llmClient = new MockLLMClient();
    evaluator = new ActionabilityEvaluator(llmClient);
  });

  test('should evaluate documentation actionability', async () => {
    const score = await evaluator.evaluate(SAMPLE_DOCUMENTATION);

    expect(score.value).toBeGreaterThan(0);
    expect(score.value).toBeLessThanOrEqual(1);
  });

  test('should check for specific, actionable guidance', async () => {
    const score = await evaluator.evaluate(SAMPLE_DOCUMENTATION);

    expect(score.reasoning).toBeDefined();
    expect(score.suggestions).toBeDefined();
  });

  test('should evaluate PR description actionability', async () => {
    const score = await evaluator.evaluate(SAMPLE_PR_DESCRIPTION);

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThan(0);
  });

  test('should handle string outputs', async () => {
    const stringOutput = 'Add error handling to the login function';
    const score = await evaluator.evaluate(stringOutput);

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThan(0);
  });
});

// ============================================
// BEST PRACTICES EVALUATOR TESTS
// ============================================

describe('BestPracticesEvaluator', () => {
  let llmClient: MockLLMClient;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  test('should evaluate code against best practices', async () => {
    const evaluator = new BestPracticesEvaluator(llmClient);
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score.value).toBeGreaterThan(0);
    expect(score.value).toBeLessThanOrEqual(1);
  });

  test('should accept domain context', async () => {
    const evaluator = new BestPracticesEvaluator(llmClient, 'backend');
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThan(0);
  });

  test('should identify anti-patterns', async () => {
    const codeWithAntiPattern = `
      function getData() {
        var data = globalVariable; // Anti-pattern: global variable
        eval(userInput); // Anti-pattern: eval
        return data;
      }
    `;

    const evaluator = new BestPracticesEvaluator(llmClient);
    const score = await evaluator.evaluate(codeWithAntiPattern);

    expect(score.suggestions).toBeDefined();
    expect(Array.isArray(score.suggestions)).toBe(true);
  });

  test('should work without domain context', async () => {
    const evaluator = new BestPracticesEvaluator(llmClient);
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThan(0);
  });

  test('should provide domain-specific suggestions when domain provided', async () => {
    const evaluator = new BestPracticesEvaluator(llmClient, 'security');
    const score = await evaluator.evaluate(SAMPLE_CODE_OUTPUT);

    expect(score).toBeDefined();
    // Suggestions should be relevant to security domain
    expect(score.suggestions).toBeDefined();
  });
});

// ============================================
// SCORE BOUNDARY TESTS
// ============================================

describe('Score Boundaries', () => {
  let llmClient: MockLLMClient;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  test('should clamp scores above 1.0 to 1.0', async () => {
    const overflowLLM = new MockLLMClient();
    overflowLLM.analyze = async () => ({
      content: {
        score: 1.5, // Over maximum
        reasoning: 'Test',
        suggestions: [],
        confidence: 0.8,
      },
    });

    const evaluator = new CorrectnessEvaluator(overflowLLM);
    const score = await evaluator.evaluate('test');

    expect(score.value).toBeLessThanOrEqual(1.0);
  });

  test('should clamp scores below 0.0 to 0.0', async () => {
    const underflowLLM = new MockLLMClient();
    underflowLLM.analyze = async () => ({
      content: {
        score: -0.5, // Below minimum
        reasoning: 'Test',
        suggestions: [],
        confidence: 0.8,
      },
    });

    const evaluator = new CorrectnessEvaluator(underflowLLM);
    const score = await evaluator.evaluate('test');

    expect(score.value).toBeGreaterThanOrEqual(0.0);
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Evaluator Integration', () => {
  let llmClient: MockLLMClient;

  beforeEach(() => {
    llmClient = new MockLLMClient();
  });

  test('should run all evaluators on same output', async () => {
    const correctnessEval = new CorrectnessEvaluator(llmClient);
    const completenessEval = new CompletenessEvaluator(llmClient);
    const actionabilityEval = new ActionabilityEvaluator(llmClient);
    const bestPracticesEval = new BestPracticesEvaluator(llmClient);

    const output = SAMPLE_CODE_OUTPUT;

    const scores = await Promise.all([
      correctnessEval.evaluate(output),
      completenessEval.evaluate(output),
      actionabilityEval.evaluate(output),
      bestPracticesEval.evaluate(output),
    ]);

    expect(scores.length).toBe(4);
    scores.forEach(score => {
      expect(score.value).toBeGreaterThan(0);
      expect(score.value).toBeLessThanOrEqual(1);
      expect(score.reasoning).toBeDefined();
      expect(score.confidence).toBeGreaterThan(0);
    });
  });

  test('should handle parallel evaluation', async () => {
    const correctnessEval = new CorrectnessEvaluator(llmClient);
    const completenessEval = new CompletenessEvaluator(llmClient);

    const startTime = Date.now();

    await Promise.all([
      correctnessEval.evaluate(SAMPLE_CODE_OUTPUT),
      completenessEval.evaluate(SAMPLE_CODE_OUTPUT),
    ]);

    const duration = Date.now() - startTime;

    // Parallel execution should be fast
    expect(duration).toBeLessThan(1000);
  });
});

// ============================================
// WEIGHTED SCORING TESTS
// ============================================

describe('Weighted Scoring', () => {
  test('should calculate weighted average correctly', () => {
    const scores: Array<{ value: number; weight: number }> = [
      { value: 0.80, weight: 0.3 },
      { value: 0.90, weight: 0.5 },
      { value: 0.70, weight: 0.2 },
    ];

    const weightedSum = scores.reduce(
      (sum, { value, weight }) => sum + value * weight,
      0
    );
    const totalWeight = scores.reduce((sum, { weight }) => sum + weight, 0);
    const weightedAverage = weightedSum / totalWeight;

    // Expected: (0.80 * 0.3) + (0.90 * 0.5) + (0.70 * 0.2) = 0.83
    expect(weightedAverage).toBeCloseTo(0.83, 2);
  });

  test('should handle edge case of zero weight', () => {
    const scores: Array<{ value: number; weight: number }> = [
      { value: 0.80, weight: 0.0 },
      { value: 0.90, weight: 1.0 },
    ];

    const weightedSum = scores.reduce(
      (sum, { value, weight }) => sum + value * weight,
      0
    );
    const totalWeight = scores.reduce((sum, { weight }) => sum + weight, 0);
    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Expected: 0.90 (only second score counts)
    expect(weightedAverage).toBeCloseTo(0.90, 2);
  });
});

export {};
