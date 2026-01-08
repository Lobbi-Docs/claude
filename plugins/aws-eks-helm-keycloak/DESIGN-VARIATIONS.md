# AWS EKS Helm Keycloak Plugin - Design Variations

> **Core Requirements:** AWS EKS deployments + Helm + Keycloak auth + Harness pipelines + Harness Code repos

---

## VARIATION 1: "The Sovereign" - Full-Stack Platform Plugin

### Philosophy
**Complete lifecycle ownership** from project scaffolding to production deployment. Convention-over-configuration approach with opinionated defaults. Best for greenfield projects or teams wanting full standardization.

### Identity
| Aspect | Value |
|--------|-------|
| **Archetype** | Platform Engineering Command Center |
| **Primary User** | Full-stack teams, Platform Engineers |
| **Complexity** | High (comprehensive coverage) |
| **Opinionation** | Very High (strong conventions) |
| **Learning Curve** | Medium-High (many features) |

### Plugin Structure
```
aws-eks-helm-keycloak/
├── .claude-plugin/
│   └── plugin.json
├── skills/ (8 skills)
│   ├── aws-eks-foundations/         # EKS cluster management, node groups, IRSA
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── cluster-autoscaler.md
│   │   │   ├── irsa-setup.md
│   │   │   └── networking-patterns.md
│   │   └── examples/
│   │       ├── eks-cluster.yaml
│   │       └── node-group.yaml
│   ├── helm-chart-lifecycle/        # Chart development, testing, publishing
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── chart-structure.md
│   │   │   ├── values-management.md
│   │   │   └── chart-testing.md
│   │   └── examples/
│   │       ├── microservice-chart/
│   │       └── umbrella-chart/
│   ├── keycloak-kubernetes/         # Keycloak on K8s, OIDC integration
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── realm-as-code.md
│   │   │   ├── oidc-eks-integration.md
│   │   │   └── client-patterns.md
│   │   └── examples/
│   │       ├── keycloak-helm-values.yaml
│   │       └── realm-export.json
│   ├── harness-eks-pipelines/       # EKS-specific Harness pipelines
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── eks-deployment-strategies.md
│   │   │   ├── helm-native-deployments.md
│   │   │   └── gitops-argocd.md
│   │   └── examples/
│   │       ├── rolling-deploy.yaml
│   │       ├── canary-deploy.yaml
│   │       └── blue-green-deploy.yaml
│   ├── harness-code-workflows/      # Harness Code repo management
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── branch-protection.md
│   │   │   ├── pr-pipelines.md
│   │   │   └── code-policies.md
│   │   └── examples/
│   │       └── repo-setup.yaml
│   ├── aws-secrets-integration/     # Secrets Manager, Parameter Store, Vault
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── external-secrets-operator.md
│   │       └── secrets-store-csi.md
│   ├── observability-stack/         # CloudWatch, Prometheus, Grafana
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── container-insights.md
│   │       └── prometheus-operator.md
│   └── security-compliance/         # Pod security, network policies, RBAC
│       ├── SKILL.md
│       └── references/
│           ├── pod-security-standards.md
│           └── network-policies.md
├── commands/ (15 commands)
│   ├── init.md                      # Initialize new project with full scaffolding
│   ├── cluster-create.md            # Create/manage EKS cluster
│   ├── cluster-status.md            # Cluster health and status
│   ├── chart-create.md              # Scaffold new Helm chart
│   ├── chart-lint.md                # Lint and validate chart
│   ├── chart-package.md             # Package and publish chart
│   ├── deploy.md                    # Deploy to environment
│   ├── promote.md                   # Promote between environments
│   ├── rollback.md                  # Rollback deployment
│   ├── keycloak-setup.md            # Initialize Keycloak realm/clients
│   ├── keycloak-sync.md             # Sync realm configuration
│   ├── pipeline-create.md           # Create Harness pipeline
│   ├── pipeline-run.md              # Execute pipeline
│   ├── secrets-sync.md              # Sync secrets to cluster
│   └── status.md                    # Full deployment status dashboard
├── agents/ (6 agents)
│   ├── platform-architect.md        # Designs infrastructure, reviews architecture
│   ├── helm-engineer.md             # Chart development and optimization
│   ├── keycloak-specialist.md       # Auth flows, realm configuration
│   ├── pipeline-orchestrator.md     # Harness pipeline design and troubleshooting
│   ├── security-guardian.md         # Security scanning, compliance validation
│   └── deployment-coordinator.md    # Orchestrates multi-service deployments
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── pre-deploy-validation.sh
│       ├── helm-lint.sh
│       └── security-scan.sh
├── templates/
│   ├── charts/
│   │   ├── microservice/            # Base microservice Helm chart
│   │   ├── api-gateway/             # API gateway with Keycloak
│   │   └── umbrella/                # Multi-service umbrella chart
│   ├── pipelines/
│   │   ├── build-push.yaml          # CI pipeline template
│   │   ├── deploy-eks.yaml          # CD pipeline template
│   │   ├── promote-env.yaml         # Environment promotion
│   │   └── full-release.yaml        # Complete release pipeline
│   ├── terraform/
│   │   ├── eks-cluster/             # EKS cluster module
│   │   ├── networking/              # VPC, subnets, security groups
│   │   └── keycloak-rds/            # RDS for Keycloak
│   └── keycloak/
│       ├── realm-template.json      # Base realm configuration
│       └── clients/                 # Common client configurations
├── config/
│   ├── environments.yaml            # Environment definitions
│   ├── deployment-strategies.yaml   # Strategy configurations
│   └── security-policies.yaml       # Security baseline
└── README.md
```

