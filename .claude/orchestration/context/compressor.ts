/**
 * Content Compressor - Multiple compression strategies for context optimization
 *
 * Strategies:
 * - Summarization: LLM-based summarization of older content
 * - Minification: Remove comments, whitespace from code/JSON
 * - Deduplication: Replace repeated content with references
 * - Reference: Store content once, use ref IDs
 * - Truncation: Smart truncation with preserved important sections
 */

import { createHash } from 'crypto';
import { TokenCounter, createTokenCounter } from './token-counter';
import {
  CompressionResult,
  BatchCompressionResult,
  CompressionAlgorithm,
  OptimizationStrategy,
  ContentType,
} from './types';

/**
 * Compressor class
 */
export class Compressor {
  private tokenCounter: TokenCounter;
  private referenceStore = new Map<string, { refId: string; content: string; tokens: number }>();

  constructor(tokenCounter?: TokenCounter) {
    this.tokenCounter = tokenCounter || createTokenCounter();
  }

  /**
   * Compress content using specified algorithm
   */
  async compress(
    content: string,
    algorithm: CompressionAlgorithm,
    contentType: ContentType = 'mixed'
  ): Promise<CompressionResult> {
    const originalTokens = this.tokenCounter.count(content, contentType).total;

    let compressed: string;
    let quality: number;

    switch (algorithm) {
      case 'minification':
        ({ compressed, quality } = this.minify(content, contentType));
        break;
      case 'deduplication':
        ({ compressed, quality } = this.deduplicate(content));
        break;
      case 'reference':
        ({ compressed, quality } = this.createReference(content));
        break;
      case 'truncation':
        ({ compressed, quality } = this.truncate(content, 0.5)); // 50% reduction
        break;
      case 'summarization':
        ({ compressed, quality } = await this.summarize(content));
        break;
      default:
        compressed = content;
        quality = 1.0;
    }

    const compressedTokens = this.tokenCounter.count(compressed, contentType).total;
    const tokensSaved = originalTokens - compressedTokens;
    const compressionRatio = compressedTokens / originalTokens;

    return {
      original: content,
      compressed,
      originalTokens,
      compressedTokens,
      tokensSaved,
      compressionRatio,
      quality,
      algorithm,
    };
  }

  /**
   * Compress multiple items in batch
   */
  async compressBatch(
    contents: string[],
    algorithm: CompressionAlgorithm,
    contentTypes?: ContentType[]
  ): Promise<BatchCompressionResult> {
    const results: CompressionResult[] = [];

    for (let i = 0; i < contents.length; i++) {
      const contentType = contentTypes?.[i] || 'mixed';
      const result = await this.compress(contents[i], algorithm, contentType);
      results.push(result);
    }

    const totalOriginalTokens = results.reduce((sum, r) => sum + r.originalTokens, 0);
    const totalCompressedTokens = results.reduce((sum, r) => sum + r.compressedTokens, 0);
    const totalTokensSaved = totalOriginalTokens - totalCompressedTokens;
    const averageCompressionRatio = totalCompressedTokens / totalOriginalTokens;
    const averageQuality = results.reduce((sum, r) => sum + r.quality, 0) / results.length;

    return {
      results,
      totalOriginalTokens,
      totalCompressedTokens,
      totalTokensSaved,
      averageCompressionRatio,
      averageQuality,
    };
  }

  /**
   * Apply strategy-based compression
   */
  async applyStrategy(
    content: string,
    strategy: OptimizationStrategy,
    contentType: ContentType = 'mixed'
  ): Promise<CompressionResult> {
    switch (strategy) {
      case 'aggressive':
        return this.compressAggressive(content, contentType);
      case 'balanced':
        return this.compressBalanced(content, contentType);
      case 'conservative':
        return this.compressConservative(content, contentType);
      default:
        return this.compress(content, 'minification', contentType);
    }
  }

  /**
   * Aggressive compression (maximum savings, may lose nuance)
   */
  private async compressAggressive(
    content: string,
    contentType: ContentType
  ): Promise<CompressionResult> {
    // Chain multiple algorithms
    let result = await this.compress(content, 'minification', contentType);
    result = await this.compress(result.compressed, 'deduplication', contentType);
    result = await this.compress(result.compressed, 'truncation', contentType);

    return {
      ...result,
      original: content,
      quality: 0.6, // Aggressive = lower quality
    };
  }

  /**
   * Balanced compression (good savings with quality preservation)
   */
  private async compressBalanced(
    content: string,
    contentType: ContentType
  ): Promise<CompressionResult> {
    // Apply minification + smart deduplication
    let result = await this.compress(content, 'minification', contentType);
    result = await this.compress(result.compressed, 'deduplication', contentType);

    return {
      ...result,
      original: content,
      quality: 0.8, // Balanced = good quality
    };
  }

