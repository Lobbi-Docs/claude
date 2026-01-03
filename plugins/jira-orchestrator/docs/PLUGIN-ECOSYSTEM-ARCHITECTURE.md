# Plugin Ecosystem Architecture v1.0.0

**Central Brain:** Jira Orchestrator | **Plugins:** 5 | **Agents:** 78 | **Commands:** 103

## System Overview

**Vision:** Jira Orchestrator acts as central intelligence routing to specialized plugins via event-driven messaging.

**Key Principles:**
1. Centralized Intelligence - Jira Orchestrator owns routing
2. Plugin Autonomy - Each manages domain expertise
3. Loose Coupling - Standard protocols for communication
4. Fault Tolerance - Circuit breakers and graceful degradation
5. Observable - Full telemetry and tracing

**Plugin Topology:**
- **jira-orchestrator** (61 agents, 35 cmds) - Central routing, Jira workflows, portfolio
- **exec-automator** (11 agents, 13 cmds) - Document analysis, LangGraph workflows
- **home-assistant** (15 agents, 9 cmds) - Home automation, Ollama, IoT
- **frontend-powerhouse** (13 agents, 12 cmds) - React/Next.js, Chakra UI, accessibility
- **ahling-command-center** (10 agents, 15 cmds) - Docker, Vault, multi-cloud, smart home
- **lobbi-platform-manager** (4 agents, 8 cmds) - Keycloak, multi-tenant, MERN

## System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│ Layer 4: User Interface                                           │
│   - CLI Commands (/jira:*, /exec:*, etc.)                        │
│   - Skills (Skill tool invocations)                              │
│   - Direct Agent Calls                                           │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│ Layer 3: Meta-Controller (Jira Orchestrator)                     │
│   ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│   │ Request     │  │ Capability   │  │ State          │         │
│   │ Classifier  │  │ Matcher      │  │ Coordinator    │         │
│   └─────────────┘  └──────────────┘  └────────────────┘         │
│   ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│   │ Chain       │  │ Circuit      │  │ Telemetry      │         │
│   │ Executor    │  │ Breaker      │  │ Tracker        │         │
│   └─────────────┘  └──────────────┘  └────────────────┘         │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│ Layer 2: Communication Backbone                                   │
│   ┌─────────────────────────────────────────────────────┐        │
│   │ Message Bus (Event-Driven Architecture)             │        │
│   │ - Topic-based routing                               │        │
│   │ - Request/Response patterns                         │        │
│   │ - Publish/Subscribe for events                      │        │
│   │ - Dead Letter Queue for failures                    │        │
│   └─────────────────────────────────────────────────────┘        │
│   ┌─────────────────────────────────────────────────────┐        │
│   │ State Store (Distributed State Management)          │        │
│   │ - SQLite with WAL mode                              │        │
│   │ - Redis for hot state (optional)                    │        │
│   │ - Conflict-free Replicated Data Types (CRDTs)       │        │
│   └─────────────────────────────────────────────────────┘        │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│ Layer 1: Plugin Domain Layer                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ Plugin A     │  │ Plugin B     │  │ Plugin C     │          │
│   │ - Agents     │  │ - Agents     │  │ - Agents     │          │
│   │ - Commands   │  │ - Commands   │  │ - Commands   │          │
│   │ - Skills     │  │ - Skills     │  │ - Skills     │          │
│   │ - State      │  │ - State      │  │ - State      │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────────────────────────────────────────────┘
```

### 2. Plugin Taxonomy

| Plugin | Faction | Domain | Agents | Commands | Specialization |
|--------|---------|--------|--------|----------|----------------|
| **jira-orchestrator** | Forerunner | Orchestration | 61 | 35 | Central routing, Jira workflows, portfolio mgmt |
| **exec-automator** | Forerunner | Executive Automation | 11 | 13 | Document analysis, LangGraph workflows, executive tasks |
| **home-assistant** | Promethean | Smart Home | 15 | 9 | Home automation, Ollama integration, IoT |
| **frontend-powerhouse** | Spartan | Frontend Dev | 13 | 12 | React/Next.js, Chakra UI, accessibility |
| **ahling-command-center** | Promethean | Infrastructure | 10 | 15 | Docker, Vault, multi-cloud, smart home ops |
| **lobbi-platform-manager** | Forerunner | Platform | 4 | 8 | Keycloak, multi-tenant, MERN stack |

**Total Ecosystem:** 114 agents, 92 commands (excluding jira-orchestrator duplication)

---

## Plugin Structure

### 1. Enhanced Plugin Manifest

**File:** `.claude-plugin/plugin.json`

```json
{
  "$schema": "https://anthropic.com/claude-code/plugin.schema.v1.json",
  "name": "example-plugin",
  "version": "1.0.0",
  "apiVersion": "v1",

  "provides": {
    "agents": 10,
    "commands": 15,
    "skills": 5
  },

  "capabilities": {
    "domains": ["backend", "api", "database"],
    "contexts": ["python", "fastapi", "mongodb"],
    "patterns": ["rest-api", "websocket", "async-tasks"],
    "integrations": ["keycloak", "docker", "kubernetes"]
  },

  "routing": {
    "priority": 100,
    "keywords": ["backend", "api", "fastapi", "mongodb"],
    "contextPatterns": [
      "**/*.py",
      "**/api/**/*",
      "**/backend/**/*"
    ],
    "acceptsRoutingFrom": ["jira-orchestrator"],
    "canRouteTo": ["lobbi-platform-manager", "ahling-command-center"]
  },

  "communication": {
    "messagebus": {
      "enabled": true,
      "topics": [
        "plugin.example.request",
        "plugin.example.response",
        "plugin.example.events"
      ],
      "subscriptions": [
        "system.broadcast",
        "jira.orchestrator.commands"
      ]
    },
    "rpc": {
      "enabled": true,
      "endpoint": "plugin://example-plugin/rpc",
      "methods": ["execute_command", "query_agents", "get_status"]
    }
  },

  "stateManagement": {
    "persistence": {
      "type": "sqlite",
      "path": ".claude-plugin/state.db",
      "schema": ".claude-plugin/state-schema.sql"
    },
    "sharing": {
      "exports": ["task_queue", "agent_status", "metrics"],
      "imports": ["jira_issues", "global_context"]
    }
  },

  "orchestration": {
    "enabled": true,
    "mandatory": false,
    "protocol": {
      "version": "4.0.0",
      "supportedPatterns": [
        "sequential",
        "parallel",
        "conditional",
        "saga"
      ]
    }
  },

  "errorHandling": {
    "circuitBreaker": {
      "enabled": true,
      "threshold": 5,
      "timeout": 60000,
      "halfOpenRetries": 3
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoff": "exponential",
      "initialDelay": 1000,
      "maxDelay": 10000
    },
    "fallback": {
      "strategy": "graceful-degradation",
      "fallbackPlugin": "jira-orchestrator"
    }
  }
}
```

### 2. Directory Structure

```
plugin-name/
├── .claude-plugin/
│   ├── plugin.json              # Enhanced manifest
│   ├── routing-config.json      # Routing rules
│   ├── state.db                 # Local state (SQLite)
│   ├── state-schema.sql         # State schema
│   └── capabilities.json        # Detailed capability matrix
│
├── agents/                      # Agent definitions
│   ├── agent-1.md
│   ├── agent-2.md
│   └── index.json              # Agent registry
│
├── commands/                    # Command definitions
│   ├── command-1.md
│   ├── command-2.md
│   └── index.json              # Command registry
│
├── skills/                      # Skill definitions
│   ├── skill-1.md
│   └── index.json
│
├── lib/                         # Plugin library code
│   ├── router.ts               # Local routing logic
│   ├── messagebus.ts           # Message bus client
│   ├── rpc-server.ts           # RPC server
│   ├── state-manager.ts        # State management
│   └── circuit-breaker.ts      # Circuit breaker impl
│
├── config/
│   ├── routing-rules.json      # Advanced routing rules
│   ├── capability-matrix.json  # Capability scoring
│   └── integration-config.json # Integration settings
│
└── tests/
    ├── routing.test.ts
    ├── communication.test.ts
    └── integration.test.ts
