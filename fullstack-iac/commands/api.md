---
description: Scaffold FastAPI backend with production features - auth, database, API docs, Docker
argument-hint: "[name] --auth [jwt|oauth] --db [postgres|mongo]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith API Scaffold

Scaffold a production-ready FastAPI backend with authentication, database integration, and deployment configurations.

## Usage
```
/zenith:api <name> [options]
```

## Arguments
- `name` - API service name (required)

## Options
- `--auth <type>` - Authentication method (default: jwt)
  - `jwt` - JSON Web Tokens with refresh tokens
  - `oauth` - OAuth2/OIDC (supports multiple providers)
  - `apikey` - API key authentication
  - `none` - No authentication
- `--db <database>` - Database type (default: postgres)
  - `postgres` - PostgreSQL with SQLAlchemy
  - `mongo` - MongoDB with Motor (async)
  - `mysql` - MySQL with SQLAlchemy
  - `sqlite` - SQLite (dev only)
- `--cache <type>` - Caching layer (optional)
  - `redis` - Redis cache
  - `memcached` - Memcached
- `--messaging <type>` - Message queue (optional)
  - `rabbitmq` - RabbitMQ
  - `redis` - Redis pub/sub
- `--monitoring` - Add monitoring stack (Prometheus/Grafana)

## Project Structure
```
<name>/
├── app/
│   ├── api/              # API routes
│   │   ├── v1/          # API version 1
│   │   └── deps.py      # Dependencies
│   ├── core/            # Core configuration
│   │   ├── config.py    # Settings
│   │   ├── security.py  # Auth logic
│   │   └── database.py  # DB connection
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   └── main.py          # Application entry
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── alembic/             # Database migrations
├── docker/
│   ├── Dockerfile       # Production image
│   └── Dockerfile.dev   # Development image
├── .env.example         # Environment template
├── pyproject.toml       # Dependencies
└── README.md
```

## Features

### Authentication
- JWT with access/refresh tokens
- Password hashing (bcrypt)
- OAuth2 password flow
- API key management
- Role-based access control (RBAC)

### Database
- Async database operations
- Migration management (Alembic)
- Connection pooling
- Health checks
- Automated backups

### API Features
- OpenAPI/Swagger docs
- Automatic request validation
- Error handling middleware
- CORS configuration
- Rate limiting
- Request logging

### Development
- Hot reload
- Development dependencies
- Pre-commit hooks
- Code formatting (Black, isort)
- Linting (Ruff)

### Production
- Multi-stage Docker build
- Environment-based config
- Gunicorn/Uvicorn workers
- Health/readiness endpoints
- Structured logging

## Examples

```bash
# Basic API with JWT and PostgreSQL
/zenith:api user-service --auth jwt --db postgres

# API with OAuth and MongoDB
/zenith:api content-api --auth oauth --db mongo

# API with Redis cache and monitoring
/zenith:api payment-service --db postgres --cache redis --monitoring

# Minimal API without auth
/zenith:api public-api --auth none --db sqlite
```

## Generated Endpoints

### Core
- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /docs` - API documentation
- `GET /openapi.json` - OpenAPI schema

### Authentication (if enabled)
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Current user

### Example Resource
- `GET /api/v1/items` - List items
- `POST /api/v1/items` - Create item
- `GET /api/v1/items/{id}` - Get item
- `PUT /api/v1/items/{id}` - Update item
- `DELETE /api/v1/items/{id}` - Delete item

## Agent Assignment
This command activates the **zenith-api-builder** agent for execution.

## Prerequisites
- Python 3.11+
- Poetry or pip
- Docker (for containerization)

## Post-Creation Steps
1. `cd <name>`
2. `poetry install` or `pip install -r requirements.txt`
3. Configure `.env` from `.env.example`
4. `alembic upgrade head` (run migrations)
5. `uvicorn app.main:app --reload` (start dev server)
