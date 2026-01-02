---
name: Jira Issue Triage and Routing
description: This skill should be used when the user asks to "triage issue", "classify ticket", "route jira", "analyze priority", "categorize issue", "determine complexity", "route to agents", or needs guidance on classifying, prioritizing, and routing Jira issues to appropriate agents and workflows.
version: 1.0.0
trigger_phrases:
  - "triage issue"
  - "classify ticket"
  - "route jira"
  - "analyze priority"
  - "categorize issue"
  - "determine complexity"
  - "assess severity"
  - "route to agents"
  - "triage workflow"
  - "issue classification"
categories: ["jira", "triage", "routing", "classification", "prioritization"]
---

# Jira Issue Triage and Routing Skill

Intelligent classification, prioritization, and routing system for Jira issues to ensure optimal agent selection and workflow execution.

## When to Use This Skill

Activate this skill when:
- A new Jira issue needs classification and routing
- Determining which agents should handle an issue
- Assessing issue complexity and effort estimation
- Deciding between quick-fix vs full workflow execution
- Identifying whether to decompose epics or execute directly
- Evaluating priority and severity levels
- Routing issues based on type, technology, and complexity
- Determining escalation criteria and risk factors

## Core Triage Capabilities

### 1. Issue Classification
Automatically categorize issues into the right type and identify characteristics for optimal handling.

### 2. Complexity Analysis
Assess technical complexity to determine resource allocation and workflow path.

### 3. Priority Assessment
Evaluate business impact and urgency to inform routing decisions.

### 4. Agent Selection
Match issues to the most appropriate agents based on issue characteristics.

### 5. Workflow Routing
Direct issues to the optimal workflow path (quick-fix, full development, research, decomposition).

### 6. Risk Assessment
Identify risk factors that require escalation or special handling.

## Triage Decision Tree

