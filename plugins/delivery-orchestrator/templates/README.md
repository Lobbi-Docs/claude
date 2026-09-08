# Template Library

**Version:** 2.0.0 | **Templates:** 46+ | **Categories:** 10

---

## Overview

This template library ensures consistency across all repositories, documentation, comments, PRs, and Jira issues. Templates use variable substitution with the `{{VARIABLE_NAME}}` syntax.

---

## Template Categories

| Category | Purpose | Location | Count |
|----------|---------|----------|-------|
| Jira | Issue creation templates | `jira/` | 7 |
| Comments | Workflow comments | `comments/` | 14 |
| PR | Pull request descriptions | `pr/` | 7 |
| Docs | Documentation pages | `docs/` | 7 |
| Tags | Tag system configuration | `tags/` | 1 |
| Repository | Project scaffolding | `repository/` | 4 |
| Confluence | Confluence pages | `confluence/` | 2 |
| Helm | Kubernetes deployment | `helm/` | 5 |
| GitHub | CI/CD & workflows | `github/` | 2 |
| ADR | Architecture decisions | `adr/` | 1 |

---

## Quick Reference

### Jira Issue Templates

| Template | Use For | Auto-Apply |
|----------|---------|------------|
| `initiative.md.template` | Strategic initiatives | When `issuetype = Initiative` |
| `epic.md.template` | Epic issues | When `issuetype = Epic` |
| `story.md.template` | User stories | When `issuetype = Story` |
| `task.md.template` | Technical tasks | When `issuetype = Task` |
| `bug.md.template` | Bug reports | When `issuetype = Bug` |
| `subtask.md.template` | Sub-tasks | When `issuetype = Sub-task` |
| `spike.md.template` | Research/investigation | When label = `spike` |

### Comment Templates

| Template | When Used | Trigger |
|----------|-----------|---------|
| `jira-work-started.md.template` | Work begins | `/jira:work` command |
| `jira-pr-created.md.template` | PR created | `/jira:pr` command |
| `jira-pr-merged.md.template` | PR merged | Merge webhook |
| `jira-blocked.md.template` | Issue blocked | Manual trigger |
| `jira-qa-ready.md.template` | Ready for QA | Status transition |
| `jira-qa-passed.md.template` | QA approved | QA approval |
| `jira-qa-failed.md.template` | QA rejected | QA rejection |
| `jira-deployed.md.template` | Deployed | Deploy pipeline |
| `jira-rollback.md.template` | Rollback | Rollback trigger |
| `pr-review-request.md.template` | Review requested | PR creation |
| `pr-changes-requested.md.template` | Changes needed | PR review |
| `pr-approved.md.template` | PR approved | PR approval |
| `confluence-linked.md.template` | Doc linked | Doc creation |
| `status-update.md.template` | Status update | Manual/scheduled |

### PR Description Templates

| Template | Use For | Command |
|----------|---------|---------|
| `feature.md.template` | New features | `/jira:pr --type feature` |
| `bugfix.md.template` | Bug fixes | `/jira:pr --type bugfix` |
| `hotfix.md.template` | Urgent fixes | `/jira:pr --type hotfix` |
| `refactor.md.template` | Code refactoring | `/jira:pr --type refactor` |
| `docs.md.template` | Documentation only | `/jira:pr --type docs` |
| `dependency.md.template` | Dependency updates | `/jira:pr --type dependency` |
| `infrastructure.md.template` | Infrastructure changes | `/jira:pr --type infrastructure` |

### Documentation Templates

| Template | When to Use | Required |
|----------|-------------|----------|
| `tdd.md.template` | Every new feature/service | **MANDATORY** |
| `adr.md.template` | Architecture decisions | When applicable |
| `runbook.md.template` | Every deployable service | **MANDATORY** |
| `api.md.template` | Services with REST/GraphQL APIs | When applicable |
| `implementation-notes.md.template` | Complex implementations | Recommended |
| `release-notes.md.template` | Major releases | **MANDATORY** |
| `changelog.md.template` | All releases | **MANDATORY** |

### Tag System

See `tags/README.md` for complete tag taxonomy.

