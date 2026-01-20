# Agent Registry Consolidation Checklist

**Goal:** Integrate 116 user agents into existing 97-agent registry
**Target:** ~140 consolidated agents (after merging duplicates)
**Timeline:** 8-12 weeks across 5 phases

---

## Phase 1: Foundation (Week 1) - CRITICAL

### Create New Category Structure

```bash
# Create 5 new category directories
cd .claude/agents
mkdir -p workflow-orchestration
mkdir -p design-ux
mkdir -p product-management
mkdir -p business-sales
mkdir -p marketing-growth
```

### Update Registry Index

- [ ] Add new categories to `.claude/registry/agents.index.json`
- [ ] Update category descriptions and metadata
- [ ] Create category README files

### Merge Duplicate Agents (13 Consolidations)

#### Debugging (4 → 1)

- [ ] **Target:** `debugger (Cipher)`
- [ ] Integrate capabilities from:
  - `debugger` (user)
  - `bug-detective` (user)
  - `debug-session` (user)
- [ ] Update manifest with combined skills
- [ ] Test enhanced agent
- [ ] Archive old agent files

#### Code Review (3 → 1)

- [ ] **Target:** `reviewer (Vigilant Watcher)`
- [ ] Integrate capabilities from:
  - `code-review` (user)
  - `code-review-assistant` (user)
  - `code-reviewer` (user)
- [ ] Add review depth modes (quick/standard/deep)
- [ ] Update manifest
- [ ] Test multi-perspective review

#### Testing (4 → 1)

- [ ] **Target:** `tester (Sentinel)`
- [ ] Integrate capabilities from:
  - `test-writer-fixer` (user)
  - `unit-test-generator` (user)
  - `test-results-analyzer` (user)
- [ ] Add test generation skills
- [ ] Update manifest
- [ ] Test comprehensive testing flow

#### Security/Compliance (3 → 1)

- [ ] **Target:** `security-auditor (The Vigil)`
- [ ] Integrate capabilities from:
  - `enterprise-security-reviewer` (user)
  - `audit` (user)
  - `compliance-automation-specialist` (user)
- [ ] Add compliance checking
- [ ] Add enterprise audit features
- [ ] Update manifest

#### Research (2 → 1)

- [ ] **Target:** `researcher (Oracle Prime)`
- [ ] Integrate capabilities from:
  - `explore` (user)
  - `trend-researcher` (user)
- [ ] Add trend analysis
- [ ] Update manifest

#### Planning (3 → 1)

- [ ] **Target:** `planner (The Architect)`
- [ ] Integrate capabilities from:
  - `plan` (user)
  - `planning-prd-agent` (user)
- [ ] Add PRD planning mode
- [ ] Update manifest
- [ ] **Note:** Keep `prd-specialist` separate (product-focused)

#### Data (Enhance, not merge)

- [ ] **Target:** `data-engineer (Arc)`
- [ ] Add data science capabilities
- [ ] Keep `data-scientist` as separate agent (different focus)

#### AI/ML (2 → 1)

- [ ] **Target:** `ml-engineer (Omniscient)`
- [ ] Integrate capabilities from:
  - `ai-engineer` (user)
- [ ] Update manifest

#### Documentation (2 → enhanced category)

- [ ] Enhance `documentation` category agents
- [ ] Integrate:
  - `documentation-generator` (user)
  - `codebase-documenter` (user)
- [ ] Update category manifests

#### Frontend (2 → 1)

- [ ] **Target:** `frontend` category agents
- [ ] Integrate:
  - `frontend-developer` (user)
- [ ] Update manifests

#### DevOps (2 → enhanced)

- [ ] Enhance `devops` category
- [ ] Integrate:
  - `infrastructure-maintainer` (user)
  - `devops-automator` (user)
- [ ] Keep specialized agents (Flux, Vanguard) separate

#### Git Workflow (14 → 3)

- [ ] **Create:** `git-orchestrator`
  - Integrate: `commit`, `analyze-issue`, `fix-issue`, `github-issue-fix`, `create-worktrees`
