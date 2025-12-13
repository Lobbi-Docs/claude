/**
 * Unit tests for dependency resolution system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph, SemverResolver, ConflictResolver } from '../dependency-resolver.js';
import { VersionConflict } from '../types.js';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      graph.addNode('plugin-a', '1.0.0');
      const nodes = graph.getNodes();
      expect(nodes.has('plugin-a')).toBe(true);
      expect(nodes.get('plugin-a')?.version).toBe('1.0.0');
    });

    it('should throw error when adding duplicate node with different version', () => {
      graph.addNode('plugin-a', '1.0.0');
      expect(() => graph.addNode('plugin-a', '2.0.0')).toThrow();
    });

    it('should not throw when adding same node with same version', () => {
      graph.addNode('plugin-a', '1.0.0');
      expect(() => graph.addNode('plugin-a', '1.0.0')).not.toThrow();
    });
  });

  describe('addEdge', () => {
    it('should add a dependency edge', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '2.0.0');
      graph.addEdge('plugin-a', 'plugin-b', '^2.0.0');

      const edges = graph.getEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].from).toBe('plugin-a');
      expect(edges[0].to).toBe('plugin-b');
      expect(edges[0].versionRange).toBe('^2.0.0');
    });

    it('should throw error when from node does not exist', () => {
      expect(() => graph.addEdge('nonexistent', 'plugin-b', '1.0.0')).toThrow();
    });

    it('should update dependents when both nodes exist', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '2.0.0');
      graph.addEdge('plugin-a', 'plugin-b', '^2.0.0');

      const nodeB = graph.getNodes().get('plugin-b');
      expect(nodeB?.dependents.has('plugin-a')).toBe(true);
    });
  });

  describe('topological sort', () => {
    it('should return correct install order for simple dependency chain', () => {
      // C depends on B, B depends on A
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-c', '1.0.0');
      graph.addEdge('plugin-c', 'plugin-b', '1.0.0');
      graph.addEdge('plugin-b', 'plugin-a', '1.0.0');

      const order = graph.resolve();
      const indexA = order.indexOf('plugin-a');
      const indexB = order.indexOf('plugin-b');
      const indexC = order.indexOf('plugin-c');

      // A should come before B, B should come before C
      expect(indexA).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexC);
    });

    it('should handle diamond dependency pattern', () => {
      // D depends on B and C, both B and C depend on A
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-c', '1.0.0');
      graph.addNode('plugin-d', '1.0.0');
      graph.addEdge('plugin-b', 'plugin-a', '1.0.0');
      graph.addEdge('plugin-c', 'plugin-a', '1.0.0');
      graph.addEdge('plugin-d', 'plugin-b', '1.0.0');
      graph.addEdge('plugin-d', 'plugin-c', '1.0.0');

      const order = graph.resolve();
      const indexA = order.indexOf('plugin-a');
      const indexB = order.indexOf('plugin-b');
      const indexC = order.indexOf('plugin-c');
      const indexD = order.indexOf('plugin-d');

      // A should come before B and C, both should come before D
      expect(indexA).toBeLessThan(indexB);
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexD);
      expect(indexC).toBeLessThan(indexD);
    });

    it('should handle parallel dependencies', () => {
      // A and B have no dependencies, C depends on both
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-c', '1.0.0');
      graph.addEdge('plugin-c', 'plugin-a', '1.0.0');
      graph.addEdge('plugin-c', 'plugin-b', '1.0.0');

      const order = graph.resolve();
      const indexA = order.indexOf('plugin-a');
      const indexB = order.indexOf('plugin-b');
      const indexC = order.indexOf('plugin-c');

      // A and B should come before C
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
    });
  });

  describe('cycle detection', () => {
    it('should detect simple cycle', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addEdge('plugin-a', 'plugin-b', '1.0.0');
      graph.addEdge('plugin-b', 'plugin-a', '1.0.0');

      const cycles = graph.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].severity).toBe('error');
    });

    it('should detect indirect cycle', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-c', '1.0.0');
      graph.addEdge('plugin-a', 'plugin-b', '1.0.0');
      graph.addEdge('plugin-b', 'plugin-c', '1.0.0');
      graph.addEdge('plugin-c', 'plugin-a', '1.0.0');

      const cycles = graph.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should not detect cycles in acyclic graph', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-c', '1.0.0');
      graph.addEdge('plugin-c', 'plugin-b', '1.0.0');
      graph.addEdge('plugin-b', 'plugin-a', '1.0.0');

      const cycles = graph.detectCycles();
      expect(cycles).toHaveLength(0);
    });
  });

  describe('conflict detection', () => {
    it('should detect version conflicts', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-c', '2.0.0');
      graph.addNode('plugin-dep', '1.5.0');
      graph.addEdge('plugin-a', 'plugin-dep', '^1.0.0');
      graph.addEdge('plugin-b', 'plugin-dep', '^2.0.0');

      const conflicts = graph.getConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].pluginName).toBe('plugin-dep');
    });

    it('should not report conflicts for compatible versions', () => {
      graph.addNode('plugin-a', '1.0.0');
      graph.addNode('plugin-b', '1.0.0');
      graph.addNode('plugin-dep', '1.5.0');
      graph.addEdge('plugin-a', 'plugin-dep', '^1.0.0');
      graph.addEdge('plugin-b', 'plugin-dep', '^1.0.0');

      const conflicts = graph.getConflicts();
      expect(conflicts).toHaveLength(0);
    });
  });
});

describe('SemverResolver', () => {
  let resolver: SemverResolver;

  beforeEach(() => {
    resolver = new SemverResolver();
  });

  describe('exact version matching', () => {
    it('should match exact versions', () => {
      expect(resolver.satisfies('1.2.3', '1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.3', '1.2.4')).toBe(false);
    });
  });

  describe('caret (^) range', () => {
    it('should match compatible versions for ^1.2.3', () => {
      expect(resolver.satisfies('1.2.3', '^1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.4', '^1.2.3')).toBe(true);
      expect(resolver.satisfies('1.3.0', '^1.2.3')).toBe(true);
      expect(resolver.satisfies('2.0.0', '^1.2.3')).toBe(false);
      expect(resolver.satisfies('1.2.2', '^1.2.3')).toBe(false);
    });

    it('should match compatible versions for ^0.2.3', () => {
      expect(resolver.satisfies('0.2.3', '^0.2.3')).toBe(true);
      expect(resolver.satisfies('0.2.4', '^0.2.3')).toBe(true);
      expect(resolver.satisfies('0.3.0', '^0.2.3')).toBe(false);
      expect(resolver.satisfies('1.0.0', '^0.2.3')).toBe(false);
    });

    it('should match compatible versions for ^0.0.3', () => {
      expect(resolver.satisfies('0.0.3', '^0.0.3')).toBe(true);
      expect(resolver.satisfies('0.0.4', '^0.0.3')).toBe(false);
      expect(resolver.satisfies('0.1.0', '^0.0.3')).toBe(false);
    });
  });

  describe('tilde (~) range', () => {
    it('should match patch versions for ~1.2.3', () => {
      expect(resolver.satisfies('1.2.3', '~1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.4', '~1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.9', '~1.2.3')).toBe(true);
      expect(resolver.satisfies('1.3.0', '~1.2.3')).toBe(false);
      expect(resolver.satisfies('2.0.0', '~1.2.3')).toBe(false);
    });
  });

  describe('comparison operators', () => {
    it('should handle >= operator', () => {
      expect(resolver.satisfies('1.2.3', '>=1.2.0')).toBe(true);
      expect(resolver.satisfies('1.2.0', '>=1.2.0')).toBe(true);
      expect(resolver.satisfies('1.1.9', '>=1.2.0')).toBe(false);
    });

    it('should handle <= operator', () => {
      expect(resolver.satisfies('1.2.0', '<=1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.3', '<=1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.4', '<=1.2.3')).toBe(false);
    });

    it('should handle > operator', () => {
      expect(resolver.satisfies('1.2.4', '>1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.3', '>1.2.3')).toBe(false);
    });

    it('should handle < operator', () => {
      expect(resolver.satisfies('1.2.2', '<1.2.3')).toBe(true);
      expect(resolver.satisfies('1.2.3', '<1.2.3')).toBe(false);
    });
  });

  describe('wildcard (*)', () => {
    it('should match any version with *', () => {
      expect(resolver.satisfies('1.0.0', '*')).toBe(true);
      expect(resolver.satisfies('99.99.99', '*')).toBe(true);
      expect(resolver.satisfies('0.0.1', '*')).toBe(true);
    });

    it('should match any version with empty string', () => {
      expect(resolver.satisfies('1.0.0', '')).toBe(true);
    });
  });

  describe('OR operator (||)', () => {
    it('should match either range', () => {
      expect(resolver.satisfies('1.0.0', '^1.0.0 || ^2.0.0')).toBe(true);
      expect(resolver.satisfies('2.0.0', '^1.0.0 || ^2.0.0')).toBe(true);
      expect(resolver.satisfies('3.0.0', '^1.0.0 || ^2.0.0')).toBe(false);
    });
  });

  describe('maxSatisfying', () => {
    it('should return highest matching version', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
      expect(resolver.maxSatisfying(versions, '^1.0.0')).toBe('1.2.0');
      expect(resolver.maxSatisfying(versions, '>=1.1.0')).toBe('2.0.0');
      expect(resolver.maxSatisfying(versions, '~1.1.0')).toBe('1.1.0');
    });

    it('should return null when no version matches', () => {
      const versions = ['1.0.0', '1.1.0'];
      expect(resolver.maxSatisfying(versions, '^2.0.0')).toBeNull();
    });

    it('should handle empty version list', () => {
      expect(resolver.maxSatisfying([], '^1.0.0')).toBeNull();
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('resolveConflict', () => {
    it('should select highest compatible version with "highest" strategy', () => {
      const conflict: VersionConflict = {
        pluginName: 'test-plugin',
        requestedBy: [
          { requester: 'plugin-a', versionRange: '^1.0.0' },
          { requester: 'plugin-b', versionRange: '^1.1.0' },
        ],
        availableVersions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0'],
      };

      const result = resolver.resolveConflict(conflict, 'highest');
      expect(result).toBe('1.2.0');
    });

    it('should select lowest compatible version with "lowest" strategy', () => {
      const conflict: VersionConflict = {
        pluginName: 'test-plugin',
        requestedBy: [
          { requester: 'plugin-a', versionRange: '^1.0.0' },
          { requester: 'plugin-b', versionRange: '>=1.1.0' },
        ],
        availableVersions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0'],
      };

      const result = resolver.resolveConflict(conflict, 'lowest');
      expect(result).toBe('1.1.0');
    });

    it('should throw when no version satisfies all requirements', () => {
      const conflict: VersionConflict = {
        pluginName: 'test-plugin',
        requestedBy: [
          { requester: 'plugin-a', versionRange: '^1.0.0' },
          { requester: 'plugin-b', versionRange: '^2.0.0' },
        ],
        availableVersions: ['1.0.0', '1.5.0', '2.0.0', '2.5.0'],
      };

      expect(() => resolver.resolveConflict(conflict, 'highest')).toThrow();
    });

    it('should throw for prompt strategy', () => {
      const conflict: VersionConflict = {
        pluginName: 'test-plugin',
        requestedBy: [],
        availableVersions: ['1.0.0'],
      };

      expect(() => resolver.resolveConflict(conflict, 'prompt')).toThrow('Prompt strategy');
    });
  });

  describe('suggestResolution', () => {
    it('should provide resolution suggestions for conflicts', () => {
      const conflicts: VersionConflict[] = [
        {
          pluginName: 'plugin-a',
          requestedBy: [
            { requester: 'req-1', versionRange: '^1.0.0' },
            { requester: 'req-2', versionRange: '^1.1.0' },
          ],
          availableVersions: ['1.0.0', '1.1.0', '1.2.0'],
        },
      ];

      const suggestions = resolver.suggestResolution(conflicts);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].pluginName).toBe('plugin-a');
      expect(suggestions[0].recommendedVersion).toBe('1.2.0');
      expect(suggestions[0].alternatives).toContain('1.0.0');
      expect(suggestions[0].alternatives).toContain('1.1.0');
    });

    it('should handle multiple conflicts', () => {
      const conflicts: VersionConflict[] = [
        {
          pluginName: 'plugin-a',
          requestedBy: [{ requester: 'req-1', versionRange: '^1.0.0' }],
          availableVersions: ['1.0.0', '1.1.0'],
        },
        {
          pluginName: 'plugin-b',
          requestedBy: [{ requester: 'req-1', versionRange: '^2.0.0' }],
          availableVersions: ['2.0.0', '2.1.0'],
        },
      ];

      const suggestions = resolver.suggestResolution(conflicts);
      expect(suggestions).toHaveLength(2);
    });
  });
});
