---
name: linear:sync
intent: Two-way sync between Linear issues and a git host — GitHub or Harness Code — covering branches, pull requests, reviews and deploys
tags:
  - linear-orchestrator
  - command
  - sync
  - github
  - harness
  - two-way-sync
inputs:
  - action
risk: high
cost: medium
description: Provider-neutral Linear <-> VCS sync. Works with GitHub and Harness Code behind one interface (lib/vcs/).
---

# /linear:sync

Bridges Linear issues to a git host. One command, two providers, selected by
`--provider` or `LINEAR_VCS_PROVIDER`.

> **Replaces `/linear:harness-sync` and `/linear:planner-sync` from
> 1.0.0.** Harness is now one provider behind `lib/vcs/provider.mjs` rather
> than a hardcoded path, and GitHub is a first-class peer. Planner sync was
> removed — see `CHANGELOG.md`.

## Providers

| | GitHub | Harness Code |
|---|---|---|
| `--provider` | `github` | `harness` |
| Credentials | `GITHUB_TOKEN`, `GITHUB_OWNER` | `HARNESS_API_TOKEN`, `HARNESS_ACCOUNT_ID` (+ optional `HARNESS_ORG_ID`, `HARNESS_PROJECT_ID`) |
| Webhook signature | `X-Hub-Signature-256`, `sha256=` prefixed | `X-Harness-Signature`, bare hex |
| Linear native Diffs/Reviews | **yes** — use `/linear:review` | **no** — PRs mirrored as attachments + comments |
| Deep PR driving | delegate to `github-orchestrator` | `/linear:harness-platform`, `/linear:harness-git` |

The provider difference that matters: **Linear's Diffs product is GitHub-only.**
On Harness the plugin cannot lean on Linear's review surface, so it attaches the
PR to the issue and mirrors review state as comments. Everything else — key
extraction, branch naming, status transitions — is identical, because it lives
above the provider interface.

Inside a Claude Code session, prefer the GitHub MCP tools over this command's
REST client. The REST path exists for the webhook bridge, which runs outside a
session.

## Sync matrix

| Linear event | VCS action |
|---|---|
| Issue moves to a started status | Create branch `<prefix>/<key>-<slug>` if absent |
| Issue moves to In Review | Label the PR `linear:in-review` |
| Issue archived | Comment on the open PR; do not auto-close it |

| VCS event | Linear action |
|---|---|
| PR opened referencing `ENG-123` | Attach PR to issue, transition to In Review |
| PR review submitted | Comment on the issue with verdict and reviewer |
| PR merged | Transition to Done (only for keys behind a closing keyword) |
| Deploy succeeded | Comment on referenced issues, add `deployed:<env>` |
| Deploy failed | Comment and transition back to In Progress |

Only keys behind a **closing keyword** (`fixes`, `closes`, `resolves`, …) cause
a Done transition. A bare `ENG-2` mention links but never closes — see
`extractClosingKeys` in `lib/vcs/provider.mjs`.

## Actions

### `enable --provider <github|harness> [--repo <name>]`
Stores coordinates, registers webhooks on both sides, validates with a read.

### `disable`
Unregisters webhooks. Historical links are preserved.

### `status`
Webhook health, last successful sync, error count, mapped repos, and which
provider is active.

### `branch <issueKey> [--repo <name>] [--prefix <str>]`
Creates a branch named the way Linear's own "copy git branch name" action does,
so Linear's auto-linking recognises it. Comments the branch URL on the issue.

### `reconcile [--dry-run] [--apply]`
Walks in-progress issues checking each has a PR, and open PRs checking each
references an issue. Reports drift; `--apply` creates the missing links.

Reconcile is the recovery path for missed webhooks. Run it after any outage
rather than replaying deliveries.

### `event --file <payload.json>`
Feeds one captured webhook payload through verification and normalisation.
Useful for debugging a delivery without waiting for another.

## Idempotency and failure

- Every delivery is keyed by its id and admitted once through
  `DeliveryDeduper` (`lib/webhooks.mjs`). Retries are no-ops.
- Signature verification runs against the **raw body**. Verifying a
  re-serialised object fails intermittently on key ordering.
- Linear webhook receivers must return 2xx within 5 seconds. Acknowledge first,
  process after.
- A signature mismatch is rejected and alerted, never retried — it may be an
  attack, not a glitch.
- Missing credentials degrade to Linear-only mode with a warning. The bridge
  never silently skips writes.

## See also
- `lib/vcs/provider.mjs`, `lib/vcs/github.mjs`, `lib/vcs/harness.mjs`
- `commands/review.md` — GitHub-only review surface
- `skills/vcs-bridge/SKILL.md`
