# Container Workflow Plugin

Comprehensive Docker/Container workflow automation for Claude Code. Streamline your container development lifecycle with intelligent automation for building, testing, reviewing, and releasing containerized applications.

## Features

### Workflow Automation
- **CI/CD Pipeline**: Build optimized images, push to registries, deploy containers
- **Code Review**: Analyze Dockerfiles and compose files for best practices
- **Testing**: Generate and run container integration tests
- **Release Management**: Semantic versioning, changelog generation, tagging

### Security First
- **Vulnerability Scanning**: Trivy-based CVE detection
- **Secrets Auditing**: Detect hardcoded credentials
- **Compliance Checking**: CIS Docker Benchmark validation

### Multi-Platform Support
- **Registries**: Docker Hub, GitHub Container Registry (ghcr.io), AWS ECR
- **CI Platforms**: GitHub Actions, GitLab CI, Azure Pipelines

## Installation

```bash
# Install via Claude Code plugin manager
claude plugin install container-workflow

# Or add to your project
cp -r container-workflow/ .claude-plugin/
```

## Commands

| Command | Description |
|---------|-------------|
| `/container:build` | Build optimized Docker images |
| `/container:deploy` | Deploy to registry/environment |
| `/container:review` | Analyze Dockerfile/compose files |
| `/container:test` | Run container integration tests |
| `/container:release` | Create versioned release with changelog |
| `/container:scan` | Security vulnerability scanning |

## Agents

The plugin includes 15 specialized agents that proactively assist with container workflows:

### Build & Deploy
- `dockerfile-reviewer` - Dockerfile best practices
- `compose-analyzer` - docker-compose analysis
- `image-optimizer` - Image size optimization
- `multi-stage-architect` - Multi-stage build design
- `registry-manager` - Registry operations

### Testing & Quality
- `container-test-generator` - Test generation
- `health-check-designer` - Health probe design
- `volume-mapper` - Volume optimization

### Security
- `security-scanner` - CVE scanning
- `secrets-auditor` - Credential detection
- `compliance-checker` - CIS benchmark validation

### CI/CD & Release
- `release-manager` - Versioning and changelog
- `ci-pipeline-generator` - CI config generation
- `deployment-strategist` - Deployment planning
- `environment-configurator` - Environment management

## Skills

- **container-best-practices**: Auto-activated knowledge for Dockerfile optimization, multi-stage builds, and container patterns
- **container-security**: Security hardening, vulnerability patterns, and compliance guidance

## Configuration

### Project Settings

Create `.claude/container-workflow.local.md` in your project root for customized settings:

```bash
# Copy the example template
cp .claude-container-workflow.local.example.md .claude/container-workflow.local.md

# Edit for your project
vim .claude/container-workflow.local.md
```

**Minimal Configuration:**
```markdown
# Container Workflow Settings

## Registry
- **Primary**: ghcr.io/your-org
- **Repository**: your-org/my-app

## Scanning
- **Scanner**: trivy
- **Severity Threshold**: HIGH

## Versioning
- **Strategy**: semantic
- **Tag Format**: v{major}.{minor}.{patch}
```

For complete configuration options, see [SETTINGS.md](./SETTINGS.md)

### Automated Hooks

The plugin includes intelligent hooks that validate your work:

**Pre-Tool Hooks** (before file changes):
- Dockerfile best practices validation
- docker-compose security checks
- Hardcoded secrets detection
- Base image security verification

**Post-Tool Hooks** (after commands):
- Security scanning recommendations after builds
- Health check validation after compose up
- Tagging suggestions after registry pushes
- Compliance validation after deployments

Hook configuration: [hooks/hooks.json](./hooks/hooks.json)

## Prerequisites

- Docker installed and running
- Trivy for security scanning (`brew install trivy` or equivalent)
- Registry credentials configured (if pushing images)

## License

MIT