### Command Specifications

#### `/sovereign:init` - Project Initialization
```yaml
description: Initialize complete AWS EKS + Helm + Keycloak project
arguments:
  project_name: string (required)
  organization: string (required)
  environments: list (default: [dev, staging, prod])
  keycloak_mode: enum (managed|self-hosted) (default: self-hosted)

actions:
  - Create Harness Code repository
  - Scaffold Terraform for EKS + networking
  - Generate Helm umbrella chart structure
  - Create Keycloak realm configuration
  - Generate Harness pipelines (CI + CD)
  - Initialize GitOps structure
  - Set up branch protection rules
  - Create initial values files per environment

outputs:
  - terraform/               # Infrastructure as Code
  - charts/                  # Helm charts
  - keycloak/               # Realm exports
  - harness/                # Pipeline definitions
  - .github/ or .harness/   # CI/CD configuration
```

#### `/sovereign:deploy` - Unified Deployment
```yaml
description: Deploy services to EKS via Harness
arguments:
  environment: enum (dev|staging|prod)
  services: list (default: all)
  strategy: enum (rolling|canary|blue-green)
  dry_run: boolean (default: false)

workflow:
  1. Validate Helm charts (lint + security scan)
  2. Check Keycloak client configuration
  3. Verify secrets are synced to cluster
  4. Trigger Harness pipeline with parameters
  5. Monitor deployment progress
  6. Validate health checks
  7. Run smoke tests
  8. Update deployment dashboard
```

### Strengths
- **Complete Coverage**: Everything from infrastructure to auth in one plugin
- **Consistency**: Enforced patterns across all projects
- **Automation**: Heavy automation reduces manual steps
- **Security**: Built-in security scanning and compliance

### Weaknesses
- **Complexity**: Steep learning curve
- **Rigidity**: May not fit all project structures
- **Overhead**: Overkill for simple deployments
- **Maintenance**: Many components to keep updated

### Best For
- New platform teams establishing standards
- Organizations standardizing on AWS EKS
- Teams wanting "golden path" development

---

## VARIATION 2: "The Conduit" - Pipeline-First Plugin (Harness-Centric)

### Philosophy
**Harness as the source of truth** for all deployments. Focuses on generating, managing, and optimizing Harness pipelines. Assumes infrastructure exists, prioritizes CI/CD excellence.

### Identity
| Aspect | Value |
|--------|-------|
| **Archetype** | CI/CD Power Tool |
| **Primary User** | DevOps Engineers, Release Managers |
| **Complexity** | Medium |
| **Opinionation** | Medium (flexible pipelines) |
| **Learning Curve** | Low-Medium |

