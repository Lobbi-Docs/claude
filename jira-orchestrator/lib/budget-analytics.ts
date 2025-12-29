/**
 * Budget Analytics - Advanced tracking and analysis of token budget efficiency
 *
 * This module provides comprehensive analytics for token budget management,
 * including real-time tracking, efficiency reports, and cost optimization insights.
 *
 * @module budget-analytics
 */

import * as fs from 'fs';
import * as path from 'path';
import { BudgetUsageRecord, BudgetEfficiencyReport } from './token-budget-predictor';

// ============================================================================
// Type Definitions
// ============================================================================

export interface BudgetAlert {
  /** Alert type */
  type: 'over_allocation' | 'under_allocation' | 'cost_spike' | 'efficiency_drop';

  /** Severity level */
  severity: 'info' | 'warning' | 'critical';

  /** Task ID that triggered alert */
  taskId: string;

  /** Alert message */
  message: string;

  /** Suggested action */
  action: string;

  /** Timestamp */
  timestamp: Date;

  /** Additional data */
  data?: Record<string, any>;
}

export interface BudgetTrend {
  /** Time period */
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';

  /** Data points */
  dataPoints: Array<{
    timestamp: Date;
    avgBudget: number;
    avgUtilization: number;
    efficiency: number;
    taskCount: number;
  }>;

  /** Trend direction */
  direction: 'improving' | 'stable' | 'declining';

  /** Trend strength (0-1) */
  strength: number;
}

export interface BudgetOptimizationSuggestion {
  /** Task type affected */
  taskType: string;

  /** Current avg budget */
  currentAvgBudget: number;

  /** Suggested avg budget */
  suggestedAvgBudget: number;

  /** Expected savings */
  expectedSavings: {
    tokens: number;
    cost: number; // USD
    percentage: number;
  };

  /** Confidence in suggestion */
  confidence: number;

  /** Reasoning */
  reasoning: string;

  /** Implementation complexity */
  complexity: 'low' | 'medium' | 'high';
}

export interface CostProjection {
  /** Projection period */
  period: {
    start: Date;
    end: Date;
  };

  /** Projected cost */
  projectedCost: number;

  /** Confidence interval */
  confidenceInterval: {
    lower: number;
    upper: number;
  };

  /** Cost breakdown */
  breakdown: {
    byModel: Record<string, number>;
    byTaskType: Record<string, number>;
    byAgent: Record<string, number>;
  };

  /** Cost trend */
  trend: 'increasing' | 'stable' | 'decreasing';

  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// Budget Analytics Implementation
// ============================================================================

export class BudgetAnalytics {
  private history: BudgetUsageRecord[] = [];
  private alerts: BudgetAlert[] = [];
  private historyPath: string;
  private alertPath: string;

  // Thresholds
  private readonly OVER_ALLOCATION_THRESHOLD = 0.5; // < 50% utilization
  private readonly UNDER_ALLOCATION_THRESHOLD = 0.95; // > 95% utilization
  private readonly COST_SPIKE_THRESHOLD = 2.0; // 2x average cost
  private readonly EFFICIENCY_DROP_THRESHOLD = 0.6; // < 60% efficiency

  constructor(historyPath?: string, alertPath?: string) {
    this.historyPath = historyPath || path.join(
      __dirname,
      '../sessions/intelligence/budget-history.json'
    );
    this.alertPath = alertPath || path.join(
      __dirname,
      '../sessions/intelligence/budget-alerts.json'
    );
    this.loadData();
  }

  /**
   * Track a budget allocation in real-time
   */
  async trackAllocation(record: BudgetUsageRecord): Promise<void> {
    this.history.push(record);

    // Check for alerts
    await this.checkAlerts(record);

    // Save data
    await this.saveData();
  }

