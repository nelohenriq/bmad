import { NextRequest, NextResponse } from 'next/server'
import { modeSelectionService } from '@/services/modes/modeSelectionService'
import { z } from 'zod'

const recommendModeSchema = z.object({
  criteria: z.object({
    contentType: z.enum(['article', 'summary', 'analysis', 'tutorial', 'news', 'creative']).optional(),
    length: z.enum(['short', 'medium', 'long']).optional(),
    tone: z.enum(['formal', 'casual', 'technical', 'engaging']).optional(),
    audience: z.enum(['general', 'expert', 'beginner']).optional(),
    goal: z.enum(['inform', 'persuade', 'entertain', 'analyze']).optional(),
    timeConstraint: z.enum(['fast', 'balanced', 'thorough']).optional()
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'list') {
      // Get all available modes
      const modes = modeSelectionService.getAllModes()
      return NextResponse.json({
        data: modes,
        success: true
      })
    } else if (action === 'categories') {
      // Get modes grouped by category
      const categories = {
        creative: modeSelectionService.getModesByCategory('creative'),
        factual: modeSelectionService.getModesByCategory('factual'),
        analytical: modeSelectionService.getModesByCategory('analytical'),
        conversational: modeSelectionService.getModesByCategory('conversational')
      }
      return NextResponse.json({
        data: categories,
        success: true
      })
    }

    // Default: return all modes
    const modes = modeSelectionService.getAllModes()
    return NextResponse.json({
      data: modes,
      success: true
    })

  } catch (error) {
    console.error('Error fetching modes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch modes', success: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = recommendModeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { criteria = {} } = validationResult.data

    // Validate criteria
    const criteriaValidation = modeSelectionService.validateCriteria(criteria)
    if (!criteriaValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid criteria',
          details: criteriaValidation.errors
        },
        { status: 400 }
      )
    }

    // Get mode recommendation
    const recommendation = modeSelectionService.recommendMode(criteria)

    return NextResponse.json({
      data: recommendation,
      success: true,
      message: `Recommended ${recommendation.mode.name} with ${Math.round(recommendation.confidence * 100)}% confidence`
    })

  } catch (error) {
    console.error('Error recommending mode:', error)
    return NextResponse.json(
      { error: 'Failed to recommend mode', success: false },
      { status: 500 }
    )
  }
}