/**
 * Context Analyzer - Analyzes context usage and identifies optimization opportunities
 *
 * Features:
 * - Track token usage by section (system, conversation, tools)
 * - Identify high-token-cost patterns
 * - Calculate information density scores
 * - Detect redundancy in context
 * - Generate optimization recommendations
 */

import { TokenCounter, createTokenCounter } from './token-counter';
import {
  ConversationContext,
  ContextSection,
  UsageReport,
  BudgetWarningLevel,
  DensityScore,
  ContentPattern,
  ContentPatternType,
  OptimizationRecommendation,
  CompressionAlgorithm,
} from './types';

/**
 * Context Analyzer class
 */
export class ContextAnalyzer {
  private tokenCounter: TokenCounter;

  constructor(tokenCounter?: TokenCounter) {
    this.tokenCounter = tokenCounter || createTokenCounter();
  }

  /**
   * Analyze full conversation context and generate usage report
   */
  analyzeUsage(context: ConversationContext, budgetLimit = 100000): UsageReport {
    const totalTokens = context.totalTokens;
    const budgetUsedPercent = (totalTokens / budgetLimit) * 100;
    const warningLevel = this.determineWarningLevel(budgetUsedPercent);

    // Calculate breakdown by section
    const breakdown = this.calculateBreakdown(context);

    // Detect high-cost patterns
    const highCostPatterns = this.detectPatterns(context);

    // Calculate overall density
    const overallDensity = this.calculateOverallDensity(context);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      context,
      highCostPatterns,
      budgetUsedPercent
    );

