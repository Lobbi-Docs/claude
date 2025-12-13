---
description: Check infrastructure health and service status across all ACC phases
argument-hint: "[--phase PHASE] [--service SERVICE] [--verbose]"
allowed-tools: ["Bash", "Read"]
---

Comprehensive health check of ACC infrastructure including service availability, resource usage, dependency validation, and performance metrics across all deployment phases.

## Your Task

You are performing a health check of the Ahling Command Center infrastructure. Check all services, validate dependencies, monitor resources, and generate a comprehensive status report.

## Arguments

- `--phase` (optional): Check specific phase only (foundation, ai-core, etc.)
- `--service` (optional): Check specific service only
- `--verbose` (optional): Show detailed information including logs and metrics
- `--json` (optional): Output in JSON format

## Steps to Execute

### 1. Check Docker Infrastructure

```bash
check_docker_status() {
  echo "=== Docker Infrastructure Status ==="

  # Docker daemon
  docker info > /dev/null 2>&1 && {
    echo "✅ Docker daemon: Running"
    DOCKER_VERSION=$(docker version --format '{{.Server.Version}}')
    echo "   Version: $DOCKER_VERSION"
  } || {
    echo "❌ Docker daemon: Not running"
    return 1
  }

  # Docker Compose
  docker-compose version > /dev/null 2>&1 && {
    echo "✅ Docker Compose: Available"
  } || {
    echo "❌ Docker Compose: Not available"
  }

  # Network
  docker network inspect acc-network > /dev/null 2>&1 && {
    echo "✅ ACC Network: Present"
  } || {
    echo "⚠️  ACC Network: Missing"
  }
}
```

### 2. Check All Services

```bash
check_all_services() {
  echo "=== ACC Services Status ==="
  echo ""

  # Get all ACC containers
  CONTAINERS=$(docker ps -a --filter "label=acc.service.name" --format "{{.Names}}")

  if [ -z "$CONTAINERS" ]; then
    echo "No ACC services found"
    return 1
  fi

  # Table header
  printf "%-25s %-12s %-12s %-15s %-15s\n" "SERVICE" "STATUS" "HEALTH" "UPTIME" "RESTART COUNT"
  printf "%.s=" {1..80}
  echo ""

  for container in $CONTAINERS; do
    # Get container details
    STATUS=$(docker inspect --format='{{.State.Status}}' $container)
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $container)
    STARTED=$(docker inspect --format='{{.State.StartedAt}}' $container)
    RESTARTS=$(docker inspect --format='{{.RestartCount}}' $container)

    # Calculate uptime
    if [ "$STATUS" = "running" ]; then
      UPTIME=$(docker inspect --format='{{.State.StartedAt}}' $container | xargs -I {} date -d {} +%s)
      NOW=$(date +%s)
      UPTIME_SECONDS=$((NOW - UPTIME))
      UPTIME_HUMAN=$(printf '%dd %dh %dm' $((UPTIME_SECONDS/86400)) $((UPTIME_SECONDS%86400/3600)) $((UPTIME_SECONDS%3600/60)))
    else
      UPTIME_HUMAN="N/A"
    fi

    # Status emoji
    case $STATUS in
      "running")
        if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "none" ]; then
          STATUS_ICON="✅"
        else
          STATUS_ICON="⚠️"
        fi
        ;;
      *)
        STATUS_ICON="❌"
        ;;
    esac

    # Health emoji
    case $HEALTH in
      "healthy") HEALTH_ICON="✅" ;;
      "starting") HEALTH_ICON="⏳" ;;
      "unhealthy") HEALTH_ICON="❌" ;;
      "none") HEALTH_ICON="-" ;;
    esac

    # Service name (remove acc- prefix)
    SERVICE_NAME=${container#acc-}

    printf "%-25s %-12s %-12s %-15s %-15s\n" \
      "$SERVICE_NAME" \
      "$STATUS_ICON $STATUS" \
      "$HEALTH_ICON $HEALTH" \
      "$UPTIME_HUMAN" \
      "$RESTARTS"
  done

  echo ""
}
```

### 3. Check Phase-Specific Services

