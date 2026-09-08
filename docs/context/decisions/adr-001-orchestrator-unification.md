# ADR-001: Unify the delivery orchestrators into a kernel-and-adapters plugin

## Status

**Proposed**

## Date

2026-09-08

## Context

The marketplace ships six plugins that all orchestrate software delivery work.
They were built independently and have converged on the same ideas by
reinvention rather than reuse.

| Plugin | Ver | Size | Runtime | Tests |
|---|---|---|---|---|
| `jira-orchestrator` | 8.3.0 | 82 agents · 48 commands · 14 skills | ~33k LOC TS, Prisma, Temporal, Redis | 32 files, cannot run |
| `github-orchestrator` | 1.1.0 | 34 agents · 24 commands · 16 skills · 7 workflows | ~400 lines shell/JS | none |
| `linear-orchestrator` | 2.0.0 | 11 agents · 24 commands · 10 skills | dependency-free `.mjs` | 82, green |
| `project-management-plugin` | 1.4.0 | 17 agents · 27 commands | `mcp/pm-server.mjs`, `lib/pm-*.mjs` | yes, green |
| `fleet-orchestration` | 1.1.0 | 10 agents · 6 commands | `scripts/fleet.mjs` (936 L) | none |
| `deployment-pipeline` | 2.0.0 | 3 agents · 5 commands | `src/workflow/*.ts` | none |

That is **~157 agents and ~134 commands** across six plugins, with no shared
contract between them.

### The duplication is structural, not cosmetic

Independent audits of all three named orchestrators surfaced the same
collisions:

1. **Four separate multi-agent "council"/review implementations** —
   `jira-orchestrator` (blackboard), `github-orchestrator` (adversarial review
   board), `project-management-plugin` (`council-reviewer`), and
   `upgrade-suggestion` (7 specialists + synthesiser).
2. **Two incompatible declarative workflow schemas** — `github-orchestrator`
   defines one with 7 workflows, `jira-orchestrator` another with 5. Both call
   themselves `workflow.schema.json`.
3. **A shared telemetry write path with no coordination** —
   `github-orchestrator` and `jira-orchestrator` both append to
   `.claude/orchestration/telemetry/`.
4. **Issue triage, dedup and epic decomposition** exist as separate agents in
   both `jira-orchestrator` and `github-orchestrator`, doing the same reasoning
   over different APIs.
5. **`project-management-plugin` already ships Linear and GitHub Projects
   adapters**, overlapping two of the three dedicated orchestrators.
6. **Three mutually inconsistent Atlassian MCP tool-naming schemes** inside
   `jira-orchestrator` alone (~300 call sites); at least one family cannot
   resolve against the single MCP server the plugin declares.

### The split is not platform-shaped

The audits agree that **55–65% of each orchestrator is platform-neutral**. What
is genuinely GitHub-specific is Actions, merge queue, Projects v2, CODEOWNERS
and the Copilot delegation surface. What is genuinely Jira-specific is JQL,
smart commits, worklogs and the transition machinery. Everything else — task
graphs, review protocols, CI failure taxonomy, DORA, stacked branches, release
reasoning, rollback decisions — is written three times against three APIs.

Meanwhile the same audits found each plugin carries capability the others lack
entirely: `project-management-plugin` has the only guardrail layer (scope lock,
done-when contract, drift audit, turn budget); `fleet-orchestration` has the
only multi-session heartbeat protocol; `jira-orchestrator` has the only durable
workflow engine; `github-orchestrator` has the only adversarial verification
protocol; `linear-orchestrator` now has the only tested runtime.

## Decision

Build **one plugin, internally layered as a kernel with platform adapters** —
not a flat merge of six command sets.

