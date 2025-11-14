import { prisma } from '../database/prisma'
import { analysisLogger } from './analysisLogger'

export interface TrendMetrics {
  topicId: string
  timestamp: Date
  frequency: number
  velocity: number
  momentum: number
  trendScore: number
  trendDirection: 'rising' | 'stable' | 'declining'
  confidence: number
}

export interface TrendAnalysisResult {
  topicId: string
  topicName: string
  current: TrendMetrics
  history: TrendMetrics[]
  summary: {
    averageVelocity: number
    averageMomentum: number
    trendStability: number
    prediction: 'rising' | 'stable' | 'declining'
  }
}

export interface TrendConfiguration {
  timeWindowHours: number
  velocityThreshold: number
  momentumThreshold: number
  minFrequency: number
  velocityWeight: number
  momentumWeight: number
  volumeWeight: number
}

export class TrendAnalysisService {
  private defaultConfig: TrendConfiguration = {
    timeWindowHours: 24,
    velocityThreshold: 0.1,
    momentumThreshold: 0.05,
    minFrequency: 3,
    velocityWeight: 0.4,
    momentumWeight: 0.4,
    volumeWeight: 0.2
  }

  /**
   * Calculate trend metrics for a specific topic
   */
  async calculateTopicTrend(
    topicId: string,
    config: Partial<TrendConfiguration> = {}
  ): Promise<TrendMetrics | null> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const now = new Date()
    const timeWindowStart = new Date(now.getTime() - finalConfig.timeWindowHours * 60 * 60 * 1000)