    return {
      totalTokens,
      budgetLimit,
      budgetUsedPercent,
      warningLevel,
      breakdown,
      highCostPatterns,
      recommendations,
      overallDensity,
    };
  }

  /**
   * Calculate information density for content
   */
  calculateDensity(content: string): DensityScore {
    const tokens = this.tokenCounter.count(content).total;

    // Calculate uniqueness (simple approximation)
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words);
    const redundancy = 1 - uniqueWords.size / words.length;

    // Estimate compressibility based on repetition
    const compressibility = this.estimateCompressibility(content);

    // Calculate information density
    // Higher unique word ratio = higher density
    const tokensPerUnit = tokens / uniqueWords.size;
    const score = Math.max(0, Math.min(1, 1 - redundancy));

    return {
      score,
      tokensPerUnit,
      redundancy,
      compressibility,
    };
  }

  /**
   * Identify high-token-cost patterns in context
   */
  detectPatterns(context: ConversationContext): ContentPattern[] {
    const patterns: ContentPattern[] = [];

    // Pattern 1: Repetitive code blocks
    const repetitiveCode = this.detectRepetitiveCode(context);
    if (repetitiveCode) patterns.push(repetitiveCode);

    // Pattern 2: Large JSON responses
    const largeJson = this.detectLargeJson(context);
    if (largeJson) patterns.push(largeJson);

    // Pattern 3: Duplicate file content
    const duplicateFiles = this.detectDuplicateFiles(context);
    if (duplicateFiles) patterns.push(duplicateFiles);

    // Pattern 4: Verbose tool outputs
    const verboseTools = this.detectVerboseTools(context);
    if (verboseTools) patterns.push(verboseTools);

    // Pattern 5: Outdated conversation turns
    const outdatedContext = this.detectOutdatedContext(context);
    if (outdatedContext) patterns.push(outdatedContext);

    // Sort by potential savings
    return patterns.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Detect repetitive code patterns
   */
  private detectRepetitiveCode(context: ConversationContext): ContentPattern | null {
    const codeBlocks: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;

    // Extract all code blocks
    for (const turn of context.turns) {
      const matches = turn.content.match(codeBlockRegex);
      if (matches) {
        codeBlocks.push(...matches);
      }
    }

    if (codeBlocks.length < 2) return null;

    // Find duplicates
    const seen = new Map<string, number>();
    let duplicateCount = 0;
    let totalTokens = 0;

    for (const block of codeBlocks) {
      const count = seen.get(block) || 0;
      seen.set(block, count + 1);

      if (count > 0) {
        duplicateCount++;
        totalTokens += this.tokenCounter.count(block).total;
      }
    }

    if (duplicateCount === 0) return null;

    const avgTokens = Math.floor(totalTokens / duplicateCount);
    const potentialSavings = Math.floor(totalTokens * 0.8); // 80% savings via references

    return {
      type: 'repetitive_code',
      occurrences: duplicateCount,
      tokenCostAvg: avgTokens,
      totalTokenCost: totalTokens,
      example: codeBlocks[0].substring(0, 200) + '...',
      recommendedOptimization: 'reference',
      potentialSavings,
      confidence: 0.9,
    };
  }

  /**
   * Detect large JSON responses
   */
  private detectLargeJson(context: ConversationContext): ContentPattern | null {
    let largeJsonCount = 0;
    let totalTokens = 0;
    let exampleJson = '';

    // Check tool results
    for (const toolResult of context.toolResults) {
      if (typeof toolResult.result === 'object') {
        const jsonStr = JSON.stringify(toolResult.result);
        const tokens = this.tokenCounter.count(jsonStr, 'json').total;

        if (tokens > 500) {
          largeJsonCount++;
          totalTokens += tokens;
          if (!exampleJson) exampleJson = jsonStr.substring(0, 200) + '...';
        }
      }
    }

    if (largeJsonCount === 0) return null;

    const avgTokens = Math.floor(totalTokens / largeJsonCount);
    const potentialSavings = Math.floor(totalTokens * 0.5); // 50% savings via compression

    return {
      type: 'large_json',
      occurrences: largeJsonCount,
      tokenCostAvg: avgTokens,
      totalTokenCost: totalTokens,
      example: exampleJson,
      recommendedOptimization: 'minification',
      potentialSavings,
      confidence: 0.85,
    };
  }

  /**
   * Detect duplicate file content
   */
  private detectDuplicateFiles(context: ConversationContext): ContentPattern | null {
    if (context.files.length < 2) return null;

    const filesByHash = new Map<string, number>();
    let duplicateCount = 0;
    let totalTokens = 0;

    for (const file of context.files) {
      const count = filesByHash.get(file.hash) || 0;
      filesByHash.set(file.hash, count + 1);

      if (count > 0) {
        duplicateCount++;
        totalTokens += file.tokens;
      }
    }

    if (duplicateCount === 0) return null;

    const avgTokens = Math.floor(totalTokens / duplicateCount);
    const potentialSavings = Math.floor(totalTokens * 0.95); // 95% savings via deduplication

    return {
      type: 'duplicate_files',
      occurrences: duplicateCount,
      tokenCostAvg: avgTokens,
      totalTokenCost: totalTokens,
      example: context.files[0].path,
      recommendedOptimization: 'deduplication',
      potentialSavings,
      confidence: 1.0,
    };
  }

  /**
   * Detect verbose tool outputs
   */
  private detectVerboseTools(context: ConversationContext): ContentPattern | null {
    let verboseCount = 0;
    let totalTokens = 0;
    let exampleTool = '';

    for (const toolResult of context.toolResults) {
      if (toolResult.tokens > 1000) {
        verboseCount++;
        totalTokens += toolResult.tokens;
        if (!exampleTool) exampleTool = toolResult.tool;
      }
    }

    if (verboseCount === 0) return null;

    const avgTokens = Math.floor(totalTokens / verboseCount);
    const potentialSavings = Math.floor(totalTokens * 0.4); // 40% savings via summarization

    return {
      type: 'verbose_logs',
      occurrences: verboseCount,
      tokenCostAvg: avgTokens,
      totalTokenCost: totalTokens,
      example: `Tool: ${exampleTool}`,
      recommendedOptimization: 'summarization',
      potentialSavings,
      confidence: 0.75,
    };
  }

  /**
   * Detect outdated conversation context
   */
  private detectOutdatedContext(context: ConversationContext): ContentPattern | null {
    if (context.turns.length < 10) return null;

    // Consider turns older than the most recent 5 as potentially outdated
    const recentTurns = 5;
    const oldTurns = context.turns.slice(0, -recentTurns);

    let totalTokens = 0;
    for (const turn of oldTurns) {
      totalTokens += turn.tokens;
    }

    if (totalTokens < 1000) return null;

    const avgTokens = Math.floor(totalTokens / oldTurns.length);
    const potentialSavings = Math.floor(totalTokens * 0.6); // 60% savings via summarization

    return {
      type: 'outdated_context',
      occurrences: oldTurns.length,
      tokenCostAvg: avgTokens,
      totalTokenCost: totalTokens,
      example: `${oldTurns.length} older conversation turns`,
      recommendedOptimization: 'summarization',
      potentialSavings,
      confidence: 0.7,
    };
  }

  /**
   * Calculate token breakdown by section
   */
  private calculateBreakdown(context: ConversationContext) {
    let systemTokens = 0;
    let conversationTokens = 0;
    let toolsTokens = 0;
    let filesTokens = 0;
    let otherTokens = 0;

    for (const section of context.sections) {
      switch (section.type) {
        case 'system':
          systemTokens += section.tokens;
          break;
        case 'conversation':
          conversationTokens += section.tokens;
          break;
        case 'tools':
          toolsTokens += section.tokens;
          break;
        case 'files':
          filesTokens += section.tokens;
          break;
        default:
          otherTokens += section.tokens;
      }
    }

    const total = context.totalTokens || 1; // Avoid division by zero

    return {
      system: {
        tokens: systemTokens,
        percentage: (systemTokens / total) * 100,
      },
      conversation: {
        tokens: conversationTokens,
        percentage: (conversationTokens / total) * 100,
      },
      tools: {
        tokens: toolsTokens,
        percentage: (toolsTokens / total) * 100,
      },
      files: {
        tokens: filesTokens,
        percentage: (filesTokens / total) * 100,
      },
      other: {
        tokens: otherTokens,
        percentage: (otherTokens / total) * 100,
      },
    };
  }

  /**
   * Calculate overall information density
   */
  private calculateOverallDensity(context: ConversationContext): DensityScore {
    const allContent = context.turns.map((t) => t.content).join('\n');
    return this.calculateDensity(allContent);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    context: ConversationContext,
    patterns: ContentPattern[],
    budgetUsedPercent: number
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Recommendation based on budget usage
    if (budgetUsedPercent >= 75) {
      recommendations.push({
        priority: 1,
        title: 'Context budget nearing limit',
        description: `You are using ${budgetUsedPercent.toFixed(
          1
        )}% of your token budget. Consider optimizing or checkpointing.`,
        target: 'overall',
        estimatedSavings: Math.floor(context.totalTokens * 0.3),
        strategy: 'summarization',
        risk: 'low',
      });
    }

    // Recommendations based on detected patterns
    for (const pattern of patterns.slice(0, 3)) {
      // Top 3 patterns
      let title = '';
      let description = '';
      let risk: 'low' | 'medium' | 'high' = 'low';

      switch (pattern.type) {
        case 'repetitive_code':
          title = 'Repetitive code blocks detected';
          description = `Found ${pattern.occurrences} duplicate code blocks. Use references to save tokens.`;
          risk = 'low';
          break;
        case 'large_json':
          title = 'Large JSON responses detected';
          description = `Found ${pattern.occurrences} large JSON objects. Compress or minify to save space.`;
          risk = 'low';
          break;
        case 'duplicate_files':
          title = 'Duplicate files in context';
          description = `Found ${pattern.occurrences} duplicate files. Deduplicate to save tokens.`;
          risk = 'low';
          break;
        case 'verbose_logs':
          title = 'Verbose tool outputs';
          description = `Found ${pattern.occurrences} verbose tool outputs. Summarize to reduce tokens.`;
          risk = 'medium';
          break;
        case 'outdated_context':
          title = 'Outdated conversation context';
          description = `Found ${pattern.occurrences} older conversation turns. Summarize to save tokens.`;
          risk = 'medium';
          break;
      }

      recommendations.push({
        priority: recommendations.length + 2,
        title,
        description,
        target: pattern.type,
        estimatedSavings: pattern.potentialSavings,
        strategy: pattern.recommendedOptimization,
        risk,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Determine budget warning level
   */
  private determineWarningLevel(usedPercent: number): BudgetWarningLevel {
    if (usedPercent >= 100) return 'exceeded';
    if (usedPercent >= 90) return 'critical';
    if (usedPercent >= 75) return 'warning';
    return 'safe';
  }

  /**
   * Estimate compressibility of content
   */
  private estimateCompressibility(content: string): number {
    // Simple heuristic: Calculate character-level entropy
    const freq = new Map<string, number>();
    for (const char of content) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / content.length;
      entropy -= p * Math.log2(p);
    }

    // Normalize entropy to 0-1 (higher = more compressible)
    // Max entropy for ASCII is ~6.6 bits
    const maxEntropy = 6.6;
    return Math.max(0, Math.min(1, 1 - entropy / maxEntropy));
  }

  /**
   * Analyze a specific section
   */
  analyzeSection(section: ContextSection): DensityScore {
    return this.calculateDensity(section.content);
  }
}

/**
 * Create a new context analyzer instance
 */
export function createContextAnalyzer(tokenCounter?: TokenCounter): ContextAnalyzer {
  return new ContextAnalyzer(tokenCounter);
}

/**
 * Export default instance
 */
export default createContextAnalyzer();