- [ ] **Create:** `pr-manager`
  - Integrate: `create-pr`, `pr-review`, `pr-issue-resolve`, `fix-pr`
- [ ] **Create:** `branch-manager`
  - Integrate: `update-branch-name`, `husky`
- [ ] Archive 14 individual git agents
- [ ] Update `github` category

### Create Phase 1 Critical Agents (12 new)

#### Workflow Orchestration

- [ ] `model-context-protocol-mcp-expert`
  - **Priority:** CRITICAL
  - **Callsign:** "The Connector"
  - **Focus:** MCP integration, protocol expertise
  - **Skills:** MCP debugging, server creation, tool integration

- [ ] `agent-sdk-dev`
  - **Priority:** CRITICAL
  - **Callsign:** "The Forgemaster"
  - **Focus:** Agent development, SDK usage
  - **Skills:** Agent creation, manifest writing, registry management

- [ ] `lyra`
  - **Priority:** HIGH
  - **Callsign:** "The Conductor"
  - **Focus:** Advanced orchestration
  - **Skills:** Multi-agent coordination, workflow optimization

- [ ] `ultrathink`
  - **Priority:** HIGH
  - **Callsign:** "The Philosopher"
  - **Focus:** Deep reasoning, complex problem-solving
  - **Skills:** Strategic thinking, architectural decisions

#### Design & UX

- [ ] `ui-designer`
  - **Priority:** HIGH
  - **Callsign:** "The Artisan"
  - **Focus:** UI component design, visual consistency
  - **Skills:** Component libraries, design systems, accessibility

- [ ] `ux-researcher`
  - **Priority:** HIGH
  - **Callsign:** "The Empath"
  - **Focus:** User research, usability testing
  - **Skills:** User interviews, A/B testing, journey mapping

#### Product & Performance

- [ ] `prd-specialist`
  - **Priority:** HIGH
  - **Callsign:** "The Visionary"
  - **Focus:** Product requirements, feature specs
  - **Skills:** PRD creation, stakeholder alignment, roadmapping

- [ ] `performance-benchmarker`
  - **Priority:** HIGH
  - **Callsign:** "The Speedster"
  - **Focus:** Performance testing, benchmarking
  - **Skills:** Load testing, profiling, optimization recommendations

- [ ] `database-performance-optimizer`
  - **Priority:** HIGH
  - **Callsign:** "The Indexer"
  - **Focus:** Database optimization, query tuning
  - **Skills:** Query analysis, index optimization, schema design

#### Documentation

- [ ] `context7-docs-fetcher`
  - **Priority:** HIGH
  - **Callsign:** "The Librarian"
  - **Focus:** Library documentation retrieval
  - **Skills:** Context7 integration, doc search, API reference

- [ ] `openapi-expert`
  - **Priority:** HIGH
  - **Callsign:** "The Specifier"
  - **Focus:** OpenAPI/Swagger specifications
  - **Skills:** Spec creation, validation, doc generation

- [ ] `changelog-generator`
  - **Priority:** MEDIUM
  - **Callsign:** "The Chronicler"
  - **Focus:** Release notes, changelog creation
  - **Skills:** Git history analysis, semantic versioning, release notes

#### DevOps

- [ ] `monitoring-observability-specialist`
  - **Priority:** HIGH
  - **Callsign:** "The Watchman"
  - **Focus:** Monitoring, logging, observability
  - **Skills:** Metrics, alerts, dashboards, distributed tracing

---

## Phase 2: Enhancement (Weeks 2-3)

### Test Enhanced Agents

- [ ] Test debugger (Cipher) with all merged capabilities
- [ ] Test reviewer (Vigilant Watcher) multi-perspective review
- [ ] Test tester (Sentinel) test generation
- [ ] Test security-auditor (The Vigil) compliance checks
- [ ] Test all 3 new git agents (orchestrator, pr-manager, branch-manager)

### Update Documentation

- [ ] Document all merged agents in Obsidian vault
- [ ] Update agent registry README
- [ ] Create migration guide for users
- [ ] Document new workflows (git orchestration, testing framework)

### Verify Backward Compatibility

