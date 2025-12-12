# Member Enrollment Workflow

Multi-path member enrollment workflow supporting self-registration, admin invitation, and bulk import for the Lobbi platform.

## Workflow Metadata
```yaml
name: member-enrollment
type: conditional-branching
description: Member enrollment with multiple entry paths - self-registration, invitation, and bulk import
agents:
  - membership-specialist
  - keycloak-realm-admin
  - email-notification-specialist
  - data-validation-specialist
  - bulk-import-processor
triggers:
  - "enroll member"
  - "register member"
  - "invite member"
  - "bulk import members"
  - "add member"
stages:
  - enrollment-path-selection
  - data-validation
  - duplicate-check
  - keycloak-user-creation
  - member-record-creation
  - welcome-notification
  - bulk-processing (conditional)
estimatedDuration: "5-15 minutes (single), 30-90 minutes (bulk)"
priority: medium
```

## Enrollment Paths

### Path A: Self-Registration
**Trigger:** User submits registration form
**Stages:** Validation → Duplicate Check → Keycloak Creation → Member Record → Welcome Email

### Path B: Admin Invitation
**Trigger:** Tenant admin invites user
**Stages:** Validation → Duplicate Check → Invitation Email → Keycloak Creation (on accept) → Member Record

### Path C: Bulk Import
**Trigger:** CSV/Excel upload by admin
**Stages:** File Validation → Batch Processing → Individual Enrollment (Path B for each)

## Workflow Stages

### Stage 0: Enrollment Path Selection
**Agent:** membership-specialist
**Tasks:**
1. Identify enrollment source (form, invitation, bulk)
2. Validate tenant context and permissions
3. Check tenant member quota/limits
4. Route to appropriate enrollment path
5. Initialize audit trail

**Outputs:**
- Selected enrollment path
- Tenant context
- Permission validation
- Quota check result

**Duration:** <1 minute

### Stage 1: Data Validation
**Agent:** data-validation-specialist
**Tasks:**
1. Validate required fields (email, name, role)
2. Check email format and domain rules
3. Validate phone number if provided
4. Verify role assignments are allowed
5. Check custom field constraints
6. Sanitize input data
7. Validate against tenant-specific rules

**Required Fields:**
- Email address (must be unique per tenant)
- First name
- Last name
- Role (member, admin, guest)

**Optional Fields:**
- Phone number
- Department
- Employee ID
- Custom attributes
- Profile photo URL

**Outputs:**
- Validation result (pass/fail)
- Sanitized data
- Error messages if validation fails

**Duration:** 1-2 minutes

### Stage 2: Duplicate Check
**Agent:** membership-specialist
**Tasks:**
1. Check if email exists in tenant member database
2. Check if email exists in Keycloak realm
3. Handle duplicate scenarios:
   - Existing active member: reject or update
   - Existing inactive member: reactivate option
   - Pending invitation: resend or update
4. Check for similar names (fuzzy matching)
5. Validate against exclusion lists

**Duplicate Handling:**
- **Active Member:** Return error, suggest login
- **Inactive Member:** Offer reactivation
- **Pending Invitation:** Offer to resend
- **Different Tenant:** Allow (multi-tenant support)

**Outputs:**
- Duplicate check result
- Existing member ID (if duplicate)
- Recommended action

**Duration:** 1-2 minutes

### Stage 3: Keycloak User Creation
**Agent:** keycloak-realm-admin
**Tasks:**
1. Create user in tenant-specific Keycloak realm
2. Set user attributes (email, name, custom fields)
3. Assign roles based on member type
4. Configure authentication requirements
5. Set email verification requirement
6. Generate temporary password (if admin-created)
7. Configure MFA requirements based on role
8. Create user session policies
9. Log user creation in Keycloak

**Self-Registration Flow:**
- Email verification required
- User sets own password
- Default member role assigned

**Admin Invitation Flow:**
- Temporary password generated
- Forced password change on first login
- Roles assigned by admin

**Outputs:**
- Keycloak user ID (UUID)
- User credentials (if applicable)
- Email verification status
- Role assignments

**Duration:** 2-3 minutes

### Stage 4: Member Record Creation
**Agent:** membership-specialist
**Tasks:**
1. Create member record in tenant database
2. Link to Keycloak user ID
3. Store member profile data
4. Set membership status (active/pending)
5. Configure member permissions
6. Initialize member preferences
7. Create member activity log entry
8. Set up member-specific feature flags
9. Assign to default groups/teams (if applicable)

