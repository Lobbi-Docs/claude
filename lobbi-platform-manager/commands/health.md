---
description: Check health status of all 8 platform services
argument-hint: "[--service SERVICE] [--verbose]"
allowed-tools: ["Bash", "Read", "Grep"]
---

Check the health status of all services in the keycloak-alpha platform including service availability, response times, port status, and dependency validation.

## Your Task

You are performing a comprehensive health check of the Lobbi platform's 8 microservices. Verify each service is running, responding correctly, and all dependencies are available.

## Arguments

- `--service` (optional): Check specific service only (keycloak, mongodb, postgres, redis, api-gateway, membership, payment, web)
- `--verbose` (optional): Show detailed health information including logs and metrics

## Platform Services

The keycloak-alpha platform consists of 8 services:

1. **keycloak** - Authentication service (port 8080)
2. **mongodb** - NoSQL database (port 27017)
3. **postgres** - SQL database (port 5432)
4. **redis** - Cache and session store (port 6379)
5. **api-gateway** - API gateway and router (port 5000)
6. **membership** - Membership service (port 5001)
7. **payment** - Payment service (port 5002)
8. **web** - React frontend (port 3000)

## Steps to Execute

### 1. Check Docker Containers Status

```bash
docker-compose ps
```

Parse output to determine which services are running.

### 2. For Each Service, Perform Health Checks

#### Keycloak (port 8080)
- Check container status: `docker-compose ps keycloak`
- HTTP health check:
  ```bash
  curl -f http://localhost:8080/health/ready
  ```
- Measure response time
- Check admin console accessibility:
  ```bash
  curl -I http://localhost:8080/admin/
  ```

#### MongoDB (port 27017)
- Check container status
- Test connection:
  ```bash
  docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
  ```
- Get server status:
  ```bash
  docker-compose exec mongodb mongosh --eval "db.serverStatus().connections"
  ```

#### PostgreSQL (port 5432)
- Check container status
- Test connection:
  ```bash
  docker-compose exec postgres pg_isready
  ```
- Check database exists:
  ```bash
  docker-compose exec postgres psql -U postgres -c "\l"
  ```

#### Redis (port 6379)
- Check container status
- Test connection:
  ```bash
  docker-compose exec redis redis-cli ping
  ```
- Get info:
  ```bash
  docker-compose exec redis redis-cli INFO server
  ```

#### API Gateway (port 5000)
- Check container status
- HTTP health check:
  ```bash
  curl -f http://localhost:5000/health
  ```
- Check response time
- Verify routes are registered

#### Membership Service (port 5001)
- Check container status
- HTTP health check:
  ```bash
  curl -f http://localhost:5001/health
  ```
- Verify database connectivity

#### Payment Service (port 5002)
- Check container status
- HTTP health check:
  ```bash
  curl -f http://localhost:5002/health
  ```
- Verify database and Stripe connectivity

#### Web (port 3000)
- Check container status
- HTTP check:
  ```bash
  curl -I http://localhost:3000
  ```
- Verify webpack dev server is running

### 3. Check Service Dependencies

For each service, verify its dependencies are healthy:
- **api-gateway** depends on: keycloak, redis
- **membership** depends on: mongodb, keycloak, redis
- **payment** depends on: postgres, keycloak, redis
- **web** depends on: api-gateway

### 4. Calculate Response Times

For HTTP services, measure response time using curl's timing:
```bash
curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:PORT/health
```

### 5. Check Logs for Errors (if --verbose)

```bash
docker-compose logs --tail=50 SERVICE_NAME | grep -i error
```

### 6. Generate Health Report

Compile all data into a comprehensive report showing:
- Service status (Running/Stopped)
- Health check result (✅/❌)
- Response time (ms)
- Dependencies status
- Error count (if verbose)

## Usage Examples

### Check all services
```
/lobbi:health
```

### Check specific service
```
/lobbi:health --service keycloak
```

### Verbose health check
```
/lobbi:health --verbose
```

