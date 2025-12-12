# Membership Specialist Agent

## Agent Metadata
```yaml
name: membership-specialist
type: specialist
model: sonnet
category: membership-domain
priority: high
keywords:
  - member
  - membership
  - crud
  - tier
  - level
  - renewal
  - status
  - member-management
capabilities:
  - member_crud
  - membership_tiers
  - status_management
  - renewal_processing
  - member_search
```

## Description

The Membership Specialist Agent is responsible for all core member and membership management operations in the Lobbi multi-tenant platform. This agent handles member CRUD operations, membership level management, status transitions, renewal processing, and member search/filtering with strict tenant isolation.

## Core Responsibilities

1. **Member CRUD Operations**
   - Create new member records with validation
   - Read member data with privacy controls
   - Update member profiles and information
   - Archive/soft-delete members with history preservation

2. **Membership Levels and Tiers**
   - Define membership tier structures
   - Manage tier benefits and permissions
   - Handle tier upgrades and downgrades
   - Calculate prorated billing on tier changes

3. **Member Status Management**
   - Track member lifecycle states (pending, active, suspended, expired)
   - Process status transitions with business rules
   - Send notifications on status changes
   - Manage grace periods and reactivations

4. **Renewal Processing**
   - Automate membership renewals
   - Calculate renewal dates and amounts
   - Process renewal payments
   - Handle failed renewals with retry logic

## Prisma Schema for Members

```typescript
// prisma/schema.prisma
model Member {
  id              String            @id @default(uuid())
  orgId           String            @map("org_id")
  email           String
  firstName       String            @map("first_name")
  lastName        String            @map("last_name")
  phone           String?
  status          MemberStatus      @default(PENDING)
  membershipTier  String            @map("membership_tier")
  joinedAt        DateTime          @default(now()) @map("joined_at")
  expiresAt       DateTime?         @map("expires_at")
  lastRenewalAt   DateTime?         @map("last_renewal_at")
  metadata        Json?
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  organization    Organization      @relation(fields: [orgId], references: [id])
  tier            MembershipTier    @relation(fields: [membershipTier], references: [id])
  activities      MemberActivity[]
  payments        Payment[]
  subscriptions   Subscription[]

  @@unique([orgId, email])
  @@index([orgId, status])
  @@index([orgId, membershipTier])
  @@index([expiresAt])
  @@map("members")
}

model MembershipTier {
  id              String    @id @default(uuid())
  orgId           String    @map("org_id")
  name            String
  description     String?
  price           Decimal   @db.Decimal(10, 2)
  billingPeriod   String    @map("billing_period") // MONTHLY, YEARLY
  benefits        Json
  maxMembers      Int?      @map("max_members")
  isActive        Boolean   @default(true) @map("is_active")
  displayOrder    Int       @default(0) @map("display_order")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  organization    Organization @relation(fields: [orgId], references: [id])
  members         Member[]

  @@unique([orgId, name])
  @@index([orgId, isActive])
  @@map("membership_tiers")
}

enum MemberStatus {
  PENDING
  ACTIVE
  SUSPENDED
  EXPIRED
  CANCELLED
  ARCHIVED
}
```

## Member Repository with Tenant Isolation

