// Integration tests for the guardrail tools on the pm-mcp stdio server.
// Spawns pm-server.mjs and drives it end-to-end.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERVER = join(HERE, '..', 'mcp', 'pm-server.mjs');

function setupTemp() { return mkdtempSync(join(tmpdir(), 'pm-guard-mcp-')); }

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

const textToJSON = (r) => JSON.parse(r.result.content[0].text);

test('pm_anchor_set + pm_anchor_get round-trip through MCP', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const set = await srv.call('tools/call', {
      name: 'pm_anchor_set',
      arguments: { do: 'ship /pm:anchor', dont: 'touch UI' },
    }, 2);
    assert.equal(set.error, undefined);
    const got = await srv.call('tools/call', { name: 'pm_anchor_get', arguments: {} }, 3);
    const payload = textToJSON(got);
    assert.equal(payload.anchor.do, 'ship /pm:anchor');
    assert.ok(payload.reminder.includes('DO: ship /pm:anchor'));
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_scope_set + pm_scope_check blocks out-of-scope paths', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', {
      name: 'pm_scope_set',
      arguments: { patterns: ['src/auth/**', 'tests/auth/**'] },
    }, 2);
    const inScope = textToJSON(await srv.call('tools/call', {
      name: 'pm_scope_check',
      arguments: { path: join(tmp, 'src/auth/refresh.ts') },
    }, 3));
    assert.equal(inScope.in_scope, true);
    assert.equal(inScope.matched_pattern, 'src/auth/**');

    const outOfScope = textToJSON(await srv.call('tools/call', {
      name: 'pm_scope_check',
      arguments: { path: join(tmp, 'src/ui/Login.tsx') },
    }, 4));
    assert.equal(outOfScope.in_scope, false);
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_scope_override appends to drift ledger, leaves allowlist intact', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', { name: 'pm_scope_set', arguments: { patterns: ['src/auth/**'] } }, 2);
    await srv.call('tools/call', {
      name: 'pm_scope_override',
      arguments: { path: 'src/ui/Login.tsx', reason: 'auth endpoint needs new login button' },
    }, 3);
    const status = textToJSON(await srv.call('tools/call', { name: 'pm_scope_status', arguments: {} }, 4));
    assert.equal(status.overrides.length, 1);
    assert.deepEqual(status.allowlist, ['src/auth/**']);
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_done_when_set + pm_done_when_met updates the met count', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', {
      name: 'pm_done_when_set',
      arguments: { criteria: ['tests pass', 'README updated'] },
    }, 2);

    const before = textToJSON(await srv.call('tools/call', { name: 'pm_done_when_status', arguments: {} }, 3));
    assert.equal(before.met, 0);
    assert.equal(before.unmet.length, 2);

    await srv.call('tools/call', {
      name: 'pm_done_when_met',
      arguments: { id: 'c1', evidence: 'pnpm test -> exit 0' },
    }, 4);

    const after = textToJSON(await srv.call('tools/call', { name: 'pm_done_when_status', arguments: {} }, 5));
    assert.equal(after.met, 1);
    assert.equal(after.unmet.length, 1);
    assert.equal(after.unmet[0].id, 'c2');
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_done_when_met rejects blank evidence at the MCP boundary', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', { name: 'pm_done_when_set', arguments: { criteria: ['x y z'] } }, 2);
    const resp = await srv.call('tools/call', {
      name: 'pm_done_when_met',
      arguments: { id: 'c1', evidence: '' },
    }, 3);
    assert.ok(resp.error || /evidence/i.test(JSON.stringify(resp)));
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_overengineering_scan flags the rule from a crafted diff', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const diff = '+// line 1\n+// line 2\n+// line 3\n+const x=1;';
    const resp = textToJSON(await srv.call('tools/call', {
      name: 'pm_overengineering_scan',
      arguments: { diff, path: 'src/a.ts' },
    }, 2));
    assert.ok(resp.count >= 1);
    assert.equal(resp.hits[0].tag, 'multiline-comment');
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_breadcrumb + pm_drift_report round-trip', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', { name: 'pm_breadcrumb', arguments: { tool: 'Edit', target: 'src/a.ts' } }, 2);
    await srv.call('tools/call', { name: 'pm_breadcrumb', arguments: { tool: 'Bash', target: 'pnpm test:pm-plugin' } }, 3);
    const drift = textToJSON(await srv.call('tools/call', { name: 'pm_drift_report', arguments: {} }, 4));
    assert.equal(drift.totals.turns, 2);
    assert.ok(drift.totals.advancing_turns >= 1);
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_active_context returns a session kind when no project is IN_PROGRESS', async () => {
  const tmp = setupTemp();
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const ctx = textToJSON(await srv.call('tools/call', { name: 'pm_active_context', arguments: {} }, 2));
    assert.equal(ctx.kind, 'session');
    assert.ok(ctx.dir.includes('.claude/pm-session') || ctx.dir.includes('.claude\\pm-session'));
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// Hook-level end-to-end: scope-guard.sh must block out-of-scope writes
// ---------------------------------------------------------------------------

test('scope-guard.sh blocks out-of-scope writes and approves in-scope ones', async () => {
  const tmp = setupTemp();
  try {
    // Arrange: write a scope file via the lib directly.
    process.env.CLAUDE_PROJECT_DIR = tmp;
    const { setScope } = await import('../lib/pm-guardrails.mjs');
    await setScope(['src/auth/**']);

    const SCRIPT = join(HERE, '..', 'hooks', 'scripts', 'scope-guard.sh');
    const { execFileSync } = await import('node:child_process');

    const runHook = (payload) => execFileSync('bash', [SCRIPT], {
      input: JSON.stringify(payload),
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmp },
      encoding: 'utf8',
    }).trim();

    const blocked = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: join(tmp, 'src/ui/Login.tsx') },
    });
    const blockedParsed = JSON.parse(blocked);
    assert.equal(blockedParsed.decision, 'block');
    assert.ok(/outside the active.*scope/i.test(blockedParsed.reason || ''));

    const approved = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: join(tmp, 'src/auth/refresh.ts') },
    });
    const approvedParsed = JSON.parse(approved);
    assert.equal(approvedParsed.decision, 'approve');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('done-gate.sh blocks Stop while criteria are unmet', async () => {
  const tmp = setupTemp();
  try {
    process.env.CLAUDE_PROJECT_DIR = tmp;
    const { setDoneWhen } = await import('../lib/pm-guardrails.mjs');
    await setDoneWhen({ criteria: ['tests pass', 'docs updated'] });

    const SCRIPT = join(HERE, '..', 'hooks', 'scripts', 'done-gate.sh');
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync('bash', [SCRIPT], {
      input: '{}',
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmp },
      encoding: 'utf8',
    }).trim();
    const parsed = JSON.parse(out);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.decision, 'block');
    assert.ok(parsed.reason.includes('c1'));
    assert.ok(parsed.reason.includes('c2'));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
