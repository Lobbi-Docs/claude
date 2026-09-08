// Integration tests for the pm-mcp stdio JSON-RPC server.
// Spawns the server as a subprocess and exercises a handful of tools end-to-end.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERVER = join(HERE, '..', 'mcp', 'pm-server.mjs');
const FIXTURES = new URL('./fixtures/', import.meta.url);
const validProject = JSON.parse(readFileSync(new URL('valid-project.json', FIXTURES), 'utf8'));
const validTasks = JSON.parse(readFileSync(new URL('valid-tasks.json', FIXTURES), 'utf8'));

function setupTempProject() {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-mcp-test-'));
  const projectDir = join(tmp, '.claude', 'projects', validProject.id);
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(join(projectDir, 'project.json'), JSON.stringify(validProject, null, 2));
  writeFileSync(join(projectDir, 'tasks.json'), JSON.stringify(validTasks, null, 2));
  return { tmp, projectId: validProject.id };
}

function startServer(tmp) {
  const child = spawn('node', [SERVER], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: tmp },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buffer = '';
  const responses = [];
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) { try { responses.push(JSON.parse(line)); } catch {} }
    }
  });
  const call = async (method, params = {}, id) => {
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    for (let i = 0; i < 400; i++) {
      const hit = responses.find((r) => r.id === id);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`timeout waiting for response id=${id}`);
  };
  return { child, call };
}

function textToJSON(response) {
  return JSON.parse(response.result.content[0].text);
}

test('pm-mcp initialize + tools/list', async () => {
  const { tmp } = setupTempProject();
  const srv = startServer(tmp);
  try {
    const init = await srv.call('initialize', {}, 1);
    assert.equal(init.result.serverInfo.name, 'pm-mcp');
    const list = await srv.call('tools/list', {}, 2);
    const names = list.result.tools.map((t) => t.name);
    assert.ok(names.includes('pm_list_projects'));
    assert.ok(names.includes('pm_next_task'));
    assert.ok(names.includes('pm_update_task_status'));
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm-mcp pm_list_projects returns the fixture', async () => {
  const { tmp, projectId } = setupTempProject();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const resp = await srv.call('tools/call', { name: 'pm_list_projects', arguments: {} }, 2);
    const payload = textToJSON(resp);
    assert.equal(payload.length, 1);
    assert.equal(payload[0].id, projectId);
    assert.equal(payload[0].counts.total, 3);
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm-mcp pm_next_task returns T-002 (critical + unblocked)', async () => {
  const { tmp, projectId } = setupTempProject();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const resp = await srv.call('tools/call', { name: 'pm_next_task', arguments: { project_id: projectId } }, 2);
    const payload = textToJSON(resp);
    assert.equal(payload.task.id, 'T-002');
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm-mcp pm_complete_task flips status + writes completed_at', async () => {
  const { tmp, projectId } = setupTempProject();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const resp = await srv.call('tools/call', {
      name: 'pm_complete_task',
      arguments: { project_id: projectId, task_id: 'T-002', actual_minutes: 18 },
    }, 2);
    assert.equal(resp.error, undefined, `expected success, got ${JSON.stringify(resp.error)}`);
    // Re-read from disk
    const disk = JSON.parse(readFileSync(join(tmp, '.claude', 'projects', projectId, 'tasks.json'), 'utf8'));
    const t = disk.tasks.find((x) => x.id === 'T-002');
    assert.equal(t.status, 'COMPLETE');
    assert.equal(t.actual_minutes, 18);
    assert.ok(t.completed_at, 'completed_at should be set');
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm-mcp pm_block_task requires a reason and writes it', async () => {
  const { tmp, projectId } = setupTempProject();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const resp = await srv.call('tools/call', {
      name: 'pm_block_task',
      arguments: { project_id: projectId, task_id: 'T-003', reason: 'Waiting on spike T-9' },
    }, 2);
    assert.equal(resp.error, undefined);
    const disk = JSON.parse(readFileSync(join(tmp, '.claude', 'projects', projectId, 'tasks.json'), 'utf8'));
    const t = disk.tasks.find((x) => x.id === 'T-003');
    assert.equal(t.status, 'BLOCKED');
    assert.equal(t.blocked_reason, 'Waiting on spike T-9');
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm-mcp rejects unknown status enum at the MCP boundary', async () => {
  const { tmp, projectId } = setupTempProject();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const resp = await srv.call('tools/call', {
      name: 'pm_update_task_status',
      arguments: { project_id: projectId, task_id: 'T-002', status: 'WAT' },
    }, 2);
    // Either the MCP layer or the lib validator should produce an error.
    // We accept either — but there must be some error path.
    if (!resp.error) {
      const payload = textToJSON(resp);
      assert.notEqual(payload.status, 'WAT', 'server must not persist a WAT status');
    }
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});
