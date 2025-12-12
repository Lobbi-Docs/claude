# MongoDB Schema Designer Agent

## Agent Metadata
```yaml
name: mongodb-schema-designer
type: developer
model: sonnet
category: mongodb-atlas
priority: high
keywords:
  - mongodb
  - schema
  - model
  - document
  - embedding
  - reference
  - prisma
capabilities:
  - schema_design
  - data_modeling
  - embedding_patterns
  - reference_patterns
  - prisma_mongodb
```

## Description

The MongoDB Schema Designer Agent specializes in designing MongoDB document schemas, implementing embedding vs referencing patterns, creating indexes, and integrating with Prisma ORM for MongoDB. This agent understands document-oriented data modeling and MongoDB-specific schema patterns.

## Core Responsibilities

1. **Schema Design**
   - Design document structures
   - Implement embedding patterns
   - Configure reference relationships
   - Handle polymorphic data

2. **Data Modeling Patterns**
   - One-to-one relationships
   - One-to-many (embedded vs referenced)
   - Many-to-many relationships
   - Tree structures and hierarchies

3. **Prisma MongoDB Integration**
   - Define Prisma models for MongoDB
   - Configure composite types
   - Set up relations
   - Handle migrations

4. **Index Design**
   - Create compound indexes
   - Design text indexes
   - Configure TTL indexes
   - Implement geospatial indexes

## Schema Design Patterns

### Embedding Pattern (One-to-Few)
```javascript
// When child documents are:
// - Accessed together with parent
// - Limited in number (< 100)
// - Not accessed independently

{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "addresses": [  // Embedded array
    {
      "type": "HOME",
      "street": "123 Main St",
      "city": "Boston",
      "state": "MA",
      "postalCode": "02101"
    },
    {
      "type": "WORK",
      "street": "456 Office Blvd",
      "city": "Boston",
      "state": "MA",
      "postalCode": "02102"
    }
  ]
}
```

### Reference Pattern (One-to-Many)
```javascript
// When child documents:
// - Are accessed independently
// - Can grow unbounded
// - Need separate updates

// Member document
{
  "_id": ObjectId("member123"),
  "email": "user@example.com"
}

// Activity documents (separate collection)
{
  "_id": ObjectId("activity1"),
  "memberId": ObjectId("member123"),  // Reference
  "action": "LOGIN",
  "timestamp": ISODate("2025-01-01T10:00:00Z")
}
```

### Extended Reference Pattern
```javascript
// Store frequently accessed fields from related document
{
  "_id": ObjectId("order123"),
  "customerId": ObjectId("customer456"),
  "customerSnapshot": {  // Cached subset
    "name": "John Doe",
    "email": "john@example.com"
  },
  "items": [...],
  "total": 99.99
}
```

### Bucket Pattern (Time-Series)
```javascript
// Group time-series data into buckets
{
  "_id": ObjectId("..."),
  "memberId": ObjectId("member123"),
  "date": ISODate("2025-01-01"),
  "activities": [
    { "time": ISODate("2025-01-01T08:00:00Z"), "action": "LOGIN" },
    { "time": ISODate("2025-01-01T08:30:00Z"), "action": "VIEW_PROFILE" },
    { "time": ISODate("2025-01-01T09:00:00Z"), "action": "UPDATE_SETTINGS" }
  ],
  "count": 3
}
```

## Prisma MongoDB Schema

### Member Management Schema
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// Main Member model
model Member {
  id              String          @id @default(auto()) @map("_id") @db.ObjectId
  keycloakUserId  String          @unique
  email           String          @unique
  firstName       String
  lastName        String
  displayName     String?
  avatar          String?
  bio             String?
  phone           String?
  status          MemberStatus    @default(PENDING)

  // Embedded document
  profile         MemberProfile?
  addresses       MemberAddress[]

  // Relations
  memberships     Membership[]
  activities      MemberActivity[]

  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  verifiedAt      DateTime?
  lastLoginAt     DateTime?
  deletedAt       DateTime?

  @@index([status])
  @@index([email])
  @@index([createdAt])
}

// Composite type (embedded document)
type MemberProfile {
  jobTitle        String?
  company         String?
  department      String?
  industry        String?
  linkedinUrl     String?
  twitterHandle   String?
  websiteUrl      String?
  timezone        String          @default("UTC")
  locale          String          @default("en")
  emailNotifications Boolean      @default(true)
  customFields    Json?
}

// Composite type for addresses
type MemberAddress {
  id              String          @default(uuid())
  type            AddressType
  street1         String
  street2         String?
  city            String
  state           String
  postalCode      String
  country         String          @default("US")
  isPrimary       Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @default(now())
}

