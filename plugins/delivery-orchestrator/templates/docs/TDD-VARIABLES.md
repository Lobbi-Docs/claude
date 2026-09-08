# TDD Template - Variable Reference Guide

## Quick Start

This guide maps all template variables in `tdd.md.template` to their purpose and context.

## Document Metadata Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{TITLE}}` | Document title | "Order Processing Service Design" |
| `{{STATUS}}` | Document status | "draft", "review", "approved" |
| `{{STATUS_COLOR}}` | Badge color | "yellow", "blue", "green" |
| `{{AUTHOR}}` | Document author | "John Smith" |
| `{{DATE}}` | Creation date | "2026-01-03" |
| `{{JIRA_KEY}}` | Related Jira issue | "PROJ-123" |
| `{{VERSION}}` | Document version | "1.0.0" |
| `{{LAST_UPDATED}}` | Last modification date | "2026-01-03" |
| `{{REVIEWERS}}` | Reviewer names | "Alice, Bob, Carol" |

## Overview Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{PURPOSE_DESCRIPTION}}` | Why this design exists | "Describes the microservice architecture..." |
| `{{GOAL_1}}, {{GOAL_2}}, {{GOAL_3}}` | Design objectives | "Achieve 99.99% uptime" |
| `{{NON_GOAL_1}}, {{NON_GOAL_2}}` | Out of scope | "Database migration" |

## Requirements Variables

### Functional Requirements (FR)

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{FUNCTIONAL_REQ_1}}` | Feature requirement | "Process orders within 5 seconds" |
| `{{NOTES_1}}` | Additional context | "Critical path operation" |

### Non-Functional Requirements (NFR)

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{PERF_REQ}}` | Performance requirement | "Sub-second response time" |
| `{{PERF_METRIC}}` | Measurement target | "P99 latency < 1000ms" |
| `{{SCALE_REQ}}` | Scalability needs | "Handle 100k concurrent users" |
| `{{SCALE_METRIC}}` | Scale target | "10x growth without redesign" |
| `{{AVAIL_REQ}}` | Availability needs | "24/7 uptime" |
| `{{AVAIL_METRIC}}` | Availability target | "99.99% SLA" |
| `{{SEC_REQ}}` | Security requirement | "Encrypt PII at rest" |
| `{{SEC_METRIC}}` | Security target | "SOC2 Type II certified" |
| `{{MAINT_REQ}}` | Maintainability | "Code coverage >= 80%" |
| `{{MAINT_METRIC}}` | Maintenance target | "All modules documented" |

## Architecture - Context Diagram Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{SERVICE_NAME}}` | Primary system | "Order Service" |
| `{{SERVICE_DESCRIPTION}}` | System description | "Manages order lifecycle" |
| `{{USER_TYPE_1}}` | User/actor type | "Mobile App" |
| `{{USER_DESC_1}}` | User description | "Customer mobile application" |
| `{{EXTERNAL_SYSTEM_1}}` | External service | "Payment Gateway" |
| `{{EXT_DESC_1}}` | External service description | "Processes credit card payments" |
| `{{EXTERNAL_SYSTEM_2}}` | Another external service | "Notification Service" |
| `{{EXT_DESC_2}}` | Another external description | "Sends SMS and email alerts" |
| `{{AUTH_SYSTEM}}` | Authentication service | "OAuth 2.0 Provider" |
| `{{AUTH_DESC}}` | Auth description | "Handles user authentication" |
| `{{INTERACTION_1}}` | User to system interaction | "Create Order" |
| `{{INTERACTION_2}}` | System to external interaction | "Process Payment" |
| `{{INTERACTION_3}}` | Another interaction | "Validate Address" |
| `{{INTERACTION_4}}` | Auth interaction | "Verify JWT Token" |
| `{{CONTEXT_DIAGRAM_DESCRIPTION}}` | Diagram explanation | "Shows all external dependencies..." |

## Architecture - System Components Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{COMPONENT_1_NAME}}` | Component name | "API Gateway" |
| `{{COMPONENT_1_RESPONSIBILITY}}` | What it does | "Routes requests to services" |
| `{{COMPONENT_1_TECH}}` | Technology used | "Kong 2.8, Nginx" |
| `{{INTERFACE_1}}` | Public interface | "REST API on port 8000" |
| `{{INTERFACE_2}}` | Another interface | "Health check endpoint" |

