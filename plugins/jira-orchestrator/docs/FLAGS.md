# Jira Orchestrator Flag System

> **⚡ Comprehensive command customization for every workflow**

## Quick Start

```bash
# Use a preset for common workflows
/jira:work PROJ-123 --preset speed-run
/jira:ship PROJ-456 --preset enterprise

# Mix presets with custom flags
/jira:work PROJ-123 --preset thorough --agents 9

# View available presets
/jira:help presets
```

## Flag Categories

### 🎛️ Global Flags (All Commands)

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--verbose` | `-v` | bool | false | Detailed output |
| `--quiet` | `-q` | bool | false | Errors only |
| `--json` | `-j` | bool | false | JSON output |
| `--dry-run` | `-n` | bool | false | Preview without executing |
| `--interactive` | `-i` | bool | false | Prompt before actions |
| `--yes` | `-y` | bool | false | Auto-confirm prompts |
| `--timeout` | `-t` | int | 300 | Timeout in seconds |
| `--config` | `-c` | string | - | Custom config file |
| `--profile` | `-p` | string | default | Named profile |
| `--preset` | - | string | - | Use preset flags |
| `--debug` | `-d` | bool | false | Debug mode |

### 🤖 Orchestration Flags

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--agents` | `-a` | int | 5 | Number of sub-agents (1-13) |
| `--model` | `-m` | string | auto | Model (opus/sonnet/haiku/auto) |
| `--model-strategy` | - | string | balanced | Multi-model routing |
| `--parallel` | - | bool | true | Run agents in parallel |
| `--sequential` | - | bool | false | Run agents sequentially |
| `--max-concurrent` | - | int | 5 | Max concurrent agents |

#### Phase Control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--phases` | array | all | Phases to execute |
| `--skip-phases` | array | [] | Phases to skip |
| `--start-phase` | string | explore | Start from phase |
| `--end-phase` | string | document | Stop after phase |

**Phases:** `explore` → `plan` → `code` → `test` → `fix` → `document`

```bash
# Skip documentation phase
/jira:work PROJ-123 --skip-phases document

# Only run explore and plan
/jira:work PROJ-123 --phases explore,plan

# Start from code phase (resume)
/jira:work PROJ-123 --start-phase code
```

#### Checkpointing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--checkpoint` | bool | true | Save checkpoints |
| `--checkpoint-interval` | int | 300 | Interval (seconds) |
| `--resume` | `-r` | bool | false | Resume from checkpoint |
| `--resume-from` | string | - | Specific checkpoint ID |

### 🎫 Jira Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--project` | `-P` | string | Override project |
| `--assignee` | - | string | Assign user |
| `--labels` | - | array | Add labels |
| `--components` | - | array | Add components |
| `--priority` | - | string | Set priority |
| `--story-points` | - | int | Set points |
| `--sprint` | `-s` | string | Target sprint |
| `--epic` | - | string | Link to epic |

```bash
# Full customization
/jira:work PROJ-123 \
  --labels bug,critical \
  --priority high \
  --sprint "Sprint 42" \
  --assignee @username
```

### 🔍 Review Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--depth` | string | standard | Review depth |
| `--quick` | bool | false | Quick review (5 min) |
| `--deep` | bool | false | Deep analysis |
| `--exhaustive` | bool | false | Exhaustive review |
| `--focus` | array | [security,performance,architecture] | Focus areas |
| `--security-only` | bool | false | Security focus only |

#### Council Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--council` | bool | false | Use agent council |
| `--council-size` | int | 5 | Council agents (3-11) |
| `--council-protocol` | string | socratic | Deliberation protocol |
| `--require-consensus` | bool | false | Require unanimous |
| `--majority-threshold` | float | 0.6 | Majority threshold |

**Council Protocols:**
- `adversarial` - Devil's advocate approach
- `socratic` - Question-driven exploration
- `dialectic` - Thesis/antithesis synthesis
- `jury` - Formal deliberation
- `delphi` - Anonymous expert consensus
- `red-blue-team` - Attack/defense simulation
- `six-thinking-hats` - Multi-perspective analysis

```bash
# Security review with red-blue team
/jira:council PR-URL --council-protocol red-blue-team --depth exhaustive

# Full council consensus
/jira:ship PROJ-123 --council --council-size 9 --require-consensus
```

#### Quality Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--min-coverage` | int | 80 | Min test coverage % |
| `--max-complexity` | int | 10 | Max cyclomatic complexity |
| `--lint-strict` | bool | false | Strict linting |
| `--type-strict` | bool | true | Strict types |
| `--auto-fix` | bool | false | Auto-fix issues |
| `--fix-style` | bool | true | Fix style issues |
| `--fix-security` | bool | false | Fix security (review required) |

### 🌿 Git Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--branch-prefix` | string | feature | Branch prefix |
| `--from-branch` | string | main | Base branch |
| `--commit-style` | string | conventional | Commit style |
| `--sign-commits` | bool | false | GPG sign |
| `--draft` | bool | false | Draft PR |
| `--reviewers` | array | - | PR reviewers |
| `--auto-merge` | bool | false | Auto-merge |
| `--merge-method` | string | squash | Merge method |

