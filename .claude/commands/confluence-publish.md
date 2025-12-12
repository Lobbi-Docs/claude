# Publish to Confluence

Publish documentation and content to Confluence.

## Instructions

Execute the following workflow to publish content:

### 1. Setup Authentication

\`\`\`bash
export CONFLUENCE_URL="${CONFLUENCE_URL:-https://your-domain.atlassian.net}"
export CONFLUENCE_AUTH=$(echo -n "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" | base64)
\`\`\`

### 2. Get Space and Parent Page

\`\`\`bash
# List spaces
curl -X GET "$CONFLUENCE_URL/wiki/api/v2/spaces?limit=25" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq '.results[] | {id, key, name}'

# Get space ID
SPACE_ID=$(curl -s -X GET "$CONFLUENCE_URL/wiki/api/v2/spaces?keys=GA" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq -r '.results[0].id')

# Get parent page ID
PARENT_ID=$(curl -s -X GET "$CONFLUENCE_URL/wiki/rest/api/content?spaceKey=GA&title=Documentation" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq -r '.results[0].id')
\`\`\`

### 3. Create New Page

\`\`\`bash
# Create page with storage format
curl -X POST "$CONFLUENCE_URL/wiki/api/v2/pages" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"spaceId\": \"$SPACE_ID\",
    \"status\": \"current\",
    \"title\": \"New Documentation Page\",
    \"parentId\": \"$PARENT_ID\",
    \"body\": {
      \"representation\": \"storage\",
      \"value\": \"<h1>Overview</h1><p>Documentation content here.</p><h2>Details</h2><p>More information...</p>\"
    }
  }"
\`\`\`

### 4. Convert Markdown to Confluence

\`\`\`bash
# Simple markdown to HTML conversion
cat docs/README.md | pandoc -f markdown -t html > /tmp/content.html

# Read and escape for JSON
CONTENT=$(cat /tmp/content.html | jq -Rs .)

# Create page with converted content
curl -X POST "$CONFLUENCE_URL/wiki/api/v2/pages" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"spaceId\": \"$SPACE_ID\",
    \"status\": \"current\",
    \"title\": \"Imported Documentation\",
    \"parentId\": \"$PARENT_ID\",
    \"body\": {
      \"representation\": \"storage\",
      \"value\": $CONTENT
    }
  }"
\`\`\`

### 5. Update Existing Page

\`\`\`bash
# Get current page version
PAGE_ID="123456"
VERSION=$(curl -s -X GET "$CONFLUENCE_URL/wiki/api/v2/pages/$PAGE_ID" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq '.version.number')

# Update page
curl -X PUT "$CONFLUENCE_URL/wiki/api/v2/pages/$PAGE_ID" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$PAGE_ID\",
    \"status\": \"current\",
    \"title\": \"Updated Page Title\",
    \"body\": {
      \"representation\": \"storage\",
      \"value\": \"<h1>Updated Content</h1><p>New content here.</p>\"
    },
    \"version\": {
      \"number\": $((VERSION + 1)),
      \"message\": \"Updated via API\"
    }
  }"
\`\`\`

### 6. Add Attachments

\`\`\`bash
# Upload file attachment
curl -X POST "$CONFLUENCE_URL/wiki/rest/api/content/$PAGE_ID/child/attachment" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "X-Atlassian-Token: nocheck" \
  -F "file=@diagram.png" \
  -F "comment=Architecture diagram"

# Upload multiple files
for FILE in docs/images/*.png; do
  curl -X POST "$CONFLUENCE_URL/wiki/rest/api/content/$PAGE_ID/child/attachment" \
    -H "Authorization: Basic $CONFLUENCE_AUTH" \
    -H "X-Atlassian-Token: nocheck" \
    -F "file=@$FILE"
done
\`\`\`

### 7. Add Labels

\`\`\`bash
# Add labels to page
curl -X POST "$CONFLUENCE_URL/wiki/rest/api/content/$PAGE_ID/label" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -d '[
    {"prefix": "global", "name": "documentation"},
    {"prefix": "global", "name": "api"},
    {"prefix": "global", "name": "golden-armada"}
  ]'
\`\`\`

### 8. Verify Publication

\`\`\`bash
# Get page details
curl -X GET "$CONFLUENCE_URL/wiki/api/v2/pages/$PAGE_ID" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq '{id, title, status, version: .version.number}'

# Get page URL
curl -X GET "$CONFLUENCE_URL/wiki/api/v2/pages/$PAGE_ID" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq '._links.webui'
\`\`\`

## Page Templates

### API Documentation
\`\`\`xml
<ac:structured-macro ac:name="toc" />
<h1>API Overview</h1>
<p>Description of the API.</p>
<h2>Base URL</h2>
<ac:structured-macro ac:name="code">
  <ac:plain-text-body><![CDATA[https://api.golden-armada.com/v1]]></ac:plain-text-body>
</ac:structured-macro>
<h2>Authentication</h2>
<p>Bearer token required.</p>
<h1>Endpoints</h1>
<h2>GET /health</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[{"status": "healthy"}]]></ac:plain-text-body>
</ac:structured-macro>
\`\`\`

### Runbook
\`\`\`xml
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body><p><strong>Production Runbook</strong></p></ac:rich-text-body>
</ac:structured-macro>
<h1>Purpose</h1>
<p>Description of this runbook.</p>
<h1>Prerequisites</h1>
<ul><li>kubectl access</li><li>Helm installed</li></ul>
<h1>Procedure</h1>
<h2>Step 1</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[kubectl get pods -n agents]]></ac:plain-text-body>
</ac:structured-macro>
\`\`\`

## Options

- **Space Key**: Default `GA`, override with `--space KEY`
- **Parent**: Parent page title or ID
- **Title**: Page title (required)
- **Labels**: Comma-separated labels

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CONFLUENCE_URL` | Yes | Confluence instance URL |
| `CONFLUENCE_EMAIL` | Yes | User email |
| `CONFLUENCE_API_TOKEN` | Yes | API token |
| `CONFLUENCE_SPACE_KEY` | No | Default space (GA) |
