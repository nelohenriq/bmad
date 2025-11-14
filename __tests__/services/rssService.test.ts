// Mock rss-parser before importing anything
const mockParseURL = jest.fn()
jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: mockParseURL
  }))
})

import { rssService } from '../../src/services/rssService'
import Parser from 'rss-parser'

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
      mockParseURL.mockClear()
    })

    it('should return error for invalid URL', async () => {
      const result = await rssService.validateFeed('invalid-url')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid URL format')
    })

    it('should handle network timeouts', async () => {
      mockParseURL.mockRejectedValue(new Error('timeout'))

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('took too long to respond')
    })

    it('should handle 404 errors', async () => {
      mockParseURL.mockRejectedValue(new Error('status code 404'))

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should validate successful RSS feeds', async () => {
      mockParseURL.mockResolvedValue({
        title: 'Test Feed',
        description: 'A test RSS feed',
        items: []
      })

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(true)
      expect(result.feedTitle).toBe('Test Feed')
      expect(result.feedDescription).toBe('A test RSS feed')
    })

    it('should reject feeds without titles', async () => {
      mockParseURL.mockResolvedValue({
        title: '',
        description: 'A test RSS feed',
        items: []
      })

      const result = await rssService.validateFeed('http://example.com/feed.xml')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('does not contain a valid title')
    })
  })

  describe('getFeedMetadata', () => {
    beforeEach(() => {
      mockParseURL.mockClear()
    })

    it('should return feed metadata for valid feeds', async () => {
      mockParseURL.mockResolvedValue({
        title: 'Test Feed',
        description: 'A test RSS feed',
        items: [{}, {}, {}] // 3 items
      })

      const result = await rssService.getFeedMetadata('http://example.com/feed.xml')
      expect(result).toEqual({
        title: 'Test Feed',
        description: 'A test RSS feed',
        items: 3
      })
    })

    it('should return null for invalid feeds', async () => {
      mockParseURL.mockRejectedValue(new Error('Network error'))

      const result = await rssService.getFeedMetadata('http://example.com/feed.xml')
      expect(result).toBeNull()
    })
  })
})