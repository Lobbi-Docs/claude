# Create Jira Issue

Create a new Jira issue with proper formatting and metadata.

## Instructions

Execute the following workflow to create a Jira issue:

### 1. Gather Issue Information

Determine the issue type and required fields:

**Issue Types:**
- `Bug` - Something isn't working correctly
- `Story` - User-facing feature
- `Task` - Technical work item
- `Epic` - Large body of work
- `Spike` - Research/investigation

### 2. Create the Issue

\`\`\`bash
# Set credentials
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

# Create Bug
curl -X POST "$JIRA_URL/rest/api/3/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": {"key": "GA"},
      "issuetype": {"name": "Bug"},
      "summary": "[Component] Issue summary",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [
          {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Description"}]},
          {"type": "paragraph", "content": [{"type": "text", "text": "Detailed description here."}]},
          {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Steps to Reproduce"}]},
          {"type": "orderedList", "content": [
            {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Step 1"}]}]}
          ]},
          {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Expected vs Actual"}]},
          {"type": "paragraph", "content": [{"type": "text", "text": "Expected: ... Actual: ..."}]}
        ]
      },
      "priority": {"name": "High"},
      "labels": ["bug", "needs-triage"],
      "components": [{"name": "orchestrator"}]
    }
  }'

# Create Story
curl -X POST "$JIRA_URL/rest/api/3/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": {"key": "GA"},
      "issuetype": {"name": "Story"},
      "summary": "As a [user], I want [feature] so that [benefit]",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [
          {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Acceptance Criteria"}]},
          {"type": "bulletList", "content": [
            {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Given... When... Then..."}]}]}
          ]}
        ]
      },
      "customfield_10016": 5,
      "labels": ["feature"]
    }
  }'

# Create Task
curl -X POST "$JIRA_URL/rest/api/3/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": {"key": "GA"},
      "issuetype": {"name": "Task"},
      "summary": "Task summary",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [
          {"type": "paragraph", "content": [{"type": "text", "text": "Task description."}]}
        ]
      },
      "priority": {"name": "Medium"}
    }
  }'
\`\`\`

### 3. Verify Creation

\`\`\`bash
# Get created issue details
curl -X GET "$JIRA_URL/rest/api/3/issue/GA-XXX" \
  -H "Authorization: Basic $JIRA_AUTH" | jq '.key, .fields.summary, .fields.status.name'
\`\`\`

### 4. Post-Creation Actions

\`\`\`bash
# Add to sprint (if applicable)
curl -X POST "$JIRA_URL/rest/agile/1.0/sprint/{sprintId}/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"issues": ["GA-XXX"]}'

# Link to related issues
curl -X POST "$JIRA_URL/rest/api/3/issueLink" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "type": {"name": "Relates"},
    "inwardIssue": {"key": "GA-XXX"},
    "outwardIssue": {"key": "GA-YYY"}
  }'
\`\`\`

## Options

- **Project Key**: Default is `GA`, override with `--project KEY`
- **Priority**: Highest, High, Medium, Low, Lowest
- **Labels**: Comma-separated list
- **Components**: orchestrator, claude-agent, gemini-agent, etc.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | Yes | Jira instance URL |
| `JIRA_EMAIL` | Yes | User email |
| `JIRA_API_TOKEN` | Yes | API token |
| `JIRA_PROJECT_KEY` | No | Default project (GA) |
