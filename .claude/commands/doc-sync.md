# Documentation Sync Command

Automatically sync documentation files to the Obsidian research vault.

## Command Metadata

\`\`\`yaml
command: doc-sync
description: Scan for new/updated documentation and sync to Obsidian vault
category: documentation
priority: high
auto_trigger: post-task, session-end
\`\`\`

## Usage

\`\`\`bash
# Manual execution
/doc-sync

# With specific file
/doc-sync --file docs/architecture.md

# Dry run (no actual sync)
/doc-sync --dry-run

# Force sync (ignore hash check)
/doc-sync --force
\`\`\`

## Workflow

1. **Scan** - Find all documentation files matching patterns
2. **Hash Check** - Compare content hash with last sync
3. **Classify** - Determine document type and target Obsidian path
4. **Sync** - Upload to Obsidian vault via MCP
5. **Log** - Record activity in documentation_log table

## Configuration

Sync patterns defined in `.claude/orchestration/config.json`:

\`\`\`json
{
  "documentation": {
    "syncPatterns": [
      "**/*.md",
      "**/README.md",
      "docs/**/*",
      ".claude/docs/**/*"
    ],
    "excludePatterns": [
      "node_modules/**",
      ".git/**"
    ]
  }
}
\`\`\`

## Examples

### Sync All Documentation

\`\`\`bash
/doc-sync
\`\`\`

Output:
\`\`\`
Scanning for documentation files...
Found 15 markdown files

Checking for changes...
├─ docs/architecture/system-design.md - CHANGED
├─ README.md - CHANGED
├─ docs/api/endpoints.md - UNCHANGED (skipped)
└─ .claude/ARCHITECTURE_REFACTOR.md - CHANGED

Syncing 3 files to Obsidian...
✓ Synced: docs/architecture/system-design.md → Repositories/Alpha-1.4/Architecture/
✓ Synced: README.md → Repositories/Alpha-1.4/
✓ Synced: .claude/ARCHITECTURE_REFACTOR.md → Repositories/Alpha-1.4/Architecture/

Summary:
- Total files scanned: 15
- Files synced: 3
- Files skipped: 12
- Sync time: 1.2s
\`\`\`

### Sync Specific File

\`\`\`bash
/doc-sync --file docs/setup-guide.md
\`\`\`

### Dry Run

\`\`\`bash
/doc-sync --dry-run
\`\`\`

Output shows what would be synced without actually syncing.

## Document Type Detection

The system automatically detects document types:

| Pattern | Type | Obsidian Path |
|---------|------|---------------|
| `**/README.md` | readme | `Repositories/{org}/{repo}/` |
| `**/decisions/*.md` | adr | `Repositories/{org}/{repo}/Decisions/` |
| `**/ARCHITECTURE*.md` | architecture | `Repositories/{org}/{repo}/` |
| `docs/**/*.md` | guide | `Repositories/{org}/{repo}/Guides/` |
| `research/**/*.md` | research | `Research/` |
| `**/*API*.md` | api | `Repositories/{org}/{repo}/API/` |

## Integration Points

### Obsidian MCP

Uses the Obsidian MCP server (if configured):

\`\`\`json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp-server"],
      "env": {
        "OBSIDIAN_API_URL": "http://localhost:27123",
        "OBSIDIAN_VAULT_PATH": "C:\\Users\\MarkusAhling\\obsidian"
      }
    }
  }
}
\`\`\`

### Fallback: REST API

If MCP is unavailable, falls back to REST API:

\`\`\`bash
curl -X PUT "http://localhost:27123/vault/{path}" \
  -H "Content-Type: text/markdown" \
  --data-binary @{file}
\`\`\`

## Database Logging

Each sync operation is logged to `documentation_log`:

\`\`\`sql
INSERT INTO documentation_log (
  agent_id, task_id, session_id,
  doc_type, doc_path, obsidian_path,
  action, vault_synced, sync_status,
  content_hash, lines_added, lines_removed
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
\`\`\`

## Error Handling

### Obsidian Not Running

\`\`\`
✗ Error: Cannot connect to Obsidian MCP at http://localhost:27123
ℹ Ensure Obsidian is running with Local REST API plugin enabled

Queued 3 files for later sync:
- docs/architecture/system-design.md
- README.md
- .claude/ARCHITECTURE_REFACTOR.md

Run /doc-sync again when Obsidian is available.
\`\`\`

### Sync Failures

Failed syncs are retried automatically (max 3 retries) and logged in `obsidian_sync_queue`.

## Performance

- **Incremental**: Only syncs changed files (SHA256 hash comparison)
- **Batch**: Multiple files synced in parallel (max 5 concurrent)
- **Async**: Sync operations run in background (non-blocking)

## See Also

- [doc-log.md](.claude/commands/doc-log.md) - Manual documentation logging
- [doc-audit.md](.claude/commands/doc-audit.md) - Documentation audit reports
- [DOCUMENTATION_LOGGING_ARCHITECTURE.md](.claude/orchestration/DOCUMENTATION_LOGGING_ARCHITECTURE.md) - Full architecture
