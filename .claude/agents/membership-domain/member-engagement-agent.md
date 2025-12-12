# Member Engagement Agent

## Agent Metadata
```yaml
name: member-engagement-agent
type: specialist
model: sonnet
category: membership-domain
priority: high
keywords:
  - engagement
  - activity
  - tracking
  - participation
  - retention
  - communication
  - events
  - scoring
capabilities:
  - activity_tracking
  - engagement_scoring
  - communication_preferences
  - event_participation
  - retention_analysis
```

## Description

The Member Engagement Agent specializes in tracking and analyzing member interactions, activities, and engagement patterns. This agent monitors member behavior, calculates engagement scores, manages communication preferences, tracks event participation, and provides insights for member retention strategies in the Lobbi multi-tenant platform.

## Core Responsibilities

1. **Member Activity Tracking**
   - Record all member interactions and touchpoints
   - Track login frequency and session duration
   - Monitor content consumption and downloads
   - Log event registrations and attendance

2. **Engagement Scoring**
   - Calculate composite engagement scores
   - Track engagement trends over time
   - Identify highly engaged vs at-risk members
   - Generate engagement health indicators

3. **Communication Preferences**
   - Manage email notification settings
   - Track communication channel preferences
   - Monitor communication engagement rates
   - Handle opt-in/opt-out requests

4. **Event Participation Tracking**
   - Record event registrations and check-ins
   - Track attendance patterns and preferences
   - Monitor post-event engagement
   - Analyze event impact on member retention

## Prisma Schema for Engagement

```typescript
// prisma/schema.prisma
model MemberActivity {
  id              String    @id @default(uuid())
  memberId        String    @map("member_id")
  orgId           String    @map("org_id")
  activityType    String    @map("activity_type") // LOGIN, EVENT_REGISTER, CONTENT_VIEW, etc.
  activityData    Json?     @map("activity_data")
  source          String?   // WEB, MOBILE, API
  ipAddress       String?   @map("ip_address")
  userAgent       String?   @map("user_agent")
  createdAt       DateTime  @default(now()) @map("created_at")

  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [orgId], references: [id])

  @@index([memberId, createdAt])
  @@index([orgId, activityType])
  @@index([orgId, createdAt])
  @@map("member_activities")
}

model EngagementScore {
  id              String    @id @default(uuid())
  memberId        String    @map("member_id")
  orgId           String    @map("org_id")
  score           Int       // 0-100
  loginScore      Int       @default(0) @map("login_score")
  eventScore      Int       @default(0) @map("event_score")
  contentScore    Int       @default(0) @map("content_score")
  communicationScore Int    @default(0) @map("communication_score")
  trend           String    @default("STABLE") // RISING, STABLE, DECLINING
  lastCalculated  DateTime  @default(now()) @map("last_calculated")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([memberId, orgId])
  @@index([orgId, score])
  @@index([orgId, trend])
  @@map("engagement_scores")
}

model CommunicationPreference {
  id              String    @id @default(uuid())
  memberId        String    @map("member_id")
  orgId           String    @map("org_id")
  channel         String    // EMAIL, SMS, PUSH, IN_APP
  enabled         Boolean   @default(true)
  frequency       String    @default("IMMEDIATE") // IMMEDIATE, DAILY, WEEKLY, MONTHLY
  categories      Json      // {events: true, newsletters: true, updates: false}
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([memberId, channel])
  @@index([orgId, channel])
  @@map("communication_preferences")
}

model EventParticipation {
  id              String    @id @default(uuid())
  memberId        String    @map("member_id")
  eventId         String    @map("event_id")
  orgId           String    @map("org_id")
  status          ParticipationStatus @default(REGISTERED)
  registeredAt    DateTime  @default(now()) @map("registered_at")
  checkedInAt     DateTime? @map("checked_in_at")
  cancelledAt     DateTime? @map("cancelled_at")
  feedback        Json?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  event           Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([memberId, eventId])
  @@index([orgId, status])
  @@index([eventId, status])
  @@map("event_participations")
}

enum ParticipationStatus {
  REGISTERED
  CHECKED_IN
  ATTENDED
  NO_SHOW
  CANCELLED
}
```

