import { NextRequest } from 'next/server'

// Mock PublishingService
var mockPublishingService: any

jest.mock('@/lib/publishing/publishingService', () => ({
  PublishingService: jest.fn(() => {
    if (!mockPublishingService) {
      mockPublishingService = {
        getPublishingJobs: jest.fn(),
        publishToPlatform: jest.fn()
      }
    }
    return mockPublishingService
  })
}))

import { GET, POST } from '@/app/api/publishing/jobs/route'

describe('/api/publishing/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    const mockJobs = [
      {
        id: 'job-1',
        contentId: 'content-1',
        platformId: 'platform-1',
        platformConfig: {
          id: 'platform-1',
          name: 'WordPress Blog',
          platform: 'wordpress',
          credentials: {},
          settings: {},
          isActive: true
        },
        status: 'published',
        scheduledAt: null,
        publishedAt: new Date('2025-11-15T12:00:00Z'),
        error: null,
        platformPostId: 'wp-123',
        platformUrl: 'https://blog.com/post-123'
      },
      {
        id: 'job-2',
        contentId: 'content-1',
        platformId: 'platform-2',
        platformConfig: {
          id: 'platform-2',
          name: 'Medium Account',
          platform: 'medium',
          credentials: {},
          settings: {},
          isActive: true
        },
        status: 'queued',
        scheduledAt: new Date('2025-11-16T10:00:00Z'),
        publishedAt: null,
        error: null,
        platformPostId: null,
        platformUrl: null
      }
    ]

    it('should return publishing jobs for content ID', async () => {
      mockPublishingService.getPublishingJobs.mockResolvedValue(mockJobs)

      const request = new NextRequest('http://localhost:3000/api/publishing/jobs?contentId=content-1')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.jobs).toHaveLength(2)
      expect(result.jobs[0]).toEqual(mockJobs[0])
      expect(result.jobs[1]).toEqual(mockJobs[1])

      expect(mockPublishingService.getPublishingJobs).toHaveBeenCalledWith('content-1')
    })

    it('should return empty array when no jobs exist', async () => {
      mockPublishingService.getPublishingJobs.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/publishing/jobs?contentId=content-1')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.jobs).toEqual([])

      expect(mockPublishingService.getPublishingJobs).toHaveBeenCalledWith('content-1')
    })

    it('should return error when contentId parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/publishing/jobs')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('contentId parameter is required')

      expect(mockPublishingService.getPublishingJobs).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      mockPublishingService.getPublishingJobs.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/publishing/jobs?contentId=content-1')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to get publishing jobs')

      expect(mockPublishingService.getPublishingJobs).toHaveBeenCalledWith('content-1')
    })

    it('should handle different content IDs', async () => {
      mockPublishingService.getPublishingJobs.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/publishing/jobs?contentId=different-content')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPublishingService.getPublishingJobs).toHaveBeenCalledWith('different-content')
    })
  })

  describe('POST', () => {
    const mockJob = {
      id: 'job-new',
      contentId: 'content-1',
      platformId: 'platform-1',
      platformConfig: {
        id: 'platform-1',
        name: 'WordPress Blog',
        platform: 'wordpress',
        credentials: {},
        settings: {},
        isActive: true
      },
      status: 'processing',
      scheduledAt: null,
      publishedAt: null,
      error: null,
      platformPostId: null,
      platformUrl: null
    }

    it('should create publishing job successfully', async () => {
      const jobData = {
        contentId: 'content-1',
        platformId: 'platform-1'
      }

      mockPublishingService.publishToPlatform.mockResolvedValue(mockJob)

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/jobs',
        {
          method: 'POST',
          body: JSON.stringify(jobData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.job).toEqual(mockJob)

      expect(mockPublishingService.publishToPlatform).toHaveBeenCalledWith('content-1', 'platform-1', undefined)
    })

    it('should create scheduled publishing job', async () => {
      const scheduleTime = '2025-11-16T10:00:00Z'
      const jobData = {
        contentId: 'content-1',
        platformId: 'platform-1',
        scheduleAt: scheduleTime
      }

      const scheduledJob = {
        ...mockJob,
        status: 'queued',
        scheduledAt: new Date(scheduleTime)
      }

      mockPublishingService.publishToPlatform.mockResolvedValue(scheduledJob)

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/jobs',
        {
          method: 'POST',
          body: JSON.stringify(jobData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.job.status).toBe('queued')
      expect(result.job.scheduledAt).toEqual(new Date(scheduleTime))

      expect(mockPublishingService.publishToPlatform).toHaveBeenCalledWith('content-1', 'platform-1', new Date(scheduleTime))
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing contentId and platformId
      }

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/jobs',
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
      expect(result.error).toBe('Invalid job data')
      expect(result.details).toBeDefined()

      expect(mockPublishingService.publishToPlatform).not.toHaveBeenCalled()
    })

    it('should validate scheduleAt datetime format', async () => {
      const invalidData = {
        contentId: 'content-1',
        platformId: 'platform-1',
        scheduleAt: 'invalid-datetime'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/jobs',
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
      expect(result.error).toBe('Invalid job data')

      expect(mockPublishingService.publishToPlatform).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/publishing/jobs',
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
      expect(result.error).toBe('Invalid job data')

      expect(mockPublishingService.publishToPlatform).not.toHaveBeenCalled()
    })

    it('should handle service errors during job creation', async () => {
      const jobData = {
        contentId: 'content-1',
        platformId: 'platform-1'
      }

      mockPublishingService.publishToPlatform.mockRejectedValue(new Error('Publishing failed'))

      const request = new NextRequest(
        'http://localhost:3000/api/publishing/jobs',
        {
          method: 'POST',
          body: JSON.stringify(jobData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to create publishing job')

      expect(mockPublishingService.publishToPlatform).toHaveBeenCalledWith('content-1', 'platform-1', undefined)
    })
  })
})