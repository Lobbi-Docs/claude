---
name: test
description: Run container integration tests with automated test generation
argument-hint: [service-name] [--compose-file <path>]
allowed-tools: [Bash, Read, Write, Grep, Glob]
---

# Instructions for Claude: Container Integration Testing

You are helping the user test containerized services. Follow these steps:

## 1. Parse Arguments

Extract from the user's request:
- **service-name**: Optional. Specific service to test (e.g., `api`, `web`)
- **--compose-file**: Optional. Path to docker-compose file (default: `docker-compose.yml`)

## 2. Locate Configuration

Find the compose file:
- Check specified path if provided
- Search for `docker-compose.yml`, `docker-compose.yaml`
- Check `docker-compose.test.yml` for test-specific configuration

Read and parse the compose file to understand:
- Services defined
- Ports exposed
- Dependencies between services
- Health checks configured
- Environment variables needed

## 3. Determine Test Strategy

Based on the service type, identify appropriate tests:

### Web Services (nginx, apache)
- HTTP endpoint availability (curl/wget)
- Response status codes (200, 404, etc.)
- Static file serving
- SSL/TLS configuration

### API Services (node, python, go)
- Health/readiness endpoints (`/health`, `/ready`)
- API endpoint responses
- Authentication flows
- Response time benchmarks

### Databases (postgres, mysql, mongodb)
- Connection establishment
- Basic queries (SELECT 1, ping)
- Data persistence
- Replication status (if applicable)

### Message Queues (redis, rabbitmq, kafka)
- Connection test
- Publish/subscribe
- Message persistence
- Queue operations

### Background Workers
- Job processing
- Queue consumption
- Error handling

## 4. Generate Test Script

Create a comprehensive test script at `./container-tests.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Starting container integration tests..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_wait=30

    info "Waiting for $service on port $port..."
    for i in $(seq 1 $max_wait); do
        if nc -z localhost $port 2>/dev/null; then
            pass "$service is ready"
            return 0
        fi
        sleep 1
    done
    fail "$service failed to start after ${max_wait}s"
    return 1
}

# HTTP endpoint test
test_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" -eq "$expected_status" ]; then
        pass "HTTP $url returned $status"
    else
        fail "HTTP $url returned $status (expected $expected_status)"
    fi
}

# Database connection test
test_db_connection() {
    local db_type=$1
    case $db_type in
        postgres)
            if PGPASSWORD=password psql -h localhost -U user -d dbname -c "SELECT 1" > /dev/null 2>&1; then
                pass "PostgreSQL connection successful"
            else
                fail "PostgreSQL connection failed"
            fi
            ;;
        mysql)
            if mysql -h localhost -u user -ppassword -e "SELECT 1" > /dev/null 2>&1; then
                pass "MySQL connection successful"
            else
                fail "MySQL connection failed"
            fi
            ;;
        mongodb)
            if mongosh --host localhost --eval "db.runCommand({ping:1})" > /dev/null 2>&1; then
                pass "MongoDB connection successful"
            else
                fail "MongoDB connection failed"
            fi
            ;;
    esac
}

# Add service-specific tests here
# [Generated based on compose file analysis]

# Cleanup and report
cleanup() {
    info "Stopping containers..."
    docker-compose -f <compose-file> down
}
trap cleanup EXIT

# Summary
echo ""
echo "================================"
echo "Test Results:"
echo "  Passed: $TESTS_PASSED"
echo "  Failed: $TESTS_FAILED"
echo "================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
```

## 5. Add Service-Specific Tests

Based on the compose file analysis, add specific tests:

### Example: Web Service
```bash
# Test web service
info "Testing web service..."
wait_for_service "web" 8080
test_http_endpoint "http://localhost:8080" 200
test_http_endpoint "http://localhost:8080/health" 200
test_http_endpoint "http://localhost:8080/api/users" 200
```

### Example: Database
```bash
# Test database
info "Testing database..."
wait_for_service "postgres" 5432
test_db_connection "postgres"

# Test data persistence
info "Testing data persistence..."
docker-compose exec -T db psql -U user -d dbname -c "CREATE TABLE test (id INT);"
docker-compose restart db
sleep 5
if docker-compose exec -T db psql -U user -d dbname -c "\dt" | grep -q "test"; then
    pass "Data persisted after restart"
else
    fail "Data lost after restart"
fi
```