## Activity Tracking Repository

```typescript
// repositories/activityRepository.ts
import { PrismaClient, MemberActivity } from '@prisma/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface ActivityFilters {
  memberId?: string;
  activityType?: string;
  startDate?: Date;
  endDate?: Date;
  source?: string;
}

export class ActivityRepository {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Track new member activity
   */
  async trackActivity(
    memberId: string,
    activityType: string,
    activityData?: any,
    metadata?: {
      source?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<MemberActivity> {
    return this.prisma.memberActivity.create({
      data: {
        memberId,
        orgId: this.orgId,
        activityType,
        activityData,
        source: metadata?.source,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      }
    });
  }

  /**
   * Get member activity history
   */
  async getMemberActivities(
    memberId: string,
    filters?: ActivityFilters
  ): Promise<MemberActivity[]> {
    const where: any = {
      memberId,
      orgId: this.orgId
    };

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.source) {
      where.source = filters.source;
    }

    return this.prisma.memberActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  /**
   * Get activity summary by type for a member
   */
  async getActivitySummary(
    memberId: string,
    days: number = 30
  ): Promise<Record<string, number>> {
    const startDate = startOfDay(subDays(new Date(), days));

    const activities = await this.prisma.memberActivity.groupBy({
      by: ['activityType'],
      where: {
        memberId,
        orgId: this.orgId,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    const summary: Record<string, number> = {};
    activities.forEach(a => {
      summary[a.activityType] = a._count;
    });

    return summary;
  }

  /**
   * Get recent activities across all members
   */
  async getRecentActivities(
    limit: number = 50,
    activityType?: string
  ): Promise<MemberActivity[]> {
    return this.prisma.memberActivity.findMany({
      where: {
        orgId: this.orgId,
        activityType
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Count activities by type for the organization
   */
  async countByType(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const where: any = { orgId: this.orgId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const counts = await this.prisma.memberActivity.groupBy({
      by: ['activityType'],
      where,
      _count: true
    });

    const result: Record<string, number> = {};
    counts.forEach(c => {
      result[c.activityType] = c._count;
    });

    return result;
  }
}
```

## Engagement Scoring Service

