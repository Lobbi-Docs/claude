// Unit tests for the guardrail layer (anchor, scope, done-when,
// breadcrumbs, over-engineering detector).
//
// Each test pins CLAUDE_PROJECT_DIR at an isolated tmp dir so the
// guardrail state files never touch the developer's real tree.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  setAnchor, readAnchor, clearAnchor, formatAnchorReminder,
  setScope, addScopePatterns, removeScopePatterns, readScope, isInScope, globMatch, recordOverride,
  setDoneWhen, readDoneWhen, markCriterionMet, unmetCriteria,
  recordBreadcrumb, readBreadcrumbs, analyzeDrift,
  detectOverengineering,
  activeContextSummary, sessionDir,
} from '../lib/pm-guardrails.mjs';
import { matchOverengineering, _OVERENG_RULES } from '../lib/overengineering-rules.mjs';

function setupTemp() {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-guard-test-'));
  process.env.CLAUDE_PROJECT_DIR = tmp;
  return tmp;
}

function teardown(tmp) {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}

// ---------------------------------------------------------------------------
// globMatch / scope predicates
// ---------------------------------------------------------------------------

test('globMatch handles * and ** correctly', () => {
  assert.equal(globMatch('src/**', 'src/auth/refresh.ts'), true);
  assert.equal(globMatch('src/*.ts', 'src/index.ts'), true);
  assert.equal(globMatch('src/*.ts', 'src/auth/refresh.ts'), false); // single * stops at /
  assert.equal(globMatch('tests/**/*.test.mjs', 'tests/unit/a.test.mjs'), true);
  assert.equal(globMatch('src/auth/**', 'src/ui/Login.tsx'), false);
});

test('isInScope rejects paths escaping the base dir', () => {
  const base = '/home/tmp/proj';
  assert.equal(isInScope('/etc/passwd', { allowlist: ['**'], baseDir: base }), false);
  assert.equal(isInScope('/home/tmp/proj/src/a.ts', { allowlist: ['src/**'], baseDir: base }), true);
});

// ---------------------------------------------------------------------------
// Anchor
// ---------------------------------------------------------------------------

test('setAnchor + readAnchor + formatAnchorReminder round-trip', async () => {
  const tmp = setupTemp();
  try {
    const rec = await setAnchor({ doItem: 'Ship /pm:anchor', dontItem: 'Touch unrelated plugins' });
    assert.equal(rec.active, true);
    assert.equal(rec.do, 'Ship /pm:anchor');
    const read = readAnchor();
    assert.deepEqual(read, rec);
    const reminder = formatAnchorReminder(rec);
    assert.ok(reminder.includes('DO: Ship /pm:anchor'));
    assert.ok(reminder.includes("DON'T: Touch unrelated plugins"));
  } finally { teardown(tmp); }
});

test('clearAnchor sets active=false but retains history', async () => {
  const tmp = setupTemp();
  try {
    await setAnchor({ doItem: 'x', dontItem: 'y' });
    const cleared = await clearAnchor();
    assert.equal(cleared.active, false);
    assert.ok(cleared.cleared_at);
    assert.equal(formatAnchorReminder(readAnchor()), null);
  } finally { teardown(tmp); }
});

