"""Code execution sandbox interface."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Language(Enum):
    """Supported programming languages."""

    PYTHON = "python"
    JAVASCRIPT = "javascript"
    BASH = "bash"


@dataclass
class ExecutionConfig:
    """Configuration for code execution."""

    timeout_seconds: int = 30
    max_memory_mb: int = 512
    allow_network: bool = False
    allowed_imports: Optional[list[str]] = None


@dataclass
class ExecutionResult:
    """Result of code execution."""

    success: bool
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: float
    error: Optional[str] = None


class CodeExecutor:
    """Sandboxed code executor."""

    def __init__(self, config: Optional[ExecutionConfig] = None) -> None:
        """Initialize the code executor.
        
        Args:
            config: Execution configuration
        """
        self.config = config or ExecutionConfig()

    async def execute(
        self,
        code: str,
        language: Language,
        stdin: Optional[str] = None,
    ) -> ExecutionResult:
        """Execute code in a sandbox.
        
        Args:
            code: Code to execute
            language: Programming language
            stdin: Optional stdin input
            
        Returns:
            Execution result
        """
        print(f"Executing {language.value} code...")
        print(f"Timeout: {self.config.timeout_seconds}s")
        print(f"Max memory: {self.config.max_memory_mb}MB")

        # Stub implementation - in production, would use actual sandboxing
        # Using Docker, gVisor, or Firecracker for isolation

        if language == Language.PYTHON:
            return await self._execute_python(code, stdin)
        elif language == Language.JAVASCRIPT:
            return await self._execute_javascript(code, stdin)
        elif language == Language.BASH:
            return await self._execute_bash(code, stdin)
        else:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr="",
                exit_code=1,
                execution_time_ms=0.0,
                error=f"Unsupported language: {language}",
            )

    async def _execute_python(self, code: str, stdin: Optional[str]) -> ExecutionResult:
        """Execute Python code.
        
        Args:
            code: Python code
            stdin: Optional stdin
            
        Returns:
            Execution result
        """
        # Stub - simulates execution
        print("--- Python Code ---")
        print(code)
        print("--- End Code ---")

        # Safety checks
        dangerous_keywords = ["import os", "import sys", "subprocess", "eval", "exec"]
        for keyword in dangerous_keywords:
            if keyword in code:
                return ExecutionResult(
                    success=False,
                    stdout="",
                    stderr=f"Forbidden operation detected: {keyword}",
                    exit_code=1,
                    execution_time_ms=0.0,
                    error="Security violation",
                )

        # Simulated successful execution
        return ExecutionResult(
            success=True,
            stdout="Code executed successfully (simulated)\n",
            stderr="",
            exit_code=0,
            execution_time_ms=150.5,
        )

    async def _execute_javascript(
        self, code: str, stdin: Optional[str]
    ) -> ExecutionResult:
        """Execute JavaScript code.
        
        Args:
            code: JavaScript code
            stdin: Optional stdin
            
        Returns:
            Execution result
        """
        print("--- JavaScript Code ---")
        print(code)
        print("--- End Code ---")

        return ExecutionResult(
            success=True,
            stdout="Code executed successfully (simulated)\n",
            stderr="",
            exit_code=0,
            execution_time_ms=120.3,
        )

    async def _execute_bash(self, code: str, stdin: Optional[str]) -> ExecutionResult:
        """Execute Bash code.
        
        Args:
            code: Bash code
            stdin: Optional stdin
            
        Returns:
            Execution result
        """
        print("--- Bash Code ---")
        print(code)
        print("--- End Code ---")

        # Safety checks for dangerous commands
        dangerous_commands = ["rm -rf", "mkfs", "dd if=", "> /dev/"]
        for cmd in dangerous_commands:
            if cmd in code:
                return ExecutionResult(
                    success=False,
                    stdout="",
                    stderr=f"Forbidden command detected: {cmd}",
                    exit_code=1,
                    execution_time_ms=0.0,
                    error="Security violation",
                )

        return ExecutionResult(
            success=True,
            stdout="Code executed successfully (simulated)\n",
            stderr="",
            exit_code=0,
            execution_time_ms=95.7,
        )


async def main() -> None:
    """Run example usage."""
    executor = CodeExecutor(
        ExecutionConfig(timeout_seconds=10, max_memory_mb=256, allow_network=False)
    )

    print("=== Code Execution Sandbox Example ===\n")

    # Python example
    print("--- Executing Python ---")
    result = await executor.execute(
        'print("Hello from Python!")\nfor i in range(3):\n    print(f"Count: {i}")',
        Language.PYTHON,
    )
    print(f"Success: {result.success}")
    print(f"Output: {result.stdout}")
    print(f"Time: {result.execution_time_ms}ms")

    # JavaScript example
    print("\n--- Executing JavaScript ---")
    result = await executor.execute(
        'console.log("Hello from JavaScript!");\nfor (let i = 0; i < 3; i++) {\n  console.log(`Count: ${i}`);\n}',
        Language.JAVASCRIPT,
    )
    print(f"Success: {result.success}")
    print(f"Output: {result.stdout}")
    print(f"Time: {result.execution_time_ms}ms")

    # Bash example
    print("\n--- Executing Bash ---")
    result = await executor.execute(
        'echo "Hello from Bash!"\nfor i in {1..3}; do echo "Count: $i"; done',
        Language.BASH,
    )
    print(f"Success: {result.success}")
    print(f"Output: {result.stdout}")
    print(f"Time: {result.execution_time_ms}ms")

    # Security violation example
    print("\n--- Testing Security ---")
    result = await executor.execute("import os\nos.system('ls')", Language.PYTHON)
    print(f"Success: {result.success}")
    print(f"Error: {result.error}")
    print(f"Stderr: {result.stderr}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
