/**
 * Tests for Token Budget Prediction
 *
 * Validates the prediction algorithms, similarity calculations, and budget allocation logic.
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { TokenBudgetPredictor, TaskCharacteristics, BudgetUsageRecord } from '../../lib/token-budget-predictor';

describe('TokenBudgetPredictor', () => {
  let predictor: TokenBudgetPredictor;
  const testHistoryPath = path.join(__dirname, '../../../sessions/intelligence/test-budget-history.json');

  beforeEach(() => {
    // Clear test history file
    if (fs.existsSync(testHistoryPath)) {
      fs.unlinkSync(testHistoryPath);
    }
    predictor = new TokenBudgetPredictor(testHistoryPath);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testHistoryPath)) {
      fs.unlinkSync(testHistoryPath);
    }
  });

  describe('Heuristic Budget Prediction', () => {
    it('should predict budget for simple tasks', async () => {
      const task = {
        complexity: 20,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.3,
        uncertainty: 0.2,
        criticality: 0.3,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.recommended).to.be.greaterThan(1000);
      expect(prediction.recommended).to.be.lessThan(5000);
      expect(prediction.confidence).to.be.approximately(0.5, 0.1);
      expect(prediction.reasoning).to.include('heuristics');
    });

    it('should predict higher budget for complex tasks', async () => {
      const task = {
        complexity: 85,
        type: 'architecture',
        domain: ['backend', 'database'],
        novelty: 0.8,
        uncertainty: 0.7,
        criticality: 0.9,
        requiresCreativity: true,
        involvesArchitecture: true,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.recommended).to.be.greaterThan(10000);
      expect(prediction.recommended).to.be.lessThanOrEqual(32000);
      expect(prediction.confidence).to.be.approximately(0.5, 0.1);
    });

    it('should cap budget at maximum limit', async () => {
      const task = {
        complexity: 100,
        type: 'architecture',
        domain: ['backend'],
        novelty: 1.0,
        uncertainty: 1.0,
        criticality: 1.0,
        requiresCreativity: true,
        involvesArchitecture: true,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.recommended).to.be.lessThanOrEqual(32000);
    });

    it('should enforce minimum budget', async () => {
      const task = {
        complexity: 1,
        type: 'documentation',
        domain: ['general'],
        novelty: 0.1,
        uncertainty: 0.1,
        criticality: 0.1,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.recommended).to.be.greaterThanOrEqual(1000);
    });

    it('should provide alternatives with trade-offs', async () => {
      const task = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.5,
        criticality: 0.5,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.alternatives).to.have.lengthOf(3);
      expect(prediction.alternatives[0].budget).to.be.lessThan(prediction.recommended);
      expect(prediction.alternatives[1].budget).to.be.greaterThan(prediction.recommended);
      expect(prediction.alternatives[2].budget).to.be.greaterThan(prediction.alternatives[1].budget);
    });

    it('should provide phase breakdown', async () => {
      const task = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.5,
        criticality: 0.5,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.breakdown).to.exist;
      expect(prediction.breakdown!.thinking).to.be.greaterThan(0);
      expect(prediction.breakdown!.planning).to.be.greaterThan(0);
      expect(prediction.breakdown!.execution).to.be.greaterThan(0);
      expect(prediction.breakdown!.reflection).to.be.greaterThan(0);

      const total = prediction.breakdown!.thinking +
                   prediction.breakdown!.planning +
                   prediction.breakdown!.execution +
                   prediction.breakdown!.reflection;

      expect(total).to.be.approximately(prediction.recommended, 10);
    });
  });

  describe('Historical Budget Prediction', () => {
    beforeEach(async () => {
      // Add historical data
      for (let i = 0; i < 10; i++) {
        await predictor.recordBudgetUsage(
          `task-${i}`,
          {
            complexity: 50 + i * 2,
            type: 'code-generation',
            domain: ['backend'],
            novelty: 0.5,
            uncertainty: 0.4,
            criticality: 0.5,
          },
          5000 + i * 100,
          4000 + i * 100,
          3500 + i * 100,
          {
            success: true,
            quality: 85 + i,
            completedInTime: true,
            requiredReflection: false,
          },
          'test-agent',
          'sonnet'
        );
      }
    });

    it('should use historical data for prediction', async () => {
      const task = {
        complexity: 55,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
      };

      const prediction = await predictor.predictOptimalBudget(task);

      expect(prediction.confidence).to.be.greaterThan(0.5);
      expect(prediction.reasoning).to.include('similar tasks');
      expect(prediction.historicalBasis).to.exist;
      expect(prediction.historicalBasis!.length).to.be.greaterThan(0);
    });

    it('should filter by agent when specified', async () => {
      // Add agent-specific history
      await predictor.recordBudgetUsage(
        'agent-specific-task',
        {
          complexity: 55,
          type: 'code-generation',
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
        },
        6000,
        5000,
        4500,
        {
          success: true,
          quality: 90,
          completedInTime: true,
          requiredReflection: false,
        },
        'special-agent',
        'sonnet'
      );

      const task = {
        complexity: 55,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
      };

      const prediction = await predictor.predictOptimalBudget(task, 'special-agent');

      expect(prediction.historicalBasis).to.exist;
      // Should find at least the special agent's task
      expect(prediction.historicalBasis!.length).to.be.greaterThan(0);
    });

    it('should increase confidence with more historical data', async () => {
      const task = {
        complexity: 55,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
      };

      const prediction1 = await predictor.predictOptimalBudget(task);

      // Add more similar historical data
      for (let i = 10; i < 20; i++) {
        await predictor.recordBudgetUsage(
          `task-${i}`,
          {
            complexity: 50 + i * 2,
            type: 'code-generation',
            domain: ['backend'],
            novelty: 0.5,
            uncertainty: 0.4,
            criticality: 0.5,
          },
          5000 + i * 100,
          4000 + i * 100,
          3500 + i * 100,
          {
            success: true,
            quality: 85 + i,
            completedInTime: true,
            requiredReflection: false,
          }
        );
      }

      const prediction2 = await predictor.predictOptimalBudget(task);

      expect(prediction2.confidence).to.be.greaterThan(prediction1.confidence);
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate high similarity for identical tasks', async () => {
      const chars1: TaskCharacteristics = {
        complexity: 50,
        domain: ['backend', 'api'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
        taskType: 'code-generation',
      };

      const chars2: TaskCharacteristics = {
        complexity: 50,
        domain: ['backend', 'api'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
        taskType: 'code-generation',
      };

      // Use predictor's private method through testing
      const similarity = (predictor as any).calculateSimilarity(chars1, chars2);

      expect(similarity).to.be.approximately(1.0, 0.1);
    });

    it('should calculate low similarity for different tasks', async () => {
      const chars1: TaskCharacteristics = {
        complexity: 20,
        domain: ['frontend', 'ui'],
        novelty: 0.2,
        uncertainty: 0.2,
        criticality: 0.3,
        taskType: 'documentation',
      };

      const chars2: TaskCharacteristics = {
        complexity: 80,
        domain: ['backend', 'database'],
        novelty: 0.9,
        uncertainty: 0.8,
        criticality: 0.9,
        taskType: 'architecture',
      };

      const similarity = (predictor as any).calculateSimilarity(chars1, chars2);

      expect(similarity).to.be.lessThan(0.5);
    });

    it('should weight task type match highly', async () => {
      const chars1: TaskCharacteristics = {
        complexity: 50,
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.5,
        criticality: 0.5,
        taskType: 'code-generation',
      };

      const chars2SameType: TaskCharacteristics = {
        complexity: 60,
        domain: ['frontend'],
        novelty: 0.6,
        uncertainty: 0.6,
        criticality: 0.6,
        taskType: 'code-generation',
      };

      const chars2DiffType: TaskCharacteristics = {
        complexity: 50,
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.5,
        criticality: 0.5,
        taskType: 'documentation',
      };

      const similaritySameType = (predictor as any).calculateSimilarity(chars1, chars2SameType);
      const similarityDiffType = (predictor as any).calculateSimilarity(chars1, chars2DiffType);

      expect(similaritySameType).to.be.greaterThan(similarityDiffType);
    });
  });

  describe('Adjustment Factors', () => {
    it('should increase budget for novel tasks', async () => {
      const baseTask = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.3,
        uncertainty: 0.4,
        criticality: 0.5,
      };

      const novelTask = {
        ...baseTask,
        novelty: 0.8,
      };

      const basePrediction = await predictor.predictOptimalBudget(baseTask);
      const novelPrediction = await predictor.predictOptimalBudget(novelTask);

      expect(novelPrediction.recommended).to.be.greaterThan(basePrediction.recommended);
    });

    it('should increase budget for uncertain tasks', async () => {
      const baseTask = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.2,
        criticality: 0.5,
      };

      const uncertainTask = {
        ...baseTask,
        uncertainty: 0.8,
      };

      const basePrediction = await predictor.predictOptimalBudget(baseTask);
      const uncertainPrediction = await predictor.predictOptimalBudget(uncertainTask);

      expect(uncertainPrediction.recommended).to.be.greaterThan(basePrediction.recommended);
    });

    it('should increase budget for critical tasks', async () => {
      const baseTask = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.3,
      };

      const criticalTask = {
        ...baseTask,
        criticality: 0.9,
      };

      const basePrediction = await predictor.predictOptimalBudget(baseTask);
      const criticalPrediction = await predictor.predictOptimalBudget(criticalTask);

      expect(criticalPrediction.recommended).to.be.greaterThan(basePrediction.recommended);
    });

    it('should increase budget for creative tasks', async () => {
      const baseTask = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
        requiresCreativity: false,
      };

      const creativeTask = {
        ...baseTask,
        requiresCreativity: true,
      };

      const basePrediction = await predictor.predictOptimalBudget(baseTask);
      const creativePrediction = await predictor.predictOptimalBudget(creativeTask);

      expect(creativePrediction.recommended).to.be.greaterThan(basePrediction.recommended);
    });

    it('should increase budget for architectural tasks', async () => {
      const baseTask = {
        complexity: 50,
        type: 'code-generation',
        domain: ['backend'],
        novelty: 0.5,
        uncertainty: 0.4,
        criticality: 0.5,
        involvesArchitecture: false,
      };

      const architecturalTask = {
        ...baseTask,
        involvesArchitecture: true,
      };

      const basePrediction = await predictor.predictOptimalBudget(baseTask);
      const architecturalPrediction = await predictor.predictOptimalBudget(architecturalTask);

      expect(architecturalPrediction.recommended).to.be.greaterThan(basePrediction.recommended);
    });
  });

  describe('Budget Recording', () => {
    it('should record budget usage', async () => {
      await predictor.recordBudgetUsage(
        'test-task',
        {
          complexity: 50,
          type: 'code-generation',
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
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

      expect(predictor.getHistorySize()).to.equal(1);
    });

    it('should persist history to disk', async () => {
      await predictor.recordBudgetUsage(
        'test-task',
        {
          complexity: 50,
          type: 'code-generation',
          domain: ['backend'],
          novelty: 0.5,
          uncertainty: 0.4,
          criticality: 0.5,
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

      // Create new predictor instance to test persistence
      const predictor2 = new TokenBudgetPredictor(testHistoryPath);
      expect(predictor2.getHistorySize()).to.equal(1);
    });
  });

  describe('Efficiency Reporting', () => {
    beforeEach(async () => {
      // Add varied historical data
      const scenarios = [
        { allocated: 5000, used: 4000, quality: 90 }, // Good utilization
        { allocated: 5000, used: 2000, quality: 85 }, // Over-allocated
        { allocated: 5000, used: 4800, quality: 88 }, // Under-allocated
        { allocated: 5000, used: 3800, quality: 92 }, // Good utilization
        { allocated: 5000, used: 1500, quality: 80 }, // Over-allocated
      ];

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        await predictor.recordBudgetUsage(
          `task-${i}`,
          {
            complexity: 50,
            type: 'code-generation',
            domain: ['backend'],
            novelty: 0.5,
            uncertainty: 0.4,
            criticality: 0.5,
          },
          scenario.allocated,
          scenario.used,
          scenario.used * 0.9,
          {
            success: true,
            quality: scenario.quality,
            completedInTime: true,
            requiredReflection: false,
          }
        );
      }
    });

    it('should generate efficiency report', () => {
      const report = predictor.generateEfficiencyReport();

      expect(report.overallEfficiency).to.be.greaterThan(0);
      expect(report.overallEfficiency).to.be.lessThanOrEqual(1);
      expect(report.avgUtilization).to.be.greaterThan(0);
      expect(report.overAllocationRate).to.be.greaterThan(0);
      expect(report.recommendations).to.have.lengthOf.at.least(1);
    });

    it('should calculate token savings', () => {
      const report = predictor.generateEfficiencyReport();

      expect(report.tokensSaved).to.be.greaterThan(0);
      expect(report.costSavings).to.be.greaterThan(0);
    });

    it('should provide recommendations', () => {
      const report = predictor.generateEfficiencyReport();

      expect(report.recommendations).to.be.an('array');
      expect(report.recommendations.length).to.be.greaterThan(0);
      expect(report.recommendations[0]).to.be.a('string');
    });
  });
});
