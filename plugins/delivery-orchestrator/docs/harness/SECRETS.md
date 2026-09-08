# Harness Secrets Management

## Secret Managers

| Type | Use Case |
|------|----------|
| Harness Built-in | Default, simple |
| HashiCorp Vault | Enterprise |
| AWS Secrets Manager | AWS workloads |
| GCP Secret Manager | GCP workloads |
| Azure Key Vault | Azure workloads |

## Vault Connector

```yaml
connector:
  name: HashiCorp Vault
  identifier: vault
  type: Vault
  spec:
    vaultUrl: https://vault.company.com
    basePath: harness
    authToken: <+secrets.getValue("vault_token")>
    renewalIntervalMinutes: 60
    secretEngineName: secret
    secretEngineVersion: 2
    delegateSelectors:
      - vault-delegate
```

## AWS Secrets Manager

```yaml
connector:
  name: AWS SM
  identifier: aws_sm
  type: AwsSecretManager
  spec:
    credential:
      type: ManualConfig
      spec:
        accessKeyRef: aws_access_key
        secretKeyRef: aws_secret_key
    region: us-east-1
    secretNamePrefix: harness/
```

## Secret References

```yaml
# Harness secret
value: <+secrets.getValue("my_secret")>

# Vault secret
value: <+secrets.getValue("vault://secret/data/myapp#api_key")>

# AWS Secrets Manager
value: <+secrets.getValue("awsSecretsManager://prod/database")>

# GCP Secret Manager
value: <+secrets.getValue("gcpSecretManager://projects/my-project/secrets/my-secret/versions/latest")>

# Azure Key Vault
value: <+secrets.getValue("azureVault://my-vault/secrets/my-secret")>
```

## Create Secret via API

```bash
curl -X POST "https://app.harness.io/gateway/ng/api/v2/secrets" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": {
      "name": "my-api-key",
      "identifier": "my_api_key",
      "type": "SecretText",
      "spec": {
        "secretManagerIdentifier": "harnessSecretManager",
        "valueType": "Inline",
        "value": "supersecretvalue"
      }
    }
  }'
```

## Best Practices

1. Use external secret managers for production
2. Rotate secrets regularly
3. Use least-privilege access
4. Enable audit logging
5. Never hardcode secrets in pipelines
