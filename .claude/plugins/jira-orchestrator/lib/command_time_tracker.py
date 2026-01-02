"""
Command Time Tracker - Automatic Jira Worklog for Claude Execution Time

Tracks command execution duration and automatically posts worklogs to Jira
with [Claude] prefix to distinguish AI-assisted work from human work.

Features:
- Context manager for automatic start/end timing
- Multi-source issue key detection (args, branch, env, db)
- Configurable threshold (default: 60s minimum)
- Graceful error handling (never breaks commands)
- Duration formatting for Jira (seconds -> "1h 30m")
"""

import json
import os
import re
import subprocess
import time
import yaml
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any


class CommandTimeTracker:
    """
    Track command execution time and auto-log to Jira.

    Usage:
        tracker = CommandTimeTracker()
        issue_key = tracker.detect_issue_key(args={'issue': 'PROJ-123'})

        with tracker.track_command('/jira:work', issue_key):
            # Command execution here
            do_work()
        # Time automatically logged to Jira on exit
    """

    def __init__(self, config_path: str = None):
        """
        Initialize the command time tracker.

        Args:
            config_path: Path to time-logging.yml config file.
                        Defaults to jira-orchestrator/config/time-logging.yml
        """
        self.config = self._load_config(config_path)
        self.active_commands: Dict[str, Dict] = {}

    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """
        Load configuration from YAML file.

        Args:
            config_path: Optional path to config file

        Returns:
            Configuration dictionary with defaults applied
        """
        # Default configuration
        defaults = {
            'enabled': True,
            'threshold_seconds': 60,
            'format': '[Claude] {command} - {duration}',
            'exclude_commands': ['/jira:status', '/jira:cancel', '/jira:setup'],
            'detection_priority': ['argument', 'branch', 'environment', 'orchestration_db'],
            'worklog': {
                'adjust_estimate': 'auto',
                'retry_on_failure': True,
                'max_retries': 2
            }
        }

        # Try to load from file
        if config_path is None:
            config_path = Path(__file__).parent.parent / 'config' / 'time-logging.yml'

        try:
            if Path(config_path).exists():
                with open(config_path, 'r') as f:
                    loaded = yaml.safe_load(f)
                    if loaded and 'time_logging' in loaded:
                        # Merge loaded config with defaults
                        config = defaults.copy()
                        config.update(loaded['time_logging'])
                        return config
        except Exception as e:
            print(f"[WARN] Failed to load time-logging config: {e}")

        return defaults

    @contextmanager
    def track_command(self, command_name: str, issue_key: str = None):
        """
        Context manager for tracking command execution time.

        Automatically records start time, and on exit calculates duration
        and posts worklog to Jira if threshold is met.

        Args:
            command_name: Name of command (e.g., '/jira:work')
            issue_key: Jira issue key (e.g., 'PROJ-123')

        Yields:
            Dict with tracking context (command_id, start_time, issue_key)

        Example:
            with tracker.track_command('/jira:commit', 'PROJ-123') as ctx:
                # Do work
                result = commit_changes()
            # Worklog automatically posted on exit
        """
        # Check if enabled
        if not self.config.get('enabled', True):
            yield {'skipped': True, 'reason': 'disabled'}
            return

        # Check if command is excluded
        if command_name in self.config.get('exclude_commands', []):
            yield {'skipped': True, 'reason': 'excluded_command'}
            return

        # Generate tracking context
        command_id = f"{command_name}_{int(time.time() * 1000)}"
        start_time = datetime.now()

        context = {
            'command_id': command_id,
            'command_name': command_name,
            'issue_key': issue_key,
            'start_time': start_time,
            'start_timestamp': start_time.isoformat()
        }

        self.active_commands[command_id] = context

        try:
            yield context
        finally:
            # Calculate duration
            end_time = datetime.now()
            duration_seconds = int((end_time - start_time).total_seconds())

            context['end_time'] = end_time
            context['duration_seconds'] = duration_seconds
            context['duration_formatted'] = self.format_duration(duration_seconds)

            # Log to Jira if threshold met and issue key present
            if issue_key and duration_seconds >= self.config.get('threshold_seconds', 60):
                success = self.log_to_jira(issue_key, command_name, duration_seconds)
                context['worklog_posted'] = success
            else:
                context['worklog_posted'] = False
                if not issue_key:
                    context['worklog_skip_reason'] = 'no_issue_key'
                else:
                    context['worklog_skip_reason'] = 'below_threshold'

            # Cleanup
            if command_id in self.active_commands:
                del self.active_commands[command_id]

    def detect_issue_key(
        self,
        args: Dict[str, Any] = None,
        env: Dict[str, str] = None
    ) -> Optional[str]:
        """
        Detect Jira issue key from multiple sources.

        Detection priority (configurable):
        1. argument - Explicit --issue flag or positional arg
        2. branch - Git branch name pattern (feature/PROJ-123-desc)
        3. environment - JIRA_ISSUE_KEY env var
        4. orchestration_db - Current session context

        Args:
            args: Command arguments dict with 'issue' or 'issue_key' keys
            env: Environment variables (defaults to os.environ)

        Returns:
            Jira issue key (e.g., 'PROJ-123') or None if not found
        """
        args = args or {}
        env = env or dict(os.environ)

        # Jira issue key pattern: PROJECT-123
        issue_pattern = re.compile(r'[A-Z][A-Z0-9]+-\d+')

        detection_priority = self.config.get('detection_priority', [
            'argument', 'branch', 'environment', 'orchestration_db'
        ])

        for source in detection_priority:
            issue_key = None

            if source == 'argument':
                # Check explicit argument
                issue_key = args.get('issue') or args.get('issue_key')
                if issue_key:
                    match = issue_pattern.search(str(issue_key))
                    if match:
                        return match.group(0)

            elif source == 'branch':
                # Check git branch name
                try:
                    result = subprocess.run(
                        ['git', 'branch', '--show-current'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        branch = result.stdout.strip()
                        match = issue_pattern.search(branch)
                        if match:
                            return match.group(0)
                except Exception:
                    pass

            elif source == 'environment':
                # Check environment variable
                issue_key = env.get('JIRA_ISSUE_KEY')
                if issue_key:
                    match = issue_pattern.search(str(issue_key))
                    if match:
                        return match.group(0)

            elif source == 'orchestration_db':
                # Check orchestration database for current session
                issue_key = self._get_issue_from_orchestration_db()
                if issue_key:
                    return issue_key

        return None

    def _get_issue_from_orchestration_db(self) -> Optional[str]:
        """
        Query orchestration database for current session's issue key.

        Returns:
            Issue key from current session or None
        """
        try:
            db_path = Path(__file__).parent.parent.parent / '.claude' / 'orchestration' / 'db' / 'orchestration.db'
            if not db_path.exists():
                return None

            import sqlite3
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()

            # Query for most recent session with issue key in metadata
            cursor.execute("""
                SELECT metadata FROM command_executions
                WHERE issue_key IS NOT NULL
                ORDER BY started_at DESC
                LIMIT 1
            """)

            row = cursor.fetchone()
            conn.close()

            if row and row[0]:
                import json
                metadata = json.loads(row[0])
                return metadata.get('issue_key')

        except Exception:
            pass

        return None

    def log_to_jira(
        self,
        issue_key: str,
        command_name: str,
        duration_seconds: int
    ) -> bool:
        """
        Post worklog to Jira via MCP.

        Uses the worklog-manager agent pattern to add a worklog entry
        with [Claude] prefix in the comment.

        Args:
            issue_key: Jira issue key (e.g., 'PROJ-123')
            command_name: Command that was executed (e.g., '/jira:work')
            duration_seconds: Execution time in seconds

        Returns:
            True if worklog was posted successfully, False otherwise

        Note:
            This method NEVER throws exceptions - failures are logged
            but do not break command execution.
        """
        try:
            # Format the comment
            duration_formatted = self.format_duration(duration_seconds)
            comment_format = self.config.get('format', '[Claude] {command} - {duration}')
            comment = comment_format.format(
                command=command_name,
                duration=duration_formatted
            )

            # Get worklog settings
            worklog_config = self.config.get('worklog', {})
            adjust_estimate = worklog_config.get('adjust_estimate', 'auto')

            # Call MCP to add worklog
            # This uses the Atlassian MCP plugin
            success = self._call_mcp_add_worklog(
                issue_key=issue_key,
                time_seconds=duration_seconds,
                comment=comment,
                adjust_estimate=adjust_estimate
            )

            if success:
                print(f"[TIME] Logged {duration_formatted} to {issue_key}: {comment}")
            else:
                print(f"[WARN] Failed to log time to {issue_key}")

            return success

        except Exception as e:
            # NEVER throw - just log the error
            print(f"[ERROR] Worklog failed for {issue_key}: {e}")
            return False

    def _call_mcp_add_worklog(
        self,
        issue_key: str,
        time_seconds: int,
        comment: str,
        adjust_estimate: str = 'auto'
    ) -> bool:
        """
        Queue worklog for posting to Jira via MCP.

        Creates a pending worklog file that will be processed by the
        orchestration system using the Atlassian MCP tool.

        Args:
            issue_key: Jira issue key
            time_seconds: Time spent in seconds
            comment: Worklog comment
            adjust_estimate: Estimate adjustment mode

        Returns:
            True if queued successfully, False otherwise
        """
        try:
            # Format time for Jira API (uses string format like "5m" or "1h 30m")
            time_spent = self.format_duration(time_seconds)
            time_display = self.format_duration_for_display(time_seconds)

            # Get cloud ID from config
            cloud_id = self.config.get('atlassian_cloud_id', '')

            # Build worklog data for MCP processing
            worklog_data = {
                'issue_key': issue_key,
                'time_spent': time_spent,  # Jira format: "5m", "1h 30m"
                'time_spent_seconds': time_seconds,
                'time_display': time_display,  # For comment: "5m 23s"
                'comment': comment,
                'cloud_id': cloud_id,
                'started': datetime.now().isoformat(),
                'source': 'auto_time_tracking',
                'mcp_tool': 'mcp__plugin_atlassian_atlassian__addWorklogToJiraIssue',
                'mcp_params': {
                    'cloudId': cloud_id,
                    'issueIdOrKey': issue_key,
                    'timeSpent': time_spent
                }
            }

            # Write to pending worklogs directory
            pending_dir = Path(__file__).parent.parent.parent / '.claude' / 'orchestration' / 'db' / 'pending_worklogs'
            pending_dir.mkdir(parents=True, exist_ok=True)

            pending_file = pending_dir / f"{issue_key}_{int(time.time() * 1000)}.json"
            with open(pending_file, 'w') as f:
                json.dump(worklog_data, f, indent=2)

            print(f"[TIME] Queued worklog: {issue_key} - {time_display}")
            return True

        except Exception as e:
            print(f"[ERROR] Failed to queue worklog: {e}")
            return False

    def format_duration(self, seconds: int) -> str:
        """
        Convert seconds to Jira-compatible time format.

        Args:
            seconds: Duration in seconds

        Returns:
            Formatted string like "1h 30m" or "45m"

        Examples:
            65 -> "1m" (round up)
            90 -> "2m" (round up)
            3600 -> "1h"
            3750 -> "1h 3m"
            7500 -> "2h 5m"
        """
        if seconds < 60:
            return "1m"  # Minimum 1 minute

        hours = seconds // 3600
        remaining = seconds % 3600
        minutes = remaining // 60

        # Round up remaining seconds
        if remaining % 60 > 0:
            minutes += 1

        # Handle minute overflow
        if minutes >= 60:
            hours += 1
            minutes = 0

        parts = []
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")

        return " ".join(parts) if parts else "1m"

    def format_duration_for_display(self, seconds: int) -> str:
        """
        Format duration for display in worklog comments (includes seconds).

        Args:
            seconds: Duration in seconds

        Returns:
            Formatted string like "5m 23s" or "1h 30m 15s"
        """
        hours = int(seconds // 3600)
        remaining = int(seconds % 3600)
        minutes = int(remaining // 60)
        secs = int(remaining % 60)

        parts = []
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        if secs > 0 and hours == 0:  # Only show seconds if less than 1 hour
            parts.append(f"{secs}s")

        return " ".join(parts) if parts else "1s"

    def get_tracking_stats(self) -> Dict[str, Any]:
        """
        Get statistics about tracked commands.

        Returns:
            Dict with tracking statistics
        """
        return {
            'active_commands': len(self.active_commands),
            'config': {
                'enabled': self.config.get('enabled', True),
                'threshold_seconds': self.config.get('threshold_seconds', 60),
                'excluded_commands': self.config.get('exclude_commands', [])
            }
        }


# ============================================================================
# Singleton Instance
# ============================================================================

_tracker = None


def get_tracker() -> CommandTimeTracker:
    """
    Get singleton tracker instance.

    Returns:
        CommandTimeTracker singleton
    """
    global _tracker
    if _tracker is None:
        _tracker = CommandTimeTracker()
    return _tracker


def track_command(command_name: str, issue_key: str = None):
    """
    Convenience function for tracking a command.

    Args:
        command_name: Name of command (e.g., '/jira:work')
        issue_key: Jira issue key

    Returns:
        Context manager for tracking
    """
    return get_tracker().track_command(command_name, issue_key)


def detect_issue_key(args: Dict = None, env: Dict = None) -> Optional[str]:
    """
    Convenience function to detect issue key.

    Args:
        args: Command arguments
        env: Environment variables

    Returns:
        Detected issue key or None
    """
    return get_tracker().detect_issue_key(args, env)


def format_duration(seconds: int) -> str:
    """
    Convenience function to format duration.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted string (e.g., "1h 30m")
    """
    return get_tracker().format_duration(seconds)


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == '__main__':
    """Example usage demonstrating command time tracking."""

    print("Command Time Tracker - Example Usage\n")

    # Example 1: Basic tracking
    print("Example 1: Basic Command Tracking")
    tracker = CommandTimeTracker()

    with tracker.track_command('/jira:work', 'PROJ-123') as ctx:
        print(f"  Command started: {ctx['command_name']}")
        print(f"  Issue: {ctx['issue_key']}")

        # Simulate work
        time.sleep(2)

        print("  Working...")

    print(f"  Duration: {ctx['duration_formatted']}")
    print(f"  Worklog posted: {ctx.get('worklog_posted', False)}\n")

    # Example 2: Issue key detection
    print("Example 2: Issue Key Detection")
    key = tracker.detect_issue_key(args={'issue': 'TEST-456'})
    print(f"  From args: {key}")

    key = tracker.detect_issue_key(env={'JIRA_ISSUE_KEY': 'ENV-789'})
    print(f"  From env: {key}\n")

    # Example 3: Duration formatting
    print("Example 3: Duration Formatting")
    test_durations = [45, 65, 90, 3600, 3750, 7500, 86400]
    for secs in test_durations:
        formatted = tracker.format_duration(secs)
        print(f"  {secs}s -> {formatted}")

    print("\nDone!")
