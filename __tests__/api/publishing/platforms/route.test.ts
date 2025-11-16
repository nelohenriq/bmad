import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/publishing/platforms/route'

// Mock PublishingService
jest.mock('@/lib/publishing/publishingService', () => ({
  PublishingService: jest.fn().mockImplementation(() => ({
    getPlatforms: jest.fn(),
    addPlatform: jest.fn()
  }))
}))

describe('/api/publishing/platforms', () => {
  let mockPublishingService: any

  beforeEach(() => {
    jest.clearAllMocks()
    const PublishingServiceMock = require('@/lib/publishing/publishingService').PublishingService
    mockPublishingService = new PublishingServiceMock()
  })

  describe('GET', () => {
    const mockPlatforms = [
      {
        id: 'platform-1',
        name: 'My WordPress Blog',
        platform: 'wordpress',
        credentials: {
          apiKey: 'wp-key',
          username: 'testuser',
          siteUrl: 'https://example.com'
        },
        settings: {
          format: 'html',
          defaultTags: ['tech', 'ai']
        },
        isActive: true,
        createdAt: new Date('2025-11-15T10:00:00Z'),
        updatedAt: new Date('2025-11-15T10:00:00Z')
      },
      {
        id: 'platform-2',
        name: 'My Medium Account',
        platform: 'medium',
        credentials: {
          apiKey: 'medium-key'
        },
        settings: {
          format: 'markdown'
        },
        isActive: true,
        createdAt: new Date('2025-11-15T11:00:00Z'),
        updatedAt: new Date('2025-11-15T11:00:00Z')
      }
    ]

    it('should return list of platforms successfully', async () => {
      mockPublishingService.getPlatforms.mockResolvedValue(mockPlatforms)

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.platforms).toHaveLength(2)
      expect(result.platforms[0]).toEqual(mockPlatforms[0])
      expect(result.platforms[1]).toEqual(mockPlatforms[1])

      expect(mockPublishingService.getPlatforms).toHaveBeenCalled()
    })

    it('should return empty array when no platforms exist', async () => {
      mockPublishingService.getPlatforms.mockResolvedValue([])

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.platforms).toEqual([])

      expect(mockPublishingService.getPlatforms).toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      mockPublishingService.getPlatforms.mockRejectedValue(new Error('Database connection failed'))

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to get platforms')

      expect(mockPublishingService.getPlatforms).toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    const validPlatformData = {
      name: 'New WordPress Blog',
      platform: 'wordpress',
      credentials: {
        apiKey: 'new-wp-key',
        username: 'newuser',
        siteUrl: 'https://newblog.com'
      },
      settings: {
        format: 'html',
        defaultTags: ['blog']
      },
      isActive: true
    }

    const mockCreatedPlatform = {
      id: 'platform-new',
      ...validPlatformData,
      createdAt: new Date('2025-11-15T12:00:00Z'),
      updatedAt: new Date('2025-11-15T12:00:00Z')
    }

    it('should create a new platform successfully', async () => {
      mockPublishingService.addPlatform.mockResolvedValue(mockCreatedPlatform)

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms',
        {
          method: 'POST',
          body: JSON.stringify(validPlatformData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.platform).toEqual(mockCreatedPlatform)

      expect(mockPublishingService.addPlatform).toHaveBeenCalledWith(validPlatformData)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Platform'
        // Missing platform, credentials, settings, isActive
      }

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toBeDefined()

      expect(mockPublishingService.addPlatform).not.toHaveBeenCalled()
    })

    it('should validate platform type', async () => {
      const invalidData = {
        ...validPlatformData,
        platform: 'invalid-platform'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toBeDefined()

      expect(mockPublishingService.addPlatform).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms',
        {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')

      expect(mockPublishingService.addPlatform).not.toHaveBeenCalled()
    })

    it('should handle service errors during creation', async () => {
      mockPublishingService.addPlatform.mockRejectedValue(new Error('Platform creation failed'))

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms',
        {
          method: 'POST',
          body: JSON.stringify(validPlatformData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to create platform')

      expect(mockPublishingService.addPlatform).toHaveBeenCalledWith(validPlatformData)
    })
  })
})