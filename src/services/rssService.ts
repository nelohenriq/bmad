
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
  constructor() {
    // Parser moved to server-side API
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
      const response = await fetch('/api/rss/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        return {
          isValid: false,
          error: 'Failed to validate feed. Please try again.'
        }
      }

      const result: FeedValidationResult = await response.json()
      return result
    } catch (error) {
      console.error('RSS validation error:', error)
      return {
        isValid: false,
        error: 'Failed to validate feed. Please try again.'
      }
    }
  }

}

export const rssService = new RSSService()