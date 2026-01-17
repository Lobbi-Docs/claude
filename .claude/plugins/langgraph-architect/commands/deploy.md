---
name: lg:deploy
description: Deploy LangGraph agents to various platforms including LangGraph Platform, Cloud, Docker, and Kubernetes
version: 1.0.0
category: langgraph
author: Claude Code
arguments:
  - name: action
    description: Deployment action
    required: true
    type: choice
    choices: [init, deploy, update, rollback, status, logs, scale, destroy]
  - name: name
    description: Deployment name
    required: false
    type: string
flags:
  - name: project
    description: Project directory path
    type: string
    default: "."
  - name: platform
    description: Deployment platform
    type: choice
    choices: [langgraph-cloud, langgraph-platform, docker, kubernetes, aws, gcp, azure, fly-io]
    default: langgraph-cloud
  - name: env
    description: Environment
    type: choice
    choices: [dev, staging, production]
    default: dev
  - name: region
    description: Deployment region
    type: string
    default: "us-east-1"
  - name: replicas
    description: Number of replicas
    type: number
    default: 1
  - name: memory
    description: Memory allocation (e.g., 512Mi, 1Gi)
    type: string
    default: "512Mi"
  - name: cpu
    description: CPU allocation (e.g., 0.5, 1, 2)
    type: string
    default: "0.5"
  - name: auto-scale
    description: Enable auto-scaling
    type: boolean
    default: false
  - name: min-replicas
    description: Minimum replicas for auto-scaling
    type: number
    default: 1
  - name: max-replicas
    description: Maximum replicas for auto-scaling
    type: number
    default: 10
  - name: registry
    description: Docker registry
    type: string
    default: ""
  - name: tag
    description: Image tag
    type: string
    default: "latest"
  - name: build
    description: Build image before deploy
    type: boolean
    default: true
presets:
  - name: dev-quick
    description: Quick dev deployment
    flags:
      platform: docker
      env: dev
      replicas: 1
  - name: staging-cloud
    description: Staging on LangGraph Cloud
    flags:
      platform: langgraph-cloud
      env: staging
      replicas: 2
  - name: production-k8s
    description: Production Kubernetes
    flags:
      platform: kubernetes
      env: production
      replicas: 3
      auto-scale: true
      min-replicas: 3
      max-replicas: 10
---

# lg:deploy - Deployment Management

Deploy LangGraph agents to production environments with support for multiple platforms and configurations.

## Workflow Steps

### Initialize Deployment

1. **Validate Project**
   - Check project structure
   - Verify all dependencies
   - Validate configuration

2. **Generate Deployment Configs**
   - Create Dockerfile
   - Generate platform-specific configs
   - Setup environment variables
   - Configure secrets

3. **Setup Infrastructure**
   - Create platform resources
   - Configure networking
   - Setup databases/storage
   - Configure monitoring

4. **Generate CI/CD**
   - Create deployment pipeline
   - Setup automated testing
   - Configure rollback strategy

5. **Update Documentation**
   - Add deployment guide
   - Document configuration
   - Add runbook

### Deploy Application

1. **Pre-Deploy Checks**
   - Run tests
   - Verify configuration
   - Check dependencies
   - Validate secrets

2. **Build Image** (if --build)
   - Build Docker image
   - Tag image
   - Push to registry

3. **Deploy to Platform**
   - Create/update deployment
   - Apply configuration
   - Setup load balancing
   - Configure auto-scaling (if enabled)

4. **Post-Deploy Verification**
   - Health checks
   - Smoke tests
   - Monitor metrics
   - Verify logs

5. **Update Documentation**
   - Record deployment
   - Update changelog

## Deployment Platforms

### LangGraph Cloud (Recommended)
Managed hosting by LangChain.

```bash
# langgraph.json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/graph.py:app"
  },
  "env": ".env"
}
```

Deploy:
```bash
langchain deploy --platform cloud
```

**Pros:**
- Fully managed
- Built-in monitoring
- Automatic scaling
- LangSmith integration
- No infrastructure management

**Cons:**
- Platform lock-in
- Limited customization
- Cost at scale

### LangGraph Platform (Self-Hosted)
Self-hosted LangGraph server.

```bash
# docker-compose.yml
version: '3.8'
services:
  langgraph:
    image: langchain/langgraph-platform:latest
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_URL=${POSTGRES_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./src:/app/src
```

**Pros:**
- Self-hosted control
- Full customization
- No platform fees
- Same API as Cloud

**Cons:**
- Infrastructure management
- Monitoring setup
- Scaling complexity

### Docker
Containerized deployment.

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml .
RUN pip install .

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Pros:**
- Portable
- Consistent environments
- Easy local testing
- Platform agnostic

**Cons:**
- Need orchestration
- Manual scaling
- Limited high availability