### Example: API Service
```bash
# Test API service
info "Testing API service..."
wait_for_service "api" 3000

# Test endpoints
test_http_endpoint "http://localhost:3000/health" 200
test_http_endpoint "http://localhost:3000/api/v1/status" 200

# Test authentication
token=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' | jq -r '.token')

if [ -n "$token" ] && [ "$token" != "null" ]; then
    pass "Authentication successful"
else
    fail "Authentication failed"
fi

# Test authenticated endpoint
status=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3000/api/v1/protected \
    -H "Authorization: Bearer $token")
if [ "$status" -eq 200 ]; then
    pass "Protected endpoint accessible with token"
else
    fail "Protected endpoint returned $status"
fi
```

## 6. Spin Up Test Environment

Start the containers:

```bash
# Clean slate
docker-compose -f <compose-file> down -v

# Build images
docker-compose -f <compose-file> build

# Start services
docker-compose -f <compose-file> up -d

# Wait for initialization
sleep 5
```

## 7. Run Tests

Execute the test script:

```bash
chmod +x container-tests.sh
./container-tests.sh
```

Capture and display output in real-time.

## 8. Analyze Results

Parse test output and report:
- **Total tests**: Count
- **Passed**: Green count
- **Failed**: Red count with details
- **Duration**: Test execution time

If failures occur:
1. Show failed test details
2. Suggest debugging commands:
   ```bash
   # View service logs
   docker-compose logs <service-name>

   # Check service status
   docker-compose ps

   # Inspect container
   docker-compose exec <service> sh
   ```

## 9. Cleanup

Stop and remove containers:

```bash
docker-compose -f <compose-file> down -v
```

Ask user: "Keep containers running for debugging?" (if tests failed)

## 10. Generate Test Report

Create `test-results.md`:

```markdown
# Container Integration Test Results

**Date**: 2024-01-15 14:30:00
**Compose File**: docker-compose.yml
**Services Tested**: web, api, db

## Summary

- ✅ Passed: 12
- ❌ Failed: 2
- ⏱️ Duration: 45s

## Test Details

### Web Service
- ✅ Service started successfully
- ✅ HTTP endpoint accessible (200)
- ✅ Health check passing

### API Service
- ✅ Service started successfully
- ✅ Health endpoint (200)
- ❌ Authentication failed - invalid token
- ✅ Protected endpoint (401 without auth)

### Database
- ✅ Connection successful
- ✅ Query execution
- ❌ Data persistence - table not found after restart

## Failed Tests

### 1. API Authentication
**Error**: Token returned null
**Logs**:
```
[api] Error: Invalid credentials for user 'test'
```
**Suggestion**: Check test credentials match seeded database

### 2. Database Persistence
**Error**: Table 'test' not found after restart
**Suggestion**: Verify volume mount for data directory

## Recommendations

1. Fix authentication by updating test credentials
2. Ensure database volume is correctly mounted
3. Add integration test for inter-service communication
```

## Example Interaction

**User**: "Test my docker-compose setup"

**You**:
1. Find `docker-compose.yml`
2. Parse: 3 services (web, api, postgres)
3. Generate test script with:
   - Web HTTP tests
   - API endpoint tests
   - Database connection tests
4. Spin up: `docker-compose up -d`
5. Run tests: `./container-tests.sh`
6. Report: 10/12 passed, 2 failed (authentication, persistence)
7. Show failure details and debugging suggestions
8. Create `test-results.md`
9. Cleanup containers

## Error Handling

- **Compose file not found**: Ask for location
- **Services fail to start**: Show logs, suggest fixes
- **Port conflicts**: Detect and suggest alternative ports
- **Network issues**: Check Docker daemon, network drivers
- **Volume permission errors**: Suggest permission fixes

## Important Notes

- Always use a clean environment (`down -v` first)
- Wait adequately for services to initialize
- Test both success and failure scenarios
- Provide actionable debugging steps for failures
- Save test results for CI/CD integration