```
START: New Jira Issue
│
├─ Step 1: ISSUE TYPE CLASSIFICATION
│  │
│  ├─ Is it a Bug?
│  │  ├─ YES → Classify Bug Severity (Blocker/Critical/Major/Minor)
│  │  │  ├─ Blocker/Critical → FLAG: High Priority Path
│  │  │  ├─ Can reproduce? → NO → FLAG: Needs More Info
│  │  │  └─ Security-related? → YES → FLAG: Security Review Required
│  │  │
│  │  └─ NO → Continue to next type
│  │
│  ├─ Is it a Story/Feature?
│  │  ├─ YES → Analyze Feature Complexity
│  │  │  ├─ Clear requirements? → NO → Route to requirements-analyzer
│  │  │  ├─ Single sprint scope? → NO → FLAG: Consider Epic
│  │  │  └─ Dependencies clear? → NO → Route to dependency-mapper
│  │  │
│  │  └─ NO → Continue to next type
│  │
│  ├─ Is it an Epic?
│  │  ├─ YES → Epic Decomposition Required
│  │  │  ├─ Route to epic-decomposer agent
│  │  │  ├─ Do NOT execute directly
│  │  │  └─ Create child Stories first
│  │  │
│  │  └─ NO → Continue to next type
│  │
│  ├─ Is it a Task?
│  │  ├─ YES → Determine Task Category
│  │  │  ├─ Technical Debt → Route to code-quality agents
│  │  │  ├─ Configuration → Route to devops agents
│  │  │  └─ Documentation → Route to documentation agents
│  │  │
│  │  └─ NO → Continue to next type
│  │
│  └─ Is it a Spike/Research?
│     ├─ YES → Research Path
│     │  ├─ Time-boxed investigation
│     │  ├─ Route to research-specialist
│     │  └─ Create follow-up Stories after research
│     │
│     └─ NO → FLAG: Unknown Type (needs human review)
│
├─ Step 2: COMPLEXITY ASSESSMENT
│  │
│  ├─ Analyze Code Impact
│  │  ├─ Single file change → SIMPLE (1-2 points)
│  │  ├─ Multiple files, single service → MEDIUM (3-5 points)
│  │  ├─ Multiple services, cross-cutting → COMPLEX (8-13 points)
│  │  └─ Architecture change, multi-team → EPIC (21+ points)
│  │
│  ├─ Evaluate Technical Factors
│  │  ├─ New technology/framework? → +Complexity
│  │  ├─ Database migrations? → +Complexity
│  │  ├─ External API integration? → +Complexity
│  │  ├─ Performance requirements? → +Complexity
│  │  └─ Security implications? → +Complexity, +Risk
│  │
│  └─ Score Complexity (1-100 scale)
│     ├─ 1-20: SIMPLE → Quick-fix path eligible
│     ├─ 21-40: MODERATE → Standard workflow
│     ├─ 41-70: COMPLEX → Extended workflow, senior agents
│     └─ 71+: VERY COMPLEX → Epic decomposition or extended thinking
│
├─ Step 3: PRIORITY & SEVERITY ASSESSMENT
│  │
│  ├─ Business Impact Analysis
│  │  ├─ Blocks production? → BLOCKER
│  │  ├─ Critical business function? → CRITICAL
│  │  ├─ Important feature/fix? → HIGH
│  │  ├─ Nice-to-have improvement? → MEDIUM
│  │  └─ Future consideration? → LOW
│  │
│  ├─ Urgency Evaluation
│  │  ├─ Immediate (hours) → BLOCKER/CRITICAL
│  │  ├─ This sprint → HIGH
│  │  ├─ Next sprint → MEDIUM
│  │  └─ Backlog → LOW
│  │
│  └─ Severity Matrix (for Bugs)
│     ├─ BLOCKER: Production down, data loss, security breach
│     ├─ CRITICAL: Major functionality broken, workaround exists
│     ├─ MAJOR: Important feature degraded, affects many users
│     └─ MINOR: Cosmetic, affects few users, easy workaround
│
├─ Step 4: WORKFLOW ROUTING DECISION
│  │
│  ├─ QUICK-FIX PATH (Bypass full workflow)
│  │  ├─ Criteria:
│  │  │  ├─ Complexity: SIMPLE (1-20 score)
│  │  │  ├─ Impact: Single file, <50 LOC
│  │  │  ├─ Risk: LOW (no breaking changes)
│  │  │  ├─ Type: Bug fix, typo, config change
│  │  │  └─ Tests: Existing tests sufficient
│  │  │
│  │  ├─ Workflow: EXPLORE (lite) → CODE → TEST → COMMIT
│  │  │  ├─ Use 2-3 agents (vs 3-5+)
│  │  │  ├─ Skip detailed planning phase
│  │  │  └─ Fast-track testing
│  │  │
│  │  └─ Agents: bug-fixer, test-runner, git-specialist
│  │
│  ├─ STANDARD WORKFLOW (Full 6-phase)
│  │  ├─ Criteria:
│  │  │  ├─ Complexity: MODERATE (21-40 score)
│  │  │  ├─ Type: Standard story, medium bug, task
│  │  │  ├─ Risk: MEDIUM
│  │  │  └─ Clear requirements
│  │  │
│  │  ├─ Workflow: EXPLORE → PLAN → CODE → TEST → FIX → COMMIT
│  │  │  ├─ Use 3-5 agents minimum
│  │  │  ├─ Full planning and testing
│  │  │  └─ Comprehensive documentation
│  │  │
│  │  └─ Agents: Selected by technology and complexity
│  │
│  ├─ EXTENDED WORKFLOW (Complex issues)
│  │  ├─ Criteria:
│  │  │  ├─ Complexity: COMPLEX (41-70 score)
│  │  │  ├─ Type: Large story, architecture change
│  │  │  ├─ Risk: HIGH
│  │  │  └─ Multiple teams involved
│  │  │
│  │  ├─ Workflow: EXPLORE (deep) → PLAN (detailed) → CODE (parallel) → TEST (comprehensive) → FIX → DOCUMENT → COMMIT
│  │  │  ├─ Use 5-13 agents
│  │  │  ├─ Enable extended thinking for planning
│  │  │  ├─ Parallel execution where possible
│  │  │  └─ Human checkpoints at each phase
│  │  │
│  │  └─ Agents: Senior specialists, architects, multiple technology experts
│  │
│  ├─ RESEARCH PATH (Spikes)
│  │  ├─ Criteria:
│  │  │  ├─ Type: Spike, POC, Investigation
│  │  │  ├─ Unknown complexity
│  │  │  ├─ Exploratory work
│  │  │  └─ Time-boxed
│  │  │
│  │  ├─ Workflow: RESEARCH → DOCUMENT → CREATE STORIES
│  │  │  ├─ Time-boxed investigation (1-2 days)
│  │  │  ├─ Document findings
│  │  │  └─ Create actionable stories from research
│  │  │
│  │  └─ Agents: research-specialist, poc-developer, documentation-writer
│  │
│  └─ DECOMPOSITION PATH (Epics)
│     ├─ Criteria:
│     │  ├─ Type: Epic or oversized story
│     │  ├─ Complexity: VERY COMPLEX (71+ score)
│     │  ├─ Multi-sprint scope
│     │  └─ Requires coordination
│     │
│     ├─ Workflow: ANALYZE → DECOMPOSE → CREATE STORIES → ROUTE STORIES
│     │  ├─ Do NOT implement epic directly
│     │  ├─ Break into manageable stories
│     │  ├─ Create dependency graph
│     │  └─ Route each story through appropriate workflow
│     │
│     └─ Agents: epic-decomposer, strategic-planner, requirements-analyzer
│
├─ Step 5: AGENT SELECTION
│  │
│  ├─ Technology-Based Selection
│  │  ├─ Frontend (React, Vue, Angular)
│  │  │  └─ Agents: frontend-developer, ui-specialist, component-builder
│  │  │
│  │  ├─ Backend (Node, Python, Java, Go)
│  │  │  └─ Agents: backend-developer, api-specialist, service-developer
│  │  │
│  │  ├─ Database (SQL, NoSQL, migrations)
│  │  │  └─ Agents: database-expert, migration-specialist
│  │  │
│  │  ├─ DevOps (K8s, Docker, CI/CD)
│  │  │  └─ Agents: infra-engineer, k8s-specialist, cicd-expert
│  │  │
│  │  └─ Full-Stack
│  │     └─ Agents: Combination of frontend + backend + database
│  │
│  ├─ Issue-Type-Based Selection
│  │  ├─ Bug → bug-fixer, debugger, root-cause-investigator
│  │  ├─ Story → feature-architect, code-architect, implementation-strategist
│  │  ├─ Task → technical-planner, specialist-by-domain
│  │  ├─ Epic → epic-decomposer, strategic-planner
│  │  └─ Spike → research-specialist, poc-developer
│  │
│  ├─ Complexity-Based Selection
│  │  ├─ SIMPLE → Junior agents, efficiency-focused
│  │  ├─ MODERATE → Standard agents, balanced capability
│  │  ├─ COMPLEX → Senior agents, extended thinking enabled
│  │  └─ VERY COMPLEX → Architect-level agents, human oversight
│  │
│  └─ Phase-Specific Selection
│     ├─ EXPLORE: code-analyst, requirements-analyzer, dependency-mapper
│     ├─ PLAN: feature-architect, technical-planner, risk-assessor
│     ├─ CODE: Technology-specific developers
│     ├─ TEST: test-engineer, qa-specialist, integration-tester
│     ├─ FIX: debugger, refactoring-specialist
│     └─ COMMIT: git-specialist, pr-creator, documentation-writer
│
├─ Step 6: RISK & ESCALATION ASSESSMENT
│  │
│  ├─ Identify Risk Factors
│  │  ├─ Security implications → FLAG: Security review required
│  │  ├─ Breaking changes → FLAG: Stakeholder approval needed
│  │  ├─ Data migrations → FLAG: Backup and rollback plan required
│  │  ├─ External dependencies → FLAG: Vendor coordination needed
│  │  ├─ Compliance requirements → FLAG: Legal review required
│  │  └─ Customer-facing changes → FLAG: Product owner approval
│  │
│  ├─ Escalation Criteria
│  │  ├─ IMMEDIATE ESCALATION (Stop and notify humans)
│  │  │  ├─ Security vulnerability discovered
│  │  │  ├─ Data loss risk identified
│  │  │  ├─ Breaking change affects multiple teams
│  │  │  ├─ Legal/compliance concern
│  │  │  └─ Budget/resource constraint exceeded
│  │  │
│  │  ├─ CHECKPOINT ESCALATION (Continue with human approval)
│  │  │  ├─ Complexity exceeds initial estimate by >50%
│  │  │  ├─ Blocker persists >4 hours
│  │  │  ├─ Technical decision beyond agent authority
│  │  │  └─ Scope creep detected
│  │  │
│  │  └─ POST-COMPLETION REVIEW (Notify after completion)
│  │     ├─ Standard bug fixes
│  │     ├─ Documentation updates
│  │     ├─ Test additions
│  │     └─ Minor refactoring
│  │
│  └─ Risk Mitigation Strategies
│     ├─ HIGH RISK → Human checkpoints at each phase
│     ├─ MEDIUM RISK → Human review before deployment
│     ├─ LOW RISK → Post-merge human review
│     └─ MINIMAL RISK → Automated review only
│
└─ Step 7: OUTPUT ROUTING DECISION
   │
   ├─ Generate Routing Package
   │  ├─ Issue Classification
   │  ├─ Complexity Score & Breakdown
   │  ├─ Priority/Severity Assessment
   │  ├─ Workflow Path Selected
   │  ├─ Agent Selection Recommendation
   │  ├─ Risk Assessment
   │  ├─ Escalation Triggers
   │  └─ Execution Plan
   │
   └─ Execute Routing
      ├─ Update Jira issue labels
      ├─ Assign to appropriate workflow
      ├─ Spawn selected agents
      ├─ Set monitoring checkpoints
      └─ Document triage decision
```

