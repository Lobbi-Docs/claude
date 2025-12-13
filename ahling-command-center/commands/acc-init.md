---
description: Initialize the Ahling Command Center project structure with 70+ services configuration
argument-hint: "[--path PATH] [--minimal]"
allowed-tools: ["Bash", "Read", "Write", "Glob", "Grep"]
---

Initialize the complete Ahling Command Center project structure with directories, configuration templates, and base files for managing 70+ self-hosted services with Vault integration.

## Your Task

You are setting up the Ahling Command Center infrastructure project. Create the directory structure, initialize Vault, set up base configurations, and prepare for multi-phase deployment.

## Arguments

- `--path` (optional): Installation path (default: current directory)
- `--minimal` (optional): Create minimal structure without all templates (faster setup)

## Steps to Execute

### 1. Verify Prerequisites

Check required tools are installed:
```bash
docker --version
docker-compose --version
vault --version
ollama --version
```

### 2. Create Directory Structure

Create the complete ACC project structure:

```
ahling-command-center/
├── .env                          # Main environment configuration
├── vault/
│   ├── config/                   # Vault server configuration
│   ├── policies/                 # Vault access policies
│   └── init-keys.json           # Vault initialization keys (gitignored)
├── services/
│   ├── foundation/              # Phase 1: Vault, Traefik, Authentik, DBs
│   ├── home-automation/         # Phase 2: Home Assistant, MQTT, Zigbee
│   ├── observability/           # Phase 3: Prometheus, Grafana, Loki
│   ├── ai-core/                 # Phase 4: LiteLLM, vLLM, Ollama, Qdrant
│   ├── perception/              # Phase 5: Frigate, Whisper, Piper
│   ├── intelligence/            # Phase 6: CrewAI, Neo4j, Temporal
│   ├── developer/               # Phase 7: Tabby, Aider, Open Interpreter
│   ├── productivity/            # Phase 8: Nextcloud, Paperless, Immich
│   └── media/                   # Phase 9: Jellyfin, Navidrome
├── compose/
│   ├── foundation.yml
│   ├── home-automation.yml
│   ├── observability.yml
│   ├── ai-core.yml
│   ├── perception.yml
│   ├── intelligence.yml
│   ├── developer.yml
│   ├── productivity.yml
│   └── media.yml
├── configs/                      # Service-specific configurations
├── data/                         # Persistent data (gitignored)
├── backups/                      # Backup storage
├── scripts/
│   ├── init-vault.sh
│   ├── backup.sh
│   └── health-check.sh
└── docs/
    ├── architecture.md
    ├── deployment-phases.md
    └── services.md
```

### 3. Initialize Environment Configuration

Create `.env` file with base configuration:

```bash
# Project Configuration
ACC_PROJECT_NAME=ahling-command-center
ACC_VERSION=1.0.0
ACC_DOMAIN=ahling.local
ACC_TIMEZONE=America/New_York

# Network Configuration
ACC_NETWORK=acc-network
ACC_SUBNET=172.20.0.0/16

# Vault Configuration
VAULT_ADDR=http://vault.ahling.local:8200
VAULT_TOKEN=  # Set after Vault initialization
VAULT_SKIP_VERIFY=true

# Ollama Configuration
OLLAMA_URL=http://ollama.ahling.local:11434
OLLAMA_GPU_ENABLED=true
OLLAMA_GPU_LAYERS=35

# Home Assistant Configuration
HA_URL=http://homeassistant.ahling.local:8123
HA_TOKEN=  # Set after HA first run

# Neo4j Configuration
NEO4J_URL=bolt://neo4j.ahling.local:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=  # Will be stored in Vault

# Qdrant Configuration
QDRANT_URL=http://qdrant.ahling.local:6333
QDRANT_API_KEY=  # Will be stored in Vault

# Hardware Configuration
ACC_CPU_CORES=24
ACC_RAM_GB=61
ACC_GPU_MODEL=RX_7900_XTX
ACC_VRAM_GB=24

# Resource Allocation
ACC_SERVICES_CPU=8-10
ACC_SERVICES_RAM=20
ACC_LLMS_CPU=14
ACC_LLMS_RAM=30
ACC_LLMS_VRAM=16
ACC_VIDEO_VRAM=4
ACC_VOICE_VRAM=2
ACC_EMBEDDINGS_VRAM=2

# Backup Configuration
ACC_BACKUP_PATH=./backups
ACC_BACKUP_SCHEDULE="0 2 * * *"  # 2 AM daily

# Observability
ACC_METRICS_ENABLED=true
ACC_LOGS_RETENTION_DAYS=30
```

