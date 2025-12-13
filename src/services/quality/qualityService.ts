import "dotenv/config"
import { prisma } from '../database/prisma'

export interface RetrievalAccuracyMetrics {
  precision: number
  recall: number
  f1Score: number
  meanReciprocalRank: number
  normalizedDiscountedCumulativeGain: number
}

export interface GenerationQualityMetrics {
  relevance: number
  coherence: number
  factualAccuracy: number
  readability: number
  overallScore: number
}

export interface QualityTrend {
  metricType: string
  period: 'hour' | 'day' | 'week' | 'month'
  startDate: Date
  endDate: Date
  averageScore: number
  minScore: number
  maxScore: number
  trendDirection: 'improving' | 'declining' | 'stable'
  dataPoints: Array<{ timestamp: Date; score: number }>
}

export interface ABTestVariant {
  name: string
  config: any
  userCount: number
  metrics: {
    averageScore: number
    sampleSize: number
    confidence: number
  }
}

export interface ABTestSummary {
  testId: string
  name: string
  status: 'active' | 'completed' | 'paused'
  variantA: ABTestVariant
  variantB: ABTestVariant
  winner?: 'A' | 'B' | 'tie'
  confidence: number
  startDate: Date
  endDate?: Date
}

export class QualityService {
  /**
   * Calculate retrieval accuracy metrics
   */
  async calculateRetrievalAccuracy(
    query: string,
    retrievedResults: Array<{ id: string; relevance: number }>,
    groundTruth?: Array<{ id: string; relevance: number }>
  ): Promise<RetrievalAccuracyMetrics> {
    if (!groundTruth || groundTruth.length === 0) {
      // Calculate basic metrics without ground truth
      const relevantRetrieved = retrievedResults.filter(r => r.relevance > 0.7).length
      const precision = retrievedResults.length > 0 ? relevantRetrieved / retrievedResults.length : 0
      const recall = 0 // Cannot calculate without ground truth
      const f1Score = 0

      // Calculate MRR and NDCG with assumptions
      const reciprocalRanks = retrievedResults.map((result, index) => {
        return result.relevance > 0.7 ? 1 / (index + 1) : 0
      })
      const mrr = reciprocalRanks.reduce((sum: number, rank: number) => sum + rank, 0) / retrievedResults.length

      const ndcg = this.calculateNDCG(retrievedResults.map(r => r.relevance))

      return {
        precision,
        recall,
        f1Score,
        meanReciprocalRank: mrr,
        normalizedDiscountedCumulativeGain: ndcg
      }
    }

    // Calculate precision, recall, F1 with ground truth
    const relevantRetrieved = retrievedResults.filter(result =>
      groundTruth.some(gt => gt.id === result.id && gt.relevance > 0.5)
    ).length

    const totalRelevant = groundTruth.filter(gt => gt.relevance > 0.5).length

    const precision = retrievedResults.length > 0 ? relevantRetrieved / retrievedResults.length : 0
    const recall = totalRelevant > 0 ? relevantRetrieved / totalRelevant : 0
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0

    // Calculate MRR
    const reciprocalRanks = retrievedResults.map((result, index) => {
      const isRelevant = groundTruth.some(gt => gt.id === result.id && gt.relevance > 0.5)
      return isRelevant ? 1 / (index + 1) : 0
    })
    const mrr = reciprocalRanks.reduce((sum: number, rank: number) => sum + rank, 0) / retrievedResults.length

    // Calculate NDCG
    const idealRanking = groundTruth
      .filter(gt => gt.relevance > 0.5)
      .sort((a, b) => b.relevance - a.relevance)
      .map(gt => gt.relevance)

    const actualRanking = retrievedResults.map(result => {
      const gt = groundTruth.find(g => g.id === result.id)
      return gt ? gt.relevance : 0
    })

    const ndcg = this.calculateNDCG(actualRanking, idealRanking)

    return {
      precision,
      recall,
      f1Score,
      meanReciprocalRank: mrr,
      normalizedDiscountedCumulativeGain: ndcg
    }
  }

  /**
   * Score generation quality
   */
  async scoreGenerationQuality(
    generatedText: string,
    query: string,
    retrievedContext?: string[]
  ): Promise<GenerationQualityMetrics> {
    // This is a simplified implementation
    // In a real system, this would use ML models or LLM-as-a-judge

    // Relevance scoring (semantic similarity to query)
    const relevance = this.calculateRelevanceScore(generatedText, query)

    // Coherence scoring (text structure and flow)
    const coherence = this.calculateCoherenceScore(generatedText)

    // Factual accuracy (cross-reference with retrieved context)
    const factualAccuracy = retrievedContext
      ? this.calculateFactualAccuracy(generatedText, retrievedContext)
      : 0.8 // Default if no context available

    // Readability scoring
    const readability = this.calculateReadabilityScore(generatedText)

    // Overall score (weighted average)
    const overallScore = (
      relevance * 0.4 +
      coherence * 0.3 +
      factualAccuracy * 0.2 +
      readability * 0.1
    )

    return {
      relevance,
      coherence,
      factualAccuracy,
      readability,
      overallScore
    }
  }

