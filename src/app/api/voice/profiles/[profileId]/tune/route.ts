import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest, context: any) {
  try {
    const { parameters, session } = await request.json()
    const profileId = context.params.profileId

    // Update the voice profile with new parameters
    const updatedProfile = await prisma.voiceProfile.update({
      where: { id: profileId },
      data: {
        formalityLevel: parameters.formalityLevel / 100, // Convert to 0-1 range
        complexityLevel: parameters.complexityLevel / 100,
        engagementLevel: parameters.engagementLevel / 100,
      },
    })

    // Create tuning session record
    if (session) {
      await prisma.voiceTuningSession.create({
        data: {
          profileId,
          userId: session.userId || 'anonymous',
          initialFormalityLevel: session.initialParameters.formalityLevel,
          initialComplexityLevel: session.initialParameters.complexityLevel,
          initialEngagementLevel: session.initialParameters.engagementLevel,
          finalFormalityLevel: parameters.formalityLevel,
          finalComplexityLevel: parameters.complexityLevel,
          finalEngagementLevel: parameters.engagementLevel,
          completed: true,
          endTime: new Date(),
          adjustments: {
            create: session.parameterAdjustments?.map((adj: any) => ({
              parameter: adj.parameter,
              previousValue: adj.previousValue,
              newValue: adj.newValue,
              timestamp: new Date(adj.timestamp),
              confidence: adj.confidence,
            })) || [],
          },
          previews: {
            create: session.previewData?.map((preview: any) => ({
              formalityLevel: preview.parameters.formalityLevel,
              complexityLevel: preview.parameters.complexityLevel,
              engagementLevel: preview.parameters.engagementLevel,
              analysisResult: JSON.stringify(preview.analysis),
              timestamp: new Date(preview.timestamp),
            })) || [],
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Tune API error:', error)
    return NextResponse.json(
      { error: 'Failed to update voice profile' },
      { status: 500 }
    )
  }
}
