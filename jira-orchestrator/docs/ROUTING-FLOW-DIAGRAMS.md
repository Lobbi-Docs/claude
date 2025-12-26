# Routing Flow Diagrams

## 1. Request Classification & Routing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER REQUEST                                       │
│  "Build a FastAPI endpoint with MongoDB, Keycloak auth, and deploy to K8s" │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JIRA ORCHESTRATOR - META-CONTROLLER                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: REQUEST CLASSIFIER                                         │    │
│  │                                                                     │    │
│  │  Input Analysis:                                                   │    │
│  │  ├─ Keywords: ["fastapi", "mongodb", "keycloak", "k8s"]          │    │
│  │  ├─ File Context: None                                            │    │
│  │  └─ Patterns: ["rest-api", "jwt-auth", "deployment"]             │    │
│  │                                                                     │    │
│  │  Classification Result:                                            │    │
│  │  ├─ Domains: [backend, api, database, auth, devops]              │    │
│  │  ├─ Complexity: COMPLEX (multi-domain, multi-step)                │    │
│  │  ├─ Urgency: 5/10                                                 │    │
│  │  └─ Est. Duration: 45 minutes                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 2: CAPABILITY MATCHER                                         │    │
│  │                                                                     │    │
│  │  Plugin Scoring:                                                   │    │
│  │                                                                     │    │
│  │  fastapi-backend (Score: 95)                                       │    │
│  │  ├─ Domain: backend (30 pts)                                      │    │
│  │  ├─ Context: fastapi (20 pts)                                     │    │
│  │  ├─ Context: mongodb (20 pts)                                     │    │
│  │  ├─ Pattern: rest-api (15 pts)                                    │    │
│  │  ├─ Priority: 100/100 (×1.0)                                      │    │
│  │  └─ Availability: 98% (×0.98) → Final: 93.1                       │    │
│  │                                                                     │    │
│  │  lobbi-platform-manager (Score: 75)                                │    │
│  │  ├─ Domain: authentication (30 pts)                               │    │
│  │  ├─ Context: keycloak (20 pts)                                    │    │
│  │  ├─ Pattern: jwt-auth (15 pts)                                    │    │
│  │  └─ Final: 75.0                                                   │    │
│  │                                                                     │    │
│  │  ahling-command-center (Score: 68)                                 │    │
│  │  ├─ Domain: devops (30 pts)                                       │    │
│  │  ├─ Context: kubernetes (20 pts)                                  │    │
│  │  └─ Final: 68.0                                                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 3: ROUTING DECISION ENGINE                                    │    │
│  │                                                                     │    │
│  │  Decision:                                                         │    │
│  │  ├─ Primary: fastapi-backend                                      │    │
│  │  ├─ Fallbacks: [lobbi-platform, ahling-command, jira-orch]       │    │
│  │  └─ Collaboration: REQUIRED (multi-domain)                        │    │
│  │                                                                     │    │
│  │  Collaboration Plan:                                               │    │
│  │  ┌──────────────────────────────────────────────────────────┐    │    │
│  │  │ Phase 1: Backend Development (fastapi-backend)           │    │    │
│  │  │  - Create FastAPI endpoint                               │    │    │
│  │  │  - Setup MongoDB models                                  │    │    │
│  │  │  - Define API schema                                     │    │    │
│  │  │  Duration: 15 min                                        │    │    │
│  │  └──────────────────────────────────────────────────────────┘    │    │
│  │                           │                                        │    │
│  │  ┌────────────────────────▼──────────────────────────────────┐    │    │
│  │  │ Phase 2: Authentication (lobbi-platform-manager)         │    │    │
│  │  │  - Configure Keycloak client                             │    │    │
│  │  │  - Setup JWT validation                                  │    │    │
│  │  │  - Integrate with endpoint                               │    │    │
│  │  │  Duration: 12 min                                        │    │    │
│  │  │  Dependencies: [Phase 1]                                 │    │    │
│  │  └──────────────────────────────────────────────────────────┘    │    │
│  │                           │                                        │    │
│  │  ┌────────────────────────▼──────────────────────────────────┐    │    │
│  │  │ Phase 3: Deployment (ahling-command-center)              │    │    │
│  │  │  - Build Docker image                                    │    │    │
│  │  │  - Deploy to Kubernetes                                  │    │    │
│  │  │  - Configure ingress                                     │    │    │
│  │  │  Duration: 18 min                                        │    │    │
│  │  │  Dependencies: [Phase 1, Phase 2]                        │    │    │
│  │  └──────────────────────────────────────────────────────────┘    │    │
│  │                                                                     │    │
│  │  Execution Strategy: SEQUENTIAL_COLLABORATION                      │    │
│  │  Estimated Total Duration: 45 minutes                              │    │
│  │  Estimated Cost: $0.25                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4: CHAIN EXECUTOR                                             │    │
│  │                                                                     │    │
│  │  Execution Mode: Sequential Collaboration                          │    │
│  │  Circuit Breakers: ARMED for all plugins                           │    │
│  │  Retry Policy: Exponential backoff, max 3 retries                  │    │
│  │  Telemetry: Distributed tracing enabled                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
         ┌──────────────┐ ┌───────────────┐ ┌──────────────┐
         │   FastAPI    │ │    Lobbi      │ │   Ahling     │
         │   Backend    │ │   Platform    │ │   Command    │
         │              │ │   Manager     │ │   Center     │
         └──────┬───────┘ └───────┬───────┘ └──────┬───────┘
                │                 │                 │
                └────────┬────────┴────────┬────────┘
                         │                 │
                         ▼                 ▼
                 ┌──────────────┐  ┌──────────────┐
                 │ Message Bus  │  │ State Store  │
                 │ - Events     │  │ - Context    │
                 │ - Telemetry  │  │ - Metrics    │
                 └──────────────┘  └──────────────┘
