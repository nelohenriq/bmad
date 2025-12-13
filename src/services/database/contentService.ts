import { prisma } from './prisma'
import { string, z } from 'zod'
import {
  createContentSchema,
  updateFeedSchema,
  CreateContentInput,
  UpdateFeedInput,
  CreateFeedInput
} from '@/lib/validations/schema'
import { categoryInferenceService } from '../rss/categoryInferenceService'
import { backupService, BackupResult, RestoreResult } from './backupService'
import { feedProcessor } from '../rss/feedProcessor'

// Re-export types
export type CreateContentData = CreateContentInput & { userId: string }
export type CreateFeedData = CreateFeedInput & { userId: string }
export type UpdateFeedData = UpdateFeedInput & { lastConfigUpdate?: Date }

export interface CreateContentSourceData {
  contentId: string
  url: string
  title?: string
  relevance?: number
}

export interface FeedData {
  id: string
  userId: string
  url: string
  title: string | null
  description: string | null
  category: string | null
  isActive: boolean
  updateFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly' | null
  keywordFilters?: string[] | null
  contentFilters?: Record<string, boolean> | null
  lastConfigUpdate?: Date | null
  lastFetched: Date | null
  processingStatus?: string | null
  createdAt: Date
  updatedAt: Date
}

export class ContentService {
  // Filter processing utilities
  applyKeywordFilters(content: string, keywordFilters: string[]): boolean {
    if (!keywordFilters || keywordFilters.length === 0) return true

    const lowerContent = content.toLowerCase()
    return keywordFilters.some(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    )
  }

  applyContentTypeFilters(contentData: any, contentFilters: Record<string, boolean>): boolean {
    if (!contentFilters || Object.keys(contentFilters).length === 0) return true
    return Object.values(contentFilters).some(enabled => enabled)
  }

  async createContent(data: CreateContentData) {
    // Validate input
    const validData = createContentSchema.parse(data)

    return prisma.content.create({
      data: {
        userId: data.userId,
        title: validData.title,
        content: validData.content,
        style: validData.style,
        length: validData.length,
        model: validData.model,
        prompt: validData.prompt,
        tags: validData.tags ? JSON.stringify(validData.tags) : null,
      },
    })
  }

  async getContentById(id: string) {
    return prisma.content.findUnique({
      where: { id },
    })
  }

