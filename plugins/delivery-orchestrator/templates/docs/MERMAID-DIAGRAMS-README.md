# Mermaid Diagrams in TDD Template

## Overview

The Technical Design Document (TDD) template has been enhanced with **5 comprehensive Mermaid diagram templates** that replace static placeholder text. These diagrams provide visual representations of system architecture, data flow, and interactions.

## What's New

### Template File Updates

**File:** `tdd.md.template`

**Changes:**
- Replaced `[Placeholder for context diagram]` with full C4 Model context diagram
- Added Data Flow Diagram showing data movement through processing pipeline
- Added Entity Relationship Diagram (ERD) for database schema
- Added Sequence Diagram for key workflow interactions
- Added Component Architecture Diagram for high-level system layout
- Total additions: **233 lines** (from 317 to 547 lines)

### New Reference Guide

**File:** `TDD-VARIABLES.md` (319 lines)

Comprehensive variable reference covering all `{{VARIABLE_NAME}}` placeholders organized by section:
- Document metadata
- Requirements
- Architecture diagrams
- Implementation phases
- Testing strategy
- Security & compliance
- Deployment & monitoring
- Component interactions

## The 5 Mermaid Diagram Templates

### 1. Context Diagram (C4 Model)

**Where:** Architecture > Context Diagram

**What it shows:** System boundaries, external dependencies, and interaction points

**Key elements:**
- Central service/system in focus
- User types and external systems
- Authentication/authorization system
- Labeled interactions between components

**Mermaid syntax:** `graph TB` (flowchart)

**Example scenario:**
```
Customers [Web/Mobile] → Order Service ← Payment Gateway
                        ↓ Auth Provider
                        ↓ Notification Service
```

**Template usage:**
```mermaid
{{SERVICE_NAME}} connects to {{EXTERNAL_SYSTEM_1}} via {{INTERACTION_1}}
```

---

### 2. Data Flow Diagram

**Where:** Architecture > Data Flow Diagram

**What it shows:** How data flows from source through processing to storage and consumption

**Key elements:**
- Data source (Kafka, API, file)
- Processing pipeline (validation, transformation, enrichment)
- Storage layer (database + cache)
- Data consumers (dashboards, APIs)

**Mermaid syntax:** `graph LR` (left-to-right flow)

**Example scenario:**
```
Event Stream → Validate → Transform → Enrich → [PostgreSQL + Redis] → Consumer
```

**Use when:** Documenting ETL processes, event pipelines, or data movement patterns

---

### 3. Entity Relationship Diagram (ERD)

**Where:** Architecture > Entity Relationship Diagram

**What it shows:** Database schema with entities, attributes, and relationships

**Key elements:**
- Entity definitions with fields and types
- Primary keys and foreign keys
- Cardinality relationships (1:1, 1:N, M:N)
- Relationship descriptions

**Mermaid syntax:** `erDiagram` (specialized entity syntax)

**Example scenario:**
```
Users ||--o{ Orders : own
Orders }o--|| Products : contain
Users ||--o{ Addresses : has
```

**Use when:** Designing or documenting database schema

---

### 4. Sequence Diagram

**Where:** Key Workflows > Sequence Diagram

**What it shows:** Step-by-step interaction between system components for a specific workflow

**Key elements:**
- Participants (users, services, databases)
- Sequential message passing
- Alternative paths (success/error)
- Timing and conditions
- Notes explaining logic

**Mermaid syntax:** `sequenceDiagram` (specialized sequence syntax)

**Example scenario:**
```
User → API: Request
API → Auth: Verify Token
Auth → API: Valid
API → Service: Process
Service → DB: Store
DB → Service: ID
Service → API: Response
API → User: Result
```

**Use when:** Documenting workflows, API flows, or system interactions

---

### 5. Component Architecture Diagram

**Where:** Architecture Components Diagram

**What it shows:** High-level system architecture with all major components and dependencies

