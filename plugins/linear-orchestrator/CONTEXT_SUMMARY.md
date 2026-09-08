# Linear Orchestrator — Context Summary

## Purpose
Linear orchestration for Claude Code: operate as a Linear agent, fan a backlog
out across parallel workers in isolated git worktrees, and keep issues in step
with GitHub or Harness Code.

## At a glance
- Commands: 24 · Agents: 11 · Skills: 10 · Tests: 82
- Runtime: dependency-free `.mjs` in `lib/`, run with `pnpm test:linear-plugin`
- Providers: GitHub and Harness Code behind one interface (`lib/vcs/`)

## When to load
- Load this summary first for routing, scope checks, and capability matching.
- Open specific command, agent, or skill files only when the task needs them.
- Defer README.md and deeper docs until implementation details are required.

## Facts worth having up front
- **AIG = Agent Interaction Guidelines** (UX rules), not a gateway or bus.
- Agent activities: `thought`, `action`, `elicitation`, `response`, `error`.
  The last two are terminal.
- Assigning an issue to an agent is **delegation**; the human stays the owner.
- **Linear Diffs are GitHub-only.** On Harness, mirror reviews as comments.
- Linear's MCP is remote: `https://mcp.linear.app/mcp` (Streamable HTTP).
- Linear webhook signatures are **bare hex**; GitHub's are `sha256=` prefixed.
- Deep PR driving belongs to `github-orchestrator`, not here.

## When to open deeper docs
| Signal | Open docs | Why |
| --- | --- | --- |
| Setup or usage details | README.md | Install steps and quick start |
| Changing plugin behavior | the relevant `commands/`, `agents/`, `skills/` file | Source of truth |
| Touching the runtime | `CLAUDE.md`, then `lib/` | Design constraints and layering |
| Running many agents | `commands/swarm.md`, `skills/swarm-orchestration/SKILL.md` | Conductor, claims, isolation |
| Wiring a git host | `commands/sync.md`, `skills/vcs-bridge/SKILL.md` | Provider contract and differences |
| Upgrading from 1.0.0 | CHANGELOG.md | Breaking changes and renames |
