# E2E Test Suite Execution Workflow

Comprehensive end-to-end testing workflow for Lobbi platform, covering authentication, member management, payment flows, and tenant operations.

## Workflow Metadata
```yaml
name: e2e-test-suite
type: parallel-sequential-hybrid
description: Automated E2E testing with parallel execution, comprehensive coverage, and detailed reporting
agents:
  - selenium-test-architect
  - auth-flow-tester
  - member-journey-tester
  - payment-flow-tester
  - tenant-operations-tester
  - test-data-manager
  - report-generator
triggers:
  - "run e2e tests"
  - "execute test suite"
  - "run integration tests"
  - "test deployment"
stages:
  - setup-environment
  - test-data-preparation
  - auth-flow-tests
  - member-management-tests
  - payment-flow-tests
  - tenant-operations-tests
  - cleanup
  - report-generation
estimatedDuration: "30-60 minutes"
priority: high
```

## Test Suite Structure

### Test Categories

1. **Authentication Tests** (15 tests, ~10 min)
   - Login flows
   - Registration
   - Password reset
   - MFA flows
   - SSO integration

2. **Member Management Tests** (20 tests, ~15 min)
   - Member enrollment
   - Profile updates
   - Role management
   - Bulk operations

3. **Payment Flow Tests** (12 tests, ~12 min)
   - Subscription creation
   - Plan upgrades/downgrades
   - Payment method updates
   - Invoice generation

4. **Tenant Operations Tests** (10 tests, ~8 min)
   - Tenant onboarding
   - Settings management
   - Multi-tenant isolation
   - Theme customization

**Total:** 57 tests across 4 categories

## Workflow Stages

### Stage 1: Environment Setup
**Agent:** selenium-test-architect
**Tasks:**
1. Verify test environment availability (staging/test)
2. Initialize Selenium WebDriver instances
3. Configure browser settings (Chrome, Firefox, Safari)
4. Set up test database connection
5. Verify Keycloak test realm exists
6. Check Stripe test mode configuration
7. Initialize test reporting framework
8. Set up screenshot and video recording
9. Configure parallel execution workers
10. Verify all services are healthy

**Environment Checks:**
```yaml
Services:
  - API Server: http://api.test.lobbi.app
  - Frontend: http://app.test.lobbi.app
  - Keycloak: http://keycloak.test.lobbi.app
  - Database: test_lobbi_db
  - Stripe: Test mode enabled

Browser Matrix:
  - Chrome 120+ (desktop)
  - Firefox 121+ (desktop)
  - Safari 17+ (desktop)
  - Chrome Mobile (responsive)
```

**Outputs:**
- WebDriver instances (pooled)
- Environment status report
- Service health check results
- Browser capabilities confirmed
- Test execution plan

**Duration:** 3-5 minutes

### Stage 2: Test Data Preparation
**Agent:** test-data-manager
**Tasks:**
1. Create isolated test tenant(s)
2. Generate test user accounts with various roles
3. Create test payment methods (Stripe test cards)
4. Seed test subscription plans
5. Generate test member data
6. Create test invitation tokens
7. Prepare test files for upload
8. Initialize test state in database
9. Create API test tokens
10. Document test data credentials

**Test Data Sets:**

**Test Tenants:**
- `test-basic-tenant` (Basic plan)
- `test-pro-tenant` (Pro plan)
- `test-enterprise-tenant` (Enterprise plan)

**Test Users:**
```
Admin: admin@test.lobbi.app / TestPass123!
Member: member@test.lobbi.app / TestPass123!
Guest: guest@test.lobbi.app / TestPass123!
Unverified: unverified@test.lobbi.app / TestPass123!
```

**Stripe Test Cards:**
- Success: 4242424242424242
- Decline: 4000000000000002
- 3DS: 4000002500003155

**Outputs:**
- Test tenant IDs
- Test user credentials
- Test data manifest
- Database snapshot for rollback

**Duration:** 5-8 minutes

### Stage 3: Authentication Flow Tests
**Agent:** auth-flow-tester
**Tests Executed:** (Parallel where possible)

#### Test 3.1: Standard Login Flow
```
1. Navigate to login page
2. Enter valid credentials
3. Submit login form
4. Verify redirect to dashboard
5. Confirm user session active
6. Verify user menu displays correctly
```

#### Test 3.2: Login with Invalid Credentials
```
1. Navigate to login page
2. Enter invalid password
3. Submit form
4. Verify error message displayed
5. Confirm no session created
6. Verify account not locked
```

#### Test 3.3: Self-Registration Flow
```
1. Navigate to registration page
2. Fill registration form
3. Submit form
4. Verify email verification sent
5. Click verification link
6. Confirm account activated
7. Verify auto-login after verification
```

