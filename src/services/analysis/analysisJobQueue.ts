import { semanticAnalysisService } from './semanticAnalysisService'
import { prisma } from '../database/prisma'
import { analysisLogger } from './analysisLogger'

export interface AnalysisJob {
  id: string
  feedItemId: string
  priority: 'low' | 'normal' | 'high'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  retryCount: number
}

export interface ContentAnalysisRequest {
  feedItemId: string
  title: string
  content: string
  description?: string
}

export class AnalysisJobQueue {
  private jobs: Map<string, AnalysisJob> = new Map()
  private processing: boolean = false
  private maxConcurrentJobs: number = 2
  private activeJobs: Set<string> = new Set()

  constructor(maxConcurrentJobs: number = 2) {
    this.maxConcurrentJobs = maxConcurrentJobs
  }

  async addJob(
    request: ContentAnalysisRequest,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const job: AnalysisJob = {
      id: jobId,
      feedItemId: request.feedItemId,
      priority,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0
    }

    this.jobs.set(jobId, job)

    // Log job queuing
    await analysisLogger.logJobQueued(request.feedItemId, priority)

    // Start processing if not already running
    this.processQueue()

    return jobId
  }

  async getJobStatus(jobId: string): Promise<AnalysisJob | null> {
    return this.jobs.get(jobId) || null
  }

  getQueueStatus(): {
    pending: number
    processing: number
    completed: number
    failed: number
    total: number
  } {
    const jobs = Array.from(this.jobs.values())
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: jobs.length
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return
    }

    this.processing = true

    try {
      while (this.activeJobs.size < this.maxConcurrentJobs) {
        const nextJob = this.getNextPendingJob()
        if (!nextJob) {
          break
        }

        this.processJob(nextJob)
      }
    } finally {
      this.processing = false
    }
  }

  private getNextPendingJob(): AnalysisJob | null {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending' && !this.activeJobs.has(job.id))
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) {
          return priorityDiff
        }
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

    return pendingJobs[0] || null
  }

  private async processJob(job: AnalysisJob): Promise<void> {
    this.activeJobs.add(job.id)
    const startTime = Date.now()

    try {
      // Update job status
      job.status = 'processing'
      job.startedAt = new Date()

      // Get content data (in real implementation, this would come from database)
      const contentData = await this.getContentData(job.feedItemId)

      if (!contentData) {
        throw new Error(`Content data not found for feed item ${job.feedItemId}`)
      }

      // Perform analysis
      await semanticAnalysisService.analyzeContent(contentData)

      // Update job status
      job.status = 'completed'
      job.completedAt = new Date()

      // Log successful job completion
      const duration = Date.now() - startTime
      await analysisLogger.logJobProcessed(job.feedItemId, duration, 'completed')

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Job ${job.id} failed:`, error)

      job.status = 'failed'
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      job.retryCount++

      // Log failed job
      await analysisLogger.logJobProcessed(job.feedItemId, duration, 'failed')

      // Simple retry logic (max 3 retries)
      if (job.retryCount < 3) {
        job.status = 'pending'
        // Schedule retry with exponential backoff
        setTimeout(() => {
          this.processQueue()
        }, Math.pow(2, job.retryCount) * 1000)
      }
    } finally {
      this.activeJobs.delete(job.id)
      // Continue processing queue
      setTimeout(() => this.processQueue(), 100)
    }
  }

  private async getContentData(feedItemId: string): Promise<ContentAnalysisRequest | null> {
    try {
      // Query the database for the feed item
      const feedItem = await (prisma as any).feedItem.findUnique({
        where: { id: feedItemId },
        select: {
          id: true,
          title: true,
          content: true,
          description: true
        }
      })

      if (!feedItem) {
        console.error(`Feed item not found: ${feedItemId}`)
        return null
      }

      return {
        feedItemId: feedItem.id,
        title: feedItem.title || 'Untitled',
        content: feedItem.content || feedItem.description || '',
        description: feedItem.description
      }
    } catch (error) {
      console.error('Failed to get content data:', error)
      return null
    }
  }

  // Cleanup old completed jobs (keep last 1000)
  cleanupOldJobs(): void {
    const jobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'completed' || job.status === 'failed')
      .sort((a, b) => (b.completedAt || b.createdAt).getTime() - (a.completedAt || a.createdAt).getTime())

    if (jobs.length > 1000) {
      const jobsToRemove = jobs.slice(1000)
      jobsToRemove.forEach(job => this.jobs.delete(job.id))
    }
  }

  // Stop processing (for graceful shutdown)
  stop(): void {
    this.processing = false
  }
}

export const analysisJobQueue = new AnalysisJobQueue()

// Auto-cleanup every hour
setInterval(() => {
  analysisJobQueue.cleanupOldJobs()
}, 60 * 60 * 1000)