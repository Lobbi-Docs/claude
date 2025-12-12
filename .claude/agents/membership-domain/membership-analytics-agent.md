# Membership Analytics Agent

## Agent Metadata
```yaml
name: membership-analytics-agent
type: specialist
model: sonnet
category: membership-domain
priority: high
keywords:
  - analytics
  - metrics
  - kpi
  - churn
  - growth
  - cohort
  - reporting
  - dashboard
  - insights
capabilities:
  - metrics_calculation
  - churn_prediction
  - growth_analysis
  - cohort_analysis
  - dashboard_aggregation
```

## Description

The Membership Analytics Agent specializes in calculating membership metrics, analyzing trends, predicting churn, and aggregating data for dashboards and reports. This agent provides actionable insights on member growth, retention, revenue, and engagement patterns to help organizations make data-driven decisions in the Lobbi multi-tenant platform.

## Core Responsibilities

1. **Member Metrics and KPIs**
   - Calculate total members, active members, growth rate
   - Track membership acquisition and retention metrics
   - Monitor member lifetime value (LTV)
   - Generate revenue and MRR/ARR reports

2. **Churn Prediction**
   - Identify at-risk members using engagement patterns
   - Calculate churn rate and retention rate
   - Predict future churn based on historical data
   - Generate early warning alerts for renewals

3. **Growth Analysis**
   - Track member acquisition trends
   - Analyze conversion rates by tier
   - Monitor growth by time period
   - Compare growth across membership tiers

4. **Cohort Analysis**
   - Group members by join date, tier, or attributes
   - Track cohort retention over time
   - Analyze cohort revenue patterns
   - Compare cohort engagement metrics

## Prisma Schema for Analytics

```typescript
// prisma/schema.prisma
model MembershipMetric {
  id              String    @id @default(uuid())
  orgId           String    @map("org_id")
  metricDate      DateTime  @map("metric_date")
  metricType      String    @map("metric_type") // DAILY, WEEKLY, MONTHLY
  totalMembers    Int       @default(0) @map("total_members")
  activeMembers   Int       @default(0) @map("active_members")
  newMembers      Int       @default(0) @map("new_members")
  churnedMembers  Int       @default(0) @map("churned_members")
  mrr             Decimal   @default(0) @db.Decimal(10, 2)
  arr             Decimal   @default(0) @db.Decimal(10, 2)
  avgEngagement   Float     @default(0) @map("avg_engagement")
  metadata        Json?
  createdAt       DateTime  @default(now()) @map("created_at")

  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, metricDate, metricType])
  @@index([orgId, metricDate])
  @@map("membership_metrics")
}

model ChurnPrediction {
  id              String    @id @default(uuid())
  memberId        String    @map("member_id")
  orgId           String    @map("org_id")
  churnRisk       String    @default("LOW") // LOW, MEDIUM, HIGH, CRITICAL
  riskScore       Float     @default(0) @map("risk_score") // 0-1
  factors         Json      // Contributing factors
  predictedDate   DateTime? @map("predicted_date")
  recommendations Json?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([memberId, orgId])
  @@index([orgId, churnRisk])
  @@index([orgId, predictedDate])
  @@map("churn_predictions")
}

model CohortAnalysis {
  id              String    @id @default(uuid())
  orgId           String    @map("org_id")
  cohortName      String    @map("cohort_name")
  cohortType      String    @map("cohort_type") // JOIN_DATE, TIER, CUSTOM
  cohortPeriod    String    @map("cohort_period") // 2024-01, Q1-2024, etc.
  memberCount     Int       @map("member_count")
  retentionData   Json      @map("retention_data") // Retention by period
  revenueData     Json      @map("revenue_data")
  engagementData  Json      @map("engagement_data")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, cohortName, cohortPeriod])
  @@index([orgId, cohortType])
  @@map("cohort_analyses")
}
```

## Analytics Repository

