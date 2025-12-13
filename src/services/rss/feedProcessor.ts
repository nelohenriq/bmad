import { rssService, RSSFeed, RSSItem, FetchResult } from './rssService'
import { contentService, FeedData } from '../database/contentService'
import { prisma } from '../database/prisma'
import { feedItemBackgroundProcessor } from './feedItemBackgroundProcessor'

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
  }, onProgress?: (progress: { current: number; total: number; item?: RSSItem }) => void): Promise<ProcessingResult> {
    const startTime = Date.now()
    const result: ProcessingResult = {
      feedId: feed.id,
      success: false,
      itemsProcessed: 0,
      itemsFiltered: 0,
      newItems: 0,
      duration: 0
    }

    // Update processing status to 'processing'
    await prisma.feed.update({
      where: { id: feed.id },
      data: { processingStatus: 'processing' }
    })

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

      // Process feed items (fast ingestion only)
      const processedItems = await this.processFeedItems(feed, fetchResult.feed, options, onProgress)

      result.success = true
      result.itemsProcessed = fetchResult.feed.items.length
      result.itemsFiltered = fetchResult.feed.items.length - processedItems
      result.newItems = processedItems

      // Trigger background processing for heavy operations (web search, embedding, analysis)
      // This runs asynchronously and doesn't block the feed refresh response
      feedItemBackgroundProcessor.processPendingItems(feed.id)
        .then(processingResult => {
          console.log(`Background processing completed for feed ${feed.id}: ${processingResult.successful}/${processingResult.totalItems} items processed in ${processingResult.totalTime}ms`)

          // Update feed status to completed only after background processing finishes
          return prisma.feed.update({
            where: { id: feed.id },
            data: { processingStatus: 'completed' }
          })
        })
        .catch(error => {
          console.error(`Background processing failed for feed ${feed.id}:`, error)
          // Still mark as completed since ingestion succeeded, even if processing failed
          return prisma.feed.update({
            where: { id: feed.id },
            data: { processingStatus: 'completed' }
          })
        })

      result.duration = Date.now() - startTime
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
      await this.updateFeedStatus(feed.id, 'error', errorMessage, 0)

      // Update processing status to 'failed'
      await prisma.feed.update({
        where: { id: feed.id },
        data: { processingStatus: 'failed' }
      })

      result.error = errorMessage
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Process individual feed items with filtering
   */
  private async processFeedItems(feed: FeedData, rssFeed: RSSFeed, options: FeedProcessingOptions, onProgress?: (progress: { current: number; total: number; item?: RSSItem }) => void): Promise<number> {
    let newItemsCount = 0
    const totalItems = rssFeed.items.slice(0, options.maxItemsPerFeed).length

    for (let i = 0; i < totalItems; i++) {
      const item = rssFeed.items[i]

      // Emit progress
      if (onProgress) {
        onProgress({ current: i + 1, total: totalItems, item })
      }

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
   * Create feed item in database with raw content only
   * Heavy processing (web search, embedding, analysis) happens in background
   */
  private async createFeedItem(feedId: string, item: RSSItem): Promise<void> {
    const content = item.content || item.contentSnippet || ''
    const wordCount = this.countWords(content)
    const readingTime = Math.ceil(wordCount / 200) // Assume 200 words per minute

    await prisma.feedItem.create({
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
        readingTime,
        processingStatus: 'pending' // Mark for background processing
      } as any // Type assertion until Prisma client is regenerated
    })

    // Heavy processing (web search, embedding, analysis) now happens in background
    // This makes feed ingestion fast and non-blocking
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