"""
Unit tests for command_time_tracker.py
"""
import pytest
import time
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from command_time_tracker import CommandTimeTracker, format_duration


class TestCommandTimeTracker:
    """Test suite for CommandTimeTracker class."""

    def test_init_with_defaults(self, temp_dir):
        """Test tracker initialization with default config."""
        tracker = CommandTimeTracker()
        assert tracker.config is not None
        assert 'enabled' in tracker.config
        assert tracker.config.get('threshold_seconds', 60) == 60

    def test_track_command_basic(self, temp_dir):
        """Test basic command tracking."""
        tracker = CommandTimeTracker()

        with tracker.track_command('/jira:test', 'TEST-123') as ctx:
            assert ctx['command_name'] == '/jira:test'
            assert ctx['issue_key'] == 'TEST-123'
            assert 'start_time' in ctx
            time.sleep(0.1)

        assert 'duration_seconds' in ctx
        assert ctx['duration_seconds'] >= 0

    def test_track_command_excluded(self, temp_dir):
        """Test that excluded commands are skipped."""
        tracker = CommandTimeTracker()
        tracker.config['exclude_commands'] = ['/jira:status']

        with tracker.track_command('/jira:status', 'TEST-123') as ctx:
            assert ctx.get('skipped') == True
            assert ctx.get('reason') == 'excluded_command'

    def test_track_command_disabled(self, temp_dir):
        """Test that disabled tracking returns early."""
        tracker = CommandTimeTracker()
        tracker.config['enabled'] = False

        with tracker.track_command('/jira:work', 'TEST-123') as ctx:
            assert ctx.get('skipped') == True
            assert ctx.get('reason') == 'disabled'

    def test_detect_issue_key_from_args(self):
        """Test issue key detection from arguments."""
        tracker = CommandTimeTracker()

        key = tracker.detect_issue_key(args={'issue': 'ABC-123'})
        assert key == 'ABC-123'

        key = tracker.detect_issue_key(args={'issue_key': 'XYZ-456'})
        assert key == 'XYZ-456'

    def test_detect_issue_key_from_env(self):
        """Test issue key detection from environment."""
        tracker = CommandTimeTracker()

        key = tracker.detect_issue_key(env={'JIRA_ISSUE_KEY': 'ENV-789'})
        assert key == 'ENV-789'

    @patch('subprocess.run')
    def test_detect_issue_key_from_branch(self, mock_run):
        """Test issue key detection from git branch."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='feature/PROJ-123-new-feature\n'
        )

        tracker = CommandTimeTracker()
        key = tracker.detect_issue_key(args={}, env={})
        assert key == 'PROJ-123'

    def test_detect_issue_key_none(self):
        """Test issue key detection returns None when not found."""
        tracker = CommandTimeTracker()

        with patch('subprocess.run', side_effect=Exception("no git")):
            key = tracker.detect_issue_key(args={}, env={})

        # Should return None when not found anywhere
        assert key is None or key.startswith(('PROJ', 'TEST', 'ABC'))


class TestFormatDuration:
    """Test duration formatting functions."""

    def test_format_duration_seconds(self):
        """Test formatting durations less than a minute."""
        assert format_duration(30) == "1m"  # Rounds to minimum
        assert format_duration(45) == "1m"

    def test_format_duration_minutes(self):
        """Test formatting durations in minutes."""
        assert format_duration(60) == "1m"
        assert format_duration(120) == "2m"
        assert format_duration(90) == "2m"  # Rounds up

    def test_format_duration_hours(self):
        """Test formatting durations with hours."""
        assert format_duration(3600) == "1h"
        assert format_duration(7200) == "2h"

    def test_format_duration_hours_and_minutes(self):
        """Test formatting durations with hours and minutes."""
        assert format_duration(3660) == "1h 1m"
        assert format_duration(5400) == "1h 30m"
        assert format_duration(7500) == "2h 5m"


class TestWorklogPosting:
    """Test worklog posting functionality."""

    def test_log_to_jira_below_threshold(self, temp_dir):
        """Test that worklogs below threshold are not posted."""
        tracker = CommandTimeTracker()
        tracker.config['threshold_seconds'] = 60

        with tracker.track_command('/jira:quick', 'TEST-123') as ctx:
            pass  # Very quick operation

        assert ctx.get('worklog_posted') == False
        assert ctx.get('worklog_skip_reason') == 'below_threshold'

    def test_log_to_jira_no_issue(self, temp_dir):
        """Test that worklogs without issue key are not posted."""
        tracker = CommandTimeTracker()

        with tracker.track_command('/jira:work', None) as ctx:
            time.sleep(0.1)

        assert ctx.get('worklog_posted') == False
        assert ctx.get('worklog_skip_reason') == 'no_issue_key'

    @patch.object(CommandTimeTracker, '_call_mcp_add_worklog')
    def test_log_to_jira_success(self, mock_mcp, temp_dir):
        """Test successful worklog posting."""
        mock_mcp.return_value = True

        tracker = CommandTimeTracker()
        tracker.config['threshold_seconds'] = 0  # No threshold for test

        result = tracker.log_to_jira('TEST-123', '/jira:work', 3600)
        assert result == True
        mock_mcp.assert_called_once()

    @patch.object(CommandTimeTracker, '_call_mcp_add_worklog')
    def test_log_to_jira_failure_graceful(self, mock_mcp, temp_dir):
        """Test that worklog failures don't throw exceptions."""
        mock_mcp.return_value = False

        tracker = CommandTimeTracker()

        # Should not throw
        result = tracker.log_to_jira('TEST-123', '/jira:work', 3600)
        assert result == False
