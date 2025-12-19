---
name: qa-review
description: Review all JIRA tickets in QA status - improve content, create Confluence documentation, and respond to comments
arguments:
  - name: ticket
    description: Optional specific ticket key to review (e.g., LF-27). If omitted, reviews all QA tickets.
    required: false
  - name: mode
    description: Review mode - full (default), review-only, docs-only, comments-only
    required: false
    default: full
  - name: dry-run
    description: Preview changes without applying them (true/false)
    required: false
    default: false
tags:
  - jira
  - qa
  - review
  - documentation
  - confluence
---

# QA Review Workflow

This command orchestrates a comprehensive review of JIRA tickets in QA status, improving content quality, generating Confluence documentation, and managing comment responses.

## Prerequisites

- Atlassian Cloud access configured
- Confluence space available (default: keycloakal)
- Jira project access with edit permissions

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QA REVIEW WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │  DISCOVER   │ -> │   REVIEW    │ -> │  DOCUMENT   │ -> │   RESPOND   │ │
│   │  QA Tickets │    │   Content   │    │ Confluence  │    │  Comments   │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                  │                  │                  │         │
│         v                  v                  v                  v         │
│   Find tickets      Improve/condense    Create/update      Answer queries │
│   in QA status      descriptions        documentation      on tickets     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Execution Steps

### Step 1: Environment Setup

First, establish connection to Atlassian:

```yaml
action: Get Atlassian Resources
tool: mcp__plugin_jira-orchestrator_atlassian__getAccessibleAtlassianResources
expected_output:
  - cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  - site: thelobbi.atlassian.net
```

### Step 2: Discover QA Tickets

Find all tickets in QA-related statuses:

```yaml
action: Search QA Tickets
tool: mcp__plugin_jira-orchestrator_atlassian__searchJiraIssuesUsingJql
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  jql: |
    status in ("QA", "In QA", "Ready for QA", "Awaiting QA", "Testing", "In Testing")
    ORDER BY updated DESC
  fields:
    - summary
    - description
    - status
    - issuetype
    - priority
    - created
    - updated
    - comment
  maxResults: 50
```

**If specific ticket provided:**
```yaml
action: Get Specific Ticket
tool: mcp__plugin_jira-orchestrator_atlassian__getJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${ticket}
  expand: renderedFields,changelog
```

### Step 3: Review and Improve Content (Agent: qa-ticket-reviewer)

For each discovered ticket:

```yaml
agent: qa-ticket-reviewer
model: sonnet
tasks:
  - Analyze content quality (clarity, completeness, conciseness)
  - Score current quality (1-5 scale)
  - Generate improved description with proper structure
  - Condense verbose content while preserving meaning
  - Update ticket with improvements
  - Add review summary comment
output:
  quality_before: [score]
  quality_after: [score]
  content_reduction: [percentage]
  changes_made: [list]
```

### Step 4: Create Confluence Documentation (Agent: qa-confluence-documenter)

For each reviewed ticket:

```yaml
agent: qa-confluence-documenter
model: sonnet
tasks:
  - Analyze ticket for documentation-worthy content
  - Search for existing documentation
  - Generate appropriate documentation type (feature/technical/test)
  - Create or update Confluence page
  - Link documentation to ticket
output:
  page_id: [id]
  page_url: [url]
  doc_type: [type]
  action: [created|updated|skipped]
```

**Default Confluence Space:**
- Space Key: keycloakal
- Space ID: 1310724

### Step 5: Respond to Comments (Agent: qa-comment-responder)

Process any pending comments:

```yaml
agent: qa-comment-responder
model: haiku
tasks:
  - Find comments requiring response
  - Classify comment intent (question, feedback, etc.)
  - Generate appropriate responses
  - Post responses to tickets
  - Escalate complex issues if needed
output:
  comments_processed: [count]
  responses_posted: [count]
  escalations: [count]
```

### Step 6: Generate Summary Report

Compile results into comprehensive report:

```markdown
## QA Review Session Summary

**Date:** [timestamp]
**Mode:** [full|review-only|docs-only|comments-only]
**Dry Run:** [true|false]

### Tickets Reviewed

| Ticket | Title | Quality Before | Quality After | Docs Created |
|--------|-------|----------------|---------------|--------------|
| LF-27  | ...   | 3.0            | 4.5           | Yes          |

### Content Improvements

- **Total Tickets:** [count]
- **Descriptions Improved:** [count]
- **Average Quality Gain:** +[score]
- **Content Condensed:** [percentage] average

### Documentation

- **Pages Created:** [count]
- **Pages Updated:** [count]
- **Space:** keycloakal

### Comments

- **Comments Processed:** [count]
- **Responses Posted:** [count]
- **Escalations:** [count]

### Links

- [Confluence Documentation Space](https://thelobbi.atlassian.net/wiki/spaces/keycloakal)
- [QA Board](https://thelobbi.atlassian.net/jira/software/projects/LF/boards/...)
```

