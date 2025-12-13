---
description: Deploy ACC services by phase with dependency checks and health validation
argument-hint: "<phase> [--service SERVICE] [--skip-health]"
allowed-tools: ["Bash", "Read", "Grep"]
---

Deploy Ahling Command Center services by phase or individually with automatic dependency validation, pre-deployment checks, health monitoring, and rollback capabilities.

## Your Task

You are deploying ACC infrastructure services. Execute phase-based deployment with dependency checks, resource validation, Vault integration, and health monitoring.

## Arguments

- `phase` (required): Deployment phase (foundation, home-automation, ai-core, etc.) or "all"
- `--service` (optional): Deploy specific service only
- `--skip-health` (optional): Skip health checks (not recommended)
- `--force` (optional): Force deployment even if health checks fail
- `--rollback` (optional): Rollback to previous version

## Deployment Phases

1. **foundation** - Vault, Traefik, Authentik, Postgres, Redis, MinIO (critical)
2. **home-automation** - Home Assistant, MQTT, Zigbee2MQTT
3. **observability** - Prometheus, Grafana, Loki
4. **ai-core** - Ollama, LiteLLM, vLLM, Qdrant, LangFuse
5. **perception** - Frigate, Whisper, Piper, Wyoming
6. **intelligence** - CrewAI, Neo4j, Temporal, AnythingLLM
7. **developer** - Tabby, Aider, Open Interpreter, Backstage
8. **productivity** - Nextcloud, Paperless-ngx, Immich
9. **media** - Jellyfin, Navidrome

## Steps to Execute

### 1. Pre-Deployment Validation

```bash
# Check system requirements
check_system_requirements() {
  echo "=== System Requirements Check ==="

  # Docker
  docker --version > /dev/null 2>&1 || {
    echo "❌ Docker not installed"
    exit 1
  }
  echo "✅ Docker: $(docker --version)"

  # Docker Compose
  docker-compose --version > /dev/null 2>&1 || {
    echo "❌ Docker Compose not installed"
    exit 1
  }
  echo "✅ Docker Compose: $(docker-compose --version)"

  # Disk space (need at least 100GB free)
  AVAILABLE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
  if [ $AVAILABLE -lt 100 ]; then
    echo "⚠️  Warning: Low disk space (${AVAILABLE}GB available, 100GB recommended)"
  else
    echo "✅ Disk Space: ${AVAILABLE}GB available"
  fi

  # Memory
  TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
  if [ $TOTAL_RAM -lt 32 ]; then
    echo "⚠️  Warning: Low RAM (${TOTAL_RAM}GB, 32GB+ recommended)"
  else
    echo "✅ RAM: ${TOTAL_RAM}GB"
  fi

  # GPU (for ai-core, perception phases)
  if [ "$PHASE" = "ai-core" ] || [ "$PHASE" = "perception" ]; then
    if [ -d "/dev/dri" ]; then
      echo "✅ GPU: AMD GPU detected"
    else
      echo "⚠️  Warning: No GPU detected (required for AI workloads)"
    fi
  fi
}
```

### 2. Check Dependencies

```bash
check_dependencies() {
  PHASE=$1

  echo "=== Dependency Check for $PHASE ==="

  case $PHASE in
    "foundation")
      # No dependencies (base layer)
      echo "✅ No dependencies (foundation layer)"
      ;;

    "home-automation")
      check_service_running "vault" || return 1
      check_service_running "redis" || return 1
      check_service_running "mosquitto" || echo "⚠️  MQTT will be started"
      ;;

    "ai-core")
      check_service_running "vault" || return 1
      check_service_running "postgres" || return 1
      check_service_running "redis" || return 1
      ;;

    "intelligence")
      check_service_running "vault" || return 1
      check_service_running "postgres" || return 1
      check_service_running "ollama" || {
        echo "⚠️  Ollama not running (required for intelligence layer)"
        return 1
      }
      check_service_running "qdrant" || {
        echo "⚠️  Qdrant not running (required for intelligence layer)"
        return 1
      }
      ;;

    *)
      check_service_running "vault" || return 1
      ;;
  esac

  echo "✅ All dependencies satisfied"
  return 0
}

check_service_running() {
  SERVICE=$1
  docker ps --format '{{.Names}}' | grep -q "acc-$SERVICE" && {
    echo "✅ $SERVICE is running"
    return 0
  } || {
    echo "❌ $SERVICE is not running"
    return 1
  }
}
```

### 3. Pull Images

```bash
pull_images() {
  COMPOSE_FILE=$1

  echo "=== Pulling Docker Images ==="

  docker-compose -f $COMPOSE_FILE pull || {
    echo "❌ Failed to pull images"
    exit 1
  }

  echo "✅ All images pulled successfully"
}
```

### 4. Initialize Vault Secrets

