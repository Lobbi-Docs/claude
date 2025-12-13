---
description: Generate optimized Docker configurations with multi-stage builds and docker-compose
argument-hint: "[name] --compose --multi-stage"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith Docker

Generate production-optimized Docker configurations with multi-stage builds, docker-compose orchestration, and best practices.

## Usage
```
/zenith:docker <name> [options]
```

## Arguments
- `name` - Service name (required)

## Options
- `--type <runtime>` - Application runtime (default: auto-detect)
  - `python` - Python application
  - `node` - Node.js application
  - `go` - Go application
  - `rust` - Rust application
  - `java` - Java application
- `--compose` - Generate docker-compose.yml
- `--multi-stage` - Use multi-stage builds
- `--services <list>` - Additional services (comma-separated)
  - `postgres` - PostgreSQL database
  - `redis` - Redis cache
  - `mongo` - MongoDB
  - `nginx` - Nginx reverse proxy
  - `rabbitmq` - RabbitMQ message broker
- `--registry <url>` - Container registry (default: docker.io)
- `--healthcheck` - Add health check
- `--security` - Security hardening (non-root user, scanning)

## Project Structure
```
<name>/
├── Dockerfile
├── Dockerfile.dev
├── docker-compose.yml
├── docker-compose.prod.yml
├── .dockerignore
├── scripts/
│   ├── build.sh
│   ├── push.sh
│   └── run.sh
└── README.md
```

## Multi-Stage Build Example

### Python
```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
USER 1000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

### Node.js
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
CMD ["node", "index.js"]
```

## Docker Compose Structure

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## Examples

```bash
# Basic Python Dockerfile
/zenith:docker api-service --type python --multi-stage

# Full stack with compose
/zenith:docker web-app --type node --compose --services postgres,redis

# Production-ready with security
/zenith:docker prod-app --multi-stage --healthcheck --security --compose

# Go application with monitoring
/zenith:docker go-service --type go --multi-stage --services prometheus,grafana
```

## Features

### Multi-Stage Builds
- Smaller final images
- Separate build dependencies
- Layer caching optimization
- Build-time secret handling

### Security
- Non-root user
- Minimal base images (Alpine)
- Vulnerability scanning
- Secret management
- Read-only root filesystem
- Dropped capabilities

### Optimization
- Layer caching
- .dockerignore configuration
- Minimal dependencies
- Distroless images (optional)
- Build-time optimizations

### Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

### Development Features
- Hot reload support
- Volume mounting for code
- Debug configurations
- Environment variables
- Development dependencies

## Generated Files

### Dockerfile
Production-optimized multi-stage build

### Dockerfile.dev
Development configuration with hot reload

### docker-compose.yml
Development environment orchestration

### docker-compose.prod.yml
Production environment configuration

### .dockerignore
```
node_modules
.git
.env
*.md
tests
.pytest_cache
__pycache__
*.pyc
```

## Build & Run Commands

### Build Image
```bash
docker build -t myapp:latest .
```

### Run Container
```bash
docker run -p 8000:8000 myapp:latest
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

### Production
```bash
# Build for production
docker build -f Dockerfile -t registry/myapp:1.0.0 .

# Push to registry
docker push registry/myapp:1.0.0

# Run with compose
docker-compose -f docker-compose.prod.yml up -d
```

## Service Configurations

### PostgreSQL
- Persistent volumes
- Health checks
- Environment variables
- Initialization scripts

### Redis
- Persistent storage
- Configuration tuning
- Health checks

### Nginx
- Reverse proxy
- SSL/TLS termination
- Static file serving
- Load balancing

### RabbitMQ
- Management UI
- Persistent queues
- Clustering support

## Environment Variables

```env
# Application
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@db:5432/mydb

# Redis
REDIS_URL=redis://redis:6379

# Security
SECRET_KEY=your-secret-key
```

## Agent Assignment
This command activates the **zenith-docker-builder** agent for execution.

## Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Container registry access (for push)

## Post-Creation Steps
1. Review and customize Dockerfile
2. Configure environment variables
3. Update docker-compose.yml services
4. Test build: `docker build -t myapp .`
5. Test run: `docker-compose up`
6. Push to registry if needed

## Best Practices
- Use multi-stage builds
- Run as non-root user
- Use specific image tags
- Minimize layers
- Configure .dockerignore
- Add health checks
- Use secrets for sensitive data
- Enable logging
- Tag images semantically
- Scan for vulnerabilities
