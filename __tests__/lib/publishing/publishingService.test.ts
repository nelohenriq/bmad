// Get the mock prisma instance from the mocked PrismaClient
const mockPrisma = (require('@prisma/client').PrismaClient as jest.Mock).mock.results[0].value


import { PublishingService } from '../../../src/lib/publishing/publishingService'

// Mock logger
jest.mock('../../../src/lib/logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock the ExportService
jest.mock('../../../src/lib/export/exportService', () => ({
  ExportService: jest.fn().mockImplementation(() => ({
    exportContent: jest.fn().mockResolvedValue({
      content: '<h1>Test Content</h1>',
      fileName: 'test-content.html',
      mimeType: 'text/html',
      fileSize: 150
    })
  }))
}))

describe('PublishingService', () => {
  let publishingService: PublishingService

  beforeEach(() => {
    jest.clearAllMocks()
    publishingService = new PublishingService()
  })

  describe('getPlatforms', () => {
    it('should return list of active platforms', async () => {
      const mockPlatforms = [
        {
          id: '1',
          name: 'My WordPress',
          platform: 'wordpress',
          credentials: '{"apiKey": "test-key"}',
          settings: '{"format": "html"}',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.platform.findMany.mockResolvedValue(mockPlatforms)

      const result = await publishingService.getPlatforms()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: '1',
        name: 'My WordPress',
        platform: 'wordpress',
        credentials: { apiKey: 'test-key' },
        settings: { format: 'html' },
        isActive: true
      })

      expect(mockPrisma.platform.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('addPlatform', () => {
    it('should add a new platform configuration', async () => {
      const platformData = {
        name: 'My Medium Blog',
        platform: 'medium' as const,
        credentials: { apiKey: 'medium-key' },
        settings: { format: 'markdown' as const },
        isActive: true
      }

      const mockCreatedPlatform = {
        id: '2',
        name: 'My Medium Blog',
        platform: 'medium',
        credentials: '{"apiKey": "medium-key"}',
        settings: '{"format": "markdown"}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.platform.create.mockResolvedValue(mockCreatedPlatform)

      const result = await publishingService.addPlatform(platformData)

      expect(result).toMatchObject({
        id: '2',
        name: 'My Medium Blog',
        platform: 'medium',
        credentials: { apiKey: 'medium-key' },
        settings: { format: 'markdown' },
        isActive: true
      })

      expect(mockPrisma.platform.create).toHaveBeenCalledWith({
        data: {
          name: 'My Medium Blog',
          platform: 'medium',
          credentials: JSON.stringify({ apiKey: 'medium-key' }),
          settings: JSON.stringify({ format: 'markdown' }),
          isActive: true
        }
      })
    })
  })

  describe('publishToPlatform', () => {
    it('should publish content to a single platform', async () => {
      const mockPlatform = {
        id: '1',
        name: 'Test WordPress',
        platform: 'wordpress' as const,
        credentials: { apiKey: 'wp-key', username: 'testuser', siteUrl: 'https://test.com' },
        settings: { format: 'html' as const },
        isActive: true
      }

      const mockJob = {
        id: 'job-1',
        contentId: 'content-1',
        platformId: '1',
        platformConfig: mockPlatform,
        status: 'processing' as const
      }

      // Mock platform lookup
      mockPrisma.platform.findMany = jest.fn().mockResolvedValue([mockPlatform])

      // Mock job creation
      mockPrisma.publishingJob.create.mockResolvedValue(mockJob)

      // Mock content lookup
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 'content-1',
        title: 'Test Content',
        content: '<h1>Test Content</h1>'
      })

      // Mock successful publishing
      mockPrisma.publishingJob.update.mockResolvedValue({})

      const result = await publishingService.publishToPlatform('content-1', '1')

      expect(result).toBeDefined()
      expect(result.contentId).toBe('content-1')
      expect(result.platformId).toBe('1')
      expect(result.status).toBe('processing')
    })

    it('should handle platform not found error', async () => {
      mockPrisma.platform.findMany = jest.fn().mockResolvedValue([])

      await expect(publishingService.publishToPlatform('content-1', 'nonexistent'))
        .rejects.toThrow('Platform not found')
    })
  })

  describe('publishToMultiplePlatforms', () => {
    it('should publish content to multiple platforms', async () => {
      const mockPlatforms = [
        {
          id: '1',
          name: 'WordPress Blog',
          platform: 'wordpress' as const,
          credentials: { apiKey: 'wp-key', username: 'testuser', siteUrl: 'https://test.com' },
          settings: { format: 'html' as const },
          isActive: true
        },
        {
          id: '2',
          name: 'Medium Blog',
          platform: 'medium' as const,
          credentials: { apiKey: 'medium-key' },
          settings: { format: 'markdown' as const },
          isActive: true
        }
      ]

      // Mock platform lookup to return both platforms
      mockPrisma.platform.findMany = jest.fn().mockResolvedValue(mockPlatforms)

      const mockJobs = [
        {
          id: 'job-1',
          contentId: 'content-1',
          platformId: '1',
          platformConfig: mockPlatforms[0],
          status: 'processing' as const
        },
        {
          id: 'job-2',
          contentId: 'content-1',
          platformId: '2',
          platformConfig: mockPlatforms[1],
          status: 'processing' as const
        }
      ]

      mockPrisma.publishingJob.create
        .mockResolvedValueOnce(mockJobs[0])
        .mockResolvedValueOnce(mockJobs[1])

      const result = await publishingService.publishToMultiplePlatforms('content-1', ['1', '2'])

      expect(result).toHaveLength(2)
      expect(result[0].platformId).toBe('1')
      expect(result[1].platformId).toBe('2')
      expect(mockPrisma.publishingJob.create).toHaveBeenCalledTimes(2)
    })

    it('should handle missing platform when publishing to multiple', async () => {
      const mockPlatforms = [
        {
          id: '1',
          name: 'WordPress Blog',
          platform: 'wordpress' as const,
          credentials: { apiKey: 'wp-key' },
          settings: { format: 'html' as const },
          isActive: true
        }
      ]

      mockPrisma.platform.findMany = jest.fn().mockResolvedValue(mockPlatforms)

      await expect(publishingService.publishToMultiplePlatforms('content-1', ['1', 'nonexistent']))
        .rejects.toThrow('Platform nonexistent not found')
    })
  })

  describe('getPublishingJobs', () => {
    it('should return publishing jobs for content', async () => {
      const mockPlatform = {
        id: '1',
        name: 'Test Platform',
        platform: 'wordpress' as const,
        credentials: {},
        settings: {},
        isActive: true
      }

      const mockJobs = [
        {
          id: 'job-1',
          contentId: 'content-1',
          platformId: '1',
          status: 'published',
          scheduledAt: null,
          publishedAt: new Date(),
          error: null,
          platformPostId: 'post-123',
          platformUrl: 'https://test.com/post-123'
        }
      ]

      mockPrisma.publishingJob.findMany.mockResolvedValue(mockJobs)
      mockPrisma.platform.findMany = jest.fn().mockResolvedValue([mockPlatform])

      const result = await publishingService.getPublishingJobs('content-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'job-1',
        contentId: 'content-1',
        platformId: '1',
        status: 'published',
        platformPostId: 'post-123',
        platformUrl: 'https://test.com/post-123'
      })
    })
  })

  describe('getPublishingStats', () => {
    it('should return publishing statistics', async () => {
      const mockPlatforms = [
        {
          id: '1',
          name: 'WordPress',
          platform: 'wordpress' as const,
          credentials: {},
          settings: {},
          isActive: true
        },
        {
          id: '2',
          name: 'Medium',
          platform: 'medium' as const,
          credentials: {},
          settings: {},
          isActive: true
        }
      ]

      const mockJobs = [
        { id: '1', contentId: '1', platformId: '1', status: 'published' },
        { id: '2', contentId: '2', platformId: '1', status: 'failed' },
        { id: '3', contentId: '3', platformId: '2', status: 'queued' },
        { id: '4', contentId: '4', platformId: '2', status: 'published' }
      ]

      mockPrisma.publishingJob.findMany.mockResolvedValue(mockJobs)
      mockPrisma.platform.findMany = jest.fn().mockResolvedValue(mockPlatforms)

      const result = await publishingService.getPublishingStats()

      expect(result).toEqual({
        total: 4,
        published: 2,
        failed: 1,
        queued: 1,
        processing: 0,
        platforms: {
          'WordPress': 2,
          'Medium': 2
        }
      })
    })
  })
})