```

---

## 2. Message Bus Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE BUS ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

TIME: t0
┌──────────────────┐
│ Jira Orchestrator│  Publishes routing decision to message bus
└────────┬─────────┘
         │ Topic: routing/decision
         │ {
         │   "requestId": "req_123",
         │   "primaryPlugin": "fastapi-backend",
         │   "collaborationPlan": {...}
         │ }
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Topic: routing/decision                                            │    │
│  │ Subscribers: [fastapi-backend, lobbi-platform, ahling-command]    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────┬──────────────────────┬──────────────────────┬────────────────────┬─────┘
     │                      │                      │                    │
     ▼                      ▼                      ▼                    ▼
┌────────────┐      ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
│  FastAPI   │      │    Lobbi     │      │   Ahling     │    │ Telemetry    │
│  Backend   │      │  Platform    │      │   Command    │    │  Service     │
└────────────┘      └──────────────┘      └──────────────┘    └──────────────┘


TIME: t1 (Phase 1 starts)
┌──────────────────┐
│ Jira Orchestrator│  Sends request to fastapi-backend
└────────┬─────────┘
         │ Topic: plugin/fastapi-backend/request
         │ Type: REQUEST
         │ {
         │   "messageId": "msg_001",
         │   "correlationId": "req_123",
         │   "command": "create_endpoint",
         │   "parameters": {
         │     "path": "/api/users",
         │     "method": "POST",
         │     "database": "mongodb"
         │   }
         │ }
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────┐
                            │   FastAPI    │  Receives request, starts work
                            │   Backend    │
                            └──────┬───────┘
                                   │ Publishes event: task-start
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
│  Topic: orchestration/task-start                                            │
│  {                                                                           │
│    "taskId": "task_001",                                                     │
│    "plugin": "fastapi-backend",                                              │
│    "status": "running"                                                       │
│  }                                                                           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────┐
                            │     Jira     │  Updates task status
                            │ Orchestrator │
                            └──────────────┘


TIME: t2 (Phase 1 completes)
                            ┌──────────────┐
                            │   FastAPI    │  Publishes completion
                            │   Backend    │
                            └──────┬───────┘
                                   │ Topic: plugin/fastapi-backend/response
                                   │ {
                                   │   "correlationId": "req_123",
                                   │   "status": "success",
                                   │   "result": {
                                   │     "endpointPath": "/api/users",
                                   │     "schemaId": "users_schema_v1"
                                   │   }
                                   │ }
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────┐
                            │     Jira     │  Receives result, starts Phase 2
                            │ Orchestrator │
                            └──────┬───────┘
                                   │ Topic: plugin/lobbi-platform/request
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────┐
                            │    Lobbi     │  Receives request
                            │  Platform    │
                            └──────────────┘


TIME: t3 (State synchronization)
                            ┌──────────────┐
                            │   FastAPI    │  Shares state
                            │   Backend    │
                            └──────┬───────┘
                                   │ Topic: state/fastapi-backend/change
                                   │ {
                                   │   "type": "register",
                                   │   "key": "current_endpoint",
                                   │   "value": {
                                   │     "path": "/api/users",
                                   │     "authentication": "required"
                                   │   }
                                   │ }
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
│  Topic: state/*/change                                                      │
└────┬────────────────────────────────────────────────────────┬───────────────┘
     │                                                         │
     ▼                                                         ▼
┌──────────────┐                                      ┌──────────────┐
│    Lobbi     │  Imports state, uses for config     │   Ahling     │  Imports for deployment
│  Platform    │                                      │   Command    │
└──────────────┘                                      └──────────────┘


TIME: t4 (Error occurs)
                            ┌──────────────┐
                            │   Ahling     │  Deployment fails
                            │   Command    │
                            └──────┬───────┘
                                   │ Topic: plugin/ahling-command/response
                                   │ {
                                   │   "correlationId": "req_123",
                                   │   "status": "error",
                                   │   "error": "K8s cluster unreachable"
                                   │ }
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────┐
                            │     Jira     │  Circuit breaker opens
                            │ Orchestrator │  Activates fallback
                            └──────┬───────┘
                                   │ Topic: routing/fallback
                                   │ {
                                   │   "originalPlugin": "ahling-command",
                                   │   "fallbackPlugin": "jira-orchestrator",
                                   │   "reason": "circuit_breaker_open"
                                   │ }
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BUS                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────┐
                            │     Jira     │  Uses built-in deployment
                            │ Orchestrator │  (graceful degradation)
                            └──────────────┘
```

