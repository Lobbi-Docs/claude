---
name: harness-mcp
description: Harness MCP (Model Context Protocol) server integration for AI-powered CD operations, pipeline management, connector configuration, and bidirectional Jira synchronization
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - WebFetch
  - WebSearch
dependencies:
  - harness-cd
  - jira-orchestration
triggers:
  - harness mcp
  - harness ai
  - harness connector
  - harness pipeline
  - harness jira
  - mcp server
  - cd automation
---

# Harness MCP Skill

Comprehensive Harness MCP (Model Context Protocol) server integration for AI-powered CD operations with the Jira Orchestrator.

## Overview

The Harness MCP Server enables AI agents to interact with Harness tools using a unified protocol, providing endpoints for:
- **Connectors**: Get details, list catalogue, list with filtering
- **Pipelines**: List, get details
- **Executions**: Get details, list, fetch URLs
- **Dashboards**: List all, retrieve specific data

## Prerequisites

### Environment Variables

```bash
# Required Harness Configuration
export HARNESS_API_KEY="your-harness-api-key"
export HARNESS_DEFAULT_ORG_ID="your-org-id"
export HARNESS_DEFAULT_PROJECT_ID="your-project-id"
export HARNESS_BASE_URL="https://app.harness.io"  # Optional, defaults to this
export HARNESS_ACCOUNT_ID="your-account-id"
```

### Harness API Token Generation

1. Navigate to **Account Settings > API Keys** in Harness UI
2. Click **+ API Key** to create a new token
3. Set appropriate permissions (minimum: pipeline execution, connector management)
4. Copy the token and store securely

## MCP Server Configuration

### Claude Code Configuration

Add Harness MCP to your Claude Code configuration:

```json
{
  "mcpServers": {
    "harness": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-harness"
      ],
      "env": {
        "HARNESS_API_KEY": "${HARNESS_API_KEY}",
        "HARNESS_DEFAULT_ORG_ID": "${HARNESS_DEFAULT_ORG_ID}",
        "HARNESS_DEFAULT_PROJECT_ID": "${HARNESS_DEFAULT_PROJECT_ID}",
        "HARNESS_BASE_URL": "${HARNESS_BASE_URL}"
      }
    }
  }
}
```

### Docker Configuration

```bash
docker run -e HARNESS_API_KEY=$HARNESS_API_KEY \
           -e HARNESS_DEFAULT_ORG_ID=$HARNESS_DEFAULT_ORG_ID \
           -e HARNESS_DEFAULT_PROJECT_ID=$HARNESS_DEFAULT_PROJECT_ID \
           harness/mcp-server:latest
```

### VS Code / Cursor Configuration

```json
{
  "mcp.servers": {
    "harness": {
      "command": "npx",
      "args": ["-y", "@harness/mcp-server"],
      "env": {
        "HARNESS_API_KEY": "${env:HARNESS_API_KEY}",
        "HARNESS_DEFAULT_ORG_ID": "${env:HARNESS_DEFAULT_ORG_ID}",
        "HARNESS_DEFAULT_PROJECT_ID": "${env:HARNESS_DEFAULT_PROJECT_ID}"
      }
    }
  }
}
```

## Available MCP Tools

### Connector Management

| Tool | Description |
|------|-------------|
| `harness_get_connector` | Get details of a specific connector |
| `harness_list_connectors` | List all connectors with filtering |
| `harness_get_connector_catalogue` | Get available connector types |

### Pipeline Operations

| Tool | Description |
|------|-------------|
| `harness_list_pipelines` | List pipelines in project |
| `harness_get_pipeline` | Get pipeline details and YAML |
| `harness_trigger_pipeline` | Trigger pipeline execution |

### Execution Tracking

| Tool | Description |
|------|-------------|
| `harness_get_execution` | Get execution details |
| `harness_list_executions` | List recent executions |
| `harness_get_execution_url` | Get execution dashboard URL |

### Dashboard Functions

| Tool | Description |
|------|-------------|
| `harness_list_dashboards` | List all dashboards |
| `harness_get_dashboard` | Get specific dashboard data |

## Jira Connector Setup in Harness

### Step 1: Navigate to Connectors

1. Go to **Project Setup** > **Connectors**
2. Click **+ New Connector**
3. Select **Jira** under Ticketing Systems

### Step 2: Configure Basic Settings

```yaml
connector:
  name: jira-connector
  identifier: jira_connector
  orgIdentifier: default
  projectIdentifier: your_project
  type: Jira
  spec:
    jiraUrl: https://your-company.atlassian.net
```

### Step 3: Authentication Options

#### Option A: Username + API Key (Recommended for Cloud)

```yaml
spec:
  jiraUrl: https://your-company.atlassian.net
  auth:
    type: UsernamePassword
    spec:
      username: your.email@company.com
      passwordRef: jira_api_token  # Harness secret reference
```

**Required Scopes:**
- `read:jira-user`
- `read:jira-work`
- `write:jira-work`

#### Option B: Personal Access Token (Jira Server/Data Center)

```yaml
spec:
  jiraUrl: https://jira.internal.company.com
  delegateSelectors:
    - delegate-name
  auth:
    type: PersonalAccessToken
    spec:
      patRef: jira_pat_secret  # Harness secret reference
```

**Note:** Requires Harness Delegate version 78707+

#### Option C: OAuth (Advanced)