## Architecture - Data Flow Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{DATA_SOURCE}}` | Where data originates | "Apache Kafka Topic" |
| `{{SOURCE_TYPE}}` | Source type | "Event Stream" |
| `{{PROCESSOR_1}}` | First processing step | "JSON Validator" |
| `{{PROCESSOR_2}}` | Second processing step | "Schema Transformer" |
| `{{PROCESSOR_3}}` | Third processing step | "Data Enricher" |
| `{{STORAGE_1}}` | Primary database | "PostgreSQL" |
| `{{STORAGE_TYPE_1}}` | Database type | "Relational DB" |
| `{{CACHE_SYSTEM}}` | Cache layer | "Redis" |
| `{{CACHE_TYPE}}` | Cache type | "In-memory Store" |
| `{{DATA_CONSUMER}}` | Data destination | "Analytics Dashboard" |
| `{{CONSUMER_TYPE}}` | Consumer type | "Web Application" |
| `{{FLOW_1}}`, `{{FLOW_2}}`, `{{FLOW_3}}` | Data movement descriptions | "Validated data", "Enriched data" |
| `{{DATA_FLOW_DESCRIPTION}}` | Overall flow explanation | "Events flow from Kafka..." |
| `{{TRANSFORM_RULE_1}}` | Transformation logic | "Convert timestamps to UTC" |
| `{{TRANSFORM_RULE_2}}` | Another rule | "Aggregate by user_id" |

## Architecture - Data Model Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{DATA_MODEL_SCHEMA}}` | YAML schema definition | YAML structure of data |
| `{{ENTITY_1}}` | First entity | "User" |
| `{{ENTITY_1_DESCRIPTION}}` | Entity description | "Represents a customer" |
| `{{ENTITY_2}}` | Second entity | "Order" |
| `{{ENTITY_2_DESCRIPTION}}` | Another description | "Customer purchase record" |
| `{{ENTITY_3}}` | Third entity | "Product" |
| `{{ENTITY_3_DESCRIPTION}}` | Third description | "Item available for purchase" |

## Architecture - Entity Relationship Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{ENTITY_X_PK}}` | Primary key field | "user_id" |
| `{{ENTITY_X_FK}}` | Foreign key field | "user_id" (references User) |
| `{{ENTITY_X_FIELD_1}}` | Attribute name | "email" |
| `{{FIELD_TYPE_1}}` | Attribute type | "varchar" |
| `{{FIELD_DESC_1}}` | Attribute description | "User's email address" |
| `{{PK_TYPE}}` | Primary key data type | "uuid" |
| `{{FK_TYPE}}` | Foreign key data type | "uuid" |
| `{{RELATIONSHIP_1_TYPE}}` | Relationship name | "owns" |
| `{{RELATIONSHIP_2_TYPE}}` | Another relationship | "references" |
| `{{CARDINALITY_1}}` | Cardinality notation | "1:N (one-to-many)" |
| `{{REL_DESC_1}}` | Relationship description | "A user can own multiple orders" |

## Architecture - API Design Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{ENDPOINT_1}}` | API endpoint name | "Create Order" |
| `{{HTTP_METHOD}}` | HTTP verb | "POST", "GET", "PUT", "DELETE" |
| `{{API_PATH}}` | URL path | "/api/v1/orders" |
| `{{REQUEST_EXAMPLE}}` | Sample request body | JSON example |
| `{{RESPONSE_EXAMPLE}}` | Sample response body | JSON example |
| `{{STATUS_200_DESCRIPTION}}` | Success response | "Order created successfully" |
| `{{STATUS_400_DESCRIPTION}}` | Bad request | "Invalid order format" |
| `{{STATUS_500_DESCRIPTION}}` | Server error | "Database connection failed" |

## Architecture - Database Schema Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{DATABASE_SCHEMA}}` | SQL DDL statements | CREATE TABLE statements |
| `{{INDEX_1}}` | Index definition | "idx_user_email on users(email)" |
| `{{INDEX_2}}` | Another index | "idx_order_date on orders(created_at)" |
| `{{PARTITIONING_STRATEGY}}` | Partitioning approach | "Range partitioning by date" |

## Architecture - External Dependencies Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{DEP_1}}` | Dependency name | "AWS S3" |
| `{{VERSION_1}}` | Dependency version | "2.0.0" |
| `{{PURPOSE_1}}` | Why it's needed | "File storage" |
| `{{SLA_1}}` | Service level agreement | "99.99% availability" |

## Implementation Plan Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{PHASE_1_NAME}}` | Phase name | "Foundation Setup" |
| `{{PHASE_1_TIMELINE}}` | Timeline | "Week 1-2" |
| `{{DELIVERABLE_1}}` | Deliverable item | "Core API endpoints" |
| `{{PHASE_1_DEPENDENCIES}}` | What's needed first | "Infrastructure provisioned" |

