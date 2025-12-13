/**
 * Knowledge and RAG Tools for Ahling Command Center MCP Server
 * Provides Neo4j graph queries, Qdrant vector search, and RAG capabilities
 */

import { z } from 'zod';
import { getNeo4jClient } from '../../clients/neo4j.client.js';
import { getQdrantClient, QdrantSearchFilter } from '../../clients/qdrant.client.js';
import axios from 'axios';

/**
 * Tool Schemas
 */

const Neo4jQuerySchema = z.object({
  cypher: z.string().describe('Cypher query to execute'),
  parameters: z.record(z.unknown()).optional().describe('Query parameters'),
  database: z.string().optional().describe('Database name (default: neo4j)'),
  readOnly: z.boolean().optional().default(true).describe('Execute as read-only query')
});

const QdrantSearchSchema = z.object({
  collection: z.string().describe('Collection name to search'),
  queryVector: z.array(z.number()).describe('Query vector for similarity search'),
  limit: z.number().optional().default(10).describe('Maximum number of results'),
  filter: z.record(z.unknown()).optional().describe('Filter conditions'),
  withPayload: z.boolean().optional().default(true).describe('Include payload in results'),
  withVector: z.boolean().optional().default(false).describe('Include vectors in results'),
  scoreThreshold: z.number().optional().describe('Minimum similarity score threshold')
});

const RagQuerySchema = z.object({
  query: z.string().describe('Natural language query'),
  collection: z.string().describe('Qdrant collection to search'),
  limit: z.number().optional().default(5).describe('Number of documents to retrieve'),
  ollamaModel: z.string().optional().default('llama2').describe('Ollama model for generation'),
  ollamaUrl: z.string().optional().default('http://localhost:11434').describe('Ollama API URL'),
  embeddingModel: z.string().optional().default('nomic-embed-text').describe('Ollama embedding model'),
  systemPrompt: z.string().optional().describe('System prompt for RAG generation'),
  scoreThreshold: z.number().optional().describe('Minimum similarity score threshold')
});

const KnowledgeIngestSchema = z.object({
  text: z.string().describe('Text content to ingest'),
  collection: z.string().describe('Qdrant collection name'),
  metadata: z.record(z.unknown()).optional().describe('Metadata to attach to chunks'),
  chunkSize: z.number().optional().default(500).describe('Maximum characters per chunk'),
  chunkOverlap: z.number().optional().default(50).describe('Overlap between chunks'),
  embeddingModel: z.string().optional().default('nomic-embed-text').describe('Ollama embedding model'),
  ollamaUrl: z.string().optional().default('http://localhost:11434').describe('Ollama API URL'),
  storeInNeo4j: z.boolean().optional().default(false).describe('Also store chunks in Neo4j'),
  neo4jLabel: z.string().optional().default('Document').describe('Neo4j node label')
});

/**
 * Helper Functions
 */

/**
 * Generate embeddings using Ollama
 */
