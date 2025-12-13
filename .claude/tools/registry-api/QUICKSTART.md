# Registry API - Quick Start Guide

Get the Plugin Registry API running in **5 minutes**.

## Prerequisites

- Node.js 20+ installed
- Basic understanding of REST APIs
- (Optional) Postman or similar API client

## Installation

```bash
# Navigate to registry-api directory
cd .claude/tools/registry-api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# (Optional) Edit .env for custom configuration
# For development, defaults work fine
```

## Start the Server

```bash
# Development mode with hot reload
npm run dev

# You should see:
# ✓ Registry API Server started
#   - Port: 3000
#   - Environment: development
```

## Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-12T...",
  "uptime": 5,
  "environment": "development"
}
```

## Try the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "publisher1",
    "email": "publisher@example.com",
    "password": "SecurePass123!",
    "display_name": "Plugin Publisher"
  }'
```

**Save the `accessToken` from the response!**

### 2. Publish a Plugin

```bash
# Replace YOUR_TOKEN with the token from step 1
curl -X POST http://localhost:3000/api/v1/plugins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "my-first-plugin",
    "version": "1.0.0",
    "description": "My awesome Claude Code plugin that does amazing things",
    "author": "Plugin Publisher",
    "author_email": "publisher@example.com",
    "repository_url": "https://github.com/your-username/plugin",
    "category": "development",
    "tags": ["automation", "productivity"],
    "readme_content": "# My Plugin\n\nThis plugin helps with...",
    "license": "MIT"
  }'
```

### 3. Search for Plugins

```bash
# Search for your plugin
curl "http://localhost:3000/api/v1/search?q=automation&limit=5"
```

### 4. Get Plugin Details

```bash
# Replace PLUGIN_ID with the ID from step 2
curl http://localhost:3000/api/v1/plugins/PLUGIN_ID
```

### 5. Rate the Plugin

```bash
curl -X POST http://localhost:3000/api/v1/plugins/PLUGIN_ID/rate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "stars": 5,
    "review_title": "Great plugin!",
    "review_text": "This plugin solved my problem perfectly."
  }'
```

## Common Operations

### List All Plugins

```bash
curl "http://localhost:3000/api/v1/plugins?limit=10&offset=0"
```

### Filter by Category

```bash
curl "http://localhost:3000/api/v1/plugins?category=devops&limit=20"
```

### Get Trending Plugins

```bash
curl http://localhost:3000/api/v1/trending?limit=10
```

### Get Plugin Statistics

```bash
curl http://localhost:3000/api/v1/plugins/PLUGIN_ID/stats
```

## Using Postman

1. Import the OpenAPI spec: `openapi.yaml`
2. Create environment variable: `base_url = http://localhost:3000/api/v1`
3. Add authorization header: `Bearer {{token}}`
4. Try the pre-configured requests

## Next Steps

- [Read full documentation](./README.md)
- [View OpenAPI spec](./openapi.yaml)
- [Explore source code](./src/)
- [Run integration tests](./tests/)

## Troubleshooting

### Server won't start

```bash
# Check if port 3000 is already in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Change port in .env
PORT=3001
```

### Database errors

```bash
# Ensure database directory exists
mkdir -p ../../orchestration/db

# Check database path in .env
DB_PATH=../../orchestration/db/registry.db
```

### JWT errors

```bash
# Make sure JWT_SECRET is set in .env
# For development, the default works
JWT_SECRET=development-secret-change-in-production
```

## Production Deployment

See [README.md](./README.md) for:
- Docker deployment
- Kubernetes manifests
- Environment configuration
- Security best practices
- Monitoring setup

## Support

- GitHub Issues: [Lobbi-Docs/claude](https://github.com/Lobbi-Docs/claude/issues)
- Documentation: [README.md](./README.md)
- OpenAPI Spec: [openapi.yaml](./openapi.yaml)