**Key elements:**
- Layered architecture (Client, Gateway, Services, Data, External)
- Component types and responsibilities
- Service-to-service communication
- External integrations
- Data stores and infrastructure

**Mermaid syntax:** `graph TB` (flowchart with subgraphs)

**Example scenario:**
```
[Web Browser, Mobile App]
    ↓ HTTPS
[API Gateway + Load Balancer]
    ↓ Routes
[Service1, Service2, Service3]
    ↓ Query
[PostgreSQL, Redis, Message Queue]
    ↕ External APIs
[Auth Service, Email Service, Monitoring]
```

**Use when:** Creating architecture overview or system design documentation

---

## Variable Substitution Pattern

All diagrams use a consistent variable substitution pattern with `{{VARIABLE_NAME}}` syntax:

### Examples

**Context Diagram:**
```
SERVICE_NAME = "Order Processing Service"
SERVICE_DESCRIPTION = "Handles order lifecycle"
EXTERNAL_SYSTEM_1 = "Payment Gateway"
INTERACTION_1 = "Process Payment"
```

**Data Flow Diagram:**
```
DATA_SOURCE = "Apache Kafka"
PROCESSOR_1 = "JSON Validator"
STORAGE_1 = "PostgreSQL Database"
CACHE_SYSTEM = "Redis"
```

**Sequence Diagram:**
```
WORKFLOW_NAME = "User Order Creation"
ACTOR_1 = "Customer"
COMPONENT_1 = "API Gateway"
STEP_1_ACTION = "POST /orders"
```

### Benefits of Variable Substitution

1. **Reusable templates** - Use same structure for multiple TDDs
2. **Automation-friendly** - Template engines can populate variables
3. **Consistency** - Same naming across all documents
4. **Documentation** - Clear mapping of variables to meanings
5. **Version control** - Diagrams stored as text in git

---

## How to Use These Templates

### Step 1: Copy the Template

```bash
cp tdd.md.template my-service-tdd.md
```

### Step 2: Fill In Variables

Use the `TDD-VARIABLES.md` guide to replace all `{{VARIABLE_NAME}}` placeholders:

```markdown
# Before
{{SERVICE_NAME}} connects to {{EXTERNAL_SYSTEM_1}}

# After
Order Service connects to Stripe Payment Gateway
```

### Step 3: Validate Diagrams

View the rendered diagrams on:
- GitHub (automatic Mermaid rendering)
- GitLab (built-in Mermaid support)
- Confluence (with Mermaid macro)
- Static site generators (with Mermaid plugin)

### Step 4: Reference in Documentation

All diagrams are immediately renderable - no additional tools needed:

```markdown
# Just place in Markdown, GitHub renders automatically
The component diagram shows our three-tier architecture...
[diagram renders here]
```

---

## Diagram Styling & Color Coding

All diagrams use consistent color schemes for visual distinction:

| Layer | Color | Hex Code | Purpose |
|-------|-------|----------|---------|
| System Core | Light Blue | `#e1f5ff` | Primary system |
| Users/External | Light Purple | `#f3e5f5` | External actors |
| Processing | Light Yellow | `#fff9c4` | Logic/transformation |
| Storage | Light Teal | `#e0f2f1` | Data persistence |
| Auth/Security | Light Green | `#e8f5e9` | Security layer |
| API/Gateway | Light Purple | `#f3e5f5` | Gateway/routing |
| External Services | Light Pink | `#fce4ec` | Third-party services |

### Customizing Colors

Modify styles in each diagram:

```mermaid
style NODE fill:#custom_color,stroke:#border_color,stroke-width:2px
```

---

## Common Use Cases

### 1. Microservices Architecture
- **Use:** Context + Component Architecture diagrams
- **Focus:** Service boundaries, API contracts, data flow
- **Variables:** Service names, tech stack, scaling approach

