# FastAPI Basic Template

A minimal FastAPI application with essential endpoints and middleware. Perfect for quick prototypes and simple APIs.

## Features

- ✅ Basic CRUD operations
- ✅ Health check endpoint
- ✅ CORS middleware configured
- ✅ Interactive API documentation (Swagger UI)
- ✅ Pydantic models for request/response validation
- ✅ Docker support
- ✅ In-memory data storage (easily replaceable)

## Quick Start

### Local Development

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Run the application:**
```bash
python main.py
# or
uvicorn main:app --reload
```

3. **Access the API:**
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health

### Docker

1. **Build the image:**
```bash
docker build -t fastapi-basic .
```

2. **Run the container:**
```bash
docker run -p 8000:8000 fastapi-basic
```

## API Endpoints

### Root
- `GET /` - API information

### Health
- `GET /health` - Health check endpoint

### Items (CRUD)
- `POST /items` - Create a new item
- `GET /items` - List all items (with pagination)
- `GET /items/{item_id}` - Get a specific item
- `PUT /items/{item_id}` - Update an item
- `DELETE /items/{item_id}` - Delete an item

## Example Requests

### Create an Item
```bash
curl -X POST "http://localhost:8000/items" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Item",
    "description": "This is a test item",
    "price": 29.99,
    "tax": 2.50
  }'
```

### List Items
```bash
curl "http://localhost:8000/items?skip=0&limit=10"
```

### Get Item
```bash
curl "http://localhost:8000/items/1"
```

## Project Structure

```
fastapi-basic/
├── main.py              # Application entry point
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Next Steps

To extend this template:

1. **Add Database:** Replace in-memory storage with PostgreSQL, MongoDB, etc.
2. **Add Authentication:** Implement JWT or OAuth2
3. **Add Tests:** Create pytest test suite
4. **Add Logging:** Implement structured logging
5. **Add Validation:** Enhanced input validation
6. **Add Caching:** Redis or in-memory caching
7. **Add Background Tasks:** Celery or FastAPI BackgroundTasks

## Production Considerations

Before deploying to production:

- [ ] Configure CORS origins properly
- [ ] Add database persistence
- [ ] Implement authentication/authorization
- [ ] Add rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure environment variables
- [ ] Add comprehensive error handling
- [ ] Implement API versioning
- [ ] Add security headers
- [ ] Set up CI/CD pipeline

## License

MIT
