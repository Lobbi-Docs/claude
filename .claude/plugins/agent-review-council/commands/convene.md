# Council Convene Command

**Command:** `/council:convene`
**Slash Command:** `council-convene`
**Purpose:** Convene an agent review council to deliberate on code changes

## Usage

```bash
# Basic usage (uses default protocol from config)
/council:convene

# Specify protocol
/council:convene --protocol=round-robin
/council:convene --protocol=autogen-team
/council:convene --protocol=red-blue-team
/council:convene --protocol=panel-discussion
/council:convene --protocol=fishbowl
/council:convene --protocol=think-tank
/council:convene --protocol=rapid-fire
/council:convene --protocol=world-cafe

# Specify panel size
/council:convene --size=quick      # 3 agents, 1 round
/council:convene --size=standard   # 5 agents, 2 rounds (default)
/council:convene --size=thorough   # 7 agents, 3 rounds
/council:convene --size=full       # 9 agents, 4 rounds

# Specify voting mechanism
/council:convene --voting=simple-majority
/council:convene --voting=super-majority  # default
/council:convene --voting=consensus
/council:convene --voting=weighted
/council:convene --voting=ranked-choice

# Review specific files or PR
/council:convene --files="src/api/**/*.ts"
/council:convene --pr=123
/council:convene --commit=abc123

# Combine options
/council:convene --protocol=red-blue-team --size=thorough --voting=consensus
```

## Activation Flow

When you invoke `/council:convene`, the following happens:

### 1. Council Initialization
```yaml
step: initialization
agent: council-convener-agent
actions:
  - Read council configuration (.claude/council/config.json)
  - Determine protocol (from --protocol flag or config default)
  - Determine panel size (from --size flag or config default)
  - Identify code scope (from --files, --pr, or current git diff)
  - Load deliberation template for selected protocol
```

### 2. Agent Selection
```yaml
step: agent-selection
agent: council-convener-agent
actions:
  - Analyze code domain (security, performance, architecture, etc.)
  - Match agent expertise to code domain
  - Select N agents based on panel size
  - Assign roles based on protocol (e.g., red vs blue team)
  - Ensure diversity of perspectives
```

### 3. Council Convening
```yaml
step: convening
agent: council-convener-agent
outputs:
  - Council roster (list of selected agents)
  - Protocol to be used
  - Deliberation schedule (phases and timing)
  - Initial briefing document for all agents
```

### 4. Deliberation Execution
```yaml
step: deliberation
coordination: protocol-specific
examples:
  round-robin:
    - Agent 1 provides initial analysis
    - Agent 2 builds on Agent 1's insights
    - Agent 3 builds on Agents 1 & 2
    - ... continue for all agents
    - Synthesis agent produces verdict

  autogen-team:
    - Manager agent decomposes review into tasks
    - Worker agents analyze in parallel
    - Manager integrates findings
    - Critic validates
    - Manager produces final verdict

  red-blue-team:
    - Red team identifies vulnerabilities
    - Blue team proposes mitigations
    - 3 rounds of attack-defend-refine
    - Adjudicator renders verdict

  panel-discussion:
    - Opening statements from all panelists
    - Open collaborative discussion
    - Moderator guides consensus building
    - Emergent consensus documented

  fishbowl:
    - Inner circle (3 agents) deliberates
    - Outer circle observes
    - Rotation after 7 minutes
    - Integration phase with all agents

  think-tank:
    - All agents explore independently in parallel
    - Synthesis agent identifies patterns
    - Collective refinement phase
    - Multi-angle verdict produced

  rapid-fire:
    - Each agent provides 30-second critique
    - No rebuttals, just rapid insights
    - Synthesis agent quickly consolidates
    - Fast consensus achieved

  world-cafe:
    - 4 small groups discuss different topics
    - Agents rotate, hosts stay
    - Cross-pollination of ideas
    - Hosts report, synthesis integrates
```

### 5. Voting & Verdict
```yaml
step: voting
mechanism: from-config-or-flag
process:
  - Collect votes from all agents
  - Apply voting protocol (simple/super/consensus/weighted/ranked)
  - Handle tie-breakers if needed
  - Produce verdict with confidence level
```

