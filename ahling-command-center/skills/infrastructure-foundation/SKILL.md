# Infrastructure Foundation Skill

This skill provides comprehensive knowledge for deploying and managing the Ahling Command Center foundation infrastructure: HashiCorp Vault, Traefik, Authentik, PostgreSQL, Redis, and MinIO.

## Trigger Phrases

- "vault setup", "secrets management", "hashicorp vault"
- "traefik", "reverse proxy", "ssl certificates"
- "authentik", "authentication", "sso", "oauth"
- "postgres", "postgresql", "database setup"
- "redis", "caching", "session store"
- "minio", "object storage", "s3 compatible"

## Foundation Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FOUNDATION LAYER (Phase 1)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │   Traefik   │───▶│  Authentik  │───▶│   Vault     │                │
│   │  (Proxy)    │    │    (SSO)    │    │  (Secrets)  │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│          │                  │                  │                        │
│          ▼                  ▼                  ▼                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │  PostgreSQL │    │    Redis    │    │    MinIO    │                │
│   │ (Database)  │    │   (Cache)   │    │  (Storage)  │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## HashiCorp Vault

### Docker Compose

```yaml
services:
  vault:
    image: hashicorp/vault:1.15
    container_name: vault
    cap_add:
      - IPC_LOCK
    ports:
      - "8200:8200"
    environment:
      VAULT_ADDR: "http://0.0.0.0:8200"
      VAULT_API_ADDR: "http://vault:8200"
    volumes:
      - vault_data:/vault/data
      - ./vault/config:/vault/config
    command: server
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  vault_data:
```

### Vault Configuration

```hcl
# vault/config/vault.hcl
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # Enable TLS in production
}

api_addr = "http://vault:8200"
cluster_addr = "https://vault:8201"
ui = true

# Enable audit logging
audit {
  path = "/vault/logs/audit.log"
}
```

### Secret Engine Setup

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Create ACC namespace structure
vault kv put secret/acc/foundation/postgres \
  username="postgres" \
  password="$(openssl rand -base64 32)"

vault kv put secret/acc/foundation/redis \
  password="$(openssl rand -base64 32)"

vault kv put secret/acc/foundation/minio \
  access_key="$(openssl rand -hex 16)" \
  secret_key="$(openssl rand -base64 32)"
```

### Vault Policies

```hcl
# policies/acc-services.hcl
path "secret/data/acc/*" {
  capabilities = ["read"]
}

path "secret/metadata/acc/*" {
  capabilities = ["list"]
}

# Dynamic database credentials
path "database/creds/*" {
  capabilities = ["read"]
}
```

## Traefik Reverse Proxy

### Docker Compose

```yaml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@ahling.local"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
      - ./traefik/dynamic:/etc/traefik/dynamic
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.ahling.local`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
```

### Dynamic Configuration

```yaml
# traefik/dynamic/middlewares.yml
http:
  middlewares:
    auth:
      forwardAuth:
        address: "http://authentik:9000/outpost.goauthentik.io/auth/traefik"
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username
          - X-authentik-groups
          - X-authentik-email

    secure-headers:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        forceSTSHeader: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
```

## Authentik SSO

### Docker Compose

```yaml
services:
  authentik-postgresql:
    image: postgres:16
    container_name: authentik-db
    environment:
      POSTGRES_DB: authentik
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD: ${AUTHENTIK_DB_PASSWORD}
    volumes:
      - authentik_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d authentik"]
      interval: 10s
      timeout: 5s
      retries: 5

  authentik-redis:
    image: redis:7-alpine
    container_name: authentik-redis
    command: --save 60 1 --loglevel warning
    volumes:
      - authentik_redis:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli ping | grep PONG"]
      interval: 10s
      timeout: 5s
      retries: 5

  authentik-server:
    image: ghcr.io/goauthentik/server:2024.2
    container_name: authentik
    command: server
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-postgresql
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: ${AUTHENTIK_DB_PASSWORD}
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY}
    volumes:
      - authentik_media:/media
      - authentik_templates:/templates
    ports:
      - "9000:9000"
      - "9443:9443"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.authentik.rule=Host(`auth.ahling.local`)"
      - "traefik.http.routers.authentik.entrypoints=websecure"
      - "traefik.http.services.authentik.loadbalancer.server.port=9000"

  authentik-worker:
    image: ghcr.io/goauthentik/server:2024.2
    container_name: authentik-worker
    command: worker
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-postgresql
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: ${AUTHENTIK_DB_PASSWORD}
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY}
    volumes:
      - authentik_media:/media
      - authentik_templates:/templates
```