## Testing Strategy Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{UNIT_TEST_COVERAGE}}` | Coverage target | "80" (percent) |
| `{{TEST_SCENARIO_1}}` | Test case | "Valid order creation" |
| `{{INTEGRATION_TEST_SCOPE}}` | Integration scope | "Service-to-service APIs" |
| `{{LOAD_PROFILE}}` | Load test profile | "1000 req/sec for 1 hour" |
| `{{PERF_CRITERIA_1}}` | Performance criterion | "P99 latency < 500ms" |
| `{{SECURITY_TEST_1}}` | Security test | "SQL injection attempts" |

## Security Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{AUTH_DESCRIPTION}}` | Auth strategy | "OAuth 2.0 + JWT tokens" |
| `{{DATA_TYPE_1}}` | Sensitive data type | "PII (Personally Identifiable Info)" |
| `{{PROTECTION_1}}` | Protection method | "AES-256 encryption" |
| `{{RETENTION_1}}` | Retention period | "90 days after deletion" |
| `{{COMPLIANCE_STANDARDS}}` | Standards required | "GDPR, SOC2" |
| `{{COMPLIANCE_REQ_1}}` | Compliance requirement | "Data residency in EU" |
| `{{THREAT_1}}` | Threat scenario | "SQL Injection" |
| `{{THREAT_2}}` | Another threat | "DDoS Attack" |
| `{{MITIGATION_1}}` | Risk mitigation | "Input validation, parameterized queries" |

## Deployment Plan Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{PREREQ_1}}` | Prerequisite | "Staging environment ready" |
| `{{STEP_1}}` | Deployment step | "Run database migrations" |
| `{{ROLLBACK_STEP_1}}` | Rollback procedure | "Revert to previous version" |
| `{{FLAG_1}}` | Feature flag | "enable_new_payment_flow" |
| `{{FLAG_PURPOSE_1}}` | Flag purpose | "Gradual rollout of new payment processing" |
| `{{FLAG_STATE_1}}` | Default state | "false" (off by default) |

## Monitoring & Alerting Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{METRIC_1}}` | KPI name | "Order Processing Latency" |
| `{{TYPE_1}}` | Metric type | "Histogram" |
| `{{THRESHOLD_1}}` | Alert threshold | "P99 > 1000ms" |
| `{{DASHBOARD_1}}` | Dashboard name | "Order Service Health" |
| `{{DASHBOARD_1_URL}}` | Dashboard link | "https://grafana.example.com/d/abc123" |
| `{{LOG_LEVEL}}` | Logging detail | "INFO" |
| `{{LOG_EVENT_1}}` | Important event | "Order created" |
| `{{SLO_1}}` | Service level objective | "99.9% availability" |
| `{{TARGET_1}}` | SLO target | "0.1% error rate" |
| `{{WINDOW_1}}` | Measurement window | "Monthly" |

## Component Architecture Diagram Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{CLIENT_1}}` | Client application | "Web Browser" |
| `{{CLIENT_DESC_1}}` | Client description | "React Single Page App" |
| `{{CLIENT_2}}` | Another client | "Mobile App" |
| `{{CLIENT_DESC_2}}` | Mobile description | "iOS and Android app" |
| `{{GATEWAY_NAME}}` | API gateway | "Kong API Gateway" |
| `{{GATEWAY_DESC}}` | Gateway description | "Routes and authenticates requests" |
| `{{LB_NAME}}` | Load balancer | "Kubernetes Ingress" |
| `{{SERVICE_1}}` | Microservice | "Order Service" |
| `{{SERVICE_1_DESC}}` | Service description | "Manages order lifecycle" |
| `{{SERVICE_1_TECH}}` | Service technology | "Node.js + Express" |
| `{{SERVICE_1_ROLE}}` | Service responsibility | "Order Management" |
| `{{SERVICE_1_SCALE}}` | Scalability approach | "Horizontal scaling" |
| `{{PRIMARY_DB}}` | Primary database | "PostgreSQL" |
| `{{DB_TYPE_1}}` | Database type | "SQL Relational DB" |
| `{{DB_SCALE}}` | DB scalability | "Read replicas" |
| `{{AUTH_SERVICE}}` | Auth provider | "Auth0" |
| `{{AUTH_TECH}}` | Auth technology | "OAuth 2.0" |
| `{{NOTIFY_SERVICE}}` | Notification service | "SendGrid" |
| `{{NOTIFY_TECH}}` | Notification tech | "Email + SMS" |
| `{{MONITOR_SERVICE}}` | Monitoring service | "Datadog" |
| `{{MONITOR_TECH}}` | Monitoring tech | "APM + Logging" |
| `{{GATEWAY_TECH}}` | Gateway tech stack | "Kong, Nginx" |
| `{{GATEWAY_SCALE}}` | Gateway scaling | "Auto-scale 1-10 instances" |
| `{{COMPONENT_INT_1}}` | Component interaction | "Services communicate via REST APIs" |

