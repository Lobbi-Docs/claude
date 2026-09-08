// Shared state library for project-management-plugin.
//
// Used by:
//   - hooks/scripts/*.sh (via the CLI at the bottom of this file)
//   - mcp/pm-server.mjs (imported directly as an ES module)
//   - tests/*.test.mjs
//
// Guarantees:
//   - All mutating writes are guarded by an exclusive O_EXCL lockfile
//     that works on POSIX and Windows. Stale locks older than 30s are broken.
//   - All writes to project.json / tasks.json are validated against the
//     plugin's JSON schemas before rename.
//   - Writes are atomic: data is serialized to temp/.write-<uuid>, then
//     renamed into place.

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PLUGIN_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SCHEMA_DIR = join(PLUGIN_ROOT, 'schemas');

const LOCK_STALE_MS = 30_000;
const LOCK_MAX_WAIT_MS = 5_000;
const LOCK_POLL_MS = 25;

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

export function projectsRoot() {
  const base = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return join(base, '.claude', 'projects');
}

export function projectDir(id) {
  return join(projectsRoot(), id);
}

// ---------------------------------------------------------------------------
// Project + tasks readers
// ---------------------------------------------------------------------------

export function listProjects() {
  const root = projectsRoot();
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root)) {
    const dir = join(root, entry);
    let stat;
    try { stat = statSync(dir); } catch { continue; }
    if (!stat.isDirectory()) continue;
    const projectFile = join(dir, 'project.json');
    if (!existsSync(projectFile)) continue;
    let project = null;
    try { project = JSON.parse(readFileSync(projectFile, 'utf8')); } catch { continue; }
    out.push({ id: project.id || entry, dir, project });
  }
  return out;
}

