---
description: Run end-to-end tests for Lobbi with suite selection, parallel execution, reporting, and screenshot capture
---

# E2E Test Runner

Execute comprehensive end-to-end tests for the Lobbi member management system using Playwright, including authentication flows, member management, subscription handling, and multi-tenant isolation.

## Usage

```bash
/e2e-test-run [suite] [options]
```

## Description

This command orchestrates E2E testing by:
- Setting up isolated test environment
- Provisioning test organizations and users
- Executing test suites in parallel or sequentially
- Capturing screenshots and videos on failures
- Generating detailed HTML reports
- Cleaning up test data automatically
- Supporting multiple browsers (Chromium, Firefox, WebKit)

## Prerequisites

**Required Services:**
- Keycloak running in test mode
- MongoDB test database
- Redis test instance
- Member API running on test port
- Frontend application built and served

**Environment Variables:**
```bash
# Test environment
NODE_ENV=test
TEST_BASE_URL=http://localhost:3001
TEST_KEYCLOAK_URL=http://localhost:8080
TEST_DATABASE_URL=mongodb://admin:admin@localhost:27017/member_db_test?authSource=admin
TEST_REDIS_URL=redis://localhost:6379/1

# Test credentials
TEST_ADMIN_USERNAME=test-admin@lobbi.test
TEST_ADMIN_PASSWORD=TestPassword123!
TEST_MEMBER_USERNAME=test-member@lobbi.test
TEST_MEMBER_PASSWORD=TestPassword123!

# Playwright configuration
PLAYWRIGHT_BROWSERS_PATH=/home/user/.cache/ms-playwright
HEADLESS=true
SLOWMO=0  # Slow down tests (ms) for debugging
```

**Install Dependencies:**
```bash
# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install --with-deps chromium firefox webkit

# Install test utilities
npm install -D @faker-js/faker dotenv
```

## Test Suites

### Available Test Suites

1. **auth** - Authentication and authorization tests
2. **members** - Member CRUD operations
3. **subscriptions** - Subscription management flows
4. **multi-tenant** - Tenant isolation and data segregation
5. **admin** - Admin portal functionality
6. **api** - API endpoint testing
7. **full** - Complete test suite (all of the above)

## Step-by-Step Instructions

### 1. Environment Setup

```bash
# Start test services
docker-compose -f docker/docker-compose.test.yml up -d

# Wait for services to be ready
echo "Waiting for services..."
sleep 10

# Verify Keycloak
curl -f http://localhost:8080/health/ready || { echo "ERROR: Keycloak not ready"; exit 1; }

# Verify MongoDB
mongosh "mongodb://admin:admin@localhost:27017/member_db_test?authSource=admin" \
  --eval "db.adminCommand('ping')" || { echo "ERROR: MongoDB not ready"; exit 1; }

# Verify Redis
redis-cli -n 1 ping || { echo "ERROR: Redis not ready"; exit 1; }

# Verify API
curl -f http://localhost:3001/health || { echo "ERROR: API not ready"; exit 1; }

echo "✅ All services ready"
```

### 2. Test Data Provisioning

