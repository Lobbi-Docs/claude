---
description: Scaffold a new service repository with Docker, configs, and CI/CD templates
argument-hint: "<service-name> [--phase PHASE] [--type TYPE]"
allowed-tools: ["Bash", "Read", "Write", "Glob", "Grep"]
---

Scaffold a complete service repository with Docker configuration, environment templates, health checks, Vault integration, and deployment manifests for the Ahling Command Center.

## Your Task

You are creating a new service repository for the ACC infrastructure. Generate the complete project structure with Dockerfile, docker-compose, configs, and documentation following ACC standards.

## Arguments

- `service-name` (required): Name of the service (e.g., "custom-api", "data-processor")
- `--phase` (optional): Deployment phase (foundation, ai-core, intelligence, etc.)
- `--type` (optional): Service type (api, worker, web, database, ml-service)

## Steps to Execute

### 1. Validate Service Name

```bash
# Check service name format (lowercase, hyphens only)
if [[ ! "$SERVICE_NAME" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: Service name must be lowercase with hyphens only"
  exit 1
fi

# Check if service already exists
if [ -d "services/$PHASE/$SERVICE_NAME" ]; then
  echo "Error: Service already exists at services/$PHASE/$SERVICE_NAME"
  exit 1
fi
```

### 2. Create Service Directory Structure

```
services/$PHASE/$SERVICE_NAME/
├── .env.example                 # Environment template
├── .gitignore
├── Dockerfile                   # Multi-stage Docker build
├── docker-compose.yml          # Local development compose
├── docker-compose.prod.yml     # Production compose
├── README.md                    # Service documentation
├── config/
│   ├── default.yml             # Default configuration
│   ├── production.yml          # Production overrides
│   └── vault-template.yml      # Vault secret template
├── src/                         # Source code directory
│   └── .gitkeep
├── tests/                       # Test directory
│   └── .gitkeep
├── scripts/
│   ├── entrypoint.sh           # Container entrypoint
│   ├── health-check.sh         # Health check script
│   ├── init-vault.sh           # Vault initialization
│   └── backup.sh               # Backup script
├── deploy/
│   ├── k8s/                    # Kubernetes manifests (optional)
│   │   ├── deployment.yml
│   │   ├── service.yml
│   │   └── configmap.yml
│   └── systemd/                # Systemd service (optional)
│       └── $SERVICE_NAME.service
└── docs/
    ├── API.md                  # API documentation (if api type)
    ├── DEPLOYMENT.md           # Deployment guide
    └── CONFIGURATION.md        # Configuration reference
```

### 3. Generate Dockerfile

Create appropriate Dockerfile based on service type:

#### API Service (Node.js/Python)

```dockerfile
# Multi-stage build for Node.js API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build if needed
# RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Copy scripts
COPY scripts/entrypoint.sh /entrypoint.sh
COPY scripts/health-check.sh /health-check.sh

RUN chmod +x /entrypoint.sh /health-check.sh

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD /health-check.sh

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/entrypoint.sh"]
```

#### ML Service (Python/CUDA)

```dockerfile
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

WORKDIR /app

# Install Python
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application
COPY src/ ./src/
COPY scripts/ ./scripts/

RUN chmod +x scripts/*.sh

# Non-root user
RUN useradd -m -u 1001 appuser
USER appuser

HEALTHCHECK --interval=30s --timeout=10s CMD scripts/health-check.sh

EXPOSE 8000

CMD ["python3", "src/main.py"]
```

### 4. Generate docker-compose.yml

```yaml
version: '3.9'

services:
  $SERVICE_NAME:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: acc-$SERVICE_NAME
    restart: unless-stopped

    networks:
      - acc-network

    ports:
      - "${PORT:-3000}:3000"

    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - VAULT_ADDR=${VAULT_ADDR}
      - VAULT_TOKEN=${VAULT_TOKEN}
      - LOG_LEVEL=${LOG_LEVEL:-info}

    env_file:
      - .env

    volumes:
      - ./config:/app/config:ro
      - ./data:/app/data
      - ./logs:/app/logs

    depends_on:
      - vault

    healthcheck:
      test: ["CMD", "/health-check.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

networks:
  acc-network:
    external: true
```

