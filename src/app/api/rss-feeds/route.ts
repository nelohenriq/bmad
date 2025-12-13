import { NextRequest, NextResponse } from 'next/server'
import { contentService } from '@/services/database/contentService'
import { z } from 'zod'

// Validation schema for RSS feed creation
const createFeedSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = createFeedSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { url, title, description, category } = validationResult.data

    // Get user ID from session/auth (placeholder)
    const userId = 'user-1' // TODO: Get from auth

    // Add feed using service
    const feed = await contentService.addFeed({
      userId,
      url,
      title: title || undefined,
      description: description || undefined,
      category: category || undefined,
    })

    return NextResponse.json({
      data: feed,
      success: true,
      message: 'RSS feed added successfully'
    })

  } catch (error) {
    console.error('Error adding RSS feed:', error)

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Feed with this URL already exists', success: false },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to add RSS feed', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session/auth (placeholder)
    const userId = 'user-1' // TODO: Get from auth

    // Get user's feeds
    const feeds = await contentService.getUserFeeds(userId)

    return NextResponse.json({
      data: feeds,
      success: true
    })

  } catch (error) {
    console.error('Error fetching RSS feeds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch RSS feeds', success: false },
      { status: 500 }
    )
  }
}