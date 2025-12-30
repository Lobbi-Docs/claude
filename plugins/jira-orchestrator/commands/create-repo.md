---
name: jira:create-repo
description: Create a new modular Harness repository with full infrastructure scaffolding (Helm, Terraform, K8s), concise README with Confluence links, and Jira integration. Interactive by default.
arguments:
  - name: service_name
    description: Name of the new service/repository (prompted if not provided)
    required: false
  - name: jira_key
    description: Jira issue key to link (e.g., PROJ-123)
    required: false
  - name: type
    description: Repository type (microservice, helm-chart, terraform-module, shared-lib)
    default: microservice
  - name: auto
    description: Run in non-interactive mode (skips all prompts)
    default: false
---

# /jira:create-repo

Create a new modular Harness repository with complete infrastructure scaffolding.

**This command is INTERACTIVE by default.** It will prompt you for configuration options.
Use `--auto` flag to skip prompts and use defaults.

## When to Use

This command is typically **discovered as needed** when:
- The orchestrator determines a new modular service is required
- An epic or feature needs its own repository
- Code analysis reveals a component should be split out
- Architecture review suggests modularity improvements

## Quick Usage

```bash
# Interactive mode (default) - prompts for all options
/jira:create-repo

# Interactive with service name provided
/jira:create-repo my-service

# Non-interactive mode with all options
/jira:create-repo my-service --jira PROJ-123 --type microservice --auto
```

## Overview

This command creates a fully scaffolded, independently deployable repository in Harness Code with:

- **Helm charts** for Kubernetes deployment (multi-environment)
- **Terraform modules** for infrastructure provisioning
- **Harness CI/CD pipeline** definitions
- **Concise README** with Confluence documentation links
- **Jira orchestrator integration**

## Parameters

| Parameter | Required | Description | Default |
|-----------|----------|-------------|---------|
| `service_name` | No | Name of the service/repository | Prompted |
| `--jira` | No | Jira issue key to link | Auto-detect or prompted |
| `--type` | No | Repository type | Prompted (default: microservice) |
| `--team` | No | Owning team name | Prompted (default: Platform Team) |
| `--confluence-space` | No | Confluence space for docs | Prompted (default: ENG) |
| `--auto` | No | Skip all prompts | false |
| `--dry-run` | No | Preview without creating | false |

## Interactive Prompts

When run without `--auto`, the command will prompt for:

```
? Service name: [Enter name]
? Repository type:
  > microservice
    helm-chart
    terraform-module
    shared-lib
? Link to Jira issue? [Y/n]
? Jira issue key: [PROJ-123]
? Owning team: [Platform Team]
? Confluence space for documentation: [ENG]
? Include Terraform modules? [Y/n]
? Include Helm chart? [Y/n]
? Initialize with sample code? [y/N]

Review configuration:
  Service: my-service
  Type: microservice
  Jira: PROJ-123
  Team: Platform Team
  Confluence: ENG

? Proceed with creation? [Y/n]
```

## Repository Types

| Type | Description | Structure |
|------|-------------|-----------|
| `microservice` | Full-stack service with Helm + Terraform | deployment/, src/, tests/ |
| `helm-chart` | Reusable Helm chart library | charts/, examples/ |
| `terraform-module` | Reusable Terraform modules | modules/, examples/ |
| `shared-lib` | Shared library package | src/, tests/, dist/ |

## Workflow

When you run this command, the agent will:

### 1. Create Harness Repository

```bash
# Via Harness Code API
POST /repos
{
  "identifier": "service-name",
  "description": "Modular microservice: service-name",
  "default_branch": "main",
  "readme": true
}
```

### 2. Scaffold Directory Structure

For `microservice` type:
```
service-name/
├── .harness/
│   ├── pipeline.yaml
│   └── triggers.yaml
├── deployment/
│   ├── helm/service-name/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   ├── values-dev.yaml
│   │   ├── values-staging.yaml
│   │   ├── values-prod.yaml
│   │   └── templates/
│   └── terraform/
│       └── environments/
├── src/
├── tests/
├── Dockerfile
├── README.md          # Concise with Confluence links
└── .jira/config.yml
```

