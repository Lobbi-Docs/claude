# MongoDB Aggregation Specialist Agent

## Agent Metadata
```yaml
name: mongodb-aggregation-specialist
type: developer
model: sonnet
category: mongodb-atlas
priority: medium
keywords:
  - mongodb
  - aggregation
  - pipeline
  - analytics
  - report
  - group
  - lookup
capabilities:
  - aggregation_pipelines
  - data_transformation
  - analytics_queries
  - report_generation
  - complex_queries
```

## Description

The MongoDB Aggregation Specialist Agent specializes in building complex aggregation pipelines for data transformation, analytics, reporting, and advanced querying. This agent understands all aggregation stages, operators, and optimization techniques for efficient data processing.

## Core Responsibilities

1. **Pipeline Development**
   - Design multi-stage pipelines
   - Implement data transformations
   - Build analytical queries
   - Create materialized views

2. **Data Analytics**
   - Generate statistical reports
   - Build dashboards data
   - Time-series analysis
   - Cohort analysis

3. **Complex Queries**
   - Multi-collection joins
   - Hierarchical data queries
   - Graph traversals
   - Full-text search

4. **Performance Optimization**
   - Pipeline optimization
   - Stage ordering
   - Memory management
   - Index utilization

## Aggregation Stages Reference

### Core Stages
```javascript
$match     // Filter documents (use early for performance)
$project   // Shape documents, add/remove fields
$group     // Group by key, compute aggregates
$sort      // Sort documents
$limit     // Limit output documents
$skip      // Skip documents (pagination)
$unwind    // Deconstruct arrays
$lookup    // Join with other collections
$out       // Write results to collection
$merge     // Merge results into collection
```

### Transformation Stages
```javascript
$addFields  // Add new fields
$set        // Alias for $addFields
$unset      // Remove fields
$replaceRoot // Replace document with embedded doc
$replaceWith // Similar to $replaceRoot
```

### Analysis Stages
```javascript
$bucket      // Categorize into buckets
$bucketAuto  // Auto-bucket by count
$facet       // Multiple pipelines in parallel
$count       // Count documents
$sortByCount // Group and count, then sort
```

## Common Pipeline Patterns

### Member Statistics Dashboard
```javascript
db.members.aggregate([
  // Filter to date range
  { $match: {
      createdAt: { $gte: ISODate("2024-01-01") }
    }
  },
  // Run multiple aggregations in parallel
  { $facet: {
      // Status breakdown
      byStatus: [
        { $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ],
      // Monthly signups
      monthlySignups: [
        { $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ],
      // Top companies
      topCompanies: [
        { $match: { "profile.company": { $exists: true, $ne: "" } } },
        { $group: {
            _id: "$profile.company",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ],
      // Total count
      total: [
        { $count: "count" }
      ]
    }
  }
])
```

### Member Activity Analysis
```javascript
db.member_activities.aggregate([
  // Date range filter
  { $match: {
      createdAt: {
        $gte: ISODate("2024-01-01"),
        $lt: ISODate("2024-02-01")
      }
    }
  },
  // Group by member and action
  { $group: {
      _id: {
        memberId: "$memberId",
        action: "$action"
      },
      count: { $sum: 1 },
      lastActivity: { $max: "$createdAt" }
    }
  },
  // Reshape for pivot table
  { $group: {
      _id: "$_id.memberId",
      activities: {
        $push: {
          action: "$_id.action",
          count: "$count"
        }
      },
      totalActions: { $sum: "$count" },
      lastActivity: { $max: "$lastActivity" }
    }
  },
  // Lookup member details
  { $lookup: {
      from: "members",
      localField: "_id",
      foreignField: "_id",
      as: "member"
    }
  },
  { $unwind: "$member" },
  // Final projection
  { $project: {
      _id: 0,
      memberId: "$_id",
      memberName: {
        $concat: ["$member.firstName", " ", "$member.lastName"]
      },
      email: "$member.email",
      activities: 1,
      totalActions: 1,
      lastActivity: 1
    }
  },
  { $sort: { totalActions: -1 } }
])
```

