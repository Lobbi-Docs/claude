---
description: Bulk member import from CSV/Excel with validation, batch processing, and error handling
---

# Bulk Member Import

Import multiple members from CSV or Excel files into a Lobbi organization with comprehensive validation, duplicate detection, batch processing, and detailed error reporting.

## Usage

```bash
/member-import <file-path> --org=<org-id> [options]
```

## Description

This command imports member data in bulk by:
- Parsing CSV or Excel files with flexible column mapping
- Validating all member data against schema rules
- Detecting and handling duplicates
- Creating Keycloak users with proper authentication
- Inserting member records into MongoDB
- Processing in configurable batches for performance
- Generating comprehensive import reports
- Sending welcome emails to new members

## Prerequisites

**Required Services:**
- Keycloak running and accessible
- MongoDB connection available
- Redis for job queue (optional, for async processing)
- SMTP configured for welcome emails

**Environment Variables:**
```bash
DATABASE_URL=mongodb://admin:admin@localhost:27017/member_db?authSource=admin
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=alpha-members
KEYCLOAK_CLIENT_ID=member-api
KEYCLOAK_CLIENT_SECRET=<secret>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<api-key>
REDIS_URL=redis://localhost:6379
```

**File Format Requirements:**

CSV/Excel files must include these columns (case-insensitive):
- **Required:** email, firstName, lastName
- **Optional:** phone, dateOfBirth, membershipType, status, joinDate, address, city, state, zipCode, country

**Example CSV:**
```csv
email,firstName,lastName,phone,membershipType,status
john.doe@example.com,John,Doe,555-1234,premium,active
jane.smith@example.com,Jane,Smith,555-5678,basic,active
```

## Step-by-Step Instructions

### 1. Validate Input File

```bash
# Check file exists
test -f <file-path> || { echo "ERROR: File not found"; exit 1; }

# Detect file type
FILE_EXT="${FILE_PATH##*.}"
case "$FILE_EXT" in
  csv) echo "CSV file detected" ;;
  xlsx|xls) echo "Excel file detected" ;;
  *) echo "ERROR: Unsupported file type. Use CSV or Excel"; exit 1 ;;
esac

# Preview first 5 rows
if [ "$FILE_EXT" = "csv" ]; then
  head -6 <file-path> | column -t -s,
else
  # Use xlsx2csv or similar for Excel
  python3 << 'EOF'
import pandas as pd
df = pd.read_excel("<file-path>", nrows=5)
print(df.to_string())
EOF
fi

# Count total rows
if [ "$FILE_EXT" = "csv" ]; then
  TOTAL_ROWS=$(($(wc -l < <file-path>) - 1))
else
  TOTAL_ROWS=$(python3 -c "import pandas as pd; print(len(pd.read_excel('<file-path>')))")
fi

echo "Total members to import: $TOTAL_ROWS"
```

### 2. Parse and Validate Data

