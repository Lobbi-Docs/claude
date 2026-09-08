# Delivery Orchestrator

One plugin for delivery orchestration across **Linear, Jira, GitHub and Harness**.

Replaces six plugins — `linear-orchestrator`, `jira-orchestrator`,
`github-orchestrator`, `project-management-plugin`, `fleet-orchestration`,
`deployment-pipeline` — which had independently converged on the same ideas.

## What it does

- **Swarm conductor** — dispatch a filtered backlog to N parallel Claude Code
  workers, each in its own git worktree, with leased exclusive claims so two
  workers can never take the same issue.
- **Guardrails** — focus anchor, scope lock, done-when contract, drift audit,
  turn budget, compaction-safe handoff, backed by a transactional state MCP.
- **Adversarial review board** — independent lenses, then skeptics prompted to
  refute each finding, with a quorum before anything is reported.
- **CI drive-to-green** — classify failures before fixing them, with bounded
  loops rather than an unbounded retry.
- **Two-way sync** — issues to branches and PRs across GitHub and Harness Code
  behind one provider contract.
- **Release trains and rollback planning**, DORA and hotspot intelligence.

## Install

```bash
/plugin install delivery-orchestrator
```

Commands keep their existing namespaces, so nothing you already type changes:

```bash
/linear:swarm start --filter 'label:ready-for-agent' --concurrency 2 --dry-run
/gh:review           # adversarial review board
/jira:ship           # end-to-end Jira delivery
/pm:plan             # decompose into a task DAG with guardrails
/fleet:census        # multi-session heartbeat check
/deploy:start        # delivery state machine
```

## Architecture

```
commands/         namespace-prefixed behaviour specs
lib/              kernel — dependency-free ES modules, 155 tests
  swarm/          conductor, delegation ledger, worktree workspaces
  vcs/            provider contract + GitHub and Harness adapters
  fleet/          multi-session fleet protocol CLI
  crypto.mjs      shared webhook signature primitives
mcp/              transactional project-state MCP server
workflows/        12 schema-validated declarative workflows
```

The runtime is dependency-free and runs on a bare Node 20+ with no build step.

```bash
pnpm test:delivery-plugin
```

## Status

This is the **first consolidation pass**: every command, agent, skill and
workflow from the six source plugins is present and working, with namespaces
preserved so nothing breaks. The next step — collapsing 133 commands onto a
~30-verb kernel surface — is tracked in
`docs/context/decisions/adr-001-orchestrator-unification.md`.

## License

MIT © Markus Ahling