```bash
check_phase() {
  PHASE=$1

  echo "=== Phase: $PHASE ==="
  echo ""

  PHASE_CONTAINERS=$(docker ps -a --filter "label=acc.service.phase=$PHASE" --format "{{.Names}}")

  if [ -z "$PHASE_CONTAINERS" ]; then
    echo "No services found for phase: $PHASE"
    return 1
  fi

  TOTAL=0
  RUNNING=0
  HEALTHY=0
  UNHEALTHY=0

  for container in $PHASE_CONTAINERS; do
    ((TOTAL++))

    STATUS=$(docker inspect --format='{{.State.Status}}' $container)
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $container)

    [ "$STATUS" = "running" ] && ((RUNNING++))

    if [ "$HEALTH" = "healthy" ] || ([ "$HEALTH" = "none" ] && [ "$STATUS" = "running" ]); then
      ((HEALTHY++))
    elif [ "$HEALTH" = "unhealthy" ]; then
      ((UNHEALTHY++))
    fi
  done

  echo "Total Services: $TOTAL"
  echo "Running: $RUNNING"
  echo "Healthy: $HEALTHY"
  echo "Unhealthy: $UNHEALTHY"
  echo ""

  if [ $UNHEALTHY -gt 0 ]; then
    echo "❌ Phase has unhealthy services"
    return 1
  elif [ $RUNNING -eq $TOTAL ] && [ $HEALTHY -eq $TOTAL ]; then
    echo "✅ Phase is fully operational"
    return 0
  else
    echo "⚠️  Phase is partially operational"
    return 0
  fi
}
```

### 4. Check Critical Services

```bash
check_critical_services() {
  echo "=== Critical Services Check ==="
  echo ""

  CRITICAL=("vault" "postgres" "redis" "traefik")

  ALL_CRITICAL_OK=true

  for service in "${CRITICAL[@]}"; do
    CONTAINER="acc-$service"

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
      HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $CONTAINER)

      if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "none" ]; then
        echo "✅ $service: Operational"
      else
        echo "❌ $service: Unhealthy"
        ALL_CRITICAL_OK=false
      fi
    else
      echo "❌ $service: Not running"
      ALL_CRITICAL_OK=false
    fi
  done

  echo ""

  if [ "$ALL_CRITICAL_OK" = "true" ]; then
    echo "✅ All critical services operational"
  else
    echo "❌ Critical service failures detected"
    echo "⚠️  Infrastructure may be degraded"
  fi
}
```

### 5. Check Resource Usage

```bash
check_resources() {
  echo "=== Resource Usage ==="
  echo ""

  # Overall system resources
  echo "System Resources:"
  echo "  CPU Cores: $(nproc)"
  echo "  Total RAM: $(free -h | awk '/^Mem:/{print $2}')"
  echo "  Used RAM: $(free -h | awk '/^Mem:/{print $3}')"
  echo "  Free RAM: $(free -h | awk '/^Mem:/{print $4}')"
  echo "  Disk Usage: $(df -h ${ACC_DATA_PATH} | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
  echo ""

  # Container resource usage
  echo "Container Resources:"
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
    --filter "label=acc.service.name" | head -20

  echo ""

  # GPU usage (if available)
  if command -v rocm-smi &> /dev/null; then
    echo "GPU Resources (AMD):"
    rocm-smi --showuse --showmeminfo vram | grep -E "GPU|Memory|Usage"
  fi
}
```

### 6. Check Endpoints and Connectivity

```bash
check_endpoints() {
  echo "=== Endpoint Health Checks ==="
  echo ""

  # Common service endpoints
  declare -A ENDPOINTS=(
    ["vault"]="http://localhost:8200/v1/sys/health"
    ["traefik"]="http://localhost:8080/api/overview"
    ["home-assistant"]="http://localhost:8123/api/"
    ["ollama"]="http://localhost:11434/api/tags"
    ["qdrant"]="http://localhost:6333/healthz"
    ["grafana"]="http://localhost:3000/api/health"
    ["neo4j"]="http://localhost:7474/db/system/tx/commit"
  )

  for service in "${!ENDPOINTS[@]}"; do
    endpoint="${ENDPOINTS[$service]}"

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$endpoint" 2>/dev/null || echo "000")

    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
      # 401 is OK for authenticated endpoints
      echo "✅ $service: Endpoint responding ($response)"
    else
      echo "❌ $service: Endpoint not responding (HTTP $response)"
    fi
  done

  echo ""
}
```

