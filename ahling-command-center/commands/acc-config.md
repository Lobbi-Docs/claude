---
description: Generate service configuration with Vault secret integration
argument-hint: "<service-name> [--output PATH] [--vault-path PATH]"
allowed-tools: ["Bash", "Read", "Write", "Grep"]
---

Generate service configuration files with automatic Vault secret injection, environment variable templating, and validation for ACC services.

## Your Task

You are generating configuration files for an ACC service with Vault integration. Create config files, inject secrets, validate syntax, and ensure all required variables are present.

## Arguments

- `service-name` (required): Name of the service to configure
- `--output` (optional): Output directory for config files (default: ./config)
- `--vault-path` (optional): Vault secret path (default: secret/services/{service-name})

## Steps to Execute

### 1. Identify Service Type

Detect service type by examining Dockerfile or service metadata:

```bash
# Check if service exists
SERVICE_DIR="services/*/$SERVICE_NAME"

if [ ! -d "$SERVICE_DIR" ]; then
  echo "Error: Service not found"
  exit 1
fi

# Determine type from Dockerfile or config
SERVICE_TYPE=$(grep "SERVICE_TYPE" $SERVICE_DIR/Dockerfile | awk -F'=' '{print $2}')
```

### 2. Fetch Secrets from Vault

```bash
# Authenticate with Vault
export VAULT_ADDR=${VAULT_ADDR}
export VAULT_TOKEN=${VAULT_TOKEN}

# Read all secrets for this service
vault kv get -format=json ${VAULT_PATH} > /tmp/vault_secrets.json

# Extract individual secrets
DB_PASSWORD=$(cat /tmp/vault_secrets.json | jq -r '.data.data.database.password')
API_KEY=$(cat /tmp/vault_secrets.json | jq -r '.data.data."api-keys".key')
CLIENT_SECRET=$(cat /tmp/vault_secrets.json | jq -r '.data.data.oauth.client_secret')

# Clean up temp file
rm /tmp/vault_secrets.json
```

### 3. Generate Base Configuration

Create `config/config.yml` with service-specific settings:

#### API Service Configuration

```yaml
service:
  name: ${SERVICE_NAME}
  version: 1.0.0
  environment: ${NODE_ENV:-production}

server:
  host: 0.0.0.0
  port: ${PORT:-3000}
  timeout: 30s
  cors:
    enabled: true
    origins:
      - https://${ACC_DOMAIN}
      - http://localhost:3000
    methods: [GET, POST, PUT, DELETE, PATCH]
    credentials: true

database:
  host: ${DB_HOST}
  port: ${DB_PORT}
  name: ${DB_NAME}
  user: ${DB_USER}
  password: ${DB_PASSWORD}  # From Vault
  pool:
    min: 2
    max: 10
    idle_timeout: 30s
  ssl:
    enabled: ${DB_SSL_ENABLED:-true}

redis:
  host: ${REDIS_HOST}
  port: ${REDIS_PORT}
  password: ${REDIS_PASSWORD}  # From Vault
  db: ${REDIS_DB:-0}
  max_retries: 3

auth:
  jwt:
    secret: ${JWT_SECRET}  # From Vault
    expiry: 3600
  oauth:
    client_id: ${OAUTH_CLIENT_ID}
    client_secret: ${OAUTH_CLIENT_SECRET}  # From Vault
    redirect_uri: https://${ACC_DOMAIN}/auth/callback

logging:
  level: ${LOG_LEVEL:-info}
  format: ${LOG_FORMAT:-json}
  outputs:
    - type: stdout
    - type: loki
      url: http://loki:3100/loki/api/v1/push

metrics:
  enabled: ${METRICS_ENABLED:-true}
  port: ${METRICS_PORT:-9090}
  path: /metrics

tracing:
  enabled: ${TRACING_ENABLED:-true}
  endpoint: http://tempo:4317

health:
  path: /health
  checks:
    - database
    - redis
    - vault
```

#### Ollama Service Configuration

```yaml
service:
  name: ollama
  gpu_enabled: ${OLLAMA_GPU_ENABLED:-true}

gpu:
  device: /dev/dri/renderD128  # AMD GPU
  layers: ${OLLAMA_GPU_LAYERS:-35}
  memory: ${OLLAMA_GPU_MEMORY:-16GB}

models:
  default: ${OLLAMA_DEFAULT_MODEL:-llama2}
  auto_pull: true
  storage_path: /models

server:
  host: 0.0.0.0
  port: 11434
  timeout: 300s
  max_connections: 10

performance:
  num_threads: ${OLLAMA_NUM_THREADS:-14}
  batch_size: ${OLLAMA_BATCH_SIZE:-512}
  context_length: ${OLLAMA_CONTEXT_LENGTH:-4096}

cache:
  enabled: true
  size: 8GB
  ttl: 3600s
```