#### Test 3.4: Password Reset Flow
```
1. Click "Forgot Password"
2. Enter email address
3. Verify reset email sent
4. Click reset link in email
5. Enter new password
6. Confirm password updated
7. Login with new password
```

#### Test 3.5: MFA Enrollment
```
1. Login as admin
2. Navigate to security settings
3. Enable MFA
4. Scan QR code (automated)
5. Enter verification code
6. Confirm MFA enabled
7. Logout and login to test MFA
```

#### Test 3.6-3.15: Additional Auth Tests
- Social login (if enabled)
- Session timeout
- Remember me functionality
- Account lockout after failed attempts
- Email verification resend
- Login across multiple devices
- Logout functionality
- Token refresh
- SSO integration (if configured)
- First-time login forced password change

**Outputs:**
- Auth test results (pass/fail)
- Screenshots of each step
- Response time metrics
- Error logs (if any)

**Duration:** 8-12 minutes (parallel execution)

### Stage 4: Member Management Tests
**Agent:** member-journey-tester
**Tests Executed:**

#### Test 4.1: Admin Invites Member
```
1. Login as tenant admin
2. Navigate to Members page
3. Click "Invite Member"
4. Enter member email and role
5. Submit invitation
6. Verify invitation email sent
7. Check member appears as "Pending"
```

#### Test 4.2: Member Accepts Invitation
```
1. Retrieve invitation email
2. Click invitation link
3. Set password
4. Complete profile
5. Submit registration
6. Verify member status changes to "Active"
7. Confirm member can login
```

#### Test 4.3: Update Member Profile
```
1. Login as member
2. Navigate to profile
3. Update name, phone, bio
4. Upload profile photo
5. Save changes
6. Verify updates reflected
7. Check audit log entry
```

#### Test 4.4: Change Member Role
```
1. Login as admin
2. Select member
3. Change role from Member to Admin
4. Confirm change
5. Verify role updated
6. Check member sees admin features
7. Verify audit log
```

#### Test 4.5: Bulk Member Import
```
1. Login as admin
2. Navigate to bulk import
3. Upload CSV with 10 test members
4. Review preview
5. Confirm import
6. Verify all members created
7. Check invitation emails sent
8. Verify import report
```

#### Test 4.6-4.20: Additional Member Tests
- Member search and filtering
- Deactivate member
- Reactivate member
- Delete member
- Export member list
- Member group assignment
- Bulk role update
- Member activity log
- Duplicate email prevention
- Member quota enforcement
- Custom field support
- Member permissions
- Team assignment
- Department management
- Member onboarding checklist

**Outputs:**
- Member test results
- API response times
- UI screenshots
- CSV import/export validation

**Duration:** 12-18 minutes (partial parallel)

### Stage 5: Payment Flow Tests
**Agent:** payment-flow-tester
**Tests Executed:**

#### Test 5.1: Create Subscription (Success)
```
1. Login as new tenant admin
2. Select Pro plan
3. Enter payment details (4242...)
4. Submit payment
5. Verify payment processed
6. Confirm subscription active
7. Verify features unlocked
8. Check invoice generated
```

#### Test 5.2: Create Subscription (Declined Card)
```
1. Login as new tenant
2. Select plan
3. Enter declined card (4000...)
4. Submit payment
5. Verify error message shown
6. Confirm subscription not created
7. Verify user can retry
8. Check no partial data created
```

#### Test 5.3: Upgrade Subscription
```
1. Login as Basic plan tenant
2. Navigate to billing
3. Select Pro plan upgrade
4. Review proration
5. Confirm upgrade
6. Verify payment processed
7. Check features immediately unlocked
8. Verify next invoice preview
```

#### Test 5.4: Downgrade Subscription
```
1. Login as Pro plan tenant
2. Select Basic plan downgrade
3. Review change summary
4. Confirm downgrade
5. Verify scheduled for end of period
6. Check features still active
7. Verify confirmation email
```

#### Test 5.5: Update Payment Method
```
1. Login as tenant admin
2. Navigate to billing
3. Click "Update Payment Method"
4. Enter new card details
5. Save changes
6. Verify card updated in Stripe
7. Check confirmation displayed
```

#### Test 5.6-5.12: Additional Payment Tests
- View invoice history
- Download invoice PDF
- Payment retry after failure
- Cancel subscription
- Reactivate cancelled subscription
- Apply coupon code
- Handle 3D Secure card

**Outputs:**
- Payment test results
- Stripe webhook logs
- Transaction IDs
- Invoice PDFs
- Error handling validation

**Duration:** 10-15 minutes

