import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics/analyticsService'
import { z } from 'zod'

const metricsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeRange: z.enum(['day', 'week', 'month', 'year']).optional()
})

interface RouteParams {
  params: {
    type: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { type } = params

    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      timeRange: searchParams.get('timeRange') as 'day' | 'week' | 'month' | 'year' || undefined
    }

    const { startDate, endDate, timeRange } = metricsQuerySchema.parse(queryParams)

    // Calculate time range
    const now = new Date()
    let timeRangeObj = {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: now
    }

    if (startDate && endDate) {
      timeRangeObj = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else if (timeRange) {
      const days = {
        day: 1,
        week: 7,
        month: 30,
        year: 365
      }[timeRange]

      timeRangeObj = {
        start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
        end: now
      }
    }

    const metrics = await analyticsService.getMetrics(userId || undefined, type, timeRangeObj)

    return NextResponse.json({
      metrics,
      metricType: type,
      timeRange: timeRangeObj,
      count: metrics.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to get analytics metrics:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics metrics' },
      { status: 500 }
    )
  }
}