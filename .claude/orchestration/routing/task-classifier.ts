/**
 * Task Classifier - Analyze and classify tasks for optimal model routing
 * Detects complexity, type, patterns, and token requirements
 */

import {
  TaskComplexity,
  TaskType,
  TaskPattern,
  TaskDescriptor,
  TokenEstimate,
} from './types';

export class TaskClassifier {
  // Keywords for task type detection
  private readonly typeKeywords: Record<TaskType, string[]> = {
    architecture: ['design', 'architecture', 'system design', 'scalability', 'microservices', 'patterns', 'structure'],
    planning: ['plan', 'strategy', 'roadmap', 'organize', 'coordinate', 'schedule', 'outline'],
    'code-generation': ['implement', 'create', 'build', 'generate', 'write code', 'develop', 'code'],
    'code-review': ['review', 'audit', 'analyze code', 'check', 'inspect', 'evaluate code'],
    debugging: ['debug', 'fix', 'error', 'bug', 'issue', 'troubleshoot', 'diagnose'],
    refactoring: ['refactor', 'improve', 'optimize', 'clean up', 'restructure', 'simplify'],
    testing: ['test', 'unit test', 'e2e', 'integration test', 'validate', 'verify'],
    documentation: ['document', 'write docs', 'readme', 'explain', 'describe', 'comment'],
    analysis: ['analyze', 'investigate', 'research', 'examine', 'study', 'assess'],
    creative: ['creative', 'brainstorm', 'ideate', 'innovate', 'design ui', 'mockup'],
    factual: ['what is', 'how does', 'explain', 'define', 'lookup', 'find'],
    coordination: ['coordinate', 'orchestrate', 'delegate', 'manage', 'organize agents'],
    'simple-task': ['simple', 'quick', 'easy', 'basic', 'trivial'],
  };

  // Complexity indicators
  private readonly complexityIndicators = {
    high: ['complex', 'sophisticated', 'advanced', 'comprehensive', 'enterprise', 'critical', 'production'],
    medium: ['moderate', 'standard', 'typical', 'normal', 'regular'],
    low: ['simple', 'basic', 'quick', 'straightforward', 'easy', 'trivial'],
  };

  /**
   * Classify a task and return full descriptor
   */
  classify(task: string, context?: string): TaskDescriptor {
    const type = this.classifyType(task);
    const complexity = this.classifyComplexity(task);
    const pattern = this.detectTaskPattern(task);
    const tokens = this.estimateTokens(task, context || '');
    const requiresExtendedThinking = this.detectExtendedThinking(task, complexity);
    const involvesCode = this.detectCodeInvolvement(task);
    const requiresCreativity = type === 'creative' || task.toLowerCase().includes('creative');
    const priority = this.determinePriority(complexity, type);

    return {
      task,
      type,
      complexity,
      pattern,
      estimatedInputTokens: tokens.input,
      estimatedOutputTokens: tokens.output,
      requiresExtendedThinking,
      involvesCode,
      requiresCreativity,
      priority,
      context,
    };
  }

  /**
   * Classify task complexity
   */
  classifyComplexity(task: string): TaskComplexity {
    const lower = task.toLowerCase();

    // Critical indicators
    if (lower.match(/critical|production|enterprise|mission-critical|high-stakes/)) {
      return 'critical';
    }

    // Complex indicators
    const complexCount = this.complexityIndicators.high.filter(word => lower.includes(word)).length;
    const simpleCount = this.complexityIndicators.low.filter(word => lower.includes(word)).length;

    if (complexCount > simpleCount) {
      return 'complex';
    }

    if (simpleCount > complexCount) {
      return 'simple';
    }

    // Length-based heuristic
    if (task.length > 500) {
      return 'complex';
    }

    if (task.length < 100) {
      return 'simple';
    }

    // Multi-step detection
    const steps = task.split(/\n|and then|then|next|after that|finally/).length;
    if (steps > 5) {
      return 'complex';
    }

    if (steps > 2) {
      return 'medium';
    }

    return 'simple';
  }

  /**
   * Identify task type
   */
  classifyType(task: string): TaskType {
    const lower = task.toLowerCase();
    const scores: Record<TaskType, number> = {} as any;

    // Score each type based on keyword matches
    for (const [type, keywords] of Object.entries(this.typeKeywords)) {
      scores[type as TaskType] = keywords.filter(keyword => lower.includes(keyword)).length;
    }

    // Find highest score
    const entries = Object.entries(scores) as [TaskType, number][];
    entries.sort((a, b) => b[1] - a[1]);

    if (entries[0][1] > 0) {
      return entries[0][0];
    }

    // Default heuristics
    if (lower.match(/code|implement|function|class|component/)) {
      return 'code-generation';
    }

    if (lower.match(/\?|what|how|why|explain/)) {
      return 'factual';
    }

    return 'simple-task';
  }

