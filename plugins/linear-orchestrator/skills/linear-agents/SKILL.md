---
name: Linear Agents, Sessions and Coding Sessions
description: This skill should be used when building, registering, or operating an agent inside Linear — agent sessions, agent activities, delegation, Agent Skills, Loops, and Linear's built-in coding sessions. Activates on "linear agent", "agent session", "agent activity", "delegate issue", "linear aig", "agents in linear", "coding session", "linear loops".
version: 2.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear Agents

References:
- Agents (user docs): https://linear.app/docs/agents-in-linear
- Linear Agent: https://linear.app/docs/linear-agent
- Coding sessions: https://linear.app/docs/coding-sessions
- Developer docs: https://linear.app/developers/agents

## Corrections to earlier versions of this plugin

Version 1.0.0 of this skill described an API that does not exist. If you find
these anywhere, they are wrong:

| Wrong | Right |
|---|---|
| "AIG = Agent Intelligence Gateway", a message bus | **AIG = Agent Interaction Guidelines**, a set of UX rules. There is no gateway. |
| `agentSignalCreate({ kind: "progress" })` | `agentActivityCreate` with a typed `content` payload |
| Signal kinds `progress` / `completion` / `request_input` | Activity types `thought` / `action` / `elicitation` / `response` / `error` |
| Scopes `agents:create`, `agents:signal` | `app:assignable`, `app:mentionable` (plus `read` / `write`) |
| `lib/aig.ts`, `aigPublish()` / `aigSubscribe()` | Never existed. Use `lib/agent-session.mjs`. |
| Actor tokens minted by your backend as 5-minute JWTs | OAuth with `actor=app`; see `skills/linear-oauth/SKILL.md` |

## What an agent is

An agent is an OAuth application installed into a workspace as an **app user**.
Once installed it behaves like a teammate: it can be @mentioned, delegated
issues, and can comment on issues, projects and documents.

The key semantic: **assigning an issue to an agent is delegation, not
reassignment.** The human assignee stays the owner and remains accountable.
Do not write copy that implies the agent has taken the issue over.

Agents are not billable seats. They cannot sign in, access admin functions, or
manage users.

## Agent sessions and activities

Work is reported through a **session**, which holds an ordered list of
**activities**.

Session states: `pending`, `active`, `error`, `awaitingInput`, `complete`, `stale`.

| Activity | Meaning | Terminal |
|---|---|---|
| `thought` | Internal reasoning, rendered collapsed | no |
| `action` | A tool or command that was run | no |
| `elicitation` | A question for the user; moves session to `awaitingInput` | no |
| `response` | Finished successfully | **yes** |
| `error` | Failed | **yes** |

Two timing rules that cause silent breakage when missed:

- Emit **within 10 seconds** of session creation, or Linear marks it `stale`.
  Send a `thought` before doing any slow setup work.
- A webhook receiver must return 2xx **within 5 seconds**. Acknowledge first,
  then work asynchronously.

Use `lib/agent-session.mjs`, which enforces both:

```js
import { AgentSession } from "../lib/agent-session.mjs";

const session = new AgentSession(client, sessionId);
await session.thought("Reading the issue and planning the change.");
await session.action("Run tests", "pnpm test", "42 passed");
await session.respond("Opened PR #128.");
```

`session.guard(work)` wraps a unit of work so the session always terminates —
a crashed worker still emits `error` rather than leaving the issue stuck in
`active` forever. This is the single most important guardrail in the module.

## Agent guidance

Workspaces and teams publish markdown **guidance** that is passed to every
agent working there: which repository to use, how to reference issues in
commits, what review process to follow.

- Workspace: Settings → Agents → Additional guidance
- Team: team settings → Agents → Additional guidance (takes priority)

Read guidance before acting and follow it. It is the workspace's convention
layer, and users will judge the agent by whether it respects it.

## Agent Skills

Users can save a good agent interaction as a reusable **skill**, invoked by
slash command in the agent input or selected automatically when the context
matches.

- Personal: Settings → Account → Agent personalization → Skills
- Team-shared: team settings → AI & Agents → Agent skills

Enumerate them with the Linear MCP tools `list_agent_skills` / `get_agent_skill`
before proposing a workflow — the team may already have a sanctioned one.

## Loops

**Loops** are shared skills that run on a schedule or an event, letting Linear
do background work: triage delegation, follow-ups, routine sweeps. Prefer a Loop
over an external cron when the work is entirely inside Linear; use this plugin's
conductor when the work needs a repository checkout.

## Coding sessions

Linear can run agentic coding itself. Delegating an issue starts a secure
session on Claude Code or Codex in a managed sandbox, which drafts a PR and
attaches the diff to the issue.

- Models include Claude Fable 5, Claude Opus 5, Claude Sonnet 5, GPT-5.6 Sol.
- **Coding environments** (Workspace settings → AI & Agents → Coding sessions →
  Environments) configure runtimes, env vars, a prepare script, files, and
  repository-specific guidance. One repository per environment.
- Triage automations can start a coding session on arrival, filtered by label
  or other properties.
- Usage draws on the workspace's AI credits.
- Requires the GitHub integration with code access.

### Choosing between a coding session and this plugin's swarm

| Use Linear coding sessions | Use `/linear:swarm` |
|---|---|
| One issue at a time, GitHub repo | Many issues in parallel, bounded concurrency |
| No local infrastructure wanted | You need your own runners, caches, or network |
| Managed sandbox is sufficient | Harness Code, or any non-GitHub host |
| Billed via Linear AI credits | Billed via your own Claude Code usage |

They compose: let Linear take first pass on triage, and run the swarm for
planned cycle work.

## Writing issues an agent can act on

Delegation quality tracks issue quality. A well-scoped issue names the file or
subsystem, states the expected behaviour change, points at the existing pattern
to reuse, and says explicitly what must not change. A vague issue burns credits
on exploration.
