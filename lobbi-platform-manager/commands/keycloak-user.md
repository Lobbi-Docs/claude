---
description: Create Keycloak users (single or bulk dummy users with org_id)
argument-hint: "[--email EMAIL] [--password PASS] [--org-id ORG] [--count N]"
allowed-tools: ["Bash", "Read", "Write"]
---

Create Keycloak users for testing and development, supporting both single user creation with specific credentials and bulk dummy user generation for multi-tenant testing.

## Your Task

You are creating user accounts in Keycloak for the-lobbi/keycloak-alpha platform. Users must have the `org_id` attribute set for multi-tenant data isolation.

## Arguments

- `--email` (optional): User email address (required for single user creation)
- `--password` (optional): User password (default: "dummy123")
- `--org-id` (optional): Organization ID for multi-tenant isolation (default: "org-001")
- `--count` (optional): Number of dummy users to create (for bulk creation)

## Steps to Execute

### For Single User Creation

1. **Parse Arguments**
   - Validate email is provided
   - Use password or default to "dummy123"
   - Use org-id or default to "org-001"

2. **Get Admin Access Token**
   - Read .env for KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD
   - Obtain token:
     ```bash
     curl -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "username=${ADMIN_USER}" \
       -d "password=${ADMIN_PASS}" \
       -d "grant_type=password" \
       -d "client_id=admin-cli"
     ```

3. **Read Realm from .env**
   - Get KEYCLOAK_REALM (default to "master" if not set)

4. **Create User**
   - POST to Keycloak Admin API:
     ```bash
     curl -X POST "http://localhost:8080/admin/realms/${REALM}/users" \
       -H "Authorization: Bearer ${TOKEN}" \
       -H "Content-Type: application/json" \
       -d '{
         "username": "{{email}}",
         "email": "{{email}}",
         "enabled": true,
         "emailVerified": true,
         "attributes": {
           "org_id": ["{{org-id}}"]
         },
         "credentials": [{
           "type": "password",
           "value": "{{password}}",
           "temporary": false
         }]
       }'
     ```

5. **Verify User Creation**
   - Search for user by email to confirm creation
   - Display user ID and org_id attribute

### For Bulk User Creation

1. **Parse Count Argument**
   - Validate count is a positive integer
   - Use org-id or default to "org-001"

2. **Get Admin Access Token** (same as above)

3. **Generate and Create Multiple Users**
   - For i from 1 to count:
     - Generate email: `user${i}@test.lobbi.com`
     - Generate username: `testuser${i}`
     - Create user with:
       - Email: generated email
       - Username: generated username
       - Password: "dummy123"
       - org_id: specified org-id
       - emailVerified: true

4. **Create Users in Batches**
   - Use a loop to create users (max 10 at a time to avoid rate limits)
   - Add 100ms delay between batches

5. **Report Creation Status**
   - Track successful and failed creations
   - Display summary:
     - Total requested: N
     - Successfully created: M
     - Failed: F
     - Org ID: {{org-id}}

## Usage Examples

### Create single user
```
/lobbi:keycloak-user --email john@example.com --password SecurePass123 --org-id org-alpha
```

### Create single user with defaults
```
/lobbi:keycloak-user --email jane@example.com
```
(Uses password: dummy123, org-id: org-001)

### Create 50 dummy users for organization org-beta
```
/lobbi:keycloak-user --count 50 --org-id org-beta
```

### Create 10 dummy users with default org
```
/lobbi:keycloak-user --count 10
```

## Expected Outputs

### Single User Creation
```
✅ User Created Successfully

Email: john@example.com
User ID: abc123-def456-ghi789
Org ID: org-alpha
Password: SecurePass123
Realm: master
Status: Enabled, Email Verified
```

### Bulk User Creation
```
✅ Bulk User Creation Complete

Total Requested: 50
Successfully Created: 50
Failed: 0

Details:
- Org ID: org-beta
- Password: dummy123
- Email Pattern: user1@test.lobbi.com ... user50@test.lobbi.com
- Username Pattern: testuser1 ... testuser50
- Realm: master

Created Users:
1. user1@test.lobbi.com (ID: abc-123)
2. user2@test.lobbi.com (ID: def-456)
...
50. user50@test.lobbi.com (ID: xyz-789)
```

## Success Criteria

- Admin access token obtained successfully
- User(s) created in the correct realm
- All users have `org_id` attribute set
- Email verification is enabled
- Passwords are set correctly (non-temporary)
- Creation summary report is displayed
- No errors in user creation
- Users can be found in Keycloak admin console

## Notes

- Default password "dummy123" is for development only; use strong passwords in production
- The org_id attribute is critical for multi-tenant data isolation
- Email verification is automatically set to true for testing purposes
- Bulk creation should be limited to reasonable numbers (< 1000) to avoid performance issues
- Consider rate limiting when creating many users
- Users are created with enabled status by default
- Temporary passwords are NOT used; users can log in immediately
- In production, implement email verification workflow
