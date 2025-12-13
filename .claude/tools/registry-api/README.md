# Claude Code Plugin Registry API

**Production-grade REST API for plugin discovery, distribution, and management.**

This API server establishes a comprehensive plugin marketplace infrastructure with semantic search, analytics tracking, and community-driven quality metrics.

## Business Value

- **Streamlines Plugin Distribution**: Publishers can deploy plugins via API, enabling CI/CD integration
- **Improves Discoverability**: Full-text search with BM25 ranking helps users find relevant plugins
- **Tracks Ecosystem Health**: Download stats, ratings, and trending metrics inform strategic decisions
- **Scales with Growth**: Stateless JWT authentication and SQLite backend support horizontal scaling

## Quick Start

### Installation

```bash
cd .claude/tools/registry-api
npm install
```

### Environment Configuration

Create `.env` file:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Security
JWT_SECRET=your-secure-secret-change-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Database
DB_PATH=../../orchestration/db/registry.db

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## API Endpoints

### Authentication

```bash
# Register new publisher
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "publisher1",
  "email": "publisher@example.com",
  "password": "SecurePass123!",
  "display_name": "Publisher Name"
}

# Login
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "publisher1",
  "password": "SecurePass123!"
}

# Get current user
GET /api/v1/users/me
Authorization: Bearer <token>
```

### Plugin Management

```bash
# List plugins (public)
GET /api/v1/plugins?limit=20&offset=0&category=devops

# Get plugin details
GET /api/v1/plugins/:id

# Publish plugin (requires auth)
POST /api/v1/plugins
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An amazing plugin for Claude Code",
  "author": "Publisher Name",
  "author_email": "publisher@example.com",
  "repository_url": "https://github.com/user/plugin",
  "category": "development",
  "tags": ["automation", "productivity"],
  "readme_content": "# My Plugin\n\nFull README content...",
  "license": "MIT"
}

# Update plugin
PUT /api/v1/plugins/:id
Authorization: Bearer <token>

# Delete plugin (admin only)
DELETE /api/v1/plugins/:id
Authorization: Bearer <admin-token>
```

### Search & Discovery

```bash
# Full-text search
GET /api/v1/search?q=kubernetes&type=hybrid&limit=10

# Trending plugins
GET /api/v1/trending?limit=10

# List categories
GET /api/v1/categories
```

### Downloads & Reviews

```bash
# Download plugin (tracked)
GET /api/v1/plugins/:id/download

# Get statistics
GET /api/v1/plugins/:id/stats

# Rate plugin
POST /api/v1/plugins/:id/rate
Authorization: Bearer <token>
Content-Type: application/json

{
  "stars": 5,
  "review_title": "Excellent plugin!",
  "review_text": "This plugin saved me hours of work..."
}

# Get reviews
GET /api/v1/plugins/:id/reviews?limit=20&offset=0
```

## Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **HTTP Framework** | Express.js | REST API endpoints |
| **Database** | SQLite (better-sqlite3) | Plugin metadata, users, analytics |
| **Authentication** | JWT + bcrypt | Stateless auth with secure password hashing |
| **Validation** | Zod | Type-safe request validation |
| **Search** | SQLite FTS5 | Full-text search with BM25 ranking |
| **Logging** | Winston | Structured logging with correlation IDs |
| **Rate Limiting** | express-rate-limit | DDoS protection |

### Security Considerations

1. **Password Security**: bcrypt with 12 rounds
2. **JWT Tokens**: HS256, 24-hour expiration, secure secret required in production
3. **Rate Limiting**: Configurable per-endpoint limits
4. **Input Validation**: Zod schemas prevent injection attacks
5. **CORS**: Configurable allowed origins
6. **Helmet**: Security headers (CSP, XSS protection, etc.)

### Database Schema

The API leverages the existing `discovery.sql` schema with extensions for authentication:

- `plugin_index`: Core plugin metadata with FTS5 search
- `publishers`: User accounts with role-based access
- `ratings`: Plugin reviews with sentiment analysis
- `search_history`: Analytics for improving discovery
- `plugin_associations`: Collaborative filtering data

### Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 req/min | 60s |
| Authentication | 10 req/min | 60s |
| Search | 50 req/min | 60s |
| Downloads | 200 req/min | 60s |

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: registry-api
  template:
    metadata:
      labels:
        app: registry-api
    spec:
      containers:
      - name: api
        image: registry-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: registry-secrets
              key: jwt-secret
        - name: DB_PATH
          value: /data/registry.db
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: registry-data
```

### Health Checks

```bash
# Kubernetes liveness probe
GET /health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-12T...",
  "uptime": 3600,
  "environment": "production"
}
```

## Monitoring

### Key Metrics

- **Request Latency**: p50, p95, p99 by endpoint
- **Error Rate**: 4xx/5xx by endpoint and error code
- **Search Performance**: Query duration and result relevance
- **Authentication**: Success/failure rates
- **Downloads**: Total, by plugin, trending

### Logging

Structured JSON logs with correlation IDs:

```json
{
  "level": "info",
  "message": "HTTP Request",
  "method": "GET",
  "path": "/api/v1/plugins",
  "statusCode": 200,
  "durationMs": 45,
  "requestId": "uuid-here",
  "timestamp": "2025-12-12T..."
}
```

## API Documentation

Interactive API documentation available at:

- **OpenAPI Spec**: `./openapi.yaml`
- **Swagger UI** (when running): `http://localhost:3000/api-docs` (future enhancement)

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

## Maintenance

### Database Optimization

```bash
# Vacuum database
sqlite3 registry.db "VACUUM;"

# Analyze tables
sqlite3 registry.db "ANALYZE;"

# Rebuild FTS5 index
sqlite3 registry.db "INSERT INTO plugin_search_index(plugin_search_index) VALUES('rebuild');"
```

### Backup Strategy

```bash
# Hot backup (safe during operation)
sqlite3 registry.db ".backup registry-backup.db"

# Scheduled backup (cron)
0 2 * * * sqlite3 /path/to/registry.db ".backup /backups/registry-$(date +\%Y\%m\%d).db"
```

## Scaling Considerations

**Current Capacity** (Single Instance):
- 100 requests/sec sustained
- 10,000+ plugins
- SQLite handles 100,000+ reads/sec

**Scaling Path**:
1. **Horizontal**: Add more API instances behind load balancer
2. **Database**: Migrate to PostgreSQL for multi-writer support
3. **Caching**: Add Redis for rate limiting and trending calculations
4. **CDN**: Serve plugin downloads from CDN

## License

MIT - See LICENSE file

## Support

For issues, feature requests, or questions:
- GitHub Issues: [Lobbi-Docs/claude](https://github.com/Lobbi-Docs/claude/issues)
- Email: markus@example.com