## Issue Type Classification Matrix

### Bug Classification

**Detection Patterns:**
- Title contains: "bug", "broken", "error", "fail", "crash", "not working"
- Description mentions: error messages, stack traces, unexpected behavior
- Issue type explicitly set to "Bug"

**Severity Classification:**

| Severity | Criteria | Examples | SLA | Agent Priority |
|----------|----------|----------|-----|----------------|
| **BLOCKER** | Production down, complete service outage, data loss, security breach | • Database corruption<br>• Authentication completely broken<br>• Payment processing down<br>• Site-wide crash | Immediate (1-4 hours) | critical-bug-analyzer, security-specialist, senior-debugger |
| **CRITICAL** | Major functionality broken, many users affected, workaround exists but difficult | • Login fails for 50% of users<br>• Checkout fails intermittently<br>• API returns 500 errors<br>• Core feature unusable | Same day (4-8 hours) | critical-bug-analyzer, root-cause-investigator, integration-tester |
| **MAJOR** | Important feature degraded, moderate user impact, reasonable workaround | • Search results incomplete<br>• Export fails for large datasets<br>• Email notifications delayed<br>• UI rendering issues | 1-3 days | bug-fixer, debugger, test-engineer |
| **MINOR** | Cosmetic issues, low user impact, easy workaround | • Typo in UI text<br>• Alignment issue<br>• Icon missing<br>• Log message incorrect | Next sprint | junior-developer, ui-specialist |

**Bug Routing Decision Tree:**

```
Bug Detected
│
├─ Can reproduce consistently?
│  ├─ NO → Route to requirements-analyzer (gather reproduction steps)
│  │      → Label: "needs-reproduction"
│  │      → Status: "Needs More Info"
│  │
│  └─ YES → Continue
│
├─ Is it a security vulnerability?
│  ├─ YES → IMMEDIATE ESCALATION
│  │       → Route to security-specialist
│  │       → Label: "security", "urgent"
│  │       → Notify security team
│  │       → Create incident ticket
│  │
│  └─ NO → Continue
│
├─ What is the severity?
│  ├─ BLOCKER/CRITICAL
│  │  ├─ Workflow: Quick-Fix if simple, else Extended Workflow
│  │  ├─ Agents: critical-bug-analyzer, root-cause-investigator
│  │  ├─ Enable extended thinking for root cause analysis
│  │  ├─ Human checkpoints: After root cause, before deployment
│  │  └─ Parallel execution: Hotfix + long-term fix
│  │
│  ├─ MAJOR
│  │  ├─ Workflow: Standard Workflow
│  │  ├─ Agents: bug-fixer, debugger, test-engineer
│  │  ├─ Add regression tests
│  │  └─ Human review before merge
│  │
│  └─ MINOR
│     ├─ Workflow: Quick-Fix Path
│     ├─ Agents: junior-developer or specialist
│     ├─ Batch with similar minor fixes
│     └─ Automated review sufficient
│
└─ Root Cause Known?
   ├─ YES → Proceed to CODE phase
   └─ NO → Extend EXPLORE phase
           → Use debugger, log-analyzer
           → Profile performance if relevant
```

### Feature/Story Classification

**Detection Patterns:**
- Title contains: "add", "implement", "create", "build", "feature"
- Issue type: "Story", "New Feature"
- User story format: "As a... I want... so that..."

**Complexity Assessment:**

| Complexity | Criteria | Story Points | Agents | Workflow |
|------------|----------|--------------|--------|----------|
| **SIMPLE** | • Single component<br>• Clear requirements<br>• No integrations<br>• <100 LOC | 1-2 | 2-3 agents | Quick-Fix or Standard |
| **MODERATE** | • Multiple components<br>• Some integration<br>• 100-500 LOC<br>• Standard testing | 3-5 | 3-5 agents | Standard Workflow |
| **COMPLEX** | • Cross-cutting changes<br>• Multiple integrations<br>• 500-2000 LOC<br>• Extensive testing | 8-13 | 5-10 agents | Extended Workflow |
| **EPIC** | • Multiple features<br>• Multi-sprint<br>• 2000+ LOC<br>• Coordination needed | 21+ | Decompose first | Decomposition Path |

**Feature Routing Logic:**

```
Feature/Story Detected
│
├─ Requirements clear and complete?
│  ├─ NO → Route to requirements-analyzer first
│  │      → Extract acceptance criteria
│  │      → Identify edge cases
│  │      → Generate test scenarios
│  │      → Return to triage after enrichment
│  │
│  └─ YES → Continue
│
├─ Single sprint scope?
│  ├─ NO → Consider Epic decomposition
│  │      → Route to epic-decomposer
│  │      → Break into smaller stories
│  │      → Create dependency graph
│  │      → Triage each child story
│  │
│  └─ YES → Continue
│
├─ Assess technical complexity
│  ├─ Technology stack?
│  │  ├─ Frontend → Select UI specialists
│  │  ├─ Backend → Select API specialists
│  │  ├─ Full-stack → Select both
│  │  └─ Infrastructure → Select DevOps specialists
│  │
│  ├─ Integration complexity?
│  │  ├─ No integrations → SIMPLE
│  │  ├─ Internal APIs → MODERATE
│  │  ├─ External APIs → COMPLEX
│  │  └─ Multiple external → VERY COMPLEX
│  │
│  └─ Risk factors?
│     ├─ Performance requirements → +Complexity
│     ├─ Security requirements → +Risk, security-specialist
│     ├─ Data migration → +Risk, database-expert
│     └─ Breaking changes → +Risk, human approval
│
├─ Complexity Score: 1-100
│  ├─ 1-20 (SIMPLE)
│  │  └─ Quick-Fix or Standard Workflow, 2-3 agents
│  │
│  ├─ 21-40 (MODERATE)
│  │  └─ Standard Workflow, 3-5 agents
│  │
│  ├─ 41-70 (COMPLEX)
│  │  └─ Extended Workflow, 5-10 agents, extended thinking
│  │
│  └─ 71+ (EPIC)
│     └─ Decomposition required
│
└─ Generate agent selection
   ├─ EXPLORE: requirements-analyzer, code-analyst, dependency-mapper
   ├─ PLAN: feature-architect, code-architect, security-specialist (if needed)
   ├─ CODE: Technology-specific developers (parallel execution)
   ├─ TEST: test-engineer, qa-specialist, integration-tester
   ├─ FIX: debugger, refactoring-specialist
   └─ COMMIT: git-specialist, documentation-writer
```

### Epic Classification

**Detection Patterns:**
- Issue type: "Epic"
- Scope spans multiple sprints
- Contains multiple distinct features
- Description mentions phases or milestones

