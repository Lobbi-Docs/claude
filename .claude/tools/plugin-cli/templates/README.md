# Plugin Templates

This directory contains templates for different plugin types.

## Template Types

### agent-pack
Collection of specialized agents for specific tasks or domains.

**Use when:**
- Building domain-specific automation agents
- Creating agent workflows
- Providing specialized AI assistants

**Structure:**
```
agents/
  agent-name.md
.claude-plugin/
  plugin.json
```

### skill-pack
Collection of domain knowledge and patterns.

**Use when:**
- Providing framework/library expertise
- Domain-specific knowledge bases
- File-pattern based activation

**Structure:**
```
skills/
  skill-name/
    SKILL.md
.claude-plugin/
  plugin.json
```

### workflow-pack
Pre-built commands and workflows.

**Use when:**
- Creating slash commands
- Building workflow automation
- Providing quick actions

**Structure:**
```
commands/
  command-name.md
workflows/
  workflow-name.md
.claude-plugin/
  plugin.json
```

### full
Complete plugin with all resource types.

**Use when:**
- Building comprehensive platform plugins
- Combining agents, skills, commands, and hooks
- Maximum flexibility needed

**Structure:**
```
agents/
skills/
commands/
hooks/
  scripts/
.claude-plugin/
  plugin.json
```

## Using Templates

Templates are automatically used by the CLI scaffolder:

```bash
claude-plugin init my-plugin --type agent-pack
```

The scaffolder will:
1. Copy the template structure
2. Generate plugin.json
3. Create sample resources (if --samples flag used)
4. Initialize git (if --git flag used)
