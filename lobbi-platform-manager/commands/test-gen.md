---
description: Generate Jest tests from API routes and service endpoints
argument-hint: "[--route FILE] [--type TYPE]"
allowed-tools: ["Read", "Write", "Grep", "Glob", "Bash"]
---

Generate comprehensive Jest test files from Express.js API routes, including unit tests, integration tests, and end-to-end tests with proper auth mocking for Keycloak-protected endpoints.

## Your Task

You are generating Jest test skeletons for the Lobbi platform's API routes. Parse Express route files, identify endpoints, extract authentication requirements, and generate complete test files with proper setup, mocking, and assertions.

## Arguments

- `--route` (optional): Specific route file path (e.g., "services/membership/routes/members.js")
- `--type` (optional): Test type (unit, integration, e2e) - default: integration

## Test Types

### Unit Tests
- Test route handlers in isolation
- Mock all dependencies (database, Keycloak, external services)
- Fast execution, no external services required
- Output: `*.unit.test.js`

### Integration Tests
- Test routes with real database connections
- Mock external services (Stripe, email)
- Mock Keycloak authentication
- Output: `*.integration.test.js`

### E2E Tests
- Full request/response cycle
- Real database (test instance)
- Real Keycloak (test realm)
- Real external service integrations (with test credentials)
- Output: `*.e2e.test.js`

## Steps to Execute

### 1. Locate Route Files

If `--route` is provided:
- Use the specified file
- Validate file exists

If `--route` is not provided:
- Search for route files:
  ```bash
  find services -name "routes" -type d
  find services -name "*routes*.js" -o -name "*router*.js"
  ```
- List discovered routes
- Generate tests for all routes

### 2. Parse Route File

For each route file:

**Read file content**

**Identify Express router patterns:**
- `router.get('/path', middleware, handler)`
- `router.post('/path', auth, validate, handler)`
- `router.put('/path/:id', ...)`
- `router.delete('/path/:id', ...)`
- `router.patch('/path/:id', ...)`

**Extract route information:**
- HTTP method (GET, POST, PUT, DELETE, PATCH)
- Path (including params)
- Middleware (especially auth middleware)
- Handler function name
- Request validation schemas
- Expected request body structure
- Expected response structure

**Identify authentication:**
- Look for `keycloakAuth`, `authenticate`, `verifyToken` middleware
- Determine required roles/permissions
- Extract org_id isolation requirements

### 3. Analyze Handler Functions

**Read handler implementation:**
- Identify database operations (MongoDB, PostgreSQL queries)
- Identify external API calls (Stripe, etc.)
- Determine request body structure
- Determine response structure
- Identify error cases

**Map dependencies:**
- Database models used
- External services called
- Utility functions invoked

### 4. Generate Test File Structure

```javascript
const request = require('supertest');
const { app } = require('../../app');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

describe('{{RouteGroup}} API', () => {
  let mongoClient;
  let db;
  let authToken;

  beforeAll(async () => {
    // Setup test database connection
    // Setup test data
    // Generate test auth token
  });

  afterAll(async () => {
    // Cleanup test data
    // Close connections
  });

  beforeEach(async () => {
    // Reset test data between tests
  });

  describe('{{HTTP_METHOD}} {{PATH}}', () => {
    it('should {{expected_behavior}} when {{condition}}', async () => {
      // Test implementation
    });

    it('should return 401 when not authenticated', async () => {
      // Auth test
    });

    it('should return 403 when accessing different org data', async () => {
      // Multi-tenant isolation test
    });
  });
});
```

### 5. Generate Auth Token Helper

For Keycloak-protected routes, generate mock JWT token:

```javascript
function generateAuthToken(orgId = 'org-001', userId = 'test-user', roles = []) {
  return jwt.sign(
    {
      sub: userId,
      org_id: orgId,
      realm_access: { roles },
      email: 'test@example.com',
      preferred_username: 'testuser'
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}
```

### 6. Generate Test Cases for Each Endpoint

#### GET Endpoints
```javascript
describe('GET /members/:id', () => {
  it('should return member by id', async () => {
    const response = await request(app)
      .get('/api/members/123')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', '123');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('org_id', 'org-001');
  });

  it('should return 404 when member not found', async () => {
    await request(app)
      .get('/api/members/nonexistent')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('should return 401 when not authenticated', async () => {
    await request(app)
      .get('/api/members/123')
      .expect(401);
  });
});
```

#### POST Endpoints
```javascript
describe('POST /members', () => {
  it('should create new member', async () => {
    const newMember = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'member'
    };

    const response = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newMember)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('John Doe');
    expect(response.body.org_id).toBe('org-001');
  });

  it('should return 400 for invalid data', async () => {
    const invalidMember = { name: '' }; // Missing required fields

    const response = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidMember)
      .expect(400);

    expect(response.body).toHaveProperty('errors');
  });
});
```

#### PUT/PATCH Endpoints
```javascript
describe('PUT /members/:id', () => {
  it('should update member', async () => {
    const updates = {
      name: 'Jane Doe Updated',
      email: 'jane.updated@example.com'
    };

    const response = await request(app)
      .put('/api/members/123')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.name).toBe('Jane Doe Updated');
  });

  it('should return 403 when updating member from different org', async () => {
    const otherOrgToken = generateAuthToken('org-002', 'other-user');

    await request(app)
      .put('/api/members/123')
      .set('Authorization', `Bearer ${otherOrgToken}`)
      .send({ name: 'Hacked' })
      .expect(403);
  });
});
```

