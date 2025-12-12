# Add Slash Command

Interactive wizard for creating new slash commands with comprehensive documentation, agent coordination workflows, usage examples, and integration with the existing agent ecosystem.

## Purpose

Streamlines the creation of new slash commands by providing an interactive template-based wizard that ensures consistency, completeness, and integration with the RealmWorks architecture. Auto-generates command markdown with proper structure, agent coordination patterns, success criteria, and validation.

## Multi-Agent Coordination Strategy

Uses **guided creation pattern** with interactive prompts, template generation, validation, and documentation.

### Command Creation Architecture
\`\`\`
┌──────────────────────────────────────────────────┐
│       Command Creation Wizard                     │
│       (master-strategist)                         │
└────────────┬─────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┬────────┬─────────┐
    ▼        ▼        ▼        ▼        ▼         ▼
 Prompt   Template  Agent   Validate  Doc    Test
 User     Generate  Coord             Gen
\`\`\`

## Execution Flow

### Phase 1: Interactive Requirements Gathering (0-10 mins)
1. **requirements-gatherer** - Interactive prompts for command details
2. **existing-command-analyzer** - Analyze existing commands for patterns
3. **name-validator** - Validate command name uniqueness
4. **category-selector** - Determine command category
5. **agent-suggester** - Suggest appropriate agents

**Prompts**:
- Command name (e.g., `/my-command`)
- Command purpose (one-sentence description)
- Category (meta-tools, rpg, platform, devex, operations)
- Primary use case
- Target agents (from 23-agent ecosystem)
- Expected execution time
- Success criteria

### Phase 2: Template Generation (10-20 mins)
6. **template-selector** - Select appropriate command template
7. **structure-generator** - Generate markdown structure
8. **agent-coordinator** - Define agent coordination strategy
9. **execution-flow-builder** - Build multi-phase execution flow
10. **example-generator** - Generate realistic usage examples

### Phase 3: Documentation Generation (20-35 mins)
11. **purpose-writer** - Write purpose section
12. **architecture-diagrammer** - Create architecture diagram
13. **agent-layer-documenter** - Document agent coordination layers
14. **success-criteria-definer** - Define measurable success criteria
15. **notes-writer** - Write implementation notes

### Phase 4: Validation & Testing (35-45 mins)
16. **markdown-validator** - Validate markdown syntax
17. **link-checker** - Check internal links
18. **example-validator** - Validate example code/commands
19. **consistency-checker** - Check consistency with existing commands
20. **completeness-validator** - Ensure all required sections present

### Phase 5: Integration & Registration (45-55 mins)
21. **file-writer** - Write command file to `.claude/commands/`
22. **index-updater** - Update command index/registry
23. **documentation-updater** - Update CLAUDE.md with new command
24. **test-command-generator** - Generate test invocation
25. **usage-guide-updater** - Update usage guide

## Agent Coordination Layers

### Interactive Layer
- **requirements-gatherer**: User prompts and input collection
- **name-validator**: Name uniqueness and convention checking
- **category-selector**: Command categorization
- **agent-suggester**: AI-powered agent recommendations

### Generation Layer
- **template-selector**: Template matching
- **structure-generator**: Markdown generation
- **agent-coordinator**: Coordination pattern design
- **execution-flow-builder**: Workflow definition

### Validation Layer
- **markdown-validator**: Syntax validation
- **link-checker**: Link verification
- **consistency-checker**: Pattern compliance
- **completeness-validator**: Section completeness

### Integration Layer
- **file-writer**: File system integration
- **index-updater**: Registry updates
- **documentation-updater**: Documentation sync

## Usage Examples

### Example 1: Create Simple Command
\`\`\`
/add-command

Interactive Wizard:
? Command name: /update-deps
? Purpose: Update all project dependencies with testing
? Category: Developer Experience
? Primary use case: Automated dependency updates with validation
? Execution time estimate: 15-30 minutes
? Success criteria: All deps updated, tests pass, changelog generated

Suggested Agents:
  1. dependency-analyzer (analysis)
  2. test-engineer (validation)
  3. documentation-expert (changelog)
  4. devops-automator (automation)

? Select agents (space to select, enter to continue):
  [x] dependency-analyzer
  [x] test-engineer
  [x] documentation-expert
  [ ] devops-automator

Generating command structure...
✅ Created: .claude/commands/update-deps.md
✅ Updated: .claude/commands/README.md
✅ Validated: All sections complete

Next steps:
1. Review generated command: .claude/commands/update-deps.md
2. Customize examples and details as needed
3. Test command: /update-deps --dry-run
4. Commit to repository
\`\`\`

### Example 2: Create Complex Orchestration Command
\`\`\`
/add-command --template=orchestration

Interactive Wizard:
? Command name: /deploy-staging
? Purpose: Full staging deployment with smoke tests and rollback
? Category: Production Operations
? Orchestration pattern: Event-driven with rollback
? Phases: 6 (validation, build, deploy, smoke-test, monitor, verify)
? Agents needed: 8-10
? Estimated time: 30-60 minutes

Generating multi-phase orchestration command...
✅ Created with 8 phases, 12 agents
✅ Rollback procedures included
✅ Monitoring and alerting configured
\`\`\`

### Example 3: Create RPG-Specific Command
\`\`\`
/add-command --category=rpg

Interactive Wizard:
? Command name: /loot-simulator
? Purpose: Simulate loot drop rates and rewards
? RPG mechanics: Loot tables, rarity tiers, drop rates
? Game systems: Quest rewards, achievement unlocks
? Balancing focus: Reward distribution, progression pacing

Generating RPG command...
✅ Created with RPG-specific templates
✅ Includes game balance formulas
✅ References Phase 2 (RPG Design) documentation
\`\`\`

## Expected Outputs

### 1. Command Markdown File
Generated at: `.claude/commands/{command-name}.md`

**Structure**:
\`\`\`markdown
# Command Name

Brief description

## Purpose
Detailed explanation

## Multi-Agent Coordination Strategy
ASCII diagram and strategy

## Execution Flow
Multi-phase breakdown with agents and timing

### Phase 1: Name (0-X mins)
1. **agent-name** - Action description
...

## Agent Coordination Layers
Organized agent responsibilities by layer

## Usage Examples
3-5 realistic scenarios

## Expected Outputs
Deliverables from command execution

## Success Criteria
Measurable outcomes

## Notes
Implementation considerations and best practices
\`\`\`

### 2. Validation Report
\`\`\`
=== COMMAND VALIDATION REPORT ===

✅ SYNTAX
  Markdown syntax: Valid
  Frontmatter: N/A
  Code blocks: 12 (all properly formatted)

✅ STRUCTURE
  Required sections: 8/8 present
  - Purpose ✓
  - Multi-Agent Coordination ✓
  - Execution Flow ✓
  - Agent Layers ✓
  - Usage Examples ✓
  - Expected Outputs ✓
  - Success Criteria ✓
  - Notes ✓

✅ CONTENT
  Purpose clarity: Clear
  Agent references: Valid (all agents exist in registry)
  Example quality: Good (3 examples, realistic)
  Success criteria: Measurable (6 criteria defined)

✅ INTEGRATION
  File location: .claude/commands/my-command.md ✓
  Command index: Updated ✓
  CLAUDE.md reference: Added ✓
  No naming conflicts: Confirmed ✓

⚠️  SUGGESTIONS
  - Consider adding error handling section
  - Add estimated cost analysis (compute resources)
  - Include rollback procedures for destructive operations
\`\`\`

### 3. Command Index Update
\`\`\`
=== UPDATED COMMAND INDEX ===

Total Commands: 36 (was 35)

Meta-Development Tools (6):
  /add-command ........................ NEW ✨
  /add-agent
  /add-workflow
  /project-status
  /github-upgrade

...

Command added to:
  - .claude/commands/README.md
  - .claude/context/command-registry.yaml
  - CLAUDE.md (line 247)
\`\`\`

## Success Criteria

- ✅ Command name validated (unique, follows naming conventions)
- ✅ Category assigned (one of 5 categories)
- ✅ All required sections generated
- ✅ Agent coordination strategy defined
- ✅ Execution flow with phases and agents
- ✅ 3+ realistic usage examples
- ✅ Measurable success criteria (5+ criteria)
- ✅ Markdown syntax valid
- ✅ Internal links valid (agents, files, phases)
- ✅ File written to `.claude/commands/`
- ✅ Command registered in index
- ✅ Documentation updated (CLAUDE.md)
- ✅ Command testable (dry-run capability)

## Command Templates

### Template 1: Simple Command
For single-purpose commands with linear execution.

**Use Cases**: Code generation, analysis, simple automation

**Sections**: 6 (Purpose, Execution, Examples, Outputs, Criteria, Notes)

**Agents**: 1-3

### Template 2: Multi-Phase Command
For commands with distinct phases and state management.

**Use Cases**: Deployment, migration, complex workflows

**Sections**: 8 (adds Agent Coordination, Architecture Diagram)

**Agents**: 4-8

**Phases**: 3-6

### Template 3: Orchestration Command
For commands coordinating multiple agents across layers.

**Use Cases**: Full-stack operations, distributed tasks

**Sections**: 9 (adds Configuration Options, Integration Points)

**Agents**: 8-15

**Phases**: 6-10

**Patterns**: Event Sourcing, Saga, Blackboard

### Template 4: RPG-Specific Command
For game mechanics, balancing, narrative generation.

**Use Cases**: Quest creation, XP balancing, narrative weaving

**Sections**: 8 (includes RPG Mechanics, Game Balance)

**Agents**: RPG-focused (quest-orchestrator, xp-engine, narrative-generator)

**References**: Phase 2 (RPG Design) documentation

### Template 5: Analysis Command
For codebase analysis, metrics, reporting.

**Use Cases**: Code review, dependency analysis, metrics

**Sections**: 7 (includes Metrics, Report Format)

**Agents**: Analysis-focused (code-analyzer, metrics-collector)

**Outputs**: Reports, dashboards, metrics

## Configuration Options

### Template Selection
- `--template=simple` - Simple linear command
- `--template=multi-phase` - Multi-phase workflow
- `--template=orchestration` - Multi-agent orchestration
- `--template=rpg` - RPG game mechanics
- `--template=analysis` - Analysis and reporting

### Interactivity
- `--interactive` - Full interactive wizard (default)
- `--quick` - Minimal prompts, use defaults
- `--from-spec=file.yaml` - Generate from YAML specification

### Validation
- `--validate-only` - Validate without writing
- `--skip-validation` - Skip validation (not recommended)
- `--strict` - Strict validation (enforce all best practices)

### Output
- `--dry-run` - Show generated content without writing
- `--output=path` - Custom output path
- `--format=markdown` - Markdown output (default)
- `--format=yaml` - YAML specification output

## Integration Points

### File System
- **Command Directory**: `.claude/commands/`
- **Command Index**: `.claude/commands/README.md`
- **Command Registry**: `.claude/context/command-registry.yaml`
- **Documentation**: `CLAUDE.md`

### Agent Registry
- **Agent List**: 23 specialized agents
- **Agent Prompts**: `.claude/agents/*.md` (future)
- **Skill Definitions**: `.claude/skills/*.yaml` (future)

### Templates
- **Template Library**: `.claude/templates/commands/`
- **Reusable Sections**: `.claude/templates/sections/`
- **Example Library**: `.claude/templates/examples/`

## YAML Specification Format

For `--from-spec` option:

\`\`\`yaml
# command-spec.yaml
command:
  name: my-command
  purpose: Brief description
  category: devex
  template: multi-phase

agents:
  - name: agent-1
    role: Primary executor
    phase: 1
  - name: agent-2
    role: Validation
    phase: 2

phases:
  - name: Analysis
    duration: 10-15 mins
    steps:
      - action: Analyze codebase
        agent: agent-1
  - name: Execution
    duration: 15-25 mins
    steps:
      - action: Execute changes
        agent: agent-1
      - action: Validate results
        agent: agent-2

examples:
  - title: Basic Usage
    command: /my-command
    description: Standard use case

success_criteria:
  - criteria: Task completed successfully
  - criteria: No errors in logs
  - criteria: Tests pass

notes:
  - Note 1
  - Note 2
\`\`\`

## Best Practices

### Command Naming
- Use kebab-case: `/my-command`
- Be descriptive but concise: `/deploy-staging` not `/ds`
- Use verbs: `/analyze-deps` not `/dependency-analysis`
- Avoid ambiguity: `/ui-test` not `/test` (too generic)

### Documentation
- **Purpose**: 1-2 sentences, clear value proposition
- **Examples**: 3-5 realistic scenarios with actual commands
- **Success Criteria**: Measurable, specific, achievable
- **Notes**: Implementation details, gotchas, best practices

### Agent Selection
- **Primary Agents**: 1-3 core agents for main execution
- **Supporting Agents**: 2-5 agents for validation, monitoring
- **Total**: Keep under 15 agents for maintainability
- **Rationale**: Explain why each agent is needed

### Execution Flow
- **Phases**: 3-8 phases (not too granular, not too coarse)
- **Timing**: Realistic estimates based on similar commands
- **Dependencies**: Clear phase dependencies
- **Parallelization**: Note opportunities for parallel execution

## Notes

- **Interactive Mode**: Recommended for first-time command creation
- **Quick Mode**: For experienced users with clear requirements
- **YAML Spec**: Best for programmatic generation or batch creation
- **Validation**: Always run validation before committing
- **Testing**: Test command in `--dry-run` mode first
- **Documentation**: Keep CLAUDE.md updated with command references
- **Versioning**: Commands are versioned via git; use semantic versioning
- **Deprecation**: Mark deprecated commands in index, provide migration path

## Estimated Execution Time

- **Quick Command** (`--quick`): 5-8 minutes
- **Interactive Wizard** (default): 10-15 minutes
- **Complex Orchestration**: 15-25 minutes
- **From YAML Spec** (`--from-spec`): 2-5 minutes
