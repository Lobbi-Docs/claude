---
description: Start, stop, restart, or check individual platform services
argument-hint: "ACTION [--service SERVICE]"
allowed-tools: ["Bash", "Read", "Grep"]
---

Manage individual services in the keycloak-alpha platform using docker-compose, including start, stop, restart operations and log viewing.

## Your Task

You are managing the lifecycle of services in the Lobbi platform. Use docker-compose to control individual services or the entire platform stack.

## Arguments

- `action` (required): Service action (start, stop, restart, logs)
- `--service` (optional): Specific service name (if omitted, applies to all services)

## Available Services

1. **keycloak** - Authentication and authorization server
2. **mongodb** - NoSQL database for membership/user data
3. **postgres** - SQL database for Keycloak and payment data
4. **redis** - Cache and session store
5. **api-gateway** - API gateway and request router
6. **membership** - Membership management service
7. **payment** - Payment and subscription service
8. **web** - React frontend application

## Steps to Execute

### 1. Validate Arguments

- Check action is one of: start, stop, restart, logs
- If --service provided, validate it's in the list of available services
- Read docker-compose.yml to confirm service exists

### 2. Execute Action

#### Start Action

**For specific service:**
```bash
docker-compose up -d {{service}}
```

**For all services:**
```bash
docker-compose up -d
```

**Wait for service to be healthy:**
- For services with health checks, wait until healthy
- Maximum wait time: 60 seconds
- Poll every 2 seconds

**Verify service started:**
```bash
docker-compose ps {{service}}
```

**Check dependent services:**
- If starting api-gateway, ensure keycloak and redis are running
- If starting membership, ensure mongodb and keycloak are running
- If starting payment, ensure postgres and keycloak are running
- If starting web, ensure api-gateway is running

#### Stop Action

**For specific service:**
```bash
docker-compose stop {{service}}
```

**For all services:**
```bash
docker-compose stop
```

**Verify service stopped:**
```bash
docker-compose ps {{service}}
```

**Check dependent services:**
- If stopping keycloak, warn about dependent services (api-gateway, membership, payment)
- If stopping mongodb, warn about membership service
- If stopping postgres, warn about keycloak and payment service
- If stopping redis, warn about all application services

#### Restart Action

**For specific service:**
```bash
docker-compose restart {{service}}
```

**For all services:**
```bash
docker-compose restart
```

**Wait for service to be ready:**
- After restart, wait for health check (if available)
- For services without health checks, wait 5 seconds

**Verify service restarted:**
```bash
docker-compose ps {{service}}
```

#### Logs Action

**For specific service (follow mode):**
```bash
docker-compose logs -f --tail=100 {{service}}
```

**For specific service (last N lines):**
```bash
docker-compose logs --tail=100 {{service}}
```

**For all services:**
```bash
docker-compose logs -f --tail=50
```

**Filter logs by level (optional):**
```bash
docker-compose logs {{service}} | grep -i error
docker-compose logs {{service}} | grep -i warn
```

### 3. Check Service Dependencies

Before starting/stopping, check dependencies:

**Service Dependency Map:**
```
keycloak → postgres
mongodb → (none)
postgres → (none)
redis → (none)
api-gateway → keycloak, redis
membership → mongodb, keycloak, redis
payment → postgres, keycloak, redis
web → api-gateway
```

**For start action:**
- Automatically start dependencies if not running
- Example: Starting api-gateway should start keycloak and redis first

**For stop action:**
- Warn about dependents that will be affected
- Example: Stopping keycloak affects api-gateway, membership, payment

### 4. Perform Health Check After Start

After starting service, perform health check:

**For HTTP services (keycloak, api-gateway, membership, payment, web):**
```bash
curl -f http://localhost:{{port}}/health
```

**For database services (mongodb, postgres, redis):**
- MongoDB: `docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`
- PostgreSQL: `docker-compose exec postgres pg_isready`
- Redis: `docker-compose exec redis redis-cli ping`

### 5. Generate Status Report

After action completes, show status:
- Service name
- Action performed
- New status (Running/Stopped)
- Container ID
- Ports exposed
- Health status
- Dependent services affected
- Warnings or errors

## Usage Examples

### Start specific service
```
/lobbi:service start --service keycloak
```

### Stop specific service
```
/lobbi:service stop --service payment
```

### Restart specific service
```
/lobbi:service restart --service api-gateway
```

### View logs for service (follow mode)
```
/lobbi:service logs --service membership
```

### Start all services
```
/lobbi:service start
```

### Stop all services
```
/lobbi:service stop
```

### Restart all services
```
/lobbi:service restart
```

## Expected Outputs