  /**
   * Check for budget-related alerts
   */
  private async checkAlerts(record: BudgetUsageRecord): Promise<void> {
    const utilization = record.budgetUsed / record.budgetAllocated;

    // Over-allocation alert
    if (utilization < this.OVER_ALLOCATION_THRESHOLD) {
      await this.createAlert({
        type: 'over_allocation',
        severity: utilization < 0.3 ? 'warning' : 'info',
        taskId: record.taskId,
        message: `Task ${record.taskId} only used ${(utilization * 100).toFixed(1)}% of allocated budget`,
        action: 'Consider reducing budget allocation for similar tasks',
        timestamp: new Date(),
        data: {
          budgetAllocated: record.budgetAllocated,
          budgetUsed: record.budgetUsed,
          utilization,
        },
      });
    }

    // Under-allocation alert
    if (utilization > this.UNDER_ALLOCATION_THRESHOLD) {
      await this.createAlert({
        type: 'under_allocation',
        severity: utilization > 0.98 ? 'warning' : 'info',
        taskId: record.taskId,
        message: `Task ${record.taskId} used ${(utilization * 100).toFixed(1)}% of allocated budget`,
        action: 'Consider increasing budget allocation for similar tasks',
        timestamp: new Date(),
        data: {
          budgetAllocated: record.budgetAllocated,
          budgetUsed: record.budgetUsed,
          utilization,
        },
      });
    }

    // Cost spike alert
    const recentTasks = this.getRecentTasks(24); // Last 24 hours
    if (recentTasks.length > 5) {
      const avgCost = this.calculateAverageCost(recentTasks);
      const taskCost = this.estimateCost(record.budgetUsed);

      if (taskCost > avgCost * this.COST_SPIKE_THRESHOLD) {
        await this.createAlert({
          type: 'cost_spike',
          severity: 'warning',
          taskId: record.taskId,
          message: `Task ${record.taskId} cost is ${(taskCost / avgCost).toFixed(1)}x higher than average`,
          action: 'Review task characteristics and budget allocation strategy',
          timestamp: new Date(),
          data: {
            taskCost,
            avgCost,
            ratio: taskCost / avgCost,
          },
        });
      }
    }

    // Efficiency drop alert
    const recentEfficiency = this.calculateRecentEfficiency(10);
    if (recentEfficiency < this.EFFICIENCY_DROP_THRESHOLD) {
      await this.createAlert({
        type: 'efficiency_drop',
        severity: 'warning',
        taskId: record.taskId,
        message: `Budget efficiency has dropped to ${(recentEfficiency * 100).toFixed(1)}%`,
        action: 'Review and adjust budget prediction heuristics',
        timestamp: new Date(),
        data: {
          efficiency: recentEfficiency,
        },
      });
    }
  }

  /**
   * Create an alert
   */
  private async createAlert(alert: BudgetAlert): Promise<void> {
    this.alerts.push(alert);

    // Log alert
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };

    console.log(
      `${severityEmoji[alert.severity]} [BudgetAlert] ${alert.type}: ${alert.message}`
    );

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    await this.saveAlerts();
  }

  /**
   * Get budget trends over time
   */
  getBudgetTrends(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): BudgetTrend {
    const dataPoints = this.aggregateByPeriod(period);

    // Calculate trend direction
    if (dataPoints.length < 3) {
      return {
        period,
        dataPoints,
        direction: 'stable',
        strength: 0,
      };
    }

    // Simple linear regression for trend
    const efficiencies = dataPoints.map(d => d.efficiency);
    const trend = this.calculateTrend(efficiencies);

    return {
      period,
      dataPoints,
      direction: trend.direction,
      strength: Math.abs(trend.slope),
    };
  }