---

## 3. Agent Discovery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGENT DISCOVERY SEQUENCE                                │
└─────────────────────────────────────────────────────────────────────────────┘

SCENARIO: Find agents to implement "React component with accessibility"

STEP 1: Request Classification
┌──────────────────┐
│ Jira Orchestrator│
│   (Meta)         │
└────────┬─────────┘
         │
         │ classify("React component with accessibility")
         │
         ▼
┌────────────────────┐
│ Request Classifier │
└────────┬───────────┘
         │
         │ Result: {
         │   domains: ["frontend", "ui"],
         │   contexts: ["react", "jsx", "a11y"],
         │   patterns: ["component-generation"],
         │   complexity: "moderate"
         │ }
         ▼


STEP 2: Query Unified Registry
┌──────────────────┐
│ Jira Orchestrator│
└────────┬─────────┘
         │
         │ findAgents({
         │   domains: ["frontend", "ui"],
         │   contexts: ["react", "a11y"],
         │   keywords: ["component", "accessibility"]
         │ })
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       UNIFIED AGENT REGISTRY                                 │
│                                                                              │
│  Searching across all plugins...                                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ Plugin: frontend-powerhouse                                     │       │
│  │                                                                  │       │
│  │  Agent: react-component-specialist                              │       │
│  │  ├─ Category: frontend                                         │       │
│  │  ├─ Capabilities: [react, jsx, component-generation]           │       │
│  │  ├─ Keywords: [react, component, hooks]                        │       │
│  │  └─ Score: 85                                                  │       │
│  │      - Domain match: frontend (30)                             │       │
│  │      - Context match: react (20)                               │       │
│  │      - Keyword match: component (15)                           │       │
│  │      - Availability: available (×1.0)                          │       │
│  │      - Success rate: 0.95 (×0.95)                              │       │
│  │                                                                  │       │
│  │  Agent: accessibility-auditor                                   │       │
│  │  ├─ Category: frontend                                         │       │
│  │  ├─ Capabilities: [a11y, wcag, aria]                           │       │
│  │  ├─ Keywords: [accessibility, a11y, wcag]                      │       │
│  │  └─ Score: 75                                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ Plugin: chakra-react-toolkit                                    │       │
│  │                                                                  │       │
│  │  Agent: chakra-component-generator                              │       │
│  │  ├─ Category: frontend                                         │       │
│  │  ├─ Capabilities: [react, chakra-ui, components]               │       │
│  │  ├─ Keywords: [chakra, component, accessible]                  │       │
│  │  └─ Score: 70                                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ Plugin: jira-orchestrator                                       │       │
│  │                                                                  │       │
│  │  Agent: code-reviewer                                           │       │
│  │  ├─ Category: quality                                          │       │
│  │  ├─ Capabilities: [code-review, quality]                       │       │
│  │  ├─ Keywords: [review, quality, best-practices]                │       │
│  │  └─ Score: 40                                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   │ Ranked Results:
                                   │ 1. react-component-specialist (85)
                                   │ 2. accessibility-auditor (75)
                                   │ 3. chakra-component-generator (70)
                                   │ 4. code-reviewer (40)
                                   ▼


