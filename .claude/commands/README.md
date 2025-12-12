# Claude Code Slash Commands

Comprehensive catalog of all available slash commands for this project.

## Command Categories

### Meta-Development Tools (8 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/add-command` | Create new slash commands with full documentation | master-strategist, documentation-expert | 10-15 min |
| `/create-agent` | Create specialized agents with full ecosystem integration | master-strategist + 8 agents | 90-120 min |
| `/add-agent` | Create new specialized agents with prompts and skills | master-strategist, code-generator-typescript | 15-25 min |
| `/add-workflow` | Create automated workflows and orchestration patterns | master-strategist, plan-decomposer | 20-30 min |
| `/improve-orchestration` | Identify and improve orchestration patterns across all systems | master-strategist + 13 agents | 60-270 min |
| `/project-status` | Project health dashboard and planning assistant | master-strategist, risk-assessor, plan-decomposer | 5-25 min |
| `/github-upgrade` | Automated dependency upgrades with testing | dependency-analyzer, test-engineer, devops-automator | 30-60 min |
| `/identify-gaps-and-generate-epics` | Comprehensive gap analysis and epic generation with sequential reasoning | researcher, reviewer, system-architect, product-owner, sequential-thinking MCP + 8 agents | 30-105 min |

### UI/UX Development (3 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/ui-start` | Start development server with monitoring | devops-automator, frontend-engineer | 2-5 min |
| `/ui-screenshot` | Automated Playwright screenshots for docs | frontend-engineer, documentation-expert | 10-20 min |
| `/ui-component` | Generate React components with tests | frontend-engineer, test-engineer | 15-25 min |

### Application-Specific Commands (3 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/feature-generate` | Generate feature implementations from requirements | code-generator-python/typescript, architect-supreme | 30-60 min |
| `/task-automate` | Auto-generate implementation plans from task descriptions | code-generator-typescript, documentation-expert | 20-40 min |
| `/story-map` | Generate user story mapping and workflows | documentation-expert, architect-supreme | 15-30 min |

### Platform Intelligence (3 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/memory-optimize` | 5-tier memory hierarchy optimization | performance-optimizer, database-architect | 45-90 min |
| `/agent-swarm` | Multi-agent parallel execution | master-strategist, resource-allocator, state-synchronizer | 30-120 min |
| `/pattern-detect` | Codebase pattern and anti-pattern detection | senior-reviewer, architect-supreme | 20-40 min |

### Developer Experience (3 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/onboard-dev` | Automated developer onboarding | documentation-expert, devops-automator | 15-30 min |
| `/debug-trace` | Distributed tracing and debugging | performance-optimizer, database-architect | 10-20 min |
| `/api-contract` | API contract testing and validation | api-designer, test-engineer | 20-40 min |

### Production Operations (3 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/incident-response` | Automated incident triage and runbooks | master-strategist, devops-automator, risk-assessor | 10-30 min |
| `/cost-optimize` | Cloud cost analysis and optimization | resource-allocator, devops-automator | 30-60 min |
| `/health-check` | Comprehensive system health assessment | devops-automator, security-specialist, performance-optimizer | 5-15 min |

### Existing Commands (15 commands)
| Command | Description | Agents | Time |
|---------|-------------|--------|------|
| `/review-all` | Comprehensive code review | senior-reviewer | 30-60 min |
| `/secure-audit` | Security vulnerability scan | security-specialist, vulnerability-hunter | 45-90 min |
| `/generate-tests` | Generate comprehensive test suites | test-engineer, test-strategist | 30-60 min |
| `/optimize-code` | Performance optimization analysis | performance-optimizer | 30-60 min |
| `/document-api` | Generate API documentation | documentation-expert, api-designer | 20-40 min |
| `/orchestrate-complex` | Multi-pattern orchestration | master-strategist + 20 agents | 60-240 min |
| `/distributed-analysis` | Parallel codebase analysis | plan-decomposer + multiple agents | 30-90 min |
| `/security-fortress` | Comprehensive security hardening | security-specialist, vulnerability-hunter, cryptography-expert | 90-180 min |
| `/performance-surge` | Extreme performance optimization | performance-optimizer, database-architect | 180-240 min |
| `/chaos-test` | Resilience testing via chaos experiments | chaos-engineer | 60-120 min |
| `/compliance-audit` | Regulatory compliance validation | compliance-orchestrator | 60-120 min |
| `/migrate-architecture` | Large-scale architecture migration | architect-supreme, database-architect, devops-automator | 120-360 min |
| `/disaster-recovery` | DR planning and testing | devops-automator, risk-assessor | 90-180 min |
| `/knowledge-synthesis` | Knowledge base construction | documentation-expert | 60-120 min |
| `/auto-scale` | Auto-scaling optimization | resource-allocator, devops-automator | 120-240 min |

