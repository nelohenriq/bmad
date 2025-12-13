import { SearchResult } from './vectorSearchService'
import { vectorContentService } from '../vector-content-service'
import { embeddingService } from '../embedding/embeddingService'

export interface HybridSearchOptions {
  query: string
  limit?: number
  vectorWeight?: number
  keywordWeight?: number
  scoreThreshold?: number
  deduplicationThreshold?: number
  includeContentInfo?: boolean
  useCache?: boolean
  cacheTtl?: number
}

export interface HybridSearchResult extends SearchResult {
  hybridScore: number
  vectorScore: number
  keywordScore: number
  searchMethod: 'hybrid' | 'vector' | 'keyword'
  rankImprovement: number // How much ranking improved vs individual methods
}

export interface HybridSearchMetrics {
  totalQueries: number
  averageProcessingTime: number
  averageResults: number
  vectorVsKeywordRatio: number
  deduplicationRate: number
  cacheHitRate: number
  lastUpdated: Date
}

export class HybridSearchService {
  private metrics: HybridSearchMetrics = {
    totalQueries: 0,
    averageProcessingTime: 0,
    averageResults: 0,
    vectorVsKeywordRatio: 0.5,
    deduplicationRate: 0,
    cacheHitRate: 0,
    lastUpdated: new Date()
  }

  private queryCache = new Map<string, { results: HybridSearchResult[]; timestamp: number }>()
  private readonly defaultCacheTtl = 300000 // 5 minutes

