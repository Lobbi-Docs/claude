# Container Workflow Hooks

## Overview

The container-workflow plugin uses Claude Code's hook system to provide intelligent, context-aware validation and recommendations during your container development workflow.

## Hook Architecture

```
┌─────────────────┐
│  User Action    │ (Write Dockerfile, docker build, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PreToolUse     │ Validates BEFORE action
│  Hook           │ - Check best practices
│                 │ - Detect security issues
│                 │ - Verify configurations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Execution │ (Actual file write, command run)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostToolUse    │ Suggests AFTER action
│  Hook           │ - Recommend scans
│                 │ - Validate results
│                 │ - Next steps guidance
└─────────────────┘
```

## Hooks Reference

### Pre-Tool Use Hooks

These hooks run **before** a tool executes, validating your actions:

#### 1. Dockerfile Write Validation

**Trigger:** `Write` tool on files matching `**/Dockerfile*`

**Validates:**
- ✅ Base image security (official images, specific tags)
- ✅ Multi-stage build usage
- ✅ Non-root user configuration
- ✅ Layer optimization
- ✅ HEALTHCHECK instruction
- ✅ .dockerignore presence
- ⚠️ Hardcoded secrets detection

**Example Prompt:**
```
Before writing this Dockerfile, validate:

1. Base Image Security
   - Using official/verified base images?
   - Specific version tags (not 'latest')?
   - Minimal base image (alpine, distroless)?

2. Build Best Practices
   - Multi-stage builds for size optimization?
   - Proper layer caching?
   - Non-root user configured?
   ...
```

---

#### 2. Dockerfile Edit Validation

**Trigger:** `Edit` tool on files matching `**/Dockerfile*`

**Validates:**
- 🔒 Security impact of changes
- 📦 Build efficiency preservation
- 🏗️ Layer caching considerations
- 👤 User permission maintenance

**Example Prompt:**
```
Before editing this Dockerfile, review the changes for:

1. Security Impact
   - Are new secrets/credentials being added?
   - Does the change increase attack surface?
   ...
```

---

#### 3. docker-compose Write Validation

**Trigger:** `Write` tool on files matching `**/docker-compose*.yml`

**Validates:**
- 🔐 Environment variable secrets
- 🌐 Network isolation
- 💾 Resource limits (memory, CPU)
- 🔗 Service dependencies
- ❤️ Health checks
- 📁 Volume configurations
- 🔄 Restart policies

**Example Prompt:**
```
Before writing this docker-compose file, validate:

1. Security
   - No hardcoded secrets in environment variables?
   - Using secrets or env_file for sensitive data?
   - Proper network isolation configured?
   ...
```

---

#### 4. docker-compose Edit Validation

**Trigger:** `Edit` tool on files matching `**/docker-compose*.yml`

**Validates:**
- 🔑 Secret exposure prevention
- 🔗 Service dependency impact
- 🌐 Network isolation maintenance
- 💾 Data persistence preservation

---

#### 5. .dockerignore Write Validation

**Trigger:** `Write` tool on files matching `**/.dockerignore`

**Validates:**
- 📂 Required exclusions (.git, node_modules, .env)
- 🔒 Security-critical files (.pem, .key, secrets)
- 🏗️ Build artifacts (dist/, build/, target/)
- 📝 Documentation files (README, LICENSE)

**Example Prompt:**
```
Before writing .dockerignore, ensure it includes:

Required Exclusions:
- .git/ .gitignore
- node_modules/ (or language-specific deps)
- .env .env.* (environment files)
- **/*.log (log files)
...
```

---

### Post-Tool Use Hooks

These hooks run **after** a tool executes, suggesting next steps:

#### 6. Post-Build Recommendations

**Trigger:** `Bash` tool with command matching `docker build.*`

**Recommends:**
1. 🔍 **Security Scan** (trivy image)
2. 📊 **Image Analysis** (size, layers)
3. 🧪 **Container Testing** (health checks)
4. ✅ **Compliance Check** (CIS benchmark)

**Example Prompt:**
```
Docker build completed. Recommended next steps:

1. Security Scan (CRITICAL for production)
   trivy image <image-name>:<tag>

2. Image Analysis
   docker images <image-name> --format '{{.Size}}'
   docker history <image-name>:<tag>
...
```

---

#### 7. Post-Compose Up Validation

**Trigger:** `Bash` tool with command matching `docker-compose up.*`

**Recommends:**
1. ❤️ **Service Health** (docker-compose ps, logs)
2. 🌐 **Network Connectivity** (network inspect)
3. 💾 **Volume Mounts** (volume verification)
4. 📊 **Resource Usage** (docker stats)

**Example Prompt:**
```
Docker Compose stack started. Validation checklist:

1. Service Health
   docker-compose ps
   docker-compose logs --tail=50

2. Network Connectivity
   docker network ls
...
```

---

#### 8. Post-Push Registry Recommendations

**Trigger:** `Bash` tool with command matching `docker push.*`

**Recommends:**
1. ✅ **Verify Push** (check registry UI)
2. 🏷️ **Tag Management** (semantic versioning)
3. 🔍 **Registry Security Scan**
4. 📝 **Documentation** (update CHANGELOG)
5. 🚀 **Deployment** (K8s, Helm updates)

**Example Prompt:**
```
Image pushed to registry. Post-push recommendations:

1. Verify Push
   - Check registry UI for new image
   - Verify all tags pushed correctly

2. Tag Management
   - Create semantic version tags (v1.2.3)
   - Tag stable releases as 'latest'
...
```

---