```

---

## Inter-Plugin Communication Protocol

### 1. Message Bus Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Message Bus Backbone                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Topic Structure                                           │  │
│  │                                                           │  │
│  │ system/                                                   │  │
│  │   ├── broadcast          (all plugins)                   │  │
│  │   ├── health             (health checks)                 │  │
│  │   └── telemetry          (metrics, traces)               │  │
│  │                                                           │  │
│  │ plugin/{plugin-name}/                                     │  │
│  │   ├── request            (incoming requests)             │  │
│  │   ├── response           (outgoing responses)            │  │
│  │   ├── events             (plugin events)                 │  │
│  │   └── status             (plugin status updates)         │  │
│  │                                                           │  │
│  │ routing/                                                  │  │
│  │   ├── query              (routing queries)               │  │
│  │   ├── decision           (routing decisions)             │  │
│  │   └── fallback           (fallback routing)              │  │
│  │                                                           │  │
│  │ orchestration/                                            │  │
│  │   ├── task-start         (task started)                  │  │
│  │   ├── task-complete      (task completed)                │  │
│  │   ├── agent-spawn        (agent spawned)                 │  │
│  │   └── checkpoint          (checkpoint created)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Message Format (JSON)                                     │  │
│  │                                                           │  │
│  │ {                                                         │  │
│  │   "messageId": "uuid-v4",                                │  │
│  │   "correlationId": "uuid-v4",   // For request/response │  │
│  │   "timestamp": "ISO-8601",                               │  │
│  │   "source": "plugin-name",                               │  │
│  │   "destination": "plugin-name|*",  // * for broadcast   │  │
│  │   "topic": "plugin/example/request",                     │  │
│  │   "messageType": "request|response|event|command",       │  │
│  │   "priority": 1-10,                                      │  │
│  │   "headers": {                                            │  │
│  │     "traceId": "distributed-trace-id",                   │  │
│  │     "spanId": "span-id",                                 │  │
│  │     "userId": "user-identifier",                         │  │
│  │     "sessionId": "session-identifier"                    │  │
│  │   },                                                      │  │
│  │   "payload": {                                            │  │
│  │     "command": "execute_task",                           │  │
│  │     "parameters": {...},                                 │  │
│  │     "context": {...}                                     │  │
│  │   },                                                      │  │
│  │   "metadata": {                                           │  │
│  │     "retryCount": 0,                                     │  │
│  │     "timeout": 30000,                                    │  │
│  │     "expiresAt": "ISO-8601"                              │  │
│  │   }                                                       │  │
│  │ }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Communication Patterns

#### A. Request/Response Pattern

```typescript
// Sender (Jira Orchestrator)
const response = await messagebus.request({
  destination: "exec-automator",
  topic: "plugin/exec-automator/request",
  messageType: "request",
  payload: {
    command: "analyze_document",
    parameters: {
      documentPath: "/path/to/rfp.pdf",
      analysisType: "automation-potential"
    }
  },
  timeout: 30000
});

// Receiver (Exec Automator)
messagebus.subscribe("plugin/exec-automator/request", async (message) => {
  const result = await executeCommand(
    message.payload.command,
    message.payload.parameters
  );

  await messagebus.respond(message.correlationId, {
    status: "success",
    result: result
  });
});
```

#### B. Publish/Subscribe Pattern

```typescript
// Publisher (Any Plugin)
await messagebus.publish({
  topic: "orchestration/task-complete",
  messageType: "event",
  payload: {
    taskId: "task-123",
    result: {...},
    metrics: {
      duration: 5000,
      tokensUsed: 1500
    }
  }
});

// Subscriber (Jira Orchestrator)
messagebus.subscribe("orchestration/*", async (message) => {
  // Update orchestration state
  await updateTaskStatus(message.payload.taskId, "completed");

  // Log to telemetry
  await logMetrics(message.payload.metrics);
});
```

#### C. RPC Pattern

```typescript
// RPC Client (Jira Orchestrator)
const rpcClient = new RPCClient("plugin://frontend-powerhouse/rpc");

const result = await rpcClient.call("generate_component", {
  componentType: "ChakraForm",
  fields: ["name", "email", "phone"],
  validation: "yup"
});

// RPC Server (Frontend Powerhouse)
const rpcServer = new RPCServer("plugin://frontend-powerhouse/rpc");

rpcServer.register("generate_component", async (params) => {
  const component = await componentGenerator.generate(params);
  return {
    code: component.code,
    filePath: component.path,
    dependencies: component.deps
  };
});
```

### 3. State Sharing Protocol

```typescript
// Export state (Jira Orchestrator)
const stateExporter = new StateExporter({
  plugin: "jira-orchestrator",
  exports: ["jira_issues", "sprint_data", "velocity_metrics"]
});

await stateExporter.export("jira_issues", {
  issues: [...],
  lastUpdated: new Date()
});

// Import state (Frontend Powerhouse)
const stateImporter = new StateImporter({
  plugin: "frontend-powerhouse",
  imports: ["jira_issues"]
});

