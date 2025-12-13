---
name: dev
description: Start FastAPI development server with hot reload and proper configuration
argument-hint: "[--port 8000] [--host 0.0.0.0] [--reload] [--workers 1]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Start FastAPI Development Server

Start the development server with optimal settings for local development.

## Pre-flight Checks

Before starting, verify:
1. **Virtual environment** is activated
2. **Dependencies** are installed (`pip install -r requirements.txt`)
3. **Environment variables** are set (`.env` file exists)
4. **Database** is accessible (MongoDB running)

## Development Server Options

### Standard Development (with uvicorn)

```bash
# Basic start
uvicorn app.main:app --reload --port 8000

# With specific host binding
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# With log level
uvicorn app.main:app --reload --log-level debug

# With SSL (local development)
uvicorn app.main:app --reload --ssl-keyfile=./key.pem --ssl-certfile=./cert.pem
```

### Production-like Development (with gunicorn)

```bash
# Multiple workers with uvicorn worker class
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# With reload for development
gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --reload
```

## Environment Setup

### Required Environment Variables

```bash
# .env file template
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=myapp_dev
REDIS_URL=redis://localhost:6379/0

# Keycloak (if using auth)
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=myrealm
KEYCLOAK_CLIENT_ID=myclient

# AWS S3 (if using file uploads)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET=my-bucket

# App settings
DEBUG=true
LOG_LEVEL=debug
ENVIRONMENT=development
```

### Load Environment

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "myapp"
    redis_url: str = "redis://localhost:6379/0"
    debug: bool = False
    log_level: str = "info"

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

## Docker Development

### Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Stop all
docker-compose down
```

### Development docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - MONGODB_URL=mongodb://mongo:27017
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - mongo
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

## Debugging

### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI Debug",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--port", "8000"
      ],
      "jinja": true,
      "justMyCode": false
    }
  ]
}
```

### PyCharm Configuration

1. Create new "Python" run configuration
2. Module name: `uvicorn`
3. Parameters: `app.main:app --reload --port 8000`
4. Working directory: Project root

## Verification

After starting, verify:

```bash
# Check health endpoint
curl http://localhost:8000/health

# Check API docs
open http://localhost:8000/docs

# Check OpenAPI schema
curl http://localhost:8000/openapi.json
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -i :8000` then `kill -9 <PID>` |
| Module not found | Verify virtual env and `pip install -e .` |
| MongoDB connection failed | Check MongoDB is running: `docker ps` |
| Import errors | Check `__init__.py` files exist |
