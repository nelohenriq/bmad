import { SearchResult } from '../search/vectorSearchService'

export interface AssembledContext {
  content: string
  chunks: ContextChunk[]
  metadata: ContextMetadata
  quality: ContextQuality
}

export interface ContextChunk {
  id: string
  content: string
  score: number
  source: string
  position: number
  wordCount: number
}

export interface ContextMetadata {
  totalChunks: number
  totalWords: number
  totalChars: number
  estimatedTokens: number
  sources: string[]
  dateRange: {
    earliest: string | null
    latest: string | null
  }
}

export interface ContextQuality {
  diversity: number // 0-1, higher = more diverse sources
  relevance: number // 0-1, average relevance score
  coherence: number // 0-1, estimated coherence
  redundancy: number // 0-1, lower = less redundant
}

export interface AssemblyOptions {
  maxTokens?: number
  maxChunks?: number
  minScore?: number
  prioritizeDiversity?: boolean
  deduplicationThreshold?: number
  strategy?: 'relevance' | 'diversity' | 'balanced'
}

export class ContextAssemblyService {
  private readonly defaultMaxTokens = 4000 // Conservative estimate for most models
  private readonly defaultMaxChunks = 20
  private readonly defaultMinScore = 0.1

  /**
   * Assemble context from search results
   * @param results Search results to assemble into context
   * @param options Assembly options
   * @returns Assembled context
   */
  async assembleContext(
    results: SearchResult[],
    options: AssemblyOptions = {}
  ): Promise<AssembledContext> {
    const {
      maxTokens = this.defaultMaxTokens,
      maxChunks = this.defaultMaxChunks,
      minScore = this.defaultMinScore,
      prioritizeDiversity = true,
      deduplicationThreshold = 0.8,
      strategy = 'balanced'
    } = options

    // Filter by minimum score
    let filteredResults = results.filter(r => r.score >= minScore)

    if (filteredResults.length === 0) {
      return this.createEmptyContext()
    }

    // Sort by relevance score (descending)
    filteredResults.sort((a, b) => b.score - a.score)

    // Apply deduplication
    filteredResults = this.deduplicateResults(filteredResults, deduplicationThreshold)

    // Select chunks based on strategy
    const selectedResults = this.selectChunks(filteredResults, {
      maxChunks,
      maxTokens,
      strategy,
      prioritizeDiversity
    })

    // Convert to context chunks
    const chunks: ContextChunk[] = selectedResults.map((result, index) => ({
      id: result.chunkId,
      content: result.text,
      score: result.score,
      source: result.contentInfo?.source || 'Unknown',
      position: index,
      wordCount: result.metadata.wordCount
    }))

    // Calculate metadata
    const metadata = this.calculateMetadata(chunks, selectedResults)

    // Calculate quality metrics
    const quality = this.calculateQuality(chunks, selectedResults)

    // Assemble final content
    const content = this.assembleContent(chunks)

    return {
      content,
      chunks,
      metadata,
      quality
    }
  }

  /**
   * Select optimal chunks based on strategy
   */
  private selectChunks(
    results: SearchResult[],
    options: {
      maxChunks: number
      maxTokens: number
      strategy: string
      prioritizeDiversity: boolean
    }
  ): SearchResult[] {
    const { maxChunks, maxTokens, strategy, prioritizeDiversity } = options

    switch (strategy) {
      case 'relevance':
        return this.selectByRelevance(results, maxChunks, maxTokens)

      case 'diversity':
        return this.selectByDiversity(results, maxChunks, maxTokens)

      case 'balanced':
      default:
        return this.selectBalanced(results, maxChunks, maxTokens, prioritizeDiversity)
    }
  }

  /**
   * Select chunks by relevance score
   */
  private selectByRelevance(
    results: SearchResult[],
    maxChunks: number,
    maxTokens: number
  ): SearchResult[] {
    const selected: SearchResult[] = []
    let totalTokens = 0

    for (const result of results) {
      if (selected.length >= maxChunks) break

      const estimatedTokens = this.estimateTokens(result.text)
      if (totalTokens + estimatedTokens > maxTokens) continue

      selected.push(result)
      totalTokens += estimatedTokens
    }

    return selected
  }

  /**
   * Select chunks to maximize source diversity
   */
  private selectByDiversity(
    results: SearchResult[],
    maxChunks: number,
    maxTokens: number
  ): SearchResult[] {
    const selected: SearchResult[] = []
    const sources = new Set<string>()
    let totalTokens = 0

    // First pass: ensure diversity
    for (const result of results) {
      if (selected.length >= maxChunks) break

      const source = result.contentInfo?.source || 'Unknown'
      if (sources.has(source) && sources.size >= 3) continue // Allow some repetition after 3 sources

      const estimatedTokens = this.estimateTokens(result.text)
      if (totalTokens + estimatedTokens > maxTokens) continue

      selected.push(result)
      sources.add(source)
      totalTokens += estimatedTokens
    }

    // Second pass: fill remaining slots with best remaining results
    if (selected.length < maxChunks) {
      for (const result of results) {
        if (selected.length >= maxChunks) break
        if (selected.includes(result)) continue

        const estimatedTokens = this.estimateTokens(result.text)
        if (totalTokens + estimatedTokens > maxTokens) continue

        selected.push(result)
        totalTokens += estimatedTokens
      }
    }

    return selected
  }

