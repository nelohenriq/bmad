import Parser from 'rss-parser'
import { FeedData } from '../database/contentService'

export interface RSSItem {
  title?: string
  link?: string
  content?: string
  contentSnippet?: string
  pubDate?: string
  creator?: string
  categories?: string[]
  guid?: string
}

export interface RSSFeed {
  title?: string
  description?: string
  link?: string
  items: RSSItem[]
}

export interface FetchResult {
  success: boolean
  feed?: RSSFeed
  error?: string
  duration: number
  retryCount: number
}

export class RSSService {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Neural Feed Studio/1.0 (https://github.com/bmad/neural-feed-studio)'
      },
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail']
        ]
      }
    })
  }

  /**
   * Resolve redirects to get the final URL
   */
  private async resolveRedirects(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Neural Feed Studio/1.0 (https://github.com/bmad/neural-feed-studio)'
        }
      })
      return response.url
    } catch {
      return url // If redirect resolution fails, use original URL
    }
  }

  /**
   * Fetch and parse an RSS feed with retry logic
   */
  async fetchFeed(url: string, maxRetries = 3): Promise<FetchResult> {
    let lastError: string = ''
    let totalDuration = 0

    // First, resolve any redirects
    const finalUrl = await this.resolveRedirects(url)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now()

      try {
        const feed = await this.parser.parseURL(finalUrl)

        const result: FetchResult = {
          success: true,
          feed: {
            title: feed.title,
            description: feed.description,
            link: feed.link,
            items: feed.items.map(item => ({
              title: item.title,
              link: item.link,
              content: item.content || item.contentEncoded || item.contentSnippet,
              contentSnippet: item.contentSnippet,
              pubDate: item.pubDate,
              creator: item.creator || item.author,
              categories: item.categories,
              guid: item.guid
            }))
          },
          duration: totalDuration + (Date.now() - startTime),
          retryCount: attempt
        }

        return result

      } catch (error) {
        const duration = Date.now() - startTime
        totalDuration += duration

        lastError = error instanceof Error ? error.message : 'Unknown error'

        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt)
          await this.delay(delay)
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError,
      duration: totalDuration,
      retryCount: maxRetries
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
    return Math.min(delay, maxDelay)
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate RSS feed URL format
   */
  isValidFeedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Extract domain from feed URL for rate limiting
   */
  getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return 'unknown'
    }
  }
}

export const rssService = new RSSService()