# Plugin Marketplace Infrastructure - Quick Reference

**Version:** 5.0.0 | **Last Updated:** 2025-12-12

---

## Table of Contents

- [Slash Commands](#slash-commands)
- [Key File Locations](#key-file-locations)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

---

## Slash Commands

### Core Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/init` | Initialize project environment | `/init` |
| `/status` | Show orchestration status | `/status` |
| `/project-status` | Comprehensive project dashboard | `/project-status` |
| `/clean` | Clean temporary files and caches | `/clean` |

### Development Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/test` | Run tests with coverage | `/test [path] [--coverage]` |
| `/review` | Comprehensive code review | `/review [file\|pr]` |
| `/debug` | Debug failed tasks | `/debug [task-id]` |
| `/generate-tests` | Generate test cases | `/generate-tests [path]` |
| `/optimize-code` | Optimize code performance | `/optimize-code [path]` |

### Plugin Management Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/plugin-install` | Install plugin from registry | `/plugin-install <name>[@version]` |
| `/plugin-uninstall` | Remove installed plugin | `/plugin-uninstall <name>` |
| `/plugin-list` | List installed plugins | `/plugin-list [--verbose]` |
| `/plugin-update` | Update plugin to latest version | `/plugin-update [name]` |
| `/plugin-search` | Search plugin marketplace | `/plugin-search <query>` |
| `/plugin-dev` | Plugin development tools | `/plugin-dev <create\|test\|validate>` |
| `/plugin-migrate` | Migrate plugin versions | `/plugin-migrate <source> <target>` |

### Intelligence Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/evolve-agents` | Analyze agent performance | `/evolve-agents <analyze\|report>` |
| `/memory` | Manage agent memory | `/memory <search\|store\|recall>` |
| `/model` | Manage LLM routing | `/model <status\|route\|configure>` |
| `/telemetry` | View metrics and analytics | `/telemetry <summary\|dashboard>` |

### Ecosystem Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/archetype` | Create from templates | `/archetype <list\|create> [name]` |
| `/secrets` | Manage encrypted secrets | `/secrets <get\|set\|list\|rotate>` |
| `/playground` | Interactive testing environment | `/playground [--load <plugin>]` |
| `/mcp-generate` | Generate MCP server | `/mcp-generate --name <name>` |
| `/context` | Manage context budget | `/context <status\|optimize>` |

### DevOps Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/deploy` | Deploy application | `/deploy [env]` |
| `/helm-deploy` | Helm deployment | `/helm-deploy <install\|upgrade>` |
| `/k8s-debug` | Debug Kubernetes issues | `/k8s-debug [resource]` |
| `/rollback` | Rollback deployment | `/rollback [version]` |
| `/scale` | Scale resources | `/scale [replicas]` |

### Security Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/security-scan` | Scan for vulnerabilities | `/security-scan [path]` |
| `/secure-audit` | Security audit | `/secure-audit [--full]` |
| `/compliance-audit` | Compliance check | `/compliance-audit` |

### Documentation Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/doc-sync` | Sync docs to Obsidian vault | `/doc-sync` |
| `/doc-audit` | Audit documentation coverage | `/doc-audit` |
| `/document-api` | Generate API docs | `/document-api [path]` |

---

## Key File Locations

### Configuration Files

```
.claude/
├── CLAUDE.md                          # Main orchestration config
├── registry/
│   ├── commands.index.json            # Command registry (60 commands)
│   ├── agents.index.json              # Agent registry
│   ├── skills.index.json              # Skill registry
│   ├── workflows.index.json           # Workflow registry
│   └── plugins.index.json             # Plugin registry
├── schemas/
│   ├── plugin.schema.json             # Plugin validation schema
│   ├── agent.schema.json              # Agent validation schema
│   ├── command.schema.json            # Command validation schema
│   ├── skill.schema.json              # Skill validation schema
│   ├── workflow.schema.json           # Workflow validation schema
│   └── registry.schema.json           # Registry validation schema
└── core/
    ├── package.json                   # Core dependencies
    └── validator.ts                   # Schema validator
```

### Core Infrastructure

```
.claude/core/
├── validator.ts                       # Schema validation
├── dependency-resolver.ts             # Dependency management
├── versioning/                        # Version control (11 files)
│   ├── semver.ts                      # Semantic versioning
│   ├── upgrade.ts                     # Upgrade management
│   └── migration.ts                   # Migration paths
├── sandbox/                           # Isolation layer (14 files)
│   ├── process-isolator.ts            # Process isolation
│   ├── resource-limiter.ts            # Resource limits
│   └── network-restrictor.ts          # Network control
├── health/                            # Monitoring (15 files)
│   ├── metrics-collector.ts           # Metrics collection
│   ├── status-tracker.ts              # Status tracking
│   └── alerting.ts                    # Alert management
├── discovery/                         # Auto-discovery (17 files)
│   ├── file-scanner.ts                # File system scanner
│   ├── registry-indexer.ts            # Registry indexing
│   └── capability-mapper.ts           # Capability mapping
└── secrets/                           # Secrets manager (11 files)
    ├── encryption.ts                  # AES-256 encryption
    ├── key-rotation.ts                # Key rotation
    └── access-control.ts              # RBAC
```

### Intelligence Layer

```
.claude/orchestration/
├── evolution/                         # Learning engine (12 files)
│   ├── pattern-detector.ts            # Pattern detection
│   ├── capability-expander.ts         # Capability expansion
│   └── performance-analyzer.ts        # Performance analysis
├── memory/                            # Memory system (10 files)
│   ├── episodic.ts                    # Episodic memory
│   ├── semantic.ts                    # Semantic memory
│   ├── procedural.ts                  # Procedural memory
│   └── retrieval.ts                   # Memory retrieval
├── routing/                           # Smart router (12 files)
│   ├── capability-matcher.ts          # Capability matching
│   ├── load-balancer.ts               # Load distribution
│   └── failover.ts                    # Failover handling
├── telemetry/                         # Metrics (7 files)
│   ├── collector.ts                   # Event collection
│   ├── aggregator.ts                  # Data aggregation
│   └── visualizer.ts                  # Dashboard rendering
├── context/                           # Context manager (17 files)
│   ├── budget-tracker.ts              # Token tracking
│   ├── compressor.ts                  # Auto-compression
│   └── checkpoint.ts                  # Checkpoint creation
└── distributed/                       # Multi-node (14 files)
    ├── coordinator.ts                 # Task coordination
    ├── worker.ts                      # Worker nodes
    └── consensus.ts                   # Leader election
```

### Developer Tools

```
.claude/tools/
├── plugin-cli/                        # CLI interface (13,270 files)
│   ├── commands/
│   │   ├── install.ts                 # Plugin installation
│   │   ├── uninstall.ts               # Plugin removal
│   │   ├── list.ts                    # List plugins
│   │   ├── update.ts                  # Update plugins
│   │   ├── validate.ts                # Validation
│   │   ├── search.ts                  # Marketplace search
│   │   └── publish.ts                 # Publish to registry
│   └── index.ts                       # CLI entry point
├── mcp-generator/                     # MCP scaffolding (6,005 files)
│   ├── templates/                     # Server templates
│   ├── generator.ts                   # Code generation
│   └── validator.ts                   # Template validation
├── playground/                        # Interactive testing (4,497 files)
│   ├── editor/                        # Code editor
│   ├── executor/                      # Execution engine
│   ├── visualizer/                    # Result display
│   └── server.ts                      # Playground server
├── registry-api/                      # REST API (21 files)
│   ├── routes/
│   │   ├── plugins.ts                 # Plugin endpoints
│   │   ├── search.ts                  # Search endpoint
│   │   └── versions.ts                # Version management
│   └── server.ts                      # API server
└── archetypes/                        # Templates (5 directories)
    ├── frontend-agent/                # Frontend template
    ├── backend-agent/                 # Backend template
    ├── devops-agent/                  # DevOps template
    ├── testing-agent/                 # Testing template
    └── security-agent/                # Security template
```

### Database

```
.claude/orchestration/db/
├── schema.sql                         # Main schema
├── migrations.sql                     # Version migrations
├── evolution.sql                      # Evolution patterns
├── memory.sql                         # Memory contexts
├── routing.sql                        # Routing decisions
├── telemetry.sql                      # Telemetry events
├── discovery.sql                      # Discovery cache
├── playground.sql                     # Playground sessions
├── context.sql                        # Context checkpoints
├── distributed.sql                    # Distributed state
└── secrets.sql                        # Encrypted secrets
```

---

## Common Workflows

### 1. Create New Plugin

```bash
# Step 1: Choose archetype
claude archetype --list

# Step 2: Create from archetype
claude archetype --create backend-agent --name my-api-agent

# Step 3: Develop plugin
cd .claude/plugins/my-api-agent
# Edit index.ts, add capabilities

# Step 4: Validate
claude plugin-dev validate

# Step 5: Test in playground
claude playground --load my-api-agent

# Step 6: Publish
claude plugin-dev publish
```

### 2. Install and Use Plugin

```bash
# Install from marketplace
claude plugin-install @lobbi/backend-agent

# Verify installation
claude plugin-list --verbose

# Use plugin
/backend-analyze --path src/api

# Update plugin
claude plugin-update @lobbi/backend-agent
```

### 3. Monitor System Health

```bash
# Check overall status
claude health --verbose

# View telemetry dashboard
claude telemetry --dashboard

# Analyze agent performance
claude evolve-agents analyze

# Check memory usage
claude memory stats

# Review routing decisions
claude model status
```

### 4. Manage Secrets

```bash
# Set secret
claude secrets set OPENAI_API_KEY --env production

# List secrets (shows names only)
claude secrets list --env production

# Rotate secret
claude secrets rotate OPENAI_API_KEY

# Delete secret
claude secrets delete OLD_API_KEY
```

### 5. Debug Issues

```bash
# Check system status
claude status

# Review recent logs
claude logs --tail 100

# Debug specific task
claude debug task-12345

# Check diagnostics
claude health --check

# View error metrics
claude telemetry --filter error --last 24h
```

### 6. Deploy Application

```bash
# Validate before deploy
claude test --coverage
claude security-scan

# Deploy to staging
claude deploy staging

# Monitor deployment
claude k8s-debug deployment/my-app

# Check health
claude health --namespace staging

# If issues, rollback
claude rollback v1.2.3
```

---

## Troubleshooting

### Plugin Installation Fails

**Symptom:** `claude plugin-install` returns error

**Solutions:**
```bash
# Check registry connectivity
curl https://registry.claude.dev/health

# Validate plugin metadata
claude plugin-dev validate /path/to/plugin

# Check dependencies
claude plugin-dev validate --check-deps

# Clear cache
claude clean --cache

# Retry with verbose logging
claude plugin-install <name> --verbose
```

### Agent Performance Degraded

**Symptom:** Slow task execution, high error rate

**Solutions:**
```bash
# Check telemetry
claude telemetry --summary --last 1h

# Analyze agent performance
claude evolve-agents analyze

# Check memory pressure
claude memory stats

# Optimize context
claude context optimize

# Restart distributed workers
claude orchestrate-complex --restart-workers
```

### Memory Issues

**Symptom:** "Token budget exceeded" or OOM errors

**Solutions:**
```bash
# Check current usage
claude context status

# Compress context
claude context optimize --compress

# Create checkpoint
claude context checkpoint

# Clear old memory
claude memory prune --older-than 7d

# Adjust limits (in .claude/CLAUDE.md)
# Set CONTEXT_BUDGET=150000
```

### Database Lock Issues

**Symptom:** "Database is locked" errors

**Solutions:**
```bash
# Check active connections
sqlite3 .claude/orchestration/db/claude.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Optimize database
sqlite3 .claude/orchestration/db/claude.db "VACUUM; ANALYZE;"

# Kill zombie processes
ps aux | grep claude | grep -v grep | awk '{print $2}' | xargs kill

# Restart orchestration
claude status --restart
```

### Secret Access Denied

**Symptom:** "Permission denied" when accessing secrets

**Solutions:**
```bash
# Check RBAC permissions
claude secrets list --verbose

# Verify environment
echo $ENVIRONMENT

# Re-authenticate
claude secrets login

# Check audit log
sqlite3 .claude/orchestration/db/claude.db "SELECT * FROM audit_log WHERE resource LIKE '%secret%' ORDER BY timestamp DESC LIMIT 10;"
```

### MCP Server Not Responding

**Symptom:** MCP tools unavailable or timing out

**Solutions:**
```bash
# Check MCP status
claude mcp-status

# Restart MCP servers
claude mcp-restart

# View MCP logs
claude logs --filter mcp

# Test specific MCP
claude mcp-test obsidian

# Regenerate MCP config
claude mcp-generate --reconfigure
```

---

## Environment Variables

### Required

```bash
# LLM API Keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."           # Optional, for GPT agents

# Project Configuration
export PROJECT_NAME="my-project"
export PROJECT_ROOT="/path/to/project"
export OBSIDIAN_VAULT_PATH="/path/to/obsidian"
```

### Optional

```bash
# Performance Tuning
export MAX_AGENTS=10                      # Max concurrent agents
export MEMORY_LIMIT=2048                  # Memory quota per agent (MB)
export CONTEXT_BUDGET=100000              # Token budget
export CACHE_TTL=3600                     # Cache TTL (seconds)

# Distributed Mode
export DISTRIBUTED_MODE=true
export REDIS_URL="redis://localhost:6379"
export POSTGRES_URL="postgresql://..."

# Database
export DB_PATH=".claude/orchestration/db/claude.db"
export DB_POOL_SIZE=10

# Logging
export LOG_LEVEL=info                     # debug, info, warn, error
export LOG_FORMAT=json                    # text, json
export LOG_DESTINATION=file               # console, file, both

# Security
export SECRETS_ENCRYPTION_KEY="..."       # AES-256 key
export ENABLE_AUDIT_LOG=true
export SESSION_TIMEOUT=3600               # Session timeout (seconds)

# Monitoring
export ENABLE_TELEMETRY=true
export TELEMETRY_ENDPOINT="https://..."
export HEALTH_CHECK_INTERVAL=60           # Health check interval (seconds)

# Networking
export HTTP_TIMEOUT=30000                 # HTTP timeout (ms)
export RETRY_MAX_ATTEMPTS=3
export RETRY_BACKOFF_MS=1000
```

### Integration Keys

```bash
# GitHub
export GITHUB_TOKEN="ghp_..."

# Supabase
export SUPABASE_URL="https://..."
export SUPABASE_KEY="..."

# Vercel
export VERCEL_TOKEN="..."

# Upstash
export UPSTASH_REDIS_URL="..."
export UPSTASH_QSTASH_TOKEN="..."

# Jira
export JIRA_API_TOKEN="..."
export JIRA_BASE_URL="https://..."

# Confluence
export CONFLUENCE_API_TOKEN="..."
```

---

## Quick Tips

### Performance Optimization

1. **Enable caching:**
   ```bash
   export CACHE_TTL=3600
   ```

2. **Use distributed mode for large projects:**
   ```bash
   export DISTRIBUTED_MODE=true
   export REDIS_URL="redis://localhost:6379"
   ```

3. **Optimize context regularly:**
   ```bash
   claude context optimize --schedule daily
   ```

4. **Pre-warm agent capabilities:**
   ```bash
   claude evolve-agents analyze --preload
   ```

### Development Best Practices

1. **Always validate before publishing:**
   ```bash
   claude plugin-dev validate && claude plugin-dev publish
   ```

2. **Use archetypes for consistency:**
   ```bash
   claude archetype --create <type> --name <name>
   ```

3. **Test in playground before production:**
   ```bash
   claude playground --load <plugin>
   ```

4. **Keep dependencies updated:**
   ```bash
   claude plugin-update --all --check-breaking
   ```

### Security Best Practices

1. **Rotate secrets regularly:**
   ```bash
   claude secrets rotate --all --schedule monthly
   ```

2. **Enable audit logging:**
   ```bash
   export ENABLE_AUDIT_LOG=true
   ```

3. **Run security scans before deploy:**
   ```bash
   claude security-scan && claude secure-audit
   ```

4. **Use environment-specific secrets:**
   ```bash
   claude secrets set KEY --env production
   ```

---

## Support

**Documentation:** `.claude/docs/`
**Registry:** `.claude/registry/`
**Issues:** Check logs with `claude logs --tail 100`
**Health:** `claude health --verbose`

**For detailed documentation, see:**
- Main docs: [Plugin-Marketplace-Infrastructure.md](C:\Users\MarkusAhling\obsidian\Projects\Claude-Code\Plugin-Marketplace-Infrastructure.md)
- API reference: `.claude/docs/api-reference.md`
- Plugin development: `.claude/docs/plugin-development.md`
- Security guide: `.claude/docs/security.md`

---

**Version:** 5.0.0 | **Total Commands:** 60 | **Total Plugins:** TBD