### Stage 6: Tenant Operations Tests
**Agent:** tenant-operations-tester
**Tests Executed:**

#### Test 6.1: Complete Tenant Onboarding
```
1. Submit tenant registration form
2. Verify tenant provisioned
3. Check Keycloak realm created
4. Verify admin account created
5. Confirm welcome email sent
6. Test admin can login
7. Verify default theme applied
8. Check subscription created
```

#### Test 6.2: Customize Tenant Theme
```
1. Login as tenant admin
2. Navigate to branding settings
3. Upload logo
4. Change color scheme
5. Update fonts
6. Preview changes
7. Save and publish
8. Verify theme applied across app
```

#### Test 6.3: Configure Tenant Settings
```
1. Login as admin
2. Update company info
3. Configure email notifications
4. Set member invite settings
5. Configure security policies
6. Save settings
7. Verify settings persisted
8. Test settings take effect
```

#### Test 6.4: Multi-Tenant Isolation
```
1. Create two test tenants
2. Create members in each
3. Login as Tenant A member
4. Verify only Tenant A data visible
5. Attempt to access Tenant B data (should fail)
6. Switch to Tenant B member
7. Verify isolation maintained
8. Check database queries use tenant filter
```

#### Test 6.5-6.10: Additional Tenant Tests
- Export tenant data
- Configure integrations
- Manage API keys
- Audit log access
- Tenant suspension
- Tenant reactivation

**Outputs:**
- Tenant operation results
- Isolation validation
- Configuration verification
- Security audit results

**Duration:** 8-12 minutes

### Stage 7: Cleanup
**Agent:** test-data-manager
**Tasks:**
1. Delete test tenant records (soft delete)
2. Disable test Keycloak realms
3. Cancel test Stripe subscriptions
4. Remove test user accounts
5. Clear test data from database
6. Delete uploaded test files
7. Archive test screenshots/videos
8. Close WebDriver instances
9. Restore database to clean state (if needed)
10. Document cleanup completion

**Cleanup Verification:**
- No test data in production-like state
- All Stripe test subscriptions cancelled
- Keycloak test realms disabled
- Test files removed from storage
- Screenshots archived to test reports

**Duration:** 3-5 minutes

### Stage 8: Report Generation
**Agent:** report-generator
**Tasks:**
1. Aggregate results from all test categories
2. Calculate pass/fail statistics
3. Generate HTML test report
4. Create JUnit XML for CI integration
5. Compile screenshots for failed tests
6. Generate performance metrics report
7. Create coverage report
8. List flaky tests (if any)
9. Generate trend analysis (if historical data)
10. Publish report to test dashboard

**Report Contents:**

```
============================================
E2E Test Suite Report
Execution Date: 2025-12-12 14:30:00 UTC
Environment: staging.lobbi.app
Duration: 45 minutes 23 seconds
============================================

Summary:
  Total Tests: 57
  Passed: 55 (96.5%)
  Failed: 2 (3.5%)
  Skipped: 0
  Flaky: 1

Category Breakdown:
  Authentication (15 tests): 15 passed, 0 failed
  Member Management (20 tests): 19 passed, 1 failed
  Payment Flows (12 tests): 11 passed, 1 failed
  Tenant Operations (10 tests): 10 passed, 0 failed

Failed Tests:
  1. Test 4.8: Member quota enforcement
     Error: Expected 403, got 200
     Screenshot: test_4_8_error.png

  2. Test 5.7: Apply coupon code
     Error: Stripe API timeout
     Screenshot: test_5_7_error.png

Performance Metrics:
  Average API Response: 342ms
  Average Page Load: 1.2s
  Slowest Test: 5.3 (3D Secure - 45s)

Browser Coverage:
  Chrome 120: 57/57 passed
  Firefox 121: 55/57 passed (2 failures)
  Safari 17: 57/57 passed

Recommendations:
  - Investigate member quota enforcement logic
  - Add retry logic for Stripe API calls
  - Monitor Test 4.8 for flakiness
```

**Outputs:**
- HTML test report
- JUnit XML report
- Screenshots archive
- Performance metrics JSON
- Test coverage report
- CI/CD integration artifacts

**Duration:** 2-4 minutes

## Execution Flow

