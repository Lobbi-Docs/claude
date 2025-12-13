/**
 * Distributed Agent Execution System - Worker Manager
 * Worker registration, heartbeat monitoring, and load balancing
 */

import { randomUUID } from 'crypto';
import type { DistributedDatabase } from './database.js';
import type {
  Worker,
  WorkerRegistration,
  WorkerHeartbeat,
  WorkerStatus,
  WorkerRow,
  ActiveWorkerView,
  StaleWorkerView,
  WorkerPerformanceSummary,
  LoadBalancingStrategy,
  WorkerNotFoundError,
} from './types.js';

export interface WorkerManagerConfig {
  defaultMaxLoad: number;
  defaultHeartbeatIntervalMs: number;
  staleThresholdMultiplier: number; // Multiplier of heartbeat interval to consider stale
  autoCleanupStale: boolean;
}

const DEFAULT_CONFIG: WorkerManagerConfig = {
  defaultMaxLoad: 5,
  defaultHeartbeatIntervalMs: 30000, // 30 seconds
  staleThresholdMultiplier: 2,
  autoCleanupStale: true,
};

export class WorkerManager {
  private config: WorkerManagerConfig;

  constructor(
    private db: DistributedDatabase,
    config?: Partial<WorkerManagerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a new worker
   */
  register(registration: WorkerRegistration): string {
    const workerId = randomUUID();

    this.db.execute(
      `INSERT INTO workers (
        id, name, capabilities, status, max_load, heartbeat_interval_ms,
        model_name, model_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workerId,
        registration.name,
        JSON.stringify(registration.capabilities),
        'idle',
        registration.maxLoad ?? this.config.defaultMaxLoad,
        registration.heartbeatIntervalMs ?? this.config.defaultHeartbeatIntervalMs,
        registration.modelName ?? null,
        registration.modelId ?? null,
        registration.metadata ? JSON.stringify(registration.metadata) : null,
      ]
    );

    console.log(`[WorkerManager] Registered worker ${workerId} (${registration.name})`);
    return workerId;
  }

  /**
   * Unregister a worker
   */
  unregister(workerId: string): void {
    this.db.execute(
      `UPDATE workers SET status = 'offline' WHERE id = ?`,
      [workerId]
    );

    console.log(`[WorkerManager] Unregistered worker ${workerId}`);
  }

  /**
   * Process heartbeat from worker
   */
  heartbeat(heartbeat: WorkerHeartbeat): void {
    const updates: string[] = ['last_heartbeat = CURRENT_TIMESTAMP'];
    const params: unknown[] = [];

    if (heartbeat.status) {
      updates.push('status = ?');
      params.push(heartbeat.status);
    }

    if (heartbeat.currentLoad !== undefined) {
      updates.push('current_load = ?');
      params.push(heartbeat.currentLoad);
    }

    if (heartbeat.metadata) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(heartbeat.metadata));
    }

    // Reset consecutive failures on successful heartbeat
    updates.push('consecutive_failures = 0');

    params.push(heartbeat.workerId);

    this.db.execute(
      `UPDATE workers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  /**
   * Get worker by ID
   */
  get(workerId: string): Worker | null {
    const row = this.db.queryOne<WorkerRow>(
      `SELECT * FROM workers WHERE id = ?`,
      [workerId]
    );

    return row ? this.rowToWorker(row) : null;
  }

  /**
   * Get all workers
   */
  getAll(includeOffline = false): Worker[] {
    const query = includeOffline
      ? `SELECT * FROM workers ORDER BY name`
      : `SELECT * FROM workers WHERE status != 'offline' ORDER BY name`;

    const rows = this.db.query<WorkerRow>(query);
    return rows.map(r => this.rowToWorker(r));
  }

  /**
   * Get active workers (idle or busy, not offline)
   */
  getActive(): Worker[] {
    const rows = this.db.query<WorkerRow>(
      `SELECT * FROM workers WHERE status IN ('idle', 'busy') ORDER BY load_factor ASC`
    );

    return rows.map(r => this.rowToWorker(r));
  }

  /**
   * Get active workers view (with staleness info)
   */
  getActiveView(): ActiveWorkerView[] {
    const rows = this.db.query<
      WorkerRow & { seconds_since_heartbeat: number; is_stale: number }
    >(`SELECT * FROM v_active_workers`);

    return rows.map(r => ({
      ...this.rowToWorker(r),
      secondsSinceHeartbeat: r.seconds_since_heartbeat,
      isStale: r.is_stale === 1,
    }));
  }

  /**
   * Get idle workers
   */
  getIdle(): Worker[] {
    const rows = this.db.query<WorkerRow>(
      `SELECT * FROM workers WHERE status = 'idle' ORDER BY load_factor ASC`
    );

    return rows.map(r => this.rowToWorker(r));
  }

  /**
   * Get workers with specific capabilities
   */
  getWithCapabilities(requiredCapabilities: string[]): Worker[] {
    const workers = this.getActive();

    return workers.filter(worker => {
      return requiredCapabilities.every(cap =>
        worker.capabilities.includes(cap)
      );
    });
  }

  /**
   * Select worker using load balancing strategy
   */
  selectWorker(
    strategy: LoadBalancingStrategy,
    requiredCapabilities?: string[]
  ): Worker | null {
    let workers = requiredCapabilities
      ? this.getWithCapabilities(requiredCapabilities)
      : this.getActive();

    // Filter out overloaded workers
    workers = workers.filter(w => w.currentLoad < w.maxLoad);

    if (workers.length === 0) return null;

    switch (strategy) {
      case 'least-loaded':
        return workers.reduce((min, w) =>
          w.loadFactor < min.loadFactor ? w : min
        );

      case 'round-robin':
        // Simple implementation: return first idle or least loaded
        const idle = workers.filter(w => w.status === 'idle');
        return idle.length > 0 ? idle[0] : workers[0];

      case 'capability-match':
        // Prefer workers with exact capability match
        if (requiredCapabilities) {
          const exactMatches = workers.filter(
            w =>
              w.capabilities.length === requiredCapabilities.length &&
              requiredCapabilities.every(cap => w.capabilities.includes(cap))
          );
          if (exactMatches.length > 0) {
            return exactMatches.reduce((min, w) =>
              w.loadFactor < min.loadFactor ? w : min
            );
          }
        }
        // Fall back to least loaded
        return workers.reduce((min, w) =>
          w.loadFactor < min.loadFactor ? w : min
        );

      case 'random':
        return workers[Math.floor(Math.random() * workers.length)];

      case 'weighted':
        // Weighted random by available capacity
        const weights = workers.map(w => w.maxLoad - w.currentLoad);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < workers.length; i++) {
          random -= weights[i];
          if (random <= 0) return workers[i];
        }

        return workers[0];

      default:
        return workers[0];
    }
  }

  /**
   * Increment worker load
   */
  incrementLoad(workerId: string): void {
    this.db.execute(
      `UPDATE workers
       SET current_load = current_load + 1
       WHERE id = ?`,
      [workerId]
    );
  }

  /**
   * Decrement worker load
   */
  decrementLoad(workerId: string): void {
    this.db.execute(
      `UPDATE workers
       SET current_load = CASE
         WHEN current_load > 0 THEN current_load - 1
         ELSE 0
       END
       WHERE id = ?`,
      [workerId]
    );
  }

  /**
   * Update worker status
   */
  updateStatus(workerId: string, status: WorkerStatus): void {
    this.db.execute(
      `UPDATE workers SET status = ? WHERE id = ?`,
      [status, workerId]
    );
  }

  /**
   * Record worker failure
   */
  recordFailure(workerId: string): void {
    this.db.execute(
      `UPDATE workers
       SET consecutive_failures = consecutive_failures + 1
       WHERE id = ?`,
      [workerId]
    );

    // Mark as error if too many failures
    const worker = this.get(workerId);
    if (worker && worker.consecutiveFailures >= 3) {
      this.updateStatus(workerId, 'error');
      console.error(`[WorkerManager] Worker ${workerId} marked as error after ${worker.consecutiveFailures} failures`);
    }
  }

  /**
   * Get stale workers (missed heartbeats)
   */
  getStale(): StaleWorkerView[] {
    const rows = this.db.query<{
      id: string;
      name: string;
      status: WorkerStatus;
      last_heartbeat: string;
      heartbeat_interval_ms: number;
      ms_since_heartbeat: number;
      consecutive_failures: number;
      current_load: number;
    }>(`SELECT * FROM v_stale_workers`);

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      lastHeartbeat: new Date(r.last_heartbeat),
      heartbeatIntervalMs: r.heartbeat_interval_ms,
      msSinceHeartbeat: r.ms_since_heartbeat,
      consecutiveFailures: r.consecutive_failures,
      currentLoad: r.current_load,
    }));
  }

  /**
   * Mark stale workers as offline
   */
  markStaleAsOffline(): number {
    const result = this.db.execute(
      `UPDATE workers
       SET status = 'offline'
       WHERE CAST((julianday('now') - julianday(last_heartbeat)) * 1000 AS INTEGER)
         > heartbeat_interval_ms * ?
         AND status != 'offline'`,
      [this.config.staleThresholdMultiplier]
    );

    if (result.changes > 0) {
      console.warn(`[WorkerManager] Marked ${result.changes} stale workers as offline`);
    }

    return result.changes;
  }

  /**
   * Cleanup stale workers if auto-cleanup is enabled
   */
  autoCleanup(): void {
    if (this.config.autoCleanupStale) {
      this.markStaleAsOffline();
    }
  }

  /**
   * Get worker performance summary
   */
  getPerformanceSummary(workerId?: string): WorkerPerformanceSummary[] {
    const query = workerId
      ? `SELECT * FROM v_worker_performance WHERE id = ?`
      : `SELECT * FROM v_worker_performance ORDER BY total_tasks DESC`;

    const params = workerId ? [workerId] : [];

    return this.db.query<WorkerPerformanceSummary>(query, params);
  }

  /**
   * Get worker statistics
   */
  getStats(): {
    total: number;
    idle: number;
    busy: number;
    offline: number;
    error: number;
    avgLoadFactor: number;
    totalCapacity: number;
    usedCapacity: number;
  } {
    const stats = this.db.queryOne<{
      total: number;
      idle: number;
      busy: number;
      offline: number;
      error: number;
      avgLoadFactor: number;
      totalCapacity: number;
      usedCapacity: number;
    }>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
        AVG(CASE WHEN status != 'offline' THEN load_factor ELSE NULL END) as avgLoadFactor,
        SUM(CASE WHEN status != 'offline' THEN max_load ELSE 0 END) as totalCapacity,
        SUM(CASE WHEN status != 'offline' THEN current_load ELSE 0 END) as usedCapacity
      FROM workers
    `);

    return {
      total: stats?.total ?? 0,
      idle: stats?.idle ?? 0,
      busy: stats?.busy ?? 0,
      offline: stats?.offline ?? 0,
      error: stats?.error ?? 0,
      avgLoadFactor: stats?.avgLoadFactor ?? 0,
      totalCapacity: stats?.totalCapacity ?? 0,
      usedCapacity: stats?.usedCapacity ?? 0,
    };
  }

  /**
   * Convert database row to Worker object
   */
  private rowToWorker(row: WorkerRow): Worker {
    return {
      id: row.id,
      name: row.name,
      capabilities: JSON.parse(row.capabilities),
      status: row.status,
      currentLoad: row.current_load,
      maxLoad: row.max_load,
      loadFactor: row.load_factor,
      lastHeartbeat: new Date(row.last_heartbeat),
      heartbeatIntervalMs: row.heartbeat_interval_ms,
      consecutiveFailures: row.consecutive_failures,
      modelName: row.model_name ?? undefined,
      modelId: row.model_id ?? undefined,
      startedAt: new Date(row.started_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
