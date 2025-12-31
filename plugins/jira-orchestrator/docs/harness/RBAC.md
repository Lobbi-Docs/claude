# Harness RBAC

## Built-in Roles

| Role | Scope | Description |
|------|-------|-------------|
| Account Admin | Account | Full access |
| Organization Admin | Org | Full org access |
| Project Admin | Project | Full project access |
| Pipeline Executor | Project | Execute pipelines |
| Pipeline Viewer | Project | View only |

## Custom Role

```yaml
role:
  name: Deployment Manager
  identifier: deployment_manager
  permissions:
    - resourceType: PIPELINE
      actions:
        - core_pipeline_view
        - core_pipeline_execute
    - resourceType: SERVICE
      actions:
        - core_service_view
    - resourceType: ENVIRONMENT
      actions:
        - core_environment_view
    - resourceType: CONNECTOR
      actions:
        - core_connector_view
    - resourceType: SECRET
      actions:
        - core_secret_view
```

## Resource Groups

```yaml
resourceGroup:
  name: Production Resources
  identifier: prod_resources
  includedScopes:
    - filter: ByResourceType
      resourceType: ENVIRONMENT
      attributeFilter:
        attributeName: type
        attributeValues:
          - Production
    - filter: ByResourceType
      resourceType: PIPELINE
```

## User Groups

```yaml
userGroup:
  name: Platform Engineers
  identifier: platform_engineers
  users:
    - user1@company.com
    - user2@company.com
  notificationConfigs:
    - type: SLACK
      slackWebhookUrl: <+secrets.getValue("slack_webhook")>
    - type: EMAIL
      groupEmail: platform-team@company.com
```

## Role Binding

```yaml
roleBinding:
  name: Platform Prod Access
  identifier: platform_prod_access
  roleIdentifier: deployment_manager
  resourceGroupIdentifier: prod_resources
  principals:
    - type: USER_GROUP
      identifier: platform_engineers
```

## Service Accounts

```yaml
serviceAccount:
  name: CI Pipeline Account
  identifier: ci_pipeline_sa
  description: Service account for CI automation
---
apiKey:
  name: CI API Key
  identifier: ci_api_key
  serviceAccountIdentifier: ci_pipeline_sa
  apiKeyType: SERVICE_ACCOUNT
  defaultTimeToExpireToken: 90
```

## Common Permissions

| Resource | Actions |
|----------|---------|
| PIPELINE | view, execute, edit, delete |
| SERVICE | view, access, edit, delete |
| ENVIRONMENT | view, access, edit, delete |
| CONNECTOR | view, access, edit, delete |
| SECRET | view, access, edit, delete |
| TEMPLATE | view, access, edit, delete |