#### Home Assistant Service Configuration

```yaml
homeassistant:
  name: Ahling Home
  latitude: ${HA_LATITUDE}
  longitude: ${HA_LONGITUDE}
  elevation: ${HA_ELEVATION}
  unit_system: metric
  time_zone: ${ACC_TIMEZONE}

http:
  server_host: 0.0.0.0
  server_port: 8123
  trusted_proxies:
    - 172.20.0.0/16
  use_x_forwarded_for: true
  cors_allowed_origins:
    - https://${ACC_DOMAIN}

logger:
  default: info
  logs:
    homeassistant.core: warning

recorder:
  db_url: postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
  purge_keep_days: 30
  commit_interval: 5

mqtt:
  broker: mosquitto.ahling.local
  port: 1883
  username: ${MQTT_USER}
  password: ${MQTT_PASSWORD}  # From Vault
  discovery: true

ollama:
  base_url: http://ollama.ahling.local:11434
  model: llama2
  timeout: 60

voice:
  - platform: wyoming
    host: whisper.ahling.local
    port: 10300
  - platform: wyoming
    host: piper.ahling.local
    port: 10200
```

### 4. Generate Environment-Specific Overrides

Create `config/production.yml`:

```yaml
# Production overrides
server:
  timeout: 60s

database:
  pool:
    max: 20
  ssl:
    enabled: true
    ca_cert: /certs/ca.pem

logging:
  level: warn

metrics:
  enabled: true
```

Create `config/development.yml`:

```yaml
# Development overrides
server:
  cors:
    origins: ["*"]

database:
  ssl:
    enabled: false

logging:
  level: debug
  format: pretty
```

### 5. Generate Vault Secret Template

Create `config/vault-secrets.json`:

```json
{
  "database": {
    "password": "VAULT:secret/services/${SERVICE_NAME}/database#password",
    "user": "VAULT:secret/services/${SERVICE_NAME}/database#user"
  },
  "redis": {
    "password": "VAULT:secret/services/${SERVICE_NAME}/redis#password"
  },
  "api-keys": {
    "key": "VAULT:secret/services/${SERVICE_NAME}/api-keys#key"
  },
  "oauth": {
    "client_secret": "VAULT:secret/services/${SERVICE_NAME}/oauth#client_secret"
  },
  "jwt": {
    "secret": "VAULT:secret/services/${SERVICE_NAME}/jwt#secret"
  }
}
```

### 6. Replace Vault Placeholders

```bash
# Process config file and replace VAULT: placeholders
process_vault_secrets() {
  CONFIG_FILE=$1

  # Find all VAULT: references
  vault_refs=$(grep -o 'VAULT:[^"]*' $CONFIG_FILE || true)

  for ref in $vault_refs; do
    # Parse VAULT:path#key
    path=$(echo $ref | cut -d':' -f2 | cut -d'#' -f1)
    key=$(echo $ref | cut -d'#' -f2)

    # Fetch from Vault
    secret=$(vault kv get -field=$key $path 2>/dev/null || echo "")

    if [ -n "$secret" ]; then
      # Replace in config
      sed -i "s|$ref|$secret|g" $CONFIG_FILE
    else
      echo "Warning: Could not fetch $ref from Vault"
    fi
  done
}

process_vault_secrets config/config.yml
```

### 7. Validate Configuration

```bash
# Validate YAML syntax
yamllint config/*.yml || {
  echo "Error: Invalid YAML syntax"
  exit 1
}

# Validate required fields
validate_config() {
  CONFIG=$1

  # Check for required top-level keys
  required_keys=("service" "server" "logging")

  for key in "${required_keys[@]}"; do
    if ! grep -q "^$key:" $CONFIG; then
      echo "Error: Missing required key: $key"
      exit 1
    fi
  done
}

validate_config config/config.yml
```

### 8. Generate .env File

