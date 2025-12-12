#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for agent activity tracking integration

Demonstrates:
1. Agent registration with Obsidian logging
2. Phase transitions (explore → plan → code → test → fix → document)
3. Checkpoint logging at key milestones
4. Agent completion tracking
"""

import time
import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import Orchestrator, Agent, Task
from agent_activity_logger import track_agent, update_agent_phase, log_checkpoint


def test_orchestrator_integration():
    """Test full orchestration with activity logging"""
    print("=" * 80)
    print("Agent Activity Tracking Integration Test")
    print("=" * 80)
    print()

    # Initialize orchestrator
    orchestrator = Orchestrator()
    session_id = orchestrator.start_session("Test Session", "hierarchical")

    print(f"✓ Session started: {session_id}\n")

    # Create a task with dynamic ID
    import uuid
    task = Task(
        id=f"task-{uuid.uuid4().hex[:8]}",
        title="Implement user authentication",
        session_id=session_id,
        description="Add JWT-based authentication to API"
    )
    task_id = orchestrator.tasks.create(task)
    print(f"✓ Task created: {task_id}\n")

    # Register agent with Obsidian tracking
    print("Phase 1: EXPLORE")
    print("-" * 80)
    agent = Agent(
        id=f"coder-{uuid.uuid4().hex[:8]}",
        name="Authentication Coder",
        type="coder",
        category="development",
        model="sonnet"
    )
    agent_id = orchestrator.agents.register(agent, task_id=task_id)
    print(f"✓ Agent registered: {agent_id}")
    print(f"  Obsidian tracking enabled: {agent_id in orchestrator.agents.obsidian_agent_ids}")

    # Phase 1: Explore
    orchestrator.update_agent_phase(agent_id, 'explore', 'Analyzing authentication requirements')
    time.sleep(0.1)
    print("✓ Exploring requirements...")

    # Phase 2: Plan
    print("\nPhase 2: PLAN")
    print("-" * 80)

    # CHECKPOINT 2: Planning
    orchestrator.log_agent_checkpoint(
        agent_id,
        'planning',
        state={'phase': 'plan'},
        metadata={'tasks_identified': 5, 'dependencies': ['jwt', 'bcrypt']}
    )
    print("✓ Planning checkpoint logged")

    orchestrator.update_agent_phase(agent_id, 'plan', 'Creating task breakdown')
    time.sleep(0.1)
    print("✓ Planning implementation...")

    # CHECKPOINT 3: Post-plan
    orchestrator.log_agent_checkpoint(
        agent_id,
        'post-plan',
        state={'phase': 'plan_complete'},
        metadata={'plan_approved': True, 'estimated_duration': 60}
    )
    print("✓ Post-plan checkpoint logged")

    # Phase 3: Code
    print("\nPhase 3: CODE")
    print("-" * 80)
    orchestrator.update_agent_phase(agent_id, 'code', 'Implementing JWT authentication', files_modified=3)
    time.sleep(0.1)
    print("✓ Coding authentication module...")

    orchestrator.update_agent_phase(agent_id, 'code', 'Adding password hashing', files_modified=5)
    time.sleep(0.1)
    print("✓ Implementing password security...")

    # Phase 4: Test
    print("\nPhase 4: TEST")
    print("-" * 80)

    # CHECKPOINT 4: Quality check
    orchestrator.log_agent_checkpoint(
        agent_id,
        'quality-check',
        state={'phase': 'testing'},
        metadata={'tests_run': 15, 'tests_passed': 15, 'coverage': 95}
    )
    print("✓ Quality check checkpoint logged")

    orchestrator.update_agent_phase(agent_id, 'test', 'Running authentication tests')
    time.sleep(0.1)
    print("✓ Running unit tests...")

    # Phase 5: Fix (simulated - no issues found)
    print("\nPhase 5: FIX")
    print("-" * 80)
    print("✓ No issues found, skipping fix phase")

    # Phase 6: Document
    print("\nPhase 6: DOCUMENT")
    print("-" * 80)
    orchestrator.update_agent_phase(agent_id, 'document', 'Updating API documentation')
    time.sleep(0.1)
    print("✓ Writing documentation...")

    # CHECKPOINT 5: Commit
    orchestrator.log_agent_checkpoint(
        agent_id,
        'commit',
        state={'phase': 'complete'},
        metadata={'files_committed': 5, 'tests_passing': 15}
    )
    print("✓ Commit checkpoint logged")

    # Complete agent
    print("\nCompletion")
    print("-" * 80)
    orchestrator.agents.complete_agent(agent_id, status='completed', errors=0, warnings=1)
    print(f"✓ Agent completed with 0 errors, 1 warning")

    # Update task status
    from orchestrator import TaskStatus
    orchestrator.tasks.update_status(task_id, TaskStatus.COMPLETED)
    print(f"✓ Task marked as completed")

    # End session
    orchestrator.end_session(session_id, status='completed')
    print(f"\n✓ Session ended: {session_id}")

    # Get session summary
    summary = orchestrator.get_session_summary(session_id)
    print(f"\nSession Summary:")
    print(f"  Name: {summary.get('name')}")
    print(f"  Pattern: {summary.get('pattern')}")
    print(f"  Status: {summary.get('status')}")

    # Clean up
    orchestrator.close()

    # Check fallback JSON
    print("\n" + "=" * 80)
    fallback_path = Path(__file__).parent / "db" / "agent-activity.json"
    if fallback_path.exists():
        import json
        with open(fallback_path, 'r') as f:
            entries = json.load(f)
        print(f"✓ Fallback JSON created: {fallback_path}")
        print(f"  Total events logged: {len(entries)}")
        print(f"\nRecent events:")
        for entry in entries[-5:]:
            print(f"  [{entry['timestamp']}] {entry['event_type']}: {entry['agent_id']}")
    else:
        print("⚠ No fallback JSON created (MCP logging succeeded)")

    print("\n" + "=" * 80)
    print("✅ All tests passed!")
    print("=" * 80)


def test_context_manager():
    """Test context manager pattern"""
    print("\n\n" + "=" * 80)
    print("Context Manager Pattern Test")
    print("=" * 80)
    print()

    import uuid
    with track_agent('tester', f'task-{uuid.uuid4().hex[:8]}') as agent_id:
        print(f"✓ Agent {agent_id} started via context manager")

        update_agent_phase(agent_id, 'explore', 'Analyzing test requirements')
        time.sleep(0.05)
        print(f"  Phase: explore")

        log_checkpoint(agent_id, 'planning', {'test_suites': 3})
        print(f"  Checkpoint: planning")

        update_agent_phase(agent_id, 'test', 'Running integration tests')
        time.sleep(0.05)
        print(f"  Phase: test")

        log_checkpoint(agent_id, 'quality-check', {'tests_passed': 25})
        print(f"  Checkpoint: quality-check")

        print(f"✓ Agent {agent_id} completing...")

    print("✅ Context manager test passed!")


def test_hierarchical_tracking():
    """Test hierarchical agent tracking (parent-child)"""
    print("\n\n" + "=" * 80)
    print("Hierarchical Agent Tracking Test")
    print("=" * 80)
    print()

    import uuid
    orchestrator = Orchestrator()
    session_id = orchestrator.start_session("Hierarchical Test", "hierarchical")

    # Generate unique IDs
    parent_task_id = f"sprint-{uuid.uuid4().hex[:8]}"
    child1_task_id = f"{parent_task_id}-1"
    child2_task_id = f"{parent_task_id}-2"

    # Parent agent
    parent_agent = Agent(
        id=f"planner-{uuid.uuid4().hex[:8]}",
        name="Sprint Planner",
        type="planner",
        category="core"
    )
    parent_id = orchestrator.agents.register(parent_agent, task_id=parent_task_id)
    print(f"✓ Parent agent registered: {parent_id}")

    orchestrator.update_agent_phase(parent_id, 'plan', 'Breaking down sprint tasks')
    time.sleep(0.05)

    # Child agent 1
    child1_agent = Agent(
        id=f"coder-{uuid.uuid4().hex[:8]}",
        name="Feature A Coder",
        type="coder",
        category="development"
    )
    child1_id = orchestrator.agents.register(child1_agent, task_id=child1_task_id, parent_task=parent_task_id)
    print(f"  ├─ Child agent 1 registered: {child1_id}")

    orchestrator.update_agent_phase(child1_id, 'code', 'Implementing feature A')
    time.sleep(0.05)
    orchestrator.agents.complete_agent(child1_id, status='completed')
    print(f"  ├─ Child agent 1 completed")

    # Child agent 2
    child2_agent = Agent(
        id=f"coder-{uuid.uuid4().hex[:8]}",
        name="Feature B Coder",
        type="coder",
        category="development"
    )
    child2_id = orchestrator.agents.register(child2_agent, task_id=child2_task_id, parent_task=parent_task_id)
    print(f"  ├─ Child agent 2 registered: {child2_id}")

    orchestrator.update_agent_phase(child2_id, 'code', 'Implementing feature B')
    time.sleep(0.05)
    orchestrator.agents.complete_agent(child2_id, status='completed')
    print(f"  └─ Child agent 2 completed")

    # Complete parent
    orchestrator.update_agent_phase(parent_id, 'document', 'Finalizing sprint documentation')
    orchestrator.agents.complete_agent(parent_id, status='completed')
    print(f"✓ Parent agent completed")

    orchestrator.end_session(session_id)
    orchestrator.close()

    print("✅ Hierarchical tracking test passed!")


if __name__ == '__main__':
    try:
        test_orchestrator_integration()
        test_context_manager()
        test_hierarchical_tracking()

        print("\n\n" + "=" * 80)
        print("🎉 ALL TESTS PASSED!")
        print("=" * 80)
        print("\nNext Steps:")
        print("1. Run 'python agent_activity_logger.py' to test standalone logging")
        print("2. Check fallback JSON: .claude/orchestration/db/agent-activity.json")
        print("3. Verify Obsidian vault integration when MCP is available")
        print("4. Ready for devops-automator (Task 3.5)")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
