# Linear Orchestrator

Linear integration for Claude Code: run agents inside Linear, fan a backlog out
across parallel workers, and keep issues in step with GitHub or Harness Code.

## What it does

- **Agent sessions** — operate as a Linear app user that can be delegated
  issues and @mentioned, reporting through real agent activities
  (`thought` / `action` / `elicitation` / `response` / `error`).
- **Swarm conductor** — dispatch a filtered backlog to N parallel Claude Code
  workers, each in its own git worktree, with exclusive leased claims so two
  workers can never take the same issue.
- **Provider-neutral VCS sync** — one bridge, two hosts: GitHub and Harness
  Code, behind a single interface.
- **Linear Diffs** — review GitHub pull requests inside Linear.
- **Full Linear surface** — issues, cycles, projects, initiatives, customers,
  documents, SLA, triage, webhooks, attachments.

## Install

```bash
/plugin install linear-orchestrator
/linear:setup
```

## Quick start

```bash
# 1. Authenticate (API key for a service account, OAuth for an agent)
/linear:setup --mode oauth

# 2. Connect Linear's remote MCP server (recommended for interactive work)
claude mcp add --transport http linear-server https://mcp.linear.app/mcp

# 3. Register webhooks
/linear:webhook --register --url https://your-app.example.com/linear/webhook

# 4. Wire up your git host
/linear:sync enable --provider github     # or: --provider harness

# 5. Try the swarm on a tight filter, dry first
/linear:swarm start --filter 'label:ready-for-agent' --concurrency 2 --dry-run
```

## Choosing a path for agentic work

| | Linear coding sessions | `/linear:swarm` |
|---|---|---|
| Parallelism | one issue at a time | bounded concurrency |
| Host | GitHub only | GitHub or Harness Code |
| Infrastructure | Linear's managed sandbox | your runners |
| Billing | Linear AI credits | your Claude Code usage |

They compose well: let Linear take the first pass in Triage, run the swarm for
planned cycle work.

## Architecture

```
commands/*.md            behaviour specs
lib/linear-client.mjs    GraphQL: auth, retry, rate-limit + complexity headers
lib/agent-session.mjs    agent sessions and activities
lib/webhooks.mjs         signature verification, normalisation, dedupe
lib/oauth.mjs            OAuth 2.0 incl. actor=app
lib/attachments.mjs      upload -> attach
lib/vcs/                 provider contract + GitHub + Harness adapters
lib/swarm/               conductor, delegation ledger, worktree workspaces
tests/                   82 tests, node:test, zero dependencies
```

The runtime is dependency-free ES modules. The plugin is loaded straight from
disk with no build step, so it must run on a bare Node 20+.

```bash
pnpm test:linear-plugin
```

## Scope boundary

This plugin owns **Linear**, and the mapping between Linear and a git host.
It deliberately does not reimplement deep pull-request driving — review boards,
CI drive-to-green loops, merge trains — which live in `github-orchestrator`.

## Documentation

- `CLAUDE.md` — operational guide and the facts most often gotten wrong
- `CONTEXT_SUMMARY.md` — bootstrap context
- `commands/*.md` · `skills/*/SKILL.md` · `agents/*.md`
- `docs/architecture.md`

## Upgrading from 1.0.0

2.0.0 is a breaking release that removes fabricated API surface and the
Microsoft Planner bridge. See `CHANGELOG.md` for the full list and the
command renames.

## License

MIT © Markus Ahling
