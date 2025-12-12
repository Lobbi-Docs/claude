# Sprint Planning Command

Facilitate sprint planning with capacity calculation and story selection.

## Instructions

### 1. Pre-Planning Setup

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
export BOARD_ID="${JIRA_BOARD_ID:-1}"
\`\`\`

### 2. Get Team Capacity

\`\`\`bash
# Get team members
TEAM_SIZE=5
SPRINT_DAYS=10
FOCUS_FACTOR=0.7

# Calculate capacity
CAPACITY=$(echo "$TEAM_SIZE * $SPRINT_DAYS * $FOCUS_FACTOR * 0.8" | bc)
echo "Sprint Capacity: $CAPACITY story points"
\`\`\`

### 3. Review Backlog

\`\`\`bash
# Get refined stories ready for sprint
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND status = Ready AND \"Story Points\" is not EMPTY AND sprint is EMPTY ORDER BY rank",
    "fields": ["summary", "customfield_10016", "priority", "assignee"],
    "maxResults": 30
  }' | jq '.issues[] | {key, summary: .fields.summary, points: .fields.customfield_10016, priority: .fields.priority.name}'
\`\`\`

### 4. Get Historical Velocity

\`\`\`bash
# Last 5 sprints velocity
curl -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND type = Story AND status = Done AND sprint in closedSprints()",
    "fields": ["customfield_10016", "sprint"],
    "maxResults": 100
  }' | jq '[.issues[] | .fields.customfield_10016] | add'
\`\`\`

### 5. Create Sprint

\`\`\`bash
# Create new sprint
SPRINT_NAME="Sprint $(date +%V)"
START_DATE=$(date -I)T09:00:00.000Z
END_DATE=$(date -d "+14 days" -I)T17:00:00.000Z

curl -X POST "$JIRA_URL/rest/agile/1.0/sprint" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$SPRINT_NAME\",
    \"startDate\": \"$START_DATE\",
    \"endDate\": \"$END_DATE\",
    \"originBoardId\": $BOARD_ID,
    \"goal\": \"Sprint goal here\"
  }"
\`\`\`

### 6. Move Stories to Sprint

\`\`\`bash
# Move selected stories to sprint
SPRINT_ID="sprint-id-here"
STORIES='["GA-101", "GA-102", "GA-103"]'

curl -X POST "$JIRA_URL/rest/agile/1.0/sprint/$SPRINT_ID/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"issues\": $STORIES}"
\`\`\`

### 7. Create Planning Documentation

\`\`\`bash
# Create Confluence planning page
Task("Confluence Specialist", "Create Sprint $SPRINT_NAME planning page with capacity $CAPACITY points", "confluence-specialist")
\`\`\`

## Sprint Planning Checklist

- [ ] Backlog groomed and prioritized
- [ ] Team capacity calculated
- [ ] Sprint goal defined
- [ ] Stories selected within capacity
- [ ] Acceptance criteria reviewed
- [ ] Dependencies identified
- [ ] Sprint created in Jira
- [ ] Planning notes documented

## Options

- `--capacity N` - Override calculated capacity
- `--goal "text"` - Set sprint goal
- `--stories GA-1,GA-2` - Pre-select stories