test('setAnchor rejects empty "do" argument', async () => {
  const tmp = setupTemp();
  try {
    await assert.rejects(() => setAnchor({ doItem: '' }), /doItem is required/);
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

test('setScope + isInScope enforce the allowlist', async () => {
  const tmp = setupTemp();
  try {
    await setScope(['src/auth/**', 'tests/auth/**']);
    const scope = readScope();
    assert.equal(scope.active, true);
    assert.deepEqual(scope.allowlist.sort(), ['src/auth/**', 'tests/auth/**']);
    assert.equal(isInScope(join(tmp, 'src/auth/refresh.ts'), { allowlist: scope.allowlist, baseDir: tmp }), true);
    assert.equal(isInScope(join(tmp, 'src/ui/Login.tsx'), { allowlist: scope.allowlist, baseDir: tmp }), false);
  } finally { teardown(tmp); }
});

test('addScopePatterns + removeScopePatterns mutate atomically', async () => {
  const tmp = setupTemp();
  try {
    await setScope(['src/auth/**']);
    await addScopePatterns(['tests/auth/**', 'src/auth/**']); // duplicate ignored
    assert.equal(readScope().allowlist.length, 2);
    await removeScopePatterns(['src/auth/**']);
    assert.deepEqual(readScope().allowlist, ['tests/auth/**']);
  } finally { teardown(tmp); }
});

test('recordOverride appends to drift ledger without widening scope', async () => {
  const tmp = setupTemp();
  try {
    await setScope(['src/auth/**']);
    await recordOverride({ path: 'src/ui/Login.tsx', reason: 'auth requires button wiring' });
    const scope = readScope();
    assert.equal(scope.overrides.length, 1);
    assert.equal(scope.overrides[0].reason, 'auth requires button wiring');
    assert.deepEqual(scope.allowlist, ['src/auth/**']); // unchanged
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// Done-when
// ---------------------------------------------------------------------------

test('setDoneWhen assigns ids c1..cN', async () => {
  const tmp = setupTemp();
  try {
    const rec = await setDoneWhen({ criteria: ['a passes', 'b returns 200', 'c exists'] });
    assert.deepEqual(rec.criteria.map((c) => c.id), ['c1', 'c2', 'c3']);
    assert.equal(rec.criteria[0].met_at, null);
  } finally { teardown(tmp); }
});

test('markCriterionMet requires non-empty evidence', async () => {
  const tmp = setupTemp();
  try {
    await setDoneWhen({ criteria: ['tests pass'] });
    await assert.rejects(() => markCriterionMet({ id: 'c1', evidence: '' }), /evidence is required/);
    await markCriterionMet({ id: 'c1', evidence: 'pnpm test -> 0' });
    const rec = readDoneWhen();
    assert.ok(rec.criteria[0].met_at);
    assert.equal(rec.criteria[0].evidence, 'pnpm test -> 0');
  } finally { teardown(tmp); }
});

test('unmetCriteria returns only the ones without evidence', async () => {
  const tmp = setupTemp();
  try {
    await setDoneWhen({ criteria: ['a', 'b', 'c'] });
    await markCriterionMet({ id: 'c1', evidence: 'proof' });
    await markCriterionMet({ id: 'c3', evidence: 'proof' });
    const unmet = unmetCriteria(readDoneWhen());
    assert.deepEqual(unmet.map((c) => c.id), ['c2']);
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// Breadcrumbs + drift
// ---------------------------------------------------------------------------

test('recordBreadcrumb + readBreadcrumbs round-trip', () => {
  const tmp = setupTemp();
  try {
    recordBreadcrumb({ tool: 'Edit', target: 'src/a.ts' });
    recordBreadcrumb({ tool: 'Bash', target: 'pnpm test' });
    const crumbs = readBreadcrumbs();
    assert.equal(crumbs.length, 2);
    assert.equal(crumbs[0].tool, 'Edit');
    assert.equal(crumbs[1].target, 'pnpm test');
    assert.ok(crumbs[0].ts);
  } finally { teardown(tmp); }
});

test('analyzeDrift counts advancing vs drift turns', async () => {
  const tmp = setupTemp();
  try {
    await setDoneWhen({ criteria: ['tests pass'] });
    recordBreadcrumb({ tool: 'Edit', target: 'src/a.ts', scope_ok: true });
    recordBreadcrumb({ tool: 'Edit', target: 'src/b.ts', scope_ok: false });
    recordBreadcrumb({ tool: 'Bash', target: 'pnpm test:unit' });
    const report = analyzeDrift();
    assert.equal(report.totals.turns, 3);
    // Bash pnpm test counts as advancing a criterion via heuristic.
    assert.ok(report.totals.advancing_turns >= 1);
  } finally { teardown(tmp); }
});

// ---------------------------------------------------------------------------
// Overengineering detector
// ---------------------------------------------------------------------------

test('matchOverengineering flags multi-line comment blocks', () => {
  const diff = [
    '+// line 1 of a long comment block',
    '+// line 2',
    '+// line 3',
    '+const x = 1;',
  ].join('\n');
  const hits = matchOverengineering({ diff, path: 'src/a.ts' });
  assert.ok(hits.find((h) => h.tag === 'multiline-comment'));
});

test('matchOverengineering flags added feature flags', () => {
  const diff = '+if (featureFlag.isEnabled("foo")) { doThing(); }';
  const hits = matchOverengineering({ diff });
  assert.ok(hits.find((h) => h.tag === 'added-feature-flag'));
});

test('matchOverengineering is quiet on a clean diff', () => {
  const diff = [
    '+function rotateRefreshToken(token) {',
    '+  return verify(token);',
    '+}',
  ].join('\n');
  const hits = matchOverengineering({ diff, path: 'src/auth.ts' });
  assert.deepEqual(hits, []);
});

test('matchOverengineering flags backcompat "// removed" comments', () => {
  const diff = '+// removed — kept for backwards compat\n+export { oldThing };';
  const hits = matchOverengineering({ diff });
  assert.ok(hits.find((h) => h.tag === 'backcompat-shim'));
});

test('every registered rule has a non-empty quote and unique tag', () => {
  const tags = new Set();
  for (const r of _OVERENG_RULES) {
    assert.ok(r.tag && r.rule && typeof r.test === 'function', `bad rule: ${JSON.stringify(r)}`);
    assert.equal(tags.has(r.tag), false, `duplicate tag: ${r.tag}`);
    tags.add(r.tag);
  }
});

// ---------------------------------------------------------------------------
// Active context resolution
// ---------------------------------------------------------------------------

test('activeContextSummary falls back to session dir when no IN_PROGRESS project', () => {
  const tmp = setupTemp();
  try {
    const summary = activeContextSummary();
    assert.equal(summary.kind, 'session');
    assert.equal(summary.dir, sessionDir());
  } finally { teardown(tmp); }
});