```bash
# Run Python validation script
python3 << 'EOF'
import pandas as pd
import json
from datetime import datetime
import re

# Load file
file_path = "<file-path>"
if file_path.endswith('.csv'):
    df = pd.read_csv(file_path)
else:
    df = pd.read_excel(file_path)

# Normalize column names (lowercase, remove spaces)
df.columns = df.columns.str.lower().str.replace(' ', '_')

# Validation results
validation_errors = []
warnings = []

# Required columns check
required_cols = ['email', 'firstname', 'lastname']
missing_cols = [col for col in required_cols if col not in df.columns]
if missing_cols:
    print(f"ERROR: Missing required columns: {missing_cols}")
    exit(1)

# Email validation regex
email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# Validate each row
for idx, row in df.iterrows():
    row_num = idx + 2  # +2 for header and 0-indexing
    errors = []

    # Email validation
    if pd.isna(row['email']) or not email_regex.match(str(row['email'])):
        errors.append(f"Row {row_num}: Invalid email '{row.get('email')}'")

    # Name validation
    if pd.isna(row['firstname']) or len(str(row['firstname']).strip()) == 0:
        errors.append(f"Row {row_num}: First name is required")

    if pd.isna(row['lastname']) or len(str(row['lastname']).strip()) == 0:
        errors.append(f"Row {row_num}: Last name is required")

    # Phone validation (if provided)
    if 'phone' in df.columns and not pd.isna(row['phone']):
        phone = str(row['phone']).strip()
        if not re.match(r'^[\d\s\-\(\)\+]+$', phone):
            warnings.append(f"Row {row_num}: Phone format may be invalid '{phone}'")

    # Date of birth validation (if provided)
    if 'dateofbirth' in df.columns and not pd.isna(row['dateofbirth']):
        try:
            dob = pd.to_datetime(row['dateofbirth'])
            if dob > datetime.now():
                errors.append(f"Row {row_num}: Date of birth cannot be in future")
        except:
            errors.append(f"Row {row_num}: Invalid date format '{row['dateofbirth']}'")

    # Membership type validation (if provided)
    if 'membershiptype' in df.columns and not pd.isna(row['membershiptype']):
        valid_types = ['basic', 'premium', 'enterprise', 'trial']
        if str(row['membershiptype']).lower() not in valid_types:
            warnings.append(f"Row {row_num}: Unknown membership type '{row['membershiptype']}'")

    validation_errors.extend(errors)

# Check for duplicate emails in file
duplicate_emails = df[df.duplicated(subset=['email'], keep=False)]['email'].tolist()
if duplicate_emails:
    for email in set(duplicate_emails):
        validation_errors.append(f"Duplicate email in file: {email}")

# Print results
print(f"\n{'='*60}")
print(f"VALIDATION REPORT")
print(f"{'='*60}")
print(f"Total rows: {len(df)}")
print(f"Errors: {len(validation_errors)}")
print(f"Warnings: {len(warnings)}")

if validation_errors:
    print(f"\n{'ERRORS:':-^60}")
    for error in validation_errors[:20]:  # Show first 20
        print(f"  ❌ {error}")
    if len(validation_errors) > 20:
        print(f"  ... and {len(validation_errors) - 20} more errors")

if warnings:
    print(f"\n{'WARNINGS:':-^60}")
    for warning in warnings[:10]:  # Show first 10
        print(f"  ⚠️  {warning}")
    if len(warnings) > 10:
        print(f"  ... and {len(warnings) - 10} more warnings")

if validation_errors:
    print(f"\n❌ Validation failed. Please fix errors and try again.")
    exit(1)
else:
    print(f"\n✅ Validation passed! Ready to import {len(df)} members.")

    # Save validated data to temp file
    df.to_json('/tmp/validated_members.json', orient='records', date_format='iso')
    print(f"\nValidated data saved to: /tmp/validated_members.json")
EOF

# Exit if validation failed
if [ $? -ne 0 ]; then
    echo "Import aborted due to validation errors"
    exit 1
fi
```

### 3. Check for Existing Members

```bash
# Query existing members by email
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" << 'EOF'
use member_db;

// Load emails from validated file
const validatedData = require('/tmp/validated_members.json');
const emails = validatedData.map(m => m.email.toLowerCase());

// Find existing members
const existing = db.users.find({
  organizationId: "<org-id>",
  email: { $in: emails }
}, {
  email: 1,
  status: 1
}).toArray();

if (existing.length > 0) {
  print("\n" + "=".repeat(60));
  print("EXISTING MEMBERS DETECTED");
  print("=".repeat(60));
  print(`Found ${existing.length} existing members:\n`);

  existing.forEach(member => {
    print(`  📧 ${member.email} (${member.status})`);
  });

  print("\nOptions:");
  print("  1. Skip existing members (import only new)");
  print("  2. Update existing members (merge data)");
  print("  3. Abort import");

  // Save existing emails for conflict resolution
  const existingEmails = existing.map(m => m.email);
  fs.writeFileSync('/tmp/existing_members.json', JSON.stringify(existingEmails));
}

EOF
```

### 4. Process Import in Batches

