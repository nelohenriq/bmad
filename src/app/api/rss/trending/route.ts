import { NextResponse } from 'next/server'
import { rssContextService } from '@/services/rss/rssContextService'

export async function GET() {
  try {
    const trendingTopics = await rssContextService.getTrendingTopics('user-1', 10)

    return NextResponse.json({
      success: true,
      trendingTopics
    })
  } catch (error) {
    console.error('Failed to fetch trending topics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch trending topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}