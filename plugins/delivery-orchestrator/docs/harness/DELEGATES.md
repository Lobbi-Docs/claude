# Harness Delegates

## Delegate Types

| Type | Use Case | Deployment |
|------|----------|------------|
| Kubernetes | K8s clusters | Helm/YAML |
| Docker | Single hosts | docker run |
| Shell | VMs, legacy | Shell script |

## Kubernetes Delegate (Helm)

```bash
helm repo add harness-delegate https://app.harness.io/storage/harness-download/delegate-helm-chart/
helm repo update

helm install harness-delegate harness-delegate/harness-delegate-ng \
  --namespace harness-delegate \
  --create-namespace \
  --set accountId="${HARNESS_ACCOUNT_ID}" \
  --set delegateToken="${DELEGATE_TOKEN}" \
  --set delegateName="prod-delegate" \
  --set managerEndpoint="https://app.harness.io" \
  --set delegateDockerImage="harness/delegate:latest" \
  --set replicas=2 \
  --set upgrader.enabled=true
```

## Docker Delegate

```bash
docker run -d --name harness-delegate \
  --restart unless-stopped \
  -e ACCOUNT_ID="${HARNESS_ACCOUNT_ID}" \
  -e DELEGATE_TOKEN="${DELEGATE_TOKEN}" \
  -e DELEGATE_NAME="docker-delegate" \
  -e MANAGER_HOST_AND_PORT="https://app.harness.io" \
  -e DELEGATE_TYPE="DOCKER" \
  -e DELEGATE_TAGS="docker,dev" \
  -e NEXT_GEN="true" \
  -m 2g --cpus="1" \
  harness/delegate:latest
```

## Delegate YAML (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: harness-delegate
  namespace: harness-delegate
spec:
  replicas: 2
  selector:
    matchLabels:
      app: harness-delegate
  template:
    spec:
      containers:
        - name: delegate
          image: harness/delegate:latest
          resources:
            requests:
              memory: "2Gi"
              cpu: "0.5"
            limits:
              memory: "4Gi"
              cpu: "2"
          env:
            - name: ACCOUNT_ID
              value: "${HARNESS_ACCOUNT_ID}"
            - name: DELEGATE_TOKEN
              valueFrom:
                secretKeyRef:
                  name: harness-delegate-token
                  key: token
            - name: DELEGATE_NAME
              value: "prod-delegate"
            - name: MANAGER_HOST_AND_PORT
              value: "https://app.harness.io"
            - name: DELEGATE_TYPE
              value: "KUBERNETES"
            - name: DELEGATE_TAGS
              value: "production,k8s"
            - name: NEXT_GEN
              value: "true"
```

## Delegate Selectors

Use in pipeline steps:
```yaml
- step:
    name: Deploy
    type: K8sRollingDeploy
    spec:
      delegateSelectors:
        - production
        - aws
```

## Delegate Profiles

```yaml
delegateProfile:
  name: Production Profile
  identifier: prod_profile
  startupScript: |
    #!/bin/bash
    apt-get update && apt-get install -y awscli kubectl helm
  selectors:
    - production
```

## Troubleshooting

```bash
# Check pods
kubectl get pods -n harness-delegate

# View logs
kubectl logs -n harness-delegate -l app=harness-delegate --tail=100

# Check health
kubectl exec -n harness-delegate deployment/harness-delegate -- curl -s localhost:8080/api/health

# Restart
kubectl rollout restart deployment/harness-delegate -n harness-delegate

# View metrics
kubectl port-forward -n harness-delegate svc/harness-delegate 3460:3460
curl localhost:3460/api/metrics
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Not connecting | Check token, network |
| Task timeout | Increase resources |
| Version mismatch | Update delegate |
| OOM errors | Increase memory |