### 5. Generate Production Compose Override

```yaml
version: '3.9'

services:
  $SERVICE_NAME:
    image: ${DOCKER_REGISTRY}/acc-$SERVICE_NAME:${VERSION:-latest}

    build:
      cache_from:
        - ${DOCKER_REGISTRY}/acc-$SERVICE_NAME:latest
      args:
        - BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
        - VERSION=${VERSION}

    logging:
      driver: "loki"
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"

    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
```

### 6. Generate Environment Template (.env.example)

```bash
# Service Configuration
SERVICE_NAME=$SERVICE_NAME
SERVICE_VERSION=1.0.0
PORT=3000
NODE_ENV=development

# Vault Integration
VAULT_ADDR=http://vault.ahling.local:8200
VAULT_TOKEN=
VAULT_PATH=secret/services/$SERVICE_NAME

# Database (if needed)
DB_HOST=postgres.ahling.local
DB_PORT=5432
DB_NAME=$SERVICE_NAME
DB_USER=  # Retrieved from Vault
DB_PASSWORD=  # Retrieved from Vault

# Redis (if needed)
REDIS_HOST=redis.ahling.local
REDIS_PORT=6379
REDIS_PASSWORD=  # Retrieved from Vault

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090

# Health Check
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_INTERVAL=30s
```

### 7. Generate Scripts

#### entrypoint.sh

```bash
#!/bin/sh
set -e

echo "Starting $SERVICE_NAME..."

# Fetch secrets from Vault
if [ -n "$VAULT_ADDR" ] && [ -n "$VAULT_TOKEN" ]; then
  echo "Fetching secrets from Vault..."
  ./scripts/init-vault.sh
fi

# Wait for dependencies
echo "Waiting for dependencies..."
./scripts/wait-for-it.sh ${DB_HOST}:${DB_PORT} -t 60

# Run migrations if needed
# npm run migrate

# Start application
echo "$SERVICE_NAME ready. Starting..."
exec "$@"
```

#### health-check.sh

```bash
#!/bin/sh

# HTTP health check
HEALTH_URL="http://localhost:${PORT:-3000}${HEALTH_CHECK_PATH:-/health}"

response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  exit 0
else
  echo "Health check failed. HTTP status: $response"
  exit 1
fi
```

#### init-vault.sh

```bash
#!/bin/sh

# Fetch secrets from Vault and export as environment variables
if [ -z "$VAULT_ADDR" ] || [ -z "$VAULT_TOKEN" ]; then
  echo "Vault not configured, skipping secret fetch"
  exit 0
fi

export VAULT_ADDR
export VAULT_TOKEN

# Read database credentials
DB_CREDS=$(vault read -format=json ${VAULT_PATH}/database)
export DB_USER=$(echo $DB_CREDS | jq -r '.data.username')
export DB_PASSWORD=$(echo $DB_CREDS | jq -r '.data.password')

# Read API keys
API_KEYS=$(vault read -format=json ${VAULT_PATH}/api-keys)
export API_KEY=$(echo $API_KEYS | jq -r '.data.key')

echo "Secrets loaded from Vault"
```

### 8. Generate Configuration Templates

#### config/default.yml

```yaml
service:
  name: $SERVICE_NAME
  version: 1.0.0
  port: ${PORT}

server:
  host: 0.0.0.0
  port: ${PORT}
  cors:
    enabled: true
    origins: ["*"]

database:
  host: ${DB_HOST}
  port: ${DB_PORT}
  name: ${DB_NAME}
  pool:
    min: 2
    max: 10

redis:
  host: ${REDIS_HOST}
  port: ${REDIS_PORT}
  db: 0

logging:
  level: ${LOG_LEVEL}
  format: ${LOG_FORMAT}

metrics:
  enabled: ${METRICS_ENABLED}
  port: ${METRICS_PORT}
```