### 3. Generate Concise README

The README is kept under 100 lines with links to Confluence:

```markdown
# service-name

**Status:** Active | **Jira:** [PROJ-123](https://jira.example.com/browse/PROJ-123)

## Quick Start
docker-compose up -d

## Documentation
| Document | Link |
|----------|------|
| Technical Design | [Confluence](https://confluence.example.com/tdd-PROJ-123) |
| API Reference | [Confluence](https://confluence.example.com/api-PROJ-123) |
| Runbook | [Confluence](https://confluence.example.com/runbook-PROJ-123) |

## Pipeline
**Harness:** [View Pipeline](https://app.harness.io/pipelines/service-name)

## Team
**Owner:** Platform Team | **Slack:** #service-name-support
```

### 4. Create Confluence Documentation

Automatically creates linked Confluence pages:
- Technical Design Document (TDD)
- Implementation Notes
- API Documentation (if applicable)
- Runbook

### 5. Update Jira Issue

Adds repository links and documentation to the Jira issue:
- Repository URL
- Pipeline URL
- Confluence documentation links
- Setup instructions comment

### 6. Configure Pipeline

Creates Harness pipeline with:
- Build stage (Docker image)
- Deploy stages (dev, staging, prod)
- Approval gates for production
- Automatic Jira status updates

## Examples

### Create a New Microservice

```bash
/jira:create-repo user-service --jira AUTH-456 --type microservice --team "Auth Team"
```

Creates:
- Harness repo: `user-service`
- Helm chart: `deployment/helm/user-service/`
- Terraform: `deployment/terraform/`
- Pipeline: `user-service-pipeline`
- Confluence: TDD, API docs, Runbook

### Create a Helm Chart Library

```bash
/jira:create-repo shared-charts --type helm-chart --confluence-space PLATFORM
```

Creates:
- Harness repo: `shared-charts`
- Chart templates in `charts/`
- Publishing pipeline

### Create a Terraform Module

```bash
/jira:create-repo infra-modules --type terraform-module
```

Creates:
- Harness repo: `infra-modules`
- Module structure in `modules/`
- Validation pipeline

## Infrastructure Deep Knowledge

This command leverages expert knowledge in:

### Kubernetes
- Deployment best practices (rolling updates, health checks)
- Service mesh patterns (Istio, Linkerd)
- Network policies and security
- HPA and resource management
- RBAC configuration

### Helm
- Chart structure and dependencies
- Multi-environment values strategy
- Hooks for migrations
- Library charts for reuse

### Terraform
- Module composition patterns
- State management strategies
- Provider configurations
- Environment isolation

## Integration Points

| System | Integration |
|--------|-------------|
| Harness Code | Repository creation, pipeline setup |
| Harness CD | Deployment automation |
| Jira | Issue linking, status updates |
| Confluence | Documentation creation |
| Kubernetes | Manifest generation |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HARNESS_API_KEY` | Yes | Harness API authentication |
| `HARNESS_ACCOUNT_ID` | Yes | Harness account identifier |
| `HARNESS_ORG_ID` | Yes | Organization identifier |
| `HARNESS_PROJECT_ID` | Yes | Project identifier |
| `CONFLUENCE_SPACE` | No | Default Confluence space |

## Post-Creation Steps

After repository creation:

1. **Clone the repository**
   ```bash
   git clone https://git.harness.io/org/service-name
   ```

2. **Review generated configs**
   - Check Helm values for your environment
   - Verify Terraform variables
   - Update pipeline triggers

3. **Start development**
   - Implement service in `src/`
   - Add tests in `tests/`
   - Push to trigger pipeline

4. **Update documentation**
   - Fill in Confluence TDD
   - Document API endpoints
   - Create runbook procedures

## Related Commands

- `/jira:work` - Start working on a Jira issue
- `/jira:ship` - Full shipping workflow
- `/jira:deploy` - Deploy via Harness
- `/jira:confluence` - Create Confluence documentation

## Agent Used

This command uses the `infrastructure-orchestrator` agent which has deep knowledge of:
- Harness repository and pipeline management
- Kubernetes deployment patterns
- Helm chart best practices
- Terraform module design
- GitOps workflows