**Member Record Fields:**
- Keycloak user ID
- Tenant ID
- Email
- Full name
- Role(s)
- Status (pending, active, inactive, suspended)
- Enrollment date
- Enrollment method
- Custom attributes
- Preferences

**Outputs:**
- Member database ID
- Member profile
- Initial permissions
- Group memberships

**Duration:** 2-3 minutes

### Stage 5: Welcome Notification
**Agent:** email-notification-specialist
**Tasks:**
1. Select appropriate email template based on enrollment path
2. Personalize email content
3. Include credentials (if admin-invited)
4. Provide login instructions and portal URL
5. Include onboarding resources
6. Send email via configured service (SendGrid/SES)
7. Track email delivery status
8. Schedule follow-up emails
9. Create in-app notification

**Email Types:**
- **Self-Registration:** Email verification link
- **Admin Invitation:** Welcome with credentials
- **Bulk Import:** Welcome with set-password link

**Outputs:**
- Email delivery status
- Email ID for tracking
- Follow-up schedule
- In-app notification created

**Duration:** 1-2 minutes

### Stage 6: Bulk Processing (Conditional)
**Agent:** bulk-import-processor
**Tasks:**
1. Parse CSV/Excel file
2. Validate file format and headers
3. Process rows in batches (e.g., 50 at a time)
4. For each row, execute stages 1-5
5. Track success/failure for each row
6. Generate import summary report
7. Send completion email to admin
8. Handle partial failures gracefully

**Batch Processing:**
- Process in chunks to avoid timeouts
- Parallel processing where possible
- Transaction management for data integrity
- Detailed error logging

**Outputs:**
- Import summary (total, success, failed)
- Error report with row numbers
- Successfully enrolled member list
- Failed member list with reasons

**Duration:** 30-90 minutes (depends on volume)

## Execution Flow

### Self-Registration Flow
```
[User Submits Form]
         │
         ▼
┌──────────────────────┐
│ Path Selection       │ ─── membership-specialist
│ (identify source)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Data Validation      │ ─── data-validation-specialist
│ • Check required     │
│ • Sanitize input     │
│ (1-2 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Duplicate Check      │ ─── membership-specialist
│ • Email uniqueness   │
│ • Handle existing    │
│ (1-2 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Keycloak User        │ ─── keycloak-realm-admin
│ • Create user        │
│ • Set email verify   │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Member Record        │ ─── membership-specialist
│ • Create DB record   │
│ • Set permissions    │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Verification Email   │ ─── email-notification-specialist
│ • Send verify link   │
│ • Track delivery     │
│ (1-2 min)            │
└──────────┬───────────┘
           │
           ▼
   [Email Verification]
           │
           ▼
   [Enrollment Complete]
```

### Admin Invitation Flow
```
[Admin Invites Member]
         │
         ▼
┌──────────────────────┐
│ Validation +         │ ─── data-validation-specialist
│ Duplicate Check      │     membership-specialist
│ (combined)           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Send Invitation      │ ─── email-notification-specialist
│ • Generate token     │
│ • Send invite email  │
└──────────┬───────────┘
           │
           ▼
   [User Accepts] ────────────┐
           │                   │
           ▼                   ▼
┌──────────────────────┐  [Invitation Expires]
│ Keycloak + Member    │
│ (parallel creation)  │  ─── keycloak-realm-admin
│                      │      membership-specialist
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Welcome Email        │ ─── email-notification-specialist
│ (with credentials)   │
└──────────┬───────────┘
           │
           ▼
   [Enrollment Complete]
```

### Bulk Import Flow
```
[Admin Uploads CSV]
         │
         ▼
┌──────────────────────┐
│ File Validation      │ ─── bulk-import-processor
│ • Parse file         │
│ • Validate format    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Batch Processing     │ ─── bulk-import-processor
│ ┌──────────────────┐ │
│ │ For each member: │ │
│ │ 1. Validate      │ │
│ │ 2. Check dupes   │ │
│ │ 3. Create KC     │ │
│ │ 4. Create member │ │
│ │ 5. Send email    │ │
│ └──────────────────┘ │
│ (parallel batches)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Generate Report      │ ─── bulk-import-processor
│ • Success count      │
│ • Failure details    │
│ • Send to admin      │
└──────────┬───────────┘
           │
           ▼
   [Bulk Import Complete]
```

## Prerequisites

### For All Paths:
- Tenant account active and verified
- Keycloak realm configured for tenant
- Email service operational
- Member quota not exceeded

