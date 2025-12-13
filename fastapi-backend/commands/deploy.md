---
name: deploy
description: Deploy FastAPI application to Kubernetes cluster with Helm
argument-hint: "[--namespace prod] [--release myapp] [--values values.yaml] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Deploy FastAPI to Kubernetes

Deploy a FastAPI application to Kubernetes using Helm charts.

## Pre-deployment Checklist

Before deploying:
1. **Kubernetes context** is set to correct cluster
2. **Docker image** is built and pushed to registry
3. **Secrets** are configured in cluster
4. **Namespace** exists or will be created
5. **Ingress controller** is installed (if using ingress)

## Helm Deployment

### Basic Deployment

```bash
# Install/upgrade release
helm upgrade --install myapp ./helm/myapp \
    --namespace myapp-prod \
    --create-namespace \
    -f values.yaml

# With specific values
helm upgrade --install myapp ./helm/myapp \
    --namespace myapp-prod \
    --set image.tag=v1.0.0 \
    --set replicaCount=3

# Dry run first
helm upgrade --install myapp ./helm/myapp \
    --namespace myapp-prod \
    --dry-run --debug
```

### Helm Chart Structure

```
helm/myapp/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   └── serviceaccount.yaml
└── charts/
```

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: FastAPI Application
type: application
version: 0.1.0
appVersion: "1.0.0"
```

### values.yaml

```yaml
# Default values for FastAPI deployment

replicaCount: 2

image:
  repository: ghcr.io/org/myapp
  pullPolicy: IfNotPresent
  tag: "latest"

imagePullSecrets:
  - name: ghcr-secret

nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8000"
  prometheus.io/path: "/metrics"

podSecurityContext:
  fsGroup: 1000

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false

service:
  type: ClusterIP
  port: 80
  targetPort: 8000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.example.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}

# Application config
config:
  logLevel: info
  environment: production

# Environment variables from secrets
envFrom:
  - secretRef:
      name: myapp-secrets

# Probes
livenessProbe:
  httpGet:
    path: /health/live
    port: http
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
```

### deployment.yaml Template

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        {{- toYaml .Values.podAnnotations | nindent 8 }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          livenessProbe:
            {{- toYaml .Values.livenessProbe | nindent 12 }}
          readinessProbe:
            {{- toYaml .Values.readinessProbe | nindent 12 }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            - name: LOG_LEVEL
              value: {{ .Values.config.logLevel }}
            - name: ENVIRONMENT
              value: {{ .Values.config.environment }}
          {{- with .Values.envFrom }}
          envFrom:
            {{- toYaml . | nindent 12 }}
          {{- end }}
```

## Create Secrets

```bash
# Create secret from literals
kubectl create secret generic myapp-secrets \
    --namespace myapp-prod \
    --from-literal=MONGODB_URL='mongodb://user:pass@mongo:27017/db' \
    --from-literal=REDIS_URL='redis://:password@redis:6379/0'

# Create secret from file
kubectl create secret generic myapp-secrets \
    --namespace myapp-prod \
    --from-env-file=.env.production

# Create image pull secret for GHCR
kubectl create secret docker-registry ghcr-secret \
    --namespace myapp-prod \
    --docker-server=ghcr.io \
    --docker-username=$GITHUB_USER \
    --docker-password=$GITHUB_TOKEN
```

## Deployment Verification

```bash
# Check deployment status
kubectl rollout status deployment/myapp -n myapp-prod

# Check pods
kubectl get pods -n myapp-prod -l app.kubernetes.io/name=myapp

# View logs
kubectl logs -n myapp-prod -l app.kubernetes.io/name=myapp -f

# Check services
kubectl get svc -n myapp-prod

# Check ingress
kubectl get ingress -n myapp-prod

# Port forward for testing
kubectl port-forward -n myapp-prod svc/myapp 8000:80
```

## Rollback

```bash
# View release history
helm history myapp -n myapp-prod

# Rollback to previous
helm rollback myapp -n myapp-prod

# Rollback to specific revision
helm rollback myapp 3 -n myapp-prod
```

## Environment-Specific Values

### values-dev.yaml

```yaml
replicaCount: 1

autoscaling:
  enabled: false

ingress:
  hosts:
    - host: api-dev.example.com
      paths:
        - path: /
          pathType: Prefix

config:
  logLevel: debug
  environment: development

resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 128Mi
```

### values-prod.yaml

```yaml
replicaCount: 3

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

ingress:
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix

config:
  logLevel: info
  environment: production

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 512Mi
```

### Deploy with Environment Values

```bash
# Development
helm upgrade --install myapp-dev ./helm/myapp \
    --namespace myapp-dev \
    -f values.yaml \
    -f values-dev.yaml

# Production
helm upgrade --install myapp ./helm/myapp \
    --namespace myapp-prod \
    -f values.yaml \
    -f values-prod.yaml
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Deploy to Kubernetes
  run: |
    helm upgrade --install myapp ./helm/myapp \
      --namespace myapp-${{ env.ENVIRONMENT }} \
      --set image.tag=${{ github.sha }} \
      -f values.yaml \
      -f values-${{ env.ENVIRONMENT }}.yaml \
      --wait --timeout 5m
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pod CrashLoopBackOff | Check logs: `kubectl logs <pod>` |
| ImagePullBackOff | Verify secret and image path |
| Probe failures | Verify health endpoints work |
| Ingress not working | Check ingress controller and TLS |
| OOMKilled | Increase memory limits |
