# Platform-Specific Hook Examples

These are example hooks for specific platform integrations. Copy the ones you need to the parent `.claude/hooks/` directory and customize for your project.

## Available Examples

| Hook | Purpose | When to Use |
|------|---------|-------------|
| `atlassian-hooks.sh` | Jira/Confluence integration | Projects using Atlassian tools |
| `keycloak-config-validator.sh` | Keycloak configuration validation | Projects with Keycloak auth |
| `stripe-webhook-security.sh` | Stripe webhook security checks | Projects with Stripe payments |
| `tenant-isolation-validator.sh` | Multi-tenant data isolation | Multi-tenant SaaS projects |
| `member-data-privacy.sh` | PII/member data compliance | Projects handling user data |
| `e2e-test-data-cleanup.sh` | E2E test data cleanup | Projects with Selenium/Playwright tests |
| `subscription-billing-audit.sh` | Subscription billing validation | Projects with recurring billing |

## Usage

1. Copy the hook(s) you need:
   ```bash
   cp .claude/hooks/platform-examples/stripe-webhook-security.sh .claude/hooks/
   ```

2. Customize the configuration variables at the top of each file

3. Register in `.claude/hooks.mjs` if using hooks manager:
   ```javascript
   import { stripeWebhookSecurity } from './hooks/stripe-webhook-security.sh';
   ```

4. Test the hook:
   ```bash
   bash .claude/hooks/stripe-webhook-security.sh test
   ```

## Note

These hooks are **not** loaded by default to keep context minimal. Only add what your project needs.
