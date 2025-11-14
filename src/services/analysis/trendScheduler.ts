import { trendAnalysisService } from './trendAnalysisService'
import { analysisLogger } from './analysisLogger'

export interface SchedulerConfig {
  updateIntervalSeconds: number
  enabled: boolean
  batchSize: number
  maxConcurrentUpdates: number
}

export class TrendScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private config: SchedulerConfig = {
    updateIntervalSeconds: 300, // 5 minutes
    enabled: true,
    batchSize: 50,
    maxConcurrentUpdates: 5
  }

  /**
   * Start the trend update scheduler
   */
  start(config?: Partial<SchedulerConfig>): void {
    if (this.intervalId) {
      console.warn('Trend scheduler is already running')
      return
    }

    this.config = { ...this.config, ...config }

    if (!this.config.enabled) {
      console.log('Trend scheduler is disabled')
      return
    }

    console.log(`Starting trend scheduler with ${this.config.updateIntervalSeconds}s interval`)

    // Run initial update
    this.runUpdate()

    // Schedule recurring updates
    this.intervalId = setInterval(() => {
      this.runUpdate()
    }, this.config.updateIntervalSeconds * 1000)

    analysisLogger.log({
      feedItemId: 'scheduler',
      operation: 'trend_scheduler_started',
      status: 'success',
      message: `Trend scheduler started with ${this.config.updateIntervalSeconds}s interval`,
      metadata: this.config
    })
  }

  /**
   * Stop the trend update scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.isRunning = false

      console.log('Trend scheduler stopped')

      analysisLogger.log({
        feedItemId: 'scheduler',
        operation: 'trend_scheduler_stopped',
        status: 'success',
        message: 'Trend scheduler stopped'
      })
    }
  }

  /**
   * Manually trigger a trend update
   */
  async triggerUpdate(): Promise<number> {
    if (this.isRunning) {
      console.warn('Trend update already in progress')
      return 0
    }

    return this.runUpdate()
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart scheduler if interval changed
    if (config.updateIntervalSeconds && this.intervalId) {
      this.stop()
      this.start()
    }

    analysisLogger.log({
      feedItemId: 'scheduler',
      operation: 'trend_scheduler_config_updated',
      status: 'success',
      message: 'Trend scheduler configuration updated',
      metadata: config
    })
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.intervalId !== null,
      updating: this.isRunning,
      config: this.config,
      nextUpdate: this.intervalId ? new Date(Date.now() + this.config.updateIntervalSeconds * 1000) : null
    }
  }

  // Private methods

  private async runUpdate(): Promise<number> {
    if (this.isRunning) {
      return 0
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      console.log('Starting trend update...')

      const updatedCount = await trendAnalysisService.updateAllTrends({
        timeWindowHours: 24,
        velocityThreshold: 0.1,
        momentumThreshold: 0.05,
        minFrequency: 3
      })

      const duration = Date.now() - startTime

      console.log(`Trend update completed: ${updatedCount} topics updated in ${duration}ms`)

      await analysisLogger.log({
        feedItemId: 'scheduler',
        operation: 'trend_update_completed',
        status: 'success',
        message: `Scheduled trend update completed: ${updatedCount} topics`,
        duration,
        metadata: {
          updatedCount,
          duration,
          averageTimePerTopic: updatedCount > 0 ? duration / updatedCount : 0
        }
      })

      return updatedCount

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Trend update failed:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await analysisLogger.log({
        feedItemId: 'scheduler',
        operation: 'trend_update_failed',
        status: 'error',
        message: `Scheduled trend update failed: ${errorMessage}`,
        duration,
        metadata: {
          error: errorMessage,
          duration
        }
      })

      return 0

    } finally {
      this.isRunning = false
    }
  }
}

// Global scheduler instance
export const trendScheduler = new TrendScheduler()

// Auto-start scheduler when module is loaded (in production/server environment)
if (typeof window === 'undefined') {
  // Delay start to allow database connections to initialize
  setTimeout(() => {
    trendScheduler.start()
  }, 5000)
}