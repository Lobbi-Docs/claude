---
description: Generate .env files for dev/staging/prod environments
argument-hint: "[--mode MODE] [--output FILE]"
allowed-tools: ["Write", "Read", "Bash"]
---

Generate complete .env configuration files for different environments (development, staging, production) with sensible defaults and prompts for required secrets.

## Your Task

You are generating an environment configuration file for the Lobbi platform. Create a complete .env file with appropriate values for the specified environment, using secure defaults and prompting for sensitive information.

## Arguments

- `--mode` (required): Environment mode (dev, staging, prod)
- `--output` (optional): Output file path (default: ".env.{mode}")

## Steps to Execute

### 1. Determine Target Environment
- Parse --mode argument (dev, staging, prod)
- Set output file path (default: .env.development, .env.staging, .env.production)
- Load environment-specific defaults

### 2. Generate Base Configuration

#### For Development Mode
```env
# Environment
NODE_ENV=development
LOG_LEVEL=debug

# Ports
API_GATEWAY_PORT=5000
MEMBERSHIP_SERVICE_PORT=5001
PAYMENT_SERVICE_PORT=5002
WEB_PORT=3000
KEYCLOAK_PORT=8080
```

#### For Staging Mode
```env
# Environment
NODE_ENV=staging
LOG_LEVEL=info

# Ports (use standard ports with reverse proxy)
API_GATEWAY_PORT=5000
MEMBERSHIP_SERVICE_PORT=5001
PAYMENT_SERVICE_PORT=5002
WEB_PORT=3000
KEYCLOAK_PORT=8080
```

#### For Production Mode
```env
# Environment
NODE_ENV=production
LOG_LEVEL=warn

# Ports
API_GATEWAY_PORT=5000
MEMBERSHIP_SERVICE_PORT=5001
PAYMENT_SERVICE_PORT=5002
WEB_PORT=3000
KEYCLOAK_PORT=8080
```

### 3. Generate Keycloak Configuration

```env
# Keycloak Configuration
KEYCLOAK_URL={{keycloak_url}}  # Prompt or default
KEYCLOAK_REALM={{realm}}        # Prompt or default: master
KEYCLOAK_CLIENT_ID={{client}}   # Prompt or default: lobbi-web
KEYCLOAK_CLIENT_SECRET={{secret}}  # MUST PROMPT (no default)
KEYCLOAK_ADMIN_USERNAME={{admin_user}}  # Prompt or default: admin
KEYCLOAK_ADMIN_PASSWORD={{admin_pass}}  # MUST PROMPT (no default)
KEYCLOAK_DB_VENDOR=postgres
```

**Defaults by environment:**
- Dev: `KEYCLOAK_URL=http://localhost:8080`
- Staging: `KEYCLOAK_URL=https://auth.staging.lobbi.com`
- Prod: `KEYCLOAK_URL=https://auth.lobbi.com`

### 4. Generate Database Configuration

```env
# MongoDB
MONGO_URI={{mongo_uri}}  # Environment-specific
MONGO_DB_NAME={{db_name}}  # Prompt or default: lobbi

# PostgreSQL
POSTGRES_HOST={{pg_host}}
POSTGRES_PORT=5432
POSTGRES_DB={{pg_db}}  # Prompt or default: keycloak
POSTGRES_USER={{pg_user}}  # Prompt or default: postgres
POSTGRES_PASSWORD={{pg_pass}}  # MUST PROMPT (no default)

# Redis
REDIS_HOST={{redis_host}}
REDIS_PORT=6379
REDIS_PASSWORD={{redis_pass}}  # Prompt (optional for dev, required for prod)
REDIS_DB=0
REDIS_TTL=86400
```

**Defaults by environment:**
- Dev: localhost for all hosts
- Staging: Service DNS names (e.g., postgres.staging.svc.cluster.local)
- Prod: Service DNS names or external endpoints

### 5. Generate Security Secrets

```env
# Security Secrets
SESSION_SECRET={{session_secret}}  # Generate random 64-char hex
JWT_SECRET={{jwt_secret}}  # Generate random 64-char hex
ENCRYPTION_KEY={{encryption_key}}  # Generate random 32-byte hex

# JWT Configuration
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
```

**Generation:**
- Use `openssl rand -hex 32` for SESSION_SECRET and JWT_SECRET
- Use `openssl rand -hex 16` for ENCRYPTION_KEY

### 6. Generate Service Configuration

```env
# CORS Configuration
CORS_ORIGIN={{cors_origin}}

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100

# Features
ENABLE_SWAGGER={{enable_swagger}}
ENABLE_METRICS=true

# Multi-Tenant
DEFAULT_ORG_ID=org-001
ENABLE_ORG_ISOLATION=true
ORG_SUBDOMAIN_ENABLED={{subdomain_enabled}}
```

