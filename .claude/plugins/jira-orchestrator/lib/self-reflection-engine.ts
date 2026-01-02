/**
 * Self-Reflection Engine for Jira Orchestrator v5.0
 *
 * Implements iterative quality improvement through self-reflection loops.
 * Agents use extended thinking to evaluate and improve their own outputs.
 *
 * @version 5.0.0
 * @author architect-supreme
 */

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface ReflectionConfig {
  maxIterations: number;        // Default: 3
  qualityThreshold: number;     // Default: 0.85 (85%)
  criteria: QualityCriteria[];
  thinkingBudget: {
    initial: number;            // Tokens for initial generation
    reflection: number;         // Tokens for reflection
  };
  verbose?: boolean;
}

export interface QualityCriteria {
  name: string;                 // e.g., "correctness", "completeness"
  weight: number;               // 0.0-1.0 (must sum to 1.0)
  evaluator: (output: any, context?: any) => Promise<Score>;
  description: string;          // What this criterion evaluates
}

export interface Score {
  value: number;                // 0.0-1.0
  reasoning: string;
  suggestions: string[];        // Specific improvements
  confidence: number;           // 0.0-1.0
}

export interface Reflection {
  evaluations: CriterionEvaluation[];
  improvements: string[];
  satisfactory: boolean;
  overallScore: number;
  iteration: number;
}

export interface CriterionEvaluation {
  name: string;
  score: Score;
  weight: number;
  weightedValue: number;        // score.value * weight
}

export interface ReflectedResult<T = any> {
  result: T;
  iterations: number;
  finalScore: number;
  reflections: Reflection[];
  metadata: {
    totalThinkingTokens: number;
    timeElapsed: number;
    criteriaUsed: string[];
    thresholdMet: boolean;
  };
}

export interface Task {
  id: string;
  description: string;
  context?: Record<string, any>;
  constraints?: string[];
  acceptanceCriteria?: string[];
}

export interface LLMResponse {
  content: any;
  thinkingTokens?: number;
  totalTokens?: number;
  metadata?: Record<string, any>;
}

// ============================================
// SELF-REFLECTION ENGINE
// ============================================

export class SelfReflectionEngine {
  private config: ReflectionConfig;
  private llmClient: any; // Injected LLM client (Claude API wrapper)

  constructor(
    llmClient: any,
    config?: Partial<ReflectionConfig>
  ) {
    this.llmClient = llmClient;
    this.config = {
      maxIterations: config?.maxIterations || 3,
      qualityThreshold: config?.qualityThreshold || 0.85,
      criteria: config?.criteria || [],
      thinkingBudget: {
        initial: config?.thinkingBudget?.initial || 8000,
        reflection: config?.thinkingBudget?.reflection || 5000,
      },
      verbose: config?.verbose || false,
    };

    this.validateConfig();
  }

  /**
   * Execute a task with self-reflection loops
   */
  async executeWithReflection<T = any>(
    task: Task,
    generator: (task: Task, thinkingBudget: number) => Promise<LLMResponse>
  ): Promise<ReflectedResult<T>> {
    const startTime = Date.now();
    let result: LLMResponse | null = null;
    let iteration = 0;
    const allReflections: Reflection[] = [];
    let totalThinkingTokens = 0;
    let augmentedTask = { ...task };

    this.log(`Starting self-reflection for task: ${task.id}`);

    while (iteration < this.config.maxIterations) {
      this.log(`Iteration ${iteration + 1}/${this.config.maxIterations}`);

      // Phase 1: Generate output with extended thinking
      const thinkingBudget = iteration === 0
        ? this.config.thinkingBudget.initial
        : this.config.thinkingBudget.reflection;

      result = await generator(augmentedTask, thinkingBudget);
      totalThinkingTokens += result.thinkingTokens || 0;

      this.log(`Generated output (${result.thinkingTokens || 0} thinking tokens)`);

      // Phase 2: Self-reflect on quality
      const reflection = await this.reflect(result.content, iteration + 1);
      allReflections.push(reflection);

      this.log(`Reflection complete - Score: ${reflection.overallScore.toFixed(2)}`);

      // Phase 3: Check if quality threshold met
      if (reflection.satisfactory && reflection.overallScore >= this.config.qualityThreshold) {
        this.log(`✓ Quality threshold met (${reflection.overallScore.toFixed(2)} >= ${this.config.qualityThreshold})`);
        break;
      }

      // Phase 4: Augment task with improvement suggestions
      if (iteration < this.config.maxIterations - 1) {
        augmentedTask = this.augmentTask(augmentedTask, reflection.improvements);
        this.log(`Task augmented with ${reflection.improvements.length} improvements`);
      }

      iteration++;
    }

    const timeElapsed = Date.now() - startTime;

    return {
      result: result!.content,
      iterations: iteration + 1,
      finalScore: allReflections[allReflections.length - 1].overallScore,
      reflections: allReflections,
      metadata: {
        totalThinkingTokens,
        timeElapsed,
        criteriaUsed: this.config.criteria.map(c => c.name),
        thresholdMet: allReflections[allReflections.length - 1].satisfactory,
      },
    };
  }