```typescript
// services/engagementService.ts
import { PrismaClient, EngagementScore } from '@prisma/client';
import { ActivityRepository } from '../repositories/activityRepository';
import { subDays } from 'date-fns';

export interface EngagementMetrics {
  loginFrequency: number;
  eventParticipation: number;
  contentConsumption: number;
  communicationEngagement: number;
}

export class EngagementService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Calculate engagement score for a member
   */
  async calculateEngagementScore(memberId: string): Promise<EngagementScore> {
    const activityRepo = new ActivityRepository(this.prisma, this.orgId);

    // Get activity summary for last 30 days
    const summary = await activityRepo.getActivitySummary(memberId, 30);

    // Calculate component scores (0-25 each, totaling 100)
    const loginScore = this.calculateLoginScore(summary);
    const eventScore = await this.calculateEventScore(memberId);
    const contentScore = this.calculateContentScore(summary);
    const communicationScore = await this.calculateCommunicationScore(memberId);

    const totalScore = loginScore + eventScore + contentScore + communicationScore;

    // Determine trend
    const trend = await this.calculateTrend(memberId, totalScore);

    // Upsert engagement score
    const score = await this.prisma.engagementScore.upsert({
      where: {
        memberId_orgId: {
          memberId,
          orgId: this.orgId
        }
      },
      update: {
        score: totalScore,
        loginScore,
        eventScore,
        contentScore,
        communicationScore,
        trend,
        lastCalculated: new Date()
      },
      create: {
        memberId,
        orgId: this.orgId,
        score: totalScore,
        loginScore,
        eventScore,
        contentScore,
        communicationScore,
        trend
      }
    });

    return score;
  }

  /**
   * Calculate login score (0-25)
   */
  private calculateLoginScore(summary: Record<string, number>): number {
    const logins = summary['LOGIN'] || 0;

    // Score based on frequency
    // 0 logins = 0, 1-5 = 5, 6-10 = 10, 11-20 = 15, 21-30 = 20, 30+ = 25
    if (logins === 0) return 0;
    if (logins <= 5) return 5;
    if (logins <= 10) return 10;
    if (logins <= 20) return 15;
    if (logins <= 30) return 20;
    return 25;
  }

  /**
   * Calculate event participation score (0-25)
   */
  private async calculateEventScore(memberId: string): Promise<number> {
    const last30Days = subDays(new Date(), 30);

    const participations = await this.prisma.eventParticipation.count({
      where: {
        memberId,
        orgId: this.orgId,
        registeredAt: { gte: last30Days },
        status: { in: ['ATTENDED', 'CHECKED_IN'] }
      }
    });

    // Score based on attendance
    // 0 events = 0, 1 = 10, 2 = 15, 3 = 20, 4+ = 25
    if (participations === 0) return 0;
    if (participations === 1) return 10;
    if (participations === 2) return 15;
    if (participations === 3) return 20;
    return 25;
  }

  /**
   * Calculate content consumption score (0-25)
   */
  private calculateContentScore(summary: Record<string, number>): number {
    const contentViews = (summary['CONTENT_VIEW'] || 0) +
                        (summary['DOWNLOAD'] || 0) +
                        (summary['ARTICLE_READ'] || 0);

    // Score based on engagement
    if (contentViews === 0) return 0;
    if (contentViews <= 5) return 5;
    if (contentViews <= 15) return 10;
    if (contentViews <= 30) return 15;
    if (contentViews <= 50) return 20;
    return 25;
  }

  /**
   * Calculate communication engagement score (0-25)
   */
  private async calculateCommunicationScore(memberId: string): Promise<number> {
    const last30Days = subDays(new Date(), 30);

    const engagement = await this.prisma.memberActivity.count({
      where: {
        memberId,
        orgId: this.orgId,
        createdAt: { gte: last30Days },
        activityType: { in: ['EMAIL_OPEN', 'EMAIL_CLICK', 'SURVEY_RESPONSE'] }
      }
    });

    // Score based on communication interactions
    if (engagement === 0) return 0;
    if (engagement <= 3) return 10;
    if (engagement <= 8) return 15;
    if (engagement <= 15) return 20;
    return 25;
  }

  /**
   * Calculate engagement trend
   */
  private async calculateTrend(memberId: string, currentScore: number): Promise<string> {
    const previousScore = await this.prisma.engagementScore.findUnique({
      where: {
        memberId_orgId: {
          memberId,
          orgId: this.orgId
        }
      }
    });

    if (!previousScore) return 'STABLE';

    const difference = currentScore - previousScore.score;

    if (difference >= 10) return 'RISING';
    if (difference <= -10) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * Get at-risk members (low engagement)
   */
  async getAtRiskMembers(threshold: number = 30): Promise<EngagementScore[]> {
    return this.prisma.engagementScore.findMany({
      where: {
        orgId: this.orgId,
        score: { lte: threshold }
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        }
      },
      orderBy: { score: 'asc' }
    });
  }

  /**
   * Get highly engaged members
   */
  async getHighlyEngagedMembers(threshold: number = 75): Promise<EngagementScore[]> {
    return this.prisma.engagementScore.findMany({
      where: {
        orgId: this.orgId,
        score: { gte: threshold }
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        }
      },
      orderBy: { score: 'desc' }
    });
  }

  /**
   * Bulk calculate scores for all active members
   */
  async calculateAllScores(): Promise<void> {
    const members = await this.prisma.member.findMany({
      where: {
        orgId: this.orgId,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      select: { id: true }
    });

    for (const member of members) {
      await this.calculateEngagementScore(member.id);
    }
  }
}
```

## Communication Preferences Service

