import { prisma } from '../database/prisma'

export interface RSSContext {
  relatedTopics: Array<{
    name: string
    description?: string
    category?: string
    confidence: number
    keywords?: string[]
    frequency: number
  }>
  recentTrends: Array<{
    topic: string
    trend: 'rising' | 'stable' | 'declining'
    mentions: number
    timeframe: string
  }>
  keyInsights: string[]
  relevantArticles: Array<{
    title: string
    summary: string
    publishedAt: string
    source: string
  }>
}

export class RSSContextService {
  /**
   * Get relevant RSS context for a given topic
   */
  async getContextForTopic(topic: string, userId: string = 'user-1'): Promise<RSSContext> {
    const [relatedTopics, recentTrends, keyInsights, relevantArticles] = await Promise.all([
      this.findRelatedTopics(topic, userId),
      this.getRecentTrends(userId),
      this.extractKeyInsights(topic, userId),
      this.findRelevantArticles(topic, userId)
    ])

    return {
      relatedTopics,
      recentTrends,
      keyInsights,
      relevantArticles
    }
  }

  /**
   * Find topics related to the given topic
   */
  private async findRelatedTopics(topic: string, userId: string) {
    // Search for topics that contain the search term or related keywords
    const searchTerms = topic.toLowerCase().split(' ')

    const topics = await prisma.topic.findMany({
      where: {
        OR: [
          { name: { contains: topic } },
          { description: { contains: topic } },
          {
            keywords: {
              contains: topic
            }
          }
        ]
      },
      include: {
        _count: {
          select: { analyses: true }
        }
      },
      orderBy: { frequency: 'desc' },
      take: 5
    })

    return topics.map(topic => ({
      name: topic.name,
      description: topic.description || undefined,
      category: topic.category || undefined,
      confidence: topic.confidence,
      keywords: topic.keywords ? JSON.parse(topic.keywords) : undefined,
      frequency: topic.frequency
    }))
  }

  /**
   * Get recent trending topics
   */
  private async getRecentTrends(userId: string) {
    // Get topics analyzed in the last 7 days, ordered by frequency
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentTopics = await prisma.topic.findMany({
      where: {
        analyses: {
          some: {
            feedItem: {
              feed: { userId },
              createdAt: { gte: sevenDaysAgo }
            }
          }
        }
      },
      include: {
        _count: {
          select: { analyses: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })

    return recentTopics.map(topic => ({
      topic: topic.name,
      trend: 'rising' as const, // Simplified - could calculate actual trends
      mentions: topic._count.analyses,
      timeframe: 'Last 7 days'
    }))
  }

  /**
   * Extract key insights from recent articles
   */
  private async extractKeyInsights(topic: string, userId: string): Promise<string[]> {
    const recentArticles = await prisma.feedItem.findMany({
      where: {
        feed: { userId },
        OR: [
          { title: { contains: topic } },
          { content: { contains: topic } }
        ]
      },
      include: {
        contentAnalysis: {
          include: { topics: true }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 5
    })

    const insights: string[] = []

    for (const article of recentArticles) {
      if (article.contentAnalysis?.topics) {
        const primaryTopic = article.contentAnalysis.topics[0]
        if (primaryTopic) {
          insights.push(`${primaryTopic.name}: ${article.title}`)
        }
      }
    }

    return insights.slice(0, 3) // Return top 3 insights
  }

  /**
   * Find relevant articles for the topic
   */
  private async findRelevantArticles(topic: string, userId: string) {
    const articles = await prisma.feedItem.findMany({
      where: {
        feed: { userId },
        OR: [
          { title: { contains: topic } },
          { content: { contains: topic } }
        ]
      },
      include: {
        feed: { select: { title: true } }
      },
      orderBy: { publishedAt: 'desc' },
      take: 3
    })

    return articles.map(article => ({
      title: article.title || 'Untitled',
      summary: article.description || article.content?.substring(0, 200) + '...' || 'No summary available',
      publishedAt: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
      source: article.feed.title || 'Unknown Source'
    }))
  }

  /**
   * Get trending topics for suggestions
   */
  async getTrendingTopics(userId: string = 'user-1', limit: number = 5) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const trendingTopics = await prisma.topic.findMany({
      where: {
        analyses: {
          some: {
            feedItem: {
              feed: { userId },
              createdAt: { gte: sevenDaysAgo }
            }
          }
        }
      },
      orderBy: { frequency: 'desc' },
      take: limit
    })

    return trendingTopics.map(topic => ({
      name: topic.name,
      category: topic.category,
      frequency: topic.frequency
    }))
  }
}

export const rssContextService = new RSSContextService()