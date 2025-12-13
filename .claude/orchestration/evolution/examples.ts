/**
 * Agent Evolution System - Usage Examples
 *
 * Demonstrates how to use the evolution system for tracking, optimizing,
 * and evolving agent performance.
 */

import Database from 'better-sqlite3';
import { EvolutionSystem } from './index';
import {
  PerformanceTracker,
  PromptOptimizer,
  CapabilityExpander,
  FeedbackLoop,
} from './index';

// ============================================
// Example 1: Basic Setup and Task Tracking
// ============================================

async function example1_BasicSetup() {
  console.log('=== Example 1: Basic Setup ===\n');

  // Initialize database
  const db = new Database('.claude/orchestration/db/agents.db');

  // Create evolution system with default config
  const evolution = new EvolutionSystem(db);

  // Track a successful task
  await evolution.trackTaskCompletion({
    agentId: 'coder-agent',
    taskId: 'task-001',
    variantId: 'coder-agent-v3',
    success: true,
    duration: 45000, // 45 seconds
    tokens: 1250,
    userRating: 4.5,
  });

  // Track a failed task
  await evolution.trackTaskCompletion({
    agentId: 'coder-agent',
    taskId: 'task-002',
    success: false,
    duration: 120000, // 2 minutes (timeout)
    tokens: 3000,
    errorType: 'timeout',
  });

  // Get agent summary
  const summary = evolution.getAgentSummary('coder-agent');
  console.log('Agent Summary:', summary);
}

// ============================================
// Example 2: Implicit Feedback Collection
// ============================================

function example2_ImplicitFeedback() {
  console.log('=== Example 2: Implicit Feedback ===\n');

  const db = new Database('.claude/orchestration/db/agents.db');
  const evolution = new EvolutionSystem(db);

  // Scenario 1: User retries a task (negative signal)
  evolution.feedbackLoop.trackRetry('task-003', 'coder-agent');
  console.log('Tracked retry - implicit rating: 2/5');

  // Scenario 2: User makes minor edits (slightly negative)
  evolution.feedbackLoop.trackEdit('task-004', 'coder-agent', 'minor');
  console.log('Tracked minor edit - implicit rating: 3/5');

  // Scenario 3: User completely rewrites output (very negative)
  evolution.feedbackLoop.trackEdit('task-005', 'coder-agent', 'complete_rewrite');
  console.log('Tracked complete rewrite - implicit rating: 1/5');

  // Scenario 4: User abandons task (worst signal)
  evolution.feedbackLoop.trackAbandon('task-006', 'coder-agent');
  console.log('Tracked abandon - implicit rating: 1/5');

  // Get weighted score (combines explicit and implicit feedback)
  const score = evolution.feedbackLoop.getWeightedScore('coder-agent');
  console.log(`\nWeighted Score: ${score.toFixed(2)}/5.0`);
}

// ============================================
// Example 3: A/B Testing with UCB1
// ============================================

function example3_ABTesting() {
  console.log('=== Example 3: A/B Testing ===\n');

  const db = new Database('.claude/orchestration/db/agents.db');
  const optimizer = new PromptOptimizer(db);

  // Register two variants for testing
  optimizer.registerVariant({
    id: 'coder-agent-v3',
    agentId: 'coder-agent',
    version: 3,
    prompt: 'You are a skilled software engineer. Write clean, efficient code.',
    systemPrompt: 'Focus on code quality and best practices.',
    createdAt: new Date(),
    trialCount: 50,
    successCount: 38,
    successRate: 0.76,
    avgDuration: 52000,
    avgTokens: 1400,
    mutationType: 'manual',
  });

  optimizer.registerVariant({
    id: 'coder-agent-v4',
    agentId: 'coder-agent',
    version: 4,
    prompt:
      'You are a skilled software engineer. Write clean, efficient code with comprehensive error handling.',
    systemPrompt:
      'Focus on code quality, best practices, and time efficiency. Complete tasks quickly.',
    createdAt: new Date(),
    trialCount: 15,
    successCount: 13,
    successRate: 0.867,
    avgDuration: 43000,
    avgTokens: 1200,
    mutationType: 'automated',
    mutationReason: 'Add time management and error handling constraints',
    parentVariantId: 'coder-agent-v3',
  });

  // UCB1 selection for next task
  const selected = optimizer.selectVariant('coder-agent');
  console.log('Selected Variant:', selected?.id);
  console.log('UCB1 Score:', selected?.ucb1Score?.toFixed(3));
  console.log('Success Rate:', (selected?.successRate * 100).toFixed(1) + '%');

  // Simulate task completion with selected variant
  if (selected) {
    optimizer.updatePerformance(selected.id, true, 42000, 1150);
    console.log('\nUpdated performance after task completion');

    const updated = optimizer.selectVariant('coder-agent');
    console.log('New UCB1 Score:', updated?.ucb1Score?.toFixed(3));
  }

  // View prompt history
  const history = optimizer.getPromptHistory('coder-agent');
  console.log(`\nPrompt History: ${history.length} versions`);
}

