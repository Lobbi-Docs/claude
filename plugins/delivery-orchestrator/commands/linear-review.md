---
name: linear:review
intent: Work Linear Diffs — the in-Linear code review surface for GitHub pull requests, covering diffs, inline threads, review submission and merge
tags:
  - linear-orchestrator
  - command
  - review
  - diffs
  - code-review
inputs:
  - action
risk: high
cost: medium
description: Linear Diffs / Reviews (https://linear.app/docs/diffs, https://linear.app/docs/code-and-reviews)
---

# /linear:review

Linear **Diffs** (the "Reviews" sidebar section) let you review GitHub pull
requests inside Linear: changed files, checks, inline comment threads, approve
or request changes, and merge — all synced bidirectionally with GitHub.

> **Replaces `/linear:diff` from 1.0.0**, which described Diffs as "change
> history views for issues, projects and cycles" derived from nightly SQLite
> snapshots. That was wrong on every count: a Diff is a code review of a pull
> request. The old command's `linear.app/docs/diffs` link pointed at this
> feature all along.

## Prerequisites

- The GitHub integration connected **with code access** granted for the
  repositories you want to review.
- Personal GitHub account connected under Connected Accounts.
- Enable code reviews: Settings → Code & reviews → *Enable code reviews*.
- **GitHub-only.** Linear Diffs do not work with Harness Code, GitLab, or
  Bitbucket. On Harness, use `/linear:sync --provider harness`, which mirrors
  review state onto the issue as comments and attachments instead. Check
  `provider.supportsLinearDiffs` before routing to this command.
- Organizations using a GitHub IP allow list must add Linear's egress addresses,
  or diffs and review actions fail. The current list is in
  https://linear.app/docs/diffs — read it from there rather than trusting a
  copy, since it changes.

## Actions

### `list [--for-me|--created] [--repo <name>] [--group status|author|repo]`
Lists pull requests in the Reviews surface. `--for-me` is what needs your
attention; `--created` is what you authored.

### `show <pr>`
Opens one review: files changed, checks, activity, threads. Accepts a PR number,
a GitHub URL, or a `linear.review/<owner>/<repo>/pull/<n>` URL — replacing
`github.com` with `linear.review` in any PR URL opens it in Linear.

Line counts show implementation changes by default, excluding tests and docs; a
`[*]` marker means the total differs.

### `comment <pr> --file <path> --line <n> --body <text>`
Starts or replies to an inline thread. Threads sync to GitHub.

Note: GitHub's API does not expose every inline comment shape, so a few threads
created on GitHub cannot be rendered or replied to from Linear.

### `submit <pr> --verdict approve|request-changes|comment [--body <text>]`
Submits a review. The state syncs to GitHub, performed as the authenticated
GitHub user.

Draft reviews started in GitHub but not submitted do **not** sync into Linear.

### `merge <pr> [--method merge|squash|rebase]`
Merges from Linear, if you have permission.

### `guide <pr>`
Opens the **Guides** tab: large PRs organised into sections with explanations of
purpose and impact, core changes first. Business and Enterprise plans only.

## Automations worth knowing

Both live in Settings → Code & reviews:

- **On git branch copy, move issue to a started status** — copying the branch
  name transitions the issue. Hold Option to skip for one action.
- **Auto-convert draft PRs** — a draft PR becomes ready when a review is
  requested or it is approved.

These fire without this plugin's involvement. Account for them before adding a
sync rule that would duplicate the transition.

## Known limits

- No per-commit review; submission is at the pull-request level.
- Check status is shown, but not rich check-run annotations.
- If a PR shows the wrong state, a missed webhook is the usual cause; a trivial
  edit to the PR description in GitHub forces a resync.

## See also
- `commands/sync.md` — issue ↔ PR mapping for both GitHub and Harness
- `skills/linear-graphql/SKILL.md`
