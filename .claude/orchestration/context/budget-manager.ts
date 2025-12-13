/**
 * Budget Manager - Token budget allocation and tracking
 *
 * Features:
 * - Set overall token budget (100K default)
 * - Allocate budgets per section
 * - Warning thresholds (75%, 90%)
 * - Automatic trimming strategies
 * - Priority-based eviction
 */

import { TokenCounter, createTokenCounter } from './token-counter';
import {
  BudgetConfig,
  BudgetAllocation,
  BudgetWarningLevel,
  ConversationContext,
} from './types';

/**
 * Default budget configuration (100K tokens)
 */
export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  total: 100000,
  system: 5000,           // 5% for system instructions
  conversation: 50000,    // 50% for conversation history
  toolResults: 30000,     // 30% for tool results
  reserve: 15000,         // 15% reserve for emergencies
  warningThreshold: 75,   // Warn at 75%
  criticalThreshold: 90,  // Critical at 90%
};

/**
 * Budget Manager class
 */
export class BudgetManager {
  private tokenCounter: TokenCounter;
  private config: BudgetConfig;
  private currentUsage = {
    system: 0,
    conversation: 0,
    toolResults: 0,
    reserve: 0,
  };

  constructor(config?: Partial<BudgetConfig>, tokenCounter?: TokenCounter) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
    this.tokenCounter = tokenCounter || createTokenCounter();
    this.validateConfig();
  }

  /**
   * Get current budget allocation state
   */
  getCurrentAllocation(): BudgetAllocation {
    const systemAvailable = this.config.system - this.currentUsage.system;
    const conversationAvailable = this.config.conversation - this.currentUsage.conversation;
    const toolResultsAvailable = this.config.toolResults - this.currentUsage.toolResults;
    const reserveAvailable = this.config.reserve - this.currentUsage.reserve;

    const totalUsed =
      this.currentUsage.system +
      this.currentUsage.conversation +
      this.currentUsage.toolResults +
      this.currentUsage.reserve;

    const totalAvailable = this.config.total - totalUsed;
    const usedPercent = (totalUsed / this.config.total) * 100;
    const warningLevel = this.determineWarningLevel(usedPercent);

    // Suggest reallocation if needed
    const suggestedReallocation =
      warningLevel === 'critical' || warningLevel === 'exceeded'
        ? this.suggestReallocation()
        : undefined;

    return {
      config: this.config,
      usage: {
        system: {
          allocated: this.config.system,
          used: this.currentUsage.system,
          available: systemAvailable,
        },
        conversation: {
          allocated: this.config.conversation,
          used: this.currentUsage.conversation,
          available: conversationAvailable,
        },
        toolResults: {
          allocated: this.config.toolResults,
          used: this.currentUsage.toolResults,
          available: toolResultsAvailable,
        },
        reserve: {
          allocated: this.config.reserve,
          used: this.currentUsage.reserve,
          available: reserveAvailable,
        },
      },
      totalAvailable,
      warningLevel,
      suggestedReallocation,
    };
  }

  /**
   * Update usage for a section
   */
  updateUsage(section: 'system' | 'conversation' | 'toolResults' | 'reserve', tokens: number): void {
    this.currentUsage[section] = tokens;
  }

  /**
   * Allocate tokens from a section
   */
  allocate(
    section: 'system' | 'conversation' | 'toolResults' | 'reserve',
    tokens: number
  ): boolean {
    const available = this.config[section] - this.currentUsage[section];

    if (tokens > available) {
      // Try to use reserve if available
      if (section !== 'reserve') {
        const reserveAvailable = this.config.reserve - this.currentUsage.reserve;
        if (tokens - available <= reserveAvailable) {
          this.currentUsage[section] = this.config[section];
          this.currentUsage.reserve += tokens - available;
          return true;
        }
      }
      return false; // Cannot allocate
    }

    this.currentUsage[section] += tokens;
    return true;
  }

  /**
   * Free tokens from a section
   */
  free(section: 'system' | 'conversation' | 'toolResults' | 'reserve', tokens: number): void {
    this.currentUsage[section] = Math.max(0, this.currentUsage[section] - tokens);
  }

  /**
   * Check if allocation would exceed budget
   */
  canAllocate(section: 'system' | 'conversation' | 'toolResults' | 'reserve', tokens: number): boolean {
    const available = this.config[section] - this.currentUsage[section];
    return tokens <= available;
  }

  /**
   * Get total tokens used
   */
  getTotalUsed(): number {
    return (
      this.currentUsage.system +
      this.currentUsage.conversation +
      this.currentUsage.toolResults +
      this.currentUsage.reserve
    );
  }

  /**
   * Get total tokens available
   */
  getTotalAvailable(): number {
    return this.config.total - this.getTotalUsed();
  }

  /**
   * Get usage percentage
   */
  getUsagePercent(): number {
    return (this.getTotalUsed() / this.config.total) * 100;
  }

  /**
   * Get warning level
   */
  getWarningLevel(): BudgetWarningLevel {
    const usedPercent = this.getUsagePercent();
    return this.determineWarningLevel(usedPercent);
  }

  /**
   * Update budget configuration
   */
  updateConfig(newConfig: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Reset usage tracking
   */
  reset(): void {
    this.currentUsage = {
      system: 0,
      conversation: 0,
      toolResults: 0,
      reserve: 0,
    };
  }

  /**
   * Analyze context and update usage
   */
  analyzeContext(context: ConversationContext): void {
    this.reset();

    for (const section of context.sections) {
      let tokens = section.tokens;

      switch (section.type) {
        case 'system':
          this.updateUsage('system', tokens);
          break;
        case 'conversation':
          this.updateUsage('conversation', tokens);
          break;
        case 'tools':
          this.updateUsage('toolResults', tokens);
          break;
        default:
          // Count 'other' towards conversation
          this.currentUsage.conversation += tokens;
      }
    }
  }

  /**
   * Suggest budget reallocation based on usage patterns
   */
  private suggestReallocation(): Partial<BudgetConfig> {
    const allocation = this.getCurrentAllocation();
    const totalUsed = this.getTotalUsed();

    // Calculate usage ratios
    const systemRatio = this.currentUsage.system / totalUsed;
    const conversationRatio = this.currentUsage.conversation / totalUsed;
    const toolResultsRatio = this.currentUsage.toolResults / totalUsed;

    // Reallocate based on actual usage, maintaining reserve
    const allocableTotal = this.config.total - this.config.reserve;

    return {
      system: Math.floor(allocableTotal * systemRatio * 1.1), // 10% buffer
      conversation: Math.floor(allocableTotal * conversationRatio * 1.1),
      toolResults: Math.floor(allocableTotal * toolResultsRatio * 1.1),
    };
  }

  /**
   * Determine warning level from usage percentage
   */
  private determineWarningLevel(usedPercent: number): BudgetWarningLevel {
    if (usedPercent >= 100) return 'exceeded';
    if (usedPercent >= this.config.criticalThreshold) return 'critical';
    if (usedPercent >= this.config.warningThreshold) return 'warning';
    return 'safe';
  }

  /**
   * Validate budget configuration
   */
  private validateConfig(): void {
    const totalAllocated =
      this.config.system +
      this.config.conversation +
      this.config.toolResults +
      this.config.reserve;

    if (totalAllocated > this.config.total) {
      throw new Error(
        `Budget allocation (${totalAllocated}) exceeds total budget (${this.config.total})`
      );
    }

    if (this.config.warningThreshold >= this.config.criticalThreshold) {
      throw new Error('Warning threshold must be less than critical threshold');
    }
  }

  /**
   * Get budget visualization (for display)
   */
  visualize(): string {
    const allocation = this.getCurrentAllocation();
    const usedPercent = this.getUsagePercent();

    const lines = [
      `Context Budget: ${this.config.total.toLocaleString()} tokens`,
      `├── System Instructions: ${allocation.usage.system.used.toLocaleString()}/${allocation.usage.system.allocated.toLocaleString()} (${((allocation.usage.system.used / this.config.total) * 100).toFixed(1)}%)`,
      `├── Conversation History: ${allocation.usage.conversation.used.toLocaleString()}/${allocation.usage.conversation.allocated.toLocaleString()} (${((allocation.usage.conversation.used / this.config.total) * 100).toFixed(1)}%)`,
      `├── Tool Results: ${allocation.usage.toolResults.used.toLocaleString()}/${allocation.usage.toolResults.allocated.toLocaleString()} (${((allocation.usage.toolResults.used / this.config.total) * 100).toFixed(1)}%)`,
      `├── Reserve: ${allocation.usage.reserve.used.toLocaleString()}/${allocation.usage.reserve.allocated.toLocaleString()} (${((allocation.usage.reserve.used / this.config.total) * 100).toFixed(1)}%)`,
      `└── Available: ${allocation.totalAvailable.toLocaleString()} tokens`,
      ``,
      `Status: ${allocation.warningLevel.toUpperCase()} (${usedPercent.toFixed(1)}% used)`,
    ];

    return lines.join('\n');
  }
}

/**
 * Create a new budget manager instance
 */
export function createBudgetManager(
  config?: Partial<BudgetConfig>,
  tokenCounter?: TokenCounter
): BudgetManager {
  return new BudgetManager(config, tokenCounter);
}

/**
 * Export default instance with default configuration
 */
export default createBudgetManager();