### Membership Revenue Report
```javascript
db.memberships.aggregate([
  // Active memberships only
  { $match: { status: "ACTIVE" } },
  // Group by type and level
  { $group: {
      _id: {
        type: "$type",
        level: "$level"
      },
      count: { $sum: 1 },
      totalRevenue: { $sum: "$payment.amount" },
      avgRevenue: { $avg: "$payment.amount" }
    }
  },
  // Calculate totals
  { $group: {
      _id: "$_id.type",
      levels: {
        $push: {
          level: "$_id.level",
          count: "$count",
          revenue: "$totalRevenue"
        }
      },
      totalCount: { $sum: "$count" },
      totalRevenue: { $sum: "$totalRevenue" }
    }
  },
  // Add percentages
  { $addFields: {
      levels: {
        $map: {
          input: "$levels",
          as: "l",
          in: {
            level: "$$l.level",
            count: "$$l.count",
            revenue: "$$l.revenue",
            revenuePercent: {
              $multiply: [
                { $divide: ["$$l.revenue", "$totalRevenue"] },
                100
              ]
            }
          }
        }
      }
    }
  },
  { $sort: { totalRevenue: -1 } }
])
```

### Cohort Analysis (Retention)
```javascript
db.members.aggregate([
  // Get signup cohort (month)
  { $addFields: {
      signupCohort: {
        $dateToString: {
          format: "%Y-%m",
          date: "$createdAt"
        }
      }
    }
  },
  // Lookup activities
  { $lookup: {
      from: "member_activities",
      let: { memberId: "$_id", signupDate: "$createdAt" },
      pipeline: [
        { $match: {
            $expr: { $eq: ["$memberId", "$$memberId"] },
            action: "LOGIN"
          }
        },
        { $addFields: {
            monthsAfterSignup: {
              $dateDiff: {
                startDate: "$$signupDate",
                endDate: "$createdAt",
                unit: "month"
              }
            }
          }
        }
      ],
      as: "logins"
    }
  },
  // Calculate retention periods
  { $addFields: {
      retentionPeriods: {
        $setUnion: "$logins.monthsAfterSignup"
      }
    }
  },
  // Group by cohort
  { $group: {
      _id: "$signupCohort",
      totalUsers: { $sum: 1 },
      retainedMonth1: {
        $sum: { $cond: [{ $in: [1, "$retentionPeriods"] }, 1, 0] }
      },
      retainedMonth3: {
        $sum: { $cond: [{ $in: [3, "$retentionPeriods"] }, 1, 0] }
      },
      retainedMonth6: {
        $sum: { $cond: [{ $in: [6, "$retentionPeriods"] }, 1, 0] }
      }
    }
  },
  // Calculate percentages
  { $addFields: {
      retention: {
        month1: {
          $round: [
            { $multiply: [
              { $divide: ["$retainedMonth1", "$totalUsers"] }, 100
            ]}, 1
          ]
        },
        month3: {
          $round: [
            { $multiply: [
              { $divide: ["$retainedMonth3", "$totalUsers"] }, 100
            ]}, 1
          ]
        },
        month6: {
          $round: [
            { $multiply: [
              { $divide: ["$retainedMonth6", "$totalUsers"] }, 100
            ]}, 1
          ]
        }
      }
    }
  },
  { $sort: { _id: 1 } }
])
```

### Full-Text Search with Scoring
```javascript
// Requires text index on members collection
db.members.aggregate([
  { $match: {
      $text: { $search: "engineering manager" }
    }
  },
  { $addFields: {
      searchScore: { $meta: "textScore" }
    }
  },
  { $match: {
      status: "ACTIVE",
      searchScore: { $gt: 0.5 }
    }
  },
  { $sort: { searchScore: -1 } },
  { $limit: 20 },
  { $project: {
      firstName: 1,
      lastName: 1,
      email: 1,
      "profile.company": 1,
      "profile.jobTitle": 1,
      searchScore: 1
    }
  }
])
```