### 2. Data Pipeline/ETL System
- **Use:** Data Flow + Context diagrams
- **Focus:** Processing stages, storage, transformations
- **Variables:** Source, processors, destinations, rules

### 3. Database Design
- **Use:** Entity Relationship + Data Model diagrams
- **Focus:** Schema, relationships, normalization
- **Variables:** Entities, fields, cardinality, constraints

### 4. API Development
- **Use:** Sequence + Context diagrams
- **Focus:** Request flows, error handling, security
- **Variables:** Endpoints, parameters, responses, statuses

### 5. Full System Design
- **Use:** All 5 diagrams
- **Focus:** Complete architecture from user interaction to data storage
- **Variables:** All provided - comprehensive documentation

---

## Best Practices

### DO

- **Use clear names:** `UserAuthenticationService` not `UAS`
- **Document interactions:** Label all arrows with action descriptions
- **Include external systems:** Show third-party dependencies
- **Add descriptions:** Explain what each diagram shows
- **Version diagrams:** Update when architecture changes
- **Follow C4 model:** Context → Container → Component → Code

### DON'T

- **Overcomplicate:** Keep diagrams focused on one concern
- **Skip labels:** Every arrow should explain the interaction
- **Mix abstraction levels:** Don't show code details in architecture diagram
- **Ignore security:** Include auth and encryption where relevant
- **Forget about data:** Show where data lives and how it moves

---

## Integration with Development Workflow

### Creating a New Service TDD

1. Copy template: `cp tdd.md.template new-service-tdd.md`
2. Fill metadata section (author, date, version)
3. Complete requirements (functional & non-functional)
4. Use diagram guide to populate each diagram section
5. Add implementation phases and testing strategy
6. Get architecture review and security sign-off
7. Commit to repository alongside code
8. Reference in code README files
9. Update when architecture changes significantly

### Validation Checklist

- [ ] All `{{VARIABLE_NAME}}` replaced with actual values
- [ ] All diagrams render correctly (GitHub preview)
- [ ] Golden Armada signature present at end
- [ ] All sections completed (none left as placeholders)
- [ ] Related links point to valid resources
- [ ] Metrics and SLOs are realistic
- [ ] Security section addresses all threats
- [ ] Reviewers and stakeholders listed

---

## Troubleshooting Mermaid Diagrams

### Diagram Not Rendering?

**Check:**
1. Code fence: Must be ````mermaid```
2. Indentation: No extra indentation inside code fence
3. Syntax: Verify against Mermaid docs (syntax errors are silent)
4. Platform: GitHub, GitLab, and Confluence all support Mermaid

### Variable Not Substituting?

**Verify:**
1. Exact syntax: `{{VARIABLE_NAME}}` not `{{ VARIABLE_NAME }}`
2. Variable is defined: Check TDD-VARIABLES.md
3. Case sensitivity: Variables are case-sensitive
4. Template engine: Ensure using proper template processor

### Diagram Too Complex?

**Solution:**
1. Split into multiple focused diagrams
2. Remove non-essential components
3. Use separate sequence diagrams for different flows
4. Create separate component breakdown diagrams

---

## References

- **Mermaid Documentation:** https://mermaid.js.org
- **C4 Model:** https://c4model.com
- **Entity Relationship Diagrams:** https://en.wikipedia.org/wiki/Entity%E2%80%93relationship_model
- **Sequence Diagram Syntax:** https://mermaid.js.org/syntax/sequenceDiagram.html
- **TDD Template:** `tdd.md.template`
- **Variable Reference:** `TDD-VARIABLES.md`

---

## Maintenance & Updates

This enhanced TDD template will be updated when:
- New Mermaid features become available
- Common patterns emerge from usage
- Tool integrations improve (GitHub, Confluence, etc.)
- Organization standards evolve

**Last Updated:** 2026-01-03

**Maintained By:** Golden Armada Documentation Team

---

**⚓ Golden Armada** | *You ask - The Fleet Ships*