```
                       +-------------------------------+
   /do:* commands  --> |          KERNEL               |
   (platform-neutral)  |                               |
                       |  work graph + decomposition   |  <- project-management-plugin
                       |  guardrails (scope, drift,    |
                       |    done-when, turn budget)    |  <- project-management-plugin
                       |  swarm conductor + ledger     |  <- linear-orchestrator
                       |  fleet protocol + heartbeats  |  <- fleet-orchestration
                       |  review protocol (adversarial)|  <- github-orchestrator
                       |  workflow schema + engine     |  <- reconciled from 2
                       |  durable state + checkpoints  |  <- jira-orchestrator
                       |  telemetry + lessons (one path)|
                       |  model routing (one config)   |
                       +---------------+---------------+
                                       |
                +----------+-----------+-----------+----------+
                |          |           |           |          |
            TrackerPort  VcsPort   CicdPort   NotifyPort   DocsPort
                |          |           |           |          |
          +-----+----+  +--+----+  +---+----+  +---+---+  +---+----+
          | Linear   |  |GitHub |  |Harness |  |Slack  |  |Confluence|
          | Jira     |  |Harness|  |Actions |  |Teams  |  |Notion    |
          | GH Issues|  |       |  |        |  |       |  |          |
          +----------+  +-------+  +--------+  +-------+  +----------+
```

The ports are the contract. `linear-orchestrator` 2.0.0 already proves the
pattern works: `lib/vcs/provider.mjs` is a `VcsPort` with GitHub and Harness
adapters behind it, and every behaviour above the interface is written once.

### Command surface: ~134 becomes ~30

Consolidation is verb-first with a platform flag, not one command per platform.

| Kernel command | Absorbs |
|---|---|
| `/do:plan` | `pm-plan`, `jira:prepare`, `gh:plan-prs`, `linear:issue`, `jira:sprint-plan` |
| `/do:work` | `pm-work`, `jira:work`, `gh:ship`, `jira:ship` |
| `/do:swarm` | `linear:swarm`, `fleet-start`, `pm-auto`, `jira:orchestrate-advanced` |
| `/do:review` | `gh:review`, `jira:council`, `pm-review`, `upgrade-suggestion` council |
| `/do:ci` | `gh:ci`, `jira:harness-review` |
| `/do:merge` | `gh:merge-train`, `gh:conflict` |
| `/do:release` | `gh:release`, `jira:release`, `deployment-pipeline:start` |
| `/do:rollback` | `gh:rollback`, `deployment-pipeline:rollback` |
| `/do:triage` | `gh:triage`, `jira:triage`, `linear:triage` |
| `/do:sync` | `linear:sync`, `jira:sync`, `pm-sync` |
| `/do:insights` | `gh:insights`, `jira:metrics`, `jira:quality` |
| `/do:advise` | `gh:advise`, `jira:advise` |
| `/do:guard` | the whole `pm-anchor`/`pm-scope`/`pm-drift`/`pm-budget` family |

Platform depth that has no neutral equivalent stays as a namespaced escape
hatch — `/gh:actions`, `/jira:jql`, `/harness:pipeline` — rather than being
forced into a generic verb.

### Conflict resolutions

| Collision | Resolution | Why |
|---|---|---|
| 4 council implementations | Keep `github-orchestrator`'s adversarial review board | Only one that verifies findings by trying to refute them, with a quorum and a default-to-refuted rule. Directly targets LLM review's false-positive problem. |
| 2 workflow schemas | Keep `github-orchestrator`'s | Draft-07, `additionalProperties: false`, recursive steps, retry/backoff, coordination patterns, and a passing validator. `jira-orchestrator`'s is thinner. |
| Telemetry path | One kernel writer, `jq`-built, `flock`-serialised | `github-orchestrator`'s hook scripts already do this correctly; adopt them wholesale. |
| Triage/dedup/decompose agents | One set on `TrackerPort` | The reasoning is identical; only the API differs. |
| Durable state | `jira-orchestrator`'s Temporal + Prisma, made **optional** | Powerful but heavy. Default to the file-backed store from `project-management-plugin`; opt in to Temporal for long-horizon runs. |
| Runtime language | Dependency-free `.mjs` + `node:test` | The only style in the repo that demonstrably runs. See Consequences. |