## Quick Reference

### By Use Case

**Daily Development**:
- `/ui-start` - Start dev environment
- `/ui-component` - Create new component
- `/api-contract` - Validate API changes
- `/health-check` - System status

**Sprint Planning**:
- `/project-status` - Get current status and AI recommendations
- `/identify-gaps-and-generate-epics` - Comprehensive gap analysis and backlog generation
- `/pattern-detect` - Find refactoring opportunities
- `/cost-optimize` - Budget planning

**Feature Development**:
- `/task-automate` - Generate plans from requirements
- `/feature-generate` - Implement features from specs
- `/orchestrate-complex` - Build complex features

**Code Quality**:
- `/review-all` - Comprehensive review
- `/generate-tests` - Add test coverage
- `/secure-audit` - Security scan
- `/optimize-code` - Performance tuning

**Operations**:
- `/incident-response` - Handle incidents
- `/debug-trace` - Debug issues
- `/health-check` - System health

**Platform Maintenance**:
- `/github-upgrade` - Update dependencies
- `/memory-optimize` - Memory tuning
- `/auto-scale` - Scaling optimization

### By Time Available

**< 5 minutes**:
- `/health-check`
- `/project-status --scope=daily`
- `/ui-start`

**5-15 minutes**:
- `/add-command`
- `/ui-screenshot`
- `/onboard-dev`
- `/debug-trace`

**15-30 minutes**:
- `/add-agent`
- `/ui-component`
- `/story-map`
- `/incident-response`

**30-60 minutes**:
- `/add-workflow`
- `/feature-generate`
- `/task-automate`
- `/api-contract`
- `/github-upgrade`
- `/cost-optimize`

**1-2 hours**:
- `/pattern-detect`
- `/memory-optimize`
- `/review-all`
- `/generate-tests`
- `/optimize-code`
- `/document-api`

**1.5-2 hours**:
- `/create-agent`

**2+ hours**:
- `/improve-orchestration`
- `/orchestrate-complex`
- `/security-fortress`
- `/performance-surge`
- `/chaos-test`
- `/compliance-audit`
- `/migrate-architecture`
- `/disaster-recovery`
- `/knowledge-synthesis`
- `/auto-scale`
- `/agent-swarm`

## Command Structure

All commands follow a consistent structure:

