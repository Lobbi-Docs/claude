# Lobbi Platform Manager - Hooks

This directory contains automated hooks that run during Claude Code operations to validate security, service health, and Keycloak configuration changes.

## Overview

Hooks are automated scripts that execute at specific events during development:

- **Pre-commit security checks** - Prevent committing secrets
- **Post-deployment health checks** - Validate services after changes
- **Keycloak configuration validation** - Ensure valid realm/client configs

## Available Hooks

### 1. Pre-Commit Security Check (`pre-commit-security`)

**Trigger:** Before writing/editing `.env`, `.json`, `.js`, `.ts` files

**Purpose:** Prevent committing hardcoded secrets and credentials

**Checks:**
- AWS Access Keys
- OpenAI API Keys
- Slack tokens
- GitHub Personal Access Tokens
- MongoDB/PostgreSQL connection strings with passwords
- Generic API keys and secrets
- Production configuration in .env files
- Hardcoded credentials in code

**Example Output:**
```bash
[SECURITY CHECK] Starting security validation...
[INFO] Validating .env file: .env.local
[WARNING] .env file contains long values that might be real secrets
[WARNING] Ensure these are development/example values only
[PASSED] Security validation successful
```

### 2. Service Health Check (`service-health-check`)

**Trigger:** After writing/editing `docker-compose`, `Dockerfile`, `package.json` files

**Purpose:** Verify platform services are responding after deployment changes

**Checks:**
- Keycloak (`http://localhost:8080/health/ready`)
- API Gateway (`http://localhost:3000/health`)
- Membership Service (`http://localhost:3001/health`)
- Payment Service (`http://localhost:3002/health`)
- Web Service (`http://localhost:3003`)
- MongoDB (`localhost:27017`)
- PostgreSQL (`localhost:5432`)
- Redis (`localhost:6379`)

**Example Output:**
```bash
[HEALTH CHECK] Starting service health validation...
[INFO] Changed file: docker-compose.yml
[INFO] Checking Keycloak at http://localhost:8080/health/ready
[OK] Keycloak is healthy
[INFO] Checking API Gateway at http://localhost:3000/health
[OK] API Gateway is healthy
[PASSED] All checked services are healthy
```

### 3. Keycloak Validation (`keycloak-validation`)

**Trigger:** After writing/editing files matching `keycloak`, `realm`, or `theme` patterns

**Purpose:** Validate Keycloak configuration changes

**Checks:**
- Valid JSON syntax in realm/client configs
- Required fields (realm name, client ID)
- Security warnings (wildcard redirect URIs)
- Public client configuration
- FreeMarker template syntax
- CSS file structure
- Keycloak service availability

**Example Output:**
```bash
[KEYCLOAK CHECK] Starting Keycloak validation...
[INFO] Validating file: config/realm-lobbi.json
[INFO] Validating realm configuration...
[OK] Valid JSON syntax
[OK] Realm name: lobbi
[INFO] Checking Keycloak availability at http://localhost:8080
[OK] Keycloak is accessible
[PASSED] Keycloak configuration validation successful
```

## Configuration

### Environment Variables

Create a `.env` file in the hooks directory (based on `.env.example`):

```bash
# Copy the example file
cp hooks/.env.example hooks/.env

# Edit with your values
nano hooks/.env
```

**Important:** Never commit the `.env` file - it should contain only local/development values.

### Hook Configuration

Hooks are defined in `hooks.json`:

```json
{
  "hooks": [
    {
      "name": "pre-commit-security",
      "event": "PreToolUse",
      "toolPattern": "(Write|Edit)",
      "filePattern": "\\.(env|json|js|ts)$",
      "script": "scripts/check-security.sh"
    }
  ]
}
```

**Fields:**
- `name` - Unique hook identifier
- `event` - When to run (`PreToolUse`, `PostToolUse`, `Stop`, etc.)
- `toolPattern` - Regex matching tool names that trigger the hook
- `filePattern` - Regex matching file paths that trigger the hook
- `script` - Path to the script to execute (relative to hooks directory)

## Script Details

### check-security.sh

**Location:** `hooks/scripts/check-security.sh`

**Dependencies:** `grep`, `bash`

**Exit Codes:**
- `0` - Validation passed
- `1` - Security issues found (blocks operation)

**Bypass:** Set `SKIP_SECURITY_CHECK=true` in `.env` (not recommended)

