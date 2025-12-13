/**
 * Code Scanner
 * Static security analysis for plugin code
 */

import {
  SecurityScanResult,
  PatternMatch,
  SecretMatch,
  ImportValidationResult,
} from './types.js';
import {
  SECRET_PATTERNS,
  ALLOWED_BUILTINS,
  BLOCKED_BUILTINS,
  ALLOWED_PACKAGES,
  BLOCKED_PACKAGES,
} from './security-policy.js';

/**
 * Scanner for detecting security issues in code
 */
export class CodeScanner {
  private dangerousPatterns: Array<{
    pattern: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> = [
    {
      pattern: /eval\s*\(/gi,
      severity: 'critical',
      description: 'Use of eval() - allows arbitrary code execution',
    },
    {
      pattern: /new\s+Function\s*\(/gi,
      severity: 'critical',
      description: 'Use of Function constructor - allows arbitrary code execution',
    },
    {
      pattern: /process\.env/gi,
      severity: 'high',
      description: 'Access to process.env - may expose secrets',
    },
    {
      pattern: /require\s*\(\s*['"][^'"]*['"]\s*\)/gi,
      severity: 'medium',
      description: 'Dynamic require - verify imported module',
    },
    {
      pattern: /child_process/gi,
      severity: 'critical',
      description: 'Use of child_process - allows shell execution',
    },
    {
      pattern: /exec\s*\(/gi,
      severity: 'critical',
      description: 'Use of exec() - allows shell command execution',
    },
    {
      pattern: /spawn\s*\(/gi,
      severity: 'high',
      description: 'Use of spawn() - allows process creation',
    },
    {
      pattern: /vm\.createContext/gi,
      severity: 'high',
      description: 'Use of vm.createContext - context manipulation',
    },
    {
      pattern: /vm\.runInNewContext/gi,
      severity: 'high',
      description: 'Use of vm.runInNewContext - arbitrary code execution',
    },
    {
      pattern: /__dirname/gi,
      severity: 'low',
      description: 'Use of __dirname - verify path usage',
    },
    {
      pattern: /__filename/gi,
      severity: 'low',
      description: 'Use of __filename - verify path usage',
    },
    {
      pattern: /\.\.\/\.\.\//g,
      severity: 'medium',
      description: 'Path traversal pattern detected',
    },
    {
      pattern: /document\.cookie/gi,
      severity: 'high',
      description: 'Access to document.cookie - potential XSS',
    },
    {
      pattern: /innerHTML\s*=/gi,
      severity: 'medium',
      description: 'Use of innerHTML - potential XSS',
    },
    {
      pattern: /dangerouslySetInnerHTML/gi,
      severity: 'medium',
      description: 'Use of dangerouslySetInnerHTML - potential XSS',
    },
  ];

  /**
   * Scan code for security issues
   */
  scanCode(code: string): SecurityScanResult {
    const dangerousPatterns = this.findDangerousPatterns(code);
    const secrets = this.scanForSecrets([{ path: 'code', content: code }]);
    const imports = this.extractImports(code);
    const importValidation = this.validateImports(code, ALLOWED_PACKAGES);

    // Calculate security score (0-100)
    const securityScore = this.calculateSecurityScore({
      passed: false,
      dangerousPatterns,
      importViolations: importValidation.blocked,
      secrets,
      securityScore: 0,
      recommendations: [],
    });

    const recommendations = this.generateRecommendations(
      dangerousPatterns,
      secrets,
      importValidation
    );

    return {
      passed: dangerousPatterns.length === 0 && secrets.length === 0,
      dangerousPatterns,
      importViolations: importValidation.blocked,
      secrets,
      securityScore,
      recommendations,
    };
  }

  /**
   * Find dangerous patterns in code
   */
  private findDangerousPatterns(code: string): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const lines = code.split('\n');

    for (const { pattern, severity, description } of this.dangerousPatterns) {
      lines.forEach((line, lineIndex) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          matches.push({
            pattern,
            match: match[0],
            line: lineIndex + 1,
            column: match.index + 1,
            severity,
            description,
          });
        }
      });
    }

    return matches;
  }

  /**
   * Scan for hardcoded secrets
   */
  scanForSecrets(
    files: Array<{ path: string; content: string }>
  ): SecretMatch[] {
    const secrets: SecretMatch[] = [];

    for (const file of files) {
      const lines = file.content.split('\n');

      for (const { type, pattern, description } of SECRET_PATTERNS) {
        lines.forEach((line, lineIndex) => {
          const regex = new RegExp(pattern.source, pattern.flags);
          let match: RegExpExecArray | null;

          while ((match = regex.exec(line)) !== null) {
            // Calculate confidence based on context
            const confidence = this.calculateSecretConfidence(line, match[0]);

            secrets.push({
              type,
              pattern: match[0].substring(0, 20) + '...[REDACTED]',
              file: file.path,
              line: lineIndex + 1,
              confidence,
            });
          }
        });
      }
    }

    return secrets;
  }

  /**
   * Calculate confidence level for secret detection
   */
  private calculateSecretConfidence(line: string, match: string): number {
    let confidence = 0.5;

    // Increase confidence if in assignment
    if (line.includes('=') || line.includes(':')) confidence += 0.2;

    // Increase confidence if contains key/token/password keywords
    if (/(?:key|token|secret|password|pwd)/i.test(line)) confidence += 0.2;

    // Decrease confidence if in comment
    if (line.trim().startsWith('//') || line.trim().startsWith('#'))
      confidence -= 0.3;

    // Decrease confidence if looks like example
    if (/(?:example|placeholder|xxx|dummy|test)/i.test(line)) confidence -= 0.4;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extract imports from code
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];

    // Match ES6 imports
    const es6ImportPattern = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = es6ImportPattern.exec(code)) !== null) {
      imports.push(match[1]);
    }

