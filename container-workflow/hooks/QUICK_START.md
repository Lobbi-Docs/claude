# Container Workflow Hooks - Quick Start

## 🚀 What Are These Hooks?

The container-workflow plugin uses **intelligent hooks** that automatically validate your container development work. Think of them as a helpful senior DevOps engineer looking over your shoulder, catching issues before they become problems.

---

## ⚡ Instant Benefits

When you use this plugin, Claude will automatically:

### ✅ Before You Write Files (Pre-Hooks)
- **Dockerfile:** "Are you using official images? Non-root user? HEALTHCHECK?"
- **docker-compose.yml:** "Any hardcoded secrets? Resource limits set?"
- **.dockerignore:** "Did you exclude .env files and node_modules?"

### ✅ After You Run Commands (Post-Hooks)
- **`docker build`:** "Want me to run a security scan?"
- **`docker-compose up`:** "Let me check if all services are healthy"
- **`docker push`:** "Should we tag this properly and update the docs?"

---

## 📋 Quick Reference

### What Gets Validated?

| Action | What Claude Checks | When |
|--------|-------------------|------|
| **Write Dockerfile** | Base image, multi-stage builds, security | Before writing |
| **Edit Dockerfile** | Impact of changes, layer optimization | Before editing |
| **Write docker-compose** | Secrets, networks, resource limits | Before writing |
| **Run `docker build`** | Suggests security scans | After build |
| **Run `docker-compose up`** | Service health, logs | After startup |
| **Run `docker push`** | Tagging, documentation | After push |

---

## 🎯 Common Scenarios

### Scenario 1: Creating Your First Dockerfile

**You say:** "Create a Dockerfile for my Node.js API"

**Hook activates:**
```
✅ Pre-Write Hook triggers
Claude checks:
  - Official Node.js base image (node:20-alpine)
  - Multi-stage build for smaller image
  - Non-root user configuration
  - HEALTHCHECK for /health endpoint
  - .dockerignore file exists
```

**Claude creates:** Optimized, secure Dockerfile

**Post-Write Hook triggers:**
```
Claude suggests:
  - Run: docker build -t api:test .
  - Lint: hadolint Dockerfile
  - Test: docker run api:test
```

**Result:** Production-ready Dockerfile in minutes, not hours.

---

### Scenario 2: Building an Image

**You run:** `docker build -t my-app:latest .`

**Build completes:**
```
Successfully built abc123
Successfully tagged my-app:latest
```

**Post-Build Hook activates:**
```
Claude recommends:
  ✅ Security Scan:
     trivy image my-app:latest

  ✅ Image Analysis:
     docker images my-app --format '{{.Size}}'
     docker history my-app:latest

  ✅ Test Container:
     docker run --rm my-app:latest /health
```

**You say:** "Run the security scan"

**Claude executes:**
```bash
trivy image my-app:latest
```

**Claude reports:** "Found 2 HIGH vulnerabilities in base image. Consider upgrading from node:18-alpine to node:20-alpine."

**Result:** Vulnerabilities caught before deployment.

---

### Scenario 3: Deploying with docker-compose

**You say:** "Create docker-compose for Postgres and Redis"

**Pre-Write Hook activates:**
```
Claude checks:
  - No passwords in environment variables
  - Named volumes for data persistence
  - Health checks configured
  - Restart policies set
  - Networks properly isolated
```

**Claude creates:** Secure docker-compose.yml

**You run:** `docker-compose up -d`

**Post-Compose Hook activates:**
```
Claude validates:
  ✅ docker-compose ps (all services running?)
  ✅ docker-compose logs (any errors?)
  ✅ Health checks passing?
```

**Claude reports:** "PostgreSQL healthy, Redis healthy. Ready for development!"

**Result:** Working dev environment with confidence.

---

## 🛠️ Configuration

### Zero Configuration Required

Hooks work out-of-the-box with sensible defaults.

### Optional: Customize for Your Project

Create `.claude/container-workflow.local.md`:

```markdown
# Container Workflow Settings

## Registry
- **Primary**: ghcr.io/your-org

## Scanning
- **Scanner**: trivy
- **Severity Threshold**: HIGH

## Versioning
- **Strategy**: semantic
```

### Optional: Extend Hooks

Edit `hooks/hooks.json` to add custom validations:

