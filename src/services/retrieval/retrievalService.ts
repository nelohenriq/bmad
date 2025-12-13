import { vectorSearchService, SearchResult } from '../search/vectorSearchService'
import { prisma } from '../database/prisma'

export interface HybridSearchOptions {
  query: string
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
  vectorWeight?: number
  keywordWeight?: number
  useCache?: boolean
  cacheTtl?: number
}

export interface HybridSearchResult extends SearchResult {
  hybridScore: number
  vectorScore: number
  keywordScore: number
  rank?: number
}

export class RetrievalService {
  private cache = new Map<string, { result: HybridSearchResult[]; timestamp: number }>()

  async hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult[]> {
    const cacheKey = this.generateCacheKey(options)

    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < (options.cacheTtl || 300000)) {
        return cached.result
      }
    }

    // Perform vector search
    const vectorResults = await vectorSearchService.semanticSearch({
      query: options.query,
      limit: (options.limit || 20) * 2,
      scoreThreshold: options.scoreThreshold || 0.0,
      includeContentInfo: options.includeContentInfo,
      filters: options.filters
    })

    // Perform keyword search
    const keywordResults = await this.keywordSearch(options.query, {
      limit: (options.limit || 20) * 2,
      filters: options.filters
    })

    // Fuse results
    const fusedResults = this.fuseResults(
      vectorResults,
      keywordResults,
      options.vectorWeight || 0.7,
      options.keywordWeight || 0.3
    )

    fusedResults.sort((a, b) => b.hybridScore - a.hybridScore)
    const finalResults = fusedResults.slice(0, options.limit || 20)

    finalResults.forEach((result, index) => {
      result.rank = index + 1
    })

    if (options.useCache !== false) {
      this.cache.set(cacheKey, {
        result: finalResults,
        timestamp: Date.now()
      })
    }

    return finalResults
  }

  private async keywordSearch(query: string, options: { limit?: number; filters?: any }): Promise<SearchResult[]> {
    const chunks = await prisma.contentChunk.findMany({
      where: {
        chunkText: {
          contains: query
        }
      },
      take: options.limit || 20,
      orderBy: { createdAt: 'desc' }
    })

    // Get content info separately
    const contentIds = [...new Set(chunks.map(c => c.contentId))]
    const contents = await prisma.content.findMany({
      where: { id: { in: contentIds } },
      select: {
        id: true,
        title: true,
        createdAt: true,
        sources: { select: { url: true, title: true }, take: 1 }
      }
    })

    const contentMap = new Map(contents.map(c => [c.id, c]))

    return chunks.map(chunk => {
      const content = contentMap.get(chunk.contentId)
      return {
        chunkId: chunk.id,
        contentId: chunk.contentId,
        text: chunk.chunkText,
        score: Math.min(query.split(' ').filter(word =>
          chunk.chunkText.toLowerCase().includes(word.toLowerCase())
        ).length / query.split(' ').length, 1.0),
        metadata: {
          model: 'keyword-search',
          generatedAt: chunk.createdAt.toISOString(),
          chunkIndex: chunk.chunkIndex,
          wordCount: chunk.wordCount,
          charCount: chunk.charCount
        },
        contentInfo: content ? {
          title: content.title,
          source: content.sources[0]?.url || 'Unknown',
          publishedAt: content.createdAt.toISOString()
        } : undefined
      }
    })
  }

  private fuseResults(vectorResults: SearchResult[], keywordResults: SearchResult[], vectorWeight: number, keywordWeight: number): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>()

    vectorResults.forEach(result => {
      resultMap.set(result.chunkId, {
        ...result,
        hybridScore: result.score * vectorWeight,
        vectorScore: result.score,
        keywordScore: 0
      })
    })

    keywordResults.forEach(result => {
      const existing = resultMap.get(result.chunkId)
      if (existing) {
        existing.keywordScore = result.score
        existing.hybridScore = (existing.vectorScore * vectorWeight) + (result.score * keywordWeight)
      } else {
        resultMap.set(result.chunkId, {
          ...result,
          hybridScore: result.score * keywordWeight,
          vectorScore: 0,
          keywordScore: result.score
        })
      }
    })

    return Array.from(resultMap.values())
  }

  private generateCacheKey(options: HybridSearchOptions): string {
    return JSON.stringify({
      query: options.query,
      limit: options.limit,
      scoreThreshold: options.scoreThreshold,
      filters: options.filters,
      vectorWeight: options.vectorWeight,
      keywordWeight: options.keywordWeight
    })
  }

  clearCache(): number {
    const size = this.cache.size
    this.cache.clear()
    return size
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheCleared: 0
    }
  }
}

export const retrievalService = new RetrievalService()