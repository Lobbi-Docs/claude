"""MCP Server stub implementation."""

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class Tool:
    """Tool definition."""

    name: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class ToolRequest:
    """Tool execution request."""

    tool: str
    parameters: Dict[str, Any]


@dataclass
class ToolResponse:
    """Tool execution response."""

    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None


class MCPServer:
    """Model Context Protocol server."""

    def __init__(self) -> None:
        """Initialize the MCP server."""
        self.tools: Dict[str, Tool] = {}
        self._register_default_tools()

    def _register_default_tools(self) -> None:
        """Register default tools."""
        # Echo tool
        self.register_tool(
            Tool(
                name="echo",
                description="Echoes back the input message",
                input_schema={
                    "type": "object",
                    "properties": {
                        "message": {"type": "string", "description": "Message to echo"}
                    },
                    "required": ["message"],
                },
            )
        )

        # Calculator tool
        self.register_tool(
            Tool(
                name="calculate",
                description="Performs basic arithmetic operations",
                input_schema={
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "enum": ["add", "subtract", "multiply", "divide"],
                        },
                        "a": {"type": "number"},
                        "b": {"type": "number"},
                    },
                    "required": ["operation", "a", "b"],
                },
            )
        )

    def register_tool(self, tool: Tool) -> None:
        """Register a new tool.
        
        Args:
            tool: Tool to register
        """
        self.tools[tool.name] = tool
        print(f"Registered tool: {tool.name}")

    def list_tools(self) -> List[Tool]:
        """List all registered tools.
        
        Returns:
            List of registered tools
        """
        return list(self.tools.values())

    def execute_tool(self, request: ToolRequest) -> ToolResponse:
        """Execute a tool.
        
        Args:
            request: Tool execution request
            
        Returns:
            Tool execution response
        """
        if request.tool not in self.tools:
            return ToolResponse(success=False, error=f"Tool not found: {request.tool}")

        try:
            if request.tool == "echo":
                return ToolResponse(
                    success=True, result={"message": request.parameters["message"]}
                )
            elif request.tool == "calculate":
                a = request.parameters["a"]
                b = request.parameters["b"]
                op = request.parameters["operation"]

                if op == "add":
                    result = a + b
                elif op == "subtract":
                    result = a - b
                elif op == "multiply":
                    result = a * b
                elif op == "divide":
                    if b == 0:
                        return ToolResponse(success=False, error="Division by zero")
                    result = a / b
                else:
                    return ToolResponse(success=False, error=f"Unknown operation: {op}")

                return ToolResponse(success=True, result={"result": result})
            else:
                return ToolResponse(success=False, error="Tool not implemented")

        except Exception as e:
            return ToolResponse(success=False, error=str(e))

    def handle_request(self, request_json: str) -> str:
        """Handle a JSON request.
        
        Args:
            request_json: JSON request string
            
        Returns:
            JSON response string
        """
        try:
            data = json.loads(request_json)
            action = data.get("action")

            if action == "list_tools":
                tools_data = [
                    {
                        "name": t.name,
                        "description": t.description,
                        "input_schema": t.input_schema,
                    }
                    for t in self.list_tools()
                ]
                return json.dumps({"success": True, "tools": tools_data})

            elif action == "execute_tool":
                request = ToolRequest(
                    tool=data["tool"],
                    parameters=data.get("parameters", {}),
                )
                response = self.execute_tool(request)
                return json.dumps(
                    {
                        "success": response.success,
                        "result": response.result,
                        "error": response.error,
                    }
                )

            else:
                return json.dumps({"success": False, "error": f"Unknown action: {action}"})

        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


def main() -> None:
    """Run the MCP server."""
    server = MCPServer()

    print("=== MCP Server Started ===")
    print(f"Registered {len(server.tools)} tools")

    # Example requests
    print("\n--- Listing Tools ---")
    response = server.handle_request(json.dumps({"action": "list_tools"}))
    print(response)

    print("\n--- Executing Echo Tool ---")
    response = server.handle_request(
        json.dumps(
            {
                "action": "execute_tool",
                "tool": "echo",
                "parameters": {"message": "Hello, MCP!"},
            }
        )
    )
    print(response)

    print("\n--- Executing Calculator Tool ---")
    response = server.handle_request(
        json.dumps(
            {
                "action": "execute_tool",
                "tool": "calculate",
                "parameters": {"operation": "add", "a": 5, "b": 3},
            }
        )
    )
    print(response)


if __name__ == "__main__":
    main()