**Defaults by environment:**
- Dev: `CORS_ORIGIN=*`, `ENABLE_SWAGGER=true`, `ORG_SUBDOMAIN_ENABLED=false`
- Staging: `CORS_ORIGIN=https://staging.lobbi.com`, `ENABLE_SWAGGER=true`, `ORG_SUBDOMAIN_ENABLED=true`
- Prod: `CORS_ORIGIN=https://lobbi.com`, `ENABLE_SWAGGER=false`, `ORG_SUBDOMAIN_ENABLED=true`

### 7. Generate Payment Configuration

```env
# Stripe Payment
STRIPE_API_KEY={{stripe_key}}  # MUST PROMPT
STRIPE_PUBLISHABLE_KEY={{stripe_pub}}  # MUST PROMPT
STRIPE_WEBHOOK_SECRET={{stripe_webhook}}  # MUST PROMPT
PAYMENT_CURRENCY=USD
PAYMENT_RETURN_URL={{return_url}}
```

**Prompts:**
- Ask for Stripe test keys in dev
- Ask for Stripe live keys in production
- Validate key format (sk_test_ or sk_live_)

### 8. Generate Email Configuration (Optional)

```env
# Email Configuration (Optional)
SMTP_HOST={{smtp_host}}  # Prompt or skip
SMTP_PORT=587
SMTP_USER={{smtp_user}}  # Prompt or skip
SMTP_PASS={{smtp_pass}}  # Prompt or skip
EMAIL_FROM={{from_email}}
EMAIL_FROM_NAME=Lobbi Platform
```

**Prompt:** "Configure email? (y/n)"
- If yes, prompt for SMTP details
- If no, add commented-out placeholders

### 9. Generate Monitoring Configuration

```env
# Monitoring & Observability
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
LOG_FILE_PATH=/var/log/lobbi/app.log

# Error Tracking (Optional)
SENTRY_DSN={{sentry_dsn}}  # Prompt or skip
```

### 10. Interactive Prompts for Secrets

For each MUST PROMPT variable:
1. Display prompt with description
2. If user provides value, use it
3. If user skips, generate random (for secrets) or use commented placeholder
4. Validate format before accepting

**Example prompts:**
```
Enter KEYCLOAK_CLIENT_SECRET (or press Enter to skip):
Enter POSTGRES_PASSWORD (required for production):
Enter Stripe API Key (sk_test_... or sk_live_...):
```

### 11. Write .env File

- Write all configuration to output file
- Add header comment with generation info
- Group variables by category
- Add inline comments for complex variables
- Set file permissions to 600 (read/write owner only)

### 12. Generate .env.example

- Create .env.example with same structure
- Replace all sensitive values with placeholders
- Keep defaults and structure
- This file can be committed to git

### 13. Validate Generated Configuration

- Run basic validation (check required variables present)
- Check for placeholder values in production mode
- Verify URL formats
- Validate port ranges
- Check secret lengths

## Usage Examples

### Generate development .env
```
/lobbi:env-generate --mode dev
```

### Generate production .env with custom output
```
/lobbi:env-generate --mode prod --output .env.production
```

### Generate staging configuration
```
/lobbi:env-generate --mode staging
```

## Expected Outputs

### Interactive Session
```
=== LOBBI PLATFORM ENV GENERATOR ===
Mode: production
Output: .env.production

Generating configuration...

REQUIRED SECRETS
────────────────
These secrets must be provided for production:

? Enter KEYCLOAK_CLIENT_SECRET: ************************
? Enter KEYCLOAK_ADMIN_PASSWORD: ************
? Enter POSTGRES_PASSWORD: ************
? Enter Stripe API Key (sk_live_...): sk_live_************************
? Enter Stripe Publishable Key (pk_live_...): pk_live_************************
? Enter Stripe Webhook Secret: whsec_************************

OPTIONAL CONFIGURATION
──────────────────────
? Configure email (SMTP)? (y/n): y
? SMTP Host: smtp.gmail.com
? SMTP User: noreply@lobbi.com
? SMTP Password: ****************

? Enable Sentry error tracking? (y/n): y
? Sentry DSN: https://************************@sentry.io/123456

GENERATING SECRETS
──────────────────
✅ Generated SESSION_SECRET (64 chars)
✅ Generated JWT_SECRET (64 chars)
✅ Generated ENCRYPTION_KEY (32 bytes)

WRITING FILES
─────────────
✅ Created: .env.production (52 variables)
✅ Created: .env.example (template)
✅ Set permissions: 600 (owner read/write only)

VALIDATION
──────────
✅ All required variables present
✅ All secrets meet minimum length
✅ Production using HTTPS URLs
✅ Stripe using live keys
⚠️  Remember to update CORS_ORIGIN with actual domain

✅ Environment configuration generated successfully

Next steps:
1. Review .env.production
2. Update domain-specific URLs
3. Test configuration: /lobbi:env-validate --file .env.production --strict
4. DO NOT commit .env.production to git
```

