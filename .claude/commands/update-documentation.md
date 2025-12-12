# /update-documentation

World-class documentation update for the entire repository with comprehensive visuals, dual-layer content architecture, and enterprise-grade quality.

## Usage

\`\`\`bash
/update-documentation [--scope=<area>] [--phase=<number>] [--visuals-only] [--content-only]
\`\`\`

## Parameters

- `--scope=<area>`: Target area (business|developer|operator|architect|api|architecture|all). Default: all
- `--phase=<number>`: Execute specific phase (1-6). Default: all phases
- `--visuals-only`: Only generate Mermaid diagrams and Playwright screenshots
- `--content-only`: Only generate markdown content without visuals
- `--skip-screenshots`: Skip Playwright screenshot generation
- `--skip-diagrams`: Skip Mermaid diagram generation

## What This Command Does

### Phase 1: Foundation & Architecture (3-4 days)
- Set up Playwright automation for screenshot generation
- Create Mermaid diagram templates and standards
- Establish documentation design system
- Configure VitePress custom components (BusinessTechToggle, InteractiveDiagram, CodeTabs, etc.)
- Generate core C4 architecture diagrams (Context, Container, Component)

### Phase 2: Business-Layer Content (4-5 days)
- Create value proposition and executive overview pages
- Document business use cases with ROI analysis
- Generate customer success stories and case studies
- Build interactive ROI calculator component
- Create compliance and security overview for business stakeholders

### Phase 3: Technical-Layer Content (5-6 days)
- Write comprehensive developer guides (API integration, agent development, workflow creation)
- Create detailed API reference documentation with OpenAPI specs
- Document architecture deep-dives (data flow, scaling patterns, security model)
- Generate database schemas and query pattern documentation
- Create troubleshooting guides and runbooks

### Phase 4: Visual Assets (4-5 days)
- Generate 100+ Mermaid diagrams:
  - Architecture diagrams (15): C4 Context/Container/Component, deployment topologies
  - Workflow patterns (12): Sequential, Parallel, Saga, Event-driven, Dynamic, Iterative
  - Data flows (20): Agent execution, SignalR real-time, state management, event sourcing
  - Integration patterns (15): External services, Azure services, third-party APIs
  - Security diagrams (10): Authentication flows, authorization model, threat model
  - Deployment pipelines (8): CI/CD flows, environment promotion, rollback procedures
  - Database schemas (12): ERDs, query patterns, optimization strategies
  - Monitoring & observability (8): Distributed tracing, metrics, logging, alerting
- Generate 120+ Playwright screenshots:
  - Dashboard views (light/dark mode, desktop/tablet/mobile)
  - Agent management UI workflows
  - Workflow builder interface
  - Real-time monitoring dashboards
  - Configuration screens
  - Error states and edge cases

### Phase 5: VitePress Enhancement & GitHub Integration (2-3 days)
- Enhance VitePress configuration with custom theme
- Implement custom components (BusinessTechToggle, InteractiveDiagram, ROICalculator)
- Configure advanced search with Algolia DocSearch
- Set up automated screenshot updates in CI/CD
- Integrate GitHub Issues/Discussions links
- Configure edit-on-GitHub functionality
- Add version selector for multi-version docs

### Phase 6: QA & Finalization (2-3 days)
- Run Lighthouse audits (target: >95 score)
- Validate all internal links
- Test accessibility (WCAG 2.1 AA compliance)
- Verify responsive design across viewports
- Proofread all content for grammar and clarity
- Generate documentation metrics dashboard
- Create documentation maintenance runbook

## Dual-Layer Documentation Architecture

All documentation follows a dual-layer approach to serve both business and technical audiences:

### Business Layer (Frontmatter)
- Executive summary with key takeaways
- Business value and ROI implications
- Non-technical explanations using analogies
- Success metrics and KPIs
- Compliance and security highlights

### Technical Layer (Behind Toggle/Linked)
- Detailed implementation guides
- Code examples and API references
- Architecture deep-dives
- Performance optimization techniques
- Troubleshooting procedures

## Visual Quality Standards

### Mermaid Diagrams
- Consistent color scheme aligned with brand (primary: #3eaf7c)
- Semantic colors (success: green, warning: yellow, error: red)
- Clear labels and annotations
- Proper spacing and alignment
- Include legends for complex diagrams
- Mobile-responsive scaling

### Playwright Screenshots
- Capture in both light and dark modes
- Generate for desktop (1920x1080), tablet (768x1024), mobile (375x667)
- Annotate key UI elements with callouts
- Ensure realistic data (no placeholder content)
- Optimize images (WebP format, <200KB per screenshot)
- Include alt text for accessibility

## Success Metrics

- **Coverage**: 88+ documentation pages covering all audiences
- **Visuals**: 100+ Mermaid diagrams, 120+ Playwright screenshots
- **Performance**: Lighthouse score >95, <1.5s page load time
- **Accessibility**: WCAG 2.1 AA compliance, 100% keyboard navigable
- **Quality**: College-level writing, Grammarly score >90
- **Completeness**: Zero broken links, all APIs documented
- **Maintenance**: Automated screenshot updates in CI/CD

## Output Structure

\`\`\`
docs/
├── index.md (Enhanced homepage with dual-layer hero)
├── getting-started/
│   ├── overview.md
│   ├── prerequisites.md
│   ├── installation.md
│   ├── first-agent.md
│   └── first-workflow.md
├── guides/
│   ├── business/
│   │   ├── value-proposition.md
│   │   ├── use-cases.md
│   │   ├── roi-analysis.md
│   │   └── compliance-overview.md
│   ├── developer/
│   │   ├── local-development.md
│   │   ├── agent-development.md
│   │   ├── workflow-creation.md
│   │   ├── api-integration.md
│   │   └── testing-strategies.md
│   ├── operator/
│   │   ├── deployment-azure.md
│   │   ├── monitoring.md
│   │   ├── scaling.md
│   │   ├── disaster-recovery.md
│   │   └── security-hardening.md
│   └── architect/
│       ├── architecture-overview.md
│       ├── design-patterns.md
│       ├── performance-tuning.md
│       └── integration-patterns.md
├── api/
│   ├── rest-api.md (OpenAPI spec embedded)
│   ├── signalr-hub.md
│   ├── python-client.md
│   └── webhooks.md
├── architecture/
│   ├── index.md
│   ├── components.md
│   ├── data-flow.md
│   ├── integration.md
│   ├── security-model.md
│   └── scalability.md
├── tutorials/
│   ├── build-chatbot-agent.md
│   ├── create-data-pipeline.md
│   ├── implement-approval-workflow.md
│   └── integrate-external-api.md
├── runbooks/
│   ├── incident-response.md
│   ├── deployment-procedures.md
│   ├── rollback-procedures.md
│   └── database-maintenance.md
├── troubleshooting/
│   ├── common-issues.md
│   ├── debugging-agents.md
│   ├── performance-issues.md
│   └── faq.md
└── assets/
    ├── diagrams/ (100+ Mermaid source files)
    ├── screenshots/ (120+ PNG/WebP images)
    └── videos/ (Tutorial screencasts)
\`\`\`

## Agent Utilization

This command orchestrates multiple specialized agents:

- **documentation-expert**: Primary documentation writer
- **frontend-engineer**: VitePress custom components and theme
- **api-designer**: API reference documentation and OpenAPI specs
- **architect-supreme**: Architecture diagrams and design patterns
- **ux-researcher**: User testing and accessibility validation
- **devops-automator**: CI/CD integration for automated screenshots
- **test-engineer**: Playwright automation and screenshot generation
- **senior-reviewer**: Content quality review and proofreading

## Estimated Effort

- **Total Hours**: 284-354 hours (P50: 319 hours)
- **Duration**: 24 days with 1-2 FTE contributors
- **Breakdown**:
  - Phase 1: 32-40 hours
  - Phase 2: 48-60 hours
  - Phase 3: 60-72 hours
  - Phase 4: 80-100 hours
  - Phase 5: 40-50 hours
  - Phase 6: 24-32 hours

## Examples

\`\`\`bash
# Full documentation update (all phases)
/update-documentation

# Update only business documentation
/update-documentation --scope=business

# Execute Phase 4 (visuals) only
/update-documentation --phase=4

# Generate visuals without updating content
/update-documentation --visuals-only

# Update developer guides without screenshots
/update-documentation --scope=developer --skip-screenshots
\`\`\`

## Quality Gates

### Pre-Execution
- VitePress build succeeds locally
- Playwright dependencies installed
- Mermaid CLI available
- All referenced source files exist

### Post-Phase
- All new pages have valid frontmatter
- All internal links resolve correctly
- All Mermaid diagrams render without errors
- All screenshots generated successfully

### Post-Execution
- Lighthouse score >95 (Performance, Accessibility, Best Practices, SEO)
- Zero broken links (checked with markdown-link-check)
- WCAG 2.1 AA compliance (checked with axe-core)
- All images optimized (<200KB)
- Grammarly score >90 for all content
- Build time <30 seconds

## Related Commands

- `/project-plan` - Generate comprehensive project plan
- `/implement-epic` - Execute full epic with orchestration
- `/add-command` - Create new slash command
- `/review-documentation` - Review existing documentation for gaps

## Notes

- This command requires **Opus model** for maximum quality output
- Screenshots are generated using Playwright with **actual application running** (not mocks)
- Mermaid diagrams are **version-controlled** as `.mmd` source files for easy updates
- Documentation follows **VitePress best practices** and conventions
- All content is **dual-licensed** (Business-friendly + Technical deep-dive)
- Automated screenshot updates run in CI/CD on every release