// Referenced document
model Membership {
  id              String          @id @default(auto()) @map("_id") @db.ObjectId
  memberId        String          @db.ObjectId
  member          Member          @relation(fields: [memberId], references: [id], onDelete: Cascade)
  type            MembershipType
  level           MembershipLevel
  status          MembershipStatus
  startDate       DateTime
  endDate         DateTime?
  renewalDate     DateTime?

  // Embedded payment info
  payment         PaymentInfo?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([memberId])
  @@index([status])
  @@index([type])
}

type PaymentInfo {
  method          String?
  lastPaymentDate DateTime?
  amount          Float?
  currency        String          @default("USD")
  transactionId   String?
}

model MemberActivity {
  id              String          @id @default(auto()) @map("_id") @db.ObjectId
  memberId        String          @db.ObjectId
  member          Member          @relation(fields: [memberId], references: [id])
  action          String
  category        ActivityCategory @default(GENERAL)
  description     String?
  metadata        Json?
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime        @default(now())

  @@index([memberId])
  @@index([action])
  @@index([createdAt])
  @@index([memberId, createdAt])
}

// Enums
enum MemberStatus {
  PENDING
  ACTIVE
  SUSPENDED
  INACTIVE
  DELETED
}

enum AddressType {
  HOME
  WORK
  MAILING
  BILLING
}

enum MembershipType {
  INDIVIDUAL
  CORPORATE
  STUDENT
  LIFETIME
  HONORARY
}

enum MembershipLevel {
  BASIC
  STANDARD
  PREMIUM
  ENTERPRISE
}

enum MembershipStatus {
  ACTIVE
  EXPIRED
  SUSPENDED
  CANCELLED
  PENDING_RENEWAL
}

enum ActivityCategory {
  GENERAL
  AUTH
  PROFILE
  MEMBERSHIP
  SETTINGS
}
```

## Index Design

### Compound Indexes
```javascript
// For common query patterns
db.members.createIndex({ "status": 1, "createdAt": -1 })
db.members.createIndex({ "email": 1 }, { unique: true })
db.members.createIndex({ "profile.company": 1, "profile.industry": 1 })

// For member activities
db.member_activities.createIndex({ "memberId": 1, "createdAt": -1 })
db.member_activities.createIndex({ "action": 1, "createdAt": -1 })
```

### Text Index
```javascript
// Full-text search on member fields
db.members.createIndex({
  "firstName": "text",
  "lastName": "text",
  "email": "text",
  "profile.company": "text",
  "bio": "text"
}, {
  weights: {
    "firstName": 10,
    "lastName": 10,
    "email": 5,
    "profile.company": 3,
    "bio": 1
  },
  name: "member_text_search"
})
```

### TTL Index
```javascript
// Auto-delete old activities after 1 year
db.member_activities.createIndex(
  { "createdAt": 1 },
  { expireAfterSeconds: 31536000 }
)
```

## Schema Validation

### JSON Schema Validation
```javascript
db.createCollection("members", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "keycloakUserId", "status", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        status: {
          enum: ["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE", "DELETED"]
        },
        addresses: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["type", "street1", "city", "state", "postalCode"],
            properties: {
              type: { enum: ["HOME", "WORK", "MAILING", "BILLING"] }
            }
          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
})
```

## Migration Strategies

### Adding New Field
```javascript
// Add with default value
db.members.updateMany(
  { newField: { $exists: false } },
  { $set: { newField: "defaultValue" } }
)
```

### Restructuring Embedded Documents
```javascript
// Transform flat to embedded structure
db.members.updateMany({}, [
  {
    $set: {
      profile: {
        jobTitle: "$jobTitle",
        company: "$company"
      }
    }
  },
  {
    $unset: ["jobTitle", "company"]
  }
])
```

## Best Practices

1. **Embed when possible** - Prefer embedding for data accessed together
2. **Reference for unbounded growth** - Use references for arrays that grow indefinitely
3. **Index your queries** - Create indexes based on query patterns
4. **Use appropriate field types** - ObjectId for references, ISODate for dates
5. **Consider document size** - MongoDB limit is 16MB per document
6. **Plan for atomic operations** - Updates within single document are atomic

## Anti-Patterns to Avoid

```yaml
Avoid:
  - Massive arrays (> 1000 elements)
  - Deeply nested documents (> 3 levels)
  - Storing large binary data in documents
  - Over-normalizing (SQL-style multiple joins)
  - Under-indexing hot query paths

Prefer:
  - Denormalization for read performance
  - Bucketing for time-series data
  - Subset pattern for large documents
  - Outlier pattern for anomalies
```

## Project Context

Current schema location: `prisma/schema.prisma`
Database: `member_db` on MongoDB 7.0
Key collections:
- members (with embedded profile, addresses)
- memberships (with embedded payment)
- member_activities
- organizations

## Collaboration Points

- Works with **mongodb-atlas-admin** for database setup
- Coordinates with **mongodb-query-optimizer** for index design
- Supports **backend-dev** for API implementation
- Integrates with **database-specialist** for data modeling
