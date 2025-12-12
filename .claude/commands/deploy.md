# Deploy Golden Armada

Deploy the Golden Armada agent fleet to Kubernetes.

## Instructions

Execute the following deployment workflow:

### 1. Pre-flight Checks

\`\`\`bash
# Verify kubectl context
kubectl config current-context

# Check namespace
kubectl get namespace agents || kubectl create namespace agents

# Validate Helm chart
helm lint ./deployment/helm/golden-armada
\`\`\`

### 2. Deploy with Helm

\`\`\`bash
# Install or upgrade the deployment
helm upgrade --install golden-armada ./deployment/helm/golden-armada \
  --namespace agents \
  --create-namespace \
  --wait \
  --timeout 5m
\`\`\`

### 3. Verify Deployment

\`\`\`bash
# Check pods
kubectl get pods -n agents -w

# Check services
kubectl get svc -n agents

# Check logs
kubectl logs -n agents -l app.kubernetes.io/name=golden-armada --tail=50
\`\`\`

### 4. Test Endpoints

\`\`\`bash
# Port forward to test locally
kubectl port-forward -n agents svc/golden-armada 8080:8080 &

# Test health endpoint
curl http://localhost:8080/health

# Test hello endpoint
curl -X POST http://localhost:8080/hello -H "Content-Type: application/json" -d '{"message": "test"}'
\`\`\`

## Options

- **Dry run**: Add `--dry-run` to helm command to preview changes
- **Debug**: Add `--debug` for verbose output
- **Custom values**: Use `-f custom-values.yaml` for overrides

## Rollback

If deployment fails:
\`\`\`bash
helm rollback golden-armada -n agents
\`\`\`