```yaml
spec:
  jiraUrl: https://api.atlassian.com/ex/jira/{cloud_id}
  auth:
    type: OAuth
    spec:
      clientId: your_oauth_client_id
      clientSecretRef: oauth_secret
      tokenEndpoint: https://auth.atlassian.com/oauth/token
```

### Step 4: Configure Delegate

Select Harness Delegates that have network access to your Jira instance:

```yaml
spec:
  delegateSelectors:
    - primary-delegate
    - backup-delegate
```

### Step 5: Test Connection

Click **Save and Continue** - Harness automatically tests the connection.

## Using Jira Steps in Pipelines

### Jira Create Step

```yaml
- step:
    name: Create Jira Issue
    identifier: createJiraIssue
    type: JiraCreate
    timeout: 5m
    spec:
      connectorRef: jira_connector
      projectKey: PROJ
      issueType: Task
      fields:
        - name: Summary
          value: "Deployment: <+pipeline.name> - <+pipeline.sequenceId>"
        - name: Description
          value: |
            Deployment triggered by: <+pipeline.triggeredBy.name>
            Environment: <+env.name>
            Service: <+service.name>
            Artifact: <+artifact.image>
        - name: Priority
          value: Medium
        - name: Labels
          value: ["deployment", "automation", "<+env.name>"]
```

### Jira Update Step

```yaml
- step:
    name: Update Jira Issue
    identifier: updateJiraIssue
    type: JiraUpdate
    timeout: 5m
    spec:
      connectorRef: jira_connector
      issueKey: <+pipeline.variables.jiraIssueKey>
      fields:
        - name: Status
          value: Done
        - name: customfield_10100
          value: <+artifact.tag>
      transitionTo:
        transitionName: Done
        status: Done
```

### Jira Approval Step

```yaml
- step:
    name: Jira Approval
    identifier: jiraApproval
    type: JiraApproval
    timeout: 1d
    spec:
      connectorRef: jira_connector
      projectKey: PROJ
      issueKey: <+pipeline.variables.jiraIssueKey>
      approvalCriteria:
        type: KeyValues
        spec:
          matchAnyCondition: true
          conditions:
            - key: Status
              operator: equals
              value: Approved
      rejectionCriteria:
        type: KeyValues
        spec:
          matchAnyCondition: true
          conditions:
            - key: Status
              operator: equals
              value: Rejected
```

## Integration with Jira Orchestrator

### Automatic Deployment Tracking

The `harness-jira-sync` agent automatically:
1. Extracts Jira issue keys from pipeline tags
2. Updates Jira with deployment status
3. Transitions issues based on deployment events
4. Records artifact versions and environment info

### Configuration

Add to `.jira/config.yml`:

```yaml
harness:
  account:
    account_id: "${HARNESS_ACCOUNT_ID}"
    org_id: "${HARNESS_ORG_ID}"
    project_id: "${HARNESS_PROJECT_ID}"
  api:
    base_url: "https://app.harness.io"
    api_key: "${HARNESS_API_KEY}"

  # MCP Integration
  mcp:
    enabled: true
    tools:
      - harness_get_connector
      - harness_list_pipelines
      - harness_get_execution
      - harness_list_executions

  # Jira Connector Reference
  jira_connector_ref: "jira_connector"

  # Sync Configuration
  sync:
    auto_create_issues: true
    auto_transition: true
    environments:
      dev: "In Development"
      staging: "In QA"
      prod: "Released"
```

### MCP Tool Usage Examples

```python
# Get Jira connector details
connector = harness_get_connector(
    connector_id="jira_connector",
    org_id="default",
    project_id="my_project"
)

# List recent pipeline executions
executions = harness_list_executions(
    pipeline_id="deploy_pipeline",
    limit=10
)

# Get specific execution details
execution = harness_get_execution(
    execution_id="abc123",
    org_id="default",
    project_id="my_project"
)
```

## Troubleshooting

### Connection Issues

| Issue | Solution |
|-------|----------|
| API Key invalid | Regenerate token in Harness UI |
| Network timeout | Check delegate connectivity |
| Permission denied | Verify API key permissions |
| Jira unreachable | Check firewall/proxy settings |

### Common Errors

```
Error: INVALID_CREDENTIAL
Solution: Verify HARNESS_API_KEY is correct and not expired

Error: DELEGATE_NOT_AVAILABLE
Solution: Ensure delegate is running and selected in connector

Error: JIRA_AUTHENTICATION_FAILED
Solution: Verify Jira credentials (email + API token or PAT)
```

### Debug Logging

Enable verbose logging:

```bash
export HARNESS_LOG_LEVEL=debug
export MCP_DEBUG=true
```

## Best Practices

1. **Use Secrets Management**: Store all credentials in Harness Secrets
2. **Delegate Selection**: Use delegates with direct network access to Jira
3. **Error Handling**: Configure retry strategies for transient failures
4. **Audit Trail**: Enable logging for all Jira operations
5. **Least Privilege**: Scope API tokens to minimum required permissions

## Related Documentation

- [Harness MCP Server](https://developer.harness.io/docs/platform/harness-aida/harness-mcp-server/)
- [Connect to Jira](https://developer.harness.io/docs/platform/connectors/ticketing-systems/connect-to-jira/)
- [Jira Connector Settings Reference](https://developer.harness.io/docs/platform/approvals/w_approval-ref/jira-connector-settings-reference/)
- [Create Jira Issues in CD Stages](https://developer.harness.io/docs/continuous-delivery/x-platform-cd-features/cd-steps/ticketing-systems/create-jira-issues-in-cd-stages/)