```bash
# Import script with batch processing
python3 << 'EOF'
import json
import requests
from requests.auth import HTTPBasicAuth
from pymongo import MongoClient
from datetime import datetime
import time
import os

# Configuration
ORG_ID = "<org-id>"
BATCH_SIZE = 50
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "alpha-members")
DB_URL = os.getenv("DATABASE_URL", "mongodb://admin:admin@localhost:27017/member_db?authSource=admin")

# Load validated members
with open('/tmp/validated_members.json', 'r') as f:
    members = json.load(f)

# Load existing members (if any)
try:
    with open('/tmp/existing_members.json', 'r') as f:
        existing_emails = set(json.load(f))
    # Filter out existing (option 1: skip)
    members = [m for m in members if m['email'].lower() not in existing_emails]
    print(f"Skipping {len(existing_emails)} existing members")
except:
    existing_emails = set()

print(f"Importing {len(members)} new members in batches of {BATCH_SIZE}")

# Connect to MongoDB
client = MongoClient(DB_URL)
db = client.member_db

# Get Keycloak admin token
def get_admin_token():
    response = requests.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": os.getenv("KEYCLOAK_ADMIN", "admin"),
            "password": os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")
        }
    )
    return response.json()['access_token']

admin_token = get_admin_token()
headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

# Import statistics
stats = {
    "total": len(members),
    "success": 0,
    "failed": 0,
    "errors": []
}

# Process in batches
for batch_num, i in enumerate(range(0, len(members), BATCH_SIZE), 1):
    batch = members[i:i+BATCH_SIZE]
    print(f"\n{'='*60}")
    print(f"Processing batch {batch_num} ({len(batch)} members)")
    print(f"{'='*60}")

    for member in batch:
        email = member['email']
        print(f"  Importing: {email}...", end=" ")

        try:
            # 1. Create Keycloak user
            keycloak_user = {
                "username": email,
                "email": email,
                "firstName": member['firstname'],
                "lastName": member['lastname'],
                "enabled": True,
                "emailVerified": False,
                "credentials": [{
                    "type": "password",
                    "value": "TempPassword123!",  # Force password reset
                    "temporary": True
                }],
                "requiredActions": ["UPDATE_PASSWORD"],
                "attributes": {
                    "organizationId": [ORG_ID]
                }
            }

            kc_response = requests.post(
                f"{KEYCLOAK_URL}/admin/realms/{KEYCLOAK_REALM}/users",
                json=keycloak_user,
                headers=headers
            )

            if kc_response.status_code == 201:
                # Get user ID from Location header
                user_location = kc_response.headers.get('Location')
                keycloak_id = user_location.split('/')[-1]

                # 2. Create MongoDB member record
                member_doc = {
                    "keycloakId": keycloak_id,
                    "organizationId": ORG_ID,
                    "email": email.lower(),
                    "profile": {
                        "firstName": member['firstname'],
                        "lastName": member['lastname'],
                        "phone": member.get('phone'),
                        "dateOfBirth": member.get('dateofbirth'),
                        "address": {
                            "street": member.get('address'),
                            "city": member.get('city'),
                            "state": member.get('state'),
                            "zipCode": member.get('zipcode'),
                            "country": member.get('country', 'USA')
                        }
                    },
                    "membership": {
                        "type": member.get('membershiptype', 'basic'),
                        "status": member.get('status', 'active'),
                        "joinDate": member.get('joindate', datetime.utcnow().isoformat())
                    },
                    "role": "member",
                    "status": "active",
                    "metadata": {
                        "createdAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow(),
                        "importedAt": datetime.utcnow(),
                        "importSource": "bulk_import"
                    }
                }

                db.users.insert_one(member_doc)

                stats["success"] += 1
                print("✅")

            else:
                error_msg = kc_response.json().get('errorMessage', 'Unknown error')
                stats["failed"] += 1
                stats["errors"].append(f"{email}: {error_msg}")
                print(f"❌ ({error_msg})")

        except Exception as e:
            stats["failed"] += 1
            stats["errors"].append(f"{email}: {str(e)}")
            print(f"❌ ({str(e)})")

        # Small delay to avoid rate limiting
        time.sleep(0.1)

    print(f"\nBatch {batch_num} complete. Progress: {stats['success']}/{stats['total']}")

    # Refresh token every 5 batches
    if batch_num % 5 == 0:
        admin_token = get_admin_token()
        headers["Authorization"] = f"Bearer {admin_token}"

# Final report
print(f"\n{'='*60}")
print(f"IMPORT COMPLETE")
print(f"{'='*60}")
print(f"Total members: {stats['total']}")
print(f"Successfully imported: {stats['success']}")
print(f"Failed: {stats['failed']}")

if stats['errors']:
    print(f"\n{'ERRORS:':-^60}")
    for error in stats['errors'][:20]:
        print(f"  ❌ {error}")
    if len(stats['errors']) > 20:
        print(f"  ... and {len(stats['errors']) - 20} more errors")

# Save detailed report
report = {
    "timestamp": datetime.utcnow().isoformat(),
    "organizationId": ORG_ID,
    "statistics": stats,
    "importFile": "<file-path>"
}

with open('/tmp/import_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f"\nDetailed report saved to: /tmp/import_report.json")

EOF
```

### 5. Send Welcome Emails

```bash
# Send welcome emails to newly imported members
python3 << 'EOF'
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Load import report
with open('/tmp/import_report.json', 'r') as f:
    report = json.load(f)

if report['statistics']['success'] == 0:
    print("No members imported, skipping emails")
    exit(0)

# SMTP configuration
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Connect to SMTP
smtp = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
smtp.starttls()
smtp.login(SMTP_USER, SMTP_PASSWORD)

# Get successfully imported members
with open('/tmp/validated_members.json', 'r') as f:
    members = json.load(f)

sent_count = 0

for member in members:
    email = member['email']

    # Create email
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "Welcome to Lobbi!"
    msg['From'] = "noreply@lobbi.app"
    msg['To'] = email

    text = f"""
Hello {member['firstname']},

Welcome to Lobbi! Your account has been created.

Your username is: {email}
Temporary password: TempPassword123!

Please log in and change your password at:
https://members.lobbi.app/login

If you have any questions, please contact our support team.

Best regards,
The Lobbi Team
    """

    html = f"""
    <html>
      <body>
        <h2>Welcome to Lobbi!</h2>
        <p>Hello {member['firstname']},</p>
        <p>Your account has been created.</p>
        <ul>
          <li><strong>Username:</strong> {email}</li>
          <li><strong>Temporary password:</strong> TempPassword123!</li>
        </ul>
        <p><a href="https://members.lobbi.app/login">Click here to log in</a></p>
        <p>Please change your password after your first login.</p>
      </body>
    </html>
    """

    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    try:
        smtp.send_message(msg)
        sent_count += 1
        print(f"✉️  Welcome email sent to {email}")
    except Exception as e:
        print(f"❌ Failed to send email to {email}: {str(e)}")

smtp.quit()
print(f"\nWelcome emails sent: {sent_count}/{report['statistics']['success']}")

EOF
```

