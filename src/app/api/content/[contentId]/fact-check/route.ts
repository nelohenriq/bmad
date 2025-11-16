import { NextRequest, NextResponse } from 'next/server'
import { FactCheckingService } from '@/lib/ai/factCheckingService'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const factCheckingService = new FactCheckingService()

export async function POST(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const contentId = params.contentId

    // Get content and related RSS sources
    const content = await (prisma as any).content.findUnique({
      where: { id: contentId },
      include: {
        sources: true
      }
    })

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Get RSS sources from feed items
    const feedItems = await (prisma as any).feedItem.findMany({
      where: {
        content: {
          some: {
            id: contentId
          }
        }
      },
      include: {
        feed: true
      }
    })

    const sources = feedItems.map((item: any) => ({
      url: item.link || item.feed.url,
      title: item.title,
      content: item.content || item.description || '',
      publishedAt: item.publishedAt
    }))

    // Perform fact checking
    const results = await factCheckingService.checkFacts(content.content, contentId, sources)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Fact-check API error:', error)
    return NextResponse.json(
      { error: 'Failed to perform fact checking' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const contentId = params.contentId

    const results = await factCheckingService.getFactCheckResults(contentId)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Get fact-check results API error:', error)
    return NextResponse.json(
      { error: 'Failed to get fact check results' },
      { status: 500 }
    )
  }
}