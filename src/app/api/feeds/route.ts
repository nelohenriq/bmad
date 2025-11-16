import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'

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

    const feeds = await contentService.getUserFeeds(userId)
    return NextResponse.json(feeds)
  } catch (error) {
    console.error('Error fetching feeds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, url, title, description, category } = body

    if (!userId || !url) {
      return NextResponse.json(
        { error: 'User ID and URL are required' },
        { status: 400 }
      )
    }

    const feed = await contentService.addFeed({
      userId,
      url,
      title,
      description,
      category,
    })

    return NextResponse.json(feed, { status: 201 })
  } catch (error) {
    console.error('Error adding feed:', error)
    return NextResponse.json(
      { error: 'Failed to add feed' },
      { status: 500 }
    )
  }
}