---
name: jira:infra
description: Infrastructure management - create repos, deploy, manage pipelines
arguments:
  - name: action
    description: Action (create-repo, deploy, pipeline, status)
    required: true
  - name: options
    description: Action-specific options
    required: false
---

# /jira:infra

Consolidated command for infrastructure and repository management. Interactive by default.

## Quick Usage

```bash
# Create new modular repository (interactive)
/jira:infra create-repo

# Track deployment status
/jira:infra deploy PROJ-123

# View pipeline status
/jira:infra pipeline my-service
```

## Subcommands

| Action | Description | Example |
|--------|-------------|---------|
| `create-repo` | Create modular Harness repository | `create-repo my-service` |
| `deploy` | Track/trigger deployment | `deploy PROJ-123 --env staging` |
| `pipeline` | View pipeline status | `pipeline my-service` |
| `status` | Infrastructure overview | `status` |

## Create Repository (create-repo)

**Interactive by default** - prompts for configuration.

```bash
# Interactive mode (recommended)
/jira:infra create-repo

# With service name
/jira:infra create-repo my-service

# Non-interactive
/jira:infra create-repo my-service --jira PROJ-123 --type microservice --auto
```

### Interactive Prompts

```
? Service name: [Enter name]
? Repository type:
  > microservice
    helm-chart
    terraform-module
    shared-lib
? Link to Jira issue? [Y/n]
? Owning team: [Platform Team]
? Include Terraform modules? [Y/n]
? Include Helm chart? [Y/n]

Review configuration:
  Service: my-service
  Type: microservice
  Jira: PROJ-123

? Proceed with creation? [Y/n]
```

### What Gets Created

- **Harness repository** with standard structure
- **Helm chart** with multi-environment values
- **Terraform modules** (optional)
- **CI/CD pipeline** in Harness
- **Concise README** with Confluence links
- **Jira integration** configured

## Deploy (deploy)

```bash
# Check deployment status for issue
/jira:infra deploy PROJ-123

# Trigger deployment
/jira:infra deploy PROJ-123 --trigger --env dev

# View deployment history
/jira:infra deploy PROJ-123 --history
```

### Auto-Deploy via Hooks

Deployments can be auto-triggered on PR merge:

```yaml
# .jira/config.yml
hooks:
  on-pr-merge:
    trigger-deploy: true
    environments: [dev, staging]
```

## Pipeline (pipeline)

```bash
# View pipeline status
/jira:infra pipeline my-service

# View executions
/jira:infra pipeline my-service --executions

# Trigger pipeline
/jira:infra pipeline my-service --trigger
```

## Status (status)

```bash
# Infrastructure overview
/jira:infra status
```

Displays:
- Active deployments
- Pipeline health
- Repository count
- Recent changes

## Replaces

This command consolidates:
- `/jira:create-repo` → `/jira:infra create-repo`
- `/jira:deploy` → `/jira:infra deploy`
- `/jira:harness-review` → `/jira:pr --harness`

Old commands still work as aliases.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HARNESS_API_KEY` | Yes | Harness API authentication |
| `HARNESS_ACCOUNT_ID` | Yes | Harness account |
| `HARNESS_ORG_ID` | Yes | Organization |
| `HARNESS_PROJECT_ID` | Yes | Project |
