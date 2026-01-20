#!/usr/bin/env python3
"""
Publish Jira Orchestrator documentation to Confluence.

This script uses the Atlassian MCP tools to publish the documentation.
Requires: ATLASSIAN_CLOUD_ID environment variable and MCP authentication.
"""

import os
import sys
import json
from pathlib import Path

# Add parent directory to path for imports if needed
sys.path.insert(0, str(Path(__file__).parent.parent))

def read_documentation():
    """Read the documentation markdown file."""
    doc_path = Path(__file__).parent.parent / "docs" / "CONFLUENCE-DOCUMENTATION.md"
    if not doc_path.exists():
        print(f"Error: Documentation file not found at {doc_path}")
        sys.exit(1)
    
    with open(doc_path, 'r', encoding='utf-8') as f:
        return f.read()

def get_space_info():
    """Get space information from environment or defaults."""
    space_key = os.environ.get("CONFLUENCE_SPACE_KEY", "GA")
    cloud_id = os.environ.get("ATLASSIAN_CLOUD_ID")
    
    if not cloud_id:
        print("Warning: ATLASSIAN_CLOUD_ID not set. You'll need to provide it.")
        print("You can get it from: https://admin.atlassian.com/o/{org-id}/settings/api")
    
    return {
        "space_key": space_key,
        "cloud_id": cloud_id
    }

def main():
    """Main function to publish documentation."""
    print("=" * 60)
    print("Jira Orchestrator - Confluence Documentation Publisher")
    print("=" * 60)
    print()
    
    # Read documentation
    print("📖 Reading documentation...")
    content = read_documentation()
    print(f"   ✓ Read {len(content)} characters")
    print()
    
    # Get space info
    print("🔍 Checking configuration...")
    config = get_space_info()
    print(f"   Space Key: {config['space_key']}")
    if config['cloud_id']:
        print(f"   Cloud ID: {config['cloud_id']}")
    else:
        print("   ⚠ Cloud ID: Not set (required for publishing)")
    print()
    
    print("=" * 60)
    print("📋 Publishing Instructions")
    print("=" * 60)
    print()
    print("To publish this documentation to Confluence, use one of these methods:")
    print()
    print("METHOD 1: Using Claude with MCP Atlassian tools")
    print("-" * 60)
    print("""
1. Ensure ATLASSIAN_CLOUD_ID is set in your environment
2. Use the confluence-manager agent or MCP tools:

   /jira:confluence <ISSUE-KEY> create <page-type>
   
   Or directly use MCP tools:
   
   mcp__atlassian__createConfluencePage({
     cloudId: "<your-cloud-id>",
     spaceId: "<space-id>",  # Get from getConfluenceSpaces
     title: "Jira Orchestrator - Complete Documentation",
     body: "<markdown-content>",
     contentFormat: "markdown",
     parentId: "<parent-page-id>"  # Optional
   })
""")
    print()
    print("METHOD 2: Using curl (from confluence-publish command)")
    print("-" * 60)
    print("""
# Set environment variables
export CONFLUENCE_URL="${CONFLUENCE_URL:-https://your-domain.atlassian.net}"
export CONFLUENCE_AUTH=$(echo -n "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" | base64)

# Get space ID
SPACE_ID=$(curl -s -X GET "$CONFLUENCE_URL/wiki/api/v2/spaces?keys=GA" \\
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq -r '.results[0].id')

# Convert markdown to HTML (requires pandoc)
CONTENT=$(cat docs/CONFLUENCE-DOCUMENTATION.md | pandoc -f markdown -t html | jq -Rs .)

# Create page
curl -X POST "$CONFLUENCE_URL/wiki/api/v2/pages" \\
  -H "Authorization: Basic $CONFLUENCE_AUTH" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"spaceId\\": \\"$SPACE_ID\\",
    \\"status\\": \\"current\\",
    \\"title\\": \\"Jira Orchestrator - Complete Documentation\\",
    \\"body\\": {
      \\"representation\\": \\"storage\\",
      \\"value\\": $CONTENT
    }
  }"
""")
    print()
    print("=" * 60)
    print("📄 Documentation Summary")
    print("=" * 60)
    print(f"Title: Jira Orchestrator - Complete Documentation")
    print(f"Version: 7.3.0")
    print(f"Size: {len(content)} characters")
    print(f"Location: {Path(__file__).parent.parent / 'docs' / 'CONFLUENCE-DOCUMENTATION.md'}")
    print()
    print("✅ Documentation file is ready for publishing!")
    print()
    print("💡 Tip: The documentation is in Markdown format and can be published")
    print("   directly using MCP tools with contentFormat: 'markdown'")

if __name__ == "__main__":
    main()
