# Documentation and Activity Logging Architecture

## Overview

This architecture extends the Golden Armada orchestration system to provide comprehensive documentation logging and activity tracking for all agents, with automatic synchronization to the Obsidian research vault.

## Design Principles

1. **Automated Logging** - All agent activities automatically logged to database and Obsidian vault
2. **Zero Manual Effort** - Hooks trigger documentation sync without agent intervention
3. **Audit Trail** - Complete history of who documented what, when, and why
4. **Integration** - Seamlessly integrates with existing orchestration infrastructure
5. **Scalability** - Supports parallel agent operations with proper locking

## System Components

### 1. Database Extensions

#### Documentation Log Table
Tracks all documentation-related activities by agents.

\`\`\`sql
CREATE TABLE IF NOT EXISTS documentation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    agent_id TEXT NOT NULL,
    task_id TEXT,
    doc_type TEXT NOT NULL,  -- readme, adr, guide, reference, research, api, architecture
    doc_path TEXT NOT NULL,  -- Path to documentation file
    obsidian_path TEXT,      -- Path in Obsidian vault (if synced)
    action TEXT NOT NULL,    -- created, updated, synced, deleted
    category TEXT,           -- repo_doc, research, decision, technical, guide
    title TEXT,              -- Document title
    summary TEXT,            -- Brief summary of changes
    vault_synced BOOLEAN DEFAULT 0,
    sync_timestamp TIMESTAMP,
    content_hash TEXT,       -- SHA256 hash for change detection
    lines_added INTEGER,
    lines_removed INTEGER,
    metadata TEXT,           -- JSON: { tags, related_docs, priority }
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_doc_log_agent ON documentation_log(agent_id);
CREATE INDEX idx_doc_log_session ON documentation_log(session_id);
CREATE INDEX idx_doc_log_type ON documentation_log(doc_type);
CREATE INDEX idx_doc_log_synced ON documentation_log(vault_synced);
CREATE INDEX idx_doc_log_timestamp ON documentation_log(timestamp DESC);
\`\`\`

#### Agent Documentation Stats View
Quick view of each agent's documentation contributions.

\`\`\`sql
CREATE VIEW IF NOT EXISTS v_agent_doc_stats AS
SELECT
    a.id as agent_id,
    a.name as agent_name,
    a.type as agent_type,
    COUNT(dl.id) as total_docs,
    SUM(CASE WHEN dl.action = 'created' THEN 1 ELSE 0 END) as docs_created,
    SUM(CASE WHEN dl.action = 'updated' THEN 1 ELSE 0 END) as docs_updated,
    SUM(CASE WHEN dl.vault_synced = 1 THEN 1 ELSE 0 END) as docs_synced,
    SUM(dl.lines_added) as total_lines_added,
    MAX(dl.timestamp) as last_doc_update
FROM agents a
LEFT JOIN documentation_log dl ON a.id = dl.agent_id
GROUP BY a.id;
\`\`\`

### 2. Commands

#### `/doc-sync` - Sync Documentation to Obsidian
Scans for new/updated documentation and syncs to Obsidian vault.

**Location:** `.claude/commands/doc-sync.md`

**Triggers:**
- Manual execution
- Post-task hook (automatic)
- Session-end hook (automatic)

**Workflow:**
1. Scan for documentation files (*.md in docs/, README.md, etc.)
2. Check content hash against last sync
3. For each changed file:
   - Determine Obsidian vault target path
   - Use MCP to sync to Obsidian vault
   - Log to documentation_log table
   - Update activity_log

#### `/doc-log` - Manual Documentation Logging
Allows agents to manually log documentation creation/updates.

**Parameters:**
- `--file` - Path to documentation file
- `--type` - Documentation type (readme, adr, guide, etc.)
- `--summary` - Brief summary of changes
- `--sync` - Auto-sync to Obsidian (default: true)

#### `/doc-audit` - Documentation Audit Report
Generates comprehensive report of documentation coverage and quality.

**Outputs:**
- Documentation coverage by agent
- Unsynced documentation files
- Recently updated docs
- Documentation gaps (missing READMEs, ADRs, etc.)

### 3. Hooks

#### Enhanced `post-edit.sh`
Automatically logs documentation when files are edited.

**Logic:**
\`\`\`bash
# Check if edited file is documentation
if [[ "$file_path" =~ \.(md|mdx|markdown)$ ]] || [[ "$file_path" =~ README ]]; then
    # Determine doc type
    doc_type=$(determine_doc_type "$file_path")

    # Log to database
    log_documentation \
        --file "$file_path" \
        --type "$doc_type" \
        --action "updated" \
        --agent-id "$CLAUDE_AGENT_ID"

    # Queue for Obsidian sync
    queue_obsidian_sync "$file_path"
fi
\`\`\`

#### Enhanced `post-task.sh`
Logs documentation activity summary at task completion.

**New Section:**
\`\`\`bash
# Documentation Summary
doc_count=$(count_docs_by_task "$CLAUDE_TASK_ID")
if [ "$doc_count" -gt 0 ]; then
    log_activity \
        action="task_documentation" \
        message="Created/updated $doc_count documentation files" \
        category="documentation" \
        task_id="$CLAUDE_TASK_ID"
fi

# Trigger documentation sync
if [ "$AUTO_SYNC_DOCS" = "true" ]; then
    .claude/commands/doc-sync.md
fi
\`\`\`

#### New `session-end.sh`
Comprehensive documentation summary at session end.

**Functionality:**
- List all documentation created/updated in session
- Sync status report (synced vs unsynced)
- Documentation coverage metrics
- Export session documentation report to Obsidian

### 4. Utilities

#### `doc-logger.sh` - Documentation Logging Utility
Core utility for logging documentation activities.

**Functions:**
- `log_documentation()` - Log doc activity to database
- `determine_doc_type()` - Auto-detect documentation type
- `calculate_changes()` - Calculate lines added/removed
- `queue_obsidian_sync()` - Queue file for Obsidian sync
- `sync_to_obsidian()` - Execute Obsidian MCP sync

#### `activity-tracker.py` - Enhanced Activity Tracker
Python utility for structured activity logging.

**Features:**
- High-level API for agents to log activities
- Auto-enrichment with session/task context
- Batch logging for efficiency
- Integration with documentation_log

## Integration Flow

### Scenario 1: Agent Creates Documentation

\`\`\`
┌─────────────┐
│ Agent       │
│ creates     │
│ README.md   │
└──────┬──────┘
       │
       ▼
┌────────────────┐
│ post-edit hook │ ◄─── Triggered automatically
│ detects .md    │
└────────┬───────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│ Log to           │  │ Queue for        │
│ documentation_log│  │ Obsidian sync    │
└──────────────────┘  └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ doc-sync command │
                      │ processes queue  │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ Obsidian MCP     │
                      │ syncs to vault   │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ Update           │
                      │ vault_synced=1   │
                      └──────────────────┘
\`\`\`

### Scenario 2: Manual Documentation Audit

\`\`\`
User runs: /doc-audit

┌──────────────────┐
│ doc-audit command│
└────────┬─────────┘
         │
         ├──────────────┬──────────────┬─────────────┐
         │              │              │             │
         ▼              ▼              ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
│ Query        │ │ Calculate│ │ Find     │ │ Generate  │
│ doc_log      │ │ coverage │ │ unsynced │ │ report    │
└──────┬───────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
       │              │            │             │
       └──────────────┴────────────┴─────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ Display report   │
            │ + Save to        │
            │ Obsidian vault   │
            └──────────────────┘
\`\`\`

## Configuration

### `.claude/orchestration/config.json` Extensions

\`\`\`json
{
  "documentation": {
    "enabled": true,
    "autoSync": true,
    "logDirectory": ".claude/orchestration/logs/documentation",
    "obsidianVault": "C:\\Users\\MarkusAhling\\obsidian",
    "syncPatterns": [
      "**/*.md",
      "**/README.md",
      "docs/**/*",
      ".claude/docs/**/*"
    ],
    "excludePatterns": [
      "node_modules/**",
      ".git/**",
      "**/.DS_Store"
    ],
    "docTypes": {
      "readme": {
        "patterns": ["**/README.md", "**/readme.md"],
        "obsidianPath": "Repositories/{org}/{repo}/"
      },
      "adr": {
        "patterns": ["**/decisions/*.md", "**/ADR-*.md"],
        "obsidianPath": "Repositories/{org}/{repo}/Decisions/"
      },
      "architecture": {
        "patterns": ["**/ARCHITECTURE.md", "**/architecture/*.md"],
        "obsidianPath": "Repositories/{org}/{repo}/"
      },
      "guide": {
        "patterns": ["docs/**/*.md", "**/guides/*.md"],
        "obsidianPath": "Repositories/{org}/{repo}/Guides/"
      },
      "research": {
        "patterns": ["research/**/*.md"],
        "obsidianPath": "Research/"
      }
    },
    "mcpIntegration": {
      "enabled": true,
      "apiUrl": "http://localhost:27123",
      "timeout": 30000
    }
  }
}
\`\`\`

## API

### Python API (activity-tracker.py)

\`\`\`python
from claude.orchestration import ActivityTracker, DocumentationLogger

# Initialize
tracker = ActivityTracker()
doc_logger = DocumentationLogger()

# Log documentation creation
doc_logger.log_created(
    file_path="docs/architecture/system-design.md",
    doc_type="architecture",
    summary="Initial system architecture documentation",
    agent_id="architect-001",
    task_id="task-123",
    auto_sync=True
)

# Log documentation update
doc_logger.log_updated(
    file_path="README.md",
    summary="Added installation instructions",
    lines_added=25,
    lines_removed=3
)

# Get agent documentation stats
stats = doc_logger.get_agent_stats(agent_id="coder-001")
print(f"Total docs: {stats['total_docs']}")
print(f"Docs synced: {stats['docs_synced']}")

# Sync to Obsidian
doc_logger.sync_to_obsidian(
    file_path="docs/api/endpoints.md",
    obsidian_path="Repositories/Alpha-1.4/API/"
)
\`\`\`

### Bash API (doc-logger.sh)

\`\`\`bash
#!/bin/bash
source .claude/orchestration/utils/doc-logger.sh

# Log documentation
log_documentation \
    --file "docs/setup.md" \
    --type "guide" \
    --action "created" \
    --summary "Initial setup guide" \
    --agent-id "$CLAUDE_AGENT_ID"

# Sync to Obsidian
sync_to_obsidian \
    --file "README.md" \
    --obsidian-path "Repositories/Alpha-1.4/"

# Get unsynced documents
unsynced_docs=$(get_unsynced_docs)
echo "$unsynced_docs"
\`\`\`

## Metrics and Reporting

### Available Metrics

1. **Documentation Coverage**
   - Total documentation files
   - Documentation per agent
   - Documentation per task
   - Documentation types distribution

2. **Sync Health**
   - Vault sync success rate
   - Unsynced documents count
   - Average sync latency
   - Sync failures (with reasons)

3. **Agent Productivity**
   - Docs created per agent
   - Docs updated per agent
   - Average doc quality score
   - Documentation velocity (docs/day)

4. **Audit Compliance**
   - Missing READMEs
   - Missing ADRs for decisions
   - Outdated documentation
   - Documentation debt score

### Report Formats

- **Console** - Real-time terminal output
- **JSON** - Machine-readable format for automation
- **Markdown** - Saved to Obsidian vault for review
- **HTML** - Web dashboard (future)

## Security and Privacy

1. **Access Control** - Only authorized agents can log documentation
2. **Data Privacy** - No sensitive content in logs (content hashes only)
3. **Audit Trail** - All documentation changes tracked with attribution
4. **Retention Policy** - Old logs archived per retention configuration

## Performance Considerations

1. **Async Sync** - Obsidian sync happens asynchronously to avoid blocking
2. **Batch Operations** - Multiple docs synced in batches
3. **Content Hashing** - Only changed files synced (SHA256 comparison)
4. **Index Optimization** - Database indexes on frequently queried columns
5. **Cleanup** - Automatic cleanup of old sync queue entries

## Future Enhancements

1. **AI-Powered Documentation Quality** - Use Claude to score doc quality
2. **Auto-Documentation** - Generate documentation from code
3. **Documentation Templates** - Auto-populate templates based on type
4. **Multi-Vault Support** - Sync to multiple Obsidian vaults
5. **Bi-directional Sync** - Sync changes from Obsidian back to repo
6. **Documentation Suggestions** - Proactive documentation recommendations

## References

- [Orchestration Database Schema](.claude/orchestration/db/schema.sql)
- [Orchestration Configuration](.claude/orchestration/config.json)
- [Obsidian Integration Guide](C:\Users\MarkusAhling\obsidian\System\Integration.md)
- [Global CLAUDE.md Documentation Requirements](C:\Users\MarkusAhling\.claude\CLAUDE.md)