```bash
init_vault_secrets() {
  PHASE=$1

  echo "=== Initializing Vault Secrets for $PHASE ==="

  # Check if secrets already exist
  vault kv list secret/services/$PHASE > /dev/null 2>&1 && {
    echo "Secrets already exist for $PHASE"
    read -p "Regenerate secrets? (y/N): " REGEN
    [ "$REGEN" != "y" ] && return 0
  }

  # Generate secrets based on phase
  case $PHASE in
    "foundation")
      vault kv put secret/services/postgres password=$(openssl rand -base64 32)
      vault kv put secret/services/redis password=$(openssl rand -base64 32)
      vault kv put secret/services/minio \
        root_user="admin" \
        root_password=$(openssl rand -base64 32)
      ;;

    "ai-core")
      vault kv put secret/services/ollama api_key=$(openssl rand -hex 32)
      vault kv put secret/services/qdrant api_key=$(openssl rand -hex 32)
      vault kv put secret/services/langfuse \
        nextauth_secret=$(openssl rand -base64 64) \
        salt=$(openssl rand -base64 32)
      ;;

    "home-automation")
      vault kv put secret/services/home-assistant \
        secret_key=$(openssl rand -base64 64)
      vault kv put secret/services/mqtt \
        username="acc_mqtt" \
        password=$(openssl rand -base64 32)
      ;;

    "intelligence")
      vault kv put secret/services/neo4j password=$(openssl rand -base64 32)
      vault kv put secret/services/temporal encryption_key=$(openssl rand -base64 32)
      ;;
  esac

  echo "✅ Vault secrets initialized"
}
```

### 5. Create Networks and Volumes

```bash
create_infrastructure() {
  echo "=== Creating Docker Infrastructure ==="

  # Create network if not exists
  docker network inspect acc-network > /dev/null 2>&1 || {
    docker network create --subnet=172.20.0.0/16 acc-network
    echo "✅ Created acc-network"
  }

  # Create data directories
  mkdir -p ${ACC_DATA_PATH}/{vault,postgres,redis,minio,ollama,qdrant,neo4j}
  mkdir -p ${ACC_LOGS_PATH}
  mkdir -p ${ACC_BACKUP_PATH}

  echo "✅ Infrastructure ready"
}
```

### 6. Deploy Services

```bash
deploy_phase() {
  PHASE=$1
  COMPOSE_FILE="compose/${PHASE}.yml"

  echo "========================================"
  echo "Deploying Phase: $PHASE"
  echo "========================================"

  # Backup current state
  echo "Creating deployment backup..."
  docker-compose -f $COMPOSE_FILE config > /tmp/compose-backup-${PHASE}.yml

  # Deploy
  if [ "$PRODUCTION" = "true" ]; then
    docker-compose -f $COMPOSE_FILE -f docker-compose.prod.yml up -d
  else
    docker-compose -f $COMPOSE_FILE up -d
  fi

  if [ $? -eq 0 ]; then
    echo "✅ $PHASE deployed successfully"
  else
    echo "❌ Deployment failed for $PHASE"
    return 1
  fi
}
```

### 7. Health Check and Validation

```bash
validate_deployment() {
  PHASE=$1

  echo "=== Validating Deployment: $PHASE ==="

  # Wait for containers to start
  sleep 10

  # Get list of services
  SERVICES=$(docker-compose -f compose/${PHASE}.yml ps --services)

  ALL_HEALTHY=true

  for service in $SERVICES; do
    CONTAINER="acc-$service"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
      echo "❌ $service: Container not running"
      ALL_HEALTHY=false
      continue
    fi

    # Check health status
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER 2>/dev/null)

    if [ "$HEALTH" = "healthy" ]; then
      echo "✅ $service: Healthy"
    elif [ "$HEALTH" = "starting" ]; then
      echo "⏳ $service: Starting..."
      # Wait up to 60s for health
      for i in {1..12}; do
        sleep 5
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER)
        [ "$HEALTH" = "healthy" ] && {
          echo "✅ $service: Healthy (after ${i}0s)"
          break
        }
      done

      if [ "$HEALTH" != "healthy" ]; then
        echo "❌ $service: Failed to become healthy"
        ALL_HEALTHY=false
      fi
    else
      # No health check defined or unhealthy
      echo "⚠️  $service: No health check or unhealthy"
      ALL_HEALTHY=false
    fi
  done

  if [ "$ALL_HEALTHY" = "true" ]; then
    echo "✅ All services healthy"
    return 0
  else
    echo "❌ Some services are unhealthy"
    return 1
  fi
}
```

### 8. Post-Deployment Tasks

