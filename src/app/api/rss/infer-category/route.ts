import { NextRequest, NextResponse } from 'next/server'
import { categoryInferenceService } from '@/services/rss/categoryInferenceService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    const result = await categoryInferenceService.inferCategory(url)

    return NextResponse.json({
      success: true,
      category: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning
    })
  } catch (error) {
    console.error('Category inference error:', error)
    return NextResponse.json(
      {
        error: 'Failed to infer category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}