const jiraIssues = await stateImporter.import("jira_issues");
// Use jira issues in component generation
```

---

## Meta-Controller (Routing Engine)

### 1. Routing Engine Components

```
┌─────────────────────────────────────────────────────────────────┐
│                   META-CONTROLLER ARCHITECTURE                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Request Classifier                                     │  │
│  │    - Parse user intent                                    │  │
│  │    - Extract context (files, keywords, patterns)         │  │
│  │    - Classify domain (backend, frontend, infra, etc.)    │  │
│  │    - Determine complexity (simple, moderate, complex)    │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │ 2. Capability Matcher                                     │  │
│  │    - Query plugin capabilities                           │  │
│  │    - Score plugins by relevance                          │  │
│  │    - Check plugin health & availability                  │  │
│  │    - Apply routing rules & priorities                    │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │ 3. Routing Decision Engine                               │  │
│  │    - Select primary plugin                               │  │
│  │    - Identify fallback plugins                           │  │
│  │    - Plan multi-plugin collaboration                     │  │
│  │    - Generate execution plan                             │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │ 4. Chain Executor                                         │  │
│  │    - Execute sequential chains                           │  │
│  │    - Execute parallel chains                             │  │
│  │    - Handle conditional chains                           │  │
│  │    - Manage saga patterns (rollback)                     │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │ 5. Circuit Breaker                                        │  │
│  │    - Monitor plugin failures                             │  │
│  │    - Open circuit on threshold                           │  │
│  │    - Half-open retry logic                               │  │
│  │    - Close circuit on success                            │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │ 6. Telemetry Tracker                                      │  │
│  │    - Log routing decisions                               │  │
│  │    - Track performance metrics                           │  │
│  │    - Distributed tracing                                 │  │
│  │    - Export to observability systems                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Request Classifier Algorithm

```typescript
interface ClassificationResult {
  domain: Domain[];
  complexity: Complexity;
  contexts: string[];
  patterns: string[];
  urgency: number;
  estimatedDuration: number;
}

class RequestClassifier {
  classify(request: UserRequest): ClassificationResult {
    // 1. Extract context from request
    const fileContext = this.analyzeFiles(request.files);
    const keywordContext = this.extractKeywords(request.text);
    const patternContext = this.matchPatterns(request.text);

    // 2. Classify domain(s)
    const domains = this.classifyDomains({
      fileContext,
      keywordContext,
      patternContext
    });

    // 3. Determine complexity
    const complexity = this.assessComplexity({
      taskCount: request.subtasks?.length || 0,
      fileCount: request.files?.length || 0,
      crossDomain: domains.length > 1,
      keywords: keywordContext
    });

    // 4. Calculate urgency & duration
    const urgency = this.calculateUrgency(request);
    const estimatedDuration = this.estimateDuration(complexity, domains);

    return {
      domain: domains,
      complexity,
      contexts: keywordContext,
      patterns: patternContext,
      urgency,
      estimatedDuration
    };
  }

  private classifyDomains(context: Context): Domain[] {
    const domainScores: Map<Domain, number> = new Map();

    // Score each domain based on context
    for (const domain of ALL_DOMAINS) {
      let score = 0;

      // File context scoring
      score += this.scoreFileContext(domain, context.fileContext);

      // Keyword scoring
      score += this.scoreKeywords(domain, context.keywordContext);

      // Pattern scoring
      score += this.scorePatterns(domain, context.patternContext);

      domainScores.set(domain, score);
    }

    // Return domains above threshold, sorted by score
    return Array.from(domainScores.entries())
      .filter(([_, score]) => score > DOMAIN_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .map(([domain, _]) => domain);
  }
}
```

### 3. Capability Matching Algorithm

```typescript
interface PluginScore {
  plugin: string;
  score: number;
  capabilities: MatchedCapability[];
  health: HealthStatus;
  availability: number;
}

class CapabilityMatcher {
  async matchPlugins(
    classification: ClassificationResult
  ): Promise<PluginScore[]> {
    const plugins = await this.registry.getAllPlugins();
    const scores: PluginScore[] = [];

    for (const plugin of plugins) {
      // Check health first
      const health = await this.healthCheck(plugin);
      if (health.status === "down") continue;

      // Calculate capability score
      let score = 0;
      const matched: MatchedCapability[] = [];

      // Domain matching
      for (const domain of classification.domain) {
        if (plugin.capabilities.domains.includes(domain)) {
          score += 30;
          matched.push({ type: "domain", value: domain, weight: 30 });
        }
      }

      // Context matching (file patterns, keywords)
      for (const context of classification.contexts) {
        if (plugin.capabilities.contexts.includes(context)) {
          score += 20;
          matched.push({ type: "context", value: context, weight: 20 });
        }
      }

      // Pattern matching
      for (const pattern of classification.patterns) {
        if (plugin.capabilities.patterns.includes(pattern)) {
          score += 15;
          matched.push({ type: "pattern", value: pattern, weight: 15 });
        }
      }

      // Priority modifier
      score *= (plugin.routing.priority / 100);

      // Availability modifier
      const availability = await this.getAvailability(plugin);
      score *= availability;

      scores.push({
        plugin: plugin.name,
        score,
        capabilities: matched,
        health,
        availability
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }
}
```

### 4. Routing Decision Engine

```typescript
interface RoutingDecision {
  primaryPlugin: string;
  fallbackPlugins: string[];
  collaborationPlan?: CollaborationPlan;
  executionStrategy: ExecutionStrategy;
  estimatedCost: number;
  estimatedDuration: number;
}

class RoutingDecisionEngine {
  async decide(
    classification: ClassificationResult,
    pluginScores: PluginScore[]
  ): Promise<RoutingDecision> {

    // Select primary plugin (highest score)
    const primaryPlugin = pluginScores[0].plugin;

    // Select fallbacks (next 2-3 highest scores)
    const fallbackPlugins = pluginScores
      .slice(1, 4)
      .map(p => p.plugin);

    // Check if multi-plugin collaboration needed
    const needsCollaboration = this.needsCollaboration(
      classification,
      pluginScores
    );

    let collaborationPlan: CollaborationPlan | undefined;
    if (needsCollaboration) {
      collaborationPlan = await this.planCollaboration(
        classification,
        pluginScores
      );
    }

    // Determine execution strategy
    const executionStrategy = this.selectStrategy(
      classification,
      collaborationPlan
    );

    // Estimate cost and duration
    const estimatedCost = this.estimateCost(
      classification,
      primaryPlugin,
      collaborationPlan
    );

    const estimatedDuration = this.estimateDuration(
      classification,
      executionStrategy
    );

    return {
      primaryPlugin,
      fallbackPlugins,
      collaborationPlan,
      executionStrategy,
      estimatedCost,
      estimatedDuration
    };
  }

  private needsCollaboration(
    classification: ClassificationResult,
    scores: PluginScore[]
  ): boolean {
    // Multi-domain tasks require collaboration
    if (classification.domain.length > 1) return true;

    // Complex tasks may benefit from collaboration
    if (classification.complexity === Complexity.COMPLEX) {
      // Check if multiple plugins scored high
      const highScorers = scores.filter(s => s.score > 70);
      return highScorers.length > 1;
    }

    return false;
  }

  private async planCollaboration(
    classification: ClassificationResult,
    scores: PluginScore[]
  ): Promise<CollaborationPlan> {
    // Group plugins by domain
    const domainGroups: Map<Domain, string[]> = new Map();

    for (const score of scores) {
      for (const capability of score.capabilities) {
        if (capability.type === "domain") {
          const domain = capability.value as Domain;
          if (!domainGroups.has(domain)) {
            domainGroups.set(domain, []);
          }
          domainGroups.get(domain)!.push(score.plugin);
        }
      }
    }

    // Create collaboration phases
    const phases: CollaborationPhase[] = [];

    for (const [domain, plugins] of domainGroups) {
      phases.push({
        domain,
        plugin: plugins[0], // Highest scoring for this domain
        dependencies: [],
        parallel: false
      });
    }

    // Optimize phase ordering
    const optimizedPhases = this.optimizePhaseOrder(phases);

    return {
      phases: optimizedPhases,
      coordinator: "jira-orchestrator",
      estimatedDuration: this.calculatePhaseDuration(optimizedPhases)
    };
  }
}
```