### Kubernetes
Container orchestration platform.

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: langgraph-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: langgraph-agent
  template:
    metadata:
      labels:
        app: langgraph-agent
    spec:
      containers:
      - name: agent
        image: myregistry/langgraph-agent:latest
        ports:
        - containerPort: 8000
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: anthropic
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
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
---
apiVersion: v1
kind: Service
metadata:
  name: langgraph-agent
spec:
  selector:
    app: langgraph-agent
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: langgraph-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: langgraph-agent
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Pros:**
- Production-grade orchestration
- Auto-scaling
- Self-healing
- Load balancing
- Rolling updates

**Cons:**
- Complex setup
- Steep learning curve
- Resource overhead
- Operational complexity

### AWS (ECS/EKS/Lambda)

#### ECS
```json
{
  "family": "langgraph-agent",
  "containerDefinitions": [{
    "name": "agent",
    "image": "langgraph-agent:latest",
    "memory": 512,
    "cpu": 256,
    "portMappings": [{
      "containerPort": 8000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "ENV", "value": "production"}
    ],
    "secrets": [
      {
        "name": "ANTHROPIC_API_KEY",
        "valueFrom": "arn:aws:secretsmanager:..."
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/langgraph-agent",
        "awslogs-region": "us-east-1"
      }
    }
  }]
}
```

#### Lambda (For simple agents)
```python
# lambda_handler.py
import json
from src.graph import app

def lambda_handler(event, context):
    """AWS Lambda handler."""
    message = event.get('message', '')
    thread_id = event.get('thread_id', 'default')

    config = {"configurable": {"thread_id": thread_id}}
    result = app.invoke({"messages": [message]}, config)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'response': result["messages"][-1].content
        })
    }
```

**Pros:**
- AWS ecosystem integration
- Managed services
- Good scaling
- Regional availability

**Cons:**
- AWS lock-in
- Complex IAM
- Cost management
- Learning curve

### GCP (Cloud Run/GKE)

#### Cloud Run
```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: langgraph-agent
spec:
  template:
    spec:
      containers:
      - image: gcr.io/project/langgraph-agent
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: anthropic
        resources:
          limits:
            memory: 512Mi
            cpu: "1"
      containerConcurrency: 80
  traffic:
  - percent: 100
    latestRevision: true
```

**Pros:**
- Serverless scaling
- Pay per use
- Easy deployment
- Automatic HTTPS

**Cons:**
- Cold starts
- GCP lock-in
- Limited control

### Azure (Container Apps/AKS)

#### Container Apps
```yaml
# containerapp.yaml
properties:
  configuration:
    ingress:
      external: true
      targetPort: 8000
    secrets:
    - name: anthropic-key
      value: ${ANTHROPIC_API_KEY}
  template:
    containers:
    - image: myregistry.azurecr.io/langgraph-agent:latest
      name: langgraph-agent
      env:
      - name: ANTHROPIC_API_KEY
        secretRef: anthropic-key
      resources:
        cpu: 0.5
        memory: 1Gi
    scale:
      minReplicas: 1
      maxReplicas: 10
      rules:
      - name: http-rule
        http:
          metadata:
            concurrentRequests: "100"
```

**Pros:**
- Azure ecosystem
- Good scaling
- Enterprise features

**Cons:**
- Azure lock-in
- Cost complexity

### Fly.io
Simple global deployment.

```toml
# fly.toml
app = "langgraph-agent"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[deploy]
  strategy = "rolling"

[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "GET"
  path = "/health"
```

**Pros:**
- Simple deployment
- Global edge network
- Good developer experience
- Affordable

**Cons:**
- Smaller platform
- Limited enterprise features

## Examples

### Initialize Deployment
```bash
lg:deploy init \
  --project ./my-agent \
  --platform kubernetes \
  --env production
```

### Deploy to LangGraph Cloud
```bash
lg:deploy deploy my-agent \
  --platform langgraph-cloud \
  --env production
```

### Deploy to Docker (Local)
```bash
lg:deploy deploy my-agent \
  --platform docker \
  --env dev
```

### Deploy to Kubernetes
```bash
lg:deploy deploy my-agent \
  --platform kubernetes \
  --env production \
  --replicas 3 \
  --auto-scale \
  --min-replicas 3 \
  --max-replicas 10
```

### Deploy to AWS ECS
```bash
lg:deploy deploy my-agent \
  --platform aws \
  --env production \
  --region us-east-1 \
  --replicas 2
```

### Deploy to GCP Cloud Run
```bash
lg:deploy deploy my-agent \
  --platform gcp \
  --env production \
  --region us-central1
```

### Use Preset
```bash
lg:deploy deploy my-agent --preset production-k8s
```

### Update Deployment
```bash
lg:deploy update my-agent \
  --platform kubernetes \
  --tag v2.0.0
```

### Scale Deployment
```bash
lg:deploy scale my-agent \
  --platform kubernetes \
  --replicas 5
```

