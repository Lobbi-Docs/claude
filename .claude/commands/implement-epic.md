# /implement-epic

Execute an entire epic with full orchestration, dependency management, quality gates, and real-time progress tracking.

## Usage

\`\`\`bash
/implement-epic <epic-id> [--dry-run] [--resume-from=checkpoint-id]
\`\`\`

## Parameters

- `epic-id` (required): Epic identifier (e.g., `epic-2-net-orchestration`)
- `--dry-run` (optional): Preview execution plan without running tasks
- `--resume-from` (optional): Resume from specific checkpoint after failure

## What This Command Does

This command orchestrates the complete execution of an epic using the **workflow-orchestrator** agent with the following capabilities:

### 1. **Planning Phase**
- Load epic definition from workflow DSL (YAML/JSON)
- Build dependency graph (DAG) and calculate critical path
- Assign agents to tasks based on capabilities
- Estimate timeline with P10/P50/P90 projections
- Validate pre-epic quality gates

### 2. **Execution Phase**
- Execute tasks according to workflow pattern (Sequential/Parallel/Saga)
- Coordinate multi-agent communication via SignalR
- Manage distributed state with Cosmos DB + event sourcing
- Enforce quality gates at task, phase, and epic levels
- Handle retries with exponential backoff
- Create automatic checkpoints for recovery

### 3. **Monitoring Phase**
- Real-time progress dashboard showing:
  - Current phase and task status
  - Agent utilization and workloads
  - Blocked tasks waiting on dependencies
  - ETA based on actual vs estimated time
  - Critical path delays
- OpenTelemetry distributed tracing
- Prometheus metrics (task duration, success rate, agent utilization)

### 4. **Quality Assurance Phase**
- Post-task quality gates:
  - `senior-reviewer`: Code quality assessment
  - `security-specialist`: Security vulnerability scan
  - `test-engineer`: Test coverage validation (≥85%)
  - `performance-optimizer`: Performance benchmarks (P95 <500ms)
- Blocking vs non-blocking gates configurable per task
- Automatic rollback on blocking failure (if Saga pattern)

### 5. **Adaptive Re-planning**
- Triggers re-planning when:
  - Task fails with no retries left
  - Quality gate blocking failure
  - Execution time exceeds estimate by >20%
  - Agent unavailable or timeout
- Re-planning strategies:
  - Alternative agent assignment
  - Parallel path exploration
  - Timeline extension with stakeholder approval

### 6. **Completion Phase**
- Validate post-epic quality gates
- Generate execution report with:
  - Completed vs failed tasks
  - Total execution time vs estimate
  - Resource utilization statistics
  - Quality gate results
  - Lessons learned and optimizations

## Workflow Patterns Supported

### Sequential
Tasks execute one after another. Ideal for deployment pipelines.
\`\`\`yaml
pattern: sequential
phases:
  - phase: 1
    tasks: [task-1, task-2, task-3]  # Run in order
\`\`\`

### Parallel
Independent tasks run concurrently. Ideal for multi-service builds.
\`\`\`yaml
pattern: parallel
phases:
  - phase: 1
    tasks: [task-1, task-2, task-3]  # All run simultaneously
\`\`\`

### Saga
Distributed transactions with compensation/rollback on failure.
\`\`\`yaml
pattern: saga
tasks:
  - id: deploy-service
    compensation: rollback-deployment
  - id: update-database
    compensation: revert-schema
\`\`\`

## Example Workflows

### Example 1: Implement Epic 2 (.NET Orchestration)

\`\`\`bash
/implement-epic epic-2-net-orchestration
\`\`\`

**Output:**
\`\`\`
🎯 Epic: .NET Orchestration Service
📋 Pattern: Sequential with quality gates
⏱️  Estimated: 6-10 weeks (P50: 8 weeks)

Phase 1: Core Orchestration Engine
├─ ✓ Task 2.1.1: Implement MetaAgentOrchestrator (code-generator-typescript)
│  ├─ ✓ Code generation complete (16h actual vs 16h estimated)
│  ├─ ✓ Quality gate: senior-reviewer PASSED
│  └─ ✓ Quality gate: security-specialist PASSED (0 critical, 1 medium documented)
├─ ✓ Task 2.1.2: Implement WorkflowExecutor (code-generator-typescript)
│  ├─ ✓ Code generation complete (28h actual vs 24h estimated)
│  ├─ ⚠️  Quality gate: test-engineer WARNING (coverage 82% < 85% target)
│  └─ 🔄 Generating additional tests to reach 85% coverage...
├─ ✓ Additional tests generated, coverage now 87%
└─ ✓ Phase 1 complete (4.5 weeks actual vs 2-3 weeks estimated)

Phase 2: SignalR Integration
├─ 🔄 Task 2.2.1: Implement MetaAgentHub (code-generator-typescript) [IN PROGRESS]
│  └─ ETA: 10h remaining
├─ ⏳ Task 2.2.2: Add connection management [PENDING - blocked by 2.2.1]
└─ ⏳ Task 2.2.3: Implement real-time events [PENDING - blocked by 2.2.1]

📊 Progress: 38% complete (2/6 tasks done)
⏱️  ETA: 4.2 weeks remaining (based on current velocity)
🎯 Critical Path: Task 2.2.1 → 2.2.2 → 2.3.1 → 2.3.2
⚠️  Delay: +1.5 weeks due to Task 2.1.2 complexity

💡 Recommendation: Consider parallelizing tasks 2.2.2 and 2.2.3 (independent after 2.2.1)
\`\`\`

### Example 2: Resume from Checkpoint

\`\`\`bash
/implement-epic epic-2-net-orchestration --resume-from=checkpoint-2024-10-08-14-30
\`\`\`

**Output:**
\`\`\`
🔄 Resuming epic from checkpoint: checkpoint-2024-10-08-14-30
📍 Resuming at: Phase 2, Task 2.2.1 (MetaAgentHub implementation)
✓ State restored from event sourcing log
✓ 2 tasks already completed, skipping
🎯 Continuing execution...
\`\`\`

### Example 3: Dry Run (Preview Plan)

\`\`\`bash
/implement-epic epic-3-python-agents --dry-run
\`\`\`

**Output:**
\`\`\`
🔍 DRY RUN - Preview Only (no tasks will be executed)

Epic: Python Meta-Agents Service
Pattern: Parallel with iterative quality improvement
Estimated Timeline: 4-6 weeks (P50: 5 weeks)

Dependency Graph:
\`\`\`
task-3.1.1 (BaseAgent)
├─> task-3.1.2 (ArchitectAgent) [parallel start]
├─> task-3.1.3 (BuilderAgent)    [parallel start]
├─> task-3.1.4 (ValidatorAgent)  [parallel start]
└─> task-3.1.5 (ScribeAgent)     [parallel start]
    └─> task-3.2.1 (FastAPI routes) [waits for all 4 agents]
        └─> task-3.3.1 (Integration tests)
\`\`\`

Critical Path: 3.1.1 → 3.1.2 → 3.2.1 → 3.3.1 (3.5 weeks)
Parallelization Opportunity: Tasks 3.1.2-3.1.5 can run concurrently (saves 2.5 weeks)

Agent Assignment:
- code-generator-python: 5 tasks (est. 72h)
- test-engineer: 2 tasks (est. 28h)
- senior-reviewer: 5 reviews (est. 10h)

Quality Gates:
✓ Pre-epic: infrastructure-deployed, cosmos-db-available
✓ Post-task: test-coverage ≥85%, security-scan clean
✓ Post-epic: integration-tests passing, performance P95 <500ms

💡 This epic is optimized for parallel execution
⏱️  Sequential execution: 7 weeks → Parallel execution: 4.5 weeks (36% faster)
\`\`\`

## Quality Gate Configuration

Quality gates are enforced at multiple stages:

### Pre-Task Gates
- Validate preconditions (dependencies met, resources available)
- Check configuration validity
- Verify agent availability

### Post-Task Gates
\`\`\`yaml
postTask:
  - validator: senior-reviewer
    action: code-review
    blocking: true  # Block next task if failed

  - validator: security-specialist
    action: security-scan
    blocking: true
    conditions:
      - criticalVulnerabilities == 0
      - highVulnerabilities == 0

  - validator: test-engineer
    action: coverage-check
    blocking: true
    conditions:
      - testCoverage >= 85%

  - validator: performance-optimizer
    action: benchmark
    blocking: false  # Warning only
    conditions:
      - latencyP95 < 500ms
\`\`\`

### Post-Epic Gates
- Comprehensive integration testing
- Full security audit
- Performance validation
- Documentation completeness check

## Adaptive Re-planning Example

\`\`\`
⚠️  BLOCKER DETECTED: Task 2.1.2 exceeded estimate by 25% (28h vs 24h estimated)

🤔 Analyzing impact on critical path...
✓ Critical path delayed by 4 hours
✓ Epic timeline now: 8.4 weeks (P50) vs original 8.0 weeks

🔄 Re-planning options:
1. Continue as planned (accept 0.4 week delay)
2. Parallelize tasks 2.2.2 and 2.2.3 (recover 0.5 weeks)
3. Assign additional agent to Task 2.3.1 (recover 0.3 weeks)

💡 Recommended: Option 2 (parallelize 2.2.2 and 2.2.3)
   - Risk: Low (tasks are independent)
   - Savings: 0.5 weeks
   - New timeline: 7.9 weeks (ahead of original estimate)

🎯 Applying re-plan...
✓ Dependency graph updated
✓ Agent assignments recalculated
✓ ETA updated: 7.9 weeks
\`\`\`

## Integration with Existing Agents

This command coordinates the following agents:

### Strategic Layer
- `master-strategist`: High-level orchestration and re-planning
- `architect-supreme`: Architecture validation and design review

### Tactical Layer
- `workflow-orchestrator`: Core execution engine (primary)
- `plan-decomposer`: Task breakdown validation
- `resource-allocator`: Agent assignment optimization
- `state-synchronizer`: Distributed state consistency
- `conflict-resolver`: Inter-agent conflict mediation

### Operational Layer
- `code-generator-typescript`: .NET code generation
- `code-generator-python`: Python code generation
- `frontend-engineer`: React UI implementation
- `database-architect`: Database schema design
- `devops-automator`: Infrastructure automation

### Quality/Security Layer
- `test-engineer`: Test suite generation and execution
- `senior-reviewer`: Code quality review
- `security-specialist`: Security vulnerability scanning
- `performance-optimizer`: Performance benchmarking
- `compliance-orchestrator`: Regulatory compliance validation

## Monitoring & Observability

Real-time monitoring via:
- **Grafana Dashboard**: Task status, agent utilization, ETA
- **Jaeger**: Distributed tracing of agent communication
- **Prometheus**: Metrics (task duration, success rate, quality gate results)
- **Application Insights**: Structured logs with correlation IDs

## State Management

- **Persistence**: Cosmos DB with event sourcing
- **Checkpoints**: Automatic after each task completion
- **Recovery**: Resume from latest or specific checkpoint
- **Audit Trail**: Complete event log for compliance

## Best Practices

1. **Start with --dry-run** to preview execution plan
2. **Review quality gate configuration** before execution
3. **Monitor critical path** during execution for delays
4. **Use checkpoints** for long-running epics (>1 week)
5. **Enable adaptive re-planning** for flexible timeline management
6. **Review execution report** after completion for lessons learned

## Troubleshooting

### Epic Fails to Start
- Check pre-epic quality gates (infrastructure deployed, dependencies available)
- Validate epic definition YAML/JSON syntax
- Verify agent availability

### Task Hangs or Times Out
- Check agent logs for errors
- Verify network connectivity to Azure services
- Review task timeout configuration
- Use `/monitor-workflow <epic-id>` for real-time debugging

### Quality Gate Failures
- Review quality gate logs for specific failures
- Use `--resume-from` to retry after fixing issues
- Adjust quality gate thresholds if too aggressive

### Re-planning Not Triggering
- Verify `adaptiveReplanning.triggers` configuration
- Check if deviation exceeds threshold (default 20%)
- Review `workflow-orchestrator` logs for re-planning attempts

## Related Commands

- `/test-epic <epic-id>`: Generate comprehensive test suite for epic
- `/deploy-epic <epic-id> <env>`: Deploy epic to environment
- `/monitor-workflow <epic-id>`: Real-time workflow monitoring dashboard
- `/debug-workflow <epic-id>`: Interactive debugging with time-travel
- `/code-review-epic <epic-id>`: Comprehensive code review

## See Also

- [Workflow DSL Guide](../docs/workflow-dsl.md)
- [Quality Gates Reference](../docs/quality-gates.md)
- [Orchestration Patterns](../docs/orchestration-patterns.md)
- [Agent Communication Protocols](../docs/agent-communication.md)
