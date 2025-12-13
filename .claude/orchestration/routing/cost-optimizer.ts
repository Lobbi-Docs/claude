/**
 * Cost Optimizer - Track and optimize AI model costs
 * Budget tracking, cost analysis, and optimization suggestions
 */

import {
  ModelName,
  ModelProfile,
  BudgetConfig,
  BudgetStatus,
  CostSuggestion,
  CostReport,
  TaskType,
} from './types';

interface CostRecord {
  timestamp: Date;
  model: ModelName;
  taskType: TaskType;
  cost: number;
  tokensInput: number;
  tokensOutput: number;
}

export class CostOptimizer {
  private config: BudgetConfig;
  private costRecords: CostRecord[] = [];
  private modelProfiles: Map<ModelName, ModelProfile>;

  constructor(config: BudgetConfig, modelProfiles: Map<ModelName, ModelProfile>) {
    this.config = config;
    this.modelProfiles = modelProfiles;
  }

  /**
   * Track usage for a model
   */
  trackUsage(
    model: ModelName,
    taskType: TaskType,
    tokens: { input: number; output: number },
    cost: number
  ): void {
    const record: CostRecord = {
      timestamp: new Date(),
      model,
      taskType,
      cost,
      tokensInput: tokens.input,
      tokensOutput: tokens.output,
    };

    this.costRecords.push(record);

    console.log(`[CostOptimizer] Tracked: ${model} - $${cost.toFixed(4)} (${tokens.input + tokens.output} tokens)`);

    // Check budget after tracking
    const status = this.checkBudget();
    if (status.warning) {
      console.warn(`[CostOptimizer] WARNING: ${status.dailyUsagePercent.toFixed(1)}% of daily budget used`);
    }
    if (status.exceeded) {
      console.error(`[CostOptimizer] BUDGET EXCEEDED: ${status.dailyUsagePercent.toFixed(1)}% of daily budget`);
    }
  }

  /**
   * Set or update budget limits
   */
  setBudget(daily: number, monthly: number): void {
    this.config.dailyLimit = daily;
    this.config.monthlyLimit = monthly;

    console.log(`[CostOptimizer] Budget updated: $${daily}/day, $${monthly}/month`);
  }

