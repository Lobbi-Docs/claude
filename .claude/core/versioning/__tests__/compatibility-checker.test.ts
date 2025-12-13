/**
 * Tests for CompatibilityChecker
 */

import { describe, it, expect } from 'vitest';
import { CompatibilityChecker } from '../compatibility-checker.js';
import type { PluginManifest } from '../types.js';

describe('CompatibilityChecker', () => {
  const checker = new CompatibilityChecker();

  describe('checkApiCompatibility', () => {
    it('should pass for compatible plugin', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        apiVersion: '1.0.0',
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report.compatible).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('should warn about missing API version', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report.compatible).toBe(true);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0].type).toBe('untested-version');
    });

    it('should detect engine mismatch', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        engines: {
          claudeCode: '^2.0.0', // Current version is 1.0.0
        },
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report.compatible).toBe(false);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.issues[0].type).toBe('version-mismatch');
    });

    it('should detect unsupported API version', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        apiVersion: '99.0.0', // Way future version
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report.compatible).toBe(false);
      expect(report.issues.some((i) => i.type === 'api-breaking')).toBe(true);
    });

    it('should warn about Node.js version', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        engines: {
          node: '^99.0.0', // Future Node.js version
        },
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for issues', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        apiVersion: '99.0.0',
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('checkSignatureCompatibility', () => {
    it('should detect breaking changes', () => {
      const report = checker.checkSignatureCompatibility('1.0.0', '2.0.0');

      expect(report.compatible).toBe(false);
      expect(report.breaking.length).toBeGreaterThan(0);
    });

    it('should be compatible for patch updates', () => {
      const report = checker.checkSignatureCompatibility('1.0.0', '1.0.1');

      expect(report.compatible).toBe(true);
      expect(report.breaking).toHaveLength(0);
    });

    it('should categorize changes correctly', () => {
      const report = checker.checkSignatureCompatibility('1.0.0', '2.0.0');

      // Check that changes are categorized
      const totalChanges =
        report.breaking.length +
        report.additions.length +
        report.deprecations.length +
        report.removals.length;

      expect(totalChanges).toBeGreaterThan(0);
    });
  });

  describe('generateMatrix', () => {
    it('should generate compatibility matrix', () => {
      const plugins: PluginManifest[] = [
        {
          name: 'compatible-plugin',
          version: '1.0.0',
          description: 'Compatible',
          apiVersion: '1.0.0',
        },
        {
          name: 'incompatible-plugin',
          version: '1.0.0',
          description: 'Incompatible',
          apiVersion: '99.0.0',
        },
        {
          name: 'warning-plugin',
          version: '1.0.0',
          description: 'Has warnings',
          // Missing apiVersion will cause warning
        },
      ];

      const matrix = checker.generateMatrix(plugins);

      expect(matrix.summary.total).toBe(3);
      expect(matrix.summary.compatible).toBeGreaterThanOrEqual(1);
      expect(matrix.summary.warnings).toBeGreaterThanOrEqual(1);
      expect(matrix.summary.incompatible).toBeGreaterThanOrEqual(1);

      expect(matrix.plugins['compatible-plugin'].status).toBe('compatible');
      expect(matrix.plugins['incompatible-plugin'].status).toBe('incompatible');
      expect(matrix.plugins['warning-plugin'].status).toBe('warning');
    });

    it('should include plugin details in matrix', () => {
      const plugins: PluginManifest[] = [
        {
          name: 'test-plugin',
          version: '1.2.3',
          description: 'Test',
          apiVersion: '1.0.0',
        },
      ];

      const matrix = checker.generateMatrix(plugins);

      expect(matrix.plugins['test-plugin'].version).toBe('1.2.3');
      expect(matrix.plugins['test-plugin'].compatible).toBe(true);
      expect(matrix.plugins['test-plugin'].issues).toBe(0);
    });
  });

  describe('formatReport', () => {
    it('should format compatibility report', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        apiVersion: '1.0.0',
      };

      const report = checker.checkApiCompatibility(plugin);
      const formatted = checker.formatReport(report);

      expect(formatted).toContain('test-plugin');
      expect(formatted).toContain('1.0.0');
      expect(formatted).toContain('Compatible');
    });

    it('should include issues in formatted report', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        apiVersion: '99.0.0',
      };

      const report = checker.checkApiCompatibility(plugin);
      const formatted = checker.formatReport(report);

      expect(formatted).toContain('Issues:');
      expect(formatted).toContain('Incompatible');
    });

    it('should include warnings in formatted report', () => {
      const plugin: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
      };

      const report = checker.checkApiCompatibility(plugin);
      const formatted = checker.formatReport(report);

      expect(formatted).toContain('Warnings:');
    });
  });

  describe('formatMatrix', () => {
    it('should format compatibility matrix', () => {
      const plugins: PluginManifest[] = [
        {
          name: 'plugin-a',
          version: '1.0.0',
          description: 'Test A',
          apiVersion: '1.0.0',
        },
        {
          name: 'plugin-b',
          version: '2.0.0',
          description: 'Test B',
          apiVersion: '99.0.0',
        },
      ];

      const matrix = checker.generateMatrix(plugins);
      const formatted = checker.formatMatrix(matrix);

      expect(formatted).toContain('Plugin Compatibility Matrix');
      expect(formatted).toContain('plugin-a');
      expect(formatted).toContain('plugin-b');
      expect(formatted).toContain('Summary:');
      expect(formatted).toContain('Total: 2');
    });

    it('should use status icons in formatted matrix', () => {
      const plugins: PluginManifest[] = [
        {
          name: 'compatible',
          version: '1.0.0',
          description: 'Test',
          apiVersion: '1.0.0',
        },
      ];

      const matrix = checker.generateMatrix(plugins);
      const formatted = checker.formatMatrix(matrix);

      // Should include checkmark for compatible
      expect(formatted).toContain('✓');
    });
  });

  describe('edge cases', () => {
    it('should handle plugins with all optional fields', () => {
      const plugin: PluginManifest = {
        name: 'minimal-plugin',
        version: '1.0.0',
        description: 'Minimal plugin',
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report).toBeDefined();
      expect(report.plugin).toBe('minimal-plugin');
    });

    it('should handle plugins with complex dependencies', () => {
      const plugin: PluginManifest = {
        name: 'complex-plugin',
        version: '1.0.0',
        description: 'Complex',
        dependencies: {
          'dep-a': '^1.0.0',
          'dep-b': '~2.1.0',
        },
        peerDependencies: {
          'peer-a': '>=1.0.0',
        },
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report).toBeDefined();
    });

    it('should handle empty plugin manifest gracefully', () => {
      const plugin: PluginManifest = {
        name: '',
        version: '1.0.0',
        description: '',
      };

      const report = checker.checkApiCompatibility(plugin);

      expect(report).toBeDefined();
    });
  });
});
