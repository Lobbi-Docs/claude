# E2E Testing with Selenium

End-to-end testing skill for Lobbi using Selenium WebDriver. Activates when working with browser automation, E2E tests, integration testing, or UI testing.

**Triggers:** selenium, e2e, testing, automation, webdriver, end-to-end, integration-test, browser-test, page-object

**Use this skill when:**
- Setting up E2E testing infrastructure
- Writing browser automation tests
- Implementing Page Object pattern
- Testing authentication flows
- Testing multi-step workflows
- Debugging test failures

## Allowed Tools

- selenium-webdriver (browser automation)
- jest (test runner)
- typescript (type safety)
- docker (test environment)
- chromedriver (Chrome automation)

## Instructions

### Core Principles

1. **Page Object Pattern**
   - One class per page/component
   - Encapsulate selectors and actions
   - Return page objects for method chaining
   - Keep tests DRY and maintainable

2. **Wait Strategies**
   - Use explicit waits (not implicit or sleep)
   - Wait for elements to be clickable/visible
   - Handle dynamic content loading
   - Set reasonable timeouts

3. **Test Independence**
   - Each test should be independent
   - Clean up test data after tests
   - Use test isolation (separate accounts/tenants)
   - Don't depend on test execution order

4. **Error Handling**
   - Take screenshots on failure
   - Log browser console errors
   - Provide meaningful error messages
   - Handle flaky tests gracefully

### Test Architecture

```
tests/
├── e2e/
│   ├── setup/              # Test environment setup
│   ├── pages/              # Page Object Models
│   ├── helpers/            # Test utilities
│   ├── fixtures/           # Test data
│   └── specs/              # Test specifications
│       ├── auth/
│       ├── members/
│       └── subscriptions/
```

### Implementation Checklist

- [ ] Install Selenium and WebDriver dependencies
- [ ] Configure test environment (local + CI)
- [ ] Create base Page Object class
- [ ] Implement authentication helper
- [ ] Create page objects for key pages
- [ ] Write test specifications
- [ ] Add screenshot capture on failure
- [ ] Configure parallel test execution
- [ ] Add tests to CI/CD pipeline

## Code Examples

### 1. Selenium Setup

```typescript
// tests/e2e/setup/driver.ts

import { Builder, WebDriver, until, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export const DEFAULT_TIMEOUT = 10000;

export class DriverManager {
  private static driver: WebDriver;

  static async getDriver(): Promise<WebDriver> {
    if (!this.driver) {
      const options = new chrome.Options();

      // Headless mode for CI
      if (process.env.CI === 'true') {
        options.addArguments('--headless');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
      }

      options.addArguments('--window-size=1920,1080');
      options.addArguments('--disable-gpu');

      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      // Set implicit wait
      await this.driver.manage().setTimeouts({ implicit: DEFAULT_TIMEOUT });
    }

    return this.driver;
  }

  static async quitDriver(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  static async takeScreenshot(filename: string): Promise<void> {
    if (this.driver) {
      const screenshot = await this.driver.takeScreenshot();
      const fs = require('fs');
      const path = require('path');

      const dir = path.join(__dirname, '..', 'screenshots');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filepath = path.join(dir, `${filename}-${Date.now()}.png`);
      fs.writeFileSync(filepath, screenshot, 'base64');
      console.log(`Screenshot saved: ${filepath}`);
    }
  }
}
```

### 2. Base Page Object