**Epic Handling:**

```
Epic Detected
│
├─ NEVER implement epics directly
│  └─ Epic must be decomposed into Stories
│
├─ Epic Decomposition Process
│  │
│  ├─ Step 1: Analyze Epic Scope
│  │  ├─ Extract business objectives
│  │  ├─ Identify user journeys
│  │  ├─ Map functional areas
│  │  └─ Assess total complexity
│  │
│  ├─ Step 2: Identify Story Boundaries
│  │  ├─ Break by user journey
│  │  ├─ Break by component/service
│  │  ├─ Break by functional area
│  │  └─ Ensure each story is independent
│  │
│  ├─ Step 3: Create Story Skeleton
│  │  ├─ Story Title: Clear, specific
│  │  ├─ User Story: As a... I want... so that...
│  │  ├─ Acceptance Criteria: 3-7 criteria
│  │  ├─ Estimate Story Points: 1-13
│  │  └─ Link to Epic
│  │
│  ├─ Step 4: Map Dependencies
│  │  ├─ Identify prerequisite stories
│  │  ├─ Create dependency graph
│  │  ├─ Suggest implementation order
│  │  └─ Flag parallel work opportunities
│  │
│  └─ Step 5: Phase Planning
│     ├─ Phase 1: Foundation stories (must complete first)
│     ├─ Phase 2: Core feature stories (can parallelize)
│     ├─ Phase 3: Enhancement stories
│     └─ Phase 4: Polish and optimization
│
└─ Route each Story through Triage
   └─ Each story gets its own workflow
```

**Example Epic Decomposition:**

```markdown
## Epic: User Management System (PROJ-100)

### Original Epic Scope
Complete user management system with profiles, permissions, roles, and analytics.

### Decomposition Result: 8 Stories

#### Phase 1: Foundation (Sprint 1)
- **PROJ-101:** User Profile CRUD (5 points)
- **PROJ-102:** Role-Based Access Control (8 points)
- **PROJ-103:** Password Policy Enforcement (3 points)

#### Phase 2: Security (Sprint 2)
- **PROJ-104:** User Audit Logging (5 points)
- **PROJ-105:** Multi-Factor Authentication (8 points)

#### Phase 3: Admin Tools (Sprint 3)
- **PROJ-106:** Bulk User Operations (5 points)
- **PROJ-107:** User Import/Export (5 points)

#### Phase 4: Analytics (Sprint 4)
- **PROJ-108:** User Analytics Dashboard (8 points)

### Total Effort
- **Stories:** 8
- **Total Story Points:** 47
- **Estimated Sprints:** 4
- **Team Size:** 2-3 developers

### Dependencies
- PROJ-102 must complete before PROJ-106
- PROJ-101 should complete before PROJ-104
- PROJ-101, PROJ-102 should complete before PROJ-108
```

### Task Classification

**Detection Patterns:**
- Issue type: "Task"
- No user-facing changes
- Technical work, maintenance, or operations

**Task Categories:**

| Category | Examples | Agents | Workflow |
|----------|----------|--------|----------|
| **Technical Debt** | Code refactoring, dependency updates, cleanup | code-quality-specialist, refactoring-expert | Standard Workflow |
| **Configuration** | Environment setup, feature flags, settings | devops-specialist, config-manager | Quick-Fix Path |
| **Documentation** | API docs, README updates, runbooks | documentation-writer, technical-writer | Quick-Fix Path |
| **Infrastructure** | Server provisioning, scaling, monitoring | infra-engineer, k8s-specialist | Extended Workflow |
| **Testing** | Test coverage improvement, test refactoring | test-engineer, qa-specialist | Standard Workflow |
| **Operations** | Data migration, cleanup, manual operations | database-expert, ops-specialist | Extended Workflow |

### Spike/Research Classification

**Detection Patterns:**
- Issue type: "Spike"
- Title contains: "investigate", "research", "explore", "POC", "spike"
- Exploratory work with unknown outcome

**Spike Handling:**

```
Spike Detected
│
├─ Time-Box Definition (CRITICAL)
│  ├─ Small Spike: 1 day maximum
│  ├─ Medium Spike: 2-3 days maximum
│  └─ Large Spike: 1 week maximum (requires justification)
│
├─ Research Goals
│  ├─ Define specific questions to answer
│  ├─ Define success criteria
│  ├─ Define artifacts to produce
│  └─ Define decision to make
│
├─ Research Workflow
│  ├─ Phase 1: RESEARCH
│  │  ├─ Investigate technology/approach
│  │  ├─ Build proof-of-concept if needed
│  │  ├─ Document findings
│  │  └─ Assess feasibility
│  │
│  ├─ Phase 2: DOCUMENT
│  │  ├─ Write findings report
│  │  ├─ Recommend approach
│  │  ├─ Estimate effort for implementation
│  │  └─ Identify risks
│  │
│  └─ Phase 3: CREATE STORIES
│     ├─ Convert findings into actionable stories
│     ├─ Estimate story points based on research
│     ├─ Create implementation plan
│     └─ Route stories through triage
│
├─ Agents
│  └─ research-specialist, poc-developer, documentation-writer
│
└─ Output Requirement
   └─ Spike MUST produce either:
      ├─ Go/No-Go decision with justification
      ├─ Implementation stories with estimates
      └─ Recommendation with pros/cons
```

## Complexity Scoring System

Comprehensive scoring system to quantify issue complexity (0-100 scale).

### Complexity Factors and Weights

| Factor | Weight | Scoring Criteria (0-10) |
|--------|--------|------------------------|
| **Code Impact** | 25% | 0: No code change<br>2: Single file, <20 LOC<br>5: Multiple files, 100-500 LOC<br>8: Multiple services, 500-2000 LOC<br>10: Architecture change, >2000 LOC |
| **Integration Complexity** | 20% | 0: No integrations<br>3: Internal API calls<br>6: External API integration<br>8: Multiple external APIs<br>10: Complex event-driven integrations |
| **Risk Level** | 20% | 0: No risk<br>2: Low risk, isolated change<br>5: Medium risk, requires testing<br>8: High risk, breaking changes<br>10: Critical risk, data loss potential |
| **Testing Complexity** | 15% | 0: No new tests needed<br>3: Simple unit tests<br>5: Integration tests needed<br>8: E2E tests + performance tests<br>10: Complex test scenarios, mocking required |
| **Dependencies** | 10% | 0: No dependencies<br>3: Internal team dependencies<br>6: Other team dependencies<br>8: External vendor dependencies<br>10: Multiple blocking dependencies |
| **Uncertainty** | 10% | 0: Everything known<br>3: Minor unknowns<br>6: Moderate unknowns<br>8: Significant unknowns<br>10: Complete uncertainty, spike needed |

### Complexity Calculation

