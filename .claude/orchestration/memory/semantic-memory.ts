/**
 * Semantic Memory: Knowledge Graph and Facts
 *
 * Stores and manages facts as subject-predicate-object triples,
 * building a knowledge graph for entity relationships and insights.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Fact, EntityKnowledge, DatabaseConfig } from './types';

/**
 * Semantic Memory Manager
 */
export class SemanticMemory {
  private db: Database.Database;
  private namespace: string;

  constructor(config: DatabaseConfig) {
    this.db = new Database(config.dbPath);
    this.namespace = config.namespace || 'default';
  }

  /**
   * Extract facts from text using simple pattern matching
   *
   * In production, this would use NLP or LLM-based extraction
   */
  extractFacts(text: string, source: string = 'text'): Fact[] {
    const facts: Fact[] = [];

    // Simple pattern: "X is Y" -> (X, is, Y)
    const isPatterns = text.match(/(\w+(?:\s+\w+)*)\s+is\s+(\w+(?:\s+\w+)*)/gi);
    if (isPatterns) {
      for (const match of isPatterns) {
        const parts = match.split(/\s+is\s+/i);
        if (parts.length === 2) {
          facts.push({
            id: uuidv4(),
            subject: parts[0].trim(),
            predicate: 'is',
            object: parts[1].trim(),
            confidence: 0.7,
            source,
            timestamp: new Date(),
            confirmations: 1,
            contradictions: 0,
            tags: ['extracted', 'is-relation'],
          });
        }
      }
    }

    // Simple pattern: "X has Y" -> (X, has, Y)
    const hasPatterns = text.match(/(\w+(?:\s+\w+)*)\s+has\s+(\w+(?:\s+\w+)*)/gi);
    if (hasPatterns) {
      for (const match of hasPatterns) {
        const parts = match.split(/\s+has\s+/i);
        if (parts.length === 2) {
          facts.push({
            id: uuidv4(),
            subject: parts[0].trim(),
            predicate: 'has',
            object: parts[1].trim(),
            confidence: 0.7,
            source,
            timestamp: new Date(),
            confirmations: 1,
            contradictions: 0,
            tags: ['extracted', 'has-relation'],
          });
        }
      }
    }

    // Store extracted facts
    for (const fact of facts) {
      this.addFact(fact);
    }

    return facts;
  }

