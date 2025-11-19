import { prisma } from './prisma'
<<<<<<< HEAD
import { string, z } from 'zod'
import { 
  createContentSchema, 
  updateFeedSchema, 
  CreateContentInput, 
  UpdateFeedInput, 
  CreateFeedInput 
} from '@/lib/validations/schema'
=======
import { categoryInferenceService } from '../rss/categoryInferenceService'
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe

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
      },
    })
  }

  async getContentById(id: string) {
    return prisma.content.findUnique({
      where: { id },
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

    return prisma.feed.create({
      data: {
        userId: data.userId,
        url: data.url,
        title: data.title,
        description: data.description,
        category,
      },
    })
  }

  async getUserFeeds(userId: string) {
    const feeds = await prisma.feed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Transform the data to match FeedData interface
<<<<<<< HEAD
    return feeds.map(feed => {
      let keywordFilters: string[] | null = null
      let contentFilters: Record<string, boolean> | null = null

      try {
        if (feed.keywordFilters) {
          keywordFilters = JSON.parse(feed.keywordFilters)
        }
      } catch (e) {
        console.error(`Failed to parse keywordFilters for feed ${feed.id}`, e)
      }

      try {
        if (feed.contentFilters) {
          contentFilters = JSON.parse(feed.contentFilters)
        }
      } catch (e) {
        console.error(`Failed to parse contentFilters for feed ${feed.id}`, e)
      }

      return {
        ...feed,
        updateFrequency: (feed.updateFrequency as any) || 'daily',
        keywordFilters,
        contentFilters,
        lastConfigUpdate: feed.lastConfigUpdate || null,
=======
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
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe
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
    // Delete feed items first due to foreign key constraint
    await prisma.feedItem.deleteMany({
      where: { feedId: id },
    })

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
}

export const contentService = new ContentService()