### 6. Verdict Documentation
```yaml
step: documentation
agent: verdict-writer-agent
outputs:
  - Verdict decision (APPROVE | APPROVE_WITH_CHANGES | REQUEST_CHANGES | REJECT)
  - Rationale and supporting evidence
  - Findings by category (security, performance, maintainability, etc.)
  - Action items (if changes requested)
  - Minority opinions (if any)
  - Confidence level (0.0-1.0)
```

## Protocol Descriptions

### Round Robin
**Best for:** Building on insights sequentially, layered analysis

**How it works:**
1. Random turn order established
2. Each agent speaks in sequence
3. Each must build on previous insights
4. Second round for refinement
5. Synthesis agent produces layered verdict

**Advantages:**
- Ensures all voices heard
- Builds comprehensive understanding
- No agent dominates
- Progressive refinement

### AutoGen Team
**Best for:** Complex reviews requiring hierarchical coordination

**How it works:**
1. Manager agent decomposes review
2. Workers analyze specialized domains in parallel
3. Manager integrates worker reports
4. Critic validates for blind spots
5. Manager produces team-validated verdict

**Advantages:**
- Efficient parallel execution
- Clear accountability
- Iterative refinement (up to 5 rounds)
- Expert validation through critic

### Red Team / Blue Team
**Best for:** Security-critical code, adversarial stress testing

**How it works:**
1. Red team attacks code, finds vulnerabilities
2. Blue team defends, proposes mitigations
3. 3 rounds of battle (attack → mitigate → refine)
4. Adjudicator weighs findings vs mitigations
5. Battle-tested verdict produced

**Advantages:**
- Thorough vulnerability discovery
- Practical mitigation proposals
- Collaborative improvement
- High confidence in security

### Panel Discussion
**Best for:** Collaborative exploration, emergent insights

**How it works:**
1. Opening statements from all panelists
2. Open discussion with cross-talk allowed
3. Moderator guides toward consensus
4. Emergent consensus documented

**Advantages:**
- Natural conversation flow
- Organic insight emergence
- Collaborative, not adversarial
- Flexible and adaptive

### Fishbowl
**Best for:** Multi-perspective analysis, rotation of active participants

**How it works:**
1. Inner circle (3 agents) deliberates actively
2. Outer circle observes silently
3. After 7 minutes, rotate 2 agents
4. New inner circle continues with fresh perspectives
5. Integration phase involves all agents

**Advantages:**
- Fresh perspectives through rotation
- Observers gain context before contributing
- Prevents groupthink
- Multi-layered understanding

### Think Tank
**Best for:** Comprehensive multi-angle analysis, parallel exploration

**How it works:**
1. All agents explore independently in parallel
2. Synthesis agent identifies themes and conflicts
3. Collective refinement phase
4. Comprehensive multi-angle verdict

**Advantages:**
- Maximum parallel efficiency
- Diversity of approaches encouraged
- Comprehensive coverage
- Rich synthesis

### Rapid Fire
**Best for:** Quick decisions, time-constrained reviews

**How it works:**
1. Each agent provides 30-second focused critique
2. No rebuttals, just rapid insights
3. Synthesis agent consolidates quickly
4. Fast consensus produced

**Advantages:**
- Very fast (10-15 minutes total)
- Focused, concise feedback
- Good for simple reviews
- Efficient use of agent time

### World Café
**Best for:** Multi-topic holistic review, cross-pollination of ideas

**How it works:**
1. 4 small groups discuss different topics (arch, sec, perf, maint)
2. Hosts stay, other agents rotate after 7 minutes
3. Second round with fresh perspectives
4. Hosts report insights, synthesis integrates

**Advantages:**
- Holistic multi-topic coverage
- Cross-pollination of ideas
- Small group intimacy
- Comprehensive without overwhelming

## Configuration

Default configuration file: `.claude/council/config.json`

