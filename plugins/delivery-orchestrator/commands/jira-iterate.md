---
name: jira:iterate
intent: '[DEPRECATED] Use /jira:pr --iterate instead'
tags:
  - jira-orchestrator
  - command
  - iterate
inputs: []
risk: medium
cost: medium
description: '[DEPRECATED] Use /jira:pr --iterate instead'
---

# DEPRECATED: Use `/jira:pr --iterate`

This command has been consolidated into `/jira:pr` with the `--iterate` flag.

## Migration

```bash
# Old (deprecated)
/jira:iterate PROJ-123 --max_iterations 3

# New (use this)
/jira:pr PROJ-123 --iterate --max_iterations 3
```

## Why Consolidated?

- Reduces context overhead
- Single entry point for all PR operations
- Clearer workflow: create → fix → iterate

See `/jira:pr` for full documentation.

**⚓ Golden Armada** | *You ask - The Fleet Ships*
