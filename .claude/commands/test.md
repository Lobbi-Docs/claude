# Run Tests

Execute the test suite for Golden Armada agents.

## Instructions

Run the appropriate test commands based on what's being tested:

### 1. Python Unit Tests

\`\`\`bash
# Run all Python tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=deployment/docker --cov-report=term-missing

# Run specific test file
python -m pytest tests/test_agent.py -v

# Run tests matching pattern
python -m pytest tests/ -k "test_health" -v
\`\`\`

### 2. Linting & Type Checks

\`\`\`bash
# Flake8 linting
python -m flake8 deployment/docker/ --max-line-length=100

# Type checking (if mypy configured)
python -m mypy deployment/docker/ --ignore-missing-imports
\`\`\`

### 3. Helm Chart Validation

\`\`\`bash
# Lint Helm chart
helm lint ./deployment/helm/golden-armada

# Template rendering test
helm template golden-armada ./deployment/helm/golden-armada --debug

# Dry run against cluster
helm install golden-armada ./deployment/helm/golden-armada -n agents --dry-run
\`\`\`

### 4. Docker Build Test

\`\`\`bash
# Build all images (no push)
docker build -f deployment/docker/claude/Dockerfile -t golden-armada/claude-agent:test deployment/docker/claude/
docker build -f deployment/docker/orchestrator/Dockerfile -t golden-armada/orchestrator:test deployment/docker/orchestrator/
\`\`\`

### 5. Integration Tests

\`\`\`bash
# Start local services
docker-compose up -d

# Wait for services
sleep 10

# Run integration tests
curl -f http://localhost:8080/health || exit 1

# Cleanup
docker-compose down
\`\`\`

## Options

- **--verbose**: Show detailed test output
- **--coverage**: Generate coverage report
- **--quick**: Run only fast unit tests
- **--integration**: Run integration tests (requires Docker)

## Expected Output

Tests should pass with no failures. Coverage target: >80%