  /**
   * Estimate token requirements
   */
  estimateTokens(task: string, context: string): TokenEstimate {
    // Rough estimation: ~4 characters per token
    const taskTokens = Math.ceil(task.length / 4);
    const contextTokens = Math.ceil(context.length / 4);

    // Base input tokens
    let inputTokens = taskTokens + contextTokens;

    // Add overhead for system prompts, formatting
    inputTokens += 500;

    // Estimate output based on task type
    let outputTokens = 0;

    if (task.toLowerCase().includes('comprehensive') || task.toLowerCase().includes('detailed')) {
      outputTokens = 2000;
    } else if (task.toLowerCase().includes('brief') || task.toLowerCase().includes('summary')) {
      outputTokens = 500;
    } else if (task.toLowerCase().includes('code')) {
      outputTokens = 1500; // Code tends to be lengthy
    } else {
      outputTokens = 1000; // Default
    }

    // Adjust based on complexity indicators
    if (task.length > 500) {
      outputTokens *= 1.5;
    }

    // Confidence based on task clarity
    const confidence = this.estimateConfidence(task);

    return {
      input: Math.ceil(inputTokens),
      output: Math.ceil(outputTokens),
      total: Math.ceil(inputTokens + outputTokens),
      confidence,
    };
  }

  /**
   * Detect task pattern
   */
  detectTaskPattern(task: string): TaskPattern {
    const lower = task.toLowerCase();

    // Iterative patterns
    if (lower.match(/iterate|refine|improve|optimize|until|loop|repeatedly/)) {
      return 'iterative';
    }

    // Multi-step patterns
    const steps = task.split(/\n|and then|then|next|after that|finally|step \d+/);
    if (steps.length > 3) {
      return 'multi-step';
    }

    // Chain of thought patterns
    if (lower.match(/think|reason|analyze|consider|evaluate|compare/)) {
      return 'chain-of-thought';
    }

    // Default to single-shot
    return 'single-shot';
  }

  /**
   * Detect if extended thinking is needed
   */
  private detectExtendedThinking(task: string, complexity: TaskComplexity): boolean {
    const lower = task.toLowerCase();

    // Always for critical tasks
    if (complexity === 'critical') {
      return true;
    }

    // Complex tasks that benefit from thinking
    if (complexity === 'complex') {
      return true;
    }

    // Specific indicators
    const thinkingKeywords = [
      'complex',
      'carefully',
      'thoroughly',
      'analyze',
      'design',
      'architecture',
      'optimize',
      'evaluate',
      'compare',
      'research',
    ];

    return thinkingKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Detect if task involves code
   */
  private detectCodeInvolvement(task: string): boolean {
    const lower = task.toLowerCase();

    const codeKeywords = [
      'code',
      'implement',
      'function',
      'class',
      'component',
      'api',
      'endpoint',
      'database',
      'query',
      'script',
      'algorithm',
      'refactor',
      'debug',
      'test',
      'typescript',
      'javascript',
      'python',
      'react',
    ];

    return codeKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Determine task priority
   */
  private determinePriority(complexity: TaskComplexity, type: TaskType): number {
    // Base priority on complexity
    const complexityPriority: Record<TaskComplexity, number> = {
      critical: 5,
      complex: 4,
      medium: 3,
      simple: 2,
    };

    // Adjust for task type
    const typePriority: Partial<Record<TaskType, number>> = {
      architecture: 5,
      planning: 4,
      debugging: 4,
      'code-generation': 3,
      'simple-task': 1,
    };

    const base = complexityPriority[complexity];
    const typeBoost = typePriority[type] || 3;

    return Math.min(5, Math.max(1, Math.round((base + typeBoost) / 2)));
  }

  /**
   * Estimate confidence in token estimation
   */
  private estimateConfidence(task: string): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for clear, structured tasks
    if (task.includes('step') || task.match(/\d+\./)) {
      confidence += 0.1;
    }

    // Lower confidence for vague tasks
    if (task.toLowerCase().match(/help|assist|support|general/)) {
      confidence -= 0.2;
    }

    // Higher confidence for specific tasks
    if (task.length > 100 && task.length < 300) {
      confidence += 0.1;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Batch classify multiple tasks
   */
  batchClassify(tasks: string[], context?: string): TaskDescriptor[] {
    return tasks.map(task => this.classify(task, context));
  }

  /**
   * Get classification explanation
   */
  explain(descriptor: TaskDescriptor): string {
    const lines = [
      `Task Classification Report`,
      `${'='.repeat(50)}`,
      `Type: ${descriptor.type}`,
      `Complexity: ${descriptor.complexity}`,
      `Pattern: ${descriptor.pattern}`,
      `Priority: ${descriptor.priority}/5`,
      ``,
      `Characteristics:`,
      `- Requires Extended Thinking: ${descriptor.requiresExtendedThinking ? 'Yes' : 'No'}`,
      `- Involves Code: ${descriptor.involvesCode ? 'Yes' : 'No'}`,
      `- Requires Creativity: ${descriptor.requiresCreativity ? 'Yes' : 'No'}`,
      ``,
      `Token Estimates:`,
      `- Input: ~${descriptor.estimatedInputTokens.toLocaleString()} tokens`,
      `- Output: ~${descriptor.estimatedOutputTokens.toLocaleString()} tokens`,
      `- Total: ~${(descriptor.estimatedInputTokens + descriptor.estimatedOutputTokens).toLocaleString()} tokens`,
    ];

    if (descriptor.constraints) {
      lines.push('', 'Constraints:');
      if (descriptor.constraints.maxCost) {
        lines.push(`- Max Cost: $${descriptor.constraints.maxCost.toFixed(4)}`);
      }
      if (descriptor.constraints.maxLatency) {
        lines.push(`- Max Latency: ${descriptor.constraints.maxLatency}ms`);
      }
      if (descriptor.constraints.minQuality) {
        lines.push(`- Min Quality: ${descriptor.constraints.minQuality}/100`);
      }
    }

    return lines.join('\n');
  }
}