```javascript
// Pseudocode for complexity calculation
function calculateComplexity(issue) {
  const factors = {
    codeImpact: assessCodeImpact(issue),        // 0-10
    integration: assessIntegration(issue),       // 0-10
    risk: assessRisk(issue),                     // 0-10
    testing: assessTesting(issue),               // 0-10
    dependencies: assessDependencies(issue),     // 0-10
    uncertainty: assessUncertainty(issue)        // 0-10
  };

  const weights = {
    codeImpact: 0.25,
    integration: 0.20,
    risk: 0.20,
    testing: 0.15,
    dependencies: 0.10,
    uncertainty: 0.10
  };

  let complexityScore = 0;
  for (const [factor, score] of Object.entries(factors)) {
    complexityScore += score * weights[factor];
  }

  // Scale to 0-100
  complexityScore = complexityScore * 10;

  return {
    totalScore: complexityScore,
    breakdown: factors,
    category: categorizeComplexity(complexityScore),
    storyPoints: mapToStoryPoints(complexityScore)
  };
}

function categorizeComplexity(score) {
  if (score <= 20) return 'SIMPLE';
  if (score <= 40) return 'MODERATE';
  if (score <= 70) return 'COMPLEX';
  return 'VERY_COMPLEX';
}

function mapToStoryPoints(score) {
  if (score <= 10) return 1;
  if (score <= 20) return 2;
  if (score <= 30) return 3;
  if (score <= 40) return 5;
  if (score <= 50) return 8;
  if (score <= 70) return 13;
  return 21; // Epic-sized, needs decomposition
}
```

### Complexity Assessment Examples

**Example 1: Simple Bug Fix**
```markdown
Issue: Fix typo in error message

Code Impact: 2 (single file, 1 line change)
Integration: 0 (no integrations)
Risk: 1 (minimal risk)
Testing: 2 (verify error message displays)
Dependencies: 0 (none)
Uncertainty: 0 (completely known)

Complexity Score: (2×0.25) + (0×0.20) + (1×0.20) + (2×0.15) + (0×0.10) + (0×0.10) = 1.0 × 10 = 10
Category: SIMPLE
Story Points: 1
Workflow: Quick-Fix Path
```

**Example 2: Moderate Feature**
```markdown
Issue: Add CSV export functionality

Code Impact: 5 (3-4 files, 200-300 LOC)
Integration: 3 (internal service calls)
Risk: 4 (file generation, potential performance impact)
Testing: 6 (unit + integration + edge cases)
Dependencies: 2 (database team for query optimization)
Uncertainty: 3 (CSV format details need clarification)

Complexity Score: (5×0.25) + (3×0.20) + (4×0.20) + (6×0.15) + (2×0.10) + (3×0.10) = 3.65 × 10 = 36.5
Category: MODERATE
Story Points: 5
Workflow: Standard Workflow
```

**Example 3: Complex Integration**
```markdown
Issue: Integrate payment processing with Stripe

Code Impact: 7 (multiple services, 800 LOC)
Integration: 8 (external API, webhooks, idempotency)
Risk: 8 (payment handling, PCI compliance)
Testing: 9 (integration tests, security tests, webhook testing)
Dependencies: 6 (Stripe account setup, security review)
Uncertainty: 5 (Stripe API edge cases)

Complexity Score: (7×0.25) + (8×0.20) + (8×0.20) + (9×0.15) + (6×0.10) + (5×0.10) = 6.35 × 10 = 63.5
Category: COMPLEX
Story Points: 13
Workflow: Extended Workflow
Agents: payment-specialist, security-specialist, integration-tester
Human Checkpoints: After PLAN, before COMMIT
```

## Agent Selection Matrix

Comprehensive matrix for selecting the right agents based on issue characteristics.

### By Issue Type

| Issue Type | EXPLORE Phase | PLAN Phase | CODE Phase | TEST Phase | FIX Phase | COMMIT Phase |
|------------|---------------|------------|------------|------------|-----------|--------------|
| **Bug (Critical)** | critical-bug-analyzer<br>root-cause-investigator | hotfix-planner<br>risk-assessor | bug-fixer<br>security-specialist (if needed) | integration-tester<br>regression-tester | debugger<br>performance-optimizer | git-specialist<br>hotfix-releaser |
| **Bug (Standard)** | code-analyst<br>log-analyzer | bug-fix-planner | bug-fixer<br>test-engineer | test-runner<br>qa-specialist | debugger | git-specialist |
| **Story/Feature** | requirements-analyzer<br>dependency-mapper | feature-architect<br>code-architect | Technology specialists (see below) | test-engineer<br>qa-specialist<br>e2e-tester | refactoring-specialist | git-specialist<br>pr-creator<br>documentation-writer |
| **Task (Tech Debt)** | code-quality-analyst | refactoring-planner | refactoring-specialist<br>code-quality-improver | test-maintainer | N/A | git-specialist |
| **Task (Config)** | config-analyst | config-planner | devops-specialist<br>config-manager | config-tester | devops-debugger | git-specialist |
| **Epic** | epic-analyzer<br>strategic-planner | epic-decomposer<br>dependency-mapper | N/A (decompose first) | N/A | N/A | N/A |
| **Spike** | research-specialist | poc-planner | poc-developer | poc-validator | N/A | documentation-writer |

### By Technology Stack

| Technology | Primary Agents | Secondary Agents | When to Use |
|------------|----------------|------------------|-------------|
| **Frontend (React)** | react-specialist<br>frontend-developer | ui-specialist<br>component-builder<br>state-management-expert | React components, hooks, state management |
| **Frontend (Vue)** | vue-specialist<br>frontend-developer | component-builder<br>vuex-specialist | Vue components, Vuex, Vue Router |
| **Frontend (Angular)** | angular-specialist<br>frontend-developer | rxjs-specialist<br>ngrx-specialist | Angular components, RxJS, NgRx |
| **Backend (Node.js)** | nodejs-specialist<br>backend-developer | express-specialist<br>nestjs-specialist | Node.js APIs, Express, NestJS |
| **Backend (Python)** | python-specialist<br>backend-developer | django-specialist<br>fastapi-specialist | Python APIs, Django, FastAPI |
| **Backend (Java)** | java-specialist<br>backend-developer | spring-specialist | Java services, Spring Boot |
| **Backend (Go)** | golang-specialist<br>backend-developer | goroutine-specialist | Go services, concurrency |
| **Database (SQL)** | database-expert<br>sql-specialist | postgres-specialist<br>mysql-specialist<br>migration-specialist | SQL queries, schema changes, migrations |
| **Database (NoSQL)** | nosql-specialist | mongodb-specialist<br>redis-specialist<br>dynamodb-specialist | NoSQL databases, document stores |
| **DevOps (Kubernetes)** | k8s-specialist<br>infra-engineer | helm-specialist<br>deployment-specialist | K8s manifests, Helm charts, deployments |
| **DevOps (Docker)** | docker-specialist<br>infra-engineer | container-optimizer | Dockerfiles, container builds |
| **DevOps (CI/CD)** | cicd-specialist<br>devops-engineer | github-actions-specialist<br>jenkins-specialist | Pipeline configuration, automation |
| **Mobile (iOS)** | ios-specialist | swift-specialist<br>ui-kit-specialist | iOS apps, Swift, UIKit |
| **Mobile (Android)** | android-specialist | kotlin-specialist<br>compose-specialist | Android apps, Kotlin, Jetpack Compose |
| **Full-Stack** | fullstack-developer<br>+ Frontend specialist<br>+ Backend specialist | System architect | Features spanning frontend and backend |