### Plugin Structure
```
harness-eks-conduit/
├── .claude-plugin/
│   └── plugin.json
├── skills/ (5 skills)
│   ├── harness-eks-deployments/     # EKS deployment patterns via Harness
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── native-helm-deploy.md
│   │   │   ├── kubernetes-direct.md
│   │   │   └── gitops-sync.md
│   │   └── examples/
│   │       └── deployment-strategies/
│   ├── harness-code-integration/    # Harness Code repository workflows
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── triggers.md
│   │       ├── branch-strategies.md
│   │       └── pr-checks.md
│   ├── harness-keycloak-auth/       # Keycloak in Harness context
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── oidc-connector.md
│   │       └── service-accounts.md
│   ├── harness-templates/           # Pipeline templates and reusability
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── template-library.md
│   │       └── input-sets.md
│   └── harness-governance/          # OPA policies, approvals, RBAC
│       ├── SKILL.md
│       └── references/
│           ├── opa-policies.md
│           └── approval-workflows.md
├── commands/ (10 commands)
│   ├── pipeline-scaffold.md         # Create pipeline from template
│   ├── pipeline-sync.md             # Sync local definitions to Harness
│   ├── pipeline-run.md              # Execute pipeline with inputs
│   ├── pipeline-status.md           # Check pipeline execution status
│   ├── pipeline-logs.md             # Stream pipeline logs
│   ├── trigger-create.md            # Create/manage triggers
│   ├── service-onboard.md           # Onboard new service to Harness
│   ├── env-setup.md                 # Configure Harness environment + infra
│   ├── connector-create.md          # Create AWS/K8s/Docker connectors
│   └── template-publish.md          # Publish reusable template
├── agents/ (4 agents)
│   ├── pipeline-architect.md        # Designs optimal pipeline structures
│   ├── deployment-strategist.md     # Recommends deployment strategies
│   ├── trigger-optimizer.md         # Optimizes triggers and automation
│   └── failure-analyst.md           # Analyzes pipeline failures
├── hooks/
│   └── hooks.json
├── templates/
│   ├── pipelines/
│   │   ├── eks-helm-rolling/
│   │   │   ├── pipeline.yaml
│   │   │   ├── stage-templates/
│   │   │   └── input-sets/
│   │   ├── eks-helm-canary/
│   │   ├── eks-helm-bluegreen/
│   │   ├── eks-gitops/
│   │   └── multi-service-release/
│   ├── services/
│   │   ├── native-helm-service.yaml
│   │   └── kubernetes-service.yaml
│   ├── environments/
│   │   ├── dev.yaml
│   │   ├── staging.yaml
│   │   └── prod.yaml
│   ├── infrastructure/
│   │   ├── eks-direct.yaml
│   │   └── eks-gitops.yaml
│   └── triggers/
│       ├── pr-trigger.yaml
│       ├── merge-trigger.yaml
│       └── artifact-trigger.yaml
├── config/
│   ├── harness-org.yaml             # Organization defaults
│   ├── connectors.yaml              # Connector templates
│   └── policies/                    # OPA policies
│       ├── deployment-window.rego
│       └── approval-required.rego
└── README.md
```

### Command Specifications

#### `/conduit:pipeline-scaffold` - Smart Pipeline Generation
```yaml
description: Generate Harness pipeline from intelligent analysis
arguments:
  name: string (required)
  type: enum (build|deploy|release|promote)
  target: enum (eks-helm|eks-k8s|eks-gitops)
  strategy: enum (rolling|canary|blue-green|none)
  environments: list (default: infer from config)
  keycloak_integration: boolean (default: true)

analysis:
  - Scan Helm charts for service definitions
  - Detect values files for environments
  - Identify Keycloak clients from realm config
  - Suggest appropriate deployment strategy
  - Generate input sets per environment

outputs:
  pipeline.yaml          # Main pipeline definition
  input-sets/            # Per-environment input sets
  stage-templates/       # Reusable stage templates (if applicable)
```

#### `/conduit:service-onboard` - Service Onboarding
```yaml
description: Onboard a new microservice to Harness for EKS deployment
arguments:
  service_name: string (required)
  helm_chart_path: string (required)
  repo: string (Harness Code repo)
  keycloak_client: string (optional)

workflow:
  1. Create Harness Service with NativeHelm
  2. Configure manifest sources from Harness Code
  3. Set up artifact source (ECR)
  4. Create environment-specific overrides
  5. Generate deployment pipeline
  6. Create PR and merge triggers
  7. Configure Keycloak client injection (if specified)
  8. Run initial deployment to dev
```

#### `/conduit:pipeline-status` - Live Status Dashboard
```yaml
description: Real-time pipeline execution monitoring
arguments:
  pipeline: string (optional, default: all active)
  environment: string (optional, filter)

displays:
  - Active executions with stage progress
  - Recent failures with quick diagnosis
  - Deployment history by environment
  - Trigger activity
  - Health of deployed services
```

