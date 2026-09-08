---
name: pr-fix
intent: '[DEPRECATED] Use /jira:pr --fix instead'
tags:
  - jira-orchestrator
  - command
  - pr-fix
inputs: []
risk: medium
cost: medium
description: '[DEPRECATED] Use /jira:pr --fix instead'
---

# DEPRECATED: Use `/jira:pr --fix`

This command has been consolidated into `/jira:pr` with the `--fix` flag.

## Migration

```bash
# Old (deprecated)
/pr-fix <pr-url> --jira PROJ-123

# New (use this)
/jira:pr PROJ-123 --fix
```

## Why Consolidated?

- Reduces context overhead (44 commands → fewer primary commands)
- Single entry point for all PR operations
- Clearer workflow: create → fix → iterate

See `/jira:pr` for full documentation.

**⚓ Golden Armada** | *You ask - The Fleet Ships*
