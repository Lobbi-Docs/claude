---
name: release
description: Create versioned releases with semantic versioning and changelog generation
argument-hint: <version-type: major|minor|patch> [--message <message>] [--tag <custom-tag>]
allowed-tools: [Bash, Read, Write, Grep, Glob]
---

# Instructions for Claude: Create Container Release

You are helping the user create a versioned release with proper tagging and documentation. Follow these steps:

## 1. Parse Arguments

Extract from the user's request:
- **version-type**: Required. One of: `major`, `minor`, `patch` (or a specific version like `1.2.3`)
- **--message**: Optional. Release message/description
- **--tag**: Optional. Custom tag name (overrides semantic version)

## 2. Determine Current Version

Find the current version from:
- `VERSION` file in project root
- `package.json` (for Node.js projects)
- Git tags (most recent tag matching `v*.*.*`)
- Dockerfile LABEL version
- `.claude/container-workflow.local.md` config

```bash
# Check git tags
git describe --tags --abbrev=0 2>/dev/null

# Or read VERSION file
cat VERSION 2>/dev/null
```

If no version found, default to `0.0.0`.

## 3. Calculate Next Version

Based on semantic versioning (MAJOR.MINOR.PATCH):

- **major**: Incompatible API changes (1.2.3 → 2.0.0)
- **minor**: Add functionality, backwards-compatible (1.2.3 → 1.3.0)
- **patch**: Bug fixes, backwards-compatible (1.2.3 → 1.2.4)

```bash
# Example calculation
current="1.2.3"
version_type="minor"
# Result: 1.3.0
```

If user provides specific version (e.g., "1.5.0"), use that directly.

## 4. Verify Git Status

Check repository is in clean state:

```bash
# Uncommitted changes?
if ! git diff-index --quiet HEAD --; then
    echo "Warning: You have uncommitted changes"
    # Ask user: Commit them first or proceed anyway?
fi

# Current branch
branch=$(git rev-parse --abbrev-ref HEAD)
# Confirm: "Release from branch '$branch'?"
```

## 5. Generate Changelog

Create or update `CHANGELOG.md` with changes since last release:

```bash
# Get commits since last tag
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$last_tag" ]; then
    git log $last_tag..HEAD --pretty=format:"- %s (%h)" --no-merges
else
    git log --pretty=format:"- %s (%h)" --no-merges
fi
```

Categorize commits by type (if using conventional commits):

- **Features**: `feat:` commits
- **Fixes**: `fix:` commits
- **Documentation**: `docs:` commits
- **Performance**: `perf:` commits
- **Refactoring**: `refactor:` commits
- **Tests**: `test:` commits
- **Chores**: `chore:` commits
- **Breaking Changes**: Commits with `BREAKING CHANGE:` in body

Example changelog entry:

```markdown
## [1.3.0] - 2024-01-15

### Features
- Add multi-stage build support (a1b2c3d)
- Implement health check endpoint (d4e5f6g)

### Fixes
- Fix memory leak in container cleanup (g7h8i9j)
- Resolve port binding conflicts (j0k1l2m)

### Documentation
- Update deployment guide (m3n4o5p)

### Performance
- Optimize image size by 40% (p6q7r8s)
```

## 6. Update Version Files

Update version in all relevant files:

### VERSION file
```bash
echo "1.3.0" > VERSION
```

### package.json (if exists)
```bash
npm version $new_version --no-git-tag-version
```

### Dockerfile LABEL (if exists)
```dockerfile
# Find and update
LABEL version="1.3.0"
```

### Helm Chart.yaml (if exists)
```yaml
version: 1.3.0
appVersion: "1.3.0"
```

## 7. Commit Version Bump

Create commit for version changes:

```bash
git add VERSION CHANGELOG.md package.json # etc.
git commit -m "chore: bump version to $new_version"
```

## 8. Create Git Tag

Tag the release:

```bash
git tag -a "v$new_version" -m "Release version $new_version

$(cat CHANGELOG_ENTRY.md)"
```

Tag message should include:
- Version number
- Release date
- Brief summary of changes
- Link to full changelog

## 9. Build Release Images

Build Docker images with version tags:

```bash
# Build with version tag
docker build -t <image-name>:$new_version .

# Also tag as latest (for major/minor releases)
docker tag <image-name>:$new_version <image-name>:latest

# Tag version aliases
# For v1.3.0, also tag as v1.3 and v1
docker tag <image-name>:$new_version <image-name>:${major}.${minor}
docker tag <image-name>:$new_version <image-name>:${major}
```

## 10. Push to Registry (optional)

Ask user: "Push images to registry?"

If yes:
```bash
docker push <registry>/<image-name>:$new_version
docker push <registry>/<image-name>:latest
docker push <registry>/<image-name>:${major}.${minor}
docker push <registry>/<image-name>:${major}
```

