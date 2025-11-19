import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AnalyticsEvent {
  id: string
  userId?: string
  eventType: string
  eventData?: Record<string, any>
  timestamp: Date
  sessionId?: string
}

export interface AnalyticsMetric {
  id: string
  userId?: string
  metricType: string
  value: number
  metadata?: Record<string, any>
  date: Date
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface DashboardData {
  contentCreation: {
    totalContent: number
    contentByDate: Array<{ date: string; count: number }>
    averageLength: number
    topTopics: Array<{ topic: string; count: number }>
    contentTypes: Array<{ type: string; count: number }>
  }
  rssMonitoring: {
    totalFeeds: number
    monitoringFrequency: number
    successRate: number
    newContentDiscovered: number
    feedHealth: Array<{ feed: string; health: number }>
  }
  aiUsage: {
    totalRequests: number
    averageResponseTime: number
    successRate: number
    modelUsage: Array<{ model: string; count: number }>
    tokenUsage: number
  }
  publishing: {
    totalPublished: number
    successRate: number
    averagePublishTime: number
    platformPerformance: Array<{ platform: string; successRate: number; avgTime: number }>
    publishingTrends: Array<{ date: string; count: number }>
  }
}

export interface AnalyticsPreferences {
  enabled: boolean
  dataRetentionDays: number
  collectDetailedMetrics: boolean
  allowPersonalization: boolean
}

export class AnalyticsService {
  private cache = new Map<string, { data: any; expiresAt: Date }>()

  /**
   * Record an analytics event
   */
  async recordEvent(
    userId: string | undefined,
    eventType: string,
    eventData?: Record<string, any>,
    sessionId?: string
  ): Promise<void> {
    try {
      // Check if analytics is enabled for this user
      if (userId) {
        const preferences = await this.getAnalyticsPreferences(userId)
        if (!preferences.enabled) {
          return // Silently skip if analytics disabled
        }
      }

      await prisma.analyticsEvent.create({
        data: {
          userId,
          eventType,
          eventData: eventData ? JSON.stringify(eventData) : null,
          sessionId
        }
      })

      // Invalidate relevant caches
      this.invalidateCache(userId, eventType)
    } catch (error) {
      console.error('Failed to record analytics event:', error)
      // Don't throw - analytics failures shouldn't break core functionality
    }
  }

  /**
   * Calculate and store metrics for a given time range
   */
  async calculateMetrics(userId: string | undefined, timeRange: TimeRange): Promise<void> {
    try {
      const startDate = new Date(timeRange.start)
      const endDate = new Date(timeRange.end)

      // Calculate content creation metrics
      await this.calculateContentCreationMetrics(userId, startDate, endDate)

      // Calculate RSS monitoring metrics
      await this.calculateRssMonitoringMetrics(userId, startDate, endDate)

      // Calculate AI usage metrics
      await this.calculateAiUsageMetrics(userId, startDate, endDate)

      // Calculate publishing metrics
      await this.calculatePublishingMetrics(userId, startDate, endDate)

    } catch (error) {
      console.error('Failed to calculate analytics metrics:', error)
    }
  }

  /**
   * Get dashboard data for a user
   */
  async getDashboardData(userId: string | undefined, timeRange: TimeRange): Promise<DashboardData> {
    const cacheKey = `dashboard:${userId || 'anonymous'}:${timeRange.start.toISOString()}:${timeRange.end.toISOString()}`

    // Check cache first
    const cached = this.getCached(cacheKey)
    if (cached) {
      return cached
    }

    // Ensure metrics are up to date
    await this.calculateMetrics(userId, timeRange)

    const data = await this.aggregateDashboardData(userId, timeRange)

    // Cache the result for 5 minutes
    this.setCached(cacheKey, data, 5 * 60 * 1000)

    return data
  }

