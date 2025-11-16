import { ExportService } from '../export/exportService'
import { secureStoreCredentials, secureRetrieveCredentials } from './credentialStorage'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const exportService = new ExportService()

interface PlatformConfig {
  id?: string
  name: string
  platform: 'wordpress' | 'medium' | 'blogger'
  credentials: {
    apiKey?: string
    username?: string
    password?: string
    siteUrl?: string
    blogId?: string
  }
  settings: {
    defaultTags?: string[]
    defaultCategory?: string
    publishImmediately?: boolean
    format?: 'markdown' | 'html'
  }
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

interface PublishingJob {
  id?: string
  contentId: string
  platformId: string
  platformConfig: PlatformConfig
  status: 'queued' | 'processing' | 'published' | 'failed'
  scheduledAt?: Date
  publishedAt?: Date
  error?: string
  platformPostId?: string
  platformUrl?: string
}

export class PublishingService {
  /**
   * Get all platform configurations
   */
  async getPlatforms(): Promise<PlatformConfig[]> {
    try {
      const platforms = await (prisma as any).platform.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      return platforms.map((platform: any) => ({
        id: platform.id,
        name: platform.name,
        platform: platform.platform,
        credentials: secureRetrieveCredentials(platform.credentials),
        settings: JSON.parse(platform.settings),
        isActive: platform.isActive,
        createdAt: platform.createdAt,
        updatedAt: platform.updatedAt
      }))
    } catch (error) {
      console.error('Error getting platforms:', error)
      throw error
    }
  }