#### DELETE Endpoints
```javascript
describe('DELETE /members/:id', () => {
  it('should delete member', async () => {
    await request(app)
      .delete('/api/members/123')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);
  });

  it('should return 404 when deleting non-existent member', async () => {
    await request(app)
      .delete('/api/members/nonexistent')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
```

### 7. Generate Database Mocking (Unit Tests)

```javascript
jest.mock('../../models/Member', () => ({
  findById: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn()
}));

const Member = require('../../models/Member');

// In test
Member.findById.mockResolvedValue({
  id: '123',
  name: 'John Doe',
  org_id: 'org-001'
});
```

### 8. Generate Multi-Tenant Isolation Tests

```javascript
describe('Multi-tenant isolation', () => {
  it('should only return members from same org', async () => {
    const response = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.every(m => m.org_id === 'org-001')).toBe(true);
  });

  it('should prevent access to other org data', async () => {
    const otherOrgToken = generateAuthToken('org-002', 'other-user');

    await request(app)
      .get('/api/members/123') // Member from org-001
      .set('Authorization', `Bearer ${otherOrgToken}`)
      .expect(403);
  });
});
```

### 9. Write Test File

- Determine output path: `services/{service}/__tests__/{route-name}.{type}.test.js`
- Create __tests__ directory if it doesn't exist
- Write generated test file
- Add proper imports and setup
- Format with Prettier (if available)

### 10. Generate Test Data Fixtures

Create `__tests__/fixtures/{entity}.js`:

```javascript
module.exports = {
  validMember: {
    name: 'Test Member',
    email: 'test@example.com',
    org_id: 'org-001',
    role: 'member'
  },

  invalidMember: {
    name: '', // Invalid: empty name
    email: 'not-an-email' // Invalid: bad format
  },

  members: [
    {
      id: '1',
      name: 'Member 1',
      org_id: 'org-001'
    },
    {
      id: '2',
      name: 'Member 2',
      org_id: 'org-001'
    }
  ]
};
```

## Usage Examples

### Generate tests for all routes (integration)
```
/lobbi:test-gen
```

### Generate unit tests for specific route
```
/lobbi:test-gen --route services/membership/routes/members.js --type unit
```

### Generate E2E tests for payment service
```
/lobbi:test-gen --route services/payment/routes/subscriptions.js --type e2e
```

### Generate integration tests for all membership routes
```
/lobbi:test-gen --route services/membership/routes --type integration
```

## Expected Outputs

### Test File Generated
```
✅ Test Generation Complete

Generated Files:
  - services/membership/__tests__/members.integration.test.js (245 lines)
  - services/membership/__tests__/fixtures/member.js (32 lines)

Test Coverage:
  Routes Analyzed: 8
  Test Cases Generated: 24
  - GET /members: 4 tests
  - GET /members/:id: 3 tests
  - POST /members: 5 tests
  - PUT /members/:id: 4 tests
  - DELETE /members/:id: 3 tests
  - Auth tests: 5 tests
  - Multi-tenant tests: 3 tests

Features:
  ✅ Auth token mocking
  ✅ Multi-tenant isolation tests
  ✅ Request validation tests
  ✅ Error handling tests
  ✅ Database mocking (unit tests)
  ✅ Test fixtures

Next Steps:
  1. Review generated tests
  2. Add custom assertions as needed
  3. Run tests: npm test members.integration.test.js
  4. Add to CI/CD pipeline
```

### Generated Test File Sample
```javascript
const request = require('supertest');
const { app } = require('../../app');
const jwt = require('jsonwebtoken');

describe('Members API', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateAuthToken('org-001', 'test-user');
  });

  describe('GET /api/members', () => {
    it('should return all members for org', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(m => m.org_id === 'org-001')).toBe(true);
    });

    // ... more tests
  });

  // ... more describe blocks
});

function generateAuthToken(orgId, userId) {
  return jwt.sign(
    { sub: userId, org_id: orgId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}
```

## Success Criteria

- Route files successfully parsed
- All endpoints identified
- HTTP methods and paths extracted
- Auth middleware detected
- Test file structure generated
- Test cases cover happy path and error cases
- Auth mocking implemented for protected routes
- Multi-tenant isolation tests included
- Database mocking configured (for unit tests)
- Test fixtures created
- Valid Jest syntax
- Tests can be run with `npm test`
- No syntax errors in generated code

## Notes

- Generated tests are skeletons; manual customization may be needed
- Assertions should be reviewed and enhanced
- Test data fixtures should match actual data structure
- Auth token generation must match Keycloak JWT structure
- Multi-tenant tests are critical for security
- Consider edge cases not automatically detected
- Use `describe.skip` for tests that need manual implementation
- Integration tests require test database setup
- E2E tests require all services running
- Mock external APIs (Stripe, email) in integration tests
- Use test containers for isolated database testing
- Consider using factories (e.g., Fishery) for test data generation