```typescript
// repositories/analyticsRepository.ts
import { PrismaClient, MemberStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface MetricsSummary {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  expiredMembers: number;
  suspendedMembers: number;
  newThisMonth: number;
  churnedThisMonth: number;
  growthRate: number;
  retentionRate: number;
  mrr: number;
  arr: number;
}

export class AnalyticsRepository {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Get current membership metrics summary
   */
  async getCurrentMetrics(): Promise<MetricsSummary> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Get member counts by status
    const statusCounts = await this.prisma.member.groupBy({
      by: ['status'],
      where: { orgId: this.orgId },
      _count: true
    });

    const counts = {
      total: 0,
      active: 0,
      pending: 0,
      expired: 0,
      suspended: 0
    };

    statusCounts.forEach(s => {
      counts.total += s._count;
      if (s.status === MemberStatus.ACTIVE) counts.active = s._count;
      if (s.status === MemberStatus.PENDING) counts.pending = s._count;
      if (s.status === MemberStatus.EXPIRED) counts.expired = s._count;
      if (s.status === MemberStatus.SUSPENDED) counts.suspended = s._count;
    });

    // New members this month
    const newMembers = await this.prisma.member.count({
      where: {
        orgId: this.orgId,
        joinedAt: { gte: monthStart }
      }
    });

    // Churned members this month (became expired or cancelled)
    const churnedMembers = await this.prisma.member.count({
      where: {
        orgId: this.orgId,
        status: { in: [MemberStatus.EXPIRED, MemberStatus.CANCELLED] },
        updatedAt: { gte: monthStart }
      }
    });

    // Last month's active members for growth rate
    const lastMonthActive = await this.prisma.member.count({
      where: {
        orgId: this.orgId,
        status: MemberStatus.ACTIVE,
        joinedAt: { lte: lastMonthEnd }
      }
    });

    // Calculate growth rate
    const growthRate = lastMonthActive > 0
      ? ((counts.active - lastMonthActive) / lastMonthActive) * 100
      : 0;

    // Calculate retention rate
    const retentionRate = lastMonthActive > 0
      ? ((lastMonthActive - churnedMembers) / lastMonthActive) * 100
      : 100;

    // Calculate MRR and ARR
    const { mrr, arr } = await this.calculateRecurringRevenue();

    return {
      totalMembers: counts.total,
      activeMembers: counts.active,
      pendingMembers: counts.pending,
      expiredMembers: counts.expired,
      suspendedMembers: counts.suspended,
      newThisMonth: newMembers,
      churnedThisMonth: churnedMembers,
      growthRate: parseFloat(growthRate.toFixed(2)),
      retentionRate: parseFloat(retentionRate.toFixed(2)),
      mrr,
      arr
    };
  }

  /**
   * Calculate Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR)
   */
  async calculateRecurringRevenue(): Promise<{ mrr: number; arr: number }> {
    const activeMembers = await this.prisma.member.findMany({
      where: {
        orgId: this.orgId,
        status: MemberStatus.ACTIVE
      },
      include: {
        tier: true
      }
    });

    let mrr = 0;

    activeMembers.forEach(member => {
      const price = parseFloat(member.tier.price.toString());
      const period = member.tier.billingPeriod.toUpperCase();

      // Normalize to monthly
      if (period === 'MONTHLY') {
        mrr += price;
      } else if (period === 'YEARLY') {
        mrr += price / 12;
      } else if (period === 'QUARTERLY') {
        mrr += price / 3;
      }
    });

    return {
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat((mrr * 12).toFixed(2))
    };
  }

  /**
   * Get member growth trend over time
   */
  async getGrowthTrend(months: number = 12): Promise<Array<{
    period: string;
    total: number;
    active: number;
    new: number;
    churned: number;
  }>> {
    const trend = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const periodStart = startOfMonth(subMonths(now, i));
      const periodEnd = endOfMonth(subMonths(now, i));

      const total = await this.prisma.member.count({
        where: {
          orgId: this.orgId,
          joinedAt: { lte: periodEnd }
        }
      });

      const active = await this.prisma.member.count({
        where: {
          orgId: this.orgId,
          status: MemberStatus.ACTIVE,
          joinedAt: { lte: periodEnd }
        }
      });

      const newMembers = await this.prisma.member.count({
        where: {
          orgId: this.orgId,
          joinedAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });

      const churned = await this.prisma.member.count({
        where: {
          orgId: this.orgId,
          status: { in: [MemberStatus.EXPIRED, MemberStatus.CANCELLED] },
          updatedAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });

      trend.push({
        period: format(periodStart, 'yyyy-MM'),
        total,
        active,
        new: newMembers,
        churned
      });
    }

    return trend;
  }

  /**
   * Get member distribution by tier
   */
  async getMembersByTier(): Promise<Array<{
    tierId: string;
    tierName: string;
    memberCount: number;
    revenue: number;
  }>> {
    const distribution = await this.prisma.member.groupBy({
      by: ['membershipTier'],
      where: {
        orgId: this.orgId,
        status: MemberStatus.ACTIVE
      },
      _count: true
    });

    const result = await Promise.all(
      distribution.map(async (item) => {
        const tier = await this.prisma.membershipTier.findUnique({
          where: { id: item.membershipTier }
        });

        const price = tier ? parseFloat(tier.price.toString()) : 0;
        const period = tier?.billingPeriod.toUpperCase();

        // Normalize to MRR
        let monthlyRevenue = price;
        if (period === 'YEARLY') monthlyRevenue = price / 12;
        else if (period === 'QUARTERLY') monthlyRevenue = price / 3;

        return {
          tierId: item.membershipTier,
          tierName: tier?.name || 'Unknown',
          memberCount: item._count,
          revenue: parseFloat((monthlyRevenue * item._count).toFixed(2))
        };
      })
    );

    return result.sort((a, b) => b.memberCount - a.memberCount);
  }

  /**
   * Get top engaged members
   */
  async getTopEngagedMembers(limit: number = 10): Promise<any[]> {
    return this.prisma.engagementScore.findMany({
      where: { orgId: this.orgId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            tier: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { score: 'desc' },
      take: limit
    });
  }

  /**
   * Calculate average member lifetime value
   */
  async calculateAverageLTV(): Promise<number> {
    const members = await this.prisma.member.findMany({
      where: {
        orgId: this.orgId,
        status: { in: [MemberStatus.ACTIVE, MemberStatus.EXPIRED] }
      },
      include: {
        payments: {
          select: {
            amount: true
          }
        }
      }
    });

    if (members.length === 0) return 0;

    const totalRevenue = members.reduce((sum, member) => {
      const memberRevenue = member.payments.reduce(
        (pSum, payment) => pSum + parseFloat(payment.amount.toString()),
        0
      );
      return sum + memberRevenue;
    }, 0);

    return parseFloat((totalRevenue / members.length).toFixed(2));
  }
}
```