- [ ] Test existing workflows with merged agents
- [ ] Ensure no breaking changes
- [ ] Update any dependent scripts/configs

---

## Phase 3: Specialized Agents (Weeks 4-6)

### Mobile Development

- [ ] `flutter-mobile-app-dev`
  - **Callsign:** "The Flutter"
  - **Category:** `mobile`
  - **Focus:** Flutter/Dart development

- [ ] `react-native-dev`
  - **Callsign:** "The Native"
  - **Category:** `mobile`
  - **Focus:** React Native development

- [ ] `desktop-app-dev`
  - **Callsign:** "The Desktop"
  - **Category:** `development`
  - **Focus:** Electron, Tauri desktop apps

### Enterprise & Integration

- [ ] `enterprise-integrator-architect`
  - **Callsign:** "The Bridge"
  - **Category:** `development`
  - **Focus:** Enterprise system integration

- [ ] `n8n-workflow-builder`
  - **Callsign:** "The Automator"
  - **Category:** `devops`
  - **Focus:** n8n automation workflows

### Development Tools

- [ ] `rapid-prototyper`
  - **Callsign:** "The Sprinter"
  - **Category:** `development`
  - **Focus:** Quick prototypes, MVPs

- [ ] `vision-specialist`
  - **Callsign:** "The Seer"
  - **Category:** `data-ai`
  - **Focus:** Computer vision, image processing

- [ ] `python-expert`
  - **Callsign:** "The Pythonista"
  - **Category:** `languages`
  - **Focus:** Advanced Python development

### Testing & Quality

- [ ] `api-tester`
  - **Callsign:** "The Requester"
  - **Category:** `testing`
  - **Focus:** API testing, integration tests

- [ ] `double-check`
  - **Callsign:** "The Validator"
  - **Category:** `testing`
  - **Focus:** Final validation, sanity checks

- [ ] `refractor`
  - **Callsign:** "The Refiner"
  - **Category:** `development`
  - **Focus:** Code refactoring, cleanup

- [ ] `optimize`
  - **Callsign:** "The Optimizer"
  - **Category:** `development`
  - **Focus:** General code optimization

### Design & UX (Additional)

- [ ] `mobile-ux-optimizer`
  - **Callsign:** "The Touch"
  - **Category:** `design-ux`
  - **Focus:** Mobile UX optimization

- [ ] `brand-guardian`
  - **Callsign:** "The Keeper"
  - **Category:** `design-ux`
  - **Focus:** Brand consistency, style guides

- [ ] `visual-storyteller`
  - **Callsign:** "The Narrator"
  - **Category:** `design-ux`
  - **Focus:** Visual narratives, presentations

### Documentation (Additional)

- [ ] `generate-api-docs`
  - **Callsign:** "The Documenter"
  - **Category:** `documentation`
  - **Focus:** Automated API documentation

- [ ] `update-claudemd`
  - **Callsign:** "The Updater"
  - **Category:** `documentation`
  - **Focus:** Claude configuration updates

- [ ] `analyze-codebase`
  - **Callsign:** "The Analyzer"
  - **Category:** `documentation`
  - **Focus:** Codebase analysis, architecture docs

### Product Management

- [ ] `project-shipper`
  - **Callsign:** "The Shipper"
  - **Category:** `product-management`
  - **Focus:** Launch management, go-to-market

- [ ] `sprint-prioritizer`
  - **Callsign:** "The Prioritizer"
  - **Category:** `product-management`
  - **Focus:** Sprint planning, backlog management

- [ ] `studio-producer`
  - **Callsign:** "The Producer"
  - **Category:** `product-management`
  - **Focus:** Production coordination

- [ ] `tool-evaluator`
  - **Callsign:** "The Evaluator"
  - **Category:** `product-management`
  - **Focus:** Tool selection, evaluation

- [ ] `workflow-optimizer`
  - **Callsign:** "The Streamliner"
  - **Category:** `product-management`
  - **Focus:** Process optimization

- [ ] `discuss`
  - **Callsign:** "The Facilitator"
  - **Category:** `product-management`
  - **Focus:** Discussion facilitation, alignment

