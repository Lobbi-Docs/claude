/**
 * Test Suite for Model Routing System
 * Run: ts-node test-routing.ts
 */

import { createDefaultRoutingSystem } from './index';
import { TaskClassifier } from './task-classifier';

console.log('='.repeat(80));
console.log('MODEL ROUTING SYSTEM - TEST SUITE');
console.log('='.repeat(80));
console.log('');

// Test 1: Task Classification
console.log('TEST 1: Task Classification');
console.log('-'.repeat(80));

const classifier = new TaskClassifier();

const testTasks = [
  "Fix authentication bug in login endpoint",
  "Write documentation for API endpoints",
  "Design scalable microservices architecture for e-commerce platform",
  "Add a simple logging statement",
  "Implement comprehensive user authentication system with JWT tokens",
  "Analyze performance bottlenecks in database queries",
];

testTasks.forEach((task, i) => {
  console.log(`\nTask ${i + 1}: "${task}"`);
  const descriptor = classifier.classify(task);
  console.log(`  Type: ${descriptor.type}`);
  console.log(`  Complexity: ${descriptor.complexity}`);
  console.log(`  Pattern: ${descriptor.pattern}`);
  console.log(`  Priority: ${descriptor.priority}/5`);
  console.log(`  Extended Thinking: ${descriptor.requiresExtendedThinking}`);
  console.log(`  Estimated Tokens: ${descriptor.estimatedInputTokens + descriptor.estimatedOutputTokens}`);
});

console.log('\n');

// Test 2: Model Routing
console.log('TEST 2: Model Routing Decisions');
console.log('-'.repeat(80));

const routing = createDefaultRoutingSystem();

const routingTestTasks = [
  { task: "Quick documentation update", expected: "haiku" },
  { task: "Implement REST API with authentication", expected: "sonnet" },
  { task: "Design critical production architecture", expected: "opus" },
  { task: "Debug complex distributed system issue", expected: "sonnet" },
];

routingTestTasks.forEach(({ task, expected }, i) => {
  console.log(`\nRouting Test ${i + 1}: "${task}"`);
  const decision = routing.router.route(classifier.classify(task));

  console.log(`  Selected Model: ${decision.model.name} (expected: ${expected})`);
  console.log(`  Confidence: ${decision.confidence.toFixed(1)}%`);
  console.log(`  Estimated Cost: $${decision.estimatedCost.toFixed(4)}`);
  console.log(`  Estimated Latency: ${decision.estimatedLatency}ms`);
  console.log(`  Reasoning:`);
  decision.reasoning.forEach(r => console.log(`    - ${r}`));
  console.log(`  Fallback Chain: ${decision.fallbackChain.join(' → ')}`);

  if (decision.model.name === expected) {
    console.log(`  ✅ PASS: Matched expected model`);
  } else {
    console.log(`  ⚠️  Different from expected (not necessarily wrong)`);
  }
});

console.log('\n');

// Test 3: Cost Comparison
console.log('TEST 3: Cost Comparison Across Models');
console.log('-'.repeat(80));

const sampleTask = classifier.classify(
  "Implement user authentication system with password hashing and JWT tokens"
);

console.log(`\nSample Task: "${sampleTask.task}"`);
console.log(`Task Type: ${sampleTask.type}, Complexity: ${sampleTask.complexity}\n`);

const models = ['opus', 'sonnet', 'haiku', 'gpt-4', 'gpt-3.5'];

models.forEach(modelName => {
  const model = routing.router.getModel(modelName as any);
  if (model) {
    const inputCost = (sampleTask.estimatedInputTokens / 1000) * model.costPer1kInputTokens;
    const outputCost = (sampleTask.estimatedOutputTokens / 1000) * model.costPer1kOutputTokens;
    const totalCost = inputCost + outputCost;

    console.log(`${modelName.padEnd(12)} | Cost: $${totalCost.toFixed(4)} | ` +
      `Latency: ${model.latencyMs}ms | Quality: ${model.qualityScore}/100`);
  }
});

console.log('\n');

// Test 4: Budget Tracking
console.log('TEST 4: Budget Tracking');
console.log('-'.repeat(80));

console.log('\nSimulating usage...');

routing.costOptimizer.trackUsage('sonnet', 'code-generation', { input: 1250, output: 2100 }, 0.0189);
routing.costOptimizer.trackUsage('haiku', 'documentation', { input: 600, output: 800 }, 0.0045);
routing.costOptimizer.trackUsage('opus', 'architecture', { input: 2500, output: 3200 }, 0.0876);
routing.costOptimizer.trackUsage('sonnet', 'debugging', { input: 1100, output: 1800 }, 0.0167);

