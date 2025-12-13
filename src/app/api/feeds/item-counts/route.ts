import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const itemCounts = await contentService.getFeedItemCounts(userId)
    return NextResponse.json(itemCounts)
  } catch (error) {
    console.error('Error fetching feed item counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feed item counts' },
      { status: 500 }
    )
  }
}