---

## Agent Registry System

### 1. Unified Agent Registry

```typescript
interface AgentRegistryEntry {
  id: string;
  name: string;
  plugin: string;
  category: string;
  capabilities: string[];
  specializations: string[];
  model: "opus" | "sonnet" | "haiku";
  costPerTask: number;
  averageDuration: number;
  successRate: number;
  status: "available" | "busy" | "offline";
  metadata: {
    description: string;
    activationKeywords: string[];
    contextPatterns: string[];
    dependencies: string[];
  };
}

class UnifiedAgentRegistry {
  private agents: Map<string, AgentRegistryEntry> = new Map();

  async registerPlugin(pluginName: string): Promise<void> {
    const pluginManifest = await this.loadPluginManifest(pluginName);
    const agentFiles = await this.discoverAgents(pluginName);

    for (const agentFile of agentFiles) {
      const agent = await this.parseAgentDefinition(agentFile);

      const entry: AgentRegistryEntry = {
        id: `${pluginName}::${agent.name}`,
        name: agent.name,
        plugin: pluginName,
        category: agent.category,
        capabilities: agent.capabilities,
        specializations: agent.specializations,
        model: agent.model || "sonnet",
        costPerTask: this.calculateCost(agent.model),
        averageDuration: 0, // Updated from metrics
        successRate: 1.0,   // Updated from metrics
        status: "available",
        metadata: {
          description: agent.description,
          activationKeywords: agent.keywords,
          contextPatterns: agent.contextPatterns || [],
          dependencies: agent.dependencies || []
        }
      };

      this.agents.set(entry.id, entry);
    }
  }

  async findAgents(criteria: AgentSearchCriteria): Promise<AgentRegistryEntry[]> {
    const results: Array<{agent: AgentRegistryEntry, score: number}> = [];

    for (const [id, agent] of this.agents) {
      let score = 0;

      // Category matching
      if (criteria.category && agent.category === criteria.category) {
        score += 40;
      }

      // Capability matching
      if (criteria.capabilities) {
        const matchedCaps = agent.capabilities.filter(
          c => criteria.capabilities!.includes(c)
        );
        score += matchedCaps.length * 20;
      }

      // Keyword matching
      if (criteria.keywords) {
        const matchedKeywords = agent.metadata.activationKeywords.filter(
          k => criteria.keywords!.some(ck => k.includes(ck))
        );
        score += matchedKeywords.length * 10;
      }

      // Context pattern matching
      if (criteria.contextPatterns) {
        const matchedPatterns = agent.metadata.contextPatterns.filter(
          p => criteria.contextPatterns!.some(cp => this.matchPattern(cp, p))
        );
        score += matchedPatterns.length * 15;
      }

      // Availability bonus
      if (agent.status === "available") {
        score += 10;
      }

      // Success rate bonus
      score *= agent.successRate;

      if (score > 0) {
        results.push({ agent, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map(r => r.agent);
  }

  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    // Query metrics from telemetry system
    return await this.telemetry.getAgentMetrics(agentId);
  }

  async updateAgentStatus(
    agentId: string,
    status: "available" | "busy" | "offline"
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      await this.persistRegistry();
    }
  }
}
```

### 2. Dynamic Agent Discovery

```typescript
class AgentDiscoveryService {
  async discoverCrossPluginAgents(
    task: Task
  ): Promise<AgentDiscoveryResult> {

    // 1. Classify task
    const classification = await this.classifier.classify(task);

    // 2. Find relevant plugins
    const plugins = await this.matcher.matchPlugins(classification);

    // 3. Query agents from top plugins
    const agentGroups: Map<string, AgentRegistryEntry[]> = new Map();

    for (const pluginScore of plugins.slice(0, 3)) {
      const agents = await this.registry.findAgents({
        plugin: pluginScore.plugin,
        capabilities: classification.contexts,
        keywords: this.extractKeywords(task.description)
      });

      agentGroups.set(pluginScore.plugin, agents);
    }

    // 4. Score and rank agents across plugins
    const rankedAgents = this.rankAgentsGlobally(agentGroups, classification);

    // 5. Build agent team
    const team = await this.buildAgentTeam(rankedAgents, classification);

    return {
      recommendedTeam: team,
      alternativeAgents: rankedAgents.slice(team.length),
      estimatedCost: this.calculateTeamCost(team),
      estimatedDuration: this.calculateTeamDuration(team)
    };
  }

  private async buildAgentTeam(
    rankedAgents: AgentRegistryEntry[],
    classification: ClassificationResult
  ): Promise<AgentTeam> {

    const team: AgentTeam = {
      coordinator: null,
      specialists: [],
      totalCost: 0,
      totalDuration: 0
    };

    // Select coordinator (usually from jira-orchestrator)
    team.coordinator = rankedAgents.find(
      a => a.plugin === "jira-orchestrator" &&
           a.category === "orchestration"
    ) || rankedAgents[0];

    // Select specialists based on domains
    for (const domain of classification.domain) {
      const specialist = rankedAgents.find(
        a => a.capabilities.includes(domain) &&
             a.id !== team.coordinator!.id
      );

      if (specialist) {
        team.specialists.push(specialist);
      }
    }

    // Calculate costs
    team.totalCost = [team.coordinator, ...team.specialists]
      .reduce((sum, agent) => sum + agent.costPerTask, 0);

    // Estimate duration (parallel execution)
    team.totalDuration = Math.max(
      ...team.specialists.map(a => a.averageDuration)
    );

    return team;
  }
}
```

---

## State Management

### 1. Distributed State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYERS                       │
│                                                                  │
│  Layer 1: Local Plugin State                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  Plugin A  │  │  Plugin B  │  │  Plugin C  │               │
│  │  SQLite DB │  │  SQLite DB │  │  SQLite DB │               │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘               │
│        │               │               │                        │
├────────┼───────────────┼───────────────┼────────────────────────┤
│  Layer 2: Shared State Store                                    │
│        │               │               │                        │
│  ┌─────▼───────────────▼───────────────▼──────┐                │
│  │   Central State Database (SQLite + WAL)    │                │
│  │   - Cross-plugin state                     │                │
│  │   - Shared context                         │                │
│  │   - Distributed locks                      │                │
│  │   - Conflict resolution via CRDTs          │                │
│  └────────────────────┬───────────────────────┘                │
│                       │                                         │
├───────────────────────┼─────────────────────────────────────────┤
│  Layer 3: Hot State Cache (Optional)                           │
│                       │                                         │
│  ┌────────────────────▼────────────────────────┐               │
│  │   Redis / In-Memory Cache                   │               │
│  │   - Active task state                       │               │
│  │   - Agent status                            │               │
│  │   - Routing decisions                       │               │
│  │   - Metrics & telemetry                     │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 2. State Schema

