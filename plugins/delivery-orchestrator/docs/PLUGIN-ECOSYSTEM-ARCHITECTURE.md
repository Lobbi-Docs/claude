# Plugin Ecosystem Architecture v2.0.0

**Central Brain:** Jira Orchestrator | **Plugins:** 14 | **Agents:** 175+ | **Commands:** 170+

## System Overview

**Vision:** Jira Orchestrator acts as central intelligence routing to specialized plugins via event-driven messaging.

**Key Principles:**
1. Centralized Intelligence - Jira Orchestrator owns routing
2. Plugin Autonomy - Each manages domain expertise
3. Loose Coupling - Standard protocols for communication
4. Fault Tolerance - Circuit breakers and graceful degradation
5. Observable - Full telemetry and tracing

## Plugin Taxonomy

| Plugin | Agents | Commands | Specialization |
|--------|--------|----------|----------------|
| **jira-orchestrator** | 82 | 47 | Central routing, Jira workflows, portfolio mgmt |
| **exec-automator** | 12 | 14 | Nonprofit/association executive automation |
| **home-assistant-architect** | 16 | 10 | Home automation, Ollama, IoT |
| **frontend-design-system** | 7 | 9 | 263+ design styles, Keycloak theming |
| **lobbi-platform-manager** | 5 | 9 | Keycloak, multi-tenant, MERN |
| **aws-eks-helm-keycloak** | 5 | 8 | AWS EKS + Helm + Keycloak + Harness CI/CD |
| **tvs-microsoft-deploy** | 19 | 18 | Microsoft ecosystem orchestrator |
| **fastapi-backend** | 5 | 11 | FastAPI + MongoDB + Keycloak + K8s |
| **fullstack-iac** | 3 | 9 | Full-stack + Terraform/Ansible/K8s IaC |
| **marketplace-pro** | 2 | 13 | Plugin marketplace + supply chain security |
| **deployment-pipeline** | 4 | 6 | State-machine Harness CD pipeline |
| **claude-code-templating-plugin** | 8 | 6 | Universal templating + Harness pipelines |
| **react-animation-studio** | 7 | 13 | React animations (Framer, GSAP) |
| **team-accelerator** | 7 | 9 | Enterprise team DevOps toolkit |

## Architecture Layers

```
Layer 4: User Interface (CLI Commands, Skills, Direct Agent Calls)
Layer 3: Meta-Controller (Jira Orchestrator - Request Classifier, Capability Matcher, Chain Executor)
Layer 2: Communication (Message Bus, State Store)
Layer 1: Plugin Domain Layer (Specialized Plugins)
```

## Inter-Plugin Communication

### Message Bus Architecture
- **Topics:** system/*, plugin/{name}/*, routing/*, orchestration/*
- **Patterns:** Request/Response, Publish/Subscribe, RPC
- **Format:** JSON with messageId, correlationId, timestamp, headers, payload

### Communication Patterns

**Request/Response:**
```typescript
const response = await messagebus.request({
  destination: "exec-automator",
  topic: "plugin/exec-automator/request",
  payload: { command: "analyze_document", parameters: {...} },
  timeout: 30000
});
```

**Publish/Subscribe:**
```typescript
messagebus.publish({
  topic: "orchestration/task-complete",
  messageType: "event",
  payload: { taskId: "task-123", result: {...} }
});
```

**RPC Pattern:**
```typescript
const rpcClient = new RPCClient("plugin://frontend-design-system/rpc");
const result = await rpcClient.call("generate_component", params);
```

## Meta-Controller (Routing Engine)

### Routing Components
1. **Request Classifier** - Parse intent, extract context, classify domain
2. **Capability Matcher** - Score plugins by relevance, check health
3. **Routing Decision Engine** - Select primary, identify fallbacks, plan collaboration
4. **Chain Executor** - Execute sequential/parallel/conditional/saga chains
5. **Circuit Breaker** - Monitor failures, manage state transitions
6. **Telemetry Tracker** - Log routing decisions, track metrics

### Routing Decision Output
```json
{
  "primaryPlugin": "fastapi-backend",
  "fallbackPlugins": ["lobbi-platform-manager", "jira-orchestrator"],
  "collaborationPlan": { "phases": [...], "coordinator": "jira-orchestrator" },
  "executionStrategy": "sequential_collaboration",
  "estimatedCost": 0.15,
  "estimatedDuration": 2100000
}
```

## Agent Registry System

**Unified Registry Entry:**
- id, name, plugin, category, capabilities, specializations
- model (opus/sonnet/haiku), costPerTask, averageDuration, successRate
- status (available/busy/offline), metadata

**Dynamic Discovery:** Cross-plugin agent searching with capability matching, keyword extraction, context pattern matching.

## State Management

### Distributed State Architecture
- **Layer 1:** Local Plugin State (SQLite per plugin)
- **Layer 2:** Shared State Store (Central SQLite + WAL)
- **Layer 3:** Hot Cache (Redis - optional)

### Conflict Resolution via CRDTs
- LWWRegister (Last-Write-Wins)
- GCounter (Grow-only Counter)
- ORSet (Observed-Remove Set)

### Central State Schema
Tables: plugins, tasks, agents, shared_context, routing_decisions, distributed_locks, events

## Error Handling

### Circuit Breaker
- States: CLOSED, OPEN, HALF_OPEN
- Config: threshold, timeout, halfOpenRetries, monitoringWindow
- Graceful degradation on failure

### Retry Policy
- Backoff strategies: linear, exponential, fibonacci
- Retryable error detection, configurable delays

### Graceful Degradation
Primary operation → Fallback chain → Default result

## Command Chaining

1. **Sequential Chain** - Steps execute in order with conditions/transforms
2. **Parallel Chain** - All steps execute simultaneously with timeout
3. **Conditional Chain** - True/false branch execution
4. **Saga Pattern** - Transaction with compensating actions for rollback

## Implementation Roadmap

| Phase | Duration | Goals |
|-------|----------|-------|
| 1 | Weeks 1-2 | Message Bus, Plugin Manifest, State DB |
| 2 | Weeks 3-4 | Routing Engine, Classifier, Matcher |
| 3 | Weeks 5-6 | Agent Registry, Discovery Service |
| 4 | Weeks 7-8 | Circuit Breaker, Retry Policies |
| 5 | Weeks 9-10 | Chain Implementations, Orchestration |
| 6 | Weeks 11-12 | Testing (90% coverage), Documentation |
| 7 | Weeks 13-14 | Plugin Migration, Production Deployment |

## Summary

This architecture provides:
- Centralized Intelligence via Jira Orchestrator
- Plugin Autonomy with Message Bus communication
- Unified Agent Discovery across all plugins
- Distributed State with CRDT conflict resolution
- Resilient Execution (circuit breakers, retries, degradation)
- Complex Workflows (sequential, parallel, conditional, saga)
- Full Observability with telemetry and tracing

**Status:** Active | **Version:** 2.0.0 | **Last Updated:** 2026-02-25