```bash
# Create test realm and organizations
python3 << 'EOF'
import requests
import os
from pymongo import MongoClient
from datetime import datetime, timedelta
import uuid

KEYCLOAK_URL = os.getenv("TEST_KEYCLOAK_URL", "http://localhost:8080")
DB_URL = os.getenv("TEST_DATABASE_URL")

# Get admin token
token_response = requests.post(
    f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
    data={
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": "admin",
        "password": "admin"
    }
)
admin_token = token_response.json()["access_token"]
headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

# Create test realm
realm_data = {
    "realm": "test-realm",
    "enabled": True,
    "displayName": "Test Realm",
    "loginWithEmailAllowed": True,
    "registrationAllowed": False
}

try:
    requests.post(f"{KEYCLOAK_URL}/admin/realms", json=realm_data, headers=headers)
    print("✅ Test realm created")
except:
    print("⚠️  Test realm already exists")

# Create test organizations
client = MongoClient(DB_URL)
db = client.member_db_test

test_orgs = [
    {
        "_id": str(uuid.uuid4()),
        "name": "Test Organization Alpha",
        "slug": "test-org-alpha",
        "status": "active",
        "subscription": {
            "plan": "premium",
            "status": "active"
        },
        "limits": {
            "maxMembers": 1000,
            "maxAdmins": 10
        },
        "createdAt": datetime.utcnow()
    },
    {
        "_id": str(uuid.uuid4()),
        "name": "Test Organization Beta",
        "slug": "test-org-beta",
        "status": "active",
        "subscription": {
            "plan": "basic",
            "status": "trialing",
            "trialEndsAt": datetime.utcnow() + timedelta(days=14)
        },
        "limits": {
            "maxMembers": 500,
            "maxAdmins": 5
        },
        "createdAt": datetime.utcnow()
    }
]

db.organizations.delete_many({"slug": {"$regex": "^test-org-"}})
db.organizations.insert_many(test_orgs)
print(f"✅ Created {len(test_orgs)} test organizations")

# Create test users
for org in test_orgs:
    # Admin user
    admin_user = {
        "username": f"admin@{org['slug']}.test",
        "email": f"admin@{org['slug']}.test",
        "firstName": "Admin",
        "lastName": "User",
        "enabled": True,
        "emailVerified": True,
        "credentials": [{
            "type": "password",
            "value": "TestPassword123!",
            "temporary": False
        }]
    }

    response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/test-realm/users",
        json=admin_user,
        headers=headers
    )

    if response.status_code == 201:
        user_id = response.headers["Location"].split("/")[-1]
        db.users.insert_one({
            "keycloakId": user_id,
            "organizationId": org["_id"],
            "email": admin_user["email"],
            "role": "admin",
            "status": "active",
            "createdAt": datetime.utcnow()
        })
        print(f"✅ Created admin user for {org['slug']}")

    # Member users
    for i in range(3):
        member_user = {
            "username": f"member{i}@{org['slug']}.test",
            "email": f"member{i}@{org['slug']}.test",
            "firstName": f"Member{i}",
            "lastName": "User",
            "enabled": True,
            "emailVerified": True,
            "credentials": [{
                "type": "password",
                "value": "TestPassword123!",
                "temporary": False
            }]
        }

        response = requests.post(
            f"{KEYCLOAK_URL}/admin/realms/test-realm/users",
            json=member_user,
            headers=headers
        )

        if response.status_code == 201:
            user_id = response.headers["Location"].split("/")[-1]
            db.users.insert_one({
                "keycloakId": user_id,
                "organizationId": org["_id"],
                "email": member_user["email"],
                "role": "member",
                "status": "active",
                "createdAt": datetime.utcnow()
            })

print("✅ Test data provisioning complete")

EOF
```

### 3. Configure Playwright

```bash
# Create Playwright configuration
cat > /home/user/alpha-0.1/tests/e2e/playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.HEADLESS !== 'false',
    launchOptions: {
      slowMo: parseInt(process.env.SLOWMO || '0')
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run start:test',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
EOF
```

### 4. Run Test Suites

```bash
# Run all tests
echo "Running full E2E test suite..."
npx playwright test --config=tests/e2e/playwright.config.ts

# Run specific suite
echo "Running authentication tests..."
npx playwright test tests/e2e/auth.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
HEADLESS=false npx playwright test

# Run with debugging
npx playwright test --debug

# Run in parallel
npx playwright test --workers=8

# Run specific test file
npx playwright test tests/e2e/members.spec.ts

# Run tests matching pattern
npx playwright test --grep "admin can create member"
```

### Example Test Files

**Authentication Tests:**
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('admin can login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'admin@test-org-alpha.test');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome, Admin')).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'invalid@test.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });

  test('logout redirects to login page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test-org-alpha.test');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    await expect(page).toHaveURL('/login');
  });
});
```

**Member Management Tests:**
```typescript
// tests/e2e/members.spec.ts
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test-org-alpha.test');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
  });

  test('admin can create new member', async ({ page }) => {
    await page.goto('/members');
    await page.click('button:has-text("Add Member")');

    const email = faker.internet.email();
    await page.fill('[name="email"]', email);
    await page.fill('[name="firstName"]', faker.person.firstName());
    await page.fill('[name="lastName"]', faker.person.lastName());
    await page.click('button:has-text("Save")');

    await expect(page.locator(`text=${email}`)).toBeVisible();
  });

  test('admin can edit member details', async ({ page }) => {
    await page.goto('/members');

    // Click first member
    await page.click('tr:has-text("member0@test-org-alpha.test")');

    // Edit
    await page.click('button:has-text("Edit")');
    const newPhone = '555-1234';
    await page.fill('[name="phone"]', newPhone);
    await page.click('button:has-text("Save")');

    await expect(page.locator(`text=${newPhone}`)).toBeVisible();
  });

  test('admin can search members', async ({ page }) => {
    await page.goto('/members');

    await page.fill('[placeholder="Search members"]', 'member1');
    await expect(page.locator('tr:has-text("member1@test-org-alpha.test")')).toBeVisible();
    await expect(page.locator('tr:has-text("member2@test-org-alpha.test")')).not.toBeVisible();
  });
});
```

**Multi-Tenant Isolation Tests:**
```typescript
// tests/e2e/multi-tenant.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Isolation', () => {
  test('org alpha admin cannot see org beta members', async ({ page }) => {
    // Login as org alpha admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test-org-alpha.test');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Navigate to members
    await page.goto('/members');

    // Should see alpha members
    await expect(page.locator('text=member0@test-org-alpha.test')).toBeVisible();

    // Should NOT see beta members
    await expect(page.locator('text=member0@test-org-beta.test')).not.toBeVisible();
  });

  test('direct API access respects tenant boundaries', async ({ request }) => {
    // Get token for org alpha admin
    const tokenResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@test-org-alpha.test',
        password: 'TestPassword123!'
      }
    });
    const { accessToken } = await tokenResponse.json();

    // Try to access org beta member (should fail)
    const response = await request.get('/api/members?org=test-org-beta', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    expect(response.status()).toBe(403);
  });
});
```

### 5. Generate Reports

```bash
# Generate HTML report
npx playwright show-report playwright-report