```sql
-- Central State Database Schema
-- File: .claude/orchestration/state/central-state.sql

-- Plugins table
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'error')),
  health_score REAL DEFAULT 1.0,
  last_heartbeat TIMESTAMP,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (cross-plugin tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  parent_task_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  assigned_plugin TEXT,
  assigned_agent TEXT,
  result JSON,
  error TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (assigned_plugin) REFERENCES plugins(id)
);

-- Agents table (cross-plugin agent registry)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL CHECK(status IN ('available', 'busy', 'offline')),
  capabilities JSON,
  metrics JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id),
  UNIQUE(plugin_id, name)
);

-- Shared context table
CREATE TABLE IF NOT EXISTS shared_context (
  id TEXT PRIMARY KEY,
  context_type TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSON NOT NULL,
  owner_plugin TEXT,
  access_level TEXT DEFAULT 'public' CHECK(access_level IN ('public', 'protected', 'private')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (owner_plugin) REFERENCES plugins(id),
  UNIQUE(context_type, key)
);

-- Routing decisions (for analysis & optimization)
CREATE TABLE IF NOT EXISTS routing_decisions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  classification JSON,
  primary_plugin TEXT,
  fallback_plugins JSON,
  collaboration_plan JSON,
  execution_strategy TEXT,
  estimated_cost REAL,
  estimated_duration INTEGER,
  actual_cost REAL,
  actual_duration INTEGER,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (primary_plugin) REFERENCES plugins(id)
);

-- Distributed locks
CREATE TABLE IF NOT EXISTS distributed_locks (
  resource_id TEXT PRIMARY KEY,
  lock_holder TEXT NOT NULL,
  lock_type TEXT NOT NULL CHECK(lock_type IN ('read', 'write')),
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  metadata JSON
);

-- Events (for event sourcing)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  payload JSON NOT NULL,
  metadata JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aggregate (aggregate_type, aggregate_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_plugin ON tasks(assigned_plugin);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_context_type ON shared_context(context_type);
CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_type, aggregate_id);
```

### 3. Conflict Resolution via CRDTs

```typescript
/**
 * Conflict-free Replicated Data Types for distributed state
 */

class LWWRegister<T> {
  // Last-Write-Wins Register
  private value: T;
  private timestamp: number;
  private nodeId: string;

  constructor(initialValue: T, nodeId: string) {
    this.value = initialValue;
    this.timestamp = Date.now();
    this.nodeId = nodeId;
  }

  set(newValue: T): void {
    const newTimestamp = Date.now();
    if (newTimestamp > this.timestamp) {
      this.value = newValue;
      this.timestamp = newTimestamp;
    } else if (newTimestamp === this.timestamp) {
      // Tie-breaker: use node ID
      if (this.nodeId > nodeId) {
        this.value = newValue;
      }
    }
  }

  get(): T {
    return this.value;
  }

  merge(other: LWWRegister<T>): void {
    if (other.timestamp > this.timestamp) {
      this.value = other.value;
      this.timestamp = other.timestamp;
    } else if (other.timestamp === this.timestamp) {
      if (other.nodeId > this.nodeId) {
        this.value = other.value;
      }
    }
  }
}

class GCounter {
  // Grow-only Counter
  private counts: Map<string, number> = new Map();

  increment(nodeId: string, amount: number = 1): void {
    const current = this.counts.get(nodeId) || 0;
    this.counts.set(nodeId, current + amount);
  }

  value(): number {
    return Array.from(this.counts.values()).reduce((sum, val) => sum + val, 0);
  }

  merge(other: GCounter): void {
    for (const [nodeId, count] of other.counts) {
      const current = this.counts.get(nodeId) || 0;
      this.counts.set(nodeId, Math.max(current, count));
    }
  }
}

class ORSet<T> {
  // Observed-Remove Set
  private elements: Map<T, Set<string>> = new Map();

  add(element: T, uniqueId: string): void {
    if (!this.elements.has(element)) {
      this.elements.set(element, new Set());
    }
    this.elements.get(element)!.add(uniqueId);
  }

  remove(element: T): void {
    this.elements.delete(element);
  }

  has(element: T): boolean {
    const tags = this.elements.get(element);
    return tags !== undefined && tags.size > 0;
  }

  values(): T[] {
    return Array.from(this.elements.keys());
  }

  merge(other: ORSet<T>): void {
    for (const [element, tags] of other.elements) {
      if (!this.elements.has(element)) {
        this.elements.set(element, new Set());
      }
      const ourTags = this.elements.get(element)!;
      for (const tag of tags) {
        ourTags.add(tag);
      }
    }
  }
}

// State Manager using CRDTs
class DistributedStateManager {
  private pluginId: string;
  private registers: Map<string, LWWRegister<any>> = new Map();
  private counters: Map<string, GCounter> = new Map();
  private sets: Map<string, ORSet<any>> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  // Register operations
  setRegister<T>(key: string, value: T): void {
    if (!this.registers.has(key)) {
      this.registers.set(key, new LWWRegister(value, this.pluginId));
    } else {
      this.registers.get(key)!.set(value);
    }

    // Broadcast change
    this.broadcastChange('register', key, this.registers.get(key));
  }

  getRegister<T>(key: string): T | undefined {
    return this.registers.get(key)?.get();
  }

  // Counter operations
  incrementCounter(key: string, amount: number = 1): void {
    if (!this.counters.has(key)) {
      this.counters.set(key, new GCounter());
    }
    this.counters.get(key)!.increment(this.pluginId, amount);

    // Broadcast change
    this.broadcastChange('counter', key, this.counters.get(key));
  }

  getCounter(key: string): number {
    return this.counters.get(key)?.value() || 0;
  }

  // Set operations
  addToSet<T>(key: string, element: T): void {
    if (!this.sets.has(key)) {
      this.sets.set(key, new ORSet());
    }
    const uniqueId = `${this.pluginId}:${Date.now()}:${Math.random()}`;
    this.sets.get(key)!.add(element, uniqueId);

    // Broadcast change
    this.broadcastChange('set', key, this.sets.get(key));
  }

  removeFromSet<T>(key: string, element: T): void {
    this.sets.get(key)?.remove(element);
    this.broadcastChange('set', key, this.sets.get(key));
  }

  getSet<T>(key: string): T[] {
    return this.sets.get(key)?.values() || [];
  }

  // Merge incoming changes from other plugins
  async mergeChanges(type: string, key: string, remoteState: any): Promise<void> {
    switch (type) {
      case 'register':
        if (!this.registers.has(key)) {
          this.registers.set(key, remoteState);
        } else {
          this.registers.get(key)!.merge(remoteState);
        }
        break;

      case 'counter':
        if (!this.counters.has(key)) {
          this.counters.set(key, remoteState);
        } else {
          this.counters.get(key)!.merge(remoteState);
        }
        break;

      case 'set':
        if (!this.sets.has(key)) {
          this.sets.set(key, remoteState);
        } else {
          this.sets.get(key)!.merge(remoteState);
        }
        break;
    }
  }

  private broadcastChange(type: string, key: string, state: any): void {
    messagebus.publish({
      topic: `state/${this.pluginId}/change`,
      messageType: 'event',
      payload: {
        type,
        key,
        state: JSON.stringify(state)
      }
    });
  }
}
```

