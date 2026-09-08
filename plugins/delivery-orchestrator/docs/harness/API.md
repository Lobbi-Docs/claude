# Harness API Reference

> Comprehensive API reference for the Harness Platform. Use this documentation for programmatic integration with Harness CI/CD, GitOps, Feature Flags, and other modules.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs & Versioning](#base-urls--versioning)
- [Common Headers & Parameters](#common-headers--parameters)
- [Organization & Project APIs](#organization--project-apis)
- [Pipeline APIs](#pipeline-apis)
- [Trigger & Webhook APIs](#trigger--webhook-apis)
- [Service & Environment APIs](#service--environment-apis)
- [Connector APIs](#connector-apis)
- [Secret APIs](#secret-apis)
- [Execution & Monitoring APIs](#execution--monitoring-apis)
- [Module-Specific APIs](#module-specific-apis)
- [GraphQL API](#graphql-api)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)
- [Permissions Reference](#permissions-reference)
- [SDK & Client Libraries](#sdk--client-libraries)

---

## Overview

The Harness API is a **RESTful API** that uses standard HTTP verbs. Key characteristics:

- **Request Formats**: JSON, YAML, or form-data (response matches request format)
- **Single Request Mode**: Send one request at a time with authentication included
- **API Versioning**: Beta APIs use path versioning (e.g., `/v1/`)
- **Pagination**: Default limit of 30 items, maximum 100

### Platform Hierarchy

```
Account (Root Level)
├── Organization 1
│   ├── Project A
│   │   ├── Pipelines
│   │   ├── Services
│   │   ├── Environments
│   │   ├── Connectors (project-scoped)
│   │   └── Secrets (project-scoped)
│   └── Project B
├── Connectors (account-scoped)
├── Secrets (account-scoped)
├── Delegates
└── User Management
```

**Resource Availability by Scope:**
- **Account-only**: SMTP Configuration, Audit Trail
- **Org & Account**: Services, Environments, Connectors, Secrets, Templates, Delegates, Governance
- **Project-level**: Pipelines, Git Management, Product Modules

---

## Authentication

### API Key Authentication (Primary)

Generate an API key in your Harness user profile:

1. Navigate to **Profile** → **My API Keys** → **+ API Key**
2. Name the key, add description/tags (optional)
3. Click **+ Token** under the API key
4. Set expiration date (`mm/dd/yyyy` format)
5. **Save the token immediately** - it's only displayed once

```bash
curl -X GET "https://app.harness.io/ng/api/projects" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Service Account Token (Alternative)

For automated systems, use service account tokens:

```bash
curl -X GET "https://app.harness.io/ng/api/projects" \
  -H "Authorization: Bearer SERVICE_ACCOUNT_TOKEN" \
  -H "Content-Type: application/json"
```

### Finding Your Account ID

Located in any Harness URL:
```
https://app.harness.io/ng/#/account/ACCOUNT_ID/home/get-started
                                    ^^^^^^^^^^
```

### Required Permissions

To use the API, you need one of these roles (or equivalent custom role):
- **Account Administrator**
- **Organization Admin**
- **Project Admin**

---

## Base URLs & Versioning

### Environment URLs

| Environment | Base URL |
|-------------|----------|
| **SaaS (US)** | `https://app.harness.io` |
| **SaaS (EU)** | `https://app.harness.io` |
| **Self-Managed** | `https://YOUR_DOMAIN` |

### API Path Prefixes by Module

| Module | Base Path | Description |
|--------|-----------|-------------|
| **Platform (ng)** | `/ng/api/` | Projects, connectors, secrets, users |
| **Pipeline** | `/pipeline/api/` | Pipelines, executions, input sets |
| **Pipeline v1** | `/v1/orgs/{org}/projects/{project}/` | Beta v1 API |
| **Code Repository** | `/code/api/v1/` | Repositories, PRs |
| **Feature Flags** | `/cf/admin/` | FF management |
| **STO** | `/sto/api/` | Security scans |
| **CCM** | `/ccm/api/` | Cloud costs |
| **Chaos** | `/chaos/api/` | Chaos experiments |
| **GitOps** | `/gitops/api/v1/` | GitOps agents, clusters |
| **IaCM** | `/iacm/api/` | Terraform workspaces |
| **Log Service** | `/log-service/` | Execution logs |
| **Gateway** | `/gateway/` | Webhooks, triggers |

### API Versioning

Beta APIs include generation version in path:
```
https://app.harness.io/v1/orgs/{org}/projects/{project}/pipelines
                       ^^
                       API Generation
```

---

## Common Headers & Parameters

### Required Headers

```http
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

For YAML-based pipeline operations:
```http
Content-Type: application/yaml
```

### Common Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `accountIdentifier` | Yes | Your Harness account ID |
| `orgIdentifier` | Sometimes | Organization identifier (default: `default`) |
| `projectIdentifier` | Sometimes | Project identifier |
| `pageIndex` | No | Page number (0-based) |
| `pageSize` | No | Items per page (default: 30, max: 100) |

### Pagination Response Headers

| Header | Description |
|--------|-------------|
| `X-Total-Elements` | Total number of entries |
| `X-Page-Number` | Current page number |
| `X-Page-Size` | Entries per page |

---

## Organization & Project APIs

### List Organizations

```bash
GET /ng/api/aggregate/organizations?accountIdentifier={account}
```

### Get Organization Details

```bash
GET /ng/api/organizations/{orgIdentifier}?accountIdentifier={account}
```

### Create Organization

```bash
POST /ng/api/organizations?accountIdentifier={account}
Content-Type: application/json

{
  "organization": {
    "identifier": "my_org",
    "name": "My Organization",
    "description": "Organization description",
    "tags": {}
  }
}
```

### List Projects

```bash
GET /ng/api/projects?accountIdentifier={account}&orgIdentifier={org}
```

### Create Project

```bash
POST /ng/api/projects?accountIdentifier={account}&orgIdentifier={org}
Content-Type: application/json

{
  "project": {
    "orgIdentifier": "default",
    "identifier": "my_project",
    "name": "My Project",
    "color": "#0063F7",
    "modules": ["CD", "CI"],
    "description": "Project description",
    "tags": {}
  }
}
```

**Example with curl:**
```bash
curl -i -X POST \
  'https://app.harness.io/ng/api/projects?accountIdentifier=ACCOUNT_ID&orgIdentifier=default' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: API_KEY_TOKEN' \
  -d '{
    "project": {
      "orgIdentifier": "default",
      "identifier": "apisample",
      "name": "APISample",
      "color": "#0063F7",
      "modules": [],
      "description": "",
      "tags": {}
    }
  }'
```

### Update Project

```bash
PUT /ng/api/projects/{projectIdentifier}?accountIdentifier={account}&orgIdentifier={org}
```

### Delete Project

```bash
DELETE /ng/api/projects/{projectIdentifier}?accountIdentifier={account}&orgIdentifier={org}
```

---

## Pipeline APIs

### List Pipelines

```bash
GET /pipeline/api/pipelines/list?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Get Pipeline (YAML)

```bash
GET /pipeline/api/pipelines/{pipelineId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

Query parameters for Git Experience:
- `branch` - Branch name
- `loadFromFallbackBranch` - Use fallback if branch not found
- `getTemplatesResolvedPipeline` - Resolve template references

### Create Pipeline (v1 Beta)

```bash
POST /v1/orgs/{org}/projects/{project}/pipelines
Content-Type: application/yaml

{
  "pipeline_yaml": "pipeline:\n  name: My Pipeline\n  identifier: my_pipeline\n  ..."
}
```

### Create Pipeline (Legacy)

```bash
POST /pipeline/api/pipelines/v2?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
Content-Type: application/yaml

pipeline:
  name: My Pipeline
  identifier: my_pipeline
  projectIdentifier: my_project
  orgIdentifier: default
  stages:
    - stage:
        name: Build
        identifier: build
        type: CI
        spec:
          ...
```

### Update Pipeline

```bash
PUT /pipeline/api/pipelines/v2/{pipelineIdentifier}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Delete Pipeline

```bash
DELETE /pipeline/api/pipelines/{pipelineIdentifier}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Execute Pipeline

```bash
POST /pipeline/api/pipeline/execute/{pipelineId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
Content-Type: application/json

{
  "inputSetReferences": ["input_set_1"],
  "stageIdentifiers": ["build", "deploy"],
  "runtimeInputYaml": "pipeline:\n  variables:\n    - name: version\n      value: \"1.0.0\""
}
```

### Execute Pipeline (v1 Beta)

```bash
POST /v1/orgs/{org}/projects/{project}/pipelines/{pipeline}/execute
Content-Type: application/json

{
  "inputs_yaml": "pipeline:\n  variables:\n    - name: env\n      value: \"prod\""
}
```

### Dynamic Pipeline Execution

Execute pipelines with runtime YAML configuration (requires feature flag `PIPE_DYNAMIC_PIPELINES_EXECUTION`):

```bash
POST /gateway/pipeline/api/v1/orgs/{org}/projects/{project}/pipelines/{pipeline}/execute/dynamic
Content-Type: application/yaml

pipeline:
  name: Dynamic Build
  identifier: dynamic_build
  stages:
    - stage:
        name: Build
        type: CI
        ...
```

---

## Trigger & Webhook APIs

### Custom Webhook Trigger URL Format

```
https://app.harness.io/gateway/pipeline/api/webhook/custom/{customWebhookToken}/v3?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}&pipelineIdentifier={pipeline}&triggerIdentifier={trigger}
```

### Trigger Pipeline via Webhook

```bash
curl -X POST \
  "https://app.harness.io/gateway/pipeline/api/webhook/custom/TOKEN/v3?accountIdentifier=ACCOUNT&orgIdentifier=ORG&projectIdentifier=PROJECT&pipelineIdentifier=PIPELINE&triggerIdentifier=TRIGGER" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{"sample_key": "sample_value"}'
```

### Create Trigger

```yaml
POST /pipeline/api/triggers?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
Content-Type: application/yaml

trigger:
  name: GitHub Push Trigger
  identifier: github_push
  pipelineIdentifier: build_pipeline
  source:
    type: Webhook
    spec:
      type: Github
      spec:
        type: Push
        spec:
          connectorRef: github_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
```

### Get Webhook Execution Details

```bash
GET /pipeline/api/webhook/triggerExecutionDetails/{eventId}?accountIdentifier={account}
```

### Track Trigger Status

The response from a webhook trigger includes an `apiUrl` for tracking:

```bash
curl -X GET "https://app.harness.io/gateway/pipeline/api/webhook/triggerExecutionDetails/EVENT_ID?accountIdentifier=ACCOUNT"
```

Response includes:
- `eventCorrelationId`
- Execution URLs
- Pipeline status details

### List Triggers

```bash
GET /pipeline/api/triggers?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}&targetIdentifier={pipelineId}
```

### Pipeline Event Types for Notifications

| Event | Description |
|-------|-------------|
| `AllEvents` | All pipeline events |
| `PipelineStart` | Pipeline started |
| `PipelineEnd` | Pipeline completed |
| `PipelineSuccess` | Pipeline succeeded |
| `PipelineFailed` | Pipeline failed |
| `StageFailed` | Stage failed |
| `StageSuccess` | Stage succeeded |
| `StageStart` | Stage started |
| `StepFailed` | Step failed |
| `TriggerFailed` | Trigger execution failed |

---

## Service & Environment APIs

### Create Service

```bash
POST /ng/api/servicesV2?accountIdentifier={account}
Content-Type: application/json

{
  "identifier": "my_service",
  "name": "My Service",
  "orgIdentifier": "default",
  "projectIdentifier": "my_project",
  "yaml": "service:\n  name: My Service\n  identifier: my_service\n  serviceDefinition:\n    type: Kubernetes\n    spec:\n      artifacts:\n        primary:\n          type: DockerRegistry\n          spec:\n            connectorRef: docker_hub\n            imagePath: nginx\n            tag: <+input>"
}
```

### List Services

```bash
GET /ng/api/servicesV2?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Get Service Deployment Status

```bash
GET /ng/api/servicesV2/{serviceIdentifier}/deployment-status?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Create Environment

```bash
POST /ng/api/environmentsV2?accountIdentifier={account}
Content-Type: application/json

{
  "identifier": "dev",
  "name": "Development",
  "type": "PreProduction",
  "orgIdentifier": "default",
  "projectIdentifier": "my_project",
  "yaml": "environment:\n  name: Development\n  identifier: dev\n  type: PreProduction\n  orgIdentifier: default\n  projectIdentifier: my_project"
}
```

### List Environments

```bash
GET /ng/api/environmentsV2?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Create Infrastructure Definition

```bash
POST /ng/api/infrastructures?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}&environmentIdentifier={env}
Content-Type: application/yaml

infrastructureDefinition:
  name: K8s Dev Cluster
  identifier: k8s_dev
  type: KubernetesDirect
  orgIdentifier: default
  projectIdentifier: my_project
  environmentRef: dev
  spec:
    connectorRef: k8s_connector
    namespace: my-namespace
    releaseName: release-<+INFRA_KEY>
```

### Service Override Priority

When settings conflict, Harness uses this priority (highest to lowest):
1. Environment service overrides
2. Environment configuration
3. Service settings

---

## Connector APIs

### List Connectors

```bash
GET /ng/api/connectors?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Get Connector

```bash
GET /ng/api/connectors/{connectorIdentifier}?accountIdentifier={account}
```

### Test Connector

```bash
POST /ng/api/connectors/testConnection/{connectorId}?accountIdentifier={account}
```

### Create Docker Registry Connector

```bash
POST /ng/api/connectors?accountIdentifier={account}
Content-Type: application/json

{
  "connector": {
    "name": "Docker Hub",
    "identifier": "docker_hub",
    "type": "DockerRegistry",
    "spec": {
      "dockerRegistryUrl": "https://index.docker.io/v2/",
      "providerType": "DockerHub",
      "auth": {
        "type": "UsernamePassword",
        "spec": {
          "username": "myuser",
          "usernameRef": null,
          "passwordRef": "docker_password"
        }
      }
    }
  }
}
```

### Create Kubernetes Cluster Connector

```bash
POST /ng/api/connectors?accountIdentifier={account}
Content-Type: application/json

{
  "connector": {
    "name": "K8s Cluster",
    "identifier": "k8s_cluster",
    "type": "K8sCluster",
    "spec": {
      "credential": {
        "type": "ManualConfig",
        "spec": {
          "masterUrl": "https://kubernetes.default.svc",
          "auth": {
            "type": "ServiceAccount",
            "spec": {
              "serviceAccountTokenRef": "k8s_sa_token"
            }
          }
        }
      },
      "delegateSelectors": ["primary-delegate"]
    }
  }
}
```

### Create GitHub Connector

```bash
POST /ng/api/connectors?accountIdentifier={account}
Content-Type: application/json

{
  "connector": {
    "name": "GitHub",
    "identifier": "github",
    "type": "Github",
    "spec": {
      "url": "https://github.com/my-org",
      "authentication": {
        "type": "Http",
        "spec": {
          "type": "UsernameToken",
          "spec": {
            "username": "my-username",
            "tokenRef": "github_token"
          }
        }
      },
      "apiAccess": {
        "type": "Token",
        "spec": {
          "tokenRef": "github_token"
        }
      }
    }
  }
}
```

### Connector Types

| Type | Identifier |
|------|------------|
| Docker Registry | `DockerRegistry` |
| Kubernetes | `K8sCluster` |
| GitHub | `Github` |
| GitLab | `Gitlab` |
| Bitbucket | `Bitbucket` |
| AWS | `Aws` |
| GCP | `Gcp` |
| Azure | `Azure` |
| Artifactory | `Artifactory` |
| Nexus | `Nexus` |
| HashiCorp Vault | `Vault` |

---

## Secret APIs

### Create Text Secret

```bash
POST /ng/api/v2/secrets?accountIdentifier={account}
Content-Type: application/json

{
  "secret": {
    "type": "SecretText",
    "name": "my-secret",
    "identifier": "my_secret",
    "orgIdentifier": "default",
    "projectIdentifier": "my_project",
    "spec": {
      "secretManagerIdentifier": "harnessSecretManager",
      "valueType": "Inline",
      "value": "secret-value"
    }
  }
}
```

### Create File Secret

```bash
POST /ng/api/v2/secrets/files?accountIdentifier={account}
Content-Type: multipart/form-data

# Form fields:
# - spec: JSON metadata
# - file: The secret file
```

### List Secrets

```bash
GET /ng/api/v2/secrets?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Get Secret Value

Secrets are never returned via API. Use expressions in pipelines:
```yaml
<+secrets.getValue("my_secret")>
```

### Update Secret

```bash
PUT /ng/api/v2/secrets/{secretIdentifier}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### Delete Secret

```bash
DELETE /ng/api/v2/secrets/{secretIdentifier}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

---

## Execution & Monitoring APIs

### Get Execution Details

```bash
GET /pipeline/api/pipelines/execution/v2/{planExecutionId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### List Executions

```bash
GET /pipeline/api/pipelines/execution/summary?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}&pipelineIdentifier={pipeline}
```

### Get Execution Logs

```bash
GET /log-service/stream?accountID={account}&key={logKey}
```

### Interrupt Execution

```bash
PUT /pipeline/api/pipelines/execution/interrupt/{planExecutionId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
Content-Type: application/json

{
  "interruptType": "AbortAll"
}
```

Interrupt types:
- `AbortAll` - Abort entire execution
- `Abort` - Abort current stage
- `Pause` - Pause execution
- `Resume` - Resume paused execution

### Retry Failed Execution

```bash
POST /pipeline/api/pipelines/execution/{originalExecutionId}/retry?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
Content-Type: application/json

{
  "retryStagesIdentifier": ["failed_stage"],
  "runAllStages": false
}
```

---

## Module-Specific APIs

### GitOps API

```bash
# List GitOps agents
GET /gitops/api/v1/agents?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Get cluster by release
GET /v1/kubernetes/releases/service-mapping?accountIdentifier={account}&namespace={ns}&releaseName={release}
```

### Feature Flags API

```bash
# List feature flags
GET /cf/admin/features?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}&environmentIdentifier={env}

# Toggle feature flag
PATCH /cf/admin/features/{featureFlagIdentifier}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}&environmentIdentifier={env}
Content-Type: application/json

{
  "instructions": [
    {
      "kind": "setFeatureFlagState",
      "parameters": {
        "state": "on"
      }
    }
  ]
}
```

### IaCM (Terraform) API

```bash
# List workspaces
GET /iacm/api/workspaces?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Trigger workspace run
POST /iacm/api/workspaces/{workspaceId}/runs?accountIdentifier={account}
```

### Chaos Engineering API

```bash
# List chaos experiments
GET /chaos/api/experiments?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Run chaos experiment
POST /chaos/api/experiments/{experimentId}/run?accountIdentifier={account}
```

### STO (Security) API

```bash
# Get scan results
GET /sto/api/scans?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Get vulnerabilities
GET /sto/api/issues?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
```

### CCM (Cloud Cost) API

```bash
# Get cost overview
GET /ccm/api/costDetails?accountIdentifier={account}

# List perspectives
GET /ccm/api/perspectives?accountIdentifier={account}
```

---

## GraphQL API

Harness also provides a GraphQL API for complex queries:

### Endpoint

```
POST https://app.harness.io/gateway/api/graphql?accountId={account}
```

### Query Applications

```graphql
query {
  applications(limit: 10) {
    nodes {
      id
      name
      pipelines {
        nodes {
          id
          name
        }
      }
    }
  }
}
```

### Trigger Pipeline

```graphql
mutation {
  startExecution(input: {
    applicationId: "app_id"
    entityId: "pipeline_id"
    executionType: PIPELINE
  }) {
    execution {
      id
      status
    }
  }
}
```

### Get Execution Status

```graphql
query {
  execution(executionId: "exec_id") {
    id
    status
    startedAt
    endedAt
    pipeline {
      name
    }
  }
}
```

---

## Rate Limits

Harness implements rate limiting for platform stability:

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 1000/min |
| Write operations | 300/min |
| Pipeline executions | 100/min |
| Bulk operations | 50/min |

When rate limited, you'll receive a `429 Too Many Requests` response.

---

## Error Handling

### Response Format

```json
{
  "status": "ERROR",
  "code": "INVALID_REQUEST",
  "message": "Pipeline not found",
  "correlationId": "abc123-def456-ghi789"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request - invalid parameters |
| `401` | Unauthorized - invalid or missing API key |
| `403` | Forbidden - insufficient permissions |
| `404` | Not found - resource doesn't exist |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `502` | Bad gateway |
| `503` | Service unavailable |
| `504` | Gateway timeout |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Bad request parameters |
| `RESOURCE_NOT_FOUND` | Entity doesn't exist |
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DUPLICATE_FIELD` | Resource already exists |
| `INVALID_IDENTIFIER` | Invalid identifier format |

---

## Permissions Reference

### Scope Hierarchy

1. **Account scope** - Highest level, manages account-wide settings
2. **Organization scope** - Mid-level, manages organizational resources
3. **Project scope** - Lowest level, manages project-specific resources

### Core Permissions

| Permission | Scope | Description |
|------------|-------|-------------|
| `core_account_view` | Account | View account details |
| `core_account_edit` | Account | Edit account settings |
| `core_project_view` | All | View projects |
| `core_project_create` | Org, Account | Create projects |
| `core_project_edit` | All | Edit projects |
| `core_project_delete` | All | Delete projects |

### Pipeline Permissions

| Permission | Description |
|------------|-------------|
| `pipeline_view` | View pipelines |
| `pipeline_create` | Create pipelines |
| `pipeline_edit` | Edit pipelines |
| `pipeline_delete` | Delete pipelines |
| `pipeline_execute` | Execute pipelines |

### Connector Permissions

| Permission | Description |
|------------|-------------|
| `connector_view` | View connectors |
| `connector_create` | Create connectors |
| `connector_edit` | Edit connectors |
| `connector_delete` | Delete connectors |
| `connector_access` | Use connectors in pipelines |

### Secret Permissions

| Permission | Description |
|------------|-------------|
| `secret_view` | View secret metadata (not values) |
| `secret_create` | Create secrets |
| `secret_edit` | Edit secrets |
| `secret_delete` | Delete secrets |
| `secret_access` | Use secrets in pipelines |

### Service Account Management

```
core_serviceaccount_manageapikey
```

Available at any scope for managing service account API keys.

---

## SDK & Client Libraries

### Official SDKs

Currently, Harness recommends using the REST API directly with standard HTTP clients.

### Example Python Client

```python
import requests

class HarnessClient:
    def __init__(self, account_id, api_key, base_url="https://app.harness.io"):
        self.account_id = account_id
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }

    def list_projects(self, org_id="default"):
        url = f"{self.base_url}/ng/api/projects"
        params = {
            "accountIdentifier": self.account_id,
            "orgIdentifier": org_id
        }
        response = requests.get(url, headers=self.headers, params=params)
        return response.json()

    def execute_pipeline(self, org_id, project_id, pipeline_id, inputs=None):
        url = f"{self.base_url}/pipeline/api/pipeline/execute/{pipeline_id}"
        params = {
            "accountIdentifier": self.account_id,
            "orgIdentifier": org_id,
            "projectIdentifier": project_id
        }
        body = {}
        if inputs:
            body["runtimeInputYaml"] = inputs
        response = requests.post(url, headers=self.headers, params=params, json=body)
        return response.json()

# Usage
client = HarnessClient(
    account_id="YOUR_ACCOUNT_ID",
    api_key="YOUR_API_KEY"
)
projects = client.list_projects()
```

### Example Node.js Client

```javascript
const axios = require('axios');

class HarnessClient {
  constructor(accountId, apiKey, baseUrl = 'https://app.harness.io') {
    this.accountId = accountId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async listProjects(orgId = 'default') {
    const response = await this.client.get('/ng/api/projects', {
      params: {
        accountIdentifier: this.accountId,
        orgIdentifier: orgId
      }
    });
    return response.data;
  }

  async executePipeline(orgId, projectId, pipelineId, inputs = null) {
    const response = await this.client.post(
      `/pipeline/api/pipeline/execute/${pipelineId}`,
      inputs ? { runtimeInputYaml: inputs } : {},
      {
        params: {
          accountIdentifier: this.accountId,
          orgIdentifier: orgId,
          projectIdentifier: projectId
        }
      }
    );
    return response.data;
  }
}

// Usage
const client = new HarnessClient(
  'YOUR_ACCOUNT_ID',
  'YOUR_API_KEY'
);

(async () => {
  const projects = await client.listProjects();
  console.log(projects);
})();
```

---

## Quick Reference

### Environment Variables

```bash
# Required
export HARNESS_ACCOUNT_ID="your-account-id"
export HARNESS_API_KEY="your-api-key"

# Optional
export HARNESS_BASE_URL="https://app.harness.io"
export HARNESS_ORG_ID="default"
export HARNESS_PROJECT_ID="your-project"
```

### Common curl Pattern

```bash
curl -X GET \
  "https://app.harness.io/ng/api/{endpoint}?accountIdentifier=${HARNESS_ACCOUNT_ID}&orgIdentifier=${HARNESS_ORG_ID}&projectIdentifier=${HARNESS_PROJECT_ID}" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json"
```

### API Documentation Links

- **Main API Docs**: https://apidocs.harness.io
- **Developer Hub**: https://developer.harness.io/docs/platform/automation/api/
- **API Quickstart**: https://developer.harness.io/docs/platform/automation/api/api-quickstart/
- **Project API**: https://apidocs.harness.io/project
- **Pipeline API**: https://apidocs.harness.io/pipeline
- **Pipeline Execution API**: https://apidocs.harness.io/pipeline-execution
- **Webhook Event Handler**: https://apidocs.harness.io/tag/Webhook-Event-Handler/

---

*Last updated: 2025-12-31*
