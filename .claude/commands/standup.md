# Daily Standup Command

Generate daily standup summary and identify blockers.

## Instructions

### 1. Setup

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
\`\`\`

### 2. Get Sprint Progress

\`\`\`bash
# Current sprint summary
echo "=== Daily Standup Report ==="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Sprint progress
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints()",
    "fields": ["status"],
    "maxResults": 100
  }' | jq '{
    total: .total,
    done: [.issues[] | select(.fields.status.name == "Done")] | length,
    in_progress: [.issues[] | select(.fields.status.name == "In Progress")] | length,
    todo: [.issues[] | select(.fields.status.name == "To Do")] | length
  }'
\`\`\`

### 3. Get Yesterday's Completions

\`\`\`bash
echo ""
echo "=== Completed Yesterday ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND status changed to Done after -1d",
    "fields": ["summary", "assignee"],
    "maxResults": 20
  }' | jq '.issues[] | "\(.key): \(.fields.summary) (@\(.fields.assignee.displayName // "Unassigned"))"'
\`\`\`

### 4. Get In Progress Items

\`\`\`bash
echo ""
echo "=== In Progress Today ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND status = \"In Progress\"",
    "fields": ["summary", "assignee"],
    "maxResults": 20
  }' | jq '.issues[] | "\(.key): \(.fields.summary) (@\(.fields.assignee.displayName // "Unassigned"))"'
\`\`\`

### 5. Identify Blockers

\`\`\`bash
echo ""
echo "=== BLOCKERS ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND (\"Flagged\" = \"Impediment\" OR status = Blocked)",
    "fields": ["summary", "assignee", "comment"],
    "maxResults": 10
  }' | jq '.issues[] | "⚠️ \(.key): \(.fields.summary)"'
\`\`\`

### 6. Stale Items (No Progress)

\`\`\`bash
echo ""
echo "=== Stale Items (>3 days no update) ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND status = \"In Progress\" AND updated < -3d",
    "fields": ["summary", "assignee", "updated"],
    "maxResults": 10
  }' | jq '.issues[] | "⏰ \(.key): \(.fields.summary) (last updated: \(.fields.updated))"'
\`\`\`

### 7. By Team Member

\`\`\`bash
echo ""
echo "=== By Team Member ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND status in (\"In Progress\", \"In Review\")",
    "fields": ["summary", "status", "assignee"],
    "maxResults": 50
  }' | jq 'group_by(.fields.assignee.displayName) | .[] | {assignee: .[0].fields.assignee.displayName, issues: [.[] | "\(.key): \(.fields.status.name)"]}'
\`\`\`

## Standup Format

\`\`\`markdown
## Daily Standup - [Date]

### Team Progress
- Done: X issues
- In Progress: Y issues
- To Do: Z issues
- Blocked: N issues

### Completions (Yesterday)
- GA-123: Feature X completed by @Dev1
- GA-124: Bug fix by @Dev2

### Today's Focus
- @Dev1: GA-125 (API integration)
- @Dev2: GA-126 (Testing)

### Blockers
⚠️ GA-127: Waiting on external API access
⚠️ GA-128: Need design review

### Action Items
- [ ] SM to follow up on API access
- [ ] Schedule design review meeting
\`\`\`

## Options

- `--format slack` - Format for Slack posting
- `--format markdown` - Markdown output
- `--send` - Post to team channel
