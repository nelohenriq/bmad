import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PublishingQueue } from '@/components/publishing/PublishingQueue'

// Mock fetch
global.fetch = jest.fn()

describe('PublishingQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading spinner when contentId is provided', () => {
      render(<PublishingQueue contentId="content-1" />)

      expect(screen.getByText('Loading publishing queue...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // spinner
    })

    it('should not show loading when no contentId is provided', () => {
      render(<PublishingQueue />)

      expect(screen.queryByText('Loading publishing queue...')).not.toBeInTheDocument()
      expect(screen.getByText('No Publishing Jobs')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no jobs exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: [] })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('No Publishing Jobs')).toBeInTheDocument()
        expect(screen.getByText('No publishing jobs found for this content.')).toBeInTheDocument()
      })
    })

    it('should show different message when no contentId is provided', () => {
      render(<PublishingQueue />)

      expect(screen.getByText('No Publishing Jobs')).toBeInTheDocument()
      expect(screen.getByText('Select content to view its publishing history.')).toBeInTheDocument()
    })
  })

  describe('Jobs Display', () => {
    const mockJobs = [
      {
        id: 'job-1',
        contentId: 'content-1',
        platformId: 'platform-1',
        platformConfig: {
          id: 'platform-1',
          name: 'My WordPress Blog',
          platform: 'wordpress'
        },
        status: 'published',
        scheduledAt: undefined,
        publishedAt: new Date('2025-11-15T12:00:00Z'),
        error: undefined,
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
          platform: 'medium'
        },
        status: 'queued',
        scheduledAt: new Date('2025-11-16T10:00:00Z'),
        publishedAt: undefined,
        error: undefined,
        platformPostId: undefined,
        platformUrl: undefined
      },
      {
        id: 'job-3',
        contentId: 'content-1',
        platformId: 'platform-3',
        platformConfig: {
          id: 'platform-3',
          name: 'Blogger Site',
          platform: 'blogger'
        },
        status: 'failed',
        scheduledAt: undefined,
        publishedAt: undefined,
        error: 'Authentication failed',
        platformPostId: undefined,
        platformUrl: undefined
      }
    ]

    it('should display publishing jobs correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Publishing Queue')).toBeInTheDocument()
        expect(screen.getByText('3 jobs found')).toBeInTheDocument()
      })

      // Check job details
      expect(screen.getByText('My WordPress Blog')).toBeInTheDocument()
      expect(screen.getByText('Medium Account')).toBeInTheDocument()
      expect(screen.getByText('Blogger Site')).toBeInTheDocument()

      // Check platform types
      expect(screen.getAllByText('wordpress')).toHaveLength(1)
      expect(screen.getAllByText('medium')).toHaveLength(1)
      expect(screen.getAllByText('blogger')).toHaveLength(1)

      // Check status badges
      expect(screen.getByText('published')).toBeInTheDocument()
      expect(screen.getByText('queued')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })

    it('should display status icons correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('✅')).toBeInTheDocument() // published
        expect(screen.getByText('⏳')).toBeInTheDocument() // queued
        expect(screen.getByText('❌')).toBeInTheDocument() // failed
      })
    })

    it('should display scheduled date for queued jobs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText(/Scheduled:/)).toBeInTheDocument()
      })
    })

    it('should display published date for published jobs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText(/^Published:/)).toBeInTheDocument()
      })
    })

    it('should display platform URL link for published jobs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        const link = screen.getByText('View on platform →')
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute('href', 'https://blog.com/post-123')
      })
    })

    it('should display error message for failed jobs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Error: Authentication failed')).toBeInTheDocument()
      })
    })

    it('should show progress indicator for processing jobs', async () => {
      const processingJob = [{
        ...mockJobs[0],
        status: 'processing' as const
      }]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: processingJob })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Publishing in progress...')).toBeInTheDocument()
      })
    })
  })

  describe('Queue Summary', () => {
    const mockJobs = [
      {
        id: 'job-1',
        contentId: 'content-1',
        platformId: 'platform-1',
        platformConfig: {
          id: 'platform-1',
          name: 'My WordPress Blog',
          platform: 'wordpress'
        },
        status: 'published',
        scheduledAt: undefined,
        publishedAt: new Date('2025-11-15T12:00:00Z'),
        error: undefined,
        platformPostId: 'wp-123',
        platformUrl: 'https://blog.com/post-123'
      }
    ]

    it('should display correct job counts in summary', async () => {
      const mixedJobs = [
        { id: '1', contentId: '1', platformId: '1', platformConfig: { name: 'Test', platform: 'wordpress' }, status: 'queued' },
        { id: '2', contentId: '1', platformId: '1', platformConfig: { name: 'Test', platform: 'wordpress' }, status: 'processing' },
        { id: '3', contentId: '1', platformId: '1', platformConfig: { name: 'Test', platform: 'wordpress' }, status: 'published' },
        { id: '4', contentId: '1', platformId: '1', platformConfig: { name: 'Test', platform: 'wordpress' }, status: 'failed' },
        { id: '5', contentId: '1', platformId: '1', platformConfig: { name: 'Test', platform: 'wordpress' }, status: 'published' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mixedJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Queued: 1 | Processing: 1 | Published: 2 | Failed: 1')).toBeInTheDocument()
      })
    })

    it('should have refresh button', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: mockJobs })
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh')
        expect(refreshButton).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Error Loading Publishing Queue')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        const retryButton = screen.getByText('Retry')
        expect(retryButton).toBeInTheDocument()
      })
    })

    it('should retry fetch when retry button is clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobs: [] })
        })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        const retryButton = screen.getByText('Retry')
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
        expect(screen.getByText('No Publishing Jobs')).toBeInTheDocument()
      })
    })

    it('should handle non-ok response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Error Loading Publishing Queue')).toBeInTheDocument()
        expect(screen.getByText('Failed to fetch publishing jobs')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    const initialJobs = [
      {
        id: 'job-1',
        contentId: 'content-1',
        platformId: 'platform-1',
        platformConfig: { name: 'Initial Platform', platform: 'wordpress' },
        status: 'published'
      }
    ]

    it('should refetch jobs when refresh button is clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobs: initialJobs })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobs: [
            {
              id: 'job-1',
              contentId: 'content-1',
              platformId: 'platform-1',
              platformConfig: { name: 'Test Platform', platform: 'wordpress' },
              status: 'published'
            }
          ] })
        })

      render(<PublishingQueue contentId="content-1" />)

      await waitFor(() => {
        expect(screen.getByText('Initial Platform')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByText('Test Platform')).toBeInTheDocument()
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })
})