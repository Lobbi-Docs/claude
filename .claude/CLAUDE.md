# Claude Orchestration

**Budget:** 100K | **Protocol:** EXPLORE > PLAN > CODE > TEST > FIX > DOCUMENT

## Critical: Context Limits

**When executing commands, ONLY load:**
- ✅ The specific command file (`.claude/commands/{name}.md`)
- ❌ **NEVER** load `commands.index.json` (1,269 lines) - query metadata only
- ❌ **NEVER** load `CLAUDE.full.md` (319 lines) - use Obsidian
- ❌ **NEVER** load agent definitions - use Obsidian MCP
- ❌ **NEVER** load related commands

**Command context budget: 500 tokens max** (command file only)

## Quick Reference

| Resource | Location |
|----------|----------|
| Full Docs | Obsidian: `System/Claude-Instructions/*` |
| Agents | `.claude/registry/agents.minimal.json` (query only) |

## Rules

- Sub-agents: 3-5 min (13 max)
- Testing: REQUIRED
- Docs: Obsidian only
- Context7: ALWAYS for libs

## Models

| Model | Use |
|-------|-----|
| opus | Architecture |
| sonnet | Development |
| haiku | Docs, fast tasks |

## Load On-Demand

```python
mcp__obsidian__get_file_contents("System/Claude-Instructions/{doc}.md")
```

## Context Enforcement

**See:** `.claude/CONTEXT-ENFORCEMENT.md` for strict rules on what NOT to load.