```typescript
// services/communicationPreferenceService.ts
import { PrismaClient, CommunicationPreference } from '@prisma/client';

export interface PreferenceUpdate {
  channel: string;
  enabled?: boolean;
  frequency?: string;
  categories?: Record<string, boolean>;
}

export class CommunicationPreferenceService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Get member's communication preferences
   */
  async getPreferences(memberId: string): Promise<CommunicationPreference[]> {
    return this.prisma.communicationPreference.findMany({
      where: {
        memberId,
        orgId: this.orgId
      }
    });
  }

  /**
   * Update communication preference
   */
  async updatePreference(
    memberId: string,
    update: PreferenceUpdate
  ): Promise<CommunicationPreference> {
    return this.prisma.communicationPreference.upsert({
      where: {
        memberId_channel: {
          memberId,
          channel: update.channel
        }
      },
      update: {
        enabled: update.enabled,
        frequency: update.frequency,
        categories: update.categories
      },
      create: {
        memberId,
        orgId: this.orgId,
        channel: update.channel,
        enabled: update.enabled ?? true,
        frequency: update.frequency || 'IMMEDIATE',
        categories: update.categories || {}
      }
    });
  }

  /**
   * Check if member can receive communication
   */
  async canReceive(
    memberId: string,
    channel: string,
    category?: string
  ): Promise<boolean> {
    const preference = await this.prisma.communicationPreference.findUnique({
      where: {
        memberId_channel: {
          memberId,
          channel
        }
      }
    });

    if (!preference) return true; // Default to enabled

    if (!preference.enabled) return false;

    // Check category-specific preference
    if (category && preference.categories) {
      const categories = preference.categories as Record<string, boolean>;
      return categories[category] !== false;
    }

    return true;
  }

  /**
   * Opt member out of all communications
   */
  async optOutAll(memberId: string): Promise<void> {
    await this.prisma.communicationPreference.updateMany({
      where: {
        memberId,
        orgId: this.orgId
      },
      data: {
        enabled: false
      }
    });
  }

  /**
   * Opt member in to all communications
   */
  async optInAll(memberId: string): Promise<void> {
    await this.prisma.communicationPreference.updateMany({
      where: {
        memberId,
        orgId: this.orgId
      },
      data: {
        enabled: true
      }
    });
  }
}
```

## Event Participation Tracking

```typescript
// services/eventParticipationService.ts
import { PrismaClient, EventParticipation, ParticipationStatus } from '@prisma/client';
import { ActivityRepository } from '../repositories/activityRepository';

export class EventParticipationService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Register member for event
   */
  async registerForEvent(
    memberId: string,
    eventId: string
  ): Promise<EventParticipation> {
    // Check if already registered
    const existing = await this.prisma.eventParticipation.findUnique({
      where: {
        memberId_eventId: {
          memberId,
          eventId
        }
      }
    });

    if (existing) {
      throw new Error('Already registered for this event');
    }

    const participation = await this.prisma.eventParticipation.create({
      data: {
        memberId,
        eventId,
        orgId: this.orgId,
        status: ParticipationStatus.REGISTERED
      }
    });

    // Track activity
    const activityRepo = new ActivityRepository(this.prisma, this.orgId);
    await activityRepo.trackActivity(
      memberId,
      'EVENT_REGISTER',
      { eventId }
    );

    return participation;
  }

  /**
   * Check in member at event
   */
  async checkIn(memberId: string, eventId: string): Promise<EventParticipation> {
    const participation = await this.prisma.eventParticipation.update({
      where: {
        memberId_eventId: {
          memberId,
          eventId
        }
      },
      data: {
        status: ParticipationStatus.CHECKED_IN,
        checkedInAt: new Date()
      }
    });

    // Track activity
    const activityRepo = new ActivityRepository(this.prisma, this.orgId);
    await activityRepo.trackActivity(
      memberId,
      'EVENT_CHECKIN',
      { eventId }
    );

    return participation;
  }

  /**
   * Mark attendance for event
   */
  async markAttended(memberId: string, eventId: string): Promise<EventParticipation> {
    return this.prisma.eventParticipation.update({
      where: {
        memberId_eventId: {
          memberId,
          eventId
        }
      },
      data: {
        status: ParticipationStatus.ATTENDED
      }
    });
  }

  /**
   * Cancel event registration
   */
  async cancelRegistration(memberId: string, eventId: string): Promise<EventParticipation> {
    return this.prisma.eventParticipation.update({
      where: {
        memberId_eventId: {
          memberId,
          eventId
        }
      },
      data: {
        status: ParticipationStatus.CANCELLED,
        cancelledAt: new Date()
      }
    });
  }

  /**
   * Get member's event participation history
   */
  async getMemberParticipations(memberId: string): Promise<EventParticipation[]> {
    return this.prisma.eventParticipation.findMany({
      where: {
        memberId,
        orgId: this.orgId
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });
  }

  /**
   * Get event attendees
   */
  async getEventAttendees(eventId: string): Promise<EventParticipation[]> {
    return this.prisma.eventParticipation.findMany({
      where: {
        eventId,
        orgId: this.orgId
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { registeredAt: 'asc' }
    });
  }

  /**
   * Calculate attendance rate for member
   */
  async calculateAttendanceRate(memberId: string): Promise<number> {
    const participations = await this.prisma.eventParticipation.findMany({
      where: {
        memberId,
        orgId: this.orgId,
        status: { in: ['ATTENDED', 'NO_SHOW', 'CHECKED_IN'] }
      }
    });

    if (participations.length === 0) return 0;

    const attended = participations.filter(
      p => p.status === 'ATTENDED' || p.status === 'CHECKED_IN'
    ).length;

    return (attended / participations.length) * 100;
  }
}
```

