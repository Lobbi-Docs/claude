"""
Pending Worklog Processor

Processes queued worklog entries that failed to post immediately.
Retries pending worklogs with exponential backoff.

Usage:
    python pending_worklog_processor.py [--once] [--interval 60]
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class PendingWorklogProcessor:
    """
    Process pending worklog entries from the queue.

    Pending worklogs are JSON files stored in:
    .claude/orchestration/db/pending_worklogs/
    """

    def __init__(self, pending_dir: Path = None):
        """
        Initialize the processor.

        Args:
            pending_dir: Directory containing pending worklog JSON files
        """
        if pending_dir is None:
            pending_dir = (
                Path(__file__).parent.parent.parent /
                '.claude' / 'orchestration' / 'db' / 'pending_worklogs'
            )
        self.pending_dir = Path(pending_dir)
        self.processed_dir = self.pending_dir / 'processed'
        self.failed_dir = self.pending_dir / 'failed'

        # Create directories
        self.pending_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(exist_ok=True)
        self.failed_dir.mkdir(exist_ok=True)

        self.max_retries = 3
        self.retry_delay_base = 5  # seconds

    def get_pending_worklogs(self) -> List[Path]:
        """
        Get list of pending worklog files.

        Returns:
            List of Path objects for pending JSON files
        """
        if not self.pending_dir.exists():
            return []

        return sorted(
            self.pending_dir.glob('*.json'),
            key=lambda p: p.stat().st_mtime
        )

    def process_worklog(self, worklog_file: Path) -> bool:
        """
        Process a single pending worklog.

        Args:
            worklog_file: Path to worklog JSON file

        Returns:
            True if successfully posted, False otherwise
        """
        try:
            with open(worklog_file, 'r') as f:
                worklog_data = json.load(f)

            issue_key = worklog_data.get('issue_key')
            time_seconds = worklog_data.get('time_spent_seconds')
            comment = worklog_data.get('comment', '')
            adjust_estimate = worklog_data.get('adjust_estimate', 'auto')

            if not issue_key or not time_seconds:
                print(f"[ERROR] Invalid worklog data in {worklog_file.name}")
                self._move_to_failed(worklog_file, "invalid_data")
                return False

            # Try to post via MCP
            success = self._post_worklog_via_mcp(
                issue_key=issue_key,
                time_seconds=time_seconds,
                comment=comment,
                adjust_estimate=adjust_estimate
            )

            if success:
                print(f"[SUCCESS] Posted worklog to {issue_key}: {comment}")
                self._move_to_processed(worklog_file)
                return True
            else:
                # Increment retry count
                retry_count = worklog_data.get('retry_count', 0) + 1
                worklog_data['retry_count'] = retry_count
                worklog_data['last_retry'] = datetime.now().isoformat()

                if retry_count >= self.max_retries:
                    print(f"[FAILED] Max retries reached for {issue_key}")
                    self._move_to_failed(worklog_file, "max_retries")
                    return False
                else:
                    # Update file for next retry
                    with open(worklog_file, 'w') as f:
                        json.dump(worklog_data, f, indent=2)
                    print(f"[RETRY] Attempt {retry_count}/{self.max_retries} for {issue_key}")
                    return False

        except Exception as e:
            print(f"[ERROR] Processing {worklog_file.name}: {e}")
            return False

    def _post_worklog_via_mcp(
        self,
        issue_key: str,
        time_seconds: int,
        comment: str,
        adjust_estimate: str
    ) -> bool:
        """
        Post worklog to Jira via MCP.

        This method attempts to use the Claude MCP system to post the worklog.

        Args:
            issue_key: Jira issue key
            time_seconds: Time in seconds
            comment: Worklog comment
            adjust_estimate: Estimate adjustment mode

        Returns:
            True if successful, False otherwise
        """
        try:
            # Try via Node.js MCP client
            mcp_script = Path(__file__).parent.parent / 'hooks' / 'scripts' / 'post-worklog.js'

            if mcp_script.exists():
                result = subprocess.run(
                    [
                        'node', str(mcp_script),
                        '--issue', issue_key,
                        '--seconds', str(time_seconds),
                        '--comment', comment,
                        '--adjust', adjust_estimate
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode == 0:
                    return True
                else:
                    print(f"[WARN] MCP script failed: {result.stderr}")

            # Fallback: Write marker file for manual processing
            marker_file = self.pending_dir / f"MANUAL_{issue_key}_{int(time.time())}.txt"
            with open(marker_file, 'w') as f:
                f.write(f"Issue: {issue_key}\n")
                f.write(f"Time: {time_seconds}s\n")
                f.write(f"Comment: {comment}\n")
                f.write(f"Please add this worklog manually.\n")

            return False

        except Exception as e:
            print(f"[ERROR] MCP call failed: {e}")
            return False

    def _move_to_processed(self, worklog_file: Path) -> None:
        """Move successfully processed worklog to processed directory."""
        try:
            dest = self.processed_dir / f"{worklog_file.stem}_done{worklog_file.suffix}"
            worklog_file.rename(dest)
        except Exception as e:
            print(f"[WARN] Could not move to processed: {e}")
            worklog_file.unlink()

    def _move_to_failed(self, worklog_file: Path, reason: str) -> None:
        """Move failed worklog to failed directory with reason."""
        try:
            dest = self.failed_dir / f"{worklog_file.stem}_{reason}{worklog_file.suffix}"
            worklog_file.rename(dest)
        except Exception as e:
            print(f"[WARN] Could not move to failed: {e}")

    def process_all(self) -> Dict[str, int]:
        """
        Process all pending worklogs.

        Returns:
            Dict with counts of processed, failed, and remaining
        """
        pending = self.get_pending_worklogs()
        results = {'processed': 0, 'failed': 0, 'remaining': 0}

        print(f"[INFO] Found {len(pending)} pending worklogs")

        for worklog_file in pending:
            if self.process_worklog(worklog_file):
                results['processed'] += 1
            else:
                results['remaining'] += 1

        # Count failed
        results['failed'] = len(list(self.failed_dir.glob('*.json')))

        return results

    def run_continuous(self, interval: int = 60) -> None:
        """
        Run processor continuously with given interval.

        Args:
            interval: Seconds between processing runs
        """
        print(f"[INFO] Starting continuous processor (interval: {interval}s)")
        print(f"[INFO] Watching: {self.pending_dir}")

        while True:
            try:
                results = self.process_all()
                if results['processed'] > 0 or results['remaining'] > 0:
                    print(f"[INFO] Processed: {results['processed']}, "
                          f"Remaining: {results['remaining']}, "
                          f"Failed: {results['failed']}")

                time.sleep(interval)

            except KeyboardInterrupt:
                print("\n[INFO] Processor stopped")
                break
            except Exception as e:
                print(f"[ERROR] Processing cycle failed: {e}")
                time.sleep(interval)


def main():
    """Main entry point for CLI usage."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Process pending Jira worklogs'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Process once and exit'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=60,
        help='Seconds between processing runs (default: 60)'
    )
    parser.add_argument(
        '--dir',
        type=str,
        help='Pending worklogs directory'
    )

    args = parser.parse_args()

    pending_dir = Path(args.dir) if args.dir else None
    processor = PendingWorklogProcessor(pending_dir)

    if args.once:
        results = processor.process_all()
        print(f"\nResults: {json.dumps(results, indent=2)}")
    else:
        processor.run_continuous(args.interval)


if __name__ == '__main__':
    main()
