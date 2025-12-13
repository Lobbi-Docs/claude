---
description: Create complete full-stack project with all configurations - infrastructure, frontend, backend, CI/CD
argument-hint: "[project-name] --stack [full|api|frontend] --db [postgres|mongo|redis]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith New Project

Create a complete full-stack project scaffold with production-ready infrastructure, CI/CD, and development configurations.

## Usage
```
/zenith:new <project-name> [options]
```

## Arguments
- `project-name` - Name of the new project (required)

## Options
- `--stack <type>` - Stack template (default: full)
  - `full` - Complete full-stack (API + Frontend + Infrastructure)
  - `api` - Backend API only
  - `frontend` - Frontend only
- `--db <database>` - Database type (default: postgres)
  - `postgres` - PostgreSQL
  - `mongo` - MongoDB
  - `redis` - Redis
- `--auth <type>` - Authentication (default: jwt)
  - `jwt` - JSON Web Tokens
  - `oauth` - OAuth2/OIDC
  - `none` - No authentication
- `--cloud <provider>` - Cloud provider (default: aws)
  - `aws` - Amazon Web Services
  - `azure` - Microsoft Azure
  - `gcp` - Google Cloud Platform
- `--ci <platform>` - CI/CD platform (default: github)
  - `github` - GitHub Actions
  - `gitlab` - GitLab CI
  - `azure` - Azure DevOps

## Project Structure

### Full Stack
```
<project-name>/
├── apps/
│   ├── api/              # FastAPI backend
│   └── web/              # React/Vite frontend
├── infrastructure/
│   ├── terraform/        # Cloud infrastructure
│   ├── ansible/          # Configuration management
│   └── kubernetes/       # K8s manifests
├── .github/              # CI/CD workflows
├── docker/               # Docker configurations
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

## Examples

```bash
# Create full-stack project with PostgreSQL
/zenith:new my-app --stack full --db postgres

# Create API-only with MongoDB and OAuth
/zenith:new my-api --stack api --db mongo --auth oauth

# Create frontend with GitHub Actions
/zenith:new my-web --stack frontend --ci github

# Create full stack on Azure with Redis
/zenith:new enterprise-app --stack full --cloud azure --db redis
```

## Features

### Backend (API)
- FastAPI with async support
- Database ORM (SQLAlchemy/Motor)
- Authentication & authorization
- API documentation (OpenAPI/Swagger)
- Error handling & logging
- Environment configuration
- Docker multi-stage build

### Frontend
- React 18 with TypeScript
- Vite build system
- Routing (React Router)
- State management (Zustand)
- API client setup
- Tailwind CSS
- Component library foundation

### Infrastructure
- Terraform modules
- Kubernetes manifests
- Ansible playbooks
- Docker Compose for local dev
- Environment-specific configs

### CI/CD
- Automated testing
- Build & deployment pipelines
- Security scanning
- Docker image building
- Multi-environment support

## Agent Assignment
This command activates the **zenith-scaffolder** agent for execution.

## Prerequisites
- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- Docker installed
- Git initialized

## Post-Creation Steps
1. Configure environment variables
2. Set up database
3. Install dependencies
4. Run initial migrations
5. Start development servers
