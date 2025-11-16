import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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