/**
 * @claude-sdk/tools - Testing Tools Test Suite
 * Verification tests for all testing tools
 */

import { describe, it, expect } from 'vitest';
import { MockServerTool } from '../mock-server.js';
import { DataFakerTool } from '../data-faker.js';
import { AssertionHelperTool } from '../assertion-helper.js';
import { BenchmarkRunnerTool } from '../benchmark-runner.js';
import { SnapshotTesterTool } from '../snapshot-tester.js';

describe('Testing Tools', () => {
  describe('MockServerTool', () => {
    it('should configure mock routes', async () => {
      const result = await MockServerTool.execute({
        action: 'configure',
        routes: [
          {
            method: 'GET',
            pattern: '/api/test',
            matchMode: 'exact',
            response: {
              status: 200,
              body: { message: 'Hello' },
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data?.configured).toBe(1);
    });

    it('should match requests', async () => {
      await MockServerTool.execute({
        action: 'configure',
        routes: [
          {
            method: 'POST',
            pattern: '/api/users',
            matchMode: 'exact',
            response: {
              status: 201,
              body: { id: 1 },
            },
          },
        ],
      });

      const result = await MockServerTool.execute({
        action: 'match',
        method: 'POST',
        url: '/api/users',
      });

      expect(result.success).toBe(true);
      expect(result.data?.matched).toBe(true);
    });

    it('should record requests', async () => {
      await MockServerTool.execute({
        action: 'clear',
      });

      await MockServerTool.execute({
        action: 'configure',
        routes: [
          {
            method: 'GET',
            pattern: '/test',
            matchMode: 'exact',
            response: { status: 200, body: {} },
          },
        ],
      });

      await MockServerTool.execute({
        action: 'match',
        method: 'GET',
        url: '/test',
      });

      const result = await MockServerTool.execute({
        action: 'getRecorded',
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBeGreaterThan(0);
    });
  });

  describe('DataFakerTool', () => {
    it('should generate names', async () => {
      const result = await DataFakerTool.execute({
        type: 'name',
        count: 5,
        options: { locale: 'en' },
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(5);
      expect(Array.isArray(result.data?.data)).toBe(true);
    });

    it('should generate emails', async () => {
      const result = await DataFakerTool.execute({
        type: 'email',
        count: 3,
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(3);
      result.data?.data.forEach((email) => {
        expect(typeof email).toBe('string');
        expect(email).toContain('@');
      });
    });

    it('should generate UUIDs', async () => {
      const result = await DataFakerTool.execute({
        type: 'uuid',
        count: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
      result.data?.data.forEach((uuid) => {
        expect(typeof uuid).toBe('string');
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });

    it('should generate seeded data', async () => {
      const result1 = await DataFakerTool.execute({
        type: 'number',
        count: 10,
        options: { seed: 12345, min: 1, max: 100 },
      });

      const result2 = await DataFakerTool.execute({
        type: 'number',
        count: 10,
        options: { seed: 12345, min: 1, max: 100 },
      });

      expect(result1.data?.data).toEqual(result2.data?.data);
    });
  });

  describe('AssertionHelperTool', () => {
    it('should assert equality', async () => {
      const result = await AssertionHelperTool.execute({
        assertion: 'equal',
        actual: 42,
        expected: 42,
      });

      expect(result.success).toBe(true);
      expect(result.data?.passed).toBe(true);
    });

    it('should assert deep equality', async () => {
      const result = await AssertionHelperTool.execute({
        assertion: 'deepEqual',
        actual: { a: 1, b: { c: 2 } },
        expected: { a: 1, b: { c: 2 } },
      });

      expect(result.success).toBe(true);
      expect(result.data?.passed).toBe(true);
    });

    it('should assert contains', async () => {
      const result = await AssertionHelperTool.execute({
        assertion: 'contains',
        value: 'hello world',
        expected: 'world',
      });

      expect(result.success).toBe(true);
      expect(result.data?.passed).toBe(true);
    });

    it('should assert type', async () => {
      const result = await AssertionHelperTool.execute({
        assertion: 'typeOf',
        value: [],
        expectedType: 'array',
      });

      expect(result.success).toBe(true);
      expect(result.data?.passed).toBe(true);
    });

    it('should fail on inequality', async () => {
      const result = await AssertionHelperTool.execute({
        assertion: 'equal',
        actual: 42,
        expected: 43,
      });

      expect(result.success).toBe(true);
      expect(result.data?.passed).toBe(false);
      expect(result.data?.diff).toBeDefined();
    });
  });

  describe('BenchmarkRunnerTool', () => {
    it('should run benchmark', async () => {
      const result = await BenchmarkRunnerTool.execute({
        action: 'run',
        benchmark: {
          name: 'Simple addition',
          fn: 'return 1 + 1;',
          iterations: 100,
          warmup: 5,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Simple addition');
      expect(result.data?.min).toBeGreaterThan(0);
      expect(result.data?.mean).toBeGreaterThan(0);
    });

    it('should compare benchmarks', async () => {
      const result = await BenchmarkRunnerTool.execute({
        action: 'compare',
        benchmarks: [
          {
            name: 'Method A',
            fn: 'return 1 + 1;',
            iterations: 50,
          },
          {
            name: 'Method B',
            fn: 'return 2 * 1;',
            iterations: 50,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data?.benchmarks).toHaveLength(2);
      expect(result.data?.fastest).toBeDefined();
      expect(result.data?.slowest).toBeDefined();
    });
  });

  describe('SnapshotTesterTool', () => {
    it('should create snapshot', async () => {
      const result = await SnapshotTesterTool.execute({
        action: 'create',
        name: 'test-snapshot',
        data: { id: 1, name: 'Test' },
      });

      expect(result.success).toBe(true);
      expect(result.data?.created).toBe(true);
    });

    it('should compare matching snapshot', async () => {
      await SnapshotTesterTool.execute({
        action: 'create',
        name: 'match-test',
        data: { value: 42 },
      });

      const result = await SnapshotTesterTool.execute({
        action: 'compare',
        name: 'match-test',
        data: { value: 42 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.matches).toBe(true);
    });

    it('should detect snapshot mismatch', async () => {
      await SnapshotTesterTool.execute({
        action: 'create',
        name: 'mismatch-test',
        data: { value: 42 },
      });

      const result = await SnapshotTesterTool.execute({
        action: 'compare',
        name: 'mismatch-test',
        data: { value: 43 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.matches).toBe(false);
      expect(result.data?.diff).toBeDefined();
    });

    it('should update snapshot', async () => {
      await SnapshotTesterTool.execute({
        action: 'create',
        name: 'update-test',
        data: { version: 1 },
      });

      const result = await SnapshotTesterTool.execute({
        action: 'update',
        name: 'update-test',
        data: { version: 2 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(true);
    });

    it('should list snapshots', async () => {
      await SnapshotTesterTool.execute({
        action: 'clear',
      });

      await SnapshotTesterTool.execute({
        action: 'create',
        name: 'snapshot-1',
        data: {},
      });

      await SnapshotTesterTool.execute({
        action: 'create',
        name: 'snapshot-2',
        data: {},
      });

      const result = await SnapshotTesterTool.execute({
        action: 'list',
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
    });
  });
});
