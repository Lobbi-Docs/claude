---
description: Generate Docker Compose files for services with resource allocation and dependencies
argument-hint: "<service-name> [--phase PHASE] [--production]"
allowed-tools: ["Bash", "Read", "Write", "Grep"]
---

Generate optimized Docker Compose files for ACC services with automatic resource allocation, dependency management, network configuration, and hardware-specific settings.

## Your Task

You are generating Docker Compose configuration for an ACC service. Create compose files with proper resource limits, GPU access (if needed), network settings, health checks, and phase-based dependencies.

## Arguments

- `service-name` (required): Service name or "all" for entire phase
- `--phase` (optional): Deployment phase to generate compose for
- `--production` (optional): Generate production-ready compose with replicas and advanced features

## Steps to Execute

### 1. Identify Service Requirements

```bash
# Detect service type and requirements
SERVICE_DIR="services/*/$SERVICE_NAME"

# Read service metadata
SERVICE_TYPE=$(grep "type:" $SERVICE_DIR/README.md | awk '{print $2}')
GPU_REQUIRED=$(grep -q "gpu: true" $SERVICE_DIR/README.md && echo "true" || echo "false")
PHASE=$(basename $(dirname $SERVICE_DIR))
```

### 2. Calculate Resource Allocation

Based on ACC hardware (24 cores, 61GB RAM, 24GB VRAM):

```bash
# Resource allocation logic
allocate_resources() {
  SERVICE=$1
  TYPE=$2

  case $TYPE in
    "llm")
      CPU_LIMIT="14"
      RAM_LIMIT="30g"
      VRAM_LIMIT="16g"
      ;;
    "video")
      CPU_LIMIT="4"
      RAM_LIMIT="8g"
      VRAM_LIMIT="4g"
      ;;
    "voice")
      CPU_LIMIT="2"
      RAM_LIMIT="4g"
      VRAM_LIMIT="2g"
      ;;
    "database")
      CPU_LIMIT="4"
      RAM_LIMIT="8g"
      VRAM_LIMIT="0"
      ;;
    "api")
      CPU_LIMIT="2"
      RAM_LIMIT="2g"
      VRAM_LIMIT="0"
      ;;
    *)
      CPU_LIMIT="1"
      RAM_LIMIT="1g"
      VRAM_LIMIT="0"
      ;;
  esac

  echo "$CPU_LIMIT $RAM_LIMIT $VRAM_LIMIT"
}
```

### 3. Generate Base Compose File

```yaml
version: '3.9'

services:
  ${SERVICE_NAME}:
    image: ${DOCKER_REGISTRY:-local}/acc-${SERVICE_NAME}:${VERSION:-latest}

    container_name: acc-${SERVICE_NAME}
    hostname: ${SERVICE_NAME}.ahling.local

    restart: unless-stopped

    networks:
      acc-network:
        aliases:
          - ${SERVICE_NAME}.ahling.local

    ports:
      - "${SERVICE_PORT}:${INTERNAL_PORT}"

    environment:
      - SERVICE_NAME=${SERVICE_NAME}
      - VAULT_ADDR=${VAULT_ADDR}
      - VAULT_TOKEN=${VAULT_TOKEN}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - METRICS_ENABLED=true

    env_file:
      - .env
      - .env.${SERVICE_NAME}

    volumes:
      - ./config/${SERVICE_NAME}:/app/config:ro
      - ${ACC_DATA_PATH}/${SERVICE_NAME}:/app/data
      - ${ACC_LOGS_PATH}/${SERVICE_NAME}:/app/logs

    depends_on:
      vault:
        condition: service_healthy
      redis:
        condition: service_healthy

    healthcheck:
      test: ["CMD", "/health-check.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

    deploy:
      resources:
        limits:
          cpus: '${CPU_LIMIT}'
          memory: ${RAM_LIMIT}
        reservations:
          cpus: '${CPU_RESERVATION}'
          memory: ${RAM_RESERVATION}

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${SERVICE_NAME}.rule=Host(\`${SERVICE_NAME}.${ACC_DOMAIN}\`)"
      - "traefik.http.routers.${SERVICE_NAME}.tls=true"
      - "traefik.http.services.${SERVICE_NAME}.loadbalancer.server.port=${INTERNAL_PORT}"

      - "acc.service.name=${SERVICE_NAME}"
      - "acc.service.phase=${PHASE}"
      - "acc.service.type=${SERVICE_TYPE}"

networks:
  acc-network:
    external: true
    name: acc-network
```

### 4. Add GPU Support (if required)

For Ollama, Frigate, Whisper, etc.:

```yaml
    deploy:
      resources:
        reservations:
          devices:
            - driver: amd-gpu
              device_ids: ['0']
              capabilities: [gpu, compute, video]

    devices:
      - /dev/dri:/dev/dri
      - /dev/kfd:/dev/kfd

    group_add:
      - video
      - render

    environment:
      - HSA_OVERRIDE_GFX_VERSION=11.0.0  # For RX 7900 XTX
      - OLLAMA_GPU_ENABLED=true
      - OLLAMA_GPU_LAYERS=${OLLAMA_GPU_LAYERS:-35}
```

### 5. Generate Phase-Specific Compose

#### Foundation Phase (foundation.yml)

