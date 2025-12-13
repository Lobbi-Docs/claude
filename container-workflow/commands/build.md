---
name: build
description: Build optimized Docker images with best practices
argument-hint: <image-name> [--tag <tag>] [--target <stage>] [--no-cache]
allowed-tools: [Bash, Read, Write, Glob, Grep]
---

# Instructions for Claude: Build Docker Image

You are helping the user build a Docker image. Follow these steps:

## 1. Parse Arguments

Extract from the user's request:
- **image-name**: Required. The name for the Docker image (e.g., `my-app`)
- **--tag**: Optional. Image tag (default: `latest`)
- **--target**: Optional. Build target stage in multi-stage Dockerfile
- **--no-cache**: Optional. Build without cache if specified

## 2. Locate Dockerfile

Search for Dockerfile in the current directory:
- Check for `Dockerfile` in project root
- Check for `deployment/docker/Dockerfile`
- Check for `docker/Dockerfile`
- If not found in user's hint, ask where the Dockerfile is located

## 3. Analyze Dockerfile

Read the Dockerfile and check for:
- **Base image**: Is it minimal? (alpine, slim, distroless preferred)
- **Multi-stage builds**: Are they used to reduce final image size?
- **Layer optimization**: Are RUN commands combined appropriately?
- **Security**: Does it run as non-root user?
- **Cache efficiency**: Are dependency files copied before source code?
- **.dockerignore**: Does one exist? Read it to verify coverage

## 4. Suggest Optimizations (if any issues found)

If you find issues, provide specific recommendations:
- "Consider using `node:18-alpine` instead of `node:18` to reduce size by ~80%"
- "Combine RUN commands on lines 12-15 to reduce layers"
- "Add USER directive to run as non-root"
- "Copy package.json before source to leverage cache"

Ask user: "Would you like me to apply these optimizations before building?"

## 5. Prepare Build Command

Construct the docker build command:

```bash
docker build \
  -f <dockerfile-path> \
  -t <image-name>:<tag> \
  [--target <stage>] \
  [--no-cache] \
  [--progress=plain] \
  .
```

## 6. Execute Build

Run the build command and monitor output:
- Show progress to user
- If errors occur, analyze and suggest fixes
- Report final image size

## 7. Post-Build Report

After successful build, provide:
- **Image ID**: From build output
- **Size**: Run `docker images <image-name>:<tag> --format "{{.Size}}"`
- **Layers**: Run `docker history <image-name>:<tag> --no-trunc`
- **Recommendations**: Any further optimizations

## Example Interaction

**User**: "Build my-app with tag v1.2.3"

**You**:
1. Find Dockerfile at `./Dockerfile`
2. Analyze and note it uses multi-stage build (good!)
3. Notice it could use alpine base (suggest)
4. Build: `docker build -t my-app:v1.2.3 .`
5. Report: "Built successfully. Size: 145MB. Consider alpine base to reduce to ~80MB."

## Error Handling

- **Dockerfile not found**: Ask user for location
- **Build fails**: Parse error, suggest fix (missing dependency, syntax error, etc.)
- **Permissions**: Check Docker daemon is running
- **Disk space**: Suggest `docker system prune` if out of space

## Important Notes

- Always verify the Dockerfile exists before building
- Use `--progress=plain` for readable output
- Tag images clearly for later deployment
- Suggest security scans after build (`/container:scan`)
