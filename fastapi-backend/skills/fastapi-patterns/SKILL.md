---
name: FastAPI Patterns
description: This skill should be used when the user asks to "create a FastAPI endpoint", "add async route", "implement dependency injection", "create middleware", "handle exceptions", "structure FastAPI project", or mentions FastAPI patterns, routers, or API design. Provides comprehensive FastAPI development patterns with async best practices.
version: 0.1.0
---

# FastAPI Development Patterns

This skill provides production-ready FastAPI patterns emphasizing async operations, clean architecture, and scalable API design.

## Project Structure (Domain-Driven)

Organize FastAPI projects by feature domains for scalability:

```
app/
├── main.py                 # FastAPI app entry point
├── config.py               # Settings with Pydantic
├── dependencies.py         # Shared dependencies
├── domains/
│   ├── users/
│   │   ├── __init__.py
│   │   ├── router.py       # API routes
│   │   ├── models.py       # Beanie documents
│   │   ├── schemas.py      # Pydantic request/response
│   │   ├── service.py      # Business logic
│   │   └── dependencies.py # Domain-specific deps
│   ├── products/
│   └── orders/
├── core/
│   ├── security.py         # Auth utilities
│   ├── exceptions.py       # Custom exceptions
│   └── middleware.py       # Custom middleware
├── infrastructure/
│   ├── database.py         # MongoDB/Beanie setup
│   ├── cache.py            # Redis integration
│   └── storage.py          # S3 file storage
└── tests/
```

## Application Factory Pattern

Create the FastAPI app using a factory for testability:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connections
    await init_database()
    await init_cache()
    yield
    # Shutdown: Cleanup
    await close_database()
    await close_cache()

def create_app() -> FastAPI:
    app = FastAPI(
        title="API Service",
        version="1.0.0",
        lifespan=lifespan
    )

    # Register routers
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(products_router, prefix="/api/v1")

    # Add middleware
    app.add_middleware(RequestLoggingMiddleware)

    return app

app = create_app()
```

## Async Route Patterns

### Basic CRUD Endpoint

```python
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    service: UserService = Depends(get_user_service)
) -> List[UserResponse]:
    """List all users with pagination."""
    return await service.get_all(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    service: UserService = Depends(get_user_service)
) -> UserResponse:
    """Get user by ID."""
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    service: UserService = Depends(get_user_service)
) -> UserResponse:
    """Create new user."""
    return await service.create(data)
```

## Dependency Injection

### Service Dependencies

```python
from fastapi import Depends
from functools import lru_cache

@lru_cache()
def get_settings() -> Settings:
    return Settings()

async def get_db() -> AsyncGenerator[Database, None]:
    db = Database()
    try:
        yield db
    finally:
        await db.close()

def get_user_service(
    db: Database = Depends(get_db),
    settings: Settings = Depends(get_settings)
) -> UserService:
    return UserService(db, settings)
```

### Auth Dependencies

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    token = credentials.credentials
    user = await auth_service.validate_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user

def require_roles(*roles: str):
    async def role_checker(user: User = Depends(get_current_user)):
        if not any(role in user.roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker
```

## Exception Handling

### Custom Exceptions

```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, status_code: int, detail: str, error_code: str = None):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code

class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            status_code=404,
            detail=f"{resource} with id {identifier} not found",
            error_code="RESOURCE_NOT_FOUND"
        )

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "error_code": exc.error_code,
            "path": str(request.url)
        }
    )
```

## Header-Based API Versioning

```python
from fastapi import Header, HTTPException

async def get_api_version(
    accept: str = Header(default="application/vnd.api.v1+json")
) -> str:
    if "v2" in accept:
        return "v2"
    elif "v1" in accept:
        return "v1"
    return "v1"  # Default

@router.get("/resource")
async def get_resource(
    version: str = Depends(get_api_version)
):
    if version == "v2":
        return {"data": "v2 response", "version": 2}
    return {"data": "v1 response"}
```

## Request/Response Schemas

```python
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

## Additional Resources

### Reference Files

For detailed patterns and advanced techniques, consult:
- **`references/middleware-patterns.md`** - Custom middleware implementations
- **`references/testing-patterns.md`** - Pytest async testing strategies
- **`references/performance.md`** - Optimization and profiling

### Example Files

Working examples in `examples/`:
- **`examples/crud_router.py`** - Complete CRUD router
- **`examples/service_pattern.py`** - Service layer implementation
- **`examples/dependencies.py`** - Dependency injection examples