### 4. Create Docker Network

```bash
docker network create --subnet=172.20.0.0/16 acc-network
```

### 5. Initialize Vault

Create Vault initialization script `scripts/init-vault.sh`:

```bash
#!/bin/bash

echo "Initializing Vault..."

# Start Vault in dev mode initially
docker run -d --name vault-init \
  --network acc-network \
  -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID=root \
  hashicorp/vault:latest

# Wait for Vault to be ready
sleep 5

# Initialize Vault
vault operator init -key-shares=5 -key-threshold=3 > vault/init-keys.json

# Save unseal keys and root token
VAULT_TOKEN=$(grep 'Initial Root Token:' vault/init-keys.json | awk '{print $NF}')

echo "Vault initialized. Root token: $VAULT_TOKEN"
echo "IMPORTANT: Save vault/init-keys.json securely and remove from disk after backing up!"

# Update .env with Vault token
sed -i "s/VAULT_TOKEN=.*/VAULT_TOKEN=$VAULT_TOKEN/" .env

echo "Vault initialization complete."
```

Make executable:
```bash
chmod +x scripts/init-vault.sh
```

### 6. Create Base Vault Policies

Create `vault/policies/acc-admin.hcl`:

```hcl
# Admin policy for ACC services
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
```

Create `vault/policies/acc-service.hcl`:

```hcl
# Service-level policy
path "secret/data/services/*" {
  capabilities = ["read", "list"]
}

path "database/creds/*" {
  capabilities = ["read"]
}
```

### 7. Create Phase Configuration

Create `docs/deployment-phases.md`:

```markdown
# Ahling Command Center - Deployment Phases

## Phase 1: Foundation (Critical)
- HashiCorp Vault (secrets management)
- Traefik (reverse proxy)
- Authentik (SSO/auth)
- PostgreSQL (relational DB)
- Redis (cache)
- MinIO (S3-compatible storage)

## Phase 2: Home Automation
- Home Assistant (smart home hub)
- Mosquitto MQTT (message broker)
- Zigbee2MQTT (Zigbee gateway)
- Node-RED (automation flows)

## Phase 3: Observability
- Prometheus (metrics)
- Grafana (dashboards)
- Loki (log aggregation)
- Promtail (log shipper)

## Phase 4: AI Core
- Ollama (local LLM server)
- LiteLLM (unified LLM API)
- vLLM (high-performance inference)
- Qdrant (vector database)
- LangFuse (LLM observability)
- n8n (workflow automation)

## Phase 5: Perception Pipeline
- Frigate (NVR/object detection)
- DoubleTake (face recognition)
- CompreFace (face embedding)
- Whisper (speech-to-text)
- Piper (text-to-speech)
- Wyoming Protocol (voice satellite)

## Phase 6: Intelligence Layer
- CrewAI (multi-agent orchestration)
- Neo4j (knowledge graph)
- Temporal (workflow engine)
- AnythingLLM (document Q&A)

## Phase 7: Developer Tools
- Tabby (code completion)
- Aider (AI pair programming)
- Open Interpreter (code execution)
- Backstage (developer portal)

## Phase 8: Productivity
- Nextcloud (file sync/share)
- Paperless-ngx (document management)
- Immich (photo management)

## Phase 9: Media
- Jellyfin (media server)
- Navidrome (music server)
```

### 8. Create Service Inventory

Create `docs/services.md` with complete service listing (70+ services).