## Churn Prediction Service

```typescript
// services/churnPredictionService.ts
import { PrismaClient, ChurnPrediction } from '@prisma/client';
import { EngagementService } from './engagementService';
import { addDays } from 'date-fns';

export interface ChurnFactors {
  lowEngagement: boolean;
  noRecentLogin: boolean;
  noEventAttendance: boolean;
  expiringMembership: boolean;
  paymentFailures: boolean;
}

export class ChurnPredictionService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Predict churn risk for a member
   */
  async predictChurnRisk(memberId: string): Promise<ChurnPrediction> {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        orgId: this.orgId
      },
      include: {
        tier: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Get engagement score
    const engagementService = new EngagementService(this.prisma, this.orgId);
    let engagementScore;
    try {
      engagementScore = await this.prisma.engagementScore.findUnique({
        where: {
          memberId_orgId: {
            memberId,
            orgId: this.orgId
          }
        }
      });
    } catch {
      engagementScore = await engagementService.calculateEngagementScore(memberId);
    }

    // Analyze churn factors
    const factors = await this.analyzeChurnFactors(member, engagementScore);

    // Calculate risk score (0-1)
    const riskScore = this.calculateRiskScore(factors, engagementScore);

    // Determine risk level
    const churnRisk = this.getRiskLevel(riskScore);

    // Predict churn date if high risk
    const predictedDate = riskScore > 0.6 && member.expiresAt
      ? addDays(member.expiresAt, 30)
      : null;

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, member);

    // Upsert prediction
    const prediction = await this.prisma.churnPrediction.upsert({
      where: {
        memberId_orgId: {
          memberId,
          orgId: this.orgId
        }
      },
      update: {
        churnRisk,
        riskScore,
        factors,
        predictedDate,
        recommendations
      },
      create: {
        memberId,
        orgId: this.orgId,
        churnRisk,
        riskScore,
        factors,
        predictedDate,
        recommendations
      }
    });

    return prediction;
  }

  /**
   * Analyze factors contributing to churn risk
   */
  private async analyzeChurnFactors(member: any, engagementScore: any): Promise<ChurnFactors> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Check for low engagement
    const lowEngagement = engagementScore && engagementScore.score < 40;

    // Check for recent login
    const lastLogin = await this.prisma.memberActivity.findFirst({
      where: {
        memberId: member.id,
        activityType: 'LOGIN'
      },
      orderBy: { createdAt: 'desc' }
    });
    const noRecentLogin = !lastLogin || lastLogin.createdAt < thirtyDaysAgo;

    // Check for event attendance
    const recentEvents = await this.prisma.eventParticipation.count({
      where: {
        memberId: member.id,
        status: { in: ['ATTENDED', 'CHECKED_IN'] },
        registeredAt: { gte: thirtyDaysAgo }
      }
    });
    const noEventAttendance = recentEvents === 0;

    // Check if membership is expiring soon
    const expiringMembership = member.expiresAt &&
      member.expiresAt <= addDays(now, 30);

    // Check for payment failures
    const paymentFailures = await this.prisma.payment.count({
      where: {
        memberId: member.id,
        status: 'FAILED',
        createdAt: { gte: thirtyDaysAgo }
      }
    }) > 0;

    return {
      lowEngagement,
      noRecentLogin,
      noEventAttendance,
      expiringMembership,
      paymentFailures
    };
  }

  /**
   * Calculate risk score based on factors
   */
  private calculateRiskScore(factors: ChurnFactors, engagementScore: any): number {
    let score = 0;

    // Weight each factor
    if (factors.lowEngagement) score += 0.3;
    if (factors.noRecentLogin) score += 0.2;
    if (factors.noEventAttendance) score += 0.15;
    if (factors.expiringMembership) score += 0.25;
    if (factors.paymentFailures) score += 0.1;

    // Adjust based on engagement score
    if (engagementScore) {
      const engagementFactor = (100 - engagementScore.score) / 100;
      score = (score + engagementFactor) / 2;
    }

    return Math.min(score, 1);
  }

  /**
   * Determine risk level from score
   */
  private getRiskLevel(score: number): string {
    if (score >= 0.75) return 'CRITICAL';
    if (score >= 0.5) return 'HIGH';
    if (score >= 0.25) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate recommendations to reduce churn
   */
  private generateRecommendations(factors: ChurnFactors, member: any): any {
    const recommendations = [];

    if (factors.lowEngagement) {
      recommendations.push({
        type: 'ENGAGEMENT',
        action: 'Send personalized engagement campaign',
        priority: 'HIGH'
      });
    }

    if (factors.noRecentLogin) {
      recommendations.push({
        type: 'REENGAGEMENT',
        action: 'Send "We miss you" email with value proposition',
        priority: 'MEDIUM'
      });
    }

    if (factors.noEventAttendance) {
      recommendations.push({
        type: 'EVENTS',
        action: 'Invite to upcoming events matching interests',
        priority: 'MEDIUM'
      });
    }

    if (factors.expiringMembership) {
      recommendations.push({
        type: 'RENEWAL',
        action: 'Send renewal reminder with benefits highlight',
        priority: 'CRITICAL'
      });
    }

    if (factors.paymentFailures) {
      recommendations.push({
        type: 'PAYMENT',
        action: 'Contact for payment method update',
        priority: 'HIGH'
      });
    }

    return recommendations;
  }

  /**
   * Get all high-risk members
   */
  async getHighRiskMembers(): Promise<ChurnPrediction[]> {
    return this.prisma.churnPrediction.findMany({
      where: {
        orgId: this.orgId,
        churnRisk: { in: ['HIGH', 'CRITICAL'] }
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            expiresAt: true,
            tier: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { riskScore: 'desc' }
    });
  }

  /**
   * Bulk predict churn for all active members
   */
  async predictAllMembers(): Promise<void> {
    const members = await this.prisma.member.findMany({
      where: {
        orgId: this.orgId,
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    for (const member of members) {
      await this.predictChurnRisk(member.id);
    }
  }
}
```

