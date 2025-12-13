---
description: Generate Kubernetes manifests or Helm charts with best practices and production readiness
argument-hint: "[name] --type [deployment|helm] --replicas [n]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith Kubernetes

Generate production-ready Kubernetes manifests or Helm charts with security, scalability, and observability built-in.

## Usage
```
/zenith:k8s <name> [options]
```

## Arguments
- `name` - Application name (required)

## Options
- `--type <format>` - Output format (default: helm)
  - `deployment` - Raw Kubernetes manifests
  - `helm` - Helm chart
  - `kustomize` - Kustomize overlays
- `--replicas <n>` - Number of replicas (default: 3)
- `--image <registry/image:tag>` - Container image
- `--port <n>` - Application port (default: 8000)
- `--resources` - Include resource limits/requests
- `--autoscaling` - Enable HPA (Horizontal Pod Autoscaler)
- `--ingress` - Create Ingress resource
- `--secrets` - Create Secret manifests
- `--configmaps` - Create ConfigMap manifests
- `--monitoring` - Add Prometheus/Grafana monitoring
- `--service-mesh` - Add Istio/Linkerd configs

## Project Structure

### Helm Chart
```
<name>/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-prod.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── serviceaccount.yaml
│   ├── rbac.yaml
│   ├── pdb.yaml
│   └── _helpers.tpl
├── charts/
└── README.md
```

### Raw Manifests
```
<name>/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── secret.yaml
├── overlays/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── README.md
```

## Generated Resources

### Core Resources
- **Deployment** - Pod specification and replica management
- **Service** - Service discovery and load balancing
- **ConfigMap** - Configuration data
- **Secret** - Sensitive data (encrypted)
- **ServiceAccount** - Pod identity

### Scaling & Availability
- **HPA** - Horizontal Pod Autoscaler
- **PDB** - Pod Disruption Budget
- **ResourceQuota** - Namespace resource limits
- **LimitRange** - Default resource limits

### Networking
- **Ingress** - HTTP/HTTPS routing
- **NetworkPolicy** - Network isolation
- **Service** - ClusterIP, NodePort, LoadBalancer

### Security
- **RBAC** - Role-based access control
- **PodSecurityPolicy** - Pod security standards
- **SecurityContext** - Container security settings
- **NetworkPolicy** - Traffic control

### Monitoring
- **ServiceMonitor** - Prometheus scraping
- **PodMonitor** - Pod-level metrics
- **PrometheusRule** - Alert rules
- **Grafana Dashboard** - Visualization

## Examples

```bash
# Basic Helm chart with 3 replicas
/zenith:k8s my-app --type helm --replicas 3

# Deployment with autoscaling and ingress
/zenith:k8s api-service --type deployment --autoscaling --ingress --resources

# Helm chart with monitoring
/zenith:k8s web-app --type helm --monitoring --replicas 5 --port 3000

# Full production setup
/zenith:k8s production-app --type helm --autoscaling --ingress --monitoring --service-mesh --secrets
```

## Deployment Features

### Resource Management
```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Liveness & Readiness Probes
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Security Context
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
```

### Horizontal Pod Autoscaler
```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
minReplicas: 3
maxReplicas: 10
```

## Helm Values Structure

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myregistry/myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8000

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## Deployment Commands

### Helm
```bash
# Install
helm install my-app ./my-app -n production

# Upgrade
helm upgrade my-app ./my-app -n production -f values-prod.yaml

# Rollback
helm rollback my-app 1 -n production

# Uninstall
helm uninstall my-app -n production
```

### kubectl
```bash
# Apply
kubectl apply -k overlays/prod

# Delete
kubectl delete -k overlays/prod

# Get status
kubectl get all -n production -l app=my-app
```

## Multi-Environment Support

### Development
- Lower resource limits
- 1 replica
- Debug logging
- NodePort service

### Staging
- Medium resources
- 2 replicas
- Info logging
- Ingress enabled

### Production
- High resources
- 3+ replicas
- Error logging
- Autoscaling enabled
- Monitoring enabled
- PDB configured

## Agent Assignment
This command activates the **zenith-k8s-builder** agent for execution.

## Prerequisites
- Kubernetes cluster access
- kubectl configured
- Helm 3.x (for Helm charts)
- Container registry access

## Post-Creation Steps
1. Update image repository and tag
2. Configure environment-specific values
3. Set up secrets and configmaps
4. Apply RBAC if needed
5. Deploy to cluster
6. Verify deployment

## Best Practices
- Use namespaces for isolation
- Set resource limits/requests
- Configure health checks
- Enable autoscaling for production
- Use PodDisruptionBudget
- Implement network policies
- Use secrets for sensitive data
- Tag images with specific versions
- Enable monitoring
- Configure proper RBAC
