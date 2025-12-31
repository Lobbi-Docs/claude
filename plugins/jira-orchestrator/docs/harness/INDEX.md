# Harness Platform Knowledge Index

Quick reference to all Harness documentation. Load specific files on-demand to stay within token limits.

## Expert Agents

| Agent | Description |
|-------|-------------|
| **harness-api-expert** | REST API operations, authentication, programmatic integration |
| **harness-jira-sync** | Bidirectional sync between Harness and Jira |
| **infrastructure-orchestrator** | Helm, Terraform, K8s deployments |

## Skills

| Skill | Description |
|-------|-------------|
| **harness-ci** | CI pipelines, test intelligence, caching |
| **harness-cd** | CD deployments, GitOps, rollback strategies |
| **harness-mcp** | MCP server integration for Code/PRs |
| **harness-platform** | Delegates, RBAC, connectors, secrets |

## Module Documentation

| Module | File | Description |
|--------|------|-------------|
| **Overview** | `OVERVIEW.md` | Platform hierarchy, environment setup |
| **CI** | `CI.md` | Build pipelines, test intelligence, caching |
| **CD** | `CD.md` | Deployment strategies, services, environments |
| **Code** | `CODE.md` | Repositories, PRs, code review |
| **Feature Flags** | `FEATURE-FLAGS.md` | SDK integration, targeting rules |
| **STO** | `STO.md` | Security scanning (SAST, DAST, SCA) |
| **CCM** | `CCM.md` | Cloud cost management, budgets |
| **SRM** | `SRM.md` | SLOs, error tracking |
| **Chaos** | `CHAOS.md` | Chaos engineering experiments |
| **IaCM** | `IACM.md` | Terraform workspaces, drift detection |
| **Delegates** | `DELEGATES.md` | Deployment, troubleshooting |
| **RBAC** | `RBAC.md` | Roles, permissions, service accounts |
| **Policy** | `POLICY.md` | OPA policies, governance |
| **Templates** | `TEMPLATES.md` | Step, stage, pipeline templates |
| **Secrets** | `SECRETS.md` | Vault, AWS SM, GCP SM, Azure KV |
| **API** | `API.md` | Comprehensive REST API reference (v7.0.3) |
| **Troubleshooting** | `TROUBLESHOOTING.md` | Common issues and solutions |

## Quick Lookup

```
CI/Build       → docs/harness/CI.md
CD/Deploy      → docs/harness/CD.md
PRs/Code       → docs/harness/CODE.md
Delegates      → docs/harness/DELEGATES.md
RBAC           → docs/harness/RBAC.md
Secrets        → docs/harness/SECRETS.md
Templates      → docs/harness/TEMPLATES.md
Security       → docs/harness/STO.md
Costs          → docs/harness/CCM.md
Reliability    → docs/harness/SRM.md
Chaos          → docs/harness/CHAOS.md
Terraform      → docs/harness/IACM.md
Feature Flags  → docs/harness/FEATURE-FLAGS.md
Policies/OPA   → docs/harness/POLICY.md
Troubleshoot   → docs/harness/TROUBLESHOOTING.md
```

## Environment Variables

```bash
export HARNESS_ACCOUNT_ID="your-account-id"
export HARNESS_API_KEY="your-api-key"
export HARNESS_BASE_URL="https://app.harness.io"
export HARNESS_ORG_ID="default"
export HARNESS_PROJECT_ID="your-project"
```
