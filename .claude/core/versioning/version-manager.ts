/**
 * Version Manager - Semantic versioning operations and changelog generation
 */

import type {
  SemverParts,
  ComparisonResult,
  ChangeType,
  IncrementType,
  ConventionalCommit,
  ChangelogEntry,
  ChangelogOptions,
  VersionValidation,
  CommitType,
} from './types.js';

/**
 * Manages semantic versioning operations
 */
export class VersionManager {
  private static readonly SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  private static readonly COMMIT_REGEX =
    /^(?<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<subject>.+)$/;

  /**
   * Parse a semantic version string into components
   */
  parse(version: string): SemverParts {
    const match = version.match(VersionManager.SEMVER_REGEX);

    if (!match) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    const [, major, minor, patch, prerelease, build] = match;

    return {
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease: prerelease ? prerelease.split('.') : undefined,
      build: build ? build.split('.') : undefined,
    };
  }

  /**
   * Validate a version string
   */
  validate(version: string): VersionValidation {
    try {
      const parsed = this.parse(version);
      return { valid: true, version: parsed };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid version',
      };
    }
  }

  /**
   * Compare two semantic versions
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  compare(v1: string, v2: string): ComparisonResult {
    const parsed1 = this.parse(v1);
    const parsed2 = this.parse(v2);

    // Compare major.minor.patch
    const coreComparison = this.compareCore(parsed1, parsed2);
    if (coreComparison !== 0) return coreComparison;

    // Compare prerelease versions
    return this.comparePrerelease(parsed1.prerelease, parsed2.prerelease);
  }

  /**
   * Compare core version numbers (major.minor.patch)
   */
  private compareCore(v1: SemverParts, v2: SemverParts): ComparisonResult {
    if (v1.major !== v2.major) {
      return v1.major > v2.major ? 1 : -1;
    }

    if (v1.minor !== v2.minor) {
      return v1.minor > v2.minor ? 1 : -1;
    }

    if (v1.patch !== v2.patch) {
      return v1.patch > v2.patch ? 1 : -1;
    }

    return 0;
  }

  /**
   * Compare prerelease versions
   */
  private comparePrerelease(
    pre1: string[] | undefined,
    pre2: string[] | undefined
  ): ComparisonResult {
    // Version without prerelease is greater than version with prerelease
    if (!pre1 && !pre2) return 0;
    if (!pre1) return 1;
    if (!pre2) return -1;

    // Compare each prerelease identifier
    const maxLength = Math.max(pre1.length, pre2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = pre1[i];
      const part2 = pre2[i];

      if (part1 === undefined) return -1;
      if (part2 === undefined) return 1;

      // Numeric identifiers
      const num1 = /^\d+$/.test(part1) ? parseInt(part1, 10) : null;
      const num2 = /^\d+$/.test(part2) ? parseInt(part2, 10) : null;

      if (num1 !== null && num2 !== null) {
        if (num1 !== num2) return num1 > num2 ? 1 : -1;
        continue;
      }

      // Numeric < alphanumeric
      if (num1 !== null) return -1;
      if (num2 !== null) return 1;

      // Alphanumeric comparison
      if (part1 !== part2) {
        return part1 > part2 ? 1 : -1;
      }
    }

    return 0;
  }

  /**
   * Determine the type of change between two versions
   */
  getChangeType(from: string, to: string): ChangeType {
    const v1 = this.parse(from);
    const v2 = this.parse(to);

    if (v2.major > v1.major) return 'major';
    if (v2.minor > v1.minor) return 'minor';
    if (v2.patch > v1.patch) return 'patch';
    if (v2.prerelease && !v1.prerelease) return 'prerelease';
    if (v2.prerelease && v1.prerelease) {
      if (JSON.stringify(v2.prerelease) !== JSON.stringify(v1.prerelease)) {
        return 'prerelease';
      }
    }

    return 'patch';
  }

  /**
   * Increment a version by type
   */
  increment(version: string, type: IncrementType): string {
    const parsed = this.parse(version);

    switch (type) {
      case 'major':
        return `${parsed.major + 1}.0.0`;
      case 'minor':
        return `${parsed.major}.${parsed.minor + 1}.0`;
      case 'patch':
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      default:
        throw new Error(`Unknown increment type: ${type}`);
    }
  }

  /**
   * Check if version satisfies a semver range
   */
  satisfies(version: string, range: string): boolean {
    // Handle exact version
    if (!range.match(/[~^*<>=]/)) {
      return version === range;
    }

    // Handle caret range (^1.2.3 = >=1.2.3 <2.0.0)
    if (range.startsWith('^')) {
      const baseVersion = range.slice(1);
      const base = this.parse(baseVersion);
      const current = this.parse(version);

      return (
        current.major === base.major &&
        this.compare(version, baseVersion) >= 0 &&
        this.compare(version, `${base.major + 1}.0.0`) < 0
      );
    }

    // Handle tilde range (~1.2.3 = >=1.2.3 <1.3.0)
    if (range.startsWith('~')) {
      const baseVersion = range.slice(1);
      const base = this.parse(baseVersion);
      const current = this.parse(version);

      return (
        current.major === base.major &&
        current.minor === base.minor &&
        this.compare(version, baseVersion) >= 0 &&
        this.compare(version, `${base.major}.${base.minor + 1}.0`) < 0
      );
    }

    // Handle wildcard
    if (range === '*') {
      return true;
    }

    // For more complex ranges, would need full semver implementation
    // This is a simplified version
    return false;
  }

  /**
   * Parse a conventional commit message
   */
  parseCommit(message: string): ConventionalCommit {
    const lines = message.split('\n');
    const firstLine = lines[0];
    const match = firstLine.match(VersionManager.COMMIT_REGEX);

    if (!match || !match.groups) {
      // Return a basic commit if it doesn't match conventional format
      return {
        type: 'chore',
        subject: firstLine,
        breaking: false,
        raw: message,
      };
    }

    const { type, scope, breaking, subject } = match.groups;
    const body = lines.slice(1).join('\n').trim();

    // Check for BREAKING CHANGE in footer
    const hasBreakingFooter = /BREAKING CHANGE:/i.test(body);

    return {
      type: type as CommitType,
      scope,
      subject,
      body: body || undefined,
      breaking: !!breaking || hasBreakingFooter,
      raw: message,
    };
  }

  /**
   * Generate changelog from conventional commits
   */
  generateChangelog(
    commits: ConventionalCommit[],
    options: ChangelogOptions
  ): ChangelogEntry {
    const breaking: string[] = [];
    const features: string[] = [];
    const fixes: string[] = [];
    const other: string[] = [];

    for (const commit of commits) {
      const message = commit.scope
        ? `**${commit.scope}**: ${commit.subject}`
        : commit.subject;

      if (commit.breaking) {
        breaking.push(message);
      } else if (commit.type === 'feat') {
        features.push(message);
      } else if (commit.type === 'fix') {
        fixes.push(message);
      } else if (['docs', 'refactor', 'perf', 'test'].includes(commit.type)) {
        other.push(`${commit.type}: ${message}`);
      }
    }

    return {
      version: options.toVersion,
      date: options.includeDate !== false ? new Date().toISOString().split('T')[0] : '',
      changes: {
        breaking,
        features,
        fixes,
        other,
      },
      commits,
    };
  }

  /**
   * Format changelog entry as markdown
   */
  formatChangelog(entry: ChangelogEntry): string {
    const lines: string[] = [];

    lines.push(`## [${entry.version}]${entry.date ? ` - ${entry.date}` : ''}`);
    lines.push('');

    if (entry.changes.breaking.length > 0) {
      lines.push('### ⚠ BREAKING CHANGES');
      lines.push('');
      entry.changes.breaking.forEach((change) => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    if (entry.changes.features.length > 0) {
      lines.push('### Features');
      lines.push('');
      entry.changes.features.forEach((feature) => {
        lines.push(`- ${feature}`);
      });
      lines.push('');
    }

    if (entry.changes.fixes.length > 0) {
      lines.push('### Bug Fixes');
      lines.push('');
      entry.changes.fixes.forEach((fix) => {
        lines.push(`- ${fix}`);
      });
      lines.push('');
    }

    if (entry.changes.other.length > 0) {
      lines.push('### Other Changes');
      lines.push('');
      entry.changes.other.forEach((change) => {
        lines.push(`- ${change}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get recommended version bump based on commits
   */
  getRecommendedBump(commits: ConventionalCommit[]): IncrementType {
    const hasBreaking = commits.some((c) => c.breaking);
    const hasFeature = commits.some((c) => c.type === 'feat');

    if (hasBreaking) return 'major';
    if (hasFeature) return 'minor';
    return 'patch';
  }

  /**
   * Sort versions in ascending order
   */
  sort(versions: string[]): string[] {
    return [...versions].sort((a, b) => this.compare(a, b));
  }

  /**
   * Get the latest version from a list
   */
  latest(versions: string[]): string | undefined {
    if (versions.length === 0) return undefined;
    const sorted = this.sort(versions);
    return sorted[sorted.length - 1];
  }

  /**
   * Stringify semver parts back to version string
   */
  stringify(parts: SemverParts): string {
    let version = `${parts.major}.${parts.minor}.${parts.patch}`;

    if (parts.prerelease) {
      version += `-${parts.prerelease.join('.')}`;
    }

    if (parts.build) {
      version += `+${parts.build.join('.')}`;
    }

    return version;
  }
}

// Export singleton instance
export const versionManager = new VersionManager();
