# Harness Jira Connector Setup Guide

Complete guide to setting up a Jira connector in Harness for deployment tracking, issue automation, and approval workflows.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Authentication Options](#authentication-options)
5. [YAML Configuration](#yaml-configuration)
6. [Using Jira in Pipelines](#using-jira-in-pipelines)
7. [Harness MCP Integration](#harness-mcp-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Harness Jira Connector enables:
- **Issue Creation**: Automatically create Jira issues from pipelines
- **Issue Updates**: Update status, fields, and transitions
- **Approval Gates**: Use Jira issue status for deployment approvals
- **Deployment Tracking**: Link deployments to Jira issues
- **Bidirectional Sync**: Keep Harness and Jira in sync

---

## Prerequisites

### Harness Requirements

- Harness Account with CD module
- Project with appropriate permissions
- At least one Harness Delegate deployed
- Network access from Delegate to Jira

### Jira Requirements

- Jira Cloud or Jira Server/Data Center
- Account with appropriate permissions:
  - **Administer Jira** (includes all permissions), OR
  - **Administrator** or **Member** role (Jira next-gen)
- API access enabled

### Required Permissions

Your Jira account needs these minimum permissions:
- Create issues in target projects
- Edit issues
- Transition issues
- View project details
- Read user information

---

## Step-by-Step Setup

### Step 1: Generate Jira API Token

#### For Jira Cloud

1. Log in to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Enter a label (e.g., "Harness Integration")
4. Click **Create**
5. **Copy the token immediately** - it won't be shown again

**API Token Scopes Required:**
- `read:jira-user`
- `read:jira-work`
- `write:jira-work`

#### For Jira Server/Data Center

1. Go to your profile settings
2. Navigate to **Personal Access Tokens**
3. Click **Create token**
4. Name the token and set expiration
5. Copy the generated PAT

### Step 2: Create Harness Secret

1. Navigate to **Account Settings** > **Secrets** (or Project/Org level)
2. Click **+ New Secret** > **Text**
3. Configure:
   - **Name**: `jira-api-token`
   - **Value**: Paste your Jira API token/PAT
4. Click **Save**

**Best Practice**: Create secrets at the Account level for reuse across projects.

### Step 3: Create the Jira Connector

#### Via Harness UI

1. Navigate to **Project Setup** > **Connectors**
2. Click **+ New Connector**
3. Under **Ticketing Systems**, select **Jira**
4. Configure the connector:

**Basic Settings:**
| Field | Value |
|-------|-------|
| Name | `jira-connector` |
| Description | Jira integration for deployment tracking |
| Jira URL | `https://your-company.atlassian.net` |

**Authentication:**
- Select **Username and API Key**
- Username: Your full Jira email address
- API Key Reference: Select your `jira-api-token` secret

5. Click **Continue**
6. Select Harness Delegate(s) that can reach Jira
7. Click **Save and Continue**
8. Wait for connection test to pass
9. Click **Finish**

### Step 4: Verify Connection

```bash
# Test via Harness API
curl -X GET \
  "https://app.harness.io/gateway/ng/api/connectors/jira-connector?accountIdentifier=YOUR_ACCOUNT_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

Or use Harness MCP:
```python
connector = harness_get_connector(connector_id="jira-connector")
print(f"Status: {connector.status}")
```

---

## Authentication Options

### Option 1: Username + API Key (Recommended for Cloud)

```yaml
spec:
  jiraUrl: https://your-company.atlassian.net
  auth:
    type: UsernamePassword
    spec:
      username: your.email@company.com
      passwordRef: account.jira_api_token
```

### Option 2: Scoped API Token (Cloud with specific scopes)

```yaml
spec:
  jiraUrl: https://api.atlassian.com/ex/jira/{cloud_id}
  auth:
    type: UsernamePassword
    spec:
      username: YOUR_EMAIL_ADDRESS
      passwordRef: account.scoped_api_token
```

### Option 3: Personal Access Token (Server/Data Center)

```yaml
spec:
  jiraUrl: https://jira.internal.company.com
  delegateSelectors:
    - on-prem-delegate
  auth:
    type: PersonalAccessToken
    spec:
      patRef: account.jira_pat
```

**Note:** PAT requires Harness Delegate version 78707 or later.

---

## YAML Configuration

### Complete Connector YAML (Cloud)

```yaml
connector:
  name: jira-cloud-connector
  identifier: jira_cloud_connector
  description: "Jira Cloud integration for automated deployment tracking"
  orgIdentifier: default
  projectIdentifier: your_project
  type: Jira
  spec:
    jiraUrl: https://your-company.atlassian.net
    auth:
      type: UsernamePassword
      spec:
        username: your.email@company.com
        passwordRef: account.jira_api_token
    delegateSelectors:
      - primary-delegate
      - backup-delegate
```

### Complete Connector YAML (Server/Data Center)

```yaml
connector:
  name: jira-server-connector
  identifier: jira_server_connector
  description: "Jira Data Center integration"
  orgIdentifier: default
  projectIdentifier: your_project
  type: Jira
  spec:
    jiraUrl: https://jira.company.internal:8443
    delegateSelectors:
      - on-prem-delegate
    auth:
      type: PersonalAccessToken
      spec:
        patRef: org.jira_pat_secret
```

---

## Using Jira in Pipelines

### Create Issue Step

```yaml
- step:
    name: Create Deployment Ticket
    identifier: createDeploymentTicket
    type: JiraCreate
    timeout: 5m
    spec:
      connectorRef: jira_cloud_connector
      projectKey: DEPLOY
      issueType: Task
      fields:
        - name: Summary
          value: "Deploy <+service.name> v<+artifact.tag> to <+env.name>"
        - name: Description
          value: |
            ## Automated Deployment

            | Field | Value |
            |-------|-------|
            | Service | <+service.name> |
            | Environment | <+env.name> |
            | Artifact | <+artifact.image>:<+artifact.tag> |
            | Pipeline | <+pipeline.name> |
            | Triggered By | <+pipeline.triggeredBy.name> |
            | Execution | <+pipeline.executionId> |
        - name: Priority
          value: Medium
        - name: Labels
          value:
            - deployment
            - automated
            - <+env.name>
```

### Update Issue Step

```yaml
- step:
    name: Update Deployment Status
    identifier: updateDeploymentStatus
    type: JiraUpdate
    timeout: 5m
    spec:
      connectorRef: jira_cloud_connector
      issueKey: <+pipeline.variables.jiraKey>
      fields:
        - name: customfield_10100  # Deployment Status
          value: "SUCCESS"
        - name: customfield_10101  # Artifact Version
          value: <+artifact.tag>
        - name: customfield_10102  # Deploy Time
          value: <+pipeline.startTs>
      transitionTo:
        transitionName: Done
        status: Done
```

### Jira Approval Step

```yaml
- step:
    name: Production Approval
    identifier: productionApproval
    type: JiraApproval
    timeout: 72h
    spec:
      connectorRef: jira_cloud_connector
      projectKey: DEPLOY
      issueKey: <+pipeline.variables.approvalTicket>
      approvalCriteria:
        type: KeyValues
        spec:
          matchAnyCondition: true
          conditions:
            - key: Status
              operator: equals
              value: Approved
            - key: Resolution
              operator: equals
              value: Done
      rejectionCriteria:
        type: KeyValues
        spec:
          matchAnyCondition: true
          conditions:
            - key: Status
              operator: equals
              value: Rejected
            - key: Status
              operator: equals
              value: Won't Do
```

### Complete Pipeline Example

```yaml
pipeline:
  name: Deploy with Jira Tracking
  identifier: deploy_with_jira
  projectIdentifier: your_project
  orgIdentifier: default
  stages:
    - stage:
        name: Pre-Deploy
        identifier: pre_deploy
        type: Approval
        spec:
          execution:
            steps:
              - step:
                  name: Create Deployment Issue
                  identifier: createIssue
                  type: JiraCreate
                  timeout: 5m
                  spec:
                    connectorRef: jira_cloud_connector
                    projectKey: DEPLOY
                    issueType: Task
                    fields:
                      - name: Summary
                        value: "Deployment: <+pipeline.name>"

    - stage:
        name: Deploy
        identifier: deploy
        type: Deployment
        spec:
          deploymentType: Kubernetes
          service:
            serviceRef: my_service
          environment:
            environmentRef: production
          execution:
            steps:
              - step:
                  name: Rolling Deployment
                  identifier: rollingDeployment
                  type: K8sRollingDeploy
                  timeout: 10m
                  spec:
                    skipDryRun: false

    - stage:
        name: Post-Deploy
        identifier: post_deploy
        type: Custom
        spec:
          execution:
            steps:
              - step:
                  name: Update Jira
                  identifier: updateJira
                  type: JiraUpdate
                  timeout: 5m
                  spec:
                    connectorRef: jira_cloud_connector
                    issueKey: <+stages.pre_deploy.spec.execution.steps.createIssue.issue.key>
                    transitionTo:
                      transitionName: Done
                      status: Done
```

---

## Harness MCP Integration

### Overview

The Harness MCP (Model Context Protocol) Server enables AI agents to interact with Harness, including Jira connectors.

### Environment Setup

```bash
export HARNESS_API_KEY="your-api-key"
export HARNESS_DEFAULT_ORG_ID="default"
export HARNESS_DEFAULT_PROJECT_ID="your_project"
export HARNESS_ACCOUNT_ID="your_account_id"
```

### MCP Configuration

Add to your Claude Code or AI agent configuration:

```json
{
  "mcpServers": {
    "harness": {
      "command": "npx",
      "args": ["-y", "@harness/mcp-server"],
      "env": {
        "HARNESS_API_KEY": "${HARNESS_API_KEY}",
        "HARNESS_DEFAULT_ORG_ID": "${HARNESS_DEFAULT_ORG_ID}",
        "HARNESS_DEFAULT_PROJECT_ID": "${HARNESS_DEFAULT_PROJECT_ID}"
      }
    }
  }
}
```

### Using MCP to Manage Jira Connector

```python
# List all connectors
connectors = harness_list_connectors(
    type="Jira",
    org_id="default",
    project_id="your_project"
)

# Get specific connector details
jira_connector = harness_get_connector(
    connector_id="jira_cloud_connector"
)

# List available connector types
catalogue = harness_get_connector_catalogue()
print(catalogue.jira_types)
```

### MCP with Jira Orchestrator

The `harness-jira-sync` agent automatically uses MCP to:
1. Monitor pipeline executions
2. Extract Jira issue keys from metadata
3. Update Jira issues with deployment status
4. Transition issues based on deployment outcomes

---

## Troubleshooting

### Connection Test Fails

**Symptom:** "Connection test failed" when saving connector

**Solutions:**
1. Verify Jira URL format (include `https://`)
2. Check API token is valid and not expired
3. Verify delegate has network access to Jira
4. For on-prem: Check SSL certificates

### Authentication Errors

**Symptom:** `401 Unauthorized` or `403 Forbidden`

**Solutions:**
1. Verify username is full email address
2. Check API token scopes
3. For PAT: Verify delegate version >= 78707
4. Verify account has required Jira permissions

### Field Update Errors

**Symptom:** "Field cannot be modified" errors

**Solutions:**
1. Verify field is editable in Jira project config
2. Check field type is supported (User, Option, Array, Any, Number, Date, String)
3. Note: Issue links and attachments not supported

### Transition Errors

**Symptom:** Transition not found or not allowed

**Solutions:**
1. Verify transition name matches exactly
2. Check current issue status allows transition
3. Verify workflow allows transition for issue type

### Delegate Issues

**Symptom:** "Delegate not found" or timeout errors

**Solutions:**
1. Verify delegate is running: `kubectl get pods -n harness-delegate`
2. Check delegate tags match connector config
3. Verify network connectivity from delegate to Jira

### Debug Commands

```bash
# Test Jira API connectivity from delegate
kubectl exec -it harness-delegate-xxx -- curl -u email:token \
  https://your-company.atlassian.net/rest/api/3/myself

# Check delegate logs
kubectl logs harness-delegate-xxx -n harness-delegate

# Test connector via API
curl -X POST \
  "https://app.harness.io/gateway/ng/api/connectors/testConnection/jira_connector" \
  -H "x-api-key: $HARNESS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"accountIdentifier": "YOUR_ACCOUNT_ID"}'
```

---

## Quick Reference

### Supported Jira Field Types

| Type | Example |
|------|---------|
| String | Summary, Description |
| Number | Story Points |
| Date | Due Date |
| Option | Priority, Status |
| Array | Labels, Components |
| User | Assignee, Reporter |
| Any | Custom fields |

### Harness Expressions for Jira

| Expression | Description |
|------------|-------------|
| `<+execution.steps.{step}.issue.key>` | Created issue key |
| `<+execution.steps.{step}.issue.id>` | Created issue ID |
| `<+execution.steps.{step}.issue.Status>` | Issue status |
| `<+pipeline.variables.jiraKey>` | Pipeline variable |

### Common Field References

```yaml
# Standard fields
- name: Summary
- name: Description
- name: Priority
- name: Labels
- name: Assignee
- name: Reporter

# Custom fields (get ID from Jira admin)
- name: customfield_10100  # Custom Text
- name: customfield_10101  # Custom Select
- name: customfield_10102  # Custom Date
```

---

## Related Documentation

- [Harness MCP Server](https://developer.harness.io/docs/platform/harness-aida/harness-mcp-server/)
- [Connect to Jira](https://developer.harness.io/docs/platform/connectors/ticketing-systems/connect-to-jira/)
- [Jira Connector Settings](https://developer.harness.io/docs/platform/approvals/w_approval-ref/jira-connector-settings-reference/)
- [Create Jira Issues](https://developer.harness.io/docs/continuous-delivery/x-platform-cd-features/cd-steps/ticketing-systems/create-jira-issues-in-cd-stages/)
- [Update Jira Issues](https://developer.harness.io/docs/continuous-delivery/x-platform-cd-features/cd-steps/ticketing-systems/update-jira-issues-in-cd-stages/)
- [Jira Approval Step](https://developer.harness.io/docs/platform/approvals/jira-approval/)
