# Agent Activity Tracking - Integration Examples

**Quick integration patterns for common use cases**

---

## Example 1: Simple Agent with Full Lifecycle

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

def run_simple_agent(task_id: str):
    """
    Basic agent executing all 6 phases with checkpoint tracking.
    """
    with track_agent('coder', task_id) as agent_id:
        # Phase 1: Explore
        update_agent_phase(agent_id, 'explore', 'Analyzing requirements')

        # Phase 2: Plan
        log_checkpoint(agent_id, 'planning', {'tasks_identified': 3})
        update_agent_phase(agent_id, 'plan', 'Creating implementation plan')

        # Phase 3: Code
        log_checkpoint(agent_id, 'post-plan', {'estimated_duration': 30})
        update_agent_phase(agent_id, 'code', 'Writing code', files_modified=5)

        # Phase 4: Test
        update_agent_phase(agent_id, 'test', 'Running test suite')
        log_checkpoint(agent_id, 'quality-check', {
            'tests_run': 25,
            'tests_passed': 25,
            'coverage': '95%'
        })

        # Phase 6: Document
        update_agent_phase(agent_id, 'document', 'Updating documentation')

        # Auto-logs commit checkpoint and completion
    # Duration auto-calculated on exit

# Usage
run_simple_agent('feat-user-auth')
\`\`\`

**Result:**
- ✅ 5 checkpoints logged
- ✅ Duration calculated automatically
- ✅ All 6 phases tracked
- ✅ Status: completed

---

## Example 2: Multi-Agent Workflow (Hierarchical)

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

def implement_feature(feature_name: str):
    """
    Multi-agent feature implementation with parent-child tracking.
    """
    parent_task_id = f'feature-{feature_name}'

    # Parent: Planner agent
    with track_agent('planner', parent_task_id) as parent_id:
        update_agent_phase(parent_id, 'plan', f'Planning {feature_name}')
        log_checkpoint(parent_id, 'planning', {'sub_tasks': 3})

        # Child 1: Backend implementation
        with track_agent('backend-dev', f'{parent_task_id}-backend', parent_task=parent_task_id) as backend_id:
            update_agent_phase(backend_id, 'code', 'Building API endpoints')
            log_checkpoint(backend_id, 'quality-check', {'endpoints': 3, 'tests': 15})

        # Child 2: Frontend implementation
        with track_agent('frontend-dev', f'{parent_task_id}-frontend', parent_task=parent_task_id) as frontend_id:
            update_agent_phase(frontend_id, 'code', 'Building UI components')
            log_checkpoint(frontend_id, 'quality-check', {'components': 5, 'tests': 20})

        # Child 3: Integration testing
        with track_agent('e2e-tester', f'{parent_task_id}-e2e', parent_task=parent_task_id) as tester_id:
            update_agent_phase(tester_id, 'test', 'Running E2E tests')
            log_checkpoint(tester_id, 'quality-check', {'e2e_tests': 10, 'passed': 10})

        # Parent continues
        update_agent_phase(parent_id, 'document', f'Creating {feature_name} documentation')
        log_checkpoint(parent_id, 'commit')

# Usage
implement_feature('user-dashboard')
\`\`\`

**Dashboard View:**
\`\`\`
planner - feature-user-dashboard [completed] 45.2 min
  └─ backend-dev - feature-user-dashboard-backend [completed] 18.3 min
  └─ frontend-dev - feature-user-dashboard-frontend [completed] 22.5 min
  └─ e2e-tester - feature-user-dashboard-e2e [completed] 4.1 min
\`\`\`

---

## Example 3: Error Handling and Recovery

\`\`\`python
from orchestration.agent_activity_logger import (
    track_agent, update_agent_phase, log_checkpoint, log_agent_complete
)

def resilient_agent(task_id: str):
    """
    Agent with error handling and retry logic.
    """
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            with track_agent('backend-dev', f'{task_id}-attempt-{retry_count}') as agent_id:
                update_agent_phase(agent_id, 'explore', 'Analyzing task')

                # Simulate work that might fail
                result = potentially_failing_operation()

                if result.success:
                    log_checkpoint(agent_id, 'quality-check', {
                        'status': 'success',
                        'retry_count': retry_count
                    })
                    return result  # Success - context manager logs completion
                else:
                    # Track warnings but continue
                    log_agent_complete(agent_id, 'completed', errors=0, warnings=1)
                    retry_count += 1

        except Exception as e:
            # Context manager automatically logs as 'failed' with errors=1
            print(f"Attempt {retry_count} failed: {e}")
            retry_count += 1

    # All retries exhausted
    raise RuntimeError(f"Task {task_id} failed after {max_retries} attempts")

# Usage
try:
    resilient_agent('api-deployment')
except RuntimeError as e:
    print(f"Agent failed: {e}")
\`\`\`

**Result:**
- ✅ Each attempt logged separately
- ✅ Retry count tracked in metadata
- ✅ Failures marked with errors=1
- ✅ Success tracked after recovery

---

## Example 4: Parallel Agent Coordination

\`\`\`python
import concurrent.futures
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

def parallel_testing(test_suites: list[str]):
    """
    Run multiple test agents in parallel with proper tracking.
    """
    def run_test_agent(suite_name: str):
        with track_agent('tester', f'test-{suite_name}') as agent_id:
            update_agent_phase(agent_id, 'test', f'Running {suite_name}')

            # Run tests
            results = execute_test_suite(suite_name)

            log_checkpoint(agent_id, 'quality-check', {
                'suite': suite_name,
                'tests': results.total,
                'passed': results.passed,
                'failed': results.failed
            })

            return results

    # Execute agents in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(run_test_agent, suite) for suite in test_suites]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    return results

# Usage
suites = ['unit', 'integration', 'e2e', 'performance', 'security']
results = parallel_testing(suites)
\`\`\`

**Dashboard View:**
\`\`\`
Active Agents (5):
  tester - test-unit [test] Running unit
  tester - test-integration [test] Running integration
  tester - test-e2e [test] Running e2e
  tester - test-performance [test] Running performance
  tester - test-security [test] Running security
\`\`\`

---

## Example 5: Agent with Progress Reporting

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

def data_migration_agent(source: str, destination: str, record_count: int):
    """
    Long-running agent with progress checkpoints.
    """
    with track_agent('data-engineer', f'migrate-{source}-to-{destination}') as agent_id:
        # Phase 1: Explore
        update_agent_phase(agent_id, 'explore', f'Analyzing {record_count} records')
        log_checkpoint(agent_id, 'planning', {'total_records': record_count})

        # Phase 2: Plan
        batch_size = 1000
        batches = (record_count + batch_size - 1) // batch_size
        update_agent_phase(agent_id, 'plan', f'Planning {batches} batches')

        # Phase 3: Code (execute migration)
        log_checkpoint(agent_id, 'post-plan', {'batches': batches, 'batch_size': batch_size})

        for i in range(batches):
            processed = min((i + 1) * batch_size, record_count)
            progress = round((processed / record_count) * 100, 1)

            update_agent_phase(
                agent_id,
                'code',
                f'Migrating batch {i+1}/{batches} ({progress}%)'
            )

            # Migrate batch
            migrate_batch(source, destination, i * batch_size, batch_size)

            # Log progress checkpoint every 10 batches
            if (i + 1) % 10 == 0:
                log_checkpoint(agent_id, 'quality-check', {
                    'batch': i + 1,
                    'processed': processed,
                    'progress_pct': progress
                })

        # Phase 4: Test (verify migration)
        update_agent_phase(agent_id, 'test', 'Verifying migration')
        verification_result = verify_migration(destination, record_count)

        log_checkpoint(agent_id, 'quality-check', {
            'verified': verification_result.verified,
            'mismatches': verification_result.mismatches
        })

        # Phase 6: Document
        update_agent_phase(agent_id, 'document', 'Creating migration report')

# Usage
data_migration_agent('mysql://old-db', 'postgres://new-db', record_count=50000)
\`\`\`

**Dashboard View:**
\`\`\`
data-engineer - migrate-mysql://old-db-to-postgres://new-db
  Phase: code
  Action: Migrating batch 35/50 (70.0%)
  Duration: 18.5 min
  Status: in_progress
\`\`\`

---

## Example 6: Agent with External Service Integration

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

def deployment_agent(service_name: str, version: str):
    """
    Deployment agent integrating with external services.
    """
    with track_agent('k8s-deployer', f'deploy-{service_name}-{version}') as agent_id:
        # Phase 1: Explore
        update_agent_phase(agent_id, 'explore', f'Checking {service_name} status')

        # Phase 2: Plan
        log_checkpoint(agent_id, 'planning', {
            'service': service_name,
            'version': version,
            'replicas': 3
        })
        update_agent_phase(agent_id, 'plan', 'Creating deployment plan')

        # Phase 3: Code (apply deployment)
        log_checkpoint(agent_id, 'post-plan', {'strategy': 'rolling-update'})
        update_agent_phase(agent_id, 'code', f'Deploying {service_name}:{version}')

        # Apply Kubernetes manifests
        kubectl_apply_result = apply_k8s_manifests(service_name, version)

        # Phase 4: Test (health checks)
        update_agent_phase(agent_id, 'test', 'Running health checks')

        # Wait for rollout
        rollout_status = wait_for_rollout(service_name, timeout=300)

        log_checkpoint(agent_id, 'quality-check', {
            'rollout_status': rollout_status.status,
            'replicas_ready': rollout_status.ready_replicas,
            'health_check': rollout_status.health_check_passed
        })

        if not rollout_status.health_check_passed:
            # Rollback on failure
            update_agent_phase(agent_id, 'fix', 'Rolling back deployment')
            kubectl_rollback(service_name)
            log_checkpoint(agent_id, 'commit', {'rollback': True})
            raise DeploymentError(f"{service_name} health checks failed")

        # Phase 6: Document
        update_agent_phase(agent_id, 'document', 'Recording deployment')

# Usage
deployment_agent('api-service', 'v2.3.1')
\`\`\`

**Result:**
- ✅ External service integration tracked
- ✅ Rollback scenario logged
- ✅ Health check results captured
- ✅ Deployment duration measured

---

## Example 7: Agent Factory Pattern

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint
from typing import Callable

class AgentFactory:
    """
    Factory for creating tracked agents with consistent patterns.
    """

    @staticmethod
    def create_analysis_agent(task_id: str, analyze_fn: Callable):
        """Create an analysis agent with standard tracking."""
        def run():
            with track_agent('code-analyzer', task_id) as agent_id:
                update_agent_phase(agent_id, 'explore', 'Loading codebase')

                # Run analysis
                results = analyze_fn()

                log_checkpoint(agent_id, 'planning', {
                    'files_analyzed': results.file_count,
                    'issues_found': results.issue_count
                })

                update_agent_phase(agent_id, 'document', 'Generating report')
                return results

        return run

    @staticmethod
    def create_build_agent(task_id: str, build_fn: Callable):
        """Create a build agent with standard tracking."""
        def run():
            with track_agent('docker-builder', task_id) as agent_id:
                update_agent_phase(agent_id, 'explore', 'Checking dependencies')

                log_checkpoint(agent_id, 'planning', {'build_type': 'docker'})
                update_agent_phase(agent_id, 'code', 'Building image')

                # Run build
                image_id = build_fn()

                log_checkpoint(agent_id, 'quality-check', {
                    'image_id': image_id,
                    'size_mb': get_image_size(image_id)
                })

                return image_id

        return run

# Usage
analyzer = AgentFactory.create_analysis_agent('analyze-repo-123', lambda: run_analysis())
builder = AgentFactory.create_build_agent('build-api-v2', lambda: build_docker_image())

analysis_results = analyzer()
image_id = builder()
\`\`\`

---

## Example 8: Async Agent (Python AsyncIO)

\`\`\`python
import asyncio
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

async def async_agent(task_id: str):
    """
    Asynchronous agent with proper tracking.
    """
    with track_agent('api-tester', task_id) as agent_id:
        # Phase 1: Explore
        update_agent_phase(agent_id, 'explore', 'Discovering API endpoints')

        # Async exploration
        endpoints = await discover_api_endpoints()

        log_checkpoint(agent_id, 'planning', {'endpoints': len(endpoints)})

        # Phase 4: Test (concurrent testing)
        update_agent_phase(agent_id, 'test', f'Testing {len(endpoints)} endpoints')

        # Run tests concurrently
        tasks = [test_endpoint(ep) for ep in endpoints]
        results = await asyncio.gather(*tasks)

        passed = sum(1 for r in results if r.passed)
        failed = len(results) - passed

        log_checkpoint(agent_id, 'quality-check', {
            'total': len(results),
            'passed': passed,
            'failed': failed
        })

        # Phase 6: Document
        update_agent_phase(agent_id, 'document', 'Creating test report')

        return results

# Usage
asyncio.run(async_agent('api-smoke-tests'))
\`\`\`

---

## Example 9: Agent with Rollback Support

\`\`\`python
from orchestration.agent_activity_logger import (
    track_agent, update_agent_phase, log_checkpoint, log_agent_complete
)

def deployment_with_rollback(service: str, version: str):
    """
    Deployment agent with automatic rollback on failure.
    """
    previous_version = get_current_version(service)
    rollback_performed = False

    try:
        with track_agent('cicd-engineer', f'deploy-{service}-{version}') as agent_id:
            # Phase 1: Explore
            update_agent_phase(agent_id, 'explore', f'Current: {previous_version}')

            # Phase 2: Plan
            log_checkpoint(agent_id, 'planning', {
                'previous_version': previous_version,
                'target_version': version
            })

            # Phase 3: Code (deploy)
            log_checkpoint(agent_id, 'post-plan')
            update_agent_phase(agent_id, 'code', f'Deploying {version}')

            deploy_result = deploy_service(service, version)

            # Phase 4: Test
            update_agent_phase(agent_id, 'test', 'Smoke testing')
            smoke_test_result = run_smoke_tests(service)

            if not smoke_test_result.passed:
                # Phase 5: Fix (rollback)
                update_agent_phase(agent_id, 'fix', f'Rolling back to {previous_version}')
                rollback_service(service, previous_version)
                rollback_performed = True

                log_checkpoint(agent_id, 'commit', {
                    'rollback': True,
                    'previous_version': previous_version,
                    'failed_version': version
                })

                raise DeploymentError("Smoke tests failed, rolled back")

            log_checkpoint(agent_id, 'quality-check', {
                'smoke_tests_passed': True,
                'version': version
            })

            # Phase 6: Document
            update_agent_phase(agent_id, 'document', 'Recording deployment')

    except Exception as e:
        if rollback_performed:
            # Log as completed (successful rollback)
            log_agent_complete(agent_id, 'completed', errors=0, warnings=1)
        raise

# Usage
deployment_with_rollback('payment-service', 'v1.5.2')
\`\`\`

---

## Example 10: Agent Metrics Collection

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint
import time

def performance_test_agent(endpoint: str, request_count: int):
    """
    Performance testing agent collecting detailed metrics.
    """
    with track_agent('load-tester', f'perf-{endpoint}') as agent_id:
        # Phase 1: Explore
        update_agent_phase(agent_id, 'explore', f'Preparing {request_count} requests')

        # Phase 2: Plan
        log_checkpoint(agent_id, 'planning', {
            'endpoint': endpoint,
            'request_count': request_count,
            'concurrency': 10
        })

        # Phase 4: Test (load testing)
        update_agent_phase(agent_id, 'test', f'Load testing {endpoint}')

        start_time = time.time()
        results = run_load_test(endpoint, request_count, concurrency=10)
        duration = time.time() - start_time

        # Calculate metrics
        avg_response_time = sum(results.response_times) / len(results.response_times)
        p95_response_time = calculate_percentile(results.response_times, 95)
        p99_response_time = calculate_percentile(results.response_times, 99)
        throughput = request_count / duration

        log_checkpoint(agent_id, 'quality-check', {
            'requests': request_count,
            'duration_sec': round(duration, 2),
            'avg_response_ms': round(avg_response_time, 2),
            'p95_response_ms': round(p95_response_time, 2),
            'p99_response_ms': round(p99_response_time, 2),
            'throughput_rps': round(throughput, 2),
            'errors': results.error_count,
            'success_rate_pct': round((1 - results.error_count / request_count) * 100, 2)
        })

        # Phase 6: Document
        update_agent_phase(agent_id, 'document', 'Generating performance report')

        return results

# Usage
performance_test_agent('/api/v1/users', request_count=10000)
\`\`\`

**Dashboard View:**
\`\`\`
load-tester - perf-/api/v1/users [completed] 2.5 min
  Checkpoint: quality-check
  Metadata:
    requests: 10000
    avg_response_ms: 45.2
    p95_response_ms: 120.5
    p99_response_ms: 250.8
    throughput_rps: 66.7
    success_rate_pct: 99.95
\`\`\`

---

## See Also

- **Full Documentation:** [AGENT_ACTIVITY_TRACKING.md]
- **Quick Reference:** [AGENT_TRACKING_QUICK_REF.md]
- **Python API:** [agent_activity_logger.py]
- **TypeScript API:** [obsidian-mcp-client.ts]