## 11. Push Git Changes

Push commits and tags:

```bash
# Push commits
git push origin $branch

# Push tags
git push origin "v$new_version"

# Or push all tags
git push --tags
```

## 12. Generate Release Notes

Create detailed release notes in `.claude/releases/v$new_version.md`:

```markdown
# Release v1.3.0

**Release Date**: 2024-01-15
**Release Type**: Minor

## 📦 Artifacts

- **Docker Image**: `ghcr.io/org/app:1.3.0`
- **Image Digest**: `sha256:abc123...`
- **Image Size**: 145MB (25% reduction from v1.2.3)

## 🎯 Highlights

- Multi-stage build support reduces image size by 40%
- New health check endpoint for better orchestration
- Fixed critical memory leak in cleanup process

## 📝 Changelog

### Features
- Add multi-stage build support (#42)
- Implement /health endpoint (#45)

### Fixes
- Fix memory leak in container cleanup (#47)
- Resolve port binding conflicts (#48)

### Documentation
- Update deployment guide with new examples

### Performance
- Optimize image layer caching
- Reduce final image size from 240MB to 145MB

## 🔧 Upgrade Guide

### Breaking Changes
None

### Migration Steps
1. Pull new image: `docker pull ghcr.io/org/app:1.3.0`
2. Update docker-compose.yml version
3. Restart containers: `docker-compose up -d`

### Configuration Changes
- New environment variable: `HEALTH_CHECK_PORT` (default: 8080)

## 🧪 Testing

All integration tests passed:
- ✅ Container startup (5.2s)
- ✅ Health check endpoint
- ✅ API endpoints (12 tests)
- ✅ Database connectivity
- ✅ Volume persistence

## 📊 Metrics

- **Build Time**: 2m 15s
- **Image Layers**: 8 (reduced from 12)
- **Vulnerabilities**: 0 critical, 2 low (down from 5 low)

## 🔗 Links

- [Full Changelog](CHANGELOG.md#130---2024-01-15)
- [Docker Hub](https://hub.docker.com/r/org/app/tags)
- [Documentation](https://docs.example.com/releases/v1.3.0)
```

## 13. Create GitHub Release (if applicable)

If using GitHub, create release via API:

```bash
gh release create "v$new_version" \
  --title "Release v$new_version" \
  --notes-file .claude/releases/v$new_version.md
```

Or provide instructions to user:
"Create GitHub release at: https://github.com/org/repo/releases/new?tag=v$new_version"

## 14. Post-Release Summary

Provide comprehensive summary:

```
✅ Release v1.3.0 created successfully!

📋 Summary:
   • Version: 1.2.3 → 1.3.0 (minor)
   • Commits: 8 new commits
   • Changes: 3 features, 2 fixes, 1 docs
   • Image Size: 240MB → 145MB (40% reduction)

🏷️ Tags:
   • Git tag: v1.3.0 (pushed)
   • Docker: app:1.3.0, app:1.3, app:1, app:latest

📦 Artifacts:
   • Docker images built and pushed
   • Changelog updated
   • Release notes created

🔗 Next Steps:
   1. Verify image: docker pull ghcr.io/org/app:1.3.0
   2. Deploy to staging: helm upgrade staging ./chart
   3. Announce release to team
   4. Monitor deployment health

📄 Release Notes: .claude/releases/v1.3.0.md
```

## Example Interaction

**User**: "Create a minor release with message 'Add health checks'"

**You**:
1. Find current version: `1.2.3` (from git tags)
2. Calculate next: `1.3.0` (minor bump)
3. Check git status: Clean ✓
4. Generate changelog from 8 commits since v1.2.3
5. Update VERSION, package.json, Dockerfile
6. Commit: "chore: bump version to 1.3.0"
7. Create tag: `v1.3.0` with message
8. Build images: `app:1.3.0`, `app:1.3`, `app:1`, `app:latest`
9. Push to registry (after confirmation)
10. Push git commits and tags
11. Create release notes in `.claude/releases/v1.3.0.md`
12. Summary report

## Error Handling

- **Dirty working directory**: Warn about uncommitted changes
- **Tag already exists**: Prevent overwriting, suggest new version
- **Build fails**: Stop release process, report error
- **Push fails**: Check credentials, network, permissions
- **No git repository**: Can't create tags, suggest git init

## Important Notes

- Always verify current state before making changes
- Use semantic versioning consistently
- Generate meaningful changelogs from commit history
- Tag Docker images with multiple versions for flexibility
- Create comprehensive release notes for team reference
- Suggest running tests before release (`/container:test`)
- Suggest security scan before release (`/container:scan`)
