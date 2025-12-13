# Zenith - Full-Stack Development & Infrastructure Automation

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)

**The Ultimate Claude Code Plugin for Modern Full-Stack Development**

Production-ready templates • Infrastructure as Code • CI/CD Automation • Cloud-Native Architecture

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Templates](#template-catalog)

</div>

---

## Overview

**Zenith** is an enterprise-grade Claude Code plugin that accelerates full-stack development from concept to production. Built for teams that demand excellence, Zenith provides battle-tested templates, automated infrastructure provisioning, and intelligent orchestration across the entire development lifecycle.

### What Makes Zenith Different?

- **Complete Stack Coverage** - Frontend (React/Vite), Backend (FastAPI), Database (PostgreSQL/MongoDB/Redis), Infrastructure (Terraform/Kubernetes/Ansible)
- **Production-Ready Templates** - Not toy examples. Real-world, battle-tested patterns used in enterprise applications
- **Intelligent Orchestration** - 15 specialized AI agents that understand your entire stack
- **Multi-Cloud Native** - Deploy to AWS, Azure, or GCP with identical workflows
- **Zero Configuration** - Sensible defaults that just work, with deep customization when needed
- **CI/CD Built-In** - GitHub Actions, GitLab CI, and Azure DevOps pipelines included

---

## Features

### 🚀 Development

| Feature | Description |
|---------|-------------|
| **FastAPI Backend** | Modern async Python APIs with OpenAPI, authentication, database integration |
| **React + Vite Frontend** | Lightning-fast React development with TypeScript, Tailwind, and modern tooling |
| **Full-Stack Monorepo** | Coordinated frontend/backend development with shared types and tooling |
| **Microservices** | Service mesh ready architecture with event-driven patterns |
| **Database Integration** | PostgreSQL, MongoDB, Redis with migrations, ORM, and connection pooling |

### ☁️ Infrastructure

| Feature | Description |
|---------|-------------|
| **Terraform Modules** | Production-grade IaC for AWS, Azure, GCP (VPC, compute, databases, storage) |
| **Kubernetes Deployment** | Helm charts, ingress, secrets management, autoscaling, monitoring |
| **Ansible Automation** | Server provisioning, configuration management, zero-downtime deployments |
| **Serverless** | AWS Lambda, Azure Functions, GCP Cloud Functions with API Gateway integration |
| **Container Orchestration** | Docker multi-stage builds, Docker Compose, registry management |

### 🔄 CI/CD

| Feature | Description |
|---------|-------------|
| **GitHub Actions** | Complete workflows for test, build, deploy with matrix strategies |
| **GitLab CI** | Pipeline templates with caching, artifacts, and multi-stage deployments |
| **Azure DevOps** | Release pipelines with approval gates and environment management |
| **Automated Testing** | Unit, integration, E2E tests with coverage reporting |
| **Security Scanning** | Dependency checking, SAST, container scanning, secret detection |

---

## Installation

### Prerequisites

Before installing Zenith, ensure you have:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Claude Code CLI** | Latest | Plugin host environment |
| **Node.js** | 18+ | Frontend development, tooling |
| **Python** | 3.11+ | Backend development |
| **Docker** | 24+ | Containerization, local development |
| **Terraform** | 1.6+ | Infrastructure provisioning (optional) |
| **kubectl** | 1.28+ | Kubernetes management (optional) |
| **Ansible** | 2.15+ | Server automation (optional) |

### Install via Claude Code

```bash
# Install from marketplace
claude plugin install fullstack-iac

# Or install from local directory
claude plugin install ./fullstack-iac

# Verify installation
claude plugin list
```

### Verify Installation

```bash
# Check available commands
claude /zenith-help

# Test with a simple scaffold
claude /scaffold-fastapi --name test-api --check-only
```

---

## Quick Start

### 1. Create a Full-Stack Application (5 minutes)

```bash
# Scaffold a complete full-stack application
claude /scaffold-fullstack \
  --name my-saas-app \
  --frontend vite-saas \
  --backend fastapi-auth \
  --database postgresql \
  --structure monorepo

# This creates:
# my-saas-app/
# ├── frontend/          # React + Vite + TypeScript + Tailwind
# ├── backend/           # FastAPI + SQLAlchemy + Alembic + JWT
# ├── infrastructure/    # Docker Compose for local dev
# └── .github/workflows/ # CI/CD pipelines
```

### 2. Add Infrastructure (10 minutes)

```bash
# Add Kubernetes deployment configuration
claude /scaffold-kubernetes \
  --app my-saas-app \
  --namespace production \
  --replicas 3 \
  --ingress nginx

# Add Terraform for AWS infrastructure
claude /scaffold-terraform \
  --provider aws \
  --region us-east-1 \
  --modules vpc,rds,eks,s3
```

### 3. Deploy to Production (15 minutes)

```bash
# Configure deployment
claude /zenith-deploy \
  --app my-saas-app \
  --environment production \
  --cloud aws \
  --region us-east-1

# This will:
# 1. Provision cloud infrastructure (Terraform)
# 2. Build and push container images
# 3. Deploy to Kubernetes cluster
# 4. Configure monitoring and alerts
# 5. Run smoke tests
```

---

## Commands Reference

Zenith provides 16 specialized commands for complete development lifecycle automation:

### Scaffolding Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/scaffold-fastapi` | Create FastAPI backend with authentication, database, testing | `--name api --auth jwt --db postgresql` |
| `/scaffold-react-vite` | Create React + Vite frontend with TypeScript, Tailwind, routing | `--name web --template saas --theme dark` |
| `/scaffold-fullstack` | Create complete monorepo with frontend + backend + infra | `--name app --frontend vite-saas --backend fastapi-auth` |
| `/scaffold-microservice` | Create microservice with API, messaging, service discovery | `--name user-service --queue rabbitmq` |
| `/scaffold-terraform` | Generate Terraform modules for multi-cloud infrastructure | `--provider aws --modules vpc,rds,eks` |
| `/scaffold-kubernetes` | Create Kubernetes manifests and Helm charts | `--app myapp --replicas 3 --ingress nginx` |
| `/scaffold-ansible` | Generate Ansible playbooks for server automation | `--target ubuntu --roles webserver,postgres` |
| `/scaffold-serverless` | Create serverless functions with API Gateway | `--provider aws --runtime python3.11 --api rest` |

### Deployment Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/zenith-deploy` | Orchestrate complete deployment to cloud environment | `--app myapp --env prod --cloud aws` |
| `/zenith-rollback` | Rollback deployment to previous version | `--app myapp --env prod --version v1.2.3` |
| `/zenith-status` | Check deployment status and health across environments | `--app myapp --all-envs` |

### CI/CD Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/scaffold-ci-github` | Create GitHub Actions workflows | `--app myapp --stages test,build,deploy` |
| `/scaffold-ci-gitlab` | Create GitLab CI pipeline | `--app myapp --runners docker` |
| `/scaffold-ci-azure` | Create Azure DevOps pipeline | `--app myapp --stages build,release` |

### Utility Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/zenith-audit` | Security audit of infrastructure and dependencies | `--app myapp --full` |
| `/zenith-help` | Show comprehensive help and examples | `--command scaffold-fastapi` |

---

## Skills Reference

Zenith includes 10 specialized skills that enhance Claude's understanding of your stack:

### Development Skills

| Skill | Activation Keywords | Capabilities |
|-------|-------------------|--------------|
| **fastapi-patterns** | `fastapi`, `pydantic`, `async`, `api` | FastAPI best practices, async patterns, dependency injection, OpenAPI, middleware, background tasks |
| **react-vite** | `react`, `vite`, `tsx`, `components` | React hooks, component patterns, Vite configuration, hot reload, build optimization, state management |
| **database-design** | `database`, `schema`, `migration`, `sql` | Schema design, migrations, indexing, query optimization, connection pooling, transactions |
| **testing-strategies** | `test`, `pytest`, `jest`, `coverage` | Unit testing, integration testing, E2E testing, mocking, fixtures, coverage analysis |

### Infrastructure Skills

| Skill | Activation Keywords | Capabilities |
|-------|-------------------|--------------|
| **terraform-modules** | `terraform`, `iac`, `aws`, `azure`, `gcp` | Module design, state management, workspaces, remote backends, provider configuration |
| **kubernetes-deploy** | `k8s`, `kubernetes`, `helm`, `pods` | Deployment strategies, service mesh, secrets management, scaling, monitoring, troubleshooting |
| **ansible-automation** | `ansible`, `playbook`, `provision` | Playbook design, roles, inventory, idempotent operations, configuration management |
| **serverless-architecture** | `lambda`, `functions`, `serverless` | Event-driven design, cold starts, API Gateway, IAM policies, deployment packages |

### Architecture Skills

| Skill | Activation Keywords | Capabilities |
|-------|-------------------|--------------|
| **fullstack-architecture** | `architecture`, `design`, `patterns` | System design, microservices vs monolith, API design, data modeling, scalability patterns |
| **microservices-patterns** | `microservices`, `service-mesh`, `events` | Service boundaries, event-driven architecture, saga patterns, distributed tracing, circuit breakers |

---

## Agents Reference

Zenith includes 15 specialized AI agents that handle complex tasks across the stack:

### Backend Agents

| Agent | Specialization | Use Cases |
|-------|---------------|-----------|
| **fastapi-expert** | FastAPI development | API design, authentication, WebSocket, background tasks, performance optimization |
| **database-architect** | Database design and optimization | Schema design, query optimization, migrations, replication, backup strategies |
| **api-security** | API security and authentication | JWT, OAuth2, RBAC, rate limiting, input validation, security headers |

### Frontend Agents

| Agent | Specialization | Use Cases |
|-------|---------------|-----------|
| **react-specialist** | React and modern frontend | Component architecture, hooks, performance, state management, accessibility |
| **vite-optimizer** | Vite build optimization | Build configuration, code splitting, tree shaking, lazy loading, caching |
| **ui-ux-designer** | UI/UX implementation | Design systems, responsive layouts, animations, accessibility, theming |

### Infrastructure Agents

| Agent | Specialization | Use Cases |
|-------|---------------|-----------|
| **terraform-engineer** | Terraform IaC | Module design, multi-cloud provisioning, state management, workspace strategies |
| **kubernetes-sre** | Kubernetes operations | Deployment strategies, scaling, monitoring, troubleshooting, security policies |
| **ansible-orchestrator** | Ansible automation | Playbook design, role development, inventory management, zero-downtime deployments |
| **cloud-architect** | Multi-cloud architecture | Cloud-native design, service selection, cost optimization, disaster recovery |

### DevOps Agents

| Agent | Specialization | Use Cases |
|-------|---------------|-----------|
| **cicd-specialist** | CI/CD pipelines | Pipeline design, test automation, deployment strategies, artifact management |
| **security-auditor** | Security and compliance | Security scanning, vulnerability assessment, compliance checks, secret management |
| **monitoring-expert** | Observability | Metrics, logging, tracing, alerting, dashboards, SLO/SLA monitoring |

### Orchestration Agents

| Agent | Specialization | Use Cases |
|-------|---------------|-----------|
| **fullstack-orchestrator** | Cross-stack coordination | Feature implementation, refactoring, debugging across frontend/backend/infrastructure |
| **deployment-manager** | Deployment orchestration | Multi-environment deployments, rollbacks, smoke tests, traffic management |

---

## Template Catalog

Zenith includes 30+ production-ready templates across 7 categories:

### Backend Templates

| Template | Stack | Features |
|----------|-------|----------|
| **fastapi-basic** | FastAPI + SQLite | REST API, basic CRUD, OpenAPI, testing framework |
| **fastapi-auth** | FastAPI + PostgreSQL + JWT | Authentication, user management, role-based access, refresh tokens |
| **fastapi-full** | FastAPI + PostgreSQL + Redis + Celery | Full production setup with caching, background tasks, rate limiting |
| **fastapi-microservice** | FastAPI + RabbitMQ + gRPC | Microservice with async messaging, service discovery, distributed tracing |

### Frontend Templates

| Template | Stack | Features |
|----------|-------|----------|
| **vite-basic** | React + Vite + TypeScript | Clean starter with routing, basic UI components |
| **vite-dashboard** | React + Vite + Tailwind + Recharts | Admin dashboard with charts, tables, forms, authentication |
| **vite-saas** | React + Vite + Tailwind + shadcn/ui | Modern SaaS UI with landing page, pricing, dashboard, authentication |

### Full-Stack Templates

| Template | Structure | Stack |
|----------|-----------|-------|
| **split** | Separate repos | FastAPI backend + React frontend with API integration |
| **monorepo** | Single repo | Turborepo/Nx setup with shared packages, unified tooling |
| **microservices** | Multi-service | API Gateway + multiple services + message queue + service mesh |

### Database Templates

| Template | Database | Features |
|----------|----------|----------|
| **postgresql** | PostgreSQL 16 | Schema, migrations, indexes, connection pool, backup scripts |
| **mongodb** | MongoDB 7 | Collections, indexes, aggregation pipelines, replica set config |
| **redis** | Redis 7 | Caching strategies, pub/sub, session management, rate limiting |

### Infrastructure Templates

| Template | Provider | Resources |
|----------|----------|-----------|
| **terraform-aws** | AWS | VPC, EC2, RDS, S3, EKS, CloudFront, Route53 |
| **terraform-azure** | Azure | VNet, VMs, Azure Database, Storage, AKS, App Gateway |
| **terraform-gcp** | GCP | VPC, Compute Engine, Cloud SQL, GCS, GKE, Cloud CDN |
| **kubernetes** | Multi-cloud | Deployment, Service, Ingress, ConfigMap, Secret, HPA |
| **ansible-server** | Linux | Web server, database, SSL, monitoring, logging, backups |

### CI/CD Pipeline Templates

| Template | Platform | Stages |
|----------|----------|--------|
| **github-actions** | GitHub | Test → Build → Security Scan → Deploy (multi-env) |
| **gitlab-ci** | GitLab | Test → Build → Package → Deploy (with approval gates) |
| **azure-devops** | Azure | Build → Test → Release (with environment management) |

### Serverless Templates

| Template | Provider | Features |
|----------|----------|----------|
| **aws-lambda** | AWS | Python/Node.js functions, API Gateway, DynamoDB, S3 triggers |
| **azure-functions** | Azure | HTTP triggers, queue triggers, Cosmos DB bindings, App Insights |
| **gcp-functions** | GCP | HTTP functions, Pub/Sub triggers, Firestore integration, Cloud Run |

---

## Configuration

Zenith can be configured at multiple levels for maximum flexibility:

### Project Configuration

Create `.zenith/config.json` in your project root:

```json
{
  "project": {
    "name": "my-saas-app",
    "type": "fullstack",
    "structure": "monorepo"
  },
  "backend": {
    "framework": "fastapi",
    "language": "python",
    "version": "3.11",
    "database": "postgresql",
    "cache": "redis",
    "authentication": "jwt"
  },
  "frontend": {
    "framework": "react",
    "bundler": "vite",
    "language": "typescript",
    "styling": "tailwind",
    "components": "shadcn-ui"
  },
  "infrastructure": {
    "cloud": "aws",
    "region": "us-east-1",
    "iac": "terraform",
    "orchestration": "kubernetes",
    "automation": "ansible"
  },
  "cicd": {
    "platform": "github-actions",
    "environments": ["dev", "staging", "production"],
    "strategies": {
      "test": "matrix",
      "deploy": "blue-green"
    }
  }
}
```

### Global Settings

Configure defaults in `~/.claude/plugins/fullstack-iac/settings.json`:

```json
{
  "defaults": {
    "cloud": "aws",
    "region": "us-east-1",
    "python_version": "3.11",
    "node_version": "20",
    "kubernetes_version": "1.28"
  },
  "preferences": {
    "include_tests": true,
    "include_docs": true,
    "include_cicd": true,
    "security_scanning": true
  },
  "credentials": {
    "aws_profile": "default",
    "azure_subscription": null,
    "gcp_project": null
  }
}
```

See [SETTINGS.md](./SETTINGS.md) for complete configuration reference.

---

## Architecture

Zenith is built on a modular architecture that ensures consistency and extensibility:

```
fullstack-iac/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata and registry
├── agents/                   # 15 specialized AI agents
│   ├── backend/
│   ├── frontend/
│   ├── infrastructure/
│   └── orchestration/
├── commands/                 # 16 slash commands
│   ├── scaffolding/
│   ├── deployment/
│   └── utilities/
├── skills/                   # 10 domain-specific skills
│   ├── development/
│   ├── infrastructure/
│   └── architecture/
├── templates/                # 30+ production templates
│   ├── backend/
│   ├── frontend/
│   ├── fullstack/
│   ├── database/
│   ├── infrastructure/
│   ├── pipelines/
│   └── serverless/
├── hooks/
│   └── hooks.json            # Pre/post tool use hooks
└── README.md                 # This file
```

---

## Use Cases

### Startup MVP (1-2 weeks)

```bash
# Day 1: Scaffold application
claude /scaffold-fullstack --name mvp --frontend vite-saas --backend fastapi-auth

# Day 2-7: Development (Claude assists with features)
# Day 8: Add infrastructure
claude /scaffold-kubernetes --app mvp
claude /scaffold-ci-github --app mvp

# Day 9: Deploy to staging
claude /zenith-deploy --app mvp --env staging --cloud aws

# Day 10-14: Testing and refinement
# Day 15: Production deployment
claude /zenith-deploy --app mvp --env production --cloud aws
```

### Enterprise Microservices (1-3 months)

```bash
# Phase 1: API Gateway + Core Services
claude /scaffold-microservice --name api-gateway
claude /scaffold-microservice --name user-service
claude /scaffold-microservice --name payment-service

# Phase 2: Infrastructure
claude /scaffold-terraform --provider aws --modules vpc,eks,rds,redis,s3
claude /scaffold-kubernetes --app enterprise --replicas 5 --hpa

# Phase 3: CI/CD
claude /scaffold-ci-gitlab --app enterprise --stages test,security,deploy

# Phase 4: Deployment
claude /zenith-deploy --app enterprise --env production --cloud aws
```

### SaaS Platform (Ongoing)

```bash
# Initial setup
claude /scaffold-fullstack --name saas --frontend vite-saas --backend fastapi-full

# Add multi-tenancy
# (Use agents for complex feature development)

# Add payment processing
# (Agents handle Stripe integration)

# Scale infrastructure
claude /scaffold-terraform --provider aws --modules vpc,rds,elasticache,cloudfront

# Continuous deployment
claude /scaffold-ci-github --app saas --stages test,build,security,deploy
```

---

## Best Practices

### Project Structure

- Use **monorepo** for small teams and rapid development
- Use **split repos** for large teams with clear service boundaries
- Use **microservices** when scaling requires independent deployment

### Development Workflow

1. **Scaffold** with appropriate template
2. **Develop** with AI-assisted agents
3. **Test** continuously (unit, integration, E2E)
4. **Deploy** to staging first
5. **Monitor** and iterate

### Infrastructure

- **Development**: Docker Compose locally
- **Staging**: Kubernetes on single node
- **Production**: Multi-node Kubernetes with autoscaling
- **Disaster Recovery**: Multi-region with automated backups

### Security

- Never commit secrets (use environment variables, secret managers)
- Enable security scanning in CI/CD
- Regular dependency updates
- Use least-privilege IAM policies
- Enable audit logging

---

## Troubleshooting

### Common Issues

**Command not found**
```bash
# Reinstall plugin
claude plugin uninstall fullstack-iac
claude plugin install fullstack-iac
```

**Template generation fails**
```bash
# Check prerequisites
python --version  # Should be 3.11+
node --version    # Should be 18+
docker --version  # Should be 24+

# Run with verbose logging
claude /scaffold-fastapi --name test --verbose
```

**Deployment fails**
```bash
# Check cloud credentials
aws sts get-caller-identity  # For AWS
az account show              # For Azure
gcloud auth list             # For GCP

# Verify cluster access
kubectl cluster-info
```

### Getting Help

- **Documentation**: Check [SETTINGS.md](./SETTINGS.md) for configuration
- **Examples**: Run `claude /zenith-help --examples` for detailed examples
- **Issues**: Report bugs at [GitHub Issues](https://github.com/Lobbi-Docs/claude/issues)
- **Discussions**: Ask questions at [GitHub Discussions](https://github.com/Lobbi-Docs/claude/discussions)

---

## Roadmap

### Version 1.1 (Q1 2025)

- [ ] GraphQL API templates
- [ ] Next.js frontend templates
- [ ] Pulumi infrastructure alternative
- [ ] AWS CDK support
- [ ] Enhanced monitoring templates (Prometheus, Grafana)

### Version 1.2 (Q2 2025)

- [ ] Mobile backend templates (BaaS)
- [ ] Real-time features (WebSocket, Server-Sent Events)
- [ ] Multi-region deployment orchestration
- [ ] Cost optimization recommendations
- [ ] Performance benchmarking tools

### Version 2.0 (Q3 2025)

- [ ] AI-powered code generation from requirements
- [ ] Automatic refactoring and optimization
- [ ] Intelligent scaling recommendations
- [ ] Disaster recovery automation
- [ ] Compliance automation (SOC2, HIPAA, GDPR)

---

## Contributing

We welcome contributions! Areas where we need help:

- **Templates**: Additional framework templates (NestJS, Django, etc.)
- **Cloud Providers**: Expanded cloud provider support
- **Documentation**: Tutorials, guides, and examples
- **Testing**: Test coverage and E2E scenarios
- **Integrations**: Additional CI/CD platforms and tools

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Credits

**Zenith** is maintained by [Markus Ahling](mailto:markus@brooksidebi.com) and built on Claude Code.

Special thanks to:
- The Anthropic team for Claude Code
- FastAPI, React, and Terraform communities
- All contributors and early adopters

---

## Support

- **Email**: markus@brooksidebi.com
- **GitHub**: [Lobbi-Docs/claude](https://github.com/Lobbi-Docs/claude)
- **Documentation**: [Full documentation in Obsidian vault](C:\Users\MarkusAhling\obsidian\Repositories\Lobbi-Docs\claude.md)

---

<div align="center">

**Built with** ❤️ **using Claude Code**

[⬆ Back to Top](#zenith---full-stack-development--infrastructure-automation)

</div>
