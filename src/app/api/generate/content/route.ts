import { NextRequest, NextResponse } from 'next/server'
import { generationService } from '@/services/generation/generationService'
import { contextAssemblyService } from '@/services/context/contextAssemblyService'
import { z } from 'zod'

const generateContentSchema = z.object({
  context: z.object({
    content: z.string(),
    chunks: z.array(z.object({
      id: z.string(),
      content: z.string(),
      score: z.number(),
      source: z.string(),
      position: z.number(),
      wordCount: z.number()
    })),
    metadata: z.object({
      totalChunks: z.number(),
      totalWords: z.number(),
      totalChars: z.number(),
      estimatedTokens: z.number(),
      sources: z.array(z.string()),
      dateRange: z.object({
        earliest: z.string().nullable(),
        latest: z.string().nullable()
      })
    }),
    quality: z.object({
      diversity: z.number(),
      relevance: z.number(),
      coherence: z.number(),
      redundancy: z.number()
    })
  }),
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(8000).optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    stopSequences: z.array(z.string()).optional(),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = generateContentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { context, options = {} } = validationResult.data

    // Validate generation options
    const optionsValidation = generationService.validateOptions(options)
    if (!optionsValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid generation options',
          details: optionsValidation.errors
        },
        { status: 400 }
      )
    }

    // Generate content
    const result = await generationService.generateContent(context, options)

    return NextResponse.json({
      data: result,
      success: true,
      message: `Generated content using ${result.model} (${result.usage.totalTokens} tokens)`
    })

  } catch (error) {
    console.error('Error generating content:', error)

    return NextResponse.json(
      { error: 'Failed to generate content', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'models') {
      // Get available models
      const models = await generationService.getAvailableModels()
      return NextResponse.json({
        data: models,
        success: true
      })
    } else if (action === 'metrics') {
      // Get generation metrics
      const metrics = generationService.getMetrics()
      return NextResponse.json({
        data: metrics,
        success: true
      })
    }

    return NextResponse.json(
      { error: 'Invalid action parameter', success: false },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching generation data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generation data', success: false },
      { status: 500 }
    )
  }
}