# View test results
cat test-results/results.json | jq '.suites[].specs[] | {title: .title, outcome: .tests[0].results[0].status}'

# Count results
echo "Test Summary:"
echo "  Total: $(cat test-results/results.json | jq '.suites[].specs | length' | awk '{s+=$1} END {print s}')"
echo "  Passed: $(cat test-results/results.json | jq '[.suites[].specs[].tests[].results[] | select(.status=="passed")] | length')"
echo "  Failed: $(cat test-results/results.json | jq '[.suites[].specs[].tests[].results[] | select(.status=="failed")] | length')"
echo "  Skipped: $(cat test-results/results.json | jq '[.suites[].specs[].tests[].results[] | select(.status=="skipped")] | length')"

# Generate JUnit XML for CI integration
ls -la test-results/junit.xml
```

### 6. Cleanup Test Data

```bash
# Clean up test database
mongosh "mongodb://admin:admin@localhost:27017/member_db_test?authSource=admin" << 'EOF'
use member_db_test;

db.organizations.deleteMany({ slug: { $regex: "^test-org-" } });
db.users.deleteMany({ email: { $regex: "@test-org-.*\\.test$" } });
db.groups.deleteMany({});

print("✅ Test database cleaned");
EOF

# Clean up Keycloak test realm
python3 << 'EOF'
import requests
import os

KEYCLOAK_URL = os.getenv("TEST_KEYCLOAK_URL", "http://localhost:8080")

# Get admin token
token_response = requests.post(
    f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
    data={
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": "admin",
        "password": "admin"
    }
)
admin_token = token_response.json()["access_token"]

# Delete test realm
response = requests.delete(
    f"{KEYCLOAK_URL}/admin/realms/test-realm",
    headers={"Authorization": f"Bearer {admin_token}"}
)

if response.status_code == 204:
    print("✅ Test realm deleted")
else:
    print("⚠️  Failed to delete test realm")

EOF

# Clear Redis test database
redis-cli -n 1 FLUSHDB

echo "✅ Test cleanup complete"
```

## Example Usage

### Run Full Suite
```bash
/e2e-test-run full --parallel
```

### Run Authentication Tests Only
```bash
/e2e-test-run auth --browser=chromium
```

### Run with Screenshots
```bash
/e2e-test-run members --screenshot=always
```

### Debug Specific Test
```bash
/e2e-test-run --debug --headed --grep="admin can create member"
```

### Run on Multiple Browsers
```bash
/e2e-test-run full --project=chromium,firefox,webkit
```

### CI Mode
```bash
/e2e-test-run full --workers=1 --retries=2 --reporter=junit
```

## Error Handling

### Common Issues

**1. Test Timeout**
```bash
# Increase timeout in test
test.setTimeout(60000); // 60 seconds

# Or globally in config
use: {
  timeout: 60000
}
```

**2. Element Not Found**
```bash
# Use waitFor
await page.waitForSelector('[data-testid="member-list"]', { timeout: 10000 });

# Or use auto-waiting assertions
await expect(page.locator('[data-testid="member-list"]')).toBeVisible();
```

**3. Flaky Tests**
```bash
# Add explicit waits
await page.waitForLoadState('networkidle');

# Retry failed tests
npx playwright test --retries=2
```

**4. Service Not Ready**
```bash
# Add health check retries
for i in {1..30}; do
  curl -f http://localhost:3001/health && break || sleep 2
done
```

## Performance Optimization

```bash
# Run tests in parallel (faster)
npx playwright test --workers=8

# Skip slow tests in development
npx playwright test --grep-invert @slow

# Use trace only on failure (saves space)
use: {
  trace: 'retain-on-failure'
}

# Disable video recording (faster)
use: {
  video: 'off'
}
```

## CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: docker-compose -f docker/docker-compose.test.yml up -d
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## Agent Assignment

This command activates the **e2e-test-orchestrator** agent, coordinating:
- Test environment setup agent
- Playwright test runner agent
- Test data provisioning agent
- Report generation agent

## Best Practices

1. **Test Isolation:** Each test should be independent
2. **Data Cleanup:** Always clean up test data after execution
3. **Stable Selectors:** Use data-testid attributes for reliable element selection
4. **Parallel Execution:** Run tests in parallel for faster feedback
5. **Visual Regression:** Consider adding visual regression tests with Playwright
6. **Mobile Testing:** Include mobile viewport tests
7. **Accessibility:** Add accessibility tests with @axe-core/playwright
