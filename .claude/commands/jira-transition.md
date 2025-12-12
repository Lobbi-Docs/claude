# Jira Issue Transition

Transition Jira issues through workflow states.

## Instructions

Execute the following workflow to transition issues:

### 1. Get Available Transitions

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

# Get available transitions for an issue
curl -X GET "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" | jq '.transitions[] | {id, name, to: .to.name}'
\`\`\`

### 2. Common Transitions

\`\`\`bash
# Start Progress (To Do -> In Progress)
curl -X POST "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "21"}}'

# Submit for Review (In Progress -> In Review)
curl -X POST "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "transition": {"id": "31"},
    "update": {
      "comment": [{
        "add": {
          "body": {
            "type": "doc",
            "version": 1,
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Ready for review. PR: #123"}]}]
          }
        }
      }]
    }
  }'

# Complete (In Review -> Done)
curl -X POST "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "transition": {"id": "41"},
    "fields": {
      "resolution": {"name": "Done"}
    }
  }'

# Block Issue
curl -X POST "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "transition": {"id": "51"},
    "update": {
      "comment": [{
        "add": {
          "body": {
            "type": "doc",
            "version": 1,
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Blocked by: GA-456. Waiting for API changes."}]}]
          }
        }
      }]
    }
  }'

# Reopen (Done -> To Do)
curl -X POST "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "transition": {"id": "11"},
    "update": {
      "comment": [{
        "add": {
          "body": {
            "type": "doc",
            "version": 1,
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Reopening due to regression found in testing."}]}]
          }
        }
      }]
    }
  }'
\`\`\`

### 3. Bulk Transitions

\`\`\`bash
# Get issues to transition
ISSUES=$(curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND status = \"In Review\" AND assignee = currentUser()",
    "fields": ["key"],
    "maxResults": 50
  }' | jq -r '.issues[].key')

# Transition each issue
for ISSUE in $ISSUES; do
  echo "Transitioning $ISSUE to Done..."
  curl -X POST "$JIRA_URL/rest/api/3/issue/$ISSUE/transitions" \
    -H "Authorization: Basic $JIRA_AUTH" \
    -H "Content-Type: application/json" \
    -d '{"transition": {"id": "41"}, "fields": {"resolution": {"name": "Done"}}}'
done
\`\`\`

### 4. Verify Transition

\`\`\`bash
# Check new status
curl -X GET "$JIRA_URL/rest/api/3/issue/GA-123?fields=status,resolution" \
  -H "Authorization: Basic $JIRA_AUTH" | jq '{status: .fields.status.name, resolution: .fields.resolution.name}'
\`\`\`

## Workflow States Reference

| Status | ID | Category | Next States |
|--------|-----|----------|-------------|
| Backlog | - | To Do | To Do |
| To Do | 11 | To Do | In Progress |
| In Progress | 21 | In Progress | In Review, Blocked |
| In Review | 31 | In Progress | Done, In Progress |
| Testing | 61 | In Progress | Done, In Progress |
| Blocked | 51 | In Progress | In Progress |
| Done | 41 | Done | To Do (reopen) |

*Note: Transition IDs vary by workflow configuration. Use the transitions endpoint to get actual IDs.*

## Options

- **Issue Key**: Required, e.g., `GA-123`
- **Transition**: By name or ID
- **Comment**: Add transition comment
- **Resolution**: Set resolution (for Done)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | Yes | Jira instance URL |
| `JIRA_EMAIL` | Yes | User email |
| `JIRA_API_TOKEN` | Yes | API token |