export function readProject(id) {
  const file = join(projectDir(id), 'project.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function readTasks(id) {
  const file = join(projectDir(id), 'tasks.json');
  if (!existsSync(file)) return { version: 1, tasks: [] };
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  // Accept two on-disk shapes: a bare array (legacy) or the {version, tasks}
  // wrapper described in pm-plan.md. Always normalize to the wrapper form.
  if (Array.isArray(raw)) return { version: 1, tasks: raw };
  return raw;
}

export function findTask(tasksJson, taskId) {
  if (!tasksJson || !Array.isArray(tasksJson.tasks)) return null;
  return tasksJson.tasks.find((t) => t.id === taskId) || null;
}

// ---------------------------------------------------------------------------
// Locking: O_EXCL lockfile, works on POSIX + Windows.
// ---------------------------------------------------------------------------

export async function withLock(lockPath, fn) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  let fd = null;
  while (fd === null) {
    try {
      fd = openSync(lockPath, 'wx');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Break stale locks.
      try {
        const age = Date.now() - statSync(lockPath).mtimeMs;
        if (age > LOCK_STALE_MS) {
          try { unlinkSync(lockPath); } catch {}
          continue;
        }
      } catch {}
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for lock: ${lockPath}`);
      }
      await sleep(LOCK_POLL_MS);
    }
  }
  try {
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    return await fn();
  } finally {
    try { unlinkSync(lockPath); } catch {}
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Atomic writes with schema validation
// ---------------------------------------------------------------------------

export async function writeProject(id, project, { skipValidation = false } = {}) {
  const dir = projectDir(id);
  mkdirSync(dir, { recursive: true });
  if (!skipValidation) {
    const errors = validateProject(project);
    if (errors.length) throw new Error(`project.json failed validation:\n  ${errors.join('\n  ')}`);
  }
  const lockPath = join(dir, '.locks', 'project.lock');
  await withLock(lockPath, () => atomicWriteJSON(join(dir, 'project.json'), project));
}

export async function writeTasks(id, tasksJson, { skipValidation = false } = {}) {
  const dir = projectDir(id);
  mkdirSync(dir, { recursive: true });
  if (!skipValidation) {
    const errors = validateTasks(tasksJson);
    if (errors.length) throw new Error(`tasks.json failed validation:\n  ${errors.join('\n  ')}`);
  }
  const lockPath = join(dir, '.locks', 'tasks.lock');
  await withLock(lockPath, () => atomicWriteJSON(join(dir, 'tasks.json'), tasksJson));
}

export async function mutateTasks(id, mutator) {
  const dir = projectDir(id);
  mkdirSync(dir, { recursive: true });
  const lockPath = join(dir, '.locks', 'tasks.lock');
  return withLock(lockPath, async () => {
    const current = readTasks(id);
    const next = await mutator(current);
    if (!next) return null; // mutator aborted
    const errors = validateTasks(next);
    if (errors.length) throw new Error(`tasks.json failed validation:\n  ${errors.join('\n  ')}`);
    atomicWriteJSON(join(dir, 'tasks.json'), next);
    return next;
  });
}

export async function mutateProject(id, mutator) {
  const dir = projectDir(id);
  mkdirSync(dir, { recursive: true });
  const lockPath = join(dir, '.locks', 'project.lock');
  return withLock(lockPath, async () => {
    const current = readProject(id);
    if (!current) throw new Error(`project not found: ${id}`);
    const next = await mutator(current);
    if (!next) return null;
    const errors = validateProject(next);
    if (errors.length) throw new Error(`project.json failed validation:\n  ${errors.join('\n  ')}`);
    atomicWriteJSON(join(dir, 'project.json'), next);
    return next;
  });
}

function atomicWriteJSON(targetPath, obj) {
  const tempDir = join(dirname(targetPath), 'temp');
  mkdirSync(tempDir, { recursive: true });
  const tempPath = join(tempDir, `.write-${randomUUID()}`);
  writeFileSync(tempPath, JSON.stringify(obj, null, 2) + '\n');
  try {
    renameSync(tempPath, targetPath);
  } catch (err) {
    if (err.code === 'EEXIST' || err.code === 'EPERM') {
      // Windows rename-over-existing edge case.
      try { unlinkSync(targetPath); } catch {}
      renameSync(tempPath, targetPath);
    } else {
      try { unlinkSync(tempPath); } catch {}
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Checkpoints
// ---------------------------------------------------------------------------

export function writeCheckpoint(id) {
  const dir = projectDir(id);
  const checkpointsDir = join(dir, 'checkpoints');
  mkdirSync(checkpointsDir, { recursive: true });
  const project = readProject(id);
  if (!project) return null;
  const tasks = readTasks(id);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(checkpointsDir, `${timestamp}.json`);
  const snapshot = {
    timestamp: new Date().toISOString(),
    project_snapshot: project,
    task_statuses: (tasks.tasks || []).map((t) => ({
      id: t.id,
      status: t.status,
      blocked_reason: t.blocked_reason || null,
    })),
    resume_from: 'Phase 1',
  };
  atomicWriteJSON(file, snapshot);
  return file;
}

// ---------------------------------------------------------------------------
// Validation (Ajv loaded lazily to keep CLI startup fast)
// ---------------------------------------------------------------------------

let _ajv = null;
let _validateProject = null;
let _validateTasks = null;

async function ensureValidators() {
  if (_validateProject && _validateTasks) return;
  const { default: Ajv } = await import('ajv');
  const { default: addFormats } = await import('ajv-formats');
  _ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(_ajv);
  const projectSchema = JSON.parse(readFileSync(join(SCHEMA_DIR, 'project.schema.json'), 'utf8'));
  const taskSchema = JSON.parse(readFileSync(join(SCHEMA_DIR, 'task.schema.json'), 'utf8'));
  _validateProject = _ajv.compile(projectSchema);
  _validateTasks = _ajv.compile({
    type: 'object',
    required: ['tasks'],
    additionalProperties: true,
    properties: {
      version: { type: 'integer' },
      project_id: { type: 'string' },
      generated_at: { type: 'string' },
      depth: { type: 'string' },
      tasks: {
        type: 'array',
        items: taskSchema,
      },
    },
  });
}

function ajvErrorsToMessages(errors) {
  if (!errors) return [];
  return errors.map((e) => `${e.instancePath || '/'} ${e.message}`);
}

// Sync wrappers that throw if validators are not ready. Call loadValidators() first.
export function validateProject(obj) {
  if (!_validateProject) throw new Error('validators not loaded; call loadValidators() first');
  return _validateProject(obj) ? [] : ajvErrorsToMessages(_validateProject.errors);
}

export function validateTasks(obj) {
  if (!_validateTasks) throw new Error('validators not loaded; call loadValidators() first');
  return _validateTasks(obj) ? [] : ajvErrorsToMessages(_validateTasks.errors);
}

export async function loadValidators() {
  await ensureValidators();
}

// ---------------------------------------------------------------------------
// Convenience: derived queries
// ---------------------------------------------------------------------------

export function unblockedTasks(tasksJson) {
  const tasks = tasksJson.tasks || [];
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return tasks.filter((t) => {
    if (t.status !== 'PENDING' && t.status !== 'RESEARCHED') return false;
    for (const depId of t.dependencies || []) {
      const dep = byId.get(depId);
      if (!dep) return false;
      if (dep.status !== 'COMPLETE' && dep.status !== 'SKIPPED') return false;
    }
    return true;
  });
}

export function nextTask(tasksJson, { focus = null } = {}) {
  const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const unblocked = unblockedTasks(tasksJson).filter((t) => {
    if (!focus) return true;
    if (focus.phase_id && t.phase_id !== focus.phase_id && t.phase !== focus.phase_id) return false;
    if (focus.epic_id && t.epic_id !== focus.epic_id) return false;
    if (focus.story_id && t.story_id !== focus.story_id) return false;
    return true;
  });
  unblocked.sort((a, b) => {
    const aScore = (priorityWeight[a.priority] || 0) * (a.on_critical_path ? 2 : 1);
    const bScore = (priorityWeight[b.priority] || 0) * (b.on_critical_path ? 2 : 1);
    if (bScore !== aScore) return bScore - aScore;
    return (a.estimate_minutes || 0) - (b.estimate_minutes || 0);
  });
  return unblocked[0] || null;
}

// ---------------------------------------------------------------------------
// CLI — keeps bash hooks fast by using a single node process per call.
// Usage:
//   node pm-state.mjs active       -> prints {"id":"...","name":"..."} or {}
//   node pm-state.mjs checkpoint   -> writes checkpoints for every IN_PROGRESS project
//   node pm-state.mjs artifact-task <path>  -> prints the matching task id or ''
// ---------------------------------------------------------------------------

const isCli = import.meta.url === pathToFileURL(process.argv[1] || '').href;

if (isCli) {
  const cmd = process.argv[2];
  try {
    if (cmd === 'active') {
      const active = listProjects().find((p) => p.project.status === 'IN_PROGRESS');
      if (active) {
        process.stdout.write(JSON.stringify({ id: active.id, name: active.project.name || active.id }));
      } else {
        process.stdout.write('{}');
      }
    } else if (cmd === 'checkpoint') {
      const results = [];
      for (const p of listProjects()) {
        if (p.project.status !== 'IN_PROGRESS') continue;
        const file = writeCheckpoint(p.id);
        if (file) results.push({ id: p.id, file: basename(file) });
      }
      process.stdout.write(JSON.stringify(results));
    } else if (cmd === 'artifact-task') {
      const filePath = process.argv[3] || '';
      const m = filePath.match(/T-\d+/);
      if (!m) { process.stdout.write(''); }
      else {
        // Confirm the path is under *some* project's artifacts dir.
        let hit = '';
        for (const p of listProjects()) {
          if (filePath.includes(join(p.dir, 'artifacts'))) { hit = m[0]; break; }
        }
        process.stdout.write(hit);
      }
    } else if (cmd === 'validate') {
      await loadValidators();
      const id = process.argv[3];
      if (!id) { console.error('usage: pm-state validate <project-id>'); process.exit(2); }
      const project = readProject(id);
      const tasks = readTasks(id);
      const pErr = project ? validateProject(project) : ['project.json missing'];
      const tErr = validateTasks(tasks);
      const out = { project_errors: pErr, tasks_errors: tErr };
      process.stdout.write(JSON.stringify(out, null, 2));
      if (pErr.length || tErr.length) process.exit(1);
    } else {
      console.error('commands: active | checkpoint | artifact-task <path> | validate <id>');
      process.exit(2);
    }
  } catch (err) {
    // Hooks must never block Claude; they swallow errors and emit {}.
    if (process.env.PM_STATE_STRICT === '1') {
      console.error(err.message);
      process.exit(1);
    }
    process.stdout.write('{}');
  }
}
