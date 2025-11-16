// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

import { rssService } from '../../src/services/rssService'

describe('RSSService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isValidUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(rssService.isValidUrl('http://example.com/feed.xml')).toBe(true)
      expect(rssService.isValidUrl('https://example.com/feed.xml')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(rssService.isValidUrl('not-a-url')).toBe(false)
      expect(rssService.isValidUrl('ftp://example.com')).toBe(false)
      expect(rssService.isValidUrl('')).toBe(false)
    })
  })

  describe('validateFeed', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should return error for invalid URL', async () => {
      const result = await rssService.validateFeed('invalid-url')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid URL format')
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: false, error: 'Feed took too long to respond. Please try again later.' })
      })

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('took too long to respond')
    })

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: false, error: 'Feed not found at the provided URL.' })
      })

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should validate successful RSS feeds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true, feedTitle: 'Test Feed', feedDescription: 'A test RSS feed' })
      })

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(true)
      expect(result.feedTitle).toBe('Test Feed')
      expect(result.feedDescription).toBe('A test RSS feed')
    })

    it('should reject feeds without titles', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: false, error: 'Feed does not contain a valid title.' })
      })

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('does not contain a valid title')
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Failed to validate feed')
    })
  })

})