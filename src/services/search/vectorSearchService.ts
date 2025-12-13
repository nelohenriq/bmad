import { embeddingService, EmbeddingResult } from '../embedding/embeddingService'
import { prisma } from '../database/prisma'

export interface SearchResult {
  chunkId: string
  contentId: string
  text: string
  score: number
  metadata: {
    model: string
    generatedAt: string
    chunkIndex: number
    wordCount: number
    charCount: number
  }
  contentInfo?: {
    title: string
    source: string
    publishedAt?: string
  }
}

export interface VectorSearchOptions {
  limit?: number
  scoreThreshold?: number
  includeContentInfo?: boolean
  filters?: {
    contentId?: string
    dateFrom?: Date
    dateTo?: Date
    wordCountMin?: number
    wordCountMax?: number
  }
}

export interface SemanticSearchOptions extends VectorSearchOptions {
  query: string
  generateEmbedding?: boolean // If true, generate embedding for query first
}

export class VectorSearchService {
  /**
   * Perform vector similarity search
   * @param queryEmbedding Query embedding vector
   * @param options Search options
   * @returns Ranked search results
   */
  async searchByVector(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      scoreThreshold = 0.0,
      includeContentInfo = false,
      filters = {}
    } = options

    try {
      // Search in vector database
      const vectorResults = await embeddingService.searchEmbeddings(
        queryEmbedding,
        limit * 2, // Get more results for filtering
        scoreThreshold
      )

      // Apply additional filters and enrich results
      let results: SearchResult[] = vectorResults.map(hit => ({
        chunkId: hit.id,
        contentId: '', // Will be populated from metadata
        text: hit.payload.text,
        score: hit.score,
        metadata: {
          model: hit.payload.model,
          generatedAt: hit.payload.generatedAt,
          chunkIndex: hit.payload.chunkId ? parseInt(hit.payload.chunkId.split('-').pop() || '0') : 0,
          wordCount: hit.payload.text.split(/\s+/).length,
          charCount: hit.payload.text.length
        }
      }))

      // Apply filters
      if (filters.contentId) {
        results = results.filter(r => r.contentId === filters.contentId)
      }

      if (filters.dateFrom || filters.dateTo) {
        results = results.filter(r => {
          const date = new Date(r.metadata.generatedAt)
          if (filters.dateFrom && date < filters.dateFrom) return false
          if (filters.dateTo && date > filters.dateTo) return false
          return true
        })
      }

      if (filters.wordCountMin !== undefined) {
        results = results.filter(r => r.metadata.wordCount >= filters.wordCountMin!)
      }

      if (filters.wordCountMax !== undefined) {
        results = results.filter(r => r.metadata.wordCount <= filters.wordCountMax!)
      }

      // Sort by score (descending)
      results.sort((a, b) => b.score - a.score)

      // Limit results
      results = results.slice(0, limit)

      // Enrich with content information if requested
      if (includeContentInfo && results.length > 0) {
        await this.enrichWithContentInfo(results)
      }

      return results

    } catch (error) {
      console.error('Vector search failed:', error)
      throw new Error('Vector search operation failed')
    }
  }

  /**
   * Perform semantic search with text query
   * @param options Semantic search options
   * @returns Search results
   */
  async semanticSearch(options: SemanticSearchOptions): Promise<SearchResult[]> {
    const { query, generateEmbedding = true, ...searchOptions } = options

    if (!query || query.trim().length === 0) {
      throw new Error('Query text is required for semantic search')
    }

    try {
      let queryEmbedding: number[]

      if (generateEmbedding) {
        // Generate embedding for the query
        const embeddings = await embeddingService.generateEmbeddings([{
          id: 'query',
          text: query
        }])

        if (embeddings.length === 0) {
          throw new Error('Failed to generate embedding for query')
        }

        queryEmbedding = embeddings[0].embedding
      } else {
        throw new Error('Query embedding must be provided when generateEmbedding is false')
      }

      // Perform vector search
      return this.searchByVector(queryEmbedding, searchOptions)

    } catch (error) {
      console.error('Semantic search failed:', error)
      throw error
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    totalEmbeddings: number
    collectionExists: boolean
    averageScore: number
    searchCount: number
  }> {
    try {
      const embeddingStats = await embeddingService.getStats()

      // Note: In a real implementation, you'd track search metrics
      // For now, return basic stats
      return {
        ...embeddingStats,
        averageScore: 0.8, // Mock value
        searchCount: 0 // Would be tracked in a real system
      }
    } catch (error) {
      console.error('Failed to get search stats:', error)
      return {
        totalEmbeddings: 0,
        collectionExists: false,
        averageScore: 0,
        searchCount: 0
      }
    }
  }

  /**
   * Enrich search results with content information
   */
  private async enrichWithContentInfo(results: SearchResult[]): Promise<void> {
    if (results.length === 0) return

    try {
      // Get unique content IDs
      const contentIds = [...new Set(results.map(r => r.contentId))]

      // Fetch content information
      const contents = await prisma.content.findMany({
        where: {
          id: { in: contentIds }
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          sources: {
            select: {
              url: true,
              title: true
            },
            take: 1
          }
        }
      })

      // Create lookup map
      const contentMap = new Map(
        contents.map(content => [
          content.id,
          {
            title: content.title,
            source: content.sources[0]?.url || 'Unknown',
            publishedAt: content.createdAt.toISOString()
          }
        ])
      )

      // Enrich results
      for (const result of results) {
        const contentInfo = contentMap.get(result.contentId)
        if (contentInfo) {
          result.contentInfo = contentInfo
        }
      }
    } catch (error) {
      console.warn('Failed to enrich search results with content info:', error)
      // Don't throw - enrichment is optional
    }
  }

  /**
   * Validate search options
   */
  validateSearchOptions(options: VectorSearchOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (options.limit && (options.limit < 1 || options.limit > 100)) {
      errors.push('limit must be between 1 and 100')
    }

    if (options.scoreThreshold && (options.scoreThreshold < 0 || options.scoreThreshold > 1)) {
      errors.push('scoreThreshold must be between 0 and 1')
    }

    if (options.filters?.wordCountMin && options.filters?.wordCountMax &&
        options.filters.wordCountMin > options.filters.wordCountMax) {
      errors.push('wordCountMin cannot be greater than wordCountMax')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const vectorSearchService = new VectorSearchService()