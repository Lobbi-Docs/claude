#!/usr/bin/env python3
"""
Golden Armada Agent Orchestration System

Provides:
- Agent tracking and state management
- Activity logging
- Checkpointing for state recovery
- Coordination locks for parallel execution
- Inter-agent communication
- Obsidian MCP integration for agent lifecycle tracking
"""

import json
import os
import sqlite3
import hashlib
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
from contextlib import contextmanager
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Import agent activity logger for Obsidian integration
try:
    from agent_activity_logger import (
        track_agent,
        update_agent_phase,
        log_checkpoint,
        generate_agent_id
    )
    OBSIDIAN_LOGGING_ENABLED = True
except ImportError:
    OBSIDIAN_LOGGING_ENABLED = False
    print("[WARN] agent_activity_logger not available - Obsidian logging disabled")


# ============================================
# ENUMS AND DATA CLASSES
# ============================================

class AgentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    TERMINATED = "terminated"


class TaskStatus(Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


@dataclass
class Agent:
    id: str
    name: str
    type: str
    category: Optional[str] = None
    model: str = "sonnet"
    status: str = "idle"
    metadata: Optional[Dict] = None


@dataclass
class Task:
    id: str
    title: str
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    description: Optional[str] = None
    status: str = "pending"
    priority: int = 5
    result: Optional[Dict] = None
    error: Optional[str] = None
    metadata: Optional[Dict] = None


@dataclass
class Message:
    id: str
    channel: str
    message_type: str
    body: str
    sender_id: Optional[str] = None
    recipient_id: Optional[str] = None
    session_id: Optional[str] = None
    task_id: Optional[str] = None
    subject: Optional[str] = None
    priority: int = 5
    metadata: Optional[Dict] = None


# ============================================
# DATABASE ABSTRACTION LAYER
# ============================================

class DatabaseProvider:
    """Base class for database providers."""

    def execute(self, query: str, params: tuple = ()) -> Any:
        raise NotImplementedError

    def fetchone(self, query: str, params: tuple = ()) -> Optional[Dict]:
        raise NotImplementedError

    def fetchall(self, query: str, params: tuple = ()) -> List[Dict]:
        raise NotImplementedError

    def close(self):
        raise NotImplementedError


class SQLiteProvider(DatabaseProvider):
    """SQLite database provider - default for local development."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._local = threading.local()
        self._ensure_schema()

    def _get_connection(self) -> sqlite3.Connection:
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                detect_types=sqlite3.PARSE_DECLTYPES
            )
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _ensure_schema(self):
        schema_path = Path(__file__).parent / "db" / "schema.sql"
        if schema_path.exists():
            conn = self._get_connection()
            with open(schema_path) as f:
                conn.executescript(f.read())
            conn.commit()

    def execute(self, query: str, params: tuple = ()) -> Any:
        conn = self._get_connection()
        cursor = conn.execute(query, params)
        conn.commit()
        return cursor

    def fetchone(self, query: str, params: tuple = ()) -> Optional[Dict]:
        conn = self._get_connection()
        cursor = conn.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

    def fetchall(self, query: str, params: tuple = ()) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def close(self):
        if hasattr(self._local, 'conn') and self._local.conn:
            self._local.conn.close()
            self._local.conn = None


# ============================================
# AGENT TRACKER
# ============================================

class AgentTracker:
    """Track agent state and activity."""

    def __init__(self, db: DatabaseProvider):
        self.db = db
        self.obsidian_agent_ids: Dict[str, str] = {}  # Map agent_id -> obsidian_agent_id

    def register(self, agent: Agent, task_id: Optional[str] = None, parent_task: Optional[str] = None) -> str:
        """
        Register a new agent.

        Args:
            agent: Agent instance to register
            task_id: Optional task ID for Obsidian logging
            parent_task: Optional parent task ID for hierarchical tracking

        Returns:
            Agent ID
        """
        self.db.execute(
            """INSERT INTO agents (id, name, type, category, model, status, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 status = excluded.status,
                 updated_at = CURRENT_TIMESTAMP""",
            (agent.id, agent.name, agent.type, agent.category,
             agent.model, agent.status, json.dumps(agent.metadata))
        )

        # CHECKPOINT 1: Log agent start to Obsidian
        if OBSIDIAN_LOGGING_ENABLED and task_id:
            obsidian_agent_id = generate_agent_id()
            self.obsidian_agent_ids[agent.id] = obsidian_agent_id
            from agent_activity_logger import log_agent_start
            log_agent_start(obsidian_agent_id, agent.type, task_id, parent_task)

        return agent.id

    def update_status(self, agent_id: str, status: AgentStatus, phase: Optional[str] = None, action: Optional[str] = None):
        """
        Update agent status.

        Args:
            agent_id: Agent instance ID
            status: New status
            phase: Optional phase for Obsidian logging
            action: Optional action description for Obsidian logging
        """
        self.db.execute(
            """UPDATE agents SET status = ?, updated_at = CURRENT_TIMESTAMP,
               last_active_at = CURRENT_TIMESTAMP WHERE id = ?""",
            (status.value, agent_id)
        )

        # Update phase in Obsidian if provided
        if OBSIDIAN_LOGGING_ENABLED and phase and action and agent_id in self.obsidian_agent_ids:
            obsidian_agent_id = self.obsidian_agent_ids[agent_id]
            update_agent_phase(obsidian_agent_id, phase, action)

    def complete_agent(self, agent_id: str, status: str = 'completed', errors: int = 0, warnings: int = 0):
        """
        Mark agent as complete and log to Obsidian.

        Args:
            agent_id: Agent instance ID
            status: Final status (completed/failed)
            errors: Number of errors
            warnings: Number of warnings
        """
        self.update_status(agent_id, AgentStatus.TERMINATED)

        # CHECKPOINT 5: Log agent completion to Obsidian
        if OBSIDIAN_LOGGING_ENABLED and agent_id in self.obsidian_agent_ids:
            from agent_activity_logger import log_agent_complete
            obsidian_agent_id = self.obsidian_agent_ids[agent_id]
            log_agent_complete(obsidian_agent_id, status, errors, warnings)
            del self.obsidian_agent_ids[agent_id]

    def get(self, agent_id: str) -> Optional[Dict]:
        """Get agent by ID."""
        return self.db.fetchone("SELECT * FROM agents WHERE id = ?", (agent_id,))

    def list_active(self) -> List[Dict]:
        """List all active agents."""
        return self.db.fetchall(
            "SELECT * FROM agents WHERE status IN ('idle', 'running')"
        )

    def list_by_type(self, agent_type: str) -> List[Dict]:
        """List agents by type."""
        return self.db.fetchall("SELECT * FROM agents WHERE type = ?", (agent_type,))


# ============================================
# ACTIVITY LOGGER
# ============================================

class ActivityLogger:
    """Log all agent activities."""

    def __init__(self, db: DatabaseProvider, log_dir: Optional[str] = None):
        self.db = db
        self.log_dir = Path(log_dir) if log_dir else None
        if self.log_dir:
            self.log_dir.mkdir(parents=True, exist_ok=True)

    def log(
        self,
        action: str,
        message: str,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None,
        category: str = "agent_activity",
        level: LogLevel = LogLevel.INFO,
        details: Optional[Dict] = None,
        duration_ms: Optional[int] = None
    ):
        """Log an activity."""
        # Database log
        self.db.execute(
            """INSERT INTO activity_log
               (session_id, agent_id, task_id, action, category, level, message, details, duration_ms)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (session_id, agent_id, task_id, action, category,
             level.value, message, json.dumps(details) if details else None, duration_ms)
        )

        # File log
        if self.log_dir:
            log_file = self.log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.log"
            with open(log_file, 'a') as f:
                timestamp = datetime.now().isoformat()
                f.write(f"[{timestamp}] [{level.value}] [{action}] {message}\n")

    def get_recent(self, limit: int = 100, agent_id: Optional[str] = None) -> List[Dict]:
        """Get recent activity logs."""
        if agent_id:
            return self.db.fetchall(
                "SELECT * FROM activity_log WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?",
                (agent_id, limit)
            )
        return self.db.fetchall(
            "SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?", (limit,)
        )

    def get_by_session(self, session_id: str) -> List[Dict]:
        """Get all logs for a session."""
        return self.db.fetchall(
            "SELECT * FROM activity_log WHERE session_id = ? ORDER BY timestamp",
            (session_id,)
        )


# ============================================
# CHECKPOINT MANAGER
# ============================================

class CheckpointManager:
    """Manage state checkpoints for recovery."""

    def __init__(self, db: DatabaseProvider, checkpoint_dir: Optional[str] = None):
        self.db = db
        self.checkpoint_dir = Path(checkpoint_dir) if checkpoint_dir else None
        if self.checkpoint_dir:
            self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

    def create(
        self,
        checkpoint_type: str,
        state: Dict,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        files_snapshot: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,
        obsidian_checkpoint: Optional[str] = None
    ) -> str:
        """
        Create a checkpoint.

        Args:
            checkpoint_type: Type of checkpoint
            state: Current state dict
            session_id: Optional session ID
            task_id: Optional task ID
            agent_id: Optional agent ID
            files_snapshot: Optional file list
            metadata: Optional metadata
            obsidian_checkpoint: Optional Obsidian checkpoint marker (planning/post-plan/quality-check/commit)

        Returns:
            Checkpoint ID
        """
        checkpoint_id = str(uuid.uuid4())

        self.db.execute(
            """INSERT INTO checkpoints
               (id, session_id, task_id, agent_id, checkpoint_type, state, files_snapshot, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (checkpoint_id, session_id, task_id, agent_id, checkpoint_type,
             json.dumps(state), json.dumps(files_snapshot), json.dumps(metadata))
        )

        # Also save to file for safety
        if self.checkpoint_dir:
            cp_file = self.checkpoint_dir / f"{checkpoint_id}.json"
            with open(cp_file, 'w') as f:
                json.dump({
                    'id': checkpoint_id,
                    'type': checkpoint_type,
                    'session_id': session_id,
                    'task_id': task_id,
                    'agent_id': agent_id,
                    'state': state,
                    'files': files_snapshot,
                    'metadata': metadata,
                    'created_at': datetime.now().isoformat()
                }, f, indent=2)

        # CHECKPOINTS 2-4: Log to Obsidian if marker provided
        if OBSIDIAN_LOGGING_ENABLED and obsidian_checkpoint and agent_id:
            # Get orchestrator's agents tracker to find obsidian_agent_id
            # This will be called from orchestrator context, so we can access it
            log_checkpoint(agent_id, obsidian_checkpoint, metadata)

        return checkpoint_id

    def get_latest(self, session_id: Optional[str] = None, task_id: Optional[str] = None) -> Optional[Dict]:
        """Get the latest checkpoint."""
        if task_id:
            return self.db.fetchone(
                "SELECT * FROM checkpoints WHERE task_id = ? ORDER BY created_at DESC LIMIT 1",
                (task_id,)
            )
        if session_id:
            return self.db.fetchone(
                "SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
                (session_id,)
            )
        return self.db.fetchone(
            "SELECT * FROM checkpoints ORDER BY created_at DESC LIMIT 1"
        )

    def restore(self, checkpoint_id: str) -> Optional[Dict]:
        """Restore state from a checkpoint."""
        checkpoint = self.db.fetchone(
            "SELECT * FROM checkpoints WHERE id = ?", (checkpoint_id,)
        )
        if checkpoint:
            checkpoint['state'] = json.loads(checkpoint['state'])
            if checkpoint.get('files_snapshot'):
                checkpoint['files_snapshot'] = json.loads(checkpoint['files_snapshot'])
            if checkpoint.get('metadata'):
                checkpoint['metadata'] = json.loads(checkpoint['metadata'])
        return checkpoint

    def cleanup(self, max_age_days: int = 7, max_count: int = 100):
        """Clean up old checkpoints."""
        cutoff = datetime.now() - timedelta(days=max_age_days)
        self.db.execute(
            "DELETE FROM checkpoints WHERE created_at < ?", (cutoff,)
        )
        # Keep only the most recent max_count
        self.db.execute(
            """DELETE FROM checkpoints WHERE id NOT IN
               (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ?)""",
            (max_count,)
        )


# ============================================
# COORDINATION / LOCK MANAGER
# ============================================

class LockManager:
    """Manage resource locks for parallel execution."""

    def __init__(self, db: DatabaseProvider, lock_dir: Optional[str] = None):
        self.db = db
        self.lock_dir = Path(lock_dir) if lock_dir else None
        if self.lock_dir:
            self.lock_dir.mkdir(parents=True, exist_ok=True)

    def acquire(
        self,
        resource_id: str,
        resource_type: str,
        agent_id: str,
        session_id: Optional[str] = None,
        timeout_minutes: int = 5
    ) -> bool:
        """Try to acquire a lock on a resource."""
        expires_at = datetime.now() + timedelta(minutes=timeout_minutes)

        # Clean up expired locks first
        self._cleanup_expired()

        # Check if lock exists
        existing = self.db.fetchone(
            "SELECT * FROM locks WHERE resource_id = ?", (resource_id,)
        )

        if existing:
            # Lock exists and not expired
            return False

        try:
            self.db.execute(
                """INSERT INTO locks (resource_id, resource_type, owner_agent_id, owner_session_id, expires_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (resource_id, resource_type, agent_id, session_id, expires_at)
            )

            # Also create file-based lock
            if self.lock_dir:
                lock_file = self.lock_dir / f"{self._hash_resource(resource_id)}.lock"
                with open(lock_file, 'w') as f:
                    json.dump({
                        'resource_id': resource_id,
                        'agent_id': agent_id,
                        'expires_at': expires_at.isoformat()
                    }, f)

            return True
        except Exception:
            return False

    def release(self, resource_id: str, agent_id: str) -> bool:
        """Release a lock."""
        result = self.db.execute(
            "DELETE FROM locks WHERE resource_id = ? AND owner_agent_id = ?",
            (resource_id, agent_id)
        )

        # Remove file lock
        if self.lock_dir:
            lock_file = self.lock_dir / f"{self._hash_resource(resource_id)}.lock"
            if lock_file.exists():
                lock_file.unlink()

        return result.rowcount > 0

    def is_locked(self, resource_id: str) -> bool:
        """Check if a resource is locked."""
        self._cleanup_expired()
        lock = self.db.fetchone(
            "SELECT * FROM locks WHERE resource_id = ?", (resource_id,)
        )
        return lock is not None

    def get_owner(self, resource_id: str) -> Optional[str]:
        """Get the owner of a lock."""
        lock = self.db.fetchone(
            "SELECT owner_agent_id FROM locks WHERE resource_id = ?", (resource_id,)
        )
        return lock['owner_agent_id'] if lock else None

    def _cleanup_expired(self):
        """Remove expired locks."""
        self.db.execute(
            "DELETE FROM locks WHERE expires_at < ?", (datetime.now(),)
        )

    def _hash_resource(self, resource_id: str) -> str:
        return hashlib.sha256(resource_id.encode()).hexdigest()[:16]

    @contextmanager
    def lock(self, resource_id: str, resource_type: str, agent_id: str):
        """Context manager for lock acquisition."""
        acquired = self.acquire(resource_id, resource_type, agent_id)
        if not acquired:
            raise ResourceLockedError(f"Resource {resource_id} is locked")
        try:
            yield
        finally:
            self.release(resource_id, agent_id)


class ResourceLockedError(Exception):
    """Raised when a resource cannot be locked."""
    pass


# ============================================
# MESSAGING SYSTEM
# ============================================

class MessageBroker:
    """Inter-agent communication system."""

    def __init__(self, db: DatabaseProvider, message_dir: Optional[str] = None):
        self.db = db
        self.message_dir = Path(message_dir) if message_dir else None
        if self.message_dir:
            self.message_dir.mkdir(parents=True, exist_ok=True)

    def send(self, message: Message) -> str:
        """Send a message."""
        message_id = message.id or str(uuid.uuid4())

        self.db.execute(
            """INSERT INTO messages
               (id, channel, sender_id, recipient_id, session_id, task_id,
                message_type, subject, body, priority, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (message_id, message.channel, message.sender_id, message.recipient_id,
             message.session_id, message.task_id, message.message_type,
             message.subject, message.body, message.priority,
             json.dumps(message.metadata) if message.metadata else None)
        )

        # Also save to file for persistence
        if self.message_dir:
            msg_file = self.message_dir / f"{message_id}.json"
            with open(msg_file, 'w') as f:
                json.dump(asdict(message), f, indent=2)

        return message_id

    def broadcast(
        self,
        body: str,
        sender_id: str,
        message_type: str = "notification",
        subject: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> str:
        """Send a broadcast message to all agents."""
        return self.send(Message(
            id=str(uuid.uuid4()),
            channel="broadcast",
            sender_id=sender_id,
            message_type=message_type,
            body=body,
            subject=subject,
            session_id=session_id
        ))

    def send_direct(
        self,
        recipient_id: str,
        body: str,
        sender_id: str,
        message_type: str = "request",
        subject: Optional[str] = None
    ) -> str:
        """Send a direct message to a specific agent."""
        return self.send(Message(
            id=str(uuid.uuid4()),
            channel="direct",
            sender_id=sender_id,
            recipient_id=recipient_id,
            message_type=message_type,
            body=body,
            subject=subject
        ))

    def receive(self, agent_id: str, channel: Optional[str] = None, unread_only: bool = True) -> List[Dict]:
        """Receive messages for an agent."""
        if channel:
            if unread_only:
                return self.db.fetchall(
                    """SELECT * FROM messages
                       WHERE (recipient_id = ? OR (channel = 'broadcast' AND recipient_id IS NULL))
                       AND channel = ? AND read_at IS NULL
                       ORDER BY created_at""",
                    (agent_id, channel)
                )
            return self.db.fetchall(
                """SELECT * FROM messages
                   WHERE (recipient_id = ? OR (channel = 'broadcast' AND recipient_id IS NULL))
                   AND channel = ?
                   ORDER BY created_at""",
                (agent_id, channel)
            )

        if unread_only:
            return self.db.fetchall(
                """SELECT * FROM messages
                   WHERE (recipient_id = ? OR (channel = 'broadcast' AND recipient_id IS NULL))
                   AND read_at IS NULL
                   ORDER BY created_at""",
                (agent_id,)
            )
        return self.db.fetchall(
            """SELECT * FROM messages
               WHERE (recipient_id = ? OR (channel = 'broadcast' AND recipient_id IS NULL))
               ORDER BY created_at""",
            (agent_id,)
        )

    def mark_read(self, message_id: str):
        """Mark a message as read."""
        self.db.execute(
            "UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?",
            (message_id,)
        )

    def cleanup(self, retention_hours: int = 24):
        """Clean up old messages."""
        cutoff = datetime.now() - timedelta(hours=retention_hours)
        self.db.execute(
            "DELETE FROM messages WHERE created_at < ?", (cutoff,)
        )


# ============================================
# TASK MANAGER
# ============================================

class TaskManager:
    """Manage tasks and work queue."""

    def __init__(self, db: DatabaseProvider):
        self.db = db

    def create(self, task: Task) -> str:
        """Create a new task."""
        task_id = task.id or str(uuid.uuid4())

        self.db.execute(
            """INSERT INTO tasks
               (id, session_id, agent_id, parent_task_id, title, description,
                status, priority, result, error, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (task_id, task.session_id, task.agent_id, task.parent_task_id,
             task.title, task.description, task.status, task.priority,
             json.dumps(task.result) if task.result else None,
             task.error,
             json.dumps(task.metadata) if task.metadata else None)
        )
        return task_id

    def update_status(self, task_id: str, status: TaskStatus, result: Optional[Dict] = None, error: Optional[str] = None):
        """Update task status."""
        if status == TaskStatus.RUNNING:
            self.db.execute(
                "UPDATE tasks SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status.value, task_id)
            )
        elif status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
            self.db.execute(
                """UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP,
                   result = ?, error = ? WHERE id = ?""",
                (status.value, json.dumps(result) if result else None, error, task_id)
            )
        else:
            self.db.execute(
                "UPDATE tasks SET status = ? WHERE id = ?",
                (status.value, task_id)
            )

    def assign(self, task_id: str, agent_id: str):
        """Assign a task to an agent."""
        self.db.execute(
            "UPDATE tasks SET agent_id = ?, status = 'queued' WHERE id = ?",
            (agent_id, task_id)
        )

    def get(self, task_id: str) -> Optional[Dict]:
        """Get task by ID."""
        return self.db.fetchone("SELECT * FROM tasks WHERE id = ?", (task_id,))

    def get_pending(self, limit: int = 10) -> List[Dict]:
        """Get pending tasks ordered by priority."""
        return self.db.fetchall(
            """SELECT * FROM tasks WHERE status = 'pending'
               ORDER BY priority, created_at LIMIT ?""",
            (limit,)
        )

    def get_by_agent(self, agent_id: str, status: Optional[str] = None) -> List[Dict]:
        """Get tasks for an agent."""
        if status:
            return self.db.fetchall(
                "SELECT * FROM tasks WHERE agent_id = ? AND status = ?",
                (agent_id, status)
            )
        return self.db.fetchall(
            "SELECT * FROM tasks WHERE agent_id = ?", (agent_id,)
        )


# ============================================
# MAIN ORCHESTRATOR
# ============================================

class Orchestrator:
    """Main orchestration coordinator."""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.db = self._init_database()

        # Initialize all components
        self.agents = AgentTracker(self.db)
        self.logger = ActivityLogger(
            self.db,
            self.config.get('logging', {}).get('directory')
        )
        self.checkpoints = CheckpointManager(
            self.db,
            self.config.get('checkpoints', {}).get('directory')
        )
        self.locks = LockManager(
            self.db,
            self.config.get('coordination', {}).get('lockDirectory')
        )
        self.messages = MessageBroker(
            self.db,
            self.config.get('communication', {}).get('messageDirectory')
        )
        self.tasks = TaskManager(self.db)

        self._current_session_id: Optional[str] = None

    def _load_config(self, config_path: Optional[str]) -> Dict:
        """Load orchestration configuration."""
        if config_path and os.path.exists(config_path):
            with open(config_path) as f:
                return json.load(f)

        default_path = Path(__file__).parent / "config.json"
        if default_path.exists():
            with open(default_path) as f:
                return json.load(f)

        return {}

    def _init_database(self) -> DatabaseProvider:
        """Initialize the database provider."""
        db_config = self.config.get('database', {})
        provider = db_config.get('default', 'sqlite')

        if provider == 'sqlite':
            db_path = db_config.get('providers', {}).get('sqlite', {}).get(
                'path', '.claude/orchestration/db/agents.db'
            )
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
            return SQLiteProvider(db_path)

        # Add other providers here (Supabase, MongoDB, etc.)
        raise ValueError(f"Unknown database provider: {provider}")

    def start_session(self, name: str, pattern: str = "hierarchical", coordinator_id: Optional[str] = None) -> str:
        """Start a new orchestration session."""
        session_id = str(uuid.uuid4())

        self.db.execute(
            """INSERT INTO sessions (id, name, pattern, coordinator_id, status)
               VALUES (?, ?, ?, ?, 'active')""",
            (session_id, name, pattern, coordinator_id)
        )

        self._current_session_id = session_id
        self.logger.log(
            "session_started",
            f"Started session '{name}' with pattern '{pattern}'",
            session_id=session_id,
            category="task_execution"
        )

        return session_id

    def end_session(self, session_id: Optional[str] = None, status: str = "completed"):
        """End an orchestration session."""
        session_id = session_id or self._current_session_id
        if not session_id:
            return

        self.db.execute(
            "UPDATE sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, session_id)
        )

        self.logger.log(
            "session_ended",
            f"Session ended with status '{status}'",
            session_id=session_id,
            category="task_execution"
        )

        if session_id == self._current_session_id:
            self._current_session_id = None

    def get_session_summary(self, session_id: Optional[str] = None) -> Dict:
        """Get summary of a session."""
        session_id = session_id or self._current_session_id
        if not session_id:
            return {}

        session = self.db.fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        if not session:
            return {}

        summary = self.db.fetchone(
            "SELECT * FROM v_task_summary WHERE session_id = ?", (session_id,)
        )

        return {
            **session,
            'task_summary': summary or {}
        }

    def log_agent_checkpoint(
        self,
        agent_id: str,
        checkpoint: str,
        state: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Helper method to log a checkpoint with Obsidian integration.

        This is a convenience method that combines checkpoint creation with
        Obsidian logging.

        Args:
            agent_id: Agent instance ID
            checkpoint: Checkpoint marker (planning/post-plan/quality-check/commit)
            state: Optional state dict
            metadata: Optional metadata dict

        Returns:
            Checkpoint ID
        """
        # Get obsidian agent ID if available
        obsidian_agent_id = None
        if OBSIDIAN_LOGGING_ENABLED and agent_id in self.agents.obsidian_agent_ids:
            obsidian_agent_id = self.agents.obsidian_agent_ids[agent_id]

        # Create checkpoint
        checkpoint_id = self.checkpoints.create(
            checkpoint_type=checkpoint,
            state=state or {},
            session_id=self._current_session_id,
            agent_id=agent_id,
            metadata=metadata,
            obsidian_checkpoint=checkpoint if OBSIDIAN_LOGGING_ENABLED else None
        )

        # Log to Obsidian directly if we have the obsidian agent ID
        if OBSIDIAN_LOGGING_ENABLED and obsidian_agent_id:
            log_checkpoint(obsidian_agent_id, checkpoint, metadata)

        return checkpoint_id

    def update_agent_phase(
        self,
        agent_id: str,
        phase: str,
        action: str,
        files_modified: int = 0
    ):
        """
        Helper method to update agent phase with Obsidian logging.

        Args:
            agent_id: Agent instance ID
            phase: Phase name (explore/plan/code/test/fix/document)
            action: Action description
            files_modified: Number of files modified
        """
        # Update agent status
        status_map = {
            'explore': AgentStatus.RUNNING,
            'plan': AgentStatus.RUNNING,
            'code': AgentStatus.RUNNING,
            'test': AgentStatus.RUNNING,
            'fix': AgentStatus.RUNNING,
            'document': AgentStatus.RUNNING
        }

        self.agents.update_status(
            agent_id,
            status_map.get(phase, AgentStatus.RUNNING),
            phase=phase,
            action=action
        )

        # Log to Obsidian
        if OBSIDIAN_LOGGING_ENABLED and agent_id in self.agents.obsidian_agent_ids:
            obsidian_agent_id = self.agents.obsidian_agent_ids[agent_id]
            update_agent_phase(obsidian_agent_id, phase, action, files_modified)

    def close(self):
        """Clean up resources."""
        self.db.close()


# ============================================
# CLI INTERFACE
# ============================================

def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Golden Armada Orchestrator')
    parser.add_argument('command', choices=['init', 'status', 'logs', 'cleanup'])
    parser.add_argument('--session', help='Session ID')
    parser.add_argument('--agent', help='Agent ID')
    parser.add_argument('--limit', type=int, default=50, help='Limit for logs')

    args = parser.parse_args()

    orchestrator = Orchestrator()

    if args.command == 'init':
        print("Database initialized successfully.")

    elif args.command == 'status':
        agents = orchestrator.agents.list_active()
        print(f"Active Agents: {len(agents)}")
        for agent in agents:
            print(f"  - {agent['name']} ({agent['type']}): {agent['status']}")

    elif args.command == 'logs':
        logs = orchestrator.logger.get_recent(args.limit, args.agent)
        for log in logs:
            print(f"[{log['timestamp']}] [{log['level']}] {log['action']}: {log['message']}")

    elif args.command == 'cleanup':
        orchestrator.checkpoints.cleanup()
        orchestrator.messages.cleanup()
        print("Cleanup completed.")

    orchestrator.close()


if __name__ == '__main__':
    main()