  /**
   * Conservative compression (minimal compression, preserve everything)
   */
  private async compressConservative(
    content: string,
    contentType: ContentType
  ): Promise<CompressionResult> {
    // Only apply safe minification
    const result = await this.compress(content, 'minification', contentType);

    return {
      ...result,
      quality: 0.95, // Conservative = high quality
    };
  }

  /**
   * Minify content (remove whitespace, comments)
   */
  private minify(content: string, contentType: ContentType): { compressed: string; quality: number } {
    let compressed = content;

    if (contentType === 'code') {
      // Remove single-line comments
      compressed = compressed.replace(/\/\/.*$/gm, '');
      // Remove multi-line comments
      compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '');
      // Reduce multiple whitespaces
      compressed = compressed.replace(/\s+/g, ' ');
    } else if (contentType === 'json') {
      try {
        // Minify JSON
        const parsed = JSON.parse(content);
        compressed = JSON.stringify(parsed);
      } catch {
        // Not valid JSON, fallback to whitespace reduction
        compressed = compressed.replace(/\s+/g, ' ');
      }
    } else {
      // Reduce excessive whitespace for prose
      compressed = compressed.replace(/\n{3,}/g, '\n\n');
      compressed = compressed.replace(/  +/g, ' ');
    }

    return {
      compressed: compressed.trim(),
      quality: 0.95, // Minification preserves information well
    };
  }

  /**
   * Deduplicate content (replace repeated sections)
   */
  private deduplicate(content: string): { compressed: string; quality: number } {
    // Simple deduplication: find repeated lines
    const lines = content.split('\n');
    const seen = new Map<string, string>();
    const compressed: string[] = [];
    let refCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 20) {
        // Too short to deduplicate
        compressed.push(line);
        continue;
      }

      if (seen.has(trimmed)) {
        // Repeated line, use reference
        compressed.push(`[REF:${seen.get(trimmed)}]`);
      } else {
        // New line, store and use
        const refId = `D${refCount++}`;
        seen.set(trimmed, refId);
        compressed.push(line);
      }
    }

    return {
      compressed: compressed.join('\n'),
      quality: 0.9,
    };
  }

  /**
   * Create reference for content
   */
  private createReference(content: string): { compressed: string; quality: number } {
    const hash = createHash('sha256').update(content).digest('hex');
    const refId = `REF:${hash.substring(0, 12)}`;

    // Store in reference store
    const tokens = this.tokenCounter.count(content).total;
    this.referenceStore.set(refId, { refId, content, tokens });

    return {
      compressed: refId,
      quality: 1.0, // No information loss, can be fully restored
    };
  }

  /**
   * Smart truncation (keep important parts)
   */
  private truncate(content: string, targetRatio: number): { compressed: string; quality: number } {
    const lines = content.split('\n');
    const targetLines = Math.floor(lines.length * targetRatio);

    if (targetLines >= lines.length) {
      return { compressed: content, quality: 1.0 };
    }

    // Keep first 30% and last 30%, summarize middle
    const keepStart = Math.floor(targetLines * 0.3);
    const keepEnd = Math.floor(targetLines * 0.3);
    const start = lines.slice(0, keepStart);
    const end = lines.slice(-keepEnd);

    const compressed = [
      ...start,
      `\n... [${lines.length - targetLines} lines truncated] ...\n`,
      ...end,
    ].join('\n');

    return {
      compressed,
      quality: 0.5, // Moderate quality loss
    };
  }

  /**
   * Summarize content using LLM (placeholder - would call actual LLM)
   */
  private async summarize(content: string): Promise<{ compressed: string; quality: number }> {
    // This would call an actual LLM API in production
    // For now, return a placeholder summary

    const lines = content.split('\n');
    const summary = `[SUMMARY: ${lines.length} lines of content]\nKey points:\n- ${lines
      .slice(0, 3)
      .join('\n- ')}`;

    return {
      compressed: summary,
      quality: 0.7, // Summaries lose some detail
    };
  }

  /**
   * Get reference content by ID
   */
  resolveReference(refId: string): string | undefined {
    return this.referenceStore.get(refId)?.content;
  }

  /**
   * Get all references
   */
  getAllReferences(): Map<string, { refId: string; content: string; tokens: number }> {
    return new Map(this.referenceStore);
  }

  /**
   * Clear reference store
   */
  clearReferences(): void {
    this.referenceStore.clear();
  }

  /**
   * Get reference store statistics
   */
  getReferenceStats() {
    const totalRefs = this.referenceStore.size;
    const totalTokens = Array.from(this.referenceStore.values()).reduce(
      (sum, ref) => sum + ref.tokens,
      0
    );

    return {
      count: totalRefs,
      totalTokens,
      averageTokens: totalRefs > 0 ? totalTokens / totalRefs : 0,
    };
  }
}

/**
 * Create a new compressor instance
 */
export function createCompressor(tokenCounter?: TokenCounter): Compressor {
  return new Compressor(tokenCounter);
}

/**
 * Export default instance
 */
export default createCompressor();