### For Self-Registration:
- Self-registration enabled for tenant
- Registration form configured
- Email verification service available
- CAPTCHA configured (optional)

### For Admin Invitation:
- Admin has permission to invite members
- Invitation email template configured
- Invitation expiry policy set

### For Bulk Import:
- Admin has bulk import permission
- CSV/Excel template provided
- File size within limits
- Bulk processing service available

## Post-Workflow Actions

1. **Member Activation Tracking**
   - Monitor email verification completion
   - Track first login timestamp
   - Measure time-to-activation

2. **Onboarding Sequence**
   - Trigger onboarding email series
   - Create onboarding tasks for member
   - Assign onboarding buddy (optional)

3. **Integration Updates**
   - Update CRM with new member
   - Sync to analytics platform
   - Add to communication lists
   - Update team directories

4. **Compliance**
   - Log enrollment in audit trail
   - Record consent timestamps
   - Store data processing agreements
   - Update member count for billing

## Rollback Procedure

### Single Member Rollback
```
1. Soft-delete member record (mark as deleted)
2. Disable Keycloak user (don't delete for audit)
3. Revoke all permissions and access
4. Send cancellation notification (optional)
5. Log rollback reason and timestamp
6. Update member count for tenant
```

### Bulk Import Rollback
```
1. Identify members from specific import batch
2. For each member:
   - Soft-delete member record
   - Disable Keycloak user
   - Revoke permissions
3. Generate rollback report
4. Notify admin of rollback completion
5. Log bulk rollback in audit trail
```

### Partial Rollback (Stage-Specific)
- **After Stage 1-2:** No rollback needed, no records created
- **After Stage 3:** Disable Keycloak user only
- **After Stage 4:** Disable both Keycloak and member record
- **After Stage 5:** Member enrolled, send correction if needed

## Error Handling

### Common Errors and Resolution

| Error | Stage | Resolution |
|-------|-------|------------|
| Invalid email format | 1 | Return validation error, request correction |
| Duplicate email | 2 | Offer login or reactivation |
| Keycloak unavailable | 3 | Queue for retry, send pending notification |
| Email delivery failed | 5 | Queue for retry, create in-app notification |
| Quota exceeded | 0 | Block enrollment, notify admin to upgrade |
| Invalid role | 1 | Default to basic member role |
| File parse error | 6 | Return detailed error, provide template |

## Success Criteria

### Single Member Enrollment
- [ ] Email validated and unique within tenant
- [ ] Keycloak user created with correct realm
- [ ] Member record created in database
- [ ] Proper roles and permissions assigned
- [ ] Welcome/verification email delivered
- [ ] Member status set correctly (active/pending)
- [ ] Audit log entry created
- [ ] Member appears in tenant member list
- [ ] Login credentials work (if applicable)

### Bulk Import
- [ ] File parsed without errors
- [ ] At least 80% success rate (configurable)
- [ ] Detailed report generated
- [ ] Failed rows clearly identified with reasons
- [ ] Admin notified of completion
- [ ] All successful members can login
- [ ] Duplicate handling worked correctly

## Metrics and Monitoring

**Key Metrics:**
- Enrollment completion rate by path
- Average enrollment time
- Email verification rate (within 24/48 hours)
- Bulk import success rate
- Duplicate detection accuracy
- First login time after enrollment

**Alerts:**
- Enrollment failure rate >10%
- Keycloak creation failures
- Email delivery failure rate >5%
- Bulk import taking >2 hours
- Quota approaching limit (90%)

## Validation Rules

### Email Validation:
- Valid email format (RFC 5322)
- Not in blocklist
- Domain validation (optional)
- Disposable email detection (optional)

### Password Requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character
- Not in common password list

### Role Validation:
- Role exists in tenant configuration
- Admin has permission to assign role
- Role not restricted for tenant tier

## Testing Checklist

Before running in production:
- [ ] Test self-registration with valid data
- [ ] Test with invalid email formats
- [ ] Test duplicate email handling
- [ ] Test admin invitation flow
- [ ] Test invitation expiry
- [ ] Test bulk import with valid CSV
- [ ] Test bulk import with errors
- [ ] Test quota limit enforcement
- [ ] Verify email delivery for all paths
- [ ] Test Keycloak user creation
- [ ] Verify member can login after enrollment
- [ ] Test rollback procedures
- [ ] Test concurrent enrollments
- [ ] Verify audit trail completeness
