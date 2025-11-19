import { AnalyticsService } from '../../../src/lib/analytics/analyticsService'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    analyticsEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn()
    },
    analyticsMetric: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn()
    },
    analyticsCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn()
    },
    userPreference: {
      findMany: jest.fn(),
      upsert: jest.fn()
    }
  }))
}))

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService
  let mockPrisma: any

  beforeEach(() => {
    jest.clearAllMocks()
    analyticsService = new AnalyticsService()
    mockPrisma = (require('@prisma/client').PrismaClient as jest.Mock).mock.results[0].value
  })

  describe('recordEvent', () => {
    it('should record event when analytics is enabled', async () => {
      mockPrisma.userPreference.findMany.mockResolvedValue([
        { key: 'analytics.enabled', value: '"true"' }
      ])
      mockPrisma.analyticsEvent.create.mockResolvedValue({})

      await analyticsService.recordEvent('user-1', 'content_created', { contentId: '123' })

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          eventType: 'content_created',
          eventData: '{"contentId":"123"}',
          sessionId: undefined
        }
      })
    })

    it('should skip recording when analytics is disabled', async () => {
      mockPrisma.userPreference.findMany.mockResolvedValue([
        { key: 'analytics.enabled', value: '"false"' }
      ])

      await analyticsService.recordEvent('user-1', 'content_created')

      expect(mockPrisma.analyticsEvent.create).not.toHaveBeenCalled()
    })

    it('should handle anonymous users', async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({})

      await analyticsService.recordEvent(undefined, 'page_view', { page: '/dashboard' })

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          eventType: 'page_view',
          eventData: '{"page":"/dashboard"}',
          sessionId: undefined
        }
      })
    })
  })

  describe('calculateMetrics', () => {
    it('should calculate metrics for given time range', async () => {
      const startDate = new Date('2025-01-01')
      const endDate = new Date('2025-01-31')

      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        {
          id: '1',
          eventType: 'content_created',
          timestamp: new Date('2025-01-15'),
          eventData: null
        }
      ])

      await analyticsService.calculateMetrics('user-1', { start: startDate, end: endDate })

      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalled()
      expect(mockPrisma.analyticsMetric.upsert).toHaveBeenCalled()
    })
  })

  describe('getDashboardData', () => {
    it('should return cached data if available', async () => {
      const cachedData = { contentCreation: { totalContent: 10 } }
      const cacheKey = 'dashboard:user-1:2025-01-01T00:00:00.000Z:2025-01-31T00:00:00.000Z'

      // Mock cache
      ;(analyticsService as any).cache.set(cacheKey, {
        data: cachedData,
        expiresAt: new Date(Date.now() + 60000)
      })

      const result = await analyticsService.getDashboardData('user-1', {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      })

      expect(result).toEqual(cachedData)
    })

    it('should calculate and cache data when not cached', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([])
      mockPrisma.analyticsMetric.findMany.mockResolvedValue([])

      const result = await analyticsService.getDashboardData('user-1', {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      })

      expect(result).toHaveProperty('contentCreation')
      expect(result).toHaveProperty('rssMonitoring')
      expect(result).toHaveProperty('aiUsage')
      expect(result).toHaveProperty('publishing')
    })
  })

  describe('getMetrics', () => {
    it('should return parsed metrics for given type and range', async () => {
      const mockMetrics = [
        {
          id: '1',
          metricType: 'content_created_daily',
          value: 5,
          metadata: '{"date":"2025-01-15"}',
          date: new Date('2025-01-15')
        }
      ]

      mockPrisma.analyticsMetric.findMany.mockResolvedValue(mockMetrics)

      const result = await analyticsService.getMetrics('user-1', 'content_created_daily', {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: '1',
        userId: 'user-1',
        metricType: 'content_created_daily',
        value: 5,
        metadata: { date: '2025-01-15' },
        date: new Date('2025-01-15')
      })
    })
  })

  describe('exportAnalyticsData', () => {
    it('should export complete user analytics data', async () => {
      const mockEvents = [
        {
          id: '1',
          eventType: 'content_created',
          eventData: '{"contentId":"123"}',
          timestamp: new Date(),
          sessionId: 'session-1'
        }
      ]

      const mockMetrics = [
        {
          id: '1',
          metricType: 'content_created_total',
          value: 10,
          metadata: null,
          date: new Date()
        }
      ]

      mockPrisma.analyticsEvent.findMany.mockResolvedValue(mockEvents)
      mockPrisma.analyticsMetric.findMany.mockResolvedValue(mockMetrics)

      const result = await analyticsService.exportAnalyticsData('user-1')

      expect(result).toHaveProperty('userId', 'user-1')
      expect(result).toHaveProperty('exportedAt')
      expect(result).toHaveProperty('events')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('version', '1.0')
      expect(result.events).toHaveLength(1)
      expect(result.metrics).toHaveLength(1)
    })
  })

  describe('clearAnalyticsData', () => {
    it('should clear all analytics data for user', async () => {
      mockPrisma.analyticsEvent.deleteMany.mockResolvedValue({ count: 5 })
      mockPrisma.analyticsMetric.deleteMany.mockResolvedValue({ count: 3 })
      mockPrisma.analyticsCache.deleteMany.mockResolvedValue({ count: 2 })

      await analyticsService.clearAnalyticsData('user-1')

      expect(mockPrisma.analyticsEvent.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' }
      })
      expect(mockPrisma.analyticsMetric.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' }
      })
      expect(mockPrisma.analyticsCache.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' }
      })
    })
  })

  describe('getAnalyticsPreferences', () => {
    it('should return default preferences when none set', async () => {
      mockPrisma.userPreference.findMany.mockResolvedValue([])

      const result = await analyticsService.getAnalyticsPreferences('user-1')

      expect(result).toEqual({
        enabled: true,
        dataRetentionDays: 90,
        collectDetailedMetrics: true,
        allowPersonalization: true
      })
    })

    it('should parse user preferences correctly', async () => {
      mockPrisma.userPreference.findMany.mockResolvedValue([
        { key: 'analytics.enabled', value: '"false"' },
        { key: 'analytics.dataRetentionDays', value: '"30"' },
        { key: 'analytics.collectDetailedMetrics', value: '"false"' }
      ])

      const result = await analyticsService.getAnalyticsPreferences('user-1')

      expect(result).toEqual({
        enabled: false,
        dataRetentionDays: 30,
        collectDetailedMetrics: false,
        allowPersonalization: true
      })
    })
  })

  describe('setAnalyticsPreferences', () => {
    it('should save preferences correctly', async () => {
      mockPrisma.userPreference.upsert.mockResolvedValue({})

      await analyticsService.setAnalyticsPreferences('user-1', {
        enabled: false,
        dataRetentionDays: 30
      })

      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledTimes(2)
      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_key: {
            userId: 'user-1',
            key: 'analytics.enabled'
          }
        },
        update: {
          value: '"false"',
          category: 'analytics',
          isEncrypted: false,
          updatedAt: expect.any(Date)
        },
        create: {
          userId: 'user-1',
          key: 'analytics.enabled',
          value: '"false"',
          category: 'analytics',
          isEncrypted: false
        }
      })
    })
  })

  describe('cleanupOldData', () => {
    it('should cleanup old analytics data', async () => {
      const olderThan = new Date('2025-01-01')

      mockPrisma.analyticsEvent.deleteMany.mockResolvedValue({ count: 10 })
      mockPrisma.analyticsMetric.deleteMany.mockResolvedValue({ count: 5 })
      mockPrisma.analyticsCache.deleteMany.mockResolvedValue({ count: 2 })

      const result = await analyticsService.cleanupOldData(olderThan)

      expect(result).toBe(17) // 10 + 5 + 2
      expect(mockPrisma.analyticsEvent.deleteMany).toHaveBeenCalledWith({
        where: { timestamp: { lt: olderThan } }
      })
      expect(mockPrisma.analyticsMetric.deleteMany).toHaveBeenCalledWith({
        where: { date: { lt: olderThan } }
      })
      expect(mockPrisma.analyticsCache.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } }
      })
    })
  })

  describe('cache management', () => {
    it('should cache and retrieve data correctly', () => {
      const testData = { test: 'data' }
      const cacheKey = 'test:key'

      // Set cache
      ;(analyticsService as any).setCached(cacheKey, testData, 5000)

      // Get cache
      const cached = (analyticsService as any).getCached(cacheKey)

      expect(cached).toEqual(testData)
    })

    it('should return null for expired cache', () => {
      const testData = { test: 'data' }
      const cacheKey = 'test:key'

      // Set cache with negative TTL (expired)
      ;(analyticsService as any).setCached(cacheKey, testData, -1000)

      // Get cache
      const cached = (analyticsService as any).getCached(cacheKey)

      expect(cached).toBeNull()
    })

    it('should invalidate cache correctly', () => {
      const testData = { test: 'data' }
      const cacheKey = 'dashboard:user-1:2025-01-01:2025-01-31'

      // Set cache
      ;(analyticsService as any).setCached(cacheKey, testData, 5000)

      // Invalidate
      ;(analyticsService as any).invalidateCache('user-1', 'content_created')

      // Should be cleared
      const cached = (analyticsService as any).getCached(cacheKey)
      expect(cached).toBeNull()
    })
  })

  describe('metric calculation helpers', () => {
    describe('calculateContentCreationMetrics', () => {
      it('should calculate content creation metrics', async () => {
        const events = [
          {
            id: '1',
            eventType: 'content_created',
            timestamp: new Date('2025-01-15'),
            eventData: null
          },
          {
            id: '2',
            eventType: 'content_created',
            timestamp: new Date('2025-01-15'),
            eventData: null
          }
        ]

        mockPrisma.analyticsEvent.findMany.mockResolvedValue(events)
        mockPrisma.analyticsMetric.upsert.mockResolvedValue({})

        await (analyticsService as any).calculateContentCreationMetrics(
          'user-1',
          new Date('2025-01-01'),
          new Date('2025-01-31')
        )

        expect(mockPrisma.analyticsMetric.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              metricType: 'content_created_daily',
              value: 2
            })
          })
        )
      })
    })

    describe('calculateRssMonitoringMetrics', () => {
      it('should calculate RSS monitoring metrics', async () => {
        const events = [
          {
            id: '1',
            eventType: 'feed_monitored',
            timestamp: new Date('2025-01-15'),
            eventData: '{"success":true}'
          }
        ]

        mockPrisma.analyticsEvent.findMany.mockResolvedValue(events)
        mockPrisma.analyticsMetric.upsert.mockResolvedValue({})

        await (analyticsService as any).calculateRssMonitoringMetrics(
          'user-1',
          new Date('2025-01-01'),
          new Date('2025-01-31')
        )

        expect(mockPrisma.analyticsMetric.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              metricType: 'feed_monitoring_success_rate',
              value: 100
            })
          })
        )
      })
    })

    describe('calculateAiUsageMetrics', () => {
      it('should calculate AI usage metrics', async () => {
        const events = [
          {
            id: '1',
            eventType: 'ai_request_completed',
            timestamp: new Date('2025-01-15'),
            eventData: '{"responseTime":1500,"success":true}'
          }
        ]

        mockPrisma.analyticsEvent.findMany.mockResolvedValue(events)
        mockPrisma.analyticsMetric.upsert.mockResolvedValue({})

        await (analyticsService as any).calculateAiUsageMetrics(
          'user-1',
          new Date('2025-01-01'),
          new Date('2025-01-31')
        )

        expect(mockPrisma.analyticsMetric.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              metricType: 'ai_average_response_time',
              value: 1500
            })
          })
        )
      })
    })

    describe('calculatePublishingMetrics', () => {
      it('should calculate publishing metrics', async () => {
        const events = [
          {
            id: '1',
            eventType: 'published',
            timestamp: new Date('2025-01-15'),
            eventData: '{"success":true}'
          }
        ]

        mockPrisma.analyticsEvent.findMany.mockResolvedValue(events)
        mockPrisma.analyticsMetric.upsert.mockResolvedValue({})

        await (analyticsService as any).calculatePublishingMetrics(
          'user-1',
          new Date('2025-01-01'),
          new Date('2025-01-31')
        )

        expect(mockPrisma.analyticsMetric.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              metricType: 'publishing_success_rate',
              value: 100
            })
          })
        )
      })
    })
  })
})