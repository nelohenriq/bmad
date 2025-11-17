import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'
import { feedProcessor } from '@/services/rss/feedProcessor'

export async function POST(request: NextRequest, context: any) {
  try {
    const { id } = context.params
    const { action } = await request.json()

    if (action === 'refresh') {
      const feed = await contentService.getFeedById(id)
      if (!feed) {
        return NextResponse.json({ error: 'Feed not found' }, { status: 404 })
      }

      const result = await feedProcessor.processFeed(feed)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing feed action:', error)
    return NextResponse.json(
      { error: 'Failed to process feed action' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: any) {
  try {
    const { id } = context.params
    const body = await request.json()

    const feed = await contentService.updateFeed(id, body)
    return NextResponse.json(feed)
  } catch (error) {
    console.error('Error updating feed:', error)
    return NextResponse.json(
      { error: 'Failed to update feed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const { id } = context.params

    await contentService.deleteFeed(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feed:', error)
    return NextResponse.json(
      { error: 'Failed to delete feed' },
      { status: 500 }
    )
  }
}
