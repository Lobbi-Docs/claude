#!/usr/bin/env python3
"""
Log Rotation and Archival Script

Automatically archives agent activity logs older than configured retention period.
Generates daily summary reports.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

class LogRotation:
    def __init__(self, config_path: str = ".claude/orchestration/config.json"):
        with open(config_path) as f:
            config = json.load(f)

        self.config = config.get('activity_logging', {})
        self.vault_path = Path(self.config['obsidian_vault'])
        self.activity_log = self.vault_path / self.config['activity_log_path']
        self.archive_path = self.vault_path / self.config['archive_path']
        self.retention_days = self.config['retention_days']

    def rotate(self):
        """Archive entries older than retention_days"""
        if not self.activity_log.exists():
            print("No activity log found")
            return

        # Read current log
        with open(self.activity_log, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Find table header and separator
        table_start = 0
        for i, line in enumerate(lines):
            if line.startswith('| Agent ID'):
                table_start = i
                break

        # Parse entries
        current_entries = []
        archived_entries = []
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)

        for line in lines[table_start+2:]:  # Skip header and separator
            if not line.strip() or not line.startswith('|'):
                break

            # Extract timestamp (column 4: Start Time)
            parts = [p.strip() for p in line.split('|')]
            if len(parts) < 4:
                continue

            try:
                start_time = datetime.fromisoformat(parts[4])
                if start_time < cutoff_date:
                    archived_entries.append(line)
                else:
                    current_entries.append(line)
            except:
                current_entries.append(line)  # Keep if parse fails

        # Write current entries back
        with open(self.activity_log, 'w', encoding='utf-8') as f:
            f.writelines(lines[:table_start+2])  # Header + separator
            f.writelines(current_entries)

        # Archive old entries
        if archived_entries:
            self.archive_path.mkdir(parents=True, exist_ok=True)
            archive_file = self.archive_path / f"{datetime.now().strftime('%Y-%m')}-archive.md"

            with open(archive_file, 'a', encoding='utf-8') as f:
                if archive_file.stat().st_size == 0:
                    # Write header for new archive
                    f.write(f"# Archived Agent Activities - {datetime.now().strftime('%B %Y')}\n\n")
                    f.writelines(lines[table_start:table_start+2])  # Table header
                f.writelines(archived_entries)

        print(f"Rotated {len(archived_entries)} entries, kept {len(current_entries)} active")

    def generate_summary(self):
        """Generate daily summary report"""
        if not self.config.get('daily_summary'):
            return

        summary_path = self.vault_path / self.config['summary_path']

        # Read current log
        with open(self.activity_log, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Parse entries for today
        today = datetime.now().date()
        today_entries = []

        for line in lines:
            if not line.startswith('|') or 'Agent ID' in line:
                continue

            parts = [p.strip() for p in line.split('|')]
            if len(parts) < 14:
                continue

            try:
                start_time = datetime.fromisoformat(parts[4]).date()
                if start_time == today:
                    today_entries.append(parts)
            except:
                continue

        # Calculate metrics
        total_tasks = len(today_entries)
        completed = sum(1 for e in today_entries if e[8] == 'completed')
        failed = sum(1 for e in today_entries if e[8] == 'failed')
        in_progress = sum(1 for e in today_entries if e[8] == 'in_progress')
        total_errors = sum(int(e[10]) for e in today_entries if e[10].isdigit())

        # Agent type distribution
        agent_types = {}
        for entry in today_entries:
            agent_type = entry[2]
            agent_types[agent_type] = agent_types.get(agent_type, 0) + 1

        # Generate summary
        summary = f"""---
title: Daily Agent Activity Summary
date: {today.isoformat()}
type: summary
---

# Agent Activity Summary - {today.strftime('%B %d, %Y')}

## Overview

- **Total Tasks:** {total_tasks}
- **Completed:** {completed}
- **Failed:** {failed}
- **In Progress:** {in_progress}
- **Total Errors:** {total_errors}

## Agent Distribution

| Agent Type | Count |
|------------|-------|
"""
        for agent_type, count in sorted(agent_types.items(), key=lambda x: x[1], reverse=True):
            summary += f"| {agent_type} | {count} |\n"

        summary += f"\n## Error Rate\n\n"
        error_rate = (total_errors / total_tasks * 100) if total_tasks > 0 else 0
        summary += f"- **Error Rate:** {error_rate:.1f}%\n"

        if error_rate > self.config.get('error_threshold', 3):
            summary += f"- ⚠️ **ALERT:** Error rate exceeds threshold ({self.config['error_threshold']}%)\n"

        # Write summary
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(summary)

        print(f"Generated daily summary: {summary_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: log-rotation.py [rotate|generate_summary]")
        return

    rotation = LogRotation()

    if sys.argv[1] == 'rotate':
        rotation.rotate()
    elif sys.argv[1] == 'generate_summary':
        rotation.generate_summary()
    else:
        print(f"Unknown command: {sys.argv[1]}")

if __name__ == '__main__':
    main()