  /**
   * Perform hybrid search combining vector and keyword search
   * @param options Hybrid search options
   * @returns Combined and ranked search results
   */
  async hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult[]> {
    const startTime = Date.now()
    const {
      query,
      limit = 20,
      vectorWeight = 0.6,
      keywordWeight = 0.4,
      scoreThreshold = 0.1,
      deduplicationThreshold = 0.8,
      useCache = true,
      cacheTtl = this.defaultCacheTtl
    } = options

    // Check cache first
    const cacheKey = this.generateCacheKey(options)
    if (useCache) {
      const cached = this.getCachedResults(cacheKey, cacheTtl)
      if (cached) {
        this.updateMetrics(startTime, cached.length, true)
        return cached
      }
    }

    try {
      // Perform both searches in parallel
      const [vectorResults, keywordResults] = await Promise.all([
        this.performVectorSearch(query, limit * 2), // Get more results for better fusion
        this.performKeywordSearch(query, limit * 2)
      ])

      // Combine and deduplicate results
      const combinedResults = this.combineResults(
        vectorResults,
        keywordResults,
        vectorWeight,
        keywordWeight,
        deduplicationThreshold
      )

      // Filter by score threshold and limit
      const filteredResults = combinedResults
        .filter(result => result.hybridScore >= scoreThreshold)
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, limit)

      // Calculate rank improvements
      const resultsWithImprovement = this.calculateRankImprovements(filteredResults)

      // Cache results
      if (useCache) {
        this.setCachedResults(cacheKey, resultsWithImprovement)
      }

      this.updateMetrics(startTime, resultsWithImprovement.length, false)

      return resultsWithImprovement

    } catch (error) {
      console.error('Hybrid search failed:', error)

      // Fallback to vector search only
      try {
        const fallbackResults = await this.performVectorSearch(query, limit)
        const fallbackHybridResults = fallbackResults.map(result => ({
          ...result,
          hybridScore: result.score,
          vectorScore: result.score,
          keywordScore: 0,
          searchMethod: 'vector' as const,
          rankImprovement: 0
        }))

        this.updateMetrics(startTime, fallbackHybridResults.length, false)
        return fallbackHybridResults
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError)
        return []
      }
    }
  }

  /**
   * Perform vector search using actual vector database
   */
  private async performVectorSearch(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbeddingResults = await embeddingService.generateEmbeddings([{
        id: 'query',
        text: query
      }])

      if (queryEmbeddingResults.length === 0) {
        console.warn('Failed to generate embedding for query')
        return []
      }

      const queryEmbedding = queryEmbeddingResults[0].embedding

      // Search for similar content in vector database
      const searchResults = await vectorContentService.searchSimilarContent(queryEmbedding, {
        limit,
        minScore: 0.1
      })

      // Convert to SearchResult format
      return searchResults.map(result => ({
        chunkId: result.chunk.id.toString(),
        contentId: result.chunk.feedItemId,
        text: result.chunk.content,
        score: result.score,
        metadata: {
          model: 'qwen3-embedding:4b',
          generatedAt: new Date().toISOString(),
          chunkIndex: result.chunk.chunkIndex,
          wordCount: result.chunk.metadata.wordCount,
          charCount: result.chunk.content.length
        },
        contentInfo: {
          title: result.chunk.metadata.feedTitle || 'Feed Content',
          source: result.chunk.metadata.sourceUrl || '',
          publishedAt: result.chunk.metadata.publishedAt?.toISOString()
        }
      }))

    } catch (error) {
      console.error('Vector search failed:', error)
      // Fallback to mock results if vector search fails
      return this.generateMockResults(query, limit, 'vector')
    }
  }

  /**
   * Perform keyword search (placeholder - integrate with actual keyword search)
   */
  private async performKeywordSearch(query: string, limit: number): Promise<SearchResult[]> {
    // This would integrate with the actual keyword search service
    // For now, return mock results
    return this.generateMockResults(query, limit, 'keyword')
  }

  /**
   * Generate mock results for development (replace with actual search integration)
   */
  private generateMockResults(query: string, limit: number, type: 'vector' | 'keyword'): SearchResult[] {
    const results: SearchResult[] = []

    for (let i = 0; i < limit; i++) {
      const score = type === 'vector'
        ? Math.random() * 0.8 + 0.2 // Vector scores tend to be higher
        : Math.random() * 0.6 + 0.1 // Keyword scores more varied

      results.push({
        chunkId: `${type}-chunk-${i}`,
        contentId: `${type}-content-${i}`,
        text: `Mock ${type} search result ${i} for query "${query}". This contains relevant information about the topic.`,
        score,
        metadata: {
          model: 'mock-model',
          generatedAt: new Date().toISOString(),
          chunkIndex: i,
          wordCount: 50 + Math.floor(Math.random() * 100),
          charCount: 200 + Math.floor(Math.random() * 300)
        },
        contentInfo: {
          title: `Mock ${type} Content ${i}`,
          source: `mock-${type}-source.com`,
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      })
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Combine vector and keyword search results
   */
  private combineResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    vectorWeight: number,
    keywordWeight: number,
    deduplicationThreshold: number
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>()
    const allResults = [...vectorResults, ...keywordResults]

    // First pass: deduplicate and combine scores
    for (const result of allResults) {
      const existing = resultMap.get(result.chunkId)

      if (existing) {
        // Update existing result with combined scores
        if (vectorResults.some(vr => vr.chunkId === result.chunkId)) {
          existing.vectorScore = Math.max(existing.vectorScore, result.score)
        }
        if (keywordResults.some(kr => kr.chunkId === result.chunkId)) {
          existing.keywordScore = Math.max(existing.keywordScore, result.score)
        }
        existing.hybridScore = (existing.vectorScore * vectorWeight) + (existing.keywordScore * keywordWeight)
      } else {
        // Check for similar content (basic deduplication)
        let isDuplicate = false
        for (const [_, existingResult] of resultMap) {
          const similarity = this.calculateTextSimilarity(result.text, existingResult.text)
          if (similarity >= deduplicationThreshold) {
            // Merge with existing result, keep higher scores
            existingResult.vectorScore = Math.max(existingResult.vectorScore,
              vectorResults.some(vr => vr.chunkId === result.chunkId) ? result.score : 0)
            existingResult.keywordScore = Math.max(existingResult.keywordScore,
              keywordResults.some(kr => kr.chunkId === result.chunkId) ? result.score : 0)
            existingResult.hybridScore = (existingResult.vectorScore * vectorWeight) +
              (existingResult.keywordScore * keywordWeight)
            isDuplicate = true
            break
          }
        }

        if (!isDuplicate) {
          // Add new result
          const hybridResult: HybridSearchResult = {
            ...result,
            hybridScore: result.score, // Will be recalculated
            vectorScore: vectorResults.some(vr => vr.chunkId === result.chunkId) ? result.score : 0,
            keywordScore: keywordResults.some(kr => kr.chunkId === result.chunkId) ? result.score : 0,
            searchMethod: 'hybrid',
            rankImprovement: 0 // Will be calculated later
          }

          hybridResult.hybridScore = (hybridResult.vectorScore * vectorWeight) +
            (hybridResult.keywordScore * keywordWeight)

          resultMap.set(result.chunkId, hybridResult)
        }
      }
    }

    return Array.from(resultMap.values())
  }

  /**
   * Calculate text similarity for deduplication
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).slice(0, 50)) // First 50 words
    const words2 = new Set(text2.toLowerCase().split(/\s+/).slice(0, 50))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Calculate rank improvements compared to individual methods
   */
  private calculateRankImprovements(results: HybridSearchResult[]): HybridSearchResult[] {
    // Sort by different criteria to compare rankings
    const byVector = [...results].sort((a, b) => b.vectorScore - a.vectorScore)
    const byKeyword = [...results].sort((a, b) => b.keywordScore - a.keywordScore)
    const byHybrid = [...results].sort((a, b) => b.hybridScore - a.hybridScore)

    // Create rank maps
    const vectorRankMap = new Map<string, number>()
    const keywordRankMap = new Map<string, number>()
    const hybridRankMap = new Map<string, number>()

    byVector.forEach((result, index) => vectorRankMap.set(result.chunkId, index))
    byKeyword.forEach((result, index) => keywordRankMap.set(result.chunkId, index))
    byHybrid.forEach((result, index) => hybridRankMap.set(result.chunkId, index))

    // Calculate average rank improvement
    return results.map(result => {
      const vectorRank = vectorRankMap.get(result.chunkId) ?? results.length
      const keywordRank = keywordRankMap.get(result.chunkId) ?? results.length
      const hybridRank = hybridRankMap.get(result.chunkId) ?? results.length

      const avgIndividualRank = (vectorRank + keywordRank) / 2
      const rankImprovement = avgIndividualRank - hybridRank

      return {
        ...result,
        rankImprovement
      }
    })
  }

  /**
   * Generate cache key for query options
   */
  private generateCacheKey(options: HybridSearchOptions): string {
    const { query, limit, vectorWeight, keywordWeight, scoreThreshold } = options
    return `${query}-${limit}-${vectorWeight}-${keywordWeight}-${scoreThreshold}`
  }

  /**
   * Get cached results if valid
   */
  private getCachedResults(cacheKey: string, ttl: number): HybridSearchResult[] | null {
    const cached = this.queryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.results
    }
    return null
  }

  /**
   * Set cached results
   */
  private setCachedResults(cacheKey: string, results: HybridSearchResult[]): void {
    this.queryCache.set(cacheKey, {
      results: [...results],
      timestamp: Date.now()
    })

    // Limit cache size
    if (this.queryCache.size > 100) {
      const oldestKey = this.queryCache.keys().next().value
      if (oldestKey) {
        this.queryCache.delete(oldestKey)
      }
    }
  }

  /**
   * Update search metrics
   */
  private updateMetrics(processingTime: number, resultCount: number, cacheHit: boolean): void {
    const duration = Date.now() - processingTime

    this.metrics.totalQueries++
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalQueries - 1) + duration) / this.metrics.totalQueries
    this.metrics.averageResults =
      (this.metrics.averageResults * (this.metrics.totalQueries - 1) + resultCount) / this.metrics.totalQueries

    if (cacheHit) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate * (this.metrics.totalQueries - 1) + 1) / this.metrics.totalQueries
    }

    this.metrics.lastUpdated = new Date()
  }

  /**
   * Get search metrics
   */
  getMetrics(): HybridSearchMetrics {
    return { ...this.metrics }
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear()
  }

  /**
   * Validate hybrid search options
   */
  validateOptions(options: HybridSearchOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!options.query || options.query.trim().length === 0) {
      errors.push('Query is required')
    }

    if (options.limit && (options.limit < 1 || options.limit > 100)) {
      errors.push('Limit must be between 1 and 100')
    }

    if (options.vectorWeight !== undefined && (options.vectorWeight < 0 || options.vectorWeight > 1)) {
      errors.push('Vector weight must be between 0 and 1')
    }

    if (options.keywordWeight !== undefined && (options.keywordWeight < 0 || options.keywordWeight > 1)) {
      errors.push('Keyword weight must be between 0 and 1')
    }

    if (options.vectorWeight !== undefined && options.keywordWeight !== undefined &&
        Math.abs(options.vectorWeight + options.keywordWeight - 1) > 0.001) {
      errors.push('Vector weight and keyword weight must sum to 1')
    }

    if (options.scoreThreshold !== undefined && (options.scoreThreshold < 0 || options.scoreThreshold > 1)) {
      errors.push('Score threshold must be between 0 and 1')
    }

    if (options.deduplicationThreshold !== undefined &&
        (options.deduplicationThreshold < 0 || options.deduplicationThreshold > 1)) {
      errors.push('Deduplication threshold must be between 0 and 1')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const hybridSearchService = new HybridSearchService()