## Cohort Analysis Service

```typescript
// services/cohortAnalysisService.ts
import { PrismaClient } from '@prisma/client';
import { startOfMonth, format, differenceInMonths } from 'date-fns';

export class CohortAnalysisService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Analyze cohort retention by join month
   */
  async analyzeJoinDateCohorts(): Promise<any[]> {
    const members = await this.prisma.member.findMany({
      where: { orgId: this.orgId },
      select: {
        id: true,
        joinedAt: true,
        status: true,
        tier: {
          select: {
            price: true,
            billingPeriod: true
          }
        }
      }
    });

    // Group by join month
    const cohorts: Map<string, any[]> = new Map();

    members.forEach(member => {
      const cohortKey = format(startOfMonth(member.joinedAt), 'yyyy-MM');
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }
      cohorts.get(cohortKey)!.push(member);
    });

    // Analyze each cohort
    const analyses = [];
    const now = new Date();

    for (const [cohortKey, cohortMembers] of cohorts.entries()) {
      const cohortStart = new Date(cohortKey + '-01');
      const monthsElapsed = differenceInMonths(now, cohortStart);

      // Calculate retention for each month
      const retentionData: any[] = [];

      for (let month = 0; month <= monthsElapsed; month++) {
        const activeCount = cohortMembers.filter(
          m => m.status === 'ACTIVE'
        ).length;

        const retentionRate = (activeCount / cohortMembers.length) * 100;

        retentionData.push({
          month,
          active: activeCount,
          total: cohortMembers.length,
          retentionRate: parseFloat(retentionRate.toFixed(2))
        });
      }

      // Calculate cohort revenue
      const revenue = cohortMembers.reduce((sum, member) => {
        const price = parseFloat(member.tier.price.toString());
        return sum + price;
      }, 0);

      analyses.push({
        cohort: cohortKey,
        memberCount: cohortMembers.length,
        retentionData,
        totalRevenue: parseFloat(revenue.toFixed(2))
      });
    }

    return analyses.sort((a, b) => b.cohort.localeCompare(a.cohort));
  }
}
```

