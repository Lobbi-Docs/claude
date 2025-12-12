# Scale Agents

Scale Golden Armada agent deployments up or down.

## Instructions

### 1. View Current Scale

\`\`\`bash
# Check current replica counts
kubectl get deployments -n agents

# Detailed view
kubectl get deployments -n agents -o wide

# Check HPA status (if configured)
kubectl get hpa -n agents
\`\`\`

### 2. Manual Scaling

\`\`\`bash
# Scale specific agent
kubectl scale deployment golden-armada-backend-developer -n agents --replicas=3

# Scale orchestrator
kubectl scale deployment golden-armada-orchestrator -n agents --replicas=2

# Scale all agents to same count
kubectl scale deployment -n agents -l app.kubernetes.io/name=golden-armada --replicas=2
\`\`\`

### 3. Helm-Based Scaling

\`\`\`bash
# Update values.yaml and upgrade
helm upgrade golden-armada ./deployment/helm/golden-armada -n agents \
  --set agents[0].replicas=3

# Or use --reuse-values to keep other settings
helm upgrade golden-armada ./deployment/helm/golden-armada -n agents \
  --reuse-values \
  --set agents[0].replicas=3
\`\`\`

### 4. Configure Horizontal Pod Autoscaler

\`\`\`bash
# Create HPA for an agent
kubectl autoscale deployment golden-armada-backend-developer -n agents \
  --cpu-percent=70 \
  --min=1 \
  --max=5

# View HPA status
kubectl get hpa -n agents

# Describe HPA for details
kubectl describe hpa golden-armada-backend-developer -n agents
\`\`\`

### 5. HPA YAML Configuration

\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: golden-armada-backend-developer
  namespace: agents
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: golden-armada-backend-developer
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
\`\`\`

### 6. Scale to Zero (Stop)

\`\`\`bash
# Stop an agent without deleting
kubectl scale deployment golden-armada-backend-developer -n agents --replicas=0

# Restart later
kubectl scale deployment golden-armada-backend-developer -n agents --replicas=1
\`\`\`

## Scaling Considerations

| Agent Type | Min | Recommended | Max | Notes |
|------------|-----|-------------|-----|-------|
| backend-developer | 1 | 2-3 | 5 | CPU-bound |
| orchestrator | 1 | 2 | 3 | Stateless |
| claude-agent | 1 | 2 | 10 | API rate limits |

## Verification

\`\`\`bash
# Verify scaling completed
kubectl rollout status deployment/golden-armada-backend-developer -n agents

# Check pod distribution
kubectl get pods -n agents -o wide

# Verify load balancing
for i in {1..10}; do
  curl -s http://localhost:8080/health | jq '.pod_name'
done
\`\`\`