### Data & Analytics

- [ ] `analytics-reporter`
  - **Callsign:** "The Reporter"
  - **Category:** `data-ai`
  - **Focus:** Analytics, reporting, insights

- [ ] `experiment-tracker`
  - **Callsign:** "The Experimenter"
  - **Category:** `data-ai`
  - **Focus:** A/B testing, experiment tracking

- [ ] `feedback-synthesizer`
  - **Callsign:** "The Synthesizer"
  - **Category:** `data-ai`
  - **Focus:** User feedback analysis

### Workflow Orchestration (Additional)

- [ ] `pr-review-toolkit`
  - **Callsign:** "The Reviewer"
  - **Category:** `workflow-orchestration`
  - **Focus:** PR review automation

- [ ] `commit-commands`
  - **Callsign:** "The Committer"
  - **Category:** `workflow-orchestration`
  - **Focus:** Commit automation

- [ ] `feature-dev`
  - **Callsign:** "The Builder"
  - **Category:** `workflow-orchestration`
  - **Focus:** Feature development workflow

- [ ] `security-guidance`
  - **Callsign:** "The Guide"
  - **Category:** `workflow-orchestration`
  - **Focus:** Security best practices

- [ ] `angelos-symbo`
  - **Callsign:** "The Symbol"
  - **Category:** `workflow-orchestration`
  - **Focus:** TBD (unclear from name)

- [ ] `ceo-quality-controller-agent`
  - **Callsign:** "The Executive"
  - **Category:** `workflow-orchestration`
  - **Focus:** Quality control, high-level oversight

- [ ] `claude-desktop-extension`
  - **Callsign:** "The Desktop"
  - **Category:** `workflow-orchestration`
  - **Focus:** Claude Desktop integration

- [ ] `problem-solver-specialist`
  - **Callsign:** "The Solver"
  - **Category:** `workflow-orchestration`
  - **Focus:** General problem-solving

- [ ] `studio-coach`
  - **Callsign:** "The Coach"
  - **Category:** `workflow-orchestration`
  - **Focus:** Development coaching

---

## Phase 4: Business & Legal (Weeks 7-8)

### Business & Sales

- [ ] `customer-success-manager`
  - **Callsign:** "The Champion"
  - **Category:** `business-sales`
  - **Focus:** Customer onboarding, support

- [ ] `technical-sales-engineer`
  - **Callsign:** "The Closer"
  - **Category:** `business-sales`
  - **Focus:** Technical sales, demos

- [ ] `b2b-project-shipper`
  - **Callsign:** "The Deliverer"
  - **Category:** `business-sales`
  - **Focus:** B2B project delivery

- [ ] `enterprise-onboarding-specialist`
  - **Callsign:** "The Onboarder"
  - **Category:** `business-sales`
  - **Focus:** Enterprise customer onboarding

- [ ] `finance-tracker`
  - **Callsign:** "The Accountant"
  - **Category:** `business-sales`
  - **Focus:** Financial tracking, budgets

- [ ] `pricing-packaging-specialist`
  - **Callsign:** "The Pricer"
  - **Category:** `business-sales`
  - **Focus:** Pricing strategy, packaging

- [ ] `product-sales-specialist`
  - **Callsign:** "The Seller"
  - **Category:** `business-sales`
  - **Focus:** Product sales

- [ ] `support-responder`
  - **Callsign:** "The Responder"
  - **Category:** `business-sales`
  - **Focus:** Customer support automation

### Legal & Compliance

- [ ] `legal-advisor`
  - **Callsign:** "The Counsel"
  - **Category:** `security`
  - **Focus:** Legal guidance, contracts

- [ ] `legal-compliance-checker`
  - **Callsign:** "The Checker"
  - **Category:** `security`
  - **Focus:** Compliance verification

- [ ] `ai-ethics-governance-specialist`
  - **Callsign:** "The Ethicist"
  - **Category:** `security`
  - **Focus:** AI ethics, governance

- [ ] `data-privacy-engineer`
  - **Callsign:** "The Guardian"
  - **Category:** `security`
  - **Focus:** GDPR, data privacy