  /**
   * Select chunks with balanced relevance and diversity
   */
  private selectBalanced(
    results: SearchResult[],
    maxChunks: number,
    maxTokens: number,
    prioritizeDiversity: boolean
  ): SearchResult[] {
    const selected: SearchResult[] = []
    const sources = new Set<string>()
    let totalTokens = 0

    for (const result of results) {
      if (selected.length >= maxChunks) break

      const source = result.contentInfo?.source || 'Unknown'
      const estimatedTokens = this.estimateTokens(result.text)

      if (totalTokens + estimatedTokens > maxTokens) continue

      // Apply diversity penalty if prioritizing diversity
      let adjustedScore = result.score
      if (prioritizeDiversity && sources.has(source)) {
        adjustedScore *= 0.8 // 20% penalty for repeated sources
      }

      // Only select if score is still reasonable
      if (adjustedScore >= 0.1) {
        selected.push(result)
        sources.add(source)
        totalTokens += estimatedTokens
      }
    }

    return selected
  }

  /**
   * Remove duplicate or very similar results
   */
  private deduplicateResults(results: SearchResult[], threshold: number): SearchResult[] {
    const deduplicated: SearchResult[] = []

    for (const result of results) {
      let isDuplicate = false

      for (const existing of deduplicated) {
        const similarity = this.calculateTextSimilarity(result.text, existing.text)
        if (similarity >= threshold) {
          isDuplicate = true
          break
        }
      }

      if (!isDuplicate) {
        deduplicated.push(result)
      }
    }

    return deduplicated
  }

  /**
   * Calculate text similarity (simple Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Assemble final context content
   */
  private assembleContent(chunks: ContextChunk[]): string {
    return chunks
      .sort((a, b) => a.position - b.position)
      .map(chunk => chunk.content)
      .join('\n\n')
  }

  /**
   * Calculate context metadata
   */
  private calculateMetadata(chunks: ContextChunk[], results: SearchResult[]): ContextMetadata {
    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)
    const totalChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)
    const estimatedTokens = this.estimateTokens(chunks.map(c => c.content).join('\n\n'))

    const sources = [...new Set(chunks.map(c => c.source))]

    const dates = results
      .map(r => new Date(r.metadata.generatedAt))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    const dateRange = {
      earliest: dates.length > 0 ? dates[0].toISOString() : null,
      latest: dates.length > 0 ? dates[dates.length - 1].toISOString() : null
    }

    return {
      totalChunks: chunks.length,
      totalWords,
      totalChars,
      estimatedTokens,
      sources,
      dateRange
    }
  }

  /**
   * Calculate context quality metrics
   */
  private calculateQuality(chunks: ContextChunk[], results: SearchResult[]): ContextQuality {
    // Diversity: ratio of unique sources to total chunks
    const uniqueSources = new Set(chunks.map(c => c.source)).size
    const diversity = chunks.length > 0 ? uniqueSources / chunks.length : 0

    // Relevance: average score of selected chunks
    const relevance = chunks.length > 0
      ? chunks.reduce((sum, chunk) => sum + chunk.score, 0) / chunks.length
      : 0

    // Coherence: estimated based on score distribution (higher = more coherent)
    const scores = chunks.map(c => c.score)
    const scoreVariance = scores.length > 1
      ? scores.reduce((sum, score) => sum + Math.pow(score - relevance, 2), 0) / scores.length
      : 0
    const coherence = Math.max(0, 1 - scoreVariance) // Lower variance = higher coherence

    // Redundancy: estimated based on text similarity
    let totalSimilarity = 0
    let pairCount = 0

    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        totalSimilarity += this.calculateTextSimilarity(chunks[i].content, chunks[j].content)
        pairCount++
      }
    }

    const redundancy = pairCount > 0 ? totalSimilarity / pairCount : 0

    return {
      diversity: Math.min(diversity, 1),
      relevance: Math.min(relevance, 1),
      coherence: Math.min(coherence, 1),
      redundancy: Math.min(redundancy, 1)
    }
  }

  /**
   * Create empty context for when no results are available
   */
  private createEmptyContext(): AssembledContext {
    return {
      content: '',
      chunks: [],
      metadata: {
        totalChunks: 0,
        totalWords: 0,
        totalChars: 0,
        estimatedTokens: 0,
        sources: [],
        dateRange: { earliest: null, latest: null }
      },
      quality: {
        diversity: 0,
        relevance: 0,
        coherence: 0,
        redundancy: 0
      }
    }
  }

  /**
   * Validate assembly options
   */
  validateOptions(options: AssemblyOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (options.maxTokens && options.maxTokens < 100) {
      errors.push('maxTokens must be at least 100')
    }

    if (options.maxChunks && options.maxChunks < 1) {
      errors.push('maxChunks must be at least 1')
    }

    if (options.minScore && (options.minScore < 0 || options.minScore > 1)) {
      errors.push('minScore must be between 0 and 1')
    }

    if (options.deduplicationThreshold &&
        (options.deduplicationThreshold < 0 || options.deduplicationThreshold > 1)) {
      errors.push('deduplicationThreshold must be between 0 and 1')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const contextAssemblyService = new ContextAssemblyService()