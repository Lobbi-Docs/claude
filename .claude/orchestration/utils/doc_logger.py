#!/usr/bin/env python3
"""
Documentation Logger Utility
High-level Python API for logging documentation activities.
"""

import json
import os
import sqlite3
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict


@dataclass
class DocumentLog:
    """Documentation log entry."""
    doc_path: str
    doc_type: str
    action: str
    agent_id: str
    session_id: Optional[str] = None
    task_id: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    obsidian_path: Optional[str] = None
    category: Optional[str] = None
    content_hash: Optional[str] = None
    previous_hash: Optional[str] = None
    lines_added: int = 0
    lines_removed: int = 0
    word_count: int = 0
    metadata: Optional[Dict] = None


class DocumentationLogger:
    """Logs documentation activities to the orchestration database."""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize the documentation logger."""
        self.db_path = db_path or self._get_default_db_path()
        self._ensure_database()

    def _get_default_db_path(self) -> str:
        """Get default database path."""
        return str(Path(__file__).parent.parent / "db" / "agents.db")

    def _ensure_database(self):
        """Ensure database and schema exist."""
        db_dir = Path(self.db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        # Apply schema if needed
        schema_path = db_dir / "schema.sql"
        migration_path = db_dir / "migration_documentation_log.sql"

        conn = sqlite3.connect(self.db_path)
        try:
            # Check if documentation_log table exists
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='documentation_log'"
            )
            if not cursor.fetchone():
                # Apply base schema
                if schema_path.exists():
                    with open(schema_path) as f:
                        conn.executescript(f.read())

                # Apply documentation migration
                if migration_path.exists():
                    with open(migration_path) as f:
                        conn.executescript(f.read())

            conn.commit()
        finally:
            conn.close()

    def _calculate_hash(self, file_path: str) -> Optional[str]:
        """Calculate SHA256 hash of file content."""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception:
            return None

    def _extract_title(self, file_path: str) -> Optional[str]:
        """Extract title from markdown file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Try YAML frontmatter
            if content.startswith('---'):
                lines = content.split('\n')
                for line in lines[1:20]:
                    if line.startswith('title:'):
                        return line.split(':', 1)[1].strip().strip('"\'')
                    if line.strip() == '---':
                        break

            # Try first H1
            for line in content.split('\n'):
                line = line.strip()
                if line.startswith('# '):
                    return line[2:].strip()

            # Fallback to filename
            return Path(file_path).stem
        except Exception:
            return Path(file_path).stem

    def _count_words(self, file_path: str) -> int:
        """Count words in file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return len(f.read().split())
        except Exception:
            return 0

    def _determine_doc_type(self, file_path: str) -> str:
        """Determine document type from file path."""
        path_lower = file_path.lower()
        basename = os.path.basename(path_lower)

        if 'readme' in basename:
            return 'readme'
        elif 'decision' in path_lower or 'adr' in basename:
            return 'adr'
        elif 'architecture' in path_lower or 'system-design' in path_lower:
            return 'architecture'
        elif 'api' in basename or 'api-' in path_lower:
            return 'api'
        elif 'quickstart' in basename or 'quick-start' in path_lower:
            return 'quickstart'
        elif 'research/' in path_lower:
            return 'research'
        elif 'guide' in path_lower or 'docs/' in path_lower:
            return 'guide'
        else:
            return 'reference'

    def _determine_obsidian_path(self, doc_path: str, doc_type: str) -> str:
        """Determine target path in Obsidian vault."""
        basename = os.path.basename(doc_path)

        obsidian_paths = {
            'readme': f'Repositories/Alpha-1.4/{basename}',
            'adr': f'Repositories/Alpha-1.4/Decisions/{basename}',
            'architecture': f'Repositories/Alpha-1.4/Architecture/{basename}',
            'api': f'Repositories/Alpha-1.4/API/{basename}',
            'guide': f'Repositories/Alpha-1.4/Guides/{basename}',
            'quickstart': f'Repositories/Alpha-1.4/Guides/{basename}',
        }

        if doc_type == 'research':
            # Extract topic from path
            parts = doc_path.split('/')
            if 'research' in parts:
                idx = parts.index('research')
                topic = parts[idx + 1] if idx + 1 < len(parts) else 'General'
                return f'Research/{topic}/{basename}'

        return obsidian_paths.get(doc_type, f'Repositories/Alpha-1.4/{basename}')

    def log(
        self,
        file_path: str,
        action: str,
        agent_id: str,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None,
        summary: Optional[str] = None,
        **kwargs
    ) -> int:
        """
        Log documentation activity.

        Args:
            file_path: Path to documentation file
            action: Action performed (created, updated, deleted)
            agent_id: Agent ID
            session_id: Optional session ID
            task_id: Optional task ID
            summary: Optional summary of changes
            **kwargs: Additional parameters (doc_type, title, etc.)

        Returns:
            ID of the created log entry
        """
        # Auto-detect metadata
        doc_type = kwargs.get('doc_type') or self._determine_doc_type(file_path)
        title = kwargs.get('title') or self._extract_title(file_path)
        obsidian_path = kwargs.get('obsidian_path') or self._determine_obsidian_path(file_path, doc_type)
        content_hash = self._calculate_hash(file_path)
        word_count = self._count_words(file_path)

        # Create log entry
        log_entry = DocumentLog(
            doc_path=file_path,
            doc_type=doc_type,
            action=action,
            agent_id=agent_id,
            session_id=session_id or os.getenv('CLAUDE_SESSION_ID'),
            task_id=task_id or os.getenv('CLAUDE_TASK_ID'),
            title=title,
            summary=summary,
            obsidian_path=obsidian_path,
            category=kwargs.get('category'),
            content_hash=content_hash,
            lines_added=kwargs.get('lines_added', 0),
            lines_removed=kwargs.get('lines_removed', 0),
            word_count=word_count,
            metadata=kwargs.get('metadata')
        )

        # Insert into database
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.execute("""
                INSERT INTO documentation_log (
                    timestamp, session_id, agent_id, task_id,
                    doc_type, doc_path, obsidian_path, action, category,
                    title, summary, content_hash, previous_hash,
                    lines_added, lines_removed, word_count,
                    vault_synced, sync_status, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                log_entry.session_id,
                log_entry.agent_id,
                log_entry.task_id,
                log_entry.doc_type,
                log_entry.doc_path,
                log_entry.obsidian_path,
                log_entry.action,
                log_entry.category,
                log_entry.title,
                log_entry.summary,
                log_entry.content_hash,
                log_entry.previous_hash,
                log_entry.lines_added,
                log_entry.lines_removed,
                log_entry.word_count,
                0,  # vault_synced
                'pending',  # sync_status
                json.dumps(log_entry.metadata) if log_entry.metadata else None
            ))

            doc_log_id = cursor.lastrowid
            conn.commit()

            # Also log to activity_log
            conn.execute("""
                INSERT INTO activity_log (
                    timestamp, session_id, agent_id, task_id,
                    action, category, level, message, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                log_entry.session_id,
                log_entry.agent_id,
                log_entry.task_id,
                f'doc_{action}',
                'documentation',
                'INFO',
                f'Documentation {action}: {file_path}',
                json.dumps({
                    'doc_type': doc_type,
                    'doc_path': file_path,
                    'obsidian_path': obsidian_path,
                    'title': title
                })
            ))

            conn.commit()
            return doc_log_id

        finally:
            conn.close()

    def log_created(self, file_path: str, agent_id: str, **kwargs) -> int:
        """Log documentation creation."""
        return self.log(file_path, 'created', agent_id, **kwargs)

    def log_updated(self, file_path: str, agent_id: str, **kwargs) -> int:
        """Log documentation update."""
        return self.log(file_path, 'updated', agent_id, **kwargs)

    def log_deleted(self, file_path: str, agent_id: str, **kwargs) -> int:
        """Log documentation deletion."""
        return self.log(file_path, 'deleted', agent_id, **kwargs)

    def get_agent_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get documentation statistics for an agent."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        try:
            cursor = conn.execute("""
                SELECT * FROM v_agent_doc_stats WHERE agent_id = ?
            """, (agent_id,))

            row = cursor.fetchone()
            return dict(row) if row else {}

        finally:
            conn.close()

    def get_unsynced_docs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get list of unsynced documents."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        try:
            cursor = conn.execute("""
                SELECT * FROM v_unsynced_docs LIMIT ?
            """, (limit,))

            return [dict(row) for row in cursor.fetchall()]

        finally:
            conn.close()

    def mark_synced(
        self,
        doc_log_id: int,
        sync_status: str = 'success',
        sync_error: Optional[str] = None
    ):
        """Mark a document as synced to Obsidian."""
        conn = sqlite3.connect(self.db_path)

        try:
            conn.execute("""
                UPDATE documentation_log SET
                    vault_synced = ?,
                    sync_status = ?,
                    sync_timestamp = ?,
                    sync_error = ?
                WHERE id = ?
            """, (
                1 if sync_status == 'success' else 0,
                sync_status,
                datetime.now().isoformat(),
                sync_error,
                doc_log_id
            ))

            conn.commit()

        finally:
            conn.close()


# Convenience functions for quick usage
def log_doc_created(file_path: str, agent_id: str, summary: Optional[str] = None):
    """Quick function to log documentation creation."""
    logger = DocumentationLogger()
    return logger.log_created(file_path, agent_id, summary=summary)


def log_doc_updated(file_path: str, agent_id: str, summary: Optional[str] = None):
    """Quick function to log documentation update."""
    logger = DocumentationLogger()
    return logger.log_updated(file_path, agent_id, summary=summary)


def log_doc_deleted(file_path: str, agent_id: str, summary: Optional[str] = None):
    """Quick function to log documentation deletion."""
    logger = DocumentationLogger()
    return logger.log_deleted(file_path, agent_id, summary=summary)


if __name__ == '__main__':
    # Example usage
    import sys

    if len(sys.argv) < 4:
        print("Usage: doc_logger.py <file_path> <action> <agent_id> [summary]")
        sys.exit(1)

    file_path = sys.argv[1]
    action = sys.argv[2]
    agent_id = sys.argv[3]
    summary = sys.argv[4] if len(sys.argv) > 4 else None

    logger = DocumentationLogger()
    doc_id = logger.log(file_path, action, agent_id, summary=summary)

    print(f"✓ Documentation logged (ID: {doc_id})")
    print(f"  File: {file_path}")
    print(f"  Action: {action}")
    print(f"  Agent: {agent_id}")