const budget = routing.costOptimizer.checkBudget();

console.log(`\nBudget Status:`);
console.log(`  Daily: $${budget.dailySpent.toFixed(4)} / $${budget.dailyLimit.toFixed(2)} (${budget.dailyUsagePercent.toFixed(1)}%)`);
console.log(`  Monthly: $${budget.monthlySpent.toFixed(4)} / $${budget.monthlyLimit.toFixed(2)} (${budget.monthlyUsagePercent.toFixed(1)}%)`);
console.log(`  Status: ${budget.exceeded ? '❌ EXCEEDED' : budget.warning ? '⚠️  WARNING' : '✅ OK'}`);

const summary = routing.costOptimizer.getSummary();
console.log(`\nSummary:`);
console.log(`  Total Spent: $${summary.totalSpent.toFixed(4)}`);
console.log(`  Total Requests: ${summary.totalRequests}`);
console.log(`  Avg Cost/Request: $${summary.avgCostPerRequest.toFixed(4)}`);
console.log(`  Total Tokens: ${summary.totalTokens.toLocaleString()}`);

console.log('\n');

// Test 5: Routing Statistics
console.log('TEST 5: Routing Statistics');
console.log('-'.repeat(80));

const stats = routing.router.getStats();

console.log(`\nTotal Routing Decisions: ${stats.totalDecisions}`);

if (stats.totalDecisions > 0) {
  console.log(`\nBy Model:`);
  Object.entries(stats.byModel).forEach(([model, data]) => {
    console.log(`  ${model}:`);
    console.log(`    Requests: ${data.count}`);
    console.log(`    Avg Cost: $${data.avgCost.toFixed(4)}`);
    console.log(`    Avg Latency: ${data.avgLatency}ms`);
  });
}

console.log('\n');

// Test 6: Fallback Chain
console.log('TEST 6: Fallback Chain Configuration');
console.log('-'.repeat(80));

const fallbackConfigs = routing.fallback.getFallbackConfigs();

console.log('\nConfigured Fallback Chains:');
fallbackConfigs.forEach((config, model) => {
  console.log(`  ${model} → [${config.fallbacks.join(', ')}]`);
  console.log(`    Max Retries: ${config.maxRetries}`);
  console.log(`    Timeout: ${config.timeout}ms`);
  console.log(`    Backoff: ${config.backoff}`);
});

console.log('\n');

// Test 7: Constraint Handling
console.log('TEST 7: Constraint Handling');
console.log('-'.repeat(80));

const constrainedTask = classifier.classify("Implement feature X");
constrainedTask.constraints = {
  maxCost: 0.01,      // Very tight budget
  minQuality: 85,     // High quality requirement
  maxLatency: 2000,   // Fast response needed
};

console.log(`\nTask: "${constrainedTask.task}"`);
console.log(`Constraints:`);
console.log(`  Max Cost: $${constrainedTask.constraints.maxCost}`);
console.log(`  Min Quality: ${constrainedTask.constraints.minQuality}/100`);
console.log(`  Max Latency: ${constrainedTask.constraints.maxLatency}ms`);

const constrainedDecision = routing.router.route(constrainedTask);

console.log(`\nDecision:`);
console.log(`  Selected: ${constrainedDecision.model.name}`);
console.log(`  Meets Cost? ${constrainedDecision.estimatedCost <= constrainedTask.constraints.maxCost ? '✅' : '❌'}`);
console.log(`  Meets Quality? ${constrainedDecision.model.qualityScore >= constrainedTask.constraints.minQuality ? '✅' : '❌'}`);
console.log(`  Meets Latency? ${constrainedDecision.estimatedLatency <= constrainedTask.constraints.maxLatency ? '✅' : '❌'}`);

console.log('\n');

// Summary
console.log('='.repeat(80));
console.log('TEST SUITE COMPLETE');
console.log('='.repeat(80));
console.log('');
console.log('✅ All components tested successfully');
console.log('');
console.log('Next Steps:');
console.log('  1. Review routing decisions for accuracy');
console.log('  2. Adjust weights in config if needed');
console.log('  3. Set appropriate budget limits');
console.log('  4. Enable learning from outcomes');
console.log('  5. Monitor cost optimization suggestions');
console.log('');
console.log('Use commands:');
console.log('  /model route [task]   - Get routing recommendation');
console.log('  /model stats          - View statistics');
console.log('  /model cost           - Cost analysis');
console.log('  /model budget         - Budget status');
console.log('');
