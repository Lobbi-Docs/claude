# Complex Reasoning Skill

Structured reasoning frameworks for systematic problem solving with mandatory documentation lookup.

## Overview

This skill provides multiple reasoning frameworks that ALWAYS:
1. Query Context7 for up-to-date documentation before reasoning
2. Use Sequential Thinking MCP for structured thought chains
3. Store insights in Memory MCP for organizational learning

## Available Frameworks

### 1. Chain-of-Thought (CoT)
**Use When**: Linear, sequential problems
**Agent**: `chain-of-thought-reasoner`
**Process**:
1. Query documentation for all technologies involved
2. Break problem into sequential steps
3. Analyze each step with doc references
4. Synthesize solution

### 2. Tree-of-Thought (ToT)
**Use When**: Multiple valid approaches exist
**Agent**: `tree-of-thought-reasoner`
**Process**:
1. Query documentation for each alternative
2. Create evaluation matrix
3. Score alternatives against criteria
4. Select with documented rationale

### 3. Hypothesis-Driven Debugging
**Use When**: Complex bugs, unclear root cause
**Agent**: `hypothesis-debugger`
**Process**:
1. Query documentation for expected behavior
2. Generate ranked hypotheses
3. Test systematically
4. Document root cause

### 4. Root Cause Analysis
**Use When**: Incidents, systemic issues
**Agent**: `root-cause-analyzer`
**Process**:
1. Gather all documentation
2. Apply 5 Whys, Fishbone analysis
3. Identify true root cause
4. Create prevention plan

## Usage

### Invoke from Command Line
```bash
# Chain-of-thought reasoning
/jira:reason --framework=cot --issue=PROJ-123

# Tree-of-thought for decisions
/jira:reason --framework=tot --issue=PROJ-123

# Hypothesis debugging
/jira:reason --framework=debug --issue=PROJ-123

# Root cause analysis
/jira:reason --framework=rca --incident=INC-456
```

### Invoke from Agent
```typescript
// Select framework automatically based on problem type
const framework = selectReasoningFramework(problem);
const agent = await spawnAgent(framework.agent, {
  problem: problem,
  issue: issueKey,
  autoDocLookup: true
});
```

## Documentation-First Protocol

**MANDATORY**: Before ANY reasoning about technology:

```typescript
// 1. Resolve library ID
const libraryId = await resolveLibraryId({
  libraryName: "react",
  query: "How to handle state in React components"
});

// 2. Query documentation
const docs = await queryDocs({
  libraryId: libraryId,
  query: "useState hooks best practices"
});

// 3. Ground reasoning in documentation
// Every conclusion must reference documentation
```

## Sequential Thinking Integration

Use structured thought chains:

```typescript
// Start reasoning
await sequentialthinking({
  thought: "Step 1: Based on Context7 documentation...",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
});

// Revise if needed
await sequentialthinking({
  thought: "Revising Step 2: New documentation shows...",
  thoughtNumber: 3,
  totalThoughts: 6,
  isRevision: true,
  revisesThought: 2,
  nextThoughtNeeded: true
});

// Branch for alternatives
await sequentialthinking({
  thought: "Alternative approach: Documentation suggests...",
  thoughtNumber: 4,
  totalThoughts: 6,
  branchFromThought: 2,
  branchId: "alternative-a",
  nextThoughtNeeded: true
});
```

## Memory Integration

Store and retrieve insights:

```typescript
// Check for related past reasoning
const pastInsights = await searchNodes({
  query: `${technology} ${problemType}`
});

// Store new insights
await createEntities({
  entities: [{
    name: `reasoning-${issueKey}-${Date.now()}`,
    entityType: "ReasoningChain",
    observations: [
      `Problem: ${problemSummary}`,
      `Solution: ${solutionSummary}`,
      `Key Insight: ${keyInsight}`,
      `Documentation: ${docReferences}`
    ]
  }]
});

// Link related reasoning
await createRelations({
  relations: [{
    from: `reasoning-${issueKey}`,
    relationType: "builds_on",
    to: `reasoning-${relatedIssue}`
  }]
});
```

## Templates

### Chain-of-Thought Template
Location: `templates/reasoning/chain-of-thought.md`

### Decision Matrix Template
Location: `templates/reasoning/decision-matrix.md`

### Root Cause Analysis Template
Location: `templates/reasoning/root-cause-analysis.md`

## Best Practices

1. **Always Query Documentation First**
   - Never assume API behavior
   - Check for version-specific changes
   - Look for deprecation warnings

2. **Make Reasoning Traceable**
   - Reference documentation in each step
   - Link conclusions to evidence
   - Store in memory for future use

3. **Use Appropriate Framework**
   - CoT for linear problems
   - ToT for decisions with alternatives
   - Hypothesis for debugging
   - RCA for systemic issues

4. **Build on Past Insights**
   - Search memory before starting
   - Link related reasoning chains
   - Learn from past successes/failures

5. **Quantify Confidence**
   - State confidence level
   - Identify uncertainties
   - Flag when human review needed

## Configuration

See: `config/reasoning/reasoning-config.yaml`

Key settings:
- `documentation_first.enabled`: true (mandatory)
- `sequential_thinking.budgets`: Token budgets by complexity
- `memory.auto_store`: true (automatic insight storage)

## Keywords

reasoning, problem-solving, chain-of-thought, tree-of-thought, hypothesis,
debugging, root-cause, analysis, systematic, documentation, context7,
sequential-thinking, memory, learning
