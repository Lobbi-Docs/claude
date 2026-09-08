# Delivery Orchestrator — Context Summary

## Purpose
One plugin for delivery orchestration across Linear, Jira, GitHub and Harness.
Replaces six separate orchestrator plugins that had converged on the same ideas
by reinvention: a tested kernel behind thin platform adapters.

## At a glance
- Commands: 133 · Agents: 156 · Skills: 52 · Workflows: 12 · Tests: 155
- Runtime: dependency-free `.mjs` in `lib/`, run with `pnpm test:delivery-plugin`
- Trackers: Linear, Jira, GitHub Issues · VCS: GitHub, Harness Code

## Replaces
`linear-orchestrator`, `jira-orchestrator`, `github-orchestrator`,
`project-management-plugin`, `fleet-orchestration`, `deployment-pipeline`.
Command slash-names are unchanged — `/linear:*`, `/jira:*`, `/gh:*`, `/pm:*`,
`/fleet:*`, `/deploy:*` all still resolve. Only the plugin they live in changed.

## Layout
| Path | Holds |
| --- | --- |
| `lib/` | kernel: swarm conductor, delegation ledger, worktree workspaces, guardrails, VCS providers, Linear client, webhooks, crypto |
| `lib/vcs/` | provider contract + GitHub and Harness adapters |
| `lib/fleet/` | multi-session fleet protocol CLI |
| `mcp/` | transactional project-state MCP server |
| `tests/` | 155 tests, `node:test`, zero dependencies |
| `commands/` | namespace-prefixed: `linear-*`, `gh-*`, `jira-*`, `pm-*`, `fleet-*`, `deploy-*` |
| `workflows/` | 12 schema-validated declarative workflows + validator |

## Facts worth having up front
- **AIG = Agent Interaction Guidelines** (UX rules), not a gateway or bus.
- Agent activities: `thought`, `action`, `elicitation`, `response`, `error`;
  the last two are terminal.
- Assigning an issue to an agent is **delegation**; the human stays owner.
- **Linear Diffs are GitHub-only.** On Harness, mirror reviews as comments.
- Linear webhook signatures are **bare hex**; GitHub's are `sha256=` prefixed.
- Two workers must never hold one issue — that is what the leased claim ledger
  in `lib/swarm/ledger.mjs` exists to prevent.

## When to open deeper docs
| Signal | Open docs | Why |
| --- | --- | --- |
| Setup or usage | README.md | Install, quick start, per-platform wiring |
| Changing behaviour | the relevant `commands/`, `agents/`, `skills/` file | Source of truth |
| Touching the runtime | CLAUDE.md, then `lib/` | Design constraints and layering |
| Running many agents | `commands/linear-swarm.md`, `skills/swarm-orchestration/SKILL.md` | Conductor, claims, isolation |
| Wiring a git host | `commands/linear-sync.md`, `skills/vcs-bridge/SKILL.md` | Provider contract and differences |
| Migration questions | CHANGELOG.md | What merged from where, and what is still to consolidate |
