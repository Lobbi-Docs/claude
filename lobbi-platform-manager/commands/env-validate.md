---
description: Validate .env configuration against platform requirements
argument-hint: "[--file FILE] [--strict]"
allowed-tools: ["Read", "Bash", "Grep"]
---

Validate the .env file configuration for the keycloak-alpha platform, checking for required variables, format validation, value constraints, and potential security issues.

## Your Task

You are validating the environment configuration for the Lobbi platform. Ensure all required variables are present, properly formatted, and contain valid values.

## Arguments

- `--file` (optional): Path to .env file (default: ".env")
- `--strict` (optional): Enable strict validation (fails on warnings)

## Required Environment Variables

The platform requires 50+ environment variables across 8 services:

### Keycloak Configuration (7 variables)
- `KEYCLOAK_URL` - Keycloak server URL (format: http(s)://host:port)
- `KEYCLOAK_REALM` - Realm name (alphanumeric, hyphens, underscores)
- `KEYCLOAK_CLIENT_ID` - OAuth client ID
- `KEYCLOAK_CLIENT_SECRET` - OAuth client secret (min 32 chars)
- `KEYCLOAK_ADMIN_USERNAME` - Admin username
- `KEYCLOAK_ADMIN_PASSWORD` - Admin password (min 8 chars)
- `KEYCLOAK_DB_VENDOR` - Database vendor (postgres)

### Database Configuration (12 variables)
- `MONGO_URI` - MongoDB connection string (format: mongodb://...)
- `MONGO_DB_NAME` - Database name
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port (default: 5432)
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password (min 8 chars)
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional but recommended)
- `REDIS_DB` - Redis database number (0-15)
- `REDIS_TTL` - Session TTL in seconds

### Service Configuration (15 variables)
- `API_GATEWAY_PORT` - API Gateway port (default: 5000)
- `MEMBERSHIP_SERVICE_PORT` - Membership service port (default: 5001)
- `PAYMENT_SERVICE_PORT` - Payment service port (default: 5002)
- `WEB_PORT` - Web frontend port (default: 3000)
- `NODE_ENV` - Environment (development, staging, production)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `CORS_ORIGIN` - Allowed CORS origins
- `SESSION_SECRET` - Session secret key (min 64 chars)
- `JWT_SECRET` - JWT signing key (min 64 chars)
- `JWT_EXPIRY` - JWT expiration time (e.g., "1h", "7d")
- `RATE_LIMIT_WINDOW` - Rate limit window (ms)
- `RATE_LIMIT_MAX` - Max requests per window
- `ENABLE_SWAGGER` - Enable API documentation (true/false)
- `ENABLE_METRICS` - Enable Prometheus metrics (true/false)
- `ENCRYPTION_KEY` - Data encryption key (32 bytes hex)

### Payment Integration (5 variables)
- `STRIPE_API_KEY` - Stripe secret key (sk_test_... or sk_live_...)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `PAYMENT_CURRENCY` - Default currency (ISO 4217 code)
- `PAYMENT_RETURN_URL` - Payment return URL

### Email Configuration (6 variables)
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP port (25, 465, 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `EMAIL_FROM` - Default sender email
- `EMAIL_FROM_NAME` - Default sender name

### Multi-Tenant Configuration (3 variables)
- `DEFAULT_ORG_ID` - Default organization ID
- `ENABLE_ORG_ISOLATION` - Enable tenant isolation (true/false)
- `ORG_SUBDOMAIN_ENABLED` - Enable org subdomains (true/false)

### Monitoring & Observability (4 variables)
- `SENTRY_DSN` - Sentry error tracking DSN (optional)
- `PROMETHEUS_PORT` - Prometheus metrics port
- `GRAFANA_PORT` - Grafana dashboard port
- `LOG_FILE_PATH` - Log file location

## Steps to Execute

### 1. Read .env File
- Check if file exists at specified path
- Parse file into key-value pairs
- Ignore comments (lines starting with #)
- Ignore empty lines

### 2. Check Required Variables
- Compare against required variable list
- Identify missing variables
- Categorize by service/component

### 3. Validate URL Formats
For URL variables (KEYCLOAK_URL, MONGO_URI, etc.):
- Check format: http(s)://host:port or mongodb://user:pass@host:port/db
- Validate hostname/IP
- Validate port number (1-65535)
- Check protocol matches environment (https in production)

### 4. Validate Port Numbers
For port variables:
- Check range: 1-65535
- Warn about privileged ports (< 1024) without root
- Check for port conflicts (duplicate ports)
- Verify common ports match service expectations

### 5. Validate Secret Lengths
For secret/password variables:
- Check minimum length requirements
- Warn if using default/weak values
- Check for common weak passwords
- Verify secrets are not placeholder values

### 6. Validate Enumerated Values
For variables with fixed options:
- `NODE_ENV`: development, staging, production
- `LOG_LEVEL`: debug, info, warn, error
- `PAYMENT_CURRENCY`: Valid ISO 4217 codes
- Boolean flags: true, false, 1, 0

### 7. Security Checks
- Check for exposed secrets in git (if .env is tracked - BAD)
- Warn if using default passwords (admin, password123, etc.)
- Verify production environment uses HTTPS
- Check JWT_SECRET and SESSION_SECRET are sufficiently random
- Ensure Stripe uses appropriate keys for environment

### 8. Format Validation
- Email addresses: valid email format
- Hex keys: valid hexadecimal
- JWT expiry: valid duration format (e.g., "1h", "7d")
- Numbers: valid integers for numeric fields

### 9. Cross-Variable Validation
- KEYCLOAK_DB_VENDOR should match database configuration
- CORS_ORIGIN should match WEB_PORT
- Stripe keys should match (test keys together, live keys together)
- NODE_ENV should be consistent with URLs (localhost for dev, domains for prod)

### 10. Generate Validation Report
- Summary of checks performed
- List of errors (missing or invalid)
- List of warnings (weak or suspicious)
- List of passed checks
- Recommendations for improvement

## Usage Examples

### Basic validation
```
/lobbi:env-validate
```

### Validate specific file
```
/lobbi:env-validate --file .env.production
```

### Strict validation (fail on warnings)
```
/lobbi:env-validate --strict
```

### Validate staging environment
```
/lobbi:env-validate --file .env.staging --strict
```

## Expected Outputs

### Successful Validation
```
=== ENV VALIDATION REPORT ===
File: .env
Timestamp: 2025-12-12 10:30:00

SUMMARY
───────────────────
✅ All required variables present (52/52)
✅ All formats valid
✅ No security issues detected
⚠️  2 warnings

WARNINGS
────────
⚠️  KEYCLOAK_ADMIN_PASSWORD: Using default password "admin" - change in production
⚠️  SESSION_SECRET: Secret is only 48 characters, recommend 64+

PASSED CHECKS (50)
──────────────────
✅ KEYCLOAK_URL: Valid URL format (http://localhost:8080)
✅ MONGO_URI: Valid MongoDB connection string
✅ POSTGRES_PORT: Valid port (5432)
✅ JWT_SECRET: Sufficient length (64 chars)
✅ STRIPE_API_KEY: Valid test key format (sk_test_...)
✅ NODE_ENV: Valid value (development)
...

RECOMMENDATIONS
───────────────
1. Change KEYCLOAK_ADMIN_PASSWORD to a strong password
2. Generate a longer SESSION_SECRET (64+ characters)
3. Consider enabling ENABLE_METRICS for monitoring

✅ Validation passed (2 warnings)
```

### Failed Validation
```
=== ENV VALIDATION REPORT ===
File: .env
Timestamp: 2025-12-12 10:30:00

SUMMARY
───────────────────
❌ 5 required variables missing
❌ 3 format errors
❌ 2 security issues
⚠️  4 warnings

ERRORS
──────
❌ Missing required variable: KEYCLOAK_CLIENT_SECRET
❌ Missing required variable: JWT_SECRET
❌ Missing required variable: SESSION_SECRET
❌ Missing required variable: STRIPE_API_KEY
❌ Missing required variable: STRIPE_WEBHOOK_SECRET
❌ KEYCLOAK_URL: Invalid URL format (missing protocol)
❌ POSTGRES_PORT: Invalid port (99999, must be 1-65535)
❌ PAYMENT_CURRENCY: Invalid ISO 4217 code (XX)

SECURITY ISSUES
───────────────
❌ POSTGRES_PASSWORD: Using weak password "password123"
❌ Production environment using HTTP instead of HTTPS

WARNINGS
────────
⚠️  PORT CONFLICT: API_GATEWAY_PORT and MEMBERSHIP_SERVICE_PORT both use 5000
⚠️  NODE_ENV is "development" but using production Stripe keys
⚠️  CORS_ORIGIN is "*" - not recommended for production
⚠️  .env file is tracked in git - SECURITY RISK

❌ Validation failed - fix errors before running services
```

## Success Criteria

- .env file exists and is readable
- All required variables are present
- All URL formats are valid
- All port numbers are in valid range (1-65535)
- No port conflicts detected
- All secrets meet minimum length requirements
- No weak or default passwords in production
- Enumerated values match allowed options
- Email formats are valid
- No security issues detected (or only warnings if not strict)
- Cross-variable consistency validated
- Clear report with actionable recommendations

## Notes

- Missing optional variables should be warnings, not errors
- In development, some weak passwords are acceptable (with warnings)
- In production, strict mode should be used
- Secrets should never be committed to git
- Use .env.example as a template with placeholder values
- Consider using environment-specific files (.env.dev, .env.prod)
- Validate before deployment to catch configuration issues early
- Some variables may be optional depending on features enabled
- Redis password is optional but recommended for security
- Sentry DSN is optional (only needed if error tracking is enabled)
- SMTP configuration only needed if email features are used
- Port conflicts will cause services to fail at startup
