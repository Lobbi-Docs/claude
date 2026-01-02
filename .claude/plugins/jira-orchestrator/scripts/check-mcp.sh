#!/bin/bash
# Check if Atlassian MCP server is installed and working

set -e

MCP_SERVER_NAME="atlassian"

# Check if MCP server is in the list
if claude mcp list 2>&1 | grep -q "$MCP_SERVER_NAME"; then
    echo "MCP_INSTALLED=true"
    echo "MCP_NAME=$MCP_SERVER_NAME"
    exit 0
else
    echo "MCP_INSTALLED=false"
    exit 1
fi
