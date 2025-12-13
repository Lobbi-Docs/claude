---
name: scaffold
description: Generate a complete FastAPI project structure with best practices
argument-hint: "[project_name] [--template full|minimal|api-only] [--auth] [--db mongo]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# Scaffold FastAPI Project

Generate a complete FastAPI project with best practices, including directory structure, configuration, and boilerplate code.

## Project Templates

### Full Template (Recommended)
Complete setup with all features: API, database, auth, caching, tasks, tests.

### Minimal Template
Basic API setup with essential configuration only.

### API-Only Template
Pure API without database or authentication.

## Full Project Structure

```
{project_name}/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── config.py               # Settings/configuration
│   ├── database.py             # Database connection
│   │
│   ├── core/                   # Core functionality
│   │   ├── __init__.py
│   │   ├── security.py         # Auth/JWT handling
│   │   ├── logging.py          # Logging setup
│   │   ├── exceptions.py       # Custom exceptions
│   │   └── middleware.py       # Custom middleware
│   │
│   ├── domains/                # Domain-driven modules
│   │   └── {resource}/
│   │       ├── __init__.py
│   │       ├── models.py       # Beanie documents
│   │       ├── schemas.py      # Pydantic schemas
│   │       ├── service.py      # Business logic
│   │       └── router.py       # API routes
│   │
│   ├── routes/                 # Route aggregation
│   │   ├── __init__.py
│   │   ├── api.py              # API router
│   │   └── health.py           # Health endpoints
│   │
│   ├── services/               # Shared services
│   │   ├── __init__.py
│   │   ├── cache.py            # Redis cache
│   │   ├── email.py            # Email service
│   │   └── storage.py          # S3/file storage
│   │
│   ├── tasks/                  # Background tasks
│   │   ├── __init__.py
│   │   └── worker.py           # Task worker config
│   │
│   ├── websocket/              # WebSocket handling
│   │   ├── __init__.py
│   │   └── manager.py
│   │
│   └── migrations/             # Database migrations
│       ├── __init__.py
│       └── runner.py
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Test fixtures
│   ├── test_health.py
│   └── domains/
│       └── test_{resource}.py
│
├── scripts/
│   ├── migrate.py              # Migration CLI
│   └── seed.py                 # Data seeding
│
├── deployment/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.dev
│   │   └── docker-compose.yml
│   └── helm/
│       └── {project}/
│           ├── Chart.yaml
│           ├── values.yaml
│           └── templates/
│
├── .env.example
├── .gitignore
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

## Core Files

### main.py

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db, close_db
from app.core.logging import setup_logging
from app.core.middleware import RequestLoggingMiddleware
from app.routes import api_router, health_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # Startup
    setup_logging(settings.log_level)
    await init_db()
    yield
    # Shutdown
    await close_db()

def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan
    )

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    # Routes
    app.include_router(health_router)
    app.include_router(api_router, prefix="/api/v1")

    return app

app = create_app()
```

### config.py

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    """Application settings."""

    # App
    app_name: str = "FastAPI App"
    version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "myapp"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth (Keycloak)
    keycloak_server_url: str = ""
    keycloak_realm: str = ""
    keycloak_client_id: str = ""

    # CORS
    cors_origins: List[str] = ["*"]

    # AWS (optional)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### database.py

```python
# app/database.py
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# Global client
_client: Optional[AsyncIOMotorClient] = None

async def init_db():
    """Initialize database connection."""
    global _client

    _client = AsyncIOMotorClient(settings.mongodb_url)

    # Import all document models
    from app.domains.users.models import User
    # Add more models as needed

    await init_beanie(
        database=_client[settings.database_name],
        document_models=[
            User,
            # Add more models
        ]
    )

    logger.info("database_connected", database=settings.database_name)

async def close_db():
    """Close database connection."""
    global _client
    if _client:
        _client.close()
        logger.info("database_disconnected")

def get_db():
    """Get database instance."""
    if _client:
        return _client[settings.database_name]
    raise RuntimeError("Database not initialized")
```

### security.py

```python
# app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from functools import lru_cache
from typing import Optional
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()
security = HTTPBearer()

class TokenUser:
    """Authenticated user from JWT."""
    def __init__(self, token_data: dict):
        self.id = token_data.get("sub")
        self.email = token_data.get("email")
        self.roles = token_data.get("realm_access", {}).get("roles", [])

    def has_role(self, role: str) -> bool:
        return role in self.roles

@lru_cache(maxsize=1)
def get_jwks():
    """Fetch JWKS from Keycloak."""
    url = f"{settings.keycloak_server_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/certs"
    response = httpx.get(url)
    return response.json()

def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        jwks = get_jwks()
        header = jwt.get_unverified_header(token)
        key = next(k for k in jwks["keys"] if k["kid"] == header["kid"])

        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.keycloak_client_id,
            issuer=f"{settings.keycloak_server_url}/realms/{settings.keycloak_realm}"
        )
    except Exception as e:
        logger.warning("token_decode_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenUser:
    """Get current authenticated user."""
    token_data = decode_token(credentials.credentials)
    return TokenUser(token_data)

def require_role(role: str):
    """Dependency to require a specific role."""
    async def role_checker(user: TokenUser = Depends(get_current_user)):
        if not user.has_role(role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return user
    return role_checker
```

## Configuration Files

### pyproject.toml

```toml
[project]
name = "{project_name}"
version = "0.1.0"
description = "FastAPI application"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "beanie>=1.25.0",
    "motor>=3.3.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.26.0",
    "redis>=5.0.0",
    "structlog>=24.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.26.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py311"
```

### requirements.txt

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
beanie>=1.25.0
motor>=3.3.0
python-jose[cryptography]>=3.3.0
httpx>=0.26.0
redis>=5.0.0
structlog>=24.1.0
arq>=0.25.0
boto3>=1.34.0
jinja2>=3.1.0
```

### .env.example

```bash
# Application
APP_NAME=FastAPI App
DEBUG=true
ENVIRONMENT=development
LOG_LEVEL=debug

# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=myapp_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# Keycloak
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=myrealm
KEYCLOAK_CLIENT_ID=myclient

# AWS (optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=
```

### .gitignore

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
.venv/
ENV/

# Testing
.pytest_cache/
.coverage
htmlcov/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local
*.env

# Build
dist/
build/
*.egg-info/

# Logs
*.log
logs/
```

## Generation Commands

```bash
# Create project directory
mkdir {project_name}
cd {project_name}

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Copy .env.example to .env
cp .env.example .env

# Run development server
uvicorn app.main:app --reload
```

## Post-Scaffold Checklist

After scaffolding:
1. [ ] Update `.env` with actual values
2. [ ] Configure Keycloak realm and client
3. [ ] Create initial domain module
4. [ ] Run initial migration
5. [ ] Verify health endpoint works
6. [ ] Set up CI/CD pipeline