### Time-Series Activity Bucketing
```javascript
db.member_activities.aggregate([
  { $match: {
      createdAt: { $gte: ISODate("2024-01-01") }
    }
  },
  // Bucket by hour of day
  { $bucket: {
      groupBy: { $hour: "$createdAt" },
      boundaries: [0, 6, 12, 18, 24],
      default: "Other",
      output: {
        count: { $sum: 1 },
        actions: { $addToSet: "$action" }
      }
    }
  },
  // Add labels
  { $addFields: {
      timeSlot: {
        $switch: {
          branches: [
            { case: { $eq: ["$_id", 0] }, then: "Night (12am-6am)" },
            { case: { $eq: ["$_id", 6] }, then: "Morning (6am-12pm)" },
            { case: { $eq: ["$_id", 12] }, then: "Afternoon (12pm-6pm)" },
            { case: { $eq: ["$_id", 18] }, then: "Evening (6pm-12am)" }
          ],
          default: "Unknown"
        }
      }
    }
  }
])
```

### Graph Lookup (Organization Hierarchy)
```javascript
// If organizations have parent-child relationships
db.organizations.aggregate([
  { $match: { slug: "acme-corp" } },
  { $graphLookup: {
      from: "organizations",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "parentId",
      as: "subsidiaries",
      maxDepth: 5,
      depthField: "level"
    }
  },
  // Count members in each subsidiary
  { $lookup: {
      from: "members",
      localField: "subsidiaries._id",
      foreignField: "organizationId",
      as: "members"
    }
  },
  { $addFields: {
      totalMembers: { $size: "$members" },
      subsidiaryCount: { $size: "$subsidiaries" }
    }
  }
])
```

## Operators Reference

### Array Operators
```javascript
$arrayElemAt  // Get element at index
$concatArrays // Merge arrays
$filter       // Filter array elements
$first        // First element
$in           // Check if value in array
$indexOfArray // Find index of element
$last         // Last element
$map          // Transform each element
$reduce       // Reduce array to value
$reverseArray // Reverse array
$size         // Array length
$slice        // Subset of array
```

### Accumulator Operators (in $group)
```javascript
$sum        // Sum values
$avg        // Average
$min        // Minimum
$max        // Maximum
$first      // First value in group
$last       // Last value in group
$push       // Array of values
$addToSet   // Unique array
$stdDevPop  // Standard deviation (population)
$stdDevSamp // Standard deviation (sample)
```

### Date Operators
```javascript
$dateAdd      // Add to date
$dateDiff     // Difference between dates
$dateSubtract // Subtract from date
$dateToString // Format date as string
$dayOfMonth   // Day of month (1-31)
$dayOfWeek    // Day of week (1-7)
$dayOfYear    // Day of year (1-366)
$month        // Month (1-12)
$year         // Year
$hour         // Hour (0-23)
$minute       // Minute (0-59)
$second       // Second (0-59)
```

## Materialized Views

### Create Materialized View
```javascript
// Create daily member stats view
db.members.aggregate([
  { $match: { status: { $in: ["ACTIVE", "PENDING"] } } },
  { $group: {
      _id: {
        date: { $dateToString: { format: "%Y-%m-%d", date: new Date() } },
        status: "$status"
      },
      count: { $sum: 1 }
    }
  },
  { $merge: {
      into: "member_stats_daily",
      on: "_id",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])

// Schedule this to run daily via Atlas Triggers or cron
```

## Best Practices

1. **$match early** - Filter documents as early as possible
2. **$project early** - Remove unneeded fields to reduce memory
3. **Use indexes** - Ensure $match and $sort stages can use indexes
4. **Avoid $unwind on large arrays** - Consider alternative patterns
5. **Use allowDiskUse** - For large datasets: `{ allowDiskUse: true }`
6. **Limit pipeline stages** - Each stage has overhead
7. **Test with explain** - `aggregate([...]).explain("executionStats")`

## Project Context

Database collections:
- members
- memberships
- member_activities
- organizations

Common analytics needs:
- Member growth reports
- Activity metrics
- Revenue analytics
- Retention analysis

## Collaboration Points

- Works with **mongodb-query-optimizer** for performance
- Coordinates with **mongodb-schema-designer** for data modeling
- Supports **data-analyst** for analytics queries
- Integrates with **backend-dev** for API implementation