| Category | Prefix | Examples |
|----------|--------|----------|
| Type | `type/` | `type/feature`, `type/bug`, `type/spike` |
| Priority | `priority/` | `priority/critical`, `priority/high` |
| Status | `status/` | `status/blocked`, `status/needs-review` |
| Component | `component/` | `component/frontend`, `component/backend` |
| Environment | `env/` | `env/dev`, `env/staging`, `env/prod` |
| Team | `team/` | `team/platform`, `team/frontend` |
| Risk | `risk/` | `risk/high`, `risk/breaking-change` |
| Review | `review/` | `review/needs-security`, `review/needs-arch` |
| Auto | `auto/` | `auto/generated`, `auto/bot` |
| Size | `size/` | `size/xs`, `size/s`, `size/m`, `size/l`, `size/xl` |

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
| `runbook.md.template` | Every deployable service (MANDATORY) |

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
| `{{ISSUE_TYPE}}` | Jira issue type | `Story` |
| `{{ISSUE_SUMMARY}}` | Issue summary | `Implement login` |

### URL Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{JIRA_URL}}` | Jira instance URL | `https://jira.example.com` |
| `{{CONFLUENCE_BASE}}` | Confluence base URL | `https://confluence.example.com` |
| `{{REPO_URL}}` | Repository URL | `https://github.com/org/repo` |
| `{{HARNESS_URL}}` | Harness URL | `https://app.harness.io` |
| `{{PR_URL}}` | Pull request URL | `https://github.com/org/repo/pull/123` |

### Metadata Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{TEAM_NAME}}` | Owning team | `Platform Team` |
| `{{AUTHOR}}` | Author name | `John Doe` |
| `{{ASSIGNEE}}` | Issue assignee | `Jane Smith` |
| `{{DATE}}` | Current date (ISO) | `2025-12-31` |
| `{{TIMESTAMP}}` | Full timestamp | `2025-12-31T14:30:00Z` |
| `{{VERSION}}` | Version number | `1.0.0` |
| `{{DESCRIPTION}}` | Service description | `User management service` |

### PR Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{PR_NUMBER}}` | PR number | `123` |
| `{{PR_TITLE}}` | PR title | `ABC-123: Add login` |
| `{{SOURCE_BRANCH}}` | Source branch | `feature/ABC-123-login` |
| `{{TARGET_BRANCH}}` | Target branch | `main` |
| `{{FILES_CHANGED}}` | Changed file count | `15` |
| `{{INSERTIONS}}` | Lines added | `+250` |
| `{{DELETIONS}}` | Lines removed | `-50` |

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

### Creating a Jira Issue

```bash
/jira:create PROJ Story "Implement user authentication" --template story
```

Uses `jira/story.md.template` with variables substituted.

### Creating a PR

```bash
/jira:pr ABC-123 --type feature
```

Uses `pr/feature.md.template` with:
- Issue details from Jira
- Commit analysis
- File change summary
- Documentation links

### Adding Comments

Comments are auto-generated based on workflow events:
- `/jira:work ABC-123` → Uses `comments/jira-work-started.md.template`
- `/jira:pr ABC-123` → Uses `comments/jira-pr-created.md.template`
- QA transition → Uses `comments/jira-qa-ready.md.template`

### Creating Documentation

```bash
/jira:docs ABC-123 --type tdd
```

Uses `docs/tdd.md.template` and creates Confluence page.

---

## Customization

### Adding New Templates

1. Create template file with `.template` extension
2. Use `{{VARIABLE_NAME}}` for substitution
3. Add to appropriate category directory
4. Update this README
5. Add Golden Armada signature

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

---

**⚓ Golden Armada** | *You ask - The Fleet Ships*
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
- Golden Armada signature present

Run validation:
```bash
./scripts/validate-templates.sh
```

---

## Related Documentation

- [Tag System](tags/README.md)
- [Development Standards](../docs/DEVELOPMENT-STANDARDS.md)
- [Repository Structure](../docs/DEVELOPMENT-STANDARDS.md#repository-structure-standards)
- [Create Repo Command](../commands/create-repo.md)
- [PR Command](../commands/pr.md)

---

**⚓ Golden Armada** | *You ask - The Fleet Ships*
