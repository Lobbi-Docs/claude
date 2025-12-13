/**
 * Compatibility Checker - Validate plugin compatibility with Claude Code versions
 */

import type {
  PluginManifest,
  CompatibilityReport,
  CompatibilityIssue,
  CompatibilityWarning,
  SignatureReport,
  SignatureChange,
  CompatibilityMatrix,
} from './types.js';
import { versionManager } from './version-manager.js';

/**
 * Manages compatibility checking between plugins and Claude Code versions
 */
export class CompatibilityChecker {
  private static readonly CLAUDE_CODE_VERSION = '1.0.0'; // Current Claude Code version
  private static readonly SUPPORTED_API_VERSIONS = ['1.0.0'];

  // Breaking API changes by version
  private static readonly API_BREAKING_CHANGES: Record<string, string[]> = {
    '2.0.0': [
      'Removed deprecated PluginManager.install()',
      'Changed Agent signature: model is now required',
      'Renamed Hook.beforeExecute to Hook.preExecute',
    ],
    '1.5.0': [
      'Changed Command signature: argumentHint is now optional',
    ],
  };

  // Deprecated APIs by version
  private static readonly API_DEPRECATIONS: Record<string, string[]> = {
    '1.5.0': [
      'PluginManager.install() - Use PluginManager.installPlugin() instead',
      'Agent.execute() - Use Agent.run() instead',
    ],
  };

