#!/bin/bash
# Publish Jira Orchestrator documentation to Confluence using MCP tools
# This script demonstrates the workflow but actual execution should be done via Claude with MCP tools

set -e

DOC_FILE="plugins/jira-orchestrator/docs/CONFLUENCE-DOCUMENTATION.md"
PAGE_TITLE="Jira Orchestrator - Complete Documentation"
SPACE_KEY="${CONFLUENCE_SPACE_KEY:-GA}"

echo "=========================================="
echo "Publishing to Confluence via MCP"
echo "=========================================="
echo ""
echo "Documentation file: $DOC_FILE"
echo "Page title: $PAGE_TITLE"
echo "Target space: $SPACE_KEY"
echo ""

if [ ! -f "$DOC_FILE" ]; then
    echo "Error: Documentation file not found at $DOC_FILE"
    exit 1
fi

CONTENT=$(cat "$DOC_FILE")
CHAR_COUNT=$(echo "$CONTENT" | wc -c)

echo "✓ Read documentation ($CHAR_COUNT characters)"
echo ""
echo "=========================================="
echo "MCP Tool Call Instructions"
echo "=========================================="
echo ""
echo "Use the following MCP tool call to create the page:"
echo ""
echo "Tool: confluence_create_page"
echo "Parameters:"
echo "  space_key: \"$SPACE_KEY\""
echo "  title: \"$PAGE_TITLE\""
echo "  content: <content from file>"
echo "  content_format: \"markdown\""
echo "  enable_heading_anchors: true"
echo ""
echo "Note: The content is quite large ($CHAR_COUNT chars)."
echo "      You may need to pass it as a file reference or"
echo "      ensure the MCP tool can handle large content."
echo ""
echo "=========================================="
echo "Alternative: Use Claude with MCP"
echo "=========================================="
echo ""
echo "In Claude, you can directly use:"
echo ""
echo "  Use the confluence_create_page MCP tool with:"
echo "  - space_key: \"$SPACE_KEY\" (or your space key)"
echo "  - title: \"$PAGE_TITLE\""
echo "  - content: <full markdown content>"
echo "  - content_format: \"markdown\""
echo ""
