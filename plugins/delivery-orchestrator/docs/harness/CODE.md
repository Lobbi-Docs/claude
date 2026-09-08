# Harness Code Repository

## API Base URL

```bash
export HARNESS_CODE_API="${HARNESS_BASE_URL}/code/api/v1"
```

## Repository Operations

### Create Repository
```bash
curl -X POST "${HARNESS_CODE_API}/repos" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "my-service",
    "description": "My microservice",
    "default_branch": "main",
    "is_public": false
  }'
```

### List Repositories
```bash
curl -X GET "${HARNESS_CODE_API}/repos" \
  -H "x-api-key: ${HARNESS_API_KEY}"
```

## Pull Request Operations

### Create PR
```bash
curl -X POST "${HARNESS_CODE_API}/repos/my-service/pullreq" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PROJ-123: Add feature",
    "source_branch": "feature/PROJ-123",
    "target_branch": "main",
    "description": "Implements feature X"
  }'
```

### List PRs
```bash
curl -X GET "${HARNESS_CODE_API}/repos/my-service/pullreq?state=open" \
  -H "x-api-key: ${HARNESS_API_KEY}"
```

### Get PR Details
```bash
curl -X GET "${HARNESS_CODE_API}/repos/my-service/pullreq/42" \
  -H "x-api-key: ${HARNESS_API_KEY}"
```

## Comments

### Add General Comment
```bash
curl -X POST "${HARNESS_CODE_API}/repos/my-service/pullreq/42/comments" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"text": "LGTM!"}'
```

### Add Inline Comment
```bash
curl -X POST "${HARNESS_CODE_API}/repos/my-service/pullreq/42/comments" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Consider adding error handling",
    "path": "src/auth.ts",
    "line_start": 42,
    "line_end": 45,
    "line_start_new": true,
    "line_end_new": true
  }'
```

## Reviews

### Submit Review
```bash
curl -X POST "${HARNESS_CODE_API}/repos/my-service/pullreq/42/reviews" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "commit_sha": "abc123def456",
    "decision": "approved"
  }'
```

| Decision | Description |
|----------|-------------|
| `approved` | Approve PR |
| `changereq` | Request changes |
| `reviewed` | Mark as reviewed |

## Merge PR

```bash
curl -X POST "${HARNESS_CODE_API}/repos/my-service/pullreq/42/merge" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "squash",
    "source_sha": "abc123def456",
    "title": "feat: Add feature",
    "delete_source_branch": true
  }'
```

| Method | Description |
|--------|-------------|
| `merge` | Merge commit |
| `squash` | Squash commits |
| `rebase` | Rebase |
| `fast-forward` | Fast-forward |

## Branch Protection

```yaml
branch_rules:
  - pattern: "main"
    require_pull_request: true
    require_approvals: 2
    require_status_checks:
      - "ci/build"
      - "ci/test"
    allow_force_push: false
    allow_deletion: false
```

## API Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Repos | GET | `/v1/repos` |
| Create Repo | POST | `/v1/repos` |
| Get Repo | GET | `/v1/repos/{repo}` |
| List PRs | GET | `/v1/repos/{repo}/pullreq` |
| Create PR | POST | `/v1/repos/{repo}/pullreq` |
| Get PR | GET | `/v1/repos/{repo}/pullreq/{pr}` |
| Create Comment | POST | `/v1/repos/{repo}/pullreq/{pr}/comments` |
| Submit Review | POST | `/v1/repos/{repo}/pullreq/{pr}/reviews` |
| Merge PR | POST | `/v1/repos/{repo}/pullreq/{pr}/merge` |
