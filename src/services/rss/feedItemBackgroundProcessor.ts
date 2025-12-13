import { prisma } from '../database/prisma'
import { webSearchService } from '../search/webSearchService'
import { contentChunkingService } from '../content/contentChunkingService'
import { analysisJobQueue } from '../analysis/analysisJobQueue'

export interface FeedItemProcessingResult {
  feedItemId: string
  success: boolean
  error?: string
  processingTime: number
}

export interface BatchProcessingResult {
  totalItems: number
  successful: number
  failed: number
  totalTime: number
  errors: Array<{ feedItemId: string; error: string }>
}

/**
 * Background processor for feed items
 * Handles web search, embedding, and analysis in optimized batches
 */
export class FeedItemBackgroundProcessor {
  private readonly BATCH_SIZE = 5 // Process 5 items concurrently
  private readonly MAX_CONCURRENT_BATCHES = 3 // Allow 3 batches to run simultaneously

  /**
   * Process all pending feed items for a feed
   */
  async processPendingItems(feedId: string): Promise<BatchProcessingResult> {
    const startTime = Date.now()

    try {
      // Get all pending items for this feed
      const pendingItems = await prisma.feedItem.findMany({
        where: {
          feedId,
          processingStatus: 'pending'
        },
        orderBy: {
          publishedAt: 'desc' // Process newest items first
        }
      } as any)

      if (pendingItems.length === 0) {
        return {
          totalItems: 0,
          successful: 0,
          failed: 0,
          totalTime: 0,
          errors: []
        }
      }

      console.log(`Processing ${pendingItems.length} pending items for feed ${feedId}`)

      // Process items in batches
      const results: FeedItemProcessingResult[] = []
      const batches = this.chunkArray(pendingItems, this.BATCH_SIZE)

      // Process batches with controlled concurrency
      for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
        const currentBatches = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES)
        const batchPromises = currentBatches.map(batch => this.processBatch(batch))
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults.flat())
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const errors = results
        .filter(r => !r.success && r.error)
        .map(r => ({ feedItemId: r.feedItemId, error: r.error! }))

      const totalTime = Date.now() - startTime

      console.log(`Completed processing ${pendingItems.length} items for feed ${feedId}: ${successful} successful, ${failed} failed in ${totalTime}ms`)

      return {
        totalItems: pendingItems.length,
        successful,
        failed,
        totalTime,
        errors
      }

    } catch (error) {
      console.error(`Failed to process pending items for feed ${feedId}:`, error)
      return {
        totalItems: 0,
        successful: 0,
        failed: 0,
        totalTime: Date.now() - startTime,
        errors: [{ feedItemId: 'unknown', error: (error as Error).message }]
      }
    }
  }

  /**
   * Process a batch of feed items
   */
  private async processBatch(items: any[]): Promise<FeedItemProcessingResult[]> {
    const results: FeedItemProcessingResult[] = []

    // Update status to processing
    await Promise.all(
      items.map(item =>
        prisma.feedItem.update({
          where: { id: item.id },
          data: {
            processingStatus: 'processing',
            processingStartedAt: new Date()
          }
        } as any)
      )
    )

    // Process items concurrently within the batch
    const processingPromises = items.map(item => this.processSingleItem(item))
    const batchResults = await Promise.all(processingPromises)

    results.push(...batchResults)
    return results
  }

  /**
   * Process a single feed item (web search + embedding + analysis)
   */
  private async processSingleItem(item: any): Promise<FeedItemProcessingResult> {
    const startTime = Date.now()
    const result: FeedItemProcessingResult = {
      feedItemId: item.id,
      success: false,
      processingTime: 0
    }

    try {
      const content = item.content || item.description || ''
      const title = item.title || 'Untitled'

      // 1. Extend content with web search
      let extendedContent = content
      try {
        const searchQuery = title || content.substring(0, 100) || 'news article'
        const searchResponse = await webSearchService.search({
          query: searchQuery,
          maxResults: 3
        })

        if (searchResponse.results && searchResponse.results.length > 0) {
          const searchContext = searchResponse.results
            .map(searchResult => `Related Information:\n${searchResult.title}\n${searchResult.snippet}\nSource: ${searchResult.url}`)
            .join('\n\n---\n\n')

          extendedContent = `${content}\n\n--- Additional Context ---\n\n${searchContext}`
          console.log(`Extended content with ${searchResponse.results.length} search results for feed item: ${item.id}`)
        }
      } catch (searchError) {
        console.warn(`Web search failed for feed item ${item.id}, using original content:`, searchError)
        // Continue with original content
      }

      // 2. Chunk and embed the extended content
      try {
        await contentChunkingService.chunkAndEmbedContent(
          item.id,
          extendedContent,
          {
            title: title,
            sourceUrl: item.link,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
            feedTitle: undefined, // Could be fetched from feed data
            author: item.author,
            tags: item.categories ? JSON.parse(item.categories) : undefined,
            quality: 0.8
          }
        )
        console.log(`Chunked and embedded extended content for feed item: ${item.id}`)
      } catch (chunkError) {
        console.error(`Failed to chunk and embed content for feed item ${item.id}:`, chunkError)
        throw chunkError
      }

      // 3. Queue semantic analysis
      try {
        await analysisJobQueue.addJob({
          feedItemId: item.id,
          title: title,
          content: extendedContent,
          description: item.description
        }, 'normal')
      } catch (analysisError) {
        console.warn(`Failed to queue analysis for feed item ${item.id}:`, analysisError)
        // Don't fail the entire process if analysis queuing fails
      }

      // 4. Mark as completed
      await prisma.feedItem.update({
        where: { id: item.id },
        data: {
          processingStatus: 'completed',
          processingCompletedAt: new Date()
        }
      } as any)

      result.success = true
      result.processingTime = Date.now() - startTime

    } catch (error) {
      const errorMessage = (error as Error).message

      // Mark as failed
      await prisma.feedItem.update({
        where: { id: item.id },
        data: {
          processingStatus: 'failed',
          processingCompletedAt: new Date()
        }
      } as any).catch(updateError => {
        console.error(`Failed to update processing status for feed item ${item.id}:`, updateError)
      })

      result.error = errorMessage
      result.processingTime = Date.now() - startTime

      console.error(`Failed to process feed item ${item.id}:`, error)
    }

    return result
  }

  /**
   * Get processing statistics for a feed
   */
  async getProcessingStats(feedId: string): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    const stats = await prisma.feedItem.groupBy({
      by: ['processingStatus'],
      where: { feedId },
      _count: {
        processingStatus: true
      }
    } as any)

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }

    stats.forEach((stat: any) => {
      const status = stat.processingStatus || 'pending'
      const count = stat._count.processingStatus
      result[status as keyof typeof result] = count
      result.total += count
    })

    return result
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

export const feedItemBackgroundProcessor = new FeedItemBackgroundProcessor()