### check-health.sh

**Location:** `hooks/scripts/check-health.sh`

**Dependencies:** `curl`, `bash`, `timeout`

**Exit Codes:**
- `0` - All services healthy or warnings only (never blocks)

**Configuration:**
- `HEALTH_CHECK_TIMEOUT` - HTTP request timeout (default: 5 seconds)
- Individual service URLs can be overridden via environment variables

**Note:** This hook never fails - it only warns about unhealthy services to avoid blocking development.

### check-keycloak.sh

**Location:** `hooks/scripts/check-keycloak.sh`

**Dependencies:** `jq`, `curl`, `bash`

**Exit Codes:**
- `0` - Validation passed
- `1` - Configuration errors found (blocks operation)

**Configuration:**
- `KEYCLOAK_URL` - Keycloak server URL for availability checks

## Troubleshooting

### Hook Not Running

**Problem:** Hook doesn't execute when expected

**Solutions:**
1. Check hook is enabled in `plugin.json`
2. Verify file pattern matches: `echo "myfile.js" | grep -E "\.(env|json|js|ts)$"`
3. Check hook logs in Claude Code output
4. Ensure script has execute permissions: `chmod +x hooks/scripts/*.sh`

### False Positives in Security Check

**Problem:** Security hook flags legitimate code

**Solutions:**
1. Use placeholder values like `your_api_key_here` or `example_value`
2. Add comments explaining why the value is safe
3. Temporarily bypass with `SKIP_SECURITY_CHECK=true` (commit separately)
4. Adjust regex patterns in `check-security.sh`

### Health Check Failures

**Problem:** Services reported as unhealthy

**Solutions:**
1. Start services: `docker-compose up -d`
2. Check service logs: `docker-compose logs [service-name]`
3. Verify ports are correct in `.env`
4. Increase timeout: `HEALTH_CHECK_TIMEOUT=10`
5. Health check warnings don't block operations - they're informational

### Keycloak Validation Errors

**Problem:** Valid configuration flagged as invalid

**Solutions:**
1. Verify JSON syntax with `jq . config/realm.json`
2. Check required fields are present
3. Ensure Keycloak is running for availability checks
4. Review script output for specific error messages

## Adding Custom Hooks

### 1. Create a new hook script

```bash
# Create the script
touch hooks/scripts/my-custom-check.sh
chmod +x hooks/scripts/my-custom-check.sh
```

### 2. Implement the hook

```bash
#!/bin/bash
set -e

FILE_PATH="${1:-}"
echo "[MY CHECK] Validating $FILE_PATH"

# Your validation logic here

exit 0  # 0 = pass, 1 = fail
```

### 3. Register in hooks.json

```json
{
  "name": "my-custom-check",
  "event": "PostToolUse",
  "toolPattern": "Write",
  "filePattern": "\\.config$",
  "script": "scripts/my-custom-check.sh"
}
```

### 4. Update plugin.json

Add the hook to the `hooks` section in `.claude-plugin/plugin.json`.

## Best Practices

### Security Hooks

- **Always run before commits** - Catch secrets before they're committed
- **Use strict patterns** - Better to flag false positives than miss real secrets
- **Document exceptions** - Explain why flagged values are safe
- **Test regularly** - Ensure patterns catch common secret formats

### Health Hooks

- **Non-blocking warnings** - Don't stop development for transient issues
- **Smart timeouts** - Balance speed vs reliability (5s is usually good)
- **Contextual checks** - Only check services related to changed files
- **Clear messages** - Help developers understand what's wrong

### Configuration Hooks

- **Fail fast** - Invalid configs should block immediately
- **Specific errors** - Tell developers exactly what's wrong
- **Validate early** - Catch issues before deployment
- **Test configurations** - Verify hooks work with real configs

## Integration with CI/CD

Hooks can also be used in CI/CD pipelines:

```bash
# Run security check in CI
./hooks/scripts/check-security.sh path/to/file

# Run health check in CD
./hooks/scripts/check-health.sh docker-compose.yml

# Run all hooks
for script in hooks/scripts/*.sh; do
    bash "$script" || exit 1
done
```

## See Also

- [Main Plugin README](../README.md) - Plugin overview and commands
- [Plugin Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/plugin-development.md)
- [Hook Development Guide](https://github.com/markus41/obsidian/blob/main/System/Claude-Instructions/hook-development.md)