## API Routes for Analytics

```typescript
// routes/analytics.ts
import { Router } from 'express';
import { tenantMiddleware } from '../middleware/tenantContext';
import { AnalyticsRepository } from '../repositories/analyticsRepository';
import { ChurnPredictionService } from '../services/churnPredictionService';
import { CohortAnalysisService } from '../services/cohortAnalysisService';

const router = Router();
router.use(tenantMiddleware);

/**
 * GET /api/analytics/metrics - Get current metrics summary
 */
router.get('/metrics', async (req, res) => {
  try {
    const repo = new AnalyticsRepository(prisma, req.tenant.orgId);
    const metrics = await repo.getCurrentMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/growth - Get growth trend
 */
router.get('/growth', async (req, res) => {
  try {
    const months = parseInt(req.query.months as string) || 12;
    const repo = new AnalyticsRepository(prisma, req.tenant.orgId);
    const trend = await repo.getGrowthTrend(months);

    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/churn - Get churn predictions
 */
router.get('/churn', async (req, res) => {
  try {
    const service = new ChurnPredictionService(prisma, req.tenant.orgId);
    const predictions = await service.getHighRiskMembers();

    res.json({
      success: true,
      data: predictions,
      count: predictions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/cohorts - Get cohort analysis
 */
router.get('/cohorts', async (req, res) => {
  try {
    const service = new CohortAnalysisService(prisma, req.tenant.orgId);
    const cohorts = await service.analyzeJoinDateCohorts();

    res.json({
      success: true,
      data: cohorts
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

1. **Cache expensive calculations** - Store daily/monthly metrics in database
2. **Use database aggregations** - Leverage SQL GROUP BY for performance
3. **Schedule batch jobs** - Run churn predictions and cohort analysis nightly
4. **Index date fields** - Add indexes on joinedAt, expiresAt, createdAt
5. **Normalize time periods** - Always use consistent date boundaries
6. **Track trends over time** - Store historical metrics for comparison
7. **Segment by tier** - Analyze each membership tier separately
8. **Monitor data quality** - Validate metrics for accuracy

## Collaboration Points

- Works with **membership-specialist** for member data
- Coordinates with **member-engagement-agent** for engagement scores
- Provides data to **directory-manager** for member insights
- Integrates with **stripe-integration-specialist** for revenue metrics
- Collaborates with **reporting-service** for dashboard generation
- Supports **retention-specialist** with churn predictions