### 7. Check Dependencies

```bash
check_dependencies() {
  echo "=== Dependency Validation ==="
  echo ""

  # Check Vault connectivity from other services
  echo "Vault Connectivity:"
  for container in $(docker ps --filter "label=acc.service.name" --format "{{.Names}}"); do
    # Try to reach Vault from container
    docker exec $container sh -c "nc -zv vault 8200" > /dev/null 2>&1 && {
      echo "  ✅ $container → Vault"
    } || {
      echo "  ⚠️  $container ✗ Vault"
    }
  done

  echo ""

  # Check database connectivity
  echo "Database Connectivity:"
  for container in $(docker ps --filter "label=acc.service.type=api" --format "{{.Names}}"); do
    docker exec $container sh -c "nc -zv postgres 5432" > /dev/null 2>&1 && {
      echo "  ✅ $container → PostgreSQL"
    } || {
      echo "  ⚠️  $container ✗ PostgreSQL"
    }
  done

  echo ""
}
```

### 8. Check Logs for Errors

```bash
check_logs() {
  echo "=== Recent Errors (Last 100 lines) ==="
  echo ""

  for container in $(docker ps --filter "label=acc.service.name" --format "{{.Names}}"); do
    ERROR_COUNT=$(docker logs --tail 100 $container 2>&1 | grep -i "error\|fatal\|exception" | wc -l)

    if [ $ERROR_COUNT -gt 0 ]; then
      echo "⚠️  $container: $ERROR_COUNT errors"

      if [ "$VERBOSE" = "true" ]; then
        echo "   Recent errors:"
        docker logs --tail 100 $container 2>&1 | grep -i "error\|fatal\|exception" | tail -5 | sed 's/^/     /'
        echo ""
      fi
    else
      echo "✅ $container: No errors"
    fi
  done

  echo ""
}
```

### 9. Generate Summary Report

```bash
generate_summary() {
  cat <<EOF

========================================
ACC Infrastructure Status Summary
========================================
Timestamp: $(date)

Infrastructure:
  - Docker: $(docker --version | awk '{print $3}')
  - Network: $(docker network inspect acc-network > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Missing")
  - Vault: $(vault status > /dev/null 2>&1 && echo "✅ Unsealed" || echo "⚠️  Check required")

Services:
  - Total: $(docker ps -a --filter "label=acc.service.name" --format "{{.Names}}" | wc -l)
  - Running: $(docker ps --filter "label=acc.service.name" --format "{{.Names}}" | wc -l)
  - Healthy: $(docker ps --filter "label=acc.service.name" --format "{{.Names}}" | xargs -I {} docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{end}}' {} | grep -c "healthy" || echo "0")

Resources:
  - CPU Usage: $(docker stats --no-stream --format "{{.CPUPerc}}" --filter "label=acc.service.name" | awk '{sum += $1} END {printf "%.1f%%", sum}')
  - Memory Usage: $(free -h | awk '/^Mem:/{print $3 "/" $2}')
  - Disk Usage: $(df -h ${ACC_DATA_PATH} | tail -1 | awk '{print $5}')

Overall Status: $(
  if [ $UNHEALTHY_COUNT -eq 0 ] && [ $STOPPED_COUNT -eq 0 ]; then
    echo "✅ All systems operational"
  elif [ $UNHEALTHY_COUNT -gt 0 ]; then
    echo "❌ Issues detected ($UNHEALTHY_COUNT unhealthy)"
  else
    echo "⚠️  Some services stopped ($STOPPED_COUNT)"
  fi
)

EOF
}
```

### 10. Generate JSON Output (Optional)

