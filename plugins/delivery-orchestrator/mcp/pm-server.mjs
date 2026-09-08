#!/usr/bin/env node
// Project Management Plugin — MCP Server (stdio, JSON-RPC).
//
// Exposes transactional tools over the state in .claude/projects/{id}/.
// All mutations go through the shared pm-state library so locking, schema
// validation, and atomic rename semantics apply uniformly.

import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectDir,
  listProjects,
  readProject,
  readTasks,
  findTask,
  mutateTasks,
  mutateProject,
  writeCheckpoint,
  nextTask,
  unblockedTasks,
  loadValidators,
  validateProject,
  validateTasks,
} from '../lib/pm-state.mjs';
import {
  activeContextSummary,
  readAnchor, setAnchor, clearAnchor, formatAnchorReminder,
  readScope, setScope, addScopePatterns, removeScopePatterns, recordOverride, isInScope,
  readDoneWhen, setDoneWhen, markCriterionMet, unmetCriteria,
  recordBreadcrumb, readBreadcrumbs, analyzeDrift,
  detectOverengineering,
  setBudget, readBudget, clearBudget, budgetStatus,
  recordUserPrompt, readUserPrompts, lastUserPrompt,
  writeHandoff, readHandoff,
} from '../lib/pm-guardrails.mjs';