### Start Service
```
=== STARTING SERVICE: keycloak ===

Checking dependencies...
  ✅ postgres: Running
  ✅ postgres: Healthy

Starting keycloak...
[+] Running 1/1
 ✔ Container keycloak-alpha_keycloak_1  Started  2.3s

Waiting for service to be ready...
⏳ Checking health... (attempt 1/30)
⏳ Checking health... (attempt 2/30)
✅ Service is healthy

SERVICE STATUS
──────────────
Service: keycloak
Status: Up 5 seconds
Container: keycloak-alpha_keycloak_1
Ports: 0.0.0.0:8080->8080/tcp
Health: Healthy

HEALTH CHECK
────────────
Endpoint: http://localhost:8080/health/ready
Response: 200 OK
Response Time: 120ms

DEPENDENT SERVICES
──────────────────
The following services depend on keycloak:
  - api-gateway
  - membership
  - payment

These services may need to be restarted if they were running.

✅ keycloak started successfully
```

### Stop Service (With Warnings)
```
=== STOPPING SERVICE: redis ===

⚠️  WARNING: Dependent Services
────────────────────────────────
The following services depend on redis and may be affected:
  - api-gateway (Running)
  - membership (Running)
  - payment (Running)

Continue? (y/n): y

Stopping redis...
[+] Running 1/1
 ✔ Container keycloak-alpha_redis_1  Stopped  1.2s

SERVICE STATUS
──────────────
Service: redis
Status: Exited (0)
Container: keycloak-alpha_redis_1
Ports: -

⚠️  Dependent services may now fail. Consider stopping them or restarting after redis is back up.

✅ redis stopped successfully
```

### Restart Service
```
=== RESTARTING SERVICE: api-gateway ===

Restarting api-gateway...
[+] Running 1/1
 ✔ Container keycloak-alpha_api-gateway_1  Restarted  3.1s

Waiting for service to be ready...
⏳ Service starting... (5 seconds)
✅ Service is ready

SERVICE STATUS
──────────────
Service: api-gateway
Status: Up 5 seconds (health: starting)
Container: keycloak-alpha_api-gateway_1
Ports: 0.0.0.0:5000->5000/tcp

HEALTH CHECK
────────────
Endpoint: http://localhost:5000/health
Response: 200 OK
Routes: 15 registered

✅ api-gateway restarted successfully
```

### Logs Output
```
=== LOGS: membership (last 100 lines, following) ===

Press Ctrl+C to exit

2025-12-12 10:25:10 [INFO] Starting Membership Service...
2025-12-12 10:25:11 [INFO] Connecting to MongoDB: mongodb://localhost:27017/lobbi
2025-12-12 10:25:11 [INFO] MongoDB connected successfully
2025-12-12 10:25:12 [INFO] Connecting to Keycloak: http://localhost:8080
2025-12-12 10:25:12 [INFO] Keycloak connection verified
2025-12-12 10:25:13 [INFO] Redis cache initialized
2025-12-12 10:25:13 [INFO] Server listening on port 5001
2025-12-12 10:26:45 [INFO] GET /api/members - 200 - 45ms
2025-12-12 10:27:12 [INFO] POST /api/members - 201 - 120ms
2025-12-12 10:28:30 [WARN] Session expiring soon: user-123
...
```

### Start All Services
```
=== STARTING ALL SERVICES ===

Starting services in dependency order...

1. Starting postgres...
   ✅ Started (2.1s)

2. Starting mongodb...
   ✅ Started (1.8s)

3. Starting redis...
   ✅ Started (1.2s)

4. Starting keycloak...
   ⏳ Waiting for postgres...
   ✅ Started (5.3s)

5. Starting api-gateway...
   ⏳ Waiting for keycloak...
   ✅ Started (3.2s)

6. Starting membership...
   ⏳ Waiting for mongodb, keycloak...
   ✅ Started (2.9s)

7. Starting payment...
   ⏳ Waiting for postgres, keycloak...
   ✅ Started (3.1s)

8. Starting web...
   ⏳ Waiting for api-gateway...
   ✅ Started (4.5s)

PLATFORM STATUS
───────────────
Total Services: 8
Running: 8
Healthy: 7
Starting: 1 (web)

✅ All services started successfully

Next steps:
  - Wait a few seconds for all services to initialize
  - Check health: /lobbi:health
  - View logs: /lobbi:service logs --service <name>
```

## Success Criteria

- Action successfully executed via docker-compose
- Service status verified after action
- Dependencies checked and started if needed
- Health check performed (for start/restart)
- Status report generated
- Warnings shown for affected dependent services
- Logs displayed in readable format (for logs action)
- No docker-compose errors
- Services reach healthy state within timeout (start/restart)

## Notes

- Services are managed via docker-compose; ensure docker-compose.yml exists
- Dependencies are started automatically when starting a service
- Stopping a service does NOT automatically stop its dependents
- Health checks have 60-second timeout
- Logs action follows by default; use Ctrl+C to exit
- Some services may take longer to start (especially Keycloak)
- Database services (postgres, mongodb, redis) usually start quickly
- Application services need to wait for database connections
- Web service may show as "running" before backend is ready
- Use --tail=N to limit log output (default 100 for specific service, 50 for all)
- Consider using `docker-compose up -d` for initial platform startup
- Use `docker-compose down` to fully stop and remove containers
- Container names follow pattern: {project}_{service}_{instance}
- Multiple instances of a service are not currently supported
- For production, use orchestrators like Kubernetes instead of docker-compose