## API Routes for Engagement

```typescript
// routes/engagement.ts
import { Router } from 'express';
import { tenantMiddleware } from '../middleware/tenantContext';
import { EngagementService } from '../services/engagementService';
import { ActivityRepository } from '../repositories/activityRepository';
import { CommunicationPreferenceService } from '../services/communicationPreferenceService';

const router = Router();
router.use(tenantMiddleware);

/**
 * GET /api/engagement/score/:memberId - Get member engagement score
 */
router.get('/score/:memberId', async (req, res) => {
  try {
    const service = new EngagementService(prisma, req.tenant.orgId);
    const score = await service.calculateEngagementScore(req.params.memberId);

    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/at-risk - Get at-risk members
 */
router.get('/at-risk', async (req, res) => {
  try {
    const service = new EngagementService(prisma, req.tenant.orgId);
    const members = await service.getAtRiskMembers();

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
 * POST /api/engagement/track - Track member activity
 */
router.post('/track', async (req, res) => {
  try {
    const { memberId, activityType, activityData } = req.body;
    const activityRepo = new ActivityRepository(prisma, req.tenant.orgId);

    const activity = await activityRepo.trackActivity(
      memberId,
      activityType,
      activityData,
      {
        source: 'WEB',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/preferences/:memberId - Get communication preferences
 */
router.get('/preferences/:memberId', async (req, res) => {
  try {
    const service = new CommunicationPreferenceService(prisma, req.tenant.orgId);
    const preferences = await service.getPreferences(req.params.memberId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engagement/preferences/:memberId - Update preferences
 */
router.put('/preferences/:memberId', async (req, res) => {
  try {
    const service = new CommunicationPreferenceService(prisma, req.tenant.orgId);
    const preference = await service.updatePreference(req.params.memberId, req.body);

    res.json({
      success: true,
      data: preference
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## Best Practices

1. **Track all meaningful interactions** - Capture login, views, downloads, clicks
2. **Calculate scores regularly** - Use cron jobs to update engagement scores daily
3. **Respect communication preferences** - Always check before sending notifications
4. **Monitor declining engagement** - Alert administrators about at-risk members
5. **Privacy-aware tracking** - Don't track sensitive personal activities
6. **Aggregate data efficiently** - Use database aggregations for performance
7. **Provide opt-out mechanisms** - Easy unsubscribe for all communication channels
8. **Analyze engagement patterns** - Identify what drives retention in your organization

## Collaboration Points

- Works with **membership-specialist** for member data access
- Coordinates with **membership-analytics-agent** for reporting and insights
- Supports **directory-manager** by providing engagement metadata
- Integrates with **notification-service** for communication delivery
- Collaborates with **event-management** for participation tracking
- Provides data to **retention-specialist** for churn prediction