### Marketing & Growth

- [ ] `content-creator`
  - **Callsign:** "The Creator"
  - **Category:** `marketing-growth`
  - **Focus:** Content creation, copywriting

- [ ] `growth-hacker`
  - **Callsign:** "The Hacker"
  - **Category:** `marketing-growth`
  - **Focus:** Growth strategies, experiments

- [ ] `app-store-optimizer`
  - **Callsign:** "The Ranker"
  - **Category:** `marketing-growth`
  - **Focus:** ASO, app store optimization

---

## Phase 5: Optional/Specialized (Week 9+)

### Social Media

- [ ] `instagram-curator`
  - **Callsign:** "The Curator"
  - **Category:** `marketing-growth`
  - **Focus:** Instagram content, curation

- [ ] `tiktok-strategist`
  - **Callsign:** "The Viral"
  - **Category:** `marketing-growth`
  - **Focus:** TikTok strategy, trends

- [ ] `reddit-community-builder`
  - **Callsign:** "The Moderator"
  - **Category:** `marketing-growth`
  - **Focus:** Reddit community management

- [ ] `twitter-engager`
  - **Callsign:** "The Tweeter"
  - **Category:** `marketing-growth`
  - **Focus:** Twitter/X engagement

### Specialized Utilities

- [ ] `whimsy-injector`
  - **Callsign:** "The Jester"
  - **Category:** `design-ux`
  - **Focus:** Fun, personality, easter eggs

- [ ] `joker`
  - **Callsign:** "The Comedian"
  - **Category:** `design-ux`
  - **Focus:** Humor injection

- [ ] `onomastophes`
  - **Callsign:** "The Namer"
  - **Category:** `utility`
  - **Focus:** Naming things (variables, projects, etc.)

- [ ] `project-curator`
  - **Callsign:** "The Curator"
  - **Category:** `product-management`
  - **Focus:** Project organization, curation

---

## Post-Integration Tasks

### Registry Updates

- [ ] Update `.claude/registry/agents.index.json` with all new agents
- [ ] Update `.claude/registry/skills.index.json` with new skills
- [ ] Update `.claude/registry/search/keywords.json` for discoverability
- [ ] Generate category statistics and metadata

### Documentation

- [ ] Document all new agents in Obsidian vault
  - Path: `C:\Users\MarkusAhling\obsidian\System\Claude-Instructions\Agent-Registry.md`
- [ ] Create migration guide for existing users
- [ ] Update CLAUDE.md with new categories
- [ ] Create usage examples for new agents

### Testing & Validation

- [ ] Test all new agents individually
- [ ] Test agent interactions (orchestration)
- [ ] Validate callsign uniqueness
- [ ] Verify category assignments
- [ ] Check for circular dependencies

### Cleanup

- [ ] Archive old/deprecated agent files
- [ ] Remove duplicate manifests
- [ ] Clean up registry indexes
- [ ] Update version numbers

### Communication

- [ ] Announce new agents to users
- [ ] Publish integration summary
- [ ] Share best practices
- [ ] Collect feedback

---

## Success Criteria

- [ ] All 5 new categories created
- [ ] 13 merges completed successfully
- [ ] 75 new agents integrated
- [ ] All tests passing
- [ ] Documentation complete
- [ ] No breaking changes to existing workflows
- [ ] Registry indexes updated
- [ ] Obsidian vault documentation synced

---

## Metrics Dashboard

| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Total Agents | 97 | 140 | - |
| Categories | 21 | 26 | - |
| Duplicates | 28 | 0 | - |
| Git Agents | 14 | 3 | - |
| Coverage Gaps | 5 | 0 | - |

---

## Files Generated

1. `C:\Users\MarkusAhling\pro\alpha-0.1\claude\agent-registry-analysis.json`
2. `C:\Users\MarkusAhling\pro\alpha-0.1\claude\agent-integration-summary.md`
3. `C:\Users\MarkusAhling\pro\alpha-0.1\claude\consolidation-checklist.md` (this file)

**Next:** Begin Phase 1 implementation
