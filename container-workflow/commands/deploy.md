---
name: deploy
description: Deploy Docker images to container registries
argument-hint: <image> [--registry <registry>] [--tag <tag>]
allowed-tools: [Bash, Read, Grep]
---

# Instructions for Claude: Deploy Image to Registry

You are helping the user push a Docker image to a container registry. Follow these steps:

## 1. Parse Arguments

Extract from the user's request:
- **image**: Required. The image name to deploy (e.g., `my-app`)
- **--registry**: Optional. Target registry (default: check config or use `docker.io`)
- **--tag**: Optional. Image tag (default: `latest`)

## 2. Check Configuration

Look for registry configuration in:
- `.claude/container-workflow.local.md` (project settings)
- Environment variables: `DOCKER_REGISTRY`, `GITHUB_TOKEN`, `AWS_ECR_REGISTRY`
- Docker config: `~/.docker/config.json`

Registry options:
- **Docker Hub**: `docker.io/<username>/<image>`
- **GitHub Container Registry**: `ghcr.io/<org>/<image>`
- **AWS ECR**: `<account-id>.dkr.ecr.<region>.amazonaws.com/<image>`
- **Google GCR**: `gcr.io/<project>/<image>`

## 3. Verify Local Image Exists

Check the image exists locally:

```bash
docker images <image>:<tag>
```

If not found, suggest: "Image not found locally. Build it first with `/container:build`"

## 4. Authenticate to Registry

Based on registry type:

### Docker Hub
```bash
# Check if already logged in
docker login

# If not, user needs to provide credentials
echo "Please run: docker login"
```

### GitHub Container Registry (GHCR)
```bash
# Using GitHub token
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### AWS ECR
```bash
# Get login token
aws ecr get-login-password --region <region> | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
```

### Google GCR
```bash
# Use gcloud
gcloud auth configure-docker
```

## 5. Tag Image for Registry

Construct the full registry path and tag:

```bash
docker tag <image>:<tag> <registry>/<namespace>/<image>:<tag>
```

Examples:
- `docker tag my-app:v1.0.0 ghcr.io/my-org/my-app:v1.0.0`
- `docker tag my-app:latest docker.io/username/my-app:latest`

## 6. Push to Registry

Execute the push:

```bash
docker push <registry>/<namespace>/<image>:<tag>
```

Monitor progress and report:
- Layers being pushed
- Push completion status
- Final image digest

## 7. Tag Additional Versions (optional)

Ask user if they want to also tag as:
- `latest` (for production releases)
- `stable` (for stable versions)
- Version aliases (e.g., `v1`, `v1.2` in addition to `v1.2.3`)

```bash
docker tag <image>:<tag> <registry>/<namespace>/<image>:latest
docker push <registry>/<namespace>/<image>:latest
```

## 8. Post-Deploy Report

Provide summary:
- **Registry URL**: Full path to image
- **Tags pushed**: List all tags
- **Image digest**: SHA256 from push output
- **Pull command**: How to pull the image
  ```bash
  docker pull <registry>/<namespace>/<image>:<tag>
  ```

## Example Interaction

**User**: "Deploy my-app:v1.2.3 to ghcr.io"

**You**:
1. Verify `my-app:v1.2.3` exists locally ✓
2. Check GITHUB_TOKEN is set
3. Authenticate: `echo $GITHUB_TOKEN | docker login ghcr.io -u user --password-stdin`
4. Tag: `docker tag my-app:v1.2.3 ghcr.io/org/my-app:v1.2.3`
5. Push: `docker push ghcr.io/org/my-app:v1.2.3`
6. Report: "Pushed successfully to ghcr.io/org/my-app:v1.2.3 (digest: sha256:abc123...)"
7. Ask: "Would you like to also tag as 'latest'?"

## Error Handling

- **Image not found**: Suggest building first
- **Authentication failed**: Check credentials/token
- **Permission denied**: Verify registry access rights
- **Network error**: Check connectivity, retry
- **Disk quota exceeded**: Registry storage limits

## Security Notes

- Never log credentials in output
- Use credential helpers when possible
- Verify registry ownership before pushing
- Suggest signed images for production: `docker trust sign`

## Multi-Architecture Support

For multi-platform images:

```bash
# Create and push manifest
docker buildx imagetools create \
  -t <registry>/<image>:<tag> \
  <registry>/<image>:<tag>-amd64 \
  <registry>/<image>:<tag>-arm64
```

## Important Notes

- Always verify authentication before pushing
- Tag semantic versions for traceability
- Provide full pull command for deployment teams
- Suggest scanning before deploy (`/container:scan`)
