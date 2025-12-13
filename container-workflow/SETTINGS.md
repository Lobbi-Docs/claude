# Container Workflow Plugin - Settings Guide

## Overview

Configure the container-workflow plugin for your project by creating `.claude/container-workflow.local.md` in your project root. This file customizes registry settings, security scanning, versioning strategies, and CI platform preferences.

## Configuration File Location

Create your project-specific settings at:

```
<your-project>/.claude/container-workflow.local.md
```

This file is git-ignored by default to prevent committing sensitive registry URLs or environment-specific settings.

---

## Complete Settings Template

Copy this template to `.claude/container-workflow.local.md` and customize for your project:

```markdown
# Container Workflow Settings

## Project Information
- **Project Name**: my-awesome-app
- **Description**: Brief description of your application
- **Maintainer**: your-team@company.com

---

## Registry Configuration

### Primary Registry
- **Type**: ghcr (GitHub Container Registry) | dockerhub | ecr | gcr | acr
- **URL**: ghcr.io/your-org
- **Repository**: your-org/my-awesome-app
- **Authentication**: GitHub Token (GITHUB_TOKEN) | Docker Hub Token | AWS Credentials

### Secondary Registry (Optional)
- **Type**: dockerhub
- **URL**: docker.io/your-org
- **Repository**: your-org/my-awesome-app
- **Use Case**: Public mirror or multi-cloud deployment

### Registry Settings
- **Push on Build**: false (require explicit push command)
- **Auto-Tag Latest**: true (tag successful builds as 'latest')
- **Prune Old Images**: true (keep last 10 versions)

---

## Security Scanning

### Scanner Configuration
- **Primary Scanner**: trivy | grype | snyk | clair
- **Scan on Build**: true
- **Scan on Push**: true
- **Fail on**: CRITICAL (block builds/pushes on critical vulnerabilities)

### Severity Thresholds
- **Critical**: BLOCK (prevent deployment)
- **High**: WARN (report but allow)
- **Medium**: REPORT (log only)
- **Low**: IGNORE

### Scan Scope
- **OS Packages**: true
- **Language Libraries**: true (npm, pip, gem, maven, etc.)
- **Config Files**: true (Dockerfile, docker-compose)
- **Secrets Detection**: true

### Compliance
- **CIS Docker Benchmark**: enabled
- **CIS Kubernetes Benchmark**: enabled (for K8s deployments)
- **Custom Policies**: ./security-policies.rego (OPA policies)

---

## Image Versioning

### Strategy
- **Type**: semantic | calver | commit-sha | date-based

#### Semantic Versioning (Recommended)
- **Format**: v{major}.{minor}.{patch}
- **Example**: v1.2.3
- **Auto-Increment**: patch (on merge to main)
- **Pre-Release**: alpha, beta, rc (e.g., v1.2.3-alpha.1)

#### CalVer (Calendar Versioning)
- **Format**: YYYY.MM.DD-{sequence}
- **Example**: 2025.12.13-1
- **Timezone**: UTC

#### Commit SHA
- **Format**: {short-sha} or {branch}-{short-sha}
- **Example**: abc123f or main-abc123f
- **Length**: 7 characters

#### Date-Based
- **Format**: YYYYMMDD-HHMM
- **Example**: 20251213-1430

### Tag Strategy
- **Latest Tag**: true (update 'latest' tag on main branch builds)
- **Branch Tags**: true (tag with branch name: feature-auth)
- **Commit Tags**: true (tag with commit SHA)
- **Semantic Tags**: true (tag with semver if using semantic strategy)

### Tag Examples
```
my-app:latest
my-app:v1.2.3
my-app:main-abc123f
my-app:2025.12.13-1
```

---

## Build Configuration

### Multi-Architecture
- **Enabled**: true
- **Platforms**: linux/amd64, linux/arm64, linux/arm/v7
- **Builder**: docker buildx

### Build Options
- **Cache**: registry (use registry cache for faster builds)
- **Cache Registry**: ghcr.io/your-org/my-app-cache
- **Build Args**:
  - NODE_ENV=production
  - BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  - VCS_REF=$(git rev-parse --short HEAD)

### Optimization
- **Multi-Stage**: required
- **Layer Caching**: enabled
- **Build Context**: . (current directory)
- **Dockerfile**: ./Dockerfile (or ./deployment/docker/Dockerfile)
- **Dockerignore**: required

---

## Testing Configuration

### Container Tests
- **Framework**: docker-compose + pytest | jest | bats
- **Test Compose File**: ./docker-compose.test.yml
- **Run on Build**: true
- **Required Pass Rate**: 100%

### Integration Tests
- **Enabled**: true
- **Test Services**:
  - database (PostgreSQL)
  - cache (Redis)
  - api (application)
- **Health Check Timeout**: 60s
- **Cleanup**: always (remove test containers after run)

### Smoke Tests
- **Health Endpoint**: /health
- **Expected Status**: 200
- **Timeout**: 30s

---

## CI/CD Platform

### Platform
- **Type**: github-actions | gitlab-ci | azure-pipelines | jenkins | circleci

### GitHub Actions Configuration
```yaml
# .github/workflows/container.yml
trigger:
  - push to main
  - pull request to main

jobs:
  - lint-dockerfile
  - security-scan
  - build-image
  - run-tests
  - push-image (main branch only)

secrets:
  - GITHUB_TOKEN (registry push)
  - TRIVY_DB_TOKEN (vulnerability database)