  /**
   * Get specific metrics by type
   */
  async getMetrics(
    userId: string | undefined,
    metricType: string,
    timeRange: TimeRange
  ): Promise<AnalyticsMetric[]> {
    try {
      const metrics = await prisma.analyticsMetric.findMany({
        where: {
          userId,
          metricType,
          date: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        orderBy: { date: 'asc' }
      })

      return metrics.map(metric => ({
        id: metric.id,
        userId: metric.userId || undefined,
        metricType: metric.metricType,
        value: metric.value,
        metadata: metric.metadata ? JSON.parse(metric.metadata) : undefined,
        date: metric.date
      }))
    } catch (error) {
      console.error('Failed to get metrics:', error)
      return []
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(userId: string | undefined): Promise<any> {
    try {
      const [events, metrics] = await Promise.all([
        prisma.analyticsEvent.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 10000 // Limit to prevent huge exports
        }),
        prisma.analyticsMetric.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 10000
        })
      ])

      return {
        userId,
        exportedAt: new Date().toISOString(),
        events: events.map(event => ({
          id: event.id,
          eventType: event.eventType,
          eventData: event.eventData ? JSON.parse(event.eventData) : null,
          timestamp: event.timestamp,
          sessionId: event.sessionId
        })),
        metrics: metrics.map(metric => ({
          id: metric.id,
          metricType: metric.metricType,
          value: metric.value,
          metadata: metric.metadata ? JSON.parse(metric.metadata) : null,
          date: metric.date
        })),
        version: '1.0'
      }
    } catch (error) {
      console.error('Failed to export analytics data:', error)
      throw new Error('Failed to export analytics data')
    }
  }

  /**
   * Clear analytics data for a user
   */
  async clearAnalyticsData(userId: string | undefined): Promise<void> {
    try {
      await Promise.all([
        prisma.analyticsEvent.deleteMany({ where: { userId } }),
        prisma.analyticsMetric.deleteMany({ where: { userId } }),
        prisma.analyticsCache.deleteMany({ where: { userId } })
      ])

      // Clear cache
      this.clearUserCache(userId)
    } catch (error) {
      console.error('Failed to clear analytics data:', error)
      throw new Error('Failed to clear analytics data')
    }
  }

  /**
   * Get analytics preferences for a user
   */
  async getAnalyticsPreferences(userId: string): Promise<AnalyticsPreferences> {
    try {
      const preferences = await prisma.userPreference.findMany({
        where: {
          userId,
          key: {
            startsWith: 'analytics.'
          }
        }
      })

      const prefs: AnalyticsPreferences = {
        enabled: true,
        dataRetentionDays: 90,
        collectDetailedMetrics: true,
        allowPersonalization: true
      }

      preferences.forEach(pref => {
        const key = pref.key.replace('analytics.', '')
        const value = pref.isEncrypted
          ? JSON.parse(require('../publishing/credentialStorage').secureRetrieveCredentials(pref.value))
          : JSON.parse(pref.value)

        switch (key) {
          case 'enabled':
            prefs.enabled = Boolean(value)
            break
          case 'dataRetentionDays':
            prefs.dataRetentionDays = Number(value)
            break
          case 'collectDetailedMetrics':
            prefs.collectDetailedMetrics = Boolean(value)
            break
          case 'allowPersonalization':
            prefs.allowPersonalization = Boolean(value)
            break
        }
      })

      return prefs
    } catch (error) {
      console.error('Failed to get analytics preferences:', error)
      return {
        enabled: true,
        dataRetentionDays: 90,
        collectDetailedMetrics: true,
        allowPersonalization: true
      }
    }
  }

  /**
   * Set analytics preferences for a user
   */
  async setAnalyticsPreferences(userId: string, preferences: Partial<AnalyticsPreferences>): Promise<void> {
    try {
      const updates = Object.entries(preferences).map(([key, value]) => ({
        key: `analytics.${key}`,
        value: JSON.stringify(value),
        category: 'analytics',
        encrypt: false
      }))

      for (const update of updates) {
        await prisma.userPreference.upsert({
          where: {
            userId_key: {
              userId,
              key: update.key
            }
          },
          update: {
            value: update.value,
            category: update.category,
            isEncrypted: update.encrypt,
            updatedAt: new Date()
          },
          create: {
            userId,
            key: update.key,
            value: update.value,
            category: update.category,
            isEncrypted: update.encrypt
          }
        })
      }
    } catch (error) {
      console.error('Failed to set analytics preferences:', error)
      throw new Error('Failed to update analytics preferences')
    }
  }

