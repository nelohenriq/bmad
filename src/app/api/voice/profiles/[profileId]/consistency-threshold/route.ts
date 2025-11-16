import { NextRequest, NextResponse } from 'next/server'
import { VoiceConsistencyService } from '@/services/voice/voiceConsistencyService'

const consistencyService = new VoiceConsistencyService()

export async function PUT(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const { profileId } = params
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      threshold, 
      alertOnDeviation, 
      autoCorrectMinor, 
      notificationPreferences 
    } = body

    // Validate threshold
    if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
      return NextResponse.json(
        { error: 'Threshold must be between 0.0 and 1.0' },
        { status: 400 }
      )
    }

    // Validate notification preferences
    if (notificationPreferences && typeof notificationPreferences !== 'object') {
      return NextResponse.json(
        { error: 'Notification preferences must be an object' },
        { status: 400 }
      )
    }

    // Update consistency settings
    const updatedSettings = await consistencyService.updateConsistencySettings(profileId, {
      threshold,
      alertOnDeviation,
      autoCorrectMinor,
      notificationPreferences
    })

    const response = {
      success: true,
      settings: updatedSettings,
      message: 'Consistency settings updated successfully'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Voice consistency settings update error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (errorMessage.includes('Voice profile')) {
      return NextResponse.json(
        { error: 'Voice profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update voice consistency settings' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const { profileId } = params
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    // Get current consistency settings
    const settings = await consistencyService.updateConsistencySettings(profileId, {})

    const response = {
      success: true,
      settings
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Voice consistency settings retrieval error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (errorMessage.includes('Voice profile')) {
      return NextResponse.json(
        { error: 'Voice profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retrieve voice consistency settings' },
      { status: 500 }
    )
  }
}