---

## Error Handling Patterns

### 1. Circuit Breaker Pattern

```typescript
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

interface CircuitBreakerConfig {
  threshold: number;           // Failures before opening
  timeout: number;            // Time in ms before half-open
  halfOpenRetries: number;    // Retries in half-open state
  monitoringWindow: number;   // Window for counting failures
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(
    private pluginId: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptHalfOpen()) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        // Circuit still open, use fallback or throw
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker OPEN for plugin: ${this.pluginId}`);
      }
    }

    try {
      const result = await operation();

      // Success - handle based on state
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenAttempts++;
        if (this.halfOpenAttempts >= this.config.halfOpenRetries) {
          // Enough successful retries, close circuit
          this.close();
        }
      }

      return result;

    } catch (error) {
      this.recordFailure();

      // Use fallback if available
      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED &&
        this.failures >= this.config.threshold) {
      this.open();
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, back to open
      this.open();
    }
  }

  private shouldAttemptHalfOpen(): boolean {
    const timeSinceFailure = Date.now() - this.lastFailureTime;
    return timeSinceFailure >= this.config.timeout;
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.logStateChange('OPEN');

    // Publish event
    messagebus.publish({
      topic: `plugin/${this.pluginId}/circuit-breaker`,
      messageType: 'event',
      payload: {
        state: 'open',
        failures: this.failures,
        timestamp: Date.now()
      }
    });
  }

  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.logStateChange('CLOSED');

    // Publish event
    messagebus.publish({
      topic: `plugin/${this.pluginId}/circuit-breaker`,
      messageType: 'event',
      payload: {
        state: 'closed',
        timestamp: Date.now()
      }
    });
  }

  private logStateChange(state: string): void {
    console.log(`[CircuitBreaker] ${this.pluginId} -> ${state}`);
  }
}
```

### 2. Retry Policy

```typescript
interface RetryConfig {
  maxRetries: number;
  backoff: 'linear' | 'exponential' | 'fibonacci';
  initialDelay: number;
  maxDelay: number;
  retryableErrors?: string[];
}

class RetryPolicy {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Last attempt, don't retry
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt);

        console.log(
          `[Retry] Attempt ${attempt + 1}/${this.config.maxRetries} ` +
          `failed for ${context || 'operation'}. ` +
          `Retrying in ${delay}ms...`
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryable(error: any): boolean {
    if (!this.config.retryableErrors) {
      return true; // Retry all errors if not specified
    }

    return this.config.retryableErrors.some(
      retryableError => error.message?.includes(retryableError)
    );
  }

  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.config.backoff) {
      case 'linear':
        delay = this.config.initialDelay * (attempt + 1);
        break;

      case 'exponential':
        delay = this.config.initialDelay * Math.pow(2, attempt);
        break;

      case 'fibonacci':
        delay = this.config.initialDelay * this.fibonacci(attempt + 1);
        break;
    }

    return Math.min(delay, this.config.maxDelay);
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i < n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. Graceful Degradation

```typescript
class GracefulDegradation {
  async executeWithFallbacks<T>(
    primaryOperation: () => Promise<T>,
    fallbacks: Array<() => Promise<T>>,
    context?: string
  ): Promise<T> {

    // Try primary operation
    try {
      return await primaryOperation();
    } catch (primaryError) {
      console.warn(
        `[Degradation] Primary operation failed for ${context}:`,
        primaryError
      );

      // Try fallbacks in order
      for (let i = 0; i < fallbacks.length; i++) {
        try {
          console.log(
            `[Degradation] Attempting fallback ${i + 1}/${fallbacks.length}...`
          );
          return await fallbacks[i]();
        } catch (fallbackError) {
          console.warn(
            `[Degradation] Fallback ${i + 1} failed:`,
            fallbackError
          );

          // If last fallback, rethrow
          if (i === fallbacks.length - 1) {
            throw new Error(
              `All fallbacks exhausted for ${context}. ` +
              `Last error: ${fallbackError}`
            );
          }
        }
      }
    }

    throw new Error(`Unreachable code in graceful degradation`);
  }
}

// Example usage
const degradation = new GracefulDegradation();

const result = await degradation.executeWithFallbacks(
  // Primary: Use specialized plugin
  () => pluginRouter.route('exec-automator', task),

  // Fallbacks
  [
    // Fallback 1: Use alternative plugin
    () => pluginRouter.route('jira-orchestrator', task),

    // Fallback 2: Use built-in agent
    () => builtInAgent.execute(task),

    // Fallback 3: Return cached result or default
    () => cacheManager.getOrDefault(task.id, defaultResult)
  ],

  'execute_automation_task'
);
```

---

## Command Chaining Patterns

### 1. Sequential Chain

```typescript
interface ChainStep {
  plugin: string;
  command: string;
  parameters: any;
  condition?: (previousResult: any) => boolean;
  transform?: (previousResult: any) => any;
}

class SequentialChain {
  async execute(steps: ChainStep[]): Promise<any> {
    let result: any = null;

    for (const step of steps) {
      // Check condition if specified
      if (step.condition && !step.condition(result)) {
        console.log(`[Chain] Skipping step due to condition: ${step.command}`);
        continue;
      }

      // Transform previous result for this step
      const parameters = step.transform
        ? step.transform(result)
        : step.parameters;

      // Execute step
      console.log(`[Chain] Executing: ${step.plugin}/${step.command}`);
      result = await pluginRouter.executeCommand(
        step.plugin,
        step.command,
        parameters
      );
    }

    return result;
  }
}

// Example: Jira workflow
const chain = new SequentialChain();

await chain.execute([
  {
    plugin: 'jira-orchestrator',
    command: 'jira:prepare',
    parameters: { issueKey: 'PROJ-123' }
  },
  {
    plugin: 'jira-orchestrator',
    command: 'jira:work',
    parameters: { issueKey: 'PROJ-123' },
    transform: (prev) => ({ issueKey: prev.issueKey })
  },
  {
    plugin: 'jira-orchestrator',
    command: 'jira:pr',
    parameters: {},
    condition: (prev) => prev.status === 'completed'
  },
  {
    plugin: 'jira-orchestrator',
    command: 'jira:docs',
    parameters: {},
    transform: (prev) => ({ prUrl: prev.pullRequestUrl })
  }
]);
```

### 2. Parallel Chain