    try {
      // Get frequency data for the time window
      const frequencyData = await this.getTopicFrequencyData(topicId, timeWindowStart, now)

      if (frequencyData.length < 2) {
        return null // Need at least 2 data points for trend calculation
      }

      // Calculate velocity (rate of change)
      const velocity = this.calculateVelocity(frequencyData)

      // Calculate momentum (acceleration)
      const momentum = this.calculateMomentum(frequencyData)

      // Calculate trend score
      const trendScore = this.calculateTrendScore(velocity, momentum, frequencyData, finalConfig)

      // Determine trend direction
      const trendDirection = this.classifyTrendDirection(trendScore, finalConfig)

      // Calculate confidence
      const confidence = this.calculateConfidence(frequencyData, velocity, momentum)

      const metrics: TrendMetrics = {
        topicId,
        timestamp: now,
        frequency: frequencyData[frequencyData.length - 1].frequency,
        velocity,
        momentum,
        trendScore,
        trendDirection,
        confidence
      }

      // Store trend data
      await this.storeTrendMetrics(metrics)

      await analysisLogger.log({
        feedItemId: topicId,
        operation: 'trend_calculation',
        status: 'success',
        message: `Calculated trend for topic ${topicId}: ${trendDirection} (${trendScore.toFixed(3)})`,
        metadata: { velocity, momentum, trendScore, confidence }
      })

      return metrics

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await analysisLogger.log({
        feedItemId: topicId,
        operation: 'trend_calculation_error',
        status: 'error',
        message: `Failed to calculate trend for topic ${topicId}: ${errorMessage}`,
        metadata: { error: errorMessage }
      })
      return null
    }
  }

  /**
   * Get comprehensive trend analysis for a topic
   */
  async getTopicTrendAnalysis(
    topicId: string,
    hours: number = 168 // 7 days
  ): Promise<TrendAnalysisResult | null> {
    try {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, name: true }
      })

      if (!topic) {
        return null
      }

      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)

      const trendData = await prisma.topicTrend.findMany({
        where: {
          topicId,
          timestamp: {
            gte: startTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })

      if (trendData.length === 0) {
        return null
      }

      // Convert to TrendMetrics format
      const history: TrendMetrics[] = trendData.map(data => ({
        topicId: data.topicId,
        timestamp: data.timestamp,
        frequency: data.frequency,
        velocity: data.velocity,
        momentum: data.momentum,
        trendScore: data.trendScore,
        trendDirection: data.trendDirection as 'rising' | 'stable' | 'declining',
        confidence: data.confidence
      }))

      const current = history[history.length - 1]

      // Calculate summary statistics
      const summary = this.calculateTrendSummary(history)

      return {
        topicId,
        topicName: topic.name,
        current,
        history,
        summary
      }

    } catch (error) {
      console.error('Failed to get topic trend analysis:', error)
      return null
    }
  }

  /**
   * Get trending topics across all content
   */
  async getTrendingTopics(
    config: Partial<TrendConfiguration> = {},
    limit: number = 50
  ): Promise<TrendAnalysisResult[]> {
    const finalConfig = { ...this.defaultConfig, ...config }

    try {
      // Get topics with recent trend data
      const recentTrends = await prisma.topicTrend.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - finalConfig.timeWindowHours * 60 * 60 * 1000)
          },
          frequency: {
            gte: finalConfig.minFrequency
          }
        },
        include: {
          topic: {
            select: { id: true, name: true, category: true }
          }
        },
        orderBy: {
          trendScore: 'desc'
        },
        take: limit * 2 // Get more to filter
      })

      // Group by topic and get latest trend for each
      const topicTrends = new Map<string, any>()

      for (const trend of recentTrends) {
        const existing = topicTrends.get(trend.topicId)
        if (!existing || trend.timestamp > existing.timestamp) {
          topicTrends.set(trend.topicId, {
            topic: trend.topic,
            trend: trend
          })
        }
      }

      // Convert to TrendAnalysisResult format
      const results: TrendAnalysisResult[] = []

      for (const [topicId, data] of topicTrends) {
        const trendAnalysis = await this.getTopicTrendAnalysis(topicId, finalConfig.timeWindowHours)
        if (trendAnalysis) {
          results.push(trendAnalysis)
        }
      }

      // Sort by trend score and return top results
      return results
        .sort((a, b) => b.current.trendScore - a.current.trendScore)
        .slice(0, limit)

    } catch (error) {
      console.error('Failed to get trending topics:', error)
      return []
    }
  }

  /**
   * Update trend data for all active topics
   */
  async updateAllTrends(config: Partial<TrendConfiguration> = {}): Promise<number> {
    try {
      const topics = await prisma.topic.findMany({
        where: {
          frequency: {
            gte: config.minFrequency || this.defaultConfig.minFrequency
          }
        },
        select: { id: true }
      })

      let updatedCount = 0

      for (const topic of topics) {
        const result = await this.calculateTopicTrend(topic.id, config)
        if (result) {
          updatedCount++
        }
      }

      await analysisLogger.log({
        feedItemId: 'system',
        operation: 'trend_update_batch',
        status: 'success',
        message: `Updated trends for ${updatedCount} topics`,
        metadata: { topicsProcessed: updatedCount }
      })

      return updatedCount

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await analysisLogger.log({
        feedItemId: 'system',
        operation: 'trend_update_batch_error',
        status: 'error',
        message: `Failed to update trends: ${errorMessage}`,
        metadata: { error: errorMessage }
      })
      return 0
    }
  }

  // Private helper methods

  private async getTopicFrequencyData(
    topicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ timestamp: Date; frequency: number }>> {
    // Get topic mentions over time from content analysis
    const analyses = await prisma.contentAnalysis.findMany({
      where: {
        topics: {
          some: {
            id: topicId
          }
        },
        createdAt: {
          gte: startTime,
          lte: endTime
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Aggregate by hour
    const hourlyData = new Map<string, number>()

    for (const analysis of analyses) {
      const hour = new Date(analysis.createdAt)
      hour.setMinutes(0, 0, 0)

      const key = hour.toISOString()
      hourlyData.set(key, (hourlyData.get(key) || 0) + 1)
    }

    // Convert to array
    return Array.from(hourlyData.entries()).map(([timestamp, frequency]) => ({
      timestamp: new Date(timestamp),
      frequency
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  private calculateVelocity(data: Array<{ timestamp: Date; frequency: number }>): number {
    if (data.length < 2) return 0

    const recent = data.slice(-2)
    const timeDiff = (recent[1].timestamp.getTime() - recent[0].timestamp.getTime()) / (1000 * 60 * 60) // hours
    const freqDiff = recent[1].frequency - recent[0].frequency

    return timeDiff > 0 ? freqDiff / timeDiff : 0
  }

  private calculateMomentum(data: Array<{ timestamp: Date; frequency: number }>): number {
    if (data.length < 3) return 0

    // Calculate velocities for recent periods
    const velocities: number[] = []
    for (let i = 1; i < data.length; i++) {
      const timeDiff = (data[i].timestamp.getTime() - data[i-1].timestamp.getTime()) / (1000 * 60 * 60)
      const freqDiff = data[i].frequency - data[i-1].frequency
      velocities.push(timeDiff > 0 ? freqDiff / timeDiff : 0)
    }

    if (velocities.length < 2) return 0

    // Calculate acceleration (change in velocity)
    const recentVelocities = velocities.slice(-2)
    const velocityDiff = recentVelocities[1] - recentVelocities[0]

    // Use time difference between velocity measurements
    return velocityDiff / Math.max(1, velocities.length - 1)
  }

  private calculateTrendScore(
    velocity: number,
    momentum: number,
    data: Array<{ timestamp: Date; frequency: number }>,
    config: TrendConfiguration
  ): number {
    const avgFrequency = data.reduce((sum, d) => sum + d.frequency, 0) / data.length
    const volumeScore = Math.min(1, avgFrequency / 10) // Normalize volume

    const score = (
      config.velocityWeight * Math.abs(velocity) +
      config.momentumWeight * Math.abs(momentum) +
      config.volumeWeight * volumeScore
    )

    return Math.max(0, Math.min(1, score))
  }

  private classifyTrendDirection(score: number, config: TrendConfiguration): 'rising' | 'stable' | 'declining' {
    if (score >= config.velocityThreshold) {
      return 'rising'
    } else if (score <= -config.velocityThreshold) {
      return 'declining'
    }
    return 'stable'
  }

  private calculateConfidence(
    data: Array<{ timestamp: Date; frequency: number }>,
    velocity: number,
    momentum: number
  ): number {
    const dataPoints = data.length
    const timeSpan = data.length > 1 ?
      (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / (1000 * 60 * 60) : 0

    // Confidence based on data quality and consistency
    let confidence = Math.min(1, dataPoints / 10) // More data points = higher confidence
    confidence *= Math.min(1, timeSpan / 24) // Longer time span = higher confidence

    // Reduce confidence for extreme values
    if (Math.abs(velocity) > 10 || Math.abs(momentum) > 5) {
      confidence *= 0.8
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private calculateTrendSummary(history: TrendMetrics[]) {
    const velocities = history.map(h => h.velocity)
    const momentums = history.map(h => h.momentum)

    const averageVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length
    const averageMomentum = momentums.reduce((sum, m) => sum + m, 0) / momentums.length

    // Calculate trend stability (lower variance = higher stability)
    const velocityVariance = this.calculateVariance(velocities)
    const trendStability = Math.max(0, 1 - velocityVariance / 10)

    // Predict future trend based on current momentum
    let prediction: 'rising' | 'stable' | 'declining' = 'stable'
    if (averageMomentum > 0.1) {
      prediction = 'rising'
    } else if (averageMomentum < -0.1) {
      prediction = 'declining'
    }

    return {
      averageVelocity,
      averageMomentum,
      trendStability,
      prediction
    }
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length
  }

  private async storeTrendMetrics(metrics: TrendMetrics): Promise<void> {
    try {
      await prisma.topicTrend.create({
        data: {
          topicId: metrics.topicId,
          timestamp: metrics.timestamp,
          frequency: metrics.frequency,
          velocity: metrics.velocity,
          momentum: metrics.momentum,
          trendScore: metrics.trendScore,
          trendDirection: metrics.trendDirection,
          confidence: metrics.confidence
        }
      })
    } catch (error) {
      console.error('Failed to store trend metrics:', error)
      throw error
    }
  }
}

export const trendAnalysisService = new TrendAnalysisService()