```typescript
// repositories/memberRepository.ts
import { PrismaClient, Member, MemberStatus, Prisma } from '@prisma/client';

export interface MemberFilters {
  status?: MemberStatus;
  tier?: string;
  search?: string;
  expiringBefore?: Date;
  joinedAfter?: Date;
}

export class MemberRepository {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Find all members for the organization with filters
   */
  async findAll(filters?: MemberFilters): Promise<Member[]> {
    const where: Prisma.MemberWhereInput = {
      orgId: this.orgId
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.tier) {
      where.membershipTier = filters.tier;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters?.expiringBefore) {
      where.expiresAt = {
        lte: filters.expiringBefore,
        gte: new Date()
      };
    }

    if (filters?.joinedAfter) {
      where.joinedAt = {
        gte: filters.joinedAfter
      };
    }

    return this.prisma.member.findMany({
      where,
      include: {
        tier: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find member by ID with tenant isolation
   */
  async findById(id: string): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: {
        id,
        orgId: this.orgId
      },
      include: {
        tier: true,
        activities: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Find member by email (tenant-scoped)
   */
  async findByEmail(email: string): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: {
        email,
        orgId: this.orgId
      },
      include: { tier: true }
    });
  }

  /**
   * Create new member with tenant enforcement
   */
  async create(data: Omit<Member, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>): Promise<Member> {
    // Check if email already exists in this org
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new Error('Member with this email already exists');
    }

    return this.prisma.member.create({
      data: {
        ...data,
        orgId: this.orgId
      },
      include: { tier: true }
    });
  }

  /**
   * Update member with ownership verification
   */
  async update(id: string, data: Partial<Member>): Promise<Member> {
    // Verify ownership first
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Member not found or access denied');
    }

    return this.prisma.member.update({
      where: { id },
      data,
      include: { tier: true }
    });
  }

  /**
   * Soft delete (archive) member
   */
  async archive(id: string): Promise<Member> {
    return this.update(id, {
      status: MemberStatus.ARCHIVED,
      updatedAt: new Date()
    });
  }

  /**
   * Hard delete member (use with caution)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Member not found or access denied');
    }

    await this.prisma.member.delete({ where: { id } });
  }

  /**
   * Get members expiring soon
   */
  async findExpiringSoon(days: number = 30): Promise<Member[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.prisma.member.findMany({
      where: {
        orgId: this.orgId,
        status: MemberStatus.ACTIVE,
        expiresAt: {
          lte: expiryDate,
          gte: new Date()
        }
      },
      include: { tier: true },
      orderBy: { expiresAt: 'asc' }
    });
  }

  /**
   * Count members by status
   */
  async countByStatus(): Promise<Record<MemberStatus, number>> {
    const counts = await this.prisma.member.groupBy({
      by: ['status'],
      where: { orgId: this.orgId },
      _count: true
    });

    const result = {} as Record<MemberStatus, number>;
    counts.forEach(c => {
      result[c.status] = c._count;
    });

    return result;
  }
}

// Factory function for request-scoped repositories
export function createMemberRepository(orgId: string): MemberRepository {
  return new MemberRepository(prisma, orgId);
}
```

## Membership Service with Tier Management