async function generateEmbedding(
  text: string,
  model: string = 'nomic-embed-text',
  ollamaUrl: string = 'http://localhost:11434'
): Promise<number[]> {
  try {
    const response = await axios.post(`${ollamaUrl}/api/embeddings`, {
      model,
      prompt: text
    });

    return response.data.embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate text using Ollama
 */
async function generateText(
  prompt: string,
  model: string = 'llama2',
  ollamaUrl: string = 'http://localhost:11434',
  systemPrompt?: string
): Promise<string> {
  try {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(`${ollamaUrl}/api/chat`, {
      model,
      messages,
      stream: false
    });

    return response.data.message.content;
  } catch (error) {
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk);
    startIndex = endIndex - overlap;

    if (startIndex >= text.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Tool Implementations
 */

/**
 * Execute Neo4j Cypher query
 */
export async function neo4jQuery(args: z.infer<typeof Neo4jQuerySchema>): Promise<any> {
  const neo4jClient = getNeo4jClient();

  const { cypher, parameters = {}, database, readOnly = true } = args;

  if (readOnly) {
    return await neo4jClient.query(cypher, parameters, { database });
  } else {
    return await neo4jClient.write(cypher, parameters, { database });
  }
}

/**
 * Search Qdrant vector database
 */
export async function qdrantSearch(args: z.infer<typeof QdrantSearchSchema>): Promise<any> {
  const qdrantClient = getQdrantClient();

  const {
    collection,
    queryVector,
    limit = 10,
    filter,
    withPayload = true,
    withVector = false,
    scoreThreshold
  } = args;

  return await qdrantClient.search({
    collection,
    queryVector,
    limit,
    filter: filter as QdrantSearchFilter,
    withPayload,
    withVector,
    scoreThreshold
  });
}

/**
 * RAG Query: Retrieve relevant documents and generate response
 */
export async function ragQuery(args: z.infer<typeof RagQuerySchema>): Promise<any> {
  const qdrantClient = getQdrantClient();

  const {
    query,
    collection,
    limit = 5,
    ollamaModel = 'llama2',
    ollamaUrl = 'http://localhost:11434',
    embeddingModel = 'nomic-embed-text',
    systemPrompt,
    scoreThreshold
  } = args;

  try {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, embeddingModel, ollamaUrl);

    // Step 2: Search for relevant documents in Qdrant
    const searchResults = await qdrantClient.search({
      collection,
      queryVector: queryEmbedding,
      limit,
      withPayload: true,
      scoreThreshold
    });

    if (searchResults.length === 0) {
      return {
        answer: 'No relevant documents found for your query.',
        sources: [],
        query
      };
    }

    // Step 3: Construct context from retrieved documents
    const context = searchResults
      .map((result, idx) => {
        const text = result.payload?.text || result.payload?.content || JSON.stringify(result.payload);
        return `[Document ${idx + 1}] (Score: ${result.score.toFixed(3)})\n${text}`;
      })
      .join('\n\n');

    // Step 4: Generate response using Ollama
    const ragPrompt = `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer the question based on the context provided above.`;

    const defaultSystemPrompt = 'You are a helpful assistant that answers questions based on the provided context. If the context does not contain enough information to answer the question, say so.';

    const answer = await generateText(
      ragPrompt,
      ollamaModel,
      ollamaUrl,
      systemPrompt || defaultSystemPrompt
    );

    return {
      answer,
      sources: searchResults.map(r => ({
        score: r.score,
        payload: r.payload,
        id: r.id
      })),
      query,
      context
    };
  } catch (error) {
    throw new Error(`RAG query failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ingest knowledge: Chunk text, generate embeddings, store in Qdrant (and optionally Neo4j)
 */
export async function knowledgeIngest(args: z.infer<typeof KnowledgeIngestSchema>): Promise<any> {
  const qdrantClient = getQdrantClient();

  const {
    text,
    collection,
    metadata = {},
    chunkSize = 500,
    chunkOverlap = 50,
    embeddingModel = 'nomic-embed-text',
    ollamaUrl = 'http://localhost:11434',
    storeInNeo4j = false,
    neo4jLabel = 'Document'
  } = args;

  try {
    // Step 1: Chunk the text
    const chunks = chunkText(text, chunkSize, chunkOverlap);

    // Step 2: Generate embeddings for each chunk
    const points = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const embedding = await generateEmbedding(chunk, embeddingModel, ollamaUrl);

        return {
          id: `${Date.now()}_${idx}`,
          vector: embedding,
          payload: {
            text: chunk,
            chunkIndex: idx,
            totalChunks: chunks.length,
            ...metadata
          }
        };
      })
    );

    // Step 3: Ensure collection exists
    const collectionExists = await qdrantClient.collectionExists(collection);

    if (!collectionExists && points.length > 0) {
      const firstPoint = points[0];
      await qdrantClient.createCollection(collection, {
        vectors: {
          size: firstPoint ? firstPoint.vector.length : 768,
          distance: 'Cosine'
        }
      });
    }

    // Step 4: Upsert points to Qdrant
    await qdrantClient.upsert(collection, points);

    // Step 5: Optionally store in Neo4j
    let neo4jResults = null;
    if (storeInNeo4j) {
      const neo4jClient = getNeo4jClient();

      const cypher = `
        UNWIND $chunks AS chunk
        CREATE (d:${neo4jLabel} {
          id: chunk.id,
          text: chunk.text,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          metadata: chunk.metadata,
          createdAt: datetime()
        })
        RETURN d
      `;

      neo4jResults = await neo4jClient.write(cypher, {
        chunks: points.map(p => ({
          id: p.id,
          text: p.payload.text,
          chunkIndex: p.payload.chunkIndex,
          totalChunks: p.payload.totalChunks,
          metadata: JSON.stringify(metadata)
        }))
      });
    }

    return {
      success: true,
      chunksProcessed: chunks.length,
      collection,
      pointIds: points.map(p => p.id),
      neo4jStored: storeInNeo4j,
      neo4jResults: neo4jResults ? neo4jResults.length : 0
    };
  } catch (error) {
    throw new Error(`Knowledge ingest failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Tool Definitions for MCP Server
 */
export const knowledgeTools = {
  neo4j_query: {
    description: 'Execute a Cypher query against Neo4j graph database',
    schema: Neo4jQuerySchema,
    handler: neo4jQuery
  },
  qdrant_search: {
    description: 'Search Qdrant vector database for similar vectors',
    schema: QdrantSearchSchema,
    handler: qdrantSearch
  },
  rag_query: {
    description: 'Retrieve relevant documents from Qdrant and generate an answer using Ollama (RAG)',
    schema: RagQuerySchema,
    handler: ragQuery
  },
  knowledge_ingest: {
    description: 'Ingest text content by chunking, embedding, and storing in Qdrant (and optionally Neo4j)',
    schema: KnowledgeIngestSchema,
    handler: knowledgeIngest
  }
};

export {
  Neo4jQuerySchema,
  QdrantSearchSchema,
  RagQuerySchema,
  KnowledgeIngestSchema
};
