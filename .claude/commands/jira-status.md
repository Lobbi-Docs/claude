# Jira Status Check

Check sprint status, issue progress, and team workload in Jira.

## Instructions

Execute the following queries to check Jira status:

### 1. Current Sprint Status

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

# Get active sprint
curl -X GET "$JIRA_URL/rest/agile/1.0/board/{boardId}/sprint?state=active" \
  -H "Authorization: Basic $JIRA_AUTH" | jq '.values[] | {id, name, goal, startDate, endDate}'

# Sprint issues
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() ORDER BY status, rank",
    "fields": ["summary", "status", "assignee", "priority", "customfield_10016"],
    "maxResults": 50
  }' | jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name, assignee: .fields.assignee.displayName}'
\`\`\`

### 2. Sprint Progress

\`\`\`bash
# Count by status
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints()",
    "fields": ["status"],
    "maxResults": 100
  }' | jq '[.issues[].fields.status.name] | group_by(.) | map({status: .[0], count: length})'

# Story points completed vs remaining
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND type = Story",
    "fields": ["status", "customfield_10016"],
    "maxResults": 100
  }' | jq '{
    total: [.issues[].fields.customfield_10016 // 0] | add,
    completed: [.issues[] | select(.fields.status.name == "Done") | .fields.customfield_10016 // 0] | add,
    remaining: [.issues[] | select(.fields.status.name != "Done") | .fields.customfield_10016 // 0] | add
  }'
\`\`\`

### 3. Blockers and Impediments

\`\`\`bash
# Flagged issues
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND \"Flagged\" = \"Impediment\" AND resolution = Unresolved",
    "fields": ["summary", "status", "assignee", "priority"],
    "maxResults": 20
  }' | jq '.issues[] | {key, summary: .fields.summary, assignee: .fields.assignee.displayName}'

# High priority unresolved
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND priority in (Highest, High) AND resolution = Unresolved ORDER BY priority DESC",
    "fields": ["summary", "status", "assignee", "priority"],
    "maxResults": 20
  }' | jq '.issues[] | {key, summary: .fields.summary, priority: .fields.priority.name, status: .fields.status.name}'
\`\`\`

### 4. Team Workload

\`\`\`bash
# Issues per assignee
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints() AND resolution = Unresolved",
    "fields": ["assignee"],
    "maxResults": 100
  }' | jq '[.issues[].fields.assignee.displayName // "Unassigned"] | group_by(.) | map({assignee: .[0], count: length}) | sort_by(.count) | reverse'

# My issues
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC",
    "fields": ["summary", "status", "priority", "duedate"],
    "maxResults": 20
  }' | jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name, priority: .fields.priority.name}'
\`\`\`

### 5. Recent Activity

\`\`\`bash
# Recently updated
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND updated >= -24h ORDER BY updated DESC",
    "fields": ["summary", "status", "updated", "assignee"],
    "maxResults": 20
  }' | jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name, updated: .fields.updated}'

# Recently resolved
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND resolved >= -7d ORDER BY resolved DESC",
    "fields": ["summary", "resolution", "assignee"],
    "maxResults": 20
  }' | jq '.issues[] | {key, summary: .fields.summary, resolution: .fields.resolution.name}'
\`\`\`

### 6. Epic Progress

\`\`\`bash
# Epics with progress
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND type = Epic AND resolution = Unresolved",
    "fields": ["summary", "status", "customfield_10014"],
    "maxResults": 20
  }' | jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name}'
\`\`\`

## Quick Status Report

Generate a formatted status report:

\`\`\`bash
echo "=== Golden Armada Sprint Status ==="
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""
echo "Sprint Issues:"
# Run sprint issues query above
echo ""
echo "Blockers:"
# Run blockers query above
echo ""
echo "Team Workload:"
# Run workload query above
\`\`\`

## Options

- **Board ID**: Specify with `--board ID`
- **Project**: Override with `--project KEY`
- **Sprint**: Specific sprint with `--sprint ID`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | Yes | Jira instance URL |
| `JIRA_EMAIL` | Yes | User email |
| `JIRA_API_TOKEN` | Yes | API token |
| `JIRA_BOARD_ID` | No | Default board ID |
