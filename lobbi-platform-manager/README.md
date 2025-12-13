# Lobbi Platform Manager

> Streamline development on the-lobbi/keycloak-alpha with Keycloak management, service orchestration, and test generation

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/the-lobbi/keycloak-alpha)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)](https://claude.com/plugins)

## Overview

The **Lobbi Platform Manager** is a comprehensive Claude Code plugin designed to streamline development on the [keycloak-alpha](https://github.com/the-lobbi/keycloak-alpha) platform - a multi-tenant MERN stack with Keycloak authentication.

This plugin provides:
- Automated Keycloak realm, client, and user provisioning
- Multi-service health monitoring and orchestration
- Environment configuration management
- Test generation for Express routes
- Security hooks to prevent committing secrets
- Service-aware deployment validation

## Features

### Keycloak Management
- Initialize realms with multi-tenant configuration
- Create and manage users (single or bulk)
- Generate tenant-specific themes
- Validate Keycloak configurations

### Service Orchestration
- Health monitoring for all 8 platform services
- Automated dependency validation
- Service lifecycle management (start, stop, restart)
- Port conflict detection

### Development Tools
- Environment file generation and validation
- Jest test generation from API routes
- Security hooks for secret detection
- Post-deployment health verification

### Platform Services

| Service         | Port | Purpose                              |
|----------------|------|--------------------------------------|
| Keycloak       | 8080 | Authentication & authorization       |
| MongoDB        | 27017| Primary database                     |
| PostgreSQL     | 5432 | Keycloak database                    |
| Redis          | 6379 | Session storage & caching            |
| API Gateway    | 3000 | Request routing                      |
| Membership     | 3001 | User & organization management       |
| Payment        | 3002 | Billing & subscription management    |
| Web            | 3003 | Frontend application                 |

## Installation

### Prerequisites

- [Claude Code CLI](https://claude.com/code)
- Docker & Docker Compose
- Node.js 18+
- Git

### Install Plugin

1. **Clone the plugin** (or copy to your Claude plugins directory):

```bash
# Clone repository
git clone https://github.com/the-lobbi/keycloak-alpha.git
cd keycloak-alpha

# Copy plugin to Claude plugins directory
cp -r .claude/plugins/lobbi-platform-manager ~/.claude/plugins/
```

2. **Activate the plugin in Claude Code**:

```bash
# In Claude Code CLI
/plugin:enable lobbi-platform-manager
```

3. **Configure local settings** (optional):

```bash
# Create local configuration file
nano .claude/lobbi-platform-manager.local.md
```

See [Configuration](#configuration) for details.

## Quick Start

### 1. Set Up Keycloak

```bash
# Initialize Keycloak realm and client
/lobbi:keycloak-setup

# Create test users
/lobbi:keycloak-user --count 10 --org acme-corp
```

### 2. Validate Environment

```bash
# Check .env configuration
/lobbi:env-validate

# Generate environment files for all environments
/lobbi:env-generate --environments dev,staging,prod
```

### 3. Monitor Services

```bash
# Check health of all services
/lobbi:health

# Manage individual services
/lobbi:service start api-gateway
/lobbi:service restart membership
/lobbi:service stop payment
```

### 4. Generate Tests

```bash
# Auto-generate Jest tests from routes
/lobbi:test-gen --service membership --route /api/organizations
```

## Commands

All commands are prefixed with `/lobbi:` for easy discovery.

| Command | Description | Example |
|---------|-------------|---------|
| `/lobbi:keycloak-setup` | Initialize Keycloak realm, client, and base configuration | `/lobbi:keycloak-setup` |
| `/lobbi:keycloak-user` | Create Keycloak users (single or bulk) | `/lobbi:keycloak-user --count 10 --org acme` |
| `/lobbi:keycloak-theme` | Generate tenant-specific themes | `/lobbi:keycloak-theme --tenant acme-corp` |
| `/lobbi:health` | Check health of all 8 platform services | `/lobbi:health` |
| `/lobbi:env-validate` | Validate .env against platform requirements | `/lobbi:env-validate` |
| `/lobbi:env-generate` | Generate .env files for environments | `/lobbi:env-generate --environments dev,prod` |
| `/lobbi:test-gen` | Generate Jest tests from API routes | `/lobbi:test-gen --service membership` |
| `/lobbi:service` | Manage service lifecycle | `/lobbi:service restart api-gateway` |

### Command Details

#### /lobbi:keycloak-setup

Initialize a complete Keycloak setup with multi-tenant configuration.

**What it does:**
- Creates a new realm (default: `lobbi`)
- Configures clients for API access
- Sets up multi-tenant user attributes
- Enables required authentication flows
- Configures password policies

**Usage:**
```bash
/lobbi:keycloak-setup

# With custom realm name
/lobbi:keycloak-setup --realm my-platform
```

**Triggers:** `keycloak-admin` agent

---

#### /lobbi:keycloak-user

Create Keycloak users for testing multi-tenant scenarios.

**What it does:**
- Creates users with realistic profile data
- Assigns `org_id` attribute for tenant isolation
- Sets up proper role mappings
- Generates secure temporary passwords
- Supports bulk creation for load testing

**Usage:**
```bash
# Create a single user
/lobbi:keycloak-user --email john@example.com --org acme-corp

# Create 50 dummy users
/lobbi:keycloak-user --count 50 --org test-org
```

**Triggers:** `keycloak-admin` agent

---

#### /lobbi:keycloak-theme

Generate and deploy tenant-specific Keycloak themes.

**What it does:**
- Creates custom login page themes
- Applies tenant branding (colors, logos)
- Generates email templates
- Validates FreeMarker templates
- Deploys to Keycloak theme directory

**Usage:**
```bash
# Generate theme for tenant
/lobbi:keycloak-theme --tenant acme-corp --primary-color #007bff

# Update existing theme
/lobbi:keycloak-theme --tenant acme-corp --update
```

**Triggers:** `keycloak-admin` agent

---

#### /lobbi:health

Check health status of all platform services.

**What it does:**
- Pings health endpoints for all services
- Checks database connectivity
- Validates Redis connection
- Reports response times
- Highlights unhealthy services

**Usage:**
```bash
/lobbi:health

# Detailed health report
/lobbi:health --verbose
```

**Triggers:** `service-orchestrator` agent

**Example Output:**
```
Service Health Report
====================
✓ Keycloak       http://localhost:8080  [200ms]
✓ MongoDB        localhost:27017         [5ms]
✓ PostgreSQL     localhost:5432          [3ms]
✓ Redis          localhost:6379          [2ms]
✓ API Gateway    http://localhost:3000  [150ms]
✓ Membership     http://localhost:3001  [120ms]
✗ Payment        http://localhost:3002  [TIMEOUT]
✓ Web            http://localhost:3003  [80ms]

7/8 services healthy
```

---

#### /lobbi:env-validate

Validate `.env` configuration against platform requirements.

**What it does:**
- Checks for required environment variables
- Validates URL formats and ports
- Detects port conflicts
- Warns about missing optional vars
- Suggests fixes for common issues

**Usage:**
```bash
/lobbi:env-validate

# Validate specific file
/lobbi:env-validate --file .env.staging
```

**Triggers:** `env-manager` agent

---

#### /lobbi:env-generate

Generate `.env` files for different environments.

**What it does:**
- Creates environment-specific configs
- Uses secure placeholder values
- Includes helpful comments
- Follows best practices
- Never includes production secrets

**Usage:**
```bash
# Generate all environment files
/lobbi:env-generate --environments dev,staging,prod

# Generate single environment
/lobbi:env-generate --environment dev
```

**Triggers:** `env-manager` agent

---

#### /lobbi:test-gen

Auto-generate Jest tests from Express routes.

**What it does:**
- Analyzes route handlers
- Generates test cases for each endpoint
- Includes request/response validation
- Mocks dependencies
- Follows testing best practices

**Usage:**
```bash
# Generate tests for service
/lobbi:test-gen --service membership

# Generate tests for specific route
/lobbi:test-gen --service membership --route /api/organizations
```

**Triggers:** `test-generator` agent

---

#### /lobbi:service

Manage individual service lifecycle.

**What it does:**
- Starts, stops, or restarts services
- Checks service status
- Monitors logs
- Validates dependencies

**Usage:**
```bash
# Start a service
/lobbi:service start api-gateway

# Restart a service
/lobbi:service restart membership

# Stop a service
/lobbi:service stop payment

# Check service status
/lobbi:service status keycloak
```

**Triggers:** `service-orchestrator` agent

## Agents

Agents are autonomous sub-agents that handle complex operations. They are automatically triggered by commands or can be invoked directly.

| Agent | Model | Purpose | Triggers |
|-------|-------|---------|----------|
| `keycloak-admin` | sonnet | Keycloak provisioning, user management, realm config | `/lobbi:keycloak-*` commands |
| `service-orchestrator` | sonnet | Health monitoring, dependency validation, service lifecycle | `/lobbi:health`, `/lobbi:service` |
| `test-generator` | haiku | Generate Jest tests from Express routes | `/lobbi:test-gen` |
| `env-manager` | haiku | Environment validation, secret management | `/lobbi:env-*` commands |

### Agent Details

#### keycloak-admin

**Model:** Claude Sonnet 4.5

**Expertise:**
- Keycloak Admin API integration
- Realm and client configuration
- Multi-tenant user provisioning
- Theme generation and deployment
- Authentication flow setup

**When it runs:**
- Creating or modifying Keycloak realms
- Managing users and roles
- Deploying custom themes
- Configuring authentication flows

**Example invocation:**
```
Hey Claude, I need to create a new Keycloak realm with 100 test users for the 'beta-testing' organization.
```

---

#### service-orchestrator

**Model:** Claude Sonnet 4.5

**Expertise:**
- Service health monitoring
- Docker Compose orchestration
- Dependency graph validation
- Port conflict resolution
- Service startup sequencing

**When it runs:**
- Checking service health
- Starting/stopping services
- Debugging service issues
- Validating service dependencies

**Example invocation:**
```
Claude, the membership service won't start. Can you check dependencies and help me debug?
```

---

#### test-generator

**Model:** Claude Haiku 3.5

**Expertise:**
- Express route analysis
- Jest test generation
- Mock creation
- Test coverage optimization
- Integration test patterns

**When it runs:**
- Generating tests for new routes
- Creating test suites
- Adding test coverage
- Validating existing tests

**Example invocation:**
```
Generate Jest tests for the new organization CRUD endpoints in the membership service.
```

---

#### env-manager

**Model:** Claude Haiku 3.5

**Expertise:**
- Environment variable validation
- Configuration file generation
- Secret management
- Multi-environment setup
- Configuration best practices

**When it runs:**
- Validating .env files
- Generating environment configs
- Detecting configuration issues
- Setting up new environments

**Example invocation:**
```
I need to set up a staging environment. Can you generate the .env file and validate the configuration?
```

## Skills

Skills provide domain knowledge and best practices that agents can leverage.

| Skill | Description |
|-------|-------------|
| `keycloak-admin` | Keycloak Admin API patterns, realm configuration, multi-tenant setup |
| `mern-patterns` | MERN stack best practices for the keycloak-alpha platform |
| `multi-tenant` | Multi-tenant architecture patterns with org_id isolation |

### Skill Details

#### keycloak-admin

**Provides:**
- Keycloak Admin REST API usage patterns
- Realm configuration best practices
- Client setup for different authentication flows
- User and role management strategies
- Theme development guidelines

**Key concepts:**
- Realm vs Client distinction
- Public vs Confidential clients
- Authorization Code Flow
- Token validation
- Custom attributes for multi-tenancy

---

#### mern-patterns

**Provides:**
- MongoDB schema design patterns
- Express middleware best practices
- React component architecture
- Node.js microservice patterns
- API design principles

**Key concepts:**
- RESTful API design
- Error handling strategies
- Database query optimization
- Authentication middleware
- Response standardization

---

#### multi-tenant

**Provides:**
- Tenant isolation strategies
- org_id-based filtering
- Cross-tenant security
- Tenant-specific configuration
- Data partitioning patterns

**Key concepts:**
- Row-level security with org_id
- Tenant context middleware
- Shared vs isolated databases
- Tenant provisioning workflows
- Cross-tenant data access prevention

## Hooks

Automated hooks run during Claude Code operations to validate security, health, and configuration.

| Hook | Event | Trigger | Purpose |
|------|-------|---------|---------|
| `pre-commit-security` | PreToolUse | Writing `.env`, `.json`, `.js`, `.ts` | Prevent committing secrets |
| `service-health-check` | PostToolUse | Modifying `docker-compose`, `Dockerfile`, `package.json` | Verify service health |
| `keycloak-validation` | PostToolUse | Modifying Keycloak configs | Validate realm/client configs |

See [hooks/README.md](hooks/README.md) for detailed hook documentation.

## Configuration

### Local Configuration File

Create `.claude/lobbi-platform-manager.local.md` to customize plugin behavior:

```yaml
---
keycloak:
  url: http://localhost:8080
  realm: lobbi
  admin_username: admin
  admin_password: admin

services:
  api_gateway: http://localhost:3000
  membership: http://localhost:3001
  payment: http://localhost:3002
  web: http://localhost:3003

databases:
  mongodb: mongodb://localhost:27017
  postgres: postgresql://localhost:5432
  redis: redis://localhost:6379

defaults:
  test_user_count: 10
  theme_primary_color: "#007bff"
  health_check_timeout: 5
---

# Lobbi Platform Manager - Local Configuration

## Custom Settings

Add your custom configuration here...
```

### Environment Variables

The plugin uses these environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server URL |
| `KEYCLOAK_REALM` | `lobbi` | Default realm name |
| `KEYCLOAK_ADMIN_USERNAME` | `admin` | Admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Admin password |

## Integration with keycloak-alpha

This plugin is specifically designed for the [keycloak-alpha](https://github.com/the-lobbi/keycloak-alpha) repository.

### Repository Structure

```
keycloak-alpha/
├── services/
│   ├── api-gateway/
│   ├── membership/
│   ├── payment/
│   └── web/
├── keycloak/
│   ├── realms/
│   └── themes/
├── docker-compose.yml
└── .env.example
```

### Workflow Integration

**Development Workflow:**

1. Clone keycloak-alpha repository
2. Enable lobbi-platform-manager plugin
3. Generate environment config: `/lobbi:env-generate --environment dev`
4. Initialize Keycloak: `/lobbi:keycloak-setup`
5. Create test users: `/lobbi:keycloak-user --count 20`
6. Start services: `docker-compose up -d`
7. Verify health: `/lobbi:health`
8. Generate tests: `/lobbi:test-gen --service membership`

**Multi-Tenant Testing:**

```bash
# Create organization-specific users
/lobbi:keycloak-user --count 10 --org acme-corp
/lobbi:keycloak-user --count 10 --org beta-inc

# Generate custom themes
/lobbi:keycloak-theme --tenant acme-corp --primary-color #ff6b6b
/lobbi:keycloak-theme --tenant beta-inc --primary-color #51cf66
```

**CI/CD Integration:**

```yaml
# .github/workflows/test.yml
- name: Validate Configuration
  run: claude /lobbi:env-validate

- name: Check Service Health
  run: claude /lobbi:health

- name: Run Generated Tests
  run: npm test
```

## Common Workflows

### Setting Up a New Developer

```bash
# 1. Clone repository
git clone https://github.com/the-lobbi/keycloak-alpha.git
cd keycloak-alpha

# 2. Generate development environment
/lobbi:env-generate --environment dev

# 3. Initialize Keycloak
/lobbi:keycloak-setup

# 4. Create test data
/lobbi:keycloak-user --count 50 --org dev-org

# 5. Start all services
docker-compose up -d

# 6. Verify everything is healthy
/lobbi:health
```

### Adding a New Microservice

```bash
# 1. Create service directory
mkdir services/notification

# 2. Generate tests
/lobbi:test-gen --service notification

# 3. Update docker-compose.yml
# (manual edit)

# 4. Validate configuration
/lobbi:env-validate

# 5. Start new service
/lobbi:service start notification

# 6. Check health
/lobbi:health
```

### Debugging Service Issues

```bash
# 1. Check overall health
/lobbi:health --verbose

# 2. Restart problematic service
/lobbi:service restart membership

# 3. Check logs
docker-compose logs membership

# 4. Validate dependencies
/lobbi:service status membership --check-deps
```

### Testing Multi-Tenant Features

```bash
# 1. Create tenants
/lobbi:keycloak-user --count 10 --org tenant-a
/lobbi:keycloak-user --count 10 --org tenant-b

# 2. Generate tenant themes
/lobbi:keycloak-theme --tenant tenant-a
/lobbi:keycloak-theme --tenant tenant-b

# 3. Generate tenant-aware tests
/lobbi:test-gen --service membership --multi-tenant

# 4. Run tests
npm test -- --grep "multi-tenant"
```

## Troubleshooting

### Keycloak Connection Issues

**Problem:** Commands fail with "Cannot connect to Keycloak"

**Solutions:**
1. Check Keycloak is running: `docker-compose ps keycloak`
2. Verify URL: `curl http://localhost:8080/health/ready`
3. Check credentials in `.env` or local config
4. Restart Keycloak: `/lobbi:service restart keycloak`

### Service Health Check Failures

**Problem:** `/lobbi:health` shows services as unhealthy

**Solutions:**
1. Check Docker: `docker-compose ps`
2. Verify ports: `netstat -an | grep LISTEN`
3. Check logs: `docker-compose logs [service-name]`
4. Restart services: `docker-compose restart`

### Environment Validation Errors

**Problem:** `/lobbi:env-validate` reports missing variables

**Solutions:**
1. Copy example file: `cp .env.example .env`
2. Generate fresh config: `/lobbi:env-generate --environment dev`
3. Check required variables in error message
4. Add missing variables to `.env`

### Test Generation Issues

**Problem:** `/lobbi:test-gen` fails or generates incorrect tests

**Solutions:**
1. Ensure route files exist and are valid
2. Check Express route syntax
3. Verify service directory structure
4. Review generated tests and adjust manually if needed

### Hook Failures

**Problem:** Security hook blocks valid changes

**Solutions:**
1. Review hook output for specific issues
2. Use placeholder values like `your_api_key_here`
3. Temporarily skip: `SKIP_SECURITY_CHECK=true`
4. See [hooks/README.md](hooks/README.md) for detailed troubleshooting

## Development

### Plugin Structure

```
lobbi-platform-manager/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/                # Slash commands
│   ├── keycloak-setup.md
│   ├── keycloak-user.md
│   ├── keycloak-theme.md
│   ├── health.md
│   ├── env-validate.md
│   ├── env-generate.md
│   ├── test-gen.md
│   └── service.md
├── agents/                  # Autonomous agents
│   ├── keycloak-admin.md
│   ├── service-orchestrator.md
│   ├── test-generator.md
│   └── env-manager.md
├── skills/                  # Domain knowledge
│   ├── keycloak-admin/
│   ├── mern-patterns/
│   └── multi-tenant/
├── hooks/                   # Automated hooks
│   ├── hooks.json
│   ├── scripts/
│   │   ├── check-security.sh
│   │   ├── check-health.sh
│   │   └── check-keycloak.sh
│   ├── .env.example
│   └── README.md
└── README.md               # This file
```

### Contributing

We welcome contributions! To add new features:

1. **Add a new command**: Create a `.md` file in `commands/`
2. **Add an agent**: Create a `.md` file in `agents/`
3. **Add a skill**: Create a `SKILL.md` in `skills/{skill-name}/`
4. **Add a hook**: Create a script in `hooks/scripts/` and register in `hooks.json`
5. Update `plugin.json` to register your additions

### Testing

Test the plugin locally:

```bash
# Install plugin in development mode
ln -s $(pwd) ~/.claude/plugins/lobbi-platform-manager

# Test commands
/lobbi:health
/lobbi:keycloak-setup --dry-run

# Test hooks
./hooks/scripts/check-security.sh .env
./hooks/scripts/check-health.sh docker-compose.yml
```

## Resources

### Documentation

- [Plugin.json Reference](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)
- [Agent Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/agent-development.md)
- [Hook Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/hook-development.md)
- [Hooks README](hooks/README.md)

### Related Projects

- [keycloak-alpha](https://github.com/the-lobbi/keycloak-alpha) - Target repository
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Claude Code Documentation](https://claude.com/code/docs)

### Support

- **Issues:** [GitHub Issues](https://github.com/the-lobbi/keycloak-alpha/issues)
- **Discussions:** [GitHub Discussions](https://github.com/the-lobbi/keycloak-alpha/discussions)
- **Contact:** markus@lobbi.com

## License

MIT License - See [LICENSE](LICENSE) for details.

## Changelog

### v1.0.0 (2025-12-12)

Initial release:
- 8 slash commands for Keycloak and service management
- 4 specialized agents (keycloak-admin, service-orchestrator, test-generator, env-manager)
- 3 domain skills (keycloak-admin, mern-patterns, multi-tenant)
- 3 automated hooks (security, health, keycloak validation)
- Integration with keycloak-alpha repository
- Comprehensive documentation

---

**Made with ❤️ for the Lobbi Platform**
