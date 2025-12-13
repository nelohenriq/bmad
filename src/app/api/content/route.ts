import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'
import { requireAuth } from '@/lib/auth'
import { createContentSchema } from '@/lib/validations/schema'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const query = searchParams.get('q')

    let content
    if (query) {
      content = await contentService.searchContent(user.id, query, limit)
    } else {
      content = await contentService.getUserContent(user.id, limit, offset)
    }

    // Transform content to match frontend expectations
    const transformedContent = content.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      type: item.style || 'generated', // Use style as type, default to 'generated'
      tags: item.tags ? JSON.parse(item.tags) : [], // Parse tags from JSON
      wordCount: item.wordCount || item.content.split(' ').length, // Use stored wordCount or calculate
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: transformedContent,
      pagination: {
        limit,
        offset,
        hasMore: content.length === limit,
      },
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

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await requireAuth()

    const body = await request.json()
    
    // Validation
    const validationResult = createContentSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Create content
    const createdContent = await contentService.createContent({
      userId: user.id,
      ...data
    })

    // Add sources if provided (already validated by Zod)
    if (data.sources && data.sources.length > 0) {
      for (const source of data.sources) {
        await contentService.addContentSource({
          contentId: createdContent.id,
          url: source.url,
          title: source.title,
          relevance: source.relevance,
        })
      }
    }

    // Fetch the complete content with sources
    const fullContent = await contentService.getContentById(createdContent.id)

    if (!fullContent) {
      throw new Error('Content not found after creation')
    }

    // Transform response to match frontend expectations
    const transformedContent = {
      id: fullContent.id,
      title: fullContent.title,
      content: fullContent.content,
      type: fullContent.style || 'generated',
      tags: fullContent.tags ? JSON.parse(fullContent.tags) : [],
      wordCount: fullContent.wordCount || fullContent.content.split(' ').length,
      createdAt: fullContent.createdAt,
      updatedAt: fullContent.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: transformedContent,
    })
  } catch (error) {
    console.error('Content creation error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}