"""
Pytest configuration and shared fixtures for jira-orchestrator tests.
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Generator
import json
import logging


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for test files."""
    temp_path = Path(tempfile.mkdtemp(prefix='jira_test_'))
    try:
        yield temp_path
    finally:
        shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def sample_worklog_data() -> dict:
    """Sample worklog data for tests."""
    return {
        "issue_key": "PROJ-123",
        "time_spent": "1h 30m",
        "time_spent_seconds": 5400,
        "comment": "[Claude] /jira:work - 1h 30m",
        "started": "2025-12-22T10:00:00",
        "source": "auto_time_tracking"
    }


@pytest.fixture
def sample_pending_worklogs(temp_dir: Path) -> Path:
    """Create sample pending worklogs directory."""
    pending_dir = temp_dir / "pending_worklogs"
    pending_dir.mkdir(parents=True)

    # Create sample worklogs
    worklogs = [
        {"issue_key": "PROJ-123", "time_spent_seconds": 3600, "comment": "Test 1"},
        {"issue_key": "PROJ-124", "time_spent_seconds": 1800, "comment": "Test 2"},
    ]

    for i, wl in enumerate(worklogs):
        with open(pending_dir / f"worklog_{i}.json", 'w') as f:
            json.dump(wl, f)

    return pending_dir


@pytest.fixture(autouse=True)
def setup_logging():
    """Setup logging for tests."""
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