## Consequences

### Positive

- One contract to implement per new platform, instead of a new plugin.
- Every platform inherits every capability. Jira gets the adversarial review
  board; Linear gets guardrails; GitHub gets durable checkpoints.
- ~134 commands collapse to ~30, which is the difference between a surface a
  person can learn and one they cannot.
- One place to fix a bug in review protocol, retry policy, or telemetry.
- Model routing and cost policy become global rather than per-plugin.

### Negative

- Large, breaking migration. Every existing command name changes.
- `jira-orchestrator`'s ~33k LOC has no working build: no `tsconfig.json`, no
  `vitest.config`, no eslint config, and dangling `package.json` targets. Its
  runtime must be made buildable *before* it can be merged, or triaged and
  partly discarded. This is the single largest unknown in the plan.
- Temporal/Prisma/Redis as optional dependencies complicate install.
- A regression in the kernel affects every platform at once.

### Risks

- **`jira-orchestrator` is not merge-ready.** 82 agents and 250 markdown files,
  much of it build-log sprawl (7 `WORKSTREAM-*` files, 4 overlapping security
  post-mortems), plus committed runtime state and three inconsistent MCP naming
  schemes. Merging it as-is imports the rot.
- **Prompt-only "capabilities".** Several headline features (saga, dynamic
  replanning, blackboard, event-sourcing replay) exist as agent instructions
  with no implementing code. They must not be described as working code after
  the merge.
- **Scope.** This is a multi-session programme, not one change.

## Sequencing

Each phase leaves the marketplace working.

| Phase | Work | Exit criterion |
|---|---|---|
| **0. Prove the pattern** | `linear-orchestrator` 2.0.0 — ports, swarm, tests | ✅ Done. 82 tests green. |
| **1. Extract the kernel** | New plugin. Move the work graph + guardrails from `project-management-plugin`, the conductor from `linear-orchestrator`, the fleet protocol from `fleet-orchestration`. Define `TrackerPort`. Tests first. | Kernel tested standalone with an in-memory tracker |
| **2. First two adapters** | `LinearTracker` (from 2.0.0) and `GitHubTracker`. Reconcile the two workflow schemas. Adopt the adversarial review board as the one review protocol. | `/do:review` and `/do:swarm` work identically on Linear and GitHub |
| **3. Triage Jira** | Audit `jira-orchestrator`'s 33k LOC against a working build. Port what compiles and is tested; rewrite the rest as prompts or drop it. Fix the MCP naming. | `JiraTracker` passes the same conformance suite |
| **4. Delivery tail** | Fold in `deployment-pipeline`'s state machine as `CicdPort`; Harness and Actions adapters. | `/do:release` and `/do:rollback` work on both |
| **5. Deprecate** | Old plugins become thin shims that print the new command and exit. Remove after one release. | Marketplace validation green; no duplicate agents |

### Conformance suite

Phase 1 must produce a port conformance suite that every adapter runs. Without
it "works on Linear" silently means "does not work on Jira", which is the
failure mode that produced this ADR.

## Alternatives considered

**Leave them separate.** Cheapest, and the duplication is survivable today.
Rejected because the audits show it is already compounding: four councils and
two workflow schemas were each written by someone who did not know the others
existed.

**Flat merge into one plugin.** What "merge it all into one plugin" most
literally means. Rejected: 157 agents and 134 commands in one namespace is not
usable, and it preserves every duplicate rather than resolving it. The kernel
split delivers a single installable plugin *and* removes the duplication.

**Shared library, separate plugins.** Plugins are distributed as directories
with no dependency mechanism, so a shared library means vendoring — which is
how the current duplication arose.

## References

- Audits: `jira-orchestrator`, `github-orchestrator`, and the wider plugin
  survey, 2026-09-08.
- Proven pattern: `plugins/linear-orchestrator/lib/vcs/provider.mjs`.
- Symphony conductor model: https://github.com/openai/symphony