```json
{
  "defaultProtocol": "adversarial",
  "defaultPanelSize": "standard",
  "defaultVoting": "super-majority",
  "requireDevilsAdvocate": true,
  "preserveDissent": true,
  "autoConveneOnPR": true,
  "minReviewersForMerge": 3,

  "protocols": {
    "round-robin": {
      "enabled": true,
      "rounds": 2,
      "buildingRequired": true
    },
    "autogen-team": {
      "enabled": true,
      "maxIterations": 5,
      "requireCritic": true
    },
    "red-blue-team": {
      "enabled": true,
      "battleRounds": 3,
      "requireAdjudicator": true
    },
    "panel-discussion": {
      "enabled": true,
      "allowCrossTalk": true,
      "timeBoxMinutes": 25
    },
    "fishbowl": {
      "enabled": true,
      "innerCircleSize": 3,
      "rotationRounds": 2
    },
    "think-tank": {
      "enabled": true,
      "parallelization": true,
      "diversityBonus": true
    },
    "rapid-fire": {
      "enabled": true,
      "timePerAgent": "30-seconds",
      "allowRebuttals": false
    },
    "world-cafe": {
      "enabled": true,
      "topics": ["architecture", "security", "performance", "maintainability"],
      "rotationRounds": 2
    }
  }
}
```

## Examples

### Example 1: Round Robin for Feature Review
```bash
# Reviewing new authentication feature
/council:convene --protocol=round-robin --files="src/auth/**/*.ts"

# Output:
# ✓ Council convened: Round Robin protocol
# ✓ Panel: 5 agents (standard size)
# ✓ Turn order: [security-sentinel, code-architect, maintainability-advocate, test-advocate, domain-expert]
#
# Round 1:
#   - security-sentinel: "Authentication flow follows OAuth 2.0 spec correctly..."
#   - code-architect: "Building on security review, the architecture uses..."
#   - maintainability-advocate: "Expanding on architecture points, code is well-structured..."
#   - test-advocate: "Regarding previous points on structure, test coverage is..."
#   - domain-expert: "Considering all above, business requirements are..."
#
# Round 2 (refinement):
#   - security-sentinel: "Refining my initial analysis, one concern about..."
#   - code-architect: "Addressing the security concern, we could..."
#   - ...
#
# Verdict: APPROVE_WITH_CHANGES
# Confidence: 0.85
# Action Items:
#   - Add rate limiting to token endpoint
#   - Improve error messages (don't leak existence of users)
#   - Add integration test for token refresh flow
```

### Example 2: AutoGen Team for Complex Refactor
```bash
# Reviewing major database migration
/council:convene --protocol=autogen-team --size=thorough --pr=456

# Output:
# ✓ Council convened: AutoGen Team protocol
# ✓ Manager: team-manager-agent
# ✓ Workers: [code-architect, security-sentinel, performance-guardian, maintainability-advocate, domain-expert, integration-specialist]
# ✓ Critic: devils-advocate-agent
#
# [Manager] Decomposing review into 6 specialized tasks...
# [Manager] Delegating to workers in parallel...
#
# [Worker: code-architect] Analyzing schema design... ✓
# [Worker: security-sentinel] Reviewing data access patterns... ✓
# [Worker: performance-guardian] Benchmarking migration performance... ✓
# [Worker: maintainability-advocate] Assessing rollback strategy... ✓
# [Worker: domain-expert] Validating business logic preservation... ✓
# [Worker: integration-specialist] Testing API compatibility... ✓
#
# [Manager] Integrating worker findings...
# [Manager] Identified gap: Need to validate data consistency post-migration
# [Manager] Requesting refinement from domain-expert...
# [Worker: domain-expert] Adding data validation checks... ✓
#
# [Manager] Submitting integrated findings to critic...
# [Critic: devils-advocate] Challenging: What if migration fails mid-way?
# [Manager] Addressing: Implementing transaction boundaries and checkpoints...
#
# [Manager] Final verdict: APPROVE_WITH_CHANGES
# Confidence: 0.92
# Team validation: 6/6 workers agree
```

