# Tag System Documentation

**Version:** 1.0.0
**Last Updated:** 2026-01-02
**Maintainer:** Golden Armada

## Overview

The Jira Orchestrator Tag System provides a comprehensive, hierarchical taxonomy for organizing and tracking work across Jira, GitHub, and Confluence. This system enables automated tag application, cross-platform synchronization, and intelligent workflow management.

## Quick Reference

### Tag Categories

| Category | Prefix | Count | Description |
|----------|--------|-------|-------------|
| Type | `type/` | 11 | Nature of work (feature, bugfix, etc.) |
| Priority | `priority/` | 4 | Urgency and importance |
| Status | `status/` | 6 | Current state of work |
| Component | `component/` | 8 | System area affected |
| Environment | `env/` | 4 | Target deployment environment |
| Team | `team/` | 6 | Team ownership |
| Risk | `risk/` | 4 | Risk indicators |
| Review | `review/` | 4 | Code review status |
| Automation | `auto/` | 4 | Automation indicators |
| Size | `size/` | 5 | Work complexity/size |

**Total Tags:** 65 across 10 categories

---

## Tag Categories

### 1. Type Tags (`type/`)

Categorizes the nature of work being performed.

| Tag | Description | Color | Platforms |
|-----|-------------|-------|-----------|
| `type/feature` | New feature or enhancement | ![#0E8A16](https://via.placeholder.com/15/0E8A16/000000?text=+) `#0E8A16` | Jira, GitHub |
| `type/bugfix` | Bug fix or error correction | ![#D73A4A](https://via.placeholder.com/15/D73A4A/000000?text=+) `#D73A4A` | Jira, GitHub |
| `type/hotfix` | Critical production fix | ![#B60205](https://via.placeholder.com/15/B60205/000000?text=+) `#B60205` | Jira, GitHub |
| `type/refactor` | Code refactoring | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | Jira, GitHub |
| `type/docs` | Documentation updates | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` | All |
| `type/infra` | Infrastructure changes | ![#5319E7](https://via.placeholder.com/15/5319E7/000000?text=+) `#5319E7` | Jira, GitHub |
| `type/security` | Security-related changes | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` | Jira, GitHub |
| `type/performance` | Performance optimization | ![#006B75](https://via.placeholder.com/15/006B75/000000?text=+) `#006B75` | Jira, GitHub |
| `type/test` | Test additions/modifications | ![#C5DEF5](https://via.placeholder.com/15/C5DEF5/000000?text=+) `#C5DEF5` | Jira, GitHub |
| `type/spike` | Research or investigation | ![#E99695](https://via.placeholder.com/15/E99695/000000?text=+) `#E99695` | Jira |
| `type/chore` | Maintenance tasks | ![#EDEDED](https://via.placeholder.com/15/EDEDED/000000?text=+) `#EDEDED` | Jira, GitHub |

**Auto-Apply Examples:**
- Jira issue type "Story" → `type/feature`
- PR title starts with `feat:` → `type/feature`
- PR title starts with `fix:` → `type/bugfix`

### 2. Priority Tags (`priority/`)

Indicates urgency and importance of work.

| Tag | Description | Color | Use When |
|-----|-------------|-------|----------|
| `priority/critical` | Production down or critical impact | ![#B60205](https://via.placeholder.com/15/B60205/000000?text=+) `#B60205` | System outage, data loss risk |
| `priority/high` | Important work to prioritize | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` | Significant bugs, key features |
| `priority/medium` | Standard priority work | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | Regular backlog items |
| `priority/low` | Nice-to-have, can be deferred | ![#0E8A16](https://via.placeholder.com/15/0E8A16/000000?text=+) `#0E8A16` | Minor improvements |

**Auto-Apply Rules:**
- Syncs automatically from Jira Priority field
- Critical/Highest Jira priority → `priority/critical`

### 3. Status Tags (`status/`)

Current state of work item.

| Tag | Description | Color | Platforms |
|-----|-------------|-------|-----------|
| `status/blocked` | Work blocked by dependencies | ![#B60205](https://via.placeholder.com/15/B60205/000000?text=+) `#B60205` | Jira, GitHub |
| `status/in-progress` | Active work in progress | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` | Jira, GitHub |
| `status/review` | Awaiting code review | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | Jira, GitHub |
| `status/qa` | In quality assurance testing | ![#C5DEF5](https://via.placeholder.com/15/C5DEF5/000000?text=+) `#C5DEF5` | Jira, GitHub |
| `status/done` | Completed and verified | ![#0E8A16](https://via.placeholder.com/15/0E8A16/000000?text=+) `#0E8A16` | Jira, GitHub |
| `status/on-hold` | Work paused temporarily | ![#EDEDED](https://via.placeholder.com/15/EDEDED/000000?text=+) `#EDEDED` | Jira, GitHub |

**Auto-Apply Examples:**
- Jira status "In Progress" → `status/in-progress`
- PR state "open" + review requested → `status/review`
- PR merged → `status/done`

### 4. Component Tags (`component/`)

System component or area affected.

| Tag | Description | Color | Auto-Apply From |
|-----|-------------|-------|-----------------|
| `component/frontend` | Frontend UI code | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` | `src/components/`, `src/pages/` |
| `component/backend` | Backend services | ![#5319E7](https://via.placeholder.com/15/5319E7/000000?text=+) `#5319E7` | `src/services/`, `src/controllers/` |
| `component/api` | API interfaces | ![#006B75](https://via.placeholder.com/15/006B75/000000?text=+) `#006B75` | `src/api/`, `openapi.yaml` |
| `component/database` | Database schemas | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` | `migrations/`, `schema/` |
| `component/infra` | Infrastructure | ![#1D76DB](https://via.placeholder.com/15/1D76DB/000000?text=+) `#1D76DB` | `terraform/`, `k8s/` |
| `component/ci-cd` | CI/CD pipelines | ![#C5DEF5](https://via.placeholder.com/15/C5DEF5/000000?text=+) `#C5DEF5` | `.github/workflows/` |
| `component/docs` | Documentation | ![#0E8A16](https://via.placeholder.com/15/0E8A16/000000?text=+) `#0E8A16` | `docs/`, `*.md` |
| `component/testing` | Test infrastructure | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | `test/`, `__tests__/` |

### 5. Environment Tags (`env/`)

Target deployment environment.

| Tag | Description | Color | Use When |
|-----|-------------|-------|----------|
| `env/dev` | Development environment | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` | Testing features locally |
| `env/staging` | Staging/UAT environment | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | Pre-production testing |
| `env/prod` | Production environment | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` | Live production changes |
| `env/all` | Affects all environments | ![#5319E7](https://via.placeholder.com/15/5319E7/000000?text=+) `#5319E7` | Cross-env changes |

### 6. Team Tags (`team/`)

Team ownership and responsibility.

| Tag | Description | Color |
|-----|-------------|-------|
| `team/platform` | Platform engineering team | ![#1D76DB](https://via.placeholder.com/15/1D76DB/000000?text=+) `#1D76DB` |
| `team/frontend` | Frontend development team | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` |
| `team/backend` | Backend development team | ![#5319E7](https://via.placeholder.com/15/5319E7/000000?text=+) `#5319E7` |
| `team/devops` | DevOps team | ![#006B75](https://via.placeholder.com/15/006B75/000000?text=+) `#006B75` |
| `team/qa` | Quality assurance team | ![#C5DEF5](https://via.placeholder.com/15/C5DEF5/000000?text=+) `#C5DEF5` |
| `team/security` | Security team | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` |

### 7. Risk Tags (`risk/`)

Risk indicators for changes.

| Tag | Description | Color | When to Use |
|-----|-------------|-------|-------------|
| `risk/breaking-change` | Breaking API changes | ![#B60205](https://via.placeholder.com/15/B60205/000000?text=+) `#B60205` | API contract changes |
| `risk/data-migration` | Database migration required | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` | Schema changes |
| `risk/security-sensitive` | Security-critical code | ![#D73A4A](https://via.placeholder.com/15/D73A4A/000000?text=+) `#D73A4A` | Auth, encryption changes |
| `risk/performance-impact` | May impact performance | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | Large data operations |

### 8. Review Tags (`review/`)

Code review and approval status (GitHub only).

| Tag | Description | Color | Auto-Apply When |
|-----|-------------|-------|-----------------|
| `review/needs-review` | Awaiting initial review | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` | PR open, no reviews |
| `review/changes-requested` | Changes requested | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` | Review state = changes |
| `review/approved` | Approved by reviewers | ![#0E8A16](https://via.placeholder.com/15/0E8A16/000000?text=+) `#0E8A16` | Required approvals met |
| `review/council-review` | Architecture council review | ![#5319E7](https://via.placeholder.com/15/5319E7/000000?text=+) `#5319E7` | Breaking changes |

### 9. Automation Tags (`auto/`)

Automation and tooling indicators.

| Tag | Description | Color | Platforms |
|-----|-------------|-------|-----------|
| `auto/generated` | Auto-generated content | ![#EDEDED](https://via.placeholder.com/15/EDEDED/000000?text=+) `#EDEDED` | All |
| `auto/synced` | Synced across platforms | ![#C5DEF5](https://via.placeholder.com/15/C5DEF5/000000?text=+) `#C5DEF5` | All |
| `auto/linked` | Linked to external resources | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` | All |
| `auto/deployed` | Automatically deployed | ![#0E8A16](https://via.placeholder.com/15/0E8A16/000000?text=+) `#0E8A16` | GitHub |

### 10. Size Tags (`size/`)

Estimated size or complexity of work.

| Tag | Description | Story Points | Lines Changed | Color |
|-----|-------------|--------------|---------------|-------|
| `size/xs` | Extra small, trivial | ≤ 1 | < 50 | ![#C5DEF5](https://via.placeholder.com/15/C5DEF5/000000?text=+) `#C5DEF5` |
| `size/s` | Small, minor change | ≤ 3 | 50-150 | ![#0075CA](https://via.placeholder.com/15/0075CA/000000?text=+) `#0075CA` |
| `size/m` | Medium, moderate change | ≤ 5 | 150-500 | ![#FBCA04](https://via.placeholder.com/15/FBCA04/000000?text=+) `#FBCA04` |
| `size/l` | Large, significant change | ≤ 8 | 500-1000 | ![#D93F0B](https://via.placeholder.com/15/D93F0B/000000?text=+) `#D93F0B` |
| `size/xl` | Extra large, major change | > 8 | > 1000 | ![#B60205](https://via.placeholder.com/15/B60205/000000?text=+) `#B60205` |

---

## Usage Guide

### Manual Tagging

#### In Jira

1. Open the issue
2. Click "Labels" in the issue details
3. Type tag name (e.g., `type/feature`)
4. Select or create the tag

#### In GitHub

1. Open the PR or issue
2. Click "Labels" in the right sidebar
3. Select tags from the list
4. Multiple tags can be applied

#### In Confluence

1. Open the page
2. Click the three dots menu → "Page Labels"
3. Add tags separated by spaces

### Automatic Tagging

The system automatically applies tags based on:

1. **Conventional Commits**: PR titles using conventional commit format
   ```
   feat: Add user authentication → type/feature
   fix: Resolve login timeout → type/bugfix
   refactor: Simplify API routes → type/refactor
   ```

2. **File Paths**: Modified files in PR
   ```
   src/components/* → component/frontend
   migrations/* → component/database, risk/data-migration
   terraform/* → component/infra
   ```

3. **Jira Fields**: Status, priority, component mappings
   ```
   Priority: Critical → priority/critical
   Status: In Progress → status/in-progress
   Component: Backend → component/backend
   ```

4. **PR Metadata**: Size, review state
   ```
   +300 lines → size/m
   Review approved → review/approved
   ```

### Tag Synchronization

Tags are automatically synchronized between platforms:

#### Jira → GitHub
When a Jira issue links to a GitHub PR:
- `type/*`, `priority/*`, `component/*`, `team/*` tags sync to PR

#### GitHub → Jira
When a PR references a Jira issue:
- `status/*`, `review/*`, `size/*` tags sync to issue

#### Jira → Confluence
When creating documentation from a Jira issue:
- `type/*`, `component/*`, `team/*` tags sync to page

### Best Practices

#### Required Tags

**Jira Issues:**
- At least one `type/*` tag
- At least one `priority/*` tag

**GitHub PRs:**
- At least one `type/*` tag
- At least one `component/*` tag

**Confluence Pages:**
- At least one `team/*` tag

#### Recommended Tags

**For Jira Epics:**
- Add `team/*` for ownership
- Add `component/*` for scope

**For GitHub PRs:**
- Add `size/*` for planning
- Add `review/*` for visibility

**For Breaking Changes:**
- Always add `risk/breaking-change`
- Always add `review/council-review`

#### Tag Combinations

**Critical Production Fix:**
```
type/hotfix
priority/critical
env/prod
team/platform
```

**New Feature Development:**
```
type/feature
priority/medium
component/frontend
team/frontend
size/m
```

**Database Migration:**
```
type/refactor
component/database
risk/data-migration
env/staging
team/backend
```

---

## Conflict Resolution

### Mutually Exclusive Tags

Some tag categories allow only one tag at a time:

- **Priority**: Only one `priority/*` tag (highest priority wins)
- **Status**: Only one `status/*` tag (latest state wins)
- **Size**: Only one `size/*` tag (calculated value wins)

### Multiple Tags Allowed

These categories allow multiple tags:

- **Type**: Up to 3 tags (e.g., `type/feature` + `type/docs`)
- **Team**: Up to 2 tags (for cross-team work)
- **Component**: Multiple tags for cross-component changes
- **Risk**: Multiple risk indicators

### Conflict Resolution Strategies

1. **Highest Priority Wins**: For `priority/*` tags
2. **Latest State Wins**: For `status/*` tags
3. **Calculated Value Wins**: For `size/*` tags
4. **Manual Override**: User-applied tags take precedence over auto-applied

---

## Validation and Warnings

### Validation Rules

The system validates tag usage and shows warnings for:

1. **Missing Required Tags**
   ```
   WARNING: Jira issue missing type/* tag
   ```

2. **Breaking Change Without Review**
   ```
   WARNING: risk/breaking-change should have review/council-review
   ```

3. **Critical Without Team Assignment**
   ```
   WARNING: priority/critical should have team/* tag
   ```

4. **Large Work Not Broken Down**
   ```
   WARNING: size/xl should be broken into Epic with sub-tasks
   ```

### Auto-Fix Suggestions

When validation warnings occur, the system suggests:

- Adding missing required tags
- Breaking down large work items
- Requesting appropriate reviews
- Assigning to teams

---

## Integration Configuration

### Jira Integration

```yaml
jira:
  label_prefix: ""  # No prefix
  custom_field_mapping:
    risk_level: "customfield_10050"
    deployment_env: "customfield_10051"
```

### GitHub Integration

```yaml
github:
  label_prefix: ""  # No prefix
  create_missing_labels: true
  sync_on_pr_create: true
  sync_on_pr_update: true
```

### Confluence Integration

```yaml
confluence:
  label_prefix: ""  # No prefix
  apply_to_pages: true
  apply_to_blog_posts: false
```

---

## Command Reference

### Tag Manager Agent

The Tag Manager agent provides commands for tag operations:

```bash
# Apply tags to issue
jira-orchestrator tag-apply ISSUE-123 type/feature priority/high

# Sync tags between platforms
jira-orchestrator tag-sync ISSUE-123 PR-456

# Validate tags
jira-orchestrator tag-validate ISSUE-123

# List tags for item
jira-orchestrator tag-list ISSUE-123

# Bulk tag update
jira-orchestrator tag-bulk --filter "status=In Progress" --add status/in-progress
```

### Query Examples

**Find all critical bugs:**
```
labels = "type/bugfix" AND labels = "priority/critical"
```

**Find frontend work in review:**
```
labels = "component/frontend" AND labels = "status/review"
```

**Find breaking changes:**
```
labels = "risk/breaking-change"
```

---

## Statistics

- **Total Tags**: 65
- **Categories**: 10
- **Platforms**: 3 (Jira, GitHub, Confluence)
- **Auto-Apply Rules**: 47
- **Color Palette**: 15 distinct colors

---

## Color Palette Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Green | `#0E8A16` | Positive states (done, approved, low priority) |
| Blue | `#0075CA` | In progress, frontend |
| Purple | `#5319E7` | Backend, special reviews |
| Yellow | `#FBCA04` | Warnings, medium priority |
| Orange | `#D93F0B` | High priority, database |
| Red | `#D73A4A` | Bugs, errors |
| Dark Red | `#B60205` | Critical, breaking changes |
| Teal | `#006B75` | APIs, performance |
| Light Blue | `#C5DEF5` | Tests, QA, automation |
| Gray | `#EDEDED` | Chores, paused work |

---

## Troubleshooting

### Tags Not Auto-Applying

1. Check auto-apply rules match your naming convention
2. Verify integration is enabled
3. Check tag configuration in `tags.yaml`
4. Review tag validation warnings

### Tags Not Syncing

1. Verify remote links between Jira and GitHub
2. Check sync configuration is enabled
3. Ensure tag names match exactly
4. Review propagation rules

### Duplicate Tags

1. Tags are case-sensitive - check capitalization
2. Remove manual tags before auto-apply
3. Check conflict resolution settings

---

## Migration Guide

### From Existing Label System

1. **Audit Current Labels**: Review existing Jira/GitHub labels
2. **Map to New Taxonomy**: Create mapping file for migration
3. **Bulk Update**: Use tag-bulk command to migrate
4. **Validate**: Run tag-validate on all items
5. **Clean Up**: Remove old unmapped labels

### Example Migration Script

```bash
# Map old labels to new tags
jira-orchestrator tag-migrate \
  --map "bug=type/bugfix" \
  --map "enhancement=type/feature" \
  --map "critical=priority/critical" \
  --dry-run

# Execute migration
jira-orchestrator tag-migrate \
  --map-file migration-map.yaml \
  --execute
```

---

## Extending the System

### Adding Custom Tags

1. Edit `tags.yaml`
2. Add tag under appropriate category
3. Define auto-apply rules (optional)
4. Update this documentation
5. Restart the tag manager service

### Creating New Categories

1. Define category in `tags.yaml`
2. Set conflict resolution strategy
3. Define validation rules
4. Add propagation rules
5. Update documentation

---

## Support and Feedback

For issues, questions, or suggestions:

1. Create a Jira issue with `component/jira-orchestrator`
2. Tag with `type/enhancement` or `type/bugfix`
3. Assign to `team/platform`

---

**Golden Armada** - Orchestrating Excellence, One Tag at a Time
