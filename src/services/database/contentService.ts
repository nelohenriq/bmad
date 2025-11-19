import { prisma } from './prisma'
import { string, z } from 'zod'
import { 
  createContentSchema, 
  updateFeedSchema, 
  CreateContentInput, 
  UpdateFeedInput, 
  CreateFeedInput 
} from '@/lib/validations/schema'

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

    return prisma.feed.create({
      data: {
        userId: data.userId,
        url: data.url,
        title: data.title,
        description: data.description,
        category: data.category,
      },
    })
  }

  async getUserFeeds(userId: string) {
    const feeds = await prisma.feed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Transform the data to match FeedData interface
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
      }
    }) as FeedData[]
  }

  async getFeedById(id: string) {
    return prisma.feed.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { publishedAt: 'desc' },
          take: 10, // Recent items
        },
      },
    })
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