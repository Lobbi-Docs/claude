---
name: jira:qa-review
description: Review QA tickets - improve content, create docs, respond to comments
arguments:
  - name: ticket
    description: Optional ticket key (e.g., LF-27). Omit for all QA tickets.
    required: false
  - name: mode
    description: Review mode (full|review-only|docs-only|comments-only)
    default: full
  - name: dry-run
    description: Preview changes without applying
    default: false
version: 1.0.0
---

# QA Review Workflow

Review JIRA tickets in QA status, improve descriptions, create Confluence docs, respond to comments.

**Auto time logging:** Duration >= 60s auto-posts worklog

## Workflow Overview
```
DISCOVER QA Tickets → REVIEW Content → DOCUMENT Confluence → RESPOND Comments
```

## Execution Steps

### 1. Environment & Discovery
- Connect to Atlassian (cloudId, site)
- JQL search: `status in ("QA", "In QA", "Ready for QA", "Awaiting QA", "Testing", "In Testing")`
- Or fetch specific ticket if provided
- Max 50 tickets per session

### 2. Review Content (Agent: qa-ticket-reviewer | Model: sonnet)
For each ticket:
- Score quality (1-5 before/after)
- Improve clarity, completeness, conciseness
- Condense verbose descriptions
- Update ticket + add review comment
- Output: quality_before → quality_after, content_reduction%, changes_list

### 3. Create Documentation (Agent: qa-confluence-documenter | Model: sonnet)
For each reviewed ticket:
- Analyze documentation-worthy content
- Find existing docs (search)
- Generate: feature|technical|test doc types
- Create/update Confluence page
- Link to ticket
- Default Space: keycloakal (ID: 1310724)
- Hierarchy: `keycloakal/Features/[Project]/[ISSUE-KEY] - [Title]/`

### 4. Respond to Comments (Agent: qa-comment-responder | Model: haiku)
- Find unresolved comments
- Classify intent: question|feedback|request
- Generate responses
- Post replies
- Escalate complex issues

### 5. Generate Summary Report
- Total tickets reviewed
- Quality improvement stats
- Docs created/updated
- Comments processed
- Links to Confluence space and QA board

## Mode Options

| Mode | Behavior |
|------|----------|
| **full** (default) | Review + docs + comments |
| **review-only** | Content improvement only |
| **docs-only** | Documentation creation only |
| **comments-only** | Comment responses only |

## Dry Run Mode (`--dry-run true`)
Shows what WOULD happen without applying:
- Improvements generated but not applied
- Docs drafted but not created
- Comments composed but not posted
- Full preview report generated

## Usage Examples
```bash
/qa-review                           # All QA tickets, full review
/qa-review --ticket LF-27            # Single ticket
/qa-review --mode review-only        # Content only
/qa-review --mode docs-only          # Docs only
/qa-review --mode comments-only      # Comments only
/qa-review --ticket LF-27 --dry-run true  # Preview
```

## Error Handling

| Error | Action |
|-------|--------|
| Partial failures | Continue, log failures in summary |
| API rate limit | Exponential backoff, pause between ops |
| Permission error | Skip ticket, log, continue |
| No tickets found | Check JQL syntax, Jira access, status names |
| Doc creation fails | Verify space access, check for duplicates |

## Success Criteria
- All QA tickets discovered
- Content improved for all
- Docs created/updated
- Comments addressed
- Review comments added
- Comprehensive summary
- No data loss

## Integration
```
/jira-orchestrator:work LF-27
  → Development → PR Created → QA Transition
  → /qa-review LF-27
```

Daily: `/qa-review --mode full`
Quick: `/qa-review --mode comments-only`

## Related Commands
- `/jira-orchestrator:work` - Full dev workflow
- `/jira-orchestrator:sync` - Sync progress
- `/jira-orchestrator:pr` - Create PR
- `/jira-orchestrator:docs` - Sync to Confluence

**⚓ Golden Armada** | *The Fleet Stands Ready*
