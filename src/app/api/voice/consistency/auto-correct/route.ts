import { NextRequest, NextResponse } from 'next/server'
import { VoiceConsistencyService } from '@/services/voice/voiceConsistencyService'
import { AppliedChange } from '@/types/voice-consistency'

const consistencyService = new VoiceConsistencyService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkId, content } = body

    if (!checkId || !content) {
      return NextResponse.json(
        { error: 'checkId and content are required' },
        { status: 400 }
      )
    }

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

    // Perform auto-correction for voice consistency
    const autoCorrection = await consistencyService.autoCorrectConsistency(checkId, content)

    const response = {
      success: true,
      autoCorrection,
      summary: {
        originalLength: content.length,
        correctedLength: autoCorrection.correctedText.length,
        changesApplied: autoCorrection.appliedChanges.length,
        hasChanges: autoCorrection.appliedChanges.length > 0,
        changePercentage: ((content.length - autoCorrection.correctedText.length) / content.length * 100).toFixed(2)
      },
      changes: autoCorrection.appliedChanges.map((change: AppliedChange) => ({
        type: change.type,
        description: change.description,
        confidence: change.confidence,
        correctedText: change.correctedText,
        affectedRange: change.location
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Voice auto-correction error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    if (errorMessage.includes('Consistency check not found')) {
      return NextResponse.json(
        { error: 'Consistency check not found' },
        { status: 404 }
      )
    }

    if (errorMessage.includes('Voice profile not found')) {
      return NextResponse.json(
        { error: 'Voice profile not found' },
        { status: 404 }
      )
    }

    if (errorMessage.includes('Auto-correction is disabled')) {
      return NextResponse.json(
        { error: 'Auto-correction is disabled for this profile' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to perform voice auto-correction' },
      { status: 500 }
    )
  }
}