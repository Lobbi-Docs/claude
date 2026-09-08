// Round-3 guardrails: turn budget, user-prompt archive, compaction handoff.
// Uses node:test. Each test isolates CLAUDE_PROJECT_DIR to a fresh tmp dir.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  setBudget, readBudget, clearBudget, budgetStatus,
  recordBreadcrumb,
  recordUserPrompt, readUserPrompts, lastUserPrompt,
  writeHandoff, readHandoff,
  setAnchor, setScope, setDoneWhen, markCriterionMet,
} from '../lib/pm-guardrails.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERVER = join(HERE, '..', 'mcp', 'pm-server.mjs');

function setupTemp() {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-round3-'));
  process.env.CLAUDE_PROJECT_DIR = tmp;
  return tmp;
}

function teardown(tmp) {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

test('setBudget stores max_turns and baseline crumb count', async () => {
  const tmp = setupTemp();
  try {
    recordBreadcrumb({ tool: 'Read', target: 'preload' });
    const rec = await setBudget({ max_turns: 20 });
    assert.equal(rec.max_turns, 20);
    assert.equal(rec.baseline_crumb_count, 1, 'baseline should equal crumb count at time of set');
    assert.equal(rec.active, true);
  } finally { teardown(tmp); }
});

test('budgetStatus transitions ok -> warn -> over based on consumption', async () => {
  const tmp = setupTemp();
  try {
    await setBudget({ max_turns: 10 });
    assert.equal(budgetStatus().status, 'ok');
    for (let i = 0; i < 8; i++) recordBreadcrumb({ tool: 'Edit', target: `f${i}` });
    assert.equal(budgetStatus().status, 'warn', '80% = warn');
    for (let i = 0; i < 5; i++) recordBreadcrumb({ tool: 'Edit', target: `f${i}-extra` });
    assert.equal(budgetStatus().status, 'over', '>=120% = over');
  } finally { teardown(tmp); }
});

test('clearBudget retains history but sets active=false', async () => {
  const tmp = setupTemp();
  try {
    await setBudget({ max_turns: 5 });
    const cleared = await clearBudget();
    assert.equal(cleared.active, false);
    assert.ok(cleared.cleared_at);
    assert.equal(budgetStatus().active, false);
  } finally { teardown(tmp); }
});

test('setBudget rejects non-positive max_turns', async () => {
  const tmp = setupTemp();
  try {
    await assert.rejects(() => setBudget({ max_turns: 0 }), /positive integer/i);
    await assert.rejects(() => setBudget({ max_turns: 'ten' }), /positive integer/i);
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// User-prompt archive
// ---------------------------------------------------------------------------

test('recordUserPrompt + readUserPrompts round-trip and truncate', () => {
  const tmp = setupTemp();
  try {
    recordUserPrompt('first message');
    recordUserPrompt('second message');
    recordUserPrompt('third message');
    const recent = readUserPrompts({ limit: 2 });
    assert.equal(recent.length, 2);
    assert.equal(recent[0].text, 'second message');
    assert.equal(recent[1].text, 'third message');
    assert.equal(lastUserPrompt().text, 'third message');
  } finally { teardown(tmp); }
});

test('recordUserPrompt ignores empty / whitespace / non-string input', () => {
  const tmp = setupTemp();
  try {
    recordUserPrompt('');
    recordUserPrompt('   ');
    recordUserPrompt(null);
    recordUserPrompt(42);
    assert.equal(readUserPrompts().length, 0);
  } finally { teardown(tmp); }
});

test('recordUserPrompt caps very long prompts at 4k chars', () => {
  const tmp = setupTemp();
  try {
    const huge = 'x'.repeat(10_000);
    recordUserPrompt(huge);
    const stored = lastUserPrompt();
    assert.equal(stored.text.length, 4000);
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// Handoff snapshot
// ---------------------------------------------------------------------------

test('writeHandoff produces a markdown file including anchor, scope, and done status', async () => {
  const tmp = setupTemp();
  try {
    recordUserPrompt('implement refresh token rotation');
    await setAnchor({ doItem: 'refresh-token rotation', dontItem: 'UI' });
    await setScope(['src/auth/**']);
    await setDoneWhen({ criteria: ['tests pass', 'endpoint returns 200'] });
    await markCriterionMet({ id: 'c1', evidence: 'pnpm test -> exit 0' });
    await setBudget({ max_turns: 30 });
    recordBreadcrumb({ tool: 'Edit', target: 'src/auth/refresh.ts' });
    recordBreadcrumb({ tool: 'Bash', target: 'pnpm test:auth' });

    const file = writeHandoff();
    assert.ok(existsSync(file), 'handoff file should exist');
    const md = readFileSync(file, 'utf8');
    assert.ok(md.includes('## Last user ask'));
    assert.ok(md.includes('implement refresh token rotation'));
    assert.ok(md.includes('## Focus anchor'));
    assert.ok(md.includes('DO: refresh-token rotation'));
    assert.ok(md.includes('## Scope allowlist'));
    assert.ok(md.includes('`src/auth/**`'));
    assert.ok(md.includes('## Done-when progress'));
    assert.ok(md.includes('1/2 criteria met'));
    assert.ok(md.includes('[x] **c1**'));
    assert.ok(md.includes('[ ] **c2**'));
    assert.ok(md.includes('## Turn budget'));
    assert.ok(md.includes('## Recently touched files'));
    assert.ok(md.includes('src/auth/refresh.ts'));
    assert.ok(md.includes('## How to resume'));
  } finally { teardown(tmp); }
});

test('readHandoff returns null when no snapshot exists', () => {
  const tmp = setupTemp();
  try {
    assert.equal(readHandoff(), null);
  } finally { teardown(tmp); }
});

test('writeHandoff is a no-op-safe: works with no state set', async () => {
  const tmp = setupTemp();
  try {
    const file = writeHandoff();
    assert.ok(existsSync(file));
    const md = readFileSync(file, 'utf8');
    // Minimal handoff still has the header + the resume section.
    assert.ok(md.includes('# Task Handoff'));
    assert.ok(md.includes('## How to resume'));
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// MCP end-to-end for the new tools
// ---------------------------------------------------------------------------

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

test('pm-mcp exposes the round-3 tools', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-round3-mcp-'));
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    const list = await srv.call('tools/list', {}, 2);
    const names = new Set(list.result.tools.map((t) => t.name));
    for (const n of ['pm_budget_set', 'pm_budget_status', 'pm_budget_clear',
      'pm_user_prompt_record', 'pm_user_prompts_recent',
      'pm_handoff_write', 'pm_handoff_read']) {
      assert.ok(names.has(n), `missing tool: ${n}`);
    }
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_budget_set + pm_budget_status via MCP', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-round3-mcp-'));
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', { name: 'pm_budget_set', arguments: { max_turns: 5 } }, 2);
    const status = textToJSON(await srv.call('tools/call', { name: 'pm_budget_status', arguments: {} }, 3));
    assert.equal(status.active, true);
    assert.equal(status.max_turns, 5);
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

test('pm_handoff_write + pm_handoff_read produce a consistent markdown file', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-round3-mcp-'));
  const srv = startServer(tmp);
  try {
    await srv.call('initialize', {}, 1);
    await srv.call('tools/call', { name: 'pm_anchor_set', arguments: { do: 'ship the handoff feature' } }, 2);
    await srv.call('tools/call', { name: 'pm_user_prompt_record', arguments: { text: 'please build handoff' } }, 3);
    const written = textToJSON(await srv.call('tools/call', { name: 'pm_handoff_write', arguments: {} }, 4));
    assert.ok(written.file.endsWith('handoff.md'));
    const read = textToJSON(await srv.call('tools/call', { name: 'pm_handoff_read', arguments: {} }, 5));
    assert.equal(read.found, true);
    assert.ok(read.markdown.includes('ship the handoff feature'));
    assert.ok(read.markdown.includes('please build handoff'));
  } finally { srv.child.kill(); rmSync(tmp, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// Hook-level: budget-warn.sh fires at warn/over thresholds only
// ---------------------------------------------------------------------------

test('budget-warn.sh emits notification at >=80% and is silent below', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-round3-hook-'));
  try {
    process.env.CLAUDE_PROJECT_DIR = tmp;
    await setBudget({ max_turns: 10 });
    for (let i = 0; i < 5; i++) recordBreadcrumb({ tool: 'Edit', target: `f${i}` });
    const SCRIPT = join(HERE, '..', 'hooks', 'scripts', 'budget-warn.sh');
    const runHook = () => execFileSync('bash', [SCRIPT], {
      input: '{}',
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmp },
      encoding: 'utf8',
    }).trim();

    // 50% — silent
    const silent = JSON.parse(runHook());
    assert.equal(silent.notification, undefined);

    // 80% — warn
    for (let i = 0; i < 3; i++) recordBreadcrumb({ tool: 'Edit', target: `warn${i}` });
    const warn = JSON.parse(runHook());
    assert.ok(warn.notification && warn.notification.toLowerCase().includes('budget'));

    // 120% — over
    for (let i = 0; i < 5; i++) recordBreadcrumb({ tool: 'Edit', target: `over${i}` });
    const over = JSON.parse(runHook());
    assert.ok(over.notification && over.notification.includes('OVER'));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