### 6. Update Organization Statistics

```bash
# Update member count in organization record
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" << 'EOF'
use member_db;

const report = require('/tmp/import_report.json');
const orgId = report.organizationId;
const importedCount = report.statistics.success;

// Update organization member count
db.organizations.updateOne(
  { _id: orgId },
  {
    $inc: { "statistics.totalMembers": importedCount },
    $set: {
      "metadata.lastMemberImport": new Date(),
      "metadata.updatedAt": new Date()
    }
  }
);

print(`Organization statistics updated: +${importedCount} members`);

EOF
```

## Example Usage

### Basic CSV Import
```bash
/member-import /path/to/members.csv --org=550e8400-e29b-41d4-a716-446655440000
```

### Excel Import with Options
```bash
/member-import /path/to/members.xlsx \
  --org=550e8400-e29b-41d4-a716-446655440000 \
  --batch-size=100 \
  --skip-existing \
  --send-emails
```

### Import with Custom Field Mapping
```bash
/member-import /path/to/members.csv \
  --org=550e8400-e29b-41d4-a716-446655440000 \
  --map="Email Address:email,First:firstName,Last:lastName"
```

### Dry Run (Validation Only)
```bash
/member-import /path/to/members.csv \
  --org=550e8400-e29b-41d4-a716-446655440000 \
  --dry-run
```

## Error Handling

### Common Issues

**1. Invalid Email Addresses**
```bash
# Error: Invalid email format
# Solution: Fix emails in source file or use cleanup script
python3 -c "import pandas as pd; df = pd.read_csv('members.csv'); df['email'] = df['email'].str.strip().str.lower(); df.to_csv('members_clean.csv', index=False)"
```

**2. Duplicate Emails**
```bash
# Find duplicates in CSV
awk -F',' 'NR>1 {print $1}' members.csv | sort | uniq -d

# Remove duplicates (keep first occurrence)
awk -F',' '!seen[$1]++' members.csv > members_dedup.csv
```

**3. Keycloak User Already Exists**
```bash
# Query existing user
curl "http://localhost:8080/admin/realms/alpha-members/users?email=user@example.com" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Delete if needed (careful!)
curl -X DELETE "http://localhost:8080/admin/realms/alpha-members/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**4. SMTP Connection Failed**
```bash
# Test SMTP connection
python3 << 'EOF'
import smtplib
smtp = smtplib.SMTP(os.getenv("SMTP_HOST"), 587)
smtp.starttls()
smtp.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
print("✅ SMTP connection successful")
smtp.quit()
EOF
```

### Rollback Failed Import

```bash
# Get import report
IMPORT_TIMESTAMP=$(jq -r '.timestamp' /tmp/import_report.json)

# Delete imported members from MongoDB
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" << EOF
use member_db;

db.users.deleteMany({
  organizationId: "<org-id>",
  "metadata.importedAt": { \$gte: new Date("$IMPORT_TIMESTAMP") }
});

print("Imported members deleted");
EOF

# Note: Keycloak users must be deleted manually or via API
```

## Performance Tips

1. **Batch Size:** Adjust based on system resources (50-200 recommended)
2. **Parallel Processing:** Use Redis queue for async processing on large imports (10k+ members)
3. **Disable Emails:** Skip welcome emails during initial testing
4. **Index Optimization:** Ensure MongoDB indexes on email and organizationId

## Post-Import Tasks

1. **Verify Import**
   ```bash
   mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" \
     --eval "db.users.countDocuments({organizationId: '<org-id>'})"
   ```

2. **Assign to Groups**
   - Bulk assign members to default groups
   - Apply custom group rules

3. **Send Onboarding**
   - Trigger onboarding workflow
   - Send welcome kit materials

4. **Monitor Activity**
   - Track first logins
   - Monitor for auth failures

## Agent Assignment

This command activates the **member-import-orchestrator** agent, coordinating:
- Data validation agent
- Keycloak user management agent
- MongoDB operations agent
- Email delivery agent

## Supported File Formats

- CSV (.csv) - UTF-8 encoding
- Excel (.xlsx, .xls) - All sheets
- TSV (.tsv) - Tab-separated values
