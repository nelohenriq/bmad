import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')
    const minScore = parseFloat(searchParams.get('minScore') || '0.1')

    // Get trending topics with their approval status
    const topics = await prisma.topic.findMany({
      where: {
        confidence: {
          gte: minScore
        },
        ...(category && {
          category: category
        })
      },
      include: {
        trends: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        },
        approvals: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        contentAngles: {
          orderBy: {
            uniquenessScore: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        confidence: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Transform data for frontend
    const topicsForReview = topics.map(topic => {
      const latestTrend = topic.trends[0]
      const latestApproval = topic.approvals[0]

      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        category: topic.category,
        trendScore: latestTrend?.trendScore || 0,
        velocity: latestTrend?.velocity || 0,
        momentum: latestTrend?.momentum || 0,
        frequency: topic.frequency,
        approvalStatus: (latestApproval?.approvalLevel as 'pending' | 'approved' | 'rejected') || 'pending',
        priority: (latestApproval?.priority as 'high' | 'medium' | 'low') || 'medium',
        angles: topic.contentAngles.map(angle => ({
          id: angle.id,
          title: angle.title,
          description: angle.description,
          uniquenessScore: angle.uniquenessScore,
          seoPotential: angle.seoPotential,
          engagementPotential: angle.engagementPotential,
          difficulty: angle.difficulty
        })),
        lastUpdated: latestTrend?.timestamp || topic.updatedAt
      }
    })

    return NextResponse.json({
      topics: topicsForReview,
      metadata: {
        totalCount: topics.length,
        limit,
        offset,
        hasMore: topics.length === limit,
        filters: {
          category,
          minScore
        },
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Topic review API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics for review' },
      { status: 500 }
    )
  }
}