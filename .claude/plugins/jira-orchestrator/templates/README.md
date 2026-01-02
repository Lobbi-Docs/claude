# Template Library

**Version:** 1.0.0 | **Templates:** 15+ | **Categories:** 6

---

## Overview

This template library ensures consistency across all repositories and documentation. Templates use variable substitution with the `{{VARIABLE_NAME}}` syntax.

---

## Template Categories

| Category | Purpose | Location |
|----------|---------|----------|
| Repository | Project scaffolding | `repository/` |
| Confluence | Documentation pages | `confluence/` |
| Helm | Kubernetes deployment | `helm/` |
| GitHub | CI/CD & workflows | `github/` |
| ADR | Architecture decisions | `adr/` |
| Code | Source code patterns | `code/` |

---

## Quick Reference

### Repository Templates

| Template | Use For | Command |
|----------|---------|---------|
| `microservice/` | Full-stack services | `/jira:create-repo --type microservice` |
| `helm-chart/` | Reusable Helm charts | `/jira:create-repo --type helm-chart` |
| `terraform-module/` | Infrastructure modules | `/jira:create-repo --type terraform-module` |
| `shared-lib/` | Shared libraries | `/jira:create-repo --type shared-lib` |

### Confluence Templates

| Template | When to Use |
|----------|-------------|
| `tdd.md.template` | Every new feature/service (MANDATORY) |
| `api.md.template` | Services with REST/GraphQL APIs |
| `runbook.md.template` | Every deployable service (MANDATORY) |
| `implementation.md.template` | Complex implementations |
| `test-results.md.template` | Major feature releases |

### Helm Templates

| Template | Description |
|----------|-------------|
| `Chart.yaml.template` | Chart metadata |
| `values.yaml.template` | Default values |
| `templates/deployment.yaml` | Kubernetes Deployment |
| `templates/service.yaml` | Kubernetes Service |
| `templates/ingress.yaml` | Ingress configuration |

---

## Variable Reference

### Core Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{SERVICE_NAME}}` | Service/repo name | `user-service` |
| `{{SERVICE_NAME_UPPER}}` | Uppercase name | `USER_SERVICE` |
| `{{SERVICE_NAME_PASCAL}}` | PascalCase name | `UserService` |
| `{{JIRA_KEY}}` | Jira issue key | `PROJ-123` |
| `{{JIRA_PROJECT}}` | Jira project key | `PROJ` |

### URL Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{JIRA_URL}}` | Jira instance URL | `https://jira.example.com` |
| `{{CONFLUENCE_BASE}}` | Confluence base URL | `https://confluence.example.com` |
| `{{REPO_URL}}` | Repository URL | `https://github.com/org/repo` |
| `{{HARNESS_URL}}` | Harness URL | `https://app.harness.io` |

### Metadata Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{TEAM_NAME}}` | Owning team | `Platform Team` |
| `{{AUTHOR}}` | Author name | `John Doe` |
| `{{DATE}}` | Current date (ISO) | `2025-12-31` |
| `{{VERSION}}` | Version number | `1.0.0` |
| `{{DESCRIPTION}}` | Service description | `User management service` |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{NAMESPACE_DEV}}` | Dev namespace | `user-service-dev` |
| `{{NAMESPACE_STAGING}}` | Staging namespace | `user-service-staging` |
| `{{NAMESPACE_PROD}}` | Prod namespace | `user-service-prod` |
| `{{REPLICAS_DEV}}` | Dev replicas | `1` |
| `{{REPLICAS_STAGING}}` | Staging replicas | `2` |
| `{{REPLICAS_PROD}}` | Prod replicas | `3` |

---

## Usage Examples

### Creating a Microservice Repository

```bash
/jira:create-repo my-service --jira PROJ-123 --type microservice --team "Platform Team"
```

This uses templates from:
- `repository/microservice/README.md.template`
- `repository/microservice/Dockerfile.template`
- `helm/Chart.yaml.template`
- `helm/values.yaml.template`
- `github/workflows/ci.yml.template`

### Creating Confluence Documentation

When the orchestrator creates Confluence pages, it uses:
- `confluence/tdd.md.template` for Technical Design Document
- `confluence/api.md.template` for API Documentation
- `confluence/runbook.md.template` for Operations Runbook

### Adding Helm Charts to Existing Repo

Templates used:
- `helm/Chart.yaml.template`
- `helm/values.yaml.template`
- `helm/templates/deployment.yaml.template`
- `helm/templates/service.yaml.template`

---

## Customization

### Adding New Templates

1. Create template file with `.template` extension
2. Use `{{VARIABLE_NAME}}` for substitution
3. Add to appropriate category directory
4. Update this README

### Template Syntax

```markdown
# {{SERVICE_NAME}}

Created: {{DATE}}
Author: {{AUTHOR}}
Jira: [{{JIRA_KEY}}]({{JIRA_URL}}/browse/{{JIRA_KEY}})

## Description

{{DESCRIPTION}}

## Team

**Owner:** {{TEAM_NAME}}
```

### Conditional Sections

Use comments for conditional content:

```markdown
<!-- IF: HAS_API -->
## API Documentation

See [API Reference]({{CONFLUENCE_BASE}}/api-{{JIRA_KEY}})
<!-- ENDIF: HAS_API -->
```

---

## Template Validation

Templates are validated for:
- Required variables present
- Valid markdown syntax
- No undefined variables used
- Consistent formatting

Run validation:
```bash
./scripts/validate-templates.sh
```

---

## Related Documentation

- [Development Standards](../docs/DEVELOPMENT-STANDARDS.md)
- [Repository Structure](../docs/DEVELOPMENT-STANDARDS.md#repository-structure-standards)
- [Create Repo Command](../commands/create-repo.md)