// ============================================
// Example 4: Capability Gap Analysis
// ============================================

function example4_CapabilityGaps() {
  console.log('=== Example 4: Capability Gap Analysis ===\n');

  const db = new Database('.claude/orchestration/db/agents.db');
  const tracker = new PerformanceTracker(db);
  const expander = new CapabilityExpander(db);

  // Record some failures
  tracker.recordFailure({
    taskId: 'task-010',
    agentId: 'coder-agent',
    timestamp: new Date(),
    errorType: 'tool_limitation',
    errorMessage: 'No database client available',
    context: {
      taskType: 'database_query',
      requiredCapabilities: ['sql', 'database_client'],
      attemptedActions: ['search_for_tool', 'attempt_manual_query'],
    },
  });

  tracker.recordFailure({
    taskId: 'task-011',
    agentId: 'coder-agent',
    timestamp: new Date(),
    errorType: 'tool_limitation',
    errorMessage: 'Cannot execute SQL queries',
    context: {
      taskType: 'database_migration',
      requiredCapabilities: ['sql', 'database_client', 'migration_tool'],
      attemptedActions: ['search_for_migration_tool'],
    },
  });

  // Identify gaps
  const failures = tracker.getFailures('coder-agent');
  const gaps = expander.identifyGaps(failures);

  console.log(`Identified ${gaps.length} capability gaps:\n`);
  for (const gap of gaps) {
    console.log(`Gap ID: ${gap.id}`);
    console.log(`Category: ${gap.category}`);
    console.log(`Severity: ${gap.severity}`);
    console.log(`Description: ${gap.description}`);
    console.log(`Failure Count: ${gap.failureCount}`);
    console.log(`Frequency: ${gap.frequency.toFixed(2)} failures/day`);
    console.log('---');
  }

  // Generate skill suggestions
  const suggestions = expander.suggestSkills(gaps);
  console.log(`\nGenerated ${suggestions.length} skill suggestions:\n`);
  for (const suggestion of suggestions) {
    console.log(`Skill: ${suggestion.name}`);
    console.log(`Description: ${suggestion.description}`);
    console.log(`Impact: +${suggestion.estimatedImpact.estimatedSuccessRateImprovement}% success rate`);
    console.log(`Complexity: ${suggestion.implementationComplexity}`);
    console.log('---');
  }
}

// ============================================
// Example 5: Automated Evolution
// ============================================

async function example5_AutomatedEvolution() {
  console.log('=== Example 5: Automated Evolution ===\n');

  const db = new Database('.claude/orchestration/db/agents.db');
  const evolution = new EvolutionSystem(db, {
    autoEvolutionEnabled: true,
    evolutionThreshold: {
      minSuccessRateDrop: 10,
      minTaskCount: 10,
    },
  });

  // Simulate declining performance
  for (let i = 0; i < 15; i++) {
    await evolution.trackTaskCompletion({
      agentId: 'coder-agent',
      taskId: `task-${100 + i}`,
      success: i < 5, // First 5 succeed, rest fail
      duration: 60000,
      tokens: 1500,
    });
  }

  // Check if evolution is triggered
  const updates = evolution.feedbackLoop.checkThresholds();
  console.log(`Found ${updates.length} agents requiring evolution:\n`);

  for (const update of updates) {
    console.log(`Agent: ${update.agentId}`);
    console.log(`Current Version: v${update.currentVersion}`);
    console.log(`Reason: ${update.reason}`);
    console.log(`Recommended Action: ${update.recommendedAction}`);
    console.log('---');

    // Trigger evolution
    if (update.recommendedAction === 'evolve') {
      await evolution.evolveAgent(update.agentId);
      console.log(`✓ Evolved agent ${update.agentId} to new version\n`);
    }
  }
}

// ============================================
// Example 6: Weekly Evolution Report
// ============================================

