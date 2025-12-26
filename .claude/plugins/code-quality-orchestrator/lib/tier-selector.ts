/**
 * Tier Selector Module for Jira Work Orchestrator v5.0
 *
 * Automatically selects execution tier (FAST/STANDARD/FULL) based on
 * issue characteristics, affected files, and complexity analysis.
 */

export type ExecutionTier = 'FAST' | 'STANDARD' | 'FULL';

interface TierConfig {
  name: ExecutionTier;
  maxAgents: number;
  estimatedTime: string;
  description: string;
}

export const TIER_CONFIGS: Record<ExecutionTier, TierConfig> = {
  FAST: {
    name: 'FAST',
    maxAgents: 4,
    estimatedTime: '~2 min',
    description: 'Docs, configs, typos, 1-2 files'
  },
  STANDARD: {
    name: 'STANDARD',
    maxAgents: 8,
    estimatedTime: '~5 min',
    description: 'Bug fixes, minor features, 3-10 files'
  },
  FULL: {
    name: 'FULL',
    maxAgents: 12,
    estimatedTime: '~10 min',
    description: 'Major features, architectural changes'
  }
};

interface IssueContext {
  issueKey: string;
  issueType: string;
  labels: string[];
  priority: string;
  summary: string;
  affectedFiles?: string[];
  storyPoints?: number;
}

interface TierSelectionResult {
  tier: ExecutionTier;
  confidence: number;
  reasons: string[];
  config: TierConfig;
}

/**
 * File patterns that indicate simple changes (FAST tier)
 */
const FAST_FILE_PATTERNS = [
  /\.md$/i,
  /\.txt$/i,
  /\.rst$/i,
  /README/i,
  /CHANGELOG/i,
  /LICENSE/i,
  /\.json$/i,      // Config files
  /\.ya?ml$/i,     // Config files
  /\.toml$/i,      // Config files
  /\.env\.example/i
];

/**
 * Labels that force specific tiers
 */
const TIER_LABELS: Record<string, ExecutionTier> = {
  'trivial': 'FAST',
  'docs': 'FAST',
  'typo': 'FAST',
  'config': 'FAST',
  'bug': 'STANDARD',
  'enhancement': 'STANDARD',
  'refactor': 'STANDARD',
  'feature': 'FULL',
  'epic': 'FULL',
  'architectural': 'FULL',
  'security': 'FULL',
  'breaking-change': 'FULL'
};

/**
 * Issue types and their default tiers
 */
const ISSUE_TYPE_TIERS: Record<string, ExecutionTier> = {
  'Bug': 'STANDARD',
  'Task': 'STANDARD',
  'Sub-task': 'FAST',
  'Story': 'STANDARD',
  'Epic': 'FULL',
  'Improvement': 'STANDARD',
  'New Feature': 'FULL',
  'Documentation': 'FAST',
  'Technical Debt': 'STANDARD'
};

/**
 * Select execution tier based on issue context
 */
export function selectTier(context: IssueContext): TierSelectionResult {
  const reasons: string[] = [];
  let scores = { FAST: 0, STANDARD: 0, FULL: 0 };

  // 1. Check explicit label overrides (highest priority)
  for (const label of context.labels) {
    const tierFromLabel = TIER_LABELS[label.toLowerCase()];
    if (tierFromLabel) {
      scores[tierFromLabel] += 30;
      reasons.push(`Label '${label}' suggests ${tierFromLabel}`);
    }
  }

  // 2. Check issue type
  const tierFromType = ISSUE_TYPE_TIERS[context.issueType];
  if (tierFromType) {
    scores[tierFromType] += 20;
    reasons.push(`Issue type '${context.issueType}' defaults to ${tierFromType}`);
  }

  // 3. Analyze affected files
  if (context.affectedFiles) {
    const fileCount = context.affectedFiles.length;

    if (fileCount <= 2) {
      scores.FAST += 15;
      reasons.push(`Only ${fileCount} files affected (FAST candidate)`);
    } else if (fileCount <= 10) {
      scores.STANDARD += 15;
      reasons.push(`${fileCount} files affected (STANDARD candidate)`);
    } else {
      scores.FULL += 15;
      reasons.push(`${fileCount}+ files affected (FULL required)`);
    }

    // Check if all files match FAST patterns
    const allFastFiles = context.affectedFiles.every(file =>
      FAST_FILE_PATTERNS.some(pattern => pattern.test(file))
    );
    if (allFastFiles && fileCount > 0) {
      scores.FAST += 25;
      reasons.push('All affected files are docs/config (FAST eligible)');
    }
  }

  // 4. Check story points / complexity
  if (context.storyPoints) {
    if (context.storyPoints <= 1) {
      scores.FAST += 10;
      reasons.push('Low story points (≤1)');
    } else if (context.storyPoints <= 5) {
      scores.STANDARD += 10;
      reasons.push('Medium story points (2-5)');
    } else {
      scores.FULL += 10;
      reasons.push('High story points (>5)');
    }
  }

  // 5. Check priority
  if (context.priority === 'Critical' || context.priority === 'Blocker') {
    scores.FULL += 5;
    reasons.push('Critical/Blocker priority requires thorough analysis');
  }

  // 6. Keyword analysis in summary
  const summary = context.summary.toLowerCase();
  if (/\b(typo|readme|changelog|config)\b/.test(summary)) {
    scores.FAST += 15;
    reasons.push('Summary suggests simple change');
  }
  if (/\b(refactor|migrate|architect|security|breaking)\b/.test(summary)) {
    scores.FULL += 15;
    reasons.push('Summary suggests complex change');
  }

  // Determine winner
  const maxScore = Math.max(scores.FAST, scores.STANDARD, scores.FULL);
  let selectedTier: ExecutionTier;

  if (scores.FAST === maxScore && scores.FAST > 0) {
    selectedTier = 'FAST';
  } else if (scores.FULL === maxScore && scores.FULL > 0) {
    selectedTier = 'FULL';
  } else {
    selectedTier = 'STANDARD'; // Default fallback
  }

  // Calculate confidence (0-100)
  const totalScore = scores.FAST + scores.STANDARD + scores.FULL;
  const confidence = totalScore > 0
    ? Math.round((maxScore / totalScore) * 100)
    : 50; // Low confidence if no signals

  return {
    tier: selectedTier,
    confidence,
    reasons,
    config: TIER_CONFIGS[selectedTier]
  };
}

/**
 * Force a specific tier (for manual override)
 */
export function forceTier(tier: ExecutionTier): TierSelectionResult {
  return {
    tier,
    confidence: 100,
    reasons: ['Manually specified tier'],
    config: TIER_CONFIGS[tier]
  };
}

/**
 * Get tier from command line argument
 */
export function parseTierArg(arg: string): ExecutionTier | 'auto' {
  const normalized = arg.toLowerCase().replace('--tier=', '');
  if (normalized === 'fast') return 'FAST';
  if (normalized === 'standard') return 'STANDARD';
  if (normalized === 'full') return 'FULL';
  return 'auto';
}
