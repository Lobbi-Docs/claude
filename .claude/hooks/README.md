# Golden Armada Hooks

This directory contains hook configurations for Claude Code automation.

## Hook Types

### Pre-Task Hooks
Execute before starting a task to set up context or validate conditions.

### Post-Task Hooks
Execute after completing a task for cleanup or follow-up actions.

### Post-Edit Hooks
Execute after file edits for validation or formatting.

## Configuration

Hooks are configured in the main `settings.json` or per-agent in their markdown files.

### Example Hook Configuration

\`\`\`json
{
  "hooks": {
    "pre_task": {
      "enabled": true,
      "script": ".claude/hooks/pre-task.sh"
    },
    "post_task": {
      "enabled": true,
      "script": ".claude/hooks/post-task.sh"
    },
    "post_edit": {
      "enabled": true,
      "patterns": ["*.py", "*.yaml"],
      "script": ".claude/hooks/post-edit.sh"
    }
  }
}
\`\`\`

## Available Hooks

| Hook | File | Description |
|------|------|-------------|
| pre-task | `pre-task.sh` | Environment validation |
| post-task | `post-task.sh` | Cleanup and reporting |
| post-edit | `post-edit.sh` | Linting and formatting |
| pre-commit | `pre-commit.sh` | Pre-commit checks |
| pre-deploy | `pre-deploy.sh` | Deployment validation |