function example6_EvolutionReport() {
  console.log('=== Example 6: Evolution Report ===\n');

  const db = new Database('.claude/orchestration/db/agents.db');
  const evolution = new EvolutionSystem(db);

  // Generate weekly report
  const report = evolution.generateWeeklyReport();

  console.log('Evolution Report');
  console.log('================\n');

  console.log('Period:', report.period.start.toISOString().split('T')[0], 'to', report.period.end.toISOString().split('T')[0]);
  console.log('\nSummary:');
  console.log(`  Total Tasks: ${report.summary.totalTasks}`);
  console.log(`  Overall Success Rate: ${(report.summary.overallSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Avg Duration: ${(report.summary.avgDuration / 1000).toFixed(1)}s`);
  console.log(`  Total Tokens: ${report.summary.totalTokens.toLocaleString()}`);

  console.log('\nAgent Performance:');
  for (const perf of report.agentPerformance) {
    const trend = perf.successRateChange > 0 ? '↑' : perf.successRateChange < 0 ? '↓' : '→';
    console.log(`  ${perf.agentId}:`);
    console.log(`    Success Rate: ${(perf.successRate * 100).toFixed(1)}% ${trend} ${Math.abs(perf.successRateChange * 100).toFixed(1)}%`);
    console.log(`    Tasks: ${perf.taskCount}`);
    console.log(`    Token Efficiency: ${perf.tokenEfficiency.toFixed(2)}`);
  }

  console.log(`\nCapability Gaps: ${report.gaps.length}`);
  console.log(`Skill Suggestions: ${report.suggestions.length}`);
  console.log(`Improvements: ${report.improvements.length}`);

  if (report.promptUpdates.length > 0) {
    console.log('\nPrompt Updates:');
    for (const update of report.promptUpdates) {
      console.log(`  ${update.agentId}: v${update.oldVersion} → v${update.newVersion}`);
      console.log(`    Reason: ${update.reason}`);
      console.log(`    Performance: ${update.performanceImprovement > 0 ? '+' : ''}${update.performanceImprovement.toFixed(1)}%`);
    }
  }
}

// ============================================
// Example 7: Agent Variants and Specialization
// ============================================

function example7_AgentVariants() {
  console.log('=== Example 7: Agent Variants ===\n');

  const db = new Database('.claude/orchestration/db/agents.db');
  const expander = new CapabilityExpander(db);

  // Create specialized variant for React development
  const reactVariant = expander.generateVariant('coder-agent', 'React Development');

  console.log('Created React Specialist:');
  console.log(`  ID: ${reactVariant.id}`);
  console.log(`  Name: ${reactVariant.name}`);
  console.log(`  Specialization: ${reactVariant.specialization}`);
  console.log(`  Status: ${reactVariant.status}`);

  // Create specialized variant for API development
  const apiVariant = expander.generateVariant('coder-agent', 'API Development');

  console.log('\nCreated API Specialist:');
  console.log(`  ID: ${apiVariant.id}`);
  console.log(`  Name: ${apiVariant.name}`);
  console.log(`  Specialization: ${apiVariant.specialization}`);

  // Propose composition for complex task
  const composition = expander.proposeComposition({
    description: 'Build full-stack React app with REST API',
    complexity: 8,
    requiredCapabilities: ['react', 'api', 'database'],
  });

  console.log('\nProposed Agent Composition:');
  console.log(`  Pattern: ${composition.pattern}`);
  console.log(`  Estimated Duration: ${(composition.estimatedDuration / 1000).toFixed(1)}s`);
  console.log(`  Estimated Tokens: ${composition.estimatedTokens.toLocaleString()}`);
  console.log(`  Confidence: ${(composition.confidence * 100).toFixed(1)}%`);
  console.log('  Agents:');
  for (const agent of composition.agents) {
    console.log(`    - ${agent.agentId} (${agent.role}): ${(agent.weight * 100).toFixed(0)}% weight`);
  }
}

// ============================================
// Run All Examples
// ============================================

async function runAllExamples() {
  try {
    await example1_BasicSetup();
    console.log('\n' + '='.repeat(50) + '\n');

    example2_ImplicitFeedback();
    console.log('\n' + '='.repeat(50) + '\n');

    example3_ABTesting();
    console.log('\n' + '='.repeat(50) + '\n');

    example4_CapabilityGaps();
    console.log('\n' + '='.repeat(50) + '\n');

    await example5_AutomatedEvolution();
    console.log('\n' + '='.repeat(50) + '\n');

    example6_EvolutionReport();
    console.log('\n' + '='.repeat(50) + '\n');

    example7_AgentVariants();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✓ All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_BasicSetup,
  example2_ImplicitFeedback,
  example3_ABTesting,
  example4_CapabilityGaps,
  example5_AutomatedEvolution,
  example6_EvolutionReport,
  example7_AgentVariants,
};
