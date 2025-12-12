# Documentation Audit Command

Generate comprehensive reports on documentation coverage, quality, and sync status.

## Command Metadata

\`\`\`yaml
command: doc-audit
description: Audit documentation coverage and generate quality reports
category: documentation
priority: medium
auto_trigger: session-end (summary only)
\`\`\`

## Usage

\`\`\`bash
# Full audit report
/doc-audit

# Audit specific agent
/doc-audit --agent coder-001

# Audit current session
/doc-audit --session current

# Export to Obsidian
/doc-audit --export obsidian

# Focus on specific aspects
/doc-audit --check coverage
/doc-audit --check sync-status
/doc-audit --check quality
/doc-audit --check gaps
\`\`\`

## Report Sections

### 1. Documentation Coverage

\`\`\`
📊 DOCUMENTATION COVERAGE
═══════════════════════════════════════

Repository: Alpha-1.4
Total Files: 847
Documented Files: 356

Coverage: 42.0% ████████░░░░░░░░░░ (Target: 70%)

By Document Type:
├─ READMEs:      15/20  (75.0%) ████████████████░░░░
├─ Architecture: 8/10   (80.0%) ██████████████████░░
├─ API Docs:     12/25  (48.0%) ███████░░░░░░░░░░░░░
├─ Guides:       45/60  (75.0%) ████████████████░░░░
├─ ADRs:         23/30  (76.7%) ████████████████░░░░
└─ Quick Starts: 5/15   (33.3%) ██████░░░░░░░░░░░░░░

Missing Documentation:
⚠ No README in: lib/utils/
⚠ No Architecture doc for: payments module
⚠ No API docs for: /api/webhooks
⚠ No setup guide
\`\`\`

### 2. Sync Status

\`\`\`
🔄 OBSIDIAN SYNC STATUS
═══════════════════════════════════════

Total Documents: 356
Synced: 342 (96.1%)
Unsynced: 14 (3.9%)
Failed: 0

Unsynced Documents:
├─ docs/deployment/azure.md (pending)
├─ docs/api/webhooks.md (pending)
├─ research/agents/coordinator.md (pending)
└─ ... (11 more)

Last Sync: 2025-01-29 14:32:15
Next Scheduled Sync: 2025-01-29 15:00:00

Sync Queue:
- Pending: 14
- Processing: 0
- Failed: 0
\`\`\`

### 3. Quality Metrics

\`\`\`
⭐ DOCUMENTATION QUALITY
═══════════════════════════════════════

Average Word Count: 847 words/doc
Average Quality Score: 78/100

Quality Distribution:
├─ Excellent (90-100): 45 docs (12.6%)
├─ Good      (70-89):  201 docs (56.5%)
├─ Fair      (50-69):  89 docs (25.0%)
└─ Poor      (0-49):   21 docs (5.9%)

Issues Detected:
⚠ 21 docs below quality threshold (50/100)
⚠ 12 docs with broken links
⚠ 8 docs with missing metadata
⚠ 5 docs haven't been updated in 6+ months

Top Quality Docs:
✓ docs/architecture/system-design.md (98/100)
✓ docs/api/authentication.md (96/100)
✓ docs/guides/quick-start.md (94/100)
\`\`\`

### 4. Agent Contributions

\`\`\`
👥 AGENT DOCUMENTATION CONTRIBUTIONS
═══════════════════════════════════════

docs-writer:
├─ Total Documents: 125
├─ Created: 85
├─ Updated: 40
├─ Lines Added: 15,432
└─ Last Activity: 2 hours ago

coder:
├─ Total Documents: 78
├─ Created: 45
├─ Updated: 33
├─ Lines Added: 8,921
└─ Last Activity: 5 minutes ago

architect:
├─ Total Documents: 56
├─ Created: 48
├─ Updated: 8
├─ Lines Added: 12,109
└─ Last Activity: 1 day ago
\`\`\`

### 5. Documentation Gaps

\`\`\`
🔍 DOCUMENTATION GAPS
═══════════════════════════════════════

Critical Gaps (P1):
⚠ Missing: Setup guide for production deployment
⚠ Missing: Troubleshooting guide
⚠ Missing: Security documentation
⚠ Missing: Performance tuning guide

Important Gaps (P2):
⚠ Incomplete: API reference (45% complete)
⚠ Incomplete: Architecture diagrams
⚠ Outdated: Database schema docs (last updated 3 months ago)

Nice-to-Have (P3):
⚠ Missing: Code examples for common tasks
⚠ Missing: Video tutorials
⚠ Missing: FAQ section
\`\`\`

## Output Formats

### Console (Default)

Human-readable terminal output with colors and progress bars.

### JSON

\`\`\`bash
/doc-audit --format json > audit-report.json
\`\`\`

Output:
\`\`\`json
{
  "timestamp": "2025-01-29T14:45:00Z",
  "repository": "Alpha-1.4",
  "coverage": {
    "total_files": 847,
    "documented_files": 356,
    "coverage_percentage": 42.0,
    "by_type": {
      "readme": { "total": 20, "documented": 15, "percentage": 75.0 },
      "architecture": { "total": 10, "documented": 8, "percentage": 80.0 }
    }
  },
  "sync_status": {
    "total": 356,
    "synced": 342,
    "unsynced": 14,
    "failed": 0
  },
  "quality": {
    "average_word_count": 847,
    "average_quality_score": 78,
    "distribution": {
      "excellent": 45,
      "good": 201,
      "fair": 89,
      "poor": 21
    }
  },
  "gaps": [
    {
      "type": "missing",
      "priority": "P1",
      "description": "Setup guide for production deployment"
    }
  ]
}
\`\`\`

### Markdown (Obsidian Export)

\`\`\`bash
/doc-audit --export obsidian
\`\`\`

Creates comprehensive report in Obsidian vault:

\`\`\`
C:\Users\MarkusAhling\obsidian\Repositories\Alpha-1.4\Documentation-Audit-2025-01-29.md
\`\`\`

Report includes:
- Executive summary
- Detailed metrics
- Agent contributions
- Recommendations
- Action items

### HTML Dashboard (Future)

\`\`\`bash
/doc-audit --format html --open
\`\`\`

Generates interactive HTML dashboard with charts.

## Filtering and Scope

### Audit Specific Agent

\`\`\`bash
/doc-audit --agent docs-writer
\`\`\`

Shows documentation activity for a specific agent.

### Audit Current Session

\`\`\`bash
/doc-audit --session current
\`\`\`

Shows documentation created/updated in the current session.

### Audit Date Range

\`\`\`bash
/doc-audit --since "2025-01-01" --until "2025-01-29"
\`\`\`

### Audit Specific Path

\`\`\`bash
/doc-audit --path docs/api/
\`\`\`

Audits only documentation in specified path.

## Quality Scoring

Documentation quality is scored 0-100 based on:

| Factor | Weight | Criteria |
|--------|--------|----------|
| Completeness | 30% | Word count, sections, metadata |
| Freshness | 20% | Last updated date |
| Links | 15% | No broken links |
| Structure | 15% | Proper headings, formatting |
| Metadata | 10% | Frontmatter, tags |
| Examples | 10% | Code examples, diagrams |

### Quality Tiers

- **Excellent (90-100)**: Complete, current, well-structured
- **Good (70-89)**: Mostly complete, minor issues
- **Fair (50-69)**: Missing sections, outdated
- **Poor (0-49)**: Incomplete, broken links, very outdated

## Recommendations Engine

The audit generates actionable recommendations:

\`\`\`
💡 RECOMMENDATIONS
═══════════════════════════════════════

High Priority:
1. Create setup guide for production deployment
   Impact: Critical | Effort: High | Assignee: docs-writer

2. Update database schema documentation
   Impact: High | Effort: Medium | Assignee: database-specialist

3. Fix 12 broken links across documentation
   Impact: Medium | Effort: Low | Assignee: docs-writer

Medium Priority:
4. Complete API reference documentation (45% → 100%)
   Impact: High | Effort: High | Assignee: api-documenter

5. Add code examples to guides
   Impact: Medium | Effort: Medium | Assignee: coder

Quick Wins:
6. Sync 14 pending documents to Obsidian
   Impact: Low | Effort: Low | Action: Run /doc-sync

7. Add metadata to 8 docs missing frontmatter
   Impact: Low | Effort: Low | Assignee: docs-writer
\`\`\`

## Scheduled Audits

Configure automatic audits:

\`\`\`json
{
  "documentation": {
    "audit": {
      "schedule": "daily",
      "time": "09:00",
      "export": true,
      "notify": true
    }
  }
}
\`\`\`

Audit runs automatically and exports to Obsidian.

## Integration

### With Task Planner

Audit generates tasks automatically:

\`\`\`
/doc-audit --create-tasks
\`\`\`

Creates task entries for each documentation gap:

\`\`\`
Task: Create setup guide for production deployment
Priority: P1
Assigned: docs-writer
Estimated Effort: 4 hours
\`\`\`

### With Obsidian Daily Notes

Audit summary automatically added to Obsidian daily note:

\`\`\`markdown
## Documentation Audit

Coverage: 42% (↑2% from yesterday)
Synced: 96.1%
Quality: 78/100

[Full Report](Documentation-Audit-2025-01-29.md)
\`\`\`

## Database Queries

Audit uses these views:

\`\`\`sql
-- Agent documentation stats
SELECT * FROM v_agent_doc_stats;

-- Session documentation summary
SELECT * FROM v_session_doc_summary;

-- Documentation quality metrics
SELECT * FROM v_doc_quality_metrics;

-- Unsynced documents
SELECT * FROM v_unsynced_docs;

-- Documentation type breakdown
SELECT * FROM v_doc_type_breakdown;
\`\`\`

## See Also

- [doc-sync.md](.claude/commands/doc-sync.md) - Automated documentation sync
- [doc-log.md](.claude/commands/doc-log.md) - Manual documentation logging
- [DOCUMENTATION_LOGGING_ARCHITECTURE.md](.claude/orchestration/DOCUMENTATION_LOGGING_ARCHITECTURE.md) - Full architecture