### By Complexity Level

| Complexity | Agent Expertise Level | Count | Extended Thinking | Parallel Execution |
|------------|----------------------|-------|-------------------|-------------------|
| **SIMPLE** | Junior/Standard | 2-3 | No | Sequential OK |
| **MODERATE** | Standard | 3-5 | Optional | Some parallelization |
| **COMPLEX** | Senior/Specialist | 5-10 | Yes | Heavy parallelization |
| **VERY COMPLEX** | Architect/Principal | 8-13 | Yes (always) | Maximum parallelization |

### By Priority Level

| Priority | Response Time | Agent Selection Strategy | Human Involvement |
|----------|---------------|--------------------------|-------------------|
| **BLOCKER** | Immediate (1-4h) | Critical specialists, drop other work | Immediate notification, regular updates |
| **CRITICAL** | Same day (4-8h) | Senior specialists, high priority queue | Notification, checkpoint reviews |
| **HIGH** | 1-3 days | Standard specialists, normal queue | Review before merge |
| **MEDIUM** | Next sprint | Standard agents, can batch with similar work | Post-merge review |
| **LOW** | Backlog | Junior agents OK, batch processing | Periodic review |

## Workflow Routing Strategies

### Quick-Fix Path

**When to Use:**
- Complexity Score: 1-20 (SIMPLE)
- Single file change, <50 LOC
- Clear fix, low risk
- Existing tests cover changes
- No breaking changes
- Examples: Typo fixes, log message updates, simple bug fixes

**Workflow:**
```
EXPLORE (Lite) → CODE → TEST → COMMIT
   ↓              ↓      ↓       ↓
 1 agent      1 agent 1 agent 1 agent
 (30 min)     (1 hour) (30 min) (30 min)
```

**Phases:**
1. **EXPLORE (Lite):**
   - Quick code analysis (15-30 min)
   - Identify affected file(s)
   - Verify fix approach
   - Skip deep analysis

2. **CODE:**
   - Implement fix (30-60 min)
   - Follow coding standards
   - No new architecture

3. **TEST:**
   - Run existing tests
   - Manual smoke test
   - Verify fix works

4. **COMMIT:**
   - Create PR
   - Brief description
   - Link to issue
   - Request review

**Agent Count:** 2-3 (total)
**Timeline:** 2-4 hours
**Human Involvement:** Post-merge review

### Standard Workflow

**When to Use:**
- Complexity Score: 21-40 (MODERATE)
- Multiple files, 100-500 LOC
- Standard story or medium bug
- Moderate testing needed
- Some integration work
- Examples: Standard features, API endpoints, UI components

**Workflow:**
```
EXPLORE → PLAN → CODE → TEST → FIX → COMMIT
   ↓       ↓      ↓      ↓      ↓       ↓
 2 agents 1-2   2-4    2-3   1-2    1-2
          agents agents agents agents agents
```

**Full 6-phase protocol as documented in jira-orchestration skill**

**Agent Count:** 3-5 minimum
**Timeline:** 2-5 days
**Human Involvement:** Review before merge

### Extended Workflow

**When to Use:**
- Complexity Score: 41-70 (COMPLEX)
- Large feature, architecture change
- 500-2000 LOC
- Multiple integrations
- High risk or complexity
- Examples: Payment integration, complex features, major refactoring

**Workflow:**
```
EXPLORE (Deep) → PLAN (Detailed) → CODE (Parallel) → TEST (Comprehensive) → FIX → DOCUMENT → COMMIT
      ↓               ↓                  ↓                    ↓              ↓         ↓          ↓
   2-3 agents      2-3 agents         3-6 agents          2-4 agents    1-2 agents 1-2 agents 1-2 agents
   (extended       (extended          (parallel)          (thorough)
    thinking)       thinking)
```

**Enhancements over Standard:**
- Extended thinking enabled for EXPLORE and PLAN
- Parallel execution in CODE phase
- Comprehensive testing (unit + integration + E2E)
- Human checkpoints at each phase
- Detailed documentation required
- Architecture review

**Agent Count:** 5-13
**Timeline:** 5-10 days
**Human Involvement:** Checkpoint reviews, final approval

### Research Path

**When to Use:**
- Issue Type: Spike/Research
- Unknown complexity
- Exploratory work
- POC development
- Technology evaluation
- Examples: "Investigate GraphQL migration", "Evaluate caching strategies"

**Workflow:**
```
RESEARCH (Time-boxed) → DOCUMENT → CREATE STORIES → ROUTE STORIES
        ↓                   ↓             ↓               ↓
   1-2 agents          1 agent      1 agent      (triage each story)
   (1-5 days max)
```

**Time Boxes:**
- Small Spike: 1 day
- Medium Spike: 2-3 days
- Large Spike: 1 week (requires justification)

**Required Outputs:**
- Findings document
- Recommendation (Go/No-Go)
- Implementation stories (if Go)
- Effort estimates
- Risk assessment

**Agent Count:** 1-3
**Timeline:** 1-5 days (time-boxed)
**Human Involvement:** Review findings, make decision

### Decomposition Path

**When to Use:**
- Issue Type: Epic or oversized story
- Complexity Score: 71+ (VERY COMPLEX)
- Multi-sprint scope
- Multiple distinct features
- Requires team coordination
- Examples: "User Management System", "Payment Platform"

**Workflow:**
```
ANALYZE → DECOMPOSE → CREATE STORIES → TRIAGE STORIES → ROUTE EACH STORY
    ↓          ↓             ↓                ↓                ↓
 1-2 agents 1-2 agents   1 agent         1 agent      (individual workflows)
```

**Process:**
1. **ANALYZE:**
   - Extract business objectives
   - Identify user journeys
   - Map functional areas
   - Assess total effort

2. **DECOMPOSE:**
   - Break into 3-8 stories
   - Each story: 1-13 points
   - Create dependency graph
   - Define phases

3. **CREATE STORIES:**
   - Write story descriptions
   - Define acceptance criteria
   - Estimate story points
   - Link to epic

4. **TRIAGE STORIES:**
   - Run each story through triage
   - Classify and route individually
   - Respect dependencies

5. **EXECUTE:**
   - Each story gets appropriate workflow
   - Track epic-level progress
   - Coordinate across stories

