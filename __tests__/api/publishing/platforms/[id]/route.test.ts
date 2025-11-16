import { NextRequest } from 'next/server'
import { PUT, DELETE } from '@/app/api/publishing/platforms/[id]/route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url: string, options: any = {}) {
      ;(this as any).url = url
      ;(this as any).method = options.method || 'GET'
      ;(this as any).headers = new Headers(options.headers)
      ;(this as any).body = options.body
    }

    async json() {
      return JSON.parse((this as any).body)
    }

    async text() {
      return (this as any).body
    }
  },
  NextResponse: {
    json: (data: any, options: any = {}) => ({
      status: options.status || 200,
      json: async () => data,
    }),
  },
}))

// Mock PublishingService
jest.mock('@/lib/publishing/publishingService', () => ({
  PublishingService: jest.fn().mockImplementation(() => ({
    updatePlatform: jest.fn(),
    deletePlatform: jest.fn()
  }))
}))

describe('/api/publishing/platforms/[id]', () => {
  let mockPublishingService: any

  beforeEach(() => {
    jest.clearAllMocks()
    const PublishingServiceMock = require('@/lib/publishing/publishingService').PublishingService
    mockPublishingService = new PublishingServiceMock()
  })

  describe('PUT', () => {
    const mockUpdatedPlatform = {
      id: 'platform-1',
      name: 'Updated WordPress Blog',
      platform: 'wordpress',
      credentials: {
        apiKey: 'updated-key',
        username: 'updateduser',
        siteUrl: 'https://updated.com'
      },
      settings: {
        format: 'html',
        defaultTags: ['updated', 'tech']
      },
      isActive: true,
      createdAt: new Date('2025-11-15T10:00:00Z'),
      updatedAt: new Date('2025-11-15T12:00:00Z')
    }

    it('should update platform successfully', async () => {
      const updateData = {
        name: 'Updated WordPress Blog',
        settings: {
          defaultTags: ['updated', 'tech']
        }
      }

      mockPublishingService.updatePlatform.mockResolvedValue(mockUpdatedPlatform)

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await PUT(request, { params: { id: 'platform-1' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.platform).toEqual(mockUpdatedPlatform)

      expect(mockPublishingService.updatePlatform).toHaveBeenCalledWith('platform-1', updateData)
    })

    it('should validate update data', async () => {
      const invalidData = {
        name: '', // Invalid: empty string
        settings: {
          format: 'invalid-format' // Invalid: not in enum
        }
      }

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await PUT(request, { params: { id: 'platform-1' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid platform data')
      expect(result.details).toBeDefined()

      expect(mockPublishingService.updatePlatform).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        {
          method: 'PUT',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await PUT(request, { params: { id: 'platform-1' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid platform data')

      expect(mockPublishingService.updatePlatform).not.toHaveBeenCalled()
    })

    it('should handle service errors during update', async () => {
      const updateData = { name: 'New Name' }
      mockPublishingService.updatePlatform.mockRejectedValue(new Error('Update failed'))

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await PUT(request, { params: { id: 'platform-1' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to update platform')

      expect(mockPublishingService.updatePlatform).toHaveBeenCalledWith('platform-1', updateData)
    })

    it('should allow partial updates', async () => {
      const partialUpdate = {
        isActive: false
      }

      mockPublishingService.updatePlatform.mockResolvedValue({
        ...mockUpdatedPlatform,
        isActive: false
      })

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        {
          method: 'PUT',
          body: JSON.stringify(partialUpdate),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await PUT(request, { params: { id: 'platform-1' } })

      expect(response.status).toBe(200)
      expect(mockPublishingService.updatePlatform).toHaveBeenCalledWith('platform-1', partialUpdate)
    })
  })

  describe('DELETE', () => {
    it('should delete platform successfully', async () => {
      mockPublishingService.deletePlatform.mockResolvedValue(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, { params: { id: 'platform-1' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.message).toBe('Platform deleted successfully')

      expect(mockPublishingService.deletePlatform).toHaveBeenCalledWith('platform-1')
    })

    it('should handle service errors during deletion', async () => {
      mockPublishingService.deletePlatform.mockRejectedValue(new Error('Deletion failed'))

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/platform-1',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, { params: { id: 'platform-1' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to delete platform')

      expect(mockPublishingService.deletePlatform).toHaveBeenCalledWith('platform-1')
    })

    it('should handle different platform IDs', async () => {
      mockPublishingService.deletePlatform.mockResolvedValue(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/platforms/different-id',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, { params: { id: 'different-id' } })

      expect(response.status).toBe(200)
      expect(mockPublishingService.deletePlatform).toHaveBeenCalledWith('different-id')
    })
  })
})