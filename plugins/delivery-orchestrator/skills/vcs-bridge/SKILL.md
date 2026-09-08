---
name: Linear VCS Bridge (GitHub and Harness Code)
description: This skill should be used when implementing or debugging two-way sync between Linear issues and a git host — branches, pull requests, reviews, deploys — across GitHub and Harness Code. Activates on "linear github sync", "harness sync", "harness bridge", "linear vcs", "issue to pr sync", "magic words", "closing keywords".
version: 2.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear VCS Bridge

Implementation: `lib/vcs/` — `provider.mjs` (contract), `github.mjs`,
`harness.mjs`, `index.mjs` (selection).

References:
- Linear webhooks: https://linear.app/developers/webhooks
- Linear Diffs: https://linear.app/docs/diffs
- Harness API: https://apidocs.harness.io

## Why an abstraction rather than two bridges

Linear's own code-review product (**Diffs**) integrates with GitHub only. A
Harness Code shop gets no review surface in Linear at all. Everything *else* —
extracting issue keys, naming branches, transitioning on merge, commenting on
deploys — is identical between the two hosts.

So the split is: one provider-neutral behaviour layer, and a thin adapter per
host that only covers what genuinely differs.

```
  commands/sync.md
        |
        v
  VcsProvider (contract)  <- extractIssueKeys, branchNameForIssue, intentForEvent
     /            \
GitHubProvider   HarnessProvider
```

Check `provider.supportsLinearDiffs` before routing anything to
`/linear:review`; on Harness, mirror review state as issue comments and attach
the PR with `attachToIssue` instead.

## The two signature schemes

This is the most common integration bug, and it is silent — every delivery just
fails verification.

| Host | Header | Format |
|---|---|---|
| Linear | `Linear-Signature` | **bare hex** |
| Harness | `X-Harness-Signature` | **bare hex** |
| GitHub | `X-Hub-Signature-256` | **`sha256=` prefixed** |

Code copied from a GitHub integration into a Linear handler rejects everything,
and vice versa. `tests/vcs.test.mjs` asserts each scheme rejects the other's
format specifically to stop that regression.

Always verify against the **raw request body**. Verifying a re-serialised object
fails intermittently on key ordering and unicode escaping — the worst kind of
bug, because it works in testing.

## Issue keys and closing keywords

Two functions, deliberately different in strictness:

- `extractIssueKeys(text)` — strict uppercase. Finds every referenced key.
  Uppercase-only because scanning free prose case-insensitively matches
  `utf-8`, `sha-256`, `covid-19`.
- `extractClosingKeys(text)` — keys behind `fixes` / `closes` / `resolves` /
  etc. Case-insensitive on the key, because the keyword already disambiguates.

**Only closing keys should trigger a Done transition.** A bare `ENG-2` in a PR
body is a reference, not a commitment to close it. Getting this wrong closes
issues people were only mentioning.

## Branch naming

`branchNameForIssue` produces the same shape as Linear's own "copy git branch
name" action, so Linear's auto-linking recognises the branch without any help
from the bridge. Do not invent a different convention — you lose the native
integration for nothing.

Note that Linear may already transition the issue itself: *On git branch copy,
move issue to a started status* is a per-user setting. Check before adding a
bridge rule that duplicates it.

## Idempotency

Both hosts retry deliveries. Handlers must be idempotent.

- Key on the delivery id (`Linear-Delivery`, `X-GitHub-Delivery`,
  `X-Harness-Delivery`) and admit each once — `DeliveryDeduper` in
  `lib/webhooks.mjs`.
- Fail open when there is no id: better to process twice than to drop.
- Bound the dedupe set by both size and TTL, or it grows forever.

## Recovery

Webhooks get missed. Do not build delivery replay — build **reconcile**:
compare Linear state to VCS state and repair the difference. It is the only
recovery path that also fixes drift caused by manual edits, and it is testable
without a webhook.

## Rate limits

| Host | Budget |
|---|---|
| Linear (API key) | 2,500 req/hr + 3M complexity/hr |
| Linear (OAuth) | 5,000 req/hr + 2M complexity/hr |
| GitHub | 5,000 req/hr authenticated (REST) |
| Harness | per-account; back off on 429 |

Linear also caps a single query at 10,000 complexity points. Reconcile over a
large workspace is the operation that hits this — page it, and read the
`X-Complexity` response header rather than guessing.
