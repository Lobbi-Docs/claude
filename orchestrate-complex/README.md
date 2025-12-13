# Orchestrate Complex Plugin - Callsign: Mendicant

**Faction:** Forerunner (Ancient wisdom, strategic planning, orchestration)
**Version:** 1.0.0

## Overview

Advanced multi-agent orchestration system with DAG-based parallel execution, 4 orchestration patterns, mandatory 6-phase protocol enforcement, and comprehensive state management for complex tasks.

## Installation

The plugin is located at: `orchestrate-complex/`

To use, ensure the plugin is discovered by Claude Code's plugin system.

## Components

### Skills (4)

| Skill | Description |
|-------|-------------|
| **orchestration-patterns** | 4 patterns: Plan-then-Execute, Hierarchical Decomposition, Blackboard, Event Sourcing |
| **multi-agent-coordination** | Agent spawning, layer architecture, parallel execution, communication |
| **phase-management** | 6-phase protocol: EXPLORE → PLAN → CODE → TEST → FIX → DOCUMENT |
| **dag-execution** | DAG construction, level-based execution, dependency resolution |

### Commands (3)

| Command | Description |
|---------|-------------|
| `/orchestrate-complex` | Execute complex multi-agent orchestration with mandatory 6-phase protocol |
| `/orchestration-status` | Display current orchestration status, phases, agents, checkpoints |
| `/orchestration-resume` | Resume interrupted orchestration from checkpoint |

### Agents (5)

| Agent | Callsign | Faction | Layer | Role |
|-------|----------|---------|-------|------|
| **master-strategist** | Didact | Forerunner | Strategic | High-level planning, architecture decisions |
| **plan-decomposer** | Composer | Forerunner | Tactical | Task breakdown, DAG construction |
| **state-synchronizer** | Oracle | Promethean | Tactical | Checkpoints, context sync, state management |
| **conflict-resolver** | Arbiter | Spartan | Tactical | Resource conflicts, decision arbitration |
| **quality-gate** | Warden | Promethean | Quality | Phase validation, quality enforcement |

### Hooks (3)

| Hook | Event | Purpose |
|------|-------|---------|
| **orchestration-protocol-enforcer** | PreToolUse | Enforce 6-phase protocol and sub-agent requirements |
| **phase-transition-validator** | PostToolUse | Validate phase completion, create checkpoints |
| **orchestration-completion-validator** | Stop | Ensure all phases completed before ending |

## Orchestration Protocol

```
EXPLORE (2+ agents) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

### Mandatory Constraints

- **Minimum Agents:** 3 per complex task
- **Maximum Agents:** 13 per task
- **Recommended:** 5-7 agents
- **Testing:** REQUIRED (cannot be skipped)
- **Documentation:** REQUIRED (mandatory vault sync)

## Orchestration Patterns

### 1. Plan-then-Execute (Default)
Best for well-defined tasks with clear phases.
- Generate comprehensive plan
- Validate before execution
- Execute DAG systematically
- Checkpoint at boundaries

### 2. Hierarchical Decomposition
Best for large objectives requiring recursive breakdown.
- Root task → Level 1 (5-7 subtasks) → Level 2 → Atomic tasks
- Bottom-up result aggregation
- Maximum depth: 5 levels

### 3. Blackboard
Best for collaborative problem-solving.
- Shared knowledge space
- Multiple experts contribute
- Control shell mediates
- Solution emerges from collaboration

### 4. Event Sourcing
Best for audit requirements and replay capability.
- Append-only event log
- Immutable facts
- State from replay
- Time-travel debugging

## Agent Layers

| Layer | Purpose | Agents |
|-------|---------|--------|
| **Strategic** | Planning, decisions | master-strategist, architect-supreme, risk-assessor |
| **Tactical** | Coordination | plan-decomposer, resource-allocator, conflict-resolver |
| **Operational** | Implementation | coder, tester, reviewer, debugger |
| **Quality** | Validation | test-strategist, security-specialist, documentation-expert |

## Configuration

```json
{
  "tokenBudget": 100000,
  "warningThreshold": 0.75,
  "autoCheckpoint": true,
  "defaultPattern": "plan-then-execute",
  "parallelExecution": true,
  "obsidianVaultPath": "path/to/vault"
}
```

## Usage Examples

### Start Orchestration

```bash
/orchestrate-complex "Implement user authentication with OAuth2"
```

### With Pattern Selection

```bash
/orchestrate-complex "Build analytics dashboard" --pattern=hierarchical-decomposition
```

### Check Status

```bash
/orchestration-status
/orchestration-status --detail=full
```

### Resume from Checkpoint

```bash
/orchestration-resume
/orchestration-resume --checkpoint=ckpt-002
```

## Directory Structure

```
orchestrate-complex/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── skills/
│   ├── orchestration-patterns/
│   │   └── SKILL.md
│   ├── multi-agent-coordination/
│   │   └── SKILL.md
│   ├── phase-management/
│   │   └── SKILL.md
│   └── dag-execution/
│       └── SKILL.md
├── commands/
│   ├── orchestrate-complex.md
│   ├── orchestration-status.md
│   └── orchestration-resume.md
├── agents/
│   ├── master-strategist.md
│   ├── plan-decomposer.md
│   ├── state-synchronizer.md
│   ├── conflict-resolver.md
│   └── quality-gate.md
├── hooks/
│   └── hooks.json
└── README.md
```

## Author

**Brookside BI**
- Email: contact@brooksidebi.com
- Repository: https://github.com/Lobbi-Docs/claude

## License

MIT