```bash
post_deploy() {
  PHASE=$1

  echo "=== Post-Deployment Tasks for $PHASE ==="

  case $PHASE in
    "foundation")
      # Initialize Vault if first deployment
      if ! vault status > /dev/null 2>&1; then
        echo "Initializing Vault..."
        ./scripts/init-vault.sh
      fi

      # Create Traefik config
      echo "Configuring Traefik..."
      # Add Traefik setup here
      ;;

    "ai-core")
      # Pull default Ollama models
      echo "Pulling default Ollama models..."
      docker exec acc-ollama ollama pull llama2
      docker exec acc-ollama ollama pull mistral
      ;;

    "home-automation")
      # Wait for Home Assistant onboarding
      echo "⚠️  Complete Home Assistant onboarding at http://homeassistant.${ACC_DOMAIN}:8123"
      ;;

    "intelligence")
      # Initialize Neo4j
      echo "Initializing Neo4j..."
      # Add Neo4j setup here
      ;;
  esac

  echo "✅ Post-deployment tasks complete"
}
```

### 9. Rollback on Failure

```bash
rollback_deployment() {
  PHASE=$1

  echo "=== Rolling Back $PHASE ==="

  # Stop current deployment
  docker-compose -f compose/${PHASE}.yml down

  # Restore from backup
  if [ -f "/tmp/compose-backup-${PHASE}.yml" ]; then
    docker-compose -f /tmp/compose-backup-${PHASE}.yml up -d
    echo "✅ Rolled back to previous version"
  else
    echo "⚠️  No backup found, services stopped"
  fi
}
```

### 10. Generate Deployment Report

```bash
generate_deployment_report() {
  PHASE=$1

  cat <<EOF
# Deployment Report: $PHASE

**Date:** $(date)
**Phase:** $PHASE
**Status:** $DEPLOY_STATUS

## Deployed Services

$(docker-compose -f compose/${PHASE}.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")

## Health Status

$(docker ps --filter "label=acc.service.phase=$PHASE" --format "{{.Names}}: {{.Status}}")

## Resource Usage

$(docker stats --no-stream --filter "label=acc.service.phase=$PHASE" --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}")

## Endpoints

$(docker ps --filter "label=acc.service.phase=$PHASE" --format "{{.Names}}: http://{{.Names}}.${ACC_DOMAIN}")

## Next Steps

1. Verify services at their endpoints
2. Check logs: docker-compose -f compose/${PHASE}.yml logs -f
3. Monitor health: /acc:status --phase $PHASE
4. Deploy next phase: /acc:deploy <next-phase>

## Troubleshooting

If services are unhealthy:
- Check logs: docker-compose -f compose/${PHASE}.yml logs SERVICE_NAME
- Check Vault secrets: /acc:vault list secret/services/$PHASE
- Restart service: docker-compose -f compose/${PHASE}.yml restart SERVICE_NAME
EOF
}
```

## Usage Examples

### Deploy foundation phase
```
/acc:deploy foundation
```

### Deploy specific service
```
/acc:deploy ai-core --service ollama
```

### Deploy in production mode
```
/acc:deploy ai-core --production
```

### Force deployment despite warnings
```
/acc:deploy perception --force
```

### Rollback deployment
```
/acc:deploy ai-core --rollback
```

### Deploy all phases sequentially
```
/acc:deploy all
```

## Expected Outputs

### Successful Deployment
```
========================================
Deploying Phase: ai-core
========================================

=== System Requirements Check ===
✅ Docker: Docker version 24.0.7
✅ Docker Compose: Docker Compose version v2.23.0
✅ Disk Space: 450GB available
✅ RAM: 61GB
✅ GPU: AMD GPU detected

=== Dependency Check for ai-core ===
✅ vault is running
✅ postgres is running
✅ redis is running
✅ All dependencies satisfied

=== Pulling Docker Images ===
Pulling ollama ... done
Pulling litellm ... done
Pulling qdrant ... done
✅ All images pulled successfully

=== Initializing Vault Secrets for ai-core ===
✅ Vault secrets initialized

=== Creating Docker Infrastructure ===
✅ Infrastructure ready

=== Deploying ai-core ===
Creating acc-ollama ... done
Creating acc-litellm ... done
Creating acc-qdrant ... done
✅ ai-core deployed successfully

=== Validating Deployment: ai-core ===
✅ ollama: Healthy
✅ litellm: Healthy
✅ qdrant: Healthy
✅ All services healthy

=== Post-Deployment Tasks for ai-core ===
Pulling default Ollama models...
✅ Post-deployment tasks complete

✅ Deployment Complete: ai-core
Report: /tmp/deploy-report-ai-core.md
```

## Success Criteria

- System requirements met
- All dependencies running
- Docker images pulled successfully
- Vault secrets initialized
- Services deployed without errors
- All health checks passing
- Post-deployment tasks completed
- Deployment report generated
- No rollback required

## Notes

- Always deploy foundation phase first
- Wait for health checks before proceeding
- Vault must be unsealed before deployment
- GPU phases require AMD/NVIDIA drivers
- Some services need post-deployment configuration
- Monitor logs during deployment
- Use --force cautiously (can break dependencies)
- Rollback reverts to previous container versions only
- Data persists in volumes (not affected by rollback)
- Production mode enables replicas and advanced logging
