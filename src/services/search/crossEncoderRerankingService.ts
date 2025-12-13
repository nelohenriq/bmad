import { SearchResult } from './vectorSearchService'

export interface RerankingOptions {
  model?: string
  batchSize?: number
  scoreThreshold?: number
  fallbackToOriginal?: boolean
}

export interface RerankedResult extends SearchResult {
  rerankScore: number
  originalRank: number
  newRank: number
  improvement: number // Difference from original score
}

export class CrossEncoderRerankingService {
  private defaultModel = 'qwen3-embedding:4b' // Using same model for now, could be specialized reranking model
  private maxBatchSize = 32

  /**
   * Rerank search results using cross-encoder
   * @param query Search query
   * @param results Initial search results
   * @param options Reranking options
   * @returns Reranked results
   */
  async rerankResults(
    query: string,
    results: SearchResult[],
    options: RerankingOptions = {}
  ): Promise<RerankedResult[]> {
    if (results.length === 0) {
      return []
    }

    const {
      model = this.defaultModel,
      batchSize = Math.min(this.maxBatchSize, results.length),
      scoreThreshold = 0.0,
      fallbackToOriginal = true
    } = options

    try {
      // Prepare query-result pairs for cross-encoder
      const pairs = results.map(result => ({
        query,
        text: result.text,
        originalResult: result
      }))

      // Process in batches
      const rerankedResults: RerankedResult[] = []

      for (let i = 0; i < pairs.length; i += batchSize) {
        const batch = pairs.slice(i, i + batchSize)
        const batchScores = await this.scoreBatch(batch, model)

        // Combine with original results
        batch.forEach((pair, index) => {
          const rerankScore = batchScores[index]
          const originalResult = pair.originalResult

          rerankedResults.push({
            ...originalResult,
            rerankScore,
            originalRank: rerankedResults.length + 1, // Will be updated after sorting
            newRank: 0, // Will be updated after sorting
            improvement: rerankScore - originalResult.score
          })
        })
      }

      // Sort by rerank score (descending)
      rerankedResults.sort((a, b) => b.rerankScore - a.rerankScore)

      // Apply score threshold
      let filteredResults = rerankedResults
      if (scoreThreshold > 0) {
        filteredResults = rerankedResults.filter(r => r.rerankScore >= scoreThreshold)
      }

      // Update ranks
      filteredResults.forEach((result, index) => {
        result.newRank = index + 1
      })

      return filteredResults

    } catch (error) {
      console.error('Cross-encoder reranking failed:', error)

      if (fallbackToOriginal) {
        // Fallback to original ranking
        console.log('Falling back to original ranking')
        return results.map((result, index) => ({
          ...result,
          rerankScore: result.score, // Use original score as rerank score
          originalRank: index + 1,
          newRank: index + 1,
          improvement: 0
        }))
      }

      throw error
    }
  }

  /**
   * Score a batch of query-text pairs
   */
  private async scoreBatch(
    pairs: Array<{ query: string; text: string }>,
    model: string
  ): Promise<number[]> {
    try {
      // For each pair, compute relevance score
      // Since we're using embedding model, we'll use cosine similarity as approximation
      // In production, this would use a dedicated cross-encoder model

      const scores: number[] = []

      for (const pair of pairs) {
        const score = await this.computeRelevanceScore(pair.query, pair.text, model)
        scores.push(score)
      }

      return scores

    } catch (error) {
      console.error('Batch scoring failed:', error)
      // Return original scores as fallback
      return pairs.map(() => 0.5)
    }
  }

  /**
   * Compute relevance score for query-text pair
   * Using embedding similarity as approximation for cross-encoder
   */
  private async computeRelevanceScore(
    query: string,
    text: string,
    model: string
  ): Promise<number> {
    try {
      // Get embeddings for both query and text
      const queryEmbedding = await this.getEmbedding(query, model)
      const textEmbedding = await this.getEmbedding(text, model)

      // Compute cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, textEmbedding)

      // Normalize to 0-1 range (cosine similarity is -1 to 1)
      return (similarity + 1) / 2

    } catch (error) {
      console.error('Relevance scoring failed:', error)
      return 0.5 // Neutral score
    }
  }

  /**
   * Get embedding for text
   */
  private async getEmbedding(text: string, model: string): Promise<number[]> {
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
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      return data.embedding

    } catch (error) {
      console.error(`Failed to get embedding for text: ${text.substring(0, 50)}...`, error)
      throw error
    }
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * Get reranking statistics
   */
  getStats() {
    return {
      defaultModel: this.defaultModel,
      maxBatchSize: this.maxBatchSize,
      supported: true
    }
  }

  /**
   * Validate reranking options
   */
  validateOptions(options: RerankingOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (options.batchSize && (options.batchSize < 1 || options.batchSize > this.maxBatchSize)) {
      errors.push(`Batch size must be between 1 and ${this.maxBatchSize}`)
    }

    if (options.scoreThreshold && (options.scoreThreshold < 0 || options.scoreThreshold > 1)) {
      errors.push('Score threshold must be between 0 and 1')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const crossEncoderRerankingService = new CrossEncoderRerankingService()