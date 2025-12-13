# Context Optimization Command

Manage and optimize context window usage for maximum efficiency.

## Usage

```
/context <action> [options]
```

## Actions

- `status` - Show current context usage breakdown
- `optimize` - Run optimization strategies
- `checkpoint` - Save context checkpoint
- `restore` - Restore from checkpoint
- `analyze` - Deep analysis of context usage
- `budget` - Configure token budget allocation

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--strategy <s>` | Optimization strategy | `balanced` |
| `--threshold <n>` | Warning threshold % | `75` |
| `--name <name>` | Checkpoint name | Auto-generated |
| `--force` | Force optimization even below threshold | `false` |
| `--dry-run` | Preview optimization without applying | `false` |
| `--verbose` | Show detailed breakdown | `false` |

## Examples

### View Context Status

```bash
# Show current usage
/context status

# Detailed breakdown
/context status --verbose
```

### Optimize Context

```bash
# Run balanced optimization
/context optimize

# Aggressive optimization
/context optimize --strategy aggressive

# Preview without applying
/context optimize --dry-run
```

### Checkpointing

```bash
# Save checkpoint
/context checkpoint --name "before-refactor"

# List checkpoints
/context checkpoint --list

# Restore checkpoint
/context restore --name "before-refactor"
```

### Budget Configuration

```bash
# Set overall budget
/context budget --total 100000

# Set section budgets
/context budget --system 5000 --conversation 60000 --tools 35000

# Set warning threshold
/context budget --threshold 80
```

## Status Output

```
Context Window Status
══════════════════════════════════════════════════════════════
Total Budget:     100,000 tokens
Current Usage:    67,432 tokens (67.4%)
Available:        32,568 tokens

Breakdown by Section:
├── System Instructions    5,000 tokens (5.0%)  ████░░░░░░
├── Conversation History  42,000 tokens (42.0%) ████████░░
│   ├── Recent (keep)     28,000 tokens
│   └── Old (compressible) 14,000 tokens
├── Tool Results          18,432 tokens (18.4%) ████░░░░░░
│   ├── Active            12,000 tokens
│   └── Cached            6,432 tokens
└── Metadata              2,000 tokens (2.0%)   █░░░░░░░░░

Status: ✅ HEALTHY (below 75% threshold)

Recommendations:
• 14,000 tokens in old conversation could be summarized
• 6,432 tokens in tool cache could be evicted
• Potential savings: ~18,000 tokens (18%)
══════════════════════════════════════════════════════════════
```

## Optimization Strategies

### Conservative (Low Risk)
```
- Remove duplicate whitespace
- Strip code comments from cached results
- Evict stale tool cache (>30 min old)
- Typical savings: 5-10%
```

### Balanced (Default)
```
- All Conservative optimizations
- Summarize conversations older than 10 turns
- Compress JSON responses (short keys)
- Deduplicate repeated content
- Typical savings: 15-25%
```

### Aggressive (Maximum Compression)
```
- All Balanced optimizations
- Summarize all but last 3 turns
- Minify all code in context
- Replace file contents with references
- Typical savings: 30-50%
```

### Custom Strategy

```bash
/context optimize --strategy custom --config '{
  "summarizeAfterTurns": 5,
  "evictCacheAfterMinutes": 15,
  "minifyCode": true,
  "deduplicateThreshold": 0.8
}'
```

## Optimization Report

```
Context Optimization Report
══════════════════════════════════════════════════════════════
Strategy:         balanced
Original Tokens:  67,432
Optimized Tokens: 52,108
Savings:          15,324 tokens (22.7%)

Applied Optimizations:
✓ Summarized 8 old conversation turns    (-8,200 tokens)
✓ Compressed 3 JSON tool results         (-2,100 tokens)
✓ Deduplicated file content references   (-3,400 tokens)
✓ Evicted stale tool cache               (-1,624 tokens)

Warnings:
⚠ Large file in context: schema.json (4,200 tokens)
  Consider using reference instead of inline content

Preserved (High Priority):
• Recent conversation (last 5 turns)
• Active tool results
• System instructions
══════════════════════════════════════════════════════════════
```

## Checkpoint Management

### Checkpoint Storage

```
.claude/checkpoints/
├── before-refactor-2024-12-12T10-00-00.json
├── phase-1-complete-2024-12-12T11-30-00.json
└── checkpoint-index.json
```

### Checkpoint Format

```json
{
  "name": "before-refactor",
  "timestamp": "2024-12-12T10:00:00Z",
  "tokens": 67432,
  "phase": "CODE",
  "sections": {
    "system": { "hash": "abc123", "tokens": 5000 },
    "conversation": { "compressed": "...", "tokens": 42000 },
    "tools": { "activeRefs": [...], "tokens": 18432 }
  },
  "metadata": {
    "taskId": "implement-auth",
    "agentCount": 5
  }
}
```

## Token Counting

The system uses Claude-compatible tokenization:

| Content Type | Tokens/1K chars | Notes |
|--------------|-----------------|-------|
| English prose | ~250 | Natural language |
| Code | ~300-400 | Depends on language |
| JSON | ~350 | Structured data |
| Minified code | ~500 | Compressed |

### Count Specific Content

```bash
# Count tokens in file
/context count ./large-file.ts

# Count tokens in conversation
/context count --conversation

# Count with breakdown
/context count --verbose
```

## Budget Allocation

### Default Budget

```
Total: 100,000 tokens
├── System Instructions:  5,000 (5%)  [fixed]
├── Conversation:        60,000 (60%) [flexible]
├── Tool Results:        30,000 (30%) [flexible]
└── Reserve:              5,000 (5%)  [emergency]
```

### Configure Allocation

```bash
# Set conversation-heavy allocation
/context budget --conversation 70000 --tools 20000

# Set tool-heavy allocation (for exploration)
/context budget --conversation 40000 --tools 50000
```

## Thresholds and Alerts

| Threshold | Level | Action |
|-----------|-------|--------|
| 75% | Warning | Recommend optimization |
| 85% | Critical | Auto-suggest checkpoint |
| 95% | Emergency | Auto-optimize, notify user |

```bash
# Configure thresholds
/context budget --warning 70 --critical 85 --emergency 95
```

## Integration

Context optimization integrates with:

1. **Orchestration Protocol**: Auto-checkpoint at phase boundaries
2. **Agent Memory**: Offload to long-term memory when full
3. **Telemetry**: Track context efficiency metrics
4. **Health Checks**: Monitor context health

## Best Practices

1. **Checkpoint before major changes**
   ```bash
   /context checkpoint --name "pre-migration"
   ```

2. **Optimize before context-heavy tasks**
   ```bash
   /context optimize --strategy balanced
   ```

3. **Monitor during long sessions**
   ```bash
   /context status --watch
   ```

4. **Use references for large files**
   - Instead of inline: `[[file:schema.json]]`
   - Load on demand when needed

## See Also

- `/memory` - Agent memory management
- `/telemetry` - View context usage metrics
- `/health` - Overall system health including context