## Mode Options

### Full Mode (default)
```bash
/qa-review
```
Runs all phases: review, documentation, and comment response.

### Review Only Mode
```bash
/qa-review --mode review-only
```
Only reviews and improves ticket content. No documentation or comment responses.

### Documentation Only Mode
```bash
/qa-review --mode docs-only
```
Only creates/updates Confluence documentation from tickets. No content changes.

### Comments Only Mode
```bash
/qa-review --mode comments-only
```
Only responds to pending comments. No content changes or documentation.

## Specific Ticket Review

Review a single ticket:
```bash
/qa-review --ticket LF-27
```

Review with dry run:
```bash
/qa-review --ticket LF-27 --dry-run true
```

## Agent Orchestration

The command orchestrates multiple specialized agents:

| Agent | Model | Purpose |
|-------|-------|---------|
| qa-ticket-reviewer | sonnet | Content quality improvement |
| qa-confluence-documenter | sonnet | Documentation creation |
| qa-comment-responder | haiku | Comment management |

**Execution Pattern:**
1. Agents run in sequence for each ticket
2. Results from qa-ticket-reviewer feed into qa-confluence-documenter
3. qa-comment-responder runs independently for all tickets

## Error Handling

### Partial Failures
- Continue processing remaining tickets
- Log failures in summary
- Provide specific error details

### API Rate Limits
- Implement exponential backoff
- Maximum 50 tickets per session
- Pause between Confluence operations

### Permission Errors
- Skip ticket, log in report
- Continue with other tickets
- Notify of permission issues

## Dry Run Mode

When `--dry-run true`:

1. All discovery and analysis runs normally
2. Improvements are generated but NOT applied
3. Documentation is drafted but NOT created
4. Comments are composed but NOT posted
5. Full report shows what WOULD happen

**Dry Run Output:**
```markdown
## DRY RUN - Changes NOT Applied

### Would Update: LF-27
**Current Description:** [current]
**Proposed Description:** [proposed]
**Quality Change:** 3.0 -> 4.5

### Would Create Confluence Page
**Title:** LF-27 - Feature Name
**Space:** keycloakal
**Content Preview:** [first 500 chars]

### Would Post Comment
**Ticket:** LF-27
**Response To:** @john.doe question
**Proposed Response:** [response text]
```

## Integration with Existing Workflows

### After Development Complete
```
/jira-orchestrator:work LF-27 → Development → PR Created → QA Transition → /qa-review LF-27
```

### Regular QA Maintenance
```
# Daily QA review
/qa-review --mode full

# Quick comment response
/qa-review --mode comments-only
```

## Confluence Space Configuration

**Default Space:** keycloakal (ID: 1310724)

**Page Hierarchy:**
```
keycloakal/
└── Features/
    └── [Project Name]/
        └── [ISSUE-KEY] - [Feature Name]/
            ├── Overview
            ├── Technical Implementation
            └── Test Documentation
```

## Success Criteria

A successful QA review session means:

- [ ] All QA tickets discovered
- [ ] Content quality improved for all reviewed tickets
- [ ] Confluence documentation created/updated
- [ ] Pending comments addressed
- [ ] Review comments added to tickets
- [ ] Comprehensive summary generated
- [ ] No data loss during updates

## Troubleshooting

### No Tickets Found
- Check JQL query syntax
- Verify status names match your workflow
- Ensure Jira project access

### Documentation Creation Fails
- Verify Confluence space access
- Check for duplicate page titles
- Ensure content format is valid markdown

### Comment Response Fails
- Check comment permissions
- Verify ticket is editable
- Review API rate limits

## Related Commands

- `/jira-orchestrator:work` - Full development workflow
- `/jira-orchestrator:sync` - Sync Jira progress
- `/jira-orchestrator:pr` - Create pull request
- `/jira-orchestrator:docs` - Sync to Confluence

## Examples

### Review all QA tickets with full workflow
```
/qa-review
```

### Review specific ticket with dry run
```
/qa-review --ticket LF-27 --dry-run true
```

### Only update documentation
```
/qa-review --mode docs-only
```

### Respond to pending comments
```
/qa-review --mode comments-only
```

### Review and document specific feature
```
/qa-review --ticket LF-25 --mode full
```