  /**
   * Perform self-reflection on an output
   */
  private async reflect(
    output: any,
    iteration: number,
    context?: any
  ): Promise<Reflection> {
    // Evaluate against all criteria in parallel
    const evaluations = await Promise.all(
      this.config.criteria.map(async (criterion): Promise<CriterionEvaluation> => {
        const score = await criterion.evaluator(output, context);

        return {
          name: criterion.name,
          score,
          weight: criterion.weight,
          weightedValue: score.value * criterion.weight,
        };
      })
    );

    // Calculate overall quality score (weighted average)
    const overallScore = this.calculateQualityScore(evaluations);

    // Use extended thinking for deep reflection
    const improvements = await this.generateImprovements(output, evaluations);

    // Determine if output is satisfactory
    const satisfactory = evaluations.every(e => e.score.value > 0.7);

    return {
      evaluations,
      improvements,
      satisfactory,
      overallScore,
      iteration,
    };
  }

  /**
   * Calculate weighted quality score
   */
  private calculateQualityScore(evaluations: CriterionEvaluation[]): number {
    const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
    const weightedSum = evaluations.reduce((sum, e) => sum + e.weightedValue, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate improvement suggestions using extended thinking
   */
  private async generateImprovements(
    output: any,
    evaluations: CriterionEvaluation[]
  ): Promise<string[]> {
    // Build reflection prompt
    const evaluationSummary = evaluations.map(e => ({
      criterion: e.name,
      score: e.score.value,
      reasoning: e.score.reasoning,
      suggestions: e.score.suggestions,
    }));

    const prompt = `Analyze this output against the quality criteria and provide specific improvements.

Output to evaluate:
${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}

Quality Evaluations:
${JSON.stringify(evaluationSummary, null, 2)}

Task: Identify the top 3-5 specific improvements that would most increase quality.

Think deeply about:
1. Which criteria have the lowest scores?
2. What specific changes would address the suggestions?
3. Are there any edge cases or best practices being overlooked?
4. How can we make the output more actionable and complete?

Return a JSON array of specific, actionable improvement suggestions.`;

    try {
      const response = await this.llmClient.analyze({
        prompt,
        thinking_budget: this.config.thinkingBudget.reflection,
        format: 'json',
      });

      // Parse improvements from response
      const improvements = Array.isArray(response.content)
        ? response.content
        : response.content.improvements || [];

      return improvements.slice(0, 5); // Top 5 improvements
    } catch (error) {
      console.error('Error generating improvements:', error);

      // Fallback: extract suggestions from evaluations
      return evaluations
        .flatMap(e => e.score.suggestions)
        .slice(0, 5);
    }
  }

  /**
   * Augment task with improvement suggestions
   */
  private augmentTask(task: Task, improvements: string[]): Task {
    const improvementContext = improvements.length > 0
      ? `\n\nIMPORTANT: Address these improvements from previous iteration:\n${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}`
      : '';

    return {
      ...task,
      description: task.description + improvementContext,
      context: {
        ...task.context,
        previousImprovements: improvements,
        iterationCount: (task.context?.iterationCount || 0) + 1,
      },
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (this.config.maxIterations < 1) {
      throw new Error('maxIterations must be at least 1');
    }

    if (this.config.qualityThreshold < 0 || this.config.qualityThreshold > 1) {
      throw new Error('qualityThreshold must be between 0 and 1');
    }

    if (this.config.criteria.length === 0) {
      throw new Error('At least one quality criterion is required');
    }

    // Validate that weights sum to 1.0 (with small tolerance for floating point)
    const totalWeight = this.config.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Criteria weights must sum to 1.0 (currently: ${totalWeight})`);
    }
  }

  /**
   * Logging helper
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[SelfReflectionEngine] ${message}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReflectionConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      thinkingBudget: {
        ...this.config.thinkingBudget,
        ...config.thinkingBudget,
      },
    };
    this.validateConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): ReflectionConfig {
    return { ...this.config };
  }
}

// ============================================
// QUALITY CRITERIA EVALUATORS
// ============================================

/**
 * Correctness Evaluator
 * Checks if output is accurate and error-free
 */
export class CorrectnessEvaluator {
  constructor(private llmClient: any) {}

  async evaluate(output: any, context?: any): Promise<Score> {
    const prompt = `Evaluate the CORRECTNESS of this output.

Output:
${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}

${context ? `Context:\n${JSON.stringify(context, null, 2)}\n` : ''}

Criteria:
- Are there any factual errors or inaccuracies?
- Are technical details correct?
- Does the logic make sense?
- Are there any contradictions?

Return a JSON object with:
{
  "score": <0.0-1.0>,
  "reasoning": "<why this score>",
  "suggestions": ["<specific improvement 1>", "<specific improvement 2>"],
  "confidence": <0.0-1.0>
}`;

    const response = await this.llmClient.analyze({
      prompt,
      thinking_budget: 3000,
      format: 'json',
    });

    return this.parseScore(response.content);
  }

  private parseScore(content: any): Score {
    if (typeof content === 'object' && content.score !== undefined) {
      return {
        value: Math.max(0, Math.min(1, content.score)),
        reasoning: content.reasoning || 'No reasoning provided',
        suggestions: Array.isArray(content.suggestions) ? content.suggestions : [],
        confidence: content.confidence || 0.8,
      };
    }

    // Fallback
    return {
      value: 0.7,
      reasoning: 'Unable to parse evaluation',
      suggestions: [],
      confidence: 0.5,
    };
  }
}

/**
 * Completeness Evaluator
 * Checks if output addresses all requirements
 */
export class CompletenessEvaluator {
  constructor(private llmClient: any) {}

  async evaluate(output: any, context?: any): Promise<Score> {
    const prompt = `Evaluate the COMPLETENESS of this output.

Output:
${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}

${context ? `Context:\n${JSON.stringify(context, null, 2)}\n` : ''}

Criteria:
- Are all requirements addressed?
- Are there any missing sections or details?
- Is the scope fully covered?
- Are edge cases considered?

Return a JSON object with:
{
  "score": <0.0-1.0>,
  "reasoning": "<why this score>",
  "suggestions": ["<specific improvement 1>", "<specific improvement 2>"],
  "confidence": <0.0-1.0>
}`;

    const response = await this.llmClient.analyze({
      prompt,
      thinking_budget: 3000,
      format: 'json',
    });

    return this.parseScore(response.content);
  }

  private parseScore(content: any): Score {
    if (typeof content === 'object' && content.score !== undefined) {
      return {
        value: Math.max(0, Math.min(1, content.score)),
        reasoning: content.reasoning || 'No reasoning provided',
        suggestions: Array.isArray(content.suggestions) ? content.suggestions : [],
        confidence: content.confidence || 0.8,
      };
    }

    return {
      value: 0.7,
      reasoning: 'Unable to parse evaluation',
      suggestions: [],
      confidence: 0.5,
    };
  }
}

/**
 * Actionability Evaluator
 * Checks if output provides clear, actionable guidance
 */
export class ActionabilityEvaluator {
  constructor(private llmClient: any) {}

  async evaluate(output: any, context?: any): Promise<Score> {
    const prompt = `Evaluate the ACTIONABILITY of this output.

Output:
${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}

${context ? `Context:\n${JSON.stringify(context, null, 2)}\n` : ''}

Criteria:
- Are recommendations specific and actionable?
- Are steps clear and well-defined?
- Can someone act on this immediately?
- Are there concrete examples?

Return a JSON object with:
{
  "score": <0.0-1.0>,
  "reasoning": "<why this score>",
  "suggestions": ["<specific improvement 1>", "<specific improvement 2>"],
  "confidence": <0.0-1.0>
}`;

    const response = await this.llmClient.analyze({
      prompt,
      thinking_budget: 3000,
      format: 'json',
    });

    return this.parseScore(response.content);
  }

  private parseScore(content: any): Score {
    if (typeof content === 'object' && content.score !== undefined) {
      return {
        value: Math.max(0, Math.min(1, content.score)),
        reasoning: content.reasoning || 'No reasoning provided',
        suggestions: Array.isArray(content.suggestions) ? content.suggestions : [],
        confidence: content.confidence || 0.8,
      };
    }

    return {
      value: 0.7,
      reasoning: 'Unable to parse evaluation',
      suggestions: [],
      confidence: 0.5,
    };
  }
}

/**
 * Best Practices Evaluator
 * Checks if output follows industry best practices
 */
export class BestPracticesEvaluator {
  constructor(private llmClient: any, private domain?: string) {}

  async evaluate(output: any, context?: any): Promise<Score> {
    const domainContext = this.domain
      ? `Domain: ${this.domain}\n`
      : '';

    const prompt = `Evaluate adherence to BEST PRACTICES in this output.

${domainContext}
Output:
${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}

${context ? `Context:\n${JSON.stringify(context, null, 2)}\n` : ''}

Criteria:
- Does it follow industry best practices?
- Are there any anti-patterns?
- Is it maintainable and scalable?
- Does it follow relevant standards?

Return a JSON object with:
{
  "score": <0.0-1.0>,
  "reasoning": "<why this score>",
  "suggestions": ["<specific improvement 1>", "<specific improvement 2>"],
  "confidence": <0.0-1.0>
}`;

    const response = await this.llmClient.analyze({
      prompt,
      thinking_budget: 3000,
      format: 'json',
    });

    return this.parseScore(response.content);
  }

  private parseScore(content: any): Score {
    if (typeof content === 'object' && content.score !== undefined) {
      return {
        value: Math.max(0, Math.min(1, content.score)),
        reasoning: content.reasoning || 'No reasoning provided',
        suggestions: Array.isArray(content.suggestions) ? content.suggestions : [],
        confidence: content.confidence || 0.8,
      };
    }

    return {
      value: 0.7,
      reasoning: 'Unable to parse evaluation',
      suggestions: [],
      confidence: 0.5,
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create standard quality criteria set
 */
export function createStandardCriteria(llmClient: any, domain?: string): QualityCriteria[] {
  const correctnessEvaluator = new CorrectnessEvaluator(llmClient);
  const completenessEvaluator = new CompletenessEvaluator(llmClient);
  const actionabilityEvaluator = new ActionabilityEvaluator(llmClient);
  const bestPracticesEvaluator = new BestPracticesEvaluator(llmClient, domain);

  return [
    {
      name: 'correctness',
      weight: 0.35,
      evaluator: (output, context) => correctnessEvaluator.evaluate(output, context),
      description: 'Accuracy and error-freedom of the output',
    },
    {
      name: 'completeness',
      weight: 0.30,
      evaluator: (output, context) => completenessEvaluator.evaluate(output, context),
      description: 'All requirements and edge cases addressed',
    },
    {
      name: 'actionability',
      weight: 0.20,
      evaluator: (output, context) => actionabilityEvaluator.evaluate(output, context),
      description: 'Clear, specific, and actionable guidance',
    },
    {
      name: 'best_practices',
      weight: 0.15,
      evaluator: (output, context) => bestPracticesEvaluator.evaluate(output, context),
      description: 'Adherence to industry best practices',
    },
  ];
}

/**
 * Create a pre-configured reflection engine with standard criteria
 */
export function createReflectionEngine(
  llmClient: any,
  options?: {
    domain?: string;
    maxIterations?: number;
    qualityThreshold?: number;
    verbose?: boolean;
  }
): SelfReflectionEngine {
  const criteria = createStandardCriteria(llmClient, options?.domain);

  return new SelfReflectionEngine(llmClient, {
    criteria,
    maxIterations: options?.maxIterations || 3,
    qualityThreshold: options?.qualityThreshold || 0.85,
    verbose: options?.verbose || false,
  });
}

// ============================================
// EXPORTS
// ============================================

export default SelfReflectionEngine;