```bash
generate_json() {
  cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "infrastructure": {
    "docker_running": $(docker info > /dev/null 2>&1 && echo "true" || echo "false"),
    "network_present": $(docker network inspect acc-network > /dev/null 2>&1 && echo "true" || echo "false"),
    "vault_unsealed": $(vault status > /dev/null 2>&1 && echo "true" || echo "false")
  },
  "services": [
    $(docker ps -a --filter "label=acc.service.name" --format "{{.Names}}" | while read container; do
      echo "{"
      echo "  \"name\": \"$container\","
      echo "  \"status\": \"$(docker inspect --format='{{.State.Status}}' $container)\","
      echo "  \"health\": \"$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $container)\","
      echo "  \"uptime_seconds\": $(docker inspect --format='{{.State.StartedAt}}' $container | xargs -I {} date -d {} +%s)"
      echo "},"
    done | sed '$ s/,$//')
  ],
  "resources": {
    "cpu_usage": "$(docker stats --no-stream --format "{{.CPUPerc}}" --filter "label=acc.service.name" | awk '{sum += $1} END {printf "%.1f", sum}')",
    "memory_total": "$(free -b | awk '/^Mem:/{print $2}')",
    "memory_used": "$(free -b | awk '/^Mem:/{print $3}')"
  }
}
EOF
}
```

## Usage Examples

### Check all services
```
/acc:status
```

### Check specific phase
```
/acc:status --phase ai-core
```

### Check specific service
```
/acc:status --service ollama
```

### Verbose output with logs
```
/acc:status --verbose
```

### JSON output
```
/acc:status --json
```

### Check foundation phase verbosely
```
/acc:status --phase foundation --verbose
```

## Expected Outputs

### Standard Status Check
```
=== ACC Infrastructure Status ===
Timestamp: 2025-12-13 10:30:00

=== Docker Infrastructure Status ===
✅ Docker daemon: Running
   Version: 24.0.7
✅ Docker Compose: Available
✅ ACC Network: Present

=== ACC Services Status ===

SERVICE                   STATUS       HEALTH       UPTIME          RESTART COUNT
================================================================================
vault                     ✅ running   ✅ healthy   2d 5h 30m       0
postgres                  ✅ running   ✅ healthy   2d 5h 28m       0
redis                     ✅ running   ✅ healthy   2d 5h 28m       0
traefik                   ✅ running   - none       2d 5h 28m       0
ollama                    ✅ running   - none       1d 12h 15m      0
home-assistant            ✅ running   ✅ healthy   1d 10h 45m      1
qdrant                    ✅ running   ✅ healthy   1d 8h 30m       0
neo4j                     ✅ running   ✅ healthy   12h 20m         0

=== Critical Services Check ===

✅ vault: Operational
✅ postgres: Operational
✅ redis: Operational
✅ traefik: Operational

✅ All critical services operational

=== Resource Usage ===

System Resources:
  CPU Cores: 24
  Total RAM: 61G
  Used RAM: 42G
  Free RAM: 19G
  Disk Usage: 250G/500G (50%)

Container Resources:
NAME                  CPU %     MEM USAGE / LIMIT     MEM %
acc-ollama            45.2%     18.5GB / 30GB         61.7%
acc-postgres          5.1%      2.1GB / 8GB           26.3%
acc-neo4j             8.3%      4.2GB / 8GB           52.5%

========================================
ACC Infrastructure Status Summary
========================================

Overall Status: ✅ All systems operational
```

### Failed Service Example
```
=== ACC Services Status ===

SERVICE                   STATUS       HEALTH       UPTIME          RESTART COUNT
================================================================================
vault                     ✅ running   ✅ healthy   2d 5h 30m       0
postgres                  ❌ exited    - none       N/A             3
ollama                    ✅ running   ⚠️  starting 0h 5m           1

❌ Critical service failures detected
⚠️  Infrastructure may be degraded

Recommendations:
1. Check postgres logs: docker logs acc-postgres
2. Restart postgres: docker restart acc-postgres
3. Monitor ollama startup: docker logs -f acc-ollama
```

## Success Criteria

- Docker infrastructure checked
- All services enumerated
- Health status validated
- Resource usage within limits
- Critical services operational
- Endpoints responding
- Dependencies validated
- Error count acceptable
- Summary report generated

## Notes

- Health checks may take time to initialize (up to 60s)
- Some services don't have health checks (show as "none")
- Critical services must always be healthy
- Resource usage should be monitored regularly
- High restart counts indicate instability
- 401 responses acceptable for authenticated endpoints
- GPU usage requires rocm-smi or nvidia-smi
- Use --verbose for troubleshooting
- JSON output useful for monitoring integrations
- Check logs if services are unhealthy
