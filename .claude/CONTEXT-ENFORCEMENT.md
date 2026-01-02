# Context Enforcement Rules

**CRITICAL:** These rules MUST be followed to prevent context overflow.

## When Executing Slash Commands

### ✅ ALLOWED (Total: ~500-800 tokens)
1. **Command file only** - `.claude/commands/{command-name}.md` (~200-500 tokens)
2. **This file** - `.claude/CLAUDE.md` (~300 tokens)

### ❌ FORBIDDEN (Do NOT load these)
1. **`commands.index.json`** - 1,269 lines, ~2,500 tokens
   - **Action:** Query for metadata only using `grep` or `read_file` with line limits
   - **Example:** `grep -A 5 '"status":' .claude/registry/commands.index.json`

2. **`CLAUDE.full.md`** - 319 lines, ~3,000 tokens
   - **Action:** Use minimal `CLAUDE.md` only
   - **Full docs:** Load from Obsidian when needed

3. **Agent definitions** - Multiple files, ~5,000+ tokens
   - **Action:** Load via Obsidian MCP: `mcp__obsidian__get_file_contents("System/Claude-Instructions/Agent-Categories.md")`

4. **Related command files** - Multiple files, ~2,000+ tokens
   - **Action:** Don't load unless explicitly needed for the current command

5. **Registry index files** - Large JSON files
   - **Action:** Query specific entries only, don't load full files

## Enforcement Pattern

```typescript
// ❌ BAD: Loading full registry
const commands = require('.claude/registry/commands.index.json');

// ✅ GOOD: Query specific command metadata
const meta = await queryRegistry('commands', 'command-name');
// Returns: { path, description, usage } (~50 tokens)
```

## Context Budget Per Command

| Component | Max Tokens | Action |
|-----------|------------|--------|
| Command file | 500 | Load only |
| CLAUDE.md | 300 | Load only |
| Registry query | 50 | Query, don't load |
| External docs | 0 | Load via MCP when needed |
| **Total** | **850** | **Strict limit** |

## Verification Checklist

Before executing any command, verify:
- [ ] Only command file is loaded
- [ ] `commands.index.json` is NOT loaded (query only)
- [ ] `CLAUDE.full.md` is NOT loaded
- [ ] Agent definitions are NOT loaded
- [ ] Related commands are NOT loaded
- [ ] Total context < 1,000 tokens

## Emergency Context Reduction

If context exceeds 1,000 tokens:
1. **Stop** loading additional files
2. **Unload** any non-essential context
3. **Use** Obsidian MCP for external resources
4. **Query** registries instead of loading full files

