# Documentation Logging Command

Manually log documentation creation or updates to the tracking system.

## Command Metadata

\`\`\`yaml
command: doc-log
description: Manually log documentation activity to orchestration database
category: documentation
priority: medium
\`\`\`

## Usage

\`\`\`bash
# Log documentation creation
/doc-log --file docs/setup.md --action created --summary "Initial setup guide"

# Log documentation update
/doc-log --file README.md --action updated --summary "Added installation instructions"

# Auto-sync to Obsidian
/doc-log --file docs/api.md --action created --sync

# Specify document type
/doc-log --file custom-doc.md --type guide --action created
\`\`\`

## Parameters

| Parameter | Required | Description | Default |
|-----------|----------|-------------|---------|
| `--file` | Yes | Path to documentation file | - |
| `--action` | Yes | Action: created, updated, deleted | - |
| `--type` | No | Document type (readme, adr, guide, etc.) | Auto-detected |
| `--summary` | No | Brief summary of changes | - |
| `--sync` | No | Auto-sync to Obsidian vault | false |
| `--agent-id` | No | Agent ID (auto-detected if not provided) | Current agent |
| `--task-id` | No | Task ID (auto-detected if not provided) | Current task |

## Document Types

Supported documentation types:

- `readme` - README files
- `adr` - Architecture Decision Records
- `guide` - User/developer guides
- `reference` - Reference documentation
- `research` - Research notes
- `api` - API documentation
- `architecture` - Architecture documentation
- `quickstart` - Quick start guides
- `integration` - Integration guides

## Examples

### Log New Documentation

\`\`\`bash
/doc-log \
  --file docs/deployment/k8s-setup.md \
  --action created \
  --type guide \
  --summary "Kubernetes deployment guide for production" \
  --sync
\`\`\`

Output:
\`\`\`
✓ Documentation logged successfully

File: docs/deployment/k8s-setup.md
Type: guide
Action: created
Summary: Kubernetes deployment guide for production
Lines: 156
Words: 1,234

Syncing to Obsidian...
✓ Synced to: Repositories/Alpha-1.4/Guides/k8s-setup.md

Database entry ID: 42
\`\`\`

### Log Documentation Update

\`\`\`bash
/doc-log \
  --file README.md \
  --action updated \
  --summary "Added troubleshooting section"
\`\`\`

Output:
\`\`\`
✓ Documentation logged successfully

File: README.md
Type: readme (auto-detected)
Action: updated
Summary: Added troubleshooting section
Changes: +25 lines, -3 lines

Database entry ID: 43
\`\`\`

### Bulk Logging

Log multiple files at once:

\`\`\`bash
/doc-log \
  --files "docs/**/*.md" \
  --action created \
  --summary "Initial documentation set" \
  --sync
\`\`\`

## Database Schema

Logs are stored in the `documentation_log` table:

\`\`\`sql
CREATE TABLE documentation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    agent_id TEXT NOT NULL,
    task_id TEXT,
    doc_type TEXT NOT NULL,
    doc_path TEXT NOT NULL,
    obsidian_path TEXT,
    action TEXT NOT NULL,
    category TEXT,
    title TEXT,
    summary TEXT,
    vault_synced BOOLEAN DEFAULT 0,
    sync_timestamp TIMESTAMP,
    content_hash TEXT,
    lines_added INTEGER,
    lines_removed INTEGER,
    word_count INTEGER,
    metadata TEXT
);
\`\`\`

## Auto-Detection Features

### Document Type Detection

The system automatically detects document type based on:

1. **File path patterns**
   \`\`\`
   README.md → readme
   docs/decisions/ADR-0001.md → adr
   docs/architecture/system.md → architecture
   \`\`\`

2. **File content analysis**
   - YAML frontmatter `type:` field
   - First H1 heading content
   - File name patterns

### Content Analysis

Automatically extracts:

- **Title** - From frontmatter or first H1
- **Word count** - Total words in document
- **Lines changed** - Diff against previous version (if exists)
- **Content hash** - SHA256 for change detection
- **Tags** - From frontmatter

### Obsidian Path Mapping

Auto-maps to Obsidian vault structure:

\`\`\`
README.md
→ C:\Users\MarkusAhling\obsidian\Repositories\Alpha-1.4\README.md

docs/architecture/system-design.md
→ C:\Users\MarkusAhling\obsidian\Repositories\Alpha-1.4\Architecture\system-design.md

research/ai-agents.md
→ C:\Users\MarkusAhling\obsidian\Research\AI\ai-agents.md
\`\`\`

## Integration with Activity Log

Documentation logging also creates an entry in `activity_log`:

\`\`\`sql
INSERT INTO activity_log (
  session_id, agent_id, task_id,
  action, category, level, message, details
) VALUES (
  ?, ?, ?,
  'doc_logged', 'documentation', 'INFO',
  'Logged documentation: {title}',
  json_object('doc_type', ?, 'doc_path', ?, 'action', ?)
);
\`\`\`

## Querying Documentation Logs

### Recent Documentation Activity

\`\`\`bash
# View recent documentation activity
sqlite3 .claude/orchestration/db/agents.db \
  "SELECT * FROM v_recent_doc_activity LIMIT 10"
\`\`\`

### Agent Documentation Stats

\`\`\`bash
# View statistics for specific agent
sqlite3 .claude/orchestration/db/agents.db \
  "SELECT * FROM v_agent_doc_stats WHERE agent_name = 'docs-writer'"
\`\`\`

### Session Documentation Summary

\`\`\`bash
# View documentation summary for current session
sqlite3 .claude/orchestration/db/agents.db \
  "SELECT * FROM v_session_doc_summary WHERE session_id = '...'"
\`\`\`

## Error Handling

### File Not Found

\`\`\`
✗ Error: File not found: docs/nonexistent.md
ℹ Ensure the file path is correct and relative to repository root
\`\`\`

### Invalid Action

\`\`\`
✗ Error: Invalid action: 'modified'
ℹ Valid actions: created, updated, deleted
\`\`\`

### Database Connection Failed

\`\`\`
✗ Error: Cannot connect to orchestration database
ℹ Run: .claude/orchestration/cli.sh init
\`\`\`

## Best Practices

1. **Always include summary** - Brief description helps track changes
2. **Use auto-sync for important docs** - Ensures Obsidian vault is up-to-date
3. **Leverage auto-detection** - Let the system detect type and metadata
4. **Log immediately after creation** - Don't batch log documentation
5. **Use consistent naming** - Follow project conventions for file names

## See Also

- [doc-sync.md](.claude/commands/doc-sync.md) - Automated documentation sync
- [doc-audit.md](.claude/commands/doc-audit.md) - Documentation audit reports
- [DOCUMENTATION_LOGGING_ARCHITECTURE.md](.claude/orchestration/DOCUMENTATION_LOGGING_ARCHITECTURE.md) - Full architecture
