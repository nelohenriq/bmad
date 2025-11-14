import { rssService, RSSFeed, RSSItem, FetchResult } from './rssService'
import { contentService, FeedData } from '../database/contentService'
import { prisma } from '../database/prisma'
import { analysisJobQueue } from '../analysis/analysisJobQueue'

export interface ProcessingResult {
  feedId: string
  success: boolean
  itemsProcessed: number
  itemsFiltered: number
  newItems: number
  duration: number
  error?: string
}

export interface FeedProcessingOptions {
  applyKeywordFilters: boolean
  applyContentFilters: boolean
  maxItemsPerFeed: number
}

export class FeedProcessor {
  /**
   * Process a single feed: fetch, filter, and store content
   */
  async processFeed(feed: FeedData, options: FeedProcessingOptions = {
    applyKeywordFilters: true,
    applyContentFilters: true,
    maxItemsPerFeed: 50
  }): Promise<ProcessingResult> {
    const startTime = Date.now()
    const result: ProcessingResult = {
      feedId: feed.id,
      success: false,
      itemsProcessed: 0,
      itemsFiltered: 0,
      newItems: 0,
      duration: 0
    }

    try {
      // Fetch RSS content
      const fetchResult = await rssService.fetchFeed(feed.url)

      if (!fetchResult.success || !fetchResult.feed) {
        // Update feed status for failed fetch
        await this.updateFeedStatus(feed.id, 'error', fetchResult.error || 'Unknown fetch error', fetchResult.retryCount)
        result.error = fetchResult.error
        result.duration = Date.now() - startTime
        return result
      }

      // Update feed status for successful fetch
      await this.updateFeedStatus(feed.id, 'success', undefined, fetchResult.retryCount)

      // Process feed items
      const processedItems = await this.processFeedItems(feed, fetchResult.feed, options)

      result.success = true
      result.itemsProcessed = fetchResult.feed.items.length
      result.itemsFiltered = fetchResult.feed.items.length - processedItems
      result.newItems = processedItems
      result.duration = Date.now() - startTime

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
      await this.updateFeedStatus(feed.id, 'error', errorMessage, 0)
      result.error = errorMessage
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Process individual feed items with filtering
   */
  private async processFeedItems(feed: FeedData, rssFeed: RSSFeed, options: FeedProcessingOptions): Promise<number> {
    let newItemsCount = 0

    for (const item of rssFeed.items.slice(0, options.maxItemsPerFeed)) {
      // Apply filters
      if (options.applyKeywordFilters && !this.passesKeywordFilter(item, feed.keywordFilters)) {
        continue
      }

      if (options.applyContentFilters && !this.passesContentFilter(item, feed.contentFilters)) {
        continue
      }

      // Check for duplicates
      if (await this.isDuplicateItem(feed.id, item)) {
        continue
      }

      // Create new feed item
      await this.createFeedItem(feed.id, item)
      newItemsCount++
    }

    return newItemsCount
  }

  /**
   * Apply keyword filtering
   */
  private passesKeywordFilter(item: RSSItem, keywordFilters?: string[] | null): boolean {
    if (!keywordFilters || keywordFilters.length === 0) {
      return true // No filters means everything passes
    }

    const content = `${item.title || ''} ${item.content || ''} ${item.contentSnippet || ''}`.toLowerCase()

    return keywordFilters.some(keyword =>
      content.includes(keyword.toLowerCase())
    )
  }

  /**
   * Apply content type filtering (placeholder for future implementation)
   */
  private passesContentFilter(item: RSSItem, contentFilters?: Record<string, any> | null): boolean {
    if (!contentFilters || Object.keys(contentFilters).length === 0) {
      return true // No filters means everything passes
    }

    // For now, just check if any filters are enabled
    // Future implementation will check for images, videos, etc.
    return Object.values(contentFilters).some(enabled => enabled)
  }

  /**
   * Check if item is duplicate based on GUID or content hash
   */
  private async isDuplicateItem(feedId: string, item: RSSItem): Promise<boolean> {
    // Check by GUID first
    if (item.guid) {
      const existing = await prisma.feedItem.findUnique({
        where: { guid: item.guid }
      })
      if (existing) return true
    }

    // Check by content hash (title + content)
    const contentHash = this.generateContentHash(item)
    const existing = await prisma.feedItem.findFirst({
      where: {
        feedId,
        contentHash: contentHash as any // Type assertion until Prisma client is regenerated
      } as any
    })

    return !!existing
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(item: RSSItem): string {
    const content = `${item.title || ''}${item.content || ''}${item.link || ''}`
    // Simple hash function - in production, use crypto.createHash
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  /**
   * Create feed item in database and trigger analysis
   */
  private async createFeedItem(feedId: string, item: RSSItem): Promise<void> {
    const content = item.content || item.contentSnippet || ''
    const wordCount = this.countWords(content)
    const readingTime = Math.ceil(wordCount / 200) // Assume 200 words per minute

    const feedItem = await prisma.feedItem.create({
      data: {
        feedId,
        guid: item.guid,
        title: item.title || 'Untitled',
        description: item.contentSnippet,
        content: item.content,
        link: item.link,
        author: item.creator,
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        categories: item.categories ? JSON.stringify(item.categories) : null,
        contentHash: this.generateContentHash(item),
        wordCount,
        readingTime
      } as any // Type assertion until Prisma client is regenerated
    })

    // Trigger semantic analysis for the new content
    try {
      await analysisJobQueue.addJob({
        feedItemId: feedItem.id,
        title: item.title || 'Untitled',
        content: content,
        description: item.contentSnippet
      }, 'normal')
    } catch (error) {
      console.error(`Failed to queue analysis for feed item ${feedItem.id}:`, error)
      // Don't fail the feed processing if analysis queuing fails
    }
  }

  /**
   * Update feed status after fetch attempt
   */
  private async updateFeedStatus(
    feedId: string,
    status: 'success' | 'error' | 'timeout' | 'parsing_error',
    error?: string,
    retryCount?: number
  ): Promise<void> {
    const updateData: any = {
      lastFetched: new Date(),
      lastFetchStatus: status,
      lastFetchError: error || null
    }

    if (status === 'success') {
      updateData.fetchRetryCount = 0
      updateData.healthScore = Math.min(1.0, (await this.getCurrentHealthScore(feedId)) + 0.1)
    } else {
      updateData.fetchRetryCount = { increment: 1 }
      updateData.healthScore = Math.max(0.0, (await this.getCurrentHealthScore(feedId)) - 0.1)
    }

    await prisma.feed.update({
      where: { id: feedId },
      data: updateData
    })
  }

  /**
   * Get current health score for feed
   */
  private async getCurrentHealthScore(feedId: string): Promise<number> {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: { healthScore: true } as any // Type assertion until Prisma client is regenerated
    })
    return (feed as any)?.healthScore || 1.0
  }

  /**
   * Count words in content
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }
}

export const feedProcessor = new FeedProcessor()