"""File I/O tool with security guards."""

import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import List, Optional


class Operation(Enum):
    """File operation types."""

    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    LIST = "list"


@dataclass
class AccessGuards:
    """Security guards for file operations."""

    max_file_size_mb: int = 10
    allowed_extensions: Optional[List[str]] = None
    forbidden_patterns: Optional[List[str]] = None
    base_path: Optional[Path] = None


@dataclass
class FileOperation:
    """Record of a file operation."""

    operation: Operation
    path: str
    success: bool
    error: Optional[str] = None
    size_bytes: Optional[int] = None


class FileIOTool:
    """File I/O tool with security guards."""

    def __init__(self, guards: Optional[AccessGuards] = None) -> None:
        """Initialize the file I/O tool.
        
        Args:
            guards: Security guards configuration
        """
        self.guards = guards or AccessGuards(
            base_path=Path("/tmp/file_io_sandbox"),
            allowed_extensions=[".txt", ".json", ".yaml", ".yml", ".md"],
            forbidden_patterns=["../", "~", "/etc/", "/sys/", "/proc/"],
        )
        self.operation_log: List[FileOperation] = []

        # Ensure base path exists
        if self.guards.base_path:
            self.guards.base_path.mkdir(parents=True, exist_ok=True)

    def _validate_path(self, path: str) -> tuple[bool, Optional[str]]:
        """Validate a file path against security guards.
        
        Args:
            path: Path to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check forbidden patterns
        if self.guards.forbidden_patterns:
            for pattern in self.guards.forbidden_patterns:
                if pattern in path:
                    return False, f"Forbidden pattern detected: {pattern}"

        # Check allowed extensions
        if self.guards.allowed_extensions:
            ext = Path(path).suffix.lower()
            if ext and ext not in self.guards.allowed_extensions:
                return False, f"File extension not allowed: {ext}"

        # Check if path is within base path
        if self.guards.base_path:
            try:
                full_path = (self.guards.base_path / path).resolve()
                if not str(full_path).startswith(str(self.guards.base_path.resolve())):
                    return False, "Path traversal attempt detected"
            except Exception as e:
                return False, f"Invalid path: {e}"

        return True, None

    def _get_safe_path(self, path: str) -> Path:
        """Get the safe absolute path.
        
        Args:
            path: Relative path
            
        Returns:
            Safe absolute path
        """
        if self.guards.base_path:
            return self.guards.base_path / path
        return Path(path)

    async def read_file(self, path: str) -> tuple[bool, Optional[str], Optional[str]]:
        """Read a file.
        
        Args:
            path: Path to the file
            
        Returns:
            Tuple of (success, content, error)
        """
        # Validate path
        is_valid, error = self._validate_path(path)
        if not is_valid:
            self.operation_log.append(
                FileOperation(operation=Operation.READ, path=path, success=False, error=error)
            )
            return False, None, error

        safe_path = self._get_safe_path(path)

        # Check if file exists
        if not safe_path.exists():
            error = f"File not found: {path}"
            self.operation_log.append(
                FileOperation(operation=Operation.READ, path=path, success=False, error=error)
            )
            return False, None, error

        # Check file size
        size = safe_path.stat().st_size
        max_size = self.guards.max_file_size_mb * 1024 * 1024
        if size > max_size:
            error = f"File too large: {size} bytes (max: {max_size})"
            self.operation_log.append(
                FileOperation(operation=Operation.READ, path=path, success=False, error=error)
            )
            return False, None, error

        # Read file
        try:
            content = safe_path.read_text(encoding="utf-8")
            self.operation_log.append(
                FileOperation(
                    operation=Operation.READ, path=path, success=True, size_bytes=size
                )
            )
            return True, content, None
        except Exception as e:
            error = f"Failed to read file: {e}"
            self.operation_log.append(
                FileOperation(operation=Operation.READ, path=path, success=False, error=error)
            )
            return False, None, error

    async def write_file(
        self, path: str, content: str
    ) -> tuple[bool, Optional[str]]:
        """Write a file.
        
        Args:
            path: Path to the file
            content: Content to write
            
        Returns:
            Tuple of (success, error)
        """
        # Validate path
        is_valid, error = self._validate_path(path)
        if not is_valid:
            self.operation_log.append(
                FileOperation(operation=Operation.WRITE, path=path, success=False, error=error)
            )
            return False, error

        # Check content size
        size = len(content.encode("utf-8"))
        max_size = self.guards.max_file_size_mb * 1024 * 1024
        if size > max_size:
            error = f"Content too large: {size} bytes (max: {max_size})"
            self.operation_log.append(
                FileOperation(operation=Operation.WRITE, path=path, success=False, error=error)
            )
            return False, error

        safe_path = self._get_safe_path(path)

        # Ensure parent directory exists
        safe_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        try:
            safe_path.write_text(content, encoding="utf-8")
            self.operation_log.append(
                FileOperation(
                    operation=Operation.WRITE, path=path, success=True, size_bytes=size
                )
            )
            return True, None
        except Exception as e:
            error = f"Failed to write file: {e}"
            self.operation_log.append(
                FileOperation(operation=Operation.WRITE, path=path, success=False, error=error)
            )
            return False, error

    async def list_files(self, path: str = ".") -> tuple[bool, Optional[List[str]], Optional[str]]:
        """List files in a directory.
        
        Args:
            path: Directory path
            
        Returns:
            Tuple of (success, file_list, error)
        """
        # Validate path
        is_valid, error = self._validate_path(path)
        if not is_valid:
            self.operation_log.append(
                FileOperation(operation=Operation.LIST, path=path, success=False, error=error)
            )
            return False, None, error

        safe_path = self._get_safe_path(path)

        if not safe_path.exists():
            error = f"Directory not found: {path}"
            self.operation_log.append(
                FileOperation(operation=Operation.LIST, path=path, success=False, error=error)
            )
            return False, None, error

        try:
            files = [f.name for f in safe_path.iterdir() if f.is_file()]
            self.operation_log.append(
                FileOperation(operation=Operation.LIST, path=path, success=True)
            )
            return True, files, None
        except Exception as e:
            error = f"Failed to list files: {e}"
            self.operation_log.append(
                FileOperation(operation=Operation.LIST, path=path, success=False, error=error)
            )
            return False, None, error

    def get_operation_log(self) -> List[FileOperation]:
        """Get the operation log.
        
        Returns:
            List of file operations
        """
        return self.operation_log.copy()


async def main() -> None:
    """Run example usage."""
    # Create tool with default guards
    tool = FileIOTool()

    print("=== File I/O Tool Example ===\n")
    print(f"Base path: {tool.guards.base_path}")
    print(f"Max file size: {tool.guards.max_file_size_mb}MB")
    print(f"Allowed extensions: {tool.guards.allowed_extensions}")
    print()

    # Write a file
    print("--- Writing file ---")
    success, error = await tool.write_file("test.txt", "Hello, World!\nThis is a test file.")
    print(f"Success: {success}")
    if error:
        print(f"Error: {error}")

    # Read the file
    print("\n--- Reading file ---")
    success, content, error = await tool.read_file("test.txt")
    print(f"Success: {success}")
    if content:
        print(f"Content:\n{content}")
    if error:
        print(f"Error: {error}")

    # List files
    print("\n--- Listing files ---")
    success, files, error = await tool.list_files(".")
    print(f"Success: {success}")
    if files:
        print(f"Files: {files}")
    if error:
        print(f"Error: {error}")

    # Test security: path traversal
    print("\n--- Testing security (path traversal) ---")
    success, content, error = await tool.read_file("../etc/passwd")
    print(f"Success: {success}")
    print(f"Error: {error}")

    # Test security: forbidden extension
    print("\n--- Testing security (forbidden extension) ---")
    success, error = await tool.write_file("malware.exe", "malicious content")
    print(f"Success: {success}")
    print(f"Error: {error}")

    # Show operation log
    print("\n--- Operation Log ---")
    for op in tool.get_operation_log():
        status = "✓" if op.success else "✗"
        print(f"{status} {op.operation.value.upper()}: {op.path}")
        if op.error:
            print(f"  Error: {op.error}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
