import { QdrantClient } from '@qdrant/js-client-rest'

export interface EmbeddingResult {
  chunkId: string
  embedding: number[]
  metadata: {
    text: string
    model: string
    generatedAt: Date
  }
}

export interface EmbeddingOptions {
  model?: string
  batchSize?: number
  retryAttempts?: number
}

export class EmbeddingService {
  private qdrant: QdrantClient
  private defaultModel = 'qwen3-embedding:4b' // Local embedding model
  private collectionName = 'content_embeddings'

  constructor(qdrantClient?: QdrantClient) {
    this.qdrant = qdrantClient || new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    })
  }

  /**
   * Generate embeddings for text chunks
   * @param chunks Array of text chunks with IDs
   * @param options Embedding options
   * @returns Array of embedding results
   */
  async generateEmbeddings(
    chunks: Array<{ id: string; text: string }>,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const { model = this.defaultModel, batchSize = 10, retryAttempts = 3 } = options

    const results: EmbeddingResult[] = []

    // Process in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const batchResults = await this.processBatch(batch, model, retryAttempts)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Process a batch of chunks
   */
  private async processBatch(
    chunks: Array<{ id: string; text: string }>,
    model: string,
    retryAttempts: number
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []

    for (const chunk of chunks) {
      let embedding: number[] | null = null
      let attempts = 0

      while (!embedding && attempts < retryAttempts) {
        try {
          embedding = await this.generateSingleEmbedding(chunk.text, model)
        } catch (error) {
          attempts++
          console.warn(`Embedding generation failed for chunk ${chunk.id}, attempt ${attempts}:`, error)
          if (attempts >= retryAttempts) {
            console.error(`Failed to generate embedding for chunk ${chunk.id} after ${retryAttempts} attempts`)
            // Use zero vector as fallback
            embedding = new Array(2560).fill(0) // Updated to match actual embedding dimension
          }
        }
      }

      if (embedding) {
        results.push({
          chunkId: chunk.id,
          embedding,
          metadata: {
            text: chunk.text,
            model,
            generatedAt: new Date()
          }
        })
      }
    }

    return results
  }

  /**
   * Generate embedding for single text using Ollama
   */
  private async generateSingleEmbedding(text: string, model: string): Promise<number[]> {
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: text,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.embedding

    } catch (error) {
      console.error(`Failed to generate embedding for text: ${text.substring(0, 50)}...`, error)
      throw error
    }
  }


  /**
   * Store embeddings in vector database
   */
  async storeEmbeddings(embeddings: EmbeddingResult[]): Promise<void> {
    try {
      // Ensure collection exists
      await this.ensureCollection()

      // Prepare points for Qdrant
      const points = embeddings.map((emb, index) => ({
        id: emb.chunkId,
        vector: emb.embedding,
        payload: {
          text: emb.metadata.text,
          model: emb.metadata.model,
          generatedAt: emb.metadata.generatedAt.toISOString(),
          chunkId: emb.chunkId
        }
      }))

      // Upsert points
      await this.qdrant.upsert(this.collectionName, {
        wait: true,
        points
      })

    } catch (error) {
      console.error('Failed to store embeddings:', error)
      throw new Error('Embedding storage failed')
    }
  }

  /**
   * Search for similar embeddings
   */
  async searchEmbeddings(
    queryEmbedding: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    try {
      const searchResult = await this.qdrant.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true
      })

      return searchResult.map(hit => ({
        id: hit.id as string,
        score: hit.score,
        payload: hit.payload
      }))

    } catch (error) {
      console.error('Embedding search failed:', error)
      throw new Error('Search operation failed')
    }
  }

  /**
   * Ensure Qdrant collection exists
   */
  private async ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections()
      const exists = collections.collections.some(col => col.name === this.collectionName)

      if (!exists) {
        // Create collection
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: 2560, // Embedding dimension
            distance: 'Cosine'
          }
        })
      }
    } catch (error) {
      console.error('Failed to ensure collection:', error)
      throw error
    }
  }

  /**
   * Delete embeddings by chunk IDs
   */
  async deleteEmbeddings(chunkIds: string[]): Promise<void> {
    try {
      await this.qdrant.delete(this.collectionName, {
        wait: true,
        points: chunkIds
      })
    } catch (error) {
      console.error('Failed to delete embeddings:', error)
      throw new Error('Embedding deletion failed')
    }
  }

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<{ totalEmbeddings: number; collectionExists: boolean }> {
    try {
      const collections = await this.qdrant.getCollections()
      const exists = collections.collections.some(col => col.name === this.collectionName)

      if (!exists) {
        return { totalEmbeddings: 0, collectionExists: false }
      }

      const collectionInfo = await this.qdrant.getCollection(this.collectionName)
      return {
        totalEmbeddings: collectionInfo.points_count || 0,
        collectionExists: true
      }
    } catch (error) {
      console.error('Failed to get embedding stats:', error)
      return { totalEmbeddings: 0, collectionExists: false }
    }
  }
}

export const embeddingService = new EmbeddingService()