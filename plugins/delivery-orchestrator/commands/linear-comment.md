---
name: linear:comment
intent: Comment on issues, reply in threads, add reactions; supports markdown editor features and customer-request linkage
tags:
  - linear-orchestrator
  - command
  - comment
inputs:
  - id
  - body
risk: low
cost: low
description: Comment on issues (linear.app/docs/comment-on-issues)
---

# /linear:comment

Maps to `commentCreate`, `commentUpdate`, `commentDelete`, `reactionCreate`.

## Subcommands
- `/linear:comment ENG-123 "Body here"` — top-level comment
- `/linear:comment --reply <commentId> "Body"` — threaded reply
- `/linear:comment --edit <commentId> "New body"`
- `/linear:comment --delete <commentId>`
- `/linear:comment --react <commentId> :thumbsup:`

## Markdown features supported
- Inline code, code blocks, lists, headings, links
- `@mentions` (resolves email/name to user mention via SDK)
- `<file>` attachments via `attachmentLinkCreate` for non-uploaded URLs
- Cross-issue links rendered as Linear smart references (e.g. `ENG-456`)

## Bridge fan-out
- Comments from Harness PR threads are mirrored back as Linear comments by the `vcs-linear-bridge` agent.
