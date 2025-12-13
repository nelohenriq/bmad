import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    // Authentication
    const user = await requireAuth()

    const { contentId } = await params

    const content = await contentService.getContentById(contentId)

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check if user owns this content
    if ((content as any).userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Transform to match frontend expectations
    const transformedContent = {
      id: content.id,
      title: content.title,
      content: content.content,
      type: content.style || 'generated',
      tags: content.tags ? JSON.parse(content.tags) : [], // Parse tags from JSON
      wordCount: content.wordCount || content.content.split(' ').length,
      createdAt: content.createdAt.toISOString(),
      updatedAt: content.updatedAt.toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: transformedContent,
    })
  } catch (error) {
    console.error('Content fetch error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    // Authentication
    const user = await requireAuth()

    const { contentId } = await params
    const body = await request.json()

    // Get existing content
    const existingContent = await contentService.getContentById(contentId)

    if (!existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check if user owns this content
    if ((existingContent as any).userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update the existing content
    const updatedContent = await contentService.updateContent(contentId, {
      title: body.title,
      content: body.content,
      style: body.type,
      tags: body.tags,
      wordCount: body.wordCount,
    })

    // Transform response to match frontend expectations
    const transformedContent = {
      id: updatedContent.id,
      title: updatedContent.title,
      content: updatedContent.content,
      type: updatedContent.style || 'generated',
      tags: updatedContent.tags ? JSON.parse(updatedContent.tags) : [], // Parse tags from JSON
      wordCount: body.wordCount || updatedContent.wordCount || updatedContent.content.split(' ').length,
      createdAt: updatedContent.createdAt.toISOString(),
      updatedAt: updatedContent.updatedAt.toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: transformedContent,
    })
  } catch (error) {
    console.error('Content update error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    // Authentication
    const user = await requireAuth()

    const { contentId } = await params

    // Delete the content
    await contentService.deleteContent(contentId, user.id)

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    })
  } catch (error) {
    console.error('Content deletion error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (error instanceof Error && error.message === 'Content not found or access denied') {
      return NextResponse.json({ error: 'Content not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}