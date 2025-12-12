# /create-agent

**Quick Usage:** `/create-agent [agent-name] --category=devops --interactive=true`

Interactive wizard for creating, validating, and integrating new specialized agents into the AI ecosystem.

## Core Parameters

| Parameter | Type | Purpose | Example |
|-----------|------|---------|---------|
| agent-name | string | Agent identifier | `k8s-security-scanner` |
| --category | select | Agent category | `core`, `devops`, `security`, `data-ai` |
| --interactive | boolean | Interactive mode | `true`, `false` |
| --template | string | Base template | `language-specialist`, `cloud-expert` |
| --skip-validation | boolean | Skip validation phases | `false` (not recommended) |

## Quick Examples

\`\`\`bash
# Interactive creation
/create-agent k8s-security-scanner --category=security --interactive=true

# Template-based
/create-agent rust-web-specialist --template=language-specialist

# Non-interactive (expert mode)
/create-agent custom-agent --category=devops --interactive=false
\`\`\`

## What It Does

**8-Phase Agent Lifecycle:**

| Phase | Focus | Duration | Key Activities |
|-------|-------|----------|----------------|
| 1. Discovery | Needs & gap analysis | 10-15 min | Analyze requirements, check duplicates |
| 2. Design | Architecture & persona | 15-25 min | Design capabilities, create persona |
| 3. Prompting | Prompt engineering | 10-15 min | Craft system prompts, examples |
| 4. Generation | File creation | 5-10 min | Generate .md, .json, docs |
| 5. Review | Quality validation | 10-15 min | Code review, best practices check |
| 6. Documentation | Ecosystem integration | 10-15 min | Update registry, CLAUDE.md, guides |
| 7. Testing | Validation scenarios | 15-20 min | Create tests, validate invocations |
| 8. Finalization | Approval & deployment | 5-10 min | Final review, activation |

**Total Time:** 90-120 minutes

## Quality Assurance

- ✅ Duplicate prevention (searches 65-agent ecosystem)
- ✅ Capability gap validation
- ✅ Prompt quality review
- ✅ Documentation completeness check
- ✅ Test scenario coverage
- ✅ Registry integration validation

## Output Artifacts

Creates all required files:
- `.claude/agents/[category]/[name].md` - Agent definition
- `.claude/agents/[category]/[name].json` - Metadata
- `.claude/docs/agents/[name]-guide.md` - Usage guide
- Updates `.claude/registry/agents.index.json`
- Updates `.claude/CLAUDE.md`

## Agent Coordination

Uses **hierarchical orchestration** via `master-strategist`:

\`\`\`
master-strategist
├─ Discovery: general-purpose, plan-decomposer
├─ Design: architect-supreme, documentation-expert
├─ Generation: documentation-expert
├─ Review: senior-reviewer
├─ Testing: test-engineer
└─ Finalization: senior-reviewer
\`\`\`

## Interactive Mode Features

When `--interactive=true`:
- Guided needs analysis questions
- Real-time duplicate detection
- Template selection wizard
- Capability checklist builder
- Example generation prompts
- Preview before finalization

## References

- **Full Workflow:** `.claude/docs/commands/create-agent-reference.md`
- **Agent Templates:** `.claude/templates/agents/`
- **Best Practices:** `.claude/docs/agent-design-patterns.md`
- **Registry System:** `.claude/registry/README.md`
