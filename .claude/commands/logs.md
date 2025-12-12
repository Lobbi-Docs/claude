# View Agent Logs

View and analyze logs from Golden Armada agents.

## Instructions

### 1. Basic Log Viewing

\`\`\`bash
# All agent logs (last 100 lines)
kubectl logs -n agents -l app.kubernetes.io/name=golden-armada --tail=100

# Specific agent logs
kubectl logs -n agents deployment/golden-armada-backend-developer --tail=100

# Follow logs in real-time
kubectl logs -n agents deployment/golden-armada-backend-developer -f

# All containers in pod (if multiple)
kubectl logs -n agents deployment/golden-armada-backend-developer --all-containers
\`\`\`

### 2. Time-Based Filtering

\`\`\`bash
# Logs from last hour
kubectl logs -n agents deployment/golden-armada-backend-developer --since=1h

# Logs from last 30 minutes
kubectl logs -n agents deployment/golden-armada-backend-developer --since=30m

# Logs with timestamps
kubectl logs -n agents deployment/golden-armada-backend-developer --timestamps
\`\`\`

### 3. Error Analysis

\`\`\`bash
# Filter for errors
kubectl logs -n agents deployment/golden-armada-backend-developer --since=1h | \
  grep -i "error\|exception\|fail\|critical"

# Count error types
kubectl logs -n agents deployment/golden-armada-backend-developer --since=1h | \
  grep -i "error" | sort | uniq -c | sort -rn

# View errors with context
kubectl logs -n agents deployment/golden-armada-backend-developer --since=1h | \
  grep -B5 -A5 "ERROR"
\`\`\`

### 4. Previous Container Logs

\`\`\`bash
# After a restart, view previous container logs
kubectl logs -n agents deployment/golden-armada-backend-developer --previous
\`\`\`

### 5. Multi-Pod Logs

\`\`\`bash
# Logs from all replicas using stern (if installed)
stern -n agents golden-armada

# Or using kubectl with label selector
kubectl logs -n agents -l app.kubernetes.io/component=backend-developer --tail=50
\`\`\`

### 6. Log Aggregation Query

If using centralized logging (Elasticsearch/Loki):

\`\`\`bash
# Grafana Loki query
{namespace="agents", app="golden-armada"} |= "error" | json | line_format "{{.message}}"

# Elasticsearch query
{
  "query": {
    "bool": {
      "must": [
        { "match": { "kubernetes.namespace": "agents" }},
        { "match": { "level": "ERROR" }}
      ]
    }
  }
}
\`\`\`

## Common Log Patterns

### Startup Issues
\`\`\`bash
# Check for startup errors
kubectl logs -n agents deployment/golden-armada-backend-developer | head -50
\`\`\`

### API Errors
\`\`\`bash
# Filter HTTP errors
kubectl logs -n agents deployment/golden-armada-backend-developer | \
  grep -E "HTTP/[0-9.]+ [45][0-9]{2}"
\`\`\`

### Performance Issues
\`\`\`bash
# Look for slow requests
kubectl logs -n agents deployment/golden-armada-backend-developer | \
  grep -E "duration.*[0-9]{4,}ms"
\`\`\`

## Output Options

- **--tail=N**: Show last N lines
- **--since=Xh**: Show logs from last X hours
- **--timestamps**: Include timestamps
- **--previous**: Previous container instance
- **-f**: Follow log output
