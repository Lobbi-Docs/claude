---
name: jira:confluence
description: Read, write, sync, create, or link Confluence pages to Jira issues
arguments:
  - name: issue_key
    description: Jira issue key (e.g., PROJ-123)
    required: true
  - name: action
    description: Action (read|write|sync|create|link)
    default: read
  - name: page_type
    description: Page type (tdd|api|adr|runbook|release-notes)
    required: false
  - name: space_key
    description: Confluence space key (optional)
    required: false
version: 1.0.0
---

# Jira-Confluence Integration

**Actions:** Read | Write | Sync | Create | Link

## Quick Reference

| Action | Purpose | Output |
|--------|---------|--------|
| **read** | Fetch linked pages | Display summary |
| **write** | Update existing pages | Updated page URLs |
| **sync** | Bi-directional sync | Sync report |
| **create** | New page from template | Page URL + Jira link |
| **link** | Find & link pages | Links created |

## Workflow

1. **Validate** issue key format & fetch from Jira
2. **Determine** Confluence space (use ${space_key} or project key)
3. **Execute** action (read/write/sync/create/link)
4. **Comment** on Jira with results
5. **Create/Update** bi-directional links

## Action: READ

**Find linked Confluence pages and display content**

- Search by remote links (direct URLs)
- Search by issue key in page text
- Search by issue title keywords
- Extract metadata, content, relationships
- Post summary to Jira

## Action: WRITE

**Update existing pages with progress**

- Collect info: Jira status, commits, test results
- Update sections: Status, Progress, Implementation, Testing
- Preserve other sections
- Update via API with version tracking
- Link back to Jira

## Action: SYNC

**Bi-directional synchronization**

- Jira → Confluence: Status, assignee, acceptance criteria
- Confluence → Jira: Requirements, blockers, dependencies
- Detect conflicts (status mismatch, assignee, dates)
- Resolve conflicts (newer wins, Jira authoritative for status)
- Generate sync report with changes

## Action: CREATE

**Create new page from template**

**Page Types:**
- **tdd** - Test-Driven Development specification
- **api** - API documentation
- **adr** - Architecture Decision Record
- **runbook** - Operational runbook
- **release-notes** - Release notes

**Process:**
1. Validate page_type
2. Select template (pre-built HTML)
3. Populate with Jira data
4. Create via Confluence API
5. Add labels (issue_key, type, page_type)
6. Link to Jira (remote + macro)

## Action: LINK

**Search & link existing pages**

**Search Strategies:**
1. Issue key in page text
2. Issue title keywords
3. Component/label match
4. Parent issue (if subtask)
5. Browse related areas

**Scoring (0-100):**
- Issue key mentioned: +50
- Title similarity: +30
- Common labels: +10
- Same component: +10
- Recent update: +5
- Same creator: +5

**Process:**
1. Search candidates
2. Rank by score
3. Display top 10
4. User selects pages
5. Create remote links
6. Add reference section on page

---

## Error Handling

| Error | Response |
|-------|----------|
| Invalid issue key | "Invalid format: expected ABC-123" |
| Issue not found | "Issue not found. Verify key and retry." |
| Space not found | "Space not found. List available spaces or use different space_key" |
| No pages found | "No pages linked. Use create or link action." |
| Permission denied | "Access denied. Check space permissions." |
| Sync conflict | Show both versions, prompt for resolution |

## Commands

```bash
/jira:confluence PROJ-123 read              # Fetch linked pages
/jira:confluence PROJ-123 write             # Update with progress
/jira:confluence PROJ-123 sync              # Bi-directional sync
/jira:confluence PROJ-123 create tdd        # TDD spec page
/jira:confluence PROJ-123 create api        # API docs page
/jira:confluence PROJ-123 create adr        # Architecture Decision
/jira:confluence PROJ-123 create runbook    # Operations guide
/jira:confluence PROJ-123 link              # Find & link pages
```

## Page Templates Available

- **TDD**: Acceptance criteria, test strategy, implementation plan
- **API**: Endpoints, auth, request/response examples
- **ADR**: Decision drivers, options, consequences, implementation
- **Runbook**: Quick reference, procedures, troubleshooting
- **Release Notes**: New features, improvements, breaking changes

## Key Features

- Bi-directional links for full traceability
- Automatic status/assignee sync
- Confluence Storage Format (HTML) support
- Conflict detection and resolution
- Comprehensive templates (5 types)
- Label-based organization
- Inherited space permissions

---

**⚓ Golden Armada** | *The Fleet Stands Ready*
