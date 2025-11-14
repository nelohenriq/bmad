import { contentService, FeedData } from '../database/contentService'
import { feedProcessor, ProcessingResult } from './feedProcessor'

export interface ScheduledFeed {
  feed: FeedData
  nextRun: Date
  isRunning: boolean
}

export interface SchedulerStats {
  totalFeeds: number
  activeFeeds: number
  scheduledFeeds: number
  runningJobs: number
  lastExecution: Date | null
}

export class FeedScheduler {
  private scheduledFeeds: Map<string, ScheduledFeed> = new Map()
  private runningJobs: Set<string> = new Set()
  private maxConcurrentJobs: number = 3
  private checkInterval: NodeJS.Timeout | null = null
  private isRunning: boolean = false

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('Feed scheduler started')

    // Check for feeds to process every minute
    this.checkInterval = setInterval(() => {
      this.checkAndExecuteFeeds()
    }, 60000) // 1 minute

    // Initial check
    this.checkAndExecuteFeeds()
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    console.log('Feed scheduler stopped')
  }

  /**
   * Manually trigger feed processing for a specific feed
   */
  async processFeedNow(feedId: string): Promise<ProcessingResult | null> {
    const feed = await contentService.getFeedById(feedId)
    if (!feed || !feed.isActive) return null

    return this.executeFeedProcessing(feed)
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return {
      totalFeeds: this.scheduledFeeds.size,
      activeFeeds: Array.from(this.scheduledFeeds.values()).filter(sf => sf.feed.isActive).length,
      scheduledFeeds: Array.from(this.scheduledFeeds.values()).filter(sf => sf.nextRun <= new Date()).length,
      runningJobs: this.runningJobs.size,
      lastExecution: this.getLastExecutionTime()
    }
  }

  /**
   * Check for feeds that need processing and execute them
   */
  private async checkAndExecuteFeeds(): Promise<void> {
    if (!this.isRunning) return

    try {
      // Get all active feeds
      const userId = 'user-1' // In a real app, this would be dynamic
      const feeds = await contentService.getUserFeeds(userId)

      // Update scheduled feeds
      this.updateScheduledFeeds(feeds.filter(feed => feed.isActive))

      // Find feeds that are due for processing
      const dueFeeds = Array.from(this.scheduledFeeds.values())
        .filter(sf => sf.nextRun <= new Date() && !sf.isRunning)
        .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime()) // Process oldest first

      // Execute feeds within concurrency limits
      const availableSlots = this.maxConcurrentJobs - this.runningJobs.size
      const feedsToProcess = dueFeeds.slice(0, availableSlots)

      for (const scheduledFeed of feedsToProcess) {
        this.executeFeedProcessing(scheduledFeed.feed)
          .then(result => {
            this.handleProcessingResult(scheduledFeed.feed.id, result)
          })
          .catch(error => {
            console.error(`Error processing feed ${scheduledFeed.feed.id}:`, error)
            this.runningJobs.delete(scheduledFeed.feed.id)
            this.updateNextRun(scheduledFeed.feed.id)
          })
      }

    } catch (error) {
      console.error('Error in feed scheduler check:', error)
    }
  }

  /**
   * Execute feed processing
   */
  private async executeFeedProcessing(feed: FeedData): Promise<ProcessingResult> {
    if (this.runningJobs.has(feed.id)) {
      throw new Error(`Feed ${feed.id} is already being processed`)
    }

    this.runningJobs.add(feed.id)
    this.markFeedAsRunning(feed.id, true)

    try {
      const result = await feedProcessor.processFeed(feed, {
        applyKeywordFilters: true,
        applyContentFilters: true,
        maxItemsPerFeed: 50
      })

      return result
    } finally {
      this.runningJobs.delete(feed.id)
      this.markFeedAsRunning(feed.id, false)
    }
  }

  /**
   * Handle processing result and update next run time
   */
  private handleProcessingResult(feedId: string, result: ProcessingResult): void {
    console.log(`Feed ${feedId} processed: ${result.newItems} new items, ${result.duration}ms`)

    // Update next run time based on frequency
    this.updateNextRun(feedId)
  }

  /**
   * Update scheduled feeds list
   */
  private updateScheduledFeeds(feeds: FeedData[]): void {
    // Remove feeds that are no longer active
    const activeFeedIds = new Set(feeds.map(f => f.id))
    for (const feedId of Array.from(this.scheduledFeeds.keys())) {
      if (!activeFeedIds.has(feedId)) {
        this.scheduledFeeds.delete(feedId)
      }
    }

    // Add or update active feeds
    for (const feed of feeds) {
      if (!this.scheduledFeeds.has(feed.id)) {
        this.scheduledFeeds.set(feed.id, {
          feed,
          nextRun: this.calculateNextRun(feed.updateFrequency || null),
          isRunning: false
        })
      } else {
        // Update feed data if changed
        const scheduled = this.scheduledFeeds.get(feed.id)!
        scheduled.feed = feed
      }
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(frequency: string | null): Date {
    const now = new Date()

    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000) // 1 hour
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      case 'manual':
      default:
        // Manual feeds don't get scheduled automatically
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    }
  }

  /**
   * Update next run time for a feed
   */
  private updateNextRun(feedId: string): void {
    const scheduled = this.scheduledFeeds.get(feedId)
    if (scheduled) {
      scheduled.nextRun = this.calculateNextRun(scheduled.feed.updateFrequency || null)
    }
  }

  /**
   * Mark feed as running or not running
   */
  private markFeedAsRunning(feedId: string, isRunning: boolean): void {
    const scheduled = this.scheduledFeeds.get(feedId)
    if (scheduled) {
      scheduled.isRunning = isRunning
    }
  }

  /**
   * Get last execution time across all feeds
   */
  private getLastExecutionTime(): Date | null {
    let lastTime: Date | null = null

    for (const scheduled of Array.from(this.scheduledFeeds.values())) {
      if (scheduled.feed.lastFetched && (!lastTime || scheduled.feed.lastFetched > lastTime)) {
        lastTime = scheduled.feed.lastFetched
      }
    }

    return lastTime
  }
}

export const feedScheduler = new FeedScheduler()