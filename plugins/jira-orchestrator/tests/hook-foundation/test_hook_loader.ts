/**
 * Tests for Hook Loader
 *
 * @module test_hook_loader
 */

import * as path from 'path';
import * as assert from 'assert';
import {
  loadHooks,
  validateHookConfig,
  validateMatcherPatterns,
  validateScripts,
  resolveScriptPath,
  getHooksForEvent,
  shouldTriggerHook,
  HookValidationError,
  HookScriptError,
} from '../../lib/hook-loader';

describe('Hook Loader', () => {
  const pluginRoot = path.resolve(__dirname, '../..');
  const hooksPath = path.join(pluginRoot, 'hooks', 'hooks.json');

  describe('loadHooks', () => {
    it('should load and validate hooks.json', () => {
      const config = loadHooks(hooksPath);
      assert.ok(config);
      assert.ok(config.UserPromptSubmit || config.PostToolUse || config.PreToolUse);
    });

    it('should throw on non-existent file', () => {
      assert.throws(() => {
        loadHooks('/nonexistent/path/hooks.json');
      }, Error);
    });
  });

  describe('validateHookConfig', () => {
    it('should validate correct hook configuration', () => {
      const validConfig = {
        UserPromptSubmit: [
          {
            name: 'test-hook',
            description: 'Test hook description',
            type: 'prompt',
            timeout: 5000,
            prompt: 'Test prompt content',
          },
        ],
      };

      const result = validateHookConfig(validConfig);
      assert.ok(result);
    });

    it('should reject hook with invalid name format', () => {
      const invalidConfig = {
        UserPromptSubmit: [
          {
            name: 'InvalidName',  // Should be kebab-case
            description: 'Test hook',
            type: 'prompt',
            timeout: 5000,
            prompt: 'Test',
          },
        ],
      };

      assert.throws(() => {
        validateHookConfig(invalidConfig);
      }, HookValidationError);
    });

    it('should reject prompt hook without prompt field', () => {
      const invalidConfig = {
        UserPromptSubmit: [
          {
            name: 'test-hook',
            description: 'Test hook',
            type: 'prompt',
            timeout: 5000,
            // Missing prompt field
          },
        ],
      };

      assert.throws(() => {
        validateHookConfig(invalidConfig);
      }, HookValidationError);
    });

    it('should reject command hook without command field', () => {
      const invalidConfig = {
        UserPromptSubmit: [
          {
            name: 'test-hook',
            description: 'Test hook',
            type: 'command',
            timeout: 5000,
            // Missing command field
          },
        ],
      };

      assert.throws(() => {
        validateHookConfig(invalidConfig);
      }, HookValidationError);
    });
  });

  describe('validateMatcherPatterns', () => {
    it('should accept valid regex patterns', () => {
      const config = {
        UserPromptSubmit: [
          {
            name: 'test-hook',
            description: 'Test hook',
            type: 'prompt',
            matcher: '\\b[A-Z]{2,10}-\\d+\\b',
            timeout: 5000,
            prompt: 'Test',
          },
        ],
      };

      assert.doesNotThrow(() => {
        validateMatcherPatterns(config);
      });
    });

    it('should reject invalid regex patterns', () => {
      const config = {
        UserPromptSubmit: [
          {
            name: 'test-hook',
            description: 'Test hook',
            type: 'prompt',
            matcher: '[invalid(regex',  // Invalid regex
            timeout: 5000,
            prompt: 'Test',
          },
        ],
      };

      assert.throws(() => {
        validateMatcherPatterns(config);
      }, HookValidationError);
    });
  });

  describe('getHooksForEvent', () => {
    it('should retrieve hooks for specific event type', () => {
      const config = loadHooks(hooksPath);
      const hooks = getHooksForEvent(config, 'UserPromptSubmit');
      assert.ok(Array.isArray(hooks));
    });

    it('should return empty array for event with no hooks', () => {
      const config = {};
      const hooks = getHooksForEvent(config, 'UserPromptSubmit');
      assert.strictEqual(hooks.length, 0);
    });
  });

  describe('shouldTriggerHook', () => {
    it('should trigger hook without matcher', () => {
      const hook = {
        name: 'test-hook',
        description: 'Test',
        type: 'prompt' as const,
        timeout: 5000,
        prompt: 'Test',
      };

      assert.strictEqual(shouldTriggerHook(hook, 'anything'), true);
    });

    it('should trigger hook when pattern matches', () => {
      const hook = {
        name: 'test-hook',
        description: 'Test',
        type: 'prompt' as const,
        matcher: '\\bAI-\\d+\\b',
        timeout: 5000,
        prompt: 'Test',
      };

      assert.strictEqual(shouldTriggerHook(hook, 'Working on AI-123'), true);
    });

    it('should not trigger hook when pattern does not match', () => {
      const hook = {
        name: 'test-hook',
        description: 'Test',
        type: 'prompt' as const,
        matcher: '\\bAI-\\d+\\b',
        timeout: 5000,
        prompt: 'Test',
      };

      assert.strictEqual(shouldTriggerHook(hook, 'No issue here'), false);
    });
  });

  describe('resolveScriptPath - Path Traversal Protection', () => {
    it('should reject paths with .. traversal', () => {
      const basePath = '/plugins/jira-orchestrator';

      assert.throws(() => {
        resolveScriptPath('../../etc/passwd', basePath);
      }, HookValidationError);
    });

    it('should reject absolute Unix paths', () => {
      const basePath = '/plugins/jira-orchestrator';

      assert.throws(() => {
        resolveScriptPath('/etc/passwd', basePath);
      }, HookValidationError);
    });

    it('should reject absolute Windows paths', () => {
      if (process.platform === 'win32') {
        const basePath = 'C:\\plugins\\jira-orchestrator';

        assert.throws(() => {
          resolveScriptPath('C:\\Windows\\System32\\cmd.exe', basePath);
        }, HookValidationError);
      }
    });

    it('should allow valid relative paths within plugin root', () => {
      const basePath = '/plugins/jira-orchestrator';
      const scriptPath = 'scripts/test-hook.sh';

      assert.doesNotThrow(() => {
        const resolved = resolveScriptPath(scriptPath, basePath);
        assert.ok(resolved.includes('scripts/test-hook.sh'));
      });
    });

    it('should reject paths that escape plugin root via environment variables', () => {
      process.env.TEST_ESCAPE = '../../../etc';
      const basePath = '/plugins/jira-orchestrator';

      // Even with env var expansion, traversal should be rejected
      assert.throws(() => {
        resolveScriptPath('${TEST_ESCAPE}/passwd', basePath);
      }, HookValidationError);

      delete process.env.TEST_ESCAPE;
    });

    it('should allow safe environment variable expansion', () => {
      const basePath = '/plugins/jira-orchestrator';
      process.env.PLUGIN_SCRIPTS = 'scripts';

      assert.doesNotThrow(() => {
        const resolved = resolveScriptPath('${PLUGIN_SCRIPTS}/test.sh', basePath);
        assert.ok(resolved.includes('scripts/test.sh'));
      });

      delete process.env.PLUGIN_SCRIPTS;
    });
  });
});
