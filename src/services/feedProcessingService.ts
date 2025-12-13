import { prisma } from './database/prisma'
import { embeddingService, EmbeddingResult } from './embedding/embeddingService'
import { textChunkingService, TextChunk } from './textChunkingService'
import { QdrantClient } from '@qdrant/js-client-rest'

export interface FeedItemChunk {
  id: string
  feedItemId: string
  chunkIndex: number
  content: string
  embedding?: number[]
  wordCount: number
  charCount: number
  startPosition: number
  endPosition: number
  createdAt: Date
}

export interface ProcessingResult {
  feedItemId: string
  chunksCreated: number
  embeddingsGenerated: number
  vectorsStored: number
  processingTime: number
  errors: string[]
}

export interface ProcessingStats {
  totalFeedItems: number
  processedItems: number
  failedItems: number
  totalChunks: number
  totalEmbeddings: number
  totalVectors: number
  processingTime: number
}

export class FeedProcessingService {
  private qdrant: QdrantClient
  private collectionName = 'feed_content_chunks'

  constructor(qdrantClient?: QdrantClient) {
    this.qdrant = qdrantClient || new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    })
  }

  /**
   * Generate a UUID v4 string
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Process a single feed item: chunk → embed → store
   */
  async processFeedItem(feedItemId: string): Promise<ProcessingResult> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      // Get feed item
      const feedItem = await prisma.feedItem.findUnique({
        where: { id: feedItemId },
        include: { feed: true }
      })

      if (!feedItem) {
        throw new Error(`Feed item ${feedItemId} not found`)
      }

      // Skip if already processed
      if (feedItem.isProcessed) {
        return {
          feedItemId,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          vectorsStored: 0,
          processingTime: Date.now() - startTime,
          errors: ['Already processed']
        }
      }

      // Get content to process
      const content = feedItem.content || feedItem.description || ''
      if (!content.trim()) {
        throw new Error('No content to process')
      }

      // Chunk the content
      const chunks = textChunkingService.chunkText(content, {
        chunkSize: 150, // Smaller chunks for feed items
        overlap: 30,
        minChunkSize: 25,
        preserveSentences: true
      })

      if (chunks.length === 0) {
        throw new Error('No chunks generated')
      }

      // Generate embeddings for chunks
      const embeddingChunks = chunks.map((chunk, index) => ({
        id: this.generateUUID(),
        text: chunk.text
      }))

      const embeddings = await embeddingService.generateEmbeddings(embeddingChunks)

      // Store embeddings in Qdrant
      await this.storeEmbeddingsInQdrant(feedItem, embeddings, chunks)

      // Update feed item as processed
      await prisma.feedItem.update({
        where: { id: feedItemId },
        data: {
          isProcessed: true
        }
      })

      return {
        feedItemId,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddings.length,
        vectorsStored: embeddings.length,
        processingTime: Date.now() - startTime,
        errors
      }

    } catch (error) {
      console.error(`Error processing feed item ${feedItemId}:`, error)
      errors.push(error instanceof Error ? error.message : 'Unknown error')

      return {
        feedItemId,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        vectorsStored: 0,
        processingTime: Date.now() - startTime,
        errors
      }
    }
  }

  /**
   * Process multiple feed items in batch
   */
  async processFeedItems(feedItemIds: string[], batchSize = 5): Promise<ProcessingStats> {
    const startTime = Date.now()
    const results: ProcessingResult[] = []

    console.log(`Processing ${feedItemIds.length} feed items in batches of ${batchSize}`)

    // Process in batches
    for (let i = 0; i < feedItemIds.length; i += batchSize) {
      const batch = feedItemIds.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(feedItemIds.length / batchSize)}`)

      const batchPromises = batch.map(id => this.processFeedItem(id))
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < feedItemIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Calculate stats
    const stats: ProcessingStats = {
      totalFeedItems: feedItemIds.length,
      processedItems: results.filter(r => r.errors.length === 0).length,
      failedItems: results.filter(r => r.errors.length > 0).length,
      totalChunks: results.reduce((sum, r) => sum + r.chunksCreated, 0),
      totalEmbeddings: results.reduce((sum, r) => sum + r.embeddingsGenerated, 0),
      totalVectors: results.reduce((sum, r) => sum + r.vectorsStored, 0),
      processingTime: Date.now() - startTime
    }

    console.log('Processing completed:', stats)
    return stats
  }

  /**
   * Process all unprocessed feed items
   */
  async processAllUnprocessedFeedItems(batchSize = 5): Promise<ProcessingStats> {
    const unprocessedItems = await prisma.feedItem.findMany({
      where: { isProcessed: false },
      select: { id: true }
    })

    const feedItemIds = unprocessedItems.map(item => item.id)
    console.log(`Found ${feedItemIds.length} unprocessed feed items`)

    return this.processFeedItems(feedItemIds, batchSize)
  }


  /**
   * Store embeddings in Qdrant with metadata
   */
  private async storeEmbeddingsInQdrant(feedItem: any, embeddings: EmbeddingResult[], chunks: any[]): Promise<void> {
    // Ensure collection exists
    await this.ensureQdrantCollection()

    // Prepare points for Qdrant
    const points = embeddings.map((emb, index) => {
      const chunk = chunks[index]
      return {
        id: emb.chunkId,
        vector: emb.embedding,
        payload: {
          feedItemId: feedItem.id,
          feedId: feedItem.feedId,
          title: feedItem.title,
          content: emb.metadata.text,
          url: feedItem.link,
          publishedAt: feedItem.publishedAt?.toISOString(),
          author: feedItem.author,
          feedTitle: feedItem.feed.title,
          chunkIndex: index,
          wordCount: chunk.wordCount,
          charCount: chunk.charCount,
          startPosition: chunk.startIndex,
          endPosition: chunk.endIndex,
          generatedAt: emb.metadata.generatedAt.toISOString()
        }
      }
    })

    // Store in Qdrant
    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points
    })
  }

  /**
   * Ensure Qdrant collection exists with correct configuration
   */
  private async ensureQdrantCollection(): Promise<void> {
    try {
      const collections = await this.qdrant.getCollections()
      const exists = collections.collections.some(col => col.name === this.collectionName)

      if (exists) {
        // Check if collection has correct vector size
        const collectionInfo = await this.qdrant.getCollection(this.collectionName)
        const currentSize = collectionInfo.config?.params?.vectors?.size

        if (currentSize !== 2560) {
          console.log(`Recreating collection ${this.collectionName} with correct vector size (was ${currentSize}, now 2560)`)
          await this.qdrant.deleteCollection(this.collectionName)
          await this.qdrant.createCollection(this.collectionName, {
            vectors: {
              size: 2560,
              distance: 'Cosine'
            }
          })
        }
      } else {
        console.log(`Creating Qdrant collection: ${this.collectionName}`)
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: 2560,
            distance: 'Cosine'
          }
        })
      }
    } catch (error) {
      console.error('Failed to ensure Qdrant collection:', error)
      throw error
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalFeedItems: number
    processedItems: number
    unprocessedItems: number
    totalChunks: number
    qdrantStats: any
  }> {
    const [totalFeedItems, processedItems] = await Promise.all([
      prisma.feedItem.count(),
      prisma.feedItem.count({ where: { isProcessed: true } })
    ])

    const totalChunks = await prisma.contentChunk.count()

    let qdrantStats = null
    try {
      const collectionInfo = await this.qdrant.getCollection(this.collectionName)
      qdrantStats = {
        vectorsCount: collectionInfo.points_count || 0,
        collectionExists: true
      }
    } catch (error) {
      qdrantStats = { collectionExists: false, error: 'Collection not found' }
    }

    return {
      totalFeedItems,
      processedItems,
      unprocessedItems: totalFeedItems - processedItems,
      totalChunks,
      qdrantStats
    }
  }

  /**
   * Search feed content using embeddings
   */
  async searchFeedContent(query: string, limit = 10): Promise<any[]> {
    // Generate embedding for query
    const queryEmbeddings = await embeddingService.generateEmbeddings([{
      id: 'query',
      text: query
    }])

    if (queryEmbeddings.length === 0) {
      throw new Error('Failed to generate query embedding')
    }

    // Search in Qdrant
    const results = await embeddingService.searchEmbeddings(
      queryEmbeddings[0].embedding,
      limit,
      0.3 // Lower threshold for broader results
    )

    return results
  }
}

export const feedProcessingService = new FeedProcessingService()