  async updateContent(id: string, data: Partial<Omit<CreateContentData, 'userId'> & { wordCount?: number }>) {
    // Note: Validation is handled at the API level, so we trust the input here

    return prisma.content.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.style !== undefined && { style: data.style }),
        ...(data.length !== undefined && { length: data.length }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.prompt !== undefined && { prompt: data.prompt }),
        ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
        ...(data.wordCount !== undefined && { wordCount: data.wordCount }),
        updatedAt: new Date(),
      },
    })
  }

  async addContentSource(data: CreateContentSourceData) {
    return prisma.contentSource.create({
      data,
    })
  }

  async getContentStats(userId: string) {
    const [total, published, thisMonth] = await Promise.all([
      prisma.content.count({ where: { userId } }),
      prisma.content.count({ where: { userId, isPublished: true } }),
      prisma.content.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

    return {
      total,
      published,
      unpublished: total - published,
      thisMonth,
    }
  }

  async searchContent(userId: string, query: string, limit = 20) {
    return prisma.content.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })
  }

  async getUserContent(userId: string, limit = 20, offset = 0) {
    return prisma.content.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })
  }

  async deleteContent(id: string, userId: string) {
    // First check if the content exists and belongs to the user
    const content = await prisma.content.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!content) {
      throw new Error('Content not found or access denied')
    }

    // Delete associated content sources first (due to foreign key constraints)
    await prisma.contentSource.deleteMany({
      where: { contentId: id }
    })

    // Delete associated content versions
    await prisma.contentVersion.deleteMany({
      where: { contentId: id }
    })

    // Delete associated content chunks
    await prisma.contentChunk.deleteMany({
      where: { contentId: id }
    })

    // Delete associated feedbacks
    await prisma.contentFeedback.deleteMany({
      where: { contentId: id }
    })

    // Finally delete the content
    return prisma.content.delete({
      where: { id }
    })
  }

  // RSS Feed Management Methods

  async addFeed(data: CreateFeedData) {
    // Check for duplicate URL for this user
    const existingFeed = await prisma.feed.findUnique({
      where: {
        userId_url: {
          userId: data.userId,
          url: data.url
        }
      }
    })

    if (existingFeed) {
      throw new Error('Feed with this URL already exists')
    }

    // Infer category if not provided
    let category = data.category
    if (!category) {
      try {
        console.log('Inferring category for RSS feed:', data.url)
        const inferenceResult = await categoryInferenceService.inferCategory(data.url)
        category = inferenceResult.category
        console.log(`Inferred category: ${category} (confidence: ${inferenceResult.confidence})`)
      } catch (error) {
        console.warn('Category inference failed, using default:', error)
        category = 'Other'
      }
    }

    const feed = await prisma.feed.create({
      data: {
        userId: data.userId,
        url: data.url,
        title: data.title,
        description: data.description,
        category,
      },
    })

    // Automatically process the feed in the background
    // Convert to FeedData format for the processor
    const feedData: FeedData = {
      id: feed.id,
      userId: feed.userId,
      url: feed.url,
      title: feed.title,
      description: feed.description,
      category: feed.category,
      isActive: feed.isActive,
      updateFrequency: (feed as any).updateFrequency,
      keywordFilters: (feed as any).keywordFilters ? JSON.parse((feed as any).keywordFilters) : null,
      contentFilters: (feed as any).contentFilters ? JSON.parse((feed as any).contentFilters) : null,
      lastConfigUpdate: (feed as any).lastConfigUpdate,
      lastFetched: feed.lastFetched,
      processingStatus: (feed as any).processingStatus || 'idle',
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
    }

    // Process the feed asynchronously (fire-and-forget)
    feedProcessor.processFeed(feedData).then(result => {
      console.log(`Background processing completed for feed ${feed.id}:`, result)
    }).catch(error => {
      console.error(`Background processing failed for feed ${feed.id}:`, error)
    })

    return feed
  }

  async getUserFeeds(userId: string) {
    const feeds = await prisma.feed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Transform the data to match FeedData interface
    // Note: New fields will be available after Prisma client regeneration
    return feeds.map(feed => {
      // Validate and normalize updateFrequency to ensure it matches the expected union type
      const updateFrequency = (feed as any).updateFrequency || 'daily'
      const validFrequencies = ['manual', 'hourly', 'daily', 'weekly'] as const
      const normalizedFrequency = validFrequencies.includes(updateFrequency as any)
        ? updateFrequency as 'manual' | 'hourly' | 'daily' | 'weekly'
        : 'daily'

      return {
        ...feed,
        updateFrequency: normalizedFrequency,
        keywordFilters: (feed as any).keywordFilters ? JSON.parse((feed as any).keywordFilters) : null,
        contentFilters: (feed as any).contentFilters ? JSON.parse((feed as any).contentFilters) : null,
        lastConfigUpdate: (feed as any).lastConfigUpdate || null,
        processingStatus: (feed as any).processingStatus || 'idle',
      }
    }) as FeedData[]
  }

  async getFeedById(id: string) {
    const feed = await prisma.feed.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { publishedAt: 'desc' },
          take: 10, // Recent items
        },
      },
    })

    if (!feed) return null

    // Validate and normalize updateFrequency to ensure it matches the expected union type
    const updateFrequency = (feed as any).updateFrequency || 'daily'
    const validFrequencies = ['manual', 'hourly', 'daily', 'weekly'] as const
    const normalizedFrequency = validFrequencies.includes(updateFrequency as any)
      ? updateFrequency as 'manual' | 'hourly' | 'daily' | 'weekly'
      : 'daily'

    return {
      ...feed,
      updateFrequency: normalizedFrequency,
      keywordFilters: (feed as any).keywordFilters ? JSON.parse((feed as any).keywordFilters) : null,
      contentFilters: (feed as any).contentFilters ? JSON.parse((feed as any).contentFilters) : null,
      lastConfigUpdate: (feed as any).lastConfigUpdate || null,
      processingStatus: (feed as any).processingStatus || 'idle',
    } as FeedData
  }

  async updateFeed(id: string, data: UpdateFeedData) {
    // Validate using Zod schema (partial validation for updates)
    const validationResult = updateFeedSchema.safeParse(data)

    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`)
    }

    const validData = validationResult.data

    // Prepare data for Prisma, handling JSON serialization
    const prismaData: any = { ...validData }

    if (validData.keywordFilters !== undefined) {
      prismaData.keywordFilters = validData.keywordFilters ? JSON.stringify(validData.keywordFilters) : null
    }

    if (validData.contentFilters !== undefined) {
      prismaData.contentFilters = validData.contentFilters ? JSON.stringify(validData.contentFilters) : null
    }

    // Add timestamp if not present
    if (!prismaData.lastConfigUpdate) {
      prismaData.lastConfigUpdate = new Date()
    }

    return prisma.feed.update({
      where: { id },
      data: prismaData,
    })
  }

  async deleteFeed(id: string) {
    // Delete in correct order due to foreign key constraints:
    // 1. Delete content analyses (references feed items)
    // 2. Delete feed items (references feed)
    // 3. Delete feed

    // First, get all feed item IDs for this feed
    const feedItems = await prisma.feedItem.findMany({
      where: { feedId: id },
      select: { id: true }
    })

    const feedItemIds = feedItems.map(item => item.id)

    // Delete content analyses for these feed items
    if (feedItemIds.length > 0) {
      await prisma.contentAnalysis.deleteMany({
        where: { feedItemId: { in: feedItemIds } }
      })
    }

    // Delete feed items
    await prisma.feedItem.deleteMany({
      where: { feedId: id },
    })

    // Finally delete the feed
    return prisma.feed.delete({
      where: { id },
    })
  }

  async getFeedStats(userId: string) {
    const [total, active, thisMonth] = await Promise.all([
      prisma.feed.count({ where: { userId } }),
      prisma.feed.count({ where: { userId, isActive: true } }),
      prisma.feed.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

    return {
      total,
      active,
      inactive: total - active,
      thisMonth,
    }
  }

  async getFeedItemCounts(userId: string) {
    const feeds = await prisma.feed.findMany({
      where: { userId },
      select: { id: true },
    })

    const itemCounts = await Promise.all(
      feeds.map(async (feed) => {
        const count = await prisma.feedItem.count({
          where: { feedId: feed.id },
        })
        return { feedId: feed.id, count }
      })
    )

    return itemCounts.reduce((acc, { feedId, count }) => {
      acc[feedId] = count
      return acc
    }, {} as Record<string, number>)
  }

  // Backup and Restore Methods

  async createDatabaseBackup(backupDir?: string, filename?: string): Promise<BackupResult> {
    return backupService.createBackup(backupDir, filename)
  }

  async restoreDatabaseFromBackup(backupPath: string): Promise<RestoreResult> {
    return backupService.restoreFromBackup(backupPath)
  }

  async listDatabaseBackups(backupDir?: string) {
    return backupService.listBackups(backupDir)
  }

  async getBackupInfo(backupPath: string) {
    return backupService.getBackupInfo(backupPath)
  }
}

export const contentService = new ContentService()