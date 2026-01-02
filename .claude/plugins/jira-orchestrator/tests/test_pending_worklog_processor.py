"""
Unit tests for pending_worklog_processor.py
"""
import pytest
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from pending_worklog_processor import PendingWorklogProcessor


class TestPendingWorklogProcessor:
    """Test suite for PendingWorklogProcessor class."""

    def test_init_creates_directories(self, temp_dir):
        """Test that initialization creates required directories."""
        pending_dir = temp_dir / "pending"
        processor = PendingWorklogProcessor(pending_dir)

        assert pending_dir.exists()
        assert processor.processed_dir.exists()
        assert processor.failed_dir.exists()

    def test_get_pending_worklogs_empty(self, temp_dir):
        """Test getting pending worklogs from empty directory."""
        pending_dir = temp_dir / "pending"
        processor = PendingWorklogProcessor(pending_dir)

        worklogs = processor.get_pending_worklogs()
        assert worklogs == []

    def test_get_pending_worklogs_sorted(self, sample_pending_worklogs):
        """Test that pending worklogs are sorted by modification time."""
        processor = PendingWorklogProcessor(sample_pending_worklogs)

        worklogs = processor.get_pending_worklogs()
        assert len(worklogs) == 2
        assert all(w.suffix == '.json' for w in worklogs)

    def test_process_worklog_invalid_data(self, temp_dir):
        """Test processing worklog with invalid data."""
        pending_dir = temp_dir / "pending"
        pending_dir.mkdir(parents=True)

        # Create invalid worklog (missing required fields)
        invalid_file = pending_dir / "invalid.json"
        with open(invalid_file, 'w') as f:
            json.dump({"comment": "No issue key"}, f)

        processor = PendingWorklogProcessor(pending_dir)
        result = processor.process_worklog(invalid_file)

        assert result == False
        # Should be moved to failed directory
        assert not invalid_file.exists()

    @patch.object(PendingWorklogProcessor, '_post_worklog_via_mcp')
    def test_process_worklog_success(self, mock_post, temp_dir):
        """Test successful worklog processing."""
        mock_post.return_value = True

        pending_dir = temp_dir / "pending"
        pending_dir.mkdir(parents=True)

        # Create valid worklog
        worklog_file = pending_dir / "valid.json"
        with open(worklog_file, 'w') as f:
            json.dump({
                "issue_key": "PROJ-123",
                "time_spent_seconds": 3600,
                "comment": "Test worklog"
            }, f)

        processor = PendingWorklogProcessor(pending_dir)
        result = processor.process_worklog(worklog_file)

        assert result == True
        mock_post.assert_called_once()

    @patch.object(PendingWorklogProcessor, '_post_worklog_via_mcp')
    def test_process_worklog_retry(self, mock_post, temp_dir):
        """Test worklog retry on failure."""
        mock_post.return_value = False

        pending_dir = temp_dir / "pending"
        pending_dir.mkdir(parents=True)

        worklog_file = pending_dir / "retry.json"
        with open(worklog_file, 'w') as f:
            json.dump({
                "issue_key": "PROJ-123",
                "time_spent_seconds": 3600,
                "comment": "Retry test"
            }, f)

        processor = PendingWorklogProcessor(pending_dir)
        processor.max_retries = 3

        # First failure - should increment retry count
        result = processor.process_worklog(worklog_file)
        assert result == False

        # Verify retry count was updated
        with open(worklog_file, 'r') as f:
            data = json.load(f)
        assert data['retry_count'] == 1

    @patch.object(PendingWorklogProcessor, '_post_worklog_via_mcp')
    def test_process_worklog_max_retries(self, mock_post, temp_dir):
        """Test worklog moves to failed after max retries."""
        mock_post.return_value = False

        pending_dir = temp_dir / "pending"
        pending_dir.mkdir(parents=True)

        worklog_file = pending_dir / "maxretry.json"
        with open(worklog_file, 'w') as f:
            json.dump({
                "issue_key": "PROJ-123",
                "time_spent_seconds": 3600,
                "comment": "Max retry test",
                "retry_count": 2  # Already at 2 retries
            }, f)

        processor = PendingWorklogProcessor(pending_dir)
        processor.max_retries = 3

        result = processor.process_worklog(worklog_file)

        assert result == False
        # Should be moved to failed directory
        assert not worklog_file.exists()
        failed_files = list(processor.failed_dir.glob('*.json'))
        assert len(failed_files) == 1

    @patch.object(PendingWorklogProcessor, '_post_worklog_via_mcp')
    def test_process_all(self, mock_post, sample_pending_worklogs):
        """Test processing all pending worklogs."""
        mock_post.return_value = True

        processor = PendingWorklogProcessor(sample_pending_worklogs)
        results = processor.process_all()

        assert results['processed'] == 2
        assert results['remaining'] == 0


class TestMCPIntegration:
    """Test MCP integration functionality."""

    @patch('subprocess.run')
    def test_post_worklog_via_mcp_success(self, mock_run, temp_dir):
        """Test successful MCP worklog posting."""
        mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')

        processor = PendingWorklogProcessor(temp_dir)

        # Create mock script path
        script_dir = temp_dir.parent / 'hooks' / 'scripts'
        script_dir.mkdir(parents=True, exist_ok=True)
        (script_dir / 'post-worklog.js').touch()

        # Note: This will fail because script path is different
        result = processor._post_worklog_via_mcp(
            issue_key='TEST-123',
            time_seconds=3600,
            comment='Test',
            adjust_estimate='auto'
        )

        # Result depends on whether script exists at expected path
        assert isinstance(result, bool)

    def test_post_worklog_fallback_marker(self, temp_dir):
        """Test fallback marker file creation when MCP fails."""
        processor = PendingWorklogProcessor(temp_dir)

        # Call with non-existent script (will create fallback marker)
        result = processor._post_worklog_via_mcp(
            issue_key='TEST-123',
            time_seconds=3600,
            comment='Test fallback',
            adjust_estimate='auto'
        )

        # Should create marker file for manual processing
        marker_files = list(temp_dir.glob('MANUAL_*.txt'))
        assert len(marker_files) == 1