\`\`\`markdown
# Command Name
Brief description

## Purpose
Detailed explanation

## Multi-Agent Coordination Strategy
Architecture diagram and coordination pattern

## Execution Flow
Multi-phase breakdown with timing

## Agent Coordination Layers
Organized agent responsibilities

## Usage Examples
3-5 realistic scenarios

## Expected Outputs
Deliverables and reports

## Success Criteria
Measurable outcomes

## Notes
Best practices and considerations
\`\`\`

## Creating New Commands

Use the `/add-command` wizard:

\`\`\`bash
/add-command

# Interactive wizard guides you through:
# 1. Command naming and categorization
# 2. Agent selection from 23-agent ecosystem
# 3. Execution flow design
# 4. Example generation
# 5. Validation and integration
\`\`\`

## Command Development Status

### ✅ Completed (37 commands)
- All 15 existing commands
- All 22 new commands (documented)

### 🚧 In Progress (0 commands)
- None

### 📋 Planned (5 commands - Future Enhancement)
- `/mobile-deploy` - Mobile app deployment
- `/api-gateway` - API gateway configuration
- `/feature-flag` - Feature flag management
- `/ab-test` - A/B testing setup
- `/ml-pipeline` - ML pipeline orchestration

## Integration with Agent Ecosystem

### 23 Specialized Agents

**Strategic Layer (4)**:
- master-strategist
- architect-supreme
- risk-assessor
- compliance-orchestrator

**Tactical Layer (4)**:
- plan-decomposer
- resource-allocator
- conflict-resolver
- state-synchronizer

**Operational Layer (6)**:
- code-generator-typescript
- code-generator-python
- api-designer
- database-architect
- frontend-engineer
- devops-automator

**Quality & Security Layer (9)**:
- senior-reviewer
- security-specialist
- test-engineer
- performance-optimizer
- documentation-expert
- chaos-engineer
- vulnerability-hunter
- cryptography-expert
- test-strategist

## Integration with Project Development

Commands are designed to support all phases of software development:

**Development Phase**:
- `/task-automate`, `/feature-generate`, `/story-map` - Feature planning and implementation
- `/ui-component`, `/ui-screenshot` - UI development
- `/api-contract`, `/document-api` - API development

**Quality Assurance Phase**:
- `/review-all`, `/generate-tests` - Code quality
- `/secure-audit`, `/security-fortress` - Security testing
- `/performance-surge`, `/optimize-code` - Performance optimization

**Operations Phase**:
- `/health-check`, `/incident-response` - Monitoring and troubleshooting
- `/auto-scale`, `/cost-optimize` - Scaling and cost management
- `/disaster-recovery`, `/chaos-test` - Resilience testing

## Best Practices

### When to Use Commands

**Use commands for**:
- Complex multi-step operations
- Operations requiring multiple agents
- Standardized workflows
- Operations with defined success criteria

**Don't use commands for**:
- Simple file edits
- One-off explorations
- Learning/discovery tasks

### Command Chaining

Commands can be chained for complex workflows:

\`\`\`bash
# Pre-deployment workflow
/project-status && \
/review-all && \
/secure-audit && \
/generate-tests && \
/health-check

# Feature development workflow
/task-automate "Implement user authentication" && \
/ui-component "LoginForm" && \
/api-contract && \
/ui-screenshot
\`\`\`

### Custom Configuration

Many commands support configuration:

\`\`\`bash
# Project status with options
/project-status --scope=weekly --detail=strategic --stakeholder=leadership

# UI screenshots with options
/ui-screenshot --viewports=all --modes=light,dark --update-docs

# Health check with filters
/health-check --services=api,db --detail=full --alert-thresholds
\`\`\`

## Troubleshooting

### Command Not Found
\`\`\`bash
# List all available commands
ls .claude/commands/

# Check command registry
cat .claude/context/command-registry.yaml
\`\`\`

### Command Fails to Execute
\`\`\`bash
# Run in dry-run mode
/my-command --dry-run

# Check validation
/my-command --validate-only

# View detailed logs
/my-command --verbose --debug
\`\`\`

### Agent Not Available
\`\`\`bash
# Check agent status
/health-check --agents-only

# View agent registry
cat .claude/context/agent-registry.yaml
\`\`\`

## Contributing

### Adding New Commands

1. Use `/add-command` wizard
2. Follow command structure template
3. Add 3+ realistic examples
4. Define measurable success criteria
5. Validate with `--validate-only`
6. Test with `--dry-run`
7. Update this README
8. Commit with descriptive message

### Improving Existing Commands

1. Read command file
2. Make improvements
3. Update examples if needed
4. Test changes
5. Update version in command metadata
6. Document breaking changes
7. Commit with changelog

## Version History

- **v3.0.0** (2025-10-07): Added 20 new commands across 5 categories
- **v2.0.0** (2025-10-02): Added 9 advanced commands (orchestration, security, performance)
- **v1.0.0** (2025-09-15): Initial 6 commands (review, audit, tests, optimize, document, distribute)

## License

All commands follow the project license (MIT).