const SERVER_INFO = { name: 'pm-mcp', version: '1.3.0' };
const PROTOCOL_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'pm_list_projects',
    description: 'List every project under .claude/projects/ with id, name, status, and task counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'pm_get_project',
    description: 'Return the full project.json record for a given project id.',
    inputSchema: {
      type: 'object',
      required: ['project_id'],
      properties: {
        project_id: { type: 'string', description: 'Project id (lowercase slug).' },
      },
    },
  },
  {
    name: 'pm_get_tasks',
    description: 'Return tasks.json for a project, optionally filtered by status, phase, or parent.',
    inputSchema: {
      type: 'object',
      required: ['project_id'],
      properties: {
        project_id: { type: 'string' },
        status: { type: 'string', description: 'Filter to a single status (e.g. PENDING).' },
        phase_id: { type: 'string' },
        parent_id: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 500 },
      },
    },
  },
  {
    name: 'pm_get_task',
    description: 'Fetch a single task by id.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task_id'],
      properties: {
        project_id: { type: 'string' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
      },
    },
  },
  {
    name: 'pm_next_task',
    description: 'Return the highest-priority unblocked task. Uses the same scoring as /pm:work Phase 1.',
    inputSchema: {
      type: 'object',
      required: ['project_id'],
      properties: {
        project_id: { type: 'string' },
        focus_phase_id: { type: 'string' },
        focus_epic_id: { type: 'string' },
        focus_story_id: { type: 'string' },
      },
    },
  },
  {
    name: 'pm_unblocked_tasks',
    description: 'List all currently unblocked PENDING or RESEARCHED tasks.',
    inputSchema: {
      type: 'object',
      required: ['project_id'],
      properties: { project_id: { type: 'string' } },
    },
  },
  {
    name: 'pm_update_task_status',
    description: 'Transition a task to a new status. Applies atomic write + schema validation.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task_id', 'status'],
      properties: {
        project_id: { type: 'string' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
        status: {
          type: 'string',
          enum: [
            'PENDING', 'IN_RESEARCH', 'RESEARCHED', 'IN_PROGRESS',
            'VALIDATING', 'PARENT', 'COMPLETE', 'BLOCKED', 'SKIPPED', 'FAILED',
          ],
        },
        blocked_reason: { type: 'string' },
        actual_minutes: { type: 'integer', minimum: 0 },
        execution_notes: { type: 'string' },
      },
    },
  },
  {
    name: 'pm_add_task',
    description: 'Append a new task to tasks.json. Id may be omitted (auto-assigned).',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task'],
      properties: {
        project_id: { type: 'string' },
        task: {
          type: 'object',
          description: 'Partial task record. id/status/priority/created_at are auto-filled when missing.',
        },
      },
    },
  },
  {
    name: 'pm_complete_task',
    description: 'Mark a task COMPLETE. Records actual_minutes and completed_at.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task_id'],
      properties: {
        project_id: { type: 'string' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
        actual_minutes: { type: 'integer', minimum: 0 },
        execution_notes: { type: 'string' },
      },
    },
  },
  {
    name: 'pm_block_task',
    description: 'Mark a task BLOCKED with a human-readable reason.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task_id', 'reason'],
      properties: {
        project_id: { type: 'string' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
        reason: { type: 'string', minLength: 3 },
      },
    },
  },
  {
    name: 'pm_checkpoint',
    description: 'Write a checkpoint snapshot of project.json + tasks.json to checkpoints/.',
    inputSchema: {
      type: 'object',
      required: ['project_id'],
      properties: { project_id: { type: 'string' } },
    },
  },
  {
    name: 'pm_get_research',
    description: 'Read the cached research brief for a task, if any.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task_id'],
      properties: {
        project_id: { type: 'string' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
      },
    },
  },
  {
    name: 'pm_put_research',
    description: 'Write a research brief to research/{task_id}.md and update the task record.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'task_id', 'markdown'],
      properties: {
        project_id: { type: 'string' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
        markdown: { type: 'string', minLength: 1 },
      },
    },
  },
  {
    name: 'pm_validate',
    description: 'Validate project.json and tasks.json against the plugin schemas. Returns the list of errors.',
    inputSchema: {
      type: 'object',
      required: ['project_id'],
      properties: { project_id: { type: 'string' } },
    },
  },

  // --- Guardrails: focus anchor ----------------------------------------------
  {
    name: 'pm_anchor_set',
    description: 'Set the active focus anchor ("DO X, DON\'T Y"). Every new user turn will have this reminder injected so Claude cannot drift from it.',
    inputSchema: {
      type: 'object',
      required: ['do'],
      properties: {
        do: { type: 'string', minLength: 3, description: 'One sentence: what Claude is committing to finish.' },
        dont: { type: 'string', description: 'One sentence: what Claude must not touch.' },
        task_id: { type: 'string', pattern: '^T-[0-9]+$', description: 'Optional — bind the anchor to a specific task id.' },
      },
    },
  },
  {
    name: 'pm_anchor_get',
    description: 'Return the current focus anchor, or null if none is active.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'pm_anchor_clear',
    description: 'Deactivate the focus anchor (e.g. after the task is complete).',
    inputSchema: { type: 'object', properties: {} },
  },

  // --- Guardrails: scope lock ------------------------------------------------
  {
    name: 'pm_scope_set',
    description: 'Replace the scope allowlist with a new set of glob patterns (e.g. ["src/auth/**","tests/auth/**"]).',
    inputSchema: {
      type: 'object',
      required: ['patterns'],
      properties: {
        patterns: { type: 'array', items: { type: 'string', minLength: 1 } },
      },
    },
  },
  {
    name: 'pm_scope_add',
    description: 'Append one or more glob patterns to the scope allowlist.',
    inputSchema: {
      type: 'object',
      required: ['patterns'],
      properties: { patterns: { type: 'array', items: { type: 'string' } } },
    },
  },
  {
    name: 'pm_scope_remove',
    description: 'Remove glob patterns from the scope allowlist.',
    inputSchema: {
      type: 'object',
      required: ['patterns'],
      properties: { patterns: { type: 'array', items: { type: 'string' } } },
    },
  },
  {
    name: 'pm_scope_check',
    description: 'Check whether a path is currently in scope. Returns {in_scope, matched_pattern, active}.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: { path: { type: 'string' } },
    },
  },
  {
    name: 'pm_scope_override',
    description: 'Record a justified override for an out-of-scope edit. The override is appended to the drift ledger — scope stays unchanged.',
    inputSchema: {
      type: 'object',
      required: ['path', 'reason'],
      properties: {
        path: { type: 'string' },
        reason: { type: 'string', minLength: 3 },
      },
    },
  },
  {
    name: 'pm_scope_status',
    description: 'Return the current scope record (allowlist + override ledger).',
    inputSchema: { type: 'object', properties: {} },
  },

  // --- Guardrails: done-when contract ----------------------------------------
  {
    name: 'pm_done_when_set',
    description: 'Declare the list of binary-testable completion criteria that must have evidence before Claude may declare the session done.',
    inputSchema: {
      type: 'object',
      required: ['criteria'],
      properties: {
        criteria: { type: 'array', items: { type: 'string', minLength: 5 }, minItems: 1 },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
      },
    },
  },
  {
    name: 'pm_done_when_met',
    description: 'Mark one criterion as met with an evidence line (e.g. a test command output). Refuses without evidence.',
    inputSchema: {
      type: 'object',
      required: ['id', 'evidence'],
      properties: {
        id: { type: 'string', description: 'Criterion id (c1, c2, ...) or exact text.' },
        evidence: { type: 'string', minLength: 3, description: 'Short proof line (command + exit code, URL + status, file path).' },
      },
    },
  },
  {
    name: 'pm_done_when_status',
    description: 'Return the current done-when record including which criteria are met and which are unmet.',
    inputSchema: { type: 'object', properties: {} },
  },

  // --- Guardrails: breadcrumbs + drift ---------------------------------------
  {
    name: 'pm_breadcrumb',
    description: 'Append a breadcrumb entry to the drift trail. Normally called by hooks — rarely by hand.',
    inputSchema: {
      type: 'object',
      required: ['tool'],
      properties: {
        turn: { type: 'integer' },
        tool: { type: 'string' },
        target: { type: 'string' },
        task_id: { type: 'string' },
        scope_ok: { type: 'boolean' },
        criterion_hint: { type: 'string' },
        overengineering_hits: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'pm_drift_report',
    description: 'Analyze the breadcrumb trail against the active anchor/scope/done-when and return a drift classification.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'ISO timestamp — only consider breadcrumbs newer than this.' },
      },
    },
  },
  {
    name: 'pm_overengineering_scan',
    description: 'Scan a unified diff against the overengineering ruleset and return any hits.',
    inputSchema: {
      type: 'object',
      required: ['diff'],
      properties: {
        diff: { type: 'string', minLength: 1 },
        path: { type: 'string' },
      },
    },
  },
  {
    name: 'pm_active_context',
    description: 'Return {kind, id, dir} for the active guardrail context — either an IN_PROGRESS project or the ephemeral session directory.',
    inputSchema: { type: 'object', properties: {} },
  },

  // --- Guardrails: turn budget (upgrade F) -----------------------------------
  {
    name: 'pm_budget_set',
    description: 'Cap the number of tool calls allowed for the current task. Warn at 80%, over-budget at 120%.',
    inputSchema: {
      type: 'object',
      required: ['max_turns'],
      properties: {
        max_turns: { type: 'integer', minimum: 1 },
        task_id: { type: 'string', pattern: '^T-[0-9]+$' },
      },
    },
  },
  {
    name: 'pm_budget_status',
    description: 'Return {active, used, max_turns, pct, status: ok|warn|over} for the current budget.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'pm_budget_clear',
    description: 'Deactivate the turn budget (e.g. after legitimate scope expansion).',
    inputSchema: { type: 'object', properties: {} },
  },

  // --- Guardrails: user-prompt archive (upgrade H) ---------------------------
  {
    name: 'pm_user_prompt_record',
    description: 'Append the user\'s latest prompt to user-prompts.jsonl. Normally called by the UserPromptSubmit hook.',
    inputSchema: {
      type: 'object',
      required: ['text'],
      properties: { text: { type: 'string', minLength: 1 } },
    },
  },
  {
    name: 'pm_user_prompts_recent',
    description: 'Return the last N user prompts archived in this context.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } },
    },
  },

  // --- Guardrails: compaction-safe handoff (upgrade G) -----------------------
  {
    name: 'pm_handoff_write',
    description: 'Snapshot the active anchor, scope, done-when status, budget, last user prompt, and recent breadcrumbs to handoff.md so that a post-/compact or resumed session can re-anchor.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'pm_handoff_read',
    description: 'Read the current handoff.md as raw markdown.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function requireArg(args, key) {
  if (args[key] === undefined || args[key] === null || args[key] === '') {
    throw new Error(`missing required argument: ${key}`);
  }
  return args[key];
}