### Strengths
- **Harness-Native**: Full leverage of Harness capabilities
- **Template Library**: Reusable patterns across projects
- **Flexibility**: Works with existing infrastructure
- **Fast Onboarding**: Quick service-to-deployment path

### Weaknesses
- **Harness Dependency**: Deep coupling to Harness
- **Infrastructure Gap**: Doesn't manage EKS itself
- **Limited Scope**: Focused only on CI/CD layer

### Best For
- Teams already invested in Harness
- Organizations with existing EKS clusters
- DevOps teams focused on release engineering

---

## VARIATION 3: "The Artisan" - Developer Experience Plugin (DX-Focused)

### Philosophy
**Developer productivity first**. Minimize cognitive load, maximize iteration speed. Smart defaults, local-to-cloud parity, instant feedback loops. Best for teams wanting faster development cycles.

### Identity
| Aspect | Value |
|--------|-------|
| **Archetype** | Developer Productivity Accelerator |
| **Primary User** | Application Developers |
| **Complexity** | Low |
| **Opinionation** | High (smart defaults) |
| **Learning Curve** | Very Low |

### Plugin Structure
```
eks-artisan/
├── .claude-plugin/
│   └── plugin.json
├── skills/ (4 skills)
│   ├── local-eks-development/       # Local K8s with EKS parity
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── kind-eks-parity.md
│   │       ├── localstack-aws.md
│   │       └── telepresence.md
│   ├── helm-development/            # Chart development workflow
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── values-override.md
│   │       └── chart-debugging.md
│   ├── keycloak-dev-mode/           # Local Keycloak for development
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── realm-import.md
│   │       └── test-users.md
│   └── quick-deploy/                # Fast deployment patterns
│       ├── SKILL.md
│       └── references/
│           ├── preview-environments.md
│           └── feature-branches.md
├── commands/ (8 commands)
│   ├── dev-up.md                    # Start local development environment
│   ├── dev-down.md                  # Stop local environment
│   ├── dev-logs.md                  # Stream service logs
│   ├── dev-shell.md                 # Shell into running container
│   ├── preview.md                   # Deploy preview environment
│   ├── ship.md                      # One-command deploy to environment
│   ├── hotfix.md                    # Emergency production fix workflow
│   └── debug.md                     # Debug deployment issues
├── agents/ (3 agents)
│   ├── dev-assistant.md             # Helps with local development
│   ├── deployment-guide.md          # Guides through deployments
│   └── troubleshooter.md            # Diagnoses common issues
├── hooks/
│   └── hooks.json
├── templates/
│   ├── local-stack/
│   │   ├── docker-compose.yaml      # Local K8s + Keycloak + deps
│   │   ├── kind-config.yaml         # Kind cluster config
│   │   └── skaffold.yaml            # Hot-reload development
│   ├── preview-env/
│   │   └── namespace-template.yaml
│   └── quick-charts/
│       └── simple-service/          # Minimal Helm chart
├── config/
│   ├── defaults.yaml                # Smart defaults
│   └── aliases.yaml                 # Command shortcuts
└── README.md
```

### Command Specifications

#### `/artisan:dev-up` - Local Development Environment
```yaml
description: Start complete local development environment with EKS parity
arguments:
  services: list (default: all from config)
  mode: enum (full|minimal|isolated)
  keycloak: boolean (default: true)

creates:
  - Kind cluster with EKS-like configuration
  - Local Keycloak with imported realm
  - Helm deployments of your services
  - LocalStack for AWS services (optional)
  - Telepresence for hybrid development (optional)

features:
  - Hot-reload with Skaffold
  - Port-forwarding automatically configured
  - Keycloak test users pre-seeded
  - AWS credentials mapped to LocalStack
  - Same Helm values as dev environment
```

#### `/artisan:ship` - One-Command Deploy
```yaml
description: Deploy to any environment with single command
arguments:
  environment: enum (dev|staging|prod) (default: dev)
  version: string (default: current commit)
  message: string (deployment note)

workflow:
  1. Auto-detect changed services
  2. Run quick validation (lint, security scan)
  3. Package Helm charts
  4. Push to registry (if needed)
  5. Trigger Harness pipeline
  6. Wait for deployment
  7. Run smoke tests
  8. Report status

guards:
  - Production requires approval (opens Harness for approval)
  - Staging requires passing tests
  - Dev deploys immediately
```

