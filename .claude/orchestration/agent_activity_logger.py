"""
Agent Activity Logger - Python wrapper for Obsidian MCP client

Provides context manager and decorator patterns for tracking agent lifecycle
across explore, plan, code, test, fix, document phases.

Features:
- Non-blocking async execution via subprocess
- Automatic fallback to JSON when MCP unavailable
- Context manager for agent lifecycle tracking
- Integration hooks for orchestrator.py
- Duration calculation on completion
"""

import subprocess
import json
import uuid
import time
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
from contextlib import contextmanager


class AgentActivityLogger:
    """Logger for tracking agent activities in Obsidian vault"""

    def __init__(self, mcp_client_path: str = None):
        """
        Initialize the agent activity logger.

        Args:
            mcp_client_path: Path to TypeScript MCP client. Defaults to obsidian-mcp-client.ts
        """
        self.mcp_client_path = mcp_client_path or str(Path(__file__).parent / "obsidian-mcp-client.ts")
        self.fallback_json = Path(__file__).parent / "db" / "agent-activity.json"
        self.active_agents: Dict[str, Dict] = {}

    def generate_agent_id(self) -> str:
        """
        Generate 8-character agent ID.

        Returns:
            8-character unique ID
        """
        return str(uuid.uuid4())[:8]

    def log_agent_start(
        self,
        agent_id: str,
        agent_type: str,
        task_id: str,
        parent_task: Optional[str] = None
    ) -> None:
        """
        Log agent initialization.

        Args:
            agent_id: Unique agent instance ID
            agent_type: Agent role/type (e.g., 'coder', 'tester')
            task_id: Task identifier
            parent_task: Optional parent task ID for sub-agents
        """
        # Cache locally
        self.active_agents[agent_id] = {
            'agent_type': agent_type,
            'task_id': task_id,
            'start_time': datetime.now().isoformat(),
            'parent_task': parent_task
        }

        # Call TypeScript MCP client (non-blocking)
        try:
            self._call_mcp_client('logAgentStart', agent_id, agent_type, task_id, parent_task)
        except Exception as e:
            print(f"[WARN] MCP logging failed: {e}")
            self._log_to_fallback(agent_id, 'start', {
                'agent_type': agent_type,
                'task_id': task_id,
                'parent_task': parent_task
            })

    def update_agent_phase(
        self,
        agent_id: str,
        phase: str,  # explore, plan, code, test, fix, document
        action: str,
        files_modified: int = 0
    ) -> None:
        """
        Update agent phase transition.

        Args:
            agent_id: Agent instance ID
            phase: Current phase (explore/plan/code/test/fix/document)
            action: Human-readable action description
            files_modified: Number of files modified (default: 0)
        """
        if agent_id in self.active_agents:
            self.active_agents[agent_id]['phase'] = phase
            self.active_agents[agent_id]['current_action'] = action
            self.active_agents[agent_id]['files_modified'] = files_modified

        try:
            self._call_mcp_client('updateAgentPhase', agent_id, phase, action, str(files_modified))
        except Exception as e:
            print(f"[WARN] Phase update failed: {e}")
            self._log_to_fallback(agent_id, 'phase', {
                'phase': phase,
                'action': action,
                'files_modified': files_modified
            })

    def log_checkpoint(
        self,
        agent_id: str,
        checkpoint: str,  # start, planning, post-plan, quality-check, commit
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log checkpoint milestone.

        Args:
            agent_id: Agent instance ID
            checkpoint: Checkpoint marker (start/planning/post-plan/quality-check/commit)
            metadata: Optional metadata dict
        """
        try:
            metadata_json = json.dumps(metadata or {})
            self._call_mcp_client('logCheckpoint', agent_id, checkpoint, metadata_json)
        except Exception as e:
            print(f"[WARN] Checkpoint logging failed: {e}")
            self._log_to_fallback(agent_id, 'checkpoint', {
                'checkpoint': checkpoint,
                'metadata': metadata
            })

    def log_agent_complete(
        self,
        agent_id: str,
        status: str,  # completed, failed
        errors: int = 0,
        warnings: int = 0
    ) -> None:
        """
        Log agent completion.

        Args:
            agent_id: Agent instance ID
            status: Final status (completed/failed)
            errors: Number of errors encountered
            warnings: Number of warnings generated
        """
        # Calculate duration
        duration = 0
        if agent_id in self.active_agents:
            start = datetime.fromisoformat(self.active_agents[agent_id]['start_time'])
            duration = round((datetime.now() - start).total_seconds() / 60, 2)  # minutes
            del self.active_agents[agent_id]

        try:
            self._call_mcp_client(
                'logAgentComplete',
                agent_id,
                status,
                str(duration),
                str(errors),
                str(warnings)
            )
        except Exception as e:
            print(f"[WARN] Completion logging failed: {e}")
            self._log_to_fallback(agent_id, 'complete', {
                'status': status,
                'duration': duration,
                'errors': errors,
                'warnings': warnings
            })

    def _call_mcp_client(self, method: str, *args) -> None:
        """
        Call TypeScript MCP client via subprocess.

        Args:
            method: Method name to call
            *args: Arguments to pass to method
        """
        # Convert args to strings, filter None
        str_args = [str(arg) for arg in args if arg is not None]

        # Run tsx with method and args
        cmd = ['tsx', str(self.mcp_client_path), method] + str_args

        # Run without blocking (fire and forget)
        subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )

    def _log_to_fallback(self, agent_id: str, event_type: str, data: Dict) -> None:
        """
        Fallback logging to JSON file.

        Args:
            agent_id: Agent instance ID
            event_type: Event type (start/phase/checkpoint/complete)
            data: Event data dict
        """
        try:
            self.fallback_json.parent.mkdir(parents=True, exist_ok=True)

            entry = {
                'timestamp': datetime.now().isoformat(),
                'agent_id': agent_id,
                'event_type': event_type,
                'data': data
            }

            # Append to JSON array
            existing = []
            if self.fallback_json.exists():
                with open(self.fallback_json, 'r') as f:
                    existing = json.load(f)

            existing.append(entry)

            with open(self.fallback_json, 'w') as f:
                json.dump(existing, f, indent=2)
        except Exception as e:
            print(f"[ERROR] Fallback logging failed: {e}")


# ============================================================================
# Singleton Instance and Convenience Functions
# ============================================================================

# Singleton instance
_logger = AgentActivityLogger()


def generate_agent_id() -> str:
    """
    Generate 8-character agent ID.

    Returns:
        8-character unique ID
    """
    return _logger.generate_agent_id()


def log_agent_start(
    agent_id: str,
    agent_type: str,
    task_id: str,
    parent_task: str = None
) -> None:
    """
    Log agent initialization.

    Args:
        agent_id: Unique agent instance ID
        agent_type: Agent role/type
        task_id: Task identifier
        parent_task: Optional parent task ID
    """
    _logger.log_agent_start(agent_id, agent_type, task_id, parent_task)


def update_agent_phase(
    agent_id: str,
    phase: str,
    action: str,
    files_modified: int = 0
) -> None:
    """
    Update agent phase transition.

    Args:
        agent_id: Agent instance ID
        phase: Current phase
        action: Action description
        files_modified: Files modified count
    """
    _logger.update_agent_phase(agent_id, phase, action, files_modified)


def log_checkpoint(
    agent_id: str,
    checkpoint: str,
    metadata: Dict = None
) -> None:
    """
    Log checkpoint milestone.

    Args:
        agent_id: Agent instance ID
        checkpoint: Checkpoint marker
        metadata: Optional metadata
    """
    _logger.log_checkpoint(agent_id, checkpoint, metadata)


def log_agent_complete(
    agent_id: str,
    status: str,
    errors: int = 0,
    warnings: int = 0
) -> None:
    """
    Log agent completion.

    Args:
        agent_id: Agent instance ID
        status: Final status
        errors: Error count
        warnings: Warning count
    """
    _logger.log_agent_complete(agent_id, status, errors, warnings)


# ============================================================================
# Context Manager
# ============================================================================

@contextmanager
def track_agent(agent_type: str, task_id: str, parent_task: str = None):
    """
    Context manager for agent lifecycle tracking.

    Automatically logs agent start and completion, calculates duration,
    and tracks errors.

    Usage:
        with track_agent('coder', 'task-123') as agent_id:
            # Agent code here
            update_agent_phase(agent_id, 'code', 'Writing functions')
            # ... work ...
        # Auto-completes on exit

    Args:
        agent_type: Agent role/type
        task_id: Task identifier
        parent_task: Optional parent task ID

    Yields:
        agent_id: Generated agent instance ID
    """
    agent_id = generate_agent_id()
    log_agent_start(agent_id, agent_type, task_id, parent_task)

    try:
        yield agent_id
        log_agent_complete(agent_id, 'completed')
    except Exception as e:
        log_agent_complete(agent_id, 'failed', errors=1)
        raise


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == '__main__':
    """
    Example usage demonstrating agent lifecycle tracking.
    """
    # Set UTF-8 encoding for Windows console
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    print("Agent Activity Logger - Example Usage\n")

    # Example 1: Using context manager (recommended)
    print("Example 1: Context Manager Pattern")
    with track_agent('coder', 'task-001') as agent_id:
        print(f"  Agent {agent_id} started")

        update_agent_phase(agent_id, 'explore', 'Analyzing requirements')
        time.sleep(0.1)

        log_checkpoint(agent_id, 'planning', {'tasks_identified': 3})
        update_agent_phase(agent_id, 'plan', 'Creating task breakdown')
        time.sleep(0.1)

        update_agent_phase(agent_id, 'code', 'Implementing features', files_modified=5)
        time.sleep(0.1)

        log_checkpoint(agent_id, 'quality-check', {'tests_run': 10})
        update_agent_phase(agent_id, 'test', 'Running tests')
        time.sleep(0.1)

        log_checkpoint(agent_id, 'commit', {'files_committed': 5})
        print(f"  Agent {agent_id} completing...")

    print("  ✅ Agent completed\n")

    # Example 2: Manual tracking
    print("Example 2: Manual Tracking")
    agent_id = generate_agent_id()
    log_agent_start(agent_id, 'tester', 'task-002')
    print(f"  Agent {agent_id} started")

    update_agent_phase(agent_id, 'test', 'Running unit tests')
    time.sleep(0.1)

    log_agent_complete(agent_id, 'completed', errors=0, warnings=2)
    print(f"  Agent {agent_id} completed with 2 warnings\n")

    # Example 3: Hierarchical agents (parent-child)
    print("Example 3: Hierarchical Agent Tracking")
    with track_agent('planner', 'task-003') as parent_id:
        print(f"  Parent agent {parent_id} started")

        update_agent_phase(parent_id, 'plan', 'Breaking down tasks')

        # Spawn child agents
        with track_agent('coder', 'task-003-1', parent_task='task-003') as child1_id:
            print(f"    Child agent {child1_id} started (parent: task-003)")
            update_agent_phase(child1_id, 'code', 'Implementing feature A')
            time.sleep(0.05)

        with track_agent('coder', 'task-003-2', parent_task='task-003') as child2_id:
            print(f"    Child agent {child2_id} started (parent: task-003)")
            update_agent_phase(child2_id, 'code', 'Implementing feature B')
            time.sleep(0.05)

        update_agent_phase(parent_id, 'document', 'Finalizing plan')
        print(f"  Parent agent {parent_id} completing...")

    print("  ✅ All agents completed\n")

    # Check fallback JSON
    fallback_path = Path(__file__).parent / "db" / "agent-activity.json"
    if fallback_path.exists():
        with open(fallback_path, 'r') as f:
            entries = json.load(f)
        print(f"Logged {len(entries)} events to fallback JSON: {fallback_path}")
    else:
        print("No fallback JSON created (MCP available)")
