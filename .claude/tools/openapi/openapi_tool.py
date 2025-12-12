"""OpenAPI tool for REST API integration."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import json


@dataclass
class APIEndpoint:
    """API endpoint definition."""

    method: str
    path: str
    summary: str
    parameters: List[Dict[str, Any]]
    request_body: Optional[Dict[str, Any]] = None


@dataclass
class APIResponse:
    """API response."""

    status_code: int
    data: Any
    headers: Dict[str, str]


class OpenAPITool:
    """Tool for interacting with OpenAPI/REST APIs."""

    def __init__(self, spec_url: str) -> None:
        """Initialize the OpenAPI tool.
        
        Args:
            spec_url: URL to the OpenAPI specification
        """
        self.spec_url = spec_url
        self.endpoints: Dict[str, APIEndpoint] = {}
        self._load_spec()

    def _load_spec(self) -> None:
        """Load and parse the OpenAPI specification."""
        # Stub implementation - in real use, would fetch and parse the spec
        print(f"Loading OpenAPI spec from: {self.spec_url}")

        # Example endpoints
        self.endpoints = {
            "get_users": APIEndpoint(
                method="GET",
                path="/users",
                summary="Get list of users",
                parameters=[
                    {"name": "limit", "in": "query", "schema": {"type": "integer"}},
                    {"name": "offset", "in": "query", "schema": {"type": "integer"}},
                ],
            ),
            "get_user": APIEndpoint(
                method="GET",
                path="/users/{userId}",
                summary="Get user by ID",
                parameters=[
                    {"name": "userId", "in": "path", "schema": {"type": "string"}, "required": True}
                ],
            ),
            "create_user": APIEndpoint(
                method="POST",
                path="/users",
                summary="Create a new user",
                parameters=[],
                request_body={
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "email": {"type": "string"},
                                },
                                "required": ["name", "email"],
                            }
                        }
                    }
                },
            ),
        }

    def list_endpoints(self) -> List[APIEndpoint]:
        """List all available endpoints.
        
        Returns:
            List of API endpoints
        """
        return list(self.endpoints.values())

    async def call_endpoint(
        self,
        endpoint_id: str,
        path_params: Optional[Dict[str, str]] = None,
        query_params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
    ) -> APIResponse:
        """Call an API endpoint.
        
        Args:
            endpoint_id: ID of the endpoint to call
            path_params: Path parameters
            query_params: Query parameters
            body: Request body
            
        Returns:
            API response
        """
        if endpoint_id not in self.endpoints:
            return APIResponse(
                status_code=404,
                data={"error": f"Endpoint not found: {endpoint_id}"},
                headers={},
            )

        endpoint = self.endpoints[endpoint_id]

        # Stub implementation - in real use, would make actual HTTP request
        print(f"Calling {endpoint.method} {endpoint.path}")
        print(f"Path params: {path_params}")
        print(f"Query params: {query_params}")
        print(f"Body: {body}")

        # Simulated response
        if endpoint_id == "get_users":
            return APIResponse(
                status_code=200,
                data={
                    "users": [
                        {"id": "1", "name": "Alice", "email": "alice@example.com"},
                        {"id": "2", "name": "Bob", "email": "bob@example.com"},
                    ]
                },
                headers={"Content-Type": "application/json"},
            )
        elif endpoint_id == "get_user":
            user_id = path_params.get("userId") if path_params else None
            return APIResponse(
                status_code=200,
                data={"id": user_id, "name": "Alice", "email": "alice@example.com"},
                headers={"Content-Type": "application/json"},
            )
        elif endpoint_id == "create_user":
            return APIResponse(
                status_code=201,
                data={"id": "3", **body} if body else {"id": "3"},
                headers={"Content-Type": "application/json"},
            )

        return APIResponse(status_code=501, data={"error": "Not implemented"}, headers={})


async def main() -> None:
    """Run example usage."""
    tool = OpenAPITool("https://api.example.com/openapi.json")

    print("=== OpenAPI Tool Example ===\n")

    # List endpoints
    print("Available endpoints:")
    for endpoint in tool.list_endpoints():
        print(f"  {endpoint.method} {endpoint.path} - {endpoint.summary}")

    # Call endpoints
    print("\n--- Getting users ---")
    response = await tool.call_endpoint("get_users", query_params={"limit": 10, "offset": 0})
    print(f"Status: {response.status_code}")
    print(f"Data: {json.dumps(response.data, indent=2)}")

    print("\n--- Getting user by ID ---")
    response = await tool.call_endpoint("get_user", path_params={"userId": "1"})
    print(f"Status: {response.status_code}")
    print(f"Data: {json.dumps(response.data, indent=2)}")

    print("\n--- Creating user ---")
    response = await tool.call_endpoint(
        "create_user", body={"name": "Charlie", "email": "charlie@example.com"}
    )
    print(f"Status: {response.status_code}")
    print(f"Data: {json.dumps(response.data, indent=2)}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
