import { NextRequest, NextResponse } from 'next/server'
import { VoiceConsistencyService } from '@/services/voice/voiceConsistencyService'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const consistencyService = new VoiceConsistencyService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId parameter is required' },
        { status: 400 }
      )
    }

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'days parameter must be between 1 and 365' },
        { status: 400 }
      )
    }

    // Get consistency analytics for the profile
    const analytics = await consistencyService.getConsistencyAnalytics(profileId, days)

    // Get trend data for the specified period
    const trends = await consistencyService.getConsistencyTrends(profileId, days)

    const response = {
      success: true,
      profileId,
      period: trends.period,
      metrics: analytics.metrics,
      recentChecks: analytics.recentChecks.map(check => ({
        id: check.id,
        consistencyScore: check.consistencyScore,
        timestamp: check.timestamp,
        autoCorrected: check.autoCorrected,
        deviationCount: check.deviationDetails?.length || 0
      })),
      trendAnalysis: {
        dataPoints: trends.trendData.length,
        averageScore: analytics.metrics.averageScore,
        consistencyRate: (1 - analytics.metrics.averageScore) * 100,
        improvementTrend: analytics.metrics.improvementTrend
      },
      settings: analytics.settings
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Voice consistency analytics error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (errorMessage.includes('Voice profile')) {
      return NextResponse.json(
        { error: 'Voice profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retrieve voice consistency analytics' },
      { status: 500 }
    )
  }
}