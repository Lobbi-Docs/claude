# Harness Platform Overview

## Platform Hierarchy

```
Account (Root)
├── Organization 1
│   ├── Project A
│   │   ├── Pipelines
│   │   ├── Services
│   │   ├── Environments
│   │   ├── Connectors
│   │   └── Secrets
│   └── Project B
├── Organization 2
├── Connectors (account-level)
├── Secrets (account-level)
├── Delegates
└── User Management
```

## Modules

| Module | Abbrev | Purpose |
|--------|--------|---------|
| Continuous Integration | CI | Build & Test |
| Continuous Delivery | CD | Deploy |
| Code Repository | Code | Git, PRs |
| Feature Flags | FF | Progressive rollouts |
| Security Testing Orchestration | STO | Security scanning |
| Cloud Cost Management | CCM | Cost visibility |
| Service Reliability Management | SRM | SLOs, error tracking |
| Chaos Engineering | CE | Resilience testing |
| Infrastructure as Code Management | IaCM | Terraform |

## Environment Variables

```bash
# Core
export HARNESS_ACCOUNT_ID="your-account-id"
export HARNESS_API_KEY="your-api-key"
export HARNESS_BASE_URL="https://app.harness.io"

# Org & Project
export HARNESS_ORG_ID="default"
export HARNESS_PROJECT_ID="your-project"

# Delegate
export DELEGATE_NAME="harness-delegate"
export DELEGATE_TOKEN="your-delegate-token"
```

## Common Expressions

| Expression | Description |
|------------|-------------|
| `<+pipeline.name>` | Pipeline name |
| `<+pipeline.sequenceId>` | Build number |
| `<+pipeline.executionId>` | Execution UUID |
| `<+stage.name>` | Current stage |
| `<+env.name>` | Environment name |
| `<+service.name>` | Service name |
| `<+artifact.tag>` | Artifact tag |
| `<+artifact.image>` | Full image path |
| `<+secrets.getValue("name")>` | Secret value |
| `<+codebase.branch>` | Git branch |
| `<+codebase.commitSha>` | Commit SHA |

## API Base URLs

| Module | Base Path |
|--------|-----------|
| Platform | `/ng/api/` |
| Pipeline | `/pipeline/api/` |
| Code | `/code/api/v1/` |
| Feature Flags | `/cf/admin/` |
| STO | `/sto/api/` |
| CCM | `/ccm/api/` |
| Chaos | `/chaos/api/` |
