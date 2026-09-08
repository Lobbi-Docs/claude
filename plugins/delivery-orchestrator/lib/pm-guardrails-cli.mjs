#!/usr/bin/env node
// Thin CLI wrapper around pm-guardrails used by the bash hook scripts.
// Every verb prints a single line of JSON to stdout and exits 0. Failures
// print {} and exit 0 so hooks never block Claude on infra errors.
//
// Verbs:
//   anchor-reminder           — prints {reminder: "..."} or {}
//   scope-check <path>        — prints {in_scope, active, matched_pattern?}
//   done-status               — prints {active, total, met, unmet:[...]}
//   overeng <path>            — prints {hits:[{tag,reason,rule}], count}
//   breadcrumb <tool> <tgt>   — appends a breadcrumb; prints {logged:true}
//   active-context            — prints {kind, id, dir}

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import {
  readAnchor, formatAnchorReminder,
  readScope, isInScope,
  readDoneWhen, unmetCriteria,
  detectOverengineering,
  recordBreadcrumb, activeContextSummary,
  budgetStatus, recordUserPrompt, lastUserPrompt,
  writeHandoff, readHandoff,
} from './pm-guardrails.mjs';

const verb = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

function safeGitDiff(path) {
  if (!path || !existsSync(path)) return '';
  try {
    // Prefer a staged diff (what Claude just wrote) over working-tree diff
    // so we score the actual change, not the accumulated delta.
    const diff = execFileSync('git', ['diff', 'HEAD', '--', path], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000,
    });
    return diff;
  } catch {
    // Non-git contexts: fall back to treating the entire file as "added".
    try {
      const body = readFileSync(path, 'utf8');
      return body.split('\n').map((l) => '+' + l).join('\n');
    } catch { return ''; }
  }
}

function printJSON(obj) { process.stdout.write(JSON.stringify(obj)); }

async function main() {
  try {
    switch (verb) {
      case 'anchor-reminder': {
        const anchor = readAnchor();
        const reminder = formatAnchorReminder(anchor);
        printJSON(reminder ? { reminder } : {});
        return;
      }
      case 'scope-check': {
        const scope = readScope();
        if (!scope.active) { printJSON({ in_scope: true, active: false }); return; }
        const pathArg = arg1 ? resolve(arg1) : '';
        const inScope = isInScope(pathArg, { allowlist: scope.allowlist });
        const matched = inScope ? scope.allowlist.find((p) => isInScope(pathArg, { allowlist: [p] })) : null;
        printJSON({ in_scope: inScope, active: true, matched_pattern: matched, allowlist: scope.allowlist });
        return;
      }
      case 'done-status': {
        const rec = readDoneWhen();
        if (!rec) { printJSON({ active: false }); return; }
        const unmet = unmetCriteria(rec);
        printJSON({ active: !!rec.active, total: rec.criteria.length, met: rec.criteria.length - unmet.length, unmet });
        return;
      }
      case 'overeng': {
        const pathArg = arg1 || '';
        if (!pathArg) { printJSON({ hits: [], count: 0 }); return; }
        const diff = safeGitDiff(pathArg);
        const hits = detectOverengineering({ diff, path: pathArg });
        printJSON({ hits, count: hits.length });
        return;
      }
      case 'breadcrumb': {
        recordBreadcrumb({
          tool: arg1 || 'unknown',
          target: arg2 || null,
          ts: new Date().toISOString(),
        });
        printJSON({ logged: true });
        return;
      }
      case 'active-context': {
        printJSON(activeContextSummary());
        return;
      }
      case 'budget-status': {
        printJSON(budgetStatus());
        return;
      }
      case 'record-user-prompt': {
        const text = process.argv.slice(3).join(' ');
        recordUserPrompt(text);
        printJSON({ logged: !!text });
        return;
      }
      case 'last-user-prompt': {
        const p = lastUserPrompt();
        printJSON(p ? { prompt: p } : {});
        return;
      }
      case 'handoff-write': {
        const file = writeHandoff();
        printJSON({ file });
        return;
      }
      case 'handoff-read': {
        const md = readHandoff();
        printJSON(md ? { markdown: md } : {});
        return;
      }
      default:
        process.stderr.write(`unknown verb: ${verb}\n`);
        printJSON({});
    }
  } catch {
    printJSON({});
  }
}

main();