function summary(project) {
  const tasks = readTasks(project.id);
  const counts = { total: 0, pending: 0, in_progress: 0, complete: 0, blocked: 0 };
  for (const t of tasks.tasks || []) {
    counts.total += 1;
    if (t.status === 'PENDING') counts.pending += 1;
    else if (t.status === 'IN_PROGRESS') counts.in_progress += 1;
    else if (t.status === 'COMPLETE') counts.complete += 1;
    else if (t.status === 'BLOCKED') counts.blocked += 1;
  }
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    counts,
  };
}

function autoTaskId(tasks) {
  let maxN = 0;
  for (const t of tasks) {
    const m = (t.id || '').match(/^T-(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `T-${String(maxN + 1).padStart(3, '0')}`;
}

const HANDLERS = {
  async pm_list_projects() {
    return listProjects().map((p) => summary(p.project));
  },

  async pm_get_project(args) {
    const project = readProject(requireArg(args, 'project_id'));
    if (!project) throw new Error(`project not found: ${args.project_id}`);
    return project;
  },

  async pm_get_tasks(args) {
    const id = requireArg(args, 'project_id');
    let tasks = (readTasks(id).tasks || []).slice();
    if (args.status) tasks = tasks.filter((t) => t.status === args.status);
    if (args.phase_id) tasks = tasks.filter((t) => t.phase_id === args.phase_id || t.phase === args.phase_id);
    if (args.parent_id) tasks = tasks.filter((t) => t.parent_id === args.parent_id);
    if (args.limit) tasks = tasks.slice(0, args.limit);
    return { project_id: id, count: tasks.length, tasks };
  },

  async pm_get_task(args) {
    const id = requireArg(args, 'project_id');
    const taskId = requireArg(args, 'task_id');
    const task = findTask(readTasks(id), taskId);
    if (!task) throw new Error(`task not found: ${taskId}`);
    return task;
  },

  async pm_next_task(args) {
    const id = requireArg(args, 'project_id');
    const focus = {
      phase_id: args.focus_phase_id,
      epic_id: args.focus_epic_id,
      story_id: args.focus_story_id,
    };
    const hasFocus = Object.values(focus).some(Boolean);
    const task = nextTask(readTasks(id), hasFocus ? { focus } : {});
    return { task };
  },

  async pm_unblocked_tasks(args) {
    const id = requireArg(args, 'project_id');
    const ready = unblockedTasks(readTasks(id));
    return { count: ready.length, tasks: ready };
  },

  async pm_update_task_status(args) {
    const id = requireArg(args, 'project_id');
    const taskId = requireArg(args, 'task_id');
    const status = requireArg(args, 'status');
    const result = await mutateTasks(id, (tasks) => {
      const task = (tasks.tasks || []).find((t) => t.id === taskId);
      if (!task) throw new Error(`task not found: ${taskId}`);
      task.status = status;
      if (status === 'BLOCKED') {
        if (!args.blocked_reason) throw new Error('blocked_reason is required when status=BLOCKED');
        task.blocked_reason = args.blocked_reason;
      } else if (task.blocked_reason && status !== 'BLOCKED') {
        task.blocked_reason = null;
      }
      if (status === 'COMPLETE') {
        task.completed_at = new Date().toISOString();
        if (args.actual_minutes !== undefined) task.actual_minutes = args.actual_minutes;
      }
      if (args.execution_notes) {
        task.execution_notes = task.execution_notes
          ? `${task.execution_notes}\n${args.execution_notes}`
          : args.execution_notes;
      }
      return tasks;
    });
    return { updated: taskId, status, tasks_count: (result?.tasks || []).length };
  },

  async pm_add_task(args) {
    const id = requireArg(args, 'project_id');
    const newTask = requireArg(args, 'task');
    if (typeof newTask !== 'object' || Array.isArray(newTask)) throw new Error('task must be an object');
    await mutateTasks(id, (tasks) => {
      const arr = tasks.tasks || [];
      const taskId = newTask.id || autoTaskId(arr);
      if (arr.some((t) => t.id === taskId)) throw new Error(`task id already exists: ${taskId}`);
      const filled = {
        id: taskId,
        title: newTask.title || 'Untitled task',
        description: newTask.description || '',
        level: newTask.level || 'task',
        status: newTask.status || 'PENDING',
        priority: newTask.priority || 'MEDIUM',
        dependencies: newTask.dependencies || [],
        completion_criteria: newTask.completion_criteria || [],
        created_at: newTask.created_at || new Date().toISOString(),
        ...newTask,
      };
      arr.push(filled);
      tasks.tasks = arr;
      return tasks;
    });
    return { added: newTask.id || 'auto' };
  },

  async pm_complete_task(args) {
    return HANDLERS.pm_update_task_status({
      project_id: args.project_id,
      task_id: args.task_id,
      status: 'COMPLETE',
      actual_minutes: args.actual_minutes,
      execution_notes: args.execution_notes,
    });
  },

  async pm_block_task(args) {
    return HANDLERS.pm_update_task_status({
      project_id: args.project_id,
      task_id: args.task_id,
      status: 'BLOCKED',
      blocked_reason: requireArg(args, 'reason'),
    });
  },

  async pm_checkpoint(args) {
    const id = requireArg(args, 'project_id');
    const file = writeCheckpoint(id);
    if (!file) throw new Error(`project not found: ${id}`);
    return { checkpoint: file };
  },

  async pm_get_research(args) {
    const id = requireArg(args, 'project_id');
    const taskId = requireArg(args, 'task_id');
    const file = join(projectDir(id), 'research', `${taskId}.md`);
    if (!existsSync(file)) return { project_id: id, task_id: taskId, found: false };
    return { project_id: id, task_id: taskId, found: true, markdown: readFileSync(file, 'utf8') };
  },

  async pm_put_research(args) {
    const id = requireArg(args, 'project_id');
    const taskId = requireArg(args, 'task_id');
    const markdown = requireArg(args, 'markdown');
    const dir = join(projectDir(id), 'research');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${taskId}.md`);
    writeFileSync(file, markdown);
    await mutateTasks(id, (tasks) => {
      const task = (tasks.tasks || []).find((t) => t.id === taskId);
      if (task) task.research_file = `research/${taskId}.md`;
      return tasks;
    }).catch(() => null); // not fatal if task doesn't exist yet
    return { file };
  },

  async pm_validate(args) {
    const id = requireArg(args, 'project_id');
    const project = readProject(id);
    const tasks = readTasks(id);
    const project_errors = project ? validateProject(project) : ['project.json missing'];
    const tasks_errors = validateTasks(tasks);
    return { project_errors, tasks_errors };
  },

  // --- Guardrail handlers ---------------------------------------------------

  async pm_active_context() { return activeContextSummary(); },

  async pm_anchor_set(args) {
    const rec = await setAnchor({ doItem: requireArg(args, 'do'), dontItem: args.dont, task_id: args.task_id || null });
    return { set: true, anchor: rec, reminder: formatAnchorReminder(rec) };
  },
  async pm_anchor_get() {
    const anchor = readAnchor();
    return { anchor, reminder: formatAnchorReminder(anchor) };
  },
  async pm_anchor_clear() {
    const cleared = await clearAnchor();
    return { cleared: !!cleared, anchor: cleared };
  },

  async pm_scope_set(args) {
    const rec = await setScope(requireArg(args, 'patterns'));
    return { active: rec.active, allowlist: rec.allowlist };
  },
  async pm_scope_add(args) {
    const rec = await addScopePatterns(requireArg(args, 'patterns'));
    return { active: rec.active, allowlist: rec.allowlist };
  },
  async pm_scope_remove(args) {
    const rec = await removeScopePatterns(requireArg(args, 'patterns'));
    return { active: rec.active, allowlist: rec.allowlist };
  },
  async pm_scope_check(args) {
    const scope = readScope();
    if (!scope.active) return { in_scope: true, active: false };
    const pathArg = requireArg(args, 'path');
    const inScope = isInScope(pathArg, { allowlist: scope.allowlist });
    const matched = inScope ? scope.allowlist.find((p) => isInScope(pathArg, { allowlist: [p] })) : null;
    return { in_scope: inScope, matched_pattern: matched, active: true };
  },
  async pm_scope_override(args) {
    await recordOverride({ path: requireArg(args, 'path'), reason: requireArg(args, 'reason') });
    return { recorded: true };
  },
  async pm_scope_status() {
    return readScope();
  },

  async pm_done_when_set(args) {
    const rec = await setDoneWhen({ criteria: requireArg(args, 'criteria'), task_id: args.task_id || null });
    return { set: true, criteria_count: rec.criteria.length };
  },
  async pm_done_when_met(args) {
    const hit = await markCriterionMet({ id: requireArg(args, 'id'), evidence: requireArg(args, 'evidence') });
    return { marked: true, criterion: hit };
  },
  async pm_done_when_status() {
    const rec = readDoneWhen();
    if (!rec) return { active: false };
    const unmet = unmetCriteria(rec);
    return { active: true, total: rec.criteria.length, met: rec.criteria.length - unmet.length, unmet };
  },

  async pm_breadcrumb(args) {
    recordBreadcrumb(args || {});
    return { logged: true };
  },
  async pm_drift_report(args) {
    return analyzeDrift({ since: args && args.since ? args.since : null });
  },
  async pm_overengineering_scan(args) {
    const hits = detectOverengineering({ diff: requireArg(args, 'diff'), path: args.path });
    return { hits, count: hits.length };
  },

  // --- Round 3: budget + prompts + handoff ----------------------------------

  async pm_budget_set(args) {
    const rec = await setBudget({ max_turns: requireArg(args, 'max_turns'), task_id: args.task_id || null });
    return { set: true, budget: rec };
  },
  async pm_budget_status() { return budgetStatus(); },
  async pm_budget_clear() {
    const cleared = await clearBudget();
    return { cleared: !!cleared };
  },

  async pm_user_prompt_record(args) {
    recordUserPrompt(requireArg(args, 'text'));
    return { logged: true };
  },
  async pm_user_prompts_recent(args) {
    const limit = args && args.limit ? Math.min(50, Math.max(1, args.limit)) : 10;
    return { prompts: readUserPrompts({ limit }) };
  },

  async pm_handoff_write() {
    const file = writeHandoff();
    return { file };
  },
  async pm_handoff_read() {
    const md = readHandoff();
    return md ? { found: true, markdown: md } : { found: false };
  },
};

// ---------------------------------------------------------------------------
// JSON-RPC dispatch
// ---------------------------------------------------------------------------

async function handleRequest(request) {
  const { method, params, id } = request;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      },
    };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    const handler = HANDLERS[name];
    if (!handler) {
      return {
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `unknown tool: ${name}` },
      };
    }
    try {
      const result = await handler(args);
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0', id,
        error: { code: -32000, message: err.message || String(err) },
      };
    }
  }

  return {
    jsonrpc: '2.0', id,
    error: { code: -32601, message: `unknown method: ${method}` },
  };
}

// ---------------------------------------------------------------------------
// stdio transport
// ---------------------------------------------------------------------------

async function main() {
  await loadValidators();
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let request;
    try {
      request = JSON.parse(trimmed);
    } catch {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'parse error' },
      }) + '\n');
      continue;
    }
    const response = await handleRequest(request);
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

main().catch((err) => {
  process.stderr.write(`pm-mcp fatal: ${err.stack || err.message}\n`);
  process.exit(1);
});
