import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics/analyticsService'
import { z } from 'zod'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const dashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeRange: z.enum(['day', 'week', 'month', 'year']).optional()
})

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      timeRange: searchParams.get('timeRange') as 'day' | 'week' | 'month' | 'year' || undefined
    }

    const { startDate, endDate, timeRange } = dashboardQuerySchema.parse(queryParams)

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

    const dashboardData = await analyticsService.getDashboardData(userId || undefined, timeRangeObj)

    return NextResponse.json({
      dashboard: dashboardData,
      timeRange: timeRangeObj,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to get analytics dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics dashboard' },
      { status: 500 }
    )
  }
}