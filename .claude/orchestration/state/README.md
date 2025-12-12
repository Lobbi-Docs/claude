# Orchestration State Directory

This directory stores runtime state for the orchestration system.

## Files

| File | Purpose |
|------|---------|
| `current_phase.json` | Tracks the current execution phase |
| `context_preservation.json` | Preserves context across phases |
| `next_steps.json` | Tracks next steps for each phase |

## State Management

State files are automatically created and managed by the orchestration hooks:

\`\`\`bash
# Initialize phase tracking
.claude/hooks/orchestration-hooks.sh init-phases

# Get current phase
.claude/hooks/orchestration-hooks.sh get-phase

# Preserve context
.claude/hooks/orchestration-hooks.sh preserve-context '{"key": "value"}'

# Track next steps
.claude/hooks/orchestration-hooks.sh track-next-steps '["Step 1", "Step 2"]'
\`\`\`

## Mandatory Phases

1. **explore** - Analyze requirements and codebase
2. **plan** - Design solution and create task breakdown
3. **code** - Implement features
4. **test** - Validate implementation
5. **fix** - Resolve identified issues
6. **document** - Update documentation and final review

## Sub-Agent Requirements

- **Minimum**: 3-5 agents per task
- **Maximum**: 13 agents per task
- **Default**: 5 agents per task

---

**Version:** 4.0.0
