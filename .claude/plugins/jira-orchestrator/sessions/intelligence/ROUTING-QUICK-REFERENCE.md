# Agent Routing Quick Reference

## Domain Routing Rules

### Frontend / UI
- **Primary**: theme-builder, theme-system-architect, white-label-specialist
- **Avoid**: code-reviewer (62.5% success)
- **Min Complexity**: 20
- **Fallback**: None (must use specialist)

### Backend / API
- **Primary**: code-reviewer (96.4% success)
- **Fallback**: implementation-specialist
- **Min Complexity**: 30
- **Optimal**: complexity 35-75

### Infrastructure
- **Primary**: sre-engineer, k8s-deployer
- **Fallback**: None
- **Min Complexity**: 40

### Fullstack
- **Primary**: implementation-specialist
- **Fallback**: code-reviewer
- **Min Complexity**: 35

## Complexity Routing Rules

### Simple (0-30)
- Fast-track processing
- Skip decomposition
- Any capable agent

### Standard (30-80)
- Single specialist assignment
- Normal processing
- Most agents optimal here

### High Complexity (80+)
- **REQUIRE PAIRING** (critical)
- Decomposition required
- Avoid: implementation-specialist solo
- Pair with: system-architect, infrastructure-specialist, devops-engineer

## Agent Constraints

### code-reviewer
```yaml
Optimal: [35, 75]
Prefer: backend, api, security, database
Avoid: frontend, ui
Max Solo: 80
```

### implementation-specialist (coder)
```yaml
Optimal: [40, 80]
Prefer: backend, fullstack, api
Avoid: devops, infrastructure
Max Solo: 75
Require Pairing: 80+
```

### theme-builder (ui-specialist)
```yaml
Optimal: [15, 70]
Prefer: frontend, ui, react, css
Avoid: backend, infrastructure
Max Solo: 85
```

### theme-system-architect
```yaml
Optimal: [40, 100]
Prefer: frontend, ui, architecture, theming
Avoid: backend
```

## Routing Decision Weights

```
Domain Match:          40%
Complexity Match:      25%
Historical Performance: 20%
Agent Availability:    10%
Workload Balance:       5%
```

## Quick Decision Tree

```
1. Is domain = frontend/ui?
   YES → Route to ui-specialist
   NO → Continue

2. Is complexity >= 80?
   YES → Require pairing, decompose
   NO → Continue

3. Is domain = backend?
   YES → Route to code-reviewer
   NO → Continue

4. Is domain = infrastructure?
   YES → Route to sre-engineer/k8s-deployer
   NO → Continue

5. Is complexity <= 30?
   YES → Fast-track, any capable agent
   NO → Route to implementation-specialist
```

## Common Scenarios

### Frontend React Component (complexity 45)
- Route to: **theme-builder**
- Avoid: code-reviewer
- Success expectation: 92%+

### Backend API Endpoint (complexity 55)
- Route to: **code-reviewer**
- Fallback: implementation-specialist
- Success expectation: 96%+

### Complex Infrastructure (complexity 85)
- Route to: **sre-engineer + system-architect** (paired)
- Avoid: Solo assignment
- Decomposition: Required
- Success expectation: 85%+

### Simple CRUD Operation (complexity 25)
- Route to: **Any capable agent**
- Fast-track: Yes
- Decomposition: Skip
- Success expectation: 90%+

### Fullstack Feature (complexity 65)
- Route to: **implementation-specialist**
- Fallback: code-reviewer
- Success expectation: 89%+

## Fallback Rules

- Fallback penalty: -15 points
- Max attempts: 2
- Justification: Required
- No fallback for: frontend, infrastructure (must use specialist)

## Configuration Files

1. **Agent Metadata**: `.claude/registry/agents.minimal.json`
2. **Routing Rules**: `sessions/intelligence/config/intelligence-config.yaml`
3. **Agent Profiles**: `sessions/intelligence/agent-profiles.json`

## Key Fixes

- **GAP-001**: Frontend now routes to 92% specialist (was 62.5%)
- **GAP-008**: Complexity 80+ requires pairing (was 60% solo)

## Version

- Config version: 4.1.0
- Last updated: 2026-01-01
- Status: Active