```typescript
// services/membershipService.ts
import { PrismaClient, Member, MemberStatus } from '@prisma/client';
import { MemberRepository } from '../repositories/memberRepository';
import { add } from 'date-fns';

export interface CreateMemberInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  membershipTier: string;
  startDate?: Date;
}

export interface TierChangeInput {
  newTierId: string;
  effectiveDate?: Date;
  prorated?: boolean;
}

export class MembershipService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Create new member with membership tier
   */
  async createMember(input: CreateMemberInput): Promise<Member> {
    const repo = new MemberRepository(this.prisma, this.orgId);

    // Validate tier exists and is active
    const tier = await this.prisma.membershipTier.findFirst({
      where: {
        id: input.membershipTier,
        orgId: this.orgId,
        isActive: true
      }
    });

    if (!tier) {
      throw new Error('Invalid or inactive membership tier');
    }

    // Calculate expiration date based on billing period
    const startDate = input.startDate || new Date();
    const expiresAt = this.calculateExpirationDate(startDate, tier.billingPeriod);

    // Create member
    const member = await repo.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      membershipTier: tier.id,
      status: MemberStatus.ACTIVE,
      joinedAt: startDate,
      expiresAt,
      lastRenewalAt: startDate,
      metadata: {}
    });

    // Log activity
    await this.logMemberActivity(member.id, 'MEMBER_CREATED', {
      tier: tier.name
    });

    return member;
  }

  /**
   * Change member tier with optional proration
   */
  async changeMemberTier(
    memberId: string,
    input: TierChangeInput
  ): Promise<Member> {
    const repo = new MemberRepository(this.prisma, this.orgId);
    const member = await repo.findById(memberId);

    if (!member) {
      throw new Error('Member not found');
    }

    const newTier = await this.prisma.membershipTier.findFirst({
      where: {
        id: input.newTierId,
        orgId: this.orgId,
        isActive: true
      }
    });

    if (!newTier) {
      throw new Error('Invalid or inactive membership tier');
    }

    const oldTier = await this.prisma.membershipTier.findUnique({
      where: { id: member.membershipTier }
    });

    // Calculate proration if needed
    let proratedAmount = 0;
    if (input.prorated && oldTier) {
      proratedAmount = this.calculateProration(
        member,
        oldTier.price,
        newTier.price
      );
    }

    // Update member tier
    const effectiveDate = input.effectiveDate || new Date();
    const newExpiresAt = this.calculateExpirationDate(
      effectiveDate,
      newTier.billingPeriod
    );

    const updatedMember = await repo.update(memberId, {
      membershipTier: newTier.id,
      expiresAt: newExpiresAt,
      updatedAt: new Date()
    });

    // Log tier change
    await this.logMemberActivity(memberId, 'TIER_CHANGED', {
      oldTier: oldTier?.name,
      newTier: newTier.name,
      proratedAmount
    });

    return updatedMember;
  }

  /**
   * Process member renewal
   */
  async renewMembership(memberId: string): Promise<Member> {
    const repo = new MemberRepository(this.prisma, this.orgId);
    const member = await repo.findById(memberId);

    if (!member) {
      throw new Error('Member not found');
    }

    const tier = await this.prisma.membershipTier.findUnique({
      where: { id: member.membershipTier }
    });

    if (!tier) {
      throw new Error('Membership tier not found');
    }

    // Calculate new expiration date
    const renewalDate = member.expiresAt || new Date();
    const newExpiresAt = this.calculateExpirationDate(
      renewalDate,
      tier.billingPeriod
    );

    // Update member
    const renewedMember = await repo.update(memberId, {
      status: MemberStatus.ACTIVE,
      expiresAt: newExpiresAt,
      lastRenewalAt: new Date(),
      updatedAt: new Date()
    });

    // Log renewal
    await this.logMemberActivity(memberId, 'MEMBERSHIP_RENEWED', {
      tier: tier.name,
      newExpiresAt
    });

    return renewedMember;
  }

  /**
   * Suspend member account
   */
  async suspendMember(memberId: string, reason?: string): Promise<Member> {
    const repo = new MemberRepository(this.prisma, this.orgId);
    const member = await repo.update(memberId, {
      status: MemberStatus.SUSPENDED,
      metadata: {
        ...(typeof member.metadata === 'object' ? member.metadata : {}),
        suspensionReason: reason,
        suspendedAt: new Date().toISOString()
      }
    });

    await this.logMemberActivity(memberId, 'MEMBER_SUSPENDED', { reason });

    return member;
  }

  /**
   * Reactivate suspended member
   */
  async reactivateMember(memberId: string): Promise<Member> {
    const repo = new MemberRepository(this.prisma, this.orgId);
    const member = await repo.findById(memberId);

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.status !== MemberStatus.SUSPENDED) {
      throw new Error('Member is not suspended');
    }

    // Check if membership is still valid
    const status = this.isExpired(member)
      ? MemberStatus.EXPIRED
      : MemberStatus.ACTIVE;

    const reactivated = await repo.update(memberId, {
      status,
      updatedAt: new Date()
    });

    await this.logMemberActivity(memberId, 'MEMBER_REACTIVATED', {});

    return reactivated;
  }

  /**
   * Calculate expiration date based on billing period
   */
  private calculateExpirationDate(startDate: Date, billingPeriod: string): Date {
    switch (billingPeriod.toUpperCase()) {
      case 'MONTHLY':
        return add(startDate, { months: 1 });
      case 'YEARLY':
        return add(startDate, { years: 1 });
      case 'QUARTERLY':
        return add(startDate, { months: 3 });
      default:
        throw new Error(`Unsupported billing period: ${billingPeriod}`);
    }
  }

  /**
   * Calculate prorated amount for tier change
   */
  private calculateProration(
    member: Member,
    oldPrice: any,
    newPrice: any
  ): number {
    if (!member.expiresAt) return 0;

    const now = new Date();
    const totalDays = Math.ceil(
      (member.expiresAt.getTime() - (member.lastRenewalAt?.getTime() || now.getTime())) /
        (1000 * 60 * 60 * 24)
    );
    const remainingDays = Math.ceil(
      (member.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const oldPriceNum = parseFloat(oldPrice.toString());
    const newPriceNum = parseFloat(newPrice.toString());

    const unusedAmount = (oldPriceNum * remainingDays) / totalDays;
    const newAmount = (newPriceNum * remainingDays) / totalDays;

    return newAmount - unusedAmount;
  }

  /**
   * Check if member is expired
   */
  private isExpired(member: Member): boolean {
    if (!member.expiresAt) return false;
    return member.expiresAt < new Date();
  }

  /**
   * Log member activity
   */
  private async logMemberActivity(
    memberId: string,
    activityType: string,
    metadata: any
  ): Promise<void> {
    await this.prisma.memberActivity.create({
      data: {
        memberId,
        orgId: this.orgId,
        activityType,
        metadata,
        createdAt: new Date()
      }
    });
  }
}
```