  /**
   * Check plugin compatibility with Claude Code version
   */
  checkApiCompatibility(plugin: PluginManifest): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];
    const warnings: CompatibilityWarning[] = [];
    const suggestions: string[] = [];

    // Check engine requirements
    this.checkEngineCompatibility(plugin, issues, warnings);

    // Check API version
    this.checkApiVersion(plugin, issues, warnings);

    // Check for breaking changes
    this.checkBreakingChanges(plugin, issues);

    // Check for deprecated APIs
    this.checkDeprecations(plugin, warnings);

    // Check dependencies
    this.checkDependencyVersions(plugin, issues, warnings);

    // Generate suggestions
    if (warnings.length > 0) {
      suggestions.push('Consider updating your plugin to use the latest APIs');
    }

    if (issues.length > 0) {
      suggestions.push('Review breaking changes and update your plugin accordingly');
    }

    return {
      compatible: issues.length === 0,
      plugin: plugin.name,
      pluginVersion: plugin.version,
      claudeCodeVersion: CompatibilityChecker.CLAUDE_CODE_VERSION,
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * Check engine compatibility
   */
  private checkEngineCompatibility(
    plugin: PluginManifest,
    issues: CompatibilityIssue[],
    warnings: CompatibilityWarning[]
  ): void {
    const engines = plugin.engines;
    if (!engines) return;

    // Check Claude Code version requirement
    if (engines.claudeCode) {
      const satisfied = versionManager.satisfies(
        CompatibilityChecker.CLAUDE_CODE_VERSION,
        engines.claudeCode
      );

      if (!satisfied) {
        issues.push({
          type: 'version-mismatch',
          severity: 'error',
          message: `Plugin requires Claude Code ${engines.claudeCode}, but current version is ${CompatibilityChecker.CLAUDE_CODE_VERSION}`,
          affectedComponent: 'claude-code-engine',
        });
      }
    }

    // Check Node.js version
    if (engines.node) {
      const nodeVersion = process.version.slice(1); // Remove 'v' prefix
      const satisfied = versionManager.satisfies(nodeVersion, engines.node);

      if (!satisfied) {
        warnings.push({
          type: 'version-outdated',
          severity: 'warning',
          message: `Plugin requires Node.js ${engines.node}, but current version is ${nodeVersion}`,
          details: 'Plugin may not work correctly with this Node.js version',
        });
      }
    }
  }

  /**
   * Check API version compatibility
   */
  private checkApiVersion(
    plugin: PluginManifest,
    issues: CompatibilityIssue[],
    warnings: CompatibilityWarning[]
  ): void {
    const apiVersion = plugin.apiVersion || plugin.claudeCodeVersion;

    if (!apiVersion) {
      warnings.push({
        type: 'untested-version',
        severity: 'warning',
        message: 'Plugin does not specify an API version',
        details: 'Add "apiVersion" or "claudeCodeVersion" to your plugin.json',
      });
      return;
    }

    const supported = CompatibilityChecker.SUPPORTED_API_VERSIONS.some((v) =>
      versionManager.satisfies(apiVersion, `^${v}`)
    );

    if (!supported) {
      issues.push({
        type: 'api-breaking',
        severity: 'error',
        message: `Plugin API version ${apiVersion} is not supported`,
        details: `Supported API versions: ${CompatibilityChecker.SUPPORTED_API_VERSIONS.join(', ')}`,
        affectedComponent: 'plugin-api',
      });
    }
  }

  /**
   * Check for breaking changes
   */
  private checkBreakingChanges(
    plugin: PluginManifest,
    issues: CompatibilityIssue[]
  ): void {
    const apiVersion = plugin.apiVersion || plugin.claudeCodeVersion || '1.0.0';

    // Check each version for breaking changes
    for (const [version, changes] of Object.entries(
      CompatibilityChecker.API_BREAKING_CHANGES
    )) {
      // If plugin was built for older version than breaking change version
      if (versionManager.compare(apiVersion, version) < 0) {
        for (const change of changes) {
          issues.push({
            type: 'api-breaking',
            severity: 'error',
            message: `Breaking change in v${version}: ${change}`,
            details: `Plugin API version ${apiVersion} is affected by this change`,
            affectedComponent: 'plugin-api',
          });
        }
      }
    }
  }

  /**
   * Check for deprecated APIs
   */
  private checkDeprecations(
    plugin: PluginManifest,
    warnings: CompatibilityWarning[]
  ): void {
    const apiVersion = plugin.apiVersion || plugin.claudeCodeVersion || '1.0.0';

    // Check each version for deprecations
    for (const [version, deprecations] of Object.entries(
      CompatibilityChecker.API_DEPRECATIONS
    )) {
      // If plugin was built for version with deprecations
      if (versionManager.compare(apiVersion, version) <= 0) {
        for (const deprecation of deprecations) {
          warnings.push({
            type: 'deprecated-api',
            severity: 'warning',
            message: `Deprecated in v${version}: ${deprecation}`,
            details: 'This API will be removed in a future version',
          });
        }
      }
    }
  }

  /**
   * Check dependency versions for conflicts
   */
  private checkDependencyVersions(
    plugin: PluginManifest,
    issues: CompatibilityIssue[],
    warnings: CompatibilityWarning[]
  ): void {
    const dependencies = plugin.dependencies || {};
    const peerDependencies = plugin.peerDependencies || {};

    // Check for peer dependency conflicts
    for (const [name, version] of Object.entries(peerDependencies)) {
      // This is simplified - in reality would check against installed plugins
      if (!version.match(/^[\^~]?\d+\.\d+\.\d+/)) {
        warnings.push({
          type: 'version-outdated',
          severity: 'warning',
          message: `Invalid peer dependency version for ${name}: ${version}`,
          details: 'Use semver format (e.g., ^1.0.0, ~2.1.0)',
        });
      }
    }
  }

  /**
   * Check signature compatibility between versions
   */
  checkSignatureCompatibility(oldVersion: string, newVersion: string): SignatureReport {
    const breaking: SignatureChange[] = [];
    const additions: SignatureChange[] = [];
    const deprecations: SignatureChange[] = [];
    const removals: SignatureChange[] = [];

    // Get breaking changes for versions in between
    const versions = Object.keys(CompatibilityChecker.API_BREAKING_CHANGES).filter(
      (v) =>
        versionManager.compare(v, oldVersion) > 0 &&
        versionManager.compare(v, newVersion) <= 0
    );

    for (const version of versions) {
      const changes = CompatibilityChecker.API_BREAKING_CHANGES[version];
      for (const change of changes) {
        // Parse change to determine type
        if (change.includes('Removed')) {
          removals.push({
            type: 'function',
            name: this.extractName(change),
            changeType: 'removed',
            breaking: true,
            message: change,
          });
        } else if (change.includes('Changed')) {
          breaking.push({
            type: 'function',
            name: this.extractName(change),
            changeType: 'modified',
            breaking: true,
            message: change,
          });
        } else if (change.includes('Renamed')) {
          breaking.push({
            type: 'function',
            name: this.extractName(change),
            changeType: 'modified',
            breaking: true,
            message: change,
          });
        }
      }
    }

    return {
      compatible: breaking.length === 0 && removals.length === 0,
      breaking,
      additions,
      deprecations,
      removals,
    };
  }

  /**
   * Generate compatibility matrix for multiple plugins
   */
  generateMatrix(plugins: PluginManifest[]): CompatibilityMatrix {
    const matrix: CompatibilityMatrix = {
      claudeCodeVersion: CompatibilityChecker.CLAUDE_CODE_VERSION,
      plugins: {},
      summary: {
        total: plugins.length,
        compatible: 0,
        warnings: 0,
        incompatible: 0,
      },
    };

    for (const plugin of plugins) {
      const report = this.checkApiCompatibility(plugin);

      let status: 'compatible' | 'warning' | 'incompatible';
      if (report.issues.length > 0) {
        status = 'incompatible';
        matrix.summary.incompatible++;
      } else if (report.warnings.length > 0) {
        status = 'warning';
        matrix.summary.warnings++;
      } else {
        status = 'compatible';
        matrix.summary.compatible++;
      }

      matrix.plugins[plugin.name] = {
        version: plugin.version,
        compatible: report.compatible,
        status,
        issues: report.issues.length,
        warnings: report.warnings.length,
      };
    }

    return matrix;
  }

  /**
   * Extract API name from change description
   */
  private extractName(change: string): string {
    // Simple extraction - would be more sophisticated in production
    const match = change.match(/([A-Za-z]+\.[A-Za-z]+\(\))/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Format compatibility report as human-readable text
   */
  formatReport(report: CompatibilityReport): string {
    const lines: string[] = [];

    lines.push(`Compatibility Report: ${report.plugin}`);
    lines.push(`Plugin Version: ${report.pluginVersion}`);
    lines.push(`Claude Code Version: ${report.claudeCodeVersion}`);
    lines.push(`Status: ${report.compatible ? '✓ Compatible' : '✗ Incompatible'}`);
    lines.push('');

    if (report.issues.length > 0) {
      lines.push('Issues:');
      for (const issue of report.issues) {
        lines.push(`  ✗ [${issue.type}] ${issue.message}`);
        if (issue.details) {
          lines.push(`    ${issue.details}`);
        }
      }
      lines.push('');
    }

    if (report.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of report.warnings) {
        lines.push(`  ⚠ [${warning.type}] ${warning.message}`);
        if (warning.details) {
          lines.push(`    ${warning.details}`);
        }
      }
      lines.push('');
    }

    if (report.suggestions.length > 0) {
      lines.push('Suggestions:');
      for (const suggestion of report.suggestions) {
        lines.push(`  • ${suggestion}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format compatibility matrix as table
   */
  formatMatrix(matrix: CompatibilityMatrix): string {
    const lines: string[] = [];

    lines.push(`Claude Code Version: ${matrix.claudeCodeVersion}`);
    lines.push('');
    lines.push('Plugin Compatibility Matrix:');
    lines.push('─'.repeat(80));
    lines.push(
      `${'Plugin'.padEnd(30)} ${'Version'.padEnd(12)} ${'Status'.padEnd(15)} ${'Issues/Warnings'.padEnd(15)}`
    );
    lines.push('─'.repeat(80));

    for (const [name, info] of Object.entries(matrix.plugins)) {
      const statusIcon =
        info.status === 'compatible' ? '✓' : info.status === 'warning' ? '⚠' : '✗';
      const issueWarning = `${info.issues}/${info.warnings}`;

      lines.push(
        `${name.padEnd(30)} ${info.version.padEnd(12)} ${`${statusIcon} ${info.status}`.padEnd(15)} ${issueWarning.padEnd(15)}`
      );
    }

    lines.push('─'.repeat(80));
    lines.push('');
    lines.push(`Summary:`);
    lines.push(`  Total: ${matrix.summary.total}`);
    lines.push(`  Compatible: ${matrix.summary.compatible}`);
    lines.push(`  Warnings: ${matrix.summary.warnings}`);
    lines.push(`  Incompatible: ${matrix.summary.incompatible}`);

    return lines.join('\n');
  }
}

// Export singleton instance
export const compatibilityChecker = new CompatibilityChecker();
