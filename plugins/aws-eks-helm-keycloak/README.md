# AWS EKS Helm Keycloak Plugin (The Conduit-Artisan)

> *"Pipeline excellence meets developer velocity."*

**The Conduit-Artisan** is a hybrid plugin combining Harness pipeline mastery with exceptional developer experience for AWS EKS deployments. It handles Helm chart deployments, Keycloak authentication, and integrates seamlessly with Harness Code repositories.

## Overview

| Aspect | Details |
|--------|---------|
| **Target User** | DevOps Engineers + Application Developers |
| **Cloud** | AWS (EKS, ECR, Secrets Manager) |
| **Orchestration** | Kubernetes (EKS) |
| **Package Manager** | Helm 3 |
| **Authentication** | Keycloak (OIDC) |
| **CI/CD** | Harness (Pipelines + Code) |

## Philosophy

This plugin combines two approaches:

1. **Pipeline-First (Conduit)**: Harness as the source of truth for all deployments
2. **Developer Experience (Artisan)**: Fast local development with production parity

## Features

### Skills (5)
- **harness-eks-deployments** - EKS deployment patterns via Harness CD
- **harness-code-integration** - Harness Code repository workflows and triggers
- **harness-keycloak-auth** - Keycloak OIDC integration with Harness
- **local-eks-development** - Local K8s with EKS parity (Kind + LocalStack)
- **helm-development** - Helm chart development and testing workflow

### Commands (6)
- `/eks:pipeline-scaffold` - Generate Harness pipeline from templates
- `/eks:service-onboard` - Onboard new service to Harness + EKS
- `/eks:dev-up` - Start local development environment
- `/eks:ship` - One-command deploy to any environment
- `/eks:preview` - Create preview environment for feature branch
- `/eks:debug` - Smart debugging for deployment issues

### Agents (3)
- **pipeline-architect** - Designs optimal Harness pipeline structures
- **deployment-strategist** - Recommends deployment strategies (rolling/canary/blue-green)
- **dev-assistant** - Helps with local development and troubleshooting

### Hooks (2)
- **pre-deploy-validation** - Validates Helm charts and security before deploy
- **keycloak-sync** - Syncs Keycloak realm on deployment

## Quick Start

### 1. Start Local Development
```bash
/eks:dev-up
```
Starts Kind cluster with EKS parity, local Keycloak, and your services.

### 2. Onboard a Service
```bash
/eks:service-onboard my-service --chart ./charts/my-service
```
Creates Harness service, environment configs, and deployment pipeline.

### 3. Deploy to Environment
```bash
/eks:ship staging
```
One-command deploy with automatic validation and monitoring.

### 4. Create Preview Environment
```bash
/eks:preview --branch feature/new-auth
```
Creates isolated namespace with unique URL for testing.

## Prerequisites

### Required Tools
```bash
# Kubernetes tools
helm version     # >= 3.0.0
kubectl version  # >= 1.25.0

# AWS CLI
aws --version    # >= 2.0.0

# Local development (optional)
kind version       # >= 0.20.0
skaffold version   # >= 2.0.0
```

### Environment Variables
```bash
# AWS
export AWS_REGION="us-west-2"
export AWS_ACCOUNT_ID="123456789012"

# Harness
export HARNESS_API_KEY="pat.xxx.xxx"
export HARNESS_ACCOUNT_ID="xxx"
export HARNESS_ORG_ID="default"
export HARNESS_PROJECT_ID="eks-deployments"

# Keycloak
export KEYCLOAK_URL="https://keycloak.example.com"
export KEYCLOAK_REALM="my-realm"
export KEYCLOAK_ADMIN_SECRET="xxx"  # For realm management
```

## Configuration

Create `.claude/eks-helm-keycloak.local.md` for project-specific settings:

```markdown
# EKS Helm Keycloak Settings

## AWS Configuration
- Region: us-west-2
- EKS Cluster: my-cluster-prod
- ECR Registry: 123456789012.dkr.ecr.us-west-2.amazonaws.com

## Harness Configuration
- Organization: my-org
- Project: eks-deployments
- Code Repo: my-app

## Keycloak Configuration
- Realm: my-realm
- Client ID Pattern: {service-name}-client
- OIDC Issuer: https://keycloak.example.com/realms/my-realm

## Environments
- dev: EKS dev cluster, Keycloak dev realm
- staging: EKS staging cluster, Keycloak staging realm
- prod: EKS prod cluster, Keycloak prod realm

## Deployment Strategy
- Default: rolling
- Production: canary with 10% initial traffic
```

## Directory Structure

```
aws-eks-helm-keycloak/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── harness-eks-deployments/
│   ├── harness-code-integration/
│   ├── harness-keycloak-auth/
│   ├── local-eks-development/
│   └── helm-development/
├── commands/
│   ├── pipeline-scaffold.md
│   ├── service-onboard.md
│   ├── dev-up.md
│   ├── ship.md
│   ├── preview.md
│   └── debug.md
├── agents/
│   ├── pipeline-architect.md
│   ├── deployment-strategist.md
│   └── dev-assistant.md
├── hooks/
│   ├── hooks.json
│   └── scripts/
├── templates/
│   ├── pipelines/
│   ├── local-stack/
│   └── charts/
├── config/
│   ├── environments.yaml
│   └── defaults.yaml
└── README.md
```

## Workflow Examples

### Feature Development Flow
```
1. /eks:dev-up                    # Start local environment
2. # Develop and test locally
3. /eks:preview                   # Create preview for review
4. # Get approval
5. /eks:ship staging              # Deploy to staging
6. /eks:ship prod                 # Deploy to production
```

### New Service Onboarding
```
1. /eks:service-onboard api-gateway --keycloak-client
2. # Creates: Harness service, pipeline, Keycloak client
3. /eks:ship dev                  # Initial deployment
```

### Production Incident
```
1. /eks:debug api-gateway --env prod
2. # Diagnoses issue, suggests fixes
3. /eks:ship prod --hotfix        # Fast-track deployment
```

## Integration with Other Plugins

- **iac-golden-architect**: Use for EKS cluster provisioning
- **jira-orchestrator**: Link deployments to Jira issues
- **team-accelerator**: Code review before deployment

## Support

- **Documentation**: See `/skills` for detailed guides
- **Issues**: https://github.com/the-Lobbi/aws-eks-helm-keycloak/issues
- **Golden Armada**: Internal platform team

---

*The Conduit-Artisan: Where pipeline excellence meets developer velocity.*
