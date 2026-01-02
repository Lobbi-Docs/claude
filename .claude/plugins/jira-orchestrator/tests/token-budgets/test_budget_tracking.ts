/**
 * Tests for Budget Tracking and Analytics
 *
 * Validates budget tracking, alerts, trends, optimization suggestions, and cost projections.
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { BudgetAnalytics, BudgetAlert } from '../../lib/budget-analytics';
import { BudgetUsageRecord } from '../../lib/token-budget-predictor';

describe('BudgetAnalytics', () => {
  let analytics: BudgetAnalytics;
  const testHistoryPath = path.join(__dirname, '../../../sessions/intelligence/test-budget-history-analytics.json');
  const testAlertPath = path.join(__dirname, '../../../sessions/intelligence/test-budget-alerts.json');

  beforeEach(() => {
    // Clear test files
    if (fs.existsSync(testHistoryPath)) {
      fs.unlinkSync(testHistoryPath);
    }
    if (fs.existsSync(testAlertPath)) {
      fs.unlinkSync(testAlertPath);
    }
    analytics = new BudgetAnalytics(testHistoryPath, testAlertPath);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testHistoryPath)) {
      fs.unlinkSync(testHistoryPath);
    }
    if (fs.existsSync(testAlertPath)) {
      fs.unlinkSync(testAlertPath);
    }
  });

  describe('Alert System', () => {
    it('should create over-allocation alert', async () => {
      const record: BudgetUsageRecord = {
        taskId: 'test-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 10000,
        budgetUsed: 3000, // 30% utilization
        thinkingTokensUsed: 2500,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      };

      await analytics.trackAllocation(record);

      const alerts = analytics.getRecentAlerts(1);
      expect(alerts).to.have.lengthOf(1);
      expect(alerts[0].type).to.equal('over_allocation');
      expect(alerts[0].severity).to.be.oneOf(['info', 'warning']);
    });

    it('should create under-allocation alert', async () => {
      const record: BudgetUsageRecord = {
        taskId: 'test-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 5000,
        budgetUsed: 4800, // 96% utilization
        thinkingTokensUsed: 4500,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      };

      await analytics.trackAllocation(record);

      const alerts = analytics.getRecentAlerts(1);
      expect(alerts).to.have.lengthOf(1);
      expect(alerts[0].type).to.equal('under_allocation');
    });

    it('should create cost spike alert', async () => {
      // Add baseline tasks
      for (let i = 0; i < 10; i++) {
        await analytics.trackAllocation({
          taskId: `baseline-${i}`,
          characteristics: {
            complexity: 50,
            domain: ['backend'],
            novelty: 0.5,
            uncertainty: 0.4,
            criticality: 0.5,
            taskType: 'code-generation',
          },
          budgetAllocated: 5000,
          budgetUsed: 4000,
          thinkingTokensUsed: 3500,
          outcome: {
            success: true,
            quality: 85,
            completedInTime: true,
            requiredReflection: false,
          },
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000), // Spread over last 10 hours
        });
      }

      // Add spike task
      await analytics.trackAllocation({
        taskId: 'spike-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 20000,
        budgetUsed: 18000, // Much higher than baseline
        thinkingTokensUsed: 17000,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      });

      const alerts = analytics.getRecentAlerts(5);
      const costSpikeAlert = alerts.find(a => a.type === 'cost_spike');
      expect(costSpikeAlert).to.exist;
      expect(costSpikeAlert!.severity).to.equal('warning');
    });

    it('should not create alerts for optimal utilization', async () => {
      const record: BudgetUsageRecord = {
        taskId: 'test-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 5000,
        budgetUsed: 4000, // 80% utilization - optimal
        thinkingTokensUsed: 3500,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      };

      await analytics.trackAllocation(record);

      const alerts = analytics.getRecentAlerts(1);
      expect(alerts).to.have.lengthOf(0);
    });
  });

  describe('Budget Trends', () => {
    beforeEach(async () => {
      // Add historical data over 7 days
      const now = Date.now();
      for (let day = 0; day < 7; day++) {
        for (let task = 0; task < 5; task++) {
          await analytics.trackAllocation({
            taskId: `day-${day}-task-${task}`,
            characteristics: {
              complexity: 50,
              domain: ['backend'],
              novelty: 0.5,
              uncertainty: 0.4,
              criticality: 0.5,
              taskType: 'code-generation',
            },
            budgetAllocated: 5000 + day * 100, // Increasing trend
            budgetUsed: 4000 + day * 80,
            thinkingTokensUsed: 3500 + day * 70,
            outcome: {
              success: true,
              quality: 85,
              completedInTime: true,
              requiredReflection: false,
            },
            timestamp: new Date(now - (7 - day) * 24 * 60 * 60 * 1000),
          });
        }
      }
    });

    it('should calculate daily trends', () => {
      const trends = analytics.getBudgetTrends('daily');

      expect(trends.period).to.equal('daily');
      expect(trends.dataPoints.length).to.be.greaterThan(0);
      expect(trends.direction).to.be.oneOf(['improving', 'stable', 'declining']);
    });

    it('should include trend metrics in data points', () => {
      const trends = analytics.getBudgetTrends('daily');

      for (const point of trends.dataPoints) {
        expect(point.timestamp).to.be.instanceOf(Date);
        expect(point.avgBudget).to.be.greaterThan(0);
        expect(point.avgUtilization).to.be.greaterThan(0);
        expect(point.avgUtilization).to.be.lessThanOrEqual(1);
        expect(point.efficiency).to.be.greaterThan(0);
        expect(point.efficiency).to.be.lessThanOrEqual(1);
        expect(point.taskCount).to.be.greaterThan(0);
      }
    });
  });

  describe('Optimization Suggestions', () => {
    beforeEach(async () => {
      // Add data with over-allocation for code-generation tasks
      for (let i = 0; i < 10; i++) {
        await analytics.trackAllocation({
          taskId: `codegen-${i}`,
          characteristics: {
            complexity: 50,
            domain: ['backend'],
            novelty: 0.5,
            uncertainty: 0.4,
            criticality: 0.5,
            taskType: 'code-generation',
          },
          budgetAllocated: 8000,
          budgetUsed: 4500, // ~56% utilization - room for optimization
          thinkingTokensUsed: 4000,
          outcome: {
            success: true,
            quality: 88,
            completedInTime: true,
            requiredReflection: false,
          },
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        });
      }

      // Add data with good utilization for code-review tasks
      for (let i = 0; i < 10; i++) {
        await analytics.trackAllocation({
          taskId: `review-${i}`,
          characteristics: {
            complexity: 40,
            domain: ['backend'],
            novelty: 0.3,
            uncertainty: 0.3,
            criticality: 0.6,
            taskType: 'code-review',
          },
          budgetAllocated: 5000,
          budgetUsed: 4000, // 80% utilization - optimal
          thinkingTokensUsed: 3500,
          outcome: {
            success: true,
            quality: 90,
            completedInTime: true,
            requiredReflection: false,
          },
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        });
      }
    });

    it('should generate optimization suggestions', () => {
      const suggestions = analytics.generateOptimizationSuggestions();

      expect(suggestions).to.be.an('array');
      expect(suggestions.length).to.be.greaterThan(0);
    });

    it('should identify over-allocation opportunities', () => {
      const suggestions = analytics.generateOptimizationSuggestions();

      const codegenSuggestion = suggestions.find(s => s.taskType === 'code-generation');
      expect(codegenSuggestion).to.exist;
      expect(codegenSuggestion!.suggestedAvgBudget).to.be.lessThan(codegenSuggestion!.currentAvgBudget);
      expect(codegenSuggestion!.expectedSavings.tokens).to.be.greaterThan(0);
      expect(codegenSuggestion!.expectedSavings.cost).to.be.greaterThan(0);
    });

    it('should sort suggestions by expected savings', () => {
      const suggestions = analytics.generateOptimizationSuggestions();

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].expectedSavings.cost).to.be.greaterThanOrEqual(
          suggestions[i].expectedSavings.cost
        );
      }
    });

    it('should provide reasoning for suggestions', () => {
      const suggestions = analytics.generateOptimizationSuggestions();

      for (const suggestion of suggestions) {
        expect(suggestion.reasoning).to.be.a('string');
        expect(suggestion.reasoning.length).to.be.greaterThan(0);
      }
    });

    it('should include confidence scores', () => {
      const suggestions = analytics.generateOptimizationSuggestions();

      for (const suggestion of suggestions) {
        expect(suggestion.confidence).to.be.greaterThan(0);
        expect(suggestion.confidence).to.be.lessThanOrEqual(1);
      }
    });
  });

  describe('Cost Projections', () => {
    beforeEach(async () => {
      // Add 30 days of historical data
      const now = Date.now();
      for (let day = 0; day < 30; day++) {
        for (let task = 0; task < 3; task++) {
          await analytics.trackAllocation({
            taskId: `day-${day}-task-${task}`,
            characteristics: {
              complexity: 50,
              domain: ['backend'],
              novelty: 0.5,
              uncertainty: 0.4,
              criticality: 0.5,
              taskType: 'code-generation',
            },
            budgetAllocated: 5000,
            budgetUsed: 4000 + Math.random() * 1000,
            thinkingTokensUsed: 3500,
            outcome: {
              success: true,
              quality: 85,
              completedInTime: true,
              requiredReflection: false,
            },
            timestamp: new Date(now - (30 - day) * 24 * 60 * 60 * 1000),
            model: 'sonnet',
            agent: 'code-generator',
          });
        }
      }
    });

    it('should project future costs', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.projectedCost).to.be.greaterThan(0);
      expect(projection.period.start).to.be.instanceOf(Date);
      expect(projection.period.end).to.be.instanceOf(Date);
    });

    it('should provide confidence interval', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.confidenceInterval.lower).to.be.greaterThanOrEqual(0);
      expect(projection.confidenceInterval.upper).to.be.greaterThan(projection.confidenceInterval.lower);
      expect(projection.projectedCost).to.be.greaterThanOrEqual(projection.confidenceInterval.lower);
      expect(projection.projectedCost).to.be.lessThanOrEqual(projection.confidenceInterval.upper);
    });

    it('should break down costs by model', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.breakdown.byModel).to.be.an('object');
      expect(Object.keys(projection.breakdown.byModel).length).to.be.greaterThan(0);
    });

    it('should break down costs by task type', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.breakdown.byTaskType).to.be.an('object');
      expect(Object.keys(projection.breakdown.byTaskType).length).to.be.greaterThan(0);
    });

    it('should break down costs by agent', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.breakdown.byAgent).to.be.an('object');
      expect(Object.keys(projection.breakdown.byAgent).length).to.be.greaterThan(0);
    });

    it('should identify cost trend', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.trend).to.be.oneOf(['increasing', 'stable', 'decreasing']);
    });

    it('should provide recommendations', () => {
      const projection = analytics.projectCosts(30);

      expect(projection.recommendations).to.be.an('array');
      expect(projection.recommendations.length).to.be.greaterThan(0);
    });
  });

  describe('Data Persistence', () => {
    it('should persist allocations to disk', async () => {
      await analytics.trackAllocation({
        taskId: 'test-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 5000,
        budgetUsed: 4000,
        thinkingTokensUsed: 3500,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      });

      expect(fs.existsSync(testHistoryPath)).to.be.true;
    });

    it('should persist alerts to disk', async () => {
      await analytics.trackAllocation({
        taskId: 'test-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 10000,
        budgetUsed: 2000, // Will trigger alert
        thinkingTokensUsed: 1800,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      });

      expect(fs.existsSync(testAlertPath)).to.be.true;
    });

    it('should load persisted data', async () => {
      await analytics.trackAllocation({
        taskId: 'test-task',
        characteristics: {
          complexity: 50,
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
          taskType: 'code-generation',
        },
        budgetAllocated: 5000,
        budgetUsed: 4000,
        thinkingTokensUsed: 3500,
        outcome: {
          success: true,
          quality: 85,
          completedInTime: true,
          requiredReflection: false,
        },
        timestamp: new Date(),
      });

      // Create new analytics instance
      const analytics2 = new BudgetAnalytics(testHistoryPath, testAlertPath);

      // Should be able to generate reports from loaded data
      const projection = analytics2.projectCosts(7);
      expect(projection.projectedCost).to.be.greaterThan(0);
    });
  });

  describe('Alert Limits', () => {
    it('should keep only last 100 alerts', async () => {
      // Generate 150 alerts
      for (let i = 0; i < 150; i++) {
        await analytics.trackAllocation({
          taskId: `task-${i}`,
          characteristics: {
            complexity: 50,
            domain: ['backend'],
            novelty: 0.5,
            uncertainty: 0.4,
            criticality: 0.5,
            taskType: 'code-generation',
          },
          budgetAllocated: 10000,
          budgetUsed: 2000, // Will trigger alert
          thinkingTokensUsed: 1800,
          outcome: {
            success: true,
            quality: 85,
            completedInTime: true,
            requiredReflection: false,
          },
          timestamp: new Date(Date.now() - i * 1000),
        });
      }

      const alerts = analytics.getRecentAlerts(200);
      expect(alerts.length).to.be.lessThanOrEqual(100);
    });
  });
});