**Agent Count:** 2-4 for decomposition
**Timeline:** 1-2 days for decomposition, then varies per story
**Human Involvement:** Review decomposition, approve plan

## Escalation Criteria and Handling

### Escalation Levels

#### Level 1: Immediate Escalation (STOP WORK)

**Triggers:**
- Security vulnerability discovered (CVE-level)
- Data loss risk identified
- Compliance violation detected
- Legal issue discovered
- Production system at risk of failure
- Unauthorized access attempt detected

**Actions:**
1. **STOP all work immediately**
2. **Create incident ticket** (separate from development issue)
3. **Notify relevant teams:**
   - Security team (for security issues)
   - Legal team (for compliance/legal)
   - Operations team (for production risk)
   - Management (for critical business impact)
4. **Document:**
   - What was discovered
   - Potential impact
   - Immediate containment actions taken
   - Recommended next steps
5. **Wait for human authorization** before proceeding

**Example:**
```markdown
🚨 IMMEDIATE ESCALATION: Security Vulnerability Detected

**Issue:** PROJ-456 Add user authentication
**Escalation Level:** 1 - IMMEDIATE
**Date/Time:** 2024-01-15 14:30 UTC

**Discovery:**
While implementing JWT token validation, discovered that existing auth
middleware does not validate token signatures. All tokens are accepted
regardless of signature validity.

**Impact:**
- CRITICAL: Authentication bypass vulnerability (CVE-level)
- Any attacker can forge valid tokens
- Affects: All authenticated endpoints
- Exposure: Production system since deployment 3 months ago

**Immediate Actions Taken:**
1. STOPPED all development work
2. Created incident ticket: SEC-789
3. Documented vulnerability details
4. Did NOT commit any code changes

**Requires Immediate Attention From:**
- @security-team (incident response)
- @platform-lead (production impact assessment)
- @cto (executive notification)

**Recommended Next Steps:**
1. Emergency patch to production (within hours)
2. Audit all recent token usage
3. Investigate for evidence of exploitation
4. Security review of all auth code

**Development Status:**
- Work on PROJ-456 is PAUSED
- Awaiting security team guidance
- Can provide technical details and proposed fix
```

#### Level 2: Checkpoint Escalation (PAUSE FOR APPROVAL)

**Triggers:**
- Complexity exceeds initial estimate by >50%
- Blocker persists for >4 hours
- Technical decision requires senior input
- Breaking changes affect multiple teams
- Scope creep detected
- Budget/time constraints at risk

**Actions:**
1. **PAUSE current phase**
2. **Document the situation**
3. **Request human decision**
4. **Provide options and recommendations**
5. **Continue after approval** or adjust plan

**Example:**
```markdown
⚠️ CHECKPOINT ESCALATION: Complexity Increased

**Issue:** PROJ-123 Add CSV export
**Escalation Level:** 2 - CHECKPOINT
**Phase:** CODE (in progress)

**Situation:**
Initial estimate was 5 story points (2-3 days) for simple CSV export.
During implementation, discovered:

1. **Performance Issue:** Current approach causes database timeout for >1000 users
2. **Memory Issue:** Loading all users into memory crashes for large datasets
3. **Requirement Gap:** Need async job queue for large exports (not in original spec)

**Impact on Estimate:**
- Original: 5 points (2-3 days, 3 agents)
- Revised: 8-13 points (4-6 days, 5-7 agents)
- Increase: 60-160% over original estimate

**Options:**

### Option 1: Implement Async Export (Recommended)
- **Effort:** 8 points (+3 from original)
- **Timeline:** +2 days
- **Agents:** +2 (job-queue-specialist, notification-specialist)
- **Pros:** Scalable solution, handles any dataset size
- **Cons:** More complex, requires job queue infrastructure
- **Risk:** Medium (depends on existing job queue)

### Option 2: Limit Export Size
- **Effort:** 5 points (original estimate)
- **Timeline:** Original (2-3 days)
- **Agents:** Original (3 agents)
- **Pros:** Simple, no architecture changes
- **Cons:** Limited functionality (max 1000 users)
- **Risk:** Low, but user impact if limit hit

### Option 3: Paginated Sync Export
- **Effort:** 6 points (+1 from original)
- **Timeline:** +0.5 days
- **Agents:** Original (3 agents)
- **Pros:** Handles larger datasets than Option 2
- **Cons:** Still limited, slow for very large exports
- **Risk:** Low

**Recommendation:**
Option 1 (Async Export) for best long-term solution, especially if we expect
user base to grow. Requires Product Owner approval for scope increase.

**Awaiting Decision From:**
- @product-owner (scope approval)
- @tech-lead (architecture approval)

**Questions:**
1. What is the maximum expected number of users to export?
2. Is async processing acceptable (email download link vs. immediate download)?
3. Do we have existing job queue infrastructure to leverage?

**Next Steps (after decision):**
- Option 1: Add job-queue-specialist, notification-specialist
- Option 2: Add max limit validation, document limitation
- Option 3: Implement pagination, add progress indicator
```

#### Level 3: Post-Completion Review (NOTIFY AFTER DONE)

**Triggers:**
- Standard bug fixes (non-critical)
- Documentation updates
- Test additions
- Minor refactoring
- Configuration changes (non-breaking)

**Actions:**
1. **Complete the work**
2. **Create PR with detailed description**
3. **Notify appropriate reviewer**
4. **Include comprehensive testing results**
5. **Human reviews at their convenience**

**Example:**
```markdown
✅ POST-COMPLETION REVIEW: Standard Bug Fix

**Issue:** PROJ-789 Fix tooltip alignment on mobile
**Escalation Level:** 3 - POST-COMPLETION REVIEW
**Status:** ✅ Complete (PR created)

**Summary:**
Fixed CSS alignment issue causing tooltips to display off-screen on mobile devices.

**Changes Made:**
- Updated `tooltip.css`: Changed positioning from `absolute` to `fixed`
- Added responsive media queries for mobile breakpoints
- Adjusted z-index to ensure tooltips appear above other elements

**Testing:**
- ✅ Unit tests: All passing (12/12)
- ✅ Visual regression tests: Passed
- ✅ Manual testing: Verified on iOS Safari, Android Chrome
- ✅ Accessibility: Screen reader compatible

**Complexity:**
- **Score:** 15 (SIMPLE)
- **LOC Changed:** 25 lines
- **Files Changed:** 1 file
- **Risk:** Low (CSS only, no breaking changes)

**PR:** #456
**Branch:** bugfix/PROJ-789-tooltip-alignment
**Reviewer:** @frontend-lead (requested)

**Preview:**
[Staging environment link with fix deployed]

**No urgency** - Review at convenience during normal PR review cycle.
```

### Escalation Decision Matrix