### Generated .env File
```env
# ============================================
# Lobbi Platform Environment Configuration
# Environment: production
# Generated: 2025-12-12 10:30:00
# DO NOT COMMIT THIS FILE TO GIT
# ============================================

# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=warn

# ─────────────────────────────────────────────
# Service Ports
# ─────────────────────────────────────────────
API_GATEWAY_PORT=5000
MEMBERSHIP_SERVICE_PORT=5001
PAYMENT_SERVICE_PORT=5002
WEB_PORT=3000
KEYCLOAK_PORT=8080

# ─────────────────────────────────────────────
# Keycloak Authentication
# ─────────────────────────────────────────────
KEYCLOAK_URL=https://auth.lobbi.com
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=lobbi-web
KEYCLOAK_CLIENT_SECRET=************************
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=************************
KEYCLOAK_DB_VENDOR=postgres

# ─────────────────────────────────────────────
# Database Configuration
# ─────────────────────────────────────────────
MONGO_URI=mongodb://user:pass@mongodb.prod.svc.cluster.local:27017/lobbi?authSource=admin
MONGO_DB_NAME=lobbi

POSTGRES_HOST=postgres.prod.svc.cluster.local
POSTGRES_PORT=5432
POSTGRES_DB=keycloak
POSTGRES_USER=postgres
POSTGRES_PASSWORD=************************

REDIS_HOST=redis.prod.svc.cluster.local
REDIS_PORT=6379
REDIS_PASSWORD=************************
REDIS_DB=0
REDIS_TTL=86400

# ─────────────────────────────────────────────
# Security Secrets (Auto-generated)
# ─────────────────────────────────────────────
SESSION_SECRET=a1b2c3d4e5f6... (64 chars)
JWT_SECRET=f6e5d4c3b2a1... (64 chars)
ENCRYPTION_KEY=1234567890abcdef... (32 bytes)

# JWT Configuration
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# ─────────────────────────────────────────────
# Service Configuration
# ─────────────────────────────────────────────
CORS_ORIGIN=https://lobbi.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
ENABLE_SWAGGER=false
ENABLE_METRICS=true

# Multi-Tenant Configuration
DEFAULT_ORG_ID=org-001
ENABLE_ORG_ISOLATION=true
ORG_SUBDOMAIN_ENABLED=true

# ─────────────────────────────────────────────
# Payment Integration
# ─────────────────────────────────────────────
STRIPE_API_KEY=sk_live_************************
STRIPE_PUBLISHABLE_KEY=pk_live_************************
STRIPE_WEBHOOK_SECRET=whsec_************************
PAYMENT_CURRENCY=USD
PAYMENT_RETURN_URL=https://lobbi.com/payment/return

# ─────────────────────────────────────────────
# Email Configuration
# ─────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@lobbi.com
SMTP_PASS=************************
EMAIL_FROM=noreply@lobbi.com
EMAIL_FROM_NAME=Lobbi Platform

# ─────────────────────────────────────────────
# Monitoring & Observability
# ─────────────────────────────────────────────
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
LOG_FILE_PATH=/var/log/lobbi/app.log
SENTRY_DSN=https://************************@sentry.io/123456
```

## Success Criteria

- .env file generated with all required variables
- Environment-appropriate defaults used (dev, staging, prod)
- All secrets either prompted or auto-generated
- Sensitive values have sufficient length and entropy
- File permissions set to 600 (owner only)
- .env.example created without sensitive values
- Configuration validated before completion
- Production mode enforces HTTPS and strong passwords
- Development mode uses localhost defaults
- Clear documentation in comments
- Grouped logically by category

## Notes

- Never commit .env files to git (add to .gitignore)
- .env.example is the only env file that should be committed
- Use different secrets for each environment
- Auto-generated secrets use cryptographically secure random
- Stripe test keys (sk_test_) for dev, live keys (sk_live_) for prod
- In production, validate all URLs use HTTPS
- Consider using secret management tools (Vault, AWS Secrets Manager) for production
- File permissions 600 prevent other users from reading secrets
- SMTP configuration is optional but recommended for password resets
- Sentry is optional but helpful for production error tracking
- MongoDB URI should include auth credentials in production
- Redis password is optional in dev but required in production
