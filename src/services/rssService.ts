import Parser from 'rss-parser'

export interface FeedValidationResult {
  isValid: boolean
  feedTitle?: string
  feedDescription?: string
  error?: string
}

export interface AddFeedRequest {
  url: string
  category?: string
}

export interface AddFeedResponse {
  success: boolean
  feedId?: string
  error?: string
}

export class RSSService {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Neural Feed Studio/1.0'
      }
    })
  }

  /**
   * Validates if a URL is a properly formatted HTTP/HTTPS URL
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Validates if a URL points to a valid RSS/Atom feed
   */
  async validateFeed(url: string): Promise<FeedValidationResult> {
    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        error: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.'
      }
    }

    try {
      const feed = await this.parser.parseURL(url)

      if (!feed.title || feed.title.trim() === '') {
        return {
          isValid: false,
          error: 'Feed does not contain a valid title.'
        }
      }

      return {
        isValid: true,
        feedTitle: feed.title,
        feedDescription: feed.description
      }
    } catch (error) {
      console.error('RSS validation error:', error)

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return {
            isValid: false,
            error: 'Feed took too long to respond. Please try again later.'
          }
        }

        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          return {
            isValid: false,
            error: 'Unable to connect to the feed URL. Please check the URL and try again.'
          }
        }

        if (error.message.includes('status code 404')) {
          return {
            isValid: false,
            error: 'Feed not found at the provided URL.'
          }
        }

        if (error.message.includes('status code 403')) {
          return {
            isValid: false,
            error: 'Access to the feed is forbidden.'
          }
        }
      }

      return {
        isValid: false,
        error: 'Invalid RSS feed format or unable to parse feed.'
      }
    }
  }

  /**
   * Extracts feed metadata without storing it
   */
  async getFeedMetadata(url: string): Promise<{ title?: string; description?: string; items?: number } | null> {
    try {
      const feed = await this.parser.parseURL(url)
      return {
        title: feed.title,
        description: feed.description,
        items: feed.items?.length || 0
      }
    } catch {
      return null
    }
  }
}

export const rssService = new RSSService()