/**
 * Tests for VersionManager
 */

import { describe, it, expect } from 'vitest';
import { VersionManager } from '../version-manager.js';
import type { ConventionalCommit } from '../types.js';

describe('VersionManager', () => {
  const vm = new VersionManager();

  describe('parse', () => {
    it('should parse simple semantic version', () => {
      const result = vm.parse('1.2.3');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
      });
    });

    it('should parse version with prerelease', () => {
      const result = vm.parse('1.2.3-beta.1');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: ['beta', '1'],
        build: undefined,
      });
    });

    it('should parse version with build metadata', () => {
      const result = vm.parse('1.2.3+build.123');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: ['build', '123'],
      });
    });

    it('should parse version with prerelease and build', () => {
      const result = vm.parse('1.2.3-beta.1+build.123');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: ['beta', '1'],
        build: ['build', '123'],
      });
    });

    it('should throw on invalid version', () => {
      expect(() => vm.parse('1.2')).toThrow('Invalid semantic version');
      expect(() => vm.parse('v1.2.3')).toThrow('Invalid semantic version');
      expect(() => vm.parse('1.2.3.4')).toThrow('Invalid semantic version');
    });
  });

  describe('validate', () => {
    it('should validate correct version', () => {
      const result = vm.validate('1.2.3');
      expect(result.valid).toBe(true);
      expect(result.version).toBeDefined();
    });

    it('should reject invalid version', () => {
      const result = vm.validate('1.2');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('compare', () => {
    it('should compare major versions', () => {
      expect(vm.compare('2.0.0', '1.9.9')).toBe(1);
      expect(vm.compare('1.0.0', '2.0.0')).toBe(-1);
    });

    it('should compare minor versions', () => {
      expect(vm.compare('1.5.0', '1.4.9')).toBe(1);
      expect(vm.compare('1.4.0', '1.5.0')).toBe(-1);
    });

    it('should compare patch versions', () => {
      expect(vm.compare('1.2.5', '1.2.4')).toBe(1);
      expect(vm.compare('1.2.3', '1.2.4')).toBe(-1);
    });

    it('should handle equal versions', () => {
      expect(vm.compare('1.2.3', '1.2.3')).toBe(0);
    });

    it('should handle prerelease versions', () => {
      expect(vm.compare('1.0.0', '1.0.0-beta')).toBe(1);
      expect(vm.compare('1.0.0-beta', '1.0.0')).toBe(-1);
      expect(vm.compare('1.0.0-beta.2', '1.0.0-beta.1')).toBe(1);
      expect(vm.compare('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    });
  });

  describe('getChangeType', () => {
    it('should detect major change', () => {
      expect(vm.getChangeType('1.0.0', '2.0.0')).toBe('major');
    });

    it('should detect minor change', () => {
      expect(vm.getChangeType('1.0.0', '1.1.0')).toBe('minor');
    });

    it('should detect patch change', () => {
      expect(vm.getChangeType('1.0.0', '1.0.1')).toBe('patch');
    });

    it('should detect prerelease change', () => {
      expect(vm.getChangeType('1.0.0', '1.0.0-beta')).toBe('prerelease');
    });
  });

  describe('increment', () => {
    it('should increment major version', () => {
      expect(vm.increment('1.2.3', 'major')).toBe('2.0.0');
    });

    it('should increment minor version', () => {
      expect(vm.increment('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('should increment patch version', () => {
      expect(vm.increment('1.2.3', 'patch')).toBe('1.2.4');
    });
  });

  describe('satisfies', () => {
    it('should match exact version', () => {
      expect(vm.satisfies('1.2.3', '1.2.3')).toBe(true);
      expect(vm.satisfies('1.2.3', '1.2.4')).toBe(false);
    });

    it('should match caret range', () => {
      expect(vm.satisfies('1.2.3', '^1.2.0')).toBe(true);
      expect(vm.satisfies('1.5.0', '^1.2.0')).toBe(true);
      expect(vm.satisfies('2.0.0', '^1.2.0')).toBe(false);
    });

    it('should match tilde range', () => {
      expect(vm.satisfies('1.2.3', '~1.2.0')).toBe(true);
      expect(vm.satisfies('1.2.9', '~1.2.0')).toBe(true);
      expect(vm.satisfies('1.3.0', '~1.2.0')).toBe(false);
    });

    it('should match wildcard', () => {
      expect(vm.satisfies('1.2.3', '*')).toBe(true);
      expect(vm.satisfies('99.99.99', '*')).toBe(true);
    });
  });

  describe('parseCommit', () => {
    it('should parse feature commit', () => {
      const commit = vm.parseCommit('feat: add new feature');
      expect(commit.type).toBe('feat');
      expect(commit.subject).toBe('add new feature');
      expect(commit.breaking).toBe(false);
    });

    it('should parse commit with scope', () => {
      const commit = vm.parseCommit('fix(auth): fix login bug');
      expect(commit.type).toBe('fix');
      expect(commit.scope).toBe('auth');
      expect(commit.subject).toBe('fix login bug');
    });

    it('should parse breaking change with !', () => {
      const commit = vm.parseCommit('feat!: breaking API change');
      expect(commit.type).toBe('feat');
      expect(commit.breaking).toBe(true);
    });

    it('should parse breaking change in footer', () => {
      const commit = vm.parseCommit(
        'feat: new feature\n\nBREAKING CHANGE: This breaks things'
      );
      expect(commit.type).toBe('feat');
      expect(commit.breaking).toBe(true);
    });

    it('should handle non-conventional commit', () => {
      const commit = vm.parseCommit('Just a regular commit message');
      expect(commit.type).toBe('chore');
      expect(commit.subject).toBe('Just a regular commit message');
    });
  });

  describe('generateChangelog', () => {
    it('should generate changelog from commits', () => {
      const commits: ConventionalCommit[] = [
        {
          type: 'feat',
          subject: 'Add new feature',
          breaking: false,
          raw: 'feat: Add new feature',
        },
        {
          type: 'fix',
          subject: 'Fix bug',
          breaking: false,
          raw: 'fix: Fix bug',
        },
        {
          type: 'feat',
          scope: 'api',
          subject: 'Breaking change',
          breaking: true,
          raw: 'feat(api)!: Breaking change',
        },
      ];

      const changelog = vm.generateChangelog(commits, {
        toVersion: '2.0.0',
        includeDate: true,
      });

      expect(changelog.version).toBe('2.0.0');
      expect(changelog.date).toBeDefined();
      expect(changelog.changes.breaking).toHaveLength(1);
      expect(changelog.changes.features).toHaveLength(1);
      expect(changelog.changes.fixes).toHaveLength(1);
    });
  });

  describe('getRecommendedBump', () => {
    it('should recommend major for breaking changes', () => {
      const commits: ConventionalCommit[] = [
        {
          type: 'feat',
          subject: 'Breaking',
          breaking: true,
          raw: 'feat!: Breaking',
        },
      ];
      expect(vm.getRecommendedBump(commits)).toBe('major');
    });

    it('should recommend minor for features', () => {
      const commits: ConventionalCommit[] = [
        {
          type: 'feat',
          subject: 'New feature',
          breaking: false,
          raw: 'feat: New feature',
        },
      ];
      expect(vm.getRecommendedBump(commits)).toBe('minor');
    });

    it('should recommend patch for fixes', () => {
      const commits: ConventionalCommit[] = [
        {
          type: 'fix',
          subject: 'Bug fix',
          breaking: false,
          raw: 'fix: Bug fix',
        },
      ];
      expect(vm.getRecommendedBump(commits)).toBe('patch');
    });
  });

  describe('sort', () => {
    it('should sort versions in ascending order', () => {
      const versions = ['1.10.0', '1.2.0', '2.0.0', '1.2.1'];
      const sorted = vm.sort(versions);
      expect(sorted).toEqual(['1.2.0', '1.2.1', '1.10.0', '2.0.0']);
    });
  });

  describe('latest', () => {
    it('should return latest version', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0'];
      expect(vm.latest(versions)).toBe('2.0.0');
    });

    it('should return undefined for empty array', () => {
      expect(vm.latest([])).toBeUndefined();
    });
  });

  describe('stringify', () => {
    it('should stringify semver parts', () => {
      expect(
        vm.stringify({
          major: 1,
          minor: 2,
          patch: 3,
        })
      ).toBe('1.2.3');

      expect(
        vm.stringify({
          major: 1,
          minor: 2,
          patch: 3,
          prerelease: ['beta', '1'],
        })
      ).toBe('1.2.3-beta.1');

      expect(
        vm.stringify({
          major: 1,
          minor: 2,
          patch: 3,
          build: ['build', '123'],
        })
      ).toBe('1.2.3+build.123');
    });
  });
});