### Rollback Deployment
```bash
lg:deploy rollback my-agent \
  --platform kubernetes
```

### Get Deployment Status
```bash
lg:deploy status my-agent --platform kubernetes
```

Output:
```
Deployment: my-agent
Platform: kubernetes
Environment: production
Status: Running
Replicas: 3/3 ready
Image: myregistry/langgraph-agent:v1.2.0
Age: 5d
Health: Healthy
Endpoints:
  - https://my-agent.example.com
```

### View Logs
```bash
lg:deploy logs my-agent --platform kubernetes
```

### Destroy Deployment
```bash
lg:deploy destroy my-agent --platform kubernetes
```

## Generated Files

### Project Structure (After Init)
```
my-agent/
├── deployment/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── .dockerignore
│   ├── kubernetes/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   └── secrets.yaml
│   ├── aws/
│   │   ├── ecs-task-definition.json
│   │   └── cloudformation.yaml
│   ├── gcp/
│   │   └── cloudrun.yaml
│   ├── azure/
│   │   └── containerapp.yaml
│   └── fly/
│       └── fly.toml
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD pipeline
├── langgraph.json           # LangGraph Cloud config
└── README.md
```

### Dockerfile
```dockerfile
# Multi-stage build for smaller image
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: pip install -e .[dev]
    - name: Run tests
      run: pytest

  build-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v3

    - name: Log in to registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy-k8s:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBE_CONFIG }}

    - name: Deploy
      run: |
        kubectl set image deployment/langgraph-agent \
          agent=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubectl rollout status deployment/langgraph-agent
```

### Server with Health Checks
```python
# src/server.py
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from src.graph import app as agent_app

app = FastAPI(title="LangGraph Agent API")

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.get("/ready")
async def ready():
    """Readiness check endpoint."""
    # Check dependencies (DB, etc.)
    return {"status": "ready"}

@app.post("/invoke")
async def invoke(message: str, thread_id: str = "default"):
    """Invoke agent."""
    config = {"configurable": {"thread_id": thread_id}}
    result = agent_app.invoke({"messages": [message]}, config)

    return {
        "response": result["messages"][-1].content,
        "thread_id": thread_id
    }

@app.post("/stream")
async def stream(message: str, thread_id: str = "default"):
    """Stream agent responses."""
    from fastapi.responses import StreamingResponse

    async def generate():
        config = {"configurable": {"thread_id": thread_id}}
        async for chunk in agent_app.astream(
            {"messages": [message]}, config
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

## Monitoring and Observability

### LangSmith Integration
```python
# src/config.py
import os

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")
os.environ["LANGCHAIN_PROJECT"] = f"langgraph-agent-{os.getenv('ENV', 'dev')}"
```

### Prometheus Metrics
```python
# src/metrics.py
from prometheus_client import Counter, Histogram, generate_latest

invocation_counter = Counter(
    'agent_invocations_total',
    'Total agent invocations',
    ['status']
)

invocation_duration = Histogram(
    'agent_invocation_duration_seconds',
    'Agent invocation duration'
)

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type="text/plain")
```

### Logging Configuration
```python
# src/logging_config.py
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
        })

logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler()],
    format='%(message)s'
)

for handler in logging.root.handlers:
    handler.setFormatter(JSONFormatter())
```

## Security Best Practices

### Secrets Management
```python
# Use secrets manager, not environment variables in production
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

def get_secret(name: str) -> str:
    """Get secret from Azure Key Vault."""
    client = SecretClient(
        vault_url=os.getenv("VAULT_URL"),
        credential=DefaultAzureCredential()
    )
    return client.get_secret(name).value
```

### Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/invoke")
@limiter.limit("10/minute")
async def invoke(request: Request, message: str):
    # Implementation
    pass
```

## Error Handling

- **Build failed**: Check Dockerfile and dependencies
- **Deploy failed**: Verify platform credentials and configuration
- **Health check failed**: Check application startup and readiness
- **Rollback failed**: Previous version not available
- **Scale failed**: Resource limits exceeded

## Notes

- Always test in dev/staging before production
- Use semantic versioning for images
- Implement proper health checks
- Monitor resource usage
- Setup log aggregation
- Configure alerts
- Document runbooks
- Plan for rollback
- Use secrets management
- Implement rate limiting
- Enable auto-scaling for production
- Regular security updates

## Related Commands

- `lg:create` - Create deployable project
- `lg:test run` - Test before deployment
- `lg:memory setup` - Configure production persistence
- `lg:mcp expose` - Expose as MCP server

## See Also

- LangGraph Cloud: https://langchain-ai.github.io/langgraph/cloud/
- Deployment Guide: https://langchain-ai.github.io/langgraph/deployment/
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Kubernetes Best Practices: https://kubernetes.io/docs/concepts/configuration/overview/