STEP 3: Build Agent Team
┌──────────────────┐
│ Jira Orchestrator│
└────────┬─────────┘
         │
         │ buildAgentTeam(rankedAgents, classification)
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Agent Team Builder                                               │
│                                                                  │
│  Selected Team:                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Coordinator: jira-orchestrator::agent-router           │    │
│  │  - Orchestrates overall workflow                       │    │
│  │  - Manages inter-plugin communication                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Specialist 1: frontend-powerhouse::                    │    │
│  │               react-component-specialist               │    │
│  │  - Generate React component structure                  │    │
│  │  - Implement hooks and state management                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Specialist 2: frontend-powerhouse::                    │    │
│  │               accessibility-auditor                    │    │
│  │  - Add ARIA attributes                                 │    │
│  │  - Ensure keyboard navigation                          │    │
│  │  - Validate WCAG compliance                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Specialist 3: jira-orchestrator::code-reviewer         │    │
│  │  - Review final code                                   │    │
│  │  - Check best practices                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Team Metrics:                                                  │
│  ├─ Total Cost: $0.12                                          │
│  ├─ Estimated Duration: 18 minutes                             │
│  └─ Success Probability: 92%                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Circuit Breaker State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER STATE MACHINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │                 │
                        │     CLOSED      │
                        │   (Normal ops)  │
                        │                 │
                        └────────┬────────┘
                                 │
                                 │ failures >= threshold
                                 │ (e.g., 5 failures)
                                 │
                                 ▼
                        ┌─────────────────┐
                   ┌────│                 │
                   │    │      OPEN       │
                   │    │   (Failing)     │
                   │    │                 │
                   │    └────────┬────────┘
                   │             │
                   │             │ timeout elapsed
                   │             │ (e.g., 60 seconds)
                   │             │
                   │             ▼
                   │    ┌─────────────────┐
                   │    │                 │
                   │    │   HALF-OPEN     │
                   │    │  (Testing)      │
                   │    │                 │
                   │    └────┬──────┬─────┘
                   │         │      │
       failure     │         │      │ success × N
       during test │         │      │ (e.g., 3 successes)
                   │         │      │
                   └─────────┘      └─────────┐
                                               │
                                               ▼
                                    ┌─────────────────┐
                                    │                 │
                                    │     CLOSED      │
                                    │   (Recovered)   │
                                    │                 │
                                    └─────────────────┘


