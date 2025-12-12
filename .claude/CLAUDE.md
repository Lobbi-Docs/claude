# Golden Armada - Ultra-Minimal Entry Point

**Context Budget:** 100,000 tokens | **Current File:** ~1,000 tokens (98.6% reduction from original)

---

## 🚀 Quick Start

**Stack:** Python 3.11 + Node.js 20 + Docker/K8s | **LLMs:** Claude/GPT/Gemini/Ollama

**Project:** `C:\Users\MarkusAhling\dev\new-alpa-1.4\Alpha-1.4` | **Branch:** main

---

## ⚡ Context Management (AUTO-ENFORCED)

| Metric                 | Value                       |
| ---------------------- | --------------------------- |
| **Token Budget**       | 100,000 tokens              |
| **Warning Threshold**  | 75% (75K tokens)            |
| **Critical Threshold** | 90% (90K tokens)            |
| **Auto-Checkpoint**    | Enabled at phase completion |
| **Auto-Compress**      | Triggered at 75% usage      |

**Enforcement:** `.claude/hooks/context-management-hook.sh` (runs pre/post task)

---

## 📋 Mandatory Protocol (ENFORCED)

```
EXPLORE (2+ agents) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

- **Min Sub-Agents:** 3-5 per task
- **Max Sub-Agents:** 13 per task
- **Testing:** REQUIRED before completion
- **Documentation:** REQUIRED in Obsidian vault

**Enforcement:** `.claude/hooks/orchestration-protocol-enforcer.sh`

**Full Protocol:** Load from `[[System/Claude-Instructions/Orchestration-Protocol]]`

---

## 🗂️ Resource Registry (Lazy-Loaded)

**All resources loaded on-demand from registry indexes:**

| Resource      | Index Location                          | Count           |
| ------------- | --------------------------------------- | --------------- |
| **Agents**    | `.claude/registry/agents.index.json`    | 101             |
| **Skills**    | `.claude/registry/skills.index.json`    | 31              |
| **MCPs**      | `.claude/registry/mcps.index.json`      | 8               |
| **Workflows** | `.claude/registry/workflows.index.json` | 21              |
| **Keywords**  | `.claude/registry/search/keywords.json` | Unified mapping |

**Quick Lookup:** Check keyword index → Load specific agent/skill/workflow on-demand

### Lobbi Platform Agents (NEW)
| Category          | Agents | Purpose                        |
| ----------------- | ------ | ------------------------------ |
| multi-tenant      | 2      | Tenant architecture, provisioning |
| stripe-payment    | 3      | Payments, subscriptions, invoices |
| frontend-theming  | 3      | Theme system, white-labeling     |
| selenium-testing  | 3      | E2E tests, auth/member flows     |
| membership-domain | 4      | Member CRUD, engagement, analytics |
| utility           | 3      | Context cleanup, registry mgmt   |

---

## 🔌 MCP Servers (8 Available)

**Load full MCP documentation:** `[[System/Claude-Instructions/MCP-Servers]]`

| MCP            | Quick Use                                         |
| -------------- | ------------------------------------------------- |
| **supabase**   | `db` `migrate` `types` `tables`                   |
| **vercel**     | `deploy`                                          |
| **github**     | `create_pull_request` `list_issues` `push_files`  |
| **upstash**    | Redis cache, QStash queues                        |
| **playwright** | `snapshot` Browser automation                     |
| **context7**   | `docs` Library documentation (MANDATORY for code) |
| **obsidian**   | `vault` `vault-read` `vault-search` `vault-add`   |
| **ide**        | Diagnostics, Jupyter                              |

**Context7:** ALWAYS use for library docs, configs, framework patterns

---

## 🎯 When to Load External Docs

| Trigger                 | Load Document                                                       |
| ----------------------- | ------------------------------------------------------------------- |
| "deploy", "k8s", "helm" | [[System/Claude-Instructions/Skills-and-Commands]] (DevOps section) |
| "implement", "build"    | [[System/Claude-Instructions/Orchestration-Protocol]]               |
| Need agent list         | [[System/Claude-Instructions/Agent-Categories]]                     |
| Need workflow           | [[System/Claude-Instructions/Workflows]]                            |
| Orchestration details   | [[System/Claude-Instructions/Orchestration-System]]                 |
| MCP tool usage          | [[System/Claude-Instructions/MCP-Servers]]                          |

**Load Command:** `mcp__obsidian__get_file_contents("System/Claude-Instructions/{filename}.md")`

---

## 🔑 Environment Variables

| Variable              | Purpose                          |
| --------------------- | -------------------------------- |
| `ANTHROPIC_API_KEY`   | Claude agents                    |
| `OPENAI_API_KEY`      | GPT agents                       |
| `GOOGLE_API_KEY`      | Gemini agents                    |
| `JIRA_API_TOKEN`      | Jira integration                 |
| `SUPABASE_*`          | Supabase MCP                     |
| `VERCEL_*`            | Vercel MCP                       |
| `UPSTASH_*`           | Upstash MCP                      |
| `OBSIDIAN_VAULT_PATH` | `C:\Users\MarkusAhling\obsidian` |

**Security:** Never commit secrets. Use K8s secrets or env vars.

---

## ⚙️ Quick CLI

```bash
# Deploy
docker build -f deployment/docker/claude/Dockerfile -t golden-armada/claude-agent .
helm upgrade --install golden-armada ./deployment/helm/golden-armada -n agents

