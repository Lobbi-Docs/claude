// Rules that flag over-engineering patterns CLAUDE.md forbids.
// Each rule returns a short reason string when matched; the hook prints the
// matched reason alongside the quoted CLAUDE.md rule so Claude can self-correct.
//
// Keep rules tight. False positives here undermine the entire gate — prefer
// "no rule" over "ambiguous rule." Each rule carries a tag so we can test it.

const RULES = [
  {
    tag: 'multiline-comment',
    rule: 'Default to writing no comments. One short line max.',
    test: ({ diff }) => {
      if (!diff) return null;
      // Multi-line comment blocks added (3+ added comment lines in a row).
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
      let streak = 0;
      let maxStreak = 0;
      for (const line of added) {
        const body = line.slice(1).trim();
        const isComment = /^(\/\/|#|\*|\/\*|<!--)/.test(body) || /"""|'''/.test(body);
        if (isComment) { streak++; maxStreak = Math.max(maxStreak, streak); } else { streak = 0; }
      }
      return maxStreak >= 3 ? `added ${maxStreak} consecutive comment lines` : null;
    },
  },
  {
    tag: 'added-feature-flag',
    rule: 'Don\'t use feature flags or backwards-compatibility shims when you can just change the code.',
    test: ({ diff }) => {
      if (!diff) return null;
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
      if (/\b(featureFlag|FEATURE_FLAG|isFeatureEnabled|enableFeature)\b/.test(added)) {
        return 'added a feature flag';
      }
      return null;
    },
  },
  {
    tag: 'backcompat-shim',
    rule: 'Avoid backwards-compatibility hacks like renaming unused _vars, re-exporting types for removed code, adding // removed comments.',
    test: ({ diff }) => {
      if (!diff) return null;
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
      const hits = [];
      if (/\/\/\s*removed\b/i.test(added)) hits.push('"// removed" comment');
      if (/\bexport\s*\{\s*[^}]+\s*\}\s*;?\s*\/\/\s*re-?export\b/i.test(added)) hits.push('re-export shim');
      if (/\b_[a-zA-Z]+\s*=/.test(added) && /kept for backwards compat/i.test(added)) hits.push('_var kept for compat');
      return hits.length ? hits.join(', ') : null;
    },
  },
  {
    tag: 'speculative-validation',
    rule: 'Don\'t add error handling, fallbacks, or validation for scenarios that can\'t happen.',
    test: ({ diff }) => {
      if (!diff) return null;
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
      // Paranoid checks like: if (!obj) return; if (typeof foo !== 'undefined') { ... }
      const paranoid =
        (added.match(/if\s*\(\s*typeof\s+\w+\s*!==?\s*['"]undefined['"]/g) || []).length +
        (added.match(/if\s*\(\s*!\s*\w+\s*\)\s*return\s*;/g) || []).length;
      return paranoid >= 3 ? `added ${paranoid} speculative null/type guards` : null;
    },
  },
  {
    tag: 'docstring-bloat',
    rule: 'Never write multi-paragraph docstrings or multi-line comment blocks — one short line max.',
    test: ({ diff, path }) => {
      if (!diff) return null;
      // A triple-quoted docstring or JSDoc /** ... */ spanning >= 5 added lines.
      const added = diff.split('\n');
      let inBlock = false;
      let blockLines = 0;
      let maxBlock = 0;
      for (const line of added) {
        if (!line.startsWith('+') || line.startsWith('+++')) continue;
        const body = line.slice(1);
        if (!inBlock && /^\s*(\/\*\*|"""|''')/.test(body)) { inBlock = true; blockLines = 1; continue; }
        if (inBlock) {
          blockLines++;
          if (/\*\/|"""|'''/.test(body)) { maxBlock = Math.max(maxBlock, blockLines); inBlock = false; blockLines = 0; }
        }
      }
      return maxBlock >= 5 ? `added ${maxBlock}-line docstring${path ? ` in ${path}` : ''}` : null;
    },
  },
  {
    tag: 'task-reference-comment',
    rule: 'Don\'t reference the current task, fix, or callers in comments ("used by X", "added for Y", "#issue-123").',
    test: ({ diff }) => {
      if (!diff) return null;
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
      const hits = [];
      if (/\/\/\s*added for\b/i.test(added)) hits.push('"added for X" comment');
      if (/\/\/\s*used by\b/i.test(added)) hits.push('"used by X" comment');
      if (/#issue[-_ ]?\d+/i.test(added)) hits.push('issue-# reference in comment');
      return hits.length ? hits.join(', ') : null;
    },
  },
];

export function matchOverengineering({ diff, path }) {
  const hits = [];
  for (const rule of RULES) {
    try {
      const reason = rule.test({ diff, path });
      if (reason) hits.push({ tag: rule.tag, rule: rule.rule, reason });
    } catch {
      // A broken rule should never block a tool call.
    }
  }
  return hits;
}

export function formatHits(hits) {
  if (!hits || hits.length === 0) return '';
  return hits
    .map((h) => `- ${h.reason}\n  CLAUDE.md rule: "${h.rule}"`)
    .join('\n');
}

export { RULES as _OVERENG_RULES }; // exported for tests
