---
name: review
description: Review Dockerfiles and compose files for best practices and security
argument-hint: [file-path]
allowed-tools: [Read, Grep, Glob, Bash]
---

# Instructions for Claude: Review Container Configuration Files

You are conducting a comprehensive review of Docker configuration files. Follow these steps:

## 1. Determine Target Files

If user provides a file path, review that specific file.

If no path given, search for:
- `Dockerfile*` (including Dockerfile.dev, Dockerfile.prod)
- `docker-compose*.yml` or `docker-compose*.yaml`
- `.dockerignore`

Use Glob to find all relevant files.

## 2. Review Dockerfile

For each Dockerfile, analyze these aspects:

### A. Base Image Security
- **Official images**: Using official images from Docker Hub?
- **Specific tags**: Avoid `latest`, use specific versions (e.g., `node:18.17-alpine`)
- **Minimal images**: Prefer `alpine`, `slim`, or `distroless` variants
- **Image freshness**: Check if base image is outdated

**Issues to flag**:
- `FROM ubuntu:latest` → Suggest `FROM ubuntu:22.04-slim`
- `FROM node` → Suggest `FROM node:18-alpine`

### B. Multi-Stage Build
- **Stages defined**: Are build and runtime stages separated?
- **Stage names**: Are stages clearly named (AS builder, AS runtime)?
- **Artifact copying**: Only copy necessary artifacts to final stage?

**Issues to flag**:
- Single stage with build tools in final image
- Missing `--from=builder` copy directives

### C. Layer Optimization
- **RUN combinations**: Multiple RUN commands that should be combined?
- **Cache efficiency**: Are frequently-changing files copied last?
- **Cleanup in same layer**: `apt-get clean` in same RUN as install?

**Issues to flag**:
```dockerfile
# BAD
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git

# GOOD
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*
```

### D. Security Hardening
- **Non-root user**: Does it use `USER` directive to run as non-root?
- **Secrets exposure**: Any hardcoded credentials, API keys, passwords?
- **Permissions**: Appropriate file permissions set?

**Issues to flag**:
- Missing `USER` directive (runs as root)
- `ENV API_KEY=secret123` in Dockerfile
- World-writable directories

### E. Dependencies
- **Lock files**: Are dependency lock files copied (package-lock.json, Gemfile.lock)?
- **Cache layer**: Dependencies installed before copying source?
- **Production deps**: Using `--production` or equivalent?

**Issues to flag**:
```dockerfile
# BAD
COPY . .
RUN npm install

# GOOD
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

### F. Metadata
- **Labels**: Container labeled with version, maintainer, description?
- **Health checks**: `HEALTHCHECK` directive defined?
- **Exposed ports**: `EXPOSE` matches actual service ports?

### G. Build Context
- **COPY efficiency**: Copying only necessary files?
- **Wildcard usage**: Using `.dockerignore` to exclude unnecessary files?

## 3. Review docker-compose.yml

For compose files, check:

### A. Service Configuration
- **Image pinning**: Services use specific image versions?
- **Resource limits**: Memory and CPU limits defined?
- **Restart policy**: Appropriate restart strategy (unless-stopped, on-failure)?

### B. Networking
- **Networks defined**: Custom networks for service isolation?
- **Port exposure**: Only necessary ports exposed to host?
- **Internal communication**: Services communicate via service names?

### C. Volumes
- **Named volumes**: Using named volumes vs bind mounts appropriately?
- **Volume permissions**: Read-only volumes where applicable (`:ro`)?
- **Data persistence**: Critical data stored in volumes?

### D. Environment Variables
- **Env files**: Using `.env` files for sensitive config?
- **Hardcoded secrets**: No secrets in compose file?
- **Variable substitution**: Using `${VAR}` from environment?

**Issues to flag**:
```yaml
# BAD
environment:
  DATABASE_PASSWORD: secret123

# GOOD
environment:
  DATABASE_PASSWORD: ${DATABASE_PASSWORD}
```

### E. Dependencies
- **depends_on**: Service dependencies declared?
- **Health checks**: Using health checks for proper startup order?

### F. Security
- **Privileged mode**: Avoid `privileged: true` unless necessary
- **Host network**: Avoid `network_mode: host` unless required
- **Capabilities**: Minimal capabilities granted (`cap_add`, `cap_drop`)

## 4. Review .dockerignore

Check for comprehensive exclusions:
- `.git` directory
- `node_modules`, dependency directories
- Build artifacts, logs, temporary files
- IDE configurations, OS files
- Secrets, environment files (`.env`, `*.key`)

**Issues to flag**:
- Missing `.dockerignore` entirely
- Incomplete exclusions (large unnecessary files copied)

## 5. Generate Review Report

Structure your findings:

### Summary
- Files reviewed: [list]
- Overall grade: A/B/C/D/F
- Critical issues: [count]
- Warnings: [count]
- Suggestions: [count]

### Critical Issues (Must Fix)
- 🔴 **Security**: Hardcoded API key on line 15 of Dockerfile
- 🔴 **Security**: Running as root user (no USER directive)

### Warnings (Should Fix)
- 🟡 **Performance**: 3 separate RUN commands could be combined (lines 10-12)
- 🟡 **Best Practice**: Using `latest` tag for base image

### Suggestions (Nice to Have)
- 💡 **Optimization**: Consider alpine variant to reduce size by 80%
- 💡 **Maintainability**: Add HEALTHCHECK directive

### Specific Recommendations

For each issue, provide:
1. **Location**: File and line number
2. **Current code**: What's there now
3. **Suggested fix**: Exact code to replace it
4. **Rationale**: Why this matters

Example:
```
📍 Dockerfile:15
❌ Current:
   FROM node:18

✅ Suggested:
   FROM node:18.17-alpine

💬 Rationale:
   - alpine variant reduces image size by ~80% (from 900MB to 180MB)
   - Specific version tag ensures reproducible builds
   - Reduces attack surface with minimal OS
```

## 6. Offer Auto-Fix

After presenting findings, ask:
"Would you like me to create an optimized version of these files incorporating these recommendations?"

If yes, use Write tool to create:
- `Dockerfile.optimized`
- `docker-compose.optimized.yml`
- `.dockerignore` (if missing)

## Example Interaction

**User**: "Review my Dockerfile"

**You**:
1. Read `./Dockerfile`
2. Analyze each aspect above
3. Generate report:
   - Grade: C
   - 2 critical issues (root user, hardcoded secret)
   - 3 warnings (layer optimization, latest tag, missing healthcheck)
   - 1 suggestion (use alpine)
4. Provide specific fixes for each issue
5. Offer to create optimized version

## Best Practices Reference

Quick checklist:
- ✅ Use specific, minimal base images
- ✅ Multi-stage builds for compiled languages
- ✅ Combine RUN commands, clean up in same layer
- ✅ Copy dependencies before source for cache efficiency
- ✅ Run as non-root user
- ✅ No secrets in images
- ✅ Include HEALTHCHECK
- ✅ Use .dockerignore
- ✅ Pin versions in compose files
- ✅ Define resource limits
- ✅ Use environment variables for config

## Important Notes

- Be specific with line numbers and file paths
- Prioritize security issues over optimizations
- Provide actionable, copy-paste ready fixes
- Explain the "why" behind each recommendation
- Consider the application's specific needs (don't over-optimize)