#### config/vault-template.yml

```yaml
# Vault secret structure for $SERVICE_NAME
# Path: secret/services/$SERVICE_NAME

database:
  username: "${SERVICE_NAME}_user"
  password: "GENERATED_PASSWORD"

api-keys:
  key: "GENERATED_API_KEY"

oauth:
  client_id: "${SERVICE_NAME}_client"
  client_secret: "GENERATED_SECRET"
```

### 9. Generate README.md

```markdown
# $SERVICE_NAME

## Description

[Brief description of the service]

## Architecture

- **Type:** $TYPE
- **Phase:** $PHASE
- **Port:** ${PORT}
- **Dependencies:** [List dependencies]

## Quick Start

### Development

\`\`\`bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
\`\`\`

### Production

\`\`\`bash
# Build and deploy with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
\`\`\`

## Configuration

See [CONFIGURATION.md](docs/CONFIGURATION.md)

## API Documentation

See [API.md](docs/API.md)

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Health Check

\`\`\`bash
curl http://localhost:${PORT}/health
\`\`\`

## Vault Integration

This service retrieves secrets from HashiCorp Vault:

- Database credentials: \`secret/services/$SERVICE_NAME/database\`
- API keys: \`secret/services/$SERVICE_NAME/api-keys\`

Initialize Vault secrets:

\`\`\`bash
./scripts/init-vault.sh
\`\`\`

## Monitoring

- **Metrics:** http://localhost:${METRICS_PORT}/metrics (Prometheus format)
- **Health:** http://localhost:${PORT}/health
- **Logs:** JSON format, shipped to Loki

## Resource Requirements

- **CPU:** 0.5-2 cores
- **RAM:** 512MB-2GB
- **Disk:** 1GB

## License

MIT
```

### 10. Generate Documentation

Create docs/DEPLOYMENT.md, docs/CONFIGURATION.md, and docs/API.md with appropriate templates.

### 11. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 12. Initialize Git

```bash
cd services/$PHASE/$SERVICE_NAME
git init
git add .
git commit -m "Initial scaffold for $SERVICE_NAME"
```

### 13. Generate Scaffold Report

Create summary of generated files and next steps.

## Usage Examples

### Create API service in AI core phase
```
/acc:repo custom-api --phase ai-core --type api
```

### Create ML service
```
/acc:repo model-trainer --phase intelligence --type ml-service
```

### Create worker service
```
/acc:repo data-processor --phase foundation --type worker
```

### Create web frontend
```
/acc:repo admin-dashboard --phase developer --type web
```

## Expected Outputs

1. **Complete service directory** created
2. **Dockerfile** with multi-stage build
3. **docker-compose.yml** for development
4. **docker-compose.prod.yml** for production
5. **Environment template** (.env.example)
6. **Configuration files** (default.yml, vault-template.yml)
7. **Helper scripts** (entrypoint, health-check, vault init)
8. **Documentation** (README, API, deployment, configuration)
9. **Git repository** initialized
10. **Scaffold report** with next steps

## Success Criteria

- Service directory created in correct phase
- All template files generated
- Scripts are executable
- docker-compose.yml is valid YAML
- Dockerfile follows best practices
- Vault integration configured
- Health checks implemented
- Documentation complete
- Git repository initialized
- No syntax errors in generated files

## Notes

- Service names must be lowercase with hyphens only
- Each service gets isolated directory in appropriate phase
- Vault integration is standard for all services
- Health checks are mandatory
- Multi-stage Dockerfiles for optimal image size
- Non-root user required for security
- Resource limits configured by default
- Logging to Loki in production
- Metrics in Prometheus format
- Scripts follow POSIX sh for compatibility
- Use .env.example for template, .env for actual config (gitignored)