**Branch Prefixes:** `feature`, `bugfix`, `hotfix`, `release`, `chore`, `refactor`

**Commit Styles:** `conventional`, `gitmoji`, `simple`, `detailed`

```bash
# Hotfix with auto-merge
/jira:ship PROJ-123 \
  --branch-prefix hotfix \
  --auto-merge \
  --merge-method merge
```

### 📢 Notification Flags

| Flag | Type | Description |
|------|------|-------------|
| `--notify` | array | Channels (slack, teams, email, webhook) |
| `--slack-channel` | string | Slack channel |
| `--notify-on-start` | bool | Notify when starting |
| `--notify-on-complete` | bool | Notify on completion |
| `--notify-on-error` | bool | Notify on errors |
| `--notify-mentions` | array | Users to mention |

### 📊 Report Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--report` | bool | false | Generate report |
| `--report-format` | string | markdown | Format (md/html/pdf/json) |
| `--report-output` | string | - | Output path |
| `--include-metrics` | bool | true | Include metrics |
| `--include-timeline` | bool | true | Include timeline |
| `--include-diffs` | bool | false | Include code diffs |
| `--report-to-confluence` | bool | false | Publish to Confluence |
| `--report-to-obsidian` | bool | false | Save to Obsidian |

---

## Presets

Use `--preset <name>` to apply predefined flag combinations:

### Speed Presets ⚡

| Preset | Description | Best For |
|--------|-------------|----------|
| `speed-run` | Quick execution, minimal overhead | Small fixes, typos |
| `hotfix` | Emergency deployment | Production issues |
| `prototype` | Relaxed constraints, experimental | PoC, experiments |

### Quality Presets 🔍

| Preset | Description | Best For |
|--------|-------------|----------|
| `thorough` | Deep review, council enabled | New features |
| `enterprise` | Full compliance workflow | Auditable changes |
| `security-audit` | Security-focused analysis | Security reviews |
| `full-council` | Maximum deliberation | Critical decisions |

### Workflow Presets 🔧

| Preset | Description | Best For |
|--------|-------------|----------|
| `code-review` | Review without changes | PR reviews |
| `refactor` | Safe refactoring | Architecture changes |
| `release` | Full release workflow | Deployments |
| `documentation` | Docs focus | README updates |

### Mode Presets 🎯

| Preset | Description | Best For |
|--------|-------------|----------|
| `pair-programming` | Interactive, verbose | Collaboration |
| `learning` | Educational explanations | Onboarding |
| `ci-integration` | CI/CD optimized | Pipelines |
| `cost-optimized` | Budget-friendly | Non-critical tasks |
| `stealth` | Silent execution | Private work |

```bash
# Examples
/jira:work PROJ-123 --preset speed-run
/jira:ship PROJ-456 --preset enterprise
/jira:council PR-URL --preset security-audit
```

---

## Combining Flags

Flags can be combined in any order. Later flags override earlier ones:

```bash
# Preset + custom overrides
/jira:work PROJ-123 \
  --preset thorough \
  --agents 9 \
  --model opus \
  --notify slack

# Multiple focus areas
/jira:council PR-URL \
  --focus security,performance,testing \
  --depth deep

# Full customization
/jira:ship PROJ-123 \
  --agents 7 \
  --model sonnet \
  --council \
  --council-size 5 \
  --council-protocol socratic \
  --depth deep \
  --focus security,architecture \
  --min-coverage 85 \
  --branch-prefix feature \
  --commit-style conventional \
  --draft false \
  --reviewers @reviewer1,@reviewer2 \
  --notify slack,email \
  --report \
  --report-to-confluence
```

---

## Configuration Files

### User Config (`~/.jira-orchestrator.yml`)

```yaml
defaults:
  model: sonnet
  agents: 5
  depth: standard

profiles:
  work:
    model: opus
    agents: 7
    notify:
      - slack

  personal:
    model: haiku
    agents: 3
    notify: []
```

### Project Config (`.jira-orchestrator.yml`)

```yaml
project: PROJ
defaults:
  branch-prefix: feature
  commit-style: conventional

presets:
  custom-review:
    extends: thorough
    flags:
      agents: 9
      notify:
        - slack
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JIRA_VERBOSE` | Default verbose mode |
| `JIRA_TIMEOUT` | Default timeout |
| `JIRA_PROJECT` | Default project |
| `JIRA_DEFAULT_MODEL` | Default model |
| `JIRA_SLACK_CHANNEL` | Slack channel |
| `HARNESS_ORG_ID` | Harness org |
| `HARNESS_PROJECT_ID` | Harness project |

---

## Auto-Recommendations

The system automatically suggests presets based on:

1. **Issue Type**: Bug → `speed-run`, Epic → `enterprise`
2. **Priority**: Blocker → `hotfix`, Low → `cost-optimized`
3. **Labels**: `security` → `security-audit`, `prototype` → `prototype`

```bash
# Let the system recommend
/jira:work PROJ-123 --auto-preset
```

---

## Help Commands

```bash
# List all flags
/jira:help flags

# Show specific flag details
/jira:help flags --agents

# List all presets
/jira:help presets

# Show preset details
/jira:help presets thorough

# Validate flag combination
/jira:work PROJ-123 --dry-run --verbose
```
