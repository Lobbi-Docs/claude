---
description: Create full-stack monorepo with multiple services - API, web, admin, mobile
argument-hint: "[name] --services [api,web,admin]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith Monorepo

Create a production-ready monorepo with multiple services, shared packages, and unified tooling.

## Usage
```
/zenith:monorepo <name> [options]
```

## Arguments
- `name` - Monorepo name (required)

## Options
- `--services <list>` - Services to include (comma-separated)
  - `api` - Backend API (FastAPI)
  - `web` - Web frontend (React)
  - `admin` - Admin dashboard
  - `mobile` - Mobile app (React Native)
  - `docs` - Documentation site
- `--packages <list>` - Shared packages (comma-separated)
  - `shared` - Shared types/utils
  - `ui` - UI component library
  - `config` - Shared configs
- `--tool <manager>` - Monorepo tool (default: turborepo)
  - `turborepo` - Turborepo
  - `nx` - Nx monorepo
  - `lerna` - Lerna
- `--db <database>` - Database for API (default: postgres)
- `--cloud <provider>` - Cloud provider (default: aws)

## Project Structure
```
<name>/
├── apps/
│   ├── api/              # FastAPI backend
│   ├── web/              # React web app
│   ├── admin/            # Admin dashboard
│   ├── mobile/           # React Native app
│   └── docs/             # Documentation
├── packages/
│   ├── shared/           # Shared types & utils
│   ├── ui/               # Component library
│   ├── config/           # ESLint, TS configs
│   └── database/         # Database models
├── infrastructure/
│   ├── terraform/        # Cloud infrastructure
│   ├── kubernetes/       # K8s manifests
│   └── docker/           # Dockerfiles
├── .github/
│   └── workflows/        # CI/CD pipelines
├── scripts/              # Build/deploy scripts
├── turbo.json           # Turborepo config
├── package.json         # Root package.json
└── README.md
```

## Features

### Monorepo Management
- Turborepo/Nx for task orchestration
- Workspace-based dependency management
- Shared configuration
- Incremental builds
- Remote caching

### Services

#### API Service
- FastAPI with async support
- Database integration
- Authentication
- API versioning
- OpenAPI docs

#### Web Service
- React + TypeScript
- Vite build system
- Shared UI components
- API client integration
- SSR ready

#### Admin Service
- Admin dashboard
- User management
- Analytics
- Settings
- RBAC integration

#### Mobile Service (optional)
- React Native
- Expo integration
- Shared business logic
- Native builds

### Shared Packages

#### shared
- TypeScript types
- Utility functions
- Constants
- Validators

#### ui
- Component library
- Storybook
- Theme system
- Icons

#### config
- ESLint configs
- TypeScript configs
- Prettier configs
- Jest configs

### Infrastructure
- Unified deployment
- Service discovery
- Load balancing
- Monitoring
- Logging

## Examples

```bash
# Full-stack monorepo with API and web
/zenith:monorepo my-platform --services api,web --packages shared,ui

# Enterprise monorepo with admin
/zenith:monorepo enterprise --services api,web,admin --packages shared,ui,config

# Mobile + web monorepo
/zenith:monorepo mobile-app --services api,web,mobile --packages shared,ui

# Complete platform with docs
/zenith:monorepo saas-platform --services api,web,admin,docs --packages shared,ui,config
```

## Workspace Scripts

### Development
```bash
# Start all services
npm run dev

# Start specific service
npm run dev --filter=web

# Start API only
npm run dev --filter=api
```

### Build
```bash
# Build all services
npm run build

# Build specific service
npm run build --filter=web
```

### Testing
```bash
# Test all packages
npm run test

# Test specific package
npm run test --filter=shared
```

### Linting
```bash
# Lint all code
npm run lint

# Format all code
npm run format
```

## Service Ports (Default)
- API: `http://localhost:8000`
- Web: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Mobile: Expo DevTools
- Docs: `http://localhost:4000`

## Deployment

### Docker Compose (Local)
```bash
docker-compose up
```

### Kubernetes
```bash
# Deploy all services
kubectl apply -k infrastructure/kubernetes/overlays/dev
```

### Individual Services
```bash
# Build and push API
docker build -t registry/api:latest -f apps/api/Dockerfile .
docker push registry/api:latest
```

## Agent Assignment
This command activates the **zenith-monorepo-builder** agent for execution.

## Prerequisites
- Node.js 18+
- Python 3.11+ (for API)
- Docker
- Kubernetes (for deployment)

## Post-Creation Steps
1. `cd <name>`
2. `npm install` (install all dependencies)
3. Configure environment variables for each service
4. Set up database
5. `npm run dev` (start all services)

## CI/CD
- Automated testing for all packages
- Build caching
- Affected service detection
- Parallel builds
- Multi-service deployment