# Debug
kubectl logs -n agents -l app=claude-agent -f

# Orchestration status
.claude/orchestration/cli.sh status

# Context optimization
.claude/commands/context-optimize.md status
```

---

## 📁 Directory Structure (Minimal)

```
.claude/
├── CLAUDE.md                  # This file (minimal)
├── registry/                  # Indexes (load on-demand)
├── orchestration/             # Coordination system
├── hooks/                     # Enforcement hooks
└── docs/                      # Implementation guides

obsidian/  (C:\Users\MarkusAhling\obsidian)
└── System/
    └── Claude-Instructions/   # External detailed docs
        ├── Orchestration-Protocol.md
        ├── MCP-Servers.md
        ├── Agent-Categories.md
        ├── Workflows.md
        ├── Skills-and-Commands.md
        └── Orchestration-System.md
```

---

## ✅ Context Efficiency Principles

1. **Registry-First:** All metadata in JSON indexes
2. **Lazy Loading:** Resources loaded on-demand
3. **External Storage:** Detailed docs in Obsidian vault
4. **Auto-Checkpoint:** Phase outputs saved externally
5. **Progressive Disclosure:** Load only what's needed

---

## 🎓 Key Reminders

### ALWAYS:

- Use 3-5 minimum sub-agents (max 13) - **ENFORCED**
- Follow 6-phase protocol: EXPLORE → PLAN → CODE → TEST → FIX → DOCUMENT
- Use Context7 for library docs
- Verify work before marking complete
- Document EVERYTHING in Obsidian vault (not project repo)
- Use Task tool with parallel agents for complex work
- Archive completed .md files to Obsidian, then remove from repo

### NEVER:

- Skip testing phase
- Declare "done" without running tests
- Lose context between phases
- Work on complex tasks without spawning sub-agents
- Keep old documentation files in repo (sync to Obsidian first)

### Hooks Enforcement:

| Hook                        | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| enforce-subagent-usage.sh   | Reminds to use sub-agents for complex tasks |
| obsidian-documentation-sync | Auto-syncs docs to Obsidian vault          |
| repo-cleanup-manager.sh     | Archives old .md files, declutters repo    |
| tenant-isolation-validator  | Validates org_id filtering in code         |
| stripe-webhook-security     | Validates Stripe webhook handlers          |
| member-data-privacy         | Checks PII handling compliance             |

### Lookup Strategy:

1. Check registry keyword index
2. Load specific resource on-demand from Obsidian vault
3. Use MCP for external services
4. Activate skills based on file context

---

## 🤖 Model Assignment

| Model      | Use For                                      |
| ---------- | -------------------------------------------- |
| **opus**   | Strategic planning, complex architecture     |
| **sonnet** | Development, analysis, coordination          |
| **haiku**  | Documentation, simple tasks, fast operations |

---

## 📊 Context Reduction Metrics

| Metric                 | Value                     |
| ---------------------- | ------------------------- |
| **Original CLAUDE.md** | 719 lines, ~15,000 tokens |
| **This File**          | ~120 lines, ~1,000 tokens |
| **Reduction**          | 98.6%                     |
| **External Docs**      | 6 files in Obsidian vault |
| **Load Strategy**      | On-demand via MCP         |

---

## 📖 Load Full Documentation

When needed, load complete sections from Obsidian vault:

```python
# Example: Load full orchestration protocol
protocol = mcp__obsidian__get_file_contents(
    filepath="System/Claude-Instructions/Orchestration-Protocol.md"
)

# Example: Load MCP servers documentation
mcps = mcp__obsidian__get_file_contents(
    filepath="System/Claude-Instructions/MCP-Servers.md"
)

# Example: Load workflows
workflows = mcp__obsidian__get_file_contents(
    filepath="System/Claude-Instructions/Workflows.md"
)
```

---

**Optimized for:** Maximum orchestration, zero context loss, measurable outcomes, 98.6% token reduction.
