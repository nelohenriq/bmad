import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics/analyticsService'

export async function DELETE(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    await analyticsService.clearAnalyticsData(userId)

    return NextResponse.json({
      message: 'Analytics data cleared successfully'
    })
  } catch (error) {
    console.error('Failed to clear analytics data:', error)
    return NextResponse.json(
      { error: 'Failed to clear analytics data' },
      { status: 500 }
    )
  }
}