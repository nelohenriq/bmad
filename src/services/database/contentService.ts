import { prisma } from './prisma'

export interface CreateContentData {
  userId: string
  title: string
  content: string
  style: string
  length: string
  model: string
  prompt?: string
}

export interface CreateContentSourceData {
  contentId: string
  url: string
  title?: string
  relevance?: number
}

export interface CreateFeedData {
  userId: string
  url: string
  title?: string
  description?: string
  category?: string
}

export interface UpdateFeedData {
  title?: string
  description?: string
  category?: string
  isActive?: boolean
  updateFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly'
  keywordFilters?: string[]
  contentFilters?: Record<string, any>
  lastConfigUpdate?: Date
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
  contentFilters?: Record<string, any> | null
  lastConfigUpdate?: Date | null
  lastFetched: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ContentService {
  // Validation utilities
  private validateKeywordFilters(filters: string[]): boolean {
    return Array.isArray(filters) &&
           filters.length <= 50 && // Reasonable limit
           filters.every(filter => typeof filter === 'string' && filter.trim().length > 0 && filter.length <= 100)
  }

  private validateContentFilters(filters: Record<string, any>): boolean {
    if (typeof filters !== 'object' || filters === null) return false

    // Check that all values are booleans
    return Object.values(filters).every(value => typeof value === 'boolean')
  }

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

    // This is a placeholder for content type filtering logic
    // In a real implementation, this would check for images, videos, etc.
    // For now, just return true if no filters are set to false
    return Object.values(contentFilters).some(enabled => enabled)
  }
  async createContent(data: CreateContentData) {
    return prisma.content.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
        style: data.style,
        length: data.length,
        model: data.model,
        prompt: data.prompt,
      },
    })
  }

  async getContentById(id: string) {
    return prisma.content.findUnique({
      where: { id },
      include: {
        sources: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async getUserContent(userId: string, limit = 50, offset = 0) {
    return prisma.content.findMany({
      where: { userId },
      include: {
        sources: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })
  }

  async updateContent(id: string, data: Partial<CreateContentData>) {
    return prisma.content.update({
      where: { id },
      data,
    })
  }

  async deleteContent(id: string) {
    // Delete sources first due to foreign key constraint
    await prisma.contentSource.deleteMany({
      where: { contentId: id },
    })

    return prisma.content.delete({
      where: { id },
    })
  }

  async publishContent(id: string) {
    return prisma.content.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    })
  }

  async addContentSource(data: CreateContentSourceData) {
    return prisma.contentSource.create({
      data,
    })
  }

  async getContentSources(contentId: string) {
    return prisma.contentSource.findMany({
      where: { contentId },
      orderBy: {
        relevance: 'desc',
      },
    })
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
    // Validate filter data
    if (data.keywordFilters && !this.validateKeywordFilters(data.keywordFilters)) {
      throw new Error('Invalid keyword filters: must be an array of non-empty strings (max 50 filters, 100 chars each)')
    }

    if (data.contentFilters && !this.validateContentFilters(data.contentFilters)) {
      throw new Error('Invalid content filters: must be an object with boolean values')
    }

    // Prepare data for Prisma, handling JSON serialization
    const prismaData: any = { ...data }

    if (data.keywordFilters !== undefined) {
      prismaData.keywordFilters = data.keywordFilters ? JSON.stringify(data.keywordFilters) : null
    }

    if (data.contentFilters !== undefined) {
      prismaData.contentFilters = data.contentFilters ? JSON.stringify(data.contentFilters) : null
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