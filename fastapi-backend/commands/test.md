---
name: test
description: Generate comprehensive pytest test suite for FastAPI endpoints with async support
argument-hint: "[endpoint_or_service] [--unit] [--integration] [--e2e]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Bash
---

# Generate FastAPI Test Suite

Generate comprehensive pytest tests for FastAPI endpoints, services, or the entire application.

## Test Types

1. **Unit Tests** - Test individual functions/methods in isolation
2. **Integration Tests** - Test service + database interaction
3. **E2E Tests** - Test full request/response cycle

## Required Information

Before generating, analyze:
1. **Target** - What to test (endpoint, service, model)
2. **Existing fixtures** - Check `conftest.py` for reusable fixtures
3. **Test patterns** - Match existing test style in project

## Fixture Template (conftest.py)

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.main import app
from app.models import User, Product  # All models

@pytest_asyncio.fixture
async def db_client():
    """MongoDB test client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(
        database=client["test_db"],
        document_models=[User, Product]
    )
    yield client
    # Cleanup
    await client.drop_database("test_db")
    client.close()

@pytest_asyncio.fixture
async def client(db_client) -> AsyncClient:
    """Async HTTP test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

@pytest_asyncio.fixture
async def auth_client(client: AsyncClient, test_user) -> AsyncClient:
    """Authenticated test client."""
    # Get token (adjust for your auth system)
    response = await client.post("/auth/login", json={
        "email": test_user.email,
        "password": "testpassword"
    })
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client

@pytest_asyncio.fixture
async def test_user(db_client):
    """Create test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed"
    )
    await user.insert()
    yield user
    await user.delete()
```

## Endpoint Test Template

```python
import pytest
from httpx import AsyncClient

class TestUserEndpoints:
    """Test suite for User endpoints."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, client: AsyncClient):
        """Test successful user creation."""
        response = await client.post("/api/v1/users/", json={
            "email": "new@example.com",
            "name": "New User",
            "password": "securepass123"
        })

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert "id" in data
        assert "password" not in data  # Password not exposed

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, client: AsyncClient, test_user):
        """Test user creation with existing email fails."""
        response = await client.post("/api/v1/users/", json={
            "email": test_user.email,
            "name": "Another User",
            "password": "password123"
        })

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_user_invalid_email(self, client: AsyncClient):
        """Test user creation with invalid email fails."""
        response = await client.post("/api/v1/users/", json={
            "email": "not-an-email",
            "name": "Test",
            "password": "password123"
        })

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_get_user_success(self, client: AsyncClient, test_user):
        """Test getting user by ID."""
        response = await client.get(f"/api/v1/users/{test_user.id}")

        assert response.status_code == 200
        assert response.json()["email"] == test_user.email

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client: AsyncClient):
        """Test getting non-existent user."""
        response = await client.get("/api/v1/users/000000000000000000000000")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_users(self, client: AsyncClient, test_user):
        """Test listing users with pagination."""
        response = await client.get("/api/v1/users/?skip=0&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_update_user_success(self, auth_client: AsyncClient, test_user):
        """Test updating user (requires auth)."""
        response = await auth_client.patch(
            f"/api/v1/users/{test_user.id}",
            json={"name": "Updated Name"}
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_user_unauthorized(self, client: AsyncClient, test_user):
        """Test updating user without auth fails."""
        response = await client.patch(
            f"/api/v1/users/{test_user.id}",
            json={"name": "Hacker"}
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_user_success(self, auth_client: AsyncClient, test_user):
        """Test deleting user."""
        response = await auth_client.delete(f"/api/v1/users/{test_user.id}")

        assert response.status_code == 204

        # Verify deleted
        get_response = await auth_client.get(f"/api/v1/users/{test_user.id}")
        assert get_response.status_code == 404
```

## Service Test Template

```python
import pytest
from app.services.user import UserService
from app.schemas.user import UserCreate, UserUpdate

class TestUserService:
    """Unit tests for UserService."""

    @pytest_asyncio.fixture
    async def service(self, db_client):
        return UserService()

    @pytest.mark.asyncio
    async def test_create_user(self, service: UserService):
        data = UserCreate(
            email="service@test.com",
            name="Service Test",
            password="password123"
        )

        user = await service.create(data)

        assert user.email == data.email
        assert user.id is not None

    @pytest.mark.asyncio
    async def test_get_by_email(self, service: UserService, test_user):
        user = await service.get_by_email(test_user.email)

        assert user is not None
        assert user.id == test_user.id

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, service: UserService):
        user = await service.get_by_email("nonexistent@test.com")

        assert user is None
```

## Running Tests

After generating tests:

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_users.py

# Run with coverage
pytest --cov=app --cov-report=html

# Run async tests
pytest -v --asyncio-mode=auto

# Run specific test class
pytest tests/test_users.py::TestUserEndpoints

# Run specific test
pytest tests/test_users.py::TestUserEndpoints::test_create_user_success
```

## Output Files

Generate at:
- `tests/test_{resource}.py` - Main test file
- `tests/conftest.py` - Shared fixtures (if not exists)
