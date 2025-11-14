import { prisma } from '../database/prisma'

export interface AnalysisLogEntry {
  id: string
  feedItemId: string
  operation: string
  status: 'success' | 'error' | 'warning'
  message: string
  duration?: number
  metadata?: Record<string, any>
  timestamp: Date
}

export class AnalysisLogger {
  async log(entry: Omit<AnalysisLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const logEntry: Omit<AnalysisLogEntry, 'id'> = {
        ...entry,
        timestamp: new Date()
      }

      // Log to console for development
      console.log(`[ANALYSIS ${entry.status.toUpperCase()}] ${entry.operation}: ${entry.message}`, {
        feedItemId: entry.feedItemId,
        duration: entry.duration,
        metadata: entry.metadata
      })

      // Store in database (using system logs for now)
      await (prisma as any).systemLog.create({
        data: {
          level: entry.status === 'error' ? 'ERROR' : entry.status === 'warning' ? 'WARN' : 'INFO',
          message: `${entry.operation}: ${entry.message}`,
          context: JSON.stringify({
            feedItemId: entry.feedItemId,
            duration: entry.duration,
            metadata: entry.metadata,
            timestamp: logEntry.timestamp.toISOString()
          })
        }
      })

    } catch (error) {
      // Fallback to console only if database logging fails
      console.error('Failed to log analysis event:', error)
      console.log(`[ANALYSIS ${entry.status.toUpperCase()}] ${entry.operation}: ${entry.message}`)
    }
  }

  async logAnalysisStart(feedItemId: string): Promise<void> {
    await this.log({
      feedItemId,
      operation: 'analysis_start',
      status: 'success',
      message: 'Analysis started'
    })
  }

  async logAnalysisSuccess(feedItemId: string, duration: number, topicCount: number): Promise<void> {
    await this.log({
      feedItemId,
      operation: 'analysis_success',
      status: 'success',
      message: `Analysis completed successfully with ${topicCount} topics`,
      duration,
      metadata: { topicCount }
    })
  }

  async logAnalysisError(feedItemId: string, error: any, duration?: number): Promise<void> {
    await this.log({
      feedItemId,
      operation: 'analysis_error',
      status: 'error',
      message: `Analysis failed: ${error.message || 'Unknown error'}`,
      duration,
      metadata: {
        error: error.message,
        stack: error.stack
      }
    })
  }

  async logCacheHit(feedItemId: string): Promise<void> {
    await this.log({
      feedItemId,
      operation: 'cache_hit',
      status: 'success',
      message: 'Analysis result retrieved from cache'
    })
  }

  async logJobQueued(feedItemId: string, priority: string): Promise<void> {
    await this.log({
      feedItemId,
      operation: 'job_queued',
      status: 'success',
      message: `Analysis job queued with ${priority} priority`,
      metadata: { priority }
    })
  }

  async logJobProcessed(feedItemId: string, duration: number, status: 'completed' | 'failed'): Promise<void> {
    await this.log({
      feedItemId,
      operation: 'job_processed',
      status: status === 'completed' ? 'success' : 'error',
      message: `Analysis job ${status}`,
      duration,
      metadata: { jobStatus: status }
    })
  }

  async getAnalysisLogs(feedItemId: string, limit: number = 10): Promise<any[]> {
    try {
      // Query system logs for this feed item
      const logs = await (prisma as any).systemLog.findMany({
        where: {
          context: {
            contains: `"feedItemId":"${feedItemId}"`
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return logs.map((log: any) => {
        try {
          const context = JSON.parse(log.context)
          return {
            id: log.id,
            level: log.level,
            message: log.message,
            timestamp: log.createdAt,
            ...context
          }
        } catch {
          return {
            id: log.id,
            level: log.level,
            message: log.message,
            timestamp: log.createdAt
          }
        }
      })
    } catch (error) {
      console.error('Failed to retrieve analysis logs:', error)
      return []
    }
  }

  async getAnalysisStats(hours: number = 24): Promise<{
    totalAnalyses: number
    successfulAnalyses: number
    failedAnalyses: number
    averageDuration: number
    cacheHits: number
  }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000)

      const logs = await (prisma as any).systemLog.findMany({
        where: {
          createdAt: {
            gte: since
          },
          context: {
            contains: '"operation":'
          }
        }
      })

      let totalAnalyses = 0
      let successfulAnalyses = 0
      let failedAnalyses = 0
      let totalDuration = 0
      let durationCount = 0
      let cacheHits = 0

      for (const log of logs) {
        try {
          const context = JSON.parse(log.context)
          const operation = context.operation

          if (operation === 'analysis_success') {
            successfulAnalyses++
            totalAnalyses++
            if (context.duration) {
              totalDuration += context.duration
              durationCount++
            }
          } else if (operation === 'analysis_error') {
            failedAnalyses++
            totalAnalyses++
          } else if (operation === 'cache_hit') {
            cacheHits++
          }
        } catch {
          // Skip malformed log entries
        }
      }

      return {
        totalAnalyses,
        successfulAnalyses,
        failedAnalyses,
        averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
        cacheHits
      }
    } catch (error) {
      console.error('Failed to get analysis stats:', error)
      return {
        totalAnalyses: 0,
        successfulAnalyses: 0,
        failedAnalyses: 0,
        averageDuration: 0,
        cacheHits: 0
      }
    }
  }
}

export const analysisLogger = new AnalysisLogger()