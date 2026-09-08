# Temporal Workflow Setup - Jira Orchestrator

**Version:** 7.5.0
**Date:** 2025-01-19
**Status:** Production Ready

---

## Overview

The Jira Orchestrator uses **Temporal Cloud** for durable workflow orchestration. This provides:

- **Durable Execution** - Workflows survive crashes, restarts, and deployments
- **Automatic Retries** - Built-in retry logic with exponential backoff
- **Time-Travel Debugging** - Replay any workflow execution for debugging
- **Long-Running Workflows** - Handle workflows that take hours/days
- **State Persistence** - No manual checkpointing needed

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Temporal Cloud                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Namespace: jira-orchestrator.h9cfi      │   │
│  │              Region: us-west-2                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│              ┌────────────┼────────────┐                    │
│              ▼            ▼            ▼                    │
│         Workflows    Activities    History                  │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │ Worker │   │ Client │   │   UI   │
         └────────┘   └────────┘   └────────┘
```

---

## Configuration

### Environment Variables

```bash
# Temporal Cloud Configuration
TEMPORAL_ADDRESS=us-west-2.aws.api.temporal.io:7233
TEMPORAL_NAMESPACE=jira-orchestrator.h9cfi
TEMPORAL_API_KEY=<your-api-key>
TEMPORAL_TASK_QUEUE=jira-orchestration

# Feature Flag
FEATURE_TEMPORAL_ENABLED=true
```

### Temporal Cloud Dashboard

Access your workflows at: https://cloud.temporal.io

---

## 6-Phase Workflow

The orchestration workflow implements the standard protocol:

```
┌─────────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌─────┐    ┌──────────┐
│ EXPLORE │───▶│ PLAN │───▶│ CODE │───▶│ TEST │───▶│ FIX │───▶│ DOCUMENT │
└─────────┘    └──────┘    └──────┘    └──────┘    └─────┘    └──────────┘
     │              │                       │           │
     ▼              ▼                       ▼           ▼
 [Wait for     [Wait for              [If tests    [Retry up
  approval]     approval]              failed]      to 3x]
```

### Phase Details

| Phase | Duration | Activities | Agents Invoked |
|-------|----------|------------|----------------|
| **EXPLORE** | ~10 min | `exploreIssue` | triage-agent, requirements-analyzer |
| **PLAN** | ~15 min | `planImplementation` | planner, architect, task-enricher |
| **CODE** | ~30 min | `executeCode` | code-implementer, commit-tracker |
| **TEST** | ~10 min | `runTests` | test-runner, coverage-analyzer |
| **FIX** | ~15 min | `fixIssues` | bug-fixer, code-reviewer |
| **DOCUMENT** | ~10 min | `documentWork` | docs-writer, confluence-manager |

---

## Usage

### Starting a Workflow

```typescript
import { startOrchestration } from './lib/temporal';

// Start a new orchestration
const { workflowId, runId } = await startOrchestration({
  issueKey: 'PROJ-123',
  projectKey: 'PROJ',
  createdBy: 'user@example.com',
  autoProceed: false, // Require manual approval between phases
});

console.log(`Started workflow: ${workflowId}`);
```

### Querying Workflow State

```typescript
import { queryWorkflowState, getWorkflowHandle } from './lib/temporal';

// Get current state
const state = await queryWorkflowState(workflowId);
console.log(`Current phase: ${state.currentPhase}`);
console.log(`Status: ${state.status}`);

// Get full workflow handle
const handle = await getWorkflowHandle(workflowId);
const description = await handle.describe();
```

### Signaling Workflows

```typescript
import { signalProceed, signalPause, cancelWorkflow } from './lib/temporal';

// Approve and proceed to next phase
await signalProceed(workflowId);

// Pause workflow
await signalPause(workflowId);

// Cancel workflow
await cancelWorkflow(workflowId);
```

### Running the Worker

```bash
# Start the worker process
npm run temporal:worker

# Or with tsx directly
npx tsx lib/worker.ts
```

---

## Workflow Features

### Automatic Retries

Activities are automatically retried with exponential backoff:

```typescript
const activities = proxyActivities({
  startToCloseTimeout: '2 hours',
  retry: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: '5 minutes',
    nonRetryableErrorTypes: ['ValidationError', 'AuthenticationError'],
  },
});
```

### Manual Approval Gates

When `autoProceed: false`, the workflow waits for approval signals:

```typescript
// In workflow
if (!autoProceed) {
  await addJiraComment(issueKey, '⏸️ Waiting for approval to proceed.');
  await condition(() => proceedRequested, '7 days');
}

// Signal to proceed
await signalProceed(workflowId);
```

### Checkpoints

State is automatically saved after each phase:

```typescript
await saveCheckpoint(issueKey, phase, state);
```

### Error Handling

Failed workflows:
1. Update Jira status to "Blocked"
2. Add comment with error details
3. Notify stakeholders
4. Preserve workflow history for debugging

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run temporal:worker` | Start the Temporal worker |
| `npm run temporal:start` | Start a test orchestration |

---

## Monitoring

### Temporal Cloud UI

1. Go to https://cloud.temporal.io
2. Select namespace `jira-orchestrator.h9cfi`
3. View running/completed/failed workflows
4. Inspect workflow history
5. Replay failed workflows

### Key Metrics

- **Workflow execution time** - Total time from start to completion
- **Activity latency** - Time per activity execution
- **Retry count** - Number of retries per activity
- **Failure rate** - Percentage of failed workflows

---

## Troubleshooting

### Worker Not Connecting

```bash
# Verify environment variables
echo $TEMPORAL_ADDRESS
echo $TEMPORAL_NAMESPACE

# Test connection
npx tsx -e "
  import { getConnection } from './lib/temporal';
  await getConnection();
  console.log('Connected!');
"
```

### Workflow Stuck

1. Check Temporal UI for pending activities
2. Query workflow state: `await queryWorkflowState(workflowId)`
3. Check worker logs for errors
4. Signal proceed if waiting for approval

### Activity Failures

1. Check Temporal UI for activity history
2. View error details in workflow timeline
3. Check activity retry configuration
4. Verify external services (Jira, database) are available

---

## Best Practices

1. **Keep activities idempotent** - Same input should produce same output
2. **Use deterministic workflow code** - No random, no time-based logic in workflows
3. **Handle signals properly** - Don't block indefinitely without timeout
4. **Monitor worker health** - Ensure workers are running and processing
5. **Use appropriate timeouts** - Balance between retry attempts and failure detection

---

## Security

- **API Key**: Store in `.env`, never commit to version control
- **TLS**: Always enabled for Temporal Cloud
- **Namespace isolation**: Each namespace is isolated
- **Audit logs**: Workflow history provides full audit trail

---

## Cost Considerations

### Temporal Cloud Pricing

- **Starter**: $25/month - 1M actions, 1 namespace
- **Growth**: $200/month - 10M actions, multiple namespaces
- **Enterprise**: Custom pricing

### Optimization Tips

1. Batch related operations into single activities
2. Use appropriate activity timeouts
3. Avoid unnecessary workflow signals
4. Archive completed workflows

---

## Next Steps

1. **Integrate with agents** - Connect activities to actual agent invocations
2. **Add observability** - Set up metrics and alerting
3. **Create approval UI** - Build interface for manual approvals
4. **Add workflow versioning** - Plan for workflow updates

---

**Golden Armada** | *You ask - The Fleet Ships*
