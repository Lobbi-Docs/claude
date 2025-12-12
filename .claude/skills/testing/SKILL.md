---
name: testing
description: Testing patterns including pytest, unittest, mocking, fixtures, and test-driven development. Activate for test writing, coverage analysis, TDD, and quality assurance tasks.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Testing Skill

Provides comprehensive testing patterns and best practices for the Golden Armada AI Agent Fleet Platform.

## When to Use This Skill

Activate this skill when working with:
- Writing unit tests
- Integration testing
- Test fixtures and mocking
- Coverage analysis
- Test-driven development
- Pytest configuration

## Quick Reference

### Pytest Commands
\`\`\`bash
# Run all tests
pytest

# Run specific file/directory
pytest tests/test_agent.py
pytest tests/unit/

# Run specific test
pytest tests/test_agent.py::test_health_endpoint
pytest -k "health"           # Match pattern

# Verbose output
pytest -v                    # Verbose
pytest -vv                   # Extra verbose
pytest -s                    # Show print statements

# Coverage
pytest --cov=src --cov-report=term-missing
pytest --cov=src --cov-report=html

# Stop on first failure
pytest -x
pytest --maxfail=3

# Parallel execution
pytest -n auto               # Requires pytest-xdist
\`\`\`

## Test Structure

\`\`\`python
# tests/test_agent.py
import pytest
from unittest.mock import Mock, patch, AsyncMock
from agent import app, AgentService

class TestHealthEndpoint:
    """Tests for /health endpoint."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client

    def test_health_returns_200(self, client):
        """Health endpoint should return 200 OK."""
        response = client.get('/health')

        assert response.status_code == 200
        assert response.json['status'] == 'healthy'

    def test_health_includes_agent_name(self, client):
        """Health response should include agent name."""
        response = client.get('/health')

        assert 'agent' in response.json
\`\`\`

## Fixtures

\`\`\`python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope='session')
def engine():
    """Create test database engine."""
    return create_engine('sqlite:///:memory:')

@pytest.fixture(scope='function')
def db_session(engine):
    """Create fresh database session for each test."""
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def sample_agent(db_session):
    """Create sample agent for testing."""
    agent = Agent(name='test-agent', type='claude')
    db_session.add(agent)
    db_session.commit()
    return agent

# Parametrized fixtures
@pytest.fixture(params=['claude', 'gpt', 'gemini'])
def agent_type(request):
    return request.param
\`\`\`

## Mocking

\`\`\`python
from unittest.mock import Mock, patch, MagicMock, AsyncMock

# Basic mock
def test_with_mock():
    mock_service = Mock()
    mock_service.process.return_value = {'status': 'ok'}
    result = handler(mock_service)
    mock_service.process.assert_called_once()

# Patch decorator
@patch('module.external_api')
def test_with_patch(mock_api):
    mock_api.fetch.return_value = {'data': 'test'}
    result = service.get_data()
    assert result == {'data': 'test'}

# Async mock
@pytest.mark.asyncio
async def test_async_function():
    mock_client = AsyncMock()
    mock_client.fetch.return_value = {'result': 'success'}
    result = await async_handler(mock_client)
    assert result['result'] == 'success'
\`\`\`

## Parametrized Tests

\`\`\`python
@pytest.mark.parametrize('input,expected', [
    ('hello', 'HELLO'),
    ('world', 'WORLD'),
    ('', ''),
])
def test_uppercase(input, expected):
    assert uppercase(input) == expected

@pytest.mark.parametrize('agent_type,expected_model', [
    ('claude', 'claude-sonnet-4-20250514'),
    ('gpt', 'gpt-4'),
    ('gemini', 'gemini-pro'),
])
def test_model_selection(agent_type, expected_model):
    agent = create_agent(agent_type)
    assert agent.model == expected_model
\`\`\`

## Coverage Configuration

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = "-v --cov=src --cov-report=term-missing --cov-fail-under=80"
markers = [
    "slow: marks tests as slow",
    "integration: marks integration tests",
]

[tool.coverage.run]
branch = true
source = ["src"]
omit = ["*/tests/*", "*/__init__.py"]
\`\`\`
