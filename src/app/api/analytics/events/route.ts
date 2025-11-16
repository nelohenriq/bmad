import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics/analyticsService'
import { z } from 'zod'

const recordEventSchema = z.object({
  eventType: z.string().min(1),
  eventData: z.record(z.any()).optional(),
  sessionId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const body = await request.json()
    const { eventType, eventData, sessionId } = recordEventSchema.parse(body)

    await analyticsService.recordEvent(
      userId || undefined,
      eventType,
      eventData,
      sessionId
    )

    return NextResponse.json({
      message: 'Analytics event recorded successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to record analytics event:', error)
    return NextResponse.json(
      { error: 'Failed to record analytics event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const eventType = searchParams.get('eventType')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // This would require extending the AnalyticsService to support event queries
    // For now, return a placeholder response
    return NextResponse.json({
      events: [],
      message: 'Event querying not yet implemented',
      userId,
      eventType: eventType || 'all',
      limit
    })
  } catch (error) {
    console.error('Failed to get analytics events:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics events' },
      { status: 500 }
    )
  }
}