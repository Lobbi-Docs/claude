# API Documentation Generation

Generate comprehensive API documentation for all endpoints and services:

## Documentation Requirements

### For Each API Endpoint:
1. **Endpoint Details**
   - HTTP Method (GET, POST, PUT, DELETE, PATCH)
   - URL path with parameters
   - Description and purpose

2. **Authentication**
   - Required authentication method
   - Required permissions/roles
   - API key or token requirements

3. **Request**
   - Headers (Content-Type, Authorization, etc.)
   - Path parameters
   - Query parameters
   - Request body schema with types
   - Example request

4. **Response**
   - Success status codes (200, 201, 204)
   - Response body schema with types
   - Example successful response
   - Error status codes (400, 401, 403, 404, 500)
   - Error response format
   - Example error responses

5. **Additional Information**
   - Rate limiting
   - Pagination (if applicable)
   - Sorting and filtering options
   - Versioning information
   - Deprecation warnings

## Documentation Format
Generate documentation in:
- **OpenAPI/Swagger** specification (YAML or JSON)
- **Markdown** for README/docs folder
- **JSDoc/TSDoc** inline comments for code

## Service Documentation
For internal services and functions:
- Purpose and functionality
- Input parameters with types
- Return values with types
- Side effects
- Example usage
- Related functions/services

## Output Structure
\`\`\`
docs/
├── api/
│   ├── openapi.yaml          # OpenAPI specification
│   ├── authentication.md     # Auth guide
│   ├── endpoints/
│   │   ├── users.md
│   │   ├── products.md
│   │   └── orders.md
│   └── examples/             # Request/response examples
└── services/
    └── internal-apis.md      # Internal service docs
\`\`\`

Include code examples in multiple languages/frameworks where relevant (curl, JavaScript, Python, etc.).
