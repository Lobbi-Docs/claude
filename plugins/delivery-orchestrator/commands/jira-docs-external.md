---
name: jira:docs-external
intent: Publish documentation to external platforms (GitHub Wiki, API docs, GitBook, Notion, README updates, blog posts)
tags:
  - jira-orchestrator
  - command
  - docs-external
inputs: []
risk: medium
cost: medium
description: Publish documentation to external platforms (GitHub Wiki, API docs, GitBook, Notion, README updates, blog posts)
---

# /jira:docs-external

Publish Jira Orchestrator documentation to external platforms beyond Confluence.

## Actions

| Action | Command | Flags |
|--------|---------|-------|
| publish | `/jira:docs-external publish` | `--platform, --source, --target, --all, --dry-run, --force` |
| sync | `/jira:docs-external sync` | `--platform, --auto, --schedule` |
| status | `/jira:docs-external status` | `--platform, --format` |
| configure | `/jira:docs-external configure` | `--platform, --enabled, --api-key, --space-id` |
| readme | `/jira:docs-external readme` | `--update, --create-pr, --version` |
| blog | `/jira:docs-external blog` | `--type, --version, --publish` |

## Publish Documentation

Publish documentation to one or more external platforms.

```bash
# Publish to GitHub Wiki
/jira:docs-external publish --platform=github-wiki --source=docs/CONFLUENCE-DOCUMENTATION.md

# Publish to all configured platforms
/jira:docs-external publish --all

# Dry run to see what would be published
/jira:docs-external publish --all --dry-run

# Force update even if content hasn't changed
/jira:docs-external publish --platform=github-wiki --force
```

**Supported Platforms:**

- `github-wiki` - GitHub Wiki pages
- `api-docs` - API documentation sites (SwaggerHub, ReadTheDocs)
- `gitbook` - GitBook spaces
- `notion` - Notion workspaces
- `readme` - Repository README updates
- `blog` - Blog posts (Medium, Dev.to)

**Options:**

- `--platform`: Target platform (github-wiki, api-docs, gitbook, notion, readme, blog)
- `--source`: Source documentation file or directory
- `--target`: Target page/path on platform
- `--all`: Publish to all enabled platforms
- `--dry-run`: Show what would be published without actually publishing
- `--force`: Force update even if content unchanged

## Sync Documentation

Set up automatic synchronization to external platforms.

```bash
# Enable auto-sync for GitHub Wiki
/jira:docs-external sync --platform=github-wiki --auto

# Set sync schedule
/jira:docs-external sync --platform=github-wiki --schedule=daily

# Disable auto-sync
/jira:docs-external sync --platform=github-wiki --auto=false
```

**Options:**

- `--platform`: Target platform
- `--auto`: Enable/disable automatic sync
- `--schedule`: Sync schedule (on-change, daily, weekly, on-release)

## Check Status

View publishing status and history.

```bash
# Status for all platforms
/jira:docs-external status

# Status for specific platform
/jira:docs-external status --platform=github-wiki

# Detailed status
/jira:docs-external status --format=detailed
```

**Options:**

- `--platform`: Filter by platform
- `--format`: Output format (table, json, detailed)

## Configure Platform

Configure external documentation platforms.

```bash
# Configure GitHub Wiki
/jira:docs-external configure --platform=github-wiki --enabled=true

# Configure GitBook
/jira:docs-external configure --platform=gitbook --enabled=true --api-key=xxx --space-id=yyy

# Configure Notion
/jira:docs-external configure --platform=notion --enabled=true --api-key=xxx --workspace-id=yyy
```

**Options:**

- `--platform`: Platform to configure
- `--enabled`: Enable/disable platform
- `--api-key`: API key for platform
- `--space-id`: Space/workspace ID
- `--repository`: GitHub repository (for wiki/readme)

## Update README

Update repository README with latest information.

```bash
# Update README
/jira:docs-external readme --update

# Create PR with README updates
/jira:docs-external readme --update --create-pr

# Update version in README
/jira:docs-external readme --version=7.4.0
```

**Options:**

- `--update`: Update README content
- `--create-pr`: Create pull request instead of direct commit
- `--version`: Update version number

## Generate Blog Post

Create blog posts for releases or announcements.

```bash
# Generate release announcement
/jira:docs-external blog --type=release --version=7.4.0

# Generate feature highlight
/jira:docs-external blog --type=feature --issue=PROJ-123

# Publish to configured blog platform
/jira:docs-external blog --type=release --version=7.4.0 --publish
```

**Options:**

- `--type`: Blog post type (release, feature, migration, announcement)
- `--version`: Version number for release posts
- `--issue`: Issue key for feature posts
- `--publish`: Publish to configured blog platform

## Implementation Steps

### Publish

1. Load platform configuration
2. Validate authentication
3. Read source documentation
4. Transform content for platform
5. Publish to platform
6. Verify publication
7. Log results

### Sync

1. Check platform configuration
2. Set up sync schedule
3. Configure webhooks/triggers
4. Enable auto-sync
5. Test sync mechanism

### Status

1. Query platform APIs
2. Check last sync time
3. Verify publication status
4. Check for errors
5. Format results

### Configure

1. Validate platform settings
2. Test authentication
3. Save configuration
4. Enable platform
5. Test connection

### README Update

1. Read current README
2. Extract latest info from docs
3. Update version, features, etc.
4. Create commit or PR
5. Verify changes

### Blog Post

1. Extract release/feature info
2. Format as blog post
3. Add images/examples
4. Preview content
5. Publish if requested

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | GitHub API token (for wiki/readme) |
| `SWAGGERHUB_API_KEY` | SwaggerHub API key |
| `GITBOOK_API_KEY` | GitBook API key |
| `NOTION_API_KEY` | Notion API key |
| `MEDIUM_API_KEY` | Medium API key (for blog) |
| `DEV_TO_API_KEY` | Dev.to API key (for blog) |

## Config Files

- Platform config: `config/external-docs.yaml`
- Publishing history: `sessions/publishing/history.json`
- Platform status: `sessions/publishing/status.json`

## Related Commands

- `/jira:docs` - Internal documentation management
- `/jira:confluence` - Confluence documentation
- `/jira:status` - Overall system status

## Agent References

- `external-documentation-publisher` - Main publishing agent
- `documentation-writer` - Content generation
- `confluence-manager` - Confluence integration

---

Generated with Golden Armada ✨