#### 9. Post-Dockerfile Write Validation

**Trigger:** `Write` tool on files matching `**/Dockerfile*`

**Recommends:**
1. 🏗️ **Build Test** (verify build succeeds)
2. 🔍 **Lint Dockerfile** (hadolint)
3. 🔒 **Security Pre-Check**
4. 📏 **Size Estimation**

**Example Prompt:**
```
Dockerfile created/updated. Recommended validation:

1. Build Test
   docker build -t test-image:local .

2. Lint Dockerfile (if hadolint installed)
   hadolint Dockerfile
...
```

---

## Hook Configuration Format

Hooks are defined in `hooks/hooks.json`:

```json
{
  "PreToolUse": [
    {
      "matcher": {
        "tool": "Write|Edit",
        "filePattern": "**/Dockerfile*"
      },
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validation instructions..."
        }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": {
        "tool": "Bash",
        "commandPattern": "docker build.*"
      },
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Recommendation instructions..."
        }
      ]
    }
  ]
}
```

### Matcher Types

| Field | Description | Example |
|-------|-------------|---------|
| `tool` | Tool name or pattern | `"Write"`, `"Edit"`, `"Bash"` |
| `filePattern` | Glob pattern for files | `"**/Dockerfile*"`, `"**/*.yml"` |
| `commandPattern` | Regex for commands | `"docker build.*"`, `"docker push.*"` |

### Hook Types

| Type | Description | Use Case |
|------|-------------|----------|
| `prompt` | Claude analyzes and responds | Validation, recommendations |
| `script` | Run shell script | Automated checks, linting |
| `block` | Prevent action | Critical security issues |

---

## Customizing Hooks

### Add Custom Validation

Edit `hooks/hooks.json` to add project-specific validation:

```json
{
  "PreToolUse": [
    {
      "matcher": {
        "tool": "Write",
        "filePattern": "**/Dockerfile"
      },
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Ensure Dockerfile uses company-approved base images:\n- alpine:3.18\n- ubuntu:22.04\n- node:20-alpine"
        }
      ]
    }
  ]
}
```

### Disable Hooks

Comment out unwanted hooks or create `.claude/container-workflow.local.md`:

```markdown
# Container Workflow Settings

## Hooks
- **Dockerfile Validation**: disabled
- **Security Scans**: enabled
- **Post-Build Recommendations**: enabled
```

---

## Hook Execution Flow

### Example: Writing a Dockerfile

1. **User Action:** `Write Dockerfile`
2. **PreToolUse Hook Triggers:**
   - Claude receives prompt to validate best practices
   - Claude analyzes intended Dockerfile content
   - Claude suggests improvements or approves
3. **Tool Executes:** Dockerfile is written
4. **PostToolUse Hook Triggers:**
   - Claude recommends running build test
   - Claude suggests linting with hadolint
   - Claude offers to validate security

### Example: Docker Build

1. **User Action:** `docker build -t my-app .`
2. **Tool Executes:** Build completes
3. **PostToolUse Hook Triggers:**
   - Claude recommends security scan (trivy)
   - Claude suggests image size analysis
   - Claude offers to run container tests

---

## Best Practices

### For Users

1. **Trust the Hooks:** They catch common mistakes before they become issues
2. **Follow Recommendations:** Post-build scans prevent security vulnerabilities
3. **Customize:** Add project-specific validations to hooks.json
4. **Review Output:** Claude's analysis helps learn container best practices

### For Plugin Developers

1. **Keep Prompts Focused:** Each hook should validate 1-2 specific concerns
2. **Provide Examples:** Show users what good looks like
3. **Be Actionable:** Give specific commands to run
4. **Balance Noise:** Don't trigger on every trivial action

---

## Troubleshooting

### Hooks Not Triggering

**Check matcher patterns:**
```json
// Correct
"filePattern": "**/Dockerfile*"

// Incorrect
"filePattern": "Dockerfile"  // Too specific
```

### Too Many Hook Prompts

**Adjust hook specificity:**
```json
// Trigger only on Dockerfile (not Dockerfile.dev)
"filePattern": "**/Dockerfile"

// Trigger on all Docker-related files
"filePattern": "**/Dockerfile*"
```

### Bypass Hook for Emergency

Hooks are advisory (type: `prompt`), not blocking. Claude analyzes but won't prevent actions.

---

## Hook Coverage Matrix

| Action | File/Command | Pre-Hook | Post-Hook |
|--------|--------------|----------|-----------|
| Write Dockerfile | `Dockerfile` | ✅ Validate best practices | ✅ Recommend build test |
| Edit Dockerfile | `Dockerfile` | ✅ Validate changes | ✅ Recommend build test |
| Write compose | `docker-compose.yml` | ✅ Security check | - |
| Edit compose | `docker-compose.yml` | ✅ Impact analysis | - |
| Write .dockerignore | `.dockerignore` | ✅ Required exclusions | - |
| `docker build` | CLI | - | ✅ Security scan |
| `docker-compose up` | CLI | - | ✅ Health validation |
| `docker push` | CLI | - | ✅ Tagging recommendations |

---

## Related Documentation

- [Container Best Practices Skill](../skills/container-best-practices.md)
- [Security Scanner Agent](../agents/security-scanner.md)
- [Settings Guide](../SETTINGS.md)

---

## Support

For hook-related issues:
- **GitHub Issues:** https://github.com/your-org/container-workflow/issues
- **Documentation:** [Main README](../README.md)
- **Examples:** See `hooks.json` for full configuration

---

**Last Updated:** 2025-12-13
**Hook System Version:** 1.0.0
