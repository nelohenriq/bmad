import { NextRequest, NextResponse } from 'next/server'
import { VoiceConsistencyService } from '@/services/voice/voiceConsistencyService'

const consistencyService = new VoiceConsistencyService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, profileId, contentId } = body

    if (!content || !profileId) {
      return NextResponse.json(
        { error: 'Content and profileId are required' },
        { status: 400 }
      )
    }

    // Validate input lengths
    if (content.length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters long' },
        { status: 400 }
      )
    }

    if (content.length > 50000) {
      return NextResponse.json(
        { error: 'Content must be less than 50,000 characters' },
        { status: 400 }
      )
    }

    // Perform voice consistency check
    const consistencyCheck = await consistencyService.checkConsistency(
      content,
      profileId,
      contentId
    )

    // Check if consistency score is below threshold
    const settings = await consistencyService.updateConsistencySettings(profileId, {})
    const hasDeviations = consistencyCheck.consistencyScore < settings.threshold

    const response = {
      success: true,
      check: consistencyCheck,
      hasDeviations,
      belowThreshold: hasDeviations && consistencyCheck.consistencyScore < settings.threshold,
      suggestions: consistencyCheck.deviationDetails?.map(dev => ({
        type: dev.type,
        severity: dev.severity,
        description: dev.description,
        confidence: dev.confidence
      })) || []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Voice consistency check error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (errorMessage.includes('Voice profile')) {
      return NextResponse.json(
        { error: 'Voice profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to perform voice consistency check' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const contentId = searchParams.get('contentId')

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId parameter is required' },
        { status: 400 }
      )
    }

    // Get consistency analytics for the profile
    const analytics = await consistencyService.getConsistencyAnalytics(profileId, 30)

    // Get recent checks if contentId provided
    let recentChecks: any[] = []
    if (contentId) {
      const trends = await consistencyService.getConsistencyTrends(profileId, 7)
      recentChecks = trends.trendData
    }

    return NextResponse.json({
      success: true,
      analytics,
      recentChecks,
      profileId,
      contentId: contentId || null
    })

  } catch (error) {
    console.error('Voice consistency analytics error:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve voice consistency analytics' },
      { status: 500 }
    )
  }
}