EXAMPLE TIMELINE:

t=0s    Plugin "ahling-command-center" in CLOSED state
        ├─ Request 1: SUCCESS
        ├─ Request 2: SUCCESS
        └─ failures = 0

t=10s   Kubernetes cluster becomes unreachable
        ├─ Request 3: FAILURE (failures = 1)
        ├─ Request 4: FAILURE (failures = 2)
        ├─ Request 5: FAILURE (failures = 3)
        ├─ Request 6: FAILURE (failures = 4)
        └─ Request 7: FAILURE (failures = 5)

t=15s   CIRCUIT OPENS (failures >= threshold)
        ├─ State: CLOSED → OPEN
        ├─ All requests rejected immediately
        ├─ Fallback to jira-orchestrator used
        └─ Event published: circuit-breaker/open

t=15s-75s  Circuit remains OPEN
           ├─ All requests fail fast
           └─ Fallback plugin handles requests

t=75s   Timeout elapsed (60 seconds), attempt HALF-OPEN
        ├─ State: OPEN → HALF-OPEN
        ├─ Next request allowed through (test)
        └─ halfOpenAttempts = 0

t=76s   Test request 1: SUCCESS
        ├─ halfOpenAttempts = 1
        └─ Continue testing...

t=77s   Test request 2: SUCCESS
        ├─ halfOpenAttempts = 2
        └─ Continue testing...

t=78s   Test request 3: SUCCESS
        ├─ halfOpenAttempts = 3
        ├─ Reached threshold (3 successes)
        └─ CIRCUIT CLOSES

t=78s+  Circuit CLOSED, normal operations resume
        ├─ State: HALF-OPEN → CLOSED
        ├─ failures reset to 0
        ├─ Plugin fully recovered
        └─ Event published: circuit-breaker/closed


ALTERNATIVE SCENARIO (Recovery Failure):

t=75s   HALF-OPEN test begins
        └─ halfOpenAttempts = 0

t=76s   Test request 1: SUCCESS
        └─ halfOpenAttempts = 1

t=77s   Test request 2: FAILURE
        ├─ Kubernetes still unreachable
        ├─ Circuit immediately reopens
        └─ State: HALF-OPEN → OPEN

t=77s+  Circuit OPEN again
        ├─ Reset timeout timer
        ├─ Will retry HALF-OPEN at t=137s
        └─ Continue using fallback
