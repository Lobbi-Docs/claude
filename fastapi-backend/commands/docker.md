---
name: docker
description: Build and manage Docker containers for FastAPI application
argument-hint: "[build|run|push|compose] [--tag latest] [--registry] [--platform linux/amd64]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Docker Operations for FastAPI

Build, run, and manage Docker containers for FastAPI applications.

## Build Commands

### Basic Build

```bash
# Build with default tag
docker build -t myapp:latest .

# Build with specific tag
docker build -t myapp:v1.0.0 .

# Build for specific platform
docker build --platform linux/amd64 -t myapp:latest .

# Build with build args
docker build --build-arg ENVIRONMENT=production -t myapp:latest .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .
```

### Production Dockerfile

```dockerfile
# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels and install
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application
COPY --chown=appuser:appgroup ./app ./app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Development Dockerfile

```dockerfile
# Dockerfile.dev
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Copy source (will be overridden by volume mount)
COPY . .

# Development server with reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

## Run Commands

### Local Development

```bash
# Run container
docker run -p 8000:8000 myapp:latest

# Run with environment variables
docker run -p 8000:8000 \
    -e MONGODB_URL=mongodb://host.docker.internal:27017 \
    -e REDIS_URL=redis://host.docker.internal:6379 \
    myapp:latest

# Run with .env file
docker run -p 8000:8000 --env-file .env myapp:latest

# Run interactively for debugging
docker run -it -p 8000:8000 myapp:latest /bin/bash

# Run with volume mount (development)
docker run -p 8000:8000 -v $(pwd)/app:/app/app myapp:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=mongodb://mongo:27017
      - DATABASE_NAME=myapp
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo_data:
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Scale service
docker-compose up -d --scale api=3

# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Push to Registry

### Docker Hub

```bash
# Login
docker login

# Tag image
docker tag myapp:latest username/myapp:latest

# Push
docker push username/myapp:latest
```

### GitHub Container Registry (GHCR)

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag image
docker tag myapp:latest ghcr.io/org/myapp:latest

# Push
docker push ghcr.io/org/myapp:latest
```

### Azure Container Registry (ACR)

```bash
# Login
az acr login --name myregistry

# Tag image
docker tag myapp:latest myregistry.azurecr.io/myapp:latest

# Push
docker push myregistry.azurecr.io/myapp:latest
```

### AWS ECR

```bash
# Login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

## Image Management

```bash
# List images
docker images | grep myapp

# Remove old images
docker image prune -a --filter "until=24h"

# Inspect image
docker inspect myapp:latest

# View image history
docker history myapp:latest

# Check image size
docker images myapp:latest --format "{{.Size}}"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails on dependencies | Check `requirements.txt` and build-essential |
| Container exits immediately | Check logs: `docker logs <container>` |
| Cannot connect to MongoDB | Use `host.docker.internal` for local MongoDB |
| Permission denied | Verify USER directive and file ownership |
| Image too large | Use multi-stage builds, slim base images |