```typescript
class ParallelChain {
  async execute(steps: ChainStep[]): Promise<any[]> {
    const promises = steps.map(step =>
      pluginRouter.executeCommand(
        step.plugin,
        step.command,
        step.parameters
      )
    );

    return await Promise.all(promises);
  }

  async executeWithTimeout(
    steps: ChainStep[],
    timeout: number
  ): Promise<any[]> {
    const promises = steps.map(step =>
      this.withTimeout(
        pluginRouter.executeCommand(
          step.plugin,
          step.command,
          step.parameters
        ),
        timeout
      )
    );

    return await Promise.all(promises);
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }
}

// Example: Multi-plugin analysis
const parallelChain = new ParallelChain();

const [codeAnalysis, infraAnalysis, securityAnalysis] = await parallelChain.execute([
  {
    plugin: 'frontend-powerhouse',
    command: 'analyze-components',
    parameters: { directory: 'src/components' }
  },
  {
    plugin: 'ahling-command-center',
    command: 'analyze-infrastructure',
    parameters: { directory: 'deployment' }
  },
  {
    plugin: 'jira-orchestrator',
    command: 'security-scan',
    parameters: { scope: 'all' }
  }
]);
```

### 3. Conditional Chain

```typescript
class ConditionalChain {
  async execute(
    condition: () => Promise<boolean>,
    trueBranch: ChainStep[],
    falseBranch?: ChainStep[]
  ): Promise<any> {

    const shouldExecuteTrueBranch = await condition();

    if (shouldExecuteTrueBranch) {
      console.log('[ConditionalChain] Executing true branch');
      return await new SequentialChain().execute(trueBranch);
    } else if (falseBranch) {
      console.log('[ConditionalChain] Executing false branch');
      return await new SequentialChain().execute(falseBranch);
    }

    return null;
  }
}

// Example: Environment-based deployment
const conditionalChain = new ConditionalChain();

await conditionalChain.execute(
  // Condition: Is production?
  async () => {
    const env = await getEnvironment();
    return env === 'production';
  },

  // True branch: Full production deployment
  [
    {
      plugin: 'ahling-command-center',
      command: 'build-docker-image',
      parameters: { tag: 'prod' }
    },
    {
      plugin: 'ahling-command-center',
      command: 'run-security-scan',
      parameters: { severity: 'high' }
    },
    {
      plugin: 'ahling-command-center',
      command: 'deploy-kubernetes',
      parameters: { namespace: 'production' }
    }
  ],

  // False branch: Dev deployment
  [
    {
      plugin: 'ahling-command-center',
      command: 'build-docker-image',
      parameters: { tag: 'dev' }
    },
    {
      plugin: 'ahling-command-center',
      command: 'deploy-kubernetes',
      parameters: { namespace: 'development' }
    }
  ]
);
```

### 4. Saga Pattern (with Rollback)