```

---

## 5. Saga Pattern Rollback Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SAGA PATTERN WITH ROLLBACK                                │
│                                                                              │
│  SCENARIO: Multi-tenant provisioning across 3 plugins                       │
└─────────────────────────────────────────────────────────────────────────────┘

HAPPY PATH (All steps succeed):

t=0s  ┌──────────────────┐
      │ Jira Orchestrator│  Initiates saga
      └────────┬─────────┘
               │ Step 1: Create tenant DB
               ▼
      ┌──────────────────┐
      │ Lobbi Platform   │  Creates tenant database
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ DB: tenant_acme_corp created
               │ Store compensation: delete_tenant_db(acme_corp)
               ▼

t=5s  ┌──────────────────┐
      │ Lobbi Platform   │  Configures Keycloak
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ Realm: acme-corp created
               │ Store compensation: delete_realm(acme-corp)
               ▼

t=12s ┌──────────────────┐
      │ Ahling Command   │  Deploys infrastructure
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ Namespace: acme-corp-prod created
               │ Store compensation: destroy_namespace(acme-corp-prod)
               ▼

t=25s ┌──────────────────┐
      │ Jira Orchestrator│  All steps completed!
      └──────────────────┘  Saga: SUCCESS


ERROR PATH (Step 3 fails, rollback required):

t=0s  ┌──────────────────┐
      │ Jira Orchestrator│  Initiates saga
      └────────┬─────────┘
               │ Step 1: Create tenant DB
               ▼
t=5s  ┌──────────────────┐
      │ Lobbi Platform   │  Creates tenant database
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ Executed: create_tenant_db(acme_corp)
               │ Stored: delete_tenant_db(acme_corp)
               ▼
               │ executedSteps.push({
               │   step: {...},
               │   result: { dbId: "db_123" }
               │ })

t=8s  ┌──────────────────┐
      │ Lobbi Platform   │  Configures Keycloak
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ Executed: create_realm(acme-corp)
               │ Stored: delete_realm(acme-corp)
               ▼
               │ executedSteps.push({
               │   step: {...},
               │   result: { realmId: "realm_456" }
               │ })

t=15s ┌──────────────────┐
      │ Ahling Command   │  Deploys infrastructure
      └────────┬─────────┘
               │ ✗ FAILURE
               │ Error: "K8s quota exceeded"
               ▼

t=16s ┌──────────────────┐
      │ Jira Orchestrator│  Detects failure, initiates ROLLBACK
      └────────┬─────────┘
               │
               │ Rollback in REVERSE order:
               │
               ▼
      ┌────────────────────────────────────────────────┐
      │ ROLLBACK SEQUENCE                              │
      │                                                │
      │ executedSteps (reversed):                      │
      │ 1. Keycloak realm creation                     │
      │ 2. Tenant DB creation                          │
      └────────────────────────────────────────────────┘

t=17s          │
               │ Rollback Step 1: Keycloak realm
               ▼
      ┌──────────────────┐
      │ Lobbi Platform   │  delete_realm(acme-corp)
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ Realm deleted
               ▼

t=20s          │
               │ Rollback Step 2: Tenant DB
               ▼
      ┌──────────────────┐
      │ Lobbi Platform   │  delete_tenant_db(acme_corp)
      └────────┬─────────┘
               │ ✓ SUCCESS
               │ Database dropped
               ▼

t=22s ┌──────────────────┐
      │ Jira Orchestrator│  Rollback complete
      └──────────────────┘  System back to initial state
                            Report error to user


COMPENSATION ACTIONS MAPPING:

┌─────────────────────────────────────────────────────────────┐
│ Forward Action              │ Compensation Action            │
├─────────────────────────────┼────────────────────────────────┤
│ create_tenant_db()          │ delete_tenant_db()             │
│ create_realm()              │ delete_realm()                 │
│ deploy_namespace()          │ destroy_namespace()            │
│ create_storage_bucket()     │ delete_storage_bucket()        │
│ provision_dns_record()      │ remove_dns_record()            │
│ send_notification()         │ send_cancellation_notice()     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Cost Optimization Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COST OPTIMIZATION ROUTING                              │
└─────────────────────────────────────────────────────────────────────────────┘

SCENARIO: User has budget constraint: $0.50 max

STEP 1: Initial Routing
┌──────────────────┐
│ Request          │  "Build full-stack app with FastAPI + React"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Classifier       │  Result:
└────────┬─────────┘  - Complexity: COMPLEX
         │            - Est. Duration: 90 min
         │            - Est. Cost: $0.85 (too expensive!)
         ▼


STEP 2: Cost Optimizer Activated
┌──────────────────────────────────────────────────────────────────┐
│ Cost Optimizer                                                   │
│                                                                  │
│ Budget: $0.50                                                    │
│ Initial estimate: $0.85                                          │
│ Overage: $0.35 (70% over budget)                                │
│                                                                  │
│ Optimization strategies:                                         │
│ 1. Use cheaper models (sonnet → haiku where possible)          │
│ 2. Cache results to avoid redundant work                        │
│ 3. Parallelize to reduce duration                               │
│ 4. Use simpler agents for non-critical tasks                    │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼

STEP 3: Optimized Routing Plan

ORIGINAL PLAN:
┌────────────────────────────────────────────────────────────┐
│ Phase 1: Backend (fastapi-backend)                        │
│   - Agent: backend-architect (opus)      Cost: $0.15      │
│   - Agent: api-specialist (sonnet)       Cost: $0.10      │
│   - Agent: database-expert (sonnet)      Cost: $0.10      │
│   Duration: 35 min                       Total: $0.35      │
├────────────────────────────────────────────────────────────┤
│ Phase 2: Frontend (frontend-powerhouse)                   │
│   - Agent: react-architect (opus)        Cost: $0.15      │
│   - Agent: component-builder (sonnet)    Cost: $0.10      │
│   - Agent: state-manager (sonnet)        Cost: $0.10      │
│   Duration: 30 min                       Total: $0.35      │
├────────────────────────────────────────────────────────────┤
│ Phase 3: Integration (jira-orchestrator)                  │
│   - Agent: integration-tester (sonnet)   Cost: $0.10      │
│   - Agent: docs-writer (sonnet)          Cost: $0.05      │
│   Duration: 25 min                       Total: $0.15      │
├────────────────────────────────────────────────────────────┤
│ TOTAL COST: $0.85                                          │
│ TOTAL DURATION: 90 min (sequential)                        │
└────────────────────────────────────────────────────────────┘


OPTIMIZED PLAN:
┌────────────────────────────────────────────────────────────┐
│ Phase 1 & 2: Backend + Frontend (PARALLEL)                │
│                                                            │
│ Backend (fastapi-backend):                                 │
│   - Agent: api-specialist (sonnet)       Cost: $0.10      │
│   - Agent: database-expert (haiku)       Cost: $0.03      │
│   Duration: 30 min                       Total: $0.13      │
│                                                            │
│ Frontend (frontend-powerhouse):                            │
│   - Agent: component-builder (sonnet)    Cost: $0.10      │
│   - Agent: state-manager (haiku)         Cost: $0.03      │
│   Duration: 25 min                       Total: $0.13      │
├────────────────────────────────────────────────────────────┤
│ Phase 3: Integration (jira-orchestrator)                  │
│   - Agent: integration-tester (haiku)    Cost: $0.03      │
│   - Agent: docs-writer (haiku, cached)   Cost: $0.01      │
│   Duration: 15 min                       Total: $0.04      │
├────────────────────────────────────────────────────────────┤
│ TOTAL COST: $0.47 (within budget!)                        │
│ TOTAL DURATION: 45 min (50% reduction via parallelization)│
│                                                            │
│ Optimizations applied:                                     │
│ ✓ Removed opus agents (-$0.30)                            │
│ ✓ Used haiku for non-critical tasks (-$0.15)             │
│ ✓ Cached documentation template (-$0.04)                  │
│ ✓ Parallelized backend + frontend (-45 min)               │
│ ✓ Simplified integration testing (-10 min)                │
└────────────────────────────────────────────────────────────┘


COST BREAKDOWN BY MODEL:
┌──────────────────────────────────────────────────────────┐
│ Model   │ Agent Count │ Avg Duration │ Cost per │ Total │
├─────────┼─────────────┼──────────────┼──────────┼───────┤
│ opus    │ 0           │ 0 min        │ $0.00    │ $0.00 │
│ sonnet  │ 3           │ 10 min       │ $0.10    │ $0.30 │
│ haiku   │ 4           │ 5 min        │ $0.03    │ $0.12 │
│ cached  │ 1           │ 2 min        │ $0.01    │ $0.01 │
├─────────┼─────────────┼──────────────┼──────────┼───────┤
│ TOTAL   │ 8           │ 45 min       │ -        │ $0.47 │
└──────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-26
**Author:** architect-supreme