## Key Workflows - Sequence Diagram Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{WORKFLOW_NAME}}` | Workflow name | "User Order Creation" |
| `{{WORKFLOW_DESCRIPTION}}` | What the workflow does | "Complete process from cart to confirmation" |
| `{{ACTOR_1}}` | Primary participant | "Customer" |
| `{{ACTOR_1_TYPE}}` | Participant type | "Web Browser" |
| `{{COMPONENT_1}}` | Service component | "API Gateway" |
| `{{COMPONENT_1_TYPE}}` | Component type | "REST API" |
| `{{COMPONENT_2}}` | Another component | "Order Service" |
| `{{COMPONENT_2_TYPE}}` | Component type | "Microservice" |
| `{{COMPONENT_3}}` | Storage component | "Database" |
| `{{COMPONENT_3_TYPE}}` | Storage type | "PostgreSQL" |
| `{{AUTH_COMPONENT}}` | Auth system | "Auth Service" |
| `{{AUTH_TYPE}}` | Auth type | "OAuth Provider" |
| `{{STEP_1_ACTION}}` | First interaction | "POST /orders" |
| `{{STEP_1_NOTE}}` | Context for step 1 | "Validate request format" |
| `{{STEP_2_ACTION}}` | Auth check | "Verify JWT token" |
| `{{AUTH_CHECK}}` | Check type | "Bearer token validation" |
| `{{AUTH_RESPONSE}}` | Auth result | "Token valid" |
| `{{STEP_3_ACTION}}` | Success path action | "Create order record" |
| `{{STEP_4_ACTION}}` | Database action | "INSERT INTO orders" |
| `{{STEP_4_RESPONSE}}` | Database response | "Record ID: 12345" |
| `{{STEP_3_RESPONSE}}` | Service response | "Order created" |
| `{{ALT_CONDITION_1}}` | Success condition | "Valid token and data" |
| `{{ALT_CONDITION_2}}` | Error condition | "Invalid token or bad data" |
| `{{ERROR_RESPONSE}}` | Error message | "401 Unauthorized" |
| `{{ERROR_NOTE}}` | Error explanation | "JWT signature invalid" |
| `{{STEP_5_ACTION}}` | Log/audit action | "Log order creation event" |
| `{{STEP_5_RESPONSE}}` | Log response | "Event logged" |
| `{{FINAL_RESPONSE}}` | Final response to user | "201 Created with order details" |
| `{{FINAL_NOTE}}` | Completion context | "User notified via email" |
| `{{WORKFLOW_SUCCESS_PATH}}` | Happy path description | "Valid user creates order successfully" |
| `{{WORKFLOW_ERROR_HANDLING}}` | Error scenarios | "Auth failures return 401" |
| `{{WORKFLOW_TIMEOUT}}` | Timeout settings | "30 second total timeout" |

## Questions & Risks Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{QUESTION_1}}` | Open question | "Should we use gRPC or REST?" |
| `{{OWNER_1}}` | Decision owner | "Architecture Team" |
| `{{RISK_1}}` | Risk scenario | "Database scalability limits" |
| `{{MITIGATION_1}}` | Risk mitigation | "Implement read replicas" |

## Approval Checklist Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{ARCH_REVIEWER}}` | Architecture reviewer | "Sarah Johnson" |
| `{{SEC_REVIEWER}}` | Security reviewer | "Mike Chen" |

## Reference Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `{{RELATED_ADRS}}` | Architecture Decision Records | "ADR-001: Microservices Strategy" |
| `{{API_DOCS_URL}}` | API documentation link | "https://api.example.com/docs" |
| `{{RUNBOOK_URL}}` | Operations runbook | "https://wiki.example.com/runbook" |
| `{{EPIC_URL}}` | Jira epic link | "https://jira.example.com/epic/PROJ-100" |

## Template Filling Tips

1. **Consistency**: Use same terminology throughout (e.g., "Order Service" not "OrderSvc" and "Service" interchangeably)
2. **Specificity**: Replace with actual values, not placeholders (use "PostgreSQL 14.2" not "database")
3. **Completeness**: Don't leave variables empty - use "TBD" if genuinely unknown
4. **Context**: Each variable should provide sufficient detail for understanding
5. **Technical**: Be precise with versions, naming, and specifications