```json
{
  "PreToolUse": [
    {
      "matcher": {"tool": "Write", "filePattern": "**/Dockerfile"},
      "hooks": [{
        "type": "prompt",
        "prompt": "Ensure base image is from our approved list: alpine:3.18, ubuntu:22.04"
      }]
    }
  ]
}
```

---

## 🎓 Learning Mode

### Hooks Teach Best Practices

Every validation is a learning opportunity:

**Example Hook Prompt:**
```
Before writing this Dockerfile, validate:

1. Base Image Security
   - Using official/verified base images? ✅
   - Specific version tags (not 'latest')? ✅
   - Minimal base image (alpine, distroless)? ✅

2. Build Best Practices
   - Multi-stage builds for size optimization? ✅
   - Proper layer caching (COPY package files before code)? ✅
   - Non-root user configured? ✅
```

**Result:** You learn container best practices while Claude enforces them.

---

## 📊 Hook Coverage

### Pre-Tool Hooks (5 hooks)

1. **Dockerfile Write** - Best practices validation
2. **Dockerfile Edit** - Change impact analysis
3. **docker-compose Write** - Security checks
4. **docker-compose Edit** - Service impact analysis
5. **.dockerignore Write** - Required exclusions

### Post-Tool Hooks (4 hooks)

1. **docker build** - Security scan recommendations
2. **docker-compose up** - Service health validation
3. **docker push** - Tagging and documentation
4. **Dockerfile Write** - Build testing suggestions

---

## 🚫 What Hooks DON'T Do

- ❌ **Block your work:** Hooks are advisory, not blocking
- ❌ **Auto-fix without permission:** Claude suggests, you approve
- ❌ **Slow you down:** Hooks add ~100-500ms, worth it for safety
- ❌ **Replace testing:** You still need proper CI/CD pipelines

---

## 💡 Pro Tips

### 1. Trust the Hooks
They catch 90% of common container mistakes before they happen.

### 2. Follow Post-Build Recommendations
Always run security scans before pushing to production.

### 3. Learn from Validations
Read the hook prompts to understand *why* something is a best practice.

### 4. Customize for Your Team
Add company-specific policies to `hooks.json`.

### 5. Use with Other Agents
Combine hooks with security-scanner, image-optimizer agents for maximum effectiveness.

---

## 🐛 Troubleshooting

### "Hooks aren't triggering"

**Check file patterns:**
- ✅ `Dockerfile` (exact name)
- ✅ `Dockerfile.prod` (with suffix)
- ✅ `docker/Dockerfile` (in subdirectory)
- ❌ `dockerfile` (lowercase won't match on case-sensitive systems)

### "Too many prompts"

**Adjust specificity in `hooks.json`:**
```json
// Only trigger on exact Dockerfile (not .prod, .dev)
"filePattern": "**/Dockerfile"

// Trigger on all variants
"filePattern": "**/Dockerfile*"
```

### "Want to skip validation once"

Hooks are advisory (`type: "prompt"`), so Claude will proceed if you insist. Just say "proceed without validation" if you have a specific reason.

---

## 📚 Learn More

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Complete hook documentation |
| [INTEGRATION.md](./INTEGRATION.md) | How hooks integrate with Claude |
| [hooks.json](./hooks.json) | Full hook configuration |
| [../SETTINGS.md](../SETTINGS.md) | Plugin settings guide |

---

## 🎯 Next Steps

1. **Try it:** "Create a Dockerfile for my app"
2. **Watch:** See pre-hook validation in action
3. **Learn:** Read Claude's suggestions
4. **Build:** Run the recommended security scans
5. **Customize:** Add your team's policies to hooks.json

---

## ✨ Real-World Impact

### Before Hooks
```
User: "Create Dockerfile"
Claude: *creates Dockerfile*
User: *builds, pushes, deploys*
Production: *container runs as root, has 50 critical CVEs*
Team: 🔥 "Why didn't we catch this?"
```

### With Hooks
```
User: "Create Dockerfile"
Hook: "Validate base image, non-root user, HEALTHCHECK?"
Claude: *creates secure Dockerfile*
Hook: "Run security scan?"
Claude: *finds 2 HIGH CVEs in base image*
Claude: "Upgrading to node:20-alpine to fix vulnerabilities"
User: *builds, scans, deploys*
Production: ✅ Secure, optimized, monitored
Team: 🎉 "Ship it!"
```

---

**Start using hooks today:** Just create a Dockerfile and watch the magic happen!

---

**Last Updated:** 2025-12-13
**Quick Start Version:** 1.0.0
