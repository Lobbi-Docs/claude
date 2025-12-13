# FastAPI Backend Plugin for Claude Code

A comprehensive Claude Code plugin that streamlines FastAPI backend development with MongoDB/Beanie, Keycloak authentication, Docker/Kubernetes deployment, background tasks, caching, observability, and real-time features.

## Features

### 🚀 Skills (8)

| Skill | Description |
|-------|-------------|
| **fastapi-patterns** | Core async patterns, dependency injection, middleware, versioning |
| **beanie-odm** | MongoDB/Beanie ODM patterns, relationships, aggregations |
| **keycloak-fastapi** | Keycloak OIDC integration, JWT validation, RBAC |
| **fastapi-k8s** | Docker multi-stage builds, Kubernetes deployment, Helm charts |
| **fastapi-background** | Background tasks with ARQ, Celery, or Dramatiq |
| **fastapi-caching** | Redis caching patterns and strategies |
| **fastapi-observability** | Structured logging, Prometheus metrics, OpenTelemetry tracing |
| **fastapi-realtime** | WebSocket, S3 file uploads, email, notifications |

### ⚡ Commands (10)

| Command | Description |
|---------|-------------|
| `/fastapi:endpoint` | Generate complete CRUD endpoint with router, schemas, service, tests |
| `/fastapi:model` | Generate Beanie document model with indexes and validation |
| `/fastapi:test` | Generate comprehensive pytest test suite |
| `/fastapi:dev` | Start development server with hot reload |
| `/fastapi:docker` | Build and manage Docker containers |
| `/fastapi:deploy` | Deploy to Kubernetes with Helm |
| `/fastapi:task` | Generate background task (ARQ/Celery/Dramatiq) |
| `/fastapi:ws` | Generate WebSocket endpoint with rooms and auth |
| `/fastapi:migrate` | Run Beanie/MongoDB migrations |
| `/fastapi:scaffold` | Generate complete project structure |

### 🤖 Agents (4)

| Agent | Description |
|-------|-------------|
| **api-architect** | API architecture and design specialist |
| **test-generator** | Automated pytest test suite generator |
| **security-reviewer** | OWASP-focused security code reviewer |
| **performance-optimizer** | Performance analysis and optimization |

### 🪝 Hooks (3)

| Hook | Trigger | Description |
|------|---------|-------------|
| **pre-commit** | Git pre-commit | Linting, type checking, security scans |
| **post-endpoint** | Router file created | Auto-generate tests, update OpenAPI |
| **pre-deploy** | Before deployment | Full validation suite |

## Installation

```bash
# Clone or copy to your Claude Code plugins directory
cd ~/.claude/plugins
git clone https://github.com/Lobbi-Docs/claude fastapi-backend

# Or install via plugin manager
/plugin-install fastapi-backend
```

## Quick Start

### 1. Scaffold a New Project

```bash
/fastapi:scaffold myapp --template full
```

### 2. Generate an Endpoint

```bash
/fastapi:endpoint users --fields name:str,email:str --auth
```

### 3. Run Development Server

```bash
/fastapi:dev --port 8000 --reload
```

### 4. Deploy to Kubernetes

```bash
/fastapi:deploy --namespace production --values values-prod.yaml
```

## Project Structure (Domain-Driven)

```
app/
├── main.py                 # Application entry point
├── config.py               # Settings management
├── database.py             # MongoDB connection
├── core/                   # Cross-cutting concerns
│   ├── security.py         # JWT/Keycloak auth
│   ├── logging.py          # Structured logging
│   └── middleware.py       # Custom middleware
├── domains/                # Domain modules
│   └── {resource}/
│       ├── models.py       # Beanie documents
│       ├── schemas.py      # Pydantic schemas
│       ├── service.py      # Business logic
│       └── router.py       # API routes
├── services/               # Shared services
│   ├── cache.py            # Redis caching
│   ├── email.py            # Email service
│   └── storage.py          # S3 file storage
├── tasks/                  # Background tasks
└── websocket/              # WebSocket handling
```

## Technology Stack

- **Framework**: FastAPI 0.109+
- **Database**: MongoDB with Beanie ODM
- **Authentication**: Keycloak OIDC
- **Caching**: Redis with aioredis
- **Task Queue**: ARQ (recommended), Celery, or Dramatiq
- **Observability**: structlog, Prometheus, OpenTelemetry
- **Deployment**: Docker, Kubernetes, Helm
- **Testing**: pytest, pytest-asyncio, httpx

## Skills Activation

Skills are automatically activated based on context. Manual activation:

```bash
# Activate a specific skill
/skill fastapi:fastapi-patterns
```

Trigger keywords:
- "create a FastAPI endpoint" → fastapi-patterns
- "MongoDB model" → beanie-odm
- "Keycloak authentication" → keycloak-fastapi
- "deploy to Kubernetes" → fastapi-k8s
- "background task" → fastapi-background
- "Redis cache" → fastapi-caching
- "add logging" → fastapi-observability
- "WebSocket" → fastapi-realtime

## Agent Usage

```bash
# Architecture review
Use the api-architect agent to review my API structure

# Generate tests
Use the test-generator agent to create tests for the users domain

# Security audit
Use the security-reviewer agent to check for vulnerabilities

# Performance optimization
Use the performance-optimizer agent to analyze slow endpoints
```

## Configuration

### Environment Variables

```bash
# .env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=myapp
REDIS_URL=redis://localhost:6379/0

# Keycloak
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=myrealm
KEYCLOAK_CLIENT_ID=myclient

# AWS (for S3)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET=my-bucket
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Author

**Markus Ahling**
Brookside BI
markus@brooksidebi.com