  /**
   * Record quality metric
   */
  async recordQualityMetric(
    metricType: 'retrieval_accuracy' | 'generation_quality' | 'user_satisfaction',
    score: number,
    operationId?: string,
    userId?: string,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    await (prisma as any).qualityMetric.create({
      data: {
        metricType,
        score: Math.max(0, Math.min(1, score)), // Ensure score is between 0 and 1
        operationId,
        userId,
        sessionId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date()
      }
    })
  }

  /**
   * Record user feedback
   */
  async recordUserFeedback(
    userId: string,
    operationId: string,
    operationType: 'generation' | 'retrieval' | 'search',
    rating: number,
    feedback?: string,
    categories?: string[]
  ): Promise<void> {
    await (prisma as any).userFeedback.create({
      data: {
        userId,
        operationId,
        operationType,
        rating: Math.max(1, Math.min(5, rating)), // Ensure rating is between 1 and 5
        feedback,
        categories: categories ? JSON.stringify(categories) : null,
        timestamp: new Date()
      }
    })

    // Also record as quality metric
    const normalizedScore = (rating - 1) / 4 // Convert 1-5 scale to 0-1 scale
    await this.recordQualityMetric('user_satisfaction', normalizedScore, operationId, userId)
  }

  /**
   * Get quality trends
   */
  async getQualityTrends(
    metricType: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day',
    hours: number = 24
  ): Promise<QualityTrend> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000)

    const metrics = await (prisma as any).qualityMetric.findMany({
      where: {
        metricType,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    if (metrics.length === 0) {
      return {
        metricType,
        period,
        startDate,
        endDate,
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        trendDirection: 'stable',
        dataPoints: []
      }
    }

    const scores = metrics.map((m: any) => m.score)
    const averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)

    // Calculate trend direction (simplified)
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))

    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum: number, score: number) => sum + score, 0) / firstHalf.length : 0
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum: number, score: number) => sum + score, 0) / secondHalf.length : 0

    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
    if (secondHalfAvg > firstHalfAvg + 0.05) trendDirection = 'improving'
    if (secondHalfAvg < firstHalfAvg - 0.05) trendDirection = 'declining'

    const dataPoints = metrics.map((m: any) => ({
      timestamp: m.timestamp,
      score: m.score
    }))

    return {
      metricType,
      period,
      startDate,
      endDate,
      averageScore,
      minScore,
      maxScore,
      trendDirection,
      dataPoints
    }
  }

  /**
   * Create A/B test
   */
  async createABTest(
    name: string,
    description: string,
    configA: any,
    configB: any,
    targetUsers: number
  ): Promise<string> {
    const test = await (prisma as any).aBTest.create({
      data: {
        name,
        description,
        configA: JSON.stringify(configA),
        configB: JSON.stringify(configB),
        targetUsers,
        status: 'active'
      }
    })

    return test.id
  }

  /**
   * Get A/B test summary
   */
  async getABTestSummary(testId: string): Promise<ABTestSummary | null> {
    const test = await (prisma as any).aBTest.findUnique({
      where: { id: testId },
      include: {
        results: true
      }
    })

    if (!test) return null

    // Calculate metrics for each variant
    const resultsA = test.results.filter((r: any) => r.variant === 'A')
    const resultsB = test.results.filter((r: any) => r.variant === 'B')

    const metricsA = this.calculateVariantMetrics(resultsA)
    const metricsB = this.calculateVariantMetrics(resultsB)

    const variantA: ABTestVariant = {
      name: 'A',
      config: JSON.parse(test.configA),
      userCount: test.currentUsersA,
      metrics: metricsA
    }

    const variantB: ABTestVariant = {
      name: 'B',
      config: JSON.parse(test.configB),
      userCount: test.currentUsersB,
      metrics: metricsB
    }

    // Determine winner (simplified statistical test)
    let winner: 'A' | 'B' | 'tie' | undefined
    const confidence = Math.min(metricsA.confidence, metricsB.confidence)

    if (confidence > 0.95 && Math.abs(metricsA.averageScore - metricsB.averageScore) > 0.05) {
      winner = metricsA.averageScore > metricsB.averageScore ? 'A' : 'B'
    } else if (confidence > 0.8) {
      winner = 'tie'
    }

    return {
      testId: test.id,
      name: test.name,
      status: test.status as 'active' | 'completed' | 'paused',
      variantA,
      variantB,
      winner,
      confidence,
      startDate: test.startDate,
      endDate: test.endDate || undefined
    }
  }

  /**
   * Record A/B test result
   */
  async recordABTestResult(
    testId: string,
    variant: 'A' | 'B',
    userId: string,
    metricType: string,
    metricValue: number
  ): Promise<void> {
    // Update user count for the variant
    const updateData = variant === 'A'
      ? { currentUsersA: { increment: 1 } }
      : { currentUsersB: { increment: 1 } }

    await (prisma as any).aBTest.update({
      where: { id: testId },
      data: updateData
    })

    // Record the result
    await (prisma as any).aBTestResult.create({
      data: {
        testId,
        variant,
        userId,
        metricType,
        metricValue
      }
    })
  }

  /**
   * Get quality insights and recommendations
   */
  async getQualityInsights(): Promise<{
    insights: string[]
    recommendations: string[]
    alerts: Array<{ level: 'warning' | 'critical'; message: string }>
  }> {
    const insights: string[] = []
    const recommendations: string[] = []
    const alerts: Array<{ level: 'warning' | 'critical'; message: string }> = []

    // Check recent quality trends
    const generationTrend = await this.getQualityTrends('generation_quality', 'day', 7)
    const retrievalTrend = await this.getQualityTrends('retrieval_accuracy', 'day', 7)
    const satisfactionTrend = await this.getQualityTrends('user_satisfaction', 'day', 7)

    // Generate insights
    if (generationTrend.averageScore > 0.8) {
      insights.push('Generation quality is excellent with scores above 80%')
    } else if (generationTrend.averageScore < 0.6) {
      alerts.push({
        level: 'critical',
        message: 'Generation quality has dropped below 60% - immediate attention required'
      })
    }

    if (retrievalTrend.trendDirection === 'declining') {
      recommendations.push('Retrieval accuracy is declining - consider updating the embedding model or search algorithm')
    }

    if (satisfactionTrend.averageScore < 0.7) {
      recommendations.push('User satisfaction is below 70% - review recent changes and gather more feedback')
    }

    // Check for quality degradation
    if (generationTrend.trendDirection === 'declining' && generationTrend.averageScore < 0.75) {
      alerts.push({
        level: 'warning',
        message: 'Generation quality is declining and below 75% threshold'
      })
    }

    return { insights, recommendations, alerts }
  }

  private calculateNDCG(ranking: number[], idealRanking?: number[]): number {
    if (ranking.length === 0) return 0

    const ideal = idealRanking || [...ranking].sort((a, b) => b - a)

    let dcg = 0
    let idcg = 0

    for (let i = 0; i < ranking.length; i++) {
      dcg += ranking[i] / Math.log2(i + 2)
      if (ideal[i]) {
        idcg += ideal[i] / Math.log2(i + 2)
      }
    }

    return idcg > 0 ? dcg / idcg : 0
  }

  private calculateRelevanceScore(text: string, query: string): number {
    // Simple relevance scoring based on keyword overlap
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
    const textWords = text.toLowerCase().split(/\s+/)

    if (queryWords.length === 0) return 0

    const matches = queryWords.filter(word =>
      textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
    ).length

    return Math.min(matches / queryWords.length, 1)
  }

  private calculateCoherenceScore(text: string): number {
    // Simple coherence scoring based on sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

    if (sentences.length < 2) return 0.5

    // Check for transition words and logical flow
    const transitionWords = ['however', 'therefore', 'thus', 'consequently', 'furthermore', 'moreover', 'in addition', 'similarly']
    const transitionCount = transitionWords.filter(word =>
      text.toLowerCase().includes(word)
    ).length

    const avgSentenceLength = text.length / sentences.length
    const lengthScore = Math.min(avgSentenceLength / 100, 1) // Prefer 50-100 chars per sentence

    return Math.min((transitionCount * 0.1 + lengthScore * 0.9), 1)
  }

  private calculateFactualAccuracy(text: string, context: string[]): number {
    // Simple factual accuracy based on context overlap
    const contextText = context.join(' ').toLowerCase()
    const textWords = text.toLowerCase().split(/\s+/).filter(word => word.length > 3)

    const factualWords = textWords.filter(word => contextText.includes(word)).length

    return textWords.length > 0 ? factualWords / textWords.length : 0
  }

  private calculateReadabilityScore(text: string): number {
    // Simple readability based on sentence complexity and word length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = text.split(/\s+/).filter(word => word.length > 0)

    if (words.length === 0) return 0

    const avgWordsPerSentence = words.length / sentences.length
    const avgWordLength = words.reduce((sum: number, word: string) => sum + word.length, 0) / words.length

    // Prefer 10-20 words per sentence and reasonable word lengths
    const sentenceScore = Math.max(0, 1 - Math.abs(avgWordsPerSentence - 15) / 15)
    const wordScore = Math.max(0, 1 - Math.abs(avgWordLength - 5) / 5)

    return (sentenceScore + wordScore) / 2
  }

  private calculateVariantMetrics(results: any[]): { averageScore: number; sampleSize: number; confidence: number } {
    if (results.length === 0) {
      return { averageScore: 0, sampleSize: 0, confidence: 0 }
    }

    const scores = results.map((r: any) => r.metricValue)
    const averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length

    // Simple confidence calculation (would be more sophisticated in real implementation)
    const confidence = Math.min(results.length / 100, 1) // More samples = higher confidence

    return {
      averageScore,
      sampleSize: results.length,
      confidence
    }
  }
}

export const qualityService = new QualityService()