## API Routes for Member Management

```typescript
// routes/members.ts
import { Router } from 'express';
import { tenantMiddleware } from '../middleware/tenantContext';
import { MemberRepository } from '../repositories/memberRepository';
import { MembershipService } from '../services/membershipService';
import { body, query, validationResult } from 'express-validator';

const router = Router();

// Apply tenant context to all routes
router.use(tenantMiddleware);

/**
 * GET /api/members - List all members with filters
 */
router.get('/', [
  query('status').optional().isIn(['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'ARCHIVED']),
  query('tier').optional().isString(),
  query('search').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const repo = new MemberRepository(prisma, req.tenant.orgId);
    const members = await repo.findAll({
      status: req.query.status as any,
      tier: req.query.tier as string,
      search: req.query.search as string
    });

    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/members/:id - Get member by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const repo = new MemberRepository(prisma, req.tenant.orgId);
    const member = await repo.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/members - Create new member
 */
router.post('/', [
  body('email').isEmail(),
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('phone').optional().isString(),
  body('membershipTier').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new MembershipService(prisma, req.tenant.orgId);
    const member = await service.createMember(req.body);

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/members/:id - Update member
 */
router.patch('/:id', [
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const repo = new MemberRepository(prisma, req.tenant.orgId);
    const member = await repo.update(req.params.id, req.body);

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/members/:id/change-tier - Change membership tier
 */
router.post('/:id/change-tier', [
  body('newTierId').isString().notEmpty(),
  body('prorated').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new MembershipService(prisma, req.tenant.orgId);
    const member = await service.changeMemberTier(req.params.id, req.body);

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/members/:id/renew - Renew membership
 */
router.post('/:id/renew', async (req, res) => {
  try {
    const service = new MembershipService(prisma, req.tenant.orgId);
    const member = await service.renewMembership(req.params.id);

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/members/:id/suspend - Suspend member
 */
router.post('/:id/suspend', [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const service = new MembershipService(prisma, req.tenant.orgId);
    const member = await service.suspendMember(req.params.id, req.body.reason);

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/members/expiring - Get members expiring soon
 */
router.get('/reports/expiring', [
  query('days').optional().isInt({ min: 1, max: 365 })
], async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const repo = new MemberRepository(prisma, req.tenant.orgId);
    const members = await repo.findExpiringSoon(days);

    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## Best Practices

1. **Always enforce tenant isolation** - Never query without orgId filtering
2. **Validate tier changes** - Ensure tier exists and is active before assignment
3. **Use soft deletes** - Archive members instead of hard deletion for audit trail
4. **Log all status changes** - Track member lifecycle for analytics and support
5. **Handle renewals gracefully** - Implement retry logic for failed payment renewals
6. **Calculate proration accurately** - Use precise date math for tier changes
7. **Validate email uniqueness per tenant** - Allow same email across different orgs
8. **Index frequently queried fields** - Add indexes for orgId, status, expiresAt

## Collaboration Points

- Works with **member-engagement-agent** for activity tracking
- Coordinates with **membership-analytics-agent** for metrics and reporting
- Integrates with **directory-manager** for public member listings
- Supports **stripe-integration-specialist** for payment processing
- Collaborates with **multi-tenant-architect** for tenant isolation patterns
- Works with **keycloak-identity-specialist** for authentication and user mapping
