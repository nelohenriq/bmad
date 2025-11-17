import { NextRequest, NextResponse } from 'next/server'
import { autoContentGenerator } from '@/services/rss/autoContentGenerator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const stats = await autoContentGenerator.getStats(userId)

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching auto content stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auto content statistics' },
      { status: 500 }
    )
  }
}