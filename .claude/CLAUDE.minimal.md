# Claude Orchestration

**Budget:** 100K tokens | **Protocol:** EXPLORE > PLAN > CODE > TEST > FIX > DOCUMENT

## Quick Reference

| Resource | Location |
|----------|----------|
| Full Docs | `[[System/Claude-Instructions/*]]` in Obsidian |
| Agents | `.claude/registry/agents.minimal.json` |
| GitHub Backup | `github.com/markus41/obsidian/blob/main/System/Claude-Instructions/` |

## Rules

- **Sub-agents:** 3-5 minimum (13 max)
- **Testing:** REQUIRED before completion
- **Docs:** Obsidian vault only
- **Context7:** ALWAYS for library docs

## Models

| Model | Use |
|-------|-----|
| opus | Architecture, planning |
| sonnet | Development, analysis |
| haiku | Docs, fast tasks |

## Load On-Demand

```python
mcp__obsidian__get_file_contents("System/Claude-Instructions/{doc}.md")
```

**Docs:** Orchestration-Protocol, MCP-Servers, Agent-Categories, Workflows, Skills-and-Commands