## PostgreSQL

### Docker Compose

```yaml
services:
  postgres:
    image: postgres:16
    container_name: postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: acc_main
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### Initialization Script

```sql
-- postgres/init/01-databases.sql
CREATE DATABASE homeassistant;
CREATE DATABASE authentik;
CREATE DATABASE n8n;
CREATE DATABASE langfuse;
CREATE DATABASE temporal;

-- Create service users
CREATE USER ha_user WITH ENCRYPTED PASSWORD 'change_me';
CREATE USER n8n_user WITH ENCRYPTED PASSWORD 'change_me';
CREATE USER langfuse_user WITH ENCRYPTED PASSWORD 'change_me';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE homeassistant TO ha_user;
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;
GRANT ALL PRIVILEGES ON DATABASE langfuse TO langfuse_user;
```

## Redis

### Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    command: >
      redis-server
      --appendonly yes
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
```

## MinIO Object Storage

### Docker Compose

```yaml
services:
  minio:
    image: minio/minio:latest
    container_name: minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.minio.rule=Host(`minio.ahling.local`)"
      - "traefik.http.routers.minio.entrypoints=websecure"
      - "traefik.http.services.minio.loadbalancer.server.port=9001"
```

### Bucket Initialization

```bash
# Create standard buckets
mc alias set acc http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

mc mb acc/backups
mc mb acc/media
mc mb acc/documents
mc mb acc/models
mc mb acc/embeddings

# Set lifecycle policies
mc ilm import acc/backups <<EOF
{
  "Rules": [
    {
      "ID": "expire-old-backups",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
EOF
```

## Deployment Order

1. **Network Setup** - Create Docker networks
2. **Vault** - Initialize and unseal
3. **PostgreSQL** - Start with init scripts
4. **Redis** - Start with authentication
5. **MinIO** - Start and create buckets
6. **Traefik** - Configure routing
7. **Authentik** - Configure SSO

```bash
# Deployment script
#!/bin/bash
set -e

echo "Starting ACC Foundation..."

# Create networks
docker network create acc-frontend 2>/dev/null || true
docker network create acc-backend 2>/dev/null || true

# Start foundation services
docker-compose -f foundation/vault.yml up -d
sleep 10
docker-compose -f foundation/postgres.yml up -d
docker-compose -f foundation/redis.yml up -d
docker-compose -f foundation/minio.yml up -d
docker-compose -f foundation/traefik.yml up -d
docker-compose -f foundation/authentik.yml up -d

echo "Foundation services started!"
```

## Health Checks

```bash
# Check all foundation services
curl -s http://vault:8200/v1/sys/health | jq
curl -s http://traefik:8080/api/overview | jq
curl -s http://authentik:9000/-/health/live/
pg_isready -h postgres -U postgres
redis-cli -a ${REDIS_PASSWORD} ping
curl -s http://minio:9000/minio/health/live
```

## Best Practices

1. **Vault**: Always use TLS in production, implement auto-unseal
2. **Traefik**: Use forward auth for all services
3. **Authentik**: Configure MFA for admin accounts
4. **PostgreSQL**: Enable WAL archiving, regular backups
5. **Redis**: Use sentinel for HA in production
6. **MinIO**: Enable versioning for critical buckets

## Related Skills

- [[vault-manager]] - Advanced Vault operations
- [[home-assistant-brain]] - HA database configuration
- [[intelligence-layer]] - Knowledge store configuration

## References

- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Authentik Documentation](https://goauthentik.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