### Check specific service with verbose output
```
/lobbi:health --service api-gateway --verbose
```

## Expected Outputs

### Standard Health Check (All Services)
```
=== LOBBI PLATFORM HEALTH CHECK ===
Timestamp: 2025-12-12 10:30:00

SERVICE          STATUS    HEALTH    RESPONSE TIME   DEPENDENCIES
────────────────────────────────────────────────────────────────────
keycloak         ✅ Up     ✅ OK     120ms           postgres ✅
mongodb          ✅ Up     ✅ OK     5ms             -
postgres         ✅ Up     ✅ OK     8ms             -
redis            ✅ Up     ✅ OK     2ms             -
api-gateway      ✅ Up     ✅ OK     45ms            keycloak ✅, redis ✅
membership       ✅ Up     ✅ OK     60ms            mongodb ✅, keycloak ✅, redis ✅
payment          ✅ Up     ✅ OK     55ms            postgres ✅, keycloak ✅, redis ✅
web              ✅ Up     ✅ OK     180ms           api-gateway ✅

SUMMARY
────────
Total Services: 8
Running: 8
Healthy: 8
Unhealthy: 0
Warnings: 0

✅ All systems operational
```

### Failed Service Example
```
SERVICE          STATUS    HEALTH    RESPONSE TIME   DEPENDENCIES
────────────────────────────────────────────────────────────────────
keycloak         ❌ Down   ❌ FAIL   -               postgres ✅
...
payment          ✅ Up     ⚠️  WARN  55ms            postgres ✅, keycloak ❌, redis ✅

SUMMARY
────────
Total Services: 8
Running: 7
Healthy: 6
Unhealthy: 1
Warnings: 1

❌ Issues detected - keycloak is down
⚠️  payment service has degraded dependency (keycloak)

Recommended Actions:
1. Check keycloak logs: docker-compose logs keycloak
2. Restart keycloak: docker-compose restart keycloak
3. Verify postgres connection
```

### Verbose Output (Single Service)
```
=== KEYCLOAK HEALTH CHECK (VERBOSE) ===

CONTAINER STATUS
────────────────
Container: keycloak-alpha_keycloak_1
State: Up 2 hours
Ports: 0.0.0.0:8080->8080/tcp

HEALTH CHECK
────────────
Endpoint: http://localhost:8080/health/ready
Status: 200 OK
Response Time: 120ms
Body: {"status":"UP","checks":[{"name":"database","status":"UP"}]}

DEPENDENCIES
────────────
postgres: ✅ Connected (response time: 8ms)

RESOURCE USAGE
────────────────
CPU: 5.2%
Memory: 512MB / 2GB (25.6%)

RECENT LOGS (Last 10 lines)
────────────────────────────
2025-12-12 10:28:45 INFO  [org.keycloak.services] (main) KC-SERVICES0001: Keycloak started
2025-12-12 10:29:12 INFO  [org.keycloak.transaction] (default task-1) Transaction committed
...

ERROR COUNT (Last 100 lines)
────────────────────────────
Errors: 0
Warnings: 2
  - "Session timeout warning" (2 occurrences)

✅ Service healthy
```

## Success Criteria

- All 8 services have status checked
- Health endpoints respond (for HTTP services)
- Database connections verified (mongodb, postgres, redis)
- Response times measured for HTTP services
- Dependencies validated
- Report generated with clear status indicators
- Error logs checked (if verbose mode)
- Recommendations provided for any failures

## Notes

- Health checks should complete in under 30 seconds
- Failed dependency doesn't always mean service is unhealthy (may have fallbacks)
- Response times > 500ms should trigger a warning
- Container "Up" status doesn't guarantee application health
- Always check logs for context on failures
- Some services may have /health, /healthz, or /ready endpoints
- Database services may require authentication from .env
- Redis PING command is the fastest health check
- MongoDB ping is instant and reliable
- PostgreSQL pg_isready is preferred over psql connection
- Web service may return 200 even if backend is down (static files served)
- API Gateway health should check all registered routes