### 9. Create Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "=== ACC Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check Docker
echo "Docker Status:"
docker info > /dev/null 2>&1 && echo "✅ Docker running" || echo "❌ Docker not running"

# Check Vault
echo ""
echo "Vault Status:"
curl -s $VAULT_ADDR/v1/sys/health | jq . && echo "✅ Vault healthy" || echo "❌ Vault not accessible"

# Check Ollama
echo ""
echo "Ollama Status:"
curl -s $OLLAMA_URL/api/tags | jq . && echo "✅ Ollama running" || echo "❌ Ollama not running"

# Check running containers
echo ""
echo "Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20

# Check resource usage
echo ""
echo "Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

Make executable:
```bash
chmod +x scripts/health-check.sh
```

### 10. Create .gitignore

```
# Sensitive data
.env.local
vault/init-keys.json
*.key
*.pem
*.crt

# Data directories
data/
backups/
logs/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

### 11. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial ACC project structure"
```

### 12. Generate Initialization Report

Create summary of what was initialized:

```markdown
# ACC Initialization Report

**Date:** {{timestamp}}
**Path:** {{installation_path}}
**Mode:** {{minimal/full}}

## Created Directories
- ✅ vault/
- ✅ services/ (9 phases)
- ✅ compose/
- ✅ configs/
- ✅ data/
- ✅ backups/
- ✅ scripts/
- ✅ docs/

## Created Files
- ✅ .env (base configuration)
- ✅ .gitignore
- ✅ scripts/init-vault.sh
- ✅ scripts/health-check.sh
- ✅ scripts/backup.sh
- ✅ vault/policies/acc-admin.hcl
- ✅ vault/policies/acc-service.hcl
- ✅ docs/deployment-phases.md
- ✅ docs/services.md
- ✅ docs/architecture.md

## Docker Network
- ✅ acc-network (172.20.0.0/16)

## Next Steps

1. **Initialize Vault:**
   ```bash
   ./scripts/init-vault.sh
   ```

2. **Configure environment variables** in `.env`

3. **Start foundation services:**
   ```bash
   /acc:deploy foundation
   ```

4. **Verify health:**
   ```bash
   /acc:status
   ```

5. **Deploy remaining phases** in order (see docs/deployment-phases.md)

## Hardware Configuration

- CPU Cores: 24
- RAM: 61 GB
- GPU: RX 7900 XTX
- VRAM: 24 GB

Resource allocation configured in .env

## Important Notes

- ⚠️  Vault keys stored in vault/init-keys.json - BACKUP AND SECURE
- ⚠️  Update all placeholder passwords in .env
- ⚠️  Review resource allocation based on your hardware
- ⚠️  Configure domain/DNS for Traefik before Phase 1 deployment
```

## Usage Examples

### Standard initialization in current directory
```
/acc:init
```

### Initialize in specific path
```
/acc:init --path /opt/acc
```

### Minimal setup (no templates)
```
/acc:init --minimal
```

### Full setup with all templates
```
/acc:init --path ~/projects/acc
```

## Expected Outputs

1. **Complete directory structure** created
2. **Base .env file** with all configuration variables
3. **Vault initialization scripts** ready to run
4. **Docker network** created
5. **Git repository** initialized
6. **Documentation** generated (architecture, phases, services)
7. **Helper scripts** created and executable
8. **Initialization report** summarizing what was created

## Success Criteria

- All required directories exist
- .env file created with valid configuration
- Docker network created successfully
- Vault policies created
- Scripts are executable
- Documentation is complete
- .gitignore configured properly
- Git repository initialized
- No errors during directory creation
- Initialization report generated

## Notes

- Run this command only once for initial setup
- Ensure you have sufficient disk space (recommend 500GB+ for all services)
- Vault keys must be backed up before proceeding
- Review all .env variables before deploying services
- Resource allocation should match your hardware specifications
- Domain configuration needed for Traefik (foundation phase)
- Some services require GPU access (Ollama, Frigate, Whisper)
- Use `--minimal` for faster testing/development setup
- Full setup includes all 70+ service templates
- Initialization does NOT start any services (use /acc:deploy)