  /**
   * Aggregate data by time period
   */
  private aggregateByPeriod(
    period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Array<{
    timestamp: Date;
    avgBudget: number;
    avgUtilization: number;
    efficiency: number;
    taskCount: number;
  }> {
    const periodMs = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    }[period];

    const groups = new Map<number, BudgetUsageRecord[]>();

    for (const record of this.history) {
      const timestamp = new Date(record.timestamp).getTime();
      const bucket = Math.floor(timestamp / periodMs) * periodMs;

      if (!groups.has(bucket)) {
        groups.set(bucket, []);
      }
      groups.get(bucket)!.push(record);
    }

    const dataPoints = [];

    for (const [bucket, records] of groups.entries()) {
      const avgBudget = records.reduce((sum, r) => sum + r.budgetAllocated, 0) / records.length;
      const avgUtilization = records.reduce(
        (sum, r) => sum + r.budgetUsed / r.budgetAllocated,
        0
      ) / records.length;

      const efficiency = this.calculateEfficiency(records);

      dataPoints.push({
        timestamp: new Date(bucket),
        avgBudget,
        avgUtilization,
        efficiency,
        taskCount: records.length,
      });
    }

    return dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate efficiency for a set of records
   */
  private calculateEfficiency(records: BudgetUsageRecord[]): number {
    const utilizations = records.map(r => r.budgetUsed / r.budgetAllocated);

    const efficiencies = utilizations.map(u => {
      if (u >= 0.75 && u <= 0.85) return 1.0;
      if (u >= 0.6 && u < 0.75) return 0.8;
      if (u > 0.85 && u <= 0.95) return 0.8;
      if (u >= 0.5 && u < 0.6) return 0.6;
      if (u > 0.95) return 0.5;
      return 0.3;
    });

    return efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(): BudgetOptimizationSuggestion[] {
    const suggestions: BudgetOptimizationSuggestion[] = [];

    // Group by task type
    const taskTypes = [...new Set(this.history.map(r => r.characteristics.taskType))];

    for (const taskType of taskTypes) {
      const typeTasks = this.history.filter(r => r.characteristics.taskType === taskType);

      if (typeTasks.length < 5) continue; // Need sufficient data

      const avgAllocated = typeTasks.reduce((sum, r) => sum + r.budgetAllocated, 0) / typeTasks.length;
      const avgUsed = typeTasks.reduce((sum, r) => sum + r.budgetUsed, 0) / typeTasks.length;
      const avgUtilization = avgUsed / avgAllocated;

      // Over-allocation opportunity
      if (avgUtilization < 0.65) {
        const suggestedBudget = avgUsed * 1.15; // 15% buffer
        const savings = avgAllocated - suggestedBudget;

        suggestions.push({
          taskType,
          currentAvgBudget: avgAllocated,
          suggestedAvgBudget: suggestedBudget,
          expectedSavings: {
            tokens: savings,
            cost: this.estimateCost(savings),
            percentage: (savings / avgAllocated) * 100,
          },
          confidence: typeTasks.length / 20, // More data = higher confidence
          reasoning: `${taskType} tasks average ${(avgUtilization * 100).toFixed(1)}% utilization. ` +
                    `Reducing allocation by ${((1 - suggestedBudget / avgAllocated) * 100).toFixed(1)}% ` +
                    `while maintaining 15% buffer.`,
          complexity: 'low',
        });
      }
    }

    return suggestions.sort((a, b) => b.expectedSavings.cost - a.expectedSavings.cost);
  }

  /**
   * Project future costs
   */
  projectCosts(daysAhead: number): CostProjection {
    const recentTasks = this.getRecentTasks(30 * 24); // Last 30 days

    if (recentTasks.length === 0) {
      return {
        period: {
          start: new Date(),
          end: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
        },
        projectedCost: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        breakdown: { byModel: {}, byTaskType: {}, byAgent: {} },
        trend: 'stable',
        recommendations: ['Insufficient data for projection'],
      };
    }

    // Calculate daily average
    const dailyAvg = this.calculateDailyAverageCost(recentTasks);
    const projectedCost = dailyAvg * daysAhead;

    // Calculate confidence interval (±20% based on variance)
    const dailyCosts = this.getDailyCosts(recentTasks);
    const variance = this.calculateVariance(dailyCosts);
    const stdDev = Math.sqrt(variance);
    const margin = stdDev * 1.96; // 95% confidence interval

    // Calculate breakdown
    const breakdown = this.calculateCostBreakdown(recentTasks, daysAhead);

    // Determine trend
    const trend = this.calculateCostTrend(recentTasks);

    // Generate recommendations
    const recommendations = this.generateCostRecommendations(projectedCost, trend);

    return {
      period: {
        start: new Date(),
        end: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
      },
      projectedCost,
      confidenceInterval: {
        lower: Math.max(0, projectedCost - margin * daysAhead),
        upper: projectedCost + margin * daysAhead,
      },
      breakdown,
      trend,
      recommendations,
    };
  }

  /**
   * Get recent tasks
   */
  private getRecentTasks(hours: number): BudgetUsageRecord[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.history.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  }

  /**
   * Calculate average cost
   */
  private calculateAverageCost(records: BudgetUsageRecord[]): number {
    const totalCost = records.reduce((sum, r) => sum + this.estimateCost(r.budgetUsed), 0);
    return totalCost / records.length;
  }

  /**
   * Calculate recent efficiency
   */
  private calculateRecentEfficiency(count: number): number {
    const recent = this.history.slice(-count);
    return this.calculateEfficiency(recent);
  }

  /**
   * Estimate cost in USD
   */
  private estimateCost(tokens: number): number {
    // Assuming $0.015 per 1k tokens for extended thinking
    return (tokens / 1000) * 0.015;
  }

  /**
   * Calculate trend
   */
  private calculateTrend(values: number[]): { direction: 'improving' | 'stable' | 'declining'; slope: number } {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return {
      direction: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'stable',
      slope,
    };
  }

  /**
   * Calculate daily average cost
   */
  private calculateDailyAverageCost(records: BudgetUsageRecord[]): number {
    const totalCost = records.reduce((sum, r) => sum + this.estimateCost(r.budgetUsed), 0);
    const days = Math.max(1, (Date.now() - new Date(records[0].timestamp).getTime()) / (24 * 60 * 60 * 1000));
    return totalCost / days;
  }

  /**
   * Get daily costs
   */
  private getDailyCosts(records: BudgetUsageRecord[]): number[] {
    const days = new Map<string, number>();

    for (const record of records) {
      const day = new Date(record.timestamp).toISOString().split('T')[0];
      const cost = this.estimateCost(record.budgetUsed);
      days.set(day, (days.get(day) || 0) + cost);
    }

    return Array.from(days.values());
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Calculate cost breakdown
   */
  private calculateCostBreakdown(
    records: BudgetUsageRecord[],
    daysAhead: number
  ): { byModel: Record<string, number>; byTaskType: Record<string, number>; byAgent: Record<string, number> } {
    const byModel: Record<string, number> = {};
    const byTaskType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    const totalDays = (Date.now() - new Date(records[0].timestamp).getTime()) / (24 * 60 * 60 * 1000);
    const scaleFactor = daysAhead / totalDays;

    for (const record of records) {
      const cost = this.estimateCost(record.budgetUsed) * scaleFactor;

      if (record.model) {
        byModel[record.model] = (byModel[record.model] || 0) + cost;
      }

      byTaskType[record.characteristics.taskType] = (byTaskType[record.characteristics.taskType] || 0) + cost;

      if (record.agent) {
        byAgent[record.agent] = (byAgent[record.agent] || 0) + cost;
      }
    }

    return { byModel, byTaskType, byAgent };
  }

  /**
   * Calculate cost trend
   */
  private calculateCostTrend(records: BudgetUsageRecord[]): 'increasing' | 'stable' | 'decreasing' {
    const dailyCosts = this.getDailyCosts(records);
    const trend = this.calculateTrend(dailyCosts);

    return trend.direction === 'improving' ? 'decreasing' :
           trend.direction === 'declining' ? 'increasing' : 'stable';
  }

  /**
   * Generate cost recommendations
   */
  private generateCostRecommendations(projectedCost: number, trend: 'increasing' | 'stable' | 'decreasing'): string[] {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push('Costs are trending upward. Review budget allocation strategy.');
      recommendations.push('Consider implementing more aggressive budget optimization.');
    } else if (trend === 'decreasing') {
      recommendations.push('Costs are trending downward. Current optimization strategy is effective.');
    }

    if (projectedCost > 100) {
      recommendations.push('High projected cost. Consider implementing cost caps per task type.');
    }

    const suggestions = this.generateOptimizationSuggestions();
    if (suggestions.length > 0) {
      const topSaving = suggestions[0];
      recommendations.push(
        `Potential ${topSaving.expectedSavings.percentage.toFixed(1)}% savings ` +
        `by optimizing ${topSaving.taskType} tasks.`
      );
    }

    return recommendations;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10): BudgetAlert[] {
    return this.alerts.slice(-count).reverse();
  }

  /**
   * Load data from disk
   */
  private loadData(): void {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf-8');
        this.history = JSON.parse(data);
      }
      if (fs.existsSync(this.alertPath)) {
        const data = fs.readFileSync(this.alertPath, 'utf-8');
        this.alerts = JSON.parse(data);
      }
    } catch (error) {
      console.error('[BudgetAnalytics] Error loading data:', error);
    }
  }

  /**
   * Save data to disk
   */
  private async saveData(): Promise<void> {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('[BudgetAnalytics] Error saving history:', error);
    }
  }

  /**
   * Save alerts to disk
   */
  private async saveAlerts(): Promise<void> {
    try {
      const dir = path.dirname(this.alertPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.alertPath, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('[BudgetAnalytics] Error saving alerts:', error);
    }
  }
}