  /**
   * Add a new platform configuration
   */
  async addPlatform(config: Omit<PlatformConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlatformConfig> {
    try {
      const platform = await (prisma as any).platform.create({
        data: {
          name: config.name,
          platform: config.platform,
          credentials: secureStoreCredentials(config.credentials),
          settings: JSON.stringify(config.settings),
          isActive: config.isActive
        }
      })

      return {
        id: platform.id,
        name: platform.name,
        platform: platform.platform,
        credentials: config.credentials,
        settings: config.settings,
        isActive: platform.isActive,
        createdAt: platform.createdAt,
        updatedAt: platform.updatedAt
      }
    } catch (error) {
      console.error('Error adding platform:', error)
      throw error
    }
  }

  /**
   * Update platform configuration
   */
  async updatePlatform(id: string, updates: Partial<PlatformConfig>): Promise<PlatformConfig> {
    try {
      const updateData: any = {}
      
      if (updates.name) updateData.name = updates.name
      if (updates.credentials) updateData.credentials = secureStoreCredentials(updates.credentials)
      if (updates.settings) updateData.settings = JSON.stringify(updates.settings)
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive
      
      updateData.updatedAt = new Date()

      const platform = await (prisma as any).platform.update({
        where: { id },
        data: updateData
      })

      return {
        id: platform.id,
        name: platform.name,
        platform: platform.platform,
        credentials: secureRetrieveCredentials(platform.credentials),
        settings: JSON.parse(platform.settings),
        isActive: platform.isActive,
        createdAt: platform.createdAt,
        updatedAt: platform.updatedAt
      }
    } catch (error) {
      console.error('Error updating platform:', error)
      throw error
    }
  }

  /**
   * Delete platform configuration
   */
  async deletePlatform(id: string): Promise<void> {
    try {
      await (prisma as any).platform.delete({
        where: { id }
      })
    } catch (error) {
      console.error('Error deleting platform:', error)
      throw error
    }
  }

  /**
   * Publish content to platform
   */
  async publishToPlatform(contentId: string, platformId: string, scheduleAt?: Date): Promise<PublishingJob> {
    try {
      // Get platform configuration
      const platform = await this.getPlatformById(platformId)
      if (!platform) {
        throw new Error('Platform not found')
      }

      // Create publishing job
      const job = await this.createPublishingJob({
        contentId,
        platformId,
        platformConfig: platform,
        status: scheduleAt ? 'queued' : 'processing',
        scheduledAt: scheduleAt
      })

      // If immediate publishing, execute now
      if (!scheduleAt) {
        await this.executePublishingJob(job.id!)
      }

      return job
    } catch (error) {
      console.error('Error publishing to platform:', error)
      throw error
    }
  }

  /**
   * Execute publishing job
   */
  private async executePublishingJob(jobId: string): Promise<void> {
    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing')

      // Get job details
      const job = await this.getJobById(jobId)
      if (!job) {
        throw new Error('Job not found')
      }

      // Get content from database
      const content = await (prisma as any).content.findUnique({
        where: { id: job.contentId }
      })

      if (!content) {
        throw new Error('Content not found')
      }

      // Get platform handler
      const platformHandler = this.getPlatformHandler(job.platformConfig.platform)
      
      // Prepare content for publishing
      const publishContent = await this.prepareContentForPublishing(content, job.platformConfig)

      // Execute publishing
      const result = await platformHandler.publish(publishContent, job.platformConfig.credentials)

      // Update job with success
      await this.updateJobWithSuccess(jobId, result)

    } catch (error) {
      console.error('Error executing publishing job:', error)
      await this.updateJobWithError(jobId, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Prepare content for publishing
   */
  private async prepareContentForPublishing(content: any, platformConfig: PlatformConfig): Promise<any> {
    try {
      // Export content in appropriate format
      const exportFormat = platformConfig.settings.format || 'html'
      const exportResult = await exportService.exportContent(content.id, exportFormat, {
        includeCitations: true,
        citationStyle: 'APA'
      })

      return {
        title: content.title || 'Untitled',
        content: exportResult.content,
        format: exportFormat,
        tags: platformConfig.settings.defaultTags || [],
        category: platformConfig.settings.defaultCategory || 'General',
        publishedAt: new Date()
      }
    } catch (error) {
      console.error('Error preparing content for publishing:', error)
      throw error
    }
  }

  /**
   * Get platform handler
   */
  private getPlatformHandler(platform: string): any {
    switch (platform) {
      case 'wordpress':
        return new WordPressHandler()
      case 'medium':
        return new MediumHandler()
      case 'blogger':
        return new BloggerHandler()
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Get platform by ID
   */
  private async getPlatformById(id: string): Promise<PlatformConfig | null> {
    try {
      const platforms = await this.getPlatforms()
      return platforms.find(p => p.id === id) || null
    } catch (error) {
      console.error('Error getting platform by ID:', error)
      return null
    }
  }

  /**
   * Create publishing job
   */
  private async createPublishingJob(job: Omit<PublishingJob, 'id'>): Promise<PublishingJob> {
    try {
      const jobRecord = await (prisma as any).publishingJob.create({
        data: {
          contentId: job.contentId,
          platformId: job.platformId,
          status: job.status,
          scheduledAt: job.scheduledAt,
          publishedAt: job.publishedAt,
          error: job.error,
          platformPostId: job.platformPostId,
          platformUrl: job.platformUrl
        }
      })

      return {
        ...job,
        id: jobRecord.id
      }
    } catch (error) {
      console.error('Error creating publishing job:', error)
      throw error
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: PublishingJob['status']): Promise<void> {
    try {
      await (prisma as any).publishingJob.update({
        where: { id: jobId },
        data: { status }
      })
    } catch (error) {
      console.error('Error updating job status:', error)
      throw error
    }
  }

  /**
   * Update job with success
   */
  private async updateJobWithSuccess(jobId: string, result: any): Promise<void> {
    try {
      await (prisma as any).publishingJob.update({
        where: { id: jobId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          platformPostId: result.postId,
          platformUrl: result.url
        }
      })
    } catch (error) {
      console.error('Error updating job with success:', error)
      throw error
    }
  }

  /**
   * Update job with error
   */
  private async updateJobWithError(jobId: string, error: string): Promise<void> {
    try {
      await (prisma as any).publishingJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error
        }
      })
    } catch (error) {
      console.error('Error updating job with error:', error)
      throw error
    }
  }

  /**
   * Get job by ID
   */
  private async getJobById(jobId: string): Promise<PublishingJob | null> {
    try {
      const job = await (prisma as any).publishingJob.findUnique({
        where: { id: jobId }
      })

      if (!job) return null

      const platform = await this.getPlatformById(job.platformId)
      if (!platform) return null

      return {
        contentId: job.contentId,
        platformId: job.platformId,
        platformConfig: platform,
        status: job.status,
        scheduledAt: job.scheduledAt,
        publishedAt: job.publishedAt,
        error: job.error,
        platformPostId: job.platformPostId,
        platformUrl: job.platformUrl,
        id: job.id
      }
    } catch (error) {
      console.error('Error getting job by ID:', error)
      return null
    }
  }

  /**
   * Get publishing jobs for content
   */
  async getPublishingJobs(contentId: string): Promise<PublishingJob[]> {
    try {
      const jobs = await (prisma as any).publishingJob.findMany({
        where: { contentId },
        orderBy: { createdAt: 'desc' }
      })

      const results: PublishingJob[] = []
      for (const job of jobs) {
        const platform = await this.getPlatformById(job.platformId)
        if (platform) {
          results.push({
            contentId: job.contentId,
            platformId: job.platformId,
            platformConfig: platform,
            status: job.status,
            scheduledAt: job.scheduledAt,
            publishedAt: job.publishedAt,
            error: job.error,
            platformPostId: job.platformPostId,
            platformUrl: job.platformUrl,
            id: job.id
          })
        }
      }

      return results
    } catch (error) {
      console.error('Error getting publishing jobs:', error)
      throw error
    }
  }

  /**
   * Publish content to multiple platforms simultaneously
   */
  async publishToMultiplePlatforms(
    contentId: string,
    platformIds: string[],
    scheduleAt?: Date
  ): Promise<PublishingJob[]> {
    try {
      // Validate all platforms exist
      const platforms = await Promise.all(
        platformIds.map(id => this.getPlatformById(id))
      )

      const missingPlatforms = platforms.findIndex(p => !p)
      if (missingPlatforms !== -1) {
        throw new Error(`Platform ${platformIds[missingPlatforms]} not found`)
      }

      // Create publishing jobs for all platforms
      const jobs: PublishingJob[] = []
      
      for (let i = 0; i < platformIds.length; i++) {
        const platformId = platformIds[i]
        const platform = platforms[i]!
        
        const job = await this.createPublishingJob({
          contentId,
          platformId,
          platformConfig: platform,
          status: scheduleAt ? 'queued' : 'processing',
          scheduledAt: scheduleAt
        })
        
        jobs.push(job)
      }

      // Execute publishing for immediate jobs (non-scheduled)
      if (!scheduleAt) {
        await Promise.all(
          jobs.map(job =>
            job.id ? this.executePublishingJob(job.id) : Promise.resolve()
          )
        )
      }

      return jobs
    } catch (error) {
      console.error('Error publishing to multiple platforms:', error)
      throw error
    }
  }

  /**
   * Get all publishing jobs (for dashboard)
   */
  async getAllPublishingJobs(): Promise<PublishingJob[]> {
    try {
      const jobs = await (prisma as any).publishingJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to recent jobs
      })

      const results: PublishingJob[] = []
      for (const job of jobs) {
        const platform = await this.getPlatformById(job.platformId)
        if (platform) {
          results.push({
            contentId: job.contentId,
            platformId: job.platformId,
            platformConfig: platform,
            status: job.status,
            scheduledAt: job.scheduledAt,
            publishedAt: job.publishedAt,
            error: job.error,
            platformPostId: job.platformPostId,
            platformUrl: job.platformUrl,
            id: job.id
          })
        }
      }

      return results
    } catch (error) {
      console.error('Error getting all publishing jobs:', error)
      throw error
    }
  }

  /**
   * Get publishing statistics
   */
  async getPublishingStats(): Promise<any> {
    try {
      const allJobs = await this.getAllPublishingJobs()
      
      const stats = {
        total: allJobs.length,
        queued: allJobs.filter(j => j.status === 'queued').length,
        processing: allJobs.filter(j => j.status === 'processing').length,
        published: allJobs.filter(j => j.status === 'published').length,
        failed: allJobs.filter(j => j.status === 'failed').length,
        platforms: {} as Record<string, number>
      }

      // Count by platform
      allJobs.forEach(job => {
        const platformName = job.platformConfig.name
        stats.platforms[platformName] = (stats.platforms[platformName] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting publishing stats:', error)
      throw error
    }
  }
}
// Platform handlers
class WordPressHandler {
  async publish(content: any, credentials: any): Promise<any> {
    // WordPress REST API implementation
    const { apiKey, username, siteUrl } = credentials
    
    if (!apiKey || !username || !siteUrl) {
      throw new Error('WordPress credentials incomplete')
    }

    // This would implement the actual WordPress API call
    // For now, return mock result
    return {
      postId: 'wp_' + Date.now(),
      url: `${siteUrl}/?p=${Date.now()}`
    }
  }
}

class MediumHandler {
  async publish(content: any, credentials: any): Promise<any> {
    // Medium API implementation
    const { apiKey } = credentials
    
    if (!apiKey) {
      throw new Error('Medium API key missing')
    }

    // This would implement the actual Medium API call
    // For now, return mock result
    return {
      postId: 'medium_' + Date.now(),
      url: `https://medium.com/@user/${Date.now()}`
    }
  }
}

class BloggerHandler {
  async publish(content: any, credentials: any): Promise<any> {
    // Blogger API implementation
    const { apiKey, blogId } = credentials
    
    if (!apiKey || !blogId) {
      throw new Error('Blogger credentials incomplete')
    }

    // This would implement the actual Blogger API call
    // For now, return mock result
    return {
      postId: 'blogger_' + Date.now(),
      url: `https://blogspot.com/${Date.now()}`
    }
  }
}