    // Match CommonJS requires
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requirePattern.exec(code)) !== null) {
      imports.push(match[1]);
    }

    // Match dynamic imports
    const dynamicImportPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportPattern.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * Validate imports against allowlist
   */
  validateImports(code: string, allowlist: Set<string>): ImportValidationResult {
    const imports = this.extractImports(code);
    const allowed: string[] = [];
    const blocked: string[] = [];
    const unknown: string[] = [];

    for (const imp of imports) {
      // Check if it's a built-in module
      if (this.isBuiltinModule(imp)) {
        if (BLOCKED_BUILTINS.has(imp)) {
          blocked.push(imp);
        } else if (ALLOWED_BUILTINS.has(imp)) {
          allowed.push(imp);
        } else {
          unknown.push(imp);
        }
        continue;
      }

      // Extract package name (handle scoped packages)
      const pkgName = this.extractPackageName(imp);

      if (BLOCKED_PACKAGES.has(pkgName)) {
        blocked.push(imp);
      } else if (allowlist.has(pkgName) || ALLOWED_PACKAGES.has(pkgName)) {
        allowed.push(imp);
      } else {
        unknown.push(imp);
      }
    }

    return {
      valid: blocked.length === 0,
      allowed,
      blocked,
      unknown,
    };
  }

  /**
   * Check if module is a Node.js built-in
   */
  private isBuiltinModule(moduleName: string): boolean {
    const builtins = new Set([
      ...ALLOWED_BUILTINS,
      ...BLOCKED_BUILTINS,
      'process',
      'os',
      'timers',
      'module',
    ]);
    return builtins.has(moduleName) || moduleName.startsWith('node:');
  }

  /**
   * Extract package name from import path
   */
  private extractPackageName(importPath: string): string {
    // Handle relative imports
    if (importPath.startsWith('.')) return importPath;

    // Handle scoped packages (@org/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.slice(0, 2).join('/');
    }

    // Regular package
    return importPath.split('/')[0];
  }

  /**
   * Calculate security score (0-100)
   */
  calculateSecurityScore(results: SecurityScanResult): number {
    let score = 100;

    // Deduct points for dangerous patterns
    for (const pattern of results.dangerousPatterns) {
      switch (pattern.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Deduct points for secrets
    for (const secret of results.secrets) {
      score -= secret.confidence * 20;
    }

    // Deduct points for import violations
    score -= results.importViolations.length * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    patterns: PatternMatch[],
    secrets: SecretMatch[],
    imports: ImportValidationResult
  ): string[] {
    const recommendations: string[] = [];

    if (patterns.length > 0) {
      recommendations.push(
        `Found ${patterns.length} dangerous pattern(s). Review and remove unsafe code.`
      );

      const critical = patterns.filter((p) => p.severity === 'critical');
      if (critical.length > 0) {
        recommendations.push(
          `CRITICAL: ${critical.length} critical security issue(s) must be fixed before deployment.`
        );
      }
    }

    if (secrets.length > 0) {
      recommendations.push(
        `Found ${secrets.length} potential secret(s). Move credentials to environment variables.`
      );
    }

    if (imports.blocked.length > 0) {
      recommendations.push(
        `Blocked imports detected: ${imports.blocked.join(', ')}. Remove or replace with safe alternatives.`
      );
    }

    if (imports.unknown.length > 0) {
      recommendations.push(
        `Unknown imports require review: ${imports.unknown.join(', ')}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Code passed security scan. No issues detected.');
    }

    return recommendations;
  }
}