```yaml
version: '3.9'

services:
  vault:
    image: hashicorp/vault:latest
    container_name: acc-vault
    restart: unless-stopped
    cap_add:
      - IPC_LOCK
    networks:
      - acc-network
    ports:
      - "8200:8200"
    volumes:
      - ${ACC_DATA_PATH}/vault:/vault/data
      - ./vault/config:/vault/config:ro
    command: server
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 5s
      retries: 5

  traefik:
    image: traefik:latest
    container_name: acc-traefik
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ${ACC_DATA_PATH}/traefik:/data
      - ./traefik/config:/etc/traefik:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(\`traefik.${ACC_DOMAIN}\`)"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  postgres:
    image: postgres:16-alpine
    container_name: acc-postgres
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - ${ACC_DATA_PATH}/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  redis:
    image: redis:7-alpine
    container_name: acc-redis
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - ${ACC_DATA_PATH}/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: acc-minio
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - ${ACC_DATA_PATH}/minio:/data
    command: server /data --console-address ":9001"

secrets:
  postgres_password:
    external: true

networks:
  acc-network:
    external: true
```

#### AI Core Phase (ai-core.yml)

```yaml
version: '3.9'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: acc-ollama
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "11434:11434"
    volumes:
      - ${ACC_DATA_PATH}/ollama:/root/.ollama
    devices:
      - /dev/dri:/dev/dri
      - /dev/kfd:/dev/kfd
    group_add:
      - video
      - render
    environment:
      - HSA_OVERRIDE_GFX_VERSION=11.0.0
      - OLLAMA_GPU_ENABLED=true
      - OLLAMA_NUM_GPU=1
    deploy:
      resources:
        limits:
          cpus: '14'
          memory: 30G
        reservations:
          devices:
            - driver: amd-gpu
              device_ids: ['0']
              capabilities: [gpu, compute]

  litellm:
    image: ghcr.io/berriai/litellm:latest
    container_name: acc-litellm
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "4000:4000"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama
    volumes:
      - ./litellm/config.yml:/app/config.yml:ro

  qdrant:
    image: qdrant/qdrant:latest
    container_name: acc-qdrant
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ${ACC_DATA_PATH}/qdrant:/qdrant/storage
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  langfuse:
    image: langfuse/langfuse:latest
    container_name: acc-langfuse
    restart: unless-stopped
    networks:
      - acc-network
    ports:
      - "3030:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/langfuse
      - NEXTAUTH_SECRET=${LANGFUSE_NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://langfuse.${ACC_DOMAIN}
    depends_on:
      - postgres

networks:
  acc-network:
    external: true
```

### 6. Generate Production Overrides

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'

services:
  ${SERVICE_NAME}:
    image: ${DOCKER_REGISTRY}/acc-${SERVICE_NAME}:${VERSION}

    logging:
      driver: "loki"
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "2"

    deploy:
      mode: replicated
      replicas: ${REPLICAS:-2}
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        max_attempts: 3
        window: 120s
      placement:
        constraints:
          - node.role == worker

    labels:
      - "traefik.http.routers.${SERVICE_NAME}.middlewares=auth@docker"
      - "traefik.http.middlewares.auth.forwardauth.address=http://authentik:9000"
```

### 7. Validate Compose Files

```bash
# Validate syntax
docker-compose -f compose/${PHASE}.yml config > /dev/null && {
  echo "✅ Compose file is valid"
}

# Check for common issues
validate_compose() {
  COMPOSE_FILE=$1

  # Check for network definition
  grep -q "networks:" $COMPOSE_FILE || {
    echo "❌ Missing network definition"
    exit 1
  }

  # Check for health checks on critical services
  if grep -q "postgres\|redis\|vault" $COMPOSE_FILE; then
    grep -q "healthcheck:" $COMPOSE_FILE || {
      echo "⚠️  Warning: Missing health checks on critical services"
    }
  fi

  # Check for resource limits
  grep -q "resources:" $COMPOSE_FILE || {
    echo "⚠️  Warning: No resource limits defined"
  }
}

validate_compose compose/${PHASE}.yml
```

### 8. Generate Makefile for Compose Operations

```makefile
# Makefile for ACC Docker Compose operations

.PHONY: up down restart logs health validate

PHASE ?= foundation
ENV ?= development

up:
	docker-compose -f compose/$(PHASE).yml up -d

up-prod:
	docker-compose -f compose/$(PHASE).yml -f docker-compose.prod.yml up -d

down:
	docker-compose -f compose/$(PHASE).yml down

restart:
	docker-compose -f compose/$(PHASE).yml restart

logs:
	docker-compose -f compose/$(PHASE).yml logs -f

health:
	docker-compose -f compose/$(PHASE).yml ps

validate:
	docker-compose -f compose/$(PHASE).yml config

pull:
	docker-compose -f compose/$(PHASE).yml pull

build:
	docker-compose -f compose/$(PHASE).yml build --parallel
```

### 9. Generate Compose Documentation

Create summary of compose configuration and usage instructions.

## Usage Examples

### Generate compose for single service
```
/acc:compose ollama
```

### Generate compose for entire phase
```
/acc:compose all --phase ai-core
```

### Generate production compose
```
/acc:compose all --phase foundation --production
```

### Generate compose for Home Assistant
```
/acc:compose home-assistant --phase home-automation
```

## Expected Outputs

1. **compose/{phase}.yml** - Complete Docker Compose file for phase
2. **docker-compose.prod.yml** - Production overrides
3. **.env.{service}** - Service-specific environment variables
4. **Makefile** - Compose operation shortcuts
5. **Validation report** - Syntax and best practice checks

## Success Criteria

- Compose file is valid YAML
- All services have resource limits
- Dependencies properly defined
- Health checks configured for critical services
- GPU access configured where needed
- Network properly defined
- Traefik labels configured
- Production overrides generated
- Validation passes with no errors

## Notes

- Always validate compose before deployment
- GPU configuration specific to AMD RX 7900 XTX
- Resource limits based on 24-core, 61GB RAM system
- Use external networks for cross-phase communication
- Secrets should use Docker secrets or Vault
- Production mode uses Loki for logging
- Health checks mandatory for databases
- Use depends_on with condition: service_healthy
- Traefik labels for automatic SSL and routing
- Service discovery via network aliases