| Situation | Level | Action | Timeline | Notify |
|-----------|-------|--------|----------|--------|
| Security vulnerability | 1 - IMMEDIATE | Stop work, create incident | Immediate | Security team, management |
| Data loss risk | 1 - IMMEDIATE | Stop work, document risk | Immediate | Operations, management |
| Complexity +50% | 2 - CHECKPOINT | Pause, request decision | Same day | Tech lead, product owner |
| Blocker >4 hours | 2 - CHECKPOINT | Escalate blocker | Within 4 hours | Blocking team, manager |
| Breaking change | 2 - CHECKPOINT | Document impact, request approval | 1-2 days | Affected teams |
| Standard bug fix | 3 - POST-COMPLETION | Complete work, notify | After completion | Reviewer |
| Documentation update | 3 - POST-COMPLETION | Complete work, notify | After completion | Reviewer |

## Triage Output Format

### Triage Analysis Report

```markdown
# 🎯 Triage Analysis Report

**Issue:** [ISSUE-KEY] [Title]
**Analyzed:** [Date/Time]
**Triage Agent:** Jira Triage System

---

## Classification

### Issue Type
- **Type:** Bug | Story | Task | Epic | Spike
- **Subtype:** [Specific category]
- **Confidence:** High | Medium | Low

### Priority & Severity
- **Priority:** Blocker | Critical | High | Medium | Low
- **Severity (Bugs):** Blocker | Critical | Major | Minor
- **Business Impact:** [Impact description]
- **Urgency:** Immediate | This Sprint | Next Sprint | Backlog

---

## Complexity Analysis

### Complexity Score: X/100 (CATEGORY)

#### Score Breakdown
| Factor | Score (0-10) | Weight | Weighted Score | Rationale |
|--------|--------------|--------|----------------|-----------|
| Code Impact | X | 25% | X.XX | [Reason] |
| Integration | X | 20% | X.XX | [Reason] |
| Risk | X | 20% | X.XX | [Reason] |
| Testing | X | 15% | X.XX | [Reason] |
| Dependencies | X | 10% | X.XX | [Reason] |
| Uncertainty | X | 10% | X.XX | [Reason] |
| **TOTAL** | - | **100%** | **XX.X** | - |

### Complexity Category: SIMPLE | MODERATE | COMPLEX | VERY_COMPLEX

### Estimated Story Points: X

### Effort Estimate: X-Y days

---

## Technology Stack

### Primary Technologies
- [Tech 1]: [Usage]
- [Tech 2]: [Usage]

### Components Affected
- [Component 1]: [Change type]
- [Component 2]: [Change type]

---

## Routing Decision

### Workflow Path: QUICK-FIX | STANDARD | EXTENDED | RESEARCH | DECOMPOSITION

#### Rationale
[Explanation of why this workflow path was selected]

#### Workflow Phases
1. **EXPLORE:** [Agents] - [Duration]
2. **PLAN:** [Agents] - [Duration]
3. **CODE:** [Agents] - [Duration] - [Parallel: Yes/No]
4. **TEST:** [Agents] - [Duration]
5. **FIX:** [Agents] - [Duration]
6. **COMMIT:** [Agents] - [Duration]

**Total Estimated Duration:** X-Y days
**Total Agent Count:** X-Y agents

---

## Agent Selection

### EXPLORE Phase (X agents)
- **Agent 1:** [agent-name] - [Reason for selection]
- **Agent 2:** [agent-name] - [Reason for selection]

### PLAN Phase (X agents)
- **Agent 1:** [agent-name] - [Reason for selection]

### CODE Phase (X agents)
- **Agent 1:** [agent-name] - [Reason for selection]
- **Agent 2:** [agent-name] - [Reason for selection]
- **Parallel Execution:** Yes/No

### TEST Phase (X agents)
- **Agent 1:** [agent-name] - [Reason for selection]

### FIX Phase (X agents)
- **Agent 1:** [agent-name] - [Reason for selection]

### COMMIT Phase (X agents)
- **Agent 1:** [agent-name] - [Reason for selection]

---

## Risk Assessment

### Risk Level: CRITICAL | HIGH | MEDIUM | LOW | MINIMAL

### Identified Risks

#### Risk 1: [Risk Name]
- **Category:** Technical | Security | Performance | UX | Business
- **Likelihood:** Very High | High | Medium | Low | Very Low
- **Impact:** Critical | High | Medium | Low | Minimal
- **Risk Score:** [Likelihood × Impact]
- **Mitigation:** [Mitigation strategy]

#### Risk 2: [Risk Name]
[Same structure as Risk 1]

### Overall Risk Mitigation Strategy
[High-level mitigation approach]

---

## Escalation Criteria

### Escalation Level: 1 - IMMEDIATE | 2 - CHECKPOINT | 3 - POST-COMPLETION

### Escalation Triggers
- [ ] [Trigger condition 1]
- [ ] [Trigger condition 2]

### Human Checkpoints
1. **[Phase/Milestone]:** [What needs approval] - [Who to notify]
2. **[Phase/Milestone]:** [What needs approval] - [Who to notify]

### Notification Plan
- **Immediate:** [List of people/teams]
- **Checkpoint:** [List of people/teams]
- **Post-Completion:** [List of people/teams]

---

## Dependencies & Blockers

### Blocking Issues
- **[ISSUE-KEY]:** [Title] - [Status] - [Impact]

### Dependent Issues
- **[ISSUE-KEY]:** [Title] - [Relationship]

### External Dependencies
- **[Dependency]:** [Description] - [Owner] - [ETA]

### Team Dependencies
- **[Team]:** [What's needed] - [Contact] - [Timeline]

---

## Recommendations

### Immediate Actions
1. [Action 1]
2. [Action 2]

### Before Starting Development
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

### Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## Execution Plan

### Timeline
- **Start Date:** [Recommended start date]
- **Target Completion:** [Target date]
- **Sprint:** [Sprint name/number]

### Resource Allocation
- **Developers:** X
- **Agent Count:** X-Y
- **Extended Thinking:** Yes/No
- **Parallel Execution:** Yes/No

### Monitoring & Checkpoints
1. **Checkpoint 1:** [When] - [What to check] - [Who reviews]
2. **Checkpoint 2:** [When] - [What to check] - [Who reviews]

---

## Jira Updates

### Labels to Add
- [label-1]
- [label-2]
- [label-3]

### Status Transition
- **From:** [Current Status]
- **To:** [New Status]

### Fields to Update
- **Story Points:** X
- **Sprint:** [Sprint name]
- **Assignee:** [Agent orchestrator]
- **Components:** [Component list]

---

## Next Steps

1. ✅ **Triage Complete**
2. [ ] **Update Jira with triage results**
3. [ ] **Spawn selected agents for EXPLORE phase**
4. [ ] **Set up monitoring and checkpoints**
5. [ ] **Begin execution**

---

*Automated triage by Claude Code Jira Triage System*
*Triage Confidence: High | Medium | Low*
