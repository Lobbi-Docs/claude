# Member Management

Member management system skill for Lobbi. Activates when working with member CRUD operations, enrollment flows, membership tiers, or member directory features.

**Triggers:** member, membership, enrollment, directory, member-profile, member-status, tier, dues, roster

**Use this skill when:**
- Implementing member CRUD operations
- Building enrollment and onboarding flows
- Managing membership tiers and dues
- Creating member directory/search features
- Handling member status transitions
- Implementing member import/export

## Allowed Tools

- prisma (database operations)
- express (REST API)
- typescript (type safety)
- jest (testing)
- csv-parser (member import)

## Instructions

### Core Principles

1. **Member Lifecycle**
   - PENDING → ACTIVE → INACTIVE → ARCHIVED
   - Enrollment creates PENDING members
   - Payment confirmation activates members
   - Graceful deactivation (don't delete)
   - Audit trail for all status changes

2. **Multi-Tenant Isolation**
   - All member data scoped to organization
   - Use tenant context in all queries
   - Composite unique constraints [org_id, email]
   - Never expose cross-tenant data

3. **Data Validation**
   - Validate email format and uniqueness
   - Phone number formatting
   - Required vs optional fields
   - Custom field validation per tier

4. **Search & Filtering**
   - Full-text search on name, email
   - Filter by status, tier, join date
   - Pagination for large datasets
   - Export filtered results

### Domain Model

```
Organization
  ├── Members (individuals)
  ├── MembershipTiers (pricing plans)
  └── Memberships (member-tier relationships)

Member
  ├── Profile (name, email, phone, address)
  ├── Status (PENDING, ACTIVE, INACTIVE, ARCHIVED)
  └── Memberships[] (can have multiple tiers)

Membership
  ├── Member reference
  ├── Tier reference
  ├── Status (PENDING, ACTIVE, EXPIRED, CANCELED)
  ├── Billing info (start, end, renewal)
  └── Payment history
```

### Implementation Checklist

- [ ] Define member Prisma schema
- [ ] Implement member repository with tenant filtering
- [ ] Create member service with business logic
- [ ] Build member REST API endpoints
- [ ] Add member search and filtering
- [ ] Implement enrollment flow
- [ ] Handle status transitions
- [ ] Add member import/export
- [ ] Write comprehensive tests

## Code Examples

### 1. Member Prisma Schema

```prisma
// backend/prisma/schema.prisma

enum MemberStatus {
  PENDING
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum MembershipStatus {
  PENDING
  ACTIVE
  EXPIRED
  CANCELED
}

model Member {
  id             String       @id @default(cuid())
  organizationId String       @map("organization_id")
  email          String
  firstName      String       @map("first_name")
  lastName       String       @map("last_name")
  phoneNumber    String?      @map("phone_number")
  dateOfBirth    DateTime?    @map("date_of_birth")
  address        String?
  city           String?
  state          String?
  postalCode     String?      @map("postal_code")
  country        String?      @default("US")

  status         MemberStatus @default(PENDING)
  joinedAt       DateTime?    @map("joined_at")
  externalId     String?      @map("external_id") // For imports
  notes          String?      @db.Text

  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  memberships    Membership[]
  statusHistory  MemberStatusHistory[]

  @@unique([organizationId, email])
  @@index([organizationId, status])
  @@index([organizationId, email])
  @@index([organizationId, lastName, firstName])
  @@map("members")
}

model MembershipTier {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  name           String
  description    String?  @db.Text
  price          Decimal  @db.Decimal(10, 2)
  billingPeriod  String   @map("billing_period") // MONTHLY, ANNUAL
  stripePriceId  String?  @map("stripe_price_id")
  features       Json?    // JSON array of features
  isActive       Boolean  @default(true) @map("is_active")
  displayOrder   Int      @default(0) @map("display_order")

  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  memberships    Membership[]

  @@unique([organizationId, name])
  @@index([organizationId, isActive])
  @@map("membership_tiers")
}

model Membership {
  id             String           @id @default(cuid())
  organizationId String           @map("organization_id")
  memberId       String           @map("member_id")
  tierId         String           @map("tier_id")

  status         MembershipStatus @default(PENDING)
  startDate      DateTime         @map("start_date")
  endDate        DateTime?        @map("end_date")
  renewalDate    DateTime?        @map("renewal_date")
  autoRenew      Boolean          @default(true) @map("auto_renew")

  // Stripe integration
  stripeSubscriptionId String?    @map("stripe_subscription_id")

  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member         Member           @relation(fields: [memberId], references: [id], onDelete: Cascade)
  tier           MembershipTier   @relation(fields: [tierId], references: [id])
  payments       Payment[]

  @@unique([organizationId, memberId, tierId])
  @@index([organizationId, status])
  @@index([organizationId, memberId])
  @@index([stripeSubscriptionId])
  @@map("memberships")
}

model MemberStatusHistory {
  id             String       @id @default(cuid())
  memberId       String       @map("member_id")
  fromStatus     MemberStatus @map("from_status")
  toStatus       MemberStatus @map("to_status")
  reason         String?      @db.Text
  changedBy      String?      @map("changed_by") // User ID
  changedAt      DateTime     @default(now()) @map("changed_at")

  member         Member       @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([memberId, changedAt])
  @@map("member_status_history")
}
```

### 2. Member Repository

```typescript
// backend/src/repositories/member.repository.ts

import { PrismaClient, Member, MemberStatus, Prisma } from '@prisma/client';
import { BaseTenantRepository } from './base-tenant.repository';
import { TenantContext } from '../types/tenant.types';

export interface CreateMemberDto {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  status?: MemberStatus;
  externalId?: string;
  notes?: string;
}

export interface UpdateMemberDto extends Partial<CreateMemberDto> {}

export interface MemberSearchFilters {
  status?: MemberStatus;
  search?: string; // Search in name, email
  tierIds?: string[];
  joinedAfter?: Date;
  joinedBefore?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MemberRepository extends BaseTenantRepository<Member> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findById(id: string, tenant: TenantContext): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
      },
      include: {
        memberships: {
          include: {
            tier: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string, tenant: TenantContext): Promise<Member | null> {
    return this.prisma.member.findUnique({
      where: {
        organizationId_email: {
          organizationId: tenant.organizationId,
          email,
        },
      },
    });
  }

  async findByExternalId(
    externalId: string,
    tenant: TenantContext
  ): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: {
        organizationId: tenant.organizationId,
        externalId,
      },
    });
  }

  async findAll(
    tenant: TenantContext,
    filters?: MemberSearchFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Member>> {
    const where = this.buildWhereClause(tenant, filters);

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: {
          memberships: {
            include: {
              tier: true,
            },
          },
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        skip: pagination ? (pagination.page - 1) * pagination.limit : 0,
        take: pagination?.limit,
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || total,
      totalPages: pagination ? Math.ceil(total / pagination.limit) : 1,
    };
  }

  private buildWhereClause(
    tenant: TenantContext,
    filters?: MemberSearchFilters
  ): Prisma.MemberWhereInput {
    const where: Prisma.MemberWhereInput = {
      organizationId: tenant.organizationId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.tierIds && filters.tierIds.length > 0) {
      where.memberships = {
        some: {
          tierId: { in: filters.tierIds },
          status: 'ACTIVE',
        },
      };
    }

    if (filters?.joinedAfter) {
      where.joinedAt = { gte: filters.joinedAfter };
    }

    if (filters?.joinedBefore) {
      if (where.joinedAt) {
        (where.joinedAt as any).lte = filters.joinedBefore;
      } else {
        where.joinedAt = { lte: filters.joinedBefore };
      }
    }

    return where;
  }

  async create(data: CreateMemberDto, tenant: TenantContext): Promise<Member> {
    // Check for duplicate email
    const existing = await this.findByEmail(data.email, tenant);
    if (existing) {
      throw new Error(`Member with email ${data.email} already exists`);
    }

    // Set joinedAt if status is ACTIVE
    const memberData: any = {
      ...data,
      organizationId: tenant.organizationId,
    };

    if (data.status === 'ACTIVE' && !memberData.joinedAt) {
      memberData.joinedAt = new Date();
    }

    return this.prisma.member.create({
      data: memberData,
    });
  }

  async update(
    id: string,
    data: UpdateMemberDto,
    tenant: TenantContext
  ): Promise<Member> {
    // Verify member exists and belongs to tenant
    const existing = await this.findById(id, tenant);
    if (!existing) {
      throw new Error('Member not found');
    }

    // Check email uniqueness if updating email
    if (data.email && data.email !== existing.email) {
      const duplicate = await this.findByEmail(data.email, tenant);
      if (duplicate) {
        throw new Error(`Member with email ${data.email} already exists`);
      }
    }

    return this.prisma.member.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: MemberStatus,
    reason: string | undefined,
    tenant: TenantContext,
    changedBy?: string
  ): Promise<Member> {
    const existing = await this.findById(id, tenant);
    if (!existing) {
      throw new Error('Member not found');
    }

    // Update status and record history
    const [member] = await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id },
        data: {
          status,
          joinedAt: status === 'ACTIVE' && !existing.joinedAt ? new Date() : existing.joinedAt,
        },
      }),
      this.prisma.memberStatusHistory.create({
        data: {
          memberId: id,
          fromStatus: existing.status,
          toStatus: status,
          reason,
          changedBy,
        },
      }),
    ]);

    return member;
  }

  async delete(id: string, tenant: TenantContext): Promise<Member> {
    const existing = await this.findById(id, tenant);
    if (!existing) {
      throw new Error('Member not found');
    }

    return this.prisma.member.delete({
      where: { id },
    });
  }

  async bulkImport(
    members: CreateMemberDto[],
    tenant: TenantContext
  ): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    for (const memberData of members) {
      try {
        await this.create(memberData, tenant);
        success++;
      } catch (error) {
        errors.push(`Failed to import ${memberData.email}: ${error.message}`);
      }
    }

    return { success, errors };
  }

  async getStatusHistory(
    memberId: string,
    tenant: TenantContext
  ): Promise<any[]> {
    // Verify member belongs to tenant
    const member = await this.findById(memberId, tenant);
    if (!member) {
      throw new Error('Member not found');
    }

    return this.prisma.memberStatusHistory.findMany({
      where: { memberId },
      orderBy: { changedAt: 'desc' },
    });
  }

  async getStats(tenant: TenantContext): Promise<{
    total: number;
    active: number;
    pending: number;
    inactive: number;
  }> {
    const [total, active, pending, inactive] = await Promise.all([
      this.prisma.member.count({
        where: { organizationId: tenant.organizationId },
      }),
      this.prisma.member.count({
        where: { organizationId: tenant.organizationId, status: 'ACTIVE' },
      }),
      this.prisma.member.count({
        where: { organizationId: tenant.organizationId, status: 'PENDING' },
      }),
      this.prisma.member.count({
        where: { organizationId: tenant.organizationId, status: 'INACTIVE' },
      }),
    ]);

    return { total, active, pending, inactive };
  }
}
```

### 3. Member Service

```typescript
// backend/src/services/member.service.ts

import {
  MemberRepository,
  CreateMemberDto,
  UpdateMemberDto,
  MemberSearchFilters,
  PaginationOptions,
} from '../repositories/member.repository';
import { TenantContext } from '../types/tenant.types';
import { Member, MemberStatus } from '@prisma/client';

export class MemberService {
  constructor(private memberRepository: MemberRepository) {}

  async getMember(id: string, tenant: TenantContext): Promise<Member | null> {
    return this.memberRepository.findById(id, tenant);
  }

  async getMembers(
    tenant: TenantContext,
    filters?: MemberSearchFilters,
    pagination?: PaginationOptions
  ) {
    return this.memberRepository.findAll(tenant, filters, pagination);
  }

  async createMember(data: CreateMemberDto, tenant: TenantContext): Promise<Member> {
    // Validate email
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone if provided
    if (data.phoneNumber && !this.isValidPhone(data.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    return this.memberRepository.create(data, tenant);
  }

  async updateMember(
    id: string,
    data: UpdateMemberDto,
    tenant: TenantContext
  ): Promise<Member> {
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.phoneNumber && !this.isValidPhone(data.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    return this.memberRepository.update(id, data, tenant);
  }

  async updateMemberStatus(
    id: string,
    status: MemberStatus,
    reason: string | undefined,
    tenant: TenantContext,
    userId?: string
  ): Promise<Member> {
    return this.memberRepository.updateStatus(id, status, reason, tenant, userId);
  }

  async deleteMember(id: string, tenant: TenantContext): Promise<void> {
    await this.memberRepository.delete(id, tenant);
  }

  async getMemberStats(tenant: TenantContext) {
    return this.memberRepository.getStats(tenant);
  }

  async importMembers(
    csvData: CreateMemberDto[],
    tenant: TenantContext
  ) {
    // Validate all records before import
    const validationErrors = this.validateBulkImport(csvData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
    }

    return this.memberRepository.bulkImport(csvData, tenant);
  }

  async exportMembers(
    tenant: TenantContext,
    filters?: MemberSearchFilters
  ): Promise<any[]> {
    const result = await this.memberRepository.findAll(tenant, filters);

    return result.data.map(member => ({
      Email: member.email,
      'First Name': member.firstName,
      'Last Name': member.lastName,
      'Phone Number': member.phoneNumber || '',
      Status: member.status,
      'Joined At': member.joinedAt?.toISOString() || '',
    }));
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation (adjust for your needs)
    return /^\+?[\d\s\-()]+$/.test(phone);
  }

  private validateBulkImport(data: CreateMemberDto[]): string[] {
    const errors: string[] = [];
    const emails = new Set<string>();

    data.forEach((member, index) => {
      if (!this.isValidEmail(member.email)) {
        errors.push(`Row ${index + 1}: Invalid email ${member.email}`);
      }

      if (emails.has(member.email)) {
        errors.push(`Row ${index + 1}: Duplicate email ${member.email}`);
      }
      emails.add(member.email);

      if (!member.firstName || !member.lastName) {
        errors.push(`Row ${index + 1}: First and last name required`);
      }
    });

    return errors;
  }
}
```

### 4. Member Controller

```typescript
// backend/src/controllers/member.controller.ts

import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types/tenant.types';
import { MemberService } from '../services/member.service';
import { MemberStatus } from '@prisma/client';

export class MemberController {
  constructor(private memberService: MemberService) {}

  async getMembers(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { status, search, tierIds, page = '1', limit = '20' } = req.query;

      const filters = {
        status: status as MemberStatus,
        search: search as string,
        tierIds: tierIds ? (tierIds as string).split(',') : undefined,
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.memberService.getMembers(
        req.tenant,
        filters,
        pagination
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMember(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const member = await this.memberService.getMember(id, req.tenant);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      res.json({ data: member });
    } catch (error) {
      next(error);
    }
  }

  async createMember(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const member = await this.memberService.createMember(req.body, req.tenant);
      res.status(201).json({ data: member });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const member = await this.memberService.updateMember(
        id,
        req.body,
        req.tenant
      );
      res.json({ data: member });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberStatus(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const member = await this.memberService.updateMemberStatus(
        id,
        status,
        reason,
        req.tenant,
        req.tenant.userId
      );

      res.json({ data: member });
    } catch (error) {
      next(error);
    }
  }

  async deleteMember(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.memberService.deleteMember(id, req.tenant);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getMemberStats(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const stats = await this.memberService.getMemberStats(req.tenant);
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }

  async importMembers(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { members } = req.body;
      const result = await this.memberService.importMembers(members, req.tenant);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportMembers(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { status, search } = req.query;
      const filters = { status: status as MemberStatus, search: search as string };

      const data = await this.memberService.exportMembers(req.tenant, filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=members.csv');

      // Convert to CSV (use a library like 'csv-stringify' in production)
      const csv = this.convertToCSV(data);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));

    return [headers, ...rows].join('\n');
  }
}
```

### 5. Member Routes

```typescript
// backend/src/routes/member.routes.ts

import { Router } from 'express';
import { MemberController } from '../controllers/member.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';

export const createMemberRouter = (memberController: MemberController): Router => {
  const router = Router();

  // All routes require authentication and tenant context
  router.use(authMiddleware);
  router.use(tenantMiddleware);

  // Member CRUD
  router.get('/', memberController.getMembers.bind(memberController));
  router.get('/stats', memberController.getMemberStats.bind(memberController));
  router.get('/:id', memberController.getMember.bind(memberController));
  router.post('/', memberController.createMember.bind(memberController));
  router.put('/:id', memberController.updateMember.bind(memberController));
  router.patch('/:id/status', memberController.updateMemberStatus.bind(memberController));
  router.delete('/:id', memberController.deleteMember.bind(memberController));

  // Import/Export
  router.post('/import', memberController.importMembers.bind(memberController));
  router.get('/export', memberController.exportMembers.bind(memberController));

  return router;
};
```

## Best Practices

1. **Status Management** - Use enum for status, track history
2. **Soft Deletes** - Archive instead of hard delete
3. **Audit Trail** - Log all status changes with reason
4. **Validation** - Validate email/phone formats
5. **Search Optimization** - Index common search fields
6. **Pagination** - Always paginate list endpoints
7. **Bulk Operations** - Validate before bulk import

## Common Pitfalls

- ❌ Hard deleting members (use ARCHIVED status)
- ❌ Not tracking status change history
- ❌ Missing email validation
- ❌ Allowing duplicate emails within tenant
- ❌ Not paginating large member lists
- ❌ Exposing cross-tenant member data

## Testing Checklist

- [ ] Test member creation with valid data
- [ ] Test duplicate email validation
- [ ] Test member search and filtering
- [ ] Test pagination
- [ ] Test status transitions
- [ ] Test tenant isolation
- [ ] Test bulk import with validation
- [ ] Test export functionality

## Related Skills

- **multi-tenant** - Tenant isolation patterns
- **database** - Prisma schema and queries
- **rest-api** - API design
- **testing** - Integration testing