### Example 3: Red/Blue Team for Security Audit
```bash
# Security review of payment processing
/council:convene --protocol=red-blue-team --files="src/payments/**" --voting=consensus

# Output:
# ✓ Council convened: Red Team / Blue Team protocol
# ✓ Red Team: red-team-leader, security-sentinel, devils-advocate
# ✓ Blue Team: blue-team-leader, code-architect, maintainability-advocate
# ✓ Adjudicator: moderator-agent
#
# Battle Round 1:
#   [Red Team] Identified 5 vulnerabilities:
#     - CRITICAL: SQL injection in transaction query
#     - HIGH: Insufficient rate limiting on payment endpoints
#     - MEDIUM: Sensitive data logged
#     - LOW: Missing CSRF tokens on some forms
#     - LOW: Overly permissive CORS
#
#   [Blue Team] Proposed mitigations:
#     - SQL injection: Parameterized queries (BLUE-MIT-001)
#     - Rate limiting: Redis-based limiter (BLUE-MIT-002)
#     - Logging: Scrub sensitive fields (BLUE-MIT-003)
#     - CSRF: Add tokens to all forms (BLUE-MIT-004)
#     - CORS: Restrict to known origins (BLUE-MIT-005)
#
# Battle Round 2:
#   [Red Team] Testing mitigations...
#     - SQL injection fix: ✓ Verified, attack blocked
#     - Rate limiting: ✓ Tested, 429 returned appropriately
#     - Logging: ✓ Sensitive data no longer in logs
#     - CSRF: ✓ Requests without token rejected
#     - CORS: ⚠ Bypass possible with subdomain
#
#   [Blue Team] Refining CORS defense...
#     - Updated to explicit origin whitelist
#     - Removed wildcard subdomain support
#
# Battle Round 3:
#   [Red Team] Final offensive...
#     - All mitigations hold ✓
#     - No new vulnerabilities discovered
#
# [Adjudicator] Verdict: APPROVE (after mitigations applied)
# Consensus: 100% (all 6 agents agree)
# Residual Risk: LOW
# Required Actions: Apply all 5 mitigations before merge
```

## Integration

### With Jira
```bash
# Council verdict automatically creates Jira comments
/council:convene --pr=789
# → Creates comment on linked Jira issue with verdict and action items
```

### With Git Workflow
```bash
# Council can block PR merge
# .claude/hooks/pre-merge.sh:
if council-verdict-is "REJECT"; then
  echo "Council rejected PR. Cannot merge."
  exit 1
fi
```

### With Quality Gates
```bash
# Council evaluates quality gate results
/council:convene --evaluate-quality-gates
# → Reviews test coverage, linter results, security scans
# → Produces verdict on whether quality gates pass
```

## Output

Council produces a structured verdict document:

```yaml
verdict:
  decision: APPROVE | APPROVE_WITH_CHANGES | REQUEST_CHANGES | REJECT
  confidence: 0.0-1.0
  protocol: round-robin | autogen-team | red-blue-team | ...
  panelSize: quick | standard | thorough | full
  votingMechanism: simple-majority | super-majority | consensus | weighted | ranked-choice

council:
  agents: [list-of-participating-agents]
  moderator: moderator-agent
  synthesizer: synthesis-agent

findings:
  - category: security | performance | architecture | maintainability | domain | testing
    severity: critical | high | medium | low | info
    title: "Brief description"
    details: "Full explanation"
    location: "file:line"
    discoveredBy: agent-name
    recommendation: "What to do about it"

actionItems:
  - priority: P0 | P1 | P2 | P3
    description: "What needs to be done"
    assignee: optional
    blocking: true | false

minorityOpinions:
  - agent: agent-name
    position: dissenting view
    rationale: why they disagree

metadata:
  convened: ISO timestamp
  completed: ISO timestamp
  duration: duration in minutes
  rounds: number of deliberation rounds
  votes:
    approve: N
    approveWithChanges: N
    requestChanges: N
    reject: N
```

---

**Agent:** council-convener-agent
**Model:** sonnet
**Activation:** User invokes `/council:convene` command
