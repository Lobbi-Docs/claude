---
description: Start local development environment with EKS parity, Keycloak, and hot-reload
---

# Dev Up

Start a complete local development environment that mirrors your EKS production setup.

## Usage
```
/eks:dev-up [options]
```

## Options
- `--services` - Comma-separated services to run (default: all from config)
- `--mode` - Mode: `full`, `minimal`, `isolated` (default: `full`)
- `--keycloak` - Start local Keycloak (default: `true`)
- `--localstack` - Start LocalStack for AWS services (default: `true`)
- `--rebuild` - Force rebuild containers (default: `false`)
- `--no-hot-reload` - Disable hot-reload with Skaffold (default: `false`)
- `--port` - Override default app port (default: `3000`)
- `--background` - Run in background (default: `false`)

## Examples

### Start Full Environment
```bash
/eks:dev-up
```
Starts Kind cluster, LocalStack, Keycloak, and all services with hot-reload.

### Minimal Mode (Single Service)
```bash
/eks:dev-up --mode=minimal --services=api-gateway
```

### Without Local AWS
```bash
/eks:dev-up --localstack=false
```

### Background Mode
```bash
/eks:dev-up --background
```

## Modes

### Full Mode (Default)
- Kind cluster with 3 nodes (1 control-plane, 2 workers)
- LocalStack with Secrets Manager, ECR, IAM, SSM
- Keycloak with imported realm and test users
- All services deployed with hot-reload
- NGINX Ingress controller
- Local Docker registry

### Minimal Mode
- Kind cluster with 1 node
- Keycloak (required for auth)
- Only specified services
- No LocalStack (uses mock)

### Isolated Mode
- Single service in Docker Compose
- Stub dependencies
- Fastest startup
- Limited integration testing

## What Gets Started

```
LOCAL ENVIRONMENT
═════════════════════════════════════════════════════════════════════════

🔧 Kind Cluster: eks-local
   ├── Control Plane: 127.0.0.1:6443
   ├── Workers: 2
   └── K8s Version: 1.28

🌐 Services:
   ├── NGINX Ingress: http://localhost:80
   ├── Docker Registry: http://localhost:5000
   └── Application: http://localhost:3000

☁️ LocalStack (AWS Mock):
   ├── Endpoint: http://localhost:4566
   ├── Secrets Manager: ✅
   ├── ECR: ✅
   └── SSM: ✅

🔐 Keycloak:
   ├── URL: http://localhost:8080
   ├── Admin: admin / admin
   ├── Realm: local
   └── Test Users:
       ├── testuser / testpass (user role)
       └── admin / adminpass (admin role)

📦 Your Services:
   ├── api-gateway: http://api-gateway.localhost
   ├── user-service: http://user-service.localhost
   └── payment-service: http://payment-service.localhost

═════════════════════════════════════════════════════════════════════════
```

## Agent Assignment
This command activates the **dev-assistant** agent for troubleshooting.

## Skills Used
- local-eks-development
- helm-development

## Workflow

1. **Check Prerequisites**
   - Verify Docker is running
   - Check Kind, Helm, Kubectl installed
   - Validate available resources

2. **Start Infrastructure**
   - Launch Docker Compose (LocalStack, Keycloak, Registry)
   - Wait for health checks

3. **Create Kind Cluster**
   - Apply Kind configuration
   - Connect to Docker network
   - Install NGINX Ingress

4. **Setup Secrets**
   - Create Kubernetes secrets
   - Initialize LocalStack secrets
   - Import Keycloak realm

5. **Deploy Services**
   - Start Skaffold in dev mode
   - Build and deploy services
   - Configure hot-reload watches

6. **Port Forward & Report**
   - Setup port forwarding
   - Display service URLs
   - Show test credentials

## Environment Files Created

```
.env.local                    # Local environment variables
kubeconfig-local              # Kubectl config for local cluster
```

## Hot-Reload Behavior

Skaffold watches for changes:
- `src/**/*.ts` → Sync to container (no rebuild)
- `src/**/*.js` → Sync to container (no rebuild)
- `package.json` → Rebuild container
- `Dockerfile` → Rebuild container
- `charts/**/*` → Re-deploy Helm release

## Teardown

To stop the environment:
```bash
/eks:dev-down
```

Or manually:
```bash
# Stop Skaffold
Ctrl+C

# Delete Kind cluster
kind delete cluster --name eks-local

# Stop Docker services
docker-compose down -v
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Kind won't start | Check Docker resources (8GB RAM recommended) |
| Port 80 in use | Stop other services or use `--port` |
| Keycloak import fails | Check realm-export.json syntax |
| Services can't connect | Verify Docker network connectivity |
| Hot-reload not working | Check Skaffold sync configuration |

## Resource Requirements

| Mode | CPU | Memory | Disk |
|------|-----|--------|------|
| Full | 4 cores | 8 GB | 20 GB |
| Minimal | 2 cores | 4 GB | 10 GB |
| Isolated | 1 core | 2 GB | 5 GB |