```typescript
// tests/e2e/pages/base.page.ts

import { WebDriver, By, until, WebElement } from 'selenium-webdriver';
import { DEFAULT_TIMEOUT } from '../setup/driver';

export abstract class BasePage {
  constructor(protected driver: WebDriver) {}

  /**
   * Navigate to URL
   */
  async navigateTo(url: string): Promise<void> {
    await this.driver.get(url);
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(
    locator: By,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(locator), timeout);
  }

  /**
   * Wait for element to be clickable
   */
  async waitForClickable(
    locator: By,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<WebElement> {
    const element = await this.waitForElement(locator, timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
    return element;
  }

  /**
   * Click element
   */
  async click(locator: By): Promise<void> {
    const element = await this.waitForClickable(locator);
    await element.click();
  }

  /**
   * Type into input field
   */
  async type(locator: By, text: string): Promise<void> {
    const element = await this.waitForClickable(locator);
    await element.clear();
    await element.sendKeys(text);
  }

  /**
   * Get text from element
   */
  async getText(locator: By): Promise<string> {
    const element = await this.waitForElement(locator);
    return element.getText();
  }

  /**
   * Check if element is displayed
   */
  async isDisplayed(locator: By): Promise<boolean> {
    try {
      const element = await this.driver.findElement(locator);
      return element.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Wait for URL to contain text
   */
  async waitForUrl(urlFragment: string, timeout: number = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.urlContains(urlFragment), timeout);
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  /**
   * Execute JavaScript
   */
  async executeScript<T>(script: string, ...args: any[]): Promise<T> {
    return this.driver.executeScript(script, ...args);
  }

  /**
   * Scroll to element
   */
  async scrollToElement(locator: By): Promise<void> {
    const element = await this.waitForElement(locator);
    await this.executeScript('arguments[0].scrollIntoView(true);', element);
  }

  /**
   * Wait for loading to complete
   */
  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      async () => {
        const readyState = await this.executeScript<string>(
          'return document.readyState'
        );
        return readyState === 'complete';
      },
      DEFAULT_TIMEOUT
    );
  }

  /**
   * Get browser console logs
   */
  async getConsoleLogs(): Promise<any[]> {
    const logs = await this.driver.manage().logs().get('browser');
    return logs;
  }
}
```

### 3. Login Page Object

```typescript
// tests/e2e/pages/login.page.ts

import { WebDriver, By } from 'selenium-webdriver';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // Locators
  private emailInput = By.id('email');
  private passwordInput = By.id('password');
  private loginButton = By.css('button[type="submit"]');
  private errorMessage = By.css('[role="alert"]');
  private forgotPasswordLink = By.css('a[href="/forgot-password"]');

  constructor(driver: WebDriver) {
    super(driver);
  }

  /**
   * Navigate to login page
   */
  async open(): Promise<void> {
    await this.navigateTo(`${process.env.BASE_URL}/login`);
    await this.waitForPageLoad();
  }

  /**
   * Perform login
   */
  async login(email: string, password: string): Promise<void> {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await this.click(this.loginButton);
  }

  /**
   * Check if login was successful (redirected to dashboard)
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      await this.waitForUrl('/dashboard', 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    return this.isDisplayed(this.errorMessage);
  }

  /**
   * Click forgot password
   */
  async clickForgotPassword(): Promise<void> {
    await this.click(this.forgotPasswordLink);
  }
}
```

### 4. Members Page Object

```typescript
// tests/e2e/pages/members.page.ts

import { WebDriver, By } from 'selenium-webdriver';
import { BasePage } from './base.page';

export class MembersPage extends BasePage {
  // Locators
  private addMemberButton = By.css('[data-testid="add-member-btn"]');
  private searchInput = By.css('[data-testid="search-input"]');
  private memberRows = By.css('[data-testid="member-row"]');
  private firstNameInput = By.id('firstName');
  private lastNameInput = By.id('lastName');
  private emailInput = By.id('email');
  private saveButton = By.css('[data-testid="save-member-btn"]');
  private successMessage = By.css('[data-testid="success-message"]');

  constructor(driver: WebDriver) {
    super(driver);
  }

  /**
   * Navigate to members page
   */
  async open(): Promise<void> {
    await this.navigateTo(`${process.env.BASE_URL}/members`);
    await this.waitForPageLoad();
  }

  /**
   * Click add member button
   */
  async clickAddMember(): Promise<void> {
    await this.click(this.addMemberButton);
  }

  /**
   * Fill member form
   */
  async fillMemberForm(data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<void> {
    await this.type(this.firstNameInput, data.firstName);
    await this.type(this.lastNameInput, data.lastName);
    await this.type(this.emailInput, data.email);
  }

  /**
   * Save member
   */
  async saveMember(): Promise<void> {
    await this.click(this.saveButton);
  }

  /**
   * Create member (full flow)
   */
  async createMember(data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<void> {
    await this.clickAddMember();
    await this.fillMemberForm(data);
    await this.saveMember();
  }

  /**
   * Search for member
   */
  async searchMember(query: string): Promise<void> {
    await this.type(this.searchInput, query);
    // Wait for search to complete
    await this.driver.sleep(500);
  }

  /**
   * Get member count
   */
  async getMemberCount(): Promise<number> {
    const elements = await this.driver.findElements(this.memberRows);
    return elements.length;
  }

  /**
   * Check if success message is displayed
   */
  async hasSuccessMessage(): Promise<boolean> {
    return this.isDisplayed(this.successMessage);
  }

  /**
   * Get member by email
   */
  async getMemberByEmail(email: string): Promise<string | null> {
    const locator = By.xpath(`//tr[contains(., '${email}')]`);
    try {
      const element = await this.waitForElement(locator, 3000);
      return element.getText();
    } catch {
      return null;
    }
  }

  /**
   * Click member row
   */
  async clickMemberByEmail(email: string): Promise<void> {
    const locator = By.xpath(`//tr[contains(., '${email}')]`);
    await this.click(locator);
  }
}
```

### 5. Authentication Helper

```typescript
// tests/e2e/helpers/auth.helper.ts

