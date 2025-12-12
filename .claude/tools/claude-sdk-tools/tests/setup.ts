/**
 * @claude-sdk/tools - Test Setup
 * Global test configuration and utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test timeout
const TEST_TIMEOUT = 30000;

// Mock console for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Set longer timeout for integration tests
  // Suppress console output during tests unless DEBUG=true
  if (process.env.DEBUG !== 'true') {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
  }
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

beforeEach(() => {
  // Clear any test state between tests
});

afterEach(() => {
  // Cleanup after each test
});

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Generate random test data
   */
  randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  randomNumber(min: number = 0, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomEmail(): string {
    return `test_${this.randomString(8)}@example.com`;
  },

  /**
   * Wait for async operation
   */
  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Create mock context
   */
  createMockContext(toolName: string = 'test_tool') {
    return {
      toolName,
      timestamp: new Date(),
      requestId: `test_${Date.now()}`,
    };
  },

  /**
   * Assert tool result is successful
   */
  assertSuccess<T>(result: { success: boolean; data?: T; error?: unknown }): asserts result is { success: true; data: T } {
    if (!result.success) {
      throw new Error(`Expected success but got error: ${JSON.stringify(result.error)}`);
    }
  },

  /**
   * Assert tool result is failure
   */
  assertFailure(result: { success: boolean; error?: unknown }): asserts result is { success: false; error: unknown } {
    if (result.success) {
      throw new Error('Expected failure but got success');
    }
  },
};

export { TEST_TIMEOUT };