  /**
   * Clean up old analytics data based on retention policies
   */
  async cleanupOldData(olderThan: Date): Promise<number> {
    try {
      const [eventsDeleted, metricsDeleted, cacheDeleted] = await Promise.all([
        prisma.analyticsEvent.deleteMany({
          where: { timestamp: { lt: olderThan } }
        }),
        prisma.analyticsMetric.deleteMany({
          where: { date: { lt: olderThan } }
        }),
        prisma.analyticsCache.deleteMany({
          where: { expiresAt: { lt: new Date() } }
        })
      ])

      return eventsDeleted.count + metricsDeleted.count + cacheDeleted.count
    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error)
      return 0
    }
  }

  // Private helper methods

  private async calculateContentCreationMetrics(userId: string | undefined, startDate: Date, endDate: Date): Promise<void> {
    try {
      // Get content creation events
      const contentEvents = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          eventType: 'content_created',
          timestamp: { gte: startDate, lte: endDate }
        }
      })

      if (contentEvents.length === 0) return

      // Calculate daily content creation
      const dailyCounts = new Map<string, number>()
      contentEvents.forEach(event => {
        const date = event.timestamp.toISOString().split('T')[0]
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)
      })

      // Store metrics
      for (const [date, count] of dailyCounts) {
        await this.storeMetric(userId, 'content_created_daily', count, { date }, new Date(date))
      }

      // Calculate total content
      const totalContent = contentEvents.length
      await this.storeMetric(userId, 'content_created_total', totalContent, {}, startDate)

    } catch (error) {
      console.error('Failed to calculate content creation metrics:', error)
    }
  }

  private async calculateRssMonitoringMetrics(userId: string | undefined, startDate: Date, endDate: Date): Promise<void> {
    try {
      const feedEvents = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          eventType: 'feed_monitored',
          timestamp: { gte: startDate, lte: endDate }
        }
      })

      if (feedEvents.length === 0) return

      // Calculate monitoring frequency and success rate
      const totalMonitoring = feedEvents.length
      const successfulMonitoring = feedEvents.filter(event => {
        const data = event.eventData ? JSON.parse(event.eventData) : {}
        return data.success !== false
      }).length

      const successRate = totalMonitoring > 0 ? (successfulMonitoring / totalMonitoring) * 100 : 0

      await this.storeMetric(userId, 'feed_monitoring_frequency', totalMonitoring, {}, startDate)
      await this.storeMetric(userId, 'feed_monitoring_success_rate', successRate, {}, startDate)

    } catch (error) {
      console.error('Failed to calculate RSS monitoring metrics:', error)
    }
  }

  private async calculateAiUsageMetrics(userId: string | undefined, startDate: Date, endDate: Date): Promise<void> {
    try {
      const aiEvents = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          eventType: 'ai_used',
          timestamp: { gte: startDate, lte: endDate }
        }
      })

      if (aiEvents.length === 0) return

      const totalRequests = aiEvents.length
      const successfulRequests = aiEvents.filter(event => {
        const data = event.eventData ? JSON.parse(event.eventData) : {}
        return data.success !== false
      }).length

      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

      // Calculate average response time
      const responseTimes = aiEvents
        .map(event => {
          const data = event.eventData ? JSON.parse(event.eventData) : {}
          return data.responseTime || 0
        })
        .filter(time => time > 0)

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0

      await this.storeMetric(userId, 'ai_requests_total', totalRequests, {}, startDate)
      await this.storeMetric(userId, 'ai_success_rate', successRate, {}, startDate)
      await this.storeMetric(userId, 'ai_average_response_time', averageResponseTime, {}, startDate)

    } catch (error) {
      console.error('Failed to calculate AI usage metrics:', error)
    }
  }

  private async calculatePublishingMetrics(userId: string | undefined, startDate: Date, endDate: Date): Promise<void> {
    try {
      const publishEvents = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          eventType: 'published',
          timestamp: { gte: startDate, lte: endDate }
        }
      })

      if (publishEvents.length === 0) return

      const totalPublished = publishEvents.length
      const successfulPublished = publishEvents.filter(event => {
        const data = event.eventData ? JSON.parse(event.eventData) : {}
        return data.success !== false
      }).length

      const successRate = totalPublished > 0 ? (successfulPublished / totalPublished) * 100 : 0

      await this.storeMetric(userId, 'publishing_total', totalPublished, {}, startDate)
      await this.storeMetric(userId, 'publishing_success_rate', successRate, {}, startDate)

    } catch (error) {
      console.error('Failed to calculate publishing metrics:', error)
    }
  }

  private async aggregateDashboardData(userId: string | undefined, timeRange: TimeRange): Promise<DashboardData> {
    try {
      // Get real data from database
      const [contentStats, feedStats, feedItems] = await Promise.all([
        prisma.content.aggregate({
          where: {
            userId,
            createdAt: { gte: timeRange.start, lte: timeRange.end }
          },
          _count: { id: true },
          _avg: { wordCount: true }
        }),
        prisma.feed.aggregate({
          where: { userId },
          _count: { id: true }
        }),
        prisma.feedItem.findMany({
          where: {
            feed: { userId },
            createdAt: { gte: timeRange.start, lte: timeRange.end }
          },
          include: { feed: true },
          orderBy: { createdAt: 'desc' },
          take: 100
        })
      ])

      // Calculate content by date
      const contentByDateMap = new Map<string, number>()
      const allContent = await prisma.content.findMany({
        where: {
          userId,
          createdAt: { gte: timeRange.start, lte: timeRange.end }
        },
        select: { createdAt: true }
      })

      allContent.forEach(content => {
        const date = content.createdAt.toISOString().split('T')[0]
        contentByDateMap.set(date, (contentByDateMap.get(date) || 0) + 1)
      })

      const contentByDate = Array.from(contentByDateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Get feed health
      const feedHealth = await prisma.feed.findMany({
        where: { userId },
        select: { title: true, healthScore: true }
      })

      const validHealthScores = feedHealth.map(f => f.healthScore).filter(h => h !== null && h !== undefined)
      const averageHealth = validHealthScores.length > 0
        ? validHealthScores.reduce((sum, score) => sum + score, 0) / validHealthScores.length
        : 0

      return {
        contentCreation: {
          totalContent: contentStats._count.id,
          contentByDate,
          averageLength: contentStats._avg.wordCount || 0,
          topTopics: [], // Would need topic analysis
          contentTypes: [] // Would need content type analysis
        },
        rssMonitoring: {
          totalFeeds: feedStats._count.id,
          monitoringFrequency: 0, // Would need to calculate from events
          successRate: averageHealth * 100,
          newContentDiscovered: feedItems.length,
          feedHealth: feedHealth.map(feed => ({
            feed: feed.title || 'Unknown',
            health: (feed.healthScore || 0) * 100
          }))
        },
        aiUsage: {
          totalRequests: 0, // Would need AI usage tracking
          averageResponseTime: 0,
          successRate: 0,
          modelUsage: [],
          tokenUsage: 0
        },
        publishing: {
          totalPublished: 0, // Would need publishing tracking
          successRate: 0,
          averagePublishTime: 0,
          platformPerformance: [],
          publishingTrends: []
        }
      }
    } catch (error) {
      console.error('Failed to aggregate dashboard data:', error)
      // Return empty data on error
      return {
        contentCreation: {
          totalContent: 0,
          contentByDate: [],
          averageLength: 0,
          topTopics: [],
          contentTypes: []
        },
        rssMonitoring: {
          totalFeeds: 0,
          monitoringFrequency: 0,
          successRate: 0,
          newContentDiscovered: 0,
          feedHealth: []
        },
        aiUsage: {
          totalRequests: 0,
          averageResponseTime: 0,
          successRate: 0,
          modelUsage: [],
          tokenUsage: 0
        },
        publishing: {
          totalPublished: 0,
          successRate: 0,
          averagePublishTime: 0,
          platformPerformance: [],
          publishingTrends: []
        }
      }
    }
  }

  private async storeMetric(
    userId: string | undefined,
    metricType: string,
    value: number,
    metadata: Record<string, any>,
    date: Date
  ): Promise<void> {
    try {
      await prisma.analyticsMetric.upsert({
        where: {
          id: `${userId || 'anonymous'}-${metricType}-${date.toISOString().split('T')[0]}`
        },
        update: {
          value,
          metadata: JSON.stringify(metadata),
          date
        },
        create: {
          userId,
          metricType,
          value,
          metadata: JSON.stringify(metadata),
          date
        }
      })
    } catch (error) {
      console.error('Failed to store metric:', error)
    }
  }

  private getCached(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > new Date()) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCached(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: new Date(Date.now() + ttlMs)
    })
  }

  private invalidateCache(userId: string | undefined, eventType: string): void {
    // Invalidate dashboard caches for this user
    const prefix = `dashboard:${userId || 'anonymous'}:`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  private clearUserCache(userId: string | undefined): void {
    const prefix = `dashboard:${userId || 'anonymous'}:`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()