import { WebDriver } from 'selenium-webdriver';
import { LoginPage } from '../pages/login.page';

export interface TestUser {
  email: string;
  password: string;
  organizationId: string;
}

export class AuthHelper {
  constructor(private driver: WebDriver) {}

  /**
   * Login as test user
   */
  async login(user: TestUser): Promise<void> {
    const loginPage = new LoginPage(this.driver);
    await loginPage.open();
    await loginPage.login(user.email, user.password);

    // Wait for redirect to dashboard
    const isSuccess = await loginPage.isLoginSuccessful();
    if (!isSuccess) {
      throw new Error('Login failed');
    }
  }

  /**
   * Login via API and set cookies (faster for test setup)
   */
  async loginViaApi(user: TestUser): Promise<void> {
    // Make API call to get auth token
    const response = await fetch(`${process.env.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });

    const data = await response.json();
    const token = data.accessToken;

    // Navigate to app
    await this.driver.get(process.env.BASE_URL);

    // Set auth token in localStorage
    await this.driver.executeScript(
      `localStorage.setItem('authToken', '${token}');`
    );

    // Refresh to apply token
    await this.driver.navigate().refresh();
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.driver.get(`${process.env.BASE_URL}/logout`);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const url = await this.driver.getCurrentUrl();
    return !url.includes('/login');
  }
}
```

### 6. Test Specification Example

```typescript
// tests/e2e/specs/members/create-member.spec.ts

import { WebDriver } from 'selenium-webdriver';
import { DriverManager } from '../../setup/driver';
import { AuthHelper, TestUser } from '../../helpers/auth.helper';
import { MembersPage } from '../../pages/members.page';

describe('Create Member E2E Test', () => {
  let driver: WebDriver;
  let authHelper: AuthHelper;
  let membersPage: MembersPage;

  const testUser: TestUser = {
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
    organizationId: process.env.TEST_ORG_ID!,
  };

  beforeAll(async () => {
    driver = await DriverManager.getDriver();
    authHelper = new AuthHelper(driver);
    membersPage = new MembersPage(driver);
  }, 30000);

  afterAll(async () => {
    await DriverManager.quitDriver();
  }, 30000);

  beforeEach(async () => {
    // Login before each test
    await authHelper.loginViaApi(testUser);
  }, 15000);

  afterEach(async function () {
    // Take screenshot on failure
    if (this.currentTest?.state === 'failed') {
      await DriverManager.takeScreenshot(this.currentTest.title);
    }
  });

  it('should create a new member successfully', async () => {
    // Navigate to members page
    await membersPage.open();

    // Get initial member count
    const initialCount = await membersPage.getMemberCount();

    // Create new member
    const newMember = {
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
    };

    await membersPage.createMember(newMember);

    // Verify success message
    const hasSuccess = await membersPage.hasSuccessMessage();
    expect(hasSuccess).toBe(true);

    // Verify member appears in list
    const member = await membersPage.getMemberByEmail(newMember.email);
    expect(member).not.toBeNull();
    expect(member).toContain(newMember.firstName);
    expect(member).toContain(newMember.lastName);

    // Verify count increased
    const newCount = await membersPage.getMemberCount();
    expect(newCount).toBe(initialCount + 1);
  }, 30000);

  it('should show error for duplicate email', async () => {
    await membersPage.open();

    // Create first member
    const member = {
      firstName: 'First',
      lastName: 'Member',
      email: `duplicate-${Date.now()}@example.com`,
    };

    await membersPage.createMember(member);
    await membersPage.hasSuccessMessage();

    // Try to create duplicate
    await membersPage.createMember(member);

    // Should show error (implement error check in page object)
    // const hasError = await membersPage.hasError();
    // expect(hasError).toBe(true);
  }, 30000);

  it('should search members by email', async () => {
    await membersPage.open();

    // Create test member
    const member = {
      firstName: 'Search',
      lastName: 'Test',
      email: `search-${Date.now()}@example.com`,
    };

    await membersPage.createMember(member);

    // Search for member
    await membersPage.searchMember(member.email);

    // Verify member appears in results
    const foundMember = await membersPage.getMemberByEmail(member.email);
    expect(foundMember).not.toBeNull();
  }, 30000);
});
```

### 7. Jest Configuration

```javascript
// jest.e2e.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup/jest.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially
  bail: false, // Continue running tests after failures
  verbose: true,
};
```

### 8. Test Setup File

```typescript
// tests/e2e/setup/jest.setup.ts

import { DriverManager } from './driver';

// Global setup
beforeAll(async () => {
  console.log('Starting E2E test suite...');

  // Verify environment variables
  const requiredEnvVars = [
    'BASE_URL',
    'API_URL',
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'TEST_ORG_ID',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
});

// Global teardown
afterAll(async () => {
  await DriverManager.quitDriver();
  console.log('E2E test suite completed.');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### 9. Docker Compose for Test Environment

```yaml
# docker-compose.e2e.yml

version: '3.8'

services:
  chrome:
    image: selenium/standalone-chrome:latest
    ports:
      - "4444:4444"
    shm_size: 2gb
    environment:
      - SE_NODE_MAX_SESSIONS=5

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.e2e
    depends_on:
      - chrome
    environment:
      - BASE_URL=http://frontend:3000
      - API_URL=http://backend:5000
      - SELENIUM_REMOTE_URL=http://chrome:4444/wd/hub
      - TEST_USER_EMAIL=${TEST_USER_EMAIL}
      - TEST_USER_PASSWORD=${TEST_USER_PASSWORD}
      - TEST_ORG_ID=${TEST_ORG_ID}
    volumes:
      - ./tests/e2e:/app/tests/e2e
      - ./tests/e2e/screenshots:/app/screenshots
```

### 10. CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml

name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start services
        run: docker-compose -f docker-compose.e2e.yml up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:4444/wd/hub/status; do sleep 2; done'

      - name: Run E2E tests
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:5000
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          TEST_ORG_ID: ${{ secrets.TEST_ORG_ID }}
          CI: true
        run: npm run test:e2e

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-screenshots
          path: tests/e2e/screenshots/

      - name: Stop services
        if: always()
        run: docker-compose -f docker-compose.e2e.yml down
```

## Best Practices

1. **Use Page Objects** - Encapsulate page logic
2. **Explicit Waits** - Wait for specific conditions
3. **Test Independence** - Each test should be self-contained
4. **Meaningful Selectors** - Use data-testid attributes
5. **Screenshot on Failure** - Capture evidence for debugging
6. **Clean Test Data** - Create unique test data per run
7. **Parallel Execution** - Run tests in parallel when possible

## Common Pitfalls

- ❌ Using implicit waits or sleep()
- ❌ Tests depending on each other
- ❌ Not handling async operations properly
- ❌ Using fragile CSS selectors
- ❌ Not cleaning up test data
- ❌ Ignoring flaky tests
- ❌ Not running tests in CI/CD

## Debugging Tips

1. **Run in non-headless mode** - Remove `--headless` flag
2. **Use browser DevTools** - Inspect elements
3. **Add console logs** - Log test progress
4. **Check screenshots** - Review failure screenshots
5. **Slow down execution** - Add pauses for debugging
6. **Check browser console** - Review JS errors

## Related Skills

- **testing** - Unit and integration testing patterns
- **authentication** - Auth flow testing
- **member-management** - Member CRUD testing
- **stripe-payments** - Payment flow testing
