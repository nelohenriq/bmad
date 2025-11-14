import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'

// For now, using a mock user ID - in real app this would come from auth
const MOCK_USER_ID = 'user-1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const query = searchParams.get('q')

    let content
    if (query) {
      content = await contentService.searchContent(MOCK_USER_ID, query, limit)
    } else {
      content = await contentService.getUserContent(MOCK_USER_ID, limit, offset)
    }

    return NextResponse.json({
      success: true,
      data: content,
      pagination: {
        limit,
        offset,
        hasMore: content.length === limit,
      },
    })
  } catch (error) {
    console.error('Content fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, style, length, model, prompt, sources } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Create content
    const createdContent = await contentService.createContent({
      userId: MOCK_USER_ID,
      title,
      content,
      style: style || 'professional',
      length: length || 'medium',
      model: model || 'llama2:7b',
      prompt,
    })

    // Add sources if provided
    if (sources && Array.isArray(sources)) {
      for (const source of sources) {
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

    return NextResponse.json({
      success: true,
      data: fullContent,
    })
  } catch (error) {
    console.error('Content creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}