```bash
# Generate .env from configuration
cat > .env <<EOF
# Generated configuration for $SERVICE_NAME
# Date: $(date)

# Service
SERVICE_NAME=$SERVICE_NAME
PORT=${PORT:-3000}
NODE_ENV=production

# Vault
VAULT_ADDR=$VAULT_ADDR
VAULT_TOKEN=$VAULT_TOKEN
VAULT_PATH=$VAULT_PATH

# Database (credentials from Vault)
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Redis (credentials from Vault)
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=$REDIS_PASSWORD

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090
EOF
```

### 9. Create Config Loading Script

Create `scripts/load-config.sh`:

```bash
#!/bin/bash
# Load configuration with Vault integration

set -e

CONFIG_DIR=${CONFIG_DIR:-/app/config}
ENV=${NODE_ENV:-production}

echo "Loading configuration for $SERVICE_NAME (env: $ENV)"

# Fetch Vault secrets
if [ -n "$VAULT_ADDR" ] && [ -n "$VAULT_TOKEN" ]; then
  echo "Fetching secrets from Vault..."

  # Database
  export DB_USER=$(vault kv get -field=user ${VAULT_PATH}/database)
  export DB_PASSWORD=$(vault kv get -field=password ${VAULT_PATH}/database)

  # Redis
  export REDIS_PASSWORD=$(vault kv get -field=password ${VAULT_PATH}/redis)

  # API Keys
  export API_KEY=$(vault kv get -field=key ${VAULT_PATH}/api-keys)

  echo "Secrets loaded successfully"
else
  echo "Warning: Vault not configured, using environment variables"
fi

# Merge configs: default + environment-specific
yq eval-all 'select(fileIndex == 0) * select(fileIndex == 1)' \
  $CONFIG_DIR/config.yml \
  $CONFIG_DIR/$ENV.yml \
  > $CONFIG_DIR/merged-config.yml

echo "Configuration loaded: $CONFIG_DIR/merged-config.yml"
```

### 10. Test Configuration

```bash
# Dry-run test
docker-compose config > /tmp/compose-test.yml && {
  echo "✅ Docker Compose configuration valid"
  rm /tmp/compose-test.yml
}

# Test Vault connectivity
vault kv get ${VAULT_PATH}/database > /dev/null && {
  echo "✅ Vault secrets accessible"
}

# Test config loading
./scripts/load-config.sh && {
  echo "✅ Configuration loads successfully"
}
```

### 11. Generate Configuration Report

```markdown
# Configuration Report: $SERVICE_NAME

**Generated:** $(date)
**Vault Path:** $VAULT_PATH

## Generated Files

- ✅ config/config.yml (base configuration)
- ✅ config/production.yml (production overrides)
- ✅ config/development.yml (development overrides)
- ✅ config/vault-secrets.json (Vault mapping)
- ✅ .env (environment variables)
- ✅ scripts/load-config.sh (config loader)

## Vault Secrets

- database.password ✅
- database.user ✅
- redis.password ✅
- api-keys.key ✅
- oauth.client_secret ✅

## Validation

- YAML syntax: ✅ Valid
- Required fields: ✅ Present
- Vault connectivity: ✅ Connected
- Docker Compose: ✅ Valid

## Next Steps

1. Review generated configuration files
2. Update environment-specific settings in config/production.yml
3. Test with: `docker-compose config`
4. Deploy with: `/acc:deploy $SERVICE_NAME`
```

## Usage Examples

### Generate config for API service
```
/acc:config my-api
```

### Generate config with custom output path
```
/acc:config ollama --output /opt/ollama/config
```

### Generate config with custom Vault path
```
/acc:config home-assistant --vault-path secret/ha/production
```

## Expected Outputs

1. **config/config.yml** - Base configuration with Vault secrets injected
2. **config/production.yml** - Production overrides
3. **config/development.yml** - Development overrides
4. **config/vault-secrets.json** - Vault secret mapping
5. **.env** - Environment variable file
6. **scripts/load-config.sh** - Configuration loader script
7. **Configuration report** - Summary of generated files

## Success Criteria

- All config files generated
- YAML syntax is valid
- Vault secrets successfully fetched
- No missing required fields
- .env file created
- Config loader script created and executable
- Docker Compose validates successfully
- Configuration report generated

## Notes

- Vault must be initialized and unsealed
- VAULT_TOKEN must have read access to service secrets
- Secrets are injected at build time for security
- Use config/vault-secrets.json to map Vault paths
- Environment-specific configs override base config
- Always validate YAML before deployment
- Keep .env in .gitignore (sensitive data)
- Config loader runs in container entrypoint
- Use yq for YAML merging
- Test configuration before deploying to production
