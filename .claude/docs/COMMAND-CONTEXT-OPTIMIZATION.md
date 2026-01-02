# Command Context Optimization Guide

**Problem:** Slash commands are running out of context space because they load too much unnecessary content.

**Solution:** Implement lazy loading and context-aware command execution.

## Root Causes

1. **Full Registry Loading:** Commands load entire `commands.index.json` (1,169+ lines)
2. **Full Documentation:** Commands load `CLAUDE.full.md` (319 lines) instead of minimal `CLAUDE.md` (35 lines)
3. **Agent Definitions:** Commands load full agent definitions instead of summaries
4. **Related Files:** Commands load all related command files in the same category
5. **No Context Limits:** No enforcement of context budgets per command

## Optimization Strategy

### 1. Command Execution Pattern

**Before (High Context):**
```markdown
# Command loads:
- Full commands.index.json (~1,200 tokens)
- CLAUDE.full.md (~3,000 tokens)
- All agents in category (~5,000 tokens)
- Related commands (~2,000 tokens)
**Total: ~11,200 tokens**
```

**After (Optimized):**
```markdown
# Command loads:
- Single command file only (~200-500 tokens)
- Minimal CLAUDE.md (~1,000 tokens)
- Command-specific resources on-demand (~500 tokens)
**Total: ~1,700-2,000 tokens (85% reduction)**
```

### 2. Command File Structure

Commands should follow this minimal structure:

```markdown
# Command Name

**Usage:** `/command [args]`

**Context Budget:** 2,000 tokens max

## Quick Description
Brief one-line description.

## What This Command Does
1-2 sentence explanation.

## Usage
```bash
/command [required] [optional]
```

## Examples
```bash
/command example
```

## Implementation
[Actual command logic here - load external docs only if needed]

## External Resources (Load On-Demand)
- Agent definitions: Load via `mcp__obsidian__get_file_contents()` only when needed
- Registry data: Query `.claude/registry/commands.index.json` for metadata only
- Related commands: Don't load unless explicitly referenced
```

### 3. Registry Query Pattern

**Instead of loading full index:**
```typescript
// BAD: Loads entire file
const commands = require('.claude/registry/commands.index.json');
```

**Use targeted queries:**
```typescript
// GOOD: Query specific command metadata only
const commandMeta = queryRegistry('commands', 'command-name');
// Returns: { path, description, usage } (~50 tokens)
```

### 4. Context Budget Enforcement

Add to each command file:

```markdown
## Context Budget
- **Max Context:** 2,000 tokens
- **Warning Threshold:** 1,500 tokens
- **Auto-Compress:** Enabled at 1,800 tokens
```

### 5. Lazy Loading Checklist

When executing a command, only load:

- [x] The command file itself
- [x] Minimal CLAUDE.md (not CLAUDE.full.md)
- [ ] Registry metadata (query, don't load full file)
- [ ] Agent definitions (load on-demand via Obsidian MCP)
- [ ] Related commands (only if explicitly needed)
- [ ] Full documentation (load from Obsidian when needed)

## Implementation Steps

### Step 1: Update Command Template

Create `.claude/commands/.template.md`:

```markdown
# {{command-name}}

**Usage:** `/{{command-name}} [args]`
**Context Budget:** 2,000 tokens
**Category:** {{category}}

## Description
{{brief-description}}

## Usage
```bash
/{{command-name}} [args]
```

## Implementation
{{command-logic}}

## External Resources
Load on-demand via:
- Obsidian MCP for agent definitions
- Registry queries for metadata
- Context7 for library docs
```

### Step 2: Add Context Budget Header

Add to all existing commands:

```markdown
---
context_budget: 2000
lazy_load: true
external_docs: true
---
```

### Step 3: Create Command Loader Utility

Create `.claude/tools/command-loader.ts`:

```typescript
/**
 * Lightweight command loader - only loads what's needed
 */
export async function loadCommand(name: string): Promise<CommandDefinition> {
  // 1. Query registry for metadata only (~50 tokens)
  const meta = await queryRegistry('commands', name);
  
  // 2. Load command file only (~200-500 tokens)
  const commandFile = await readFile(meta.path);
  
  // 3. Parse minimal structure
  return {
    name: meta.name,
    description: meta.description,
    usage: meta.usage,
    content: commandFile,
    // Don't load related resources yet
  };
}

/**
 * Load external resource on-demand
 */
export async function loadExternalResource(
  type: 'agent' | 'skill' | 'workflow',
  name: string
): Promise<string> {
  // Use Obsidian MCP instead of loading from repo
  return await mcp__obsidian__get_file_contents(
    `System/Claude-Instructions/${type}-${name}.md`
  );
}
```

### Step 4: Update Command Execution

Commands should:

1. **Start:** Load only command file + minimal CLAUDE.md
2. **On Need:** Load external resources via MCP
3. **On Complete:** Unload external resources, keep summary

## Quick Fixes for Existing Commands

### Fix 1: Remove Full Registry Loading

**Before:**
```markdown
# This command uses all commands in the registry
See `.claude/registry/commands.index.json` for all available commands.
```

**After:**
```markdown
# Query registry for specific command metadata only
Use registry query: `queryRegistry('commands', 'command-name')`
```

### Fix 2: Replace CLAUDE.full.md References

**Before:**
```markdown
See `.claude/CLAUDE.full.md` for full documentation.
```

**After:**
```markdown
See `.claude/CLAUDE.md` for quick reference.
Load full docs from Obsidian: `System/Claude-Instructions/Orchestration-Protocol.md`
```

### Fix 3: Lazy Load Agent Definitions

**Before:**
```markdown
This command uses agents: coder, reviewer, tester
[Full agent definitions loaded here - ~3,000 tokens]
```

**After:**
```markdown
This command uses agents: coder, reviewer, tester
[Load on-demand via Obsidian MCP when needed]
```

## Monitoring

Track command context usage:

```bash
# Check command context usage
/claude/commands/context-optimize status

# See which commands use most context
/claude/commands/context-optimize report --commands
```

## Success Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Command Context** | ~11,200 tokens | ~1,700 tokens | **85% reduction** |
| **Registry Loading** | Full file | Query only | **95% reduction** |
| **Documentation** | Full docs | On-demand | **90% reduction** |
| **Agent Definitions** | All loaded | Lazy load | **80% reduction** |

## Migration Checklist

- [ ] Update all command files with context budget headers
- [ ] Replace full registry loading with queries
- [ ] Replace CLAUDE.full.md with CLAUDE.md + Obsidian
- [ ] Convert agent definitions to lazy loading
- [ ] Add context monitoring to command execution
- [ ] Create command loader utility
- [ ] Update command template
- [ ] Document lazy loading patterns

## Example: Optimized Command

See `.claude/commands/context-optimize.md` for a fully optimized example.

