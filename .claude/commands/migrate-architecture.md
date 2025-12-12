# Architecture Migration

Plan and execute major architecture migrations with zero downtime, including monolith-to-microservices, database migrations, cloud migrations, and technology stack changes.

## Purpose

Safely plan and execute complex architecture migrations with minimal risk, zero downtime, comprehensive rollback strategies, and data consistency guarantees through strategic migration patterns and phased execution.

## Multi-Agent Coordination Strategy

Uses **phased migration pattern** with blue-green, canary, and strangler fig patterns coordinated across planning, execution, validation, and rollback phases.

### Migration Architecture
\`\`\`
┌──────────────────────────────────────────────────┐
│       Migration Command Center                    │
│       (migration-orchestrator)                    │
└────────────┬─────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┬────────┬─────────┐
    ▼        ▼        ▼        ▼        ▼         ▼
  Plan    Build    Test    Deploy   Monitor  Rollback
\`\`\`

## Execution Flow

### Phase 1: Migration Assessment (0-30 mins)
1. **migration-strategist** - Assess migration complexity and strategy
2. **architecture-analyzer** - Analyze current architecture
3. **dependency-mapper** - Map all dependencies and integrations
4. **data-flow-analyzer** - Analyze data flows and ownership
5. **risk-assessor** - Identify migration risks
6. **stakeholder-impact-analyzer** - Assess business impact

### Phase 2: Migration Planning (30-75 mins)
7. **migration-pattern-selector** - Select migration pattern (strangler, blue-green, etc.)
8. **phase-planner** - Design phased migration approach
9. **rollback-strategist** - Plan rollback procedures for each phase
10. **data-migration-planner** - Design data migration strategy
11. **testing-strategist** - Plan migration testing approach
12. **communication-planner** - Stakeholder communication plan

### Phase 3: Architecture Design (75-120 mins)
13. **target-architect** - Design target architecture
14. **api-compatibility-designer** - Design backward-compatible APIs
15. **data-schema-designer** - Design target data schema
16. **integration-architect** - Design integration patterns
17. **security-architect** - Design security model for target
18. **observability-designer** - Design monitoring and logging

### Phase 4: Migration Infrastructure (120-165 mins)
19. **dual-write-implementer** - Implement dual-write pattern
20. **feature-flag-engineer** - Build feature flag infrastructure
21. **canary-deployer** - Set up canary deployment infrastructure
22. **traffic-router-builder** - Build intelligent traffic routing
23. **data-sync-engineer** - Implement data synchronization
24. **rollback-automator** - Build automated rollback mechanisms

### Phase 5: Migration Execution (165-210 mins)
25. **migration-executor** - Execute migration phases
26. **traffic-shifter** - Gradual traffic shifting (1% → 10% → 50% → 100%)
27. **data-migrator** - Execute data migration
28. **consistency-validator** - Validate data consistency
29. **performance-monitor** - Monitor performance metrics
30. **error-rate-monitor** - Track error rates and anomalies

### Phase 6: Validation & Testing (210-255 mins)
31. **functional-tester** - Functional testing on new architecture
32. **integration-tester** - Integration testing
33. **performance-tester** - Performance comparison testing
34. **chaos-tester** - Resilience testing of new architecture
35. **user-acceptance-tester** - UAT coordination
36. **data-integrity-validator** - Data integrity verification

### Phase 7: Cutover & Completion (255-285 mins)
37. **cutover-coordinator** - Coordinate final cutover
38. **legacy-decommissioner** - Plan legacy system decommissioning
39. **documentation-updater** - Update all documentation
40. **runbook-creator** - Create operational runbooks
41. **migration-orchestrator** - Final validation and sign-off

## Agent Coordination Layers

### Strategic Planning Layer
- **migration-strategist**: Overall migration strategy
- **architecture-analyzer**: Current state analysis
- **target-architect**: Future state design
- **risk-assessor**: Risk management
- **phase-planner**: Phased execution planning

### Technical Implementation Layer
- **dual-write-implementer**: Data synchronization
- **feature-flag-engineer**: Feature toggles
- **canary-deployer**: Gradual rollout
- **traffic-router-builder**: Traffic management
- **data-migrator**: Data movement

### Validation & Quality Layer
- **functional-tester**: Functional correctness
- **performance-tester**: Performance validation
- **consistency-validator**: Data consistency
- **integration-tester**: Integration validation
- **chaos-tester**: Resilience validation

### Operations & Monitoring Layer
- **performance-monitor**: Real-time metrics
- **error-rate-monitor**: Error tracking
- **rollback-automator**: Automated rollback
- **observability-designer**: Monitoring setup

## Usage Examples

### Example 1: Monolith to Microservices
\`\`\`
/migrate-architecture Migrate PHP monolith to Node.js microservices:
- Current: LAMP stack monolith (500K LOC, 15 years old)
- Target: Node.js microservices on Kubernetes
- Database: MySQL → PostgreSQL + MongoDB
- Pattern: Strangler fig pattern
- Timeline: 12-month gradual migration
- Constraint: Zero downtime, maintain all features
\`\`\`

### Example 2: Database Migration
\`\`\`
/migrate-architecture Migrate from MongoDB to PostgreSQL:
- Current: MongoDB 4.4 (5TB data, 10M documents)
- Target: PostgreSQL 14 with JSON support
- Data: User profiles, transactions, analytics
- Constraint: <5 minute cutover window, zero data loss
- Strategy: Dual-write with consistency validation
- Rollback: Automated rollback within 60 seconds
\`\`\`

### Example 3: Cloud Migration (Lift & Shift)
\`\`\`
/migrate-architecture Migrate on-premises to AWS:
- Current: On-prem data center (200+ VMs)
- Target: AWS (EC2, RDS, S3, CloudFront)
- Apps: Java Spring Boot, .NET Core, Python Flask
- Strategy: Phased migration by application
- Timeline: 6 months
- Constraint: 99.9% uptime SLA maintained
\`\`\`

### Example 4: Serverless Migration
\`\`\`
/migrate-architecture Migrate REST API to serverless:
- Current: Node.js Express on EC2 (10 instances)
- Target: AWS Lambda + API Gateway
- Database: RDS PostgreSQL (keep as-is)
- Benefit: 70% cost reduction, auto-scaling
- Strategy: Canary deployment per endpoint
- Rollback: Instant DNS failback to EC2
\`\`\`

### Example 5: Event-Driven Architecture Migration
\`\`\`
/migrate-architecture Migrate from REST to event-driven:
- Current: Synchronous REST microservices
- Target: Event-driven with Kafka
- Pattern: Dual-write events + sync calls, gradually remove sync
- Services: 30 microservices
- Timeline: 9 months
- Constraint: Maintain backward compatibility
\`\`\`

### Example 6: Multi-Tenancy Migration
\`\`\`
/migrate-architecture Migrate from single-tenant to multi-tenant:
- Current: Separate database per customer (500 customers)
- Target: Shared database with tenant isolation
- Data: 2TB total, 4GB average per tenant
- Strategy: Gradual tenant migration, smallest first
- Constraint: Zero customer impact, transparent migration
\`\`\`

## Expected Outputs

### 1. Migration Strategy Document
- Selected migration pattern (strangler, blue-green, canary)
- High-level migration phases
- Timeline with milestones
- Success criteria for each phase
- Go/no-go decision criteria

### 2. Current State Analysis
- Current architecture diagrams
- Technology stack inventory
- Dependency map
- Data flow diagrams
- Performance baseline
- Pain points and technical debt

### 3. Target Architecture Design
- Target architecture diagrams
- Technology stack decisions
- Service boundaries (for microservices)
- Data model design
- API design (versioning strategy)
- Security architecture
- Observability architecture

### 4. Migration Phases Plan
- Detailed phase-by-phase plan
- Dependencies between phases
- Traffic shifting strategy (1% → 5% → 25% → 50% → 100%)
- Data migration approach
- Feature flag strategy
- Rollback plan for each phase

### 5. Data Migration Strategy
- Data mapping (source → target)
- Data transformation logic
- Dual-write implementation
- Data consistency validation
- Cutover approach (downtime vs. zero-downtime)
- Data reconciliation procedures

### 6. Risk Assessment & Mitigation
- Identified risks with likelihood/impact
- Mitigation strategies
- Rollback triggers and procedures
- Contingency plans
- Communication escalation

### 7. Testing Strategy
- Unit testing approach
- Integration testing
- End-to-end testing
- Performance testing (baseline comparison)
- Chaos engineering tests
- User acceptance testing

### 8. Deployment & Rollout Plan
- Infrastructure provisioning
- CI/CD pipeline changes
- Deployment automation
- Canary deployment configuration
- Traffic routing rules
- Feature flag configuration

### 9. Rollback Procedures
- Automated rollback triggers
- Manual rollback procedures
- Data rollback strategy
- Communication during rollback
- Rollback testing validation

### 10. Monitoring & Observability
- Key metrics to monitor
- Alert configuration
- Dashboard setup
- Log aggregation
- Distributed tracing
- SLI/SLO definitions

### 11. Operational Runbooks
- Day 1 operations guide
- Incident response procedures
- Troubleshooting guides
- Performance tuning guide
- Disaster recovery procedures

### 12. Migration Execution Report
- Phase completion status
- Metrics comparison (before/after)
- Issues encountered and resolutions
- Lessons learned
- Recommendations for future migrations

## Success Criteria

- ✅ Zero downtime during migration (or within agreed maintenance window)
- ✅ No data loss or corruption
- ✅ Data consistency validated (source vs. target)
- ✅ Performance maintained or improved
- ✅ Error rates within acceptable thresholds
- ✅ All functional tests passing
- ✅ Integration tests passing
- ✅ User acceptance testing approved
- ✅ Rollback procedures tested and validated
- ✅ Monitoring and alerting operational
- ✅ Runbooks completed and validated
- ✅ Legacy system successfully decommissioned
- ✅ Stakeholder sign-off obtained

## Migration Patterns

### 1. Strangler Fig Pattern
- Gradually replace legacy system functionality
- New functionality routes to new system
- Legacy functionality routes to old system
- Incrementally migrate legacy features
- Eventually "strangle" the old system

### 2. Blue-Green Deployment
- Maintain two identical production environments
- Route traffic to blue (current) environment
- Deploy to green (new) environment
- Validate green environment
- Switch traffic to green
- Keep blue as rollback option

### 3. Canary Deployment
- Deploy new version to small subset of users (1-5%)
- Monitor metrics and error rates
- Gradually increase traffic (10% → 25% → 50% → 100%)
- Rollback if metrics degrade
- Full rollout once validated

### 4. Database Migration Patterns
- **Dual Write**: Write to both old and new databases
- **Read from Old, Write to Both**: Gradual migration
- **Read from New, Write to Both**: Validation phase
- **Read from New, Write to New**: Complete migration

### 5. API Versioning Patterns
- **URI Versioning**: `/v1/users`, `/v2/users`
- **Header Versioning**: `Accept: application/vnd.api.v2+json`
- **Gradual Deprecation**: Maintain old versions during migration

## Risk Mitigation Strategies

### Technical Risks
- **Data Loss**: Dual-write, checksums, reconciliation
- **Performance Degradation**: Load testing, canary deployment
- **Integration Failures**: Comprehensive integration testing
- **Schema Incompatibilities**: Backward-compatible changes

### Operational Risks
- **Rollback Complexity**: Automated rollback, tested procedures
- **Monitoring Gaps**: Comprehensive observability before migration
- **Skill Gaps**: Training, documentation, runbooks

### Business Risks
- **Customer Impact**: Gradual rollout, transparent migration
- **Revenue Loss**: Validation gates, error budgets
- **Compliance Issues**: Security review, compliance validation

## Estimated Execution Time

- **Simple Migration** (e.g., single service): 4-8 hours
- **Medium Migration** (e.g., database migration): 1-2 days
- **Complex Migration** (e.g., monolith to microservices - planning): 8-16 hours
- **Enterprise Migration** (complete plan): 3-5 days of planning

Note: Actual migration execution may take weeks to months depending on complexity, done in phases.

## Migration Metrics to Track

### Performance Metrics
- Response time (p50, p95, p99)
- Throughput (requests per second)
- Error rates
- Resource utilization (CPU, memory, network)

### Business Metrics
- User engagement (before/after)
- Conversion rates
- Revenue impact
- Customer satisfaction (NPS)

### Operational Metrics
- Deployment frequency
- Mean time to recovery (MTTR)
- Change failure rate
- Lead time for changes

### Data Metrics
- Data consistency rate
- Replication lag
- Data migration progress
- Data loss incidents

## Notes

- Migration is a journey, not a destination; plan for continuous improvement
- Always have a tested rollback plan before starting migration
- Communicate extensively with stakeholders throughout migration
- Automate as much as possible to reduce human error
- Monitor continuously during migration with real-time alerts
- Use feature flags to control migration scope and enable instant rollback
- Test rollback procedures as thoroughly as forward migration
- Document everything, especially "gotchas" and workarounds
- Consider hiring migration specialists for complex migrations
- Budget 20-30% more time than estimated for unexpected issues
- Celebrate small wins to maintain team morale during long migrations