```typescript
interface SagaStep {
  plugin: string;
  command: string;
  parameters: any;
  compensate: {
    command: string;
    parameters: (result: any) => any;
  };
}

class SagaChain {
  private executedSteps: Array<{
    step: SagaStep;
    result: any;
  }> = [];

  async execute(steps: SagaStep[]): Promise<any> {
    try {
      let result: any = null;

      for (const step of steps) {
        result = await pluginRouter.executeCommand(
          step.plugin,
          step.command,
          step.parameters
        );

        // Store executed step for potential rollback
        this.executedSteps.push({ step, result });
      }

      return result;

    } catch (error) {
      console.error('[Saga] Error occurred, initiating rollback...', error);
      await this.rollback();
      throw error;
    }
  }

  private async rollback(): Promise<void> {
    // Rollback in reverse order
    const stepsToRollback = [...this.executedSteps].reverse();

    for (const { step, result } of stepsToRollback) {
      try {
        console.log(`[Saga] Rolling back: ${step.plugin}/${step.command}`);

        const compensateParams = step.compensate.parameters(result);

        await pluginRouter.executeCommand(
          step.plugin,
          step.compensate.command,
          compensateParams
        );

      } catch (rollbackError) {
        console.error(
          `[Saga] Rollback failed for ${step.command}:`,
          rollbackError
        );
        // Continue with remaining rollbacks
      }
    }

    this.executedSteps = [];
  }
}

// Example: Multi-step deployment with rollback
const saga = new SagaChain();

await saga.execute([
  {
    plugin: 'lobbi-platform-manager',
    command: 'create-tenant',
    parameters: { tenantId: 'acme-corp' },
    compensate: {
      command: 'delete-tenant',
      parameters: (result) => ({ tenantId: result.tenantId })
    }
  },
  {
    plugin: 'lobbi-platform-manager',
    command: 'configure-keycloak',
    parameters: { tenantId: 'acme-corp' },
    compensate: {
      command: 'remove-keycloak-config',
      parameters: (result) => ({ realmId: result.realmId })
    }
  },
  {
    plugin: 'ahling-command-center',
    command: 'deploy-tenant-resources',
    parameters: { tenantId: 'acme-corp' },
    compensate: {
      command: 'destroy-tenant-resources',
      parameters: (result) => ({ resourceIds: result.createdResources })
    }
  }
]);
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goals:** Establish core communication infrastructure

1. **Message Bus Implementation**
   - Implement topic-based message bus
   - Create message format standard
   - Build pub/sub mechanism
   - Add request/response pattern

2. **Enhanced Plugin Manifest**
   - Extend plugin.json schema
   - Add routing configuration
   - Add communication settings
   - Add error handling config

3. **Central State Database**
   - Create SQLite schema
   - Implement WAL mode
   - Build state manager
   - Add basic CRDT support

**Deliverables:**
- Message bus library (`lib/messagebus.ts`)
- Updated plugin schema
- Central state database
- Documentation

---

### Phase 2: Routing Engine (Weeks 3-4)

**Goals:** Build intelligent routing system

1. **Request Classifier**
   - Implement domain classification
   - Build complexity assessment
   - Add keyword extraction
   - Create context analyzer

2. **Capability Matcher**
   - Build plugin scoring algorithm
   - Implement capability matching
   - Add health check integration
   - Create availability tracking

3. **Routing Decision Engine**
   - Implement plugin selection
   - Build collaboration planner
   - Add execution strategy selector
   - Create cost/duration estimator

**Deliverables:**
- Routing engine (`lib/routing-engine.ts`)
- Classifier service
- Capability matcher
- Decision engine

---

### Phase 3: Agent Registry (Weeks 5-6)

**Goals:** Create unified agent discovery

1. **Registry Implementation**
   - Build agent registration system
   - Implement agent discovery
   - Add capability indexing
   - Create agent metrics tracking

2. **Cross-Plugin Discovery**
   - Implement global agent search
   - Build team builder
   - Add agent ranking
   - Create agent status tracking

3. **Integration**
   - Integrate with routing engine
   - Connect to message bus
   - Add telemetry hooks

**Deliverables:**
- Unified agent registry
- Discovery service
- Registry CLI tools
- Integration tests

---

### Phase 4: Error Handling (Weeks 7-8)

**Goals:** Build resilient error handling

1. **Circuit Breaker**
   - Implement circuit breaker pattern
   - Add state management
   - Create monitoring hooks
   - Build recovery logic

2. **Retry Policies**
   - Implement retry strategies
   - Add backoff algorithms
   - Create retryable error detection

3. **Graceful Degradation**
   - Build fallback chains
   - Implement degradation strategies
   - Add cache fallbacks

**Deliverables:**
- Circuit breaker library
- Retry policy system
- Degradation framework
- Error handling docs

---

### Phase 5: Command Chaining (Weeks 9-10)

**Goals:** Enable complex workflows

1. **Chain Implementations**
   - Build sequential chain
   - Implement parallel chain
   - Create conditional chain
   - Add saga pattern

2. **Chain Orchestration**
   - Create chain executor
   - Add chain visualization
   - Implement chain debugging
   - Build chain templates

3. **Integration**
   - Integrate with routing engine
   - Connect to message bus
   - Add telemetry

**Deliverables:**
- Chain execution library
- Chain templates
- Workflow builder
- Documentation

---

### Phase 6: Testing & Documentation (Weeks 11-12)

**Goals:** Comprehensive testing and docs

1. **Testing**
   - Unit tests (90% coverage)
   - Integration tests
   - End-to-end tests
   - Performance tests

2. **Documentation**
   - Architecture diagrams
   - API documentation
   - Plugin developer guide
   - Migration guide

3. **Tooling**
   - CLI tools
   - Monitoring dashboard
   - Debugging tools

**Deliverables:**
- Test suite
- Complete documentation
- CLI tools
- Migration scripts

---

### Phase 7: Migration & Deployment (Weeks 13-14)

**Goals:** Migrate existing plugins

1. **Plugin Migration**
   - Update jira-orchestrator (central brain)
   - Migrate exec-automator
   - Migrate home-assistant
   - Migrate frontend-powerhouse
   - Migrate ahling-command-center
   - Migrate lobbi-platform-manager

2. **Validation**
   - Test inter-plugin communication
   - Validate routing decisions
   - Test error handling
   - Performance benchmarking

3. **Deployment**
   - Deploy to production
   - Monitor performance
   - Gather metrics

**Deliverables:**
- All plugins migrated
- Performance reports
- Production deployment

---

## Appendices

### A. Example Routing Decision

```json
{
  "requestId": "req_abc123",
  "userInput": "Build a FastAPI endpoint with MongoDB and Keycloak auth",

  "classification": {
    "domain": ["backend", "api", "database", "authentication"],
    "complexity": "moderate",
    "contexts": ["python", "fastapi", "mongodb", "keycloak"],
    "patterns": ["rest-api", "jwt-auth"],
    "urgency": 5,
    "estimatedDuration": 1800000
  },

  "capabilityScores": [
    {
      "plugin": "fastapi-backend",
      "score": 95,
      "capabilities": [
        { "type": "domain", "value": "backend", "weight": 30 },
        { "type": "context", "value": "fastapi", "weight": 20 },
        { "type": "context", "value": "mongodb", "weight": 20 },
        { "type": "pattern", "value": "rest-api", "weight": 15 }
      ],
      "health": { "status": "up", "latency": 50 },
      "availability": 0.98
    },
    {
      "plugin": "lobbi-platform-manager",
      "score": 75,
      "capabilities": [
        { "type": "context", "value": "keycloak", "weight": 20 },
        { "type": "domain", "value": "authentication", "weight": 30 }
      ],
      "health": { "status": "up", "latency": 60 },
      "availability": 1.0
    }
  ],

  "routingDecision": {
    "primaryPlugin": "fastapi-backend",
    "fallbackPlugins": ["lobbi-platform-manager", "jira-orchestrator"],
    "collaborationPlan": {
      "phases": [
        {
          "domain": "backend",
          "plugin": "fastapi-backend",
          "dependencies": [],
          "parallel": false
        },
        {
          "domain": "authentication",
          "plugin": "lobbi-platform-manager",
          "dependencies": ["backend"],
          "parallel": false
        }
      ],
      "coordinator": "jira-orchestrator",
      "estimatedDuration": 2100000
    },
    "executionStrategy": "sequential_collaboration",
    "estimatedCost": 0.15,
    "estimatedDuration": 2100000
  }
}
```

### B. Plugin Communication Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ "Build FastAPI endpoint"
       ▼
┌──────────────────────────────────────┐
│   Jira Orchestrator                  │
│   (Meta-Controller)                  │
│                                      │
│  1. Request Classifier               │
│     → backend, api, database         │
│                                      │
│  2. Capability Matcher               │
│     → fastapi-backend (95)           │
│     → lobbi-platform (75)            │
│                                      │
│  3. Routing Decision                 │
│     → Primary: fastapi-backend       │
│     → Collaborate: lobbi-platform    │
└──────┬──────────────┬────────────────┘
       │              │
       ▼              ▼
┌──────────────┐  ┌──────────────────┐
│  FastAPI     │  │  Lobbi Platform  │
│  Backend     │  │  Manager         │
│              │  │                  │
│  - Create    │  │  - Configure     │
│    endpoint  │  │    Keycloak      │
│  - MongoDB   │  │  - JWT setup     │
│    schema    │  │                  │
└──────┬───────┘  └───────┬──────────┘
       │                  │
       └────────┬─────────┘
                │
                ▼
       ┌─────────────────┐
       │  Message Bus    │
       │  - Task events  │
       │  - State sync   │
       │  - Metrics      │
       └─────────────────┘
```

### C. State Synchronization Example

```typescript
// Plugin A (fastapi-backend) creates endpoint
await stateManager.setRegister('current_endpoint', {
  path: '/api/users',
  method: 'POST',
  authentication: 'required'
});

// Broadcast to message bus
messagebus.publish({
  topic: 'state/fastapi-backend/change',
  payload: {
    type: 'register',
    key: 'current_endpoint',
    value: {...}
  }
});

// Plugin B (lobbi-platform-manager) receives and merges
messagebus.subscribe('state/*/change', async (message) => {
  await stateManager.mergeChanges(
    message.payload.type,
    message.payload.key,
    message.payload.value
  );

  // Use the endpoint info to configure Keycloak
  const endpoint = stateManager.getRegister('current_endpoint');
  await configureKeycloakClient(endpoint);
});
```

---

## Summary

This architecture provides:

1. **Centralized Intelligence** - Jira Orchestrator routes all requests
2. **Plugin Autonomy** - Each plugin manages its domain
3. **Seamless Communication** - Message bus for all inter-plugin communication
4. **Unified Discovery** - Global agent registry across all plugins
5. **Distributed State** - CRDTs for conflict-free state management
6. **Resilient Execution** - Circuit breakers, retries, graceful degradation
7. **Complex Workflows** - Sequential, parallel, conditional, saga patterns
8. **Observable** - Full telemetry and distributed tracing

**Next Steps:** Begin Phase 1 implementation with message bus and enhanced plugin manifests.

---

**Architecture Version:** 1.0.0
**Last Updated:** 2025-12-26
**Author:** architect-supreme
**Status:** Ready for Implementation
