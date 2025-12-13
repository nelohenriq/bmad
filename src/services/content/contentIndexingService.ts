import { contentChunkingService, ContentChunk } from './contentChunkingService'
import { embeddingService, EmbeddingResult } from '../embedding/embeddingService'
import { prisma } from '../database/prisma'

export interface IndexingJob {
  id: string
  contentId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalChunks: number
  processedChunks: number
  errors: string[]
  startedAt?: Date
  completedAt?: Date
}

export interface IndexingOptions {
  batchSize?: number
  skipChunking?: boolean // If chunks already exist
  forceReindex?: boolean // Re-index even if already indexed
}

export class ContentIndexingService {
  private activeJobs = new Map<string, IndexingJob>()

  /**
   * Start indexing job for content
   */
  async startIndexing(contentId: string, options: IndexingOptions = {}): Promise<string> {
    const jobId = `index-${contentId}-${Date.now()}`

    const job: IndexingJob = {
      id: jobId,
      contentId,
      status: 'pending',
      totalChunks: 0,
      processedChunks: 0,
      errors: []
    }

    this.activeJobs.set(jobId, job)

    // Start processing asynchronously
    this.processIndexing(job, options).catch(error => {
      console.error(`Indexing job ${jobId} failed:`, error)
      job.status = 'failed'
      job.errors.push(error.message)
    })

    return jobId
  }

  /**
   * Process indexing for a job
   */
  private async processIndexing(job: IndexingJob, options: IndexingOptions): Promise<void> {
    try {
      job.status = 'processing'
      job.startedAt = new Date()

      // Get content from database
      const content = await prisma.content.findUnique({
        where: { id: job.contentId }
      })

      if (!content) {
        throw new Error(`Content ${job.contentId} not found`)
      }

      let chunks: ContentChunk[]

      if (options.skipChunking) {
        // Get existing chunks
        const existingChunks = await prisma.contentChunk.findMany({
          where: { contentId: job.contentId }
        })

        chunks = existingChunks.map(chunk => ({
          id: chunk.id,
          contentId: chunk.contentId,
          chunkText: chunk.chunkText,
          chunkIndex: chunk.chunkIndex,
          metadata: {
            wordCount: chunk.wordCount,
            charCount: chunk.charCount,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition
          }
        }))
      } else {
        // Generate new chunks
        chunks = contentChunkingService.chunkText(job.contentId, content.content)
        
        // Store chunks in database
        if (chunks.length > 0) {
          await prisma.contentChunk.createMany({
            data: chunks.map(chunk => ({
              id: chunk.id,
              contentId: chunk.contentId,
              chunkText: chunk.chunkText,
              chunkIndex: chunk.chunkIndex,
              wordCount: chunk.metadata.wordCount,
              charCount: chunk.metadata.charCount,
              startPosition: chunk.metadata.startPosition,
              endPosition: chunk.metadata.endPosition
            }))
          })
        }
      }

      job.totalChunks = chunks.length

      if (chunks.length === 0) {
        job.status = 'completed'
        job.completedAt = new Date()
        return
      }

      // Check if already indexed (unless force reindex)
      if (!options.forceReindex) {
        const existingEmbeddings = await embeddingService.getStats()
        if (existingEmbeddings.totalEmbeddings > 0) {
          // Assume already indexed if embeddings exist
          job.status = 'completed'
          job.processedChunks = chunks.length
          job.completedAt = new Date()
          return
        }
      }

      // Generate embeddings for chunks
      const chunkData = chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.chunkText
      }))

      const embeddings = await embeddingService.generateEmbeddings(chunkData, {
        batchSize: options.batchSize || 10
      })

      // Store embeddings
      await embeddingService.storeEmbeddings(embeddings)

      job.processedChunks = chunks.length
      job.status = 'completed'
      job.completedAt = new Date()

    } catch (error) {
      job.status = 'failed'
      job.errors.push(error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Get indexing job status
   */
  getJobStatus(jobId: string): IndexingJob | null {
    return this.activeJobs.get(jobId) || null
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): IndexingJob[] {
    return Array.from(this.activeJobs.values())
  }

  /**
   * Cancel indexing job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && job.status === 'processing') {
      job.status = 'failed'
      job.errors.push('Job cancelled by user')
      return true
    }
    return false
  }

  /**
   * Clean up completed jobs (older than specified hours)
   */
  cleanupJobs(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    let cleaned = 0

    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.completedAt && job.completedAt < cutoff) {
        this.activeJobs.delete(jobId)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Re-index content (force reindexing)
   */
  async reindexContent(contentId: string): Promise<string> {
    return this.startIndexing(contentId, { forceReindex: true })
  }

  /**
   * Get indexing statistics
   */
  async getIndexingStats(): Promise<{
    activeJobs: number
    completedToday: number
    failedToday: number
    totalIndexedContent: number
  }> {
    const activeJobs = this.activeJobs.size

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let completedToday = 0
    let failedToday = 0

    for (const job of this.activeJobs.values()) {
      if (job.completedAt && job.completedAt >= today) {
        if (job.status === 'completed') completedToday++
        else if (job.status === 'failed') failedToday++
      }
    }

    const totalIndexedContent = await prisma.content.count({
      where: {
        chunks: {
          some: {} // Has at least one chunk
        }
      }
    })

    return {
      activeJobs,
      completedToday,
      failedToday,
      totalIndexedContent
    }
  }
}

export const contentIndexingService = new ContentIndexingService()