  /**
   * Add a fact to the knowledge graph
   */
  addFact(fact: Omit<Fact, 'id' | 'timestamp' | 'confirmations' | 'contradictions'>): string {
    const id = uuidv4();
    const timestamp = new Date();

    // Check if similar fact exists
    const existing = this.findSimilarFact(fact.subject, fact.predicate, fact.object);

    if (existing) {
      // Increase confirmations
      this.db.prepare(`
        UPDATE facts SET
          confirmations = confirmations + 1,
          confidence = (confidence * confirmations + ?) / (confirmations + 1)
        WHERE id = ?
      `).run(fact.confidence, existing.id);

      return existing.id;
    }

    // Insert new fact
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO facts (
          id, subject, predicate, object, confidence, source,
          timestamp, confirmations, contradictions, namespace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        fact.subject,
        fact.predicate,
        fact.object,
        fact.confidence,
        fact.source,
        timestamp.getTime(),
        1,
        0,
        this.namespace
      );

      // Add tags
      const tagStmt = this.db.prepare(`
        INSERT INTO fact_tags (fact_id, tag) VALUES (?, ?)
      `);

      for (const tag of fact.tags) {
        tagStmt.run(id, tag);
      }
    });

    transaction();

    return id;
  }

  /**
   * Find similar fact (same subject, predicate, object)
   */
  private findSimilarFact(subject: string, predicate: string, object: string): Fact | null {
    const stmt = this.db.prepare(`
      SELECT * FROM facts
      WHERE namespace = ?
        AND subject = ?
        AND predicate = ?
        AND object = ?
      LIMIT 1
    `);

    const result = stmt.get(this.namespace, subject, predicate, object) as any;

    if (!result) {
      return null;
    }

    return this.rowToFact(result);
  }

  /**
   * Convert database row to Fact
   */
  private rowToFact(row: any): Fact {
    const tags = this.db.prepare(`
      SELECT tag FROM fact_tags WHERE fact_id = ?
    `).all(row.id) as Array<{ tag: string }>;

    return {
      id: row.id,
      subject: row.subject,
      predicate: row.predicate,
      object: row.object,
      confidence: row.confidence,
      source: row.source,
      timestamp: new Date(row.timestamp),
      confirmations: row.confirmations,
      contradictions: row.contradictions,
      tags: tags.map((t) => t.tag),
    };
  }

  /**
   * Build relationship in knowledge graph
   */
  addRelationship(from: string, relation: string, to: string, confidence: number = 0.8): string {
    return this.addFact({
      subject: from,
      predicate: relation,
      object: to,
      confidence,
      source: 'manual',
      tags: ['relationship'],
    });
  }

  /**
   * Query entity knowledge
   *
   * Returns all facts about an entity and its relationships
   */
  queryEntity(entity: string): EntityKnowledge {
    // Get facts where entity is subject
    const factsAsSubject = this.db.prepare(`
      SELECT * FROM facts WHERE subject = ? AND namespace = ?
    `).all(entity, this.namespace) as any[];

    // Get facts where entity is object
    const factsAsObject = this.db.prepare(`
      SELECT * FROM facts WHERE object = ? AND namespace = ?
    `).all(entity, this.namespace) as any[];

    const allFacts = [...factsAsSubject, ...factsAsObject].map((row) => this.rowToFact(row));

    // Extract related entities
    const related = new Set<string>();
    for (const fact of factsAsSubject) {
      related.add(fact.object);
    }
    for (const fact of factsAsObject) {
      related.add(fact.subject);
    }

    // Infer entity type from "is" relationships
    const typeRelation = factsAsSubject.find((f) => f.predicate === 'is');
    const type = typeRelation ? typeRelation.object : undefined;

    // Calculate average confidence
    const avgConfidence = allFacts.length > 0
      ? allFacts.reduce((sum, f) => sum + f.confidence, 0) / allFacts.length
      : 0;

    return {
      entity,
      facts: allFacts,
      related: Array.from(related),
      type,
      confidence: avgConfidence,
    };
  }

  /**
   * Get all facts about a subject
   */
  getFactsAbout(subject: string): Fact[] {
    const stmt = this.db.prepare(`
      SELECT * FROM facts WHERE subject = ? AND namespace = ?
    `);

    const results = stmt.all(subject, this.namespace) as any[];
    return results.map((row) => this.rowToFact(row));
  }

  /**
   * Get facts by predicate (relationship type)
   */
  getFactsByRelation(predicate: string): Fact[] {
    const stmt = this.db.prepare(`
      SELECT * FROM facts WHERE predicate = ? AND namespace = ?
    `);

    const results = stmt.all(predicate, this.namespace) as any[];
    return results.map((row) => this.rowToFact(row));
  }

  /**
   * Update fact confidence
   */
  updateConfidence(factId: string, confidence: number): void {
    this.db.prepare(`
      UPDATE facts SET confidence = ? WHERE id = ?
    `).run(confidence, factId);
  }

  /**
   * Mark fact as contradicted
   */
  contradictFact(factId: string): void {
    this.db.prepare(`
      UPDATE facts SET contradictions = contradictions + 1 WHERE id = ?
    `).run(factId);
  }

  /**
   * Remove low-confidence facts
   */
  pruneLowConfidence(threshold: number = 0.3): number {
    const stmt = this.db.prepare(`
      DELETE FROM facts
      WHERE namespace = ? AND confidence < ?
    `);

    const result = stmt.run(this.namespace, threshold);
    return result.changes || 0;
  }

  /**
   * Get knowledge graph as triples
   */
  getKnowledgeGraph(options?: {
    subjects?: string[];
    predicates?: string[];
    minConfidence?: number;
    limit?: number;
  }): Array<{ subject: string; predicate: string; object: string; confidence: number }> {
    let sql = 'SELECT subject, predicate, object, confidence FROM facts WHERE namespace = ?';
    const params: any[] = [this.namespace];

    if (options?.subjects && options.subjects.length > 0) {
      sql += ` AND subject IN (${options.subjects.map(() => '?').join(',')})`;
      params.push(...options.subjects);
    }

    if (options?.predicates && options.predicates.length > 0) {
      sql += ` AND predicate IN (${options.predicates.map(() => '?').join(',')})`;
      params.push(...options.predicates);
    }

    if (options?.minConfidence !== undefined) {
      sql += ' AND confidence >= ?';
      params.push(options.minConfidence);
    }

    sql += ' ORDER BY confidence DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as any[];
  }

  /**
   * Sync knowledge graph to Obsidian vault
   *
   * Creates markdown files for entities and relationships
   */
  async syncToObsidian(vaultPath: string = process.env.OBSIDIAN_VAULT_PATH || ''): Promise<void> {
    if (!vaultPath) {
      console.warn('OBSIDIAN_VAULT_PATH not set, skipping sync');
      return;
    }

    const fs = require('fs');
    const path = require('path');

    const knowledgeDir = path.join(vaultPath, 'System', 'Knowledge-Graph');

    // Create directory if needed
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    // Get all unique subjects
    const subjects = this.db.prepare(`
      SELECT DISTINCT subject FROM facts WHERE namespace = ?
    `).all(this.namespace) as Array<{ subject: string }>;

    // Create markdown file for each entity
    for (const { subject } of subjects) {
      const knowledge = this.queryEntity(subject);

      const content = `---
entity: ${subject}
type: ${knowledge.type || 'unknown'}
confidence: ${knowledge.confidence.toFixed(2)}
last_updated: ${new Date().toISOString()}
---

# ${subject}

## Facts

${knowledge.facts.map((f) => `- **${f.predicate}**: ${f.object} (confidence: ${f.confidence.toFixed(2)})`).join('\n')}

## Related Entities

${knowledge.related.map((r) => `- [[${r}]]`).join('\n')}

## Graph

\`\`\`mermaid
graph LR
  ${knowledge.facts.map((f) => `  ${subject}[${subject}] -->|${f.predicate}| ${f.object}[${f.object}]`).join('\n')}
\`\`\`
`;

      const filename = path.join(knowledgeDir, `${subject.replace(/[^a-zA-Z0-9]/g, '-')}.md`);
      fs.writeFileSync(filename, content);
    }

    console.log(`Synced ${subjects.length} entities to Obsidian`);
  }

  /**
   * Search facts by text
   */
  searchFacts(query: string, limit: number = 10): Fact[] {
    const stmt = this.db.prepare(`
      SELECT f.* FROM facts_fts fts
      JOIN facts f ON fts.rowid = f.rowid
      WHERE fts MATCH ? AND f.namespace = ?
      ORDER BY bm25(fts.rowid) DESC
      LIMIT ?
    `);

    const results = stmt.all(query, this.namespace, limit) as any[];
    return results.map((row) => this.rowToFact(row));
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalFacts: number;
    uniqueSubjects: number;
    uniquePredicates: number;
    uniqueObjects: number;
    avgConfidence: number;
  } {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalFacts,
        COUNT(DISTINCT subject) as uniqueSubjects,
        COUNT(DISTINCT predicate) as uniquePredicates,
        COUNT(DISTINCT object) as uniqueObjects,
        AVG(confidence) as avgConfidence
      FROM facts
      WHERE namespace = ?
    `).get(this.namespace) as any;

    return stats;
  }
}