```

### GitLab CI Configuration
```yaml
# .gitlab-ci.yml
stages:
  - validate
  - build
  - test
  - scan
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"
```

### Azure Pipelines Configuration
```yaml
# azure-pipelines.yml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - Docker Build
  - Trivy Scan
  - Docker Push
```

---

## Deployment Strategy

### Environments
- **Development**: auto-deploy on commit to develop
- **Staging**: auto-deploy on commit to main
- **Production**: manual approval required

### Deployment Targets
- **Type**: kubernetes | docker-compose | ecs | cloud-run | azure-container-apps

### Kubernetes Deployment
- **Namespace**: my-app-prod
- **Helm Chart**: ./deployment/helm/my-app
- **Values File**: ./deployment/helm/values-prod.yaml
- **Registry Pull Secret**: regcred

### Docker Compose Deployment
- **Compose File**: ./deployment/docker-compose.prod.yml
- **Environment File**: .env.production (not in git)
- **Restart Policy**: unless-stopped

---

## Environment Variables

### Build-Time Variables
```bash
# Registry
DOCKER_REGISTRY=ghcr.io/your-org
IMAGE_NAME=my-awesome-app

# Versioning
VERSION_STRATEGY=semantic
TAG_LATEST=true

# Scanning
TRIVY_ENABLED=true
TRIVY_SEVERITY=CRITICAL,HIGH
```

### Runtime Variables
```bash
# Application
NODE_ENV=production
LOG_LEVEL=info

# Database (use secrets, not env vars in production)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Cache
REDIS_URL=redis://cache:6379

# Feature Flags
ENABLE_METRICS=true
ENABLE_TRACING=true
```

---

## Hooks Integration

The container-workflow plugin includes pre/post hooks that automatically validate:

### Pre-Write/Edit Hooks
- ✅ Dockerfile best practices validation
- ✅ docker-compose security checks
- ✅ Secrets detection
- ✅ Base image verification
- ✅ .dockerignore coverage

### Post-Build/Deploy Hooks
- ✅ Suggest security scans after builds
- ✅ Validate service health after compose up
- ✅ Recommend tagging after registry push
- ✅ Build testing after Dockerfile changes

---

## Example Configurations

### Minimal Configuration (Startups)
```markdown
# Container Workflow Settings

## Registry
- **Primary**: docker.io/myorg

## Scanning
- **Scanner**: trivy
- **Severity**: HIGH

## Versioning
- **Strategy**: commit-sha
```

### Enterprise Configuration
```markdown
# Container Workflow Settings

## Registry
- **Primary**: ghcr.io/enterprise-org
- **Secondary**: us.gcr.io/enterprise-project
- **Push on Build**: false

## Scanning
- **Primary**: trivy
- **Secondary**: snyk
- **Fail on**: CRITICAL
- **CIS Benchmark**: enabled

## Versioning
- **Strategy**: semantic
- **Auto-Increment**: patch
- **Tag Latest**: main branch only

## CI/CD
- **Platform**: github-actions
- **Environments**: dev, staging, prod
- **Approval**: required for production
```

### Multi-Region Configuration
```markdown
# Container Workflow Settings

## Registries
- **US**: us.gcr.io/project
- **EU**: eu.gcr.io/project
- **Asia**: asia.gcr.io/project

## Versioning
- **Strategy**: calver
- **Format**: YYYY.MM.DD-{sequence}

## Deployment
- **Type**: kubernetes
- **Multi-Region**: true
- **Rollout**: canary (10%, 50%, 100%)
```

---

## Best Practices

### Registry Selection
- **GitHub Projects**: Use GHCR (ghcr.io) for tight GitHub integration
- **Public Images**: Use Docker Hub for discoverability
- **Enterprise**: Use cloud provider registry (ECR, GCR, ACR) for private images
- **Multi-Cloud**: Configure multiple registries for redundancy

### Versioning Strategy
- **Production Apps**: Use semantic versioning for clear release management
- **Microservices**: Use commit SHA for precise traceability
- **Scheduled Releases**: Use CalVer for predictable versioning
- **Development**: Use branch names for feature tracking

### Security Scanning
- **Always scan** before pushing to registries
- **Block CRITICAL** vulnerabilities in production
- **Weekly scans** of running containers
- **Keep scanners updated** for latest CVE database

### CI/CD Integration
- **Automate builds** on pull requests
- **Require scans** before merge
- **Tag releases** automatically
- **Environment promotion** through pipelines

---

## Troubleshooting

### Registry Authentication
```bash
# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Docker Hub
docker login -u USERNAME

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
```

### Build Cache Issues
```bash
# Clear build cache
docker builder prune -a

# Use no-cache build
docker build --no-cache -t my-app .
```

### Scan False Positives
```bash
# Generate ignore file
trivy image --format json my-app > scan-results.json

# Create .trivyignore
echo "CVE-2024-12345" >> .trivyignore
```

---

## Migration Guide

### From Jenkins
1. Export Jenkins pipeline
2. Convert to GitHub Actions/GitLab CI
3. Map environment variables
4. Configure registry credentials

### From Manual Builds
1. Document current build process
2. Create Dockerfile
3. Set up CI pipeline
4. Configure automated testing
5. Implement security scanning

---

## Related Documentation

- [Container Best Practices Skill](../skills/container-best-practices.md)
- [Security Scanner Agent](../agents/security-scanner.md)
- [CI Pipeline Generator Command](../commands/ci-pipeline-generate.md)
- [Hooks Configuration](./hooks/hooks.json)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/container-workflow/issues
- Documentation: https://docs.your-org.com/container-workflow
- Slack: #container-workflow

---

**Last Updated**: 2025-12-13
**Plugin Version**: 1.0.0
