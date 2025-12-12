#!/usr/bin/env python3
"""
Enhanced Activity Tracker
Provides high-level API for comprehensive activity logging.
"""

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from contextlib import contextmanager
from enum import Enum


class ActivityLevel(Enum):
    """Activity log levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class ActivityCategory(Enum):
    """Activity categories."""
    AGENT_ACTIVITY = "agent_activity"
    TASK_EXECUTION = "task_execution"
    DOCUMENTATION = "documentation"
    COMMUNICATION = "communication"
    ERRORS = "errors"
    CHECKPOINTS = "checkpoints"
    FILE_OPERATIONS = "file_operations"
    SYSTEM = "system"


class ActivityTracker:
    """Enhanced activity tracker with comprehensive logging."""

    def __init__(self, db_path: Optional[str] = None, agent_id: Optional[str] = None):
        """
        Initialize activity tracker.

        Args:
            db_path: Path to orchestration database
            agent_id: Agent ID (defaults to CLAUDE_AGENT_ID env var)
        """
        self.db_path = db_path or self._get_default_db_path()
        self.agent_id = agent_id or os.getenv('CLAUDE_AGENT_ID', 'unknown')
        self.session_id = os.getenv('CLAUDE_SESSION_ID')
        self.task_id = os.getenv('CLAUDE_TASK_ID')

    def _get_default_db_path(self) -> str:
        """Get default database path."""
        return str(Path(__file__).parent.parent / "db" / "agents.db")

    def log(
        self,
        action: str,
        message: str,
        category: Optional[str] = None,
        level: str = "INFO",
        details: Optional[Dict] = None,
        duration_ms: Optional[int] = None,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None
    ):
        """
        Log an activity.

        Args:
            action: Action identifier
            message: Human-readable message
            category: Activity category
            level: Log level (DEBUG, INFO, WARN, ERROR)
            details: Additional structured details
            duration_ms: Duration in milliseconds
            agent_id: Override agent ID
            session_id: Override session ID
            task_id: Override task ID
        """
        conn = sqlite3.connect(self.db_path)

        try:
            conn.execute("""
                INSERT INTO activity_log (
                    timestamp, session_id, agent_id, task_id,
                    action, category, level, message, details, duration_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                session_id or self.session_id,
                agent_id or self.agent_id,
                task_id or self.task_id,
                action,
                category or ActivityCategory.AGENT_ACTIVITY.value,
                level,
                message,
                json.dumps(details) if details else None,
                duration_ms
            ))

            conn.commit()

        finally:
            conn.close()

    def log_task_started(
        self,
        task_name: str,
        task_description: Optional[str] = None,
        **kwargs
    ):
        """Log task start."""
        self.log(
            action="task_started",
            message=f"Started task: {task_name}",
            category=ActivityCategory.TASK_EXECUTION.value,
            details={
                'task_name': task_name,
                'task_description': task_description,
                **kwargs
            }
        )

    def log_task_completed(
        self,
        task_name: str,
        duration_ms: Optional[int] = None,
        result: Optional[Dict] = None,
        **kwargs
    ):
        """Log task completion."""
        self.log(
            action="task_completed",
            message=f"Completed task: {task_name}",
            category=ActivityCategory.TASK_EXECUTION.value,
            duration_ms=duration_ms,
            details={
                'task_name': task_name,
                'result': result,
                **kwargs
            }
        )

    def log_task_failed(
        self,
        task_name: str,
        error: str,
        duration_ms: Optional[int] = None,
        **kwargs
    ):
        """Log task failure."""
        self.log(
            action="task_failed",
            message=f"Task failed: {task_name}",
            category=ActivityCategory.TASK_EXECUTION.value,
            level=ActivityLevel.ERROR.value,
            duration_ms=duration_ms,
            details={
                'task_name': task_name,
                'error': error,
                **kwargs
            }
        )

    def log_file_operation(
        self,
        operation: str,
        file_path: str,
        lines_changed: Optional[int] = None,
        **kwargs
    ):
        """Log file operation."""
        self.log(
            action=f"file_{operation}",
            message=f"File {operation}: {file_path}",
            category=ActivityCategory.FILE_OPERATIONS.value,
            details={
                'operation': operation,
                'file_path': file_path,
                'lines_changed': lines_changed,
                **kwargs
            }
        )

    def log_error(
        self,
        error_message: str,
        error_type: Optional[str] = None,
        stack_trace: Optional[str] = None,
        **kwargs
    ):
        """Log an error."""
        self.log(
            action="error_occurred",
            message=error_message,
            category=ActivityCategory.ERRORS.value,
            level=ActivityLevel.ERROR.value,
            details={
                'error_type': error_type,
                'stack_trace': stack_trace,
                **kwargs
            }
        )

    def log_checkpoint(
        self,
        checkpoint_type: str,
        description: str,
        **kwargs
    ):
        """Log a checkpoint."""
        self.log(
            action="checkpoint_created",
            message=f"Checkpoint: {description}",
            category=ActivityCategory.CHECKPOINTS.value,
            details={
                'checkpoint_type': checkpoint_type,
                **kwargs
            }
        )

    def log_communication(
        self,
        comm_type: str,
        message: str,
        recipient: Optional[str] = None,
        **kwargs
    ):
        """Log inter-agent communication."""
        self.log(
            action=f"message_{comm_type}",
            message=message,
            category=ActivityCategory.COMMUNICATION.value,
            details={
                'comm_type': comm_type,
                'recipient': recipient,
                **kwargs
            }
        )

    @contextmanager
    def track_task(self, task_name: str, task_description: Optional[str] = None):
        """
        Context manager for automatic task tracking.

        Usage:
            with tracker.track_task("Process data", "Processing user data"):
                # Do work
                process_data()
        """
        start_time = datetime.now()
        self.log_task_started(task_name, task_description)

        try:
            yield self
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            self.log_task_completed(task_name, duration_ms=duration_ms)

        except Exception as e:
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            self.log_task_failed(task_name, str(e), duration_ms=duration_ms)
            raise

    def get_recent_activity(
        self,
        limit: int = 100,
        category: Optional[str] = None,
        level: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get recent activity logs."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        try:
            query = "SELECT * FROM activity_log WHERE 1=1"
            params = []

            if category:
                query += " AND category = ?"
                params.append(category)

            if level:
                query += " AND level = ?"
                params.append(level)

            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

        finally:
            conn.close()

    def get_agent_summary(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Get activity summary for an agent."""
        agent_id = agent_id or self.agent_id

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        try:
            # Total activities
            cursor = conn.execute("""
                SELECT COUNT(*) as count FROM activity_log WHERE agent_id = ?
            """, (agent_id,))
            total = cursor.fetchone()['count']

            # By category
            cursor = conn.execute("""
                SELECT category, COUNT(*) as count
                FROM activity_log
                WHERE agent_id = ?
                GROUP BY category
            """, (agent_id,))
            by_category = {row['category']: row['count'] for row in cursor.fetchall()}

            # By level
            cursor = conn.execute("""
                SELECT level, COUNT(*) as count
                FROM activity_log
                WHERE agent_id = ?
                GROUP BY level
            """, (agent_id,))
            by_level = {row['level']: row['count'] for row in cursor.fetchall()}

            # Recent activity
            cursor = conn.execute("""
                SELECT timestamp FROM activity_log
                WHERE agent_id = ?
                ORDER BY timestamp DESC
                LIMIT 1
            """, (agent_id,))
            last_activity = cursor.fetchone()

            return {
                'agent_id': agent_id,
                'total_activities': total,
                'by_category': by_category,
                'by_level': by_level,
                'last_activity': last_activity['timestamp'] if last_activity else None
            }

        finally:
            conn.close()

    def get_session_summary(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get activity summary for a session."""
        session_id = session_id or self.session_id

        if not session_id:
            return {}

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        try:
            cursor = conn.execute("""
                SELECT
                    COUNT(*) as total_activities,
                    COUNT(DISTINCT agent_id) as agents_count,
                    MIN(timestamp) as started_at,
                    MAX(timestamp) as last_activity
                FROM activity_log
                WHERE session_id = ?
            """, (session_id,))

            result = dict(cursor.fetchone())

            # Activities by agent
            cursor = conn.execute("""
                SELECT agent_id, COUNT(*) as count
                FROM activity_log
                WHERE session_id = ?
                GROUP BY agent_id
            """, (session_id,))
            result['by_agent'] = {row['agent_id']: row['count'] for row in cursor.fetchall()}

            return result

        finally:
            conn.close()


# Convenience singleton instance
_tracker_instance = None


def get_tracker(agent_id: Optional[str] = None) -> ActivityTracker:
    """Get singleton activity tracker instance."""
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = ActivityTracker(agent_id=agent_id)
    return _tracker_instance


# Quick logging functions
def log_activity(action: str, message: str, **kwargs):
    """Quick activity logging."""
    tracker = get_tracker()
    tracker.log(action, message, **kwargs)


def log_task_started(task_name: str, **kwargs):
    """Quick task started logging."""
    tracker = get_tracker()
    tracker.log_task_started(task_name, **kwargs)


def log_task_completed(task_name: str, **kwargs):
    """Quick task completed logging."""
    tracker = get_tracker()
    tracker.log_task_completed(task_name, **kwargs)


def log_error(error_message: str, **kwargs):
    """Quick error logging."""
    tracker = get_tracker()
    tracker.log_error(error_message, **kwargs)


if __name__ == '__main__':
    # Example usage
    tracker = ActivityTracker(agent_id='test-agent')

    # Simple logging
    tracker.log(
        action="test_action",
        message="This is a test activity",
        category="testing",
        details={'test_key': 'test_value'}
    )

    # Task tracking
    with tracker.track_task("Process data", "Processing test data"):
        import time
        time.sleep(0.1)
        print("Processing...")

    # Get summaries
    summary = tracker.get_agent_summary()
    print(f"\nAgent Summary:")
    print(f"  Total activities: {summary['total_activities']}")
    print(f"  By category: {summary['by_category']}")
    print(f"  Last activity: {summary['last_activity']}")
