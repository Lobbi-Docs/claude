# Harness API Reference

## Authentication

### API Key
```bash
curl -H "x-api-key: YOUR_API_KEY" \
     https://app.harness.io/gateway/ng/api/...
```

### Service Account Token
```bash
curl -H "Authorization: Bearer SERVICE_ACCOUNT_TOKEN" \
     https://app.harness.io/gateway/ng/api/...
```

## Base URLs

| Environment | URL |
|-------------|-----|
| SaaS | `https://app.harness.io/gateway` |
| SaaS EU | `https://app.harness.io/gateway` |
| Self-Managed | `https://YOUR_DOMAIN/gateway` |

## Common Endpoints

### Projects
```bash
# List projects
GET /ng/api/projects?accountIdentifier={account}

# Create project
POST /ng/api/projects?accountIdentifier={account}
{
  "project": {
    "name": "My Project",
    "identifier": "my_project",
    "orgIdentifier": "default"
  }
}
```

### Pipelines
```bash
# List pipelines
GET /pipeline/api/pipelines/list?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Get pipeline
GET /pipeline/api/pipelines/{pipelineId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Execute pipeline
POST /pipeline/api/pipeline/execute/{pipelineId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}
{
  "inputSetReferences": ["input_set_1"],
  "stageIdentifiers": ["build", "deploy"]
}
```

### Connectors
```bash
# List connectors
GET /ng/api/connectors?accountIdentifier={account}

# Test connector
POST /ng/api/connectors/testConnection/{connectorId}?accountIdentifier={account}
```

### Secrets
```bash
# Create secret
POST /ng/api/v2/secrets?accountIdentifier={account}
{
  "secret": {
    "type": "SecretText",
    "name": "my-secret",
    "identifier": "my_secret",
    "spec": {
      "secretManagerIdentifier": "harnessSecretManager",
      "valueType": "Inline",
      "value": "secret-value"
    }
  }
}
```

### Executions
```bash
# Get execution details
GET /pipeline/api/pipelines/execution/v2/{planExecutionId}?accountIdentifier={account}&orgIdentifier={org}&projectIdentifier={project}

# Get execution logs
GET /log-service/stream?accountID={account}&key={logKey}
```

## GraphQL API

```graphql
# Query applications
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

# Trigger pipeline
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

## Webhooks

### Pipeline Trigger
```yaml
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

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 1000/min |
| Write operations | 300/min |
| Pipeline executions | 100/min |
| Bulk operations | 50/min |

## Error Handling

```json
{
  "status": "ERROR",
  "code": "INVALID_REQUEST",
  "message": "Pipeline not found",
  "correlationId": "abc123"
}
```

Common error codes:
- `INVALID_REQUEST` - Bad request parameters
- `RESOURCE_NOT_FOUND` - Entity doesn't exist
- `UNAUTHORIZED` - Invalid or missing auth
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