#### `/artisan:preview` - Preview Environment
```yaml
description: Create preview environment for feature branch
arguments:
  branch: string (default: current branch)
  ttl: string (default: 24h)

creates:
  - Isolated namespace in dev EKS
  - Helm deployment of current branch
  - Unique URL for testing
  - Keycloak client for preview
  - Auto-cleanup after TTL

outputs:
  - Preview URL
  - Keycloak login credentials
  - Log stream URL
```

#### `/artisan:debug` - Smart Debugging
```yaml
description: Intelligent deployment debugging
arguments:
  service: string (optional, auto-detect)
  environment: enum (dev|staging|prod)

analysis:
  - Check pod status and events
  - Analyze recent logs for errors
  - Verify Helm release status
  - Check Keycloak client connectivity
  - Validate secrets and config
  - Compare with working environments
  - Suggest fixes
```

### Strengths
- **Speed**: Fastest time-to-deploy
- **Simplicity**: Minimal commands to learn
- **Local Parity**: Dev matches production
- **Smart Defaults**: Works out of the box

### Weaknesses
- **Abstraction**: Hides complexity (can be limiting)
- **Customization**: Less flexible than other variants
- **Scale**: May not suit very large deployments

### Best For
- Application developers (not infra-focused)
- Teams prioritizing iteration speed
- Startups and small teams

---

## Comparison Matrix

| Feature | Sovereign (V1) | Conduit (V2) | Artisan (V3) |
|---------|---------------|--------------|--------------|
| **Commands** | 15 | 10 | 8 |
| **Skills** | 8 | 5 | 4 |
| **Agents** | 6 | 4 | 3 |
| **Learning Curve** | High | Medium | Low |
| **Infrastructure Management** | Full | None | Local only |
| **Pipeline Focus** | Part of whole | Primary | Abstracted |
| **Local Development** | Basic | None | Excellent |
| **Customization** | High | High | Medium |
| **Enterprise Features** | Full | Full | Basic |
| **Time to First Deploy** | Hours | 30 min | 5 min |
| **Maintenance Burden** | High | Medium | Low |

### Decision Matrix

| If you need... | Choose |
|----------------|--------|
| Complete platform standardization | **Sovereign** |
| Full infrastructure-to-deploy coverage | **Sovereign** |
| Harness pipeline excellence | **Conduit** |
| Work with existing EKS clusters | **Conduit** |
| Developer productivity | **Artisan** |
| Fast iteration cycles | **Artisan** |
| Local development parity | **Artisan** |
| Enterprise compliance | **Sovereign** or **Conduit** |
| Small team / startup | **Artisan** |
| Large team / platform org | **Sovereign** |

---

## Recommendation

### For Your Use Case (AWS EKS + Helm + Keycloak + Harness)

**Primary Recommendation: Hybrid Approach**

Create **Conduit (V2)** as the core with selective features from **Artisan (V3)**:

1. **Pipeline-first** because Harness is your CI/CD
2. **Add local dev** from Artisan for developer experience
3. **Terraform modules** can be separate or existing `iac-golden-architect`

```
harness-eks-keycloak/  (Hybrid V2 + V3 elements)
├── skills/
│   ├── harness-eks-deployments/     # V2: Core pipeline patterns
│   ├── harness-code-integration/    # V2: Repo workflows
│   ├── harness-keycloak-auth/       # V2: Keycloak in pipelines
│   ├── local-eks-development/       # V3: Local dev parity
│   └── helm-development/            # V3: Chart dev workflow
├── commands/
│   ├── pipeline-scaffold.md         # V2: Generate pipelines
│   ├── service-onboard.md           # V2: Onboard services
│   ├── dev-up.md                    # V3: Local environment
│   ├── ship.md                      # V3: Quick deploy
│   ├── preview.md                   # V3: Preview envs
│   └── debug.md                     # V3: Smart debugging
├── agents/
│   ├── pipeline-architect.md        # V2
│   ├── deployment-strategist.md     # V2
│   └── dev-assistant.md             # V3
└── templates/
    ├── pipelines/                   # V2: Harness pipelines
    ├── local-stack/                 # V3: Local development
    └── charts/                      # Shared: Helm templates
```

This hybrid gives you:
- **Harness expertise** (core mission)
- **Developer velocity** (practical need)
- **Not overengineered** (right-sized)

---

## Next Steps

1. **Choose a variation** or confirm hybrid approach
2. **Define priority commands** (which 3-5 commands are essential?)
3. **Identify integration points** with existing plugins
4. **Scaffold the plugin structure**

Which direction would you like to pursue?