  /**
   * Check current budget status
   */
  checkBudget(): BudgetStatus {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate daily spending
    const dailyRecords = this.costRecords.filter(r => r.timestamp >= startOfDay);
    const dailySpent = dailyRecords.reduce((sum, r) => sum + r.cost, 0);
    const dailyRemaining = Math.max(0, this.config.dailyLimit - dailySpent);
    const dailyUsagePercent = (dailySpent / this.config.dailyLimit) * 100;

    // Calculate monthly spending
    const monthlyRecords = this.costRecords.filter(r => r.timestamp >= startOfMonth);
    const monthlySpent = monthlyRecords.reduce((sum, r) => sum + r.cost, 0);
    const monthlyRemaining = Math.max(0, this.config.monthlyLimit - monthlySpent);
    const monthlyUsagePercent = (monthlySpent / this.config.monthlyLimit) * 100;

    // Determine warning/exceeded status
    const warning =
      dailyUsagePercent >= this.config.alerts.dailyWarning ||
      monthlyUsagePercent >= this.config.alerts.monthlyWarning;

    const exceeded =
      dailySpent > this.config.dailyLimit ||
      monthlySpent > this.config.monthlyLimit;

    // Calculate next reset times
    const nextDay = new Date(startOfDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const nextMonth = new Date(startOfMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return {
      dailySpent,
      dailyLimit: this.config.dailyLimit,
      dailyRemaining,
      dailyUsagePercent,
      monthlySpent,
      monthlyLimit: this.config.monthlyLimit,
      monthlyRemaining,
      monthlyUsagePercent,
      exceeded,
      warning,
      resets: {
        daily: nextDay,
        monthly: nextMonth,
      },
    };
  }

  /**
   * Suggest cost optimizations
   */
  suggestDowngrades(): CostSuggestion[] {
    const suggestions: CostSuggestion[] = [];

    // Analyze usage patterns by task type
    const taskTypeUsage = this.analyzeTaskTypeUsage();

    for (const [taskType, usage] of Object.entries(taskTypeUsage)) {
      const currentModel = usage.mostUsedModel;
      const currentProfile = this.modelProfiles.get(currentModel);

      if (!currentProfile) continue;

      // Find cheaper alternatives
      const alternatives = this.findCheaperAlternatives(currentProfile, taskType as TaskType);

      for (const alt of alternatives) {
        const savingsPerRequest = usage.avgCost - alt.estimatedCost;
        const estimatedMonthlySavings = savingsPerRequest * usage.requestCount * 30;

        // Only suggest if savings are meaningful and quality trade-off is acceptable
        if (savingsPerRequest > 0.001 && alt.qualityDelta > -20) {
          suggestions.push({
            currentModel,
            suggestedModel: alt.model.name,
            savingsPerRequest,
            estimatedMonthlySavings,
            qualityDelta: alt.qualityDelta,
            latencyDelta: alt.latencyDelta,
            reason: `For ${taskType} tasks, ${alt.model.name} could save $${savingsPerRequest.toFixed(4)} per request with minimal quality impact`,
            confidence: alt.confidence,
          });
        }
      }
    }

    // Sort by estimated monthly savings
    suggestions.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  /**
   * Generate cost report for a period
   */
  generateReport(period: { start: Date; end: Date }): CostReport {
    const records = this.costRecords.filter(
      r => r.timestamp >= period.start && r.timestamp <= period.end
    );

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

    // Breakdown by model
    const byModel: CostReport['byModel'] = {} as any;
    for (const record of records) {
      if (!byModel[record.model]) {
        byModel[record.model] = {
          cost: 0,
          requests: 0,
          avgCostPerRequest: 0,
          tokens: { input: 0, output: 0 },
        };
      }

      byModel[record.model].cost += record.cost;
      byModel[record.model].requests += 1;
      byModel[record.model].tokens.input += record.tokensInput;
      byModel[record.model].tokens.output += record.tokensOutput;
    }

    // Calculate averages
    for (const model in byModel) {
      const data = byModel[model as ModelName];
      data.avgCostPerRequest = data.cost / data.requests;
    }

    // Breakdown by task type
    const byTaskType: CostReport['byTaskType'] = {} as any;
    for (const record of records) {
      if (!byTaskType[record.taskType]) {
        byTaskType[record.taskType] = {
          cost: 0,
          requests: 0,
          preferredModel: record.model,
        };
      }

      byTaskType[record.taskType].cost += record.cost;
      byTaskType[record.taskType].requests += 1;
    }

    // Find preferred model per task type (most used)
    for (const taskType in byTaskType) {
      const taskRecords = records.filter(r => r.taskType === taskType);
      const modelCounts: Record<string, number> = {};

      for (const r of taskRecords) {
        modelCounts[r.model] = (modelCounts[r.model] || 0) + 1;
      }

      const preferred = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
      byTaskType[taskType as TaskType].preferredModel = preferred[0] as ModelName;
    }

    // Daily costs
    const dailyCosts = this.aggregateDailyCosts(records);

    // Calculate trends
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalCost / Math.max(1, days);
    const weeklyAverage = dailyAverage * 7;
    const projectedMonthly = dailyAverage * 30;

    // Get optimization suggestions
    const suggestions = this.suggestDowngrades();

    return {
      period,
      totalCost,
      byModel,
      byTaskType,
      dailyCosts,
      trends: {
        dailyAverage,
        weeklyAverage,
        projectedMonthly,
      },
      suggestions,
    };
  }

  /**
   * Analyze usage by task type
   */
  private analyzeTaskTypeUsage(): Record<string, {
    mostUsedModel: ModelName;
    requestCount: number;
    avgCost: number;
  }> {
    const usage: Record<string, any> = {};

    for (const record of this.costRecords) {
      if (!usage[record.taskType]) {
        usage[record.taskType] = {
          models: {} as Record<ModelName, number>,
          totalCost: 0,
          requestCount: 0,
        };
      }

      usage[record.taskType].models[record.model] = (usage[record.taskType].models[record.model] || 0) + 1;
      usage[record.taskType].totalCost += record.cost;
      usage[record.taskType].requestCount += 1;
    }

    // Find most used model per task type
    const result: Record<string, any> = {};

    for (const [taskType, data] of Object.entries(usage)) {
      const mostUsed = Object.entries(data.models).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

      result[taskType] = {
        mostUsedModel: mostUsed[0] as ModelName,
        requestCount: data.requestCount,
        avgCost: data.totalCost / data.requestCount,
      };
    }

    return result;
  }

  /**
   * Find cheaper alternatives to a model
   */
  private findCheaperAlternatives(
    current: ModelProfile,
    taskType: TaskType
  ): Array<{
    model: ModelProfile;
    estimatedCost: number;
    qualityDelta: number;
    latencyDelta: number;
    confidence: number;
  }> {
    const alternatives: Array<any> = [];

    for (const model of this.modelProfiles.values()) {
      if (model.name === current.name) continue;

      // Calculate average cost (rough estimate)
      const avgTokens = 1000; // Assume 1k input + 1k output
      const currentCost = (avgTokens / 1000) * (current.costPer1kInputTokens + current.costPer1kOutputTokens);
      const altCost = (avgTokens / 1000) * (model.costPer1kInputTokens + model.costPer1kOutputTokens);

      if (altCost < currentCost) {
        const qualityDelta = model.qualityScore - current.qualityScore;
        const latencyDelta = model.latencyMs - current.latencyMs;

        // Confidence based on capability match
        const confidence = model.strengths.includes(taskType) ? 80 : 50;

        alternatives.push({
          model,
          estimatedCost: altCost,
          qualityDelta,
          latencyDelta,
          confidence,
        });
      }
    }

    return alternatives;
  }

  /**
   * Aggregate costs by day
   */
  private aggregateDailyCosts(records: CostRecord[]): Array<{
    date: string;
    cost: number;
    requests: number;
  }> {
    const dailyMap: Record<string, { cost: number; requests: number }> = {};

    for (const record of records) {
      const dateKey = record.timestamp.toISOString().split('T')[0];

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { cost: 0, requests: 0 };
      }

      dailyMap[dateKey].cost += record.cost;
      dailyMap[dateKey].requests += 1;
    }

    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      cost: data.cost,
      requests: data.requests,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Export cost records for external analysis
   */
  exportRecords(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'model', 'taskType', 'cost', 'tokensInput', 'tokensOutput'];
      const rows = this.costRecords.map(r => [
        r.timestamp.toISOString(),
        r.model,
        r.taskType,
        r.cost.toFixed(6),
        r.tokensInput,
        r.tokensOutput,
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return JSON.stringify(this.costRecords, null, 2);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalSpent: number;
    totalRequests: number;
    avgCostPerRequest: number;
    totalTokens: number;
    mostExpensiveModel: ModelName;
    cheapestModel: ModelName;
  } {
    const totalSpent = this.costRecords.reduce((sum, r) => sum + r.cost, 0);
    const totalRequests = this.costRecords.length;
    const avgCostPerRequest = totalSpent / Math.max(1, totalRequests);
    const totalTokens = this.costRecords.reduce((sum, r) => sum + r.tokensInput + r.tokensOutput, 0);

    // Find most/least expensive models
    const modelCosts: Record<string, number> = {};
    for (const record of this.costRecords) {
      modelCosts[record.model] = (modelCosts[record.model] || 0) + record.cost;
    }

    const sorted = Object.entries(modelCosts).sort((a, b) => b[1] - a[1]);
    const mostExpensiveModel = (sorted[0]?.[0] || 'opus') as ModelName;
    const cheapestModel = (sorted[sorted.length - 1]?.[0] || 'haiku') as ModelName;

    return {
      totalSpent,
      totalRequests,
      avgCostPerRequest,
      totalTokens,
      mostExpensiveModel,
      cheapestModel,
    };
  }

  /**
   * Clear old records (for cleanup)
   */
  clearOldRecords(daysToKeep: number = 90): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const originalCount = this.costRecords.length;
    this.costRecords = this.costRecords.filter(r => r.timestamp >= cutoff);
    const removed = originalCount - this.costRecords.length;

    if (removed > 0) {
      console.log(`[CostOptimizer] Cleared ${removed} old records (keeping ${daysToKeep} days)`);
    }

    return removed;
  }
}