```
[Start Test Suite]
         │
         ▼
┌──────────────────────┐
│ Setup Environment    │ ─── selenium-test-architect
│ • Init WebDriver     │
│ • Health checks      │
│ (3-5 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Prepare Test Data    │ ─── test-data-manager
│ • Create tenants     │
│ • Generate users     │
│ (5-8 min)            │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│         Parallel Test Execution         │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ Auth Tests │  │ Member Tests     │   │
│  │ (8-12 min) │  │ (12-18 min)      │   │
│  └────────────┘  └──────────────────┘   │
│                                          │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ Payment    │  │ Tenant Ops       │   │
│  │ (10-15 min)│  │ (8-12 min)       │   │
│  └────────────┘  └──────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Cleanup          │ ─── test-data-manager
         │ • Remove test    │
         │   data           │
         │ (3-5 min)        │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Generate Report  │ ─── report-generator
         │ • Aggregate      │
         │ • Create HTML    │
         │ (2-4 min)        │
         └────────┬─────────┘
                  │
                  ▼
             [Complete]
```

## Prerequisites

### Environment Requirements:
- Test/staging environment deployed and accessible
- All services running (API, frontend, Keycloak, database)
- Stripe test mode configured
- Email testing service (Mailtrap/MailHog)
- Selenium Grid or standalone WebDriver
- Test database with clean state

### Configuration:
- Test environment variables set
- Browser drivers installed (ChromeDriver, GeckoDriver)
- Test data fixtures prepared
- API test tokens generated
- Keycloak test realm template

### Access:
- Admin access to test environment
- Stripe test account credentials
- Keycloak admin credentials
- Database access for verification
- Email testing service access

## Post-Workflow Actions

1. **Publish Results**
   - Upload report to test dashboard
   - Send summary to Slack/email
   - Update test metrics tracking
   - Archive test artifacts

2. **Issue Creation**
   - Auto-create Jira tickets for failures
   - Link to test report and screenshots
   - Assign to relevant teams
   - Set priority based on failure type

3. **Trend Analysis**
   - Compare with previous runs
   - Identify flaky tests
   - Track test duration trends
   - Monitor coverage changes

4. **CI/CD Integration**
   - Block deployment if critical tests fail
   - Update deployment pipeline status
   - Trigger alerts for failures
   - Archive results for compliance

## Rollback Procedure

### Test Data Rollback:
```
1. Restore database snapshot from pre-test state
2. Purge any created Stripe test data
3. Remove test Keycloak realms
4. Clear test file uploads
5. Reset test environment to baseline
```

### Failed Test Retry:
```
1. Identify failed test
2. Check if failure is environmental
3. Retry failed test in isolation
4. If passes: mark as flaky
5. If fails again: confirm as real failure
6. Log retry results
```

## Error Handling

### Common Errors and Resolution

| Error | Stage | Resolution |
|-------|-------|------------|
| Selenium timeout | 3-6 | Increase timeout, check page load |
| API unreachable | 1 | Verify services, check network |
| Database connection failed | 2 | Check DB credentials, restart DB |
| Stripe API error | 5 | Verify test mode, check API keys |
| Email not received | 3 | Check email service, verify queue |
| Browser crash | 3-6 | Restart WebDriver, retry test |
| Test data conflict | 2 | Clear existing data, regenerate |

## Success Criteria

- [ ] All test categories executed
- [ ] Pass rate ≥95% (54+ of 57 tests)
- [ ] No critical failures (auth, payment)
- [ ] Test environment stable throughout
- [ ] All screenshots captured for failures
- [ ] Report generated successfully
- [ ] Test data cleaned up completely
- [ ] No data leakage to production
- [ ] Performance metrics within SLA
- [ ] All browsers tested (if required)
- [ ] CI/CD integration successful

## Metrics and Monitoring

**Key Metrics:**
- Overall pass rate (target: ≥95%)
- Test execution time (target: <60 min)
- Test stability (flaky rate <5%)
- Browser compatibility (all green)
- API performance (avg <500ms)
- Page load performance (<2s)

**Alerts:**
- Pass rate drops below 90%
- Test suite exceeds 75 minutes
- Critical test fails (auth, payment)
- Test environment unreachable
- Excessive flaky tests (>3)

## Test Maintenance

### Regular Updates:
- Review and update test data monthly
- Update browser versions quarterly
- Refactor flaky tests as identified
- Add tests for new features
- Remove tests for deprecated features
- Update selectors for UI changes

### Test Optimization:
- Identify and parallelize slow tests
- Optimize data preparation
- Cache common test states
- Use API for faster setup
- Reduce unnecessary waits

## Testing Checklist

Before running in production:
- [ ] All test environments provisioned
- [ ] Test data fixtures validated
- [ ] Browser matrix configured
- [ ] Selenium Grid operational
- [ ] Stripe test mode verified
- [ ] Email testing service working
- [ ] Database snapshot capability tested
- [ ] Cleanup procedures verified
- [ ] Report generation tested
- [ ] CI/CD integration confirmed
- [ ] Parallel execution working
- [ ] Error handling validated
- [ ] Rollback procedures tested
