import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'

interface FeedValidationResult {
  isValid: boolean
  feedTitle?: string
  feedDescription?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { isValid: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      const urlObj = new URL(url)
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return NextResponse.json(
          {
            isValid: false,
            error: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.'
          },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.'
        },
        { status: 400 }
      )
    }

    // Initialize parser
    const parser = new Parser({
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Neural Feed Studio/1.0'
      }
    })

    // Parse the feed
    const feed = await parser.parseURL(url)

    if (!feed.title || feed.title.trim() === '') {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Feed does not contain a valid title.'
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      isValid: true,
      feedTitle: feed.title,
      feedDescription: feed.description
    })

  } catch (error) {
    console.error('RSS validation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            isValid: false,
            error: 'Feed took too long to respond. Please try again later.'
          },
          { status: 200 }
        )
      }

      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            isValid: false,
            error: 'Unable to connect to the feed URL. Please check the URL and try again.'
          },
          { status: 200 }
        )
      }

      if (error.message.includes('status code 404')) {
        return NextResponse.json(
          {
            isValid: false,
            error: 'Feed not found at the provided URL.'
          },
          { status: 200 }
        )
      }

      if (error.message.includes('status code 403')) {
        return NextResponse.json(
          {
            isValid: false,
            error: 'Access to the feed is forbidden.'
          },
          { status: 200 }
        )
      }
    }

    return NextResponse.json(
      {
        isValid: false,
        error: 'Invalid RSS feed format or unable to parse feed.'
      },
      { status: 200 }
    )
  }
}