# Context Optimization Command

**Usage:** `/context-optimize [action]`

Manages context optimization through external knowledge base and checkpointing.

## Actions

### `status` - Check Current Context Usage
```bash
/context-optimize status
```

Shows:
- Current token usage across all components
- Budget health status
- Active allocations
- Optimization suggestions

### `checkpoint` - Create Phase Checkpoint
```bash
/context-optimize checkpoint [phase]
```

Creates external checkpoint for phase:
- `explore` - Research findings
- `plan` - Implementation plan
- `code` - Code implementation
- `test` - Test results
- `fix` - Bug fixes
- `document` - Documentation

### `load` - Load External Resource
```bash
/context-optimize load [type] [name]
```

Load resource from Obsidian vault:
- `agent [name]` - Load agent definition
- `skill [name]` - Load skill definition
- `mcp [name]` - Load MCP tool reference
- `workflow [name]` - Load workflow pattern

### `compress` - Compress Current Context
```bash
/context-optimize compress
```

Triggers automatic context compression:
1. Checkpoints active phase
2. Releases non-essential allocations
3. Keeps only 200-token summaries

### `report` - Generate Budget Report
```bash
/context-optimize report
```

Generates comprehensive budget report with:
- Token usage breakdown
- Allocation efficiency
- Optimization recommendations
- Historical trends

## Examples

```bash
# Check context health
/context-optimize status

# Checkpoint CODE phase
/context-optimize checkpoint code

# Load coder agent definition
/context-optimize load agent coder

# Compress context when approaching limits
/context-optimize compress

# Get detailed budget report
/context-optimize report
```

## Integration with Orchestration

This command works seamlessly with the 6-phase orchestration protocol:

```
EXPLORE → checkpoint → 200 tokens
PLAN → checkpoint → 150 tokens
CODE → checkpoint → 300 tokens
TEST → checkpoint → 200 tokens
FIX → checkpoint → 150 tokens
DOCUMENT → checkpoint → 200 tokens
```

Each phase automatically:
1. Allocates budget
2. Executes work
3. Creates checkpoint
4. Releases budget
5. Returns summary

## Automation

Enable auto-optimization in `.claude/config.json`:

```json
{
  "context_management": {
    "auto_checkpoint": true,
    "auto_compress_threshold": 75,
    "budget_alerts": true,
    "token_budget": 100000
  }
}
```

## See Also

- [[System/Context-Management/README]]
- [[System/Context-Management/Checkpoints/README]]
- [[.claude/orchestration/checkpoint_manager.py]]
- [[.claude/orchestration/